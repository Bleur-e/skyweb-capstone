"use client";
import React, { useState, useEffect } from "react";
import AddTruckModal from "app/user/trucks/AddTruckModal";
import AddTruckSpecs from "./AddTruckSpecs";
import ViewEditTruckModal from "app/user/trucks/ViewEditTruckModal";
import supabase from "../../../supabaseClient";

const AdminTrucksPage = () => {
  const [trucks, setTrucks] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [isAddTruckOpen, setIsAddTruckOpen] = useState(false);
  const [isAddSpecOpen, setIsAddSpecOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // ✅ Get current user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) setCurrentUser(JSON.parse(storedUser));
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
    const { data, error } = await supabase
      .from("drivers")
      .select("driver_id, name");
    if (error) console.error("Error fetching drivers:", error);
    else setDrivers(data || []);
  };

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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Trucks Management</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setIsAddTruckOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md shadow-md"
          >
            Add Truck
          </button>
          <button
            onClick={() => setIsAddSpecOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md shadow-md"
          >
            Add Truck Specs
          </button>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase">
                Plate Number
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase">
                Brand
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase">
                Model
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase">
                Type
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {trucks.length > 0 ? (
              trucks.map((truck) => (
                <tr key={truck.plate_number}>
                  <td className="px-6 py-4 text-gray-800">
                    {truck.plate_number}
                  </td>
                  <td className="px-6 py-4 text-gray-800">{truck.brand}</td>
                  <td className="px-6 py-4 text-gray-800">{truck.model}</td>
                  <td className="px-6 py-4 text-gray-800">{truck.type}</td>
                  <td className="px-6 py-4 text-gray-800">{truck.status}</td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => openViewModal(truck)}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white py-1 px-3 rounded-md"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr key="no-trucks">
                <td
                  colSpan="6"
                  className="text-center py-4 text-gray-500 italic"
                >
                  No trucks found
                </td>
              </tr>
            )}
          </tbody>
        </table>
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

      {selectedTruck && (
        <ViewEditTruckModal
          isOpen={isViewOpen}
          onClose={() => setIsViewOpen(false)}
          truck={selectedTruck}
          drivers={drivers}
          onEdit={() => {}}
          onArchive={() => {}}
        />
      )}
    </div>
  );
};

export default AdminTrucksPage;
