// ============================================================
// defect.jsx  –  FFT Spectrum Analysis page
// Theme (dark / light) via useTheme() → getTheme(isDark)
// ============================================================
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

import { useTheme } from '../contexts/ThemeContext';
import {
  AXES, DANGER, ACCENT, WARNING,
  DEFAULT_FREQ_MIN, DEFAULT_FREQ_MAX, DEFAULT_MAX_POINTS,
  FFT_GRADIENT_ID, FftGradientDef,
  SkeletonCard, SkeletonChart,
  getTheme, makeTooltip,
  formatAmp, formatSR, formatCount, fmtXTick, fmtYTick,
} from '../theme/vibrationtheme.jsx';

import { API_BASE_URL } from '../config/api';
import { applyScaling } from '../utils/scalling';

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────
const Defect = ({ checkpointId }) => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const resolvedId = checkpointId ?? location.state?.checkpointId;

  // ── derive theme every render ───────────────
  const { COLORS, SHADOW, SHADOW_HOVER, styles, GLOBAL_CSS } = useMemo(
    () => getTheme(isDarkMode),
    [isDarkMode]
  );
  const CustomTooltip = useMemo(() => makeTooltip(COLORS), [COLORS]);

  // ── state ───────────────────────────────────
  const [selectedAxis, setSelectedAxis] = useState('x');
  const [checkpointPlots, setCheckpointPlots] = useState({});
  const [scalingType, setScalingType] = useState('linear');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [freqMin, setFreqMin] = useState(DEFAULT_FREQ_MIN);
  const [freqMax, setFreqMax] = useState(DEFAULT_FREQ_MAX);
  const [maxPoints, setMaxPoints] = useState(DEFAULT_MAX_POINTS);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // ── dropdown selector states ────────────────
  const [selectedCheckpointIds, setSelectedCheckpointIds] = useState(resolvedId ? [resolvedId] : []);
  const [machines, setMachines] = useState([]);
  const [masterTables, setMasterTables] = useState([]);
  const [briefCheckpoints, setBriefCheckpoints] = useState([]);
  const [selectedMasterId, setSelectedMasterId] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // ── slider zoom state (client-side, no API call) ───
  const [sliderMin, setSliderMin] = useState(0);
  const [sliderMax, setSliderMax] = useState(0);
  const sliderRef = useRef(null);

  // ── base FFT overlay state ───────────────────
  const [baseChartData, setBaseChartData] = useState([]);
  const [baseData, setBaseData] = useState(null);
  const [showBase, setShowBase] = useState(false);
  const [baseLoading, setBaseLoading] = useState(false);

  // ── legend toggle states ─────────────────────
  const [hiddenCheckpointIds, setHiddenCheckpointIds] = useState(new Set());
  const [hideBase, setHideBase] = useState(false);

  // ── plot mode toggle state ───────────────────
  const [mode, setMode] = useState('fft'); // 'fft', 'time', or 'trend'
  const [selectedUnit, setSelectedUnit] = useState('accel'); // 'accel', 'vel', 'disp'
  const [trendData, setTrendData] = useState([]);
  const [baseRms, setBaseRms] = useState(null);
  const [trendDays, setTrendDays] = useState(7);
  const [trendLoading, setTrendLoading] = useState(false);

  // ── defects toggle states ─────────────────────
  const [defectFrequencies, setDefectFrequencies] = useState(null);
  const [showDefects, setShowDefects] = useState(false);
  const [defectsLoading, setDefectsLoading] = useState(false);


  const chartRef = useRef(null);
  const uplotInstRef = useRef(null);
  const debounceRef = useRef(null);

  // ── fetch ────────────────────────────────────
  const fetchSinglePlotData = useCallback(async (cpId, axis, fMin, fMax, mPoints, currentMode, selectedUnitVal, signal) => {
    let url = "";
    if (currentMode === 'time') {
      url = `${API_BASE_URL}/timedomain/plot/${cpId}?axis=${axis}&max_points=${mPoints}`;
    } else {
      url = `${API_BASE_URL}/vibration/fft-plot/${cpId}?axis=${axis}&max_points=${mPoints}&freq_min=${fMin}&unit=${selectedUnitVal}`;
      if (fMax !== '' && fMax != null) url += `&freq_max=${fMax}`;
    }

    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const json = await res.json();

    let chartPts = [];
    if (currentMode === 'time') {
      const tStamps = json.timestamps ?? [];
      const vals = json.values ?? [];
      if (tStamps.length > 0) {
        const startTime = new Date(tStamps[0]).getTime();
        chartPts = tStamps.map((t, i) => {
          const relTimeSec = (new Date(t).getTime() - startTime) / 1000;
          return { freq: relTimeSec, amplitude: vals[i] };
        });
      }
    } else {
      const freqs = json.frequencies ?? [];
      const amps = json.magnitudes ?? [];
      chartPts = freqs.map((freq, i) => ({ freq, amplitude: amps[i] }));
    }
    return { data: json, chartData: chartPts };
  }, []);

  const fetchTrendData = useCallback(async (masterId, axis, days) => {
    if (!masterId) return;
    setTrendLoading(true);
    try {
      const point = `${axis}_rms`;
      const [trendRes, baseRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/rms/trend?master_id=${masterId}&point=${point}&days=${days}`),
        fetch(`${API_BASE_URL}/api/rms/base?master_id=${masterId}&point=${point}`)
      ]);
      
      let trendJson = [];
      if (trendRes.ok) {
        trendJson = await trendRes.json();
      }
      
      let baseJson = null;
      if (baseRes.ok) {
        baseJson = await baseRes.json();
      }
      
      setTrendData(trendJson);
      setBaseRms(baseJson);
    } catch (err) {
      console.error("Error fetching trend/base RMS:", err);
    } finally {
      setTrendLoading(false);
    }
  }, []);

  const fetchPlotData = useCallback(async (axis, fMin, fMax, mPoints, currentMode) => {
    if (currentMode === 'trend') {
      if (selectedMasterId) {
        setLoading(true);
        await fetchTrendData(selectedMasterId, axis, trendDays);
        setLoading(false);
      }
      return;
    }
    if (selectedCheckpointIds.length === 0) {
      setCheckpointPlots({});
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const promises = selectedCheckpointIds.map(async (cpId) => {
      try {
        const res = await fetchSinglePlotData(cpId, axis, fMin, fMax, mPoints, currentMode, selectedUnit, null);
        return { cpId, ...res, error: null };
      } catch (err) {
        return { cpId, data: null, chartData: [], error: err.message };
      }
    });

    try {
      const results = await Promise.all(promises);
      const nextPlots = {};
      results.forEach(res => {
        nextPlots[res.cpId] = res;
      });
      setCheckpointPlots(nextPlots);

      const allFailed = results.every(r => r.error);
      if (allFailed && results.length > 0) {
        setError(results[0].error);
      } else {
        setError(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedCheckpointIds, selectedAxis, mode, selectedUnit, fetchSinglePlotData, selectedMasterId, trendDays, fetchTrendData]);

  useEffect(() => {
    if (mode === 'trend') {
      if (selectedMasterId) {
        fetchPlotData(selectedAxis, freqMin, freqMax, maxPoints, mode);
      }
      return;
    }
    if (selectedCheckpointIds.length === 0) {
      setError('No checkpoint ID selected.');
      setLoading(false);
      return;
    }
    fetchPlotData(selectedAxis, freqMin, freqMax, maxPoints, mode);
    // If showBase is active, re-fetch base plot with new parameters/axis
    if (showBase) {
      fetchBasePlotData(selectedAxis, freqMin, freqMax, maxPoints, mode);
    } else {
      setBaseChartData([]);
      setBaseData(null);
    }
  }, [selectedAxis, selectedCheckpointIds, mode, selectedUnit, freqMin, freqMax, maxPoints, selectedMasterId, trendDays]);

  // Load machines, configs, and active checkpoint metadata on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        const [machinesRes, masterTablesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/machine/`),
          fetch(`${API_BASE_URL}/master-table/`),
        ]);
        if (!machinesRes.ok || !masterTablesRes.ok) throw new Error("Failed to load machines data");
        const machs = await machinesRes.json();
        const masters = await masterTablesRes.json();
        setMachines(machs);
        setMasterTables(masters);

        const cpId = selectedCheckpointIds[0];
        if (cpId) {
          const cpRes = await fetch(`${API_BASE_URL}/checkpoint/${cpId}`);
          if (cpRes.ok) {
            const cpJson = await cpRes.json();
            setSelectedMasterId(cpJson.master_id);
            const briefRes = await fetch(`${API_BASE_URL}/checkpoint/brief?master_id=${cpJson.master_id}`);
            if (briefRes.ok) {
              setBriefCheckpoints(await briefRes.json());
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    initialize();
  }, []);

  // Handle machine selection change
  const handleMachineDropdownChange = async (masterIdStr) => {
    const masterId = masterIdStr ? parseInt(masterIdStr, 10) : null;
    setSelectedMasterId(masterId);
    if (!masterId) {
      setBriefCheckpoints([]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/checkpoint/brief?master_id=${masterId}`);
      if (res.ok) {
        const briefList = await res.json();
        setBriefCheckpoints(briefList);
        if (briefList.length > 0) {
          setSelectedCheckpointIds([briefList[0].id]);
        } else {
          setSelectedCheckpointIds([]);
          setCheckpointPlots({});
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // reset slider whenever chart data is replaced
  useEffect(() => {
    if (mode === 'trend') return;
    const primaryCpId = selectedCheckpointIds[0];
    const primaryChartData = checkpointPlots[primaryCpId]?.chartData;
    if (!primaryChartData || primaryChartData.length < 2) return;
    const lo = primaryChartData[0].freq;
    const hi = primaryChartData[primaryChartData.length - 1].freq;
    setSliderMin(lo);
    setSliderMax(hi);
  }, [selectedCheckpointIds, checkpointPlots, mode]);

  const triggerDebounced = () => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => fetchPlotData(selectedAxis, freqMin, freqMax, maxPoints, mode), 600
    );
  };

  // ── handlers ─────────────────────────────────
  const handleAxisChange = (axis) => { if (axis !== selectedAxis) setSelectedAxis(axis); };
  const handleRetry = () => fetchPlotData(selectedAxis, freqMin, freqMax, maxPoints, mode);
  const handleFreqMinChange = (e) => { setFreqMin(e.target.value); triggerDebounced(); };
  const handleFreqMaxChange = (e) => { setFreqMax(e.target.value); triggerDebounced(); };
  const handleMaxPointsChange = (e) => { setMaxPoints(e.target.value); triggerDebounced(); };

  // ── fetch base plot helper ───────────────────
  const fetchBasePlotData = async (axis, fMin, fMax, mPoints, currentMode) => {
    const cpId = selectedCheckpointIds[0];
    if (!cpId) return;
    try {
      setBaseLoading(true);
      // Get master_id from checkpoint first
      const cpRes = await fetch(`${API_BASE_URL}/checkpoint/${cpId}`);
      if (!cpRes.ok) throw new Error("Could not find checkpoint metadata.");
      const cpJson = await cpRes.json();
      const masterId = cpJson.master_id;

      let url = "";
      if (currentMode === 'time') {
        url = `${API_BASE_URL}/timedomain/plot/recent-base/${masterId}?axis=${axis}&max_points=${mPoints}`;
      } else {
        url = `${API_BASE_URL}/vibration/fft-plot/recent-base/${masterId}?axis=${axis}&max_points=${mPoints}&freq_min=${fMin}&unit=${selectedUnit}`;
        if (fMax !== '' && fMax != null) url += `&freq_max=${fMax}`;
      }

      const res = await fetch(url);
      if (res.status === 404) {
        alert("No base data available for this machine.");
        setShowBase(false);
        setBaseChartData([]);
        setBaseData(null);
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch base plot data.");

      const json = await res.json();
      setBaseData(json);

      if (currentMode === 'time') {
        const tStamps = json.timestamps ?? [];
        const vals = json.values ?? [];
        if (tStamps.length > 0) {
          const startTime = new Date(tStamps[0]).getTime();
          setBaseChartData(tStamps.map((t, i) => {
            const relTimeSec = (new Date(t).getTime() - startTime) / 1000;
            return { freq: relTimeSec, amplitude: vals[i] };
          }));
        } else {
          setBaseChartData([]);
        }
      } else {
        const freqs = json.frequencies ?? [];
        const amps = json.magnitudes ?? [];
        setBaseChartData(freqs.map((freq, i) => ({ freq, amplitude: amps[i] })));
      }
    } catch (err) {
      alert(err.message || "Failed to load base plot data.");
      setShowBase(false);
      setBaseChartData([]);
      setBaseData(null);
    } finally {
      setBaseLoading(false);
    }
  };

  const handleToggleBase = async () => {
    if (showBase) {
      setShowBase(false);
      setBaseChartData([]);
      setBaseData(null);
      setHideBase(false);
    } else {
      setShowBase(true);
      await fetchBasePlotData(selectedAxis, freqMin, freqMax, maxPoints, mode);
    }
  };

  const handleToggleDefects = async () => {
    if (showDefects) {
      setShowDefects(false);
    } else {
      if (!defectFrequencies) {
        await fetchDefects();
      } else {
        setShowDefects(true);
      }
    }
  };

  const fetchDefects = async () => {
    try {
      setDefectsLoading(true);
      const mt = masterTables.find(m => m.id === selectedMasterId);
      if (!mt) throw new Error("No machine selected.");

      const res = await fetch(`${API_BASE_URL}/defects/machine/${mt.machine_id}`);
      if (!res.ok) throw new Error("Failed to fetch defect frequencies.");
      const json = await res.json();

      const masterDefectData = json.defects.find(d => d.master_table_id === selectedMasterId);
      if (masterDefectData && masterDefectData.defects) {
        setDefectFrequencies(masterDefectData.defects);
        setShowDefects(true);
      } else if (masterDefectData && masterDefectData.error) {
        alert("Defect Error: " + masterDefectData.error);
        setShowDefects(false);
      } else {
        alert("No defect frequencies calculated for this checkpoint's master table.");
        setShowDefects(false);
      }
    } catch (err) {
      alert(err.message || "Failed to load defects.");
      setShowDefects(false);
    } finally {
      setDefectsLoading(false);
    }
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setHiddenCheckpointIds(new Set());
    setHideBase(false);
  };

  const colorsPalette = [
    ACCENT,
    '#a855f7',
    '#10b981',
    '#f59e0b',
    '#ec4899',
    '#3b82f6',
  ];

  const primaryCpId = selectedCheckpointIds[0];
  const primaryPlot = checkpointPlots[primaryCpId];
  const primaryData = primaryPlot?.data;
  const primaryChartData = primaryPlot?.chartData ?? [];

  const dominantFreq = primaryData?.dominant_frequency_hz;

  // filter and merge current/base FFT datasets using nearest-frequency matching
  const displayData = useMemo(() => {
    if (mode === 'trend') {
      if (!trendData || !trendData.length) return [];
      return trendData.map(d => {
        return {
          freq: new Date(d.start).getTime() / 1000,
          dateStr: new Date(d.start).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
          trendValue: d.value,
          baseValue: baseRms ? baseRms.value : null
        };
      });
    }

    if (!primaryChartData.length) return [];

    const filteredPrimary = primaryChartData.filter(d => d.freq >= sliderMin && d.freq <= sliderMax);

    return filteredPrimary.map(d => {
      const row = { freq: d.freq };
      row[`amp_${primaryCpId}`] = applyScaling(d.amplitude, scalingType);

      selectedCheckpointIds.slice(1).forEach(cpId => {
        const otherPlot = checkpointPlots[cpId];
        if (otherPlot && otherPlot.chartData && otherPlot.chartData.length) {
          let closestVal = null;
          let minDiff = Infinity;
          for (let i = 0; i < otherPlot.chartData.length; i++) {
            const diff = Math.abs(otherPlot.chartData[i].freq - d.freq);
            if (diff < minDiff) {
              minDiff = diff;
              closestVal = otherPlot.chartData[i].amplitude;
            }
          }
          row[`amp_${cpId}`] = applyScaling(closestVal, scalingType);
        } else {
          row[`amp_${cpId}`] = null;
        }
      });

      if (showBase && baseChartData.length > 0) {
        let closestVal = null;
        let minDiff = Infinity;
        for (let i = 0; i < baseChartData.length; i++) {
          const diff = Math.abs(baseChartData[i].freq - d.freq);
          if (diff < minDiff) {
            minDiff = diff;
            closestVal = baseChartData[i].amplitude;
          }
        }
        row.baseAmplitude = applyScaling(closestVal, scalingType);
      }

      return row;
    });
  }, [selectedCheckpointIds, checkpointPlots, baseChartData, showBase, sliderMin, sliderMax, primaryChartData, primaryCpId, scalingType, mode, trendData, baseRms]);


  // ── uPlot Rendering Effect ───────────────────
  useEffect(() => {
    if (!chartRef.current || !displayData.length) return;

    if (uplotInstRef.current) {
      uplotInstRef.current.destroy();
    }

    const xVals = displayData.map(d => d.freq);
    const dataSeries = [xVals];

    const series = [
      {}, // x-series
    ];

    if (mode === 'trend') {
      dataSeries.push(displayData.map(d => d.trendValue));
      series.push({
        label: "RMS Trend",
        show: true,
        stroke: ACCENT,
        width: 2.2,
        fill: isDarkMode ? "rgba(6, 182, 212, 0.05)" : "transparent",
      });

      if (baseRms) {
        dataSeries.push(displayData.map(d => d.baseValue));
        series.push({
          label: "Base RMS",
          show: true,
          stroke: DANGER,
          width: 1.8,
          fill: "transparent",
          dash: [5, 5]
        });
      }
    } else {
      selectedCheckpointIds.forEach((cpId, idx) => {
        const cpVal = briefCheckpoints.find(c => c.id === cpId);
        const formattedDate = cpVal && cpVal.start
          ? new Date(cpVal.start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
          : `CP-${cpId}`;
        const seriesLabel = `${formattedDate} (#${cpId})`;
        const color = colorsPalette[idx % colorsPalette.length];

        dataSeries.push(displayData.map(d => d[`amp_${cpId}`]));
        series.push({
          label: seriesLabel,
          show: !hiddenCheckpointIds.has(cpId),
          stroke: color,
          width: 1.8,
          fill: isDarkMode ? `rgba(${idx === 0 ? '6, 182, 212' : '168, 85, 247'}, 0.04)` : 'transparent',
        });
      });

      if (showBase && baseChartData.length > 0) {
        const yBaseVals = displayData.map(d => d.baseAmplitude);
        dataSeries.push(yBaseVals);
        series.push({
          label: "Base",
          show: !hideBase,
          stroke: DANGER,
          width: 1.8,
          fill: "transparent",
        });
      }
    }

    // Plugin to draw dominant frequency reference line
    const drawDominantLinePlugin = () => {
      return {
        hooks: {
          draw: (self) => {
            if (!dominantFreq || mode !== 'fft') return;
            const { ctx } = self;
            const xPos = self.valToPos(dominantFreq, 'x', true);
            ctx.save();
            ctx.beginPath();
            ctx.setLineDash([5, 4]);
            ctx.strokeStyle = DANGER;
            ctx.lineWidth = 1.5;
            ctx.moveTo(xPos, self.bbox.top);
            ctx.lineTo(xPos, self.bbox.top + self.bbox.height);
            ctx.stroke();

            // Draw text label
            ctx.fillStyle = DANGER;
            ctx.font = "bold 10px sans-serif";
            ctx.textAlign = "left";
            ctx.fillText(`Dominant (${Number(dominantFreq).toFixed(1)} Hz)`, xPos + 6, self.bbox.top + 16);
            ctx.restore();
          }
        }
      };
    };

    // Plugin to draw defect frequency lines
    const drawDefectsPlugin = () => {
      return {
        hooks: {
          draw: (self) => {
            if (!showDefects || !defectFrequencies || mode !== 'fft') return;
            const { ctx } = self;

            const colors = {
              outer_race: '#ef4444', // red
              inner_race: '#f97316', // orange
              ball_defect: '#3b82f6', // blue
              cage_defect: '#10b981'  // green
            };
            const labels = {
              outer_race: 'BPFO',
              inner_race: 'BPFI',
              ball_defect: 'BSF',
              cage_defect: 'FTF'
            };

            Object.entries(defectFrequencies).forEach(([key, freq], idx) => {
              if (!freq) return;
              const xPos = self.valToPos(freq, 'x', true);
              // Only draw if within bounds
              if (xPos < self.bbox.left || xPos > self.bbox.left + self.bbox.width) return;

              ctx.save();
              ctx.beginPath();
              ctx.setLineDash([2, 4]); // Dotted line instead of dashed
              ctx.strokeStyle = colors[key] || '#888';
              ctx.lineWidth = 1.5;
              ctx.moveTo(xPos, self.bbox.top);
              ctx.lineTo(xPos, self.bbox.top + self.bbox.height);
              ctx.stroke();

              // Draw text label
              ctx.fillStyle = colors[key] || '#888';
              ctx.font = "bold 10px sans-serif";
              ctx.textAlign = "left";
              ctx.fillText(`${labels[key] || key} (${freq.toFixed(1)} Hz)`, xPos + 4, self.bbox.top + 12 + (idx * 14));
              ctx.restore();
            });
          }
        }
      };
    };

    // Plugin for X & Y coordinates HTML tooltip box
    const tooltipPlugin = () => {
      let tooltip;
      return {
        hooks: {
          init: (self) => {
            tooltip = document.createElement("div");
            tooltip.className = "uplot-tooltip";
            tooltip.style.position = "absolute";
            tooltip.style.display = "none";
            tooltip.style.padding = "8px 12px";
            tooltip.style.background = isDarkMode ? "#1e293b" : "#ffffff";
            tooltip.style.border = `1px solid ${COLORS.border}`;
            tooltip.style.borderRadius = "8px";
            tooltip.style.boxShadow = "0 4px 12px rgba(0,0,0,0.25)";
            tooltip.style.color = COLORS.text;
            tooltip.style.fontSize = "12px";
            tooltip.style.fontFamily = "monospace";
            tooltip.style.pointerEvents = "none";
            tooltip.style.zIndex = "99999";
            tooltip.style.whiteSpace = "nowrap";
            self.root.parentNode.appendChild(tooltip);
          },
          setCursor: (self) => {
            const { idx } = self.cursor;
            if (idx === null || idx === undefined || idx < 0) {
              tooltip.style.display = "none";
              return;
            }
            const xVal = self.data[0][idx];
            if (xVal === undefined) {
              tooltip.style.display = "none";
              return;
            }

            if (mode === 'trend') {
              const item = displayData[idx];
              if (item) {
                let html = `<div><strong>Time:</strong> ${item.dateStr}</div>`;
                const trendVal = self.data[1]?.[idx];
                if (trendVal !== undefined && trendVal !== null) {
                  html += `<div style="color: ${ACCENT};"><strong>RMS Value:</strong> ${trendVal.toFixed(4)} g</div>`;
                }
                if (baseRms) {
                  const baseVal = self.data[2]?.[idx];
                  if (baseVal !== undefined && baseVal !== null) {
                    html += `<div style="color: ${DANGER};"><strong>Base RMS:</strong> ${baseVal.toFixed(4)} g</div>`;
                  }
                }
                tooltip.innerHTML = html;
              }
            } else {
              const unitSuff = mode === 'time' ? 'g' : (selectedUnit === 'vel' ? 'mm/s' : (selectedUnit === 'disp' ? 'µm' : 'g'));
              let html = `<div><strong>X:</strong> ${mode === 'time' ? `${xVal.toFixed(3)}s` : `${xVal.toFixed(1)} Hz`}</div>`;
              
              selectedCheckpointIds.forEach((cpId, sIdx) => {
                const yVal = self.data[sIdx + 1]?.[idx];
                if (yVal !== undefined && yVal !== null && !hiddenCheckpointIds.has(cpId)) {
                  const color = colorsPalette[sIdx % colorsPalette.length];
                  const cpVal = briefCheckpoints.find(c => c.id === cpId);
                  const formattedDate = cpVal && cpVal.start
                    ? new Date(cpVal.start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                    : `CP-${cpId}`;
                  html += `<div style="color: ${color};"><strong>${formattedDate}:</strong> ${yVal.toExponential(4)} ${unitSuff}</div>`;
                }
              });

              if (showBase && baseChartData.length > 0 && !hideBase) {
                const baseSeriesIdx = selectedCheckpointIds.length + 1;
                const baseVal = self.data[baseSeriesIdx]?.[idx];
                if (baseVal !== undefined && baseVal !== null) {
                  html += `<div style="color: ${DANGER};"><strong>Base:</strong> ${baseVal.toExponential(4)} ${unitSuff}</div>`;
                }
              }

              tooltip.innerHTML = html;
            }

            const cx = self.cursor.left;
            const cy = self.cursor.top;
            if (cx >= 0 && cy >= 0) {
              tooltip.style.display = "block";
              // Position relative to .u-wrap using bbox offsets
              tooltip.style.left = `${self.bbox.left + cx + 15}px`;
              tooltip.style.top = `${self.bbox.top + cy + 15}px`;
            } else {
              tooltip.style.display = "none";
            }
          },
          destroy: (self) => {
            if (tooltip) tooltip.remove();
          }
        }
      };
    };

    const opts = {
      width: chartRef.current.offsetWidth || 800,
      height: 340,
      title: "",
      cursor: {
        show: true
      },
      scales: {
        x: { time: false },
      },
      series: series,
      plugins: [drawDominantLinePlugin(), drawDefectsPlugin(), tooltipPlugin()],
      axes: [
        {
          space: 50,
          stroke: COLORS.textSecondary,
          grid: { stroke: COLORS.gridStroke, width: 1 },
          values: mode === 'trend'
            ? (self, ticks) => ticks.map(t => new Date(t * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }))
            : (mode === 'time'
                ? (self, ticks) => ticks.map(t => `${t.toFixed(3)}s`)
                : (self, ticks) => ticks.map(t => t >= 1000 ? `${(t / 1000).toFixed(1)}k` : t.toFixed(0))
              ),
        },
        {
          space: 30,
          stroke: COLORS.textSecondary,
          grid: { stroke: COLORS.gridStroke, width: 1 },
          values: (self, ticks) => ticks.map(t => {
            if (mode === 'trend') {
              return t.toFixed(4);
            }
            if (scalingType === 'log') {
              return `10^${t.toFixed(0)}`;
            }
            return t.toExponential(1);
          }),
        }
      ],
      legend: { show: false }
    };

    const plot = new uPlot(opts, dataSeries, chartRef.current);
    uplotInstRef.current = plot;

    const handleResize = () => {
      if (uplotInstRef.current && chartRef.current) {
        uplotInstRef.current.setSize({
          width: chartRef.current.offsetWidth,
          height: 340
        });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (uplotInstRef.current) {
        uplotInstRef.current.destroy();
        uplotInstRef.current = null;
      }
    };
  }, [displayData, showBase, mode, isDarkMode, COLORS, hiddenCheckpointIds, hideBase, dominantFreq, selectedUnit, showDefects, defectFrequencies, selectedCheckpointIds, briefCheckpoints, scalingType, baseRms]);

  const handleExport = () => {
    if (!primaryChartData.length) return;
    const csv = ['frequency_hz,amplitude', ...primaryChartData.map(d => `${d.freq},${d.amplitude}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fft_checkpoint${primaryCpId}_${selectedAxis}.csv`;
    a.click();
  };

  // ── derived metrics ──────────────────────────
  const METRICS = [
    {
      label: 'RMS',
      unit: mode === 'time' ? 'g' : (selectedUnit === 'vel' ? 'mm/s' : (selectedUnit === 'disp' ? 'µm' : 'g')),
      baseValue: showBase && baseData?.rms ? Number(baseData.rms).toFixed(6) : null,
      checkpointValues: selectedCheckpointIds.map((cpId, idx) => {
        const cpPlot = checkpointPlots[cpId];
        const cpData = cpPlot?.data;
        const cpVal = briefCheckpoints.find(c => c.id === cpId);
        const dateStr = cpVal && cpVal.start
          ? new Date(cpVal.start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
          : `CP-${cpId}`;
        return {
          cpId,
          color: colorsPalette[idx % colorsPalette.length],
          label: dateStr,
          value: cpData?.rms ? Number(cpData.rms).toFixed(6) : '—'
        };
      })
    },
    {
      label: 'Dominant Frequency',
      unit: 'Hz',
      baseValue: showBase && baseData?.dominant_frequency_hz ? Number(baseData.dominant_frequency_hz).toFixed(1) : null,
      checkpointValues: selectedCheckpointIds.map((cpId, idx) => {
        const cpPlot = checkpointPlots[cpId];
        const cpData = cpPlot?.data;
        const cpVal = briefCheckpoints.find(c => c.id === cpId);
        const dateStr = cpVal && cpVal.start
          ? new Date(cpVal.start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
          : `CP-${cpId}`;
        return {
          cpId,
          color: colorsPalette[idx % colorsPalette.length],
          label: dateStr,
          value: cpData?.dominant_frequency_hz ? Number(cpData.dominant_frequency_hz).toFixed(1) : '—'
        };
      })
    },
    {
      label: 'Dominant Amplitude',
      unit: mode === 'time' ? 'g' : (selectedUnit === 'vel' ? 'mm/s' : (selectedUnit === 'disp' ? 'µm' : 'g')),
      baseValue: showBase && baseData?.dominant_amplitude ? formatAmp(baseData.dominant_amplitude) : null,
      checkpointValues: selectedCheckpointIds.map((cpId, idx) => {
        const cpPlot = checkpointPlots[cpId];
        const cpData = cpPlot?.data;
        const cpVal = briefCheckpoints.find(c => c.id === cpId);
        const dateStr = cpVal && cpVal.start
          ? new Date(cpVal.start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
          : `CP-${cpId}`;
        return {
          cpId,
          color: colorsPalette[idx % colorsPalette.length],
          label: dateStr,
          value: cpData ? formatAmp(cpData.dominant_amplitude) : '—'
        };
      })
    }
  ];


  // ── slider derived values ────────────────────
  const dataFreqLo = primaryChartData.length ? primaryChartData[0].freq : 0;
  const dataFreqHi = primaryChartData.length ? primaryChartData[primaryChartData.length - 1].freq : 1;
  const freqRange = dataFreqHi - dataFreqLo || 1;
  const leftPct = ((sliderMin - dataFreqLo) / freqRange) * 100;
  const rightPct = 100 - ((sliderMax - dataFreqLo) / freqRange) * 100;
  const isFullRange = sliderMin === dataFreqLo && sliderMax === dataFreqHi;

  // clamp helper
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

  // pointer-drag handler factory
  const makeDragHandler = (handle) => (e) => {
    e.preventDefault();
    const rect = sliderRef.current.getBoundingClientRect();
    const onMove = (ev) => {
      const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
      const freq = dataFreqLo + ratio * freqRange;
      if (handle === 'left') setSliderMin(clamp(freq, dataFreqLo, sliderMax - freqRange * 0.01));
      if (handle === 'right') setSliderMax(clamp(freq, sliderMin + freqRange * 0.01, dataFreqHi));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  };

  const resetSlider = () => { setSliderMin(dataFreqLo); setSliderMax(dataFreqHi); };

  // ── hover helpers ────────────────────────────
  const onCardEnter = (e) => {
    e.currentTarget.style.transform = 'translateY(-2px)';
    e.currentTarget.style.boxShadow = SHADOW_HOVER;
    e.currentTarget.style.borderLeftColor = ACCENT;
  };
  const onCardLeave = (e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = SHADOW;
    e.currentTarget.style.borderLeftColor = ACCENT;
  };

  // ── sub-components ───────────────────────────
  const LoadingUI = () => (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {Array(3).fill(0).map((_, i) => <SkeletonCard key={i} isDark={isDarkMode} cardStyle={styles.metricCard} />)}
      </div>
      <SkeletonChart cardStyle={styles.card} isDark={isDarkMode} />
    </>
  );

  const ErrorUI = () => (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '60px 24px', background: COLORS.card, border: `1px solid ${COLORS.border}`,
      borderRadius: 10, boxShadow: SHADOW, textAlign: 'center', marginTop: 20,
    }}>
      <div style={{ fontSize: 36, marginBottom: 16, color: DANGER, opacity: 0.8 }}>⚠</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 6, letterSpacing: '0.02em' }}>
        SPECTRUM DATA UNAVAILABLE
      </div>
      <div style={{ fontSize: 12, color: COLORS.textSecondary, maxWidth: 360, lineHeight: 1.7, fontFamily: "'JetBrains Mono', monospace" }}>
        {error}
      </div>
      <button style={styles.retryBtn} onClick={handleRetry}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 16px ${ACCENT}55`; e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}>
        ↻ &nbsp;Retry
      </button>
    </div>
  );

  const EmptyState = () => (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '60px 24px', background: COLORS.card, border: `1px solid ${COLORS.border}`,
      borderRadius: 10, boxShadow: SHADOW, textAlign: 'center', marginTop: 20,
    }}>
      <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.18, color: ACCENT }}>◈</div>
      <div style={{
        fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 6,
        letterSpacing: '0.08em', textTransform: 'uppercase'
      }}>
        No Spectrum Data
      </div>
      <div style={{ fontSize: 12, color: COLORS.textSecondary, fontFamily: "'JetBrains Mono', monospace" }}>
        Checkpoints {selectedCheckpointIds.join(', ') || '—'} · {selectedAxis.toUpperCase()} axis · no records found
      </div>
    </div>
  );

  const TBtn = ({ onClick, children, disabled, active = false, danger = false }) => (
    <button
      className={`vib-tbtn${active ? ' vib-tbtn-active' : ''}${danger && active ? ' vib-tbtn-danger-active' : ''}`}
      style={{ ...styles.toolbarBtn, opacity: disabled ? 0.45 : 1 }}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // ── render ───────────────────────────────────
  return (
    <>
      <style>{GLOBAL_CSS}</style>

      <div style={styles.page} className="vib-page-fade">

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span className="status-dot" title="System active" />
              <h1 style={{
                fontSize: 18, fontWeight: 800, margin: 0, color: COLORS.text,
                letterSpacing: '0.04em', textTransform: 'uppercase',
                fontFamily: "'Inter', sans-serif",
              }}>
                Vibration Spectrum Analysis
              </h1>
              <span style={{
                padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                background: COLORS.accentDim, color: ACCENT, letterSpacing: '0.1em',
                fontFamily: "'JetBrains Mono', monospace", border: `1px solid ${COLORS.border}`,
              }}>
                FFT
              </span>
            </div>
            <p style={{
              fontSize: 11, color: COLORS.textSecondary, margin: 0,
              fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.03em',
            }}>
              CP-{primaryCpId ?? '—'} &nbsp;·&nbsp; {selectedAxis.toUpperCase()} axis &nbsp;·&nbsp; frequency domain
            </p>
          </div>
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              borderRadius: 6, border: `1px solid ${COLORS.border}`,
              background: 'transparent', color: COLORS.textSecondary,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              letterSpacing: '0.03em', transition: 'all 150ms ease',
            }}
            onClick={() => navigate(-1)}
            onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.textSecondary; e.currentTarget.style.color = COLORS.text; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.textSecondary; }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
            Back
          </button>
        </div>

        {/* ── SELECTOR PANEL ── */}
        <div style={{
          display: 'flex', gap: 0, flexWrap: 'wrap',
          background: COLORS.card, border: `1px solid ${COLORS.border}`,
          borderRadius: 10, boxShadow: SHADOW, marginBottom: 16, overflow: 'visible',
        }}>
          {/* Machine Selector */}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 6,
            padding: '14px 20px', flex: '1 1 220px',
            borderRight: `1px solid ${COLORS.border}`,
          }}>
            <span style={{
              fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.12em', color: COLORS.textSecondary,
              fontFamily: "'JetBrains Mono', monospace",
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              Machine
            </span>
            <select
              className="vib-select"
              value={selectedMasterId || ''}
              onChange={e => handleMachineDropdownChange(e.target.value)}
              style={{
                background: 'transparent', color: COLORS.text,
                border: 'none', borderBottom: `1px solid ${COLORS.border}`,
                borderRadius: 0, padding: '4px 0', fontSize: 13, fontWeight: 600,
                minWidth: 200, outline: 'none', cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <option value="" style={{ background: isDarkMode ? '#0f1625' : '#fff' }}>— Select Machine —</option>
              {masterTables.map(mt => {
                const mach = machines.find(m => m.id === mt.machine_id);
                const label = mach ? `${mach.type} · ${mach.make} ${mach.model}` : `Machine #${mt.id}`;
                return <option key={mt.id} value={mt.id} style={{ background: isDarkMode ? '#0f1625' : '#fff' }}>{label}</option>;
              })}
            </select>
          </div>

          {/* Checkpoint Selector */}
          <div
            ref={dropdownRef}
            style={{
              display: 'flex', flexDirection: 'column', gap: 6,
              padding: '14px 20px', flex: '2 1 240px',
              borderRight: `1px solid ${COLORS.border}`,
              position: 'relative',
            }}
          >
            <span style={{
              fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.12em', color: COLORS.textSecondary,
              fontFamily: "'JetBrains Mono', monospace",
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Checkpoint Sessions (Select Multiple)
            </span>
            <button
              onClick={() => {
                if (selectedMasterId && briefCheckpoints.length > 0) {
                  setDropdownOpen(!dropdownOpen);
                }
              }}
              disabled={!selectedMasterId || briefCheckpoints.length === 0}
              style={{
                background: 'transparent', color: COLORS.text,
                border: 'none', borderBottom: `1px solid ${COLORS.border}`,
                borderRadius: 0, padding: '6px 0', fontSize: 13, fontWeight: 600,
                minWidth: 240, outline: 'none', cursor: 'pointer',
                opacity: (!selectedMasterId || briefCheckpoints.length === 0) ? 0.45 : 1,
                fontFamily: "'JetBrains Mono', monospace",
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>
                {selectedCheckpointIds.length === 0
                  ? '— Select Checkpoints —'
                  : `${selectedCheckpointIds.length} Session${selectedCheckpointIds.length > 1 ? 's' : ''} Selected`}
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transition: 'transform 0.15s', transform: dropdownOpen ? 'rotate(180deg)' : 'none' }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {dropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '0 0 8px 8px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                zIndex: 100,
                maxHeight: 250,
                overflowY: 'auto',
                padding: '8px 0',
              }}>
                {briefCheckpoints.map(cp => {
                  const label = cp.start
                    ? `#${cp.id} · ${new Date(cp.start).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                    : `Checkpoint #${cp.id}`;
                  const isChecked = selectedCheckpointIds.includes(cp.id);
                  return (
                    <label
                      key={cp.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontSize: 12,
                        color: COLORS.text,
                        background: isChecked ? COLORS.accentDim : 'transparent',
                        transition: 'background 0.15s',
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                      onMouseEnter={e => { if (!isChecked) e.currentTarget.style.background = COLORS.cardAlt; }}
                      onMouseLeave={e => { if (!isChecked) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setSelectedCheckpointIds(prev => {
                            if (prev.includes(cp.id)) {
                              if (prev.length === 1) return prev;
                              return prev.filter(id => id !== cp.id);
                            } else {
                              return [...prev, cp.id];
                            }
                          });
                        }}
                        style={{ accentColor: ACCENT, cursor: 'pointer' }}
                      />
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Toggle Button */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '14px 20px', flex: '0 0 160px', marginLeft: 'auto',
          }}>
            <button
              onClick={() => setAdvancedOpen(o => !o)}
              className="vib-tbtn"
              style={{
                ...styles.toolbarBtn,
                borderColor: advancedOpen ? ACCENT : COLORS.border,
                color: advancedOpen ? ACCENT : COLORS.textSecondary,
                background: advancedOpen ? COLORS.accentDim : 'transparent',
                fontWeight: 700,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s', transform: advancedOpen ? 'rotate(90deg)' : 'none' }}>
                <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              {advancedOpen ? 'Hide Advance' : 'Advance Features'}
            </button>
          </div>

          {/* Collapsible Sub-Row inside Selector Panel */}
          {advancedOpen && (
            <div style={{
              display: 'flex', gap: 16, width: '100%',
              padding: '14px 20px', borderTop: `1px solid ${COLORS.border}`,
              background: COLORS.cardAlt, alignItems: 'center',
              animation: 'dash-slideDown 0.18s ease-out',
            }}>
              {mode === 'trend' ? (
                <div style={{ flex: 1, minWidth: 150 }}>
                  <label style={{ ...styles.label, marginBottom: 2 }}>Trend Duration</label>
                  <select
                    value={trendDays}
                    onChange={e => setTrendDays(parseInt(e.target.value, 10))}
                    className="vib-select"
                    style={{
                      background: 'transparent',
                      color: COLORS.text,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 4,
                      padding: '5px 8px',
                      fontSize: 12,
                      width: '100%',
                      outline: 'none',
                      cursor: 'pointer',
                      fontFamily: "'Inter', sans-serif"
                    }}
                  >
                    {[1, 2, 3, 5, 7, 14, 30, 90].map(d => (
                      <option key={d} value={d} style={{ background: isDarkMode ? '#0f1625' : '#fff' }}>{d} Days</option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div style={{ flex: 1, minWidth: 100 }}>
                    <label style={{ ...styles.label, marginBottom: 2 }}>Freq Min (Hz)</label>
                    <input type="number" value={freqMin} min={0} onChange={handleFreqMinChange}
                      style={{ ...styles.input, padding: '5px 8px', fontSize: 12 }}
                      onFocus={e => { e.target.style.borderColor = ACCENT; e.target.style.boxShadow = `0 0 0 3px ${COLORS.accentDim}`; }}
                      onBlur={e => { e.target.style.borderColor = COLORS.border; e.target.style.boxShadow = 'none'; }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 100 }}>
                    <label style={{ ...styles.label, marginBottom: 2 }}>Freq Max (Hz)</label>
                    <input type="number" value={freqMax} min={0} placeholder="Auto (Nyquist)" onChange={handleFreqMaxChange}
                      style={{ ...styles.input, padding: '5px 8px', fontSize: 12 }}
                      onFocus={e => { e.target.style.borderColor = ACCENT; e.target.style.boxShadow = `0 0 0 3px ${COLORS.accentDim}`; }}
                      onBlur={e => { e.target.style.borderColor = COLORS.border; e.target.style.boxShadow = 'none'; }} />
                  </div>
                  <div style={{ flex: 2, minWidth: 180 }}>
                    <label style={{ ...styles.label, marginBottom: 0 }}>
                      Points: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: ACCENT }}>{Number(maxPoints).toLocaleString()}</span>
                    </label>
                    <input type="range" min={100} max={20000} step={100} value={maxPoints}
                      onChange={handleMaxPointsChange}
                      style={{ width: '100%', accentColor: ACCENT, marginTop: 4, height: 4 }} />
                  </div>
                </>
              )}
            </div>
          )}
        </div>


        {/* ── AXIS / QUANTITY BAR ── */}
        <div style={{
          ...styles.card, padding: '12px 20px', marginBottom: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{
              fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
              color: COLORS.textSecondary, marginRight: 4,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              Axis
            </span>
            {AXES.map(({ key, label }) => (
              <button key={key} style={styles.axisBtn(selectedAxis === key)}
                onClick={() => handleAxisChange(key)}
                onMouseEnter={e => { if (selectedAxis !== key) { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT; } }}
                onMouseLeave={e => { if (selectedAxis !== key) { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.textSecondary; } }}>
                {label}
              </button>
            ))}
          </div>
          {mode === 'fft' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
                color: COLORS.textSecondary, marginRight: 4,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                Quantity
              </span>
              {[
                { key: 'accel', label: 'Accel' },
                { key: 'vel', label: 'Velocity' },
                { key: 'disp', label: 'Displace' }
              ].map(({ key, label }) => (
                <button key={key} style={styles.axisBtn(selectedUnit === key)}
                  onClick={() => setSelectedUnit(key)}
                  onMouseEnter={e => { if (selectedUnit !== key) { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT; } }}
                  onMouseLeave={e => { if (selectedUnit !== key) { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.textSecondary; } }}>
                  {label}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{
              fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
              color: COLORS.textSecondary, marginRight: 4,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              Scale
            </span>
            {[
              { key: 'linear', label: 'Linear' },
              { key: 'log', label: 'Log' }
            ].map(({ key, label }) => (
              <button key={key} style={styles.axisBtn(scalingType === key)}
                onClick={() => setScalingType(key)}
                onMouseEnter={e => { if (scalingType !== key) { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT; } }}
                onMouseLeave={e => { if (scalingType !== key) { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.textSecondary; } }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── CONTENT ── */}
        {loading ? <LoadingUI /> : error ? <ErrorUI /> : selectedCheckpointIds.length === 0 || !primaryChartData.length ? <EmptyState /> : (
          <>
            {/* ── METRIC CARDS ROW ── */}
            {mode === 'fft' && (
              <div
                style={{ display: 'grid', gridTemplateColumns: `repeat(${showDefects && defectFrequencies && mode === 'fft' ? 4 : 3}, 1fr)`, gap: 12, marginBottom: 16 }}
                className="fft-stat-grid"
              >
                {METRICS.map((m, mi) => (
                  <div key={m.label}
                    style={{ ...styles.metricCard, borderLeftColor: [ACCENT, WARNING, DANGER][mi] || ACCENT, display: 'flex', flexDirection: 'column', gap: 6 }}
                    onMouseEnter={onCardEnter} onMouseLeave={onCardLeave}
                  >
                    <div style={styles.metricLabel}>{m.label}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, justifyContent: 'center' }}>
                      {m.checkpointValues.map((cv) => (
                        <div key={cv.cpId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: m.checkpointValues.length > 1 ? `1px solid ${COLORS.border}33` : 'none', paddingBottom: m.checkpointValues.length > 1 ? 4 : 0 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: cv.color, fontFamily: "'JetBrains Mono', monospace" }}>
                            {cv.label}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                            <span style={{ ...styles.metricValue, color: COLORS.text, fontSize: 14 }}>{cv.value}</span>
                            {m.unit && <span style={{ ...styles.metricUnit, fontSize: 10 }}>{m.unit}</span>}
                          </div>
                        </div>
                      ))}
                      {m.baseValue && (
                        <div style={{
                          fontSize: 10, fontWeight: 700, color: DANGER, marginTop: 4,
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}>
                          <span style={{ padding: '1px 4px', borderRadius: 3, background: COLORS.dangerDim, fontSize: 8, letterSpacing: '0.06em' }}>BASE</span>
                          <span>{m.baseValue} {m.unit}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* DEFECT METRICS CARD */}
                {showDefects && defectFrequencies && mode === 'fft' && (
                  <div
                    style={{ ...styles.metricCard, borderLeftColor: '#f97316', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
                    onMouseEnter={onCardEnter} onMouseLeave={onCardLeave}
                  >
                    <div style={{ ...styles.metricLabel, marginBottom: 8 }}>Bearing Defect Freqs</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
                      {Object.entries(defectFrequencies).map(([key, freq]) => {
                        if (!freq) return null;
                        let amplitude = 0;
                        if (primaryChartData && primaryChartData.length > 0) {
                          let closestIdx = 0, minDiff = Infinity;
                          for (let i = 0; i < primaryChartData.length; i++) {
                            const diff = Math.abs(primaryChartData[i].freq - freq);
                            if (diff < minDiff) { minDiff = diff; closestIdx = i; }
                          }
                          amplitude = primaryChartData[closestIdx].amplitude;
                        }
                        const labels = { outer_race: 'BPFO', inner_race: 'BPFI', ball_defect: 'BSF', cage_defect: 'FTF' };
                        const colors = { outer_race: '#ef4444', inner_race: '#f97316', ball_defect: '#3b82f6', cage_defect: '#10b981' };
                        const unitSuff = selectedUnit === 'vel' ? 'mm/s' : (selectedUnit === 'disp' ? 'µm' : 'g');
                        return (
                          <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: 9, color: COLORS.textSecondary, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em' }}>
                                {labels[key] || key}
                              </span>
                              <span style={{ fontSize: 11, color: colors[key], fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                                {Number(freq).toFixed(1)}<span style={{ fontSize: 8, opacity: 0.7 }}> Hz</span>
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                              <span style={{ fontSize: 9, color: COLORS.textSecondary, fontFamily: "'JetBrains Mono', monospace" }}>
                                {amplitude.toExponential(1)} <span style={{ fontSize: 7 }}>{unitSuff}</span>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── FFT CHART CARD ── */}
            <div style={{
              ...styles.card, marginTop: 0,
              background: COLORS.card,
              borderTop: `2px solid ${ACCENT}`,
            }}>

              {/* Chart card header */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                marginBottom: 14, borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 12,
              }}>
                <div>
                  {/* Mode tabs */}
                  <div style={{ display: 'flex', gap: 0, marginBottom: 8, background: COLORS.cardAlt, borderRadius: 6, padding: 3, width: 'fit-content', border: `1px solid ${COLORS.border}` }}>
                    {[{ k: 'time', l: 'Time Domain' }, { k: 'fft', l: 'FFT Spectrum' }, { k: 'trend', l: 'RMS Trend' }].map(({ k, l }) => (
                      <button key={k}
                        onClick={() => handleModeChange(k)}
                        style={{
                          background: mode === k ? COLORS.card : 'transparent',
                          border: 'none',
                          color: mode === k ? ACCENT : COLORS.textSecondary,
                          fontSize: 12, fontWeight: 700,
                          padding: '5px 14px', cursor: 'pointer',
                          borderRadius: 4, transition: 'all 150ms ease',
                          boxShadow: mode === k ? `0 1px 4px rgba(0,0,0,0.3), 0 0 0 1px ${COLORS.border}` : 'none',
                          letterSpacing: '0.02em',
                        }}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                  <div style={{ ...styles.subTitle }}>
                    {mode === 'time'
                      ? `CP-${primaryCpId ?? '—'} · ${selectedAxis.toUpperCase()} · ${primaryChartData.length.toLocaleString()} pts`
                      : mode === 'trend'
                        ? `Machine Config #${selectedMasterId} · ${selectedAxis.toUpperCase()} axis · RMS trend over ${trendDays} days`
                        : `CP-${primaryCpId ?? '—'} · ${selectedAxis.toUpperCase()} · ${primaryChartData.length.toLocaleString()} pts · ${primaryData?.freq_min?.toFixed(0)}–${primaryData?.freq_max?.toFixed(0)} Hz`
                    }
                  </div>
                </div>

                {/* Toolbar buttons */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {mode !== 'trend' && (
                    <>
                      <TBtn onClick={handleExport}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Export
                      </TBtn>
                      <TBtn onClick={handleToggleBase} disabled={baseLoading} active={showBase}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="4" y1="12" x2="20" y2="12" /><line x1="12" y1="4" x2="12" y2="20" />
                        </svg>
                        {baseLoading ? 'Loading…' : showBase ? 'Hide Base' : 'Plot Base'}
                      </TBtn>
                      <TBtn onClick={handleToggleDefects} disabled={defectsLoading || mode !== 'fft'} active={showDefects}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                        {defectsLoading ? 'Loading…' : showDefects ? 'Hide Defects' : 'Defect Freq'}
                      </TBtn>
                    </>
                  )}
                  <TBtn onClick={() => {
                    fetchPlotData(selectedAxis, freqMin, freqMax, maxPoints, mode);
                    if (showBase && mode !== 'trend') fetchBasePlotData(selectedAxis, freqMin, freqMax, maxPoints, mode);
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
                    </svg>
                    Reset
                  </TBtn>
                </div>
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', gap: 20, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                {mode === 'trend' ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: COLORS.text, fontWeight: 600 }}>
                      <div style={{ width: 20, height: 3, background: ACCENT, borderRadius: 2, boxShadow: `0 0 6px ${ACCENT}` }} />
                      RMS Trend
                    </div>
                    {baseRms && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: COLORS.text, fontWeight: 600 }}>
                        <div style={{ width: 20, height: 3, borderTop: `2px dashed ${DANGER}` }} />
                        Base RMS Baseline ({baseRms.value.toFixed(4)} g)
                      </div>
                    )}
                  </>
                ) : (
                  selectedCheckpointIds.map((cpId, idx) => {
                    const cpVal = briefCheckpoints.find(c => c.id === cpId);
                    const formattedDate = cpVal && cpVal.start
                      ? new Date(cpVal.start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                      : `CP-${cpId}`;
                    const isHidden = hiddenCheckpointIds.has(cpId);
                    const color = colorsPalette[idx % colorsPalette.length];

                    return (
                      <button
                        key={cpId}
                        onClick={() => {
                          setHiddenCheckpointIds(prev => {
                            const next = new Set(prev);
                            if (next.has(cpId)) {
                              if (next.size < selectedCheckpointIds.length - 1) {
                                next.delete(cpId);
                              }
                            } else {
                              next.add(cpId);
                            }
                            return next;
                          });
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 7, fontSize: 11,
                          color: isHidden ? COLORS.textSecondary : COLORS.text,
                          background: 'none', border: 'none', cursor: 'pointer',
                          opacity: isHidden ? 0.35 : 1, transition: 'opacity 0.15s', padding: 0,
                          fontWeight: 600, letterSpacing: '0.03em',
                        }}
                      >
                        <div style={{ width: 20, height: 3, background: color, borderRadius: 2, boxShadow: `0 0 6px ${color}` }} />
                        {formattedDate}
                      </button>
                    );
                  })
                )}

                {mode !== 'trend' && showBase && baseChartData.length > 0 && (
                  <button
                    onClick={() => setHideBase(prev => !prev)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7, fontSize: 11,
                      color: hideBase ? COLORS.textSecondary : COLORS.text,
                      background: 'none', border: 'none', cursor: 'pointer',
                      opacity: hideBase ? 0.35 : 1, transition: 'opacity 0.15s', padding: 0,
                      fontWeight: 600, letterSpacing: '0.03em',
                    }}
                  >
                    <div style={{ width: 20, height: 3, background: DANGER, borderRadius: 2, boxShadow: `0 0 6px ${DANGER}` }} />
                    Base FFT
                  </button>
                )}

                {mode !== 'trend' && dominantFreq && mode === 'fft' && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6, fontSize: 11,
                    color: COLORS.textSecondary, marginLeft: 'auto',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    <div style={{ width: 2, height: 12, background: DANGER, opacity: 0.7 }} />
                    Dominant: <span style={{ color: DANGER, fontWeight: 700 }}>{Number(dominantFreq).toFixed(1)} Hz</span>
                  </div>
                )}
              </div>

              {/* Chart container */}
              <div ref={chartRef} style={{
                width: '100%', height: 340, overflow: 'hidden', position: 'relative',
                background: isDarkMode ? '#070c18' : '#f8fafc',
                borderRadius: 6, border: `1px solid ${COLORS.border}`,
              }} />

              {/* ── FREQUENCY ZOOM SLIDER ── */}
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${COLORS.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={COLORS.textSecondary} strokeWidth="2.2" strokeLinecap="round">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                      <line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                    <span style={{
                      fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.12em', color: COLORS.textSecondary,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      Frequency Zoom
                    </span>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 10,
                      background: COLORS.accentDim, color: ACCENT, fontWeight: 700,
                      fontFamily: "'JetBrains Mono', monospace",
                      border: `1px solid ${COLORS.border}`,
                    }}>
                      {Number(sliderMin).toFixed(1)} – {Number(sliderMax).toFixed(1)} Hz
                    </span>
                  </div>
                  {!isFullRange && (
                    <button
                      onClick={resetSlider}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px',
                        borderRadius: 4, background: COLORS.accentDim, border: `1px solid ${COLORS.border}`,
                        color: ACCENT, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                        letterSpacing: '0.04em',
                      }}
                    >
                      ↺ Full Range
                    </button>
                  )}
                </div>

                {/* Slider track */}
                <div ref={sliderRef} style={{ position: 'relative', height: 32, display: 'flex', alignItems: 'center', userSelect: 'none' }}>
                  {/* Track bg */}
                  <div style={{ position: 'absolute', left: 0, right: 0, height: 4, background: COLORS.border, borderRadius: 2 }} />
                  {/* Range fill */}
                  <div style={{
                    position: 'absolute', left: `${leftPct}%`, right: `${rightPct}%`, height: 4,
                    background: `linear-gradient(90deg, ${ACCENT}, #0ea5e9)`, borderRadius: 2,
                    boxShadow: `0 0 8px ${ACCENT}66`,
                  }} />
                  {/* Left handle */}
                  <div
                    onMouseDown={makeDragHandler('left')}
                    onTouchStart={makeDragHandler('left')}
                    style={{
                      position: 'absolute', left: `${leftPct}%`, transform: 'translateX(-50%)',
                      width: 16, height: 16, borderRadius: '50%',
                      background: isDarkMode ? '#0a0e1a' : '#fff',
                      border: `2px solid ${ACCENT}`,
                      boxShadow: `0 0 0 3px ${ACCENT}30, 0 2px 6px rgba(0,0,0,0.3)`,
                      cursor: 'ew-resize', zIndex: 2,
                    }}
                    title={`Min: ${Number(sliderMin).toFixed(1)} Hz`}
                  />
                  {/* Right handle */}
                  <div
                    onMouseDown={makeDragHandler('right')}
                    onTouchStart={makeDragHandler('right')}
                    style={{
                      position: 'absolute', left: `${100 - rightPct}%`, transform: 'translateX(-50%)',
                      width: 16, height: 16, borderRadius: '50%',
                      background: isDarkMode ? '#0a0e1a' : '#fff',
                      border: `2px solid ${ACCENT}`,
                      boxShadow: `0 0 0 3px ${ACCENT}30, 0 2px 6px rgba(0,0,0,0.3)`,
                      cursor: 'ew-resize', zIndex: 2,
                    }}
                    title={`Max: ${Number(sliderMax).toFixed(1)} Hz`}
                  />
                </div>
                {/* Tick labels */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  <span style={{ fontSize: 9, color: COLORS.textSecondary, fontFamily: "'JetBrains Mono', monospace" }}>{fmtXTick(dataFreqLo)} Hz</span>
                  <span style={{ fontSize: 9, color: COLORS.textSecondary, fontFamily: "'JetBrains Mono', monospace" }}>{fmtXTick(dataFreqHi)} Hz</span>
                </div>
              </div>

              {/* Chart footer info */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12,
                borderTop: `1px solid ${COLORS.border}`, fontSize: 10, color: COLORS.textSecondary,
                fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.03em',
              }}>
                {mode === 'time' ? (
                  <>
                    <span>Duration: <strong style={{ color: COLORS.text }}>{primaryChartData.length ? (primaryChartData[primaryChartData.length - 1].freq - primaryChartData[0].freq).toFixed(3) : 0} s</strong></span>
                    <span>Points: <strong style={{ color: COLORS.text }}>{primaryChartData.length.toLocaleString()}</strong></span>
                  </>
                ) : mode === 'trend' ? (
                  <>
                    <span>Trend Range: <strong style={{ color: COLORS.text }}>{trendDays} Days</strong></span>
                    <span>Checkpoints: <strong style={{ color: COLORS.text }}>{trendData.length}</strong></span>
                  </>
                ) : (
                  <>
                    <span>Freq range: <strong style={{ color: COLORS.text }}>{primaryData?.freq_min?.toFixed(1)} – {primaryData?.freq_max?.toFixed(1)} Hz</strong></span>
                    <span>Fs: <strong style={{ color: COLORS.text }}>{formatSR(primaryData?.sampling_rate_hz)}</strong></span>
                  </>
                )}
              </div>

              {/* ── RMS BAND SUMMARY ── */}
              {mode === 'fft' && (
                <div style={{ marginTop: 20, paddingTop: 18, borderTop: `1px solid ${COLORS.border}` }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
                  }}>
                    <div style={{ width: 3, height: 14, background: ACCENT, borderRadius: 2 }} />
                    <div style={{ ...styles.sectionTitle, fontSize: 11 }}>RMS Band Energy Summary</div>
                  </div>
                  <div style={{ overflowX: 'auto', borderRadius: 6, border: `1px solid ${COLORS.border}` }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: isDarkMode ? '#070c18' : '#f0f4f8', borderBottom: `1px solid ${COLORS.border}` }}>
                          {['Dataset', '0–1 kHz', '1–3 kHz', '3–5 kHz', '5–10 kHz', 'Overall RMS'].map(h => (
                            <th key={h} style={{
                              padding: '9px 14px', color: COLORS.textSecondary, fontWeight: 700,
                              textAlign: h === 'Dataset' ? 'left' : 'right',
                              fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
                              fontFamily: "'JetBrains Mono', monospace",
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCheckpointIds.map((cpId, idx) => {
                          const cpPlot = checkpointPlots[cpId];
                          const cpData = cpPlot?.data;
                          const cpChartData = cpPlot?.chartData ?? [];

                          const cpVal = briefCheckpoints.find(c => c.id === cpId);
                          const label = cpVal && cpVal.start
                            ? new Date(cpVal.start).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                            : `CP-${cpId}`;

                          const color = colorsPalette[idx % colorsPalette.length];

                          return (
                            <tr key={cpId} style={{ borderBottom: `1px solid ${COLORS.border}`, background: isDarkMode ? 'rgba(255,255,255,0.01)' : 'transparent', borderLeft: `3px solid ${color}` }}>
                              <td style={{ padding: '10px 14px', fontWeight: 700, color: color, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.03em' }}>
                                {label}
                              </td>
                              {[[0, 1000], [1000, 3000], [3000, 5000], [5000, 10000]].map(([lo, hi]) => (
                                <td key={lo} style={{ padding: '10px 14px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: COLORS.text }}>
                                  {(() => {
                                    const pts = cpChartData.filter(d => d.freq >= lo && d.freq <= hi);
                                    return pts.length ? Math.sqrt(pts.reduce((s, d) => s + (d.amplitude / Math.sqrt(2)) ** 2, 0)).toFixed(3) : '0.000';
                                  })()}
                                </td>
                              ))}
                              <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: color }}>
                                {cpData?.rms ? Number(cpData.rms).toFixed(3) : '0.000'}
                              </td>
                            </tr>
                          );
                        })}

                        {/* Base row */}
                        {showBase && baseChartData.length > 0 && (
                          <tr style={{ background: COLORS.dangerDim, borderLeft: `3px solid ${DANGER}` }}>
                            <td style={{ padding: '10px 14px', fontWeight: 700, color: DANGER, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.03em' }}>
                              Base
                            </td>
                            {[[0, 1000], [1000, 3000], [3000, 5000], [5000, 10000]].map(([lo, hi]) => (
                              <td key={lo} style={{ padding: '10px 14px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: COLORS.text }}>
                                {(() => { const pts = baseChartData.filter(d => d.freq >= lo && d.freq <= hi); return pts.length ? Math.sqrt(pts.reduce((s, d) => s + (d.amplitude / Math.sqrt(2)) ** 2, 0)).toFixed(3) : '0.000'; })()}
                              </td>
                            ))}
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: DANGER }}>
                              {baseData?.rms ? Number(baseData.rms).toFixed(3) : '0.000'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export { Defect };
export default Defect;
