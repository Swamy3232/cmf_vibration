from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class MachineBase(BaseModel):
    work_center_id: Optional[str] = None
    type: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    year_of_installation: Optional[int] = None
    cnc_controller: Optional[str] = None
    cnc_controller_service: Optional[str] = None
    remarks: Optional[str] = None
    calibration_date: Optional[datetime] = None
    calibration_due_date: Optional[datetime] = None
    password: Optional[str] = None
    user_id: Optional[int] = None


class MachineCreate(MachineBase):
    pass


class MachineUpdate(MachineBase):
    pass


class Machine(MachineBase):
    id: int

    class Config:
        from_attributes = True
