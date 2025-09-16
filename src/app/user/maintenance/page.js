'use client';

import React, { useState, useEffect } from 'react';
import supabase from '../../../supabaseClient';

const MaintenancePage = () => {
  const [trucks, setTrucks] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [formData, setFormData] = useState({
    plate_number: '',
    description: '',
    date: '',
    photo: null,
  });
  const [mechanicList, setMechanicList] = useState([{ mechanic_id: '' }]);
  const [itemList, setItemList] = useState([{ item_id: '', quantity: 1 }]);

  useEffect(() => {
    fetchTrucks();
    fetchMechanics();
    fetchInventory();
  }, []);

  const fetchTrucks = async () => {
    const { data, error } = await supabase.from('trucks').select('plate_number');
    if (!error) setTrucks(data);
  };

  const fetchMechanics = async () => {
    const { data, error } = await supabase.from('mechanics').select('mechanic_id, name');
    if (!error) setMechanics(data);
  };

  const fetchInventory = async () => {
    const { data, error } = await supabase.from('inventory').select('item_id, item_name');
    if (!error) setInventory(data);
  };

  const handleFormChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'photo') {
      const file = files[0];
      setFormData({ ...formData, photo: file });
      setPhotoPreview(URL.createObjectURL(file));
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleMechanicChange = (index, e) => {
    const updated = [...mechanicList];
    updated[index][e.target.name] = e.target.value;
    setMechanicList(updated);
  };

  const handleItemChange = (index, e) => {
    const updated = [...itemList];
    updated[index][e.target.name] = e.target.value;
    setItemList(updated);
  };

  const addMechanic = () => setMechanicList([...mechanicList, { mechanic_id: '' }]);
  const removeMechanic = (index) => {
    const updated = mechanicList.filter((_, i) => i !== index);
    setMechanicList(updated);
  };

  const addItem = () => setItemList([...itemList, { item_id: '', quantity: 1 }]);
  const removeItem = (index) => {
    const updated = itemList.filter((_, i) => i !== index);
    setItemList(updated);
  };

  // inside MaintenancePage component
const handleSubmit = async (e) => {
  e.preventDefault();

  // get currentUser from localStorage
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser || !currentUser.id) {
    alert("You must be logged in to submit a maintenance report.");
    return;
  }

  // Upload photo if exists
  let photo_url = null;
  if (formData.photo) {
    try {
      const fileExt = formData.photo.name.split('.').pop();
      const fileName = `maintenance-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('maintenance-photos')
        .upload(fileName, formData.photo, { upsert: true });

      if (uploadError) {
        console.error("Photo upload error:", uploadError);
        alert('Photo upload failed');
        return;
      }

      const { data: publicUrlData } = await supabase.storage
        .from('maintenance-photos')
        .getPublicUrl(fileName);

      photo_url = publicUrlData.publicUrl;
    } catch (err) {
      console.error("Photo upload exception:", err);
      alert("Photo upload failed");
      return;
    }
  }

  // Insert maintenance (uses currentUser.id for encoded_by)
  const { data: maintenanceData, error: maintenanceError } = await supabase
    .from('maintenance')
    .insert([
      {
        plate_number: formData.plate_number,
        description: formData.description,
        date: formData.date,
        photo_url,
        encoded_by: currentUser.id, // <-- UUID from your users table
      }
    ])
    .select();

  if (maintenanceError) {
    console.error("Supabase insert maintenance error:", maintenanceError);
    alert(`Failed to add maintenance record: ${maintenanceError.message || maintenanceError}`);
    return;
  }

  const maintenance_id = maintenanceData[0].maintenance_id;

  // Insert mechanics rows
  const mechanicRows = mechanicList
    .filter(m => m.mechanic_id)
    .map(m => ({ maintenance_id, mechanic_id: m.mechanic_id }));
  if (mechanicRows.length) {
    const { error } = await supabase.from('maintenance_mechanics').insert(mechanicRows);
    if (error) {
      console.error("Failed to insert maintenance_mechanics:", error);
      // optionally rollback the maintenance insert or inform user
    }
  }

  // Insert items rows (this will run the inventory triggers you created)
  const itemRows = itemList
    .filter(i => i.item_id)
    .map(i => ({ maintenance_id, item_id: i.item_id, quantity: Number(i.quantity) || 0 }));
  if (itemRows.length) {
    const { error } = await supabase.from('maintenance_items').insert(itemRows);
    if (error) {
      console.error("Failed to insert maintenance_items:", error);
      alert(`Failed to save used items: ${error.message || error}`);
      return;
    }
  }

  alert('Maintenance record added successfully!');
  setFormData({ plate_number: '', description: '', date: '', photo: null });
  setPhotoPreview(null);
  setMechanicList([{ mechanic_id: '' }]);
  setItemList([{ item_id: '', quantity: 1 }]);
};


  return (
    <main className="flex-1 p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Maintenance Report</h2>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded shadow">
        {/* Plate Number */}
        <div>
          <label className="block font-medium mb-1 text-gray-700">Plate Number</label>
          <select
            name="plate_number"
            value={formData.plate_number}
            onChange={handleFormChange}
            required
            className="w-full border p-2 rounded text-gray-700"
          >
            <option value="">Select Truck</option>
            {trucks.map((truck) => (
              <option key={truck.plate_number} value={truck.plate_number}>
                {truck.plate_number}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block font-medium mb-1 text-gray-700">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleFormChange}
            required
            className="w-full border p-2 rounded text-gray-700"
          />
        </div>

        {/* Date */}
        <div>
          <label className="block font-medium mb-1 text-gray-700">Date</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleFormChange}
            required
            className="w-full border p-2 rounded text-gray-700"
          />
        </div>

        {/* Mechanics Section */}
        <div>
          <h3 className="font-bold mb-2 text-gray-700">Mechanics</h3>
          {mechanicList.map((m, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <select
                name="mechanic_id"
                value={m.mechanic_id}
                onChange={(e) => handleMechanicChange(index, e)}
                required
                className="border p-2 rounded flex-1 text-gray-700"
              >
                <option value="">Select Mechanic</option>
                {mechanics.map((mech) => (
                  <option key={mech.mechanic_id} value={mech.mechanic_id}>
                    {mech.name}
                  </option>
                ))}
              </select>
              {mechanicList.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeMechanic(index)}
                  className="text-red-500"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addMechanic} className="text-blue-500">
            + Add Mechanic
          </button>
        </div>

        {/* Items Section */}
        <div>
          <h3 className="font-bold mb-2 text-gray-700">Items Used</h3>
          {itemList.map((i, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <select
                name="item_id"
                value={i.item_id}
                onChange={(e) => handleItemChange(index, e)}
                required
                className="border p-2 rounded flex-1 text-gray-700"
              >
                <option value="">Select Item</option>
                {inventory.map((item) => (
                  <option key={item.item_id} value={item.item_id}>
                    {item.item_name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                name="quantity"
                value={i.quantity}
                min="1"
                onChange={(e) => handleItemChange(index, e)}
                className="w-24 border p-2 rounded text-gray-700"
              />
              {itemList.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="text-red-500"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addItem} className="text-blue-500">
            + Add Item
          </button>
        </div>

        {/* Upload Photo */}
        <div>
          <label className="block font-medium mb-1 text-gray-700">Upload Photo (optional)</label>
          <input className="border p-2 rounded text-gray-700" type="file" name="photo" accept="image/*" onChange={handleFormChange} />
          {photoPreview && (
            <img
              src={photoPreview}
              alt="Preview"
              className="mt-2 w-32 h-32 object-cover rounded border"
            />
          )}
        </div>

        <button type="submit" className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700">
          Save Maintenance Report
        </button>
      </form>
    </main>
  );
};

export default MaintenancePage;
