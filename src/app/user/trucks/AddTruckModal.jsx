import React, { useState, useEffect } from "react";
import supabase from "../../../supabaseClient"; // adjust path as needed

const AddTruckModal = ({ isOpen, onClose, onSave, drivers }) => {
  const initialFormState = {
    plate_number: "",
    spec_id: "",
    driver: "",
    current_odometer: 0,
    last_change_oil_odometer: 0,
    photo_url: "",
    status: "Available",
  };

  const [formData, setFormData] = useState(initialFormState);
  const [photoFile, setPhotoFile] = useState(null);

  // Data from truck_specs table
  
  const [truckSpecs, setTruckSpecs] = useState([]);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [types, setTypes] = useState([]);

  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");

  useEffect(() => {
  if (isOpen) {
    supabase
      .from("truck_specs")
      .select("*")
      .then(({ data, error }) => {
        if (error) {
          console.error("Error fetching truck specs:", error);
        } else {
          setTruckSpecs(data);
          setBrands([...new Set(data.map((s) => s.brand))]);
        }
      });
  }
}, [isOpen]);

  if (!isOpen) return null;

  const handleBrandChange = (e) => {
    const brand = e.target.value;
    setSelectedBrand(brand);
    setModels([...new Set(truckSpecs.filter((s) => s.brand === brand).map((s) => s.model))]);
    setSelectedModel("");
    setTypes([]);
    setFormData((prev) => ({ ...prev, spec_id: "" }));
  };

  const handleModelChange = (e) => {
    const model = e.target.value;
    setSelectedModel(model);
    setTypes(truckSpecs.filter((s) => s.brand === selectedBrand && s.model === model).map((s) => s.type));
    setFormData((prev) => ({ ...prev, spec_id: "" }));
  };

  const handleTypeChange = (e) => {
  const type = e.target.value;
  const spec = truckSpecs.find(
    (s) => s.brand === selectedBrand && s.model === selectedModel && s.type === type
  );
  setFormData((prev) => ({
    ...prev,
    spec_id: spec?.spec_id || "",
    type: type, // <-- Add this line
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
    if (file) {
      setPhotoFile(file);
    }
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  let finalPhotoUrl = formData.photo_url;

  // Upload photo if selected
  if (photoFile) {
    const fileExt = photoFile.name.split(".").pop();
    const fileName = `${formData.plate_number}-${Date.now()}.${fileExt}`;
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from("truck-photos")
      .upload(fileName, photoFile, { upsert: true });

    if (uploadError) {
      alert("Failed to upload photo!");
      return;
    }

    // Get public URL
    const { data: publicUrlData } = supabase
      .storage
      .from("truck-photos")
      .getPublicUrl(fileName);

    finalPhotoUrl = publicUrlData.publicUrl;
  }

  try {
    // 🟣 1️⃣ Get change_oil_interval from truck_specs
    const { data: specs, error: specsError } = await supabase
      .from("truck_specs")
      .select("change_oil_interval")
      .eq("spec_id", formData.spec_id)
      .single();

    if (specsError) throw specsError;

    const intervalKm = specs.change_oil_interval;
    const intervalMiles = intervalKm * 0.621371; // Convert km → miles

    // 🟣 2️⃣ Compute next change oil odometer
    const lastChangeOdo = Number(formData.last_change_oil_odometer) || 0;
    const nextChangeOdo = lastChangeOdo + intervalMiles;

    // 🟣 3️⃣ Prepare truck data
    const truckData = {
      plate_number: formData.plate_number,
      spec_id: formData.spec_id,
      brand: selectedBrand,
      model: selectedModel,
      type: formData.type,
      driver: formData.driver,
      current_odometer: Number(formData.current_odometer) || 0,
      last_change_oil_odometer: lastChangeOdo,
      next_change_oil_odometer: nextChangeOdo, // ✅ computed value
      photo_url: finalPhotoUrl,
      status: formData.status,
      is_archived: false,
    };

    // 🟣 4️⃣ Save to database
    const { error } = await supabase.from("trucks").insert([truckData]);
    if (error) throw error;

    alert(
      `✅ Truck added successfully!\nNext change oil at ${nextChangeOdo.toFixed(2)} miles.`
    );

    // 🟣 5️⃣ Reset form
    setFormData(initialFormState);
    setPhotoFile(null);
    setSelectedBrand("");
    setSelectedModel("");
    setModels([]);
    setTypes([]);
    onClose();

  } catch (err) {
    console.error("Error adding truck:", err);
    alert("⚠️ Failed to add truck.");
  }
};

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Add New Truck</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Plate Number */}
            <div>
              <label htmlFor="plate_number" className="block text-sm font-medium text-gray-700">
                Plate Number
              </label>
              <input
                type="text"
                name="plate_number"
                id="plate_number"
                value={formData.plate_number}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-600"
              />
            </div>

            {/* Brand Dropdown */}
            <div>
              <label htmlFor="brand" className="block text-sm font-medium text-gray-700">
                Brand
              </label>
              <select
                id="brand"
                value={selectedBrand}
                onChange={handleBrandChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-600"
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
              <label htmlFor="model" className="block text-sm font-medium text-gray-700">
                Model
              </label>
              <select
                id="model"
                value={selectedModel}
                onChange={handleModelChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-600"
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
              <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                Type
              </label>
              <select
                id="type"
                value={formData.type}
                onChange={handleTypeChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-600"
              >
                <option value="">Select Type</option>
                {types.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Driver */}
            <div>
              <label htmlFor="driver" className="block text-sm font-medium text-gray-700">
                Driver
              </label>
              <select
                name="driver"
                id="driver"
                value={formData.driver}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-600"
              >
                <option value="">Select Driver</option>
                {drivers.map((driver) => (
                  <option key={driver.driver_id} value={driver.driver_id}>
                    {driver.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Current Odometer */}
            <div>
              <label htmlFor="current_odometer" className="block text-sm font-medium text-gray-700">
                Current Odometer 
              </label>
              <input
                type="number"
                name="current_odometer"
                id="current_odometer"
                value={formData.current_odometer}
                onChange={handleChange}
                required
                min="0"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-600"
              />
            </div>

            {/* Last Change Oil */}
            <div>
              <label htmlFor="last_change_oil_odometer" className="block text-sm font-medium text-gray-700">
                Last Change Oil (Odometer)
              </label>
              <input
                type="number"
                name="last_change_oil_odometer"
                id="last_change_oil_odometer"
                value={formData.last_change_oil_odometer}
                onChange={handleChange}
                required
                min="0"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-600"
              />
            </div>

            {/* Upload Photo */}
            <div>
              <label htmlFor="photo" className="block text-sm font-medium text-gray-700">
                Upload Photo
              </label>
              <input
                type="file"
                name="photo"
                id="photo"
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

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-md transition duration-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow-md transition duration-300"
            >
              Add Truck
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTruckModal;
