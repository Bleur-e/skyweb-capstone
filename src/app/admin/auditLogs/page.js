'use client';
import React, { useState } from 'react';

const AuditLogsPage = () => {
    return (
      <main className="p-6 flex-1 bg-white rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-700">Audit</h2>
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
              <tr className="border-b">
                <td className="px-4 py-3">2025-04-30 10:22 AM</td>
                <td className="px-4 py-3">Juan Dela Cruz</td>
                <td className="px-4 py-3 text-blue-600">Login</td>
                <td className="px-4 py-3">System</td>
                <td className="px-4 py-3">User logged into the system.</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-3">2025-04-30 10:25 AM</td>
                <td className="px-4 py-3">Ana Reyes</td>
                <td className="px-4 py-3 text-yellow-600">Edited</td>
                <td className="px-4 py-3">Truck</td>
                <td className="px-4 py-3">
                  Changed status of Truck ID #002 to "Under Maintenance".
                </td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-3">2025-04-30 10:30 AM</td>
                <td className="px-4 py-3">Pedro Santos</td>
                <td className="px-4 py-3 text-red-600">Deleted</td>
                <td className="px-4 py-3">Driver</td>
                <td className="px-4 py-3">
                  Removed Driver ID #010 from the system.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    );
  }

  export default AuditLogsPage;