'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

export default function Sidebar({ role }) {
  const [showUserRoles, setShowUserRoles] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowUserRoles(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <aside className="bg-blue-900 text-white w-64 min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-6">Skyweb</h1>
      <nav>
        <ul className="space-y-4">
          {/* Dashboard Link */}
          <li>
            <Link href={`/${role}/dashboard`} className="block hover:bg-amber-700 p-2 rounded">
              Dashboard
            </Link>
          </li>

          {/* Trucks Link */}
          <li>
            <Link href={`/${role}/trucks`} className="block hover:bg-amber-700 p-2 rounded">
              Trucks
            </Link>
          </li>

          {/* Maintenance Link */}
          <li>
            <Link href={`/${role}/maintenance`} className="block hover:bg-amber-700 p-2 rounded">
              Maintenance
            </Link>
          </li>

          {/* User Roles Dropdown */}
          <li className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowUserRoles(!showUserRoles)}
              className="block hover:bg-amber-700 p-2 rounded w-full text-left"
            >
              User Roles
            </button>
            {showUserRoles && (
              <ul className="absolute left-0 w-full bg-blue-800 text-white rounded shadow-lg z-10">
                <li>
                  <Link href={`/${role}/drivers`} className="block px-4 py-2 hover:bg-amber-600">
                    Drivers
                  </Link>
                </li>
                <li>
                  <Link href={`/${role}/mechanics`} className="block px-4 py-2 hover:bg-amber-600">
                    Mechanics
                  </Link>
                </li>
              </ul>
            )}
          </li>

          {/* Inventory Link */}
          <li>
            <Link href={`/${role}/inventory`} className="block hover:bg-amber-700 p-2 rounded">
              Inventory
            </Link>
          </li>

          {/* Invoice Link */}
          <li>
            <Link href={`/${role}/invoice`} className="block hover:bg-amber-700 p-2 rounded">
              Invoice
            </Link>
          </li>

          {/* User Request Link */}
          <li>
            <Link href={`/${role}/userRequest`} className="block hover:bg-amber-700 p-2 rounded">
              Request Page
            </Link>
          </li>

          {/* Logs Section */}
          <li>
            <p className="text-lg font-semibold mt-4 text-amber-500 p-2 rounded">Logs</p>
            <ul className="ml-4 space-y-2">
              <li>
                <Link href={`/${role}/userRequestLogs`} className="block hover:bg-amber-700 p-2 rounded">
                  Request
                </Link>
              </li>
              <li>
                <Link href={`/${role}/invoiceLogs`} className="block hover:bg-amber-700 p-2 rounded">
                  Invoice Logs
                </Link>
              </li>
              <li>
                <Link href={`/${role}/maintenanceLogs`} className="block hover:bg-amber-700 p-2 rounded">
                  Maintenance
                </Link>
              </li>
              <li>
                <Link href={`/${role}/auditLogs`} className="block hover:bg-amber-700 p-2 rounded">
                  Audit
                </Link>
              </li>
              <li>
                <Link href={`/${role}/fileReports`} className="block hover:bg-amber-700 p-2 rounded">
                  File Reports
                </Link>
              </li>
            </ul>
          </li>
        </ul>
      </nav>
    </aside>
  );
}