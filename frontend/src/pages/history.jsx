import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { API_BASE_URL } from '../config/api';
import { getDashboardTheme, DASHBOARD_CSS } from '../theme/vibrationtheme.jsx';

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconCog = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572C2.561 12.324 2.561 9.826 4.317 9.4a1.724 1.724 0 001.066-2.573C4.443 5.284 6.209 3.517 7.752 4.457a1.724 1.724 0 002.573-1.14z" />
    <circle cx="12" cy="12" r="3" strokeWidth="2" />
  </svg>
);
const IconChevronDown = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
  </svg>
);
const IconX = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeWidth="2.5" strokeLinecap="round" d="M18 6L6 18M6 6l12 12" />
  </svg>
);
const IconBarChart = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeWidth="2" strokeLinecap="round" d="M18 20V10M12 20V4M6 20v-6" />
  </svg>
);
const IconActivity = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <polyline strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);
const IconDatabase = () => (
  <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeOpacity="0.45">
    <ellipse cx="12" cy="5" rx="9" ry="3" strokeWidth="1.5" />
    <path strokeWidth="1.5" d="M21 12c0 1.657-4.03 3-9 3S3 13.657 3 12" />
    <path strokeWidth="1.5" d="M3 5v14c0 1.657 4.03 3 9 3s9-1.343 9-3V5" />
  </svg>
);
const IconFilter = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      d="M22 3H2l8 9.46V19l4 2V12.46L22 3z" />
  </svg>
);
const IconChevronRight = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
  </svg>
);

// ─── Spinner ──────────────────────────────────────────────────────────────────
const Spinner = ({ size = 20 }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    border: `2px solid rgba(6,182,212,0.18)`,
    borderTopColor: '#06b6d4',
    animation: 'dash-spin 0.7s linear infinite',
    flexShrink: 0,
  }} />
);

// GLOBAL_CSS is now imported from vibrationtheme.jsx as DASHBOARD_CSS

