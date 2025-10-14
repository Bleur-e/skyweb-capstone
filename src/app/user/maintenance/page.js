'use client';

import React, { useState, useEffect } from 'react';
import supabase from '../../../supabaseClient';

const MaintenancePage = () => {
  const [trucks, setTrucks] = useState([]);
  const [truckSpecs, setTruckSpecs] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [upcomingMaintenance, setUpcomingMaintenance] = useState([]);
  const [showUpcomingModal, setShowUpcomingModal] = useState(false);

  const [formData, setFormData] = useState({
    maintenance_id: null,
    plate_number: '',
    description: '',
    date: '',
    maintenance_type: '',
    photo: null,
  });
  const [mechanicList, setMechanicList] = useState([{ mechanic_id: '' }]);
  const [itemList, setItemList] = useState([{ item_id: '', quantity: 1 }]);

  useEffect(() => {
    fetchTrucks();
    fetchMechanics();
    fetchInventory();
    fetchTruckSpecs();
    fetchUpcomingMaintenance();
  }, []);

  const fetchTrucks = async () => {
    const { data, error } = await supabase.from('trucks').select('*');
    if (!error) setTrucks(data);
  };

  const fetchTruckSpecs = async () => {
    const { data, error } = await supabase.from('truck_specs').select('*');
    if (!error) setTruckSpecs(data);
  };

  const fetchMechanics = async () => {
    const { data, error } = await supabase.from('mechanics').select('*');
    if (!error) setMechanics(data);
  };

  const fetchInventory = async () => {
    const { data, error } = await supabase.from('inventory').select('*');
    if (!error) setInventory(data);
  };

  const fetchUpcomingMaintenance = async () => {
    const { data, error } = await supabase
      .from('maintenance')
      .select(`
        *,
        trucks (plate_number, current_odometer),
        maintenance_mechanics (
          mechanics (name)
        )
      `)
      .eq('status', 'Scheduled')
      .order('date', { ascending: true });

    if (!error) setUpcomingMaintenance(data);
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
  const removeMechanic = (index) => setMechanicList(mechanicList.filter((_, i) => i !== index));

  const addItem = () => setItemList([...itemList, { item_id: '', quantity: 1 }]);
  const removeItem = (index) => setItemList(itemList.filter((_, i) => i !== index));

  // ✅ MARK AS DONE
  const markAsDone = async (maintenanceId, plateNumber, maintenanceType) => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('currentUser'));
      if (!storedUser?.id) return alert("You must be logged in to mark maintenance as done.");

      // Update maintenance to completed
      const { error: updateError } = await supabase
        .from('maintenance')
        .update({
          status: 'Completed',
          completed_at: new Date().toISOString(),
          completed_by: storedUser.id,
        })
        .eq('maintenance_id', maintenanceId);
      if (updateError) throw updateError;

      // Record to logs
      await supabase.from('maintenance_logs').insert([{
        maintenance_id: maintenanceId,
        status: 'Completed',
        completed_at: new Date().toISOString(),
        completed_by: storedUser.id,
      }]);

      let notificationMessage = `Maintenance for truck ${plateNumber} (${maintenanceType}) marked as completed.`;

      // ✅ Special handling for Change Oil
      if (maintenanceType === 'Change Oil') {
        const truck = trucks.find(t => t.plate_number === plateNumber);
        if (truck) {
          if (!truck.spec_id) {
            alert(`✅ Completed! (Truck has no spec_id)`);
          } else {
            const spec = truckSpecs.find(s => s.spec_id === truck.spec_id);
            if (!spec?.change_oil_interval) {
              alert(`✅ Completed! (No interval found for spec_id ${truck.spec_id})`);
            } else {
              const currentOdo = truck.current_odometer || 0;
              // Convert the interval (which is in km) into miles
              const intervalInMiles = spec.change_oil_interval / 1.60934;
              // Correctly compute the next change oil odometer in miles
              const nextOdo = currentOdo + intervalInMiles;
              const { error: truckError } = await supabase
                .from('trucks')
                .update({
                  last_change_oil_odometer: currentOdo,
                  next_change_oil_odometer: nextOdo,
                })
                .eq('plate_number', plateNumber);

              if (truckError) throw truckError;
              alert(`✅ Change oil done!\nLast: ${currentOdo} km\nNext: ${nextOdo} km`);
            }
          }
        }
      } else {
        alert('✅ Maintenance marked as done!');
      }

      // Truck status back to Available
      await supabase.from('trucks').update({ status: 'Available' }).eq('plate_number', plateNumber);

      // Add audit + notification
      await supabase.from("audit_logs").insert([{
        user_id: storedUser.id,
        role: storedUser.role,
        action: "Update",
        table_name: "maintenance",
        description: `Maintenance ID ${maintenanceId} for truck ${plateNumber} marked as completed.`,
      }]);

      await supabase.from("notifications").insert([{
        message: notificationMessage,
        type: "info",
        user_id: storedUser.id,
      }]);

      fetchUpcomingMaintenance();
    } catch (err) {
      console.error("❌ Error marking maintenance as done:", err?.message || err);
      alert(`⚠️ Failed to mark maintenance as done.\n\nDetails: ${err?.message || err}`);
    }
  };

  // 🔴 CANCEL MAINTENANCE
  const cancelMaintenance = async (maintenanceId) => {
    if (!confirm('Are you sure you want to cancel this maintenance?')) return;
    try {
      const { data: usedItems, error: itemsError } = await supabase
        .from('maintenance_items')
        .select('item_id, quantity')
        .eq('maintenance_id', maintenanceId);
      if (itemsError) throw itemsError;

      // Return items to inventory
      for (const item of usedItems) {
        await supabase.rpc('increment_inventory_quantity', {
          item_id_input: item.item_id,
          qty_input: item.quantity,
        });
      }

      await supabase.from('maintenance_items').delete().eq('maintenance_id', maintenanceId);
      await supabase.from('maintenance_mechanics').delete().eq('maintenance_id', maintenanceId);
      await supabase.from('maintenance').delete().eq('maintenance_id', maintenanceId);

      alert('❌ Maintenance canceled and items returned to inventory.');
      fetchUpcomingMaintenance();
    } catch (err) {
      console.error('Cancel error:', err);
      alert('⚠️ Failed to cancel maintenance.');
    }
  };

  // 📝 EDIT MAINTENANCE
  const editMaintenance = (maintenance) => {
    setFormData({
      maintenance_id: maintenance.maintenance_id,
      plate_number: maintenance.plate_number,
      description: maintenance.description,
      date: maintenance.date.split('T')[0],
      maintenance_type: maintenance.maintenance_type,
      photo: null,
    });
    setShowUpcomingModal(false);
    alert('You can now edit and reschedule this maintenance.');
  };

  // ✅ SUBMIT MAINTENANCE
  const handleSubmit = async (e) => {
    e.preventDefault();
    const storedUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!storedUser?.id) return alert("You must be logged in.");

    let photo_url = null;
    if (formData.photo) {
      const fileExt = formData.photo.name.split('.').pop();
      const fileName = `maintenance-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('maintenance-photos')
        .upload(fileName, formData.photo, { upsert: true });
      if (uploadError) return alert("Photo upload failed");
      const { data: publicUrlData } = await supabase.storage
        .from('maintenance-photos')
        .getPublicUrl(fileName);
      photo_url = publicUrlData.publicUrl;
    }

    if (formData.maintenance_id) {
      // Update existing
      await supabase.from('maintenance').update({
        plate_number: formData.plate_number,
        description: formData.description,
        date: formData.date,
        maintenance_type: formData.maintenance_type,
        photo_url,
      }).eq('maintenance_id', formData.maintenance_id);
      alert('Maintenance updated!');
    } else {
      // New schedule
      const { data, error } = await supabase.from('maintenance').insert([{
        plate_number: formData.plate_number,
        description: formData.description,
        date: formData.date,
        maintenance_type: formData.maintenance_type,
        photo_url,
        encoded_by: storedUser.id,
        status: 'Scheduled',
      }]).select();

      if (error) return alert(error.message);

      await supabase.from('trucks').update({ status: 'Maintenance' }).eq('plate_number', formData.plate_number);

      const maintenance_id = data[0].maintenance_id;

      const mechanicRows = mechanicList.filter(m => m.mechanic_id).map(m => ({
        maintenance_id, mechanic_id: m.mechanic_id
      }));
      if (mechanicRows.length) await supabase.from('maintenance_mechanics').insert(mechanicRows);

      const itemRows = itemList.filter(i => i.item_id).map(i => ({
        maintenance_id, item_id: i.item_id, quantity: Number(i.quantity)
      }));
      if (itemRows.length) await supabase.from('maintenance_items').insert(itemRows);

      alert('Maintenance scheduled!');
    }

    setFormData({ maintenance_id: null, plate_number: '', description: '', date: '', maintenance_type: '', photo: null });
    setPhotoPreview(null);
    setMechanicList([{ mechanic_id: '' }]);
    setItemList([{ item_id: '', quantity: 1 }]);
    fetchUpcomingMaintenance();
  };

  return (
    <main className="flex-1 p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Maintenance Schedule</h2>

      <button
        onClick={() => setShowUpcomingModal(true)}
        className="mb-6 bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700"
      >
        View Upcoming Maintenance ({upcomingMaintenance.length})
      </button>

      {showUpcomingModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex justify-center items-center overflow-y-auto">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-600">Upcoming Maintenance</h3>
              <button onClick={() => setShowUpcomingModal(false)} className="text-gray-600 text-2xl">&times;</button>
            </div>

            {upcomingMaintenance.length === 0 ? (
              <p className="text-gray-600">No upcoming maintenance scheduled.</p>
            ) : (
              <ul className="space-y-4">
                {upcomingMaintenance.map(m => (
                  <li key={m.maintenance_id} className="bg-gray-50 p-4 rounded-lg border ">
                    <p className="font-semibold text-gray-600">Truck: {m.plate_number}</p>
                    <p className="text-gray-600">Type: {m.maintenance_type}</p>
                    <p className="text-gray-600">Description: {m.description}</p>
                    <p className="text-gray-600">Date: {new Date(m.date).toLocaleDateString()}</p>
                    <p className="text-gray-600">Status: <span className="text-amber-600">{m.status}</span></p>
                    {m.maintenance_mechanics?.length > 0 && (
                      <p className="text-gray-600">Mechanics: {m.maintenance_mechanics.map(mm => mm.mechanics.name).join(', ')}</p>
                    )}

                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => markAsDone(m.maintenance_id, m.plate_number, m.maintenance_type)}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                      >
                        Mark as Done
                      </button>
                      <button
                        onClick={() => cancelMaintenance(m.maintenance_id)}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => editMaintenance(m)}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                      >
                        Edit
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded shadow mt-8">
        <div>
          <label className="block mb-1 font-medium text-gray-600">Plate Number</label>
          <select
            name="plate_number"
            value={formData.plate_number}
            onChange={handleFormChange}
            required
            className="w-full border p-2 rounded text-gray-600"
          >
            <option value="">Select Truck</option>
            {trucks.map(truck => (
              <option key={truck.plate_number} value={truck.plate_number}>
                {truck.plate_number}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1 font-medium text-gray-600">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleFormChange}
            required
            className="w-full border p-2 rounded text-gray-600"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium text-gray-600">Maintenance Type</label>
          <select
            name="maintenance_type"
            value={formData.maintenance_type}
            onChange={handleFormChange}
            required
            className="w-full border p-2 rounded text-gray-600"
          >
            <option value="">Select Type</option>
            <option value="Change Oil">Change Oil</option>
            <option value="Repair">Repair</option>
            <option value="Inspection">Inspection</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block mb-1 font-medium text-gray-600">Date</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleFormChange}
            required
            min={new Date().toISOString().split('T')[0]}
            className="w-full border p-2 rounded text-gray-600"
          />
        </div>

        {/* Mechanics */}
        <div>
          <h3 className="font-bold mb-2 text-gray-600">Mechanics</h3>
          {mechanicList.map((m, i) => (
            <div key={i} className="flex gap-2 mb-2 items-center text-gray-600">
              <select
                name="mechanic_id"
                value={m.mechanic_id}
                onChange={(e) => handleMechanicChange(i, e)}
                required
                className="border p-2 rounded flex-1"
              >
                <option value="">Select Mechanic</option>
                {mechanics.map(mech => (
                  <option key={mech.mechanic_id} value={mech.mechanic_id}>
                    {mech.name}
                  </option>
                ))}
              </select>
              {mechanicList.length > 1 && (
                <button type="button" onClick={() => removeMechanic(i)} className="text-red-500">Remove</button>
              )}
            </div>
          ))}
          <button type="button" onClick={addMechanic} className="text-blue-500">+ Add Mechanic</button>
        </div>

        {/* Items */}
        <div>
          <h3 className="font-bold mb-2 text-gray-600">Items Used</h3>
          {itemList.map((i, index) => (
            <div key={index} className="flex gap-2 mb-2 items-center text-gray-600">
              <select
                name="item_id"
                value={i.item_id}
                onChange={(e) => handleItemChange(index, e)}
                required
                className="border p-2 rounded flex-1"
              >
                <option value="">Select Item</option>
                {inventory.map(item => (
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
                className="w-24 border p-2 rounded"
              />
              {itemList.length > 1 && (
                <button type="button" onClick={() => removeItem(index)} className="text-red-500">Remove</button>
              )}
            </div>
          ))}
          <button type="button" onClick={addItem} className="text-blue-500">+ Add Item</button>
        </div>

        {/* Photo */}
        <div>
          <label className="block mb-1 font-medium text-gray-600">Upload Photo</label>
          <input type="file" name="photo" accept="image/*" onChange={handleFormChange} className="border p-2 rounded text-gray-600"/>
          {photoPreview && (
            <img src={photoPreview} alt="Preview" className="mt-2 w-40 rounded border" />
          )}
        </div>

        <button
          type="submit"
          className="bg-green-600 text-white px-5 py-2 rounded hover:bg-green-700"
        >
          {formData.maintenance_id ? 'Update Maintenance' : 'Schedule Maintenance'}
        </button>
      </form>
    </main>
  );
};

export default MaintenancePage;
