import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { API_BASE_URL } from '../../config/api';

const MachineConfig = () => {
  const { isDarkMode } = useTheme();
  const [machines, setMachines] = useState([]);
  const [masterTables, setMasterTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [editData, setEditData] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [newConfigData, setNewConfigData] = useState({
    measurement_point: '',
    ball_circle_diameter: '',
    pitch_circle_diameter: '',
    no_of_balls: '',
    angle: '',
    rpm: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  // Combine machine data with master table data
  const combinedData = masterTables.map(mt => {
    const machine = machines.find(m => m.id === mt.machine_id);
    return {
      ...mt,
      machineType: machine?.type || '-',
      machineMake: machine?.make || '-',
      machineModel: machine?.model || '-'
    };
  });

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

  const handleCancel = () => {
    setEditingRow(null);
    setEditData({});
  };

  const handleSave = async (row) => {
    try {
      const response = await fetch(`${API_BASE_URL}/master-table/${row.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
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

      if (!response.ok) {
        throw new Error('Failed to update data');
      }

      await fetchData();
      setEditingRow(null);
      setEditData({});
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm('Are you sure you want to delete this configuration?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/master-table/${row.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete data');
      }

      await fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleInputChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddConfig = (machine = null) => {
    setSelectedMachine(machine);
    setShowAddForm(true);
    setNewConfigData({
      measurement_point: '',
      ball_circle_diameter: '',
      pitch_circle_diameter: '',
      no_of_balls: '',
      angle: '',
      rpm: ''
    });
  };

  const handleNewConfigChange = (field, value) => {
    setNewConfigData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveNewConfig = async () => {
    if (!selectedMachine) {
      setError('Please select a machine');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/master-table/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

      if (!response.ok) {
        throw new Error('Failed to create configuration');
      }

      await fetchData();
      setShowAddForm(false);
      setSelectedMachine(null);
      setNewConfigData({
        measurement_point: '',
        ball_circle_diameter: '',
        pitch_circle_diameter: '',
        no_of_balls: '',
        angle: '',
        rpm: ''
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancelAdd = () => {
    setShowAddForm(false);
    setSelectedMachine(null);
    setNewConfigData({
      measurement_point: '',
      ball_circle_diameter: '',
      pitch_circle_diameter: '',
      no_of_balls: '',
      angle: '',
      rpm: ''
    });
  };

  if (loading) {
    return (
      <div className={`p-8 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
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
      <h1 className="text-3xl font-bold mb-6">Machine Configuration</h1>

      {/* Add Configuration Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`p-6 rounded-lg w-full max-w-md ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
            <h3 className="text-xl font-semibold mb-4">Add Configuration</h3>
            {!selectedMachine && (
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Select Machine
                </label>
                <select
                  value={selectedMachine?.id || ''}
                  onChange={(e) => {
                    const machine = machines.find(m => m.id === parseInt(e.target.value));
                    setSelectedMachine(machine);
                  }}
                  className={`w-full px-3 py-2 rounded border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                >
                  <option value="">Select a machine...</option>
                  {machines.map(machine => (
                    <option key={machine.id} value={machine.id}>
                      {machine.type} - {machine.make} - {machine.model}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {selectedMachine && (
              <div className="mb-4">
                <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  Machine: {selectedMachine.type} - {selectedMachine.make} - {selectedMachine.model}
                </p>
                <button
                  onClick={() => setSelectedMachine(null)}
                  className="text-sm text-cyan-500 hover:text-cyan-600 mt-1"
                >
                  Change Machine
                </button>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Measurement Point
                </label>
                <input
                  type="text"
                  value={newConfigData.measurement_point}
                  onChange={(e) => handleNewConfigChange('measurement_point', e.target.value)}
                  className={`w-full px-3 py-2 rounded border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Ball Circle Diameter
                </label>
                <input
                  type="number"
                  value={newConfigData.ball_circle_diameter}
                  onChange={(e) => handleNewConfigChange('ball_circle_diameter', e.target.value)}
                  className={`w-full px-3 py-2 rounded border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Pitch Circle Diameter
                </label>
                <input
                  type="number"
                  value={newConfigData.pitch_circle_diameter}
                  onChange={(e) => handleNewConfigChange('pitch_circle_diameter', e.target.value)}
                  className={`w-full px-3 py-2 rounded border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  No of Balls
                </label>
                <input
                  type="number"
                  value={newConfigData.no_of_balls}
                  onChange={(e) => handleNewConfigChange('no_of_balls', e.target.value)}
                  className={`w-full px-3 py-2 rounded border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Angle
                </label>
                <input
                  type="number"
                  value={newConfigData.angle}
                  onChange={(e) => handleNewConfigChange('angle', e.target.value)}
                  className={`w-full px-3 py-2 rounded border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  RPM
                </label>
                <input
                  type="number"
                  value={newConfigData.rpm}
                  onChange={(e) => handleNewConfigChange('rpm', e.target.value)}
                  className={`w-full px-3 py-2 rounded border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveNewConfig}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              >
                Save
              </button>
              <button
                onClick={handleCancelAdd}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Existing Configurations Table */}
      <div className="flex justify-between items-center mb-4">
        {/* <h2 className="text-xl font-semibold">Existing Configurations</h2> */}
        <button
          onClick={() => handleAddConfig(null)}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Configuration
        </button>
      </div>
      <div className={`overflow-x-auto rounded-lg border ${isDarkMode ? 'border-slate-700' : 'border-slate-300'}`}>
        <table className={`min-w-full ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
          <thead>
            <tr className={`${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                S.No
              </th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Type
              </th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Make
              </th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Model
              </th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Measurement Point
              </th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Ball Circle Diameter
              </th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Pitch Circle Diameter
              </th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                No of Balls
              </th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Angle
              </th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                RPM
              </th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-slate-200'}`}>
            {combinedData.length === 0 ? (
              <tr>
                <td colSpan="11" className={`px-6 py-4 text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  No machine configurations found
                </td>
              </tr>
            ) : (
              combinedData.map((row, index) => (
                <tr key={row.id} className={`${isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}`}>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-900'}`}>
                    {index + 1}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-900'}`}>
                    {row.machineType}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-900'}`}>
                    {row.machineMake}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-900'}`}>
                    {row.machineModel}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-900'}`}>
                    {editingRow === row.id ? (
                      <input
                        type="text"
                        value={editData.measurement_point}
                        onChange={(e) => handleInputChange('measurement_point', e.target.value)}
                        className={`w-full px-2 py-1 rounded border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                      />
                    ) : (
                      row.measurement_point || '-'
                    )}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-900'}`}>
                    {editingRow === row.id ? (
                      <input
                        type="number"
                        value={editData.ball_circle_diameter}
                        onChange={(e) => handleInputChange('ball_circle_diameter', e.target.value)}
                        className={`w-full px-2 py-1 rounded border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                      />
                    ) : (
                      row.ball_circle_diameter || '-'
                    )}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-900'}`}>
                    {editingRow === row.id ? (
                      <input
                        type="number"
                        value={editData.pitch_circle_diameter}
                        onChange={(e) => handleInputChange('pitch_circle_diameter', e.target.value)}
                        className={`w-full px-2 py-1 rounded border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                      />
                    ) : (
                      row.pitch_circle_diameter || '-'
                    )}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-900'}`}>
                    {editingRow === row.id ? (
                      <input
                        type="number"
                        value={editData.no_of_balls}
                        onChange={(e) => handleInputChange('no_of_balls', e.target.value)}
                        className={`w-full px-2 py-1 rounded border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                      />
                    ) : (
                      row.no_of_balls || '-'
                    )}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-900'}`}>
                    {editingRow === row.id ? (
                      <input
                        type="number"
                        value={editData.angle}
                        onChange={(e) => handleInputChange('angle', e.target.value)}
                        className={`w-full px-2 py-1 rounded border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                      />
                    ) : (
                      row.angle || '-'
                    )}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-900'}`}>
                    {editingRow === row.id ? (
                      <input
                        type="number"
                        value={editData.rpm}
                        onChange={(e) => handleInputChange('rpm', e.target.value)}
                        className={`w-full px-2 py-1 rounded border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                      />
                    ) : (
                      row.rpm || '-'
                    )}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-900'}`}>
                    {editingRow === row.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSave(row)}
                          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancel}
                          className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const machine = machines.find(m => m.id === row.machine_id);
                            handleAddConfig(machine);
                          }}
                          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                          title="Add new configuration for this machine"
                        >
                          +
                        </button>
                        <button
                          onClick={() => handleEdit(row)}
                          className="px-3 py-1 bg-cyan-500 text-white rounded hover:bg-cyan-600 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(row)}
                          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MachineConfig;
