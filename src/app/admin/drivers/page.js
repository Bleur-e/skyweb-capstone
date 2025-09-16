'use client';

import React, { useState } from 'react';

const DriverPage = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    middleInitial: '',
    lastName: '',
    birthdate: '',
    age: '',
    sex: '',
    address: '',
    phoneNumber: '',
    status: '',
    photo: null,
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  

  const handleCloseModal = () => {
    setModalOpen(false);
    setPhotoPreview(null);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Driver data:', formData);
    handleCloseModal();
  };

  return (
    <main className="flex-1 p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-4">Drivers</h2>


      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6 text-left">Photo</th>
              <th className="py-3 px-6 text-left">Name</th>
              <th className="py-3 px-6 text-left">Contact</th>
              <th className="py-3 px-6 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm font-light">
            {/* Sample row */}
            <tr className="border-b border-gray-200 hover:bg-gray-100">
              <td className="py-3 px-6 text-left">
                <img src="https://via.placeholder.com/50" alt="Driver" className="rounded-full w-12 h-12" />
              </td>
              <td className="py-3 px-6 text-left">John Doe</td>
              <td className="py-3 px-6 text-left">+1 234 567 890</td>
              <td className="py-3 px-6 text-left">
                <button className="bg-amber-500 text-white px-3 py-1 rounded hover:bg-amber-600 mr-2">View</button>
                
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  );
};

export default DriverPage;