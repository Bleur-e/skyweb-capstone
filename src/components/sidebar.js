'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';

export default function Sidebar({ role }) {
  const [showUserRoles, setShowUserRoles] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
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

  // Close mobile sidebar when clicking a link
  const handleLinkClick = () => {
    setIsMobileOpen(false);
  };

  // 🎯 Conditional links for Admin
  const isAdmin = role?.toLowerCase() === 'admin';
  const isUser = role?.toLowerCase() === 'user';

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden bg-gradient-to-r from-blue-900 to-blue-950 text-white p-4 shadow-lg sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="p-2 rounded-lg hover:bg-blue-800 transition-colors"
            >
              {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="relative w-8 h-8">
                <Image
                  src="/logo.png"
                  alt="Skyland Motorpool"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <span className="font-bold text-amber-400">Skyland Motorpool</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={`
          bg-gradient-to-b from-blue-900 to-blue-950 text-white 
          w-64 h-screen p-4 shadow-xl flex flex-col
          fixed lg:static inset-y-0 left-0 z-40
          transform transition-transform duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo Section */}
        <div className="text-center mb-8 pt-4 flex-shrink-0">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="relative w-16 h-16 bg-white rounded-full p-2 shadow-lg">
              <Image
                src="/logo.png"
                alt="Skyland Motorpool Logo"
                fill
                className="object-contain p-1"
                priority
              />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide text-amber-400 drop-shadow">
                Skyland Motorpool
              </h1>
              <p className="text-xs text-gray-300 mt-1">Management System</p>
            </div>
          </div>
        </div>

        {/* Navigation - Scrollable Area */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Custom scrollbar styling */}
          <style jsx>{`
            nav::-webkit-scrollbar {
              width: 4px;
            }
            nav::-webkit-scrollbar-track {
              background: rgba(255, 255, 255, 0.1);
              border-radius: 2px;
            }
            nav::-webkit-scrollbar-thumb {
              background: rgba(255, 255, 255, 0.3);
              border-radius: 2px;
            }
            nav::-webkit-scrollbar-thumb:hover {
              background: rgba(255, 255, 255, 0.5);
            }
          `}</style>
          
          <ul className="space-y-2 pr-2">
            {/* Dashboard */}
            <li>
              <Link 
                href={`/${role}/dashboard`} 
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-amber-600/20 hover:border-l-4 hover:border-amber-400 transition-all duration-200 group"
                onClick={handleLinkClick}
              >
                <LayoutDashboard className="w-5 h-5 text-amber-300 group-hover:text-amber-100" /> 
                <span className="group-hover:translate-x-1 transition-transform">Dashboard</span>
              </Link>
            </li>

            {/* Trucks */}
            <li>
              <Link 
                href={`/${role}/trucks`} 
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-amber-600/20 hover:border-l-4 hover:border-amber-400 transition-all duration-200 group"
                onClick={handleLinkClick}
              >
                <Truck className="w-5 h-5 text-amber-300 group-hover:text-amber-100" /> 
                <span className="group-hover:translate-x-1 transition-transform">Trucks</span>
              </Link>
            </li>

            {/* Maintenance (Hidden for Admin) */}
            {!isAdmin && (
              <li>
                <Link 
                  href={`/${role}/maintenance`} 
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-amber-600/20 hover:border-l-4 hover:border-amber-400 transition-all duration-200 group"
                  onClick={handleLinkClick}
                >
                  <ClipboardList className="w-5 h-5 text-amber-300 group-hover:text-amber-100" /> 
                  <span className="group-hover:translate-x-1 transition-transform">Maintenance</span>
                </Link>
              </li>
            )}

            {/* User Roles Dropdown */}
            <li className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowUserRoles(!showUserRoles)}
                className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-amber-600/20 hover:border-l-4 hover:border-amber-400 transition-all duration-200 group"
              >
                <span className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-amber-300 group-hover:text-amber-100" /> 
                  <span className="group-hover:translate-x-1 transition-transform">User Roles</span>
                </span>
                <ChevronDown 
                  className={`w-4 h-4 transition-transform duration-200 ${
                    showUserRoles ? 'rotate-180' : ''
                  }`} 
                />
              </button>

              {showUserRoles && (
                <ul className="ml-6 mt-2 bg-blue-800/30 rounded-lg overflow-hidden space-y-1 py-1">
                  <li>
                    <Link 
                      href={`/${role}/drivers`} 
                      className="block px-4 py-2 hover:bg-amber-500/30 transition-colors rounded mx-2"
                      onClick={handleLinkClick}
                    >
                      Drivers
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href={`/${role}/mechanics`} 
                      className="block px-4 py-2 hover:bg-amber-500/30 transition-colors rounded mx-2"
                      onClick={handleLinkClick}
                    >
                      Mechanics
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            {/* Inventory */}
            <li>
              <Link 
                href={`/${role}/inventory`} 
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-amber-600/20 hover:border-l-4 hover:border-amber-400 transition-all duration-200 group"
                onClick={handleLinkClick}
              >
                <Package className="w-5 h-5 text-amber-300 group-hover:text-amber-100" /> 
                <span className="group-hover:translate-x-1 transition-transform">Inventory</span>
              </Link>
            </li>

            {/* Invoice (Hidden for Admin) */}
            {!isAdmin && (
              <li>
                <Link 
                  href={`/${role}/invoice`} 
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-amber-600/20 hover:border-l-4 hover:border-amber-400 transition-all duration-200 group"
                  onClick={handleLinkClick}
                >
                  <FileText className="w-5 h-5 text-amber-300 group-hover:text-amber-100" /> 
                  <span className="group-hover:translate-x-1 transition-transform">Invoice</span>
                </Link>
              </li>
            )}

            {/* User Requests */}
            {!isAdmin && (
            <li>
              <Link 
                href={`/${role}/userRequest`} 
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-amber-600/20 hover:border-l-4 hover:border-amber-400 transition-all duration-200 group"
                onClick={handleLinkClick}
              >
                <ClipboardCheck className="w-5 h-5 text-amber-300 group-hover:text-amber-100" /> 
                <span className="group-hover:translate-x-1 transition-transform">Request Page</span>
              </Link>
            </li>
          )}

          {/* Admin Requests Approval */}
            {!isUser && (
            <li>
              <Link 
                href={`/${role}/userRequest`} 
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-amber-600/20 hover:border-l-4 hover:border-amber-400 transition-all duration-200 group"
                onClick={handleLinkClick}
              >
                <ClipboardCheck className="w-5 h-5 text-amber-300 group-hover:text-amber-100" /> 
                <span className="group-hover:translate-x-1 transition-transform">Admin Approval</span>
              </Link>
            </li>
          )}


            {/* Archives (Hidden for user) */}
            {!isUser && (
              <li>
                <Link 
                  href={`/${role}/archives`} 
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-amber-600/20 hover:border-l-4 hover:border-amber-400 transition-all duration-200 group"
                  onClick={handleLinkClick}
                >
                  <Trash2Icon className="w-5 h-5 text-amber-300 group-hover:text-amber-100" /> 
                  <span className="group-hover:translate-x-1 transition-transform">Archives</span>
                </Link>
              </li>
            )}

            {/* Logs Section */}
            <li className="mt-6">
              <p className="text-sm font-semibold mb-3 text-amber-400 uppercase tracking-wider px-3">
                Logs
              </p>
              <ul className="space-y-2">
                <li>
                  <Link 
                    href={`/${role}/userRequestLogs`} 
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-amber-600/20 hover:border-l-4 hover:border-amber-400 transition-all duration-200 group"
                    onClick={handleLinkClick}
                  >
                    <ClipboardCheck className="w-4 h-4 text-amber-300 group-hover:text-amber-100" /> 
                    <span className="text-sm group-hover:translate-x-1 transition-transform">Request</span>
                  </Link>
                </li>
                <li>
                  <Link 
                    href={`/${role}/invoiceLogs`} 
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-amber-600/20 hover:border-l-4 hover:border-amber-400 transition-all duration-200 group"
                    onClick={handleLinkClick}
                  >
                    <FileText className="w-4 h-4 text-amber-300 group-hover:text-amber-100" /> 
                    <span className="text-sm group-hover:translate-x-1 transition-transform">Invoice Logs</span>
                  </Link>
                </li>
                <li>
                  <Link 
                    href={`/${role}/maintenanceLogs`} 
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-amber-600/20 hover:border-l-4 hover:border-amber-400 transition-all duration-200 group"
                    onClick={handleLinkClick}
                  >
                    <ClipboardList className="w-4 h-4 text-amber-300 group-hover:text-amber-100" /> 
                    <span className="text-sm group-hover:translate-x-1 transition-transform">Maintenance</span>
                  </Link>
                </li>
                <li>
                  <Link 
                    href={`/${role}/auditLogs`} 
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-amber-600/20 hover:border-l-4 hover:border-amber-400 transition-all duration-200 group"
                    onClick={handleLinkClick}
                  >
                    <UserCog className="w-4 h-4 text-amber-300 group-hover:text-amber-100" /> 
                    <span className="text-sm group-hover:translate-x-1 transition-transform">Audit</span>
                  </Link>
                </li>
                <li>
                  <Link 
                    href={`/${role}/fileReports`} 
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-amber-600/20 hover:border-l-4 hover:border-amber-400 transition-all duration-200 group"
                    onClick={handleLinkClick}
                  >
                    <FileArchive className="w-4 h-4 text-amber-300 group-hover:text-amber-100" /> 
                    <span className="text-sm group-hover:translate-x-1 transition-transform">File Reports</span>
                  </Link>
                </li>
              </ul>
            </li>
          </ul>
        </nav>

        {/* Footer */}
        <div className="mt-4 text-center text-xs text-gray-400 border-t border-blue-700/50 pt-4 flex-shrink-0">
          © 2025 Skyland Motorpool System
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
}