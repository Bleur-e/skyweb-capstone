import React, { useState, useEffect } from "react";
import supabase from "../../../supabaseClient";

// 🔔 Alert Popup
const AlertPopup = ({ message, type = "error", onClose }) => (
  <div className="fixed inset-0 backdrop-blur-md bg-gray-900/20 flex items-center justify-center p-4 z-40">
    <div
      className={`bg-white rounded-xl shadow-xl w-full max-w-sm p-6 transform transition-all duration-300 border-l-8 ${
        type === "error" ? "border-red-600" : "border-green-600"
      }`}
    >
      <h3
        className={`text-xl font-bold mb-4 ${
          type === "error" ? "text-red-600" : "text-green-600"
        }`}
      >
        {type === "error" ? "Error" : "Success"}
      </h3>
      <p className="text-gray-700 mb-6">{message}</p>
      <div className="flex justify-end">
        <button
          onClick={onClose}
          className={`${
            type === "error"
              ? "bg-red-600 hover:bg-red-700"
              : "bg-green-600 hover:bg-green-700"
          } text-white font-semibold py-2 px-4 rounded-md transition duration-300`}
        >
          Close
        </button>
      </div>
    </div>
  </div>
);

const AddTruckModal = ({ isOpen, onClose, onSave }) => {
  const initialFormState = {
    plate_number: "",
    spec_id: "",
    driver: "", // Now optional
    current_odometer: 0,
    last_change_oil_odometer: 0,
    photo_url: "",
    status: "Available",
    type: "",
  };

  const [formData, setFormData] = useState(initialFormState);
  const [photoFile, setPhotoFile] = useState(null);
  const [truckSpecs, setTruckSpecs] = useState([]);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [types, setTypes] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [allDrivers, setAllDrivers] = useState([]);
  const [availableDrivers, setAvailableDrivers] = useState([]);

  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("error");
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Fetch truck specs
      supabase
        .from("truck_specs")
        .select("*")
        .then(({ data, error }) => {
          if (error) {
            console.error("Error fetching truck specs:", error);
            showAlertPopup("Failed to fetch truck specifications.");
          } else {
            setTruckSpecs(data);
            setBrands([...new Set(data.map((s) => s.brand))]);
          }
        });

      // Fetch drivers and their assigned trucks (only non-archived)
      supabase
        .from("drivers")
        .select(`*, trucks (plate_number)`)
        .eq('is_archived', false) // Only active drivers
        .then(({ data, error }) => {
          if (error) {
            console.error("Error fetching drivers:", error);
            showAlertPopup("Failed to fetch drivers.");
          } else {
            setAllDrivers(data);
            // Filter drivers: only include those where 'trucks' is null (no assigned truck)
            setAvailableDrivers(data.filter(driver => !driver.trucks));
          }
        });
    }
  }, [isOpen]);

  const showAlertPopup = (message, type = "error") => {
    setAlertMessage(message);
    setAlertType(type);
    setShowPopup(true);
  };

  const closeAlertPopup = () => {
    setShowPopup(false);
    setAlertMessage("");
  };

  if (!isOpen) return null;

  const handleBrandChange = (e) => {
    const brand = e.target.value;
    setSelectedBrand(brand);
    setModels([...new Set(truckSpecs.filter((s) => s.brand === brand).map((s) => s.model))]);
    setSelectedModel("");
    setTypes([]);
    setFormData((prev) => ({ ...prev, spec_id: "", type: "" }));
  };

  const handleModelChange = (e) => {
    const model = e.target.value;
    setSelectedModel(model);
    setTypes(truckSpecs.filter((s) => s.brand === selectedBrand && s.model === model).map((s) => s.type));
    setFormData((prev) => ({ ...prev, spec_id: "", type: "" }));
  };

  const handleTypeChange = (e) => {
    const type = e.target.value;
    const spec = truckSpecs.find(
      (s) => s.brand === selectedBrand && s.model === selectedModel && s.type === type
    );
    setFormData((prev) => ({
      ...prev,
      spec_id: spec?.spec_id || "",
      type: type,
    }));
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) setPhotoFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation first
    if (formData.current_odometer < formData.last_change_oil_odometer) {
      showAlertPopup("Current Odometer must be greater than or equal to Last Change Oil Odometer.");
      return;
    }

    let finalPhotoUrl = formData.photo_url;

    // Upload photo (if any)
    if (photoFile) {
      const fileExt = photoFile.name.split(".").pop();
      const fileName = `${formData.plate_number}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase
        .storage
        .from("truck-photos")
        .upload(fileName, photoFile, { upsert: true });

      if (uploadError) {
        console.error("Failed to upload photo:", uploadError);
        showAlertPopup("Failed to upload photo! Please try again.");
        return;
      }

      const { data: publicUrlData } = supabase
        .storage
        .from("truck-photos")
        .getPublicUrl(fileName);

      finalPhotoUrl = publicUrlData.publicUrl;
    }

    try {
      // Check for existing plate number
      const { data: existingTrucks, error: checkError } = await supabase
        .from("trucks")
        .select("plate_number")
        .eq("plate_number", formData.plate_number);

      if (checkError) throw checkError;

      if (existingTrucks && existingTrucks.length > 0) {
        showAlertPopup(`The plate number "${formData.plate_number}" already exists.`);
        return;
      }

      // Fetch truck specs interval
      const { data: specs, error: specsError } = await supabase
        .from("truck_specs")
        .select("change_oil_interval")
        .eq("spec_id", formData.spec_id)
        .single();

      if (specsError) throw specsError;

      const intervalKm = specs.change_oil_interval;
      const lastChangeOdo = Number(formData.last_change_oil_odometer) || 0;
      const nextChangeOdo = lastChangeOdo + intervalKm;

      // Create truck object - driver can be null/empty
      const truckData = {
        plate_number: formData.plate_number,
        spec_id: formData.spec_id,
        brand: selectedBrand,
        model: selectedModel,
        type: formData.type,
        driver: formData.driver || null, // Allow null driver
        current_odometer: Number(formData.current_odometer) || 0,
        last_change_oil_odometer: lastChangeOdo,
        next_change_oil_odometer: nextChangeOdo,
        photo_url: finalPhotoUrl,
        status: formData.status,
        is_archived: false,
      };

      // ✅ Add truck to database
      const { error } = await supabase.from("trucks").insert([truckData]);
      if (error) throw error;

      // Show success alert
      showAlertPopup(`✅ Truck added successfully! Next change oil at ${nextChangeOdo.toFixed(0)} KM.`, "success");

      // Reset form
      setFormData(initialFormState);
      setPhotoFile(null);
      setSelectedBrand("");
      setSelectedModel("");
      setModels([]);
      setTypes([]);

      onSave(formData);
      onClose();
    } catch (err) {
      console.error("Error adding truck:", err);
      showAlertPopup("⚠️ Unexpected error while adding truck. Please try again.");
    }
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 backdrop-blur-md bg-gray-900/20 flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Add New Truck</h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

                {/* Plate Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Plate Number</label>
                  <input
                    type="text"
                    name="plate_number"
                    value={formData.plate_number}
                    onChange={handleChange}
                    required
                    maxLength="8"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-600 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Brand Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Brand</label>
                  <select
                    value={selectedBrand}
                    onChange={handleBrandChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-600 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Brand</option>
                    {brands.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Model Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Model</label>
                  <select
                    value={selectedModel}
                    onChange={handleModelChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-600 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Model</option>
                    {models.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <select
                    value={formData.type}
                    onChange={handleTypeChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-600 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Type</option>
                    {types.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Driver Dropdown - Now Optional */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Driver (Optional)</label>
                  <select
                    name="driver"
                    value={formData.driver}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-600 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">No Driver Assigned</option>
                    {availableDrivers.length > 0 ? (
                      availableDrivers.map((driver) => (
                        <option key={driver.driver_id} value={driver.driver_id}>
                          {driver.name}
                        </option>
                      ))
                    ) : (
                      <option disabled>No available drivers</option>
                    )}
                  </select>
                </div>

                {/* Current Odometer */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Current Odometer (KM)</label>
                  <input
                    type="number"
                    name="current_odometer"
                    value={formData.current_odometer}
                    onChange={handleChange}
                    required
                    min="0"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-600 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Last Change Oil */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Change Oil (KM)</label>
                  <input
                    type="number"
                    name="last_change_oil_odometer"
                    value={formData.last_change_oil_odometer}
                    onChange={handleChange}
                    required
                    min="0"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-600 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Upload Photo */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Upload Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="mt-1 block w-full text-sm text-gray-500
                               file:mr-4 file:py-2 file:px-4
                               file:rounded-md file:border-0
                               file:text-sm file:font-semibold
                               file:bg-blue-50 file:text-blue-700
                               hover:file:bg-blue-100"
                  />
                  {photoFile && <p className="text-xs text-gray-500 mt-1">Selected: {photoFile.name}</p>}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setFormData(initialFormState);
                    setPhotoFile(null);
                    setSelectedBrand("");
                    setSelectedModel("");
                    setModels([]);
                    setTypes([]);
                    onClose();
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-md transition duration-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md shadow-md transition duration-300"
                >
                  Add Truck
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPopup && <AlertPopup message={alertMessage} type={alertType} onClose={closeAlertPopup} />}
    </>
  );
};

export default AddTruckModal;