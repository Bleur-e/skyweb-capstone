"use client";
import React, { useState, useEffect } from "react";
import AddTruckModal from "./AddTruckModal";
import ViewEditTruckModal from "./ViewEditTruckModal";
import DeployTruckModal from "./DeployTruckModal";
import supabase from "../../../supabaseClient";
import ConfirmPopup from "../../../components/ConfirmPopup";

// Enhanced Alert Popup (keep your existing one)
const AlertPopup = ({ message, onClose }) => (
  <div className="fixed inset-0 backdrop-blur-md bg-gray-900/20 flex items-center justify-center p-4 z-40">
    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 transform transition-all duration-300 border-l-4 border-blue-500">
      <div className="flex items-center mb-4">
        <div className="bg-blue-100 p-2 rounded-full mr-3">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-800">Notification</h3>
      </div>
      <p className="text-gray-700 mb-6 pl-11">{message}</p>
      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-300 shadow-sm"
        >
          Close
        </button>
      </div>
    </div>
  </div>
);

const TrucksPage = () => {
  const [trucks, setTrucks] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewEditModalOpen, setIsViewEditModalOpen] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [truckToArchive, setTruckToArchive] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState("");
  
  const showAlertPopup = (message) => {
    setAlertMessage(message);
    setShowAlert(true);
  };

  const closeAlertPopup = () => {
    setShowAlert(false);
    setAlertMessage("");
  };

  // ✅ Fetch current logged-in user
  useEffect(() => {
    const getCurrentUser = () => {
      try {
        const storedUser = localStorage.getItem("currentUser");
        if (!storedUser) return null;
        
        const user = JSON.parse(storedUser);
        
        // Validate user structure
        if (!user.id || !user.role) {
          console.warn('Invalid user data in localStorage');
          localStorage.removeItem("currentUser");
          return null;
        }
        
        return user;
      } catch (error) {
        console.error('Error getting current user:', error);
        localStorage.removeItem("currentUser");
        return null;
      }
    };

    const user = getCurrentUser();
    if (user) setCurrentUser(user);
  }, []);

  
  // ✅ Fetch trucks (not archived)
  const fetchTrucks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("trucks")
      .select("*")
      .eq("is_archived", false)
      .order("created_at", { ascending: false });
    if (error) console.error("Error fetching trucks:", error);
    else setTrucks(data || []);
    setLoading(false);
  };

  // ✅ Fetch drivers
  const fetchDrivers = async () => {
    const { data, error } = await supabase.from("drivers").select("driver_id, name");
    if (error) console.error("Error fetching drivers:", error);
    else setDrivers(data || []);
  };

  useEffect(() => {
    fetchTrucks();
    fetchDrivers();
  }, []);

 // ✅ Simplified Audit Log Helper - Use direct action names
