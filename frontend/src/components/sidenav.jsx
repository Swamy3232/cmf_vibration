import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { getDashboardTheme } from '../theme/vibrationtheme.jsx';

const SideNav = ({ onCollapseChange }) => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();

  const T = getDashboardTheme(isDarkMode);

  const handleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    if (onCollapseChange) {
      onCollapseChange(newCollapsed);
    }
  };

  const menuItems = [
    {
      title: 'LIVE MONITORING',
      path: '/live-monitoring',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      title: 'DEFECT ANALYSIS',
      path: '/defect-analysis',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    },
    {
      title: 'HISTORY LOG',
      path: '/history',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: 'MACHINE CONFIG',
      path: '/machine-config',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    }
  ];

  // Matte dark-slate background matching industrial platforms
  const sideNavBg = isDarkMode ? '#070c14' : '#f8fafc';
  const borderColor = isDarkMode ? '#141f35' : '#e2e8f0';

  return (
    <div style={{
      position: 'fixed', left: 0, top: 0, height: '100vh',
      background: sideNavBg, borderRight: `1px solid ${borderColor}`,
      color: T.text, transition: 'width 250ms cubic-bezier(0.4, 0, 0.2, 1)',
      zIndex: 50, width: isCollapsed ? 68 : 240,
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${borderColor}`,
        height: 64, display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between'
      }}>
        {!isCollapsed && (
          <div>
            <h1 style={{
              fontSize: 14, fontWeight: 900, margin: 0, color: T.accent,
              letterSpacing: '0.12em', fontFamily: "'JetBrains Mono', monospace"
            }}>CMF ANALYTICS</h1>
            <p style={{
              fontSize: 9, margin: 0, color: T.textSub,
              letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600
            }}>Vibration Platform</p>
          </div>
        )}
        <button
          onClick={handleCollapse}
          className="vib-tbtn"
          style={{
            background: 'transparent', border: 'none', color: T.textSub, cursor: 'pointer',
            padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            {isCollapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            )}
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`mc-row-hover`}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 6, textDecoration: 'none',
                background: isActive ? T.accentDim : 'transparent',
                borderLeft: `3px solid ${isActive ? T.accent : 'transparent'}`,
                color: isActive ? T.accent : T.textSub,
                transition: 'all 150ms ease',
                justifyContent: isCollapsed ? 'center' : 'flex-start'
              }}
            >
              <div style={{ display: 'flex', color: isActive ? T.accent : T.textSub }}>{item.icon}</div>
              {!isCollapsed && (
                <span style={{
                  fontSize: 10, fontWeight: 750, letterSpacing: '0.08em',
                  fontFamily: "'JetBrains Mono', monospace"
                }}>{item.title}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '12px 16px', borderTop: `1px solid ${borderColor}`,
        display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between',
        height: 52
      }}>
        {!isCollapsed && (
          <span style={{
            fontSize: 9, color: T.textMuted,
            fontFamily: "'JetBrains Mono', monospace", fontWeight: 600
          }}>V1.0.0</span>
        )}
        <button
          onClick={toggleTheme}
          className="vib-tbtn"
          style={{
            background: 'transparent', border: 'none', color: T.textSub, cursor: 'pointer',
            padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? (
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default SideNav;
