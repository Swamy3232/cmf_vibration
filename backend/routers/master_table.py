from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db import get_db
from models.models import MasterTable as MasterTableModel
from schemas.master_table import MasterTable, MasterTableCreate, MasterTableUpdate

router = APIRouter(prefix="/master-table", tags=["master-table"])


@router.post("/", response_model=MasterTable)
def create_master_table(master_table: MasterTableCreate, db: Session = Depends(get_db)):
    db_master_table = MasterTableModel(**master_table.model_dump())
    db.add(db_master_table)
    db.commit()
    db.refresh(db_master_table)
    return db_master_table


@router.get("/", response_model=List[MasterTable])
def get_master_tables(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    master_tables = db.query(MasterTableModel).offset(skip).limit(limit).all()
    return master_tables


@router.get("/{master_table_id}", response_model=MasterTable)
def get_master_table(master_table_id: int, db: Session = Depends(get_db)):
    master_table = db.query(MasterTableModel).filter(MasterTableModel.id == master_table_id).first()
    if not master_table:
        raise HTTPException(status_code=404, detail="MasterTable not found")
    return master_table


@router.put("/{master_table_id}", response_model=MasterTable)
def update_master_table(master_table_id: int, master_table: MasterTableUpdate, db: Session = Depends(get_db)):
    db_master_table = db.query(MasterTableModel).filter(MasterTableModel.id == master_table_id).first()
    if not db_master_table:
        raise HTTPException(status_code=404, detail="MasterTable not found")
    
    for key, value in master_table.model_dump(exclude_unset=True).items():
        setattr(db_master_table, key, value)
    
    db.commit()
    db.refresh(db_master_table)
    return db_master_table


@router.delete("/{master_table_id}")
def delete_master_table(master_table_id: int, db: Session = Depends(get_db)):
    db_master_table = db.query(MasterTableModel).filter(MasterTableModel.id == master_table_id).first()
    if not db_master_table:
        raise HTTPException(status_code=404, detail="MasterTable not found")
    
    db.delete(db_master_table)
    db.commit()
    return {"message": "MasterTable deleted successfully"}
