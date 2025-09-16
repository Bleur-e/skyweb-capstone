'use client';

import React, { useState, useEffect } from 'react';
import supabase from '../../../supabaseClient';

const TruckPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [newTruck, setNewTruck] = useState({
    type: '',
    brand: '',
    model: '',
    plate_number: '',
    photo_url: ''
  });
  const [trucks, setTrucks] = useState([]);
  const [photoFile, setPhotoFile] = useState(null);
  const [selectedTruck, setSelectedTruck] = useState(null);

  const brandOptions = {
    Isuzu: ['Elf', 'Forward', 'Giga'],
    Hino: ['300 Series', '500 Series', '700 Series'],
    Mitsubishi: ['Fuso Canter', 'Fuso Fighter', 'Super Great'],
    Toyota: ['Dyna', 'Toyoace'],
  };

  useEffect(() => {
    fetchTrucks();
  }, []);

  const fetchTrucks = async () => {
    const { data, error } = await supabase.from('trucks').select('*');
    if (error) {
      console.error('Error fetching trucks:', error);
    } else {
      setTrucks(data);
    }
  };

  const handleInputChange = (e) => {
    setNewTruck({ ...newTruck, [e.target.name]: e.target.value });
  };

  const handleBrandChange = (e) => {
    const brand = e.target.value;
    setNewTruck({ ...newTruck, brand, model: '' });
  };

  const handlePhotoChange = (e) => {
    setPhotoFile(e.target.files[0]);
  };

