from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db import get_db
from models.models import MasterTable as MasterTableModel
from services.defect import calculate_defects

router = APIRouter(prefix="/defects", tags=["defects"])


@router.get("/machine/{machine_id}")
def get_machine_defects(machine_id: int, db: Session = Depends(get_db)):
    """
    Get defect frequencies for all master tables associated with a machine.
    
    Args:
        machine_id: ID of the machine
        measurement_point: Measurement point name
        db: Database session
    
    Returns:
        List of defect calculations for each master table record
    """
    # Get all master tables for the given machine
    master_tables = db.query(MasterTableModel).filter(
        MasterTableModel.machine_id == machine_id
    ).all()
    
    if not master_tables:
        raise HTTPException(status_code=404, detail="No master tables found for this machine")
    
    results = []
    for master_table in master_tables:
        # Check if all required parameters are present
        if (master_table.no_of_balls is None or 
            master_table.ball_circle_diameter is None or 
            master_table.pitch_circle_diameter is None or 
            master_table.angle is None):
            results.append({
                "master_table_id": master_table.id,
                "device_id": master_table.device_id,
                "measurement_point": master_table.measurement_point,
                "error": "Missing required parameters for defect calculation"
            })
            continue
        
        # Calculate defects
        defects = calculate_defects(
            no_of_balls=master_table.no_of_balls,
            ball_circle_diameter=master_table.ball_circle_diameter,
            pitch_circle_diameter=master_table.pitch_circle_diameter,
            angle=master_table.angle
        )
        
        results.append({
            "master_table_id": master_table.id,
            "device_id": master_table.device_id,
            "measurement_point": master_table.measurement_point,
            "parameters": {
                "no_of_balls": master_table.no_of_balls,
                "ball_circle_diameter": master_table.ball_circle_diameter,
                "pitch_circle_diameter": master_table.pitch_circle_diameter,
                "angle": master_table.angle,
                "rpm": master_table.rpm
            },
            "defects": defects
        })
    
    return {
        "machine_id": machine_id,
        "total_records": len(results),
        "defects": results
    }


@router.get("/getdefect")
def get_defect_frequencies_calculator(
    no_of_balls: int = 9,
    ball_circle_diameter: float = 7.94,
    pitch_circle_diameter: float = 39.04,
    angle: float = 0.0,
):
    """
    Direct calculator endpoint to compute bearing defect frequencies from custom geometry inputs.
    """
    if pitch_circle_diameter <= 0 or ball_circle_diameter <= 0 or no_of_balls <= 0:
        raise HTTPException(status_code=400, detail="Diameters and number of balls must be positive values.")
    if ball_circle_diameter >= pitch_circle_diameter:
        raise HTTPException(status_code=400, detail="Ball circle diameter (bd) must be less than pitch circle diameter (pd).")

    try:
        defects = calculate_defects(
            no_of_balls=no_of_balls,
            ball_circle_diameter=ball_circle_diameter,
            pitch_circle_diameter=pitch_circle_diameter,
            angle=angle
        )
        return {
            "inputs": {
                "no_of_balls": no_of_balls,
                "ball_circle_diameter": ball_circle_diameter,
                "pitch_circle_diameter": pitch_circle_diameter,
                "angle": angle
            },
            "defects": defects
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
