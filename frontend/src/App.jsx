import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import SideNav from './components/sidenav';
import MachineConfig from './components/pages/machineconfig';
import { useState } from 'react';

function AppContent() {
  const { isDarkMode } = useTheme();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className={`flex min-h-screen ${isDarkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
      <SideNav onCollapseChange={setIsSidebarCollapsed} />
      <main className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <Routes>
          <Route path="/live-monitoring" element={<div className="p-8"><h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Live Monitoring</h1></div>} />
          <Route path="/defect-analysis" element={<div className="p-8"><h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Defect Analysis</h1></div>} />
          <Route path="/history" element={<div className="p-8"><h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>History</h1></div>} />
          <Route path="/machine-config" element={<MachineConfig />} />
          <Route path="/" element={<div className="p-8"><h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Welcome to CMF Vibration Monitor</h1></div>} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </Router>
  );
}

export default App
