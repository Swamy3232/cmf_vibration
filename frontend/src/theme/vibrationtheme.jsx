// ============================================================
// vibrationtheme.jsx
// Central theme file for the FFT / Vibration dashboard.
// Supports both light and dark mode via getTheme(isDarkMode).
// ============================================================
import React from 'react';

// ────────────────────────────────────────────────────────────
// STATIC TOKENS  (same in both modes)
// ────────────────────────────────────────────────────────────
export const ACCENT   = '#2563eb';   // primary blue
export const DANGER   = '#ef4444';   // dominant marker red
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
    bg:            isDark ? '#0f172a' : '#f8fafc',
    card:          isDark ? '#1e293b' : '#ffffff',
    cardHover:     isDark ? '#263348' : '#f8fafc',
    border:        isDark ? '#334155' : '#e5e7eb',
    text:          isDark ? '#f1f5f9' : '#111827',
    textSecondary: isDark ? '#94a3b8' : '#6b7280',
    gridStroke:    isDark ? '#1e293b' : '#f1f5f9',
    inputBg:       isDark ? '#0f172a' : '#ffffff',
    axisLine:      isDark ? '#334155' : '#e5e7eb',
  };

  const SHADOW      = isDark
    ? '0 1px 3px rgba(0,0,0,.4), 0 1px 2px rgba(0,0,0,.3)'
    : '0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.06)';
  const SHADOW_HOVER = isDark
    ? '0 4px 14px rgba(37,99,235,.25), 0 2px 8px rgba(0,0,0,.4)'
    : '0 4px 12px rgba(37,99,235,.15), 0 2px 6px rgba(0,0,0,.10)';

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
      borderRadius: 12,
      boxShadow:    SHADOW,
      padding:      '20px 24px',
      transition:   'background 200ms ease, border-color 200ms ease',
    },

    metricCard: {
      background:   COLORS.card,
      border:       `1px solid ${COLORS.border}`,
      borderRadius: 12,
      boxShadow:    SHADOW,
      padding:      '16px 20px',
      transition:   'box-shadow 200ms ease, transform 200ms ease, background 200ms ease',
      cursor:       'default',
    },

    metricLabel: {
      fontSize:      10,
      fontWeight:    700,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color:         COLORS.textSecondary,
      marginBottom:  6,
    },

    metricValue: {
      fontSize:      22,
      fontWeight:    700,
      fontFamily:    'monospace',
      color:         COLORS.text,
      letterSpacing: '-0.02em',
    },

    metricUnit: {
      fontSize:   13,
      fontWeight: 500,
      color:      COLORS.textSecondary,
      marginLeft: 4,
    },

    /** axisBtn(active: boolean) → style object */
    axisBtn: (active) => ({
      padding:      '7px 18px',
      borderRadius: 20,
      border:       active ? 'none' : `1px solid ${COLORS.border}`,
      background:   active ? COLORS.primary : (isDark ? '#1e293b' : '#fff'),
      color:        active ? '#fff' : COLORS.textSecondary,
      fontWeight:   600,
      fontSize:     13,
      cursor:       'pointer',
      transition:   'all 200ms ease',
      boxShadow:    active ? '0 2px 8px rgba(37,99,235,.35)' : 'none',
    }),

    sectionTitle: {
      fontSize:   15,
      fontWeight: 700,
      color:      COLORS.text,
      margin:     0,
    },

    subTitle: {
      fontSize:  12,
      color:     COLORS.textSecondary,
      marginTop: 2,
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
      padding:      '6px 13px',
      borderRadius: 8,
      border:       `1px solid ${COLORS.border}`,
      background:   isDark ? '#1e293b' : '#fff',
      color:        COLORS.textSecondary,
      fontSize:     12,
      fontWeight:   600,
      cursor:       'pointer',
      transition:   'all 150ms ease',
    },

    input: {
      width:        '100%',
      padding:      '7px 11px',
      borderRadius: 8,
      border:       `1px solid ${COLORS.border}`,
      fontSize:     13,
      color:        COLORS.text,
      background:   COLORS.inputBg,
      outline:      'none',
      fontFamily:   'monospace',
      boxSizing:    'border-box',
    },

    label: {
      fontSize:      11,
      fontWeight:    700,
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      color:         COLORS.textSecondary,
      marginBottom:  5,
      display:       'block',
    },

    retryBtn: {
      padding:      '9px 22px',
      borderRadius: 8,
      background:   COLORS.primary,
      color:        '#fff',
      border:       'none',
      fontWeight:   700,
      fontSize:     13,
      cursor:       'pointer',
      transition:   'background 150ms ease, transform 150ms ease',
      marginTop:    14,
    },
  };

  const GLOBAL_CSS = `
    @keyframes shimmer {
      0%   { background-position:  200% 0; }
      100% { background-position: -200% 0; }
    }
    .fft-stat-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 12px;
    }
    @media (max-width: 1100px) {
      .fft-stat-grid { grid-template-columns: repeat(3, 1fr) !important; }
    }
    @media (max-width: 640px) {
      .fft-stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
    }
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
        ? 'linear-gradient(90deg, #1e293b 25%, #263348 50%, #1e293b 75%)'
        : 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
      backgroundSize: '200% 100%',
      animation:      'shimmer 1.4s infinite',
    }}
  />
);

export const SkeletonCard = ({ isDark = false, cardStyle = {} }) => (
  <div style={cardStyle}>
    <SkeletonBox w="55%" h={10} r={4} isDark={isDark} />
    <div style={{ marginTop: 10 }}>
      <SkeletonBox w="80%" h={24} r={5} isDark={isDark} />
    </div>
  </div>
);

export const SkeletonChart = ({ cardStyle = {}, isDark = false }) => (
  <div style={{ ...cardStyle, marginTop: 20 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <SkeletonBox w={180} h={18} r={5} isDark={isDark} />
      <div style={{ display: 'flex', gap: 8 }}>
        <SkeletonBox w={70} h={30} r={8} isDark={isDark} />
        <SkeletonBox w={55} h={30} r={8} isDark={isDark} />
        <SkeletonBox w={60} h={30} r={8} isDark={isDark} />
      </div>
    </div>
    <SkeletonBox w="100%" h={320} r={10} isDark={isDark} />
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
          border:       `1px solid ${COLORS.border}`,
          borderRadius: 10,
          boxShadow:    '0 4px 16px rgba(0,0,0,.20)',
          padding:      '10px 14px',
          fontSize:     12,
          minWidth:     150,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginBottom: 4 }}>
          <span style={{ color: COLORS.textSecondary, fontWeight: 600 }}>Frequency</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: COLORS.text }}>
            {Number(d.freq).toFixed(2)} Hz
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}>
          <span style={{ color: COLORS.textSecondary, fontWeight: 600 }}>Amplitude</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: COLORS.primary }}>
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
