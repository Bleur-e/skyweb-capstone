'use client';

import React, { useState } from 'react';

const TruckPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTruck, setNewTruck] = useState({
    id: '',
    type: '',
    brand: '',
    model: '',
    plate: ''
  });

  const handleInputChange = (e) => {
    setNewTruck({ ...newTruck, [e.target.name]: e.target.value });
  };

  const handleAddTruck = () => {
    console.log("New Truck Data:", newTruck); // This just logs the result for now
    setIsModalOpen(false);
    setNewTruck({ id: '', type: '', brand: '', model: '', plate: '' });
  };

  return (
    <main className="flex-1 p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-4">Trucks</h2>

     
      

      {/* Table */}
      <table className="min-w-full bg-white shadow rounded-lg overflow-hidden">
        <thead className=" bg-indigo-100 text-gray-700">
          <tr>
            <th className="px-4 py-2 text-left">Truck ID</th>
            <th className="px-4 py-2 text-left">Driver</th>
            <th className="px-4 py-2 text-left">Status</th>
            <th className="px-4 py-2 text-left">View</th>

          </tr>
        </thead>
        <tbody className="text-gray-600">
          <tr className="border-b">
            <td className="px-4 py-3">TRK001</td>
            <td className="px-4 py-3">One Delta Cross</td>
            <td className="px-4 py-3 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-green-600"></span> Under Maintenance
            </td>
            <td className="py-3 px-6 text-left">
              <button className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">View</button>
            </td>
          </tr>
        </tbody>
      </table>
    </main>
  );
};

export default TruckPage;