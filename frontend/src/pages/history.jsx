import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { API_BASE_URL } from '../config/api';

const History = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [machines, setMachines] = useState([]);
  const [masterTables, setMasterTables] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [loadingMachines, setLoadingMachines] = useState(true);
  const [loadingCheckpoints, setLoadingCheckpoints] = useState(false);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('All');
  const [selectedCheckpointMetrics, setSelectedCheckpointMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoadingMachines(true);
      const [machinesRes, masterTablesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/machine/`),
        fetch(`${API_BASE_URL}/master-table/`)
      ]);

      if (!machinesRes.ok || !masterTablesRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const machinesData = await machinesRes.json();
      const masterTablesData = await masterTablesRes.json();

      setMachines(machinesData);
      setMasterTables(masterTablesData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMachines(false);
    }
  };

  const fetchCheckpoints = async (machineId) => {
    try {
      setLoadingCheckpoints(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/checkpoint/?skip=0&limit=100`);
      if (!response.ok) {
        throw new Error('Failed to fetch checkpoints');
      }
      const data = await response.json();
      // Filter checkpoints by master_id (which corresponds to machine configuration)
      const filteredCheckpoints = data.filter(cp => cp.master_id === machineId);
      setCheckpoints(filteredCheckpoints);
    } catch (err) {
      setError(err.message);
      setCheckpoints([]);
    } finally {
      setLoadingCheckpoints(false);
    }
  };

  const handleMachineClick = (machine) => {
    setSelectedMachine(machine);
    setCurrentPage(1); // Reset to first page when machine changes
    // Use the machine's master table ID for filtering checkpoints
    const masterTableEntry = masterTables.find(mt => mt.machine_id === machine.id);
    const masterId = masterTableEntry?.id;
    fetchCheckpoints(masterId);
  };

  const handleBackToMachines = () => {
    setSelectedMachine(null);
    setCheckpoints([]);
    setSelectedCheckpointMetrics(null);
  };

  const handleViewMetrics = async (checkpoint) => {
    try {
      setLoadingMetrics(true);
      setSelectedCheckpointMetrics(null);
      const response = await fetch(`${API_BASE_URL}/fft/checkpoint/${checkpoint.id}/rms`);
      if (response.ok) {
        const data = await response.json();
        setSelectedCheckpointMetrics(data);
      } else {
        setError('Failed to fetch metrics');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const handleAnalytics = (checkpoint) => {
    navigate('/defect-analysis', { state: { checkpointId: checkpoint.id, machine: selectedMachine } });
  };

  // Get unique machine types for filter
  const uniqueTypes = ['All', ...new Set(machines.map(m => m.type).filter(Boolean))];

  // Filter machines based on selected type
  const filteredMachines = filterType === 'All'
    ? machines
    : machines.filter(m => m.type === filterType);

  // Pagination calculations
  const totalPages = Math.ceil(checkpoints.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCheckpoints = checkpoints.slice(startIndex, endIndex);

  if (loadingMachines) {
    return (
      <div className={`p-8 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
        </div>
      </div>
    );
  }

  if (error && !selectedMachine) {
    return (
      <div className={`p-8 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
        <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className={`p-8 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
      {/* <h1 className="text-3xl font-bold mb-6">History</h1> */}

      <div className="flex gap-6">
        {/* Left Panel - Machine List */}
        <div className={`${selectedMachine ? 'w-1/2' : 'w-full'}`}>
          {/* Filter Section */}
          <div className={`mb-6 p-4 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}>
            <div className="flex items-center gap-4">
              <label className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Filter by Type:
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className={`px-4 py-2 rounded-lg border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
              >
                {uniqueTypes.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Showing {filteredMachines.length} of {machines.length} machines
              </span>
            </div>
          </div>

          {filteredMachines.length === 0 ? (
            <div className={`p-12 text-center rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}>
              <p className={`text-lg ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {filterType === 'All' ? 'No machines available' : `No machines of type "${filterType}" found`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMachines.map((machine) => (
                <div
                  key={machine.id}
                  onClick={() => handleMachineClick(machine)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                    selectedMachine?.id === machine.id
                      ? isDarkMode
                        ? 'bg-cyan-900/30 border-cyan-500'
                        : 'bg-cyan-50 border-cyan-500'
                      : isDarkMode
                        ? 'bg-slate-800 border-slate-700 hover:border-cyan-500 hover:shadow-lg'
                        : 'bg-white border-slate-300 hover:border-cyan-500 hover:shadow-lg'
                  }`}
                >
                  <div className="mb-3">
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {machine.type || 'Unknown Type'}
                    </h3>
                  </div>
                  <div className="space-y-1">
                    <div className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      <span>Make: {machine.make || '-'}</span>
                    </div>
                    <div className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      <span>Model: {machine.model || '-'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Panel - Checkpoint Detail */}
        {selectedMachine && (
          <div className="w-1/2">
            <button
              onClick={handleBackToMachines}
              className={`mb-4 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                isDarkMode
                  ? 'bg-slate-700 text-white hover:bg-slate-600'
                  : 'bg-slate-200 text-slate-900 hover:bg-slate-300'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Close
            </button>

            <div className={`p-6 rounded-lg border mb-6 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}>
              <h2 className={`text-2xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {selectedMachine.type}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Make</p>
                  <p className={`text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{selectedMachine.make || '-'}</p>
                </div>
                <div>
                  <p className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Model</p>
                  <p className={`text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{selectedMachine.model || '-'}</p>
                </div>
              </div>
            </div>

            {/* Inline Metrics Display */}
            {selectedCheckpointMetrics && (
              <div className={`p-6 rounded-lg border mb-6 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    RMS Metrics
                  </h3>
                  <button
                    onClick={() => setSelectedCheckpointMetrics(null)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      isDarkMode
                        ? 'bg-slate-700 text-white hover:bg-slate-600'
                        : 'bg-slate-200 text-slate-900 hover:bg-slate-300'
                    }`}
                  >
                    Clear
                  </button>
                </div>
                {loadingMetrics ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Overall RMS</p>
                      <p className={`text-2xl font-bold ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                        {selectedCheckpointMetrics.overall_rms !== null ? selectedCheckpointMetrics.overall_rms.toFixed(6) : '-'}
                      </p>
                    </div>
                    <div>
                      <p className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>X-Axis RMS</p>
                      <p className={`text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {selectedCheckpointMetrics.axes.x !== null ? selectedCheckpointMetrics.axes.x.toFixed(6) : '-'}
                      </p>
                    </div>
                    <div>
                      <p className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Y-Axis RMS</p>
                      <p className={`text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {selectedCheckpointMetrics.axes.y !== null ? selectedCheckpointMetrics.axes.y.toFixed(6) : '-'}
                      </p>
                    </div>
                    <div>
                      <p className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Z-Axis RMS</p>
                      <p className={`text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {selectedCheckpointMetrics.axes.z !== null ? selectedCheckpointMetrics.axes.z.toFixed(6) : '-'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <h3 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Checkpoints
            </h3>

          {loadingCheckpoints ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
            </div>
          ) : error && selectedMachine ? (
            <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded">
              Error: {error}
            </div>
          ) : checkpoints.length === 0 ? (
            <div className={`p-12 text-center rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}>
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className={`text-lg ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                No checkpoints available for this machine
              </p>
            </div>
          ) : (
            <div>
              <div className={`rounded-lg border overflow-hidden ${isDarkMode ? 'border-slate-700' : 'border-slate-300'}`}>
                <table className={`min-w-full ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
                  <thead>
                    <tr className={`${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        S.No
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        Date
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-slate-200'}`}>
                    {paginatedCheckpoints.map((checkpoint, index) => (
                      <tr key={checkpoint.id} className={`${isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}`}>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-900'}`}>
                          {startIndex + index + 1}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-900'}`}>
                          {checkpoint.start ? new Date(checkpoint.start).toLocaleString() : '-'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-900'}`}>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleViewMetrics(checkpoint)}
                              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                isDarkMode
                                  ? 'bg-cyan-600 text-white hover:bg-cyan-700'
                                  : 'bg-cyan-500 text-white hover:bg-cyan-600'
                              }`}
                            >
                              View Metrics
                            </button>
                            <button
                              onClick={() => handleAnalytics(checkpoint)}
                              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                isDarkMode
                                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                                  : 'bg-blue-500 text-white hover:bg-blue-600'
                              }`}
                            >
                              Analytics
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className={`mt-4 flex items-center justify-between ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <div className="text-sm">
                    Showing {startIndex + 1} to {Math.min(endIndex, checkpoints.length)} of {checkpoints.length} checkpoints
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        currentPage === 1
                          ? isDarkMode
                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : isDarkMode
                            ? 'bg-slate-700 text-white hover:bg-slate-600'
                            : 'bg-slate-200 text-slate-900 hover:bg-slate-300'
                      }`}
                    >
                      Previous
                    </button>
                    <div className="flex gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 rounded text-sm transition-colors ${
                            currentPage === page
                              ? isDarkMode
                                ? 'bg-cyan-600 text-white'
                                : 'bg-cyan-500 text-white'
                              : isDarkMode
                                ? 'bg-slate-700 text-white hover:bg-slate-600'
                                : 'bg-slate-200 text-slate-900 hover:bg-slate-300'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        currentPage === totalPages
                          ? isDarkMode
                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : isDarkMode
                            ? 'bg-slate-700 text-white hover:bg-slate-600'
                            : 'bg-slate-200 text-slate-900 hover:bg-slate-300'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
