from datetime import datetime, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
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


@router.get("/base/recent", response_model=Checkpoint)
def get_recent_base_checkpoint(master_id: int | None = None, db: Session = Depends(get_db)):
    """
    Returns the most recent checkpoint where is_base=True.
    Optionally filter by master_id to scope to a specific machine configuration.
    """
    query = db.query(CheckpointModel).filter(CheckpointModel.is_base == True)

    if master_id is not None:
        query = query.filter(CheckpointModel.master_id == master_id)

    checkpoint = query.order_by(CheckpointModel.start.desc()).first()

    if not checkpoint:
        detail = (
            f"No base checkpoint found for master_id={master_id}"
            if master_id is not None
            else "No base checkpoint found"
        )
        raise HTTPException(status_code=404, detail=detail)

    return checkpoint


@router.get("/brief")
def get_checkpoints_brief(master_id: int | None = None, db: Session = Depends(get_db)):
    """
    Returns a list of checkpoints containing only their id, start timestamp, end timestamp, and duration.
    Optionally filter by master_id.
    """
    query = db.query(CheckpointModel.id, CheckpointModel.start, CheckpointModel.end, CheckpointModel.duration)
    if master_id is not None:
        query = query.filter(CheckpointModel.master_id == master_id)
    
    results = query.order_by(CheckpointModel.start.desc()).all()
    return [{"id": r.id, "start": r.start, "end": r.end, "duration": r.duration} for r in results]



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


rms_router = APIRouter(prefix="/api/rms", tags=["rms"])


@rms_router.get("/trend")
def get_rms_trend(
    master_id: int = Query(...),
    point: str = Query(...),
    days: int = Query(7),
    db: Session = Depends(get_db)
):
    if point not in ["x_rms", "y_rms", "z_rms"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid point value. Must be one of: x_rms, y_rms, z_rms"
        )
    
    time_threshold = datetime.now() - timedelta(days=days)
    column = getattr(CheckpointModel, point)
    
    results = (
        db.query(CheckpointModel.start, column)
        .filter(CheckpointModel.master_id == master_id)
        .filter(CheckpointModel.start >= time_threshold)
        .order_by(CheckpointModel.start.asc())
        .all()
    )
    
    return [{"start": r[0], "value": r[1]} for r in results]


@rms_router.get("/base")
def get_rms_base(
    master_id: int = Query(...),
    point: str = Query(...),
    db: Session = Depends(get_db)
):
    point_map = {
        "x_axis": "x_rms",
        "y_axis": "y_rms",
        "z_axis": "z_rms",
        "x_rms": "x_rms",
        "y_rms": "y_rms",
        "z_rms": "z_rms",
    }
    
    mapped_point = point_map.get(point)
    if not mapped_point:
        raise HTTPException(
            status_code=400,
            detail="Invalid point value. Must be one of: x_axis, y_axis, z_axis, x_rms, y_rms, z_rms"
        )
    
    column = getattr(CheckpointModel, mapped_point)
    
    result = (
        db.query(CheckpointModel.start, column)
        .filter(CheckpointModel.master_id == master_id)
        .filter(CheckpointModel.is_base == True)
        .order_by(CheckpointModel.start.desc())
        .first()
    )
    
    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"No base checkpoint found for master_id={master_id}"
        )
    
    return {
        "start": result[0],
        "base": True,
        "value": result[1],
        "rms_value": result[1]
    }


