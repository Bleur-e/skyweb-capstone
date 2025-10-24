'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '../../../supabaseClient';

const UserRequestLogsPage = () => {
  const router = useRouter();
  const [maintenanceRequests, setMaintenanceRequests] = useState([]);
  const [profileRequests, setProfileRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestItems, setRequestItems] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('maintenance'); // 'maintenance' or 'profile'
  const [currentUser, setCurrentUser] = useState(null);

  
  // Fetch all requests for current user
  useEffect(() => {
    const fetchRequests = async () => {
      const storedUser = JSON.parse(sessionStorage.getItem('currentUser'));
      if (!storedUser) {
        router.push("/");
        return;
      }
      setCurrentUser(storedUser);

      // Fetch maintenance requests
      const { data: maintenanceData, error: maintenanceError } = await supabase
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

      if (maintenanceError) {
        console.error('Error fetching maintenance requests:', maintenanceError);
      } else {
        setMaintenanceRequests(maintenanceData || []);
      }

      // Fetch profile update requests
      const { data: profileData, error: profileError } = await supabase
        .from('profile_update_requests')
        .select('*')
        .eq('user_id', storedUser.id)
        .order('created_at', { ascending: false });

      if (profileError) {
        console.error('Error fetching profile requests:', profileError);
      } else {
        setProfileRequests(profileData || []);
      }
    };

    fetchRequests();
  }, [router]);

  const handleViewRequest = (request, type) => {
    setSelectedRequest({ ...request, type });
    if (type === 'maintenance') {
      setRequestItems(request.request_items || []);
    }
    setIsModalOpen(true);
  };

  // Badge component
  const StatusBadge = ({ status }) => {
    let colorClass = '';
    if (status === 'Pending') colorClass = 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    if (status === 'Approved') colorClass = 'bg-green-100 text-green-800 border border-green-200';
    if (status === 'Declined') colorClass = 'bg-red-100 text-red-800 border border-red-200';

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
        {status}
      </span>
    );
  };

  // Group requests by status
  const groupRequestsByStatus = (requests) => {
    return {
      pending: requests.filter(req => req.status === 'Pending'),
      approved: requests.filter(req => req.status === 'Approved'),
      declined: requests.filter(req => req.status === 'Declined')
    };
  };

  const maintenanceGroups = groupRequestsByStatus(maintenanceRequests);
  const profileGroups = groupRequestsByStatus(profileRequests);

  const RequestTable = ({ requests, type }) => (
    <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Date
            </th>
            {type === 'maintenance' && (
              <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Truck
              </th>
            )}
            {type === 'profile' && (
              <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Details
              </th>
            )}
            <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Status
            </th>
            <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {requests.length > 0 ? (
            requests.map((req) => (
              <tr key={req.request_id || req.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-4 px-6 text-gray-700">
                  {new Date(req.request_date || req.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </td>
                {type === 'maintenance' && (
                  <>
                    <td className="py-4 px-6 text-gray-700 font-medium">{req.plate_number}</td>
                  </>
                )}
                {type === 'profile' && (
                  <td className="py-4 px-6 text-gray-700">
                    <div className="space-y-1">
                      <div className="font-medium">{req.full_name}</div>
                      <div className="text-xs text-gray-500">{req.position}</div>
                    </div>
                  </td>
                )}
                <td className="py-4 px-6">
                  <StatusBadge status={req.status} />
                </td>
                <td className="py-4 px-6">
                  <button
                    onClick={() => handleViewRequest(req, type)}
                    className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors duration-200 text-sm font-medium"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td 
                colSpan={type === 'maintenance' ? 4 : 3} 
                className="text-center py-8 text-gray-500"
              >
                <div className="flex flex-col items-center justify-center">
                  <svg className="w-12 h-12 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  No requests found
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const StatusSection = ({ title, requests, type, status }) => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium">
          {requests.length} requests
        </span>
      </div>
      <RequestTable requests={requests} type={type} />
    </div>
  );

  // Redirect to login if user is not authenticated
  if (!currentUser) {
    return (
      <main className="flex-1 p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Redirecting to login...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Request History</h1>
          <p className="text-gray-600">Track your maintenance and profile update requests</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('maintenance')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'maintenance'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Maintenance Requests
                <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                  {maintenanceRequests.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'profile'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Profile Update Requests
                <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                  {profileRequests.length}
                </span>
              </button>
            </nav>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'maintenance' ? (
          <div className="space-y-8">
            <StatusSection
              title="🟡 Pending Maintenance Requests"
              requests={maintenanceGroups.pending}
              type="maintenance"
              status="pending"
            />
            <StatusSection
              title="🟢 Approved Maintenance Requests"
              requests={maintenanceGroups.approved}
              type="maintenance"
              status="approved"
            />
            <StatusSection
              title="🔴 Declined Maintenance Requests"
              requests={maintenanceGroups.declined}
              type="maintenance"
              status="declined"
            />
          </div>
        ) : (
          <div className="space-y-8">
            <StatusSection
              title="🟡 Pending Profile Updates"
              requests={profileGroups.pending}
              type="profile"
              status="pending"
            />
            <StatusSection
              title="🟢 Approved Profile Updates"
              requests={profileGroups.approved}
              type="profile"
              status="approved"
            />
            <StatusSection
              title="🔴 Declined Profile Updates"
              requests={profileGroups.declined}
              type="profile"
              status="declined"
            />
          </div>
        )}

        {/* Modal */}
        {isModalOpen && selectedRequest && (
          <div className="fixed inset-0 backdrop-blur-md bg-gray-900/20 flex items-center justify-center p-4 z-40">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="px-8 py-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {selectedRequest.type === 'maintenance' ? 'Maintenance Request Details' : 'Profile Update Request Details'}
                  </h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-6">
                {/* Request Info */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Date Submitted</label>
                      <p className="text-gray-900 font-medium">
                        {new Date(selectedRequest.request_date || selectedRequest.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
                      <StatusBadge status={selectedRequest.status} />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {selectedRequest.type === 'maintenance' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Truck</label>
                          <p className="text-gray-900 font-medium">{selectedRequest.plate_number}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Estimated Cost</label>
                          <p className="text-gray-900 font-medium">₱{selectedRequest.estimated_cost}</p>
                        </div>
                      </>
                    )}
                    {selectedRequest.type === 'profile' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Full Name</label>
                          <p className="text-gray-900 font-medium">{selectedRequest.full_name}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Position</label>
                          <p className="text-gray-900 font-medium">{selectedRequest.position}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Additional Details */}
                {selectedRequest.type === 'maintenance' && (
                  <>
                    {/* Items */}
                    {requestItems.length > 0 && (
                      <div>
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">Requested Items</h4>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-2 px-3 text-gray-600 font-semibold">Item Name</th>
                                <th className="text-left py-2 px-3 text-gray-600 font-semibold">Category</th>
                                <th className="text-left py-2 px-3 text-gray-600 font-semibold">Quantity</th>
                              </tr>
                            </thead>
                            <tbody>
                              {requestItems.map((item) => (
                                <tr key={item.item_id} className="border-b border-gray-100 last:border-0">
                                  <td className="py-3 px-3 text-gray-700">{item.inventory?.item_name}</td>
                                  <td className="py-3 px-3 text-gray-700">{item.inventory?.category}</td>
                                  <td className="py-3 px-3 text-gray-700">{item.quantity}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Reason */}
                    {selectedRequest.reason && (
                      <div>
                        <h4 className="text-lg font-semibold text-gray-800 mb-2">Reason</h4>
                        <p className="text-gray-700 bg-gray-50 rounded-lg p-4">{selectedRequest.reason}</p>
                      </div>
                    )}
                  </>
                )}

                {selectedRequest.type === 'profile' && (
                  <div className="space-y-4">
                    {selectedRequest.address && (
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Address</label>
                        <p className="text-gray-900">{selectedRequest.address}</p>
                      </div>
                    )}
                    {selectedRequest.contact_no && (
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Contact Number</label>
                        <p className="text-gray-900">{selectedRequest.contact_no}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Attachment */}
                {selectedRequest.photo_url && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">Attachment</h4>
                    <img
                      src={selectedRequest.photo_url}
                      alt="Request Attachment"
                      className="max-w-full max-h-96 object-contain rounded-lg border border-gray-200"
                    />
                  </div>
                )}
              </div>

              <div className="px-8 py-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                <div className="flex justify-end">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200 font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default UserRequestLogsPage;