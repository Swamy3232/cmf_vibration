from typing import Optional
from pydantic import BaseModel


class MasterTableBase(BaseModel):
    machine_id: int
    device_id: Optional[str] = None
    measurement_point: Optional[str] = None
    ball_circle_diameter: Optional[float] = None
    pitch_circle_diameter: Optional[float] = None
    no_of_balls: Optional[int] = None
    angle: Optional[float] = None
    rpm: Optional[float] = None


class MasterTableCreate(MasterTableBase):
    pass


class MasterTableUpdate(MasterTableBase):
    pass


class MasterTable(MasterTableBase):
    id: int

    class Config:
        from_attributes = True
