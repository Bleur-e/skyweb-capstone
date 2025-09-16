'use client';

import React, { useState, useEffect } from 'react';
import supabase from '../../../supabaseClient';

const UserRequestPage = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [trucks, setTrucks] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [categoryList, setCategoryList] = useState([]);

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
    const storedUser = JSON.parse(localStorage.getItem('currentUser'));
    if (storedUser) {
      setCurrentUser(storedUser);
    }
  }, []);

  // Fetch trucks & inventory
  useEffect(() => {
    const fetchData = async () => {
      const { data: truckData } = await supabase.from('trucks').select('plate_number');
      if (truckData) setTrucks(truckData);

      const { data: invData } = await supabase.from('inventory').select('*');
      if (invData) {
        setInventory(invData);
        setCategoryList([...new Set(invData.map(item => item.category))]);
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
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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
    setRequest({ plate_number: '', estimated_cost: '', reason: '', photo_url: '' });
    setItems([{ category: '', item_name: '', item_id: '', quantity: 1 }]);
    setPhotoFile(null);
  };

  return (
    <main className="flex-1 p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-4">User Request</h2>
      <p className="text-gray-600 mb-6">Create your requests here.</p>

      <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-md mt-10">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Truck Dropdown */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">Truck</label>
            <select
              value={request.plate_number}
              onChange={(e) => setRequest({ ...request, plate_number: e.target.value })}
              className="w-full border px-3 py-2 rounded text-blue-700"
              required
            >
              <option value="">Select Truck</option>
              {trucks.map((t) => (
                <option key={t.plate_number} value={t.plate_number}>
                  {t.plate_number}
                </option>
              ))}
            </select>
          </div>

          {/* Items Section */}
          <h3 className="text-lg font-semibold text-gray-800">Requested Items</h3>
          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-4 gap-3 items-center mb-2">
              <select
                name="category"
                value={item.category}
                onChange={(e) => handleItemChange(idx, e)}
                className="border px-2 py-1 rounded text-gray-700"
                required
              >
                <option value="">Select Category</option>
                {categoryList.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select
                name="item_name"
                value={item.item_name}
                onChange={(e) => handleItemChange(idx, e)}
                className="border px-2 py-1 rounded text-gray-700"
                required
                disabled={!item.category}
              >
                <option value="">Select Item</option>
                {getItemNames(item.category).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>

              <input
                type="number"
                name="quantity"
                value={item.quantity}
                min="1"
                onChange={(e) => handleItemChange(idx, e)}
                className="border px-2 py-1 rounded text-gray-700"
                required
              />

              <button
                type="button"
                onClick={() => handleRemoveItem(idx)}
                className="text-red-500"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddItem}
            className="bg-blue-500 text-white px-3 py-1 rounded"
          >
            + Add Item
          </button>

          {/* Estimated Cost */}
          <div>
            <label className="block text-gray-700 font-medium mb-1 ">Estimated Cost (₱)</label>
            <input
              type="number"
              value={request.estimated_cost}
              onChange={(e) => setRequest({ ...request, estimated_cost: e.target.value })}
              className="w-full border px-3 py-2 rounded text-gray-700"
            />
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">Attachment (Optional)</label>
            <input className="border px-2 py-1 rounded text-gray-700" type="file" onChange={(e) => setPhotoFile(e.target.files[0])} />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">Reason or Notes</label>
            <textarea
              rows="3"
              value={request.reason}
              onChange={(e) => setRequest({ ...request, reason: e.target.value })}
              className="w-full border px-3 py-2 rounded text-gray-700"
            ></textarea>
          </div>

          <button type="submit" className="w-full bg-amber-500 text-white py-2 rounded hover:bg-amber-600">
            Submit Request
          </button>
        </form>
      </div>
    </main>
  );
};

export default UserRequestPage;
