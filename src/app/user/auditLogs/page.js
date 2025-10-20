'use client';
import React, { useEffect, useState } from 'react';
import supabase from '../../../supabaseClient';
import { Archive, Delete } from 'lucide-react';

const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        log_id,
        action,
        table_name,
        description,
        created_at,
        users (full_name)   -- join with users to get full_name
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching logs:', error);
    } else {
      setLogs(data);
    }
  };

  // Color mapping for actions
 const actionColors = {
  Login: 'text-blue-600',
  Logout: 'text-gray-600',
  Add: 'text-green-600',
  Edit: 'text-yellow-600',
  Archive: 'text-red-600',        // This will now show for archive actions
  Delete: 'text-red-700',         // Keep for other delete operations
  Restored: 'text-green-700',
  Approve: 'text-green-700',
  Decline: 'text-red-700',
  Scheduled: 'text-yellow-600',
  Completed: 'text-green-600',
  Canceled: 'text-red-600',
};

  return (
    <main className="p-6 flex-1 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-gray-700">Audit Logs</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white text-sm text-left text-gray-600 border rounded-lg">
          <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Date & Time</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Module</th>
              <th className="px-4 py-3">Description</th>
            </tr>
          </thead>
          <tbody>
            {logs.length > 0 ? (
              logs.map((log) => (
                <tr key={log.log_id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {log.users?.full_name || 'Unknown User'}
                  </td>
                  <td className={`px-4 py-3 font-semibold ${actionColors[log.action] || ''}`}>
                    {log.action}
                  </td>
                  <td className="px-4 py-3">{log.table_name}</td>
                  <td className="px-4 py-3">{log.description}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="px-4 py-3 text-center text-gray-400">
                  No logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
};

export default AuditLogsPage;
