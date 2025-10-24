'use client';

import React, { useState, useEffect } from 'react';
import supabase from '../../../supabaseClient';
import { useRouter } from 'next/navigation';

const InventoryPage = () => {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load current user
  useEffect(() => {
          const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
          if (!currentUser) {
            router.push("/");
            return;
          }
          setCurrentUser(currentUser);
        }, [router]);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('is_archived', false)
      .order('category', { ascending: true })
      .order('item_name', { ascending: true });

    if (error) {
      console.error('Error fetching inventory:', error);
    } else {
      setItems(data);
    }
    setLoading(false);
  };

  // Group items by item_name + category for display
  const groupedItems = items.reduce((acc, item) => {
    const key = `${item.item_name}-${item.category}`;
    if (!acc[key]) {
      acc[key] = {
        item_name: item.item_name,
        category: item.category,
        quantity: 0,
        item_id: item.item_id,
      };
    }
    acc[key].quantity += item.quantity;
    return acc;
  }, {});

  const displayItems = Object.values(groupedItems).map((item) => {
    let status = 'In Stock';
    let statusColor = 'bg-green-100 text-green-800';
    if (item.quantity === 0) {
      status = 'Out of Stock';
      statusColor = 'bg-red-100 text-red-800';
    } else if (item.quantity < 5) {
      status = 'Low Stock';
      statusColor = 'bg-yellow-100 text-yellow-800';
    }
    return {
      ...item,
      status,
      statusColor,
    };
  });

  const categories = [...new Set(items.map((item) => item.category))].filter(Boolean);

  return (
    <main className="flex-1 p-6 bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Inventory Overview</h2>
        <p className="text-gray-600">View inventory items and stock levels</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-50 text-green-600 mr-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Total Items</h3>
              <p className="text-gray-600 text-sm">{displayItems.length} active items</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-50 text-blue-600 mr-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Categories</h3>
              <p className="text-gray-600 text-sm">{categories.length} categories</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-50 text-purple-600 mr-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Inventory Status</h3>
              <p className="text-gray-600 text-sm">Real-time overview</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Table Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h3 className="text-xl font-semibold text-gray-800">Inventory Items</h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-4 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                <th className="py-4 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="py-4 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="py-4 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="py-4 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-8 px-6 text-center text-gray-500">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                    <p className="mt-2">Loading inventory...</p>
                  </td>
                </tr>
              ) : displayItems.filter((item) => !categoryFilter || item.category === categoryFilter).length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 px-6 text-center text-gray-500">
                    No inventory items found
                  </td>
                </tr>
              ) : (
                displayItems
                  .filter((item) => !categoryFilter || item.category === categoryFilter)
                  .map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6 text-sm font-medium text-gray-900">{item.item_name}</td>
                      <td className="py-4 px-6 text-sm text-gray-700">{item.category}</td>
                      <td className="py-4 px-6 text-sm text-gray-700 font-semibold">{item.quantity}</td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${item.statusColor}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-500 font-mono">{item.item_id}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

export default InventoryPage;