'use client';

import { useState } from 'react';
import { Dialog } from '@headlessui/react';

export default function ProfilePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [profile, setProfile] = useState({
    firstName: 'Juan',
    middleInitial: 'D',
    lastName: 'Cruz',
    address: '123 Motorpool Street, Meycauayan',
    phoneNumber: '09123456789',
    role: 'Motorpool Staff',
    profileImage: 'https://ui-avatars.com/api/?name=Juan+Cruz',
  });

  const fullName = `${profile.firstName} ${profile.middleInitial}. ${profile.lastName}`;

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setProfile((prev) => ({ ...prev, profileImage: imageUrl }));
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-blue-700  mb-6">My Profile</h1>

      <div className="rounded shadow p-6 flex flex-col lg:flex-row gap-6 bg-amber-50">
        {/* Profile Summary */}
        <div className="flex flex-col items-center w-full lg:w-1/3 border-r  lg:pr-6">
          <img
            src={profile.profileImage || 'https://ui-avatars.com/api/?name=Profile'}
            alt="Profile"
            className="w-32 h-32 rounded-full border-4 border-orange-700"
          />
          <h2 className="mt-4 text-xl font-semibold text-blue-700 ">{fullName}</h2>
          <span className="text-sm bg-orange-100 text-orange-700 px-3 py-1 mt-2 rounded-full">
            {profile.role}
          </span>
        </div>

        {/* Profile Details */}
        <div className="w-full lg:w-2/3 space-y-4">
          <div>
            <label className="text-sm text-gray-700 ">Address:</label>
            <p className="text-gray-800 ">{profile.address}</p>
          </div>
          <div>
            <label className="text-sm text-gray-700 ">Phone Number:</label>
            <p className="text-gray-800 ">{profile.phoneNumber}</p>
          </div>
          <div>
            <label className="text-sm text-gray-700 ">Position:</label>
            <p className="text-gray-800 ">{profile.role}</p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 bg-blue-700 hover:bg-amber-700 text-white px-4 py-2 rounded transition"
          >
            Edit Profile
          </button>
        </div>
      </div>

      {/* Modal */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md bg-white dark:bg-gray-900 p-6 rounded shadow-lg space-y-4">
            <Dialog.Title className="text-lg font-semibold text-blue-700 dark:text-white">
              Edit Profile
            </Dialog.Title>

            <div className="space-y-3">
              <input
                name="firstName"
                value={profile.firstName}
                onChange={handleChange}
                placeholder="First Name"
                className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:text-white"
              />
              <input
                name="middleInitial"
                value={profile.middleInitial}
                onChange={handleChange}
                placeholder="Middle Initial"
                className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:text-white"
              />
              <input
                name="lastName"
                value={profile.lastName}
                onChange={handleChange}
                placeholder="Last Name"
                className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:text-white"
              />
              <input
                name="address"
                value={profile.address}
                onChange={handleChange}
                placeholder="Address"
                className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:text-white"
              />
              <input
                name="phoneNumber"
                value={profile.phoneNumber}
                onChange={handleChange}
                placeholder="Phone Number"
                className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:text-white"
              />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-700 dark:text-white hover:text-red-500"
              >
                Cancel
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-blue-700 hover:bg-amber-700 text-white rounded"
              >
                Save
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}