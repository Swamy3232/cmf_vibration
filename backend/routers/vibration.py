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
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"FFT plot failed: {str(e)}")
