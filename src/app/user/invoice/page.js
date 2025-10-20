'use client';

import React, { useState, useEffect } from 'react';
import supabase from '../../../supabaseClient';

// ---------------- SALES INVOICE FORM ----------------
const SalesInvoiceForm = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [categoryList, setCategoryList] = useState([]);
  const [invoice, setInvoice] = useState({
    invoice_no: '',
    supplier_name: '',
    terms: '',
    date: '',
    vat_amount: '',
    discount: '',
    net_amount: '',
    invoice_photo_url: ''
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [items, setItems] = useState([
    { category: '', item_name: '', item_id: '', quantity: 0, unit_price: 0, item_discount: 0, total_amount: 0, add_to_inventory: false }
  ]);

  // Load user from localStorage
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('currentUser'));
    if (storedUser && storedUser.id) {
      setCurrentUser(storedUser);
    } else {
      console.warn("User not found in localStorage or user ID is missing for Sales Invoice.");
    }
  }, []);

  // Fetch inventory for dropdowns
  useEffect(() => {
    const fetchInventory = async () => {
      const { data, error } = await supabase.from('inventory').select('*');
      if (!error && data) {
        setInventory(data);
        setCategoryList(Array.from(new Set(data.map(item => item.category)).values()));
      } else if (error) {
        console.error('Error fetching inventory:', error);
      }
    };
    fetchInventory();
  }, []);

  // Update item list when category changes
  const handleItemChange = (index, e) => {
    const { name, value, type, checked } = e.target;
    const newItems = [...items];
    if (type === 'checkbox') {
      newItems[index][name] = checked;
    } else {
      newItems[index][name] = value;
    }

    // If category changes, reset item_name and item_id
    if (name === 'category') {
      newItems[index].item_name = '';
      newItems[index].item_id = '';
      newItems[index].unit_price = 0;
    }

    // If item_name changes, auto-fill item_id and unit_price
    if (name === 'item_name' && newItems[index].category) {
      const selectedItem = inventory.find(
        item => item.category === newItems[index].category && item.item_name === value
      );
      if (selectedItem) {
        newItems[index].item_id = selectedItem.item_id;
        newItems[index].unit_price = selectedItem.unit_price || 0;
      }
    }

    // Calculate total_amount
    const qty = parseFloat(newItems[index].quantity) || 0;
    const price = parseFloat(newItems[index].unit_price) || 0;
    const discount = parseFloat(newItems[index].item_discount) || 0;
    const discountMultiplier = 1 - discount / 100;
    newItems[index].total_amount = qty * price * discountMultiplier;

    setItems(newItems);
  };

  // Get item names for dropdown based on selected category
  const getItemNames = (category) => {
    return inventory.filter(item => item.category === category).map(item => item.item_name);
  };

  const handleAddItem = () => {
    setItems([...items, { category: '', item_name: '', item_id: '', quantity: 0, unit_price: 0, item_discount: 0, total_amount: 0, add_to_inventory: false }]);
  };

  const handleRemoveItem = (index) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleInvoiceChange = (e) => {
    setInvoice({ ...invoice, [e.target.name]: e.target.value });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreview(previewUrl);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentUser || !currentUser.id) {
      alert("Error: No user logged in to encode the invoice. Please log in.");
      return;
    }

    let photo_url = '';
    if (photoFile) {
      const fileExt = photoFile.name.split('.').pop();
      const fileName = `${invoice.invoice_no}-${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('invoice-photos')
        .upload(fileName, photoFile, { upsert: true });

      if (uploadError) {
        alert('Photo upload failed!');
        console.error('Photo upload error:', uploadError);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('invoice-photos')
        .getPublicUrl(uploadData.path);

      photo_url = publicUrlData.publicUrl;
    }

    const netAmount = (
      items.reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0)
      - (parseFloat(invoice.vat_amount) || 0)
    ).toFixed(2);

    const invoicePayload = {
      invoice_no: invoice.invoice_no,
      supplier_name: invoice.supplier_name,
      terms: invoice.terms,
      date: invoice.date,
      vat_amount: invoice.vat_amount,
      discount: invoice.discount,
      net_amount: netAmount,
      invoice_photo_url: photo_url,
      encoded_by: currentUser.id,
      created_at: new Date()
    };

    const { error: invoiceError } = await supabase.from('invoice_table').insert([invoicePayload]);

    if (invoiceError) {
      alert('Error inserting invoice: ' + JSON.stringify(invoiceError));
      console.error('Invoice insertion error:', invoiceError);
      return;
    }

    const itemsPayload = items.map((item) => {
      const { total_amount, add_to_inventory, ...rest } = item;
      return {
        invoice_no: invoice.invoice_no,
        ...rest
      };
    });

    const { error: itemsError } = await supabase.from('invoice_items_table').insert(itemsPayload);

    if (itemsError) {
      alert('Error inserting items: ' + JSON.stringify(itemsError));
      console.error('Items insertion error:', itemsError);
      return;
    }

    // Update inventory quantities if needed
    for (const item of items) {
      if (item.add_to_inventory) {
        const { data: currentInventory, error: fetchError } = await supabase
          .from('inventory')
          .select('quantity')
          .eq('item_id', item.item_id)
          .single();

        if (fetchError) {
          console.error('Error fetching current inventory for item:', item.item_id, fetchError);
          continue;
        }

        const newQuantity = (currentInventory?.quantity || 0) + parseFloat(item.quantity);

        const { error: updateError } = await supabase
          .from('inventory')
          .update({ quantity: newQuantity })
          .eq('item_id', item.item_id);

        if (updateError) {
          console.error('Error updating inventory for item:', item.item_id, updateError);
        }
      }
    }

    alert('Invoice submitted successfully!');
    // Reset form fields
    setInvoice({
      invoice_no: '',
      supplier_name: '',
      terms: '',
      date: '',
      vat_amount: '',
      discount: '',
      net_amount: '',
      invoice_photo_url: ''
    });
    setItems([{ category: '', item_name: '', item_id: '', quantity: 0, unit_price: 0, item_discount: 0, total_amount: 0, add_to_inventory: false }]);
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 pb-4 border-b border-gray-200">Sales Invoice Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div>
              <label className="block font-semibold text-gray-700 mb-2">Invoice No.</label>
              <input 
                type="text" 
                name="invoice_no" 
                value={invoice.invoice_no} 
                onChange={handleInvoiceChange} 
                className="w-full border border-gray-300 text-gray-500 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
                required 
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-2">Supplier Name</label>
              <input 
                type="text" 
                name="supplier_name" 
                value={invoice.supplier_name} 
                onChange={handleInvoiceChange} 
                className="w-full border border-gray-300 text-gray-500 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
                required 
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-2">Terms</label>
              <input 
                type="text" 
                name="terms" 
                value={invoice.terms} 
                onChange={handleInvoiceChange} 
                className="w-full border border-gray-300 text-gray-500 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
              />
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block font-semibold text-gray-700 mb-2">Date</label>
              <input 
                type="date" 
                name="date" 
                value={invoice.date} 
                onChange={handleInvoiceChange} 
                className="w-full border border-gray-300 text-gray-500 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
                required 
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-2">VAT Amount</label>
              <input 
                type="number" 
                step="0.01" 
                name="vat_amount" 
                value={invoice.vat_amount} 
                onChange={handleInvoiceChange} 
                className="w-full border border-gray-300 text-gray-500 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-2">Discount</label>
              <input 
                type="number" 
                step="0.01" 
                name="discount" 
                value={invoice.discount} 
                onChange={handleInvoiceChange} 
                className="w-full border border-gray-300 text-gray-500 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
              />
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block font-semibold text-gray-700 mb-2">Net Amount</label>
            <input
              type="number"
              step="0.01"
              name="net_amount"
              value={(items.reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0) - (parseFloat(invoice.vat_amount) || 0)).toFixed(2)}
              readOnly
              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 font-semibold text-gray-700"
            />
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-2">Upload Invoice Photo</label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handlePhotoChange} 
                className="w-full border border-gray-300 text-gray-500 rounded-lg px-4 py-3 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all duration-200" 
              />
            </div>
            {photoPreview && (
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-700 mb-2">Photo Preview:</p>
                <img src={photoPreview} alt="Invoice preview" className="w-32 h-32 object-cover rounded-lg border border-gray-300" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Items Section */}
      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
          <h3 className="text-2xl font-bold text-gray-800">Invoice Items</h3>
          <button 
            type="button" 
            onClick={handleAddItem} 
            className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 transition-colors duration-200 font-semibold flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Item
          </button>
        </div>
        
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-6 bg-gray-50 rounded-lg border border-gray-200">
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  name="category"
                  value={item.category}
                  onChange={(e) => handleItemChange(index, e)}
                  className="w-full border border-gray-300 text-gray-500 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  required
                >
                  <option value="">Select Category</option>
                  {categoryList.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                <select
                  name="item_name"
                  value={item.item_name}
                  onChange={(e) => handleItemChange(index, e)}
                  className="w-full border border-gray-300 text-gray-500 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 disabled:bg-gray-100"
                  required
                  disabled={!item.category}
                >
                  <option value="">Select Item</option>
                  {getItemNames(item.category).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Item ID</label>
                <input
                  type="text"
                  name="item_id"
                  value={item.item_id}
                  readOnly
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-gray-100 font-medium text-gray-600"
                  placeholder="Auto-filled"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input 
                  type="number" 
                  name="quantity" 
                  placeholder="Qty" 
                  value={item.quantity} 
                  onChange={(e) => handleItemChange(index, e)} 
                  className="w-full border border-gray-300 text-gray-500 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
                  required 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                <input 
                  type="number" 
                  name="unit_price" 
                  placeholder="Price" 
                  value={item.unit_price} 
                  onChange={(e) => handleItemChange(index, e)} 
                  className="w-full border border-gray-300 text-gray-500 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
                  required 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
                <input 
                  type="number" 
                  name="item_discount" 
                  placeholder="%" 
                  value={item.item_discount} 
                  onChange={(e) => handleItemChange(index, e)} 
                  className="w-full border border-gray-300 text-gray-500 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
                <input 
                  type="number" 
                  name="total_amount" 
                  placeholder="Total" 
                  value={item.total_amount} 
                  readOnly 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-gray-100 font-semibold text-gray-700" 
                />
              </div>
              
              <div className="flex flex-col justify-between">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    name="add_to_inventory" 
                    checked={item.add_to_inventory} 
                    onChange={(e) => handleItemChange(index, e)} 
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" 
                  />
                  <span className="text-sm font-medium text-gray-700">Add to Inventory</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => handleRemoveItem(index)} 
                  className="text-red-600 hover:text-red-800 font-medium text-sm flex items-center gap-1 mt-2 transition-colors duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-xl hover:from-orange-600 hover:to-orange-700 font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl">
        Submit Invoice
      </button>
    </form>
  );
};

// ---------------- SERVICE INVOICE FORM ----------------
const ServiceInvoiceForm = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [service, setService] = useState({
    service_invoice_no: '',
    date: '',
    hours: '',
    description: '',
    labor_cost: '',
    vat: '',
    withholding_tax: '',
    total_amount: '',
  });

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('currentUser'));
    if (storedUser && storedUser.id) {
      setCurrentUser(storedUser);
    } else {
      console.warn("User not found in localStorage or user ID is missing for Service Invoice.");
    }
  }, []);

  // Auto-calculate total_amount
  useEffect(() => {
    const labor = parseFloat(service.labor_cost) || 0;
    const vat = parseFloat(service.vat) || 0;
    const wtax = parseFloat(service.withholding_tax) || 0;
    setService((prev) => ({
      ...prev,
      total_amount: (labor + vat - wtax).toFixed(2)
    }));
    // eslint-disable-next-line
  }, [service.labor_cost, service.vat, service.withholding_tax]);

  const handleChange = (e) => {
    setService({ ...service, [e.target.name]: e.target.value });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreview(previewUrl);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentUser || !currentUser.id) {
      alert("Error: No user logged in to encode the service invoice. Please log in.");
      return;
    }

    let photo_url = '';
    if (photoFile) {
      const fileExt = photoFile.name.split('.').pop();
      const fileName = `${service.service_invoice_no}-${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('service-invoice-photos')
        .upload(fileName, photoFile, { upsert: true });

      if (uploadError) {
        alert('Photo upload failed!');
        console.error('Photo upload error:', uploadError);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('service-invoice-photos')
        .getPublicUrl(uploadData.path);

      photo_url = publicUrlData.publicUrl;
    }

    // Insert header to service_invoice_table
    const servicePayload = {
      service_invoice_no: service.service_invoice_no,
      date: service.date,
      total_amount: service.total_amount,
      vat: service.vat,
      withholding_tax: service.withholding_tax,
      encoded_by: currentUser.id,
      service_photo_url: photo_url, // Add photo URL to the service invoice
      created_at: new Date()
    };

    const { error: headerError } = await supabase.from('service_invoice_table').insert([servicePayload]);
    if (headerError) {
      alert('Error inserting service invoice header: ' + JSON.stringify(headerError));
      console.error('Service invoice header insertion error:', headerError);
      return;
    }

    // Insert details to service_invoice_details
    const detailsPayload = {
      service_invoice_no: service.service_invoice_no,
      hours: service.hours,
      description: service.description,
      labor_cost: service.labor_cost,
    };
    const { error: detailsError } = await supabase.from('service_invoice_details').insert([detailsPayload]);
    if (detailsError) {
      alert('Error inserting service invoice details: ' + JSON.stringify(detailsError));
      console.error('Service invoice details insertion error:', detailsError);
    } else {
      alert('Service invoice submitted successfully!');
      // Reset form
      setService({
        service_invoice_no: '',
        date: '',
        hours: '',
        description: '',
        labor_cost: '',
        vat: '',
        withholding_tax: '',
        total_amount: '',
      });
      setPhotoFile(null);
      setPhotoPreview(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 pb-4 border-b border-gray-200">Service Invoice Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="block font-semibold text-gray-700 mb-2">Invoice No.</label>
              <input 
                type="text" 
                name="service_invoice_no" 
                value={service.service_invoice_no} 
                onChange={handleChange} 
                className="w-full border border-gray-300 text-gray-500 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
                required 
              />
            </div>
            
            <div>
              <label className="block font-semibold text-gray-700 mb-2">Date</label>
              <input 
                type="date" 
                name="date" 
                value={service.date} 
                onChange={handleChange} 
                className="w-full border border-gray-300 text-gray-500 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
                required 
              />
            </div>
            
            <div>
              <label className="block font-semibold text-gray-700 mb-2">Hours of Service</label>
              <input 
                type="number" 
                name="hours" 
                value={service.hours} 
                onChange={handleChange} 
                className="w-full border border-gray-300 text-gray-500 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
                required
              />
            </div>
            
            <div>
              <label className="block font-semibold text-gray-700 mb-2">Labor Cost</label>
              <input 
                type="number" 
                name="labor_cost" 
                value={service.labor_cost} 
                onChange={handleChange} 
                className="w-full border border-gray-300 text-gray-500 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
              />
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block font-semibold text-gray-700 mb-2">VAT</label>
              <input 
                type="number" 
                name="vat" 
                value={service.vat} 
                onChange={handleChange} 
                className="w-full border border-gray-300 text-gray-500 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
              />
            </div>
            
            <div>
              <label className="block font-semibold text-gray-700 mb-2">Withholding Tax</label>
              <input 
                type="number" 
                name="withholding_tax" 
                value={service.withholding_tax} 
                onChange={handleChange} 
                className="w-full border border-gray-300 text-gray-500 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
              />
            </div>
            
            <div>
              <label className="block font-semibold text-gray-700 mb-2">Total Amount</label>
              <input 
                type="number" 
                name="total_amount" 
                value={service.total_amount} 
                readOnly 
                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 font-semibold text-gray-700" 
              />
            </div>
            
            <div>
              <label className="block font-semibold text-gray-700 mb-2">Upload Service Photo</label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handlePhotoChange} 
                className="w-full border border-gray-300 text-gray-500 rounded-lg px-4 py-3 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all duration-200" 
              />
              {photoPreview && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Photo Preview:</p>
                  <img src={photoPreview} alt="Service preview" className="w-32 h-32 object-cover rounded-lg border border-gray-300" />
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <label className="block font-semibold text-gray-700 mb-2">Description</label>
          <textarea 
            name="description" 
            value={service.description} 
            onChange={handleChange} 
            className="w-full border border-gray-300 text-gray-500 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
            rows="4"
            placeholder="Enter service description..."
          ></textarea>
        </div>
      </div>
      
      <button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-xl hover:from-orange-600 hover:to-orange-700 font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl">
        Submit Service Invoice
      </button>
    </form>
  );
};

// ---------------- MAIN INVOICE PAGE ----------------
const InvoicePage = () => {
  const [activeTab, setActiveTab] = useState('sales');

  return (
    <main className="flex-1 p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-2">Invoice Management</h2>
          <p className="text-gray-600">Create and manage sales and service invoices</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-2 mb-8">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('sales')}
              className={`flex-1 px-6 py-4 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === 'sales' 
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Sales Invoice
              </div>
            </button>
            <button
              onClick={() => setActiveTab('service')}
              className={`flex-1 px-6 py-4 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === 'service' 
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Service Invoice
              </div>
            </button>
          </div>
        </div>

        {activeTab === 'sales' ? <SalesInvoiceForm /> : <ServiceInvoiceForm />}
      </div>
    </main>
  );
};

export default InvoicePage;