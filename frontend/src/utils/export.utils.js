import { API_BASE_URL } from '../config/api';

/**
 * Downloads a text/csv content as a file.
 */
function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Exports the raw time-domain signal to CSV.
 */
export async function exportRawSignal(cpId, axis, maxPoints) {
  try {
    const url = `${API_BASE_URL}/timedomain/plot/${cpId}?axis=${axis}&max_points=${maxPoints}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const json = await res.json();

    const timestamps = json.timestamps ?? [];
    const values = json.values ?? [];

    const csvRows = ['timestamp,value'];
    for (let i = 0; i < timestamps.length; i++) {
      csvRows.push(`${timestamps[i]},${values[i]}`);
    }

    downloadCSV(csvRows.join('\n'), `raw_signal_checkpoint${cpId}_${axis}.csv`);
  } catch (err) {
    console.error('Failed to export raw signal:', err);
    alert('Failed to export raw signal: ' + err.message);
  }
}

/**
 * Exports the FFT amplitude in acceleration, velocity, and displacement units to a single merged CSV.
 */
export async function exportFFTAllUnits(cpId, axis, maxPoints, freqMin, freqMax) {
  try {
    const fetchUnit = async (unit) => {
      let url = `${API_BASE_URL}/vibration/fft-plot/${cpId}?axis=${axis}&max_points=${maxPoints}&freq_min=${freqMin}&unit=${unit}`;
      if (freqMax !== '' && freqMax != null) url += `&freq_max=${freqMax}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch FFT for unit ${unit}`);
      return res.json();
    };

    const [accelData, velData, dispData] = await Promise.all([
      fetchUnit('accel'),
      fetchUnit('vel'),
      fetchUnit('disp')
    ]);

    const freqs = accelData.frequencies ?? [];
    const accelAmps = accelData.magnitudes ?? [];
    const velAmps = velData.magnitudes ?? [];
    const dispAmps = dispData.magnitudes ?? [];

    const csvRows = ['frequency_hz,acceleration_g,velocity_mms,displacement_um'];
    for (let i = 0; i < freqs.length; i++) {
      csvRows.push(`${freqs[i]},${accelAmps[i] ?? ''},${velAmps[i] ?? ''},${dispAmps[i] ?? ''}`);
    }

    downloadCSV(csvRows.join('\n'), `fft_all_units_checkpoint${cpId}_${axis}.csv`);
  } catch (err) {
    console.error('Failed to export FFT all units:', err);
    alert('Failed to export FFT data: ' + err.message);
  }
}

/**
 * Exports the canvas view of uPlot chart to PNG.
 */
export function exportGraphPNG(canvasEl, cpId, axis) {
  if (!canvasEl) {
    alert('Chart canvas not found.');
    return;
  }
  try {
    const url = canvasEl.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `graph_checkpoint${cpId}_${axis}.png`;
    a.click();
  } catch (err) {
    console.error('Failed to export PNG:', err);
    alert('Failed to export graph as PNG: ' + err.message);
  }
}

/**
 * Generates and downloads a complete report in Microsoft Word format (.doc).
 */
export function exportCompleteReportDoc({
  machineName,
  checkpointDetails,
  chartImageBase64,
  rmsSummaryData
}) {
  try {
    const safeMachineName = machineName || 'Vibration Analysis Report';
    const dateStr = new Date().toLocaleString();

    const rmsRows = rmsSummaryData.map(row => `
      <tr style="border-bottom: 1px solid #e2e8f0; background: ${row.isBase ? '#fef2f2' : 'transparent'};">
        <td style="padding: 10px 14px; font-weight: bold; color: ${row.color}; font-family: monospace;">${row.label}</td>
        <td style="padding: 10px 14px; text-align: right; font-family: monospace;">${row.bands['0–1 kHz'].toFixed(3)}</td>
        <td style="padding: 10px 14px; text-align: right; font-family: monospace;">${row.bands['1–3 kHz'].toFixed(3)}</td>
        <td style="padding: 10px 14px; text-align: right; font-family: monospace;">${row.bands['3–5 kHz'].toFixed(3)}</td>
        <td style="padding: 10px 14px; text-align: right; font-family: monospace;">${row.bands['5–10 kHz'].toFixed(3)}</td>
        <td style="padding: 10px 14px; text-align: right; font-weight: bold; color: ${row.color}; font-family: monospace;">${row.overall.toFixed(3)}</td>
      </tr>
    `).join('');

    const cpDetailsHtml = checkpointDetails.map(cp => `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 8px;">
        <div style="font-weight: bold; color: #1e293b; margin-bottom: 4px;">Session #${cp.id}</div>
        <div style="font-size: 13px; color: #475569;">
          Start Time: <strong>${cp.start ? new Date(cp.start).toLocaleString() : '—'}</strong><br/>
          End Time: <strong>${cp.end ? new Date(cp.end).toLocaleString() : '—'}</strong><br/>
          Duration: <strong>${cp.duration ? cp.duration.toFixed(1) + ' s' : '—'}</strong><br/>
          Axis: <strong>${cp.axis ? cp.axis.toUpperCase() : '—'}</strong>
        </div>
      </div>
    `).join('');

    const htmlContent = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>Vibration Spectrum Analysis Report</title>
  <style>
    body {
      font-family: 'Arial', sans-serif;
      color: #1e293b;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      color: #0f172a;
    }
    .meta {
      font-size: 13px;
      color: #64748b;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-top: 15px;
    }
    th {
      background: #f8fafc;
      color: #475569;
      font-weight: bold;
      padding: 10px 14px;
      text-align: right;
      border-bottom: 2px solid #e2e8f0;
    }
    th:first-child {
      text-align: left;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="title">Vibration Spectrum Analysis Report</h1>
    <div class="meta">
      Machine: <strong>${safeMachineName}</strong><br/>
      Generated on: <strong>${dateStr}</strong>
    </div>
  </div>

  <h2>Checkpoint Session Details</h2>
  ${cpDetailsHtml}

  <h2>FFT & Vibration Plot Spectrum</h2>
  <div style="background-color: #0f172a; padding: 12px; border: 1px solid #334155; border-radius: 8px; text-align: center; margin-bottom: 20px;">
    <img src="${chartImageBase64}" width="640" style="width: 6.5in; max-width: 100%; height: auto; display: inline-block;" border="0" alt="Vibration Plot" />
  </div>

  <h2>RMS Band Energy Summary</h2>
  <table border="1" style="border-collapse:collapse; width: 100%;">
    <thead>
      <tr>
        <th style="text-align: left; background-color: #f1f5f9;">Dataset</th>
        <th style="background-color: #f1f5f9;">0-1 kHz</th>
        <th style="background-color: #f1f5f9;">1-3 kHz</th>
        <th style="background-color: #f1f5f9;">3-5 kHz</th>
        <th style="background-color: #f1f5f9;">5-10 kHz</th>
        <th style="background-color: #f1f5f9;">Overall RMS</th>
      </tr>
    </thead>
    <tbody>
      ${rmsRows}
    </tbody>
  </table>
</body>
</html>
    `;

    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${safeMachineName.toString().replace(/\s+/g, '_').toLowerCase()}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to export Word report:', err);
    alert('Failed to generate Word report: ' + err.message);
  }
}
