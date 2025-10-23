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
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser = sessionStorage.getItem('currentUser');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      fetchUserData(parsedUser.username);
    }
  }, []);

  async function fetchUserData(username) {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (!error && data) {
        setUserData(data);
      } else {
        console.error('Error fetching user data:', error);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Topbar />

      <div className="flex justify-center mt-8 px-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl p-8 border border-gray-200">
          {/* Header Section */}
          <div className="flex justify-between items-center border-b border-gray-200 pb-6 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Profile Information
              </h1>
              <p className="text-gray-600 mt-2">Manage your personal information</p>
            </div>
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors duration-200 px-4 py-2 rounded-lg hover:bg-gray-100"
            >
              <span>←</span>
              <span>Back</span>
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
            </div>
          ) : userData ? (
            <>
              {/* Profile Header with Photo */}
              <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8 mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <div className="relative">
                  <img
                    src={
                      userData.profile_image ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        userData.full_name || userData.username || 'User'
                      )}&background=4f46e5&color=ffffff&size=128&bold=true`
                    }
                    alt="Profile"
                    className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        userData.full_name || userData.username || 'User'
                      )}&background=4f46e5&color=ffffff&size=128&bold=true`;
                    }}
                  />
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <div className="text-center md:text-left flex-1">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {userData.full_name || 'No Name Provided'}
                  </h2>
                  <p className="text-gray-600 mb-2">@{userData.username}</p>
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {userData.role || 'User'}
                  </div>
                  {userData.email && (
                    <p className="text-gray-600 mt-2 flex items-center justify-center md:justify-start space-x-2">
                      <span>📧</span>
                      <span>{userData.email}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Information Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <InfoCard 
                  label="Username" 
                  value={userData.username}
                  icon="👤"
                />
                <InfoCard
                  label="Contact Number"
                  value={userData.contact_no || 'Not provided'}
                  icon="📞"
                />
                <InfoCard
                  label="Address"
                  value={userData.address || 'Not provided'}
                  icon="📍"
                />
                <InfoCard
                  label="Position"
                  value={userData.position || 'Not provided'}
                  icon="💼"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setIsEditOpen(true)}
                  className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-900 to-blue-800 hover:from-blue-800 hover:to-blue-700 text-white px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 font-medium"
                >
                  <span>✏️</span>
                  <span>Edit Profile</span>
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-4">No profile data found</div>
              <button
                onClick={() => router.back()}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Return to previous page
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
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

function InfoCard({ label, value, icon }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors duration-200">
      <div className="flex items-center space-x-3">
        <span className="text-lg">{icon}</span>
        <div className="flex-1">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            {label}
          </label>
          <p className="text-gray-900 font-medium">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}