import React, { useState, useEffect } from "react";
import supabase from "../../../supabaseClient";

const ViewEditTruckModal = ({ isOpen, onClose, truck, onEdit, onArchive }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editableTruckData, setEditableTruckData] = useState(truck);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [allDrivers, setAllDrivers] = useState([]);

  useEffect(() => {
    // Reset editable data and editing state when truck prop changes
    setEditableTruckData(truck);
    setIsEditing(false);

    // Fetch drivers when the modal opens or truck changes
    if (isOpen && truck) {
      const fetchDrivers = async () => {
        const { data, error } = await supabase
          .from("drivers")
          .select(`*, trucks (plate_number)`)
          .eq('is_archived', false);

        if (error) {
          console.error("Error fetching drivers for ViewEditModal:", error);
        } else {
          setAllDrivers(data || []);
          // Filter drivers:
          // 1. Include the currently assigned driver for this truck (if any)
          // 2. Include drivers who are not assigned to ANY truck
          const filtered = data.filter(driver =>
            driver.driver_id === truck.driver || !driver.trucks || driver.trucks.length === 0
          );
          setAvailableDrivers(filtered || []);
        }
      };
      fetchDrivers();
    }
  }, [truck, isOpen]);

  if (!isOpen || !truck) return null;

  // Determine if the truck is in a restricted status
  const restrictedStatuses = ["Deployed", "Scheduled", "Maintenance"];
  const isRestrictedStatus = restrictedStatuses.includes(truck.status);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditableTruckData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDriverChange = (e) => {
    const value = e.target.value;
    // Convert empty string to null for database
    setEditableTruckData((prev) => ({
      ...prev,
      driver: value || null,
    }));
  };

  const handleSave = () => {
    const updatedTruck = {
      ...truck,
      ...editableTruckData,
    };
    onEdit(updatedTruck);
    setIsEditing(false);
  };

  // Find the name of the current driver, or show "No current assigned driver"
  const currentDriverDisplay = editableTruckData.driver && editableTruckData.driver !== null
    ? allDrivers.find((d) => d.driver_id === editableTruckData.driver)?.name || "Unknown Driver (ID: " + editableTruckData.driver + ")"
    : "No current assigned driver";

  // Check if edit should be disabled
  const canEdit = !isRestrictedStatus;
  const canArchive = !isRestrictedStatus && !truck.driver;

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-gray-900/20 flex items-center justify-center p-4 z-40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 relative">
        {/* Header */}
        <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-3">
          {isEditing ? "Edit Truck Details" : "Truck Information"}
        </h2>

        {/* Status Warning */}
        {isRestrictedStatus && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-yellow-800 font-medium">
                Editing and archiving are restricted while truck status is "{truck.status}"
              </span>
            </div>
          </div>
        )}

        {/* Truck Image */}
        {truck.photo_url && (
          <div className="mb-6 flex justify-center">
            <img
              src={truck.photo_url}
              alt={`${truck.brand} ${truck.model}`}
              className="w-56 h-36 object-cover rounded-lg shadow-md border"
            />
          </div>
        )}

        {/* Form / View */}
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-700">
            {/* Left Side */}
            <div className="space-y-3">
              <div>
                <label className="font-semibold text-gray-600">Plate Number:</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="plate_number"
                    value={editableTruckData.plate_number}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                ) : (
                  <p className="mt-1">{truck.plate_number}</p>
                )}
              </div>

              <div>
                <label className="font-semibold text-gray-600">Brand:</label>
                <p className="mt-1">{truck.brand}</p>
              </div>

              <div>
                <label className="font-semibold text-gray-600">Model:</label>
                <p className="mt-1">{truck.model}</p>
              </div>

              <div>
                <label className="font-semibold text-gray-600">Type:</label>
                <p className="mt-1">{truck.type}</p>
              </div>

              <div>
                <label className="font-semibold text-gray-600">Status:</label>
                <p className="mt-1">{truck.status}</p>
              </div>
            </div>

            {/* Right Side */}
            <div className="space-y-3">
              <div>
                <label className="font-semibold text-gray-600">Driver:</label>
                {isEditing ? (
                  <select
                    name="driver"
                    value={editableTruckData.driver || ""}
                    onChange={handleDriverChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">No current assigned driver</option>
                    {availableDrivers.map((driver) => (
                      <option key={driver.driver_id} value={driver.driver_id}>
                        {driver.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="mt-1">{currentDriverDisplay}</p>
                )}
              </div>

              <div>
                <label className="font-semibold text-gray-600">Current Odometer (KM):</label>
                {isEditing ? (
                  <input
                    type="number"
                    name="current_odometer"
                    value={editableTruckData.current_odometer || ""}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                ) : (
                  <p className="mt-1">{truck.current_odometer?.toLocaleString()} km</p>
                )}
              </div>

              {/* Non-editable fields in view mode */}
              {!isEditing && (
                <>
                  {truck.last_change_oil_odometer && (
                    <div>
                      <label className="font-semibold text-gray-600">Last Change Oil Odometer (KM):</label>
                      <p className="mt-1">{truck.last_change_oil_odometer?.toLocaleString()} km</p>
                    </div>
                  )}

                  {truck.next_change_oil_odometer && (
                    <div>
                      <label className="font-semibold text-gray-600">Next Change Oil (KM):</label>
                      <p className="mt-1">{truck.next_change_oil_odometer.toLocaleString()} km</p>
                    </div>
                  )}

                  {truck.encoded_by && (
                    <div>
                      <label className="font-semibold text-gray-600">Encoded By:</label>
                      <p className="mt-1">{truck.encoded_by}</p>
                    </div>
                  )}

                  {truck.created_at && (
                    <div>
                      <label className="font-semibold text-gray-600">Created At:</label>
                      <p className="mt-1">{new Date(truck.created_at).toLocaleDateString()}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 mt-8">
            {!isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  disabled={!canEdit}
                  className={`font-semibold py-2 px-4 rounded-lg shadow-md transition ${
                    !canEdit
                      ? "bg-gray-400 cursor-not-allowed text-gray-600"
                      : "bg-yellow-500 hover:bg-yellow-600 text-white"
                  }`}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onArchive(truck)}
                  disabled={!canArchive}
                  className={`font-semibold py-2 px-4 rounded-lg shadow-md transition ${
                    !canArchive
                      ? "bg-gray-400 cursor-not-allowed text-gray-600"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
                >
                  Archive
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition"
                >
                  Save
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition"
            >
              Close
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ViewEditTruckModal;