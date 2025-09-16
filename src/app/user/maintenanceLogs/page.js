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
    // Fetch maintenance logs with joins
    const { data, error } = await supabase
      .from('maintenance')
      .select(`
        maintenance_id,
        plate_number,
        date,
        description,
        photo_url,
        users (full_name),
        maintenance_mechanics (
          mechanics (name)
        ),
        maintenance_items (
          quantity,
          inventory (item_name)
        )
      `)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching logs:', error);
    } else {
      setLogs(data);
    }
  };

  // Unique plate numbers for filter
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
              <th className="py-3 px-4 text-left">Date</th>
              <th className="py-3 px-4 text-left">Plate Number</th>
              <th className="py-3 px-4 text-left">Mechanics</th>
              <th className="py-3 px-4 text-left">Encoded By</th>
              <th className="py-3 px-4 text-left">Action</th>
            </tr>
          </thead>
          <tbody className="text-gray-700 divide-y divide-gray-200">
            {logs
              .filter((log) => !plateFilter || log.plate_number === plateFilter)
              .map((log) => (
                <tr key={log.maintenance_id}>
                  <td className="py-3 px-4">{log.date}</td>
                  <td className="py-3 px-4">{log.plate_number}</td>
                  <td className="py-3 px-4">
                    {log.maintenance_mechanics
                      .map((m) => m.mechanics?.name)
                      .join(', ')}
                  </td>
                  <td className="py-3 px-4">{log.users?.full_name || 'N/A'}</td>
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
          <div className="bg-white rounded-md p-6 w-full max-w-2xl shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-blue-800">
              Maintenance Details
            </h2>
            <p><strong>Date:</strong> {selectedLog.date}</p>
            <p><strong>Plate Number:</strong> {selectedLog.plate_number}</p>
            <p>
              <strong>Mechanics:</strong>{' '}
              {selectedLog.maintenance_mechanics
                .map((m) => m.mechanics?.name)
                .join(', ')}
            </p>
            <p><strong>Encoded By:</strong> {selectedLog.users?.full_name || 'N/A'}</p>
            <p className="mt-2"><strong>Description:</strong> {selectedLog.description}</p>

            <div className="mt-2">
              <strong>Items Used:</strong>
              <ul className="list-disc list-inside">
                {selectedLog.maintenance_items.map((i, idx) => (
                  <li key={idx}>
                    {i.inventory?.item_name} (x{i.quantity})
                  </li>
                ))}
              </ul>
            </div>

            {selectedLog.photo_url && (
              <div className="mt-4">
                <img
                  src={selectedLog.photo_url}
                  alt="Maintenance"
                  className="rounded-md max-h-60"
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
