'use client';

import React from 'react';

const UserRequestLogsPage = () => {
  return (
    <main className="flex-1 p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-4">User Request Logs</h2>

      {/* Stats Cards */}
      <div>
        <h2 className="text-2xl font-semibold text-indigo-600 mb-4">Request History</h2>
        <div className="overflow-x-auto">
          <table className="w-full border text-sm text-left text-gray-600">
            <thead className="bg-indigo-100 text-gray-700">
              <tr>
                <th className="p-3">Request ID</th>
                <th className="p-3">Truck ID</th>
                <th className="p-3">Parts</th>
                <th className="p-3">Cost</th>
                <th className="p-3">Status</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {/* Sample Rows */}
              <tr className="border-t">
                <td className="p-3">REQ001</td>
                <td className="p-3">TRK-05</td>
                <td className="p-3">Brake Pads</td>
                <td className="p-3">₱2,500</td>
                <td className="p-3 text-yellow-600 font-semibold">Pending</td>
                <td className="p-3">2025-04-30</td>
              </tr>
              <tr className="border-t bg-gray-50">
                <td className="p-3">REQ002</td>
                <td className="p-3">TRK-02</td>
                <td className="p-3">Oil & Filter</td>
                <td className="p-3">₱1,200</td>
                <td className="p-3 text-green-600 font-semibold">Approved</td>
                <td className="p-3">2025-04-25</td>
              </tr>
              {/* Add more rows dynamically later */}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

export default UserRequestLogsPage;