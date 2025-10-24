'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '../../../supabaseClient';
import { Description } from '@headlessui/react';

const MaintenancePage = () => {
const router = useRouter();
const [currentUser, setCurrentUser] = useState(null);
const [trucks, setTrucks] = useState([]);
const [truckSpecs, setTruckSpecs] = useState([]);
const [mechanics, setMechanics] = useState([]);
const [inventory, setInventory] = useState([]);
const [photoPreview, setPhotoPreview] = useState(null);
const [upcomingMaintenance, setUpcomingMaintenance] = useState([]);
const [showUpcomingModal, setShowUpcomingModal] = useState(false);
const [alert, setAlert] = useState({ show: false, message: '', type: '' });
const [maintenanceData, setMaintenanceData] = useState({});
const [searchPlateNumber, setSearchPlateNumber] = useState('');
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

// ✅ Get Philippines time (UTC+8)
const getPHTime = () => {
const now = new Date();
// Convert to Philippines time (UTC+8)
const phTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
return phTime.toISOString().split('T')[0];
};

// ✅ Format date for Philippines timezone
const formatDateForPH = (dateString) => {
const date = new Date(dateString);
// Add 8 hours for Philippines timezone
const phDate = new Date(date.getTime() + (8 * 60 * 60 * 1000));
return phDate.toISOString().split('T')[0];
};

useEffect(() => {
const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
if (!currentUser) {
router.push("/");
return;
}
setCurrentUser(currentUser);

fetchTrucks();
fetchMechanics();
fetchInventory();
fetchTruckSpecs();
fetchUpcomingMaintenance();
fetchMaintenanceData();

// Check maintenance dates daily to update truck statuses and send notifications
checkMaintenanceDates();
}, [router]);

// Show alert popup
const showAlert = (message, type = 'info') => {
setAlert({ show: true, message, type });
setTimeout(() => setAlert({ show: false, message: '', type: '' }), 5000);
};

// Check if date has reached maintenance limit (5 per day)
const checkMaintenanceLimit = (date) => {
const dateStr = formatDateForPH(date); // Use PH timezone
const maintenanceCount = maintenanceData[dateStr] ? maintenanceData[dateStr].length : 0;
return maintenanceCount >= 5;
};




// ✅ CHECK MAINTENANCE DATES + UPDATE STATUS + SEND ALERT
const checkMaintenanceDates = async () => {
  const today = getPHTime(); // PH timezone date (YYYY-MM-DD)

  // ✅ Prevent multiple checks per page load or refresh
  const lastCheck = localStorage.getItem('lastMaintenanceCheck');
  if (lastCheck === today) {
    console.log('✅ Maintenance already checked today, skipping...');
    return;
  }
  localStorage.setItem('lastMaintenanceCheck', today);

  try {
    const { data: scheduledMaintenance, error } = await supabase
      .from('maintenance')
      .select('plate_number, date, maintenance_type, status')
      .eq('status', 'Scheduled');

    if (error) throw error;

    for (const maintenance of scheduledMaintenance) {
      const maintenanceDate = formatDateForPH(maintenance.date); // PH time

      if (maintenanceDate === today) {
        // ✅ Update truck status to Maintenance
        await supabase
          .from('trucks')
          .update({ status: 'Maintenance' })
          .eq('plate_number', maintenance.plate_number);

        // ✅ Send notification safely
        await sendNotificationToUsers(
          maintenance.plate_number,
          `🚛 Maintenance Alert: Truck ${maintenance.plate_number} is scheduled for ${maintenance.maintenance_type} today!`,
          'warning'
        );
      } else if (maintenanceDate > today) {
        await supabase
          .from('trucks')
          .update({ status: 'Scheduled' })
          .eq('plate_number', maintenance.plate_number);
      }
    }
  } catch (err) {
    console.error('Error checking maintenance dates:', err.message);
  }
};

const fetchTrucks = async () => {
const { data, error } = await supabase
.from('trucks')
.select('*')
.eq('is_archived', false)
// ✅ FILTER OUT DEPLOYED TRUCKS - Only show Available trucks for maintenance
.eq('status', 'Available');
if (!error) setTrucks(data);
};

const fetchTruckSpecs = async () => {
const { data, error } = await supabase.from('truck_specs').select('*');
if (!error) setTruckSpecs(data);
};

const fetchMechanics = async () => {
const { data, error } = await supabase
.from('mechanics')
.select('*')
.eq('is_archived', false);
if (!error) setMechanics(data);
};

const fetchInventory = async () => {
const { data, error } = await supabase
.from('inventory')
.select('*')
.eq('is_archived', false);
if (!error) setInventory(data);
};

const fetchUpcomingMaintenance = async () => {
const { data, error } = await supabase
.from('maintenance')
.select(`*, trucks (plate_number, current_odometer, status), maintenance_mechanics ( mechanics (name) )`)
.eq('status', 'Scheduled')
.order('date', { ascending: true });

if (!error) setUpcomingMaintenance(data);
};

// ✅ UPDATED: Fetch maintenance data for date limit checking with PH timezone
const fetchMaintenanceData = async () => {
try {
// Fetch upcoming maintenance (scheduled)
const { data: maintenance, error } = await supabase
.from('maintenance')
.select(`*, trucks (plate_number, current_odometer, status), maintenance_mechanics ( mechanics (name) )`)
.eq('status', 'Scheduled')
.order('date', { ascending: true });

if (error) throw error;

  // Transform data for date counting using PH timezone
  const maintenanceByDate = {};
  maintenance.forEach(item => {
    const dateStr = formatDateForPH(item.date); // Use PH timezone
    if (!maintenanceByDate[dateStr]) {
      maintenanceByDate[dateStr] = [];
    }
    maintenanceByDate[dateStr].push(item);
  });

  setMaintenanceData(maintenanceByDate);
} catch (error) {
  console.error('Error fetching maintenance data:', error);
}
};

// Get available trucks for maintenance (not archived and not deployed)
const getAvailableTrucks = () => {
return trucks.filter(truck =>
!truck.is_archived &&
truck.status === 'Available'
);
};

// ✅ FILTERED TRUCKS BASED ON SEARCH
const getFilteredTrucks = () => {
const availableTrucks = getAvailableTrucks();
if (!searchPlateNumber) return availableTrucks;

return availableTrucks.filter(truck =>
  truck.plate_number.toLowerCase().includes(searchPlateNumber.toLowerCase())
);
};

// Get available mechanics (not already selected)
const getAvailableMechanics = (currentIndex) => {
const selectedMechanicIds = mechanicList
.map((m, index) => index === currentIndex ? '' : m.mechanic_id)
.filter(id => id);
return mechanics.filter(mech => !selectedMechanicIds.includes(mech.mechanic_id));
};

const handleFormChange = (e) => {
const { name, value, files } = e.target;
if (name === 'photo') {
const file = files[0];
setFormData({ ...formData, photo: file });
setPhotoPreview(URL.createObjectURL(file));
} else {
setFormData({ ...formData, [name]: value });

  // Check maintenance limit when date changes
  if (name === 'date' && value) {
    const isAtLimit = checkMaintenanceLimit(value);
    if (isAtLimit) {
      showAlert('⚠️ Maintenance limit reached for this date (maximum 5 per day)', 'warning');
    }
  }
}
};

// ✅ HANDLE PLATE NUMBER INPUT/SEPARATELY
const handlePlateNumberChange = (e) => {
const value = e.target.value;
setFormData({ ...formData, plate_number: value });
setSearchPlateNumber(value); // Also update search
};

// ✅ HANDLE SEARCH CHANGE
const handleSearchChange = (e) => {
setSearchPlateNumber(e.target.value);
};

// ✅ SELECT TRUCK FROM DROPDOWN
const handleTruckSelect = (plateNumber) => {
setFormData({ ...formData, plate_number: plateNumber });
setSearchPlateNumber(''); // Clear search after selection
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

const addMechanic = () => {
const availableMechanics = getAvailableMechanics(mechanicList.length);
if (availableMechanics.length === 0) {
showAlert('No more mechanics available to add', 'warning');
return;
}
setMechanicList([...mechanicList, { mechanic_id: '' }]);
};

const removeMechanic = (index) => setMechanicList(mechanicList.filter((_, i) => i !== index));

const addItem = () => setItemList([...itemList, { item_id: '', quantity: 1 }]);

const removeItem = (index) => setItemList(itemList.filter((_, i) => i !== index));

// Check if items are available in inventory
const checkInventoryAvailability = async () => {
for (const item of itemList) {
if (item.item_id) {
const inventoryItem = inventory.find(inv => inv.item_id === item.item_id);
if (!inventoryItem) {
showAlert('Item not found in inventory', 'error');
return false;
}
if (inventoryItem.quantity < item.quantity) {
showAlert(`Not enough ${inventoryItem.item_name} in stock. Available: ${inventoryItem.quantity}`, 'error');
return false;
}
}
}
return true;
};

// Check if maintenance can be marked as done (only on maintenance date)
const canMarkAsDone = (maintenanceDate) => {
const today = getPHTime(); // Use Philippines time
const maintenanceDay = formatDateForPH(maintenanceDate); // Use PH timezone
return maintenanceDay === today;
};

// ✅ UPDATED: MARK AS DONE with AUDIT LOGS - FIXED LOGGING
const markAsDone = async (maintenanceId, plateNumber, maintenanceType, maintenanceDate) => {
// Check if it's the maintenance date
if (!canMarkAsDone(maintenanceDate)) {
showAlert('You can only mark maintenance as done on the scheduled date.', 'warning');
return;
}

try {
  const storedUser = JSON.parse(sessionStorage.getItem('currentUser'));
  if (!storedUser?.id) {
    showAlert("You must be logged in to mark maintenance as done.", 'error');
    router.push("/");
    return;
  }

  console.log('Starting mark as done process for maintenance:', maintenanceId);

  // ✅ CRITICAL: First record to maintenance_logs BEFORE updating maintenance
  console.log('Inserting into maintenance_logs...');
  const { data: logData, error: logError } = await supabase
    .from('maintenance_logs')
    .insert([{
      maintenance_id: maintenanceId,
      status: 'Completed',
      completed_at: new Date().toISOString(),
      completed_by: storedUser.id,
      notes: `Maintenance completed: ${maintenanceType}`
    }])
    .select();

  if (logError) {
    console.error('Error inserting into maintenance_logs:', logError.message);
    throw logError;
  }
  console.log('Successfully inserted into maintenance_logs:', logData);

  // Then update maintenance to completed
  const { error: updateError } = await supabase
    .from('maintenance')
    .update({
      status: 'Completed',
      completed_at: new Date().toISOString(),
      completed_by: storedUser.id,
    })
    .eq('maintenance_id', maintenanceId);
  
  if (updateError) throw updateError;

  // ✅ CRITICAL FIX: Check if there are other pending maintenance for this truck
  const { data: pendingMaintenance, error: pendingError } = await supabase
    .from('maintenance')
    .select('maintenance_id, date')
    .eq('plate_number', plateNumber)
    .eq('status', 'Scheduled')
    .neq('maintenance_id', maintenanceId);

  if (pendingError) throw pendingError;

  let notificationMessage = `Maintenance for truck ${plateNumber} (${maintenanceType}) marked as completed.`;

  // Only update truck status to Available if NO other pending maintenance exists
  if (pendingMaintenance.length === 0) {
    // Truck status back to Available only if no more scheduled maintenance
    await supabase.from('trucks').update({ status: 'Available' }).eq('plate_number', plateNumber);
    notificationMessage += ' Truck is now Available.';
  } else {
    notificationMessage += ` Truck has ${pendingMaintenance.length} more maintenance scheduled.`;
  }

  // ✅ Special handling for Change Oil - NOW IN KM ONLY
  if (maintenanceType === 'Change Oil') {
    const truck = trucks.find(t => t.plate_number === plateNumber);
    if (truck) {
      if (!truck.spec_id) {
        showAlert(`✅ Completed! (Truck has no spec_id)`, 'success');
      } else {
        const spec = truckSpecs.find(s => s.spec_id === truck.spec_id);
        if (!spec?.change_oil_interval) {
          showAlert(`✅ Completed! (No interval found for spec_id ${truck.spec_id})`, 'success');
        } else {
          const currentOdo = truck.current_odometer || 0;
          // Now using km directly - no conversion
          const nextOdo = currentOdo + spec.change_oil_interval;
          const { error: truckError } = await supabase
            .from('trucks')
            .update({
              last_change_oil_odometer: currentOdo,
              next_change_oil_odometer: nextOdo,
            })
            .eq('plate_number', plateNumber);

          if (truckError) throw truckError;
          showAlert(`✅ Change oil done!\nLast: ${currentOdo} km\nNext: ${nextOdo} km`, 'success');
        }
      }
    }
  } else {
    showAlert('✅ Maintenance marked as done!', 'success');
  }

  // ✅ ADD AUDIT LOG FOR MARK AS DONE
  await supabase.from("audit_logs").insert([{
    user_id: storedUser.id,
    role: storedUser.role,
    action: "Completed",
    table_name: "maintenance",
    description: `Maintenance ID ${maintenanceId} for truck ${plateNumber} marked as completed by ${storedUser.name || storedUser.email}.`,
    created_at: new Date().toISOString()
  }]);

  // ❌ REMOVED: Send SINGLE notification (not multiple) for completion
  // await sendNotificationToUsers(notificationMessage, 'info'); 

  fetchUpcomingMaintenance();
  fetchTrucks(); // Refresh trucks to update status
  fetchMaintenanceData(); // Refresh maintenance data for limit checking
  
  console.log('✅ Mark as done process completed successfully');
} catch (err) {
  console.error("❌ Error marking maintenance as done:", err?.message || err);
  showAlert(`⚠️ Failed to mark maintenance as done.\n\nDetails: ${err?.message || err}`, 'error');
}
};

// ✅ UPDATED: CANCEL MAINTENANCE with AUDIT LOGS
const cancelMaintenance = async (maintenanceId, plateNumber) => {
if (!window.confirm('Are you sure you want to cancel this maintenance?')) return;
try {
const storedUser = JSON.parse(sessionStorage.getItem('currentUser'));
if (!storedUser?.id) {
showAlert("You must be logged in to cancel maintenance.", 'error');
router.push("/");
return;
}

console.log('Starting cancellation process for maintenance:', maintenanceId);

  const { data: usedItems, error: itemsError } = await supabase
    .from('maintenance_items')
    .select('item_id, quantity')
    .eq('maintenance_id', maintenanceId);
  if (itemsError) throw itemsError;

  console.log('Found used items:', usedItems);

  // Return items to inventory
  for (const item of usedItems) {
    await supabase.rpc('increment_inventory_quantity', {
      item_id_input: item.item_id,
      qty_input: item.quantity,
    });
  }

  // ✅ RECORD CANCELLATION IN MAINTENANCE_LOGS FIRST (before deleting)
  console.log('Inserting into maintenance_logs...');
  const { data: logData, error: logError } = await supabase
    .from('maintenance_logs')
    .insert([{
      maintenance_id: maintenanceId,
      status: 'Cancelled',
      completed_at: new Date().toISOString(),
      completed_by: storedUser.id,
      notes: 'Maintenance cancelled by user'
    }])
    .select();

  if (logError) {
    console.error('Error inserting into maintenance_logs:', logError);
    throw logError;
  }
  console.log('Successfully inserted into maintenance_logs:', logData);

  // ✅ CRITICAL FIX: Check if there are other pending maintenance for this truck
  const { data: pendingMaintenance, error: pendingError } = await supabase
    .from('maintenance')
    .select('maintenance_id, date')
    .eq('plate_number', plateNumber)
    .eq('status', 'Scheduled')
    .neq('maintenance_id', maintenanceId);

  if (pendingError) throw pendingError;

  let notificationMessage = `Maintenance for truck ${plateNumber} cancelled.`;

  // Only update truck status to Available if NO other pending maintenance exists
  if (pendingMaintenance.length === 0) {
    // Truck status back to Available only if no more scheduled maintenance
    await supabase.from('trucks').update({ status: 'Available' }).eq('plate_number', plateNumber);
    notificationMessage += ' Truck is now Available.';
  } else {
    notificationMessage += ` Truck has ${pendingMaintenance.length} more maintenance scheduled.`;
  }

  // Now delete the related records and maintenance
  console.log('Deleting maintenance items...');
  await supabase.from('maintenance_items').delete().eq('maintenance_id', maintenanceId);
  
  console.log('Deleting maintenance mechanics...');
  await supabase.from('maintenance_mechanics').delete().eq('maintenance_id', maintenanceId);
  
  console.log('Deleting maintenance record...');
  await supabase.from('maintenance').delete().eq('maintenance_id', maintenanceId);

  // ✅ ADD AUDIT LOG FOR CANCELLATION
  console.log('Adding audit log...');
  await supabase.from("audit_logs").insert([{
    user_id: storedUser.id,
    role: storedUser.role,
    action: "Cancelled",
    table_name: "maintenance",
    description: `Maintenance ID ${maintenanceId} for truck ${plateNumber} cancelled by ${storedUser.name || storedUser.email}.`,
    created_at: new Date().toISOString()
  }]);

  console.log('Cancellation process completed successfully');
  // ❌ NOTE: No broadcast notification is sent here, which aligns with your request.
  showAlert('❌ Maintenance canceled and items returned to inventory.', 'success');
  fetchUpcomingMaintenance();
  fetchTrucks(); // Refresh trucks to update status
  fetchMaintenanceData(); // Refresh maintenance data for limit checking
} catch (err) {
  console.error('Cancel error:', err);
  showAlert('⚠️ Failed to cancel maintenance.', 'error');
}
};

// 📝 EDIT MAINTENANCE
const editMaintenance = (maintenance) => {
setFormData({
maintenance_id: maintenance.maintenance_id,
plate_number: maintenance.plate_number,
description: maintenance.description,
date: formatDateForPH(maintenance.date), // Use PH timezone for display
maintenance_type: maintenance.maintenance_type,
photo: null,
});
setShowUpcomingModal(false);
showAlert('You can now edit and reschedule this maintenance.', 'info');
};

// ✅ UPDATED: SUBMIT MAINTENANCE with AUDIT LOGS and FIXED NOTIFICATIONS
const handleSubmit = async (e) => {
e.preventDefault();
const storedUser = JSON.parse(sessionStorage.getItem('currentUser'));
if (!storedUser?.id) {
showAlert("You must be logged in.", 'error');
router.push("/");
return;
}

// ✅ Check if plate number is provided
if (!formData.plate_number.trim()) {
  showAlert('❌ Please enter a plate number.', 'error');
  return;
}

// ✅ Check maintenance limit (5 per day) with PH timezone
if (checkMaintenanceLimit(formData.date)) {
  showAlert('❌ Cannot schedule maintenance. Maximum 5 maintenance tasks allowed per day for this date.', 'error');
  return;
}

// Check inventory availability before proceeding
const isInventoryAvailable = await checkInventoryAvailability();
if (!isInventoryAvailable) {
  return;
}

let photo_url = null;
if (formData.photo) {
  const fileExt = formData.photo.name.split('.').pop();
  const fileName = `maintenance-${Date.now()}.${fileExt}`;
  const { error: uploadError } = await supabase.storage
    .from('maintenance-photos')
    .upload(fileName, formData.photo, { upsert: true });
  if (uploadError) {
    showAlert("Photo upload failed", 'error');
    return;
  }
  const { data: publicUrlData } = await supabase.storage
    .from('maintenance-photos')
    .getPublicUrl(fileName);
  photo_url = publicUrlData.publicUrl;
}

try {
  if (formData.maintenance_id) {
    // Update existing maintenance
    await supabase.from('maintenance').update({
      plate_number: formData.plate_number,
      description: formData.description,
      date: formData.date,
      maintenance_type: formData.maintenance_type,
      photo_url,
    }).eq('maintenance_id', formData.maintenance_id);

    // ✅ ADD AUDIT LOG FOR UPDATE
    await supabase.from("audit_logs").insert([{
      user_id: storedUser.id,
      role: storedUser.role,
      action: "Edit",
      table_name: "maintenance",
      description: `Maintenance ID ${formData.maintenance_id} for truck ${formData.plate_number} updated by ${storedUser.name || storedUser.email}.`,
      created_at: new Date().toISOString()
    }]);

    showAlert('Maintenance updated successfully!', 'success');
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

    if (error) {
      showAlert(error.message, 'error');
      return;
    }

    // Set truck status based on date
    const today = getPHTime(); // Use Philippines time
    const maintenanceDate = formData.date;
    const truckStatus = maintenanceDate === today ? 'Maintenance' : 'Scheduled';
    
    await supabase.from('trucks')
      .update({ status: truckStatus })
      .eq('plate_number', formData.plate_number);

    const maintenance_id = data[0].maintenance_id;

    // Insert mechanics
    const mechanicRows = mechanicList.filter(m => m.mechanic_id).map(m => ({
      maintenance_id, mechanic_id: m.mechanic_id
    }));
    if (mechanicRows.length) await supabase.from('maintenance_mechanics').insert(mechanicRows);

    // Insert items and deduct from inventory
    const itemRows = itemList.filter(i => i.item_id).map(i => ({
      maintenance_id, item_id: i.item_id, quantity: Number(i.quantity)
    }));
    if (itemRows.length) {
      await supabase.from('maintenance_items').insert(itemRows);
      
      // Deduct items from inventory
      for (const item of itemRows) {
        await supabase.rpc('decrement_inventory_quantity', {
          item_id_input: item.item_id,
          qty_input: item.quantity,
        });
      }
    }

    // ✅ ADD AUDIT LOG FOR SCHEDULING
    await supabase.from("audit_logs").insert([{
      user_id: storedUser.id,
      role: storedUser.role,
      action: "Scheduled",
      table_name: "maintenance",
      description: `New maintenance scheduled for truck ${formData.plate_number} (${formData.maintenance_type}) on ${formData.date} by ${storedUser.name || storedUser.email}.`,
      created_at: new Date().toISOString()
    }]);

    // ❌ REMOVED: Send SINGLE NOTIFICATION for new maintenance
    /*
    await sendNotificationToUsers(
      `🔧 New Maintenance Scheduled: Truck ${formData.plate_number} for ${formData.maintenance_type} on ${formData.date}`,
      'info'
    );
    */

    showAlert('✅ Maintenance scheduled successfully!', 'success');
  }

  // Reset form
  setFormData({ maintenance_id: null, plate_number: '', description: '', date: '', maintenance_type: '', photo: null });
  setPhotoPreview(null);
  setMechanicList([{ mechanic_id: '' }]);
  setItemList([{ item_id: '', quantity: 1 }]);
  setSearchPlateNumber('');
  fetchUpcomingMaintenance();
  fetchTrucks(); // Refresh trucks to update status
  fetchMaintenanceData(); // Refresh maintenance data for limit checking
} catch (err) {
  console.error('Submit error:', err);
  showAlert('Failed to schedule maintenance.', 'error');
}
};

// Redirect to login if user is not authenticated
if (!currentUser) {
return (
<main className="flex-1 p-6 bg-gray-50 min-h-screen flex items-center justify-center">
<div className="text-center">
<p className="text-gray-600 mb-4">Redirecting to login...</p>
</div>
</main>
);
}

// ... rest of the component (return JSX) is unchanged for brevity ...
return (
<main className="flex-1 p-6 bg-gray-50 min-h-screen">
{/* Alert Popup */}
{alert.show && (
<div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4 ${ alert.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : alert.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : alert.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-blue-50 border-blue-200 text-blue-800' } border rounded-lg shadow-lg p-4 transition-all duration-300 ease-in-out`}>
<div className="flex items-center justify-between">
<div className="flex items-center">
{alert.type === 'error' && (
<svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
</svg>
)}
{alert.type === 'success' && (
<svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
</svg>
)}
{alert.type === 'warning' && (
<svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
<path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
</svg>
)}
{alert.type === 'info' && (
<svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
<path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
</svg>
)}
<span className="font-medium">{alert.message}</span>
</div>
<button
onClick={() => setAlert({ show: false, message: '', type: '' })}
className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
>
<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
</svg>
</button>
</div>
</div>
)}
<div className="max-w-6xl mx-auto">
    <div className="mb-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-2">Maintenance Management</h2>
      <p className="text-gray-600">Schedule and manage truck maintenance operations</p>
    </div>

    <div className="flex flex-col lg:flex-row gap-8">
      {/* Main Content */}
      <div className="flex-1">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <h3 className="text-xl font-semibold text-white">
              {formData.maintenance_id ? 'Edit Maintenance' : 'Schedule New Maintenance'}
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Maintenance Limit Warning */}
            {formData.date && checkMaintenanceLimit(formData.date) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <i className="fas fa-exclamation-triangle text-red-500 mr-3"></i>
                  <div>
                    <p className="text-red-800 font-medium">Maintenance Limit Reached</p>
                    <p className="text-red-600 text-sm">Maximum 5 maintenance tasks allowed per day. Please choose a different date.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block mb-2 font-medium text-gray-700">Plate Number *</label>
                
                {/* ✅ SEARCHABLE PLATE NUMBER INPUT */}
                <div className="space-y-2">
                  <input
                    type="text"
                    name="plate_number"
                    value={formData.plate_number}
                    onChange={handlePlateNumberChange}
                    placeholder="Type or select plate number"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                  
                  {/* Search Input */}
                  <input
                    type="text"
                    value={searchPlateNumber}
                    onChange={handleSearchChange}
                    placeholder="Search available trucks..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-transparent transition-colors"
                  />
                  
                  {/* Truck Suggestions Dropdown */}
                  {searchPlateNumber && (
                    <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-lg">
                      {getFilteredTrucks().map(truck => (
                        <div
                          key={truck.plate_number}
                          onClick={() => handleTruckSelect(truck.plate_number)}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                        >
                          <div className="font-medium text-gray-800">{truck.plate_number}</div>
                          <div className="text-xs text-gray-500">Status: {truck.status}</div>
                        </div>
                      ))}
                      {getFilteredTrucks().length === 0 && (
                        <div className="px-3 py-2 text-gray-500 text-sm">
                          No available trucks found
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <p className="text-sm text-gray-500 mt-1">
                  Type the plate number or search from available trucks
                </p>
              </div>

              <div>
                <label className="block mb-2 font-medium text-gray-700">Maintenance Type *</label>
                <select
                  name="maintenance_type"
                  value={formData.maintenance_type}
                  onChange={handleFormChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  <option value="">Select Type</option>
                  <option value="Change Oil">Change Oil</option>
                  <option value="Repair">Repair</option>
                  <option value="Inspection">Inspection</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block mb-2 font-medium text-gray-700">Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                required
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Describe the maintenance work to be performed..."
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-gray-700">Date *</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleFormChange}
                required
                min={getPHTime()} // Use Philippines time for min date
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
              {formData.date && (
                <p className="text-sm text-gray-600 mt-2">
                  Maintenance scheduled for this date: {maintenanceData[formatDateForPH(formData.date)]?.length || 0}/5
                </p>
              )}
            </div>

            {/* Mechanics Section */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-800">Assigned Mechanics</h4>
                <button 
                  type="button" 
                  onClick={addMechanic}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Mechanic
                </button>
              </div>
              
              {mechanicList.map((m, i) => (
                <div key={i} className="flex gap-3 mb-3 items-center text-gray-500">
                  <select
                    name="mechanic_id"
                    value={m.mechanic_id}
                    onChange={(e) => handleMechanicChange(i, e)}
                    required
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="">Select Mechanic</option>
                    {m.mechanic_id && (
                      <option key={m.mechanic_id} value={m.mechanic_id}>
                        {mechanics.find(mech => mech.mechanic_id === m.mechanic_id)?.name}
                      </option>
                    )}
                    {getAvailableMechanics(i).map(mech => (
                      <option key={mech.mechanic_id} value={mech.mechanic_id}>
                        {mech.name}
                      </option>
                    ))}
                  </select>
                  {mechanicList.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => removeMechanic(i)}
                      className="text-red-500 hover:text-red-700 p-2 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Items Section */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-800">Items Used</h4>
                <button 
                  type="button" 
                  onClick={addItem}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Item
                </button>
              </div>
              
              {itemList.map((i, index) => (
                <div key={index} className="flex gap-3 mb-3 items-center">
                  <select
                    name="item_id"
                    value={i.item_id}
                    onChange={(e) => handleItemChange(index, e)}
                    required
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="">Select Item</option>
                    {inventory.map(item => (
                      <option key={item.item_id} value={item.item_id}>
                        {item.item_name} ({item.quantity} available)
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    name="quantity"
                    value={i.quantity}
                    min="1"
                    onChange={(e) => handleItemChange(index, e)}
                    className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                  {itemList.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => removeItem(index)}
                      className="text-red-500 hover:text-red-700 p-2 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block mb-2 font-medium text-gray-700">Upload Photo</label>
              <input 
                type="file" 
                name="photo" 
                accept="image/*" 
                onChange={handleFormChange} 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold text-gray-500 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
              />
              {photoPreview && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600 mb-2">Preview:</p>
                  <img src={photoPreview} alt="Preview" className="w-40 h-40 object-cover rounded-lg border border-gray-300" />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={formData.date && checkMaintenanceLimit(formData.date)}
                className={`px-6 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors font-medium ${
                  formData.date && checkMaintenanceLimit(formData.date)
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                }`}
              >
                {formData.maintenance_id ? 'Update Maintenance' : 'Schedule Maintenance'}
              </button>
              
              <button
                type="button"
                onClick={() => setShowUpcomingModal(true)}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors font-medium"
              >
                View Upcoming ({upcomingMaintenance.length})
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>

  {/* Upcoming Maintenance Modal */}
  {showUpcomingModal && (
    <div className="fixed inset-0 backdrop-blur-md bg-gray-900/20 flex items-center justify-center p-4 z-40">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-white">Upcoming Maintenance</h3>
            <button 
              onClick={() => setShowUpcomingModal(false)} 
              className="text-white hover:text-gray-200 text-2xl transition-colors"
            >
              &times;
            </button>
          </div>
        </div>

        <div className="p-6 max-h-[calc(90vh-80px)] overflow-y-auto">
          {upcomingMaintenance.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-600">No upcoming maintenance scheduled.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {upcomingMaintenance.map(m => {
                const canMarkDone = canMarkAsDone(m.date);
                const truckStatus = m.trucks?.status || 'Unknown';
                
                return (
                  <div key={m.maintenance_id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-800 text-lg">Truck: {m.plate_number}</h4>
                        <p className="text-gray-600">Type: {m.maintenance_type}</p>
                        <p className="text-gray-600">Truck Status: 
                          <span className={`ml-1 font-medium ${
                            truckStatus === 'Scheduled' ? 'text-blue-600' :
                            truckStatus === 'Maintenance' ? 'text-amber-600' :
                            'text-green-600'
                          }`}>
                            {truckStatus}
                          </span>
                        </p>
                      </div>
                      <span className="bg-amber-100 text-amber-800 text-sm font-medium px-2.5 py-0.5 rounded">
                        {m.status}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 mb-2">Description: {m.description}</p>
                    <p className="text-gray-600 mb-2">Date: {new Date(m.date).toLocaleDateString('en-PH')}</p>
                    
                    {m.maintenance_mechanics?.length > 0 && (
                      <p className="text-gray-600 mb-3">
                        Mechanics: {m.maintenance_mechanics.map(mm => mm.mechanics.name).join(', ')}
                      </p>
                    )}

                    <div className="flex gap-2 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => markAsDone(m.maintenance_id, m.plate_number, m.maintenance_type, m.date)}
                        disabled={!canMarkDone}
                        className={`px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors text-sm font-medium ${
                          canMarkDone 
                            ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500' 
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {canMarkDone ? 'Mark as Done' : 'Not Today'}
                      </button>
                      <button
                        onClick={() => cancelMaintenance(m.maintenance_id, m.plate_number)}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-colors text-sm font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => editMaintenance(m)}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors text-sm font-medium"
                      >
                        Edit
                      </button>
                    </div>
                    {!canMarkDone && (
                      <p className="text-sm text-amber-600 mt-2">
                        Maintenance can only be marked as done on the scheduled date ({new Date(m.date).toLocaleDateString('en-PH')})
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )}
</main>
);
};
export default MaintenancePage;