const addAuditLog = async (action, tableName, description, recordId = null) => {
  if (!currentUser) {
    console.error("No current user found for audit log");
    return;
  }
  
  try {
    const { error } = await supabase.from('audit_logs').insert([
      {
        user_id: currentUser.id,
        username: currentUser.username,
        role: currentUser.role,
        action: action, // Use the actual action name directly
        table_name: tableName,
        record_id: recordId,
        description,
        created_at: new Date().toISOString(),
      },
    ]);
    if (error) {
      console.error('Error logging action:', error.message);
      throw error;
    }
  } catch (error) {
    console.error('Failed to add audit log:', error);
  }
};

  // ✅ Add Truck with Audit Log
  const handleAddTruck = async (newTruckData) => {
    try {
      await addAuditLog(
        "Add",
        "trucks",
        `Added new truck ${newTruckData.plate_number}`,
        newTruckData.plate_number
      );
      await fetchTrucks();
      setIsAddModalOpen(false);
      showAlertPopup("✅ Truck added successfully!");
    } catch (err) {
      console.error("Error in handleAddTruck:", err);
      showAlertPopup("⚠️ An unexpected error occurred after adding the truck.");
    }
  };

  // ✅ Enhanced Edit Truck with restrictions and audit log
  const handleEditTruck = async (updatedTruckData) => {
    try {
      // Check if editing is allowed based on status
      const restrictedStatuses = ["Deployed", "Scheduled", "Maintenance"];
      if (restrictedStatuses.includes(updatedTruckData.status)) {
        showAlertPopup(`🚫 Cannot edit truck with status: ${updatedTruckData.status}`);
        return;
      }

      // Only allow editing specific fields
      const allowedFields = ['plate_number', 'driver', 'current_odometer'];
      const updateData = {};
      
      allowedFields.forEach(field => {
        if (field in updatedTruckData) {
          updateData[field] = updatedTruckData[field];
        }
      });

      // Handle driver assignment - convert "No current driver assigned" to null
      if (updateData.driver === "No current driver assigned" || updateData.driver === "" || updateData.driver === null) {
        updateData.driver = null;
      }

      // Validate driver exists only if a driver is being assigned (not null)
      if (updateData.driver && updateData.driver !== null) {
        const { data: driverData, error: driverError } = await supabase
          .from("drivers")
          .select("driver_id")
          .eq("driver_id", updateData.driver)
          .single();

        if (driverError || !driverData) {
          showAlertPopup("❌ Selected driver does not exist. Please choose a valid driver.");
          return;
        }
      }

      // Convert odometer to number
      if (updateData.current_odometer) {
        updateData.current_odometer = Number(updateData.current_odometer) || 0;
      }

      const { error } = await supabase
        .from("trucks")
        .update(updateData)
        .eq("plate_number", updatedTruckData.plate_number);

      if (error) throw error;

      // Add audit log after successful update
      await addAuditLog(
        'Edit',
        'trucks',
        `Updated details of truck ${updatedTruckData.plate_number}`,
        updatedTruckData.plate_number
      );
      
      fetchTrucks();
      setIsViewEditModalOpen(false);
      setSelectedTruck(null);
      showAlertPopup("✅ Truck updated successfully!");
    } catch (err) {
      console.error("Error editing truck:", err);
      
      // More specific error messages
      if (err.code === '23503') { // Foreign key violation
        showAlertPopup("❌ Cannot assign driver: Driver does not exist in the system.");
      } else {
        showAlertPopup("❌ Failed to update truck.");
      }
    }
  };

  // ✅ Enhanced Archive Truck with restrictions and audit log
  const handleArchiveTruck = (truck) => {
    // Check if truck has a driver assigned
    if (truck.driver) {
      showAlertPopup("🚫 Please remove the assigned driver first before archiving this truck.");
      return;
    }

    // Check if truck status prevents archiving
    const restrictedStatuses = ["Deployed", "Maintenance", "Scheduled"];
    if (restrictedStatuses.includes(truck.status)) {
      showAlertPopup(`🚫 Cannot archive truck with status: ${truck.status}`);
      return;
    }

    setTruckToArchive(truck.plate_number);
    setConfirmMessage(`Are you sure you want to archive truck ${truck.plate_number}?`);
    setShowConfirmPopup(true);
  };

  // When user confirms archive
  const confirmArchiveTruck = async () => {
    if (!truckToArchive) return;

    try {
      const { error } = await supabase
        .from("trucks")
        .update({
          is_archived: true,
          archived_at: new Date().toISOString(),
        })
        .eq("plate_number", truckToArchive);

      if (error) throw error;

      await addAuditLog(
        'Archive',
        'trucks',
        `Archived truck ${truckToArchive}`,
        truckToArchive
      );
      fetchTrucks();
      setIsViewEditModalOpen(false);
      setSelectedTruck(null);
      showAlertPopup("✅ Truck archived successfully!");
    } catch (err) {
      console.error("Error archiving truck:", err);
      showAlertPopup("❌ Failed to archive truck.");
    } finally {
      setShowConfirmPopup(false);
      setTruckToArchive(null);
    }
  };

  // ✅ View/Edit Modal open
  const openViewEditModal = (truck) => {
    setSelectedTruck(truck);
    setIsViewEditModalOpen(true);
  };

  // ✅ Get driver name or display "No Driver Assigned"
  const getDriverDisplay = (truck) => {
    if (!truck.driver) return "No Driver Assigned";
    const driver = drivers.find((d) => d.driver_id === truck.driver);
    return driver?.name || "No Driver Assigned";
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Truck Management</h1>
          <p className="text-gray-600">Manage your fleet of trucks efficiently</p>
        </div>

        {/* Action Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-lg mr-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Fleet Overview</h3>
                <p className="text-gray-600 text-sm">{trucks.length} active trucks in your fleet</p>
              </div>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-sm transition duration-300 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Truck
            </button>
          </div>
        </div>

        {/* Trucks Table */}
        <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-500 to-blue-600">
                    {[
                      "Plate Number",
                      "Driver",
                      "Brand",
                      "Type",
                      "Model",
                      "Odometer",
                      "Status",
                      "Actions",
                    ].map((head) => (
                      <th
                        key={head}
                        className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider"
                      >
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {trucks.map((truck) => (
                    <tr key={truck.plate_number} className="hover:bg-gray-50 transition duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{truck.plate_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          truck.driver 
                            ? "bg-green-100 text-green-800" 
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {getDriverDisplay(truck)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">{truck.brand}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">{truck.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">{truck.model}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                        {truck.current_odometer?.toLocaleString()} km
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            truck.status === "Available"
                              ? "bg-green-100 text-green-800"
                              : truck.status === "Deployed"
                              ? "bg-yellow-100 text-yellow-800"
                              : truck.status === "Maintenance"
                              ? "bg-red-100 text-red-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {truck.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openViewEditModal(truck)}
                            className="text-blue-600 hover:text-blue-800 font-semibold px-3 py-2 rounded-md hover:bg-blue-50 transition duration-150"
                          >
                            View
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTruck(truck);
                              setIsDeployModalOpen(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition duration-300"
                          >
                            Deploy
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {trucks.length === 0 && !loading && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No trucks found</h3>
              <p className="mt-2 text-gray-500">Get started by adding your first truck.</p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-300"
              >
                Add Truck
              </button>
            </div>
          )}
        </div>

        {/* Add Modal */}
        <AddTruckModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSave={handleAddTruck}
          drivers={drivers}
        />

        {/* View/Edit Modal */}
        {selectedTruck && (
          <ViewEditTruckModal
            isOpen={isViewEditModalOpen}
            onClose={() => {
              setIsViewEditModalOpen(false);
              setSelectedTruck(null);
            }}
            truck={selectedTruck}
            drivers={drivers}
            onEdit={handleEditTruck}
            onArchive={handleArchiveTruck}
          />
        )}

        {/* Deploy Modal */}
        {selectedTruck && (
          <DeployTruckModal
            isOpen={isDeployModalOpen}
            onClose={() => setIsDeployModalOpen(false)}
            truck={selectedTruck}
            driver={drivers.find((d) => d.driver_id === selectedTruck.driver)}
            refreshTrucks={fetchTrucks}
            currentUser={currentUser}
          />
        )}

        {showAlert && <AlertPopup message={alertMessage} onClose={closeAlertPopup} />}

        {showConfirmPopup && (
          <ConfirmPopup
            message={confirmMessage}
            onConfirm={confirmArchiveTruck}
            onCancel={() => {
              setShowConfirmPopup(false);
              setTruckToArchive(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default TrucksPage;