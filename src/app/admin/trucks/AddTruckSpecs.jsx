'use client';

import React, { useState, useEffect } from 'react';
import supabase from '../../../supabaseClient'; // Adjust path as needed

export default function AddTruckSpecs({ isOpen, onClose, onAdd }) {
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    type: '',
    change_oil_interval: '',
  });
  
  const [existingBrands, setExistingBrands] = useState([]);
  const [existingModels, setExistingModels] = useState([]);
  const [brandSuggestions, setBrandSuggestions] = useState([]);
  const [modelSuggestions, setModelSuggestions] = useState([]);
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);
  const [showModelSuggestions, setShowModelSuggestions] = useState(false);

  // Fetch existing brands and models when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchExistingSpecs();
    }
  }, [isOpen]);

  const fetchExistingSpecs = async () => {
    try {
      const { data, error } = await supabase
        .from('truck_specs')
        .select('brand, model')
        .order('brand')
        .order('model');

      if (error) throw error;

      // Extract unique brands
      const brands = [...new Set(data.map(item => item.brand))];
      setExistingBrands(brands);

      // Extract unique models
      const models = [...new Set(data.map(item => item.model))];
      setExistingModels(models);

    } catch (error) {
      console.error('Error fetching existing specs:', error);
    }
  };

  const handleBrandChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, brand: value }));
    
    // Filter suggestions based on input
    if (value.length > 0) {
      const filtered = existingBrands.filter(brand =>
        brand.toLowerCase().includes(value.toLowerCase())
      );
      setBrandSuggestions(filtered);
      setShowBrandSuggestions(true);
    } else {
      setShowBrandSuggestions(false);
    }
  };

  const handleModelChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, model: value }));
    
    // Filter suggestions based on input
    if (value.length > 0) {
      const filtered = existingModels.filter(model =>
        model.toLowerCase().includes(value.toLowerCase())
      );
      setModelSuggestions(filtered);
      setShowModelSuggestions(true);
    } else {
      setShowModelSuggestions(false);
    }
  };

  const selectBrand = (brand) => {
    setFormData(prev => ({ ...prev, brand }));
    setShowBrandSuggestions(false);
  };

  const selectModel = (model) => {
    setFormData(prev => ({ ...prev, model }));
    setShowModelSuggestions(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'brand') {
      handleBrandChange(e);
    } else if (name === 'model') {
      handleModelChange(e);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.brand || !formData.model || !formData.type || !formData.change_oil_interval) {
      alert('Please fill out all fields.');
      return;
    }

    onAdd(formData);
    // Reset form
    setFormData({
      brand: '',
      model: '',
      type: '',
      change_oil_interval: '',
    });
    setShowBrandSuggestions(false);
    setShowModelSuggestions(false);
  };

  const handleClose = () => {
    // Reset everything when closing
    setFormData({
      brand: '',
      model: '',
      type: '',
      change_oil_interval: '',
    });
    setShowBrandSuggestions(false);
    setShowModelSuggestions(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30 backdrop-blur-sm">
      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg w-full max-w-md p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">
          Add Truck Specification
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Brand Field with Suggestions */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Brand
            </label>
            <input
              type="text"
              name="brand"
              value={formData.brand}
              onChange={handleChange}
              onFocus={() => formData.brand.length > 0 && setShowBrandSuggestions(true)}
              onBlur={() => setTimeout(() => setShowBrandSuggestions(false), 200)}
              placeholder="e.g., Isuzu"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none text-gray-700 mb-1"
              autoComplete="off"
            />
            {showBrandSuggestions && brandSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {brandSuggestions.map((brand, index) => (
                  <div
                    key={index}
                    className="px-3 py-2 cursor-pointer text-gray-500 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                    onMouseDown={() => selectBrand(brand)}
                  >
                    {brand}
                  </div>
                ))}
              </div>
            )}
            {existingBrands.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Existing brands: {existingBrands.slice(0, 3).join(', ')}
                {existingBrands.length > 3 && ` and ${existingBrands.length - 3} more...`}
              </p>
            )}
          </div>

          {/* Model Field with Suggestions */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model
            </label>
            <input
              type="text"
              name="model"
              value={formData.model}
              onChange={handleChange}
              onFocus={() => formData.model.length > 0 && setShowModelSuggestions(true)}
              onBlur={() => setTimeout(() => setShowModelSuggestions(false), 200)}
              placeholder="e.g., Elf NKR"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none text-gray-700 mb-1"
              autoComplete="off"
            />
            {showModelSuggestions && modelSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {modelSuggestions.map((model, index) => (
                  <div
                    key={index}
                    className="px-3 py-2 cursor-pointer text-gray-500 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                    onMouseDown={() => selectModel(model)}
                  >
                    {model}
                  </div>
                ))}
              </div>
            )}
            {existingModels.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Existing models: {existingModels.slice(0, 3).join(', ')}
                {existingModels.length > 3 && ` and ${existingModels.length - 3} more...`}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <input 
              type="text"
              name="type"
              value={formData.type}
              onChange={handleChange}
              placeholder="e.g., Cargo Truck"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none text-gray-700 mb-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Change Oil Interval (km)
            </label>
            <input
              type="number"
              name="change_oil_interval"
              value={formData.change_oil_interval}
              onChange={handleChange}
              placeholder="e.g., 5000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-400 focus:outline-none text-gray-700 mb-1"
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-md transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md shadow-md transition"
            >
              Add Spec
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}