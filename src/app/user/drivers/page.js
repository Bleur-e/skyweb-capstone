'use client';

import React, { useState, useEffect } from 'react';
import supabase from '../../../supabaseClient';

const DriverPage = () => {
  const [isModalOpen, setModalOpen] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [formData, setFormData] = useState({
    driver_id: '',
    name: '',
    contact_no: '',
    address: '',
    birthdate: '',
    photo: null,
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch all drivers
  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    const { data, error } = await supabase.from('drivers').select('*').order('created_at', { ascending: true });
    if (error) console.error('Error fetching drivers:', error);
    else setDrivers(data);
  };

  // Generate next driver_id
  const generateDriverId = () => {
    if (drivers.length === 0) return 'DRV001';
    const lastId = drivers[drivers.length - 1].driver_id;
    const num = parseInt(lastId.replace('DRV', '')) + 1;
    return `DRV${num.toString().padStart(3, '0')}`;
  };

  const handleOpenModal = (driver = null) => {
    if (driver) {
      // Editing existing driver
      setFormData({ ...driver, photo: null });
      setPhotoPreview(driver.photo_url || null);
      setIsEditing(true);
    } else {
      // Adding new driver
      setFormData({
        driver_id: generateDriverId(),
        name: '',
        contact_no: '',
        address: '',
        birthdate: '',
        photo: null,
      });
      setPhotoPreview(null);
      setIsEditing(false);
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setPhotoPreview(null);
    setIsEditing(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    let photo_url = formData.photo_url || '';

    if (formData.photo) {
      const fileExt = formData.photo.name.split('.').pop();
      const fileName = `${formData.driver_id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('driver-photos')
        .upload(fileName, formData.photo, { upsert: true });

      if (uploadError) {
        console.error('Photo upload failed:', uploadError);
        alert('Photo upload failed!');
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
    };

    if (isEditing) {
      const { error } = await supabase.from('drivers').update(payload).eq('driver_id', formData.driver_id);
      if (error) {
        console.error('Error updating driver:', error);
        alert('Failed to update driver.');
      }
    } else {
      const { error } = await supabase.from('drivers').insert([payload]);
      if (error) {
        console.error('Error adding driver:', error);
        alert('Failed to add driver.');
      }
    }

    fetchDrivers();
    handleCloseModal();
  };

  const handleDelete = async (driver_id) => {
    if (!confirm('Are you sure you want to delete this driver?')) return;
    const { error } = await supabase.from('drivers').delete().eq('driver_id', driver_id);
    if (error) {
      console.error('Error deleting driver:', error);
      alert('Failed to delete driver.');
    } else {
      fetchDrivers();
    }
  };

  return (
    <main className="flex-1 p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-4">Drivers</h2>
      <p className="text-gray-600 mb-6">Manage the list of drivers below. You can add, edit, or delete drivers.</p>

      {/* Add Driver Button */}
      <button
        onClick={() => handleOpenModal()}
        className="bg-green-500 text-white px-4 py-2 rounded mb-4 hover:bg-green-600"
      >
        Add Driver
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg shadow-lg relative">
            <h3 className="text-xl text-blue-700 font-semibold mb-4">
              {isEditing ? 'Edit Driver' : 'Add Driver'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-4">
                <input name="driver_id" value={formData.driver_id} disabled className="text-gray-700 border p-2 rounded bg-gray-100" />
                <input name="name" onChange={handleChange} value={formData.name} placeholder="Full Name" required className="text-gray-700 border p-2 rounded col-span-2" />
                <input name="contact_no" onChange={handleChange} value={formData.contact_no} placeholder="Contact Number" required className="text-gray-700 border p-2 rounded col-span-2" />
                <input name="address" onChange={handleChange} value={formData.address} placeholder="Address (optional)" className="text-gray-700 border p-2 rounded col-span-2" />
                <input name="birthdate" type="date" onChange={handleChange} value={formData.birthdate} required className="text-gray-700 border p-2 rounded col-span-2" />
              </div>

              <div>
                <label className="block font-medium text-sm text-gray-700">Upload Photo:</label>
                <input name="photo" type="file" accept="image/*" onChange={handleChange} className="border p-2 rounded text-gray-700" />
                {photoPreview && <img src={photoPreview} alt="Preview" className="mt-2 w-24 h-24 object-cover rounded-full" />}
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drivers Table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6 text-left">Photo</th>
              <th className="py-3 px-6 text-left">Driver ID</th>
              <th className="py-3 px-6 text-left">Name</th>
              <th className="py-3 px-6 text-left">Contact</th>
              <th className="py-3 px-6 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm font-light">
            {drivers.length > 0 ? (
              drivers.map((driver) => (
                <tr key={driver.driver_id} className="border-b border-gray-200 hover:bg-gray-100">
                  <td className="py-3 px-6 text-left">
                    {driver.photo_url ? (
                      <img src={driver.photo_url} alt={driver.name} className="rounded-full w-12 h-12" />
                    ) : (
                      <span className="text-gray-400">No photo</span>
                    )}
                  </td>
                  <td className="py-3 px-6 text-left">{driver.driver_id}</td>
                  <td className="py-3 px-6 text-left">{driver.name}</td>
                  <td className="py-3 px-6 text-left">{driver.contact_no}</td>
                  <td className="py-3 px-6 text-left">
                    <button onClick={() => handleOpenModal(driver)} className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 mr-2">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(driver.driver_id)} className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="py-3 px-6 text-center text-gray-400">
                  No drivers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
};

export default DriverPage;
