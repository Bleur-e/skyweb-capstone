'use client';

import React, { useState, useEffect } from 'react';
import supabase from '../../../supabaseClient';
import { useRouter } from 'next/navigation';

const JobOrderPage = () => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [maintenanceOrders, setMaintenanceOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('All');

  useEffect(() => {
    const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
    if (!currentUser) {
      router.push("/");
      return;
    }
    setCurrentUser(currentUser);
  }, [router]);

  useEffect(() => {
    const fetchMaintenanceOrders = async () => {
      const { data, error } = await supabase
        .from('maintenance')
        .select(`
          *,
          maintenance_items(
            quantity,
            inventory(item_id, item_name, category)
          ),
          maintenance_mechanics(
            mechanics(mechanic_id, name)
          ),
          maintenance_logs(
            status, created_at, notes
          )
        `)
        .order('date', { ascending: false });

      if (!error && data) {
        setMaintenanceOrders(data);
      } else {
        console.error('Error fetching maintenance orders:', error);
      }
      setLoading(false);
    };

    if (currentUser) {
      fetchMaintenanceOrders();
    }
  }, [currentUser]);

  const filteredOrders = maintenanceOrders
    .filter(order => {
      if (filterType === 'All') return true;
      if (filterType === 'Scheduled') return order.status === 'Scheduled';
      if (filterType === 'Completed') return order.status === 'Completed';
      return true;
    })
    .sort((a, b) => {
      if (a.status === 'Scheduled' && b.status !== 'Scheduled') return -1;
      if (a.status !== 'Scheduled' && b.status === 'Scheduled') return 1;
      return new Date(b.date) - new Date(a.date);
    });

  const handlePrint = (order) => {
    setSelectedOrder(order);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  if (loading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Maintenance Job Orders</h1>
        <select 
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border text-gray-600 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="All">All Types</option>
          <option value="Scheduled">Scheduled</option>
          <option value="Completed">Completed</option>
        </select>
      </div>
      
      <div className="space-y-4">
        {filteredOrders.map((order) => (
          <div key={order.maintenance_id} className="border border-gray-300 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="font-semibold text-gray-700">Plate No: <span className="font-normal">{order.plate_number}</span></div>
                    <div className="font-semibold text-gray-700">Date: <span className="font-normal">{new Date(order.date).toLocaleDateString()}</span></div>
                    <div className="font-semibold text-gray-700">Type: <span className="font-normal">{order.maintenance_type}</span></div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    order.status === 'Completed' ? 'bg-green-100 text-green-800 border border-green-200' :
                    order.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                    order.status === 'Scheduled' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                    'bg-gray-100 text-gray-800 border border-gray-200'
                  }`}>
                    {order.status}
                  </span>
                </div>
                
                {order.description && (
                  <div className="mt-3 text-sm">
                    <span className="font-semibold text-gray-700">Description:</span> 
                    <p className="text-gray-600 mt-1">{order.description}</p>
                  </div>
                )}

                {order.maintenance_mechanics?.length > 0 && (
                  <div className="mt-3 text-sm">
                    <span className="font-semibold text-gray-700">Mechanics:</span>{' '}
                    <span className="text-gray-600">
                      {order.maintenance_mechanics.map(m => m.mechanics?.name).join(', ')}
                    </span>
                  </div>
                )}

                {order.maintenance_items?.length > 0 && (
                  <div className="mt-3 text-sm">
                    <span className="font-semibold text-gray-700">Items:</span>
                    <div className="ml-2 mt-1">
                      {order.maintenance_items.map((item, index) => (
                        <div key={index} className="text-xs text-gray-600">
                          • {item.inventory?.item_name} 
                          {item.inventory?.category && ` (${item.inventory.category})`} - Qty: {item.quantity}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => handlePrint(order)}
                className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors print:hidden"
              >
                Print
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedOrder && (
        <div className="hidden print:block fixed inset-0 bg-white p-8">
          <style jsx global>{`
            @media print {
              @page {
                size: A5;
                margin: 0.5cm;
              }
              body * {
                visibility: hidden;
              }
              .print-container, .print-container * {
                visibility: visible;
              }
              .print-container {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                padding: 0.5cm;
                background: white;
              }
            }
          `}</style>
          <div className="print-container bg-white text-gray-900 font-sans">
            {/* Header */}
            <div className="text-center mb-4 border-b-2 border-gray-800 pb-3">
              <h1 className="text-xl font-bold uppercase tracking-wide">SKYLAND MOTORPOOL</h1>
              <p className="text-sm font-semibold text-gray-700 mt-1">MAINTENANCE JOB ORDER</p>
            </div>

            {/* Main Info Grid */}
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-semibold">Job ID:</span>
                  <span className="text-gray-700">{selectedOrder.maintenance_id.slice(-8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Plate No:</span>
                  <span className="text-gray-700 font-bold">{selectedOrder.plate_number}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-semibold">Date:</span>
                  <span className="text-gray-700">{new Date(selectedOrder.date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Type:</span>
                  <span className="text-gray-700">{selectedOrder.maintenance_type}</span>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="text-center mb-4">
              <span className={`inline-block px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-wider border-2 ${
                selectedOrder.status === 'Completed' ? 'bg-green-100 text-green-800 border-green-400' :
                selectedOrder.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800 border-yellow-400' :
                'bg-blue-100 text-blue-800 border-blue-400'
              }`}>
                {selectedOrder.status}
              </span>
            </div>

            {/* Work Description */}
            {selectedOrder.description && (
              <div className="mb-4">
                <h3 className="font-bold text-sm uppercase border-b border-gray-300 pb-1 mb-2">WORK DESCRIPTION</h3>
                <p className="text-sm leading-relaxed">{selectedOrder.description}</p>
              </div>
            )}

            {/* Assigned Team */}
            {selectedOrder.maintenance_mechanics?.length > 0 && (
              <div className="mb-4">
                <h3 className="font-bold text-sm uppercase border-b border-gray-300 pb-1 mb-2">ASSIGNED TEAM</h3>
                <div className="space-y-2">
                  {selectedOrder.maintenance_mechanics.map((mechanic, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm">{mechanic.mechanics?.name}</span>
                      <div className="text-right">
                        <div className="border-b border-gray-400 w-32 mb-1"></div>
                        <span className="text-xs text-gray-500">Signature</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Required Parts */}
            {selectedOrder.maintenance_items?.length > 0 && (
              <div className="mb-4">
                <h3 className="font-bold text-sm uppercase border-b border-gray-300 pb-1 mb-2">REQUIRED PARTS</h3>
                <div className="space-y-2">
                  {selectedOrder.maintenance_items.map((item, index) => (
                    <div key={index} className="flex justify-between items-start">
                      <div className="flex-1">
                        <span className="text-sm block">{item.inventory?.item_name}</span>
                        {item.inventory?.category && (
                          <span className="text-xs text-gray-600">({item.inventory.category})</span>
                        )}
                      </div>
                      <span className="text-sm font-semibold whitespace-nowrap ml-2">Qty: {item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Signatures */}
            <div className="mt-6 pt-4 border-t border-gray-300">
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="border-b border-gray-400 pb-8 mb-2"></div>
                  <span className="text-sm font-semibold uppercase">MECHANIC</span>
                </div>
                <div className="text-center">
                  <div className="border-b border-gray-400 pb-8 mb-2"></div>
                  <span className="text-sm font-semibold uppercase">SUPERVISOR</span>
                </div>
              </div>
            </div>

            {/* Completion Notes */}
            <div className="mt-4 pt-3 border-t border-gray-300">
              <h3 className="font-bold text-sm uppercase mb-2">COMPLETION NOTES</h3>
              <div className="border border-gray-300 rounded p-2 min-h-[60px] text-sm">
                {selectedOrder.status === 'Completed' && selectedOrder.maintenance_logs?.find(log => log.status === 'Completed')?.notes}
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-6 pt-3 border-t border-gray-300">
              <p className="text-xs text-gray-600">
                Generated on {new Date().toLocaleDateString()} • Skyland Motorpool System
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobOrderPage;