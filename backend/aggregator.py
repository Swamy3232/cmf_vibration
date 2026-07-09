import os
import time
import socket
import struct
import threading
import json
from datetime import datetime, timezone
import paho.mqtt.client as mqtt
import psycopg2
from psycopg2.extras import execute_values
from psycopg2.pool import ThreadedConnectionPool
from loguru import logger

from db import DATABASE_URL, SessionLocal
from models.models import MasterTable as MasterTableModel, Checkpoint as CheckpointModel

# Clean DSN for psycopg2 (replace sqlalchemy-specific scheme if present)
DB_DSN = DATABASE_URL.replace("postgresql+psycopg2://", "postgresql://")

# FS ranges sensitivity multipliers
FS_RANGES = {
    "2": 0.000061,
    "4": 0.000122,
    "8": 0.000244,
    "16": 0.000488
}
DEFAULT_SENSITIVITY = 0.000122  # ±4g

# Sampling rate parameters
SAMPLING_RATE = 26666.666
SAMPLE_DELTA_US = 1000000.0 / SAMPLING_RATE  # ~37.5 microseconds per sample

# UDP packet layout: Seq (uint32), 1024 samples (int16), Count/Scale (uint16), Timestamp (uint64), Axis (uint8)
PACKET_FORMAT = "<I1024hHQB"
PACKET_SIZE = struct.calcsize(PACKET_FORMAT)  # 2063 bytes


class UDPStreamIngester:
    """
    Handles UDP socket ingestion and database bulk writing for a single device stream.
    """
    def __init__(self, device_name, port, checkpoint_id, pool):
        self.device_name = device_name
        self.port = port
        self.checkpoint_id = checkpoint_id
        self.pool = pool
        
        self.stop_event = threading.Event()
        self.thread = None
        self.sock = None
        
        # Buffer variables
        self.batch_buffer = []
        self.batch_size_threshold = 8192
        self.last_flush_time = time.time()
        self.flush_interval_sec = 0.5
        self.axis = None
        self.records_flushed = 0
        self.time_offset_us = None

    def start(self):
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        # Allocate large OS receive buffer
        try:
            self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 524288)
        except OSError as e:
            logger.warning(f"[{self.device_name}] Could not enlarge SO_RCVBUF: {e}")
            
        self.sock.bind(("0.0.0.0", self.port))
        self.sock.settimeout(1.0)
        
        self.thread = threading.Thread(
            target=self._run_loop, 
            name=f"ingest_{self.device_name}_{self.port}", 
            daemon=True
        )
        self.thread.start()
        logger.info(f"[{self.device_name}] Ingestion thread started on UDP port {self.port}")

    def stop(self):
        self.stop_event.set()
        if self.sock:
            try:
                self.sock.close()
            except Exception:
                pass
        if self.thread:
            self.thread.join(timeout=2.0)
        logger.info(f"[{self.device_name}] Ingestion thread on port {self.port} stopped. Total raw records flushed: {self.records_flushed}")

    def _flush_buffer(self, conn):
        if not self.batch_buffer:
            return
        
        start_time = time.time()
        row_count = len(self.batch_buffer)
        
        try:
            with conn.cursor() as cur:
                # Optimized bulk insert using TimescaleDB hypertable layout
                sql = """
                    INSERT INTO record (checkpoint_id, timestamp, x, y, z)
                    VALUES %s
                    ON CONFLICT DO NOTHING
                """
                execute_values(cur, sql, self.batch_buffer, page_size=4096)
            conn.commit()
            self.records_flushed += row_count
        except Exception as e:
            conn.rollback()
            logger.error(f"[{self.device_name}] Database bulk write failed: {e}")
        finally:
            self.batch_buffer.clear()
            self.last_flush_time = time.time()

    def _run_loop(self):
        # Obtain a dedicated DB connection from pool
        conn = None
        try:
            conn = self.pool.getconn()
        except Exception as e:
            logger.critical(f"[{self.device_name}] Ingestion failed to acquire DB connection: {e}")
            return

        unpack_fn = struct.Struct(PACKET_FORMAT).unpack
        
        try:
            while not self.stop_event.is_set():
                try:
                    data, _ = self.sock.recvfrom(PACKET_SIZE + 100)
                except socket.timeout:
                    # Periodically flush if idle
                    if time.time() - self.last_flush_time >= self.flush_interval_sec:
                        self._flush_buffer(conn)
                    continue
                except OSError:
                    # Socket closed externally on stop
                    break

                if len(data) != PACKET_SIZE:
                    continue

                try:
                    # Unpack packet
                    unpacked = unpack_fn(data)
                    seq = unpacked[0]
                    raw_samples = unpacked[1:1025]
                    fs_raw = unpacked[1025]
                    timestamp_us = unpacked[1026]
                    axis_raw = unpacked[1027]
                    
                    # Map axis byte
                    axis_char = chr(axis_raw) if axis_raw in (ord('X'), ord('Y'), ord('Z')) else 'Z'
                    
                    # Establish real-world time offset on first packet of session
                    if self.time_offset_us is None:
                        host_now_us = int(time.time() * 1000000.0)
                        self.time_offset_us = host_now_us - timestamp_us
                        logger.info(f"[{self.device_name}] Established time sync offset: {self.time_offset_us} us")

                    # Store active stream axis locally
                    if self.axis is None:
                        self.axis = axis_char
                        logger.info(f"[{self.device_name}] Identified stream axis: '{axis_char}' for Checkpoint ID {self.checkpoint_id}")
                    
                    # Resolve sensitivity
                    fs_val = str(fs_raw)
                    sensitivity = FS_RANGES.get(fs_val, DEFAULT_SENSITIVITY)
                    
                    # Interpolate sample-level microsecond epoch timestamps
                    for i, raw_val in enumerate(raw_samples):
                        sample_val = raw_val * sensitivity
                        
                        # Microsecond epoch offset
                        sample_us = self.time_offset_us + timestamp_us + int(i * SAMPLE_DELTA_US)
                        sample_dt = datetime.fromtimestamp(sample_us / 1000000.0)
                        
                        # Map values based on active axis
                        x_val = sample_val if axis_char == 'X' else None
                        y_val = sample_val if axis_char == 'Y' else None
                        z_val = sample_val if axis_char == 'Z' else None

                        # Add row tuple (checkpoint_id, timestamp, x, y, z)
                        self.batch_buffer.append((
                            self.checkpoint_id,
                            sample_dt,
                            x_val,
                            y_val,
                            z_val
                        ))
                    
                    # Flush if threshold met
                    if len(self.batch_buffer) >= self.batch_size_threshold:
                        self._flush_buffer(conn)
                        
                except Exception as e:
                    logger.error(f"[{self.device_name}] Packet unpack / parsing error: {e}")
                    
            # Final flush on stop
            self._flush_buffer(conn)
            
        finally:
            if conn:
                self.pool.putconn(conn)


