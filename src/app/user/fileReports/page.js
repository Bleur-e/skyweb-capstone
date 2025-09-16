'use client'
import { useRef, useState } from 'react'
const FileReportsPage = () => {
  const [selectedReport, setSelectedReport] = useState('')
  const reportFrameRef = useRef(null)

  const printReport = () => {
    if (reportFrameRef.current?.contentWindow) {
      reportFrameRef.current.contentWindow.focus()
      reportFrameRef.current.contentWindow.print()
    }
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
            <option value="logs/user-request-log.html">User Request Log</option>
            <option value="logs/transaction-log.html">Transaction Log</option>
            <option value="logs/maintenance-log.html">Maintenance Log</option>
            <option value="logs/truck-travel-log.html">Truck Travel Log</option>
            <option value="logs/audit-log.html">Audit Log</option>
          </select>
        </div>

        {/* Embedded Report Preview */}
        <div className="h-[500px] w-full overflow-hidden border border-indigo-500 rounded-xl shadow-inner">
            {selectedReport ? (
            <iframe
        src={selectedReport}
        className="w-full h-full rounded-xl"
        ref={reportFrameRef}
            />
            ) : ( <div className="w-full h-full flex items-center justify-center text-gray-400 italic">
             No report selected.
             </div>
                )}
</div>

        {/* Print Button */}
        <div className="flex justify-end">
          <button
            onClick={printReport}
            className="bg-gradient-to-r from-blue-600 to-amber-500 text-white px-6 py-3 rounded-xl shadow hover:scale-105 transition-all duration-300"
          >
            🖨️ Print Selected Report
          </button>
        </div>
      </div>
    </main>
  )
}

export default FileReportsPage;