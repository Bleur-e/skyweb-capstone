'use client';

import React, { useState, useEffect } from 'react';
import supabase from '../../../supabaseClient';
import { useRouter } from 'next/navigation';

const InventoryPage = () => {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);

  // For Add Item Modal
  const [addCategory, setAddCategory] = useState('');
  const [addItemName, setAddItemName] = useState('');
  const [addQuantity, setAddQuantity] = useState(0);

  // For Edit Stock Modal - UPDATED
  const [editCategory, setEditCategory] = useState('');
  const [editItemId, setEditItemId] = useState('');
  const [editQuantity, setEditQuantity] = useState(0);
  const [editAction, setEditAction] = useState('reduce'); // 'reduce' or 'add'
  const [selectedItemCurrentQty, setSelectedItemCurrentQty] = useState(0);

  // For Archive Item Modal
  const [archiveItemId, setArchiveItemId] = useState('');
  const [archiveItemName, setArchiveItemName] = useState('');
  const [archiveCategory, setArchiveCategory] = useState('');

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

  // Helper for logging actions
  const logAction = async (user, action, tableName, description) => {
    if (!user) return;
    const { error } = await supabase.from('audit_logs').insert([
      {
        user_id: user.id,
        role: user.role,
        action,
        table_name: tableName,
        description,
      },
    ]);
    if (error) console.error('Error logging action:', error);
  };

  // NEW: Send notification function
  const sendNotification = async (message, type, userId = null, role = null) => {
    const { error } = await supabase.from('notifications').insert([
      {
        message,
        type,
        user_id: userId,
        role: role,
        created_at: new Date().toISOString(),
        read_by: []
      },
    ]);
    
    if (error) {
      console.error('Error sending notification:', error);
    }
  };

  // NEW: Check and send stock alerts
  const checkStockAlerts = async (itemName, category, newQuantity, previousQuantity) => {
    // Send alert for out of stock
    if (previousQuantity > 0 && newQuantity === 0) {
      const message = `Item ${itemName} (${category}) is now out of stock!`;
      await sendNotification(message, 'out_of_stock', null, 'admin');
      await sendNotification(message, 'out_of_stock', currentUser?.id, null);
    }
    // Send alert for low stock (below 5)
    else if (previousQuantity >= 5 && newQuantity < 5 && newQuantity > 0) {
      const message = `Item ${itemName} (${category}) is running low on stock! Current quantity: ${newQuantity}`;
      await sendNotification(message, 'low_stock', null, 'admin');
      await sendNotification(message, 'low_stock', currentUser?.id, null);
    }
    // Send alert for stock restored
    else if (previousQuantity === 0 && newQuantity > 0) {
      const message = `Item ${itemName} (${category}) is back in stock! Current quantity: ${newQuantity}`;
      await sendNotification(message, 'stock_restored', null, 'admin');
      await sendNotification(message, 'stock_restored', currentUser?.id, null);
    }
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

  // Add Item Modal Logic
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addCategory || !addItemName || addQuantity <= 0) {
      alert('Please select category, item name, and enter a valid quantity.');
      return;
    }

    const { data: existingItemById, error: fetchError } = await supabase
      .from('inventory')
      .select('*')
      .eq('item_name', addItemName)
      .eq('category', addCategory)
      .eq('is_archived', false)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error checking for existing item:', fetchError);
      alert('Error checking for existing item.');
      return;
    }

    if (existingItemById) {
      const previousQuantity = existingItemById.quantity;
      const newQuantity = existingItemById.quantity + Number(addQuantity);
      
      // Check stock limit
      if (newQuantity > 100) {
        alert(`Stock cannot exceed 100 units. Current: ${previousQuantity}, Trying to add: ${addQuantity}`);
        return;
      }

      const { error: updateError } = await supabase
        .from('inventory')
        .update({ quantity: newQuantity })
        .eq('item_id', existingItemById.item_id);

      if (updateError) {
        console.error('Error updating item quantity:', updateError);
        alert('Error updating item quantity.');
        return;
      }

      // Check for stock alerts
      await checkStockAlerts(existingItemById.item_name, existingItemById.category, newQuantity, previousQuantity);

      await logAction(
        currentUser,
        'Edit',
        'inventory',
        `Increased stock of ${existingItemById.item_name} (${existingItemById.category}) by ${addQuantity}. New qty: ${newQuantity}`
      );
    } else {
      // Check stock limit for new item
      if (Number(addQuantity) > 100) {
        alert(`Stock cannot exceed 100 units. Trying to add: ${addQuantity}`);
        return;
      }

      const newItemId = `${addCategory.substring(0, 3).toUpperCase()}-${Math.floor(
        Math.random() * 10000
      )
        .toString()
        .padStart(4, '0')}`;

      const { error: insertError } = await supabase.from('inventory').insert([
        {
          item_id: newItemId,
          item_name: addItemName,
          category: addCategory,
          quantity: Number(addQuantity),
          is_archived: false,
        },
      ]);

      if (insertError) {
        console.error('Error inserting new item:', insertError);
        alert('Error inserting new item.');
        return;
      }

      await logAction(
        currentUser,
        'Add',
        'inventory',
        `Added new item ${addItemName} (${addCategory}) with qty ${addQuantity}.`
      );
    }

    setShowAddModal(false);
    setAddCategory('');
    setAddItemName('');
    setAddQuantity(0);
    fetchInventory();
  };

  // UPDATED: Edit Stock Modal Logic
  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!editItemId) {
      alert('Please select an item to edit.');
      return;
    }

    const quantityChange = Number(editQuantity);
    if (quantityChange <= 0) {
      alert('Please enter a valid quantity.');
      return;
    }

    const { data: existingItem, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('item_id', editItemId)
      .single();

    if (error || !existingItem) {
      console.error('Error fetching item for edit:', error);
      alert('Item not found or an error occurred.');
      return;
    }

    const previousQuantity = existingItem.quantity;
    let newQty;

    if (editAction === 'reduce') {
      if (existingItem.quantity < quantityChange) {
        alert(`Not enough stock to reduce. Current quantity: ${existingItem.quantity}`);
        return;
      }
      newQty = existingItem.quantity - quantityChange;
    } else { // add action
      newQty = existingItem.quantity + quantityChange;
      
      // Check stock limit
      if (newQty > 100) {
        alert(`Stock cannot exceed 100 units. Current: ${existingItem.quantity}, Trying to add: ${quantityChange}`);
        return;
      }
    }

    const { error: updateError } = await supabase
      .from('inventory')
      .update({ quantity: newQty })
      .eq('item_id', existingItem.item_id);

    if (updateError) {
      console.error('Error updating item quantity:', updateError);
      alert('Error updating item quantity.');
      return;
    }

    // Check for stock alerts
    await checkStockAlerts(existingItem.item_name, existingItem.category, newQty, previousQuantity);

    const actionText = editAction === 'reduce' ? 'Reduced' : 'Increased';
    await logAction(
      currentUser,
      'Edit',
      'inventory',
      `${actionText} stock of ${existingItem.item_name} (${existingItem.category}) from ${previousQuantity} to ${newQty}.`
    );

    setShowEditModal(false);
    setEditCategory('');
    setEditItemId('');
    setEditQuantity(0);
    setEditAction('reduce');
    setSelectedItemCurrentQty(0);
    fetchInventory();
  };

  // NEW: Handle item selection in edit modal
  const handleEditItemSelect = (itemId) => {
    setEditItemId(itemId);
    const selectedItem = items.find(item => item.item_id === itemId);
    if (selectedItem) {
      setSelectedItemCurrentQty(selectedItem.quantity);
    }
  };

  // Archive Item Logic
  const handleArchiveItem = async (itemId, itemName, category) => {
    setArchiveItemId(itemId);
    setArchiveItemName(itemName);
    setArchiveCategory(category);
    setShowArchiveModal(true);
  };

  const confirmArchive = async () => {
    if (!archiveItemId) return;

    const { error } = await supabase
      .from('inventory')
      .update({ 
        is_archived: true,
        archived_at: new Date().toISOString()
      })
      .eq('item_id', archiveItemId);

    if (error) {
      console.error('Error archiving item:', error);
      alert('Error archiving item.');
      return;
    }

    await logAction(
      currentUser,
      'Archive',
      'inventory',
      `Archived item ${archiveItemName} (${archiveCategory}).`
    );

    setShowArchiveModal(false);
    setArchiveItemId('');
    setArchiveItemName('');
    setArchiveCategory('');
    fetchInventory();
  };

  const cancelArchive = () => {
    setShowArchiveModal(false);
    setArchiveItemId('');
    setArchiveItemName('');
    setArchiveCategory('');
  };

  return (
    <main className="flex-1 p-6 bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Inventory Management</h2>
        <p className="text-gray-600">Manage your inventory items and stock levels</p>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-50 text-green-600 mr-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Add Items</h3>
              <p className="text-gray-600 text-sm">Add new inventory items</p>
            </div>
          </div>
          <button
            className="w-full mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
            onClick={() => setShowAddModal(true)}
          >
            Add Items
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-50 text-blue-600 mr-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Adjust Stock</h3>
              <p className="text-gray-600 text-sm">Update item quantities</p>
            </div>
          </div>
          <button
            className="w-full mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            onClick={() => setShowEditModal(true)}
          >
            Edit Stock
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-50 text-purple-600 mr-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Inventory Status</h3>
              <p className="text-gray-600 text-sm">{displayItems.length} active items</p>
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
                <th className="py-4 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                      <td className="py-4 px-6">
                        <button
                          className="text-purple-600 hover:text-purple-800 text-sm font-medium transition-colors"
                          onClick={() =>
                            handleArchiveItem(item.item_id, item.item_name, item.category)
                          }
                        >
                          Archive
                        </button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 backdrop-blur-md bg-gray-900/20 flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">Add New Item</h3>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={addCategory}
                  onChange={(e) => {
                    setAddCategory(e.target.value);
                    setAddItemName('');
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Item Name</label>
                <input
                  type="text"
                  value={addItemName}
                  onChange={(e) => setAddItemName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity to Add
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={addQuantity}
                  onChange={(e) => setAddQuantity(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Maximum stock limit: 100 units</p>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATED: Edit Stock Modal */}
      {showEditModal && (
        <div className="fixed inset-0 backdrop-blur-md bg-gray-900/20 flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">Adjust Stock Level</h3>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => {
                    setEditCategory(e.target.value);
                    setEditItemId('');
                    setSelectedItemCurrentQty(0);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Item to Edit</label>
                <select
                  value={editItemId}
                  onChange={(e) => handleEditItemSelect(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={!editCategory}
                >
                  <option value="">Select Item</option>
                  {items
                    .filter((it) => it.category === editCategory)
                    .map((it) => (
                      <option key={it.item_id} value={it.item_id}>
                        {it.item_name} (Current: {it.quantity})
                      </option>
                    ))}
                </select>
              </div>

              {editItemId && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-700">
                    Current Stock: <span className="font-semibold">{selectedItemCurrentQty}</span> units
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum allowed stock: 100 units
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="reduce"
                      checked={editAction === 'reduce'}
                      onChange={(e) => setEditAction(e.target.value)}
                      className="mr-2 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Reduce Stock</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="add"
                      checked={editAction === 'add'}
                      onChange={(e) => setEditAction(e.target.value)}
                      className="mr-2 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Add Stock</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity to {editAction === 'reduce' ? 'Reduce' : 'Add'}
                </label>
                <input
                  type="number"
                  min="1"
                  max={editAction === 'add' ? (100 - selectedItemCurrentQty) : selectedItemCurrentQty}
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {editAction === 'add' 
                    ? `Can add up to ${100 - selectedItemCurrentQty} units (max: 100)` 
                    : `Can reduce up to ${selectedItemCurrentQty} units`}
                </p>
              </div>

              {editItemId && editQuantity > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-700 font-medium">
                    New stock will be: {editAction === 'reduce' 
                      ? selectedItemCurrentQty - Number(editQuantity) 
                      : selectedItemCurrentQty + Number(editQuantity)} units
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditCategory('');
                    setEditItemId('');
                    setEditQuantity(0);
                    setEditAction('reduce');
                    setSelectedItemCurrentQty(0);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 backdrop-blur-md bg-gray-900/20 flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">Archive Item</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Are you sure you want to archive <strong>{archiveItemName}</strong> from <strong>{archiveCategory}</strong>?
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Archived items will be removed from active inventory but preserved in the system records.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelArchive}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmArchive}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  Archive Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default InventoryPage;