// ─── Component ────────────────────────────────────────────────────────────────
const History = () => {
  const { isDarkMode } = useTheme();
  const navigate     = useNavigate();

  // ── data
  const [machines,        setMachines]        = useState([]);
  const [masterTables,    setMasterTables]    = useState([]);
  const [checkpoints,     setCheckpoints]     = useState([]);
  const [baseCheckpoint,  setBaseCheckpoint]  = useState(null);  // most recent is_base=true

  // ── cascading filter state
  const [filterType,    setFilterType]    = useState('');
  const [filterMake,    setFilterMake]    = useState('');
  const [filterMachine, setFilterMachine] = useState(''); // machine.id as string

  // ── selected machine object (derived when filterMachine changes)
  const [selectedMachine, setSelectedMachine] = useState(null);

  // ── loading / error
  const [loadingMachines,    setLoadingMachines]    = useState(true);
  const [loadingCheckpoints, setLoadingCheckpoints] = useState(false);
  const [error,              setError]              = useState(null);

  // ── inline RMS: keyed by checkpoint.id → metrics object | null | undefined
  const [expandedMetrics, setExpandedMetrics] = useState({});

  // ── pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const tableRef = useRef(null);

  // ── theme tokens — imported from vibrationtheme.jsx
  const T = getDashboardTheme(isDarkMode);

  // inject shared CSS + CSS vars
  useEffect(() => {
    let s = document.getElementById('dash-css');
    if (!s) { s = document.createElement('style'); s.id = 'dash-css'; document.head.appendChild(s); }
    s.textContent = DASHBOARD_CSS + `
      @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Inter:wght@400;600;700;800&display=swap');
      @keyframes pulse-dot {
        0%, 100% { box-shadow: 0 0 0 2px rgba(34,197,94,0.25); }
        50%       { box-shadow: 0 0 0 5px rgba(34,197,94,0.0);  }
      }
      @keyframes vib-fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
      .vib-page-fade { animation: vib-fadeIn 0.3s ease; }
      .status-dot {
        width:8px; height:8px; border-radius:50%;
        background:#22c55e; display:inline-block; flex-shrink:0;
        animation: pulse-dot 2s ease-in-out infinite;
      }
    `;
  }, []);
  useEffect(() => {
    document.documentElement.style.setProperty('--dash-row-hover', T.rowHover);
  }, [isDarkMode]);

  // ── Fetch all machines + master tables on mount
  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoadingMachines(true);
      const [mr, mtr] = await Promise.all([
        fetch(`${API_BASE_URL}/machine/`),
        fetch(`${API_BASE_URL}/master-table/`),
      ]);
      if (!mr.ok || !mtr.ok) throw new Error('Failed to fetch data');
      setMachines(await mr.json());
      setMasterTables(await mtr.json());
    } catch (e) { setError(e.message); }
    finally     { setLoadingMachines(false); }
  };

  // ── Cascading filter: when Type changes, reset Make + Machine
  const handleTypeChange = (val) => {
    setFilterType(val);
    setFilterMake('');
    setFilterMachine('');
    setSelectedMachine(null);
    setCheckpoints([]);
    setExpandedMetrics({});
  };
  const handleMakeChange = (val) => {
    setFilterMake(val);
    setFilterMachine('');
    setSelectedMachine(null);
    setCheckpoints([]);
    setExpandedMetrics({});
  };
  const handleMachineChange = (val) => {
    setFilterMachine(val);
    if (!val) {
      setSelectedMachine(null);
      setCheckpoints([]);
      setExpandedMetrics({});
      return;
    }
    const machine = machines.find(m => String(m.id) === val);
    setSelectedMachine(machine || null);
    setCurrentPage(1);
    setExpandedMetrics({});
    if (machine) {
      const mt = masterTables.find(x => x.machine_id === machine.id);
      fetchCheckpoints(mt?.id);
      setTimeout(() => tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    }
  };

  const handleClearAll = () => {
    setFilterType(''); setFilterMake(''); setFilterMachine('');
    setSelectedMachine(null); setCheckpoints([]); setExpandedMetrics({});
    setBaseCheckpoint(null);
  };

  const fetchCheckpoints = async (masterId) => {
    try {
      setLoadingCheckpoints(true); setError(null);
      setBaseCheckpoint(null);

      // fetch all checkpoints + most recent base checkpoint in parallel
      const [r, baseRes] = await Promise.all([
        fetch(`${API_BASE_URL}/checkpoint/?skip=0&limit=100`),
        fetch(`${API_BASE_URL}/checkpoint/base/recent?master_id=${masterId}`),
      ]);

      if (!r.ok) throw new Error('Failed to fetch checkpoints');
      const data = await r.json();
      setCheckpoints(data.filter(cp => cp.master_id === masterId));

      // base checkpoint is optional — 404 means none exists yet
      if (baseRes.ok) setBaseCheckpoint(await baseRes.json());
      else            setBaseCheckpoint(null);

    } catch (e) { setError(e.message); setCheckpoints([]); }
    finally     { setLoadingCheckpoints(false); }
  };

  const handleToggleMetrics = async (cp) => {
    const key = cp.id;
    if (expandedMetrics[key] !== undefined) {
      setExpandedMetrics(prev => { const n = { ...prev }; delete n[key]; return n; });
      return;
    }
    // mark loading
    setExpandedMetrics(prev => ({ ...prev, [key]: 'loading' }));
    try {
      const r = await fetch(`${API_BASE_URL}/fft/checkpoint/${cp.id}/rms`);
      const data = r.ok ? await r.json() : null;
      setExpandedMetrics(prev => ({ ...prev, [key]: data }));
    } catch {
      setExpandedMetrics(prev => ({ ...prev, [key]: null }));
    }
  };

  const handleAnalytics = (cp) =>
    navigate('/defect-analysis', { state: { checkpointId: cp.id, machine: selectedMachine } });

  // ── Cascading option lists
  const typeOptions = [...new Set(machines.map(m => m.type).filter(Boolean))].sort();

  const makeOptions = [...new Set(
    machines
      .filter(m => !filterType || m.type === filterType)
      .map(m => m.make).filter(Boolean)
  )].sort();

  const machineOptions = machines.filter(m =>
    (!filterType || m.type === filterType) &&
    (!filterMake || m.make === filterMake)
  );

  // ── Pagination
  const totalPages = Math.ceil(checkpoints.length / ITEMS_PER_PAGE);
  const startIdx   = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginated  = checkpoints.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  const hasFilters = filterType || filterMake || filterMachine;

  // ─── Shared select style helper ──────────────────────────────────────────────
  const selectStyle = (hasValue) => ({
    appearance: 'none', WebkitAppearance: 'none',
    paddingLeft: 14, paddingRight: 34,
    paddingTop: 9, paddingBottom: 9,
    background: hasValue
      ? (isDarkMode ? 'rgba(6,182,212,0.13)' : 'rgba(6,182,212,0.08)')
      : T.surfaceAlt,
    border: `1px solid ${hasValue ? T.accent : T.border}`,
    borderRadius: 8, fontSize: 13,
    color: hasValue ? (isDarkMode ? '#67e8f9' : '#0e7490') : T.textSub,
    fontWeight: hasValue ? 600 : 400,
    cursor: 'pointer',
    transition: 'all 0.15s',
    minWidth: 150,
  });

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (loadingMachines) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16, background: T.bg }}>
      <Spinner size={32} />
      <span style={{ fontSize: 13, color: T.textSub }}>Loading machines…</span>
    </div>
  );

  if (error && machines.length === 0) return (
    <div style={{ padding: 32, background: T.bg, minHeight: '100vh' }}>
      <div style={{ padding: '18px 22px', borderRadius: 10, background: T.dangerDim, border: '1px solid rgba(239,68,68,0.28)', color: T.danger, fontSize: 13 }}>⚠ {error}</div>
    </div>
  );

  // ─── Main render ─────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', background: T.bg,
      padding: '28px 32px',
      fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
      color: T.text,
    }} className="vib-page-fade">

      {/* ── Page Header ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span className="status-dot" title="System active" />
          <h1 style={{
            fontSize: 18, fontWeight: 800, margin: 0, color: T.text,
            letterSpacing: '0.04em', textTransform: 'uppercase',
            fontFamily: "'Inter', sans-serif",
          }}>
            Machine History
          </h1>
          <span style={{
            padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
            background: T.accentDim, color: T.accent, letterSpacing: '0.1em',
            fontFamily: "'JetBrains Mono', monospace", border: `1px solid ${T.border}`,
          }}>LOG</span>
        </div>
        <p style={{
          fontSize: 11, color: T.textSub, margin: 0,
          fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.03em',
        }}>
          Select type → make → machine to view checkpoint sessions
        </p>
      </div>

      {/* ── Filter Panel ── */}
      <div style={{
        padding: '16px 20px',
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderTop: `2px solid ${T.accent}`,
        borderRadius: 10,
        marginBottom: 20,
        boxShadow: isDarkMode ? '0 2px 16px rgba(0,0,0,0.35)' : '0 1px 8px rgba(0,0,0,0.07)',
      }}>

        {/* Filter label row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ color: T.accent, display: 'flex' }}><IconFilter /></span>
          <span style={{
            fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
            color: T.textSub, fontFamily: "'JetBrains Mono', monospace",
          }}>
            Machine Selector
          </span>
        </div>

        {/* Filter controls row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>

          {/* ① Type */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.textSub }}>
              ① Type
            </span>
            <div style={{ position: 'relative' }}>
              <select
                className="dash-select"
                value={filterType}
                onChange={e => handleTypeChange(e.target.value)}
                style={selectStyle(!!filterType)}
              >
                <option value="">All Types</option>
                {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: T.textSub }}>
                <IconChevronDown />
              </span>
            </div>
          </div>

          {/* Arrow */}
          <span style={{ color: T.textMuted, marginTop: 16, flexShrink: 0, display: 'flex' }}><IconChevronRight /></span>

          {/* ② Make */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.textSub }}>
              ② Make
            </span>
            <div style={{ position: 'relative' }}>
              <select
                className="dash-select"
                value={filterMake}
                onChange={e => handleMakeChange(e.target.value)}
                disabled={makeOptions.length === 0}
                style={{ ...selectStyle(!!filterMake), opacity: makeOptions.length === 0 ? 0.45 : 1 }}
              >
                <option value="">All Makes</option>
                {makeOptions.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: T.textSub }}>
                <IconChevronDown />
              </span>
            </div>
          </div>

          {/* Arrow */}
          <span style={{ color: T.textMuted, marginTop: 16, flexShrink: 0, display: 'flex' }}><IconChevronRight /></span>

          {/* ③ Machine */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.textSub }}>
              ③ Machine
            </span>
            <div style={{ position: 'relative' }}>
              <select
                className="dash-select"
                value={filterMachine}
                onChange={e => handleMachineChange(e.target.value)}
                disabled={machineOptions.length === 0}
                style={{ ...selectStyle(!!filterMachine), minWidth: 220, opacity: machineOptions.length === 0 ? 0.45 : 1 }}
              >
                <option value="">— Select machine —</option>
                {machineOptions.map(m => (
                  <option key={m.id} value={String(m.id)}>
                    {[m.model, m.make].filter(Boolean).join(' · ') || `Machine #${m.id}`}
                  </option>
                ))}
              </select>
              <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: T.textSub }}>
                <IconChevronDown />
              </span>
            </div>
          </div>

          {/* Spacer */}
          <div style={{ flex: 1, minWidth: 12 }} />

          {/* Machine count badge */}
          <div style={{ marginTop: 16, flexShrink: 0 }}>
            <span style={{
              padding: '6px 12px', borderRadius: 20,
              background: T.accentDim, color: T.accent,
              fontSize: 12, fontWeight: 700,
            }}>
              {machineOptions.length} machine{machineOptions.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Clear */}
          {hasFilters && (
            <button
              className="dash-btn-danger"
              onClick={handleClearAll}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '8px 13px', borderRadius: 8, marginTop: 16,
                background: T.dangerDim, border: `1px solid rgba(239,68,68,0.28)`,
                color: T.danger, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', transition: 'background 0.15s', flexShrink: 0,
              }}
            >
              <IconX /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Prompt when no machine selected ── */}
      {!selectedMachine && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '64px 24px', gap: 14, textAlign: 'center',
          animation: 'dash-fadeIn 0.3s ease',
        }}>
          <div style={{ color: T.textSub }}><IconDatabase /></div>
          <p style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: 0 }}>
            No machine selected
          </p>
          <p style={{ fontSize: 13, color: T.textSub, margin: 0, maxWidth: 340 }}>
            Use the filters above to choose a Type, Make, and Machine — the checkpoint history will appear here.
          </p>
        </div>
      )}

      {/* ── Machine Summary + Checkpoint Table ── */}
      {selectedMachine && (
        <div ref={tableRef} style={{ animation: 'dash-slideDown 0.3s ease' }}>

          {/* Machine summary bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
            padding: '14px 20px', marginBottom: 20,
            background: T.accentDim,
            border: `1px solid ${T.accent}55`,
            borderLeft: `3px solid ${T.accent}`,
            borderRadius: 10,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 7,
              background: T.accent, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, boxShadow: `0 0 12px ${T.accent}55`,
            }}>
              <IconCog />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                <span style={{
                  fontSize: 13, fontWeight: 800, color: T.text,
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                }}>
                  {selectedMachine.type || 'Unknown Type'}
                </span>
                {selectedMachine.make && (
                  <span style={{
                    padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                    background: T.surfaceAlt, color: T.textSub, border: `1px solid ${T.border}`,
                    letterSpacing: '0.04em',
                  }}>{selectedMachine.make}</span>
                )}
                {selectedMachine.model && (
                  <span style={{
                    padding: '2px 8px', borderRadius: 4, fontSize: 10,
                    fontFamily: "'JetBrains Mono', monospace",
                    background: T.surfaceAlt, color: T.textSub, border: `1px solid ${T.border}`,
                  }}>{selectedMachine.model}</span>
                )}
              </div>
              <div style={{
                fontSize: 10, color: T.textSub, fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '0.04em',
              }}>
                MID-{selectedMachine.id}
              </div>
            </div>
            <button
              className="dash-btn-danger"
              onClick={handleClearAll}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 13px', borderRadius: 6, flexShrink: 0,
                background: T.dangerDim, border: `1px solid rgba(239,68,68,0.28)`,
                color: T.danger, fontSize: 11, fontWeight: 700,
                cursor: 'pointer', transition: 'filter 0.15s',
                letterSpacing: '0.03em',
              }}
            >
              <IconX /> Deselect
            </button>
          </div>

          {/* ── Checkpoint Table ── */}
          {loadingCheckpoints ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
              padding: '52px 24px', background: T.surface,
              border: `1px solid ${T.border}`, borderRadius: 10,
            }}>
              <Spinner size={28} />
              <span style={{ fontSize: 13, color: T.textSub }}>Loading checkpoint history…</span>
            </div>
          ) : error ? (
            <div style={{
              padding: '18px 22px', borderRadius: 10,
              background: T.dangerDim, border: '1px solid rgba(239,68,68,0.28)',
              color: T.danger, fontSize: 13,
            }}>⚠ {error}</div>
          ) : checkpoints.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '60px 24px', gap: 12, textAlign: 'center',
              background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10,
            }}>
              <div style={{ color: T.textSub }}><IconDatabase /></div>
              <p style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: 0 }}>No Checkpoints Found</p>
              <p style={{ fontSize: 13, color: T.textSub, margin: 0 }}>
                No measurement sessions have been recorded for this machine yet.
              </p>
            </div>
          ) : (
            <div style={{ animation: 'dash-fadeIn 0.3s ease' }}>

              {/* Table header row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Checkpoint History</span>
                  <span style={{
                    padding: '3px 10px', borderRadius: 20,
                    background: T.accentDim, color: T.accent, fontSize: 11, fontWeight: 700,
                  }}>
                    {checkpoints.length} session{checkpoints.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {totalPages > 1 && (
                  <span style={{ fontSize: 12, color: T.textSub }}>Page {currentPage} of {totalPages}</span>
                )}
              </div>

              {/* Table */}
              <div style={{
                background: T.surface, border: `1px solid ${T.border}`,
                borderRadius: 10, overflow: 'hidden',
                boxShadow: isDarkMode ? '0 2px 16px rgba(0,0,0,0.3)' : '0 1px 8px rgba(0,0,0,0.07)',
              }}>
                {/* Head */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '52px 1fr 110px 160px 200px',
                  padding: '10px 20px',
                  background: isDarkMode ? '#070c18' : '#f0f4f8',
                  borderBottom: `1px solid ${T.border}`,
                }}>
                  {['#', 'Date & Time', 'Status', 'RMS Metrics', 'Actions'].map((h, i) => (
                    <span key={i} style={{
                      fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.1em', color: T.textSub,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>{h}</span>
                  ))}
                </div>

                {/* ── Pinned Base Checkpoint Row ── */}
                {baseCheckpoint && (() => {
                  const isExpanded = expandedMetrics[baseCheckpoint.id] !== undefined;
                  const metrics    = expandedMetrics[baseCheckpoint.id];
                  return (
                    <React.Fragment key={`base-${baseCheckpoint.id}`}>
                      <div
                        style={{
                          display: 'grid', gridTemplateColumns: '52px 1fr 110px 160px 200px',
                          padding: '13px 20px',
                          borderBottom: `1px solid ${T.border}`,
                          borderLeft: '3px solid #10b981',
                          alignItems: 'center',
                          background: isDarkMode
                            ? 'rgba(16,185,129,0.10)'
                            : 'rgba(16,185,129,0.07)',
                        }}
                      >
                        {/* # */}
                        <span style={{ fontSize: 12, color: T.success, fontWeight: 700 }}>★</span>

                        {/* Date/Time */}
                        <span style={{ fontSize: 13, color: T.text, fontVariantNumeric: 'tabular-nums' }}>
                          {baseCheckpoint.start
                            ? new Date(baseCheckpoint.start).toLocaleString('en-GB', {
                                day: '2-digit', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                              })
                            : '—'}
                        </span>

                        {/* Status badge */}
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '3px 9px', borderRadius: 20,
                          background: isDarkMode ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.14)',
                          border: '1px solid rgba(16,185,129,0.4)',
                          color: T.success, fontSize: 10, fontWeight: 800,
                          textTransform: 'uppercase', letterSpacing: '0.07em',
                        }}>
                          ✓ Base
                        </span>

                        {/* RMS toggle */}
                        <div>
                          <button
                            className="dash-btn"
                            onClick={() => handleToggleMetrics(baseCheckpoint)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5,
                              padding: '6px 13px', borderRadius: 7, cursor: 'pointer',
                              background: isExpanded
                                ? 'rgba(16,185,129,0.18)'
                                : T.surfaceAlt,
                              border: `1px solid ${isExpanded ? T.success : T.border}`,
                              color: isExpanded ? T.success : T.textSub,
                              fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                            }}
                          >
                            <IconActivity />
                            {isExpanded ? 'Collapse' : 'View RMS'}
                          </button>
                        </div>

                        {/* Analytics */}
                        <div>
                          <button
                            className="dash-btn"
                            onClick={() => handleAnalytics(baseCheckpoint)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5,
                              padding: '6px 14px', borderRadius: 6, cursor: 'pointer',
                              background: `linear-gradient(135deg, ${T.accent}, #0891b2)`,
                              border: 'none', color: '#fff',
                              fontSize: 11, fontWeight: 700,
                              boxShadow: `0 2px 8px ${T.accent}55`,
                              transition: 'filter 0.15s',
                              letterSpacing: '0.04em',
                            }}
                          >
                            <IconBarChart /> Analyse
                          </button>
                        </div>
                      </div>

                      {/* Inline RMS accordion for base row */}
                      {isExpanded && (
                        <div style={{
                          padding: '16px 22px',
                          background: isDarkMode
                            ? 'linear-gradient(180deg,rgba(16,185,129,0.07) 0%,rgba(16,185,129,0.02) 100%)'
                            : 'linear-gradient(180deg,rgba(16,185,129,0.06) 0%,rgba(16,185,129,0.01) 100%)',
                          borderBottom: `1px solid ${T.border}`,
                          animation: 'dash-slideDown 0.2s ease',
                        }}>
                          {metrics === 'loading' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <Spinner size={16} /><span style={{ fontSize: 13, color: T.textSub }}>Loading RMS metrics…</span>
                            </div>
                          ) : metrics === null ? (
                            <span style={{ fontSize: 13, color: T.danger }}>⚠ Failed to load RMS metrics</span>
                          ) : (
                            <>
                              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: T.success, margin: '0 0 12px' }}>
                                Base Checkpoint — RMS Metrics
                              </p>
                              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                {[
                                  { label: 'Overall RMS', value: metrics?.overall_rms, color: T.success, big: true },
                                  { label: 'X-Axis RMS',  value: metrics?.axes?.x,     color: T.warning },
                                  { label: 'Y-Axis RMS',  value: metrics?.axes?.y,     color: T.accent  },
                                  { label: 'Z-Axis RMS',  value: metrics?.axes?.z,     color: T.purple  },
                                ].map(({ label, value, color, big }) => (
                                  <div key={label} style={{
                                    flex: '1 1 110px', minWidth: 105,
                                    padding: '12px 16px', borderRadius: 8,
                                    background: T.surface,
                                    border: `1px solid ${T.border}`,
                                    borderLeft: `3px solid ${color}`,
                                  }}>
                                    <p style={{
                                      fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                                      letterSpacing: '0.1em', color: T.textSub, margin: '0 0 8px',
                                      fontFamily: "'JetBrains Mono', monospace",
                                    }}>{label}</p>
                                    <p style={{
                                      fontSize: big ? 18 : 14, fontWeight: 700,
                                      fontFamily: "'JetBrains Mono', monospace",
                                      color, margin: 0, letterSpacing: '-0.01em',
                                    }}>
                                      {value != null ? Number(value).toFixed(6) : '—'}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })()}

                {/* Rows */}
                {paginated.map((cp, idx) => {
                  const globalIdx  = startIdx + idx;
                  const isExpanded = expandedMetrics[cp.id] !== undefined;
                  const metrics    = expandedMetrics[cp.id];
                  const isBase     = baseCheckpoint?.id === cp.id;

                  return (
                    <React.Fragment key={cp.id}>
                      <div
                        className={isBase ? '' : 'dash-row'}
                        style={{
                          display: 'grid', gridTemplateColumns: '52px 1fr 110px 160px 200px',
                          padding: '13px 20px',
                          borderBottom: `1px solid ${T.border}`,
                          alignItems: 'center',
                          background: isExpanded ? T.accentDim : 'transparent',
                          transition: 'background 0.15s',
                        }}
                      >
                        {/* # */}
                        <span style={{ fontSize: 12, color: T.textSub, fontVariantNumeric: 'tabular-nums' }}>
                          {globalIdx + 1}
                        </span>

                        {/* Date/Time */}
                        <span style={{ fontSize: 13, color: T.text, fontVariantNumeric: 'tabular-nums' }}>
                          {cp.start
                            ? new Date(cp.start).toLocaleString('en-GB', {
                                day: '2-digit', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                              })
                            : '—'}
                        </span>

                        {/* Status — empty for normal rows */}
                        <span style={{ fontSize: 11, color: T.textSub }}>—</span>

                        {/* RMS toggle */}
                        <div>
                          <button
                            className="dash-btn"
                            onClick={() => handleToggleMetrics(cp)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5,
                              padding: '6px 13px', borderRadius: 7, cursor: 'pointer',
                              background: isExpanded ? T.accentStrong : T.surfaceAlt,
                              border: `1px solid ${isExpanded ? T.accent : T.border}`,
                              color: isExpanded ? T.accent : T.textSub,
                              fontSize: 12, fontWeight: 600,
                              transition: 'all 0.15s',
                            }}
                          >
                            <IconActivity />
                            {isExpanded ? 'Collapse' : 'View RMS'}
                          </button>
                        </div>

                        {/* Analytics */}
                        <div>
                          <button
                            className="dash-btn"
                            onClick={() => handleAnalytics(cp)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5,
                              padding: '6px 14px', borderRadius: 6, cursor: 'pointer',
                              background: `linear-gradient(135deg, ${T.accent}, #0891b2)`,
                              border: 'none', color: '#fff',
                              fontSize: 11, fontWeight: 700,
                              boxShadow: `0 2px 8px ${T.accent}55`,
                              transition: 'filter 0.15s',
                              letterSpacing: '0.04em',
                            }}
                          >
                            <IconBarChart /> Analyse
                          </button>
                        </div>
                      </div>

                      {/* Inline RMS accordion */}
                      {isExpanded && (
                        <div style={{
                          padding: '16px 22px',
                          background: isDarkMode
                            ? 'linear-gradient(180deg,rgba(6,182,212,0.07) 0%,rgba(6,182,212,0.02) 100%)'
                            : 'linear-gradient(180deg,rgba(6,182,212,0.06) 0%,rgba(6,182,212,0.01) 100%)',
                          borderBottom: `1px solid ${T.border}`,
                          animation: 'dash-slideDown 0.2s ease',
                        }}>
                          {metrics === 'loading' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <Spinner size={16} /><span style={{ fontSize: 13, color: T.textSub }}>Loading RMS metrics…</span>
                            </div>
                          ) : metrics === null ? (
                            <span style={{ fontSize: 13, color: T.danger }}>⚠ Failed to load RMS metrics</span>
                          ) : (
                            <>
                              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: T.textSub, margin: '0 0 12px' }}>
                                RMS Metrics — Session #{globalIdx + 1}
                              </p>
                              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                {[
                                  { label: 'Overall RMS', value: metrics?.overall_rms, color: T.accent,   big: true },
                                  { label: 'X-Axis RMS',  value: metrics?.axes?.x,     color: T.warning          },
                                  { label: 'Y-Axis RMS',  value: metrics?.axes?.y,     color: T.success          },
                                  { label: 'Z-Axis RMS',  value: metrics?.axes?.z,     color: T.purple           },
                                ].map(({ label, value, color, big }) => (
                                  <div key={label} style={{
                                    flex: '1 1 110px', minWidth: 105,
                                    padding: '12px 16px', borderRadius: 8,
                                    background: T.surface,
                                    border: `1px solid ${T.border}`,
                                    borderLeft: `3px solid ${color}`,
                                  }}>
                                    <p style={{
                                      fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                                      letterSpacing: '0.1em', color: T.textSub, margin: '0 0 8px',
                                      fontFamily: "'JetBrains Mono', monospace",
                                    }}>{label}</p>
                                    <p style={{
                                      fontSize: big ? 18 : 14, fontWeight: 700,
                                      fontFamily: "'JetBrains Mono', monospace",
                                      color, margin: 0, letterSpacing: '-0.01em',
                                    }}>
                                      {value != null ? Number(value).toFixed(6) : '—'}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginTop: 16, flexWrap: 'wrap', gap: 10,
                }}>
                  <span style={{ fontSize: 12, color: T.textSub }}>
                    Showing {startIdx + 1}–{Math.min(startIdx + ITEMS_PER_PAGE, checkpoints.length)} of {checkpoints.length}
                  </span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                      style={{
                        padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                        background: T.surfaceAlt, border: `1px solid ${T.border}`,
                        color: currentPage === 1 ? T.textSub : T.text,
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        opacity: currentPage === 1 ? 0.5 : 1,
                      }}
                    >← Prev</button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => Math.abs(p - currentPage) <= 2 || p === 1 || p === totalPages)
                      .reduce((acc, p, i, arr) => { if (i > 0 && p - arr[i-1] > 1) acc.push('…'); acc.push(p); return acc; }, [])
                      .map((p, i) =>
                        p === '…'
                          ? <span key={`e-${i}`} style={{ color: T.textSub, padding: '0 4px', fontSize: 12 }}>…</span>
                          : (
                            <button key={p} onClick={() => setCurrentPage(p)} style={{
                              width: 32, height: 32, borderRadius: 7, fontSize: 12, fontWeight: 700,
                              background: currentPage === p ? 'linear-gradient(135deg,#06b6d4,#0891b2)' : T.surfaceAlt,
                              border: currentPage === p ? 'none' : `1px solid ${T.border}`,
                              color: currentPage === p ? '#fff' : T.text,
                              cursor: 'pointer',
                              boxShadow: currentPage === p ? '0 2px 8px rgba(6,182,212,0.4)' : 'none',
                              transition: 'all 0.15s',
                            }}>{p}</button>
                          )
                      )}

                    <button
                      onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      style={{
                        padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                        background: T.surfaceAlt, border: `1px solid ${T.border}`,
                        color: currentPage === totalPages ? T.textSub : T.text,
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                        opacity: currentPage === totalPages ? 0.5 : 1,
                      }}
                    >Next →</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default History;
