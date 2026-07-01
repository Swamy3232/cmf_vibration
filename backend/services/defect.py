import math


def calculate_defects(no_of_balls: int, ball_circle_diameter: float, pitch_circle_diameter: float, angle: float) -> dict:
    """
    Calculate bearing defect frequencies based on bearing geometry parameters.
    
    Args:
        no_of_balls: Number of balls in the bearing
        ball_circle_diameter: Ball circle diameter (bd)
        pitch_circle_diameter: Pitch circle diameter (pd)
        angle: Contact angle in degrees
    
    Returns:
        Dictionary containing calculated defect frequencies:
        - outer_race: Outer race defect frequency
        - inner_race: Inner race defect frequency
        - ball_defect: Ball defect frequency
        - cage_defect: Cage defect frequency
    """
    # Convert angle to radians for cosine calculation
    angle_rad = math.radians(angle)
    
    # Calculate ratio bd/pd
    bd_pd_ratio = ball_circle_diameter / pitch_circle_diameter
    
    # Calculate cosine of angle
    cos_angle = math.cos(angle_rad)
    
    # Outer race defect frequency formula: (N/2) * (1 - (bd/pd) * cos(angle))
    outer_race = (no_of_balls / 2) * (1 - bd_pd_ratio * cos_angle)
    
    # Inner race defect frequency formula: (N/2) * (1 + (bd/pd) * cos(angle))
    inner_race = (no_of_balls / 2) * (1 + bd_pd_ratio * cos_angle)
    
    # Ball defect frequency formula: (pd/bd) * (1 - (bd/pd)^2 * cos^2(angle))
    ball_defect = (pitch_circle_diameter / ball_circle_diameter) * (1 - (bd_pd_ratio ** 2) * (cos_angle ** 2))
    
    # Cage defect frequency formula: (1/2) * (1 - (bd/pd) * cos(angle))
    cage_defect = 0.5 * (1 - bd_pd_ratio * cos_angle)
    
    return {
        "outer_race": outer_race,
        "inner_race": inner_race,
        "ball_defect": ball_defect,
        "cage_defect": cage_defect
    }
