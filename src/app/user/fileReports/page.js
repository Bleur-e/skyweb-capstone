'use client'
import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation';

const FileReportsPage = () => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedReport, setSelectedReport] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const reportFrameRef = useRef(null)

  // Check authentication on component mount
  useEffect(() => {
    const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
    if (!currentUser) {
      router.push("/");
      return;
    }
    setCurrentUser(currentUser);
  }, [router]);

  const printReport = () => {
    if (reportFrameRef.current?.contentWindow) {
      reportFrameRef.current.contentWindow.focus()
      reportFrameRef.current.contentWindow.print()
    }
  }

  // Function to get current user ID and pass it to reports with date filters
  const getReportUrl = (reportPath) => {
    try {
      const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
      const params = new URLSearchParams();
      
      if (user && user.id) {
        params.append('user_id', user.id);
      }
      
      // Add date filters if provided
      if (startDate) {
        params.append('start_date', startDate);
      }
      
      if (endDate) {
        params.append('end_date', endDate);
      }
      
      return `${reportPath}${params.toString() ? `?${params.toString()}` : ''}`;
    } catch (error) {
      console.error('Error getting user ID:', error);
    }
    return reportPath;
  }

  // Clear date filters
  const clearDateFilters = () => {
    setStartDate('');
    setEndDate('');
  }

  // Set predefined date ranges
  const setDateRange = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }

  // Validate date range
  const validateDateRange = () => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      return start <= end;
    }
    return true;
  }

  const isDateRangeValid = validateDateRange();

  // Redirect to login if user is not authenticated
  if (!currentUser) {
    return (
      <main className="p-8 max-w-6xl mx-auto mt-6 bg-white shadow-xl rounded-2xl flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Redirecting to login...</p>
        </div>
      </main>
    );
  }
        
  return (
    <main className="p-8 max-w-6xl mx-auto mt-6 bg-white shadow-xl rounded-2xl">
      <h2 className="text-3xl font-bold text-indigo-600 text-center mb-8">📄 File Reports</h2>

      <div className="flex flex-col gap-6">
        {/* Select Menu */}
        <div>
          <label htmlFor="reportSelect" className="block text-lg font-medium text-gray-700 mb-2">
            Choose a Report
          </label>
          <select
            id="reportSelect"
            value={selectedReport}
            onChange={(e) => setSelectedReport(e.target.value)}
            className="w-full p-3 rounded-xl border border-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-blue-800"
          >
            <option value="">-- Select Report --</option>
            <option value="/reports/user-request-log.html">User Request Log</option>
            <option value="/reports/transaction-log.html">Transaction Log</option>
            <option value="/reports/maintenance-log.html">Maintenance Log</option>
            <option value="/reports/audit-log.html">Audit Log</option>
          </select>
        </div>

        {/* Enhanced Date Filter Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <span className="bg-blue-500 text-white p-1 rounded-lg">📅</span>
              Filter by Date Range
            </h3>
            <span className="text-sm text-blue-600 bg-blue-100 px-3 py-1 rounded-full font-medium">
              Optional
            </span>
          </div>

          {/* Quick Date Presets */}
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2 font-medium">Quick filters:</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setDateRange(7)}
                className="px-3 py-2 bg-white border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium transition-colors"
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setDateRange(30)}
                className="px-3 py-2 bg-white border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium transition-colors"
              >
                Last 30 Days
              </button>
              <button
                onClick={() => setDateRange(90)}
                className="px-3 py-2 bg-white border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium transition-colors"
              >
                Last 90 Days
              </button>
              <button
                onClick={clearDateFilters}
                className="px-3 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Custom Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
              />
            </div>
            
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={clearDateFilters}
                className="flex-1 bg-gray-500 text-white px-4 py-3 rounded-lg hover:bg-gray-600 transition-all duration-200 font-medium shadow-sm"
              >
                Clear Dates
              </button>
            </div>
          </div>

          {/* Date Validation Error */}
          {!isDateRangeValid && (
            <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-lg">
              <p className="text-sm text-red-700 font-medium">
                ⚠️ End date cannot be before start date
              </p>
            </div>
          )}
          
          {/* Active Filter Display */}
          {(startDate || endDate) && isDateRangeValid && (
            <div className="mt-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-800">Active Date Filter:</p>
                  <p className="text-sm text-blue-700">
                    {startDate && endDate 
                      ? `${new Date(startDate).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })} to ${new Date(endDate).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}`
                      : startDate 
                        ? `From ${new Date(startDate).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}`
                        : `Until ${new Date(endDate).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}`
                    }
                  </p>
                </div>
                <button
                  onClick={clearDateFilters}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  ✕ Clear
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Report Preview Section */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-3">
          </div>

          {/* Embedded Report Preview */}
          <div className="h-[500px] w-full overflow-hidden border-2 border-gray-300 rounded-xl shadow-inner bg-white">
            {selectedReport && isDateRangeValid ? (
              <iframe
                src={getReportUrl(selectedReport)}
                className="w-full h-full rounded-xl"
                ref={reportFrameRef}
                key={`${selectedReport}-${startDate}-${endDate}`}
                title="Report Preview"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                <div className="text-6xl mb-4">📊</div>
                {!isDateRangeValid ? (
                  <>
                    <p className="text-lg italic mb-2 text-red-400">Invalid Date Range</p>
                    <p className="text-sm text-center">Please ensure end date is not before start date</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg italic mb-2">No report selected</p>
                    <p className="text-sm">Choose a report from the dropdown above to preview</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Print Button Section */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-xl border-2 border-green-200">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Ready to Print</h3>
              {selectedReport && isDateRangeValid ? (
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">
                    Report: <span className="font-medium text-green-600">
                      {selectedReport.replace('/reports/', '').replace('.html', '').replace(/-/g, ' ')}
                    </span>
                  </p>
                  {(startDate || endDate) ? (
                    <p className="text-sm text-blue-600 font-medium">
                      ✓ Date filter will be applied to the printed report
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No date filter applied - printing all records
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  {!isDateRangeValid ? 'Fix date range to enable printing' : 'Select a report to enable printing'}
                </p>
              )}
            </div>
            
            <button
              onClick={printReport}
              disabled={!selectedReport || !isDateRangeValid}
              className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-8 py-4 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-semibold text-lg flex items-center gap-2"
            >
              🖨️ Print Report
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

export default FileReportsPage