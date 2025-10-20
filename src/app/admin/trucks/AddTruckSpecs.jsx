'use client';

import React, { useState } from 'react';

export default function AddTruckSpecs({ isOpen, onClose, onAdd }) {
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    type: '',
    change_oil_interval: '',
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.brand || !formData.model || !formData.type || !formData.change_oil_interval) {
      alert('Please fill out all fields.');
      return;
    }

    onAdd(formData);
    setFormData({
      brand: '',
      model: '',
      type: '',
      change_oil_interval: '',
    });
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30 backdrop-blur-sm">
      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg w-full max-w-md p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">
          Add Truck Specification
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Brand
            </label>
            <input
              type="text"
              name="brand"
              value={formData.brand}
              onChange={handleChange}
              placeholder="e.g., Isuzu"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none text-gray-700 mb-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model
            </label>
            <input
              type="text"
              name="model"
              value={formData.model}
              onChange={handleChange}
              placeholder="e.g., Elf NKR"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none text-gray-700 mb-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <input 
              type="text"
              name="type"
              value={formData.type}
              onChange={handleChange}
              placeholder="e.g., Cargo Truck"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none text-gray-700 mb-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Change Oil Interval (km)
            </label>
            <input
              type="number"
              name="change_oil_interval"
              value={formData.change_oil_interval}
              onChange={handleChange}
              placeholder="e.g., 5000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none text-gray-700 mb-1"
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-md transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md shadow-md transition"
            >
              Add Spec
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