const handleAddTruck = async () => {
  if (
    !newTruck.type ||
    !newTruck.brand ||
    !newTruck.model ||
    !newTruck.plate_number
  ) {
    alert('Please fill in all required fields');
    return;
  }

  let photo_url = '';

  // If user selected a photo, try to upload
  if (photoFile) {
    const fileExt = photoFile.name.split('.').pop();
    const fileName = `${newTruck.plate_number}-${Date.now()}.${fileExt}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('truck-photos')
      .upload(fileName, photoFile, { upsert: true }); // allow overwrite

    if (uploadError) {
      console.error('Photo upload failed:', uploadError);
      alert('Photo upload failed! Please try again.');
      return; // stop adding truck if photo was chosen but failed
    }

    const { data: publicUrlData } = supabase.storage
      .from('truck-photos')
      .getPublicUrl(fileName);

    photo_url = publicUrlData.publicUrl;
  }

  {/* Insert truck */}
  const { error } = await supabase.from('trucks').insert([
    {
      ...newTruck,
      photo_url
    }
  ]);

  if (error) {
    console.error('Error adding truck:', error);
    alert('Failed to add truck.');
  } else {
    fetchTrucks();
    setIsModalOpen(false);
    setNewTruck({
      type: '',
      brand: '',
      model: '',
      plate_number: '',
      photo_url: ''
    });
    setPhotoFile(null);
  }
};


  const handleViewTruck = (truck) => {
    setSelectedTruck(truck);
    setIsViewModalOpen(true);
  };

  {/* Delete Truck */}
  const handleDeleteTruck = async (truck) => {
  if (!confirm("Are you sure you want to delete this truck?")) return;

  {/* Delete photo from storage if exists */}
  if (truck.photo_url) {
    try {
      // Extract file name from public URL
      const filePath = truck.photo_url.split('/').pop();
      const { error: storageError } = await supabase
        .storage
        .from('truck-photos')
        .remove([filePath]);

      if (storageError) {
        console.error("Error deleting photo:", storageError);
      }
    } catch (err) {
      console.error("Error parsing photo URL:", err);
    }
  }

  {/* Delete truck record from table */}
  const { error } = await supabase
    .from('trucks')
    .delete()
    .eq('plate_number', truck.plate_number);

  if (error) {
    console.error('Error deleting truck:', error);
    alert('Failed to delete truck.');
  } else {
    fetchTrucks();
    setIsViewModalOpen(false);
    alert('Truck deleted successfully!');
  }
};


  return (
    <main className="flex-1 p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-4">Trucks</h2>

      {/* Add Truck Button */}
      <button
        className="bg-green-500 text-white px-4 py-2 rounded mb-4 hover:bg-green-600"
        onClick={() => setIsModalOpen(true)}
      >
        Add Truck
      </button>

      {/* Add Truck Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-xl text-blue-700 font-bold mb-4">Add New Truck</h3>
            <div className="space-y-3">
              <input
                name="type"
                placeholder="Truck Type"
                value={newTruck.type}
                onChange={handleInputChange}
                className="w-full border text-blue-700 border-blue-700 p-2 rounded"
              />
              {/* Brand Dropdown with manual input */}
              <div>
                <select
                  value={newTruck.brand}
                  onChange={handleBrandChange}
                  className="w-full border text-blue-700 border-blue-700 p-2 rounded mb-2"
                >
                  <option value="">Select Brand</option>
                  {Object.keys(brandOptions).map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Or type brand"
                  value={newTruck.brand}
                  onChange={handleInputChange}
                  name="brand"
                  className="w-full border text-blue-700 border-blue-700 p-2 rounded"
                />
              </div>
              {/* Model Dropdown with manual input */}
              <div>
                <select
                  value={newTruck.model}
                  onChange={handleInputChange}
                  name="model"
                  className="w-full border text-blue-700 border-blue-700 p-2 rounded mb-2"
                  disabled={!brandOptions[newTruck.brand]}
                >
                  <option value="">Select Model</option>
                  {brandOptions[newTruck.brand]?.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Or type model"
                  value={newTruck.model}
                  onChange={handleInputChange}
                  name="model"
                  className="w-full border text-blue-700 border-blue-700 p-2 rounded"
                />
              </div>
              <input
                name="plate_number"
                placeholder="Plate Number"
                value={newTruck.plate_number}
                onChange={handleInputChange}
                className="w-full border text-blue-700 border-blue-700 p-2 rounded"
              />
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="w-full border border-blue-700 p-2 rounded"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-400 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTruck}
                className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Truck Modal */}
      {isViewModalOpen && selectedTruck && (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
      <h3 className="text-xl text-blue-700 font-bold mb-4">Truck Details</h3>
      <div className="space-y-3">
        <div>
          <strong className="text-gray-800">Brand:</strong>{" "}
          <span className="text-indigo-700">{selectedTruck.brand}</span>
        </div>
        <div>
          <strong className="text-gray-800">Type:</strong>{" "}
          <span className="text-indigo-700">{selectedTruck.type}</span>
        </div>
        <div>
          <strong className="text-gray-800">Model:</strong>{" "}
          <span className="text-indigo-700">{selectedTruck.model}</span>
        </div>
        <div>
          <strong className="text-gray-800">Plate Number:</strong>{" "}
          <span className="text-indigo-700">{selectedTruck.plate_number}</span>
        </div>
        {selectedTruck.photo_url && (
          <div>
            <strong className="text-gray-800">Photo:</strong>
            <img
              src={selectedTruck.photo_url}
              alt="Truck"
              className="mt-2 w-full max-h-64 object-contain rounded"
            />
          </div>
        )}
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={() => setIsViewModalOpen(false)}
          className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-600"
        >
          Close
        </button>

        {/* Delete Truck */}
      <button
      onClick={() => handleDeleteTruck(selectedTruck)}
      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Delete
      </button>
      </div>
    </div>
  </div>
)}

      {/* Table */}
      <table className="min-w-full bg-white shadow rounded-lg overflow-hidden">
        <thead className="bg-indigo-100 text-gray-700">
          <tr>
            <th className="px-4 py-2 text-left">Type</th>
            <th className="px-4 py-2 text-left">Brand</th>
            <th className="px-4 py-2 text-left">Model</th>
            <th className="px-4 py-2 text-left">Plate Number</th>
            <th className="px-4 py-2 text-left">Photo</th>
            <th className="px-4 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody className="text-gray-600">
          {trucks.length > 0 ? (
            trucks.map((truck) => (
              <tr key={truck.id} className="border-b">
                <td className="px-4 py-3">{truck.type}</td>
                <td className="px-4 py-3">{truck.brand}</td>
                <td className="px-4 py-3">{truck.model}</td>
                <td className="px-4 py-3">{truck.plate_number}</td>
                <td className="px-4 py-3">
                  {truck.photo_url ? (
                    <img
                      src={truck.photo_url}
                      alt="Truck"
                      className="w-16 h-16 object-cover rounded"
                    />
                  ) : (
                    <span className="text-gray-400">No photo</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                    onClick={() => handleViewTruck(truck)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" className="px-4 py-3 text-center text-gray-400">
                No trucks found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
};

export default TruckPage;