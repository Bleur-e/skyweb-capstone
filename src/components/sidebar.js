'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Truck,
  Package,
  Users,
  FileText,
  ClipboardList,
  ClipboardCheck,
  Trash2Icon,
  FileChartColumn,
  FileArchive,
  UserCog,
} from 'lucide-react';

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

  // 🎯 Conditional links for Admin
  const isAdmin = role?.toLowerCase() === 'admin';
  const isUser = role?.toLowerCase() === 'user';
  return (
    <aside className="bg-gradient-to-b from-blue-900 to-blue-950 text-white w-64 min-h-screen p-4 shadow-xl flex flex-col">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-wide text-amber-400 drop-shadow">Skyweb</h1>
        <p className="text-sm text-gray-300">Skyland Motorpool</p>
      </div>

      <nav className="flex-1">
        <ul className="space-y-3">
          {/* Dashboard */}
          <li>
            <Link href={`/${role}/dashboard`} className="flex items-center gap-3 p-2 rounded hover:bg-amber-600 transition">
              <LayoutDashboard className="w-5 h-5" /> Dashboard
            </Link>
          </li>

          {/* Trucks */}
          <li>
            <Link href={`/${role}/trucks`} className="flex items-center gap-3 p-2 rounded hover:bg-amber-600 transition">
              <Truck className="w-5 h-5" /> Trucks
            </Link>
          </li>

          {/* Maintenance (Hidden for Admin) */}
          {!isAdmin && (
            <li>
              <Link href={`/${role}/maintenance`} className="flex items-center gap-3 p-2 rounded hover:bg-amber-600 transition">
                <ClipboardList className="w-5 h-5" /> Maintenance
              </Link>
            </li>
          )}

          {/* User Roles */}
          <li className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowUserRoles(!showUserRoles)}
              className="flex items-center justify-between w-full p-2 rounded hover:bg-amber-600 transition"
            >
              <span className="flex items-center gap-3">
                <Users className="w-5 h-5" /> User Roles
              </span>
              <span className={`transform transition-transform ${showUserRoles ? 'rotate-90' : ''}`}>›</span>
            </button>

            {showUserRoles && (
              <ul className="ml-6 mt-1 bg-blue-800/50 rounded-md overflow-hidden">
                <li>
                  <Link href={`/${role}/drivers`} className="block px-4 py-2 hover:bg-amber-500 transition">
                    Drivers
                  </Link>
                </li>
                <li>
                  <Link href={`/${role}/mechanics`} className="block px-4 py-2 hover:bg-amber-500 transition">
                    Mechanics
                  </Link>
                </li>
              </ul>
            )}
          </li>

          {/* Inventory */}
          <li>
            <Link href={`/${role}/inventory`} className="flex items-center gap-3 p-2 rounded hover:bg-amber-600 transition">
              <Package className="w-5 h-5" /> Inventory
            </Link>
          </li>

          {/* Invoice (Hidden for Admin) */}
          {!isAdmin && (
            <li>
              <Link href={`/${role}/invoice`} className="flex items-center gap-3 p-2 rounded hover:bg-amber-600 transition">
                <FileText className="w-5 h-5" /> Invoice
              </Link>
            </li>
          )}

          {/* Requests */}
          <li>
            <Link href={`/${role}/userRequest`} className="flex items-center gap-3 p-2 rounded hover:bg-amber-600 transition">
              <ClipboardCheck className="w-5 h-5" /> Request Page
            </Link>
          </li>

            {/* Archives (Hidden for user) */}
          {!isUser && (
            <li>
              <Link href={`/${role}/archives`} className="flex items-center gap-3 p-2 rounded hover:bg-amber-600 transition">
                <Trash2Icon className="w-5 h-5" /> Archives
              </Link>
            </li>
          )}

          {/* Logs Section */}
          <li>
            <p className="text-lg font-semibold mt-6 mb-2 text-amber-400">Logs</p>
            <ul className="ml-3 space-y-2">
              <li>
                <Link href={`/${role}/userRequestLogs`} className="flex items-center gap-3 p-2 rounded hover:bg-amber-600 transition">
                  <ClipboardCheck className="w-5 h-5" /> Request
                </Link>
              </li>
              <li>
                <Link href={`/${role}/invoiceLogs`} className="flex items-center gap-3 p-2 rounded hover:bg-amber-600 transition">
                  <FileText className="w-5 h-5" /> Invoice Logs
                </Link>
              </li>
              <li>
                <Link href={`/${role}/maintenanceLogs`} className="flex items-center gap-3 p-2 rounded hover:bg-amber-600 transition">
                  <ClipboardList className="w-5 h-5" /> Maintenance
                </Link>
              </li>
              <li>
                <Link href={`/${role}/auditLogs`} className="flex items-center gap-3 p-2 rounded hover:bg-amber-600 transition">
                  <UserCog className="w-5 h-5" /> Audit
                </Link>
              </li>
              <li>
                <Link href={`/${role}/fileReports`} className="flex items-center gap-3 p-2 rounded hover:bg-amber-600 transition">
                  <FileArchive className="w-5 h-5" /> File Reports
                </Link>
              </li>
            </ul>
          </li>
        </ul>
      </nav>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-gray-400">
        © 2025 Skyweb — Motorpool System
      </div>
    </aside>
  );
}
