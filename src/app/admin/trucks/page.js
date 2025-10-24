"use client";
import React, { useState, useEffect } from "react";
import AddTruckModal from "app/user/trucks/AddTruckModal";
import AddTruckSpecs from "./AddTruckSpecs";
import ViewTruckModal from "./ViewTruckModal";
import supabase from "../../../supabaseClient";
import { useRouter } from "next/navigation";

const AdminTrucksPage = () => {
  const router = useRouter();
  const [trucks, setTrucks] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [isAddTruckOpen, setIsAddTruckOpen] = useState(false);
  const [isAddSpecOpen, setIsAddSpecOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    maintenance: 0,
    assigned: 0
  });

  // ✅ Get current user from localStorage
  useEffect(() => {
          const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
          if (!currentUser) {
            router.push("/");
            return;
          }
          setCurrentUser(currentUser);
        }, [router]);

  // ✅ Fetch trucks with driver information
  const fetchTrucks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("trucks")
      .select(`
        *,
        drivers!trucks_driver_fkey (
          driver_id,
          name
        )
      `)
      .eq("is_archived", false)
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching trucks:", error);
    else setTrucks(data || []);
    setLoading(false);
  };

  // ✅ Fetch drivers separately for the dropdown (if needed)
  const fetchDrivers = async () => {
    const { data, error } = await supabase
      .from("drivers")
      .select("driver_id, name")
      .eq("is_archived", false);
    if (error) console.error("Error fetching drivers:", error);
    else setDrivers(data || []);
  };

  // Calculate statistics
  useEffect(() => {
    if (trucks.length > 0) {
      const total = trucks.length;
      const available = trucks.filter(truck => truck.status === 'Available').length;
      const maintenance = trucks.filter(truck => truck.status === 'Maintenance').length;
      const assigned = trucks.filter(truck => truck.driver !== null).length; // Count trucks with driver assigned
      
      setStats({
        total,
        available,
        maintenance,
        assigned
      });
    }
  }, [trucks]);

  useEffect(() => {
    fetchTrucks();
    fetchDrivers();
  }, []);

  // ✅ Add Truck
  const handleAddTruck = async (newTruckData) => {
    try {
      const truckToInsert = {
        ...newTruckData,
        current_odometer: Number(newTruckData.current_odometer) || 0,
        is_archived: false,
        encoded_by: currentUser?.id || "admin",
      };

      const { error } = await supabase.from("trucks").insert([truckToInsert]);
      if (error) throw error;

      alert("Truck added successfully!");
      fetchTrucks();
      setIsAddTruckOpen(false);
    } catch (err) {
      console.error("Error adding truck:", err);
      alert("Failed to add truck.");
    }
  };

  // ✅ Add Truck Spec
  const handleAddSpecs = async (specData) => {
    try {
      const { error } = await supabase.from("truck_specs").insert([
        {
          ...specData,
          created_by: currentUser?.id || "admin",
        },
      ]);
      if (error) throw error;
      alert("Truck specification added successfully!");
      setIsAddSpecOpen(false);
    } catch (err) {
      console.error("Error adding truck spec:", err);
      alert("Failed to add truck specification.");
    }
  };

  // ✅ View Modal open
  const openViewModal = (truck) => {
    setSelectedTruck(truck);
    setIsViewOpen(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Available':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Maintenance':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Assigned':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Available':
        return '🟢';
      case 'Maintenance':
        return '🔴';
      case 'Assigned':
        return '🔵';
      default:
        return '⚫';
    }
  };

  // Get driver name for display in table
  const getDriverName = (truck) => {
    if (truck.drivers) {
      return truck.drivers.name;
    }
    return 'Unassigned';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Truck Fleet Management</h1>
            <p className="text-gray-600">Manage and monitor your truck fleet status and information</p>
          </div>
          <div className="mt-4 md:mt-0">
            <div className="text-sm text-gray-500 bg-gray-100 px-4 py-2 rounded-lg border border-gray-200 inline-block">
              Admin Mode
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <button
          onClick={() => setIsAddTruckOpen(true)}
          className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-200"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add New Truck
        </button>
        <button
          onClick={() => setIsAddSpecOpen(true)}
          className="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-200"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Add Truck Specifications
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Trucks</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-500 rounded-xl">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Available</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.available}</p>
            </div>
            <div className="p-3 bg-green-500 rounded-xl">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Maintenance</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.maintenance}</p>
            </div>
            <div className="p-3 bg-red-500 rounded-xl">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Assigned</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.assigned}</p>
            </div>
            <div className="p-3 bg-purple-500 rounded-xl">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Trucks Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <h3 className="text-xl font-semibold text-gray-800">Truck Fleet</h3>
            <div className="mt-2 md:mt-0">
              <p className="text-sm text-gray-600">
                Showing {trucks.length} active trucks
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Plate Number
                </th>
                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Brand & Model
                </th>
                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Driver Assigned
                </th>
                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Odometer
                </th>
                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="py-4 px-6 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 px-6 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                    <p className="mt-2 text-gray-500">Loading trucks...</p>
                  </td>
                </tr>
              ) : trucks.length > 0 ? (
                trucks.map((truck) => (
                  <tr key={truck.plate_number} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900">{truck.plate_number}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm font-medium text-gray-900">{truck.brand}</div>
                      <div className="text-sm text-gray-500">{truck.model}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm font-medium text-gray-900">
                        {getDriverName(truck)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {truck.driver || 'No driver assigned'}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-700 font-mono">
                      {truck.current_odometer?.toLocaleString()} km
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(truck.status)}`}>
                        <span className="mr-1">{getStatusIcon(truck.status)}</span>
                        {truck.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => openViewModal(truck)}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-12 px-6 text-center">
                    <div className="flex flex-col items-center">
                      <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                      </svg>
                      <p className="text-gray-500 text-lg font-medium mb-2">No trucks found</p>
                      <p className="text-gray-400 text-sm">There are no active trucks in the system.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <AddTruckModal
        isOpen={isAddTruckOpen}
        onClose={() => setIsAddTruckOpen(false)}
        onSave={handleAddTruck}
        drivers={drivers}
      />

      <AddTruckSpecs
        isOpen={isAddSpecOpen}
        onClose={() => setIsAddSpecOpen(false)}
        onAdd={handleAddSpecs}
      />

      {/* View Truck Modal */}
      {selectedTruck && (
        <ViewTruckModal
          isOpen={isViewOpen}
          onClose={() => setIsViewOpen(false)}
          truck={selectedTruck}
          drivers={drivers}
        />
      )}
    </div>
  );
};

export default AdminTrucksPage;