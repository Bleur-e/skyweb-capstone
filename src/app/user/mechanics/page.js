'use client';

import React, { useState, useEffect } from 'react';
import supabase from '../../../supabaseClient';

const MechanicPage = () => {
  const [isModalOpen, setModalOpen] = useState(false);
  const [isViewModalOpen, setViewModalOpen] = useState(false);
  const [isArchiveModalOpen, setArchiveModalOpen] = useState(false);
  const [mechanics, setMechanics] = useState([]);
  const [editingMechanic, setEditingMechanic] = useState(null); 
  const [viewingMechanic, setViewingMechanic] = useState(null);
  const [archivingMechanic, setArchivingMechanic] = useState(null);
  const [formData, setFormData] = useState({
    mechanic_id: '',
    name: '',
    birthdate: '',
    contact_no: '',
    address: '',
    photo: null,
  });
  const [editFormData, setEditFormData] = useState({
    contact_no: '',
    address: '',
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const storedUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (storedUser) setCurrentUser(storedUser);
    fetchMechanics();
  }, []);

  const fetchMechanics = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('mechanics')
      .select('*')
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching mechanics:', error);
    } else {
      setMechanics(data);
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

  // Auto-generate next mechanic_id
  const generateMechanicId = () => {
    if (mechanics.length === 0) return 'MEC-001';
    const lastId = mechanics[0].mechanic_id; // Since we sort by date, get the first one
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

  const handleOpenViewModal = (mechanic) => {
    setViewingMechanic(mechanic);
    setEditFormData({
      contact_no: mechanic.contact_no,
      address: mechanic.address || '',
    });
    setViewModalOpen(true);
  };

  const handleOpenArchiveModal = (mechanic) => {
    setArchivingMechanic(mechanic);
    setArchiveModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setPhotoPreview(null);
    setEditingMechanic(null);
  };

  const handleCloseViewModal = () => {
    setViewModalOpen(false);
    setViewingMechanic(null);
  };

  const handleCloseArchiveModal = () => {
    setArchiveModalOpen(false);
    setArchivingMechanic(null);
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

    let photo_url = editingMechanic?.photo_url || null;

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

      await logAction(
        currentUser,
        'Edit',
        'mechanics',
        `Updated mechanic ${formData.name} (${formData.mechanic_id})`
      );
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

      await logAction(
        currentUser,
        'Add',
        'mechanics',
        `Added new mechanic ${formData.name} (${formData.mechanic_id})`
      );
    }

    fetchMechanics();
    handleCloseModal();
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    const { error } = await supabase
      .from('mechanics')
      .update({
        contact_no: editFormData.contact_no,
        address: editFormData.address,
      })
      .eq('mechanic_id', viewingMechanic.mechanic_id);

    if (error) {
      console.error('Error updating mechanic contact info:', error);
      alert('Failed to update contact information.');
      return;
    }

    await logAction(
      currentUser,
      'Edit',
      'mechanics',
      `Updated contact info for ${viewingMechanic.name} (${viewingMechanic.mechanic_id})`
    );

    fetchMechanics();
    handleCloseViewModal();
  };

  const handleArchive = async () => {
    if (!archivingMechanic) return;

    const { error } = await supabase
      .from('mechanics')
      .update({ 
        is_archived: true,
        archived_at: new Date().toISOString()
      })
      .eq('mechanic_id', archivingMechanic.mechanic_id);

    if (error) {
      console.error('Error archiving mechanic:', error);
      alert('Failed to archive mechanic.');
      return;
    }

    await logAction(
      currentUser,
      'Archive',
      'mechanics',
      `Archived mechanic ${archivingMechanic.name} (${archivingMechanic.mechanic_id})`
    );

    fetchMechanics();
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

  return (
    <main className="flex-1 p-6 bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Mechanic Management</h2>
        <p className="text-gray-600">Manage your team of mechanics and their information</p>
      </div>

      {/* Action Card */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="p-3 rounded-full bg-blue-50 text-blue-600 mr-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Team Management</h3>
              <p className="text-gray-600 text-sm">{mechanics.length} active mechanics</p>
            </div>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add New Mechanic
          </button>
        </div>
      </div>

      {/* Mechanics Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800">Active Mechanics</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-4 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mechanic</th>
                <th className="py-4 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="py-4 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="py-4 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                <th className="py-4 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-8 px-6 text-center text-gray-500">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                    <p className="mt-2">Loading mechanics...</p>
                  </td>
                </tr>
              ) : mechanics.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 px-6 text-center text-gray-500">
                    <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="mt-2 text-gray-600">No mechanics found</p>
                    <button
                      onClick={() => handleOpenModal()}
                      className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Add Your First Mechanic
                    </button>
                  </td>
                </tr>
              ) : (
                mechanics.map((mechanic) => (
                  <tr key={mechanic.mechanic_id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12">
                          {mechanic.photo_url ? (
                            <img 
                              src={mechanic.photo_url} 
                              alt={mechanic.name} 
                              className="rounded-full h-12 w-12 object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="rounded-full h-12 w-12 bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-500 font-medium text-sm">
                                {mechanic.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{mechanic.name}</div>
                          <div className="text-sm text-gray-500">{mechanic.address || 'No address'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-900 font-mono">{mechanic.mechanic_id}</td>
                    <td className="py-4 px-6 text-sm text-gray-700">{mechanic.contact_no}</td>
                    <td className="py-4 px-6 text-sm text-gray-700">
                      {calculateAge(mechanic.birthdate)} years
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleOpenViewModal(mechanic)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors flex items-center"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </button>
                        <button 
                          onClick={() => handleOpenArchiveModal(mechanic)}
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

      {/* Add/Edit Mechanic Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 backdrop-blur-md bg-gray-900/20 flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">
                {editingMechanic ? 'Edit Mechanic' : 'Add New Mechanic'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mechanic ID</label>
                  <input
                    name="mechanic_id"
                    value={formData.mechanic_id}
                    disabled
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-50 text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    name="name"
                    onChange={handleChange}
                    value={formData.name}
                    placeholder="Enter full name"
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Birthdate</label>
                  <input
                    name="birthdate"
                    type="date"
                    onChange={handleChange}
                    value={formData.birthdate}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
                  <input
                    name="contact_no"
                    onChange={handleChange}
                    value={formData.contact_no}
                    placeholder="Contact number"
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <input
                    name="address"
                    onChange={handleChange}
                    value={formData.address}
                    placeholder="Full address"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo</label>
                  <input 
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {editingMechanic ? 'Update Mechanic' : 'Add Mechanic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View/Edit Contact Modal */}
      {isViewModalOpen && viewingMechanic && (
        <div className="fixed inset-0 backdrop-blur-md bg-gray-900/20 flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">Mechanic Details</h3>
            </div>
            <div className="p-6">
              <div className="flex items-center mb-6">
                <div className="flex-shrink-0 h-16 w-16">
                  {viewingMechanic.photo_url ? (
                    <img 
                      src={viewingMechanic.photo_url} 
                      alt={viewingMechanic.name} 
                      className="rounded-full h-16 w-16 object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="rounded-full h-16 w-16 bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500 font-medium">
                        {viewingMechanic.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="ml-4">
                  <h4 className="text-lg font-semibold text-gray-900">{viewingMechanic.name}</h4>
                  <p className="text-sm text-gray-500">{viewingMechanic.mechanic_id}</p>
                  <p className="text-sm text-gray-600">{calculateAge(viewingMechanic.birthdate)} years old</p>
                </div>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
                  <input
                    name="contact_no"
                    value={editFormData.contact_no}
                    onChange={handleEditChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <input
                    name="address"
                    value={editFormData.address}
                    onChange={handleEditChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
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
      {isArchiveModalOpen && archivingMechanic && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">Archive Mechanic</h3>
            </div>
            <div className="p-6">
              <div className="flex items-center mb-4">
                {archivingMechanic.photo_url && (
                  <img 
                    src={archivingMechanic.photo_url} 
                    alt={archivingMechanic.name} 
                    className="rounded-full h-12 w-12 object-cover border border-gray-200 mr-3"
                  />
                )}
                <div>
                  <p className="text-gray-600">
                    Are you sure you want to archive <strong>{archivingMechanic.name}</strong>?
                  </p>
                  <p className="text-sm text-gray-500 mt-1">{archivingMechanic.mechanic_id}</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                Archived mechanics will be removed from active lists but preserved in system records.
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
                  Archive Mechanic
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default MechanicPage;