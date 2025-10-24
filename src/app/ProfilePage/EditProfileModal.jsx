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
    profile_image: userData.profile_image || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState({});

  // ✅ Validation functions
  const validateField = (name, value) => {
    const newErrors = { ...errors };

    switch (name) {
      case 'full_name':
        if (value && !/^[A-Za-z\s]*$/.test(value)) {
          newErrors.full_name = 'Name can only contain letters and spaces';
        } else if (value.length > 50) {
          newErrors.full_name = 'Name must be 50 characters or less';
        } else {
          delete newErrors.full_name;
        }
        break;

      case 'address':
        if (value.length > 100) {
          newErrors.address = 'Address must be 100 characters or less';
        } else {
          delete newErrors.address;
        }
        break;

      case 'contact_no':
        if (value && !/^\d*$/.test(value)) {
          newErrors.contact_no = 'Contact number can only contain digits';
        } else if (value.length > 11) {
          newErrors.contact_no = 'Contact number must be 11 digits or less';
        } else {
          delete newErrors.contact_no;
        }
        break;

      case 'position':
        if (value && !/^[A-Za-z\s]*$/.test(value)) {
          newErrors.position = 'Position can only contain letters and spaces';
        } else if (value.length > 30) {
          newErrors.position = 'Position must be 30 characters or less';
        } else {
          delete newErrors.position;
        }
        break;

      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ✅ Handle text input changes with validation
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Apply input restrictions based on field type
    let filteredValue = value;
    
    switch (name) {
      case 'full_name':
      case 'position':
        // Only allow letters and spaces
        filteredValue = value.replace(/[^A-Za-z\s]/g, '');
        break;
      
      case 'contact_no':
        // Only allow numbers
        filteredValue = value.replace(/\D/g, '');
        break;
      
      default:
        break;
    }

    setForm(prev => ({ ...prev, [name]: filteredValue }));
    validateField(name, filteredValue);
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

      setForm({ ...form, profile_image: publicUrlData.publicUrl });
      setUploadProgress(100);
      
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setIsLoading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  // ✅ Validate entire form before submission
  const validateForm = () => {
    const newErrors = {};

    // Full Name validation
    if (form.full_name && !/^[A-Za-z\s]*$/.test(form.full_name)) {
      newErrors.full_name = 'Name can only contain letters and spaces';
    }
    if (form.full_name.length > 50) {
      newErrors.full_name = 'Name must be 50 characters or less';
    }

    // Address validation
    if (form.address.length > 100) {
      newErrors.address = 'Address must be 100 characters or less';
    }

    // Contact Number validation
    if (form.contact_no && !/^\d*$/.test(form.contact_no)) {
      newErrors.contact_no = 'Contact number can only contain digits';
    }
    if (form.contact_no.length > 11) {
      newErrors.contact_no = 'Contact number must be 11 digits or less';
    }

    // Position validation
    if (form.position && !/^[A-Za-z\s]*$/.test(form.position)) {
      newErrors.position = 'Position can only contain letters and spaces';
    }
    if (form.position.length > 30) {
      newErrors.position = 'Position must be 30 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ✅ Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      alert('Please fix the validation errors before submitting.');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.from('profile_update_requests').insert([
        {
          user_id: userData.id,
          full_name: form.full_name,
          address: form.address,
          contact_no: form.contact_no,
          position: form.position,
          photo_url: form.profile_image,
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

  // Check if form has any changes
  const hasChanges = () => {
    return (
      form.full_name !== userData.full_name ||
      form.address !== userData.address ||
      form.contact_no !== userData.contact_no ||
      form.position !== userData.position ||
      form.profile_image !== userData.profile_image
    );
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
              error={errors.full_name}
              maxLength={50}
            />
            <InputField
              label="Address"
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Enter your address"
              error={errors.address}
              maxLength={100}
            />
            <InputField
              label="Contact Number"
              name="contact_no"
              value={form.contact_no}
              onChange={handleChange}
              placeholder="Enter your contact number"
              error={errors.contact_no}
              maxLength={11}
            />
            <InputField
              label="Position"
              name="position"
              value={form.position}
              onChange={handleChange}
              placeholder="Enter your position "
              error={errors.position}
              maxLength={30}
            />
          </div>

          {/* Character Count Indicators */}
          <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
            <div>Full Name: {form.full_name.length}/50</div>
            <div>Address: {form.address.length}/100</div>
            <div>Contact: {form.contact_no.length}/11</div>
            <div>Position: {form.position.length}/30</div>
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
              disabled={isLoading || !hasChanges() || Object.keys(errors).length > 0}
              className="px-6 py-2 bg-gradient-to-r from-blue-900 to-blue-800 text-white rounded-lg hover:from-blue-800 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md hover:shadow-lg"
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

function InputField({ label, name, value, onChange, placeholder, error, maxLength }) {
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
        maxLength={maxLength}
        className={`w-full border rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ${
          error ? 'border-red-500 bg-red-50' : 'border-gray-300'
        }`}
      />
      {error && (
        <p className="text-red-500 text-xs mt-1 flex items-center">
          <span className="mr-1">⚠</span>
          {error}
        </p>
      )}
    </div>
  );
}