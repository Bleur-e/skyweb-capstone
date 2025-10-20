'use client';
import React, { useState, useEffect } from 'react';
import supabase from '../../../supabaseClient';

export default function AdminRequestPage() {
  const [activeTab, setActiveTab] = useState('funds'); // 'funds' or 'profile'
  const [fundLogs, setFundLogs] = useState([]);
  const [profileLogs, setProfileLogs] = useState([]);
  const [filteredFundLogs, setFilteredFundLogs] = useState([]);
  const [filteredProfileLogs, setFilteredProfileLogs] = useState([]);
  const [selectedFundLog, setSelectedFundLog] = useState(null);
  const [selectedProfileLog, setSelectedProfileLog] = useState(null);
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [fundsLoading, setFundsLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [fundStatusFilter, setFundStatusFilter] = useState('all'); // 'all', 'approved', 'declined'
  const [profileStatusFilter, setProfileStatusFilter] = useState('all'); // 'all', 'approved', 'declined'

  // Get current admin user
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('currentUser'));
    setCurrentAdmin(storedUser);
  }, []);

  // Fetch all data based on active tab
  useEffect(() => {
    fetchFundLogs();
    fetchProfileLogs();
  }, []);

  // Apply filters when fundLogs or filter changes
  useEffect(() => {
    if (fundStatusFilter === 'all') {
      setFilteredFundLogs(fundLogs);
    } else if (fundStatusFilter === 'approved') {
      setFilteredFundLogs(fundLogs.filter(log => log.status === 'Approved'));
    } else if (fundStatusFilter === 'declined') {
      setFilteredFundLogs(fundLogs.filter(log => log.status === 'Declined'));
    }
  }, [fundLogs, fundStatusFilter]);

  // Apply filters when profileLogs or filter changes
  useEffect(() => {
    if (profileStatusFilter === 'all') {
      setFilteredProfileLogs(profileLogs);
    } else if (profileStatusFilter === 'approved') {
      setFilteredProfileLogs(profileLogs.filter(log => log.status === 'Approved'));
    } else if (profileStatusFilter === 'declined') {
      setFilteredProfileLogs(profileLogs.filter(log => log.status === 'Declined'));
    }
  }, [profileLogs, profileStatusFilter]);

  const fetchFundLogs = async () => {
    try {
      setFundsLoading(true);
      
      const { data: fundLogsData, error: fundError } = await supabase
        .from('requests')
        .select(`
          *,
          users!requested_by(full_name, email),
          admin_users:users!action_by(full_name, email),
          request_items(
            quantity,
            inventory(
              item_name,
              category
            )
          )
        `)
        .in('status', ['Approved', 'Declined'])
        .order('updated_at', { ascending: false });

      if (fundError) {
        console.error('Error fetching fund logs:', fundError);
        alert('Error loading fund logs: ' + fundError.message);
        return;
      }

      if (!fundLogsData || fundLogsData.length === 0) {
        setFundLogs([]);
        setFundsLoading(false);
        return;
      }

      const formattedFundLogs = fundLogsData.map(request => ({
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
        admin_user: request.admin_users ? {
          name: request.admin_users.full_name,
          email: request.admin_users.email
        } : null,
        request_items: request.request_items || []
      }));

      setFundLogs(formattedFundLogs);
    } catch (error) {
      console.error('Error fetching fund logs:', error);
      alert('Error loading fund logs data');
    } finally {
      setFundsLoading(false);
    }
  };

  const fetchProfileLogs = async () => {
    try {
      setProfileLoading(true);
      
      const { data: profileLogsData, error: profileError } = await supabase
        .from('profile_update_requests')
        .select(`
          *,
          users!user_id(full_name, email, position, address, contact_no)
        `)
        .in('status', ['Approved', 'Declined'])
        .order('updated_at', { ascending: false });

      if (profileError) {
        console.error('Error fetching profile logs:', profileError);
        alert('Error loading profile logs: ' + profileError.message);
        return;
      }

      // Get admin user details separately for profile logs
      const profileLogsWithAdmins = await Promise.all(
        (profileLogsData || []).map(async (log) => {
          let adminUser = null;
          if (log.action_by) {
            const { data: adminData } = await supabase
              .from('users')
              .select('full_name, email')
              .eq('id', log.action_by)
              .single();
            adminUser = adminData;
          }
          
          return {
            ...log,
            admin_user: adminUser
          };
        })
      );

      setProfileLogs(profileLogsWithAdmins);
    } catch (error) {
      console.error('Error fetching profile logs:', error);
      alert('Error loading profile logs data');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleViewFundLog = (log) => {
    setSelectedFundLog(log);
    setIsFundModalOpen(true);
  };

  const handleViewProfileLog = (log) => {
    setSelectedProfileLog(log);
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

  const renderFundLogs = () => {
    if (fundsLoading) {
      return (
        <div className="flex justify-center items-center h-32">
          <div className="text-gray-600">Loading fund logs...</div>
        </div>
      );
    }

    return (
      <div>
        {/* Filter Section */}
        <div className="mb-4 flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
          <select
            value={fundStatusFilter}
            onChange={(e) => setFundStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 font-medium"
          >
            <option value="all">All Status</option>
            <option value="approved">Approved Only</option>
            <option value="declined">Declined Only</option>
          </select>
          <span className="text-sm text-gray-600">
            Showing {filteredFundLogs.length} of {fundLogs.length} records
          </span>
        </div>

        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full text-sm text-gray-600">
            <thead className="bg-blue-100 text-gray-700 uppercase text-sm">
              <tr>
                <th className="py-3 px-4 text-left">User</th>
                <th className="py-3 px-4 text-left">Truck</th>
                <th className="py-3 px-4 text-left">Purpose</th>
                <th className="py-3 px-4 text-left">Amount</th>
                <th className="py-3 px-4 text-left">Request Date</th>
                <th className="py-3 px-4 text-left">Action Date</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-left">Action By</th>
                <th className="py-3 px-4 text-left">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredFundLogs.length > 0 ? (
                filteredFundLogs.map((log) => (
                  <tr key={log.request_id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-gray-800">{log.user?.name}</div>
                        <div className="text-xs text-gray-500">{log.user?.email}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">{log.plate_number}</td>
                    <td className="py-3 px-4">
                      {log.reason ? (log.reason.length > 50 ? `${log.reason.substring(0, 50)}...` : log.reason) : 'No reason provided'}
                    </td>
                    <td className="py-3 px-4">₱{log.estimated_cost || '0'}</td>
                    <td className="py-3 px-4">
                      {new Date(log.request_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      {log.updated_at ? new Date(log.updated_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-gray-800">
                          {log.admin_user?.name || 'Unknown Admin'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {log.admin_user?.email || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleViewFundLog(log)}
                        className="text-blue-600 hover:underline text-left"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-gray-500">
                    No fund logs found {fundStatusFilter !== 'all' ? `with status ${fundStatusFilter}` : ''}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderProfileLogs = () => {
    if (profileLoading) {
      return (
        <div className="flex justify-center items-center h-32">
          <div className="text-gray-600">Loading profile logs...</div>
        </div>
      );
    }

    return (
      <div>
        {/* Filter Section */}
        <div className="mb-4 flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
          <select
            value={profileStatusFilter}
            onChange={(e) => setProfileStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 font-medium"
          >
            <option value="all">All Status</option>
            <option value="approved">Approved Only</option>
            <option value="declined">Declined Only</option>
          </select>
          <span className="text-sm text-gray-600">
            Showing {filteredProfileLogs.length} of {profileLogs.length} records
          </span>
        </div>

        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full text-sm text-gray-600">
            <thead className="bg-blue-100 text-gray-700 uppercase text-sm">
              <tr>
                <th className="py-3 px-4 text-left">User</th>
                <th className="py-3 px-4 text-left">Requested Changes</th>
                <th className="py-3 px-4 text-left">Request Date</th>
                <th className="py-3 px-4 text-left">Action Date</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-left">Action By</th>
                <th className="py-3 px-4 text-left">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfileLogs.length > 0 ? (
                filteredProfileLogs.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-gray-800">{log.users?.full_name}</div>
                        <div className="text-xs text-gray-500">{log.users?.email}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {log.full_name || log.position ? 'Profile Updates' : 'No changes'}
                    </td>
                    <td className="py-3 px-4">
                      {new Date(log.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      {log.updated_at ? new Date(log.updated_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-gray-800">
                          {log.admin_user?.full_name || 'Unknown Admin'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {log.admin_user?.email || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleViewProfileLog(log)}
                        className="text-blue-600 hover:underline text-left"
                      >
                        View Changes
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500">
                    No profile logs found {profileStatusFilter !== 'all' ? `with status ${profileStatusFilter}` : ''}.
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
    <div className="p-6">
      <h1 className="text-2xl font-bold text-blue-900 mb-4">Request Logs</h1>

      {/* Tab Navigation - Only 2 tabs now */}
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
            Fund Request Logs ({filteredFundLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'profile'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Profile Request Logs ({filteredProfileLogs.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'funds' && renderFundLogs()}
      {activeTab === 'profile' && renderProfileLogs()}

      {/* Fund Log Details Modal */}
      {isFundModalOpen && selectedFundLog && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-blue-900 mb-4">
              Fund Request Details
            </h3>

            {/* Request Info */}
            <div className="grid grid-cols-2 gap-4 mb-6 text-gray-700">
              <div>
                <strong>Request ID:</strong> {selectedFundLog.request_id}
              </div>
              <div>
                <strong>Request Date:</strong> {new Date(selectedFundLog.request_date).toLocaleString()}
              </div>
              <div>
                <strong>User:</strong> {selectedFundLog.user?.name}
              </div>
              <div>
                <strong>Email:</strong> {selectedFundLog.user?.email}
              </div>
              <div>
                <strong>Truck:</strong> {selectedFundLog.plate_number}
              </div>
              <div>
                <strong>Estimated Cost:</strong> ₱{selectedFundLog.estimated_cost || '0'}
              </div>
              <div className="col-span-2">
                <strong>Status:</strong> <StatusBadge status={selectedFundLog.status} />
              </div>
              {selectedFundLog.updated_at && (
                <div>
                  <strong>Action Date:</strong> {new Date(selectedFundLog.updated_at).toLocaleString()}
                </div>
              )}
              {selectedFundLog.admin_user && (
                <div>
                  <strong>Action By:</strong> {selectedFundLog.admin_user?.name} ({selectedFundLog.admin_user?.email})
                </div>
              )}
              <div className="col-span-2">
                <strong>Reason:</strong> 
                <p className="mt-1 p-3 bg-gray-50 rounded border">{selectedFundLog.reason || 'No reason provided'}</p>
              </div>
            </div>

            {/* Requested Items */}
            <h4 className="text-lg font-semibold text-gray-800 mb-3">
              Requested Items
            </h4>
            {selectedFundLog.request_items && selectedFundLog.request_items.length > 0 ? (
              <table className="w-full border mb-6">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-left text-gray-700">Item Name</th>
                    <th className="p-3 text-left text-gray-700">Category</th>
                    <th className="p-3 text-left text-gray-700">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedFundLog.request_items.map((item, index) => (
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
            {selectedFundLog.photo_url && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-3">
                  Attachment
                </h4>
                <img
                  src={selectedFundLog.photo_url}
                  alt="Request Attachment"
                  className="w-full max-h-[400px] object-contain rounded border"
                />
              </div>
            )}

            {/* Close Button */}
            <div className="flex justify-end">
              <button
                onClick={() => setIsFundModalOpen(false)}
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Log Details Modal */}
      {isProfileModalOpen && selectedProfileLog && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-blue-900 mb-4">
              Profile Update Request Details
            </h3>

            {/* User Info */}
            <div className="grid grid-cols-2 gap-4 mb-6 text-gray-700">
              <div>
                <strong>Request ID:</strong> {selectedProfileLog.id}
              </div>
              <div>
                <strong>Request Date:</strong> {new Date(selectedProfileLog.created_at).toLocaleString()}
              </div>
              <div>
                <strong>User:</strong> {selectedProfileLog.users?.full_name}
              </div>
              <div>
                <strong>Email:</strong> {selectedProfileLog.users?.email}
              </div>
              <div className="col-span-2">
                <strong>Status:</strong> <StatusBadge status={selectedProfileLog.status} />
              </div>
              {selectedProfileLog.updated_at && (
                <div>
                  <strong>Action Date:</strong> {new Date(selectedProfileLog.updated_at).toLocaleString()}
                </div>
              )}
              {selectedProfileLog.admin_user && (
                <div>
                  <strong>Action By:</strong> {selectedProfileLog.admin_user?.full_name} ({selectedProfileLog.admin_user?.email})
                </div>
              )}
            </div>

            {/* Changes Comparison */}
            <h4 className="text-lg font-semibold text-gray-800 mb-3">
              Requested Changes
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Current Profile */}
              <div>
                <h5 className="font-semibold text-gray-700 mb-2">Original Profile</h5>
                <div className="space-y-2 text-sm">
                  <div><strong>Name:</strong> {selectedProfileLog.users?.full_name || 'N/A'}</div>
                  <div><strong>Address:</strong> {selectedProfileLog.users?.address || 'N/A'}</div>
                  <div><strong>Contact:</strong> {selectedProfileLog.users?.contact_no || 'N/A'}</div>
                  <div><strong>Position:</strong> {selectedProfileLog.users?.position || 'N/A'}</div>
                </div>
              </div>

              {/* Requested Changes */}
              <div>
                <h5 className="font-semibold text-gray-700 mb-2">Requested Changes</h5>
                <div className="space-y-2 text-sm">
                  <div><strong>Name:</strong> {selectedProfileLog.full_name || 'No change'}</div>
                  <div><strong>Address:</strong> {selectedProfileLog.address || 'No change'}</div>
                  <div><strong>Contact:</strong> {selectedProfileLog.contact_no || 'No change'}</div>
                  <div><strong>Position:</strong> {selectedProfileLog.position || 'No change'}</div>
                  {selectedProfileLog.photo_url && (
                    <div>
                      <strong>New Profile Image:</strong>
                      <img 
                        src={selectedProfileLog.photo_url} 
                        alt="Requested profile" 
                        className="w-20 h-20 rounded-full mt-2 border"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

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