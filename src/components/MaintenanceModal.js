'use client';
import { useState } from 'react';

export default function MaintenanceModal({ onClose }) {
  const [formData, setFormData] = useState({
    truckId: '',
    status: '',
    schedule: '',
    parts: [{ partId: '', quantity: 1 }],
  });

  const truckOptions = ['TR-001', 'TR-002', 'TR-003']; // We can fetch this from backend later
  const statusOptions = ['Check-up', 'Maintenance'];
  const inventoryParts = [
    { id: 'P-001', name: 'Oil Filter' },
    { id: 'P-002', name: 'Brake Pad' },
    { id: 'P-003', name: 'Engine Belt' },
  ];

  const handlePartChange = (index, field, value) => {
    const updatedParts = [...formData.parts];
    updatedParts[index][field] = value;
    setFormData({ ...formData, parts: updatedParts });
  };

  const addPartField = () => {
    setFormData({
      ...formData,
      parts: [...formData.parts, { partId: '', quantity: 1 }],
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Submitted Data:', formData);
    // TODO: Send to backend
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Schedule Maintenance</h2>
          <button onClick={onClose} className="text-red-500 text-xl font-bold">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Truck ID Dropdown */}
          <div>
            <label className="block font-semibold mb-1">Truck ID</label>
            <select
              className="w-full border rounded p-2"
              value={formData.truckId}
              onChange={(e) => setFormData({ ...formData, truckId: e.target.value })}
              required
            >
              <option value="">Select Truck</option>
              {truckOptions.map((id) => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div>
            <label className="block font-semibold mb-1">Status</label>
            <select
              className="w-full border rounded p-2"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              required
            >
              <option value="">Select Status</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          {/* Schedule Date */}
          <div>
            <label className="block font-semibold mb-1">Schedule</label>
            <input
              type="date"
              className="w-full border rounded p-2"
              value={formData.schedule}
              onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
              required
            />
          </div>

          {/* Parts Section */}
          <div>
            <label className="block font-semibold mb-1">Parts to be used</label>
            {formData.parts.map((part, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <select
                  className="w-full border rounded p-2"
                  value={part.partId}
                  onChange={(e) => handlePartChange(index, 'partId', e.target.value)}
                  required
                >
                  <option value="">Select Part</option>
                  {inventoryParts.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  className="w-20 border rounded p-2"
                  value={part.quantity}
                  onChange={(e) => handlePartChange(index, 'quantity', e.target.value)}
                  required
                />
              </div>
            ))}
            <button
              type="button"
              onClick={addPartField}
              className="text-sm text-blue-600 hover:underline"
            >
              + Add Another Part
            </button>
          </div>

          <div className="text-right">
            <button
              type="submit"
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-4 rounded"
            >
              Save Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
