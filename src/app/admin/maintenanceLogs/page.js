'use client';

import React, { useState, useEffect } from 'react';
import supabase from '../../../supabaseClient';
import { useRouter } from 'next/navigation';

const MaintenanceLogsPage = () => {
  const router = useRouter();
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [logs, setLogs] = useState([]);
  const [plateFilter, setPlateFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
          const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
          if (!currentUser) {
            router.push("/");
            return;
          }
          setCurrentAdmin(currentUser);
        }, [router]);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
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
    setIsLoading(false);
  };

  const plateNumbers = [...new Set(logs.map((log) => log.plate_number))];

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Completed': 'bg-green-100 text-green-800 border border-green-200',
      'Cancelled': 'bg-red-100 text-red-800 border border-red-200',
      'In Progress': 'bg-blue-100 text-blue-800 border border-blue-200',
      'default': 'bg-gray-100 text-gray-800 border border-gray-200'
    };
    
    return statusConfig[status] || statusConfig.default;
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Maintenance Logs</h1>
              <p className="text-gray-600 mt-2">Track and manage maintenance completion records</p>
            </div>
            
            {/* Filter Section */}
            <div className="flex items-center gap-3">
              <label htmlFor="plate-filter" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Filter by Truck:
              </label>
              <select
                id="plate-filter"
                value={plateFilter}
                onChange={(e) => setPlateFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 min-w-[180px]"
              >
                <option value="">All Trucks</option>
                {plateNumbers.map((plate) => (
                  <option key={plate} value={plate}>
                    {plate}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Completion Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Plate Number
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Maintenance Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Completed By
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs
                    .filter((log) => !plateFilter || log.plate_number === plateFilter)
                    .map((log) => (
                      <tr key={log.log_id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(log.completed_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {log.plate_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {log.maintenance_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(log.status)}`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {log.completed_by_full_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="text-blue-600 hover:text-blue-900 font-semibold hover:underline transition-colors duration-200"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Empty State */}
        {!isLoading && logs.filter((log) => !plateFilter || log.plate_number === plateFilter).length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No maintenance logs found</h3>
            <p className="text-gray-600">No logs match your current filter criteria.</p>
          </div>
        )}
      </div>

      {/* Enhanced Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Maintenance Record Details</h2>
                  <p className="text-blue-100 text-sm mt-1">Complete maintenance information</p>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-white hover:text-blue-200 transition-colors duration-200 p-1 rounded-full hover:bg-blue-500"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Basic Information */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                      Maintenance Information
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Plate Number</span>
                        <span className="text-sm text-gray-900 font-semibold">{selectedLog.plate_number}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Maintenance Type</span>
                        <span className="text-sm text-gray-900">{selectedLog.maintenance_type}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Status</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(selectedLog.status)}`}>
                          {selectedLog.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                      Timeline
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Scheduled Date</span>
                        <span className="text-sm text-gray-900">
                          {new Date(selectedLog.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Completion Date</span>
                        <span className="text-sm text-gray-900">
                          {new Date(selectedLog.completed_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Personnel & Details */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                      Personnel
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Completed By</span>
                        <span className="text-sm text-gray-900">{selectedLog.completed_by_full_name}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600">Encoded By</span>
                        <span className="text-sm text-gray-900">{selectedLog.encoded_by_full_name}</span>
                      </div>
                      <div className="py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-600 block mb-2">Mechanics</span>
                        <div className="flex flex-wrap gap-2">
                          {selectedLog.maintenance_mechanics
                            .map((m) => m.mechanics?.name)
                            .filter(Boolean)
                            .map((name, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {name}
                              </span>
                            )) || <span className="text-sm text-gray-500">N/A</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {selectedLog.description || 'No description provided.'}
                      </p>
                    </div>
                  </div>

                  {/* Items Used */}
                  {selectedLog.maintenance_items && selectedLog.maintenance_items.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Items Used</h3>
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <ul className="space-y-2">
                          {selectedLog.maintenance_items.map((item, idx) => (
                            <li key={idx} className="flex justify-between items-center text-sm">
                              <span className="text-gray-700">{item.inventory?.item_name}</span>
                              <span className="font-medium text-gray-900 bg-white px-2 py-1 rounded border">
                                x{item.quantity}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Photo Section */}
              {selectedLog.photo_url && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Maintenance Photo</h3>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <img
                      src={selectedLog.photo_url}
                      alt="Maintenance documentation"
                      className="rounded-lg max-h-96 w-full object-contain bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default MaintenanceLogsPage;