import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { API_BASE_URL } from '../config/api';
import { getDashboardTheme, DASHBOARD_CSS } from '../theme/vibrationtheme.jsx';


const MachineConfig = () => {
  const { isDarkMode } = useTheme();
  const T = getDashboardTheme(isDarkMode);

  const [machines,      setMachines]      = useState([]);
  const [masterTables,  setMasterTables]  = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [editingRow,    setEditingRow]    = useState(null);
  const [editData,      setEditData]      = useState({});
  const [showAddForm,   setShowAddForm]   = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [newConfigData, setNewConfigData] = useState({
    measurement_point: '', ball_circle_diameter: '',
    pitch_circle_diameter: '', no_of_balls: '', angle: '', rpm: ''
  });

  // ── CSS injection ──────────────────────────────────────────────────────

  useEffect(() => {
    let s = document.getElementById('mc-css');
    if (!s) { s = document.createElement('style'); s.id = 'mc-css'; document.head.appendChild(s); }
    s.textContent = DASHBOARD_CSS;
    document.documentElement.style.setProperty('--mc-row-hover', T.rowHover);
  }, [isDarkMode]);

  useEffect(() => { fetchData(); }, []);

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchData = async () => {
    try {
      setLoading(true);
      const [machinesRes, masterTablesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/machine/`),
        fetch(`${API_BASE_URL}/master-table/`)
      ]);
      if (!machinesRes.ok || !masterTablesRes.ok) throw new Error('Failed to fetch data');
      setMachines(await machinesRes.json());
      setMasterTables(await masterTablesRes.json());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const combinedData = masterTables.map(mt => {
    const machine = machines.find(m => m.id === mt.machine_id);
    return { ...mt, machineType: machine?.type || '-', machineMake: machine?.make || '-', machineModel: machine?.model || '-' };
  });

  // ── Edit handlers ──────────────────────────────────────────────────────
  const handleEdit = (row) => {
    setEditingRow(row.id);
    setEditData({
      measurement_point: row.measurement_point || '',
      ball_circle_diameter: row.ball_circle_diameter || '',
      pitch_circle_diameter: row.pitch_circle_diameter || '',
      no_of_balls: row.no_of_balls || '',
      angle: row.angle || '',
      rpm: row.rpm || ''
    });
  };
  const handleCancel = () => { setEditingRow(null); setEditData({}); };

  const handleSave = async (row) => {
    try {
      const response = await fetch(`${API_BASE_URL}/master-table/${row.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machine_id: row.machine_id,
          measurement_point: editData.measurement_point,
          ball_circle_diameter: parseFloat(editData.ball_circle_diameter) || null,
          pitch_circle_diameter: parseFloat(editData.pitch_circle_diameter) || null,
          no_of_balls: parseInt(editData.no_of_balls) || null,
          angle: parseFloat(editData.angle) || null,
          rpm: parseFloat(editData.rpm) || null
        }),
      });
      if (!response.ok) throw new Error('Failed to update data');
      await fetchData(); setEditingRow(null); setEditData({});
    } catch (err) { setError(err.message); }
  };

  const handleDelete = async (row) => {
    if (!window.confirm('Are you sure you want to delete this configuration?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/master-table/${row.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete data');
      await fetchData();
    } catch (err) { setError(err.message); }
  };

  const handleInputChange = (field, value) => setEditData(prev => ({ ...prev, [field]: value }));

  const handleAddConfig = (machine = null) => {
    setSelectedMachine(machine);
    setShowAddForm(true);
    setNewConfigData({ measurement_point: '', ball_circle_diameter: '', pitch_circle_diameter: '', no_of_balls: '', angle: '', rpm: '' });
  };
  const handleNewConfigChange = (field, value) => setNewConfigData(prev => ({ ...prev, [field]: value }));

  const handleSaveNewConfig = async () => {
    if (!selectedMachine) { setError('Please select a machine'); return; }
    try {
      const response = await fetch(`${API_BASE_URL}/master-table/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machine_id: selectedMachine.id,
          measurement_point: newConfigData.measurement_point,
          ball_circle_diameter: parseFloat(newConfigData.ball_circle_diameter) || null,
          pitch_circle_diameter: parseFloat(newConfigData.pitch_circle_diameter) || null,
          no_of_balls: parseInt(newConfigData.no_of_balls) || null,
          angle: parseFloat(newConfigData.angle) || null,
          rpm: parseFloat(newConfigData.rpm) || null
        }),
      });
      if (!response.ok) throw new Error('Failed to create configuration');
      await fetchData(); setShowAddForm(false); setSelectedMachine(null);
      setNewConfigData({ measurement_point: '', ball_circle_diameter: '', pitch_circle_diameter: '', no_of_balls: '', angle: '', rpm: '' });
    } catch (err) { setError(err.message); }
  };

  const handleCancelAdd = () => {
    setShowAddForm(false); setSelectedMachine(null);
    setNewConfigData({ measurement_point: '', ball_circle_diameter: '', pitch_circle_diameter: '', no_of_balls: '', angle: '', rpm: '' });
  };

  // ── Input helper ───────────────────────────────────────────────────────
  const inputStyle = {
    background: T.surfaceAlt, color: T.text,
    border: `1px solid ${T.border}`, borderRadius: 5,
    padding: '7px 10px', fontSize: 12,
    fontFamily: "'JetBrains Mono', monospace", outline: 'none', width: '100%',
  };
  const labelStyle = {
    fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.1em', color: T.textSub,
    fontFamily: "'JetBrains Mono', monospace", display: 'block', marginBottom: 5,
  };

  const FORM_FIELDS = [
    { key: 'measurement_point', label: 'Measurement Point', type: 'text' },
    { key: 'ball_circle_diameter', label: 'Ball Circle Diameter (mm)', type: 'number' },
    { key: 'pitch_circle_diameter', label: 'Pitch Circle Diameter (mm)', type: 'number' },
    { key: 'no_of_balls', label: 'No. of Balls', type: 'number' },
    { key: 'angle', label: 'Contact Angle (°)', type: 'number' },
    { key: 'rpm', label: 'Operating RPM', type: 'number' },
  ];

  // ── Loading / Error states ─────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16, background: T.bg }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(6,182,212,0.18)', borderTopColor: '#06b6d4', animation: 'dash-spin 0.7s linear infinite' }} />
      <span style={{ fontSize: 12, color: T.textSub, fontFamily: "'JetBrains Mono', monospace" }}>Loading configurations…</span>
    </div>
  );

  if (error && masterTables.length === 0) return (
    <div style={{ padding: 32, background: T.bg, minHeight: '100vh' }}>
      <div style={{ padding: '16px 20px', borderRadius: 8, background: T.dangerDim, border: '1px solid rgba(239,68,68,0.28)', color: T.danger, fontSize: 13 }}>⚠ {error}</div>
    </div>
  );

  // ── Main render ────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: T.bg, padding: '28px 32px', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", color: T.text }} className="vib-page-fade">

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span className="status-dot" title="System active" />
            <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: T.text, letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif" }}>
              Machine Configuration
            </h1>
            <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: T.accentDim, color: T.accent, letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace", border: `1px solid ${T.border}` }}>
              MASTER TABLE
            </span>
          </div>
          <p style={{ fontSize: 11, color: T.textSub, margin: 0, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.03em' }}>
            Bearing parameters · defect frequency inputs · measurement points
          </p>
        </div>
        <button
          onClick={() => handleAddConfig(null)}
          className="mc-tbtn"
          style={{ background: T.accent, color: '#fff', padding: '8px 16px', boxShadow: `0 2px 8px ${T.accent}55` }}
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="4" x2="12" y2="20"/><line x1="4" y1="12" x2="20" y2="12"/></svg>
          Add Configuration
        </button>
      </div>

      {/* ── Inline error banner ── */}
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 7, background: T.dangerDim, border: '1px solid rgba(239,68,68,0.28)', color: T.danger, fontSize: 12, marginBottom: 16, fontFamily: "'JetBrains Mono', monospace" }}>
          ⚠ {error}
          <button onClick={() => setError(null)} style={{ float: 'right', background: 'none', border: 'none', color: T.danger, cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
      )}

      {/* ── Add Configuration Modal ── */}
      {showAddForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderTop: `2px solid ${T.accent}`, borderRadius: 12, padding: '24px 28px', width: '100%', maxWidth: 460, boxShadow: `0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px ${T.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.text, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Add Configuration</div>
                <div style={{ fontSize: 10, color: T.textSub, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>Bearing defect frequency parameters</div>
              </div>
              <button onClick={handleCancelAdd} style={{ background: 'none', border: 'none', color: T.textSub, cursor: 'pointer', padding: 4, borderRadius: 4 }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Machine selector */}
            {!selectedMachine ? (
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Select Machine</label>
                <select
                  value={selectedMachine?.id || ''}
                  onChange={(e) => setSelectedMachine(machines.find(m => m.id === parseInt(e.target.value)))}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="">— Select a machine —</option>
                  {machines.map(machine => (
                    <option key={machine.id} value={machine.id}>
                      {machine.type} · {machine.make} · {machine.model}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 7, background: T.accentDim, border: `1px solid ${T.accent}44`, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, letterSpacing: '0.04em' }}>
                    {selectedMachine.type} · {selectedMachine.make}
                  </div>
                  <div style={{ fontSize: 10, color: T.textSub, fontFamily: "'JetBrains Mono', monospace", marginTop: 1 }}>
                    {selectedMachine.model} · MID-{selectedMachine.id}
                  </div>
                </div>
                <button onClick={() => setSelectedMachine(null)} style={{ background: 'none', border: 'none', color: T.textSub, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                  Change
                </button>
              </div>
            )}

            {/* Form fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              {FORM_FIELDS.map(({ key, label, type }) => (
                <div key={key}>
                  <label style={labelStyle}>{label}</label>
                  <input type={type} value={newConfigData[key]} onChange={e => handleNewConfigChange(key, e.target.value)} className="mc-input" style={inputStyle} />
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={handleCancelAdd} className="mc-tbtn" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.textSub }}>Cancel</button>
              <button onClick={handleSaveNewConfig} className="mc-tbtn" style={{ background: T.accent, color: '#fff', boxShadow: `0 2px 8px ${T.accent}55` }}>
                <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                Save Config
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Configurations Table ── */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderTop: `2px solid ${T.accent}`, borderRadius: 10, overflow: 'hidden', boxShadow: isDarkMode ? '0 2px 16px rgba(0,0,0,0.35)' : '0 1px 8px rgba(0,0,0,0.07)' }}>

        {/* Table header + badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="13" height="13" fill="none" stroke={T.accent} viewBox="0 0 24 24" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
            <span style={{ fontSize: 12, fontWeight: 700, color: T.text, letterSpacing: '0.03em' }}>Bearing Configurations</span>
            <span style={{ padding: '2px 9px', borderRadius: 20, background: T.accentDim, color: T.accent, fontSize: 11, fontWeight: 700 }}>
              {combinedData.length}
            </span>
          </div>
        </div>

        {/* Column headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '40px 110px 100px 120px 1fr 90px 90px 70px 70px 70px 160px',
          padding: '9px 20px',
          background: isDarkMode ? '#070c18' : '#f0f4f8',
          borderBottom: `1px solid ${T.border}`,
        }}>
          {['#', 'TYPE', 'MAKE', 'MODEL', 'MEAS. POINT', 'BCD (mm)', 'PCD (mm)', 'BALLS', 'ANGLE °', 'RPM', 'ACTIONS'].map((h, i) => (
            <span key={i} style={{
              fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
              color: T.textSub, fontFamily: "'JetBrains Mono', monospace",
            }}>{h}</span>
          ))}
        </div>

        {/* Rows */}
        {combinedData.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px', gap: 12, textAlign: 'center' }}>
            <svg width="36" height="36" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeOpacity="0.25" strokeWidth="1.5">
              <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.657-4.03 3-9 3S3 13.657 3 12"/><path d="M3 5v14c0 1.657 4.03 3 9 3s9-1.343 9-3V5"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text, textTransform: 'uppercase', letterSpacing: '0.06em' }}>No Configurations Found</span>
            <span style={{ fontSize: 11, color: T.textSub, fontFamily: "'JetBrains Mono', monospace" }}>Use "Add Configuration" to create bearing parameters</span>
          </div>
        ) : (
          combinedData.map((row, index) => (
            <div key={row.id} className="mc-row-hover" style={{
              display: 'grid',
              gridTemplateColumns: '40px 110px 100px 120px 1fr 90px 90px 70px 70px 70px 160px',
              padding: '11px 20px',
              borderBottom: `1px solid ${T.border}`,
              alignItems: 'center',
              background: editingRow === row.id ? T.accentDim : 'transparent',
              transition: 'background 0.15s',
              borderLeft: editingRow === row.id ? `3px solid ${T.accent}` : '3px solid transparent',
            }}>
              {/* # */}
              <span style={{ fontSize: 11, color: T.textSub, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                {index + 1}
              </span>

              {/* Type */}
              <span style={{ fontSize: 11, color: T.text, fontWeight: 600, letterSpacing: '0.02em' }}>{row.machineType}</span>

              {/* Make */}
              <span style={{ fontSize: 11, color: T.textSub }}>{row.machineMake}</span>

              {/* Model */}
              <span style={{ fontSize: 11, color: T.textSub, fontFamily: "'JetBrains Mono', monospace" }}>{row.machineModel}</span>

              {/* Measurement Point */}
              <span>
                {editingRow === row.id ? (
                  <input type="text" value={editData.measurement_point} onChange={e => handleInputChange('measurement_point', e.target.value)} className="mc-input" style={inputStyle} />
                ) : (
                  <span style={{ fontSize: 11, color: T.text, fontFamily: editingRow === row.id ? '' : "'JetBrains Mono', monospace" }}>
                    {row.measurement_point || '—'}
                  </span>
                )}
              </span>

              {/* BCD */}
              <span>
                {editingRow === row.id ? (
                  <input type="number" value={editData.ball_circle_diameter} onChange={e => handleInputChange('ball_circle_diameter', e.target.value)} className="mc-input" style={inputStyle} />
                ) : (
                  <span style={{ fontSize: 11, color: T.accent, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                    {row.ball_circle_diameter ?? '—'}
                  </span>
                )}
              </span>

              {/* PCD */}
              <span>
                {editingRow === row.id ? (
                  <input type="number" value={editData.pitch_circle_diameter} onChange={e => handleInputChange('pitch_circle_diameter', e.target.value)} className="mc-input" style={inputStyle} />
                ) : (
                  <span style={{ fontSize: 11, color: T.accent, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                    {row.pitch_circle_diameter ?? '—'}
                  </span>
                )}
              </span>

              {/* No. of Balls */}
              <span>
                {editingRow === row.id ? (
                  <input type="number" value={editData.no_of_balls} onChange={e => handleInputChange('no_of_balls', e.target.value)} className="mc-input" style={inputStyle} />
                ) : (
                  <span style={{ fontSize: 11, color: T.text, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                    {row.no_of_balls ?? '—'}
                  </span>
                )}
              </span>

              {/* Angle */}
              <span>
                {editingRow === row.id ? (
                  <input type="number" value={editData.angle} onChange={e => handleInputChange('angle', e.target.value)} className="mc-input" style={inputStyle} />
                ) : (
                  <span style={{ fontSize: 11, color: T.text, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                    {row.angle ?? '—'}
                  </span>
                )}
              </span>

              {/* RPM */}
              <span>
                {editingRow === row.id ? (
                  <input type="number" value={editData.rpm} onChange={e => handleInputChange('rpm', e.target.value)} className="mc-input" style={inputStyle} />
                ) : (
                  <span style={{ fontSize: 11, color: T.warning || '#f59e0b', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                    {row.rpm ?? '—'}
                  </span>
                )}
              </span>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 5, flexWrap: 'nowrap', alignItems: 'center' }}>
                {editingRow === row.id ? (
                  <>
                    <button onClick={() => handleSave(row)} className="mc-tbtn" style={{ background: '#10b981', color: '#fff' }}>
                      <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      Save
                    </button>
                    <button onClick={handleCancel} className="mc-tbtn" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.textSub }}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { const machine = machines.find(m => m.id === row.machine_id); handleAddConfig(machine); }}
                      className="mc-tbtn"
                      title="Add new configuration for this machine"
                      style={{ background: '#10b981', color: '#fff' }}
                    >
                      <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="4" x2="12" y2="20"/><line x1="4" y1="12" x2="20" y2="12"/></svg>
                      Add
                    </button>
                    <button onClick={() => handleEdit(row)} className="mc-tbtn" style={{ background: T.accentDim, border: `1px solid ${T.accent}55`, color: T.accent }}>
                      <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(row)} className="mc-tbtn" style={{ background: T.dangerDim, border: `1px solid rgba(239,68,68,0.28)`, color: T.danger }}>
                      <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                      Del
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MachineConfig;
