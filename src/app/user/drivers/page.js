'use client';

import React, { useState, useEffect } from 'react';
import supabase from '../../../supabaseClient';
import { useRouter } from 'next/navigation';

const DriverPage = () => {
  const router = useRouter();
  const [isModalOpen, setModalOpen] = useState(false);
  const [isViewModalOpen, setViewModalOpen] = useState(false);
  const [isArchiveModalOpen, setArchiveModalOpen] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [formData, setFormData] = useState({
    driver_id: '',
    name: '',
    contact_no: '',
    address: '',
    birthdate: '',
    photo: null,
    truck_assigned: null,
  });
  const [editFormData, setEditFormData] = useState({
    contact_no: '',
    address: '',
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [editingDriver, setEditingDriver] = useState(null);
  const [viewingDriver, setViewingDriver] = useState(null);
  const [archivingDriver, setArchivingDriver] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
    if (!currentUser) {
      router.push("/");
      return;
    }
    setCurrentUser(currentUser);
    
    fetchDrivers();
  }, [router]);

  const fetchDrivers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('drivers')
      .select(`
        *,
        trucks!trucks_driver_fkey (plate_number)
      `)
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching drivers:', error);
    } else {
      setDrivers(data);
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

  // Generate next driver_id
  const generateDriverId = () => {
    if (drivers.length === 0) return 'DRV001';
    const lastId = drivers[0].driver_id; // Since we sort by date, get the first one
    const num = parseInt(lastId.replace('DRV', '')) + 1;
    return `DRV${num.toString().padStart(3, '0')}`;
  };

  const handleOpenModal = (driver = null) => {
    if (driver) {
      setEditingDriver(driver);
      setFormData({
        driver_id: driver.driver_id,
        name: driver.name,
        contact_no: driver.contact_no,
        address: driver.address,
        birthdate: driver.birthdate,
        photo: null,
        truck_assigned: driver.truck_assigned || null,
      });
      setPhotoPreview(driver.photo_url || null);
    } else {
      setEditingDriver(null);
      setFormData({
        driver_id: generateDriverId(),
        name: '',
        contact_no: '',
        address: '',
        birthdate: '',
        photo: null,
        truck_assigned: null,
      });
      setPhotoPreview(null);
    }
    setModalOpen(true);
  };

  const handleOpenViewModal = (driver) => {
    setViewingDriver(driver);
    setEditFormData({
      contact_no: driver.contact_no,
      address: driver.address || '',
    });
    setViewModalOpen(true);
  };

  const handleOpenArchiveModal = (driver) => {
    setArchivingDriver(driver);
    setArchiveModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setPhotoPreview(null);
    setEditingDriver(null);
  };

  const handleCloseViewModal = () => {
    setViewModalOpen(false);
    setViewingDriver(null);
  };

  const handleCloseArchiveModal = () => {
    setArchiveModalOpen(false);
    setArchivingDriver(null);
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'photo') {
      const file = files[0];
      setFormData({ ...formData, photo: file });
      setPhotoPreview(URL.createObjectURL(file));
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({ ...editFormData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let photo_url = editingDriver?.photo_url || null;

    if (formData.photo) {
      const fileExt = formData.photo.name.split('.').pop();
      const fileName = `${formData.driver_id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('driver-photos')
        .upload(fileName, formData.photo, { upsert: true });

      if (uploadError) {
        console.error('Photo upload failed:', uploadError);
        alert('Photo upload failed.');
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('driver-photos')
        .getPublicUrl(fileName);

      photo_url = publicUrlData.publicUrl;
    }

    const payload = {
      driver_id: formData.driver_id,
      name: formData.name,
      contact_no: formData.contact_no,
      address: formData.address,
      birthdate: formData.birthdate,
      photo_url,
      truck_assigned: formData.truck_assigned,
    };

    if (editingDriver) {
      const { error } = await supabase
        .from('drivers')
        .update(payload)
        .eq('driver_id', formData.driver_id);

      if (error) {
        console.error('Error updating driver:', error);
        alert('Failed to update driver.');
        return;
      }

      await logAction(
        currentUser,
        'Edit',
        'drivers',
        `Updated driver ${formData.name} (${formData.driver_id})`
      );
    } else {
      const { error } = await supabase.from('drivers').insert([payload]);

      if (error) {
        console.error('Error adding driver:', error);
        alert('Failed to add driver.');
        return;
      }

      await logAction(
        currentUser,
        'Add',
        'drivers',
        `Added new driver ${formData.name} (${formData.driver_id})`
      );
    }

    fetchDrivers();
    handleCloseModal();
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    const { error } = await supabase
      .from('drivers')
      .update({
        contact_no: editFormData.contact_no,
        address: editFormData.address,
      })
      .eq('driver_id', viewingDriver.driver_id);

    if (error) {
      console.error('Error updating driver contact info:', error);
      alert('Failed to update contact information.');
      return;
    }

    await logAction(
      currentUser,
      'Edit',
      'drivers',
      `Updated contact info for ${viewingDriver.name} (${viewingDriver.driver_id})`
    );

    fetchDrivers();
    handleCloseViewModal();
  };

  const handleArchive = async () => {
    if (!archivingDriver) return;

    const { error } = await supabase
      .from('drivers')
      .update({ 
        is_archived: true,
        archived_at: new Date().toISOString()
      })
      .eq('driver_id', archivingDriver.driver_id);

    if (error) {
      console.error('Error archiving driver:', error);
      alert('Failed to archive driver.');
      return;
    }

    await logAction(
      currentUser,
      'Archive',
      'drivers',
      `Archived driver ${archivingDriver.name} (${archivingDriver.driver_id})`
    );

    fetchDrivers();
    handleCloseArchiveModal();
  };

  const calculateAge = (birthdate) => {
    const today = new Date();
    const birthDate = new Date(birthdate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const getTruckAssignment = (driver) => {
    return driver.trucks ? driver.trucks.plate_number : 'Unassigned';
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

  return (
    <main className="flex-1 p-6 bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Driver Management</h2>
        <p className="text-gray-600">Manage your team of drivers and their assignments</p>
      </div>

      {/* Action Card */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="p-3 rounded-full bg-green-50 text-green-600 mr-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Driver Team</h3>
              <p className="text-gray-600 text-sm">{drivers.length} active drivers</p>
            </div>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add New Driver
          </button>
        </div>
      </div>

      {/* Drivers Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800">Active Drivers</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-4 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                <th className="py-4 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="py-4 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="py-4 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Truck Assigned</th>
                <th className="py-4 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                <th className="py-4 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 px-6 text-center text-gray-500">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    </div>
                    <p className="mt-2">Loading drivers...</p>
                  </td>
                </tr>
              ) : drivers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 px-6 text-center text-gray-500">
                    <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    <p className="mt-2 text-gray-600">No drivers found</p>
                    <button
                      onClick={() => handleOpenModal()}
                      className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Add Your First Driver
                    </button>
                  </td>
                </tr>
              ) : (
                drivers.map((driver) => (
                  <tr key={driver.driver_id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12">
                          {driver.photo_url ? (
                            <img 
                              src={driver.photo_url} 
                              alt={driver.name} 
                              className="rounded-full h-12 w-12 object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="rounded-full h-12 w-12 bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-500 font-medium text-sm">
                                {driver.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{driver.name}</div>
                          <div className="text-sm text-gray-500">{driver.address || 'No address'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-900 font-mono">{driver.driver_id}</td>
                    <td className="py-4 px-6 text-sm text-gray-700">{driver.contact_no}</td>
                    <td className="py-4 px-6 text-sm">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        getTruckAssignment(driver) === 'Unassigned' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {getTruckAssignment(driver)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-700">
                      {calculateAge(driver.birthdate)} years
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleOpenViewModal(driver)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors flex items-center"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </button>
                        <button 
                          onClick={() => handleOpenArchiveModal(driver)}
                          className="text-purple-600 hover:text-purple-800 text-sm font-medium transition-colors flex items-center"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                          Archive
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Driver Modal */}
{isModalOpen && (
  <div className="fixed inset-0 backdrop-blur-md bg-gray-900/20 flex items-center justify-center p-4 z-40">
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-xl font-bold text-gray-800">
          {editingDriver ? 'Edit Driver' : 'Add New Driver'}
        </h3>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Driver ID</label>
            <input
              name="driver_id"
              value={formData.driver_id}
              disabled
              className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-50 text-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
            <input
              name="name"
              onChange={handleChange}
              onKeyPress={(e) => {
                // Prevent numbers
                if (/[0-9]/.test(e.key)) {
                  e.preventDefault();
                }
              }}
              value={formData.name}
              placeholder="Enter full name"
              maxLength={30}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            <p className="text-xs text-gray-500 mt-1">{formData.name.length}/30 characters</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Birthdate</label>
            <input
              name="birthdate"
              type="date"
              onChange={handleChange}
              value={formData.birthdate}
              max={new Date(new Date().setFullYear(new Date().getFullYear() - 20)).toISOString().split('T')[0]}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            <p className="text-xs text-gray-500 mt-1">Must be 20 years or older</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
            <input
              name="contact_no"
              onChange={handleChange}
              onKeyPress={(e) => {
                // Prevent letters and special characters except numbers
                if (!/[0-9]/.test(e.key)) {
                  e.preventDefault();
                }
              }}
              value={formData.contact_no}
              placeholder="Contact number"
              maxLength={11}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            <p className="text-xs text-gray-500 mt-1">{formData.contact_no.length}/11 digits</p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
            <input
              name="address"
              onChange={handleChange}
              value={formData.address}
              placeholder="Full address"
              maxLength={75}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            <p className="text-xs text-gray-500 mt-1">{formData.address.length}/75 characters</p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo</label>
            <input 
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:ring-2 focus:ring-green-500 focus:border-green-500" 
              name="photo" 
              type="file" 
              accept="image/*" 
              onChange={handleChange} 
            />
            {photoPreview && (
              <div className="mt-3">
                <p className="text-sm text-gray-600 mb-2">Photo Preview:</p>
                <img src={photoPreview} alt="Preview" className="w-24 h-24 object-cover rounded-full border border-gray-300" />
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={handleCloseModal}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            {editingDriver ? 'Update Driver' : 'Add Driver'}
          </button>
        </div>
      </form>
    </div>
  </div>
)}

{/* View/Edit Contact Modal */}
{isViewModalOpen && viewingDriver && (
  <div className="fixed inset-0 backdrop-blur-md bg-gray-900/20 flex items-center justify-center p-4 z-40">
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-xl font-bold text-gray-800">Driver Details</h3>
      </div>
      <div className="p-6">
        <div className="flex items-center mb-6">
          <div className="flex-shrink-0 h-16 w-16">
            {viewingDriver.photo_url ? (
              <img 
                src={viewingDriver.photo_url} 
                alt={viewingDriver.name} 
                className="rounded-full h-16 w-16 object-cover border border-gray-200"
              />
            ) : (
              <div className="rounded-full h-16 w-16 bg-gray-200 flex items-center justify-center">
                <span className="text-gray-500 font-medium">
                  {viewingDriver.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="ml-4">
            <h4 className="text-lg font-semibold text-gray-900">{viewingDriver.name}</h4>
            <p className="text-sm text-gray-500">{viewingDriver.driver_id}</p>
            <p className="text-sm text-gray-600">{calculateAge(viewingDriver.birthdate)} years old</p>
            <p className={`text-sm font-medium ${
              getTruckAssignment(viewingDriver) === 'Unassigned' 
                ? 'text-yellow-600' 
                : 'text-green-600'
            }`}>
              Truck: {getTruckAssignment(viewingDriver)}
            </p>
          </div>
        </div>

        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
            <input
              name="contact_no"
              value={editFormData.contact_no}
              onChange={handleEditChange}
              onKeyPress={(e) => {
                // Prevent letters and special characters except numbers
                if (!/[0-9]/.test(e.key)) {
                  e.preventDefault();
                }
              }}
              maxLength={11}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">{editFormData.contact_no?.length || 0}/11 digits</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
            <input
              name="address"
              value={editFormData.address}
              onChange={handleEditChange}
              maxLength={75}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">{editFormData.address?.length || 0}/75 characters</p>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleCloseViewModal}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Update Contact Info
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
)}

      {/* Archive Confirmation Modal */}
      {isArchiveModalOpen && archivingDriver && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">Archive Driver</h3>
            </div>
            <div className="p-6">
              <div className="flex items-center mb-4">
                {archivingDriver.photo_url && (
                  <img 
                    src={archivingDriver.photo_url} 
                    alt={archivingDriver.name} 
                    className="rounded-full h-12 w-12 object-cover border border-gray-200 mr-3"
                  />
                )}
                <div>
                  <p className="text-gray-600">
                    Are you sure you want to archive <strong>{archivingDriver.name}</strong>?
                  </p>
                  <p className="text-sm text-gray-500 mt-1">{archivingDriver.driver_id}</p>
                  <p className="text-sm text-gray-500">Truck: {getTruckAssignment(archivingDriver)}</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                Archived drivers will be removed from active lists but preserved in system records.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCloseArchiveModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleArchive}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  Archive Driver
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default DriverPage;