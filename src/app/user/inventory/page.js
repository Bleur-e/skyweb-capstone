'use client';

import React, { useState, useEffect } from 'react';
import supabase from '../../../supabaseClient';

const InventoryPage = () => {
  const [items, setItems] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // For Add Item Modal
  const [addCategory, setAddCategory] = useState('');
  const [addItemName, setAddItemName] = useState('');
  const [addQuantity, setAddQuantity] = useState(0);

  // For Edit Stock Modal
  const [editCategory, setEditCategory] = useState('');
  const [editItemId, setEditItemId] = useState('');
  const [editQuantity, setEditQuantity] = useState(0);

  // Load current user
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('currentUser'));
    if (storedUser) setCurrentUser(storedUser);
  }, []);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    const { data, error } = await supabase.from('inventory').select('*');
    if (error) {
      console.error('Error fetching inventory:', error);
    } else {
      setItems(data);
    }
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
    let statusColor = 'text-green-500';
    if (item.quantity === 0) {
      status = 'Out of Stock';
      statusColor = 'text-red-500';
    } else if (item.quantity < 5) {
      status = 'Low Stock';
      statusColor = 'text-yellow-500';
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
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error checking for existing item:', fetchError);
      alert('Error checking for existing item.');
      return;
    }

    if (existingItemById) {
      const { error: updateError } = await supabase
        .from('inventory')
        .update({ quantity: existingItemById.quantity + Number(addQuantity) })
        .eq('item_id', existingItemById.item_id);

      if (updateError) {
        console.error('Error updating item quantity:', updateError);
        alert('Error updating item quantity.');
        return;
      }

      await logAction(
        currentUser,
        'Edit',
        'inventory',
        `Increased stock of ${existingItemById.item_name} (${existingItemById.category}) by ${addQuantity}. New qty: ${existingItemById.quantity + Number(addQuantity)}`
      );
    } else {
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

  // Edit Stock Modal Logic
  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!editItemId) {
      alert('Please select an item to edit.');
      return;
    }

    const reduceQty = Number(editQuantity);
    if (reduceQty <= 0) {
      alert('Please enter a valid quantity to reduce.');
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

    if (existingItem.quantity < reduceQty) {
      alert(`Not enough stock. Current quantity: ${existingItem.quantity}`);
      return;
    }

    const newQty = existingItem.quantity - reduceQty;

    const { error: updateError } = await supabase
      .from('inventory')
      .update({ quantity: newQty })
      .eq('item_id', existingItem.item_id);

    if (updateError) {
      console.error('Error updating item quantity:', updateError);
      alert('Error updating item quantity.');
      return;
    }

    await logAction(
      currentUser,
      'Edit',
      'inventory',
      `Reduced stock of ${existingItem.item_name} (${existingItem.category}) from ${existingItem.quantity} to ${newQty}.`
    );

    setShowEditModal(false);
    setEditCategory('');
    setEditItemId('');
    setEditQuantity(0);
    fetchInventory();
  };

  // Delete Item Logic
  const handleDeleteItem = async (itemId, itemName, category) => {
    if (!window.confirm(`Delete ${itemName} (${category})?`)) return;

    const { error } = await supabase.from('inventory').delete().eq('item_id', itemId);
    if (error) {
      console.error('Error deleting item:', error);
      alert('Error deleting item.');
      return;
    }

    await logAction(
      currentUser,
      'Delete',
      'inventory',
      `Deleted item ${itemName} (${category}).`
    );

    fetchInventory();
  };

  return (
    <main className="flex-1 p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-4">Inventory</h2>
      <p className="text-gray-600 mb-6">Manage your inventory system here.</p>

      {/* Action Buttons */}
      <div className="mb-4 flex space-x-4">
        <button
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          onClick={() => setShowAddModal(true)}
        >
          Add Items
        </button>
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          onClick={() => setShowEditModal(true)}
        >
          Edit Stock
        </button>
      </div>

      {/* Category Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Filter by Category</label>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="mt-1 block w-64 px-4 py-2 border border-gray-300 rounded-md text-gray-700"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Inventory Table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6 text-left">Item</th>
              <th className="py-3 px-6 text-left">Category</th>
              <th className="py-3 px-6 text-left">Quantity</th>
              <th className="py-3 px-6 text-left">Status</th>
              <th className="py-3 px-6 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm font-light">
            {displayItems
              .filter((item) => !categoryFilter || item.category === categoryFilter)
              .map((item, index) => (
                <tr key={index} className="border-b border-gray-200 hover:bg-gray-100">
                  <td className="py-3 px-6 text-left">{item.item_name}</td>
                  <td className="py-3 px-6 text-left">{item.category}</td>
                  <td className="py-3 px-6 text-left">{item.quantity}</td>
                  <td className={`py-3 px-6 text-left ${item.statusColor}`}>
                    {item.status}
                  </td>
                  <td className="py-3 px-6">
                    <button
                      className="text-red-600 hover:underline"
                      onClick={() =>
                        handleDeleteItem(item.item_id, item.item_name, item.category)
                      }
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4 text-green-700">Add Item</h3>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={addCategory}
                  onChange={(e) => {
                    setAddCategory(e.target.value);
                    setAddItemName('');
                  }}
                  className="w-full border rounded px-3 py-2 text-gray-700"
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
                <label className="block text-sm font-medium text-gray-700">Item Name</label>
                <input
                  type="text"
                  value={addItemName}
                  onChange={(e) => setAddItemName(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-gray-700"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Quantity to Add
                </label>
                <input
                  type="number"
                  min="1"
                  value={addQuantity}
                  onChange={(e) => setAddQuantity(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-gray-700"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Stock Modal */}
      {showEditModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4 text-blue-700">Edit Stock</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => {
                    setEditCategory(e.target.value);
                    setEditItemId('');
                  }}
                  className="w-full border rounded px-3 py-2 text-gray-700"
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
                <label className="block text-sm font-medium text-gray-700">Item to Edit</label>
                <select
                  value={editItemId}
                  onChange={(e) => setEditItemId(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-gray-700"
                  required
                  disabled={!editCategory}
                >
                  <option value="">Select Item</option>
                  {items
                    .filter((it) => it.category === editCategory)
                    .map((it) => (
                      <option key={it.item_id} value={it.item_id}>
                        {it.item_name} (ID: {it.item_id}, Current Qty: {it.quantity})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Quantity to Reduce
                </label>
                <input
                  type="number"
                  min="1"
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-gray-700"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default InventoryPage;
