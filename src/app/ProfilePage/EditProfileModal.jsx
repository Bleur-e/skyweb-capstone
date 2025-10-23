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
    profile_image: userData.profile_image || '', // ✅ Fixed: using profile_image instead of photo_url
  });
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ✅ Handle text input changes
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ✅ Handle file upload with progress
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('Image size should be less than 5MB.');
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);

    const fileName = `${userData.id}_${Date.now()}_${file.name}`;
    
    try {
      const { data, error } = await supabase.storage
        .from('user-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      const { data: publicUrlData } = supabase.storage
        .from('user-photos')
        .getPublicUrl(fileName);

      setForm({ ...form, profile_image: publicUrlData.publicUrl }); // ✅ Fixed: using profile_image
      setUploadProgress(100);
      
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setIsLoading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  // ✅ Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.from('profile_update_requests').insert([
        {
          user_id: userData.id,
          full_name: form.full_name,
          address: form.address,
          contact_no: form.contact_no,
          position: form.position,
          photo_url: form.profile_image, // ✅ Fixed: mapping to photo_url for the request table
          status: 'Pending',
        },
      ]);

      if (error) {
        throw error;
      }

      alert('Your profile update request has been sent for admin approval.');
      onUpdated();
    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to send update request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-gray-900/20 flex items-center justify-center p-4 z-40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              Request Profile Update
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              ✕
            </button>
          </div>
          <p className="text-gray-600 text-sm mt-2">
            Changes will be reviewed by admin before approval
          </p>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Photo Upload Section */}
          <div className="text-center">
            <div className="relative inline-block">
              <img
                src={
                  form.profile_image ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    form.full_name || userData.username || 'User'
                  )}&background=4f46e5&color=ffffff&size=128&bold=true`
                }
                alt="Profile preview"
                className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover mx-auto mb-4"
              />
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                  <div className="text-white text-xs font-bold">
                    {uploadProgress}%
                  </div>
                </div>
              )}
            </div>
            
            <label className="block">
              <span className="sr-only">Choose profile photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={isLoading}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </label>
            <p className="text-xs text-gray-500 mt-2">
              JPG, PNG up to 5MB
            </p>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <InputField
              label="Full Name"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              placeholder="Enter your full name"
            />
            <InputField
              label="Address"
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Enter your address"
            />
            <InputField
              label="Contact Number"
              name="contact_no"
              value={form.contact_no}
              onChange={handleChange}
              placeholder="Enter your contact number"
            />
            <InputField
              label="Position"
              name="position"
              value={form.position}
              onChange={handleChange}
              placeholder="Enter your position"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-gradient-to-r from-blue-900 to-blue-800 text-white rounded-lg hover:from-blue-800 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 font-medium shadow-md hover:shadow-lg"
            >
              {isLoading ? (
                <span className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Sending...</span>
                </span>
              ) : (
                'Submit Request'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InputField({ label, name, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label}
      </label>
      <input
        name={name}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
      />
    </div>
  );
}