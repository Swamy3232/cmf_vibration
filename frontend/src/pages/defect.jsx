// ============================================================
// defect.jsx  –  FFT Spectrum Analysis page
// Theme (dark / light) via useTheme() → getTheme(isDark)
// ============================================================
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';

import { useTheme } from '../contexts/ThemeContext';
import {
  AXES, DANGER, ACCENT,
  DEFAULT_FREQ_MIN, DEFAULT_FREQ_MAX, DEFAULT_MAX_POINTS,
  FFT_GRADIENT_ID, FftGradientDef,
  SkeletonCard, SkeletonChart,
  getTheme, makeTooltip,
  formatAmp, formatSR, formatCount, fmtXTick, fmtYTick,
} from '../theme/vibrationtheme.jsx';

import { API_BASE_URL } from '../config/api';

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────
const Defect = ({ checkpointId }) => {
  const { isDarkMode }  = useTheme();
  const navigate        = useNavigate();
  const location        = useLocation();
  const resolvedId      = checkpointId ?? location.state?.checkpointId;

  // ── derive theme every render ───────────────
  const { COLORS, SHADOW, SHADOW_HOVER, styles, GLOBAL_CSS } = useMemo(
    () => getTheme(isDarkMode),
    [isDarkMode]
  );
  const CustomTooltip = useMemo(() => makeTooltip(COLORS), [COLORS]);

  // ── state ───────────────────────────────────
  const [selectedAxis, setSelectedAxis] = useState('x');
  const [data,         setData]         = useState(null);
  const [chartData,    setChartData]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [freqMin,      setFreqMin]      = useState(DEFAULT_FREQ_MIN);
  const [freqMax,      setFreqMax]      = useState(DEFAULT_FREQ_MAX);
  const [maxPoints,    setMaxPoints]    = useState(DEFAULT_MAX_POINTS);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const abortRef    = useRef(null);
  const debounceRef = useRef(null);

  // ── fetch ────────────────────────────────────
  const fetchFFT = useCallback(async (axis, fMin, fMax, mPoints) => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);
    try {
      let url = `${API_BASE_URL}/vibration/fft-plot/${resolvedId}?axis=${axis}&max_points=${mPoints}&freq_min=${fMin}`;
      if (fMax !== '' && fMax != null) url += `&freq_max=${fMax}`;
      const res  = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const json = await res.json();
      setData(json);
      const freqs = json.frequencies ?? [];
      const amps  = json.magnitudes  ?? [];
      setChartData(freqs.map((freq, i) => ({ freq, amplitude: amps[i] })));
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [resolvedId]);

  useEffect(() => {
    if (!resolvedId) { setError('No checkpoint ID provided.'); setLoading(false); return; }
    fetchFFT(selectedAxis, freqMin, freqMax, maxPoints);
    return () => abortRef.current?.abort();
  }, [selectedAxis, resolvedId]);

  const triggerDebounced = () => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => fetchFFT(selectedAxis, freqMin, freqMax, maxPoints), 600
    );
  };

  // ── handlers ─────────────────────────────────
  const handleAxisChange      = (axis) => { if (axis !== selectedAxis) setSelectedAxis(axis); };
  const handleRetry           = ()     => fetchFFT(selectedAxis, freqMin, freqMax, maxPoints);
  const handleFreqMinChange   = (e)    => { setFreqMin(e.target.value);   triggerDebounced(); };
  const handleFreqMaxChange   = (e)    => { setFreqMax(e.target.value);   triggerDebounced(); };
  const handleMaxPointsChange = (e)    => { setMaxPoints(e.target.value); triggerDebounced(); };

  const handleExport = () => {
    if (!chartData.length) return;
    const csv  = ['frequency_hz,amplitude', ...chartData.map(d => `${d.freq},${d.amplitude}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `fft_checkpoint${resolvedId}_${selectedAxis}.csv`;
    a.click();
  };

  // ── derived metrics ──────────────────────────
  const METRICS = data ? [
    { label: 'RMS',                value: data.rms                    ? Number(data.rms).toFixed(6)                   : '—', unit: '' },
    { label: 'Dominant Frequency', value: data.dominant_frequency_hz  ? Number(data.dominant_frequency_hz).toFixed(1) : '—', unit: 'Hz', color: ACCENT },
    { label: 'Dominant Amplitude', value: formatAmp(data.dominant_amplitude), unit: '' },
    { label: 'Sampling Rate',      value: formatSR(data.sampling_rate_hz),    unit: '' },
    { label: 'Sample Count',       value: formatCount(data.sample_count),     unit: '' },
    { label: 'Point Count',        value: formatCount(data.point_count),      unit: '' },
  ] : [];

  const dominantFreq = data?.dominant_frequency_hz;

  // ── hover helpers ────────────────────────────
  const onCardEnter = (e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = SHADOW_HOVER; };
  const onCardLeave = (e) => { e.currentTarget.style.transform = 'translateY(0)';    e.currentTarget.style.boxShadow = SHADOW; };
  const onBtnEnter  = (e) => { e.currentTarget.style.background = isDarkMode ? '#263348' : '#f8fafc'; e.currentTarget.style.color = COLORS.text; };
  const onBtnLeave  = (e) => { e.currentTarget.style.background = isDarkMode ? '#1e293b' : '#fff';   e.currentTarget.style.color = COLORS.textSecondary; };

  // ── sub-components ───────────────────────────
  const LoadingUI = () => (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12, marginBottom: 20 }} className="fft-stat-grid">
        {Array(6).fill(0).map((_, i) => <SkeletonCard key={i} isDark={isDarkMode} cardStyle={styles.metricCard} />)}
      </div>
      <SkeletonChart cardStyle={styles.card} isDark={isDarkMode} />
    </>
  );

  const ErrorUI = () => (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '60px 24px', background: COLORS.card, border: `1px solid ${COLORS.border}`,
      borderRadius: 12, boxShadow: SHADOW, textAlign: 'center', marginTop: 20,
    }}>
      <div style={{ fontSize: 44, marginBottom: 14 }}>⚠</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: COLORS.text, marginBottom: 6 }}>Unable to load FFT spectrum</div>
      <div style={{ fontSize: 13, color: COLORS.textSecondary, maxWidth: 360, lineHeight: 1.6 }}>{error}</div>
      <button style={styles.retryBtn} onClick={handleRetry}
        onMouseEnter={e => { e.currentTarget.style.background = '#1d4ed8'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = ACCENT;     e.currentTarget.style.transform = 'translateY(0)'; }}>
        ↻ &nbsp;Retry
      </button>
    </div>
  );

  const EmptyState = () => (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '60px 24px', background: COLORS.card, border: `1px solid ${COLORS.border}`,
      borderRadius: 12, boxShadow: SHADOW, textAlign: 'center', marginTop: 20,
    }}>
      <div style={{ fontSize: 52, marginBottom: 14, opacity: 0.3 }}>〜</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, marginBottom: 6 }}>No FFT data available</div>
      <div style={{ fontSize: 13, color: COLORS.textSecondary }}>
        No data found for checkpoint {resolvedId} on the {selectedAxis.toUpperCase()} axis.
      </div>
    </div>
  );

  // Toolbar button wrapper
  const TBtn = ({ onClick, children }) => (
    <button style={styles.toolbarBtn} onClick={onClick} onMouseEnter={onBtnEnter} onMouseLeave={onBtnLeave}>
      {children}
    </button>
  );

  // ── render ───────────────────────────────────
  return (
    <>
      <style>{GLOBAL_CSS}</style>

      <div style={styles.page}>

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: COLORS.text, letterSpacing: '-0.02em' }}>
              FFT Spectrum Analysis
            </h1>
            <p style={{ fontSize: 13, color: COLORS.textSecondary, margin: '4px 0 0' }}>
              Checkpoint {resolvedId ?? '—'} · Vibration frequency domain analysis
            </p>
          </div>
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
              borderRadius: 8, border: `1px solid ${COLORS.border}`,
              background: isDarkMode ? '#1e293b' : '#fff',
              color: COLORS.textSecondary, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
            onClick={() => navigate(-1)}
            onMouseEnter={e => { e.currentTarget.style.background = isDarkMode ? '#263348' : '#f8fafc'; }}
            onMouseLeave={e => { e.currentTarget.style.background = isDarkMode ? '#1e293b' : '#fff'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
            Back
          </button>
        </div>

        {/* ── AXIS SELECTOR ── */}
        <div style={{ ...styles.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: COLORS.textSecondary, marginRight: 4 }}>
              Axis
            </span>
            {AXES.map(({ key, label }) => (
              <button key={key} style={styles.axisBtn(selectedAxis === key)}
                onClick={() => handleAxisChange(key)}
                onMouseEnter={e => { if (selectedAxis !== key) { e.currentTarget.style.background = isDarkMode ? '#263348' : '#f1f5f9'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                onMouseLeave={e => { if (selectedAxis !== key) { e.currentTarget.style.background = isDarkMode ? '#1e293b' : '#fff';    e.currentTarget.style.transform = 'translateY(0)'; } }}>
                {label}
              </button>
            ))}
          </div>
          {data && (
            <div style={{ fontSize: 12, color: COLORS.textSecondary }}>
              Showing: <strong style={{ color: COLORS.text }}>Checkpoint {resolvedId} / {selectedAxis.toUpperCase()} Axis</strong>
            </div>
          )}
        </div>

        {/* ── CONTENT ── */}
        {loading ? <LoadingUI /> : error ? <ErrorUI /> : !data || !chartData.length ? <EmptyState /> : (
          <>
            {/* STAT CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12, marginBottom: 20 }} className="fft-stat-grid">
              {METRICS.map(m => (
                <div key={m.label} style={styles.metricCard} onMouseEnter={onCardEnter} onMouseLeave={onCardLeave}>
                  <div style={styles.metricLabel}>{m.label}</div>
                  <div>
                    <span style={{ ...styles.metricValue, color: m.color || COLORS.text }}>{m.value}</span>
                    {m.unit && <span style={styles.metricUnit}>{m.unit}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* FFT CHART CARD */}
            <div style={{ ...styles.card, marginTop: 20 }}>

              {/* header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={styles.sectionTitle}>FFT Spectrum</div>
                  <div style={styles.subTitle}>
                    Checkpoint {resolvedId} · {selectedAxis.toUpperCase()} Axis ·{' '}
                    {chartData.length.toLocaleString()} points · {data.freq_min?.toFixed(0)}–{data.freq_max?.toFixed(0)} Hz
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <TBtn onClick={handleExport}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Export
                  </TBtn>
                  <TBtn>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                      <line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                    Zoom
                  </TBtn>
                  <TBtn onClick={() => fetchFFT(selectedAxis, freqMin, freqMax, maxPoints)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
                    </svg>
                    Reset
                  </TBtn>
                </div>
              </div>

              {/* legend */}
              <div style={{ display: 'flex', gap: 20, marginBottom: 14, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: COLORS.textSecondary }}>
                  <div style={{ width: 20, height: 3, background: ACCENT, borderRadius: 2 }} /> FFT Amplitude
                </div>
                {dominantFreq && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: COLORS.textSecondary }}>
                    <div style={{ width: 3, height: 14, background: DANGER, borderRadius: 2 }} />
                    Dominant — {Number(dominantFreq).toFixed(1)} Hz
                  </div>
                )}
              </div>

              {/* chart */}
              <ResponsiveContainer width="100%" height={340}>
                <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
                  <FftGradientDef />
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={COLORS.gridStroke} />
                  <XAxis dataKey="freq" type="number" domain={['dataMin', 'dataMax']}
                    tickFormatter={fmtXTick} tickCount={10}
                    tick={{ fontSize: 11, fill: COLORS.textSecondary }}
                    label={{ value: 'Frequency (Hz)', position: 'insideBottom', offset: -18, fontSize: 12, fill: COLORS.textSecondary, fontWeight: 600 }}
                    axisLine={{ stroke: COLORS.axisLine }} tickLine={false} />
                  <YAxis tickFormatter={fmtYTick} domain={[0, 'dataMax']} allowDataOverflow={false}
                    tick={{ fontSize: 11, fill: COLORS.textSecondary }}
                    label={{ value: 'Amplitude', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12, fill: COLORS.textSecondary, fontWeight: 600 }}
                    axisLine={false} tickLine={false} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  {dominantFreq && (
                    <ReferenceLine x={dominantFreq} stroke={DANGER} strokeWidth={2} strokeDasharray="6 3"
                      label={{ value: `Dominant\n${Number(dominantFreq).toFixed(1)} Hz`, position: 'top', fontSize: 10, fill: DANGER, fontWeight: 700 }} />
                  )}
                  <Area type="monotone" dataKey="amplitude" stroke={ACCENT} strokeWidth={2.2}
                    fill={`url(#${FFT_GRADIENT_ID})`} dot={false}
                    activeDot={{ r: 5, fill: ACCENT, stroke: isDarkMode ? '#1e293b' : '#fff', strokeWidth: 2 }}
                    isAnimationActive animationDuration={600} connectNulls={false} />
                </AreaChart>
              </ResponsiveContainer>

              {/* footer */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12,
                borderTop: `1px solid ${COLORS.border}`, fontSize: 11, color: COLORS.textSecondary,
              }}>
                <span>Freq range: <strong style={{ fontFamily: 'monospace', color: COLORS.text }}>{data.freq_min?.toFixed(1)} – {data.freq_max?.toFixed(1)} Hz</strong></span>
                <span>Sampling rate: <strong style={{ fontFamily: 'monospace', color: COLORS.text }}>{formatSR(data.sampling_rate_hz)}</strong></span>
              </div>
            </div>

            {/* ADVANCED FILTERS */}
            <div style={{ ...styles.card, marginTop: 20 }}>
              <button style={{
                display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none',
                cursor: 'pointer', padding: 0, width: '100%', justifyContent: 'space-between',
              }} onClick={() => setAdvancedOpen(o => !o)}>
                <div>
                  <div style={styles.sectionTitle}>Advanced Filters</div>
                  <div style={styles.subTitle}>Frequency range, resolution, and data limits</div>
                </div>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', border: `1px solid ${COLORS.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: COLORS.textSecondary, fontSize: 14, transition: 'transform 200ms ease',
                  transform: advancedOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}>
                  ▾
                </div>
              </button>

              {advancedOpen && (
                <>
                  <div style={styles.divider} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
                    <div>
                      <label style={styles.label}>Frequency Min (Hz)</label>
                      <input type="number" value={freqMin} min={0} onChange={handleFreqMinChange} style={styles.input}
                        onFocus={e => { e.target.style.borderColor = ACCENT; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,.15)'; }}
                        onBlur={e  => { e.target.style.borderColor = COLORS.border; e.target.style.boxShadow = 'none'; }} />
                    </div>
                    <div>
                      <label style={styles.label}>Frequency Max (Hz)</label>
                      <input type="number" value={freqMax} min={0} placeholder="Auto" onChange={handleFreqMaxChange} style={styles.input}
                        onFocus={e => { e.target.style.borderColor = ACCENT; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,.15)'; }}
                        onBlur={e  => { e.target.style.borderColor = COLORS.border; e.target.style.boxShadow = 'none'; }} />
                    </div>
                    <div>
                      <label style={styles.label}>
                        Max Points — <span style={{ fontFamily: 'monospace', color: ACCENT }}>{Number(maxPoints).toLocaleString()}</span>
                      </label>
                      <input type="range" min={100} max={20000} step={100} value={maxPoints}
                        onChange={handleMaxPointsChange}
                        style={{ width: '100%', accentColor: ACCENT, marginTop: 6 }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: COLORS.textSecondary, marginTop: 4 }}>
                        <span>100</span><span>20,000</span>
                      </div>
                    </div>
                  </div>
                </>
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
