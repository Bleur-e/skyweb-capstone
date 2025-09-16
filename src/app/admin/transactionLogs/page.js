'use client';

import React, { useState } from 'react';

const TransactionLogsPage = () => {
  const [showModal, setShowModal] = useState(false);

  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  return (
    <main className="p-8 max-w-6xl mx-auto mt-6 bg-white shadow-xl rounded-2xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-blue-800">📦 Transaction Logs</h2>
       
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl shadow border border-gray-200">
        <table className="min-w-full table-auto text-left">
          <thead className="bg-indigo-100 text-indigo-800">
            <tr>
              <th className="p-4 font-semibold">Item Name</th>
              <th className="p-4 font-semibold">Quantity</th>
              <th className="p-4 font-semibold">Cost</th>
              <th className="p-4 font-semibold">Serial Number</th>
              <th className="p-4 font-semibold">Date</th>
              <th className="p-4 font-semibold">Proof</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            <tr className="border-t hover:bg-gray-50">
              <td className="p-4">Brake Pads</td>
              <td className="p-4">4</td>
              <td className="p-4">₱1,200</td>
              <td className="p-4">BP-9876</td>
              <td className="p-4">2025-04-30</td>
              <td className="p-4">
                <a href="#" className="text-indigo-500 underline hover:text-indigo-700">
                  View
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      
    </main>
  );
};

export default TransactionLogsPage;