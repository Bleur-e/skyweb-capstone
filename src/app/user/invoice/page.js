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
    // encoded_by: '', // Initialized to null for better type consistency
    // encoded_by_name: '', // This state is still useful for debugging or internal display
    invoice_photo_url: ''
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [items, setItems] = useState([
    { category: '', item_name: '', item_id: '', quantity: 0, unit_price: 0, item_discount: 0, total_amount: 0, add_to_inventory: false }
  ]);

  // Load user from localStorage
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('currentUser')); // Assuming 'users' is the key
    if (storedUser && storedUser.id) { // Ensure storedUser and its ID exist
      setCurrentUser(storedUser);
      // We don't need to set invoice.encoded_by_name if it's not displayed
      // but keeping currentUser state populated is essential.
      // The encoded_by is picked directly from currentUser in handleSubmit.
    } else {
      console.warn("User not found in localStorage or user ID is missing for Sales Invoice.");
      // Optionally handle this, e.g., disable submit button
    }
  }, []); // Run only once on mount

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
    setPhotoFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Ensure currentUser is available before submitting
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

      // Use uploadData.path here to get the correct path for public URL
      const { data: publicUrlData } = supabase.storage
        .from('invoice-photos')
        .getPublicUrl(uploadData.path);

      photo_url = publicUrlData.publicUrl;
    }

    const netAmount = (
      items.reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0)
      - (parseFloat(invoice.vat_amount) || 0)
    ).toFixed(2);

    // Prepare invoice payload. encoded_by_name is not in DB, so it's not included.
    const invoicePayload = {
      invoice_no: invoice.invoice_no,
      supplier_name: invoice.supplier_name,
      terms: invoice.terms,
      date: invoice.date,
      vat_amount: invoice.vat_amount,
      discount: invoice.discount,
      net_amount: netAmount,
      invoice_photo_url: photo_url,
      encoded_by: currentUser.id, // Ensure currentUser.id is sent
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
      // encoded_by is handled by currentUser, not directly in form state for reset
      // encoded_by_name is not used in DB, can be omitted from state if not needed for display
      invoice_photo_url: ''
    });
    setItems([{ category: '', item_name: '', item_id: '', quantity: 0, unit_price: 0, item_discount: 0, total_amount: 0, add_to_inventory: false }]);
    setPhotoFile(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4 bg-white p-6 rounded-lg shadow">
        <div>
          <label className="block font-medium text-gray-800">Invoice No.</label>
          <input type="text" name="invoice_no" value={invoice.invoice_no} onChange={handleInvoiceChange} className="w-full border p-2 rounded text-gray-500" required />
        </div>
        <div>
          <label className="block font-medium text-gray-800">Supplier Name</label>
          <input type="text" name="supplier_name" value={invoice.supplier_name} onChange={handleInvoiceChange} className="w-full border p-2 rounded text-gray-500" required />
        </div>
        <div>
          <label className="block font-medium text-gray-800">Terms</label>
          <input type="text" name="terms" value={invoice.terms} onChange={handleInvoiceChange} className="w-full border p-2 rounded text-gray-500" />
        </div>
        <div>
          <label className="block font-medium text-gray-800">Date</label>
          <input type="date" name="date" value={invoice.date} onChange={handleInvoiceChange} className="w-full border p-2 rounded text-gray-400" required />
        </div>
        <div>
          <label className="block font-medium text-gray-800">VAT Amount</label>
          <input type="number" step="0.01" name="vat_amount" value={invoice.vat_amount} onChange={handleInvoiceChange} className="w-full border p-2 rounded text-gray-500" />
        </div>
        <div>
          <label className="block font-medium text-gray-800">Discount</label>
          <input type="number" step="0.01" name="discount" value={invoice.discount} onChange={handleInvoiceChange} className="w-full border p-2 rounded text-gray-500" />
        </div>
        <div>
          <label className="block font-medium text-gray-800">Net Amount</label>
          <input
            type="number"
            step="0.01"
            name="net_amount"
            value={(items.reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0) - (parseFloat(invoice.vat_amount) || 0)).toFixed(2)}
            readOnly
            className="w-full border p-2 rounded bg-gray-100 text-gray-600"
          />
        </div>
        {/* Removed 'Encoded By' input field */}
        <div className="col-span-2">
          <label className="block font-medium text-gray-800">Upload Invoice Photo</label>
          <input type="file" accept="image/*" onChange={handlePhotoChange} className="w-full border p-2 rounded text-gray-400" />
        </div>
      </div>

      {/* Invoice Items Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-xl font-bold mb-4 text-gray-800">Invoice Items</h3>
        {items.map((item, index) => (
          <div key={index} className="grid grid-cols-8 gap-4 mb-3">
            {/* Category Dropdown */}
            <select
              name="category"
              value={item.category}
              onChange={(e) => handleItemChange(index, e)}
              className="border p-2 rounded text-gray-500"
              required
            >
              <option value="">Select Category</option>
              {categoryList.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {/* Item Name Dropdown */}
            <select
              name="item_name"
              value={item.item_name}
              onChange={(e) => handleItemChange(index, e)}
              className="border p-2 rounded text-gray-500"
              required
              disabled={!item.category}
            >
              <option value="">Select Item</option>
              {getItemNames(item.category).map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            {/* Item ID (auto-filled) */}
            <input
              type="text"
              name="item_id"
              value={item.item_id}
              readOnly
              className="border p-2 rounded bg-gray-100 text-gray-600"
              placeholder="Item ID"
            />
            <input type="number" name="quantity" placeholder="Qty" value={item.quantity} onChange={(e) => handleItemChange(index, e)} className="border p-2 rounded text-gray-500" required />
            <input type="number" name="unit_price" placeholder="Unit Price" value={item.unit_price} onChange={(e) => handleItemChange(index, e)} className="border p-2 rounded text-gray-500" required />
            <input type="number" name="item_discount" placeholder="Discount %" value={item.item_discount} onChange={(e) => handleItemChange(index, e)} className="border p-2 rounded text-gray-500" />
            <input type="number" name="total_amount" placeholder="Total" value={item.total_amount} readOnly className="border p-2 rounded bg-gray-100 text-gray-600" />
            <div className="flex items-center">
              <input type="checkbox" name="add_to_inventory" checked={item.add_to_inventory} onChange={(e) => handleItemChange(index, e)} className="mt-2" />
              <span className="ml-1 text-xs">Add to Inventory</span>
            </div>
            <button type="button" onClick={() => handleRemoveItem(index)} className="text-red-500">Remove</button>
          </div>
        ))}
        <button type="button" onClick={handleAddItem} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          + Add Item
        </button>
      </div>

      {/* Submit */}
      <button type="submit" className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 font-bold text-lg">
        Submit Invoice
      </button>
    </form>
  );
};

