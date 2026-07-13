// ============================================================
// vibrationtheme.jsx
// Central theme file for the FFT / Vibration dashboard.
// Premium industrial design — inspired by SKF @ptitude Observer,
// Bently Nevada System 1, Emerson AMS.
// Supports both light and dark mode via getTheme(isDarkMode).
// ============================================================
import React from 'react';

// ────────────────────────────────────────────────────────────
// STATIC TOKENS  (same in both modes)
// ────────────────────────────────────────────────────────────
export const ACCENT   = '#06b6d4';   // industrial cyan
export const DANGER   = '#ef4444';   // alert red
export const SUCCESS  = '#22c55e';
export const WARNING  = '#f59e0b';

export const AXES = [
  { key: 'x', label: 'X Axis' },
  { key: 'y', label: 'Y Axis' },
  { key: 'z', label: 'Z Axis' },
];

export const DEFAULT_FREQ_MIN   = 0;
export const DEFAULT_FREQ_MAX   = '';
export const DEFAULT_MAX_POINTS = 2000;

export const FFT_GRADIENT_ID = 'fftGradient';

// ────────────────────────────────────────────────────────────
// THEME FACTORY  — call once per render with isDarkMode
// Returns: { COLORS, SHADOW, SHADOW_HOVER, styles, GLOBAL_CSS }
// ────────────────────────────────────────────────────────────
export const getTheme = (isDark) => {
  const COLORS = {
    primary:       ACCENT,
    danger:        DANGER,
    bg:            isDark ? '#0a0e1a' : '#f0f4f8',
    card:          isDark ? '#0f1625' : '#ffffff',
    cardAlt:       isDark ? '#151d30' : '#f8fafc',
    cardHover:     isDark ? '#1a2540' : '#f0f9ff',
    border:        isDark ? '#1e2d4a' : '#e2e8f0',
    borderAccent:  isDark ? '#06b6d4' : '#0891b2',
    text:          isDark ? '#e2e8f0' : '#0f172a',
    textSecondary: isDark ? '#64748b' : '#64748b',
    textMuted:     isDark ? '#2d4060' : '#cbd5e1',
    gridStroke:    isDark ? '#111827' : '#f1f5f9',
    inputBg:       isDark ? '#070c18' : '#ffffff',
    axisLine:      isDark ? '#1e2d4a' : '#e2e8f0',
    accentDim:     isDark ? 'rgba(6,182,212,0.12)' : 'rgba(6,182,212,0.08)',
    accentGlow:    isDark ? 'rgba(6,182,212,0.25)' : 'rgba(6,182,212,0.15)',
    dangerDim:     isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)',
  };

  const SHADOW      = isDark
    ? '0 2px 8px rgba(0,0,0,.5), 0 1px 2px rgba(0,0,0,.4)'
    : '0 1px 4px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.05)';
  const SHADOW_HOVER = isDark
    ? '0 4px 20px rgba(6,182,212,.2), 0 2px 8px rgba(0,0,0,.5)'
    : '0 4px 12px rgba(6,182,212,.15), 0 2px 6px rgba(0,0,0,.10)';

  const styles = {
    page: {
      background: COLORS.bg,
      minHeight:  '100vh',
      padding:    '24px 28px',
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      color:      COLORS.text,
      transition: 'background 200ms ease, color 200ms ease',
    },

    card: {
      background:   COLORS.card,
      border:       `1px solid ${COLORS.border}`,
      borderRadius: 10,
      boxShadow:    SHADOW,
      padding:      '20px 24px',
      transition:   'background 200ms ease, border-color 200ms ease',
    },

    metricCard: {
      background:   COLORS.card,
      border:       `1px solid ${COLORS.border}`,
      borderLeft:   `3px solid ${ACCENT}`,
      borderRadius: 8,
      boxShadow:    SHADOW,
      padding:      '14px 18px',
      transition:   'box-shadow 200ms ease, transform 200ms ease, background 200ms ease',
      cursor:       'default',
    },

    metricLabel: {
      fontSize:      10,
      fontWeight:    700,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color:         COLORS.textSecondary,
      marginBottom:  8,
      fontFamily:    "'JetBrains Mono', 'Fira Code', monospace",
    },

    metricValue: {
      fontSize:      20,
      fontWeight:    700,
      fontFamily:    "'JetBrains Mono', 'Fira Code', monospace",
      color:         COLORS.text,
      letterSpacing: '-0.02em',
    },

    metricUnit: {
      fontSize:   11,
      fontWeight: 500,
      color:      COLORS.textSecondary,
      marginLeft: 4,
      fontFamily: "'Inter', sans-serif",
    },

    /** axisBtn(active: boolean) => style object */
    axisBtn: (active) => ({
      padding:      '6px 16px',
      borderRadius: 6,
      border:       active ? `1px solid ${ACCENT}` : `1px solid ${COLORS.border}`,
      background:   active ? COLORS.accentDim : 'transparent',
      color:        active ? ACCENT : COLORS.textSecondary,
      fontWeight:   600,
      fontSize:     12,
      cursor:       'pointer',
      transition:   'all 150ms ease',
      boxShadow:    active ? `0 0 0 1px ${ACCENT}40, 0 0 10px ${ACCENT}20` : 'none',
      letterSpacing: '0.03em',
    }),

    sectionTitle: {
      fontSize:      13,
      fontWeight:    700,
      color:         COLORS.text,
      margin:        0,
      letterSpacing: '0.02em',
      textTransform: 'uppercase',
    },

    subTitle: {
      fontSize:  11,
      color:     COLORS.textSecondary,
      marginTop: 3,
      fontFamily: "'JetBrains Mono', monospace",
    },

    divider: {
      height:     1,
      background: COLORS.border,
      margin:     '16px 0',
    },

    toolbarBtn: {
      display:      'flex',
      alignItems:   'center',
      gap:          5,
      padding:      '6px 12px',
      borderRadius: 6,
      border:       `1px solid ${COLORS.border}`,
      background:   'transparent',
      color:        COLORS.textSecondary,
      fontSize:     11,
      fontWeight:   600,
      cursor:       'pointer',
      transition:   'all 150ms ease',
      letterSpacing: '0.02em',
    },

    input: {
      width:        '100%',
      padding:      '8px 12px',
      borderRadius: 6,
      border:       `1px solid ${COLORS.border}`,
      fontSize:     13,
      color:        COLORS.text,
      background:   COLORS.inputBg,
      outline:      'none',
      fontFamily:   "'JetBrains Mono', monospace",
      boxSizing:    'border-box',
      transition:   'border-color 150ms ease, box-shadow 150ms ease',
    },

    label: {
      fontSize:      10,
      fontWeight:    700,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color:         COLORS.textSecondary,
      marginBottom:  6,
      display:       'block',
      fontFamily:    "'JetBrains Mono', monospace",
    },

    retryBtn: {
      padding:      '9px 22px',
      borderRadius: 6,
      background:   ACCENT,
      color:        '#fff',
      border:       'none',
      fontWeight:   700,
      fontSize:     12,
      cursor:       'pointer',
      transition:   'background 150ms ease, transform 150ms ease, box-shadow 150ms ease',
      marginTop:    14,
      letterSpacing: '0.04em',
    },
  };

  const GLOBAL_CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

    @keyframes shimmer {
      0%   { background-position:  200% 0; }
      100% { background-position: -200% 0; }
    }
    @keyframes pulse-dot {
      0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
      50%       { opacity: 0.85; box-shadow: 0 0 0 5px rgba(34, 197, 94, 0); }
    }
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .fft-stat-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    @media (max-width: 1100px) {
      .fft-stat-grid { grid-template-columns: repeat(3, 1fr) !important; }
    }
    @media (max-width: 640px) {
      .fft-stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
    }
    .vib-page-fade { animation: fade-in 0.25s ease both; }
    .status-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #22c55e;
      display: inline-block;
      animation: pulse-dot 2s ease-in-out infinite;
    }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: ${COLORS.textSecondary}; }
    .vib-tbtn:hover { border-color: ${ACCENT} !important; color: ${ACCENT} !important; background: ${COLORS.accentDim} !important; }
    .vib-tbtn-active { border-color: ${ACCENT} !important; color: ${ACCENT} !important; background: ${COLORS.accentDim} !important; }
    .vib-tbtn-danger-active { border-color: ${DANGER} !important; color: ${DANGER} !important; background: ${COLORS.dangerDim} !important; }
    .vib-select { transition: border-color 150ms ease, box-shadow 150ms ease; }
    .vib-select:focus { outline: none; border-color: ${ACCENT} !important; box-shadow: 0 0 0 3px rgba(6,182,212,0.15) !important; }
  `;

  return { COLORS, SHADOW, SHADOW_HOVER, styles, GLOBAL_CSS };
};

// ────────────────────────────────────────────────────────────
// SKELETON COMPONENTS  (theme-aware via props)
// ────────────────────────────────────────────────────────────
export const SkeletonBox = ({ w = '100%', h = 16, r = 6, isDark = false }) => (
  <div
    style={{
      width:          w,
      height:         h,
      borderRadius:   r,
      background:     isDark
        ? 'linear-gradient(90deg, #0f1625 25%, #151d30 50%, #0f1625 75%)'
        : 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
      backgroundSize: '200% 100%',
      animation:      'shimmer 1.4s infinite',
    }}
  />
);

export const SkeletonCard = ({ isDark = false, cardStyle = {} }) => (
  <div style={cardStyle}>
    <SkeletonBox w="45%" h={9} r={4} isDark={isDark} />
    <div style={{ marginTop: 12 }}>
      <SkeletonBox w="70%" h={20} r={5} isDark={isDark} />
    </div>
  </div>
);

export const SkeletonChart = ({ cardStyle = {}, isDark = false }) => (
  <div style={{ ...cardStyle, marginTop: 20 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <SkeletonBox w={180} h={18} r={5} isDark={isDark} />
      <div style={{ display: 'flex', gap: 8 }}>
        <SkeletonBox w={70} h={30} r={6} isDark={isDark} />
        <SkeletonBox w={55} h={30} r={6} isDark={isDark} />
        <SkeletonBox w={60} h={30} r={6} isDark={isDark} />
      </div>
    </div>
    <SkeletonBox w="100%" h={320} r={8} isDark={isDark} />
  </div>
);

// ────────────────────────────────────────────────────────────
// CUSTOM RECHARTS TOOLTIP  (theme-aware)
// ────────────────────────────────────────────────────────────
export const makeTooltip = (COLORS) => {
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div
        style={{
          background:   COLORS.card,
          border:       `1px solid ${COLORS.borderAccent}`,
          borderRadius: 8,
          boxShadow:    '0 4px 24px rgba(6,182,212,.15), 0 2px 8px rgba(0,0,0,.3)',
          padding:      '10px 14px',
          fontSize:     12,
          minWidth:     160,
          fontFamily:   "'JetBrains Mono', monospace",
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginBottom: 4 }}>
          <span style={{ color: COLORS.textSecondary, fontWeight: 600 }}>FREQ</span>
          <span style={{ fontWeight: 700, color: COLORS.text }}>
            {Number(d.freq).toFixed(2)} Hz
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}>
          <span style={{ color: COLORS.textSecondary, fontWeight: 600 }}>AMP</span>
          <span style={{ fontWeight: 700, color: ACCENT }}>
            {Number(d.amplitude).toExponential(4)}
          </span>
        </div>
      </div>
    );
  };
  return CustomTooltip;
};

// ────────────────────────────────────────────────────────────
// CHART GRADIENT DEF
// ────────────────────────────────────────────────────────────
export const FftGradientDef = () => (
  <defs>
    <linearGradient id={FFT_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%"  stopColor={ACCENT} stopOpacity={0.35} />
      <stop offset="95%" stopColor={ACCENT} stopOpacity={0.04} />
    </linearGradient>
  </defs>
);

// ────────────────────────────────────────────────────────────
// FORMAT HELPERS
// ────────────────────────────────────────────────────────────
export const formatAmp   = (v) => v == null ? '—' : Number(v).toExponential(4);
export const formatSR    = (v) => v  ? `${Math.round(v).toLocaleString()} Hz` : '—';
export const formatCount = (v) => v  ? Number(v).toLocaleString() : '—';
export const fmtXTick    = (v) => { const n = Number(v); return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${Math.round(n)}`; };
export const fmtYTick    = (v) => { const n = Number(v); return n === 0 ? '0' : n.toExponential(1); };

