'use client';
import React, { useState } from 'react';

const MaintenanceLogsPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [items, setItems] = useState([{ name: '', serial: '' }]);

  const addItemField = () => {
    setItems([...items, { name: '', serial: '' }]);
  };

  return (
    <main className="p-6 flex flex-col gap-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Maintenance Logs</h1>
        
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-md overflow-hidden shadow">
          <thead className="bg-purple-100 text-purple-800">
            <tr>
              <th className="py-3 px-4 text-left">Truck ID</th>
              <th className="py-3 px-4 text-left">Mechanic(s)</th>
              <th className="py-3 px-4 text-left">Type</th>
              <th className="py-3 px-4 text-left">Items</th>
              <th className="py-3 px-4 text-left">Date & Time</th>
              <th className="py-3 px-4 text-left">Notes</th>
            </tr>
          </thead>
          <tbody className="text-gray-700 divide-y divide-gray-200">
            <tr>
              <td className="py-3 px-4">TRK-003</td>
              <td className="py-3 px-4">Juan Dela Cruz, Mark Reyes</td>
              <td className="py-3 px-4">Maintenance</td>
              <td className="py-3 px-4">Oil Filter (SN12345), Brake Pad (SN67890)</td>
              <td className="py-3 px-4">2025-04-30 09:00 AM</td>
              <td className="py-3 px-4">Changed filters and brake pads</td>
            </tr>
          </tbody>
        </table>
      </div>
    
      
    </main>
  );
};

export default MaintenanceLogsPage;