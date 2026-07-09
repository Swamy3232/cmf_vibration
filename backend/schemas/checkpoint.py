from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class CheckpointBase(BaseModel):
    master_id: int
    start: Optional[datetime] = None
    end: Optional[datetime] = None
    duration: Optional[float] = None
    is_base: bool = False




class CheckpointCreate(CheckpointBase):
    pass


class CheckpointUpdate(CheckpointBase):
    pass


class Checkpoint(CheckpointBase):
    id: int

    class Config:
        from_attributes = True
