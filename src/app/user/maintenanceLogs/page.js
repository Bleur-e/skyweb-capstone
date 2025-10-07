'use client';

import React, { useState, useEffect } from 'react';
import supabase from '../../../supabaseClient';

const MaintenanceLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [plateFilter, setPlateFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null); // for modal

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
  const { data, error } = await supabase
    .from('maintenance_logs')
    .select(`
      log_id,
      status,
      completed_at,
      created_at,
      maintenance_id,
      maintenance (
        maintenance_id,
        plate_number,
        date,
        description,
        maintenance_type,
        photo_url,
        encoded_by,
        encoded_by_user: encoded_by (full_name),
        maintenance_mechanics (
          mechanics (name)
        ),
        maintenance_items (
          quantity,
          inventory (item_name)
        )
      ),
      completed_by_user: completed_by (full_name)
    `)
    .order('completed_at', { ascending: false });

  if (error) {
    console.error('Error fetching logs:', error.message, error.details);
  } else {
    const formattedLogs = data
      .filter((log) => log.maintenance)
      .map((log) => ({
        ...log,
        ...log.maintenance,
        completed_by_full_name: log.completed_by_user?.full_name || 'N/A',
        encoded_by_full_name: log.maintenance?.encoded_by_user?.full_name || 'N/A',
      }));

    setLogs(formattedLogs);
  }
};

  // Unique plate numbers for filter from the actual logs loaded
  const plateNumbers = [...new Set(logs.map((log) => log.plate_number))];

  return (
    <main className="p-6 flex flex-col gap-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Maintenance Logs</h1>
        {/* Plate number filter */}
        <select
          value={plateFilter}
          onChange={(e) => setPlateFilter(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-gray-700"
        >
          <option value="">All Trucks</option>
          {plateNumbers.map((plate) => (
            <option key={plate} value={plate}>
              {plate}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-md overflow-hidden shadow">
          <thead className="bg-amber-100 text-amber-800">
            <tr>
              <th className="py-3 px-4 text-left">Completion Date</th>
              <th className="py-3 px-4 text-left">Plate Number</th>
              <th className="py-3 px-4 text-left">Maintenance Type</th>
              <th className="py-3 px-4 text-left">Status</th>
              <th className="py-3 px-4 text-left">Completed By</th>
              <th className="py-3 px-4 text-left">Action</th>
            </tr>
          </thead>
          <tbody className="text-gray-700 divide-y divide-gray-200">
  {logs
    .filter((log) => !plateFilter || log.plate_number === plateFilter)
    .map((log) => (
      <tr key={log.log_id}>
        <td className="py-3 px-4">{new Date(log.completed_at).toLocaleDateString()}</td>
        <td className="py-3 px-4">{log.plate_number}</td>
        <td className="py-3 px-4">{log.maintenance_type}</td>
        <td className="py-3 px-4">
          <span
            className={`px-2 py-1 rounded-full text-xs font-semibold ${
              log.status === 'Completed'
                ? 'bg-green-100 text-green-800'
                : log.status === 'Cancelled'
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {log.status}
          </span>
        </td>
        <td className="py-3 px-4">{log.completed_by_full_name}</td>
        <td className="py-3 px-4">
          <button
            onClick={() => setSelectedLog(log)}
            className="text-blue-600 hover:underline"
          >
            View
          </button>
        </td>
      </tr>
    ))}
</tbody>

        </table>
      </div>

      {/* Full View Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-md p-6 w-full max-w-2xl shadow-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4 text-blue-800">
              Maintenance Details
            </h2>
            <p className= "text-gray-600"><strong>Original Scheduled Date:</strong> {new Date(selectedLog.date).toLocaleDateString()}</p>
            <p className= "text-gray-600"><strong>Completion Date:</strong> {new Date(selectedLog.completed_at).toLocaleDateString()}</p>
            <p className= "text-gray-600"><strong>Plate Number:</strong> {selectedLog.plate_number}</p>
            <p className= "text-gray-600"><strong>Maintenance Type:</strong> {selectedLog.maintenance_type}</p>
            <p className= "text-gray-600"><strong>Status:</strong> <span className={`font-semibold ${selectedLog.status === 'Completed' ? 'text-green-600' : 'text-red-600'}`}>{selectedLog.status}</span></p>
            <p className= "text-gray-600"><strong>Completed By:</strong> {selectedLog.completed_by_full_name}</p>
            <p className= "text-gray-600"><strong>Encoded By (Original Report):</strong> {selectedLog.encoded_by_full_name}</p>
            <p className= "text-gray-600">
              <strong>Mechanics:</strong>{' '}
              {selectedLog.maintenance_mechanics
                .map((m) => m.mechanics?.name)
                .filter(Boolean) // Filter out null/undefined names
                .join(', ') || 'N/A'}
            </p>
            <p className="mt-2 text-gray-600"><strong>Description:</strong> {selectedLog.description}</p>

            {selectedLog.maintenance_items && selectedLog.maintenance_items.length > 0 && (
              <div className="mt-2 text-gray-600">
                <strong>Items Used:</strong>
                <ul className="list-disc list-inside">
                  {selectedLog.maintenance_items.map((i, idx) => (
                    <li key={idx}>
                      {i.inventory?.item_name} (x{i.quantity})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selectedLog.photo_url && (
              <div className="mt-4">
                <strong>Maintenance Photo:</strong>
                <img
                  src={selectedLog.photo_url}
                  alt="Maintenance"
                  className="rounded-md max-h-60 mt-2 object-cover w-full"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setSelectedLog(null)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default MaintenanceLogsPage;