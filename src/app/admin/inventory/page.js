'use client';

import React, { useState } from 'react';

const InventoryPage = () => {
  const [showModal, setShowModal] = useState(false);

  const inventoryItems = [
    {
      item: "Engine Oil Filter",
      category: "Engine Maintenance",
      id: "EM001",
      quantity: 15,
      status: "In Stock",
      statusColor: "text-green-500",
    },
    {
      item: "Battery",
      category: "Electrical",
      id: "EL002",
      quantity: 0,
      status: "Out of Stock",
      statusColor: "text-red-500",
    },
    {
      item: "Brake Pads",
      category: "Brake System",
      id: "BS003",
      quantity: 13,
      status: "In Stock",
      statusColor: "text-green-500",
    },
    {
      item: "Coolant Hose",
      category: "Cooling System",
      id: "CS004",
      quantity: 9,
      status: "Low Stock",
      statusColor: "text-yellow-500",
    },
    {
      item: "Fuel Pump",
      category: "Fuel System",
      id: "FS005",
      quantity: 4,
      status: "Low Stock",
      statusColor: "text-yellow-500",
    },
  ];

  return (
    <main className="flex-1 p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-4">Inventory</h2>

      {/* Inventory Table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6 text-left">Item</th>
              <th className="py-3 px-6 text-left">Category</th>
              <th className="py-3 px-6 text-left">Item ID</th>
              <th className="py-3 px-6 text-left">Quantity</th>
              <th className="py-3 px-6 text-left">Status</th>
              <th className="py-3 px-6 text-left">Action</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm font-light">
            {inventoryItems.map((item, index) => (
              <tr
                key={index}
                className="border-b border-gray-200 hover:bg-gray-100"
              >
                <td className="py-3 px-6 text-left">{item.item}</td>
                <td className="py-3 px-6 text-left">{item.category}</td>
                <td className="py-3 px-6 text-left">{item.id}</td>
                <td className="py-3 px-6 text-left">{item.quantity}</td>
                <td className={`py-3 px-6 text-left ${item.statusColor}`}>
                  {item.status}
                </td>
                <td className="py-3 px-6 text-left">
                  <button className="bg-amber-500 text-white px-3 py-1 rounded hover:bg-amber-600">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

     
    </main>
  );
};

export default InventoryPage;