'use client';
import React, { useState, useEffect } from 'react';
import supabase from '../../../supabaseClient';
import { useRouter } from 'next/navigation';

export default function AdminRequestPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('funds');
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
  const [fundStatusFilter, setFundStatusFilter] = useState('all');
  const [profileStatusFilter, setProfileStatusFilter] = useState('all');

  useEffect(() => {
          const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
          if (!currentUser) {
            router.push("/");
            return;
          }
          setCurrentAdmin(currentUser);
        }, [router]);

  useEffect(() => {
    fetchFundLogs();
    fetchProfileLogs();
  }, []);

  useEffect(() => {
    if (fundStatusFilter === 'all') {
      setFilteredFundLogs(fundLogs);
    } else if (fundStatusFilter === 'approved') {
      setFilteredFundLogs(fundLogs.filter(log => log.status === 'Approved'));
    } else if (fundStatusFilter === 'declined') {
      setFilteredFundLogs(fundLogs.filter(log => log.status === 'Declined'));
    }
  }, [fundLogs, fundStatusFilter]);

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
      
      // Use the same pattern as fund logs
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

      console.log('Profile logs with admin data:', profileLogsData); // Debug log

      // Format the data exactly like fund logs
      const formattedProfileLogs = (profileLogsData || []).map(log => ({
        id: log.id,
        user_id: log.user_id,
        full_name: log.full_name,
        address: log.address,
        contact_no: log.contact_no,
        position: log.position,
        photo_url: log.photo_url,
        status: log.status,
        created_at: log.created_at,
        updated_at: log.updated_at,
        action_by: log.action_by,
        users: log.users ? {
          full_name: log.users.full_name,
          email: log.users.email,
          position: log.users.position,
          address: log.users.address,
          contact_no: log.users.contact_no
        } : null,
        admin_user: log.admin_users ? {
          name: log.admin_users.full_name,
          email: log.admin_users.email
        } : null
      }));

      setProfileLogs(formattedProfileLogs);
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
                      {log.full_name || log.position || log.address || log.contact_no ? 'Profile Updates' : 'No changes'}
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
                          {log.admin_user?.name || 'Admin'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {log.admin_user?.email || ''}
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
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[95vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-blue-900">
                Fund Request Details
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
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
            </div>
            <div className="p-6 border-t border-gray-200">
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
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[95vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-blue-900">
                Profile Update Request Details
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {/* User Info */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-gray-800">
                  <strong className="text-gray-900">Request ID:</strong> {selectedProfileLog.id}
                </div>
                <div className="text-gray-800">
                  <strong className="text-gray-900">Request Date:</strong> {new Date(selectedProfileLog.created_at).toLocaleString()}
                </div>
                <div className="text-gray-800">
                  <strong className="text-gray-900">User:</strong> {selectedProfileLog.users?.full_name}
                </div>
                <div className="text-gray-800">
                  <strong className="text-gray-900">Email:</strong> {selectedProfileLog.users?.email}
                </div>
                <div className="col-span-2 text-gray-800">
                  <strong className="text-gray-900">Status:</strong> <StatusBadge status={selectedProfileLog.status} />
                </div>
                {selectedProfileLog.updated_at && (
                  <div className="text-gray-800">
                    <strong className="text-gray-900">Action Date:</strong> {new Date(selectedProfileLog.updated_at).toLocaleString()}
                  </div>
                )}
                {selectedProfileLog.admin_user && (
                  <div className="text-gray-800">
                    <strong className="text-gray-900">Action By:</strong> {selectedProfileLog.admin_user?.name} ({selectedProfileLog.admin_user?.email})
                  </div>
                )}
              </div>

              {/* Changes Comparison */}
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                Requested Changes
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Current Profile */}
                <div>
                  <h5 className="font-semibold text-gray-900 mb-3 text-lg">Original Profile</h5>
                  <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="text-gray-800">
                      <strong className="text-gray-900 block text-sm">Name:</strong>
                      <span className="text-gray-700">{selectedProfileLog.users?.full_name || 'N/A'}</span>
                    </div>
                    <div className="text-gray-800">
                      <strong className="text-gray-900 block text-sm">Address:</strong>
                      <span className="text-gray-700">{selectedProfileLog.users?.address || 'N/A'}</span>
                    </div>
                    <div className="text-gray-800">
                      <strong className="text-gray-900 block text-sm">Contact:</strong>
                      <span className="text-gray-700">{selectedProfileLog.users?.contact_no || 'N/A'}</span>
                    </div>
                    <div className="text-gray-800">
                      <strong className="text-gray-900 block text-sm">Position:</strong>
                      <span className="text-gray-700">{selectedProfileLog.users?.position || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Requested Changes */}
                <div>
                  <h5 className="font-semibold text-gray-900 mb-3 text-lg">Requested Changes</h5>
                  <div className="space-y-3 bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div>
                      <strong className="text-gray-900 block text-sm">Name:</strong>
                      <span className={selectedProfileLog.full_name ? "text-green-700 font-medium" : "text-gray-600"}>
                        {selectedProfileLog.full_name || 'No change'}
                      </span>
                    </div>
                    <div>
                      <strong className="text-gray-900 block text-sm">Address:</strong>
                      <span className={selectedProfileLog.address ? "text-green-700 font-medium" : "text-gray-600"}>
                        {selectedProfileLog.address || 'No change'}
                      </span>
                    </div>
                    <div>
                      <strong className="text-gray-900 block text-sm">Contact:</strong>
                      <span className={selectedProfileLog.contact_no ? "text-green-700 font-medium" : "text-gray-600"}>
                        {selectedProfileLog.contact_no || 'No change'}
                      </span>
                    </div>
                    <div>
                      <strong className="text-gray-900 block text-sm">Position:</strong>
                      <span className={selectedProfileLog.position ? "text-green-700 font-medium" : "text-gray-600"}>
                        {selectedProfileLog.position || 'No change'}
                      </span>
                    </div>
                    {selectedProfileLog.photo_url && (
                      <div>
                        <strong className="text-gray-900 block text-sm mb-2">New Profile Image:</strong>
                        <img 
                          src={selectedProfileLog.photo_url} 
                          alt="Requested profile" 
                          className="w-24 h-24 rounded-full border-2 border-blue-300 object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h5 className="font-semibold text-yellow-800 mb-2">Note:</h5>
                <p className="text-yellow-700 text-sm">
                  This request was {selectedProfileLog.status?.toLowerCase()} by {selectedProfileLog.admin_user?.name || 'an admin '} 
                  on {selectedProfileLog.updated_at ? new Date(selectedProfileLog.updated_at).toLocaleString() : 'unknown date'}.
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
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