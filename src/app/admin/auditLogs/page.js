'use client';
import React, { useEffect, useState } from 'react';
import supabase from '../../../supabaseClient';
import { useRouter } from 'next/navigation';
import { 
  Archive, 
  Delete, 
  Edit, 
  Plus, 
  LogIn, 
  LogOut, 
  CheckCircle, 
  XCircle, 
  Calendar,
  RefreshCw,
  Filter,
  Search
} from 'lucide-react';

const AuditLogsPage = () => {
  const router = useRouter();
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [selectedModule, setSelectedModule] = useState('All');
  const [selectedAction, setSelectedAction] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

 useEffect(() => {
         const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
         if (!currentUser) {
           router.push("/");
           return;
         }
         setCurrentAdmin(currentUser);
       }, [router]);

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, selectedModule, selectedAction, searchTerm]);

  const fetchLogs = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        log_id,
        action,
        table_name,
        description,
        created_at,
        users (full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching logs:', error);
    } else {
      setLogs(data);
    }
    setIsLoading(false);
  };

  const filterLogs = () => {
    let filtered = logs;

    // Filter by module
    if (selectedModule !== 'All') {
      filtered = filtered.filter(log => log.table_name === selectedModule);
    }

    // Filter by action
    if (selectedAction !== 'All') {
      filtered = filtered.filter(log => log.action === selectedAction);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(log => 
        log.users?.full_name?.toLowerCase().includes(term) ||
        log.description?.toLowerCase().includes(term) ||
        log.action?.toLowerCase().includes(term) ||
        log.table_name?.toLowerCase().includes(term)
      );
    }

    setFilteredLogs(filtered);
  };

  const getActionIcon = (action) => {
    const iconConfig = {
      'Login': <LogIn size={16} />,
      'Logout': <LogOut size={16} />,
      'Add': <Plus size={16} />,
      'Edit': <Edit size={16} />,
      'Archive': <Archive size={16} />,
      'Delete': <Delete size={16} />,
      'Restored': <RefreshCw size={16} />,
      'Approve': <CheckCircle size={16} />,
      'Decline': <XCircle size={16} />,
      'Scheduled': <Calendar size={16} />,
      'Completed': <CheckCircle size={16} />,
      'Cancelled': <XCircle size={16} />,
    };
    return iconConfig[action] || null;
  };

  const getActionBadge = (action) => {
    const badgeConfig = {
      'Login': 'bg-blue-50 text-blue-700 border border-blue-200',
      'Logout': 'bg-gray-50 text-gray-700 border border-gray-200',
      'Add': 'bg-green-50 text-green-700 border border-green-200',
      'Edit': 'bg-yellow-50 text-yellow-700 border border-yellow-200',
      'Archive': 'bg-orange-50 text-orange-700 border border-orange-200',
      'Delete': 'bg-red-50 text-red-700 border border-red-200',
      'Restored': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      'Approve': 'bg-teal-50 text-teal-700 border border-teal-200',
      'Decline': 'bg-rose-50 text-rose-700 border border-rose-200',
      'Scheduled': 'bg-purple-50 text-purple-700 border border-purple-200',
      'Completed': 'bg-indigo-50 text-indigo-700 border border-indigo-200',
      'Cancelled': 'bg-red-50 text-red-700 border border-red-200',
    };
    return badgeConfig[action] || 'bg-gray-50 text-gray-700 border border-gray-200';
  };

  const getModuleBadge = (module) => {
    const moduleConfig = {
      'users': 'bg-purple-50 text-purple-700 border border-purple-200',
      'maintenance': 'bg-blue-50 text-blue-700 border border-blue-200',
      'inventory': 'bg-green-50 text-green-700 border border-green-200',
      'trucks': 'bg-orange-50 text-orange-700 border border-orange-200',
      'mechanics': 'bg-cyan-50 text-cyan-700 border border-cyan-200',
      'maintenance_logs': 'bg-indigo-50 text-indigo-700 border border-indigo-200',
      'default': 'bg-gray-50 text-gray-700 border border-gray-200'
    };

    const moduleKey = module?.toLowerCase();
    return moduleConfig[moduleKey] || moduleConfig.default;
  };

  // Get unique modules and actions for filters
  const modules = ['All', ...new Set(logs.map(log => log.table_name).filter(Boolean))];
  const actions = ['All', ...new Set(logs.map(log => log.action).filter(Boolean))];

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6">
  <div className="max-w-7xl mx-auto">
    {/* Header Section */}
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600 mt-2">Track all system activities and user actions</p>
        </div>
        
        <button
          onClick={fetchLogs}
          className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
        >
          <RefreshCw size={16} className="mr-2" />
          Refresh
        </button>
      </div>
    </div>

    {/* Filters Section */}
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex flex-col lg:flex-row gap-4 items-end">
        {/* Search */}
        <div className="flex-1 min-w-0">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
            Search
          </label>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <input 
              type="text"
              id="search"
              placeholder="Search by user, description, or action..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-gray-700 placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Module Filter */}
        <div className="w-full lg:w-48">
          <label htmlFor="module-filter" className="block text-sm font-medium text-gray-700 mb-2">
            Module
          </label>
          <select 
            id="module-filter"
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-gray-700"
          >
            {modules.map(module => (
              <option key={module} value={module} className="text-gray-700">
                {module === 'All' ? 'All Modules' : module}
              </option>
            ))}
          </select>
        </div>

        {/* Action Filter */}
        <div className="w-full lg:w-48">
          <label htmlFor="action-filter" className="block text-sm font-medium text-gray-700 mb-2">
            Action
          </label>
          <select
            id="action-filter"
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-gray-700"
          >
            {actions.map(action => (
              <option key={action} value={action} className="text-gray-700">
                {action === 'All' ? 'All Actions' : action}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">{logs.length}</div>
            <div className="text-sm text-gray-600">Total Logs</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">
              {new Set(logs.map(log => log.users?.full_name).filter(Boolean)).size}
            </div>
            <div className="text-sm text-gray-600">Active Users</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">
              {new Set(logs.map(log => log.table_name).filter(Boolean)).size}
            </div>
            <div className="text-sm text-gray-600">Modules</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">
              {new Set(logs.map(log => log.action).filter(Boolean)).size}
            </div>
            <div className="text-sm text-gray-600">Action Types</div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Module
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((log) => (
                      <tr key={log.log_id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-medium">
                            {formatDateTime(log.created_at)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {log.users?.full_name || 'Unknown User'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${getActionBadge(log.action)}`}>
                            {getActionIcon(log.action)}
                            {log.action}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getModuleBadge(log.table_name)}`}>
                            {log.table_name}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-700 max-w-md">
                            {log.description}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center">
                        <div className="text-gray-400 mb-4">
                          <Filter size={48} className="mx-auto" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No audit logs found</h3>
                        <p className="text-gray-600">
                          {searchTerm || selectedModule !== 'All' || selectedAction !== 'All' 
                            ? 'Try adjusting your filters or search terms.' 
                            : 'No audit logs have been recorded yet.'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Info */}
        {filteredLogs.length > 0 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Showing {filteredLogs.length} of {logs.length} audit logs
              {(selectedModule !== 'All' || selectedAction !== 'All' || searchTerm) && ' (filtered)'}
            </p>
          </div>
        )}
      </div>
    </main>
  );
};

export default AuditLogsPage;