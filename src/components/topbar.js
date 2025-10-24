'use client';

import { useEffect, useState } from 'react';
import NotificationDropdown from 'components/notificationDropdown';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { handleLogout } from 'utils/logout';

export default function Topbar() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const storedUser = sessionStorage.getItem('currentUser');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch {
        setCurrentUser(null);
      }
    }
  }, []);

  // Enhanced logout function for Topbar
  const handleTopbarLogout = () => {
    // Clear local state first
    setCurrentUser(null);
    setIsMenuOpen(false);
    
    // Call your existing logout function
    handleLogout(router);
  };

  // Check if user should see accounts section
  const shouldShowAccountsSection = () => {
    if (!currentUser) return false;
    
    // Adjust these conditions based on your user role structure
    const adminRoles = ['admin', 'superadmin', 'manager'];
    if (currentUser.role && adminRoles.includes(currentUser.role)) {
      return true;
    }
    
    if (currentUser.permissions && currentUser.permissions.includes('manage_accounts')) {
      return true;
    }
    
    if (currentUser.user_type === 'admin' || currentUser.isAdmin) {
      return true;
    }
    
    return false;
  };

  // Toggle user menu
  const toggleUserMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const userMenuButton = document.getElementById('user-menu-button');
      const userMenu = document.getElementById('user-menu');
      
      if (userMenuButton && userMenu && 
          !userMenuButton.contains(event.target) && 
          !userMenu.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  return (
    <header className="bg-gradient-to-r from-blue-900 to-indigo-900 shadow-lg px-6 py-4 flex justify-between items-center z-50 border-b border-blue-700">
      {/* Left Side - Brand and Menu Toggle */}
      <div className="flex items-center space-x-4">
        <button 
          id="menu-toggle" 
          className="text-blue-100 hover:text-white focus:outline-none lg:hidden transition-colors duration-200"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2"
            viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        {/* Brand Logo/Name */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-blue-900 font-bold text-sm">SW</span>
          </div>
          <span className="text-xl font-bold text-white hidden lg:inline bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
            Skyweb
          </span>
        </div>
      </div>

      {/* Right side - Notifications and User Menu */}
      <div className="flex items-center space-x-4">
        {/* Notification Dropdown */}
        {currentUser && <NotificationDropdown currentUser={currentUser} />}

        {/* User Menu */}
        <div className="relative">
          <button 
            id="user-menu-button"
            onClick={toggleUserMenu}
            className="flex items-center space-x-3 focus:outline-none group"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-white">
                {currentUser?.full_name || currentUser?.username || 'User'}
              </p>
              <p className="text-xs text-blue-200 capitalize">
                {currentUser?.role || 'User'}
              </p>
            </div>
            
            <div className="relative">
              <img
                className="w-10 h-10 rounded-full border-2 border-blue-300 group-hover:border-white transition-colors duration-200 shadow-md"
                src={
                  currentUser?.profile_image ||
                  currentUser?.account_photo ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    currentUser?.full_name || currentUser?.username || 'User'
                  )}&background=4f46e5&color=ffffff&size=128&bold=true`
                }
                alt="User Avatar"
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    currentUser?.full_name || currentUser?.username || 'User'
                  )}&background=4f46e5&color=ffffff&size=128&bold=true`;
                }}
              />
              {/* Online indicator */}
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
          </button>

          {/* Dropdown Menu */}
          <div 
            id="user-menu"
            className={`absolute right-0 mt-3 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 transition-all duration-200 transform ${
              isMenuOpen 
                ? 'opacity-100 scale-100 translate-y-0' 
                : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
            }`}
          >
            {/* User Info Header */}
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl">
              <div className="flex items-center space-x-3">
                <img
                  className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
                  src={
                    currentUser?.profile_image ||
                    currentUser?.account_photo ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      currentUser?.full_name || currentUser?.username || 'User'
                    )}&background=4f46e5&color=ffffff&size=128&bold=true`
                  }
                  alt="User Avatar"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      currentUser?.full_name || currentUser?.username || 'User'
                    )}&background=4f46e5&color=ffffff&size=128&bold=true`;
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {currentUser?.full_name || currentUser?.username || 'User'}
                  </p>
                  <p className="text-xs text-gray-600 truncate">
                    @{currentUser?.username}
                  </p>
                  <p className="text-xs text-blue-600 font-medium capitalize mt-1">
                    {currentUser?.role || 'User'}
                  </p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-2">
              <Link
                href="/ProfilePage"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center space-x-3 px-3 py-3 text-sm text-gray-700 hover:bg-blue-50 rounded-lg transition-colors duration-200 group"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors duration-200">
                  <span className="text-blue-600">👤</span>
                </div>
                <div>
                  <p className="font-medium">Profile</p>
                  <p className="text-xs text-gray-500">View your profile</p>
                </div>
              </Link>
              
              {/* Accounts Section - Conditionally rendered */}
              {shouldShowAccountsSection() && (
                <div className="border-t border-gray-100 mt-2 pt-2">
                  <div className="px-3 py-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Administration
                    </p>
                    <Link
                      href="/account-management"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center space-x-3 px-3 py-3 text-sm text-gray-700 hover:bg-blue-50 rounded-lg transition-colors duration-200 group"
                    >
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors duration-200">
                        <span className="text-green-600">👥</span>
                      </div>
                      <div>
                        <p className="font-medium">Account Management</p>
                        <p className="text-xs text-gray-500">Manage user accounts</p>
                      </div>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Logout Button */}
            <div className="border-t border-gray-100 p-2 bg-gray-50 rounded-b-xl">
              <button
                onClick={handleTopbarLogout}
                className="flex items-center space-x-3 w-full px-3 py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 group"
              >
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center group-hover:bg-red-200 transition-colors duration-200">
                  <span className="text-red-600">🚪</span>
                </div>
                <div>
                  <p className="font-medium">Logout</p>
                  <p className="text-xs text-red-500">Sign out of your account</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}