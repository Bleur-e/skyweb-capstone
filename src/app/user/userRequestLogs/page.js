'use client';

import React, { useEffect, useState } from 'react';
import supabase from '../../../supabaseClient';

const UserRequestLogsPage = () => {
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestItems, setRequestItems] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch requests for current user
  useEffect(() => {
    const fetchRequests = async () => {
      const storedUser = JSON.parse(localStorage.getItem('currentUser'));
      if (!storedUser) return;

      const { data, error } = await supabase
        .from('requests')
        .select(`
          request_id,
          plate_number,
          estimated_cost,
          reason,
          status,
          request_date,
          photo_url,
          request_items (
            item_id,
            quantity,
            inventory (item_name, category)
          )
        `)
        .eq('requested_by', storedUser.id)
        .order('request_date', { ascending: false });

      if (error) {
        console.error('Error fetching requests:', error);
      } else {
        setRequests(data);
      }
    };

    fetchRequests();
  }, []);

  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setRequestItems(request.request_items || []);
    setIsModalOpen(true);
  };

  // Badge component
  const StatusBadge = ({ status }) => {
    let colorClass = '';
    if (status === 'Pending') colorClass = 'bg-yellow-200 text-yellow-800';
    if (status === 'Approved') colorClass = 'bg-green-200 text-green-800';
    if (status === 'Declined') colorClass = 'bg-red-200 text-red-800';

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
        {status}
      </span>
    );
  };

  return (
    <main className="flex-1 p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-4">User Request Logs</h2>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full text-sm text-gray-600">
          <thead className="bg-indigo-100 text-gray-700 uppercase text-sm">
            <tr>
              <th className="py-3 px-4 text-left">Date</th>
              <th className="py-3 px-4 text-left">Truck</th>
              <th className="py-3 px-4 text-left">Est. Cost</th>
              <th className="py-3 px-4 text-left">Status</th>
              <th className="py-3 px-4 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {requests.length > 0 ? (
              requests.map((req) => (
                <tr key={req.request_id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    {new Date(req.request_date).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">{req.plate_number}</td>
                  <td className="py-3 px-4">₱{req.estimated_cost}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="py-3 px-4">
                    <button
                      className="text-blue-600 hover:underline"
                      onClick={() => handleViewRequest(req)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center py-3 text-gray-400">
                  No requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-3xl h-[80vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-indigo-700 mb-4">
              Request Details
            </h3>

            {/* Request Info */}
            <div className="grid grid-cols-2 gap-4 mb-6 text-gray-700">
              <p>
                <strong>Date:</strong>{' '}
                {new Date(selectedRequest.request_date).toLocaleString()}
              </p>
              <p>
                <strong>Truck:</strong> {selectedRequest.plate_number}
              </p>
              <p>
                <strong>Estimated Cost:</strong> ₱{selectedRequest.estimated_cost}
              </p>
              <p>
                <strong>Status:</strong>{' '}
                <StatusBadge status={selectedRequest.status} />
              </p>
              <p className="col-span-2">
                <strong>Reason:</strong> {selectedRequest.reason}
              </p>
            </div>

            {/* Items */}
            <h4 className="text-lg font-semibold text-gray-800 mb-2">
              Requested Items
            </h4>
            <table className="w-full border mb-6">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left text-gray-700">Item Name</th>
                  <th className="p-2 text-left text-gray-700">Category</th>
                  <th className="p-2 text-left text-gray-700">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {requestItems.map((item) => (
                  <tr key={item.item_id} className="border-t">
                    <td className="p-2 text-gray-700">{item.inventory?.item_name}</td>
                    <td className="p-2 text-gray-700">{item.inventory?.category}</td>
                    <td className="p-2 text-gray-700">{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Attachment */}
            {selectedRequest.photo_url && (
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-2">
                  Attachment
                </h4>
                <img
                  src={selectedRequest.photo_url}
                  alt="Request Attachment"
                  className="w-full max-h-[400px] object-contain rounded border"
                />
              </div>
            )}

            {/* Close Button */}
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default UserRequestLogsPage;