// ────────────────────────────────────────────────────────────
// DASHBOARD UI TOKENS  (history, machine-config, etc.)
// Usage:  const T = getDashboardTheme(isDarkMode);
// ────────────────────────────────────────────────────────────
export const getDashboardTheme = (isDark) => ({
  // backgrounds
  bg:           isDark ? '#080d1a' : '#f0f4f8',
  surface:      isDark ? '#0f172a' : '#ffffff',
  surfaceAlt:   isDark ? '#1a2540' : '#f8fafc',

  // borders
  border:       isDark ? '#1e3557' : '#e2e8f0',
  borderAccent: '#06b6d4',

  // text
  text:         isDark ? '#e2e8f0' : '#0f172a',
  textSub:      '#64748b',
  textMuted:    isDark ? '#2d4060' : '#cbd5e1',

  // accent (cyan)
  accent:       '#06b6d4',
  accentDim:    isDark ? 'rgba(6,182,212,0.12)' : 'rgba(6,182,212,0.08)',
  accentStrong: isDark ? 'rgba(6,182,212,0.22)' : 'rgba(6,182,212,0.15)',

  // semantic colours
  danger:    '#ef4444',
  dangerDim: isDark ? 'rgba(239,68,68,0.13)' : 'rgba(239,68,68,0.08)',
  success:   '#10b981',
  warning:   '#f59e0b',
  purple:    '#a78bfa',

  // interaction
  rowHover: isDark ? '#141f35' : '#f0f9ff',

  // shadows
  shadow:      isDark
    ? '0 2px 16px rgba(0,0,0,0.35)'
    : '0 1px 8px rgba(0,0,0,0.07)',
  shadowCard:  isDark
    ? '0 1px 3px rgba(0,0,0,.45)'
    : '0 1px 3px rgba(0,0,0,.08)',
});

