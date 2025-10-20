'use client';

import React, { useState, useEffect } from 'react';
import supabase from '../../../supabaseClient';

const UserRequestPage = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [trucks, setTrucks] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [categoryList, setCategoryList] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [request, setRequest] = useState({
    plate_number: '',
    estimated_cost: '',
    reason: '',
    photo_url: ''
  });

  const [photoFile, setPhotoFile] = useState(null);

  const [items, setItems] = useState([
    { category: '', item_name: '', item_id: '', quantity: 1 }
  ]);

  // Load current user
  useEffect(() => {
    const storedUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (storedUser) {
      setCurrentUser(storedUser);
    }
  }, []);

  // Fetch trucks & inventory - Filter out archived trucks
  useEffect(() => {
    const fetchData = async () => {
      // Only fetch non-archived trucks
      const { data: truckData } = await supabase
        .from('trucks')
        .select('plate_number')
        .eq('is_archived', false) // Assuming you have an is_archived column
        .order('plate_number');
      
      if (truckData) setTrucks(truckData);

      const { data: invData } = await supabase
        .from('inventory')
        .select('*')
        .order('category');
      
      if (invData) {
        setInventory(invData);
        setCategoryList([...new Set(invData.map(item => item.category))].sort());
      }
    };
    fetchData();
  }, []);

  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    const newItems = [...items];
    newItems[index][name] = value;

    if (name === 'category') {
      newItems[index].item_name = '';
      newItems[index].item_id = '';
    }

    if (name === 'item_name') {
      const selected = inventory.find(
        (inv) => inv.category === newItems[index].category && inv.item_name === value
      );
      if (selected) newItems[index].item_id = selected.item_id;
    }

    setItems(newItems);
  };

  const getItemNames = (category) => {
    return inventory.filter((i) => i.category === category).map((i) => i.item_name);
  };

  const handleAddItem = () => {
    setItems([...items, { category: '', item_name: '', item_id: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length > 1) {
      const newItems = [...items];
      newItems.splice(index, 1);
      setItems(newItems);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Handle photo upload
      let photo_url = '';
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `req-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('request-photos')
          .upload(fileName, photoFile, { upsert: true });
        if (uploadError) {
          alert('Photo upload failed!');
          console.error(uploadError);
          return;
        }
        const { data: publicUrlData } = supabase.storage.from('request-photos').getPublicUrl(fileName);
        photo_url = publicUrlData.publicUrl;
      }

      // Insert into requests table
      const { data: reqData, error: reqError } = await supabase
        .from('requests')
        .insert([
          {
            plate_number: request.plate_number,
            estimated_cost: request.estimated_cost,
            reason: request.reason,
            requested_by: currentUser?.id,
            photo_url
          }
        ])
        .select()
        .single();

      if (reqError) {
        alert('Error creating request: ' + JSON.stringify(reqError));
        return;
      }

      // Insert request items
      const itemsPayload = items.map((item) => ({
        request_id: reqData.request_id,
        item_id: item.item_id,
        quantity: item.quantity
      }));

      const { error: itemsError } = await supabase.from('request_items').insert(itemsPayload);
      if (itemsError) {
        alert('Error inserting request items: ' + JSON.stringify(itemsError));
        return;
      }

      alert('Request submitted successfully!');
      // Reset form
      setRequest({ plate_number: '', estimated_cost: '', reason: '', photo_url: '' });
      setItems([{ category: '', item_name: '', item_id: '', quantity: 1 }]);
      setPhotoFile(null);
      
    } catch (error) {
      console.error('Submission error:', error);
      alert('An error occurred while submitting your request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex-1 p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Maintenance Request</h1>
          <p className="text-gray-600">Submit maintenance requests for fleet vehicles</p>
        </div>

        {/* Request Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Request Details</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* Truck Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vehicle <span className="text-red-500">*</span>
              </label>
              <select
                value={request.plate_number}
                onChange={(e) => setRequest({ ...request, plate_number: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                required
              >
                <option value="">Select a vehicle</option>
                {trucks.map((t) => (
                  <option key={t.plate_number} value={t.plate_number}>
                    {t.plate_number}
                  </option>
                ))}
              </select>
            </div>

            {/* Items Section */}
            <div className="border-t border-gray-200 pt-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-800">Requested Items</h3>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Item
                </button>
              </div>

              <div className="space-y-4">
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-4 items-start p-4 bg-gray-50 rounded-lg">
                    <div className="col-span-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select
                        name="category"
                        value={item.category}
                        onChange={(e) => handleItemChange(idx, e)}
                        className="w-full px-3 py-2 border border-gray-300 text-gray-500 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="">Select category</option>
                        {categoryList.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Item</label>
                      <select
                        name="item_name"
                        value={item.item_name}
                        onChange={(e) => handleItemChange(idx, e)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        required
                        disabled={!item.category}
                      >
                        <option value="">Select item</option>
                        {getItemNames(item.category).map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                      <input
                        type="number"
                        name="quantity"
                        value={item.quantity}
                        min="1"
                        onChange={(e) => handleItemChange(idx, e)}
                        className="w-full px-3 py-2 border border-gray-300 text-gray-500 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div className="col-span-2 flex items-end h-10">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="w-full px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors duration-200"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Estimated Cost */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Cost (₱)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={request.estimated_cost}
                onChange={(e) => setRequest({ ...request, estimated_cost: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                placeholder="0.00"
              />
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attachment (Optional)
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="file"
                  onChange={(e) => setPhotoFile(e.target.files[0])}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  accept="image/*,.pdf,.doc,.docx"
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">Supports images, PDF, and documents</p>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason or Notes
              </label>
              <textarea
                rows="4"
                value={request.reason}
                onChange={(e) => setRequest({ ...request, reason: e.target.value })}
                className="w-full px-4 py-3 border text-gray-500 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                placeholder="Please provide details about the maintenance needed..."
              ></textarea>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  'Submit Request'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
};

export default UserRequestPage;