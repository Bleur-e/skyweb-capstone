'use client';

import React, { useState, useEffect } from 'react';
import supabase from '../../../supabaseClient';
import { useRouter } from 'next/navigation';

const DriverPage = () => {
  const router = useRouter();
  const [isViewModalOpen, setViewModalOpen] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [viewingDriver, setViewingDriver] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
      const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
      if (!currentUser) {
        router.push("/");
        return;
      }
      setCurrentUser(currentUser);
      
      fetchDrivers();
    }, [router]);

  const fetchDrivers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('drivers')
      .select(`
        *,
        trucks!trucks_driver_fkey (plate_number)
      `)
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching drivers:', error);
    } else {
      setDrivers(data);
    }
    setLoading(false);
  };

  const handleOpenViewModal = (driver) => {
    setViewingDriver(driver);
    setViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setViewModalOpen(false);
    setViewingDriver(null);
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

  const getTruckAssignment = (driver) => {
    return driver.trucks ? driver.trucks.plate_number : 'Unassigned';
  };

  return (
    <main className="flex-1 p-6 bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Driver Management</h2>
        <p className="text-gray-600">View and monitor your team of drivers and their assignments</p>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="p-3 rounded-full bg-blue-50 text-blue-600 mr-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Driver Team Overview</h3>
              <p className="text-gray-600 text-sm">{drivers.length} active drivers</p>
            </div>
          </div>
          <div className="text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
            View Only - Admin Mode
          </div>
        </div>
      </div>

      {/* Drivers Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800">Active Drivers</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-4 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                <th className="py-4 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="py-4 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="py-4 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Truck Assigned</th>
                <th className="py-4 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                <th className="py-4 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 px-6 text-center text-gray-500">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                    <p className="mt-2">Loading drivers...</p>
                  </td>
                </tr>
              ) : drivers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 px-6 text-center text-gray-500">
                    <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    <p className="mt-2 text-gray-600">No drivers found</p>
                  </td>
                </tr>
              ) : (
                drivers.map((driver) => (
                  <tr key={driver.driver_id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12">
                          {driver.photo_url ? (
                            <img 
                              src={driver.photo_url} 
                              alt={driver.name} 
                              className="rounded-full h-12 w-12 object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="rounded-full h-12 w-12 bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-500 font-medium text-sm">
                                {driver.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{driver.name}</div>
                          <div className="text-sm text-gray-500">{driver.address || 'No address'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-900 font-mono">{driver.driver_id}</td>
                    <td className="py-4 px-6 text-sm text-gray-700">{driver.contact_no}</td>
                    <td className="py-4 px-6 text-sm">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        getTruckAssignment(driver) === 'Unassigned' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {getTruckAssignment(driver)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-700">
                      {calculateAge(driver.birthdate)} years
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleOpenViewModal(driver)}
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

      {/* View Driver Details Modal */}
      {isViewModalOpen && viewingDriver && (
        <div className="fixed inset-0 backdrop-blur-md bg-gray-900/20 flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">Driver Details</h3>
            </div>
            <div className="p-6">
              <div className="flex items-center mb-6">
                <div className="flex-shrink-0 h-16 w-16">
                  {viewingDriver.photo_url ? (
                    <img 
                      src={viewingDriver.photo_url} 
                      alt={viewingDriver.name} 
                      className="rounded-full h-16 w-16 object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="rounded-full h-16 w-16 bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500 font-medium">
                        {viewingDriver.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="ml-4">
                  <h4 className="text-lg font-semibold text-gray-900">{viewingDriver.name}</h4>
                  <p className="text-sm text-gray-500">{viewingDriver.driver_id}</p>
                  <p className="text-sm text-gray-600">{calculateAge(viewingDriver.birthdate)} years old</p>
                  <p className={`text-sm font-medium ${
                    getTruckAssignment(viewingDriver) === 'Unassigned' 
                      ? 'text-yellow-600' 
                      : 'text-green-600'
                  }`}>
                    Truck: {getTruckAssignment(viewingDriver)}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
                  <div className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 bg-gray-50">
                    {viewingDriver.contact_no}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <div className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 bg-gray-50">
                    {viewingDriver.address || 'No address provided'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Birthdate</label>
                  <div className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 bg-gray-50">
                    {new Date(viewingDriver.birthdate).toLocaleDateString('en-US', {
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

export default DriverPage;