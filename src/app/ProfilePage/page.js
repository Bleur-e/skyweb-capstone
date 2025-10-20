'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Topbar from 'components/topbar';
import { useRouter } from 'next/navigation';
import EditProfileModal from './EditProfileModal';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ProfilePage() {
  const [userData, setUserData] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const storedUser = sessionStorage.getItem('currentUser');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      fetchUserData(parsedUser.username);
    }
  }, []);

  async function fetchUserData(username) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (!error && data) {
      setUserData(data);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Topbar />

      <div className="flex justify-center mt-10 px-4">
        <div className="bg-white rounded-2xl shadow-md w-full max-w-3xl p-6">
          <div className="flex justify-between items-center border-b pb-4 mb-4">
            <h1 className="text-2xl font-semibold text-blue-900">
              Profile Information
            </h1>
            <button
              onClick={() => router.back()}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              ← Back
            </button>
          </div>

          {userData ? (
            <>
              <div className="flex items-center space-x-6 mb-6">
                <img
                  src={
                    userData.photo_url ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      userData.full_name || 'User'
                    )}`
                  }
                  alt="Profile"
                  className="w-24 h-24 rounded-full border"
                />
                <div>
                  <h2 className="text-xl font-medium text-gray-800">
                    {userData.full_name || 'No Name Provided'}
                  </h2>
                  <p className="text-gray-500 text-sm">{userData.role}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Info label="Username" value={userData.username} />
                <Info
                  label="Contact No."
                  value={userData.contact_no || 'Not provided'}
                />
                <Info
                  label="Address"
                  value={userData.address || 'Not provided'}
                />
                <Info
                  label="Position"
                  value={userData.position || 'Not provided'}
                />
              </div>

              <div className="flex justify-end mt-8">
                <button
                  onClick={() => setIsEditOpen(true)}
                  className="bg-blue-900 hover:bg-blue-800 text-white px-5 py-2 rounded-lg shadow-sm transition"
                >
                  Edit Profile
                </button>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-600 py-8">
              Loading profile...
            </div>
          )}
        </div>
      </div>

      {/* ✅ Edit Profile Modal */}
      {isEditOpen && (
        <EditProfileModal
          userData={userData}
          onClose={() => setIsEditOpen(false)}
          onUpdated={() => {
            setIsEditOpen(false);
            fetchUserData(userData.username);
          }}
        />
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600">{label}</label>
      <p className="mt-1 text-gray-800 bg-gray-50 p-2 rounded-md border">
        {value}
      </p>
    </div>
  );
}
