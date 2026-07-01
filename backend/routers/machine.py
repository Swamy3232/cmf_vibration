from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db import get_db
from models.models import Machine as MachineModel
from schemas.machine import Machine, MachineCreate, MachineUpdate

router = APIRouter(prefix="/machine", tags=["machine"])


@router.post("/", response_model=Machine)
def create_machine(machine: MachineCreate, db: Session = Depends(get_db)):
    db_machine = MachineModel(**machine.model_dump())
    db.add(db_machine)
    db.commit()
    db.refresh(db_machine)
    return db_machine


@router.get("/", response_model=List[Machine])
def get_machines(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    machines = db.query(MachineModel).offset(skip).limit(limit).all()
    return machines


@router.get("/{machine_id}", response_model=Machine)
def get_machine(machine_id: int, db: Session = Depends(get_db)):
    machine = db.query(MachineModel).filter(MachineModel.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    return machine


@router.put("/{machine_id}", response_model=Machine)
def update_machine(machine_id: int, machine: MachineUpdate, db: Session = Depends(get_db)):
    db_machine = db.query(MachineModel).filter(MachineModel.id == machine_id).first()
    if not db_machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    for key, value in machine.model_dump(exclude_unset=True).items():
        setattr(db_machine, key, value)
    
    db.commit()
    db.refresh(db_machine)
    return db_machine


@router.delete("/{machine_id}")
def delete_machine(machine_id: int, db: Session = Depends(get_db)):
    db_machine = db.query(MachineModel).filter(MachineModel.id == machine_id).first()
    if not db_machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    db.delete(db_machine)
    db.commit()
    return {"message": "Machine deleted successfully"}
