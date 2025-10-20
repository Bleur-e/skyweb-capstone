'use client';
import React, { useState, useEffect } from 'react';
import supabase from '../../../supabaseClient';

export default function AdminRequestPage() {
  const [activeTab, setActiveTab] = useState('funds'); // 'funds' or 'profile'
  const [requests, setRequests] = useState([]);
  const [profileRequests, setProfileRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedProfileRequest, setSelectedProfileRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [currentAdmin, setCurrentAdmin] = useState(null);

  // Get current admin user
  useEffect(() => {
    const storedUser = JSON.parse(sessionStorage.getItem('currentUser'));
    setCurrentAdmin(storedUser);
  }, []);

  // Fetch all requests with related data
  useEffect(() => {
    fetchRequests();
    fetchProfileRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      
      // Fetch only PENDING requests for admin approval page
      const { data: requestsData, error: requestsError } = await supabase
        .from('requests')
        .select(`
          *,
          users!requested_by(full_name, email),
          request_items(
            quantity,
            inventory(
              item_name,
              category
            )
          )
        `)
        .eq('status', 'Pending') // Only fetch pending requests
        .order('request_date', { ascending: false });

      if (requestsError) {
        console.error('Error fetching requests:', requestsError);
        alert('Error loading requests: ' + requestsError.message);
        return;
      }

      if (!requestsData || requestsData.length === 0) {
        setRequests([]);
        setLoading(false);
        return;
      }

      // Transform the data to match our expected format
      const formattedRequests = requestsData.map(request => ({
        request_id: request.request_id,
        plate_number: request.plate_number,
        estimated_cost: request.estimated_cost,
        reason: request.reason,
        status: request.status,
        request_date: request.request_date,
        photo_url: request.photo_url,
        requested_by: request.requested_by,
        updated_at: request.updated_at,
        action_by: request.action_by,
        user: request.users ? {
          name: request.users.full_name,
          email: request.users.email
        } : {
          name: 'Unknown User',
          email: 'N/A'
        },
        request_items: request.request_items || []
      }));

      setRequests(formattedRequests);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Error loading requests data');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfileRequests = async () => {
    try {
      setProfileLoading(true);
      
      const { data: profileRequestsData, error: profileError } = await supabase
        .from('profile_update_requests')
        .select(`
          *,
          users!user_id(full_name, email, position, address, contact_no, profile_image)
        `)
        .eq('status', 'Pending')
        .order('created_at', { ascending: false });

      if (profileError) {
        console.error('Error fetching profile requests:', profileError);
        alert('Error loading profile requests: ' + profileError.message);
        return;
      }

      setProfileRequests(profileRequestsData || []);
    } catch (error) {
      console.error('Error fetching profile data:', error);
      alert('Error loading profile requests data');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAction = async (requestId, action) => {
    try {
      const updateData = { 
        status: action,
        updated_at: new Date().toISOString()
      };

      // Add action_by if we have a current admin
      if (currentAdmin?.id) {
        updateData.action_by = currentAdmin.id;
      }

      const { error } = await supabase
        .from('requests')
        .update(updateData)
        .eq('request_id', requestId);

      if (error) {
        console.error('Error updating request:', error);
        alert('Error updating request status: ' + error.message);
        return;
      }

      // Remove the request from local state immediately
      setRequests(prev => prev.filter(req => req.request_id !== requestId));
      
      alert(`Request ${action.toLowerCase()} successfully!`);
      
      // Close modal if open
      if (isModalOpen) {
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error updating request status');
    }
  };

  const handleProfileAction = async (requestId, action) => {
    try {
      // First, get the profile update request details
      const { data: profileRequest, error: fetchError } = await supabase
        .from('profile_update_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) {
        console.error('Error fetching profile request:', fetchError);
        alert('Error fetching profile request details');
        return;
      }

      if (action === 'Approved') {
        // Update the user's profile with the new data
        const updateData = {};
        if (profileRequest.full_name) updateData.full_name = profileRequest.full_name;
        if (profileRequest.address) updateData.address = profileRequest.address;
        if (profileRequest.contact_no) updateData.contact_no = profileRequest.contact_no;
        if (profileRequest.position) updateData.position = profileRequest.position;
        if (profileRequest.photo_url) updateData.profile_image = profileRequest.photo_url;

        const { error: updateError } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', profileRequest.user_id);

        if (updateError) {
          console.error('Error updating user profile:', updateError);
          alert('Error updating user profile: ' + updateError.message);
          return;
        }
      }

      // Update the profile request status
      const { error: statusError } = await supabase
        .from('profile_update_requests')
        .update({ 
          status: action,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (statusError) {
        console.error('Error updating profile request:', statusError);
        alert('Error updating profile request status: ' + statusError.message);
        return;
      }

      // Remove the request from local state immediately
      setProfileRequests(prev => prev.filter(req => req.id !== requestId));
      
      alert(`Profile update request ${action.toLowerCase()} successfully!`);
      
      // Close modal if open
      if (isProfileModalOpen) {
        setIsProfileModalOpen(false);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error updating profile request status');
    }
  };

  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  const handleViewProfileRequest = (request) => {
    setSelectedProfileRequest(request);
    setIsProfileModalOpen(true);
  };

  // Status badge component
  const StatusBadge = ({ status }) => {
    let colorClass = '';
    if (status === 'Pending') colorClass = 'bg-yellow-500 text-white';
    if (status === 'Approved') colorClass = 'bg-green-600 text-white';
    if (status === 'Declined') colorClass = 'bg-red-600 text-white';

    return (
      <span className={`px-2 py-1 rounded text-sm ${colorClass}`}>
        {status}
      </span>
    );
  };

  const renderFundRequests = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-32">
          <div className="text-gray-600">Loading fund requests...</div>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full text-sm text-gray-600">
          <thead className="bg-blue-100 text-gray-700 uppercase text-sm">
            <tr>
              <th className="py-3 px-4 text-left">User</th>
              <th className="py-3 px-4 text-left">Truck</th>
              <th className="py-3 px-4 text-left">Purpose</th>
              <th className="py-3 px-4 text-left">Amount</th>
              <th className="py-3 px-4 text-left">Date</th>
              <th className="py-3 px-4 text-left">Status</th>
              <th className="py-3 px-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.length > 0 ? (
              requests.map((req) => (
                <tr key={req.request_id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium text-gray-800">{req.user?.name}</div>
                      <div className="text-xs text-gray-500">{req.user?.email}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4">{req.plate_number}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleViewRequest(req)}
                      className="text-blue-600 hover:underline text-left"
                    >
                      {req.reason ? (req.reason.length > 50 ? `${req.reason.substring(0, 50)}...` : req.reason) : 'No reason provided'}
                    </button>
                  </td>
                  <td className="py-3 px-4">₱{req.estimated_cost || '0'}</td>
                  <td className="py-3 px-4">
                    {new Date(req.request_date).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="py-3 px-4 space-x-2">
                    {req.status === 'Pending' && (
                      <>
                        <button
                          onClick={() => handleAction(req.request_id, 'Approved')}
                          className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(req.request_id, 'Declined')}
                          className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1 rounded"
                        >
                          Decline
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="text-center py-8 text-gray-500">
                  No pending fund requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderProfileRequests = () => {
    if (profileLoading) {
      return (
        <div className="flex justify-center items-center h-32">
          <div className="text-gray-600">Loading profile update requests...</div>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full text-sm text-gray-600">
          <thead className="bg-blue-100 text-gray-700 uppercase text-sm">
            <tr>
              <th className="py-3 px-4 text-left">User</th>
              <th className="py-3 px-4 text-left">Current Position</th>
              <th className="py-3 px-4 text-left">Requested Changes</th>
              <th className="py-3 px-4 text-left">Date</th>
              <th className="py-3 px-4 text-left">Status</th>
              <th className="py-3 px-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {profileRequests.length > 0 ? (
              profileRequests.map((req) => (
                <tr key={req.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium text-gray-800">{req.users?.full_name}</div>
                      <div className="text-xs text-gray-500">{req.users?.email}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4">{req.users?.position || 'N/A'}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleViewProfileRequest(req)}
                      className="text-blue-600 hover:underline text-left"
                    >
                      View Changes
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    {new Date(req.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="py-3 px-4 space-x-2">
                    {req.status === 'Pending' && (
                      <>
                        <button
                          onClick={() => handleProfileAction(req.id, 'Approved')}
                          className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleProfileAction(req.id, 'Declined')}
                          className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1 rounded"
                        >
                          Decline
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center py-8 text-gray-500">
                  No pending profile update requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-blue-900 mb-4">Admin Approval Dashboard</h1>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('funds')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'funds'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Fund Requests ({requests.length})
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'profile'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Profile Updates ({profileRequests.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'funds' ? renderFundRequests() : renderProfileRequests()}

      {/* Fund Request Details Modal */}
      {isModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-blue-900 mb-4">
              Request Details
            </h3>

            {/* Request Info */}
            <div className="grid grid-cols-2 gap-4 mb-6 text-gray-700">
              <div>
                <strong>Request ID:</strong> {selectedRequest.request_id}
              </div>
              <div>
                <strong>Date:</strong> {new Date(selectedRequest.request_date).toLocaleString()}
              </div>
              <div>
                <strong>User:</strong> {selectedRequest.user?.name}
              </div>
              <div>
                <strong>Email:</strong> {selectedRequest.user?.email}
              </div>
              <div>
                <strong>Truck:</strong> {selectedRequest.plate_number}
              </div>
              <div>
                <strong>Estimated Cost:</strong> ₱{selectedRequest.estimated_cost || '0'}
              </div>
              <div className="col-span-2">
                <strong>Status:</strong> <StatusBadge status={selectedRequest.status} />
              </div>
              {selectedRequest.updated_at && (
                <div className="col-span-2">
                  <strong>Last Updated:</strong> {new Date(selectedRequest.updated_at).toLocaleString()}
                </div>
              )}
              <div className="col-span-2">
                <strong>Reason:</strong> 
                <p className="mt-1 p-3 bg-gray-50 rounded border">{selectedRequest.reason || 'No reason provided'}</p>
              </div>
            </div>

            {/* Requested Items */}
            <h4 className="text-lg font-semibold text-gray-800 mb-3">
              Requested Items
            </h4>
            {selectedRequest.request_items && selectedRequest.request_items.length > 0 ? (
              <table className="w-full border mb-6">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-left text-gray-700">Item Name</th>
                    <th className="p-3 text-left text-gray-700">Category</th>
                    <th className="p-3 text-left text-gray-700">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRequest.request_items.map((item, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-3 text-gray-700">{item.inventory?.item_name || 'N/A'}</td>
                      <td className="p-3 text-gray-700">{item.inventory?.category || 'N/A'}</td>
                      <td className="p-3 text-gray-700">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500 mb-6">No items requested.</p>
            )}

            {/* Attachment */}
            {selectedRequest.photo_url && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-3">
                  Attachment
                </h4>
                <img
                  src={selectedRequest.photo_url}
                  alt="Request Attachment"
                  className="w-full max-h-[400px] object-contain rounded border"
                />
              </div>
            )}

            {/* Action Buttons for Pending Requests */}
            {selectedRequest.status === 'Pending' && (
              <div className="flex justify-end space-x-3 mb-4">
                <button
                  onClick={() => {
                    handleAction(selectedRequest.request_id, 'Approved');
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                >
                  Approve Request
                </button>
                <button
                  onClick={() => {
                    handleAction(selectedRequest.request_id, 'Declined');
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                >
                  Decline Request
                </button>
              </div>
            )}

            {/* Close Button */}
            <div className="flex justify-end">
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

      {/* Profile Update Request Details Modal */}
      {isProfileModalOpen && selectedProfileRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-blue-900 mb-4">
              Profile Update Request Details
            </h3>

            {/* User Info */}
            <div className="grid grid-cols-2 gap-4 mb-6 text-gray-700">
              <div>
                <strong>Request ID:</strong> {selectedProfileRequest.id}
              </div>
              <div>
                <strong>Date:</strong> {new Date(selectedProfileRequest.created_at).toLocaleString()}
              </div>
              <div>
                <strong>User:</strong> {selectedProfileRequest.users?.full_name}
              </div>
              <div>
                <strong>Email:</strong> {selectedProfileRequest.users?.email}
              </div>
              <div className="col-span-2">
                <strong>Status:</strong> <StatusBadge status={selectedProfileRequest.status} />
              </div>
            </div>

            {/* Changes Comparison */}
            <h4 className="text-lg font-semibold text-gray-800 mb-3">
              Requested Changes
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Current Profile */}
              <div>
                <h5 className="font-semibold text-gray-700 mb-2">Current Profile</h5>
                <div className="space-y-2 text-sm">
                  <div><strong>Name:</strong> {selectedProfileRequest.users?.full_name || 'N/A'}</div>
                  <div><strong>Address:</strong> {selectedProfileRequest.users?.address || 'N/A'}</div>
                  <div><strong>Contact:</strong> {selectedProfileRequest.users?.contact_no || 'N/A'}</div>
                  <div><strong>Position:</strong> {selectedProfileRequest.users?.position || 'N/A'}</div>
                  {selectedProfileRequest.users?.profile_image && (
                    <div>
                      <strong>Profile Image:</strong>
                      <img 
                        src={selectedProfileRequest.users.profile_image} 
                        alt="Current profile" 
                        className="w-20 h-20 rounded-full mt-2 border"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Requested Changes */}
              <div>
                <h5 className="font-semibold text-gray-700 mb-2">Requested Changes</h5>
                <div className="space-y-2 text-sm">
                  <div><strong>Name:</strong> {selectedProfileRequest.full_name || 'No change'}</div>
                  <div><strong>Address:</strong> {selectedProfileRequest.address || 'No change'}</div>
                  <div><strong>Contact:</strong> {selectedProfileRequest.contact_no || 'No change'}</div>
                  <div><strong>Position:</strong> {selectedProfileRequest.position || 'No change'}</div>
                  {selectedProfileRequest.photo_url && (
                    <div>
                      <strong>New Profile Image:</strong>
                      <img 
                        src={selectedProfileRequest.photo_url} 
                        alt="Requested profile" 
                        className="w-20 h-20 rounded-full mt-2 border"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons for Pending Requests */}
            {selectedProfileRequest.status === 'Pending' && (
              <div className="flex justify-end space-x-3 mb-4">
                <button
                  onClick={() => {
                    handleProfileAction(selectedProfileRequest.id, 'Approved');
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                >
                  Approve Changes
                </button>
                <button
                  onClick={() => {
                    handleProfileAction(selectedProfileRequest.id, 'Declined');
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                >
                  Decline Changes
                </button>
              </div>
            )}

            {/* Close Button */}
            <div className="flex justify-end">
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}