// ────────────────────────────────────────────────────────────
// DASHBOARD GLOBAL CSS  (animations + shared class hooks)
// Inject once: document.getElementById('dash-css').textContent = DASHBOARD_CSS
// ────────────────────────────────────────────────────────────
export const DASHBOARD_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
  @keyframes dash-spin      { to { transform: rotate(360deg); } }
  @keyframes dash-fadeIn    { from { opacity:0; } to { opacity:1; } }
  @keyframes dash-slideDown { from { opacity:0; transform:translateY(-12px); } to { opacity:1; transform:translateY(0); } }
  .dash-select:focus  { outline:none; border-color:#06b6d4 !important; box-shadow:0 0 0 3px rgba(6,182,212,0.14); }
  .dash-input:focus   { outline:none; border-color:#06b6d4 !important; box-shadow:0 0 0 3px rgba(6,182,212,0.14); }
  .dash-row:hover     { background: var(--dash-row-hover) !important; }
  .dash-btn:hover     { filter: brightness(1.12); }
  .dash-btn-danger:hover { background: rgba(239,68,68,0.18) !important; }

  /* Configuration Page Styles */
  .mc-row-hover { transition: background 0.12s ease; }
  .mc-row-hover:hover { background: var(--mc-row-hover) !important; }
  .mc-input {
    width: 100%; padding: 7px 10px; border-radius: 5px; font-size: 12px;
    font-family: 'JetBrains Mono', monospace; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .mc-input:focus { border-color: #06b6d4 !important; box-shadow: 0 0 0 3px rgba(6,182,212,0.15); }
  .mc-tbtn {
    display: flex; align-items: center; gap: 5px;
    padding: 5px 10px; border-radius: 5px; cursor: pointer;
    font-size: 11px; font-weight: 700; letter-spacing: 0.04em;
    border: 1px solid transparent; transition: all 0.15s ease;
  }
  .mc-tbtn:hover { filter: brightness(1.1); transform: translateY(-1px); }
  .status-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #10b981; flex-shrink: 0;
    box-shadow: 0 0 0 2px rgba(16,185,129,0.25);
    animation: pulse-dot 2s ease-in-out infinite;
  }
  @keyframes pulse-dot {
    0%, 100% { box-shadow: 0 0 0 2px rgba(16,185,129,0.25); }
    50%       { box-shadow: 0 0 0 5px rgba(16,185,129,0.0);  }
  }
  .vib-page-fade { animation: vib-fadeIn 0.35s ease; }
  @keyframes vib-fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
`;

