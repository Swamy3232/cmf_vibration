from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db import get_db
from models.models import Checkpoint as CheckpointModel
from schemas.checkpoint import Checkpoint, CheckpointCreate, CheckpointUpdate

router = APIRouter(prefix="/checkpoint", tags=["checkpoint"])


@router.post("/", response_model=Checkpoint)
def create_checkpoint(checkpoint: CheckpointCreate, db: Session = Depends(get_db)):
    db_checkpoint = CheckpointModel(**checkpoint.model_dump())
    db.add(db_checkpoint)
    db.commit()
    db.refresh(db_checkpoint)
    return db_checkpoint


@router.get("/", response_model=List[Checkpoint])
def get_checkpoints(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    checkpoints = db.query(CheckpointModel).offset(skip).limit(limit).all()
    return checkpoints


@router.get("/{checkpoint_id}", response_model=Checkpoint)
def get_checkpoint(checkpoint_id: int, db: Session = Depends(get_db)):
    checkpoint = db.query(CheckpointModel).filter(CheckpointModel.id == checkpoint_id).first()
    if not checkpoint:
        raise HTTPException(status_code=404, detail="Checkpoint not found")
    return checkpoint


@router.put("/{checkpoint_id}", response_model=Checkpoint)
def update_checkpoint(checkpoint_id: int, checkpoint: CheckpointUpdate, db: Session = Depends(get_db)):
    db_checkpoint = db.query(CheckpointModel).filter(CheckpointModel.id == checkpoint_id).first()
    if not db_checkpoint:
        raise HTTPException(status_code=404, detail="Checkpoint not found")
    
    for key, value in checkpoint.model_dump(exclude_unset=True).items():
        setattr(db_checkpoint, key, value)
    
    db.commit()
    db.refresh(db_checkpoint)
    return db_checkpoint


@router.delete("/{checkpoint_id}")
def delete_checkpoint(checkpoint_id: int, db: Session = Depends(get_db)):
    db_checkpoint = db.query(CheckpointModel).filter(CheckpointModel.id == checkpoint_id).first()
    if not db_checkpoint:
        raise HTTPException(status_code=404, detail="Checkpoint not found")
    
    db.delete(db_checkpoint)
    db.commit()
    return {"message": "Checkpoint deleted successfully"}
