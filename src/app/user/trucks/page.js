"use client";
import React, { useState, useEffect } from "react";
import AddTruckModal from "./AddTruckModal";
import ViewEditTruckModal from "./ViewEditTruckModal";
import DeployTruckModal from "./DeployTruckModal";
import supabase from "../../../supabaseClient";

const TrucksPage = () => {
  const [trucks, setTrucks] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewEditModalOpen, setIsViewEditModalOpen] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // ✅ Fetch current logged-in user
  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        const { data: userProfile } = await supabase
          .from("users")
          .select("id, role")
          .eq("id", data.user.id)
          .single();
        setCurrentUser(userProfile);
      }
    };
    getUser();
  }, []);

  // ✅ Fetch trucks (not archived)
  const fetchTrucks = async () => {
    const { data, error } = await supabase
      .from("trucks")
      .select("*")
      .eq("is_archived", false)
      .order("created_at", { ascending: false });
    if (error) console.error("Error fetching trucks:", error);
    else setTrucks(data || []);
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

  // ✅ Add Audit Log Helper
  const addAuditLog = async (action, table_name, description) => {
    if (!currentUser) return;
    await supabase.from("audit_logs").insert([
      {
        user_id: currentUser.id,
        role: currentUser.role,
        action,
        table_name,
        description,
      },
    ]);
  };

  // ✅ Add Truck
  const handleAddTruck = async (newTruckData) => {
    try {
      const truckToInsert = {
        ...newTruckData,
        current_odometer: Number(newTruckData.current_odometer) || 0,
        is_archived: false,
      };
      const { error } = await supabase.from("trucks").insert([truckToInsert]);
      if (error) throw error;

      await addAuditLog(
        "Add",
        "trucks",
        `Added new truck ${newTruckData.plate_number}`
      );
      fetchTrucks();
      setIsAddModalOpen(false);
    } catch (err) {
      console.error("Error adding truck:", err);
      alert("Failed to add truck.");
    }
  };

  // ✅ Edit Truck
  const handleEditTruck = async (updatedTruckData) => {
    try {
      const { plate_number, ...fields } = updatedTruckData;
      fields.current_odometer = Number(fields.current_odometer) || 0;

      const { error } = await supabase
        .from("trucks")
        .update(fields)
        .eq("plate_number", plate_number);
      if (error) throw error;

      await addAuditLog(
        "Edit",
        "trucks",
        `Updated details of truck ${plate_number}`
      );
      fetchTrucks();
      setIsViewEditModalOpen(false);
      setSelectedTruck(null);
    } catch (err) {
      console.error("Error editing truck:", err);
      alert("Failed to update truck.");
    }
  };

  // ✅ Archive Truck
  const handleArchiveTruck = async (plateNumber) => {
    if (!window.confirm(`Archive truck ${plateNumber}?`)) return;
    try {
      const { error } = await supabase
        .from("trucks")
        .update({ is_archived: true })
        .eq("plate_number", plateNumber);
      if (error) throw error;

      await addAuditLog(
        "Delete",
        "trucks",
        `Archived truck ${plateNumber}`
      );
      fetchTrucks();
      setIsViewEditModalOpen(false);
      setSelectedTruck(null);
    } catch (err) {
      console.error("Error archiving truck:", err);
      alert("Failed to archive truck.");
    }
  };

  // ✅ View/Edit Modal open
  const openViewEditModal = (truck) => {
    setSelectedTruck(truck);
    setIsViewEditModalOpen(true);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Truck Management</h1>

      <div className="flex justify-end mb-4">
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow-md"
        >
          Add Truck
        </button>
      </div>

      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <table className="min-w-full leading-normal text-gray-600">
          <thead>
            <tr>
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
                  className="px-5 py-3 border-b-2 border-blue-500 bg-blue-400 text-left text-xs font-semibold text-gray-600 uppercase"
                >
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trucks.map((truck) => (
              <tr key={truck.plate_number} className="hover:bg-gray-50">
                <td className="px-5 py-5 border-b border-gray-200">{truck.plate_number}</td>
                <td className="px-5 py-5 border-b border-gray-200">
                  {drivers.find((d) => d.driver_id === truck.driver)?.name || truck.driver}
                </td>
                <td className="px-5 py-5 border-b border-gray-200">{truck.brand}</td>
                <td className="px-5 py-5 border-b border-gray-200">{truck.type}</td>
                <td className="px-5 py-5 border-b border-gray-200">{truck.model}</td>
                <td className="px-5 py-5 border-b border-gray-200">
                  {truck.current_odometer?.toLocaleString()}
                </td>
                <td className="px-5 py-5 border-b border-gray-200">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      truck.status === "Available"
                        ? "bg-green-200 text-green-900"
                        : truck.status === "Deployed"
                        ? "bg-yellow-200 text-yellow-900"
                        : "bg-red-200 text-red-900"
                    }`}
                  >
                    {truck.status}
                  </span>
                </td>
                <td className="px-5 py-5 border-b border-gray-200">
                  <button
                    onClick={() => openViewEditModal(truck)}
                    className="text-blue-600 hover:text-blue-800 font-semibold mr-3"
                  >
                    View
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTruck(truck);
                      setIsDeployModalOpen(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md"
                  >
                    Deploy
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
          currentUser={currentUser} // ✅ Pass to modal
        />
      )}
    </div>
  );
};

export default TrucksPage;
