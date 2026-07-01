from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float, ForeignKey
from sqlalchemy.orm import relationship
from db import Base


class Machine(Base):
    __tablename__ = 'machine'

    id = Column(Integer, primary_key=True, index=True)
    work_center_id = Column(String, nullable=True)
    type = Column(String, nullable=True)
    make = Column(String, nullable=True)
    model = Column(String, nullable=True)
    year_of_installation = Column(Integer, nullable=True)
    cnc_controller = Column(String, nullable=True)
    cnc_controller_service = Column(String, nullable=True)
    remarks = Column(String, nullable=True)
    calibration_date = Column(DateTime, nullable=True)
    calibration_due_date = Column(DateTime, nullable=True)
    password = Column(String, nullable=True)
    user_id = Column(Integer, nullable=True)

    # Relationships
    master_tables = relationship("MasterTable", back_populates="machine")


class MasterTable(Base):
    __tablename__ = 'master_table'

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey('machine.id'), nullable=False)
    device_id = Column(String, nullable=True)
    measurement_point = Column(String, nullable=True)
    ball_circle_diameter = Column(Float, nullable=True)
    pitch_circle_diameter = Column(Float, nullable=True)
    no_of_balls = Column(Integer, nullable=True)
    angle = Column(Float, nullable=True)
    rpm = Column(Float, nullable=True)

    # Relationships
    machine = relationship("Machine", back_populates="master_tables")
    checkpoints = relationship("Checkpoint", back_populates="master_table")


class Checkpoint(Base):
    __tablename__ = 'checkpoint'

    id = Column(Integer, primary_key=True, index=True)
    master_id = Column(Integer, ForeignKey('master_table.id'), nullable=False)
    start = Column(DateTime, nullable=True)
    end = Column(DateTime, nullable=True)
    duration = Column(Float, nullable=True)
    is_base = Column(Boolean, default=False)

    # Relationships
    master_table = relationship("MasterTable", back_populates="checkpoints")
    records = relationship("Record", back_populates="checkpoint")


class Record(Base):
    __tablename__ = 'record'

    id = Column(Integer, primary_key=True, index=True)
    checkpoint_id = Column(Integer, ForeignKey('checkpoint.id'), nullable=False)
    timestamp = Column(DateTime, nullable=True)
    value = Column(Float, nullable=True)

    # Relationships
    checkpoint = relationship("Checkpoint", back_populates="records")
