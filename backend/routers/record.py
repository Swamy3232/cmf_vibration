from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db import get_db
from models.models import Record as RecordModel
from schemas.record import Record, RecordCreate, RecordUpdate

router = APIRouter(prefix="/record", tags=["record"])


@router.post("/", response_model=Record)
def create_record(record: RecordCreate, db: Session = Depends(get_db)):
    db_record = RecordModel(**record.model_dump())
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record


@router.get("/", response_model=List[Record])
def get_records(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    records = db.query(RecordModel).offset(skip).limit(limit).all()
    return records


@router.get("/{record_id}", response_model=Record)
def get_record(record_id: int, db: Session = Depends(get_db)):
    record = db.query(RecordModel).filter(RecordModel.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return record


@router.put("/{record_id}", response_model=Record)
def update_record(record_id: int, record: RecordUpdate, db: Session = Depends(get_db)):
    db_record = db.query(RecordModel).filter(RecordModel.id == record_id).first()
    if not db_record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    for key, value in record.model_dump(exclude_unset=True).items():
        setattr(db_record, key, value)
    
    db.commit()
    db.refresh(db_record)
    return db_record


@router.delete("/{record_id}")
def delete_record(record_id: int, db: Session = Depends(get_db)):
    db_record = db.query(RecordModel).filter(RecordModel.id == record_id).first()
    if not db_record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    db.delete(db_record)
    db.commit()
    return {"message": "Record deleted successfully"}