class VibrationDataAggregator:
    """
    Fleet Coordinator: Subscribes to MQTT status, allocates UDP ingesters, 
    and manages active streams.
    """
    def __init__(self, broker_ip="192.168.137.1", broker_port=1883, base_udp_port=12345):
        self.broker_ip = broker_ip
        self.broker_port = broker_port
        self.base_udp_port = base_udp_port
        self.next_udp_port = base_udp_port
        
        self.active_streams = {}  # device_name -> UDPStreamIngester
        self.streams_lock = threading.Lock()
        
        # Threaded Connection Pool for DB Writers
        self.pool = ThreadedConnectionPool(minconn=1, maxconn=30, dsn=DB_DSN)
        
        # MQTT Client setup
        try:
            self.mqtt_client = mqtt.Client(
                callback_api_version=mqtt.CallbackAPIVersion.VERSION2
                if hasattr(mqtt, "CallbackAPIVersion") else None
            )
        except Exception:
            self.mqtt_client = mqtt.Client()
            
        self.mqtt_client.on_connect = self._on_mqtt_connect
        self.mqtt_client.on_message = self._on_mqtt_message
        self.mqtt_client.on_disconnect = self._on_mqtt_disconnect
        
        self._running = False

    def start(self):
        if self._running:
            return
        self._running = True
        logger.info(f"Starting Vibration Data Aggregator Service...")
        
        # Connect to MQTT Broker
        try:
            self.mqtt_client.connect_async(self.broker_ip, self.broker_port, keepalive=60)
            self.mqtt_client.loop_start()
        except Exception as e:
            logger.error(f"MQTT connection failed to start: {e}")
            
        # Spawn stale session manager thread
        threading.Thread(target=self._stale_cleanup_loop, daemon=True, name="stale_cleaner").start()

    def stop(self):
        self._running = False
        self.mqtt_client.loop_stop()
        self.mqtt_client.disconnect()
        
        # Stop all active ingestion threads
        with self.streams_lock:
            for device_name, ingester in list(self.active_streams.items()):
                ingester.stop()
                self._close_checkpoint(ingester.checkpoint_id)
            self.active_streams.clear()
            
        # Close connection pool
        self.pool.closeall()
        logger.info("Vibration Data Aggregator Service stopped.")

    def _on_mqtt_connect(self, client, userdata, flags, rc, *args, **kwargs):
        code = rc
        if hasattr(code, "value"):
            code = code.value
        if code == 0:
            logger.info(f"MQTT Connected to broker {self.broker_ip}:{self.broker_port}")
            client.subscribe("wvm/+/status", qos=0)
        else:
            logger.error(f"MQTT Connection refused (code {code})")

    def _on_mqtt_disconnect(self, client, userdata, *args, **kwargs):
        rc = None
        if len(args) == 1:
            rc = args[0]
        elif len(args) >= 2:
            rc = args[1]
            
        code = rc.value if rc is not None and hasattr(rc, "value") else rc
        logger.warning(f"MQTT Disconnected from broker (code {code})")

    def _on_mqtt_message(self, client, userdata, msg):
        try:
            parts = msg.topic.split("/")
            if len(parts) < 3:
                return
            device_name = parts[1]
            
            payload = json.loads(msg.payload.decode("utf-8"))
            ip = payload.get("ip")
            state = payload.get("state", "UNKNOWN")
            port = payload.get("port", self.base_udp_port)
            
            if not ip:
                return
                
            if state == "STREAMING":
                self._start_device_ingestion(device_name, ip, port)
            elif state in ("STOPPED", "IDLE"):
                self._stop_device_ingestion(device_name)
                
        except Exception as e:
            logger.error(f"MQTT status parsing error: {e}")

    def _start_device_ingestion(self, device_name, device_ip, port):
        with self.streams_lock:
            if device_name in self.active_streams:
                return  # Already ingesting
                
            logger.info(f"Device '{device_name}' is streaming. Setting up ingestion on port {port}...")
            
            # 1. Query master_table config for the device (Auto-provision if not found)
            db = SessionLocal()
            try:
                master = db.query(MasterTableModel).filter(MasterTableModel.device_id == device_name).first()
                if not master:
                    logger.info(f"No MasterTable configuration found for device '{device_name}'. Auto-provisioning default config...")
                    
                    # Resolve or create default machine
                    from models.models import Machine as MachineModel
                    machine = db.query(MachineModel).first()
                    if not machine:
                        logger.info("No machines exist in database. Creating default machine...")
                        machine = MachineModel(
                            work_center_id="DEFAULT_AUTO",
                            type="Auto-Provisioned Machine",
                            make="Generic",
                            model="Generic",
                            remarks="Automatically created for untracked devices"
                        )
                        db.add(machine)
                        db.commit()
                        db.refresh(machine)
                        
                    # Create default master_table configuration
                    master = MasterTableModel(
                        machine_id=machine.id,
                        device_id=device_name,
                        measurement_point="Auto-Provisioned Channel",
                        ball_circle_diameter=0.0,
                        pitch_circle_diameter=0.0,
                        no_of_balls=0,
                        angle=0.0,
                        rpm=0.0
                    )
                    db.add(master)
                    db.commit()
                    db.refresh(master)
                    logger.info(f"Successfully auto-provisioned device '{device_name}' in MasterTable under Machine ID {machine.id}")
                
                # 2. Create a Checkpoint record
                checkpoint = CheckpointModel(
                    master_id=master.id,
                    start=datetime.now(),
                    is_base=False
                )
                db.add(checkpoint)
                db.commit()
                db.refresh(checkpoint)
                checkpoint_id = checkpoint.id
            except Exception as e:
                logger.error(f"Database error during checkpoint creation or auto-provisioning: {e}")
                return
            finally:
                db.close()

            # 3. Start Ingester Thread on the device's streaming port
            ingester = UDPStreamIngester(device_name, port, checkpoint_id, self.pool)
            ingester.start()
            self.active_streams[device_name] = ingester


    def _stop_device_ingestion(self, device_name):
        with self.streams_lock:
            ingester = self.active_streams.pop(device_name, None)
            if ingester:
                logger.info(f"Stopping ingestion stream for device '{device_name}'...")
                ingester.stop()
                self._close_checkpoint(ingester.checkpoint_id)

    def _close_checkpoint(self, checkpoint_id):
        db = SessionLocal()
        try:
            checkpoint = db.query(CheckpointModel).filter(CheckpointModel.id == checkpoint_id).first()
            if checkpoint:
                end_time = datetime.now()
                checkpoint.end = end_time
                if checkpoint.start:
                    checkpoint.duration = (end_time - checkpoint.start).total_seconds()
                db.commit()
                logger.info(f"Closed database Checkpoint ID {checkpoint_id}")
        except Exception as e:
            logger.error(f"Failed to close database Checkpoint ID {checkpoint_id}: {e}")
        finally:
            db.close()

    def _stale_cleanup_loop(self):
        """
        Safety check: If a device hasn't reported data or stays registered but ceases stream, 
        clean up socket resources.
        """
        while self._running:
            time.sleep(10.0)
            now = time.time()
            with self.streams_lock:
                for name, ingester in list(self.active_streams.items()):
                    if now - ingester.last_flush_time > 30.0:
                        logger.warning(f"Device '{name}' ingestion stale (no data for 30s). Cleaning up.")
                        self.active_streams.pop(name)
                        ingester.stop()
                        self._close_checkpoint(ingester.checkpoint_id)

    def _detect_local_ip(self, target_ip):
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            s.connect((target_ip, 1))
            return s.getsockname()[0]
        except Exception:
            return "192.168.137.1"
        finally:
            s.close()
