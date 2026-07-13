"""
FFT + RMS analysis for vibration data written by UDPStreamIngester.
Table: record(checkpoint_id, timestamp, x, y, z)
NOTE: each row has only ONE of x/y/z populated (the streaming axis at
that moment) -- the other two columns are NULL. So per-axis analysis
filters on "<axis> IS NOT NULL", not by reading x,y,z together.

Requirements: pip install numpy psycopg2-binary
"""

import numpy as np
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Optional

from db import DATABASE_URL

DB_DSN = DATABASE_URL.replace("postgresql+psycopg2://", "postgresql://")

# Matches the ingester's hardware sample spacing (SAMPLE_DELTA_US ~= 37.5us)
SAMPLING_RATE = 26666.666  # Hz


def fetch_axis_samples(checkpoint_id: int, axis: str) -> np.ndarray:
    """axis must be 'x', 'y', or 'z'."""
    conn = psycopg2.connect(DB_DSN)
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(
            f"""
            SELECT {axis}
            FROM record
            WHERE checkpoint_id = %s AND {axis} IS NOT NULL
            ORDER BY timestamp ASC
            """,
            (checkpoint_id,),
        )
        rows = cur.fetchall()
    finally:
        conn.close()
    return np.array([r[axis] for r in rows], dtype=float)


def compute_rms(signal: np.ndarray) -> float:
    return float(np.sqrt(np.mean(np.square(signal))))


def compute_fft(signal: np.ndarray, sample_rate: float = SAMPLING_RATE):
    n = len(signal)
    signal = signal - np.mean(signal)  # remove DC offset
    freqs = np.fft.rfftfreq(n, d=1 / sample_rate)
    fft_vals = np.fft.rfft(signal)
    magnitude = np.abs(fft_vals) / n * 2
    magnitude[0] /= 2  # DC bin shouldn't be doubled
    return freqs, magnitude


def downsample_spectrum(freqs: np.ndarray, magnitudes: np.ndarray, max_points: int):
    """Reduce spectrum size while preserving peaks via per-bucket max-hold."""
    n = len(freqs)
    if n <= max_points:
        return freqs, magnitudes

    bucket_size = n / max_points
    out_freqs = []
    out_mags = []
    for i in range(max_points):
        start = int(i * bucket_size)
        end = int((i + 1) * bucket_size)
        if end <= start:
            end = start + 1
        chunk = magnitudes[start:end]
        peak_idx = start + int(np.argmax(chunk))
        out_freqs.append(freqs[peak_idx])
        out_mags.append(magnitudes[peak_idx])
    return np.array(out_freqs), np.array(out_mags)


