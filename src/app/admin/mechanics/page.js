'use client';

import React, { useState, useEffect } from 'react';
import supabase from '../../../supabaseClient';
import { useRouter } from 'next/navigation';

const MechanicPage = () => {
  const router = useRouter();
  const [isViewModalOpen, setViewModalOpen] = useState(false);
  const [mechanics, setMechanics] = useState([]);
  const [viewingMechanic, setViewingMechanic] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
          const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
          if (!currentUser) {
            router.push("/");
            return;
          }
          setCurrentUser(currentUser);
          fetchMechanics();
        }, [router]);
  
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

  const handleOpenViewModal = (mechanic) => {
    setViewingMechanic(mechanic);
    setViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setViewModalOpen(false);
    setViewingMechanic(null);
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
        <p className="text-gray-600">View and monitor your team of mechanics and their information</p>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="p-3 rounded-full bg-blue-50 text-blue-600 mr-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Team Overview</h3>
              <p className="text-gray-600 text-sm">{mechanics.length} active mechanics</p>
            </div>
          </div>
          <div className="text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
            View Only - Admin Mode
          </div>
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
                          View Details
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

      {/* View Mechanic Details Modal */}
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

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
                  <div className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 bg-gray-50">
                    {viewingMechanic.contact_no}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <div className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 bg-gray-50">
                    {viewingMechanic.address || 'No address provided'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Birthdate</label>
                  <div className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 bg-gray-50">
                    {new Date(viewingMechanic.birthdate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
                
                {/* View Only Indicator */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-500 text-center">
                    View Only - Admin Mode
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6">
                <button
                  onClick={handleCloseViewModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Close
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