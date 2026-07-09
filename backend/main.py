from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import machine, master_table, checkpoint, record, defects
from db import engine, Base
from models.models import Machine, MasterTable, Checkpoint, Record

app = FastAPI(
    title="CMF Vibration API",
    description="API for CMF Vibration monitoring system",
    version="1.0.0"
)


import os
from sqlalchemy import text
from aggregator import VibrationDataAggregator

aggregator = None

# Create tables on startup
@app.on_event("startup")
def startup_event():
    # 1. Standard tables creation
    Base.metadata.create_all(bind=engine)
    
    # 2. TimescaleDB initialization DDL
    try:
        with engine.begin() as conn:
            # Enable timescaledb extension
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;"))
            
            # Check if record table is hypertable
            check_hypertable = conn.execute(text(
                "SELECT * FROM timescaledb_information.hypertables WHERE hypertable_name = 'record';"
            )).fetchone()
            
            if not check_hypertable:
                print("TimescaleDB: Converting 'record' table to hypertable...")
                # Convert
                conn.execute(text(
                    "SELECT create_hypertable('record', 'timestamp', chunk_time_interval => INTERVAL '1 hour', if_not_exists => TRUE);"
                ))
                
                # Composite index
                conn.execute(text(
                    "CREATE INDEX IF NOT EXISTS idx_record_checkpoint_time ON record (checkpoint_id, timestamp DESC);"
                ))
                
                # Setup compression
                conn.execute(text(
                    "ALTER TABLE record SET ("
                    "   timescaledb.compress,"
                    "   timescaledb.compress_segmentby = 'checkpoint_id',"
                    "   timescaledb.compress_orderby = 'timestamp ASC'"
                    ");"
                ))
                
                # Add compression policy (compress data older than 2 hours)
                conn.execute(text(
                    "SELECT add_compression_policy('record', INTERVAL '2 hours', if_not_exists => TRUE);"
                ))
                print("TimescaleDB: Hypertable setup and compression policy configured successfully.")
    except Exception as e:
        print(f"TimescaleDB initialization warning: {e}. Ensure you are using a TimescaleDB-enabled PostgreSQL database.")

    # 3. Start Vibration Data Aggregator
    global aggregator
    broker_ip = os.getenv("MQTT_BROKER", "192.168.137.1")
    broker_port = int(os.getenv("MQTT_PORT", 1883))
    base_port = int(os.getenv("BASE_UDP_PORT", 12345))
    
    aggregator = VibrationDataAggregator(
        broker_ip=broker_ip,
        broker_port=broker_port,
        base_udp_port=base_port
    )
    aggregator.start()


@app.on_event("shutdown")
def shutdown_event():
    global aggregator
    if aggregator:
        aggregator.stop()


# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(machine.router)
app.include_router(master_table.router)
app.include_router(checkpoint.router)
app.include_router(record.router)
app.include_router(defects.router)


@app.get("/")
def root():
    return {
        "message": "CMF Vibration API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
