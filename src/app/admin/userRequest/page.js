'use client';
import React, { useState, useEffect } from 'react';
import supabase from '../../../supabaseClient';
import { useRouter } from 'next/navigation';

export default function AdminRequestPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('funds');
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
    type: '',
    message: '',
    title: ''
  });

  // Confirmation modal states
  const [confirmationModal, setConfirmationModal] = useState({
    show: false,
    type: '', // 'approve' or 'decline'
    requestId: null,
    requestType: '', // 'fund' or 'profile'
    message: '',
    title: ''
  });

  // Get current admin user
  useEffect(() => {
    const currentAdmin = JSON.parse(sessionStorage.getItem("currentUser"));
    if (!currentAdmin) {
      router.push("/");
      return;
    }
    setCurrentAdmin(currentAdmin);
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

  // Function to notify all "user" role users with a single shared notification
  const notifyUsers = async (message, type, plate_number = null) => {
    try {
      // ✅ Just insert one notification for the role
      const { error: notifError } = await supabase.from('notifications').insert([
        {
          message: message,
          type: type,
          role: 'user',
          plate_number: plate_number,
          created_at: new Date().toISOString(),
        },
      ]);

      if (notifError) {
        console.error('Error creating notification:', notifError);
        throw notifError;
      } else {
        console.log('✅ Single notification sent to user role');
      }
    } catch (error) {
      console.error('Error in notifyUsers:', error);
      throw error;
    }
  };

  // Fixed Function to record audit logs
  const recordAuditLog = async (action, description, requestId = null, table_name = 'requests') => {
    try {
      const auditLog = {
        action: action,
        description: description,
        user_id: currentAdmin?.id,
        username: currentAdmin?.full_name,
        record_id: requestId?.toString(), // Convert to string if it's not
        table_name: table_name,
        created_at: new Date().toISOString()
      };

      console.log('Recording audit log:', auditLog);

      const { error } = await supabase
        .from('audit_logs')
        .insert(auditLog);

      if (error) {
        console.error('Error recording audit log:', error);
        throw error;
      } else {
        console.log('Audit log recorded successfully');
      }
    } catch (error) {
      console.error('Error in recordAuditLog:', error);
      throw error;
    }
  };

  // Confirmation modal functions
  const showConfirmation = (type, requestId, requestType, requestData) => {
    let title = '';
    let message = '';

    if (requestType === 'fund') {
      const request = requests.find(req => req.request_id === requestId);
      if (type === 'approve') {
        title = 'Approve Fund Request';
        message = `Are you sure you want to approve the maintenance request for vehicle ${request?.plate_number}? This action cannot be undone.`;
      } else {
        title = 'Decline Fund Request';
        message = `Are you sure you want to decline the maintenance request for vehicle ${request?.plate_number}? This action cannot be undone.`;
      }
    } else {
      const request = profileRequests.find(req => req.id === requestId);
      if (type === 'approve') {
        title = 'Approve Profile Changes';
        message = `Are you sure you want to approve the profile update request from ${request?.users?.full_name || 'this user'}?`;
      } else {
        title = 'Decline Profile Changes';
        message = `Are you sure you want to decline the profile update request from ${request?.users?.full_name || 'this user'}?`;
      }
    }

    setConfirmationModal({
      show: true,
      type,
      requestId,
      requestType,
      title,
      message
    });
  };

  const handleConfirmation = async (confirmed) => {
    if (!confirmed) {
      setConfirmationModal({ show: false, type: '', requestId: null, requestType: '', message: '', title: '' });
      return;
    }

    const { type, requestId, requestType } = confirmationModal;

    try {
      if (requestType === 'fund') {
        await handleAction(requestId, type === 'approve' ? 'Approved' : 'Declined');
      } else {
        await handleProfileAction(requestId, type === 'approve' ? 'Approved' : 'Declined');
      }
    } catch (error) {
      console.error('Error processing action:', error);
      showNotification('error', 'Error', 'Failed to process request');
    }

    setConfirmationModal({ show: false, type: '', requestId: null, requestType: '', message: '', title: '' });
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      
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
        .eq('status', 'Pending')
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

      // Get the request details for notification and audit log
      const request = requests.find(req => req.request_id === requestId);
      
      if (request) {
        const message = action === 'Approved' 
          ? `Maintenance request for ${request.plate_number} has been approved`
          : `Maintenance request for ${request.plate_number} has been declined`;
        
        // Send notification to users with "user" role only
        await notifyUsers(message, 'request_status', request.plate_number);

        // Fixed audit log recording
        const auditDescription = action === 'Approved'
          ? `Approved maintenance request #${requestId} for vehicle ${request.plate_number} requested by ${request.user?.name}`
          : `Declined maintenance request #${requestId} for vehicle ${request.plate_number} requested by ${request.user?.name}`;
        
        await recordAuditLog(
          action === 'Approved' ? 'Approve' : 'Decline',
          auditDescription,
          requestId,
          'requests'
        );
      }

      // Remove the request from local state immediately
      setRequests(prev => prev.filter(req => req.request_id !== requestId));
      
      // Show success notification
      if (action === 'Approved') {
        showNotification('success', 'Request Approved', 'Fund request has been approved and users have been notified!');
      } else {
        showNotification('success', 'Request Declined', 'Fund request has been declined and users have been notified!');
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

      // Send notification to users with "user" role only about profile update status
      const message = action === 'Approved'
        ? `Profile update request from ${profileRequest.full_name || 'a user'} has been approved`
        : `Profile update request from ${profileRequest.full_name || 'a user'} has been declined`;
      
      await notifyUsers(message, 'profile_update_status');

      // Fixed audit log recording for profile update
      const auditDescription = action === 'Approved'
        ? `Approved profile update request #${requestId} for user ${profileRequest.full_name || 'Unknown User'}`
        : `Declined profile update request #${requestId} for user ${profileRequest.full_name || 'Unknown User'}`;
      
      await recordAuditLog(
        action === 'Approved' ? 'Approve' : 'Decline',
        auditDescription,
        requestId,
        'profile_update_requests'
      );

      // Remove the request from local state immediately
      setProfileRequests(prev => prev.filter(req => req.id !== requestId));
      
      // Show success notification
      if (action === 'Approved') {
        showNotification('success', 'Profile Changes Approved', 'Profile update request has been approved and users have been notified!');
      } else {
        showNotification('success', 'Profile Changes Declined', 'Profile update request has been declined and users have been notified!');
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

  // Enhanced Status Badge component
  const StatusBadge = ({ status }) => {
    const statusConfig = {
      'Pending': { color: 'bg-amber-500 text-white', icon: '⏳' },
      'Approved': { color: 'bg-emerald-600 text-white', icon: '✅' },
      'Declined': { color: 'bg-red-600 text-white', icon: '❌' }
    };

    const config = statusConfig[status] || statusConfig.Pending;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${config.color} shadow-sm`}>
        <span className="text-xs">{config.icon}</span>
        {status}
      </span>
    );
  };

  // Enhanced Notification component
  const NotificationPopup = () => {
    if (!notification.show) return null;

    const config = {
      success: { 
        bg: 'bg-emerald-500', 
        border: 'border-emerald-400',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )
      },
      error: { 
        bg: 'bg-red-500', 
        border: 'border-red-400',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        )
      }
    };

    const { bg, border, icon } = config[notification.type] || config.success;

    return (
      <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
        <div className={`${bg} text-white px-6 py-4 rounded-xl shadow-2xl max-w-sm border-l-4 ${border} backdrop-blur-sm bg-opacity-95`}>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-0.5">
              {icon}
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-white text-sm">
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

  // Confirmation Modal Component
  const ConfirmationModal = () => {
    if (!confirmationModal.show) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                confirmationModal.type === 'approve' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
              }`}>
                {confirmationModal.type === 'approve' ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                )}
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                {confirmationModal.title}
              </h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              {confirmationModal.message}
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => handleConfirmation(false)}
                className="px-6 py-2.5 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmation(true)}
                className={`px-6 py-2.5 text-white rounded-lg font-semibold transition-colors ${
                  confirmationModal.type === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {confirmationModal.type === 'approve' ? 'Yes, Approve' : 'Yes, Decline'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFundRequests = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            Fund Requests ({requests.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-700 uppercase text-xs font-semibold">
              <tr>
                <th className="py-4 px-6 text-left">User</th>
                <th className="py-4 px-6 text-left">Truck</th>
                <th className="py-4 px-6 text-left">Purpose</th>
                <th className="py-4 px-6 text-left">Amount</th>
                <th className="py-4 px-6 text-left">Date</th>
                <th className="py-4 px-6 text-left">Status</th>
                <th className="py-4 px-6 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {requests.length > 0 ? (
                requests.map((req) => (
                  <tr key={req.request_id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <div>
                        <div className="font-semibold text-gray-900">{req.user?.name}</div>
                        <div className="text-xs text-gray-500">{req.user?.email}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-medium text-gray-900">{req.plate_number}</td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => handleViewRequest(req)}
                        className="text-blue-600 hover:text-blue-800 hover:underline text-left font-medium"
                      >
                        {req.reason ? (req.reason.length > 50 ? `${req.reason.substring(0, 50)}...` : req.reason) : 'No reason provided'}
                      </button>
                    </td>
                    <td className="py-4 px-6 font-bold text-green-600">₱{req.estimated_cost || '0'}</td>
                    <td className="py-4 px-6 text-gray-600">
                      {new Date(req.request_date).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="py-4 px-6">
                      {req.status === 'Pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => showConfirmation('approve', req.request_id, 'fund', req)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg flex-1"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => showConfirmation('decline', req.request_id, 'fund', req)}
                            className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg flex-1"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-12">
                    <div className="text-gray-500 text-lg font-medium">No pending fund requests found</div>
                    <p className="text-gray-400 text-sm mt-2">All fund requests have been processed</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderProfileRequests = () => {
    if (profileLoading) {
      return (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Profile Updates ({profileRequests.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-700 uppercase text-xs font-semibold">
              <tr>
                <th className="py-4 px-6 text-left">User</th>
                <th className="py-4 px-6 text-left">Current Position</th>
                <th className="py-4 px-6 text-left">Requested Changes</th>
                <th className="py-4 px-6 text-left">Date</th>
                <th className="py-4 px-6 text-left">Status</th>
                <th className="py-4 px-6 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {profileRequests.length > 0 ? (
                profileRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <div>
                        <div className="font-semibold text-gray-900">{req.users?.full_name}</div>
                        <div className="text-xs text-gray-500">{req.users?.email}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-700">{req.users?.position || 'N/A'}</td>
                    <td className="py-4 px-6">
                      <div className="space-y-2 min-w-[200px]">
                        <div className="text-sm text-gray-700 space-y-1">
                          {req.full_name && (
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                              <span><strong>Name:</strong> {req.full_name}</span>
                            </div>
                          )}
                          {req.position && (
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                              <span><strong>Position:</strong> {req.position}</span>
                            </div>
                          )}
                          {req.address && (
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                              <span><strong>Address:</strong> {req.address.length > 40 ? `${req.address.substring(0, 40)}...` : req.address}</span>
                            </div>
                          )}
                          {req.contact_no && (
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                              <span><strong>Contact:</strong> {req.contact_no}</span>
                            </div>
                          )}
                          {req.photo_url && (
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                              <span><strong>Profile Image:</strong> Updated</span>
                            </div>
                          )}
                        </div>
                        
                        <button
                          onClick={() => handleViewProfileRequest(req)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                        >
                          View Full Details
                        </button>
                        
                        {!req.full_name && !req.position && !req.address && !req.contact_no && !req.photo_url && (
                          <div className="text-gray-500 text-sm italic">No changes requested</div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-600">
                      {new Date(req.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="py-4 px-6">
                      {req.status === 'Pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => showConfirmation('approve', req.id, 'profile', req)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg flex-1"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => showConfirmation('decline', req.id, 'profile', req)}
                            className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg flex-1"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-12">
                    <div className="text-gray-500 text-lg font-medium">No pending profile update requests found</div>
                    <p className="text-gray-400 text-sm mt-2">All profile update requests have been processed</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      {/* Notification Popup */}
      <NotificationPopup />

      {/* Confirmation Modal */}
      <ConfirmationModal />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            Admin Approval Dashboard
          </h1>
          <p className="text-gray-600 text-lg">Manage and approve user requests</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 bg-white rounded-2xl shadow-lg p-2 max-w-2xl mx-auto">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('funds')}
              className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all duration-200 ${
                activeTab === 'funds'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                Fund Requests ({requests.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all duration-200 ${
                activeTab === 'profile'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-gray-600 hover:text-purple-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile Updates ({profileRequests.length})
              </div>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'funds' ? renderFundRequests() : renderProfileRequests()}
      </div>

      {/* Fund Request Details Modal */}
      {isModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-3xl font-bold text-gray-900">
                  Request Details
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

              {/* Request Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <label className="text-sm font-semibold text-gray-600">Request ID</label>
                    <div className="text-lg font-bold text-gray-900">{selectedRequest.request_id}</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <label className="text-sm font-semibold text-gray-600">User</label>
                    <div className="text-lg font-bold text-gray-900">{selectedRequest.user?.name}</div>
                    <div className="text-sm text-gray-600">{selectedRequest.user?.email}</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <label className="text-sm font-semibold text-gray-600">Truck</label>
                    <div className="text-lg font-bold text-blue-600">{selectedRequest.plate_number}</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <label className="text-sm font-semibold text-gray-600">Estimated Cost</label>
                    <div className="text-2xl font-bold text-green-600">₱{selectedRequest.estimated_cost || '0'}</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <label className="text-sm font-semibold text-gray-600">Date</label>
                    <div className="text-lg font-bold text-gray-900">{new Date(selectedRequest.request_date).toLocaleString()}</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <label className="text-sm font-semibold text-gray-600">Status</label>
                    <div className="mt-1"><StatusBadge status={selectedRequest.status} /></div>
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div className="mb-8">
                <h4 className="text-xl font-bold text-gray-800 mb-4">Reason for Request</h4>
                <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
                  <p className="text-gray-700 leading-relaxed">{selectedRequest.reason || 'No reason provided'}</p>
                </div>
              </div>

              {/* Requested Items */}
              <h4 className="text-xl font-bold text-gray-800 mb-4">Requested Items</h4>
              {selectedRequest.request_items && selectedRequest.request_items.length > 0 ? (
                <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden mb-8">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="py-4 px-6 text-left font-semibold text-gray-700">Item Name</th>
                        <th className="py-4 px-6 text-left font-semibold text-gray-700">Category</th>
                        <th className="py-4 px-6 text-left font-semibold text-gray-700">Quantity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedRequest.request_items.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="py-4 px-6 font-medium text-gray-900">{item.inventory?.item_name || 'N/A'}</td>
                          <td className="py-4 px-6 text-gray-700">{item.inventory?.category || 'N/A'}</td>
                          <td className="py-4 px-6 font-bold text-blue-600">{item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-8 text-center mb-8">
                  <p className="text-gray-500 text-lg">No items requested</p>
                </div>
              )}

              {/* Attachment */}
              {selectedRequest.photo_url && (
                <div className="mb-8">
                  <h4 className="text-xl font-bold text-gray-800 mb-4">Attachment</h4>
                  <img
                    src={selectedRequest.photo_url}
                    alt="Request Attachment"
                    className="w-full max-h-96 object-contain rounded-xl border-2 border-gray-200 shadow-lg"
                  />
                </div>
              )}

              {/* Action Buttons for Pending Requests */}
              {selectedRequest.status === 'Pending' && (
                <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => showConfirmation('approve', selectedRequest.request_id, 'fund', selectedRequest)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex-1 sm:flex-none"
                  >
                    ✓ Approve Request
                  </button>
                  <button
                    onClick={() => showConfirmation('decline', selectedRequest.request_id, 'fund', selectedRequest)}
                    className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-bold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex-1 sm:flex-none"
                  >
                    ✗ Decline Request
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile Update Request Details Modal */}
      {isProfileModalOpen && selectedProfileRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-3xl font-bold text-gray-900">
                  Profile Update Request
                </h3>
                <button
                  onClick={() => setIsProfileModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Enhanced Profile Modal Content */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Current Profile */}
                <div className="bg-white border-2 border-gray-300 rounded-lg p-6 shadow-sm">
                  <h5 className="font-bold text-lg text-gray-800 mb-4 pb-2 border-b-2 border-gray-300 flex items-center">
                    <span className="bg-gray-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">1</span>
                    Current Profile
                  </h5>
                  <div className="space-y-4">
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

              {/* Action Buttons for Pending Profile Requests */}
              {selectedProfileRequest.status === 'Pending' && (
                <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t">
                  <button
                    onClick={() => showConfirmation('approve', selectedProfileRequest.id, 'profile', selectedProfileRequest)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors shadow-md flex-1 sm:flex-none"
                  >
                    ✓ Approve All Changes
                  </button>
                  <button
                    onClick={() => showConfirmation('decline', selectedProfileRequest.id, 'profile', selectedProfileRequest)}
                    className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors shadow-md flex-1 sm:flex-none"
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