def get_fft_plot(
    checkpoint_id: int,
    axis: str,
    max_points: int = 2000,
    freq_min: float = 0.0,
    freq_max: Optional[float] = None,
    unit: str = "accel",
) -> dict:
    """Compute downsampled FFT spectrum for plotting a single axis with optional integration to velocity or displacement."""
    signal = fetch_axis_samples(checkpoint_id, axis)
    if signal.size < 2:
        raise ValueError(f"No data available for axis '{axis}'")

    nyquist = SAMPLING_RATE / 2
    if freq_max is None:
        freq_max = nyquist
    if freq_min < 0:
        raise ValueError("freq_min must be >= 0")
    if freq_max <= freq_min:
        raise ValueError("freq_max must be greater than freq_min")
    if freq_max > nyquist:
        freq_max = nyquist

    freqs, magnitudes = compute_fft(signal)

    # Perform frequency domain integration if requested
    if unit == "vel":
        # Convert g to m/s^2 (x9.80665), integrate (/ 2*pi*f), convert to mm/s (x1000)
        with np.errstate(divide='ignore', invalid='ignore'):
            vel_mags = (magnitudes * 9.80665 * 1000.0) / (2 * np.pi * freqs)
            vel_mags[freqs == 0] = 0.0
            magnitudes = vel_mags
        # RMS from integrated spectrum
        rms = float(np.sqrt(np.sum((magnitudes[1:] / np.sqrt(2)) ** 2)))
    elif unit == "disp":
        # Convert g to m/s^2 (x9.80665), integrate twice (/ (2*pi*f)^2), convert to microns (x1e6)
        with np.errstate(divide='ignore', invalid='ignore'):
            disp_mags = (magnitudes * 9.80665 * 1e6) / ((2 * np.pi * freqs) ** 2)
            disp_mags[freqs == 0] = 0.0
            magnitudes = disp_mags
        # RMS from integrated spectrum
        rms = float(np.sqrt(np.sum((magnitudes[1:] / np.sqrt(2)) ** 2)))
    else:
        rms = compute_rms(signal)

    dominant_idx = int(np.argmax(magnitudes[1:]) + 1) if len(magnitudes) > 1 else 0
    dominant_frequency_hz = round(float(freqs[dominant_idx]), 2)
    dominant_amplitude = round(float(magnitudes[dominant_idx]), 6)

    mask = (freqs >= freq_min) & (freqs <= freq_max)
    freqs = freqs[mask]
    magnitudes = magnitudes[mask]
    if freqs.size == 0:
        raise ValueError("No FFT bins in the requested frequency range")

    freqs, magnitudes = downsample_spectrum(freqs, magnitudes, max_points)

    return {
        "checkpoint_id": checkpoint_id,
        "axis": axis,
        "sample_count": int(signal.size),
        "rms": round(rms, 6),
        "dominant_frequency_hz": dominant_frequency_hz,
        "dominant_amplitude": dominant_amplitude,
        "sampling_rate_hz": round(SAMPLING_RATE, 3),
        "freq_min": round(freq_min, 4),
        "freq_max": round(freq_max, 4),
        "max_points": max_points,
        "point_count": int(freqs.size),
        "frequencies": [round(float(f), 4) for f in freqs],
        "magnitudes": [round(float(m), 6) for m in magnitudes],
    }


def analyze_checkpoint(checkpoint_id: int, include_full_fft: bool = False) -> dict:
    result = {"checkpoint_id": checkpoint_id, "axes": {}}
    axis_rms = {}

    for axis in ("x", "y", "z"):
        signal = fetch_axis_samples(checkpoint_id, axis)
        if signal.size < 2:
            result["axes"][axis] = None
            continue

        rms = compute_rms(signal)
        freqs, magnitudes = compute_fft(signal)
        dominant_idx = int(np.argmax(magnitudes[1:]) + 1) if len(magnitudes) > 1 else 0

        axis_rms[axis] = rms
        axis_data = {
            "sample_count": int(signal.size),
            "rms": round(rms, 6),
            "dominant_frequency_hz": round(float(freqs[dominant_idx]), 2),
            "dominant_amplitude": round(float(magnitudes[dominant_idx]), 6),
        }
        
        # Only include full FFT arrays if requested (for large datasets)
        if include_full_fft:
            axis_data["fft_frequencies"] = [round(float(f), 4) for f in freqs]
            axis_data["fft_magnitudes"] = [round(float(m), 6) for m in magnitudes]
        
        result["axes"][axis] = axis_data

    result["overall_rms"] = (
        round(float(np.sqrt(sum(v ** 2 for v in axis_rms.values()))), 6)
        if axis_rms else None
    )
    return result


if __name__ == "__main__":
    CHECKPOINT_ID = 14
    result = analyze_checkpoint(CHECKPOINT_ID)

    for axis, data in result["axes"].items():
        if data is None:
            print(f"{axis.upper()}: no data")
            continue
        print(
            f"{axis.upper()} -> samples={data['sample_count']} "
            f"RMS={data['rms']} dominant_freq={data['dominant_frequency_hz']}Hz "
            f"amp={data['dominant_amplitude']}"
        )

    print(f"\nOverall RMS (all axes): {result['overall_rms']}")