// ---------------- SERVICE INVOICE FORM ----------------
const ServiceInvoiceForm = () => {
  const [currentUser, setCurrentUser] = useState(null);

  const [service, setService] = useState({
    service_invoice_no: '',
    date: '',
    hours: '',
    description: '',
    labor_cost: '',
    vat: '',
    withholding_tax: '',
    total_amount: '',
    // encoded_by: '', // Initialized to null for better type consistency
    // encoded_by_name: '' // This state is still useful for debugging or internal display
  });

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('currentUser'));
    if (storedUser && storedUser.id) { // Ensure storedUser and its ID exist
      setCurrentUser(storedUser);
      // We don't need to set service.encoded_by_name if it's not displayed
      // but keeping currentUser state populated is essential.
    } else {
      console.warn("User not found in localStorage or user ID is missing for Service Invoice.");
      // Optionally handle this, e.g., disable submit button
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Ensure currentUser is available before submitting
    if (!currentUser || !currentUser.id) {
      alert("Error: No user logged in to encode the service invoice. Please log in.");
      return;
    }

    // Insert header to service_invoice_table
    // Prepare service payload. encoded_by_name is not in DB, so it's not included.
    const servicePayload = {
      service_invoice_no: service.service_invoice_no,
      date: service.date,
      total_amount: service.total_amount, // Include total_amount here for the header table
      vat: service.vat, // Include vat
      withholding_tax: service.withholding_tax, // Include withholding_tax
      encoded_by: currentUser.id, // Ensure currentUser.id is sent
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
        // encoded_by is handled by currentUser, not directly in form state for reset
        // encoded_by_name is not used in DB, can be omitted from state if not needed for display
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4 bg-white p-6 rounded-lg shadow">
        <div>
          <label className="block font-medium text-gray-800">Invoice No.</label>
          <input type="text" name="service_invoice_no" value={service.service_invoice_no} onChange={handleChange} className="w-full border p-2 rounded text-gray-500" required />
        </div>
        <div>
          <label className="block font-medium text-gray-800">Date</label>
          <input type="date" name="date" value={service.date} onChange={handleChange} className="w-full border p-2 rounded text-gray-500" required />
        </div>
        <div className="col-span-2">
          <label className="block font-medium text-gray-800">Hours of Service</label>
          <input type="number" name="hours" value={service.hours} onChange={handleChange} className="w-full border p-2 rounded text-gray-500" required/>
        </div>
        <div className="col-span-2">
          <label className="block font-medium text-gray-800">Description</label>
          <textarea name="description" value={service.description} onChange={handleChange} className="w-full border p-2 rounded text-gray-500" rows="3"></textarea>
        </div>
        <div>
          <label className="block font-medium text-gray-800">Labor Cost</label>
          <input type="number" name="labor_cost" value={service.labor_cost} onChange={handleChange} className="w-full border p-2 rounded text-gray-500" />
        </div>
        <div>
          <label className="block font-medium text-gray-800">VAT</label>
          <input type="number" name="vat" value={service.vat} onChange={handleChange} className="w-full border p-2 rounded text-gray-500" />
        </div>
        <div>
          <label className="block font-medium text-gray-800">Withholding Tax</label>
          <input type="number" name="withholding_tax" value={service.withholding_tax} onChange={handleChange} className="w-full border p-2 rounded text-gray-500" />
        </div>
        <div>
          <label className="block font-medium text-gray-800">Total Amount</label>
          <input type="number" name="total_amount" value={service.total_amount} readOnly className="w-full border p-2 rounded bg-gray-100 text-gray-600" />
        </div>
        {/* Removed 'Encoded By' input field */}
      </div>
      <button type="submit" className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 font-bold text-lg">
        Submit Service Invoice
      </button>
    </form>
  );
};

// ---------------- MAIN INVOICE PAGE ----------------
const InvoicePage = () => {
  const [activeTab, setActiveTab] = useState('sales');

  return (
    <main className="flex-1 p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Invoice</h2>

      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('sales')}
          className={`px-4 py-2 rounded ${activeTab === 'sales' ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Sales Invoice
        </button>
        <button
          onClick={() => setActiveTab('service')}
          className={`px-4 py-2 rounded ${activeTab === 'service' ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Service Invoice
        </button>
      </div>

      {activeTab === 'sales' ? <SalesInvoiceForm /> : <ServiceInvoiceForm />}
    </main>
  );
};

export default InvoicePage;