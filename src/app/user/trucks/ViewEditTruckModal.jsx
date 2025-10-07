import React, { useState, useEffect } from 'react';

const ViewEditTruckModal = ({ isOpen, onClose, truck, drivers, onEdit, onArchive }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editableTruckData, setEditableTruckData] = useState(truck);

  useEffect(() => {
    setEditableTruckData(truck);
    setIsEditing(false);
  }, [truck]);

  if (!isOpen || !truck) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditableTruckData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = () => {
    const updatedTruck = {
      plate_number: editableTruckData.plate_number,
      driver: editableTruckData.driver,
    };
    onEdit(updatedTruck);
    setIsEditing(false);
  };

  const currentDriverName =
    drivers.find((d) => d.driver_id === editableTruckData.driver)?.name ||
    editableTruckData.driver;

  const nextChangeOil =
    truck.last_change_oil_odometer && truck.truck_specs?.change_oil_interval
      ? truck.last_change_oil_odometer + truck.truck_specs.change_oil_interval
      : null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 relative">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">
          {isEditing ? 'Edit Truck Driver/Plate' : 'Truck Details'}
        </h2>

        {truck.photo_url && (
          <div className="mb-4 flex justify-center">
            <img
              src={truck.photo_url}
              alt={`${truck.brand} ${truck.model}`}
              className="w-48 h-auto object-cover rounded-md shadow-sm"
            />
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
            <div>
              <label className="font-semibold">Plate Number:</label>
              {isEditing ? (
                <input
                  type="text"
                  name="plate_number"
                  value={editableTruckData.plate_number}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2"
                  required
                />
              ) : (
                <div className="py-1">{truck.plate_number}</div>
              )}

              <label className="font-semibold mt-2 block">Brand:</label>
              <div className="py-1">{truck.brand}</div>

              <label className="font-semibold mt-2 block">Model:</label>
              <div className="py-1">{truck.model}</div>

              <label className="font-semibold mt-2 block">Type:</label>
              <div className="py-1">{truck.type}</div>

              <label className="font-semibold mt-2 block">Status:</label>
              <div className="py-1">{truck.status}</div>
            </div>

            <div>
              <label className="font-semibold">Driver:</label>
              {isEditing ? (
                <select
                  name="driver"
                  value={editableTruckData.driver}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2"
                  required
                >
                  <option value="">Select Driver</option>
                  {drivers.map((driver) => (
                    <option key={driver.driver_id} value={driver.driver_id}>
                      {driver.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="py-1">{currentDriverName}</div>
              )}

              <label className="font-semibold mt-2 block">Current Odometer:</label>
              <div className="py-1">
                {truck.current_odometer?.toLocaleString()} miles{" "}
                <span className="text-gray-500 text-sm">
                  ({(truck.current_odometer * 1.60934).toFixed(0)} km)
                </span>
              </div>

              <label className="font-semibold mt-2 block">Last Change Oil Odometer:</label>
              <div className="py-1">
                {truck.last_change_oil_odometer?.toLocaleString()} miles{" "}
                <span className="text-gray-500 text-sm">
                  ({(truck.last_change_oil_odometer * 1.60934).toFixed(0)} km)
                </span>
              </div>

              {nextChangeOil && (
                <div className="mt-2">
                  <strong>Next Change Oil:</strong>{" "}
                  {nextChangeOil.toLocaleString()} miles{" "}
                  <span className="text-gray-500 text-sm">
                    ({(nextChangeOil * 1.60934).toFixed(0)} km)
                  </span>
                </div>
              )}

              {truck.encoded_by && (
                <div className="mt-2">
                  <strong className="font-semibold">Encoded By:</strong> {truck.encoded_by}
                </div>
              )}
              {truck.created_at && (
                <div>
                  <strong className="font-semibold">Created At:</strong>{" "}
                  {new Date(truck.created_at).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            {!isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-md shadow-md"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onArchive(truck.plate_number)}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md shadow-md"
                >
                  Archive
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md"
                >
                  Save
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-md"
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
