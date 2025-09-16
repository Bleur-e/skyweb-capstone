'use client';

import React, { useState, useEffect } from 'react';
import supabase from '../../../supabaseClient';

const MechanicPage = () => {
  const [isModalOpen, setModalOpen] = useState(false);
  const [mechanics, setMechanics] = useState([]);
  const [editingMechanic, setEditingMechanic] = useState(null); 
  const [formData, setFormData] = useState({
    mechanic_id: '',
    name: '',
    birthdate: '',
    contact_no: '',
    address: '',
    photo: null,
  });
  const [photoPreview, setPhotoPreview] = useState(null);

  useEffect(() => {
    fetchMechanics();
  }, []);

  const fetchMechanics = async () => {
    const { data, error } = await supabase.from('mechanics').select('*').order('mechanic_id');
    if (error) {
      console.error('Error fetching mechanics:', error);
    } else {
      setMechanics(data);
    }
  };

  // Auto-generate next mechanic_id
  const generateMechanicId = () => {
    if (mechanics.length === 0) return 'MEC-001';
    const lastId = mechanics[mechanics.length - 1].mechanic_id;
    const num = parseInt(lastId.split('-')[1], 10) + 1;
    return `MEC-${num.toString().padStart(3, '0')}`;
  };

  const handleOpenModal = (mechanic = null) => {
    if (mechanic) {
      setEditingMechanic(mechanic);
      setFormData({
        mechanic_id: mechanic.mechanic_id,
        name: mechanic.name,
        birthdate: mechanic.birthdate,
        contact_no: mechanic.contact_no,
        address: mechanic.address || '',
        photo: null,
      });
      setPhotoPreview(mechanic.photo_url || null);
    } else {
      setEditingMechanic(null);
      setFormData({
        mechanic_id: generateMechanicId(),
        name: '',
        birthdate: '',
        contact_no: '',
        address: '',
        photo: null,
      });
      setPhotoPreview(null);
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setPhotoPreview(null);
    setEditingMechanic(null);
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

    let photo_url = photoPreview; 

    if (formData.photo) {
      const fileExt = formData.photo.name.split('.').pop();
      const fileName = `${formData.mechanic_id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('mechanic-photos')
        .upload(fileName, formData.photo, { upsert: true });

      if (uploadError) {
        console.error('Photo upload failed:', uploadError);
        alert('Photo upload failed.');
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('mechanic-photos')
        .getPublicUrl(fileName);

      photo_url = publicUrlData.publicUrl;
    }

    if (editingMechanic) {
      const { error } = await supabase
        .from('mechanics')
        .update({
          name: formData.name,
          birthdate: formData.birthdate,
          contact_no: formData.contact_no,
          address: formData.address,
          photo_url,
        })
        .eq('mechanic_id', formData.mechanic_id);

      if (error) {
        console.error('Error updating mechanic:', error);
        alert('Failed to update mechanic.');
        return;
      }
    } else {
      const { error } = await supabase.from('mechanics').insert([{
        mechanic_id: formData.mechanic_id,
        name: formData.name,
        birthdate: formData.birthdate,
        contact_no: formData.contact_no,
        address: formData.address,
        photo_url,
      }]);

      if (error) {
        console.error('Error adding mechanic:', error);
        alert('Failed to add mechanic.');
        return;
      }
    }

    fetchMechanics();
    handleCloseModal();
  };

  const handleDelete = async (mechanic_id) => {
    if (!confirm('Are you sure you want to delete this mechanic?')) return;

    const { error } = await supabase.from('mechanics').delete().eq('mechanic_id', mechanic_id);
    if (error) {
      console.error('Error deleting mechanic:', error);
    } else {
      fetchMechanics();
    }
  };

  return (
    <main className="flex-1 p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-4">Mechanics</h2>
      <p className="text-gray-600 mb-6">Manage the list of mechanics below.</p>

      <button
        onClick={() => handleOpenModal()}
        className="bg-green-500 text-white px-4 py-2 rounded mb-4 hover:bg-green-600"
      >
        Add Mechanic
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg shadow-lg relative">
            <h3 className="text-xl text-blue-700 font-semibold mb-4">
              {editingMechanic ? 'Edit Mechanic' : 'Add Mechanic'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                name="mechanic_id"
                value={formData.mechanic_id}
                disabled
                className="w-full border text-gray-700 p-2 rounded bg-gray-100"
              />
              <input
                name="name"
                onChange={handleChange}
                value={formData.name}
                placeholder="Full Name"
                required
                className="w-full border text-gray-700 p-2 rounded"
              />
              <input
                name="birthdate"
                type="date"
                onChange={handleChange}
                value={formData.birthdate}
                required
                className="w-full border text-gray-700 p-2 rounded"
              />
              <input
                name="contact_no"
                onChange={handleChange}
                value={formData.contact_no}
                placeholder="Contact Number"
                required
                className="w-full border text-gray-700 p-2 rounded"
              />
              <input
                name="address"
                onChange={handleChange}
                value={formData.address}
                placeholder="Address (optional)"
                className="w-full border text-gray-700 p-2 rounded"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700">Upload Photo</label>
                <input className="border text-gray-700 p-2 rounded" name="photo" type="file" accept="image/*" onChange={handleChange} />
                {photoPreview && (
                  <img src={photoPreview} alt="Preview" className="mt-2 w-24 h-24 object-cover rounded-full" />
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
                >
                  {editingMechanic ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6 text-left">Photo</th>
              <th className="py-3 px-6 text-left">ID</th>
              <th className="py-3 px-6 text-left">Name</th>
              <th className="py-3 px-6 text-left">Contact</th>
              <th className="py-3 px-6 text-left">Birthdate</th>
              <th className="py-3 px-6 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm font-light">
            {mechanics.length > 0 ? (
              mechanics.map((mechanic) => (
                <tr key={mechanic.mechanic_id} className="border-b border-gray-200 hover:bg-gray-100">
                  <td className="py-3 px-6 text-left">
                    {mechanic.photo_url ? (
                      <img src={mechanic.photo_url} alt={mechanic.name} className="rounded-full w-12 h-12 object-cover" />
                    ) : (
                      <span className="text-gray-400">No photo</span>
                    )}
                  </td>
                  <td className="py-3 px-6 text-left">{mechanic.mechanic_id}</td>
                  <td className="py-3 px-6 text-left">{mechanic.name}</td>
                  <td className="py-3 px-6 text-left">{mechanic.contact_no}</td>
                  <td className="py-3 px-6 text-left">{mechanic.birthdate}</td>
                  <td className="py-3 px-6 text-left flex gap-2">
                    <button onClick={() => handleOpenModal(mechanic)} className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(mechanic.mechanic_id)} className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="py-3 px-6 text-center text-gray-400">
                  No mechanics found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
};

export default MechanicPage;
