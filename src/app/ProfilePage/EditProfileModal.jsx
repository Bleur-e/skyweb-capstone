'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function EditProfileModal({ userData, onClose, onUpdated }) {
  const [form, setForm] = useState({
    full_name: userData.full_name || '',
    address: userData.address || '',
    contact_no: userData.contact_no || '',
    position: userData.position || '',
    photo_url: userData.photo_url || '',
  });
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Handle text input changes
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ✅ Handle file upload
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileName = `${userData.id}_${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage
      .from('user-photos') // ✅ Make sure you have this storage bucket
      .upload(fileName, file);

    if (error) {
      alert('Failed to upload photo.');
      console.error(error);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from('user-photos')
      .getPublicUrl(fileName);

    setForm({ ...form, photo_url: publicUrlData.publicUrl });
  };

  // ✅ Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.from('profile_update_requests').insert([
      {
        user_id: userData.id,
        full_name: form.full_name,
        address: form.address,
        contact_no: form.contact_no,
        position: form.position,
        photo_url: form.photo_url,
        status: 'Pending',
      },
    ]);

    setIsLoading(false);

    if (error) {
      alert('Failed to send update request.');
      console.error(error);
    } else {
      alert('Your profile update request has been sent for admin approval.');
      onUpdated();
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-blue-900 mb-4">
          Request Profile Update
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField
            label="Full Name"
            name="full_name"
            value={form.full_name}
            onChange={handleChange}
          />
          <InputField
            label="Address"
            name="address"
            value={form.address}
            onChange={handleChange}
          />
          <InputField
            label="Contact No."
            name="contact_no"
            value={form.contact_no}
            onChange={handleChange}
          />
          <InputField
            label="Position"
            name="position"
            value={form.position}
            onChange={handleChange}
          />

          {/* ✅ Upload Photo Field */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Upload Photo
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="w-full border rounded-md p-2 text-gray-800 focus:ring-2 focus:ring-blue-400"
            />
            {form.photo_url && (
              <div className="mt-2">
                <img
                  src={form.photo_url}
                  alt="Uploaded"
                  className="w-24 h-24 rounded-full border object-cover"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 disabled:opacity-50"
            >
              {isLoading ? 'Sending...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InputField({ label, name, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">
        {label}
      </label>
      <input
        name={name}
        type="text"
        value={value}
        onChange={onChange}
        className="w-full border rounded-md p-2 text-gray-800 focus:ring-2 focus:ring-blue-400"
      />
    </div>
  );
}
