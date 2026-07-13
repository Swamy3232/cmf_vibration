from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from db import get_db
from models.models import Checkpoint as CheckpointModel, Record as RecordModel

router = APIRouter(prefix="/timedomain", tags=["timedomain"])


class TimeDomainPlotResponse(BaseModel):
    checkpoint_id: int
    axis: str
    point_count: int
    timestamps: List[datetime]
    values: List[float]

    class Config:
        from_attributes = True


def get_downsampled_records(
    db: Session,
    checkpoint_id: int,
    axis: str,
    max_points: int
) -> TimeDomainPlotResponse:
    # Query timestamps and axis value
    # Filter out null values for the selected axis
    query = (
        db.query(RecordModel.timestamp, getattr(RecordModel, axis))
        .filter(RecordModel.checkpoint_id == checkpoint_id)
        .filter(getattr(RecordModel, axis).isnot(None))
        .order_by(RecordModel.timestamp.asc())
    )

    results = query.all()
    if not results:
        raise ValueError(f"No records found for checkpoint {checkpoint_id} on axis {axis}")

    total_len = len(results)
    if total_len <= max_points:
        downsampled = results
    else:
        step = total_len // max_points
        downsampled = results[::step][:max_points]

    timestamps = [r[0] for r in downsampled]
    values = [r[1] for r in downsampled]

    return TimeDomainPlotResponse(
        checkpoint_id=checkpoint_id,
        axis=axis,
        point_count=len(downsampled),
        timestamps=timestamps,
        values=values
    )


@router.get("/plot/{checkpoint_id}", response_model=TimeDomainPlotResponse)
def get_time_domain_plot(
    checkpoint_id: int,
    axis: str = Query("x", description="Axis to plot: x, y, or z"),
    max_points: int = Query(2000, ge=10, le=20000, description="Max points in the plot series"),
    db: Session = Depends(get_db)
):
    """
    Get downsampled time-domain vibration signal for plotting a single checkpoint axis.
    """
    if axis not in ("x", "y", "z"):
        raise HTTPException(status_code=400, detail="Axis must be 'x', 'y', or 'z'")

    try:
        return get_downsampled_records(
            db=db,
            checkpoint_id=checkpoint_id,
            axis=axis,
            max_points=max_points
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Time-domain plot failed: {str(e)}")


@router.get("/plot/recent-base/{master_id}", response_model=TimeDomainPlotResponse)
def get_recent_base_time_domain_plot(
    master_id: int,
    axis: str = Query("x", description="Axis to plot: x, y, or z"),
    max_points: int = Query(2000, ge=10, le=20000, description="Max points in the plot series"),
    db: Session = Depends(get_db)
):
    """
    Get downsampled time-domain vibration signal for the most recent base checkpoint (is_base=True)
    associated with the given master_id.
    """
    if axis not in ("x", "y", "z"):
        raise HTTPException(status_code=400, detail="Axis must be 'x', 'y', or 'z'")

    # Find the most recent base checkpoint for the given master_id
    base_checkpoint = (
        db.query(CheckpointModel)
        .filter(CheckpointModel.master_id == master_id, CheckpointModel.is_base == True)
        .order_by(CheckpointModel.start.desc())
        .first()
    )

    if not base_checkpoint:
        raise HTTPException(
            status_code=404,
            detail=f"No base checkpoint found for master_id={master_id}"
        )

    try:
        return get_downsampled_records(
            db=db,
            checkpoint_id=base_checkpoint.id,
            axis=axis,
            max_points=max_points
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Time-domain plot failed: {str(e)}")
