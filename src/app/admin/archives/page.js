'use client';

import React, { useEffect, useState } from 'react';
import supabase from '../../../supabaseClient';
import { useRouter } from 'next/navigation';

export default function ArchivePage() {
  const router = useRouter();
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [activeTab, setActiveTab] = useState('trucks');
  const [data, setData] = useState({
    trucks: [],
    drivers: [],
    mechanics: [],
    inventory: [],
    accounts: [],
  });
  const [loading, setLoading] = useState(true);

  // Get current admin user
  useEffect(() => {
           const currentAdmin = JSON.parse(sessionStorage.getItem("currentUser"));
           if (!currentAdmin) {
             router.push("/");
             return;
           }
           setCurrentAdmin(currentAdmin);
         }, [router]);

  // Fetch all archived items
  useEffect(() => {
    fetchArchivedItems();
  }, []);

  async function fetchArchivedItems() {
    setLoading(true);
    const [trucks, drivers, mechanics, inventory, accounts] = await Promise.all([
      supabase.from('trucks').select('*').eq('is_archived', true),
      supabase.from('drivers').select('*').eq('is_archived', true),
      supabase.from('mechanics').select('*').eq('is_archived', true),
      supabase.from('inventory').select('*').eq('is_archived', true),
      supabase.from('users').select('*').eq('is_archived', true),
    ]);

    setData({
      trucks: trucks.data || [],
      drivers: drivers.data || [],
      mechanics: mechanics.data || [],
      inventory: inventory.data || [],
      accounts: accounts.data || [],
    });
    setLoading(false);
  }

  // Restore archived item
  async function handleRestore(table, idField, id) {
    // Map the tab name to actual table name
    const actualTableName = table === 'accounts' ? 'users' : table;
    
    const { error } = await supabase
      .from(actualTableName)
      .update({ is_archived: false, archived_at: null })
      .eq(idField, id);
    
    if (error) {
      alert(`❌ Failed to restore from ${table}: ${error.message}`);
      return;
    }
    alert('✅ Item restored successfully!');
    fetchArchivedItems();
  }

  // Permanently delete item
  async function handleDelete(table, idField, id) {
    // Map the tab name to actual table name
    const actualTableName = table === 'accounts' ? 'users' : table;
    
    const confirmDelete = confirm(
      `⚠️ Are you sure you want to permanently delete this ${table.slice(0, -1)}? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    const { error } = await supabase.from(actualTableName).delete().eq(idField, id);
    if (error) {
      alert(`❌ Failed to delete from ${table}: ${error.message}`);
      return;
    }
    alert('🗑️ Item permanently deleted.');
    fetchArchivedItems();
  }

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 text-lg">Loading archived records...</p>
        </div>
      </div>
    );

  const tabs = [
    { key: 'trucks', label: 'Trucks', count: data.trucks.length },
    { key: 'drivers', label: 'Drivers', count: data.drivers.length },
    { key: 'mechanics', label: 'Mechanics', count: data.mechanics.length },
    { key: 'inventory', label: 'Inventory', count: data.inventory.length },
    { key: 'accounts', label: 'Accounts', count: data.accounts.length },
  ];

  // Helper function to get the correct table name and ID field
  const getTableInfo = (tab) => {
    switch (tab) {
      case 'trucks':
        return { table: 'trucks', idField: 'plate_number' };
      case 'drivers':
        return { table: 'drivers', idField: 'driver_id' };
      case 'mechanics':
        return { table: 'mechanics', idField: 'mechanic_id' };
      case 'inventory':
        return { table: 'inventory', idField: 'item_id' };
      case 'accounts':
        return { table: 'users', idField: 'id' }; // Use 'users' table and 'id' field
      default:
        return { table: tab, idField: 'id' };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Archive Management</h1>
          </div>
          <p className="text-gray-600">Manage and restore archived items from your system</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 mb-6">
          <div className="flex gap-1 flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === tab.key
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  activeTab === tab.key 
                    ? 'bg-blue-200 text-blue-800' 
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {data[activeTab].length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No archived {activeTab} found</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                There are currently no {activeTab} in the archive. Items will appear here when they are archived.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {activeTab === 'accounts' ? 'Username' : 'ID / Plate'}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {activeTab === 'trucks' ? 'Brand' : 
                       activeTab === 'inventory' ? 'Item Name' : 
                       activeTab === 'accounts' ? 'Role' : 'Name'}
                    </th>
                    {activeTab === 'accounts' && (
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                    )}
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Archived At
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data[activeTab].map((item) => {
                    const { table: actualTable, idField } = getTableInfo(activeTab);
                    const itemId = item.plate_number || item.driver_id || item.mechanic_id || item.item_id || item.id;
                    
                    return (
                      <tr key={itemId} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {item.plate_number || item.driver_id || item.mechanic_id || item.item_id || item.username}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm ${
                            activeTab === 'accounts' 
                              ? 'px-2 py-1 rounded-full text-xs font-medium ' + 
                                (item.role === 'admin' 
                                  ? 'bg-purple-100 text-purple-800' 
                                  : 'bg-blue-100 text-blue-800')
                              : 'text-gray-700'
                          }`}>
                            {item.brand || item.name || item.item_name || item.role || '—'}
                          </span>
                        </td>
                        {activeTab === 'accounts' && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-700">
                              {item.email || '—'}
                            </span>
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-500">
                            {item.archived_at ? new Date(item.archived_at).toLocaleString() : '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRestore(activeTab, idField, itemId)}
                              className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors duration-200 border border-green-200"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Restore
                            </button>
                            <button
                              onClick={() => handleDelete(activeTab, idField, itemId)}
                              className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors duration-200 border border-red-200"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stats Footer */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-4">
          {tabs.map((tab) => (
            <div key={tab.key} className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{tab.count}</div>
              <div className="text-sm text-gray-500">Archived {tab.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}