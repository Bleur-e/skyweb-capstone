'use client';
import React, { useState, useEffect } from 'react';
import supabase from '../../../supabaseClient';
import { useRouter } from 'next/navigation';

export default function AdminRequestPage() {
  const router = useRouter();
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
  
  // Notification states
  const [notification, setNotification] = useState({
    show: false,
    type: '', // 'success' or 'error'
    message: '',
    title: ''
  });

  // Get current admin user
  useEffect(() => {
          const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
          if (!currentUser) {
            router.push("/");
            return;
          }
          setCurrentAdmin(currentUser);
        }, [router]);

  // Fetch all requests with related data
  useEffect(() => {
    fetchRequests();
    fetchProfileRequests();
  }, []);

  // Auto-hide notification after 5 seconds
  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [notification.show]);

  const showNotification = (type, title, message) => {
    setNotification({
      show: true,
      type,
      title,
      message
    });
  };

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
        showNotification('error', 'Error', 'Failed to load fund requests: ' + requestsError.message);
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
      showNotification('error', 'Error', 'Failed to load requests data');
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
        showNotification('error', 'Error', 'Failed to load profile requests: ' + profileError.message);
        return;
      }

      setProfileRequests(profileRequestsData || []);
    } catch (error) {
      console.error('Error fetching profile data:', error);
      showNotification('error', 'Error', 'Failed to load profile requests data');
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
        showNotification('error', 'Error', 'Failed to update request status: ' + error.message);
        return;
      }

      // Remove the request from local state immediately
      setRequests(prev => prev.filter(req => req.request_id !== requestId));
      
      // Show success notification
      if (action === 'Approved') {
        showNotification('success', 'Request Approved', 'Fund request has been approved successfully!');
      } else {
        showNotification('success', 'Request Declined', 'Fund request has been declined successfully!');
      }
      
      // Close modal if open
      if (isModalOpen) {
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error('Error:', error);
      showNotification('error', 'Error', 'Failed to update request status');
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
        showNotification('error', 'Error', 'Failed to fetch profile request details');
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
          showNotification('error', 'Error', 'Failed to update user profile: ' + updateError.message);
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
        showNotification('error', 'Error', 'Failed to update profile request status: ' + statusError.message);
        return;
      }

      // Remove the request from local state immediately
      setProfileRequests(prev => prev.filter(req => req.id !== requestId));
      
      // Show success notification
      if (action === 'Approved') {
        showNotification('success', 'Profile Changes Approved', 'Profile update request has been approved successfully!');
      } else {
        showNotification('success', 'Profile Changes Declined', 'Profile update request has been declined successfully!');
      }
      
      // Close modal if open
      if (isProfileModalOpen) {
        setIsProfileModalOpen(false);
      }
    } catch (error) {
      console.error('Error:', error);
      showNotification('error', 'Error', 'Failed to update profile request status');
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

  // Notification component
  const NotificationPopup = () => {
    if (!notification.show) return null;

    const bgColor = notification.type === 'success' ? 'bg-green-500' : 'bg-red-500';
    const icon = notification.type === 'success' ? (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    ) : (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    );

    return (
      <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
        <div className={`${bgColor} text-white px-6 py-4 rounded-lg shadow-lg max-w-sm border-l-4 ${notification.type === 'success' ? 'border-green-400' : 'border-red-400'}`}>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-0.5">
              {icon}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-white text-sm">
                {notification.title}
              </h4>
              <p className="mt-1 text-sm text-white opacity-90">
                {notification.message}
              </p>
            </div>
            <button
              onClick={() => setNotification(prev => ({ ...prev, show: false }))}
              className="flex-shrink-0 text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
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
                          className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(req.request_id, 'Declined')}
                          className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1 rounded transition-colors"
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
                    <div className="space-y-2 min-w-[200px]">
                      {/* Show summary of changes */}
                      <div className="text-sm text-gray-700">
                        {req.full_name && (
                          <div className="mb-1">
                            <span className="font-semibold">Name: </span>
                            <span className="text-blue-600">{req.full_name}</span>
                          </div>
                        )}
                        {req.position && (
                          <div className="mb-1">
                            <span className="font-semibold">Position: </span>
                            <span className="text-blue-600">{req.position}</span>
                          </div>
                        )}
                        {req.address && (
                          <div className="mb-1">
                            <span className="font-semibold">Address: </span>
                            <span className="text-blue-600">
                              {req.address.length > 40 ? `${req.address.substring(0, 40)}...` : req.address}
                            </span>
                          </div>
                        )}
                        {req.contact_no && (
                          <div className="mb-1">
                            <span className="font-semibold">Contact: </span>
                            <span className="text-blue-600">{req.contact_no}</span>
                          </div>
                        )}
                        {req.photo_url && (
                          <div className="mb-1">
                            <span className="font-semibold">Profile Image: </span>
                            <span className="text-blue-600">Updated</span>
                          </div>
                        )}
                      </div>
                      
                      {/* View Full Details Button */}
                      <button
                        onClick={() => handleViewProfileRequest(req)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded transition-colors"
                      >
                        View Full Details
                      </button>
                      
                      {/* Show message if no changes */}
                      {!req.full_name && !req.position && !req.address && !req.contact_no && !req.photo_url && (
                        <div className="text-gray-500 text-sm italic">No changes requested</div>
                      )}
                    </div>
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
                          className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleProfileAction(req.id, 'Declined')}
                          className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1 rounded transition-colors"
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
      {/* Notification Popup */}
      <NotificationPopup />

      <h1 className="text-2xl font-bold text-blue-900 mb-4">Admin Approval</h1>

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
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[95vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-2xl font-bold text-blue-900 mb-4">
                Request Details
              </h3>

              {/* Request Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-gray-700">
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
                <div className="md:col-span-2">
                  <strong>Status:</strong> <StatusBadge status={selectedRequest.status} />
                </div>
                {selectedRequest.updated_at && (
                  <div className="md:col-span-2">
                    <strong>Last Updated:</strong> {new Date(selectedRequest.updated_at).toLocaleString()}
                  </div>
                )}
                <div className="md:col-span-2">
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
                <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 mb-4">
                  <button
                    onClick={() => {
                      handleAction(selectedRequest.request_id, 'Approved');
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-semibold transition-colors"
                  >
                    Approve Request
                  </button>
                  <button
                    onClick={() => {
                      handleAction(selectedRequest.request_id, 'Declined');
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-semibold transition-colors"
                  >
                    Decline Request
                  </button>
                </div>
              )}

              {/* Close Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Update Request Details Modal */}
      {isProfileModalOpen && selectedProfileRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[95vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-2xl font-bold text-blue-900 mb-6">
                Profile Update Request Details
              </h3>

              {/* User Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-gray-700">
                <div>
                  <strong className="text-gray-600">Request ID:</strong> 
                  <div className="mt-1 text-gray-800 font-medium">{selectedProfileRequest.id}</div>
                </div>
                <div>
                  <strong className="text-gray-600">Date Submitted:</strong> 
                  <div className="mt-1 text-gray-800 font-medium">{new Date(selectedProfileRequest.created_at).toLocaleString()}</div>
                </div>
                <div>
                  <strong className="text-gray-600">User:</strong> 
                  <div className="mt-1 text-gray-800 font-medium">{selectedProfileRequest.users?.full_name}</div>
                </div>
                <div>
                  <strong className="text-gray-600">Email:</strong> 
                  <div className="mt-1 text-gray-800 font-medium">{selectedProfileRequest.users?.email}</div>
                </div>
                <div className="md:col-span-2">
                  <strong className="text-gray-600">Status:</strong> 
                  <div className="mt-1"><StatusBadge status={selectedProfileRequest.status} /></div>
                </div>
              </div>

              {/* Changes Comparison */}
              <h4 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">
                Profile Changes Comparison
              </h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Current Profile - Made much clearer */}
                <div className="bg-white border-2 border-gray-300 rounded-lg p-6 shadow-sm">
                  <h5 className="font-bold text-lg text-gray-800 mb-4 pb-2 border-b-2 border-gray-300 flex items-center">
                    <span className="bg-gray-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">1</span>
                    Current Profile
                  </h5>
                  <div className="space-y-4">
                    {/* Profile Image */}
                    <div className="flex flex-col items-center mb-4">
                      {selectedProfileRequest.users?.profile_image ? (
                        <img 
                          src={selectedProfileRequest.users.profile_image} 
                          alt="Current profile" 
                          className="w-32 h-32 rounded-full object-cover border-4 border-gray-400 shadow-md"
                        />
                      ) : (
                        <div className="w-32 h-32 rounded-full bg-gray-300 border-4 border-gray-400 flex items-center justify-center shadow-md">
                          <span className="text-gray-600 text-lg font-semibold">No Image</span>
                        </div>
                      )}
                      <span className="text-sm text-gray-500 mt-2 font-medium">Current Profile Image</span>
                    </div>

                    {/* Profile Details */}
                    <div className="space-y-3">
                      <div>
                        <strong className="text-gray-700 block mb-1">Full Name:</strong>
                        <div className="p-3 bg-gray-100 rounded border border-gray-300 text-gray-800 font-medium">
                          {selectedProfileRequest.users?.full_name || 'Not set'}
                        </div>
                      </div>
                      <div>
                        <strong className="text-gray-700 block mb-1">Position:</strong>
                        <div className="p-3 bg-gray-100 rounded border border-gray-300 text-gray-800 font-medium">
                          {selectedProfileRequest.users?.position || 'Not set'}
                        </div>
                      </div>
                      <div>
                        <strong className="text-gray-700 block mb-1">Address:</strong>
                        <div className="p-3 bg-gray-100 rounded border border-gray-300 text-gray-800 font-medium">
                          {selectedProfileRequest.users?.address || 'Not set'}
                        </div>
                      </div>
                      <div>
                        <strong className="text-gray-700 block mb-1">Contact Number:</strong>
                        <div className="p-3 bg-gray-100 rounded border border-gray-300 text-gray-800 font-medium">
                          {selectedProfileRequest.users?.contact_no || 'Not set'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Requested Changes */}
                <div className="bg-white border-2 border-blue-300 rounded-lg p-6 shadow-sm">
                  <h5 className="font-bold text-lg text-gray-800 mb-4 pb-2 border-b-2 border-blue-300 flex items-center">
                    <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">2</span>
                    Requested Changes
                  </h5>
                  <div className="space-y-4">
                    {/* Profile Image */}
                    <div className="flex flex-col items-center mb-4">
                      {selectedProfileRequest.photo_url ? (
                        <img 
                          src={selectedProfileRequest.photo_url} 
                          alt="Requested profile" 
                          className="w-32 h-32 rounded-full object-cover border-4 border-blue-400 shadow-md"
                        />
                      ) : selectedProfileRequest.users?.profile_image ? (
                        <div className="relative">
                          <img 
                            src={selectedProfileRequest.users.profile_image} 
                            alt="Current profile" 
                            className="w-32 h-32 rounded-full object-cover border-4 border-gray-300 shadow-md opacity-50"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-gray-500 text-sm font-semibold">No Change</span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-32 h-32 rounded-full bg-gray-200 border-4 border-gray-300 flex items-center justify-center shadow-md">
                          <span className="text-gray-500 text-sm font-semibold">No Image</span>
                        </div>
                      )}
                      <span className="text-sm text-gray-500 mt-2 font-medium">
                        {selectedProfileRequest.photo_url ? 'New Profile Image' : 'No Change to Image'}
                      </span>
                    </div>

                    {/* Requested Details */}
                    <div className="space-y-3">
                      <div>
                        <strong className="text-gray-700 block mb-1">Full Name:</strong>
                        <div className={`p-3 rounded border font-medium ${
                          selectedProfileRequest.full_name 
                            ? 'bg-blue-50 border-blue-300 text-blue-700' 
                            : 'bg-gray-100 border-gray-300 text-gray-500'
                        }`}>
                          {selectedProfileRequest.full_name || 'No change requested'}
                        </div>
                      </div>
                      <div>
                        <strong className="text-gray-700 block mb-1">Position:</strong>
                        <div className={`p-3 rounded border font-medium ${
                          selectedProfileRequest.position 
                            ? 'bg-blue-50 border-blue-300 text-blue-700' 
                            : 'bg-gray-100 border-gray-300 text-gray-500'
                        }`}>
                          {selectedProfileRequest.position || 'No change requested'}
                        </div>
                      </div>
                      <div>
                        <strong className="text-gray-700 block mb-1">Address:</strong>
                        <div className={`p-3 rounded border font-medium ${
                          selectedProfileRequest.address 
                            ? 'bg-blue-50 border-blue-300 text-blue-700' 
                            : 'bg-gray-100 border-gray-300 text-gray-500'
                        }`}>
                          {selectedProfileRequest.address || 'No change requested'}
                        </div>
                      </div>
                      <div>
                        <strong className="text-gray-700 block mb-1">Contact Number:</strong>
                        <div className={`p-3 rounded border font-medium ${
                          selectedProfileRequest.contact_no 
                            ? 'bg-blue-50 border-blue-300 text-blue-700' 
                            : 'bg-gray-100 border-gray-300 text-gray-500'
                        }`}>
                          {selectedProfileRequest.contact_no || 'No change requested'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Pending Requests */}
              {selectedProfileRequest.status === 'Pending' && (
                <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 mb-6 pt-6 border-t">
                  <button
                    onClick={() => {
                      handleProfileAction(selectedProfileRequest.id, 'Approved');
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors shadow-md"
                  >
                    ✓ Approve All Changes
                  </button>
                  <button
                    onClick={() => {
                      handleProfileAction(selectedProfileRequest.id, 'Declined');
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors shadow-md"
                  >
                    ✗ Decline Changes
                  </button>
                </div>
              )}

              {/* Close Button */}
              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}