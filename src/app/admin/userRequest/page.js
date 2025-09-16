'use client';
import { useState } from 'react';

const mockRequests = [
  {
    id: 1,
    user: 'Juan Dela Cruz',
    purpose: 'Brake Pad Replacement',
    amount: 1500,
    remarks: 'Urgent replacement needed',
    date: '2025-05-12',
    status: 'Pending',
  },
  {
    id: 2,
    user: 'Maria Santos',
    purpose: 'Oil Filter',
    amount: 800,
    remarks: '',
    date: '2025-05-10',
    status: 'Approved',
  },
];

export default function AdminRequestPage() {
  const [requests, setRequests] = useState(mockRequests);

  const handleAction = (id, action) => {
    const updated = requests.map((req) =>
      req.id === id ? { ...req, status: action } : req
    );
    setRequests(updated);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-blue-900 mb-4">User Fund Requests</h1>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow rounded-lg">
          <thead>
            <tr className="bg-blue-100 text-blue-900 text-left">
              <th className="py-3 px-4">User</th>
              <th className="py-3 px-4">Purpose</th>
              <th className="py-3 px-4">Amount</th>
              <th className="py-3 px-4">Remarks</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req.id} className="border-t">
                <td className="py-2 px-4">{req.user}</td>
                <td className="py-2 px-4">{req.purpose}</td>
                <td className="py-2 px-4">₱{req.amount}</td>
                <td className="py-2 px-4">{req.remarks || '-'}</td>
                <td className="py-2 px-4">{req.date}</td>
                <td className="py-2 px-4">
                  <span
                    className={`px-2 py-1 rounded text-white text-sm ${
                      req.status === 'Pending'
                        ? 'bg-yellow-500'
                        : req.status === 'Approved'
                        ? 'bg-green-600'
                        : 'bg-red-600'
                    }`}
                  >
                    {req.status}
                  </span>
                </td>
                <td className="py-2 px-4 space-x-2">
                  {req.status === 'Pending' && (
                    <>
                      <button
                        onClick={() => handleAction(req.id, 'Approved')}
                        className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(req.id, 'Declined')}
                        className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1 rounded"
                      >
                        Decline
                      </button>
                    </>
                  )}
                  {req.status !== 'Pending' && <span className="text-gray-500 italic">No Action</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}