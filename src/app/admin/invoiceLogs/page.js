'use client';

import React, { useEffect, useState } from 'react';
import supabase from '../../../supabaseClient';

const InvoiceLogsPage = () => {
  const [activeTab, setActiveTab] = useState('sales');
  const [salesInvoices, setSalesInvoices] = useState([]);
  const [serviceInvoices, setServiceInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedImage, setExpandedImage] = useState(null);

  useEffect(() => {
    if (activeTab === 'sales') fetchSalesInvoices();
    if (activeTab === 'service') fetchServiceInvoices();
  }, [activeTab]);

  // --- Fetch Sales Invoices ---
  const fetchSalesInvoices = async () => {
    const { data, error } = await supabase
      .from('invoice_table')
      .select(`
        *,
        users:encoded_by(full_name)
      `);
    if (error) console.error(error);
    else setSalesInvoices(data || []);
  };

  // --- Fetch Service Invoices ---
  const fetchServiceInvoices = async () => {
    const { data, error } = await supabase
      .from('service_invoice_table')
      .select(`
        *,
        users:encoded_by(full_name)
      `);
    if (error) console.error(error);
    else setServiceInvoices(data || []);
  };

  // --- View Invoice ---
  const handleViewInvoice = async (invoice) => {
    setSelectedInvoice(invoice);

    if (activeTab === 'sales') {
      const { data: itemData, error } = await supabase
        .from('invoice_items_table')
        .select('*')
        .eq('invoice_no', invoice.invoice_no);

      if (error) console.error(error);
      else setItems(itemData || []);
    }

    if (activeTab === 'service') {
      const { data: detailData, error } = await supabase
        .from('service_invoice_details')
        .select('*')
        .eq('service_invoice_no', invoice.service_invoice_no);

      if (error) console.error(error);
      else setItems(detailData || []);
    }

    setIsModalOpen(true);
  };

  return (
    <main className="flex-1 p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Invoice Logs</h2>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('sales')}
          className={`px-4 py-2 rounded ${activeTab === 'sales' ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Sales Invoice Logs
        </button>
        <button
          onClick={() => setActiveTab('service')}
          className={`px-4 py-2 rounded ${activeTab === 'service' ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Service Invoice Logs
        </button>
      </div>

      {/* Sales Invoice Table */}
      {activeTab === 'sales' && (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6 text-left">Invoice No.</th>
                <th className="py-3 px-6 text-left">Supplier Name</th>
                <th className="py-3 px-6 text-left">Net Amount</th>
                <th className="py-3 px-6 text-left">Encoded By</th>
                <th className="py-3 px-6 text-left">Date</th>
                <th className="py-3 px-6 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm font-light">
              {salesInvoices.length > 0 ? (
                salesInvoices.map((invoice) => (
                  <tr key={invoice.invoice_no} className="border-b border-gray-200 hover:bg-gray-100">
                    <td className="py-3 px-6">{invoice.invoice_no}</td>
                    <td className="py-3 px-6">{invoice.supplier_name}</td>
                    <td className="py-3 px-6">₱{invoice.net_amount}</td>
                    <td className="py-3 px-6">{invoice.users?.full_name || 'N/A'}</td>
                    <td className="py-3 px-6">{invoice.date}</td>
                    <td className="py-3 px-6">
                      <button
                        className="text-blue-600 hover:underline"
                        onClick={() => handleViewInvoice(invoice)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-3 text-gray-400">
                    No sales invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Service Invoice Table */}
      {activeTab === 'service' && (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6 text-left">Service Invoice No.</th>
                <th className="py-3 px-6 text-left">Total Amount</th>
                <th className="py-3 px-6 text-left">VAT</th>
                <th className="py-3 px-6 text-left">Withholding Tax</th>
                <th className="py-3 px-6 text-left">Encoded By</th>
                <th className="py-3 px-6 text-left">Date</th>
                <th className="py-3 px-6 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm font-light">
              {serviceInvoices.length > 0 ? (
                serviceInvoices.map((invoice) => (
                  <tr key={invoice.service_invoice_no} className="border-b border-gray-200 hover:bg-gray-100">
                    <td className="py-3 px-6">{invoice.service_invoice_no}</td>
                    <td className="py-3 px-6">₱{invoice.total_amount}</td>
                    <td className="py-3 px-6">₱{invoice.vat || 0}</td>
                    <td className="py-3 px-6">₱{invoice.withholding_tax || 0}</td>
                    <td className="py-3 px-6">{invoice.users?.full_name || 'N/A'}</td>
                    <td className="py-3 px-6">{invoice.date}</td>
                    <td className="py-3 px-6">
                      <button
                        className="text-blue-600 hover:underline"
                        onClick={() => handleViewInvoice(invoice)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-3 text-gray-400">
                    No service invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal (for both Sales & Service) */}
      {isModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-5xl h-[80vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-blue-700 mb-4">
              {activeTab === 'sales' ? 'Sales Invoice Details' : 'Service Invoice Details'}
            </h3>

            {/* Invoice Info */}
            <div className="grid grid-cols-2 gap-4 mb-6 text-gray-700">
              {activeTab === 'sales' ? (
                <>
                  <p><strong>Invoice No:</strong> {selectedInvoice.invoice_no}</p>
                  <p><strong>Supplier:</strong> {selectedInvoice.supplier_name}</p>
                  <p><strong>Terms:</strong> {selectedInvoice.terms}</p>
                  <p><strong>Date:</strong> {selectedInvoice.date}</p>
                  <p><strong>VAT:</strong> ₱{selectedInvoice.vat_amount}</p>
                  <p><strong>Discount:</strong> ₱{selectedInvoice.discount}</p>
                  <p><strong>Net Amount:</strong> ₱{selectedInvoice.net_amount}</p>
                  <p><strong>Encoded By:</strong> {selectedInvoice.users?.full_name}</p>
                </>
              ) : (
                <>
                  <p><strong>Service Invoice No:</strong> {selectedInvoice.service_invoice_no}</p>
                  <p><strong>Total Amount:</strong> ₱{selectedInvoice.total_amount}</p>
                  <p><strong>VAT:</strong> ₱{selectedInvoice.vat || 0}</p>
                  <p><strong>Withholding Tax:</strong> ₱{selectedInvoice.withholding_tax || 0}</p>
                  <p><strong>Date:</strong> {selectedInvoice.date}</p>
                  <p><strong>Encoded By:</strong> {selectedInvoice.users?.full_name}</p>
                </>
              )}
            </div>

            {/* Items / Details */}
            <h4 className="text-lg font-semibold text-gray-800 mb-2">Items / Details</h4>
            <table className="w-full border mb-6">
              <thead className="bg-gray-100">
                <tr>
                  {activeTab === 'sales' ? (
                    <>
                      <th className="p-2 text-left text-gray-700">Item Name</th>
                      <th className="p-2 text-left text-gray-700">Category</th>
                      <th className="p-2 text-left text-gray-700">Quantity</th>
                      <th className="p-2 text-left text-gray-700">Unit Price</th>
                      <th className="p-2 text-left text-gray-700">Discount</th>
                      <th className="p-2 text-left text-gray-700">Total</th>
                    </>
                  ) : (
                    <>
                      <th className="p-2 text-left text-gray-700">Description</th>
                      <th className="p-2 text-left text-gray-700">Hours</th>
                      <th className="p-2 text-left text-gray-700">Labor Cost</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id || item.item_id} className="border-t">
                    {activeTab === 'sales' ? (
                      <>
                        <td className="p-2 text-gray-600">{item.item_name}</td>
                        <td className="p-2 text-gray-600">{item.category}</td>
                        <td className="p-2 text-gray-600">{item.quantity}</td>
                        <td className="p-2 text-gray-600">₱{item.unit_price}</td>
                        <td className="p-2 text-gray-600">{item.discount || '0%'}</td>
                        <td className="p-2 text-gray-600">₱{item.total_amount}</td>
                      </>
                    ) : (
                      <>
                        <td className="p-2 text-gray-600">{item.description}</td>
                        <td className="p-2 text-gray-600">{item.hours}</td>
                        <td className="p-2 text-gray-600">₱{item.labor_cost}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Invoice Photo (Sales only) */}
            {activeTab === 'sales' && selectedInvoice.invoice_photo_url && (
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-2">Proof</h4>
                <img
                  src={selectedInvoice.invoice_photo_url}
                  alt="Invoice Proof"
                  className="w-full max-h-[500px] object-contain rounded border cursor-pointer"
                  onClick={() => setExpandedImage(selectedInvoice.invoice_photo_url)}
                />
              </div>
            )}

            {/* Expanded fullscreen photo modal */}
            {expandedImage && (
              <div
                className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60]"
                onClick={() => setExpandedImage(null)}
              >
                <img
                  src={expandedImage}
                  alt="Expanded Invoice"
                  className="max-w-[95%] max-h-[95%] object-contain rounded shadow-lg"
                />
              </div>
            )}

            {/* Close Button */}
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default InvoiceLogsPage;
