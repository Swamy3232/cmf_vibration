from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class RecordBase(BaseModel):
    checkpoint_id: int
    timestamp: Optional[datetime] = None
    value: Optional[float] = None


class RecordCreate(RecordBase):
    pass


class RecordUpdate(RecordBase):
    pass


class Record(RecordBase):
    id: int

    class Config:
        from_attributes = True
