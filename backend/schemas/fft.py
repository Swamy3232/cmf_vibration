from typing import List

from pydantic import BaseModel, Field


class FftPlotResponse(BaseModel):
    checkpoint_id: int
    axis: str
    sample_count: int
    rms: float
    dominant_frequency_hz: float
    dominant_amplitude: float
    sampling_rate_hz: float
    freq_min: float
    freq_max: float
    max_points: int
    point_count: int
    frequencies: List[float] = Field(description="Downsampled frequency bins (Hz)")
    magnitudes: List[float] = Field(description="Downsampled FFT magnitudes")
