'use client';
import React, { useState } from 'react';
import MaintenanceModal from '../../../components/MaintenanceModal';
const MaintenancePage = () => {
  const [showModal, setShowModal] = useState(false);

  // Dummy data for now (We'll replace with fetched data later)
  const maintenanceRecords = [
    {
      truckId: 'TR-001',
      driver: 'Juan Dela Cruz',
      status: 'Under Maintenance',
      truckType: 'Flatbed',
      mechanic: 'Mark Reyes',
    },
    {
      truckId: 'TR-002',
      driver: 'Ana Santos',
      status: 'Check-up',
      truckType: 'Dump Truck',
      mechanic: '',
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-blue-900">Maintenance</h1>
       
      </div>

      


      <div className="overflow-x-auto bg-white shadow rounded">
        <table className="min-w-full text-left border">
          <thead className="bg-blue-900 text-white">
            <tr>
              <th className="p-3 border">Truck ID</th>
              <th className="p-3 border">Driver</th>
              <th className="p-3 border">Status</th>
              <th className="p-3 border">Truck Type</th>
              <th className="p-3 border">Mechanic</th>
              <th className="p-3 border">View</th>
            </tr>
          </thead>
          <tbody>
            {maintenanceRecords.map((record, index) => (
              <tr key={index} className="hover:bg-gray-100">
                <td className="p-3 border">{record.truckId}</td>
                <td className="p-3 border">{record.driver}</td>
                <td className="p-3 border">{record.status}</td>
                <td className="p-3 border">{record.truckType}</td>
                <td className="p-3 border">{record.mechanic || '-'}</td>
                <td className="p-3 border">
                  <button className="text-blue-600 hover:underline">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default MaintenancePage;