from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from db import get_db
from schemas.fft import FftPlotResponse
from services.fft import get_fft_plot

router = APIRouter(prefix="/vibration", tags=["vibration"])


@router.get("/fft-plot/{checkpoint_id}", response_model=FftPlotResponse)
def get_fft_plot_data(
    checkpoint_id: int,
    axis: str = Query("x", description="Axis to plot: x, y, or z"),
    max_points: int = Query(2000, ge=10, le=20000, description="Max points in the plot series"),
    freq_min: float = Query(0.0, ge=0, description="Minimum frequency (Hz)"),
    freq_max: Optional[float] = Query(None, gt=0, description="Maximum frequency (Hz); defaults to Nyquist"),
    unit: str = Query("accel", description="Unit type: accel (acceleration in g), vel (velocity in mm/s), or disp (displacement in microns)"),
    db: Session = Depends(get_db),
):
    """
    Get downsampled FFT spectrum for plotting a single checkpoint axis.

    Returns a lightweight series suitable for charts (default 2000 points max)
    instead of the full FFT arrays.
    """
    if axis not in ("x", "y", "z"):
        raise HTTPException(status_code=400, detail="Axis must be 'x', 'y', or 'z'")

    try:
        return get_fft_plot(
            checkpoint_id=checkpoint_id,
            axis=axis,
            max_points=max_points,
            freq_min=freq_min,
            freq_max=freq_max,
            unit=unit,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"FFT plot failed: {str(e)}")


@router.get("/fft-plot/recent-base/{master_id}", response_model=FftPlotResponse)
def get_recent_base_fft_plot(
    master_id: int,
    axis: str = Query("x", description="Axis to plot: x, y, or z"),
    max_points: int = Query(2000, ge=10, le=20000, description="Max points in the plot series"),
    freq_min: float = Query(0.0, ge=0, description="Minimum frequency (Hz)"),
    freq_max: Optional[float] = Query(None, gt=0, description="Maximum frequency (Hz); defaults to Nyquist"),
    unit: str = Query("accel", description="Unit type: accel (acceleration in g), vel (velocity in mm/s), or disp (displacement in microns)"),
    db: Session = Depends(get_db),
):
    """
    Get downsampled FFT spectrum for plotting the most recent base checkpoint (is_base=True)
    associated with the given master_id.
    """
    from models.models import Checkpoint as CheckpointModel

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
        return get_fft_plot(
            checkpoint_id=base_checkpoint.id,
            axis=axis,
            max_points=max_points,
            freq_min=freq_min,
            freq_max=freq_max,
            unit=unit,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"FFT plot failed: {str(e)}")

