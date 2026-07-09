from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class RecordBase(BaseModel):
    checkpoint_id: int
    timestamp: datetime
    x: Optional[float] = None
    y: Optional[float] = None
    z: Optional[float] = None


class RecordCreate(RecordBase):
    pass


class RecordUpdate(RecordBase):
    pass


class Record(RecordBase):
    class Config:
        from_attributes = True
