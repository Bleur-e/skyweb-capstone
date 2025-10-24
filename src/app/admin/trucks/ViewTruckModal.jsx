"use client";
import React from "react";

const ViewTruckModal = ({ isOpen, onClose, truck, drivers }) => {
  if (!isOpen) return null;

  // Get driver name from the joined data or fallback to drivers list
  const getDriverName = () => {
    if (truck.drivers) {
      return truck.drivers.name;
    }
    
    if (truck.driver) {
      const driver = drivers.find(d => d.driver_id === truck.driver);
      return driver ? driver.name : 'Driver not found';
    }
    
    return 'Unassigned';
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

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-gray-900/20 flex items-center justify-center p-4 z-40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Truck Details</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Basic Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plate Number</label>
                <div className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-50 text-gray-700 font-mono">
                  {truck.plate_number}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                <div className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-50 text-gray-700">
                  {truck.brand}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                <div className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-50 text-gray-700">
                  {truck.model}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <div className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-50 text-gray-700">
                  {truck.type}
                </div>
              </div>
            </div>

            {/* Status & Assignment */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Status & Assignment</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Status</label>
                <div className={`w-full border rounded-lg px-4 py-2 font-medium ${getStatusColor(truck.status)}`}>
                  {truck.status}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Driver</label>
                <div className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-50 text-gray-700">
                  {getDriverName()}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver ID</label>
                <div className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-50 text-gray-700 font-mono">
                  {truck.driver || 'Not assigned'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Odometer</label>
                <div className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-50 text-gray-700 font-mono">
                  {truck.current_odometer?.toLocaleString()} km
                </div>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Oil Change Odometer</label>
                <div className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-50 text-gray-700 font-mono">
                  {truck.last_change_oil_odometer?.toLocaleString()} km
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Next Oil Change Odometer</label>
                <div className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-50 text-gray-700 font-mono">
                  {truck.next_change_oil_odometer?.toLocaleString()} km
                </div>
              </div>
            </div>
          </div>

          {/* View Only Indicator */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-center">
              <p className="text-sm text-gray-500">View Only - Admin Mode</p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewTruckModal;