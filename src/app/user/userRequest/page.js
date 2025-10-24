'use client';

import React, { useState, useEffect } from 'react';
import supabase from '../../../supabaseClient';
import { useRouter } from 'next/navigation';

const UserRequestPage = () => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [trucks, setTrucks] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [categoryList, setCategoryList] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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

  // State for vehicle dropdown search
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);

  // Load current user
  useEffect(() => {
    const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
    if (!currentUser) {
      router.push("/");
      return;
    }
    setCurrentUser(currentUser);
  }, [router]);

  // Fetch trucks & inventory - Filter out archived trucks
  useEffect(() => {
    const fetchData = async () => {
      // Only fetch non-archived trucks
      const { data: truckData } = await supabase
        .from('trucks')
        .select('plate_number')
        .eq('is_archived', false)
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

  // Filter trucks based on search input
  const filteredTrucks = trucks.filter(truck =>
    truck.plate_number.toLowerCase().includes(vehicleSearch.toLowerCase())
  );

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

  // Function to notify admins (shared notification, tracked by read_by)
const notifyAdmin = async (requestData, itemsData) => {
  try {
    // Get admin users
    const { data: adminUsers, error: adminError } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin');

    if (adminError) {
      console.error('Error fetching admin users:', adminError);
      return;
    }

    if (!adminUsers || adminUsers.length === 0) {
      console.log('No admins found');
      return;
    }

    // Create notification message
    const itemNames = itemsData.map(item => item.item_name).join(', ');
    const message = `New maintenance request for ${requestData.plate_number}: ${itemNames}`;

    // Insert only one shared notification for admins
    const { error: notifError } = await supabase
      .from('notifications')
      .insert([
        {
          message,
          type: 'maintenance_request',
          role: 'admin',
          plate_number: requestData.plate_number,
          read_by: '[]', // start empty, admins will append their IDs when they read
          created_at: new Date().toISOString(),
        },
      ]);

    if (notifError) {
      console.error('Error creating admin notification:', notifError.message);
    } else {
      console.log('Admin notification created successfully');
    }
  } catch (error) {
    console.error('Error in notifyAdmin:', error);
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

      // Notify admin about the new request
      await notifyAdmin(request, items);

      // Show success modal instead of alert
      setShowSuccessModal(true);
      
      // Reset form
      setRequest({ plate_number: '', estimated_cost: '', reason: '', photo_url: '' });
      setItems([{ category: '', item_name: '', item_id: '', quantity: 1 }]);
      setPhotoFile(null);
      setVehicleSearch('');
      
    } catch (error) {
      console.error('Submission error:', error);
      alert('An error occurred while submitting your request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle vehicle selection
  const handleVehicleSelect = (plateNumber) => {
    setRequest({ ...request, plate_number: plateNumber });
    setVehicleSearch(plateNumber);
    setShowVehicleDropdown(false);
  };

  // Handle vehicle search input change
  const handleVehicleSearchChange = (e) => {
    const value = e.target.value;
    setVehicleSearch(value);
    setShowVehicleDropdown(true);
    
    // If the input matches a truck exactly, select it
    const exactMatch = trucks.find(truck => 
      truck.plate_number.toLowerCase() === value.toLowerCase()
    );
    if (exactMatch) {
      setRequest({ ...request, plate_number: exactMatch.plate_number });
    } else {
      setRequest({ ...request, plate_number: value });
    }
  };

  // Handle estimated cost change with 6-digit minimum validation
  const handleEstimatedCostChange = (e) => {
    const value = e.target.value;
    // Ensure minimum of 6 digits (including decimals)
    if (value === '' || parseFloat(value) >= 0.01) {
      setRequest({ ...request, estimated_cost: value });
    }
  };

  // Handle reason change with 200 character limit
  const handleReasonChange = (e) => {
    const value = e.target.value;
    if (value.length <= 200) {
      setRequest({ ...request, reason: value });
    }
  };

  const SuccessModal = () => (
    <div className="fixed inset-0 backdrop-blur-md bg-gray-900/20 flex items-center justify-center p-4 z-40">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all">
        <div className="p-6 text-center">
          {/* Success Icon */}
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Request Submitted Successfully!</h3>
          <p className="text-gray-600 mb-6">
            Your maintenance request has been submitted and the admin team has been notified.
          </p>
          
          <button
            onClick={() => setShowSuccessModal(false)}
            className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <main className="flex-1 p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            Create Maintenance Request
          </h1>
          <p className="text-gray-600 text-lg">Submit maintenance requests for fleet vehicles</p>
        </div>

        {/* Request Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Request Details
            </h2>
          </div>
          
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* Truck Selection */}
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Vehicle <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={vehicleSearch}
                onChange={handleVehicleSearchChange}
                onFocus={() => setShowVehicleDropdown(true)}
                onBlur={() => setTimeout(() => setShowVehicleDropdown(false), 200)}
                placeholder="Type or select a vehicle"
                className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-300"
                required
              />
              
              {/* Custom Dropdown */}
              {showVehicleDropdown && filteredTrucks.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-white border-2 border-blue-200 rounded-xl shadow-2xl max-h-60 overflow-auto">
                  {filteredTrucks.map((truck) => (
                    <div
                      key={truck.plate_number}
                      onClick={() => handleVehicleSelect(truck.plate_number)}
                      className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150"
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span className="font-medium text-gray-700">{truck.plate_number}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Original hidden select for form validation */}
              <select
                value={request.plate_number}
                onChange={(e) => setRequest({ ...request, plate_number: e.target.value })}
                className="hidden"
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
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Requested Items
                </h3>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Item
                </button>
              </div>

              <div className="space-y-4">
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-4 items-start p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl border border-gray-200">
                    <div className="col-span-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                      <select
                        name="category"
                        value={item.category}
                        onChange={(e) => handleItemChange(idx, e)}
                        className="w-full px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-300"
                        required
                      >
                        <option value="">Select category</option>
                        {categoryList.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Item</label>
                      <select
                        name="item_name"
                        value={item.item_name}
                        onChange={(e) => handleItemChange(idx, e)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-200 hover:border-gray-300"
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
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                      <input
                        type="number"
                        name="quantity"
                        value={item.quantity}
                        min="1"
                        onChange={(e) => handleItemChange(idx, e)}
                        className="w-full px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-300"
                        required
                      />
                    </div>

                    <div className="col-span-2 flex items-end h-14">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="w-full px-4 py-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-200 border-2 border-transparent hover:border-red-200 font-medium"
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
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Estimated Cost (₱) <span className="text-red-500">*</span>
                <span className="text-xs text-gray-500 ml-2">Minimum: ₱0.01</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={request.estimated_cost}
                onChange={handleEstimatedCostChange}
                className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-300"
                placeholder="0.00"
                required
              />
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Attachment (Optional)
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="file"
                  onChange={(e) => setPhotoFile(e.target.files[0])}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-blue-50 file:to-blue-100 file:text-blue-700 hover:file:from-blue-100 hover:file:to-blue-200 transition-all duration-200"
                  accept="image/*,.pdf,.doc,.docx"
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">Supports images, PDF, and documents (Max: 10MB)</p>
            </div>

            {/* Reason */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-semibold text-gray-700">
                  Reason or Notes <span className="text-red-500">*</span>
                </label>
                <span className={`text-sm ${request.reason.length > 180 ? 'text-red-500' : 'text-gray-500'}`}>
                  {request.reason.length}/200
                </span>
              </div>
              <textarea
                rows="4"
                value={request.reason}
                onChange={handleReasonChange}
                className="w-full px-4 py-3.5 border-2 border-gray-200 text-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-300 resize-none"
                placeholder="Please provide details about the maintenance needed..."
                maxLength={200}
                required
              ></textarea>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-8 border-t border-gray-200">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-10 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-amber-700 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
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
                  <span className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Submit Request
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && <SuccessModal />}
    </main>
  );
};

export default UserRequestPage;