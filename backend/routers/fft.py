from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db import get_db
from services.fft import analyze_checkpoint

router = APIRouter(prefix="/fft", tags=["fft"])


@router.get("/checkpoint/{checkpoint_id}")
def get_checkpoint_fft_analysis(checkpoint_id: int, include_full_fft: bool = False, db: Session = Depends(get_db)):
    """
    Get FFT and RMS analysis for a specific checkpoint.
    
    Returns per-axis analysis including:
    - Sample count
    - RMS value
    - Dominant frequency and amplitude
    - Full FFT frequency and magnitude arrays (only if include_full_fft=true)
    - Overall RMS across all axes
    
    Query parameter:
    - include_full_fft: Set to true to include full FFT arrays (large response)
    """
    try:
        result = analyze_checkpoint(checkpoint_id, include_full_fft=include_full_fft)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"FFT analysis failed: {str(e)}")


@router.get("/checkpoint/{checkpoint_id}/axis/{axis}")
def get_axis_fft_analysis(checkpoint_id: int, axis: str, include_full_fft: bool = False, db: Session = Depends(get_db)):
    """
    Get FFT and RMS analysis for a specific axis of a checkpoint.
    
    Args:
        checkpoint_id: The checkpoint ID to analyze
        axis: The axis to analyze ('x', 'y', or 'z')
        include_full_fft: Set to true to include full FFT arrays (large response)
    
    Returns analysis for the specified axis only.
    """
    if axis not in ('x', 'y', 'z'):
        raise HTTPException(status_code=400, detail="Axis must be 'x', 'y', or 'z'")
    
    try:
        result = analyze_checkpoint(checkpoint_id, include_full_fft=include_full_fft)
        axis_data = result["axes"].get(axis)
        
        if axis_data is None:
            raise HTTPException(status_code=404, detail=f"No data available for axis '{axis}'")
        
        return {
            "checkpoint_id": checkpoint_id,
            "axis": axis,
            "analysis": axis_data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"FFT analysis failed: {str(e)}")


@router.get("/checkpoint/{checkpoint_id}/rms")
def get_checkpoint_rms(checkpoint_id: int, db: Session = Depends(get_db)):
    """
    Get RMS values for all axes of a checkpoint.
    
    Simplified endpoint that returns only RMS values without full FFT data.
    """
    try:
        result = analyze_checkpoint(checkpoint_id)
        rms_data = {
            "checkpoint_id": checkpoint_id,
            "overall_rms": result["overall_rms"],
            "axes": {}
        }
        
        for axis, data in result["axes"].items():
            if data is not None:
                rms_data["axes"][axis] = data["rms"]
            else:
                rms_data["axes"][axis] = None
        
        return rms_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RMS calculation failed: {str(e)}")
