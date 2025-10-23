'use client';

import React, { useEffect, useState } from 'react';
import supabase from '../../../supabaseClient';
import { useRouter } from 'next/navigation';

const InvoiceLogsPage = () => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('sales');
  const [salesInvoices, setSalesInvoices] = useState([]);
  const [serviceInvoices, setServiceInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedImage, setExpandedImage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
          const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
          if (!currentUser) {
            router.push("/");
            return;
          }
          setCurrentUser(currentUser);
        }, [router]);

  useEffect(() => {
    if (activeTab === 'sales') fetchSalesInvoices();
    if (activeTab === 'service') fetchServiceInvoices();
  }, [activeTab]);

  // --- Fetch Sales Invoices ---
  const fetchSalesInvoices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('invoice_table')
      .select(`
        *,
        users:encoded_by(full_name)
      `)
      .order('created_at', { ascending: false }); // Newest first

    if (error) console.error(error);
    else setSalesInvoices(data || []);
    setLoading(false);
  };

  // --- Fetch Service Invoices ---
  const fetchServiceInvoices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('service_invoice_table')
      .select(`
        *,
        users:encoded_by(full_name)
      `)
      .order('created_at', { ascending: false }); // Newest first

    if (error) console.error(error);
    else setServiceInvoices(data || []);
    setLoading(false);
  };

  // --- View Invoice ---
  const handleViewInvoice = async (invoice) => {
    setSelectedInvoice(invoice);

    if (activeTab === 'sales') {
      const { data: itemData, error } = await supabase
        .from('invoice_items_table')
        .select('*')
        .eq('invoice_no', invoice.invoice_no)
        .order('id', { ascending: true });

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

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <main className="flex-1 p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-2">Invoice Logs</h2>
          <p className="text-gray-600">Track and manage all invoice records</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-2 mb-8">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('sales')}
              className={`flex-1 px-6 py-4 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === 'sales' 
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Sales Invoices
              </div>
            </button>
            <button
              onClick={() => setActiveTab('service')}
              className={`flex-1 px-6 py-4 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === 'service' 
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Service Invoices
              </div>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
          </div>
        )}

        {/* Sales Invoice Table */}
        {!loading && activeTab === 'sales' && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-800">Sales Invoice Records</h3>
              <p className="text-sm text-gray-600 mt-1">
                {salesInvoices.length} invoice{salesInvoices.length !== 1 ? 's' : ''} found
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    <th className="py-4 px-6">Invoice No.</th>
                    <th className="py-4 px-6">Supplier</th>
                    <th className="py-4 px-6 text-right">Net Amount</th>
                    <th className="py-4 px-6">Encoded By</th>
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {salesInvoices.length > 0 ? (
                    salesInvoices.map((invoice, index) => (
                      <tr 
                        key={invoice.invoice_no} 
                        className="hover:bg-gray-50 transition-colors duration-150"
                      >
                        <td className="py-4 px-6">
                          <div className="font-medium text-gray-900">{invoice.invoice_no}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-gray-700">{invoice.supplier_name}</div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="font-semibold text-green-600">
                            {formatCurrency(invoice.net_amount)}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-gray-600">{invoice.users?.full_name || 'N/A'}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-gray-500 text-sm">
                            {formatDate(invoice.date)}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => handleViewInvoice(invoice)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors duration-200 font-medium text-sm"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="py-12 text-center">
                        <div className="text-gray-400">
                          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <p className="text-lg font-medium">No sales invoices found</p>
                          <p className="text-sm mt-1">Sales invoices will appear here once created</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Service Invoice Table */}
        {!loading && activeTab === 'service' && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-800">Service Invoice Records</h3>
              <p className="text-sm text-gray-600 mt-1">
                {serviceInvoices.length} invoice{serviceInvoices.length !== 1 ? 's' : ''} found
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    <th className="py-4 px-6">Invoice No.</th>
                    <th className="py-4 px-6 text-right">Total Amount</th>
                    <th className="py-4 px-6 text-right">VAT</th>
                    <th className="py-4 px-6 text-right">Withholding Tax</th>
                    <th className="py-4 px-6">Encoded By</th>
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {serviceInvoices.length > 0 ? (
                    serviceInvoices.map((invoice) => (
                      <tr 
                        key={invoice.service_invoice_no} 
                        className="hover:bg-gray-50 transition-colors duration-150"
                      >
                        <td className="py-4 px-6">
                          <div className="font-medium text-gray-900">{invoice.service_invoice_no}</div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="font-semibold text-green-600">
                            {formatCurrency(invoice.total_amount)}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="text-gray-600">
                            {formatCurrency(invoice.vat)}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="text-gray-600">
                            {formatCurrency(invoice.withholding_tax)}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-gray-600">{invoice.users?.full_name || 'N/A'}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-gray-500 text-sm">
                            {formatDate(invoice.date)}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => handleViewInvoice(invoice)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors duration-200 font-medium text-sm"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="py-12 text-center">
                        <div className="text-gray-400">
                          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <p className="text-lg font-medium">No service invoices found</p>
                          <p className="text-sm mt-1">Service invoices will appear here once created</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal (for both Sales & Service) */}
        {isModalOpen && selectedInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-bold text-white">
                    {activeTab === 'sales' ? 'Sales Invoice Details' : 'Service Invoice Details'}
                  </h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-white hover:text-blue-200 transition-colors duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Invoice Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {activeTab === 'sales' ? (
                    <>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-semibold text-gray-500">Invoice No.</label>
                          <p className="text-lg font-medium text-gray-900">{selectedInvoice.invoice_no}</p>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-gray-500">Supplier</label>
                          <p className="text-lg font-medium text-gray-900">{selectedInvoice.supplier_name}</p>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-gray-500">Terms</label>
                          <p className="text-lg font-medium text-gray-900">{selectedInvoice.terms || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-gray-500">Date</label>
                          <p className="text-lg font-medium text-gray-900">{formatDate(selectedInvoice.date)}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-semibold text-gray-500">VAT Amount</label>
                          <p className="text-lg font-medium text-gray-900">{formatCurrency(selectedInvoice.vat_amount)}</p>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-gray-500">Discount</label>
                          <p className="text-lg font-medium text-gray-900">{formatCurrency(selectedInvoice.discount)}</p>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-gray-500">Net Amount</label>
                          <p className="text-2xl font-bold text-green-600">{formatCurrency(selectedInvoice.net_amount)}</p>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-gray-500">Encoded By</label>
                          <p className="text-lg font-medium text-gray-900">{selectedInvoice.users?.full_name || 'N/A'}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-semibold text-gray-500">Service Invoice No.</label>
                          <p className="text-lg font-medium text-gray-900">{selectedInvoice.service_invoice_no}</p>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-gray-500">Date</label>
                          <p className="text-lg font-medium text-gray-900">{formatDate(selectedInvoice.date)}</p>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-gray-500">VAT</label>
                          <p className="text-lg font-medium text-gray-900">{formatCurrency(selectedInvoice.vat)}</p>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-gray-500">Encoded By</label>
                          <p className="text-lg font-medium text-gray-900">{selectedInvoice.users?.full_name || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-semibold text-gray-500">Withholding Tax</label>
                          <p className="text-lg font-medium text-gray-900">{formatCurrency(selectedInvoice.withholding_tax)}</p>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-gray-500">Total Amount</label>
                          <p className="text-2xl font-bold text-green-600">{formatCurrency(selectedInvoice.total_amount)}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Items / Details */}
                <div className="mb-8">
                  <h4 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                    {activeTab === 'sales' ? 'Invoice Items' : 'Service Details'}
                  </h4>
                  <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          {activeTab === 'sales' ? (
                            <>
                              <th className="py-3 px-4 text-left font-semibold text-gray-700">Item Name</th>
                              <th className="py-3 px-4 text-left font-semibold text-gray-700">Category</th>
                              <th className="py-3 px-4 text-right font-semibold text-gray-700">Quantity</th>
                              <th className="py-3 px-4 text-right font-semibold text-gray-700">Unit Price</th>
                              <th className="py-3 px-4 text-right font-semibold text-gray-700">Discount</th>
                              <th className="py-3 px-4 text-right font-semibold text-gray-700">Total</th>
                            </>
                          ) : (
                            <>
                              <th className="py-3 px-4 text-left font-semibold text-gray-700">Description</th>
                              <th className="py-3 px-4 text-right font-semibold text-gray-700">Hours</th>
                              <th className="py-3 px-4 text-right font-semibold text-gray-700">Labor Cost</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {items.map((item) => (
                          <tr key={item.id || item.item_id} className="hover:bg-white transition-colors duration-150">
                            {activeTab === 'sales' ? (
                              <>
                                <td className="py-3 px-4 text-gray-700">{item.item_name}</td>
                                <td className="py-3 px-4 text-gray-600">{item.category}</td>
                                <td className="py-3 px-4 text-right text-gray-700">{item.quantity}</td>
                                <td className="py-3 px-4 text-right text-gray-700">{formatCurrency(item.unit_price)}</td>
                                <td className="py-3 px-4 text-right text-gray-700">{item.item_discount || 0}%</td>
                                <td className="py-3 px-4 text-right font-semibold text-green-600">{formatCurrency(item.total_amount)}</td>
                              </>
                            ) : (
                              <>
                                <td className="py-3 px-4 text-gray-700">{item.description}</td>
                                <td className="py-3 px-4 text-right text-gray-700">{item.hours}</td>
                                <td className="py-3 px-4 text-right font-semibold text-green-600">{formatCurrency(item.labor_cost)}</td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Invoice Photo (Sales only) */}
                {activeTab === 'sales' && selectedInvoice.invoice_photo_url && (
                  <div>
                    <h4 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Proof of Invoice</h4>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <img
                        src={selectedInvoice.invoice_photo_url}
                        alt="Invoice Proof"
                        className="w-full max-h-96 object-contain rounded-lg border cursor-pointer hover:shadow-lg transition-shadow duration-200"
                        onClick={() => setExpandedImage(selectedInvoice.invoice_photo_url)}
                      />
                      <p className="text-sm text-gray-500 mt-2 text-center">Click image to view full size</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Expanded fullscreen photo modal */}
        {expandedImage && (
          <div
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-4"
            onClick={() => setExpandedImage(null)}
          >
            <div className="relative max-w-4xl max-h-full">
              <img
                src={expandedImage}
                alt="Expanded Invoice"
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
              <button
                onClick={() => setExpandedImage(null)}
                className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors duration-200 bg-black bg-opacity-50 rounded-full p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default InvoiceLogsPage;