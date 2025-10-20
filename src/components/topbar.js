'use client';

import { useEffect, useState } from 'react';
import NotificationDropdown from 'components/notificationDropdown';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { handleLogout } from 'utils/logout';

export default function Topbar() {
  const [currentUser, setCurrentUser] = useState(null);
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

    const userMenuButton = document.getElementById('user-menu-button');
    const userMenu = document.getElementById('user-menu');

    function toggleMenu() {
      userMenu.classList.toggle('hidden');
    }

    function closeMenu(e) {
      if (!userMenu.contains(e.target) && !userMenuButton.contains(e.target)) {
        userMenu.classList.add('hidden');
      }
    }

    userMenuButton?.addEventListener('click', toggleMenu);
    window.addEventListener('click', closeMenu);

    return () => {
      userMenuButton?.removeEventListener('click', toggleMenu);
      window.removeEventListener('click', closeMenu);
    };
  }, []);

  // Enhanced logout function for Topbar
  const handleTopbarLogout = () => {
    // Clear local state first
    setCurrentUser(null);
    
    // Close any open menus
    const userMenu = document.getElementById('user-menu');
    if (userMenu) {
      userMenu.classList.add('hidden');
    }
    
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

  return (
    <header className="bg-blue-900 shadow px-6 py-3 flex justify-between items-center z-10">
      <div className="flex items-center space-x-4">
        <button id="menu-toggle" className="text-gray-600 focus:outline-none lg:hidden">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2"
            viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-lg font-semibold text-white hidden lg:inline">
          Skyland Motorpool
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center space-x-6">
        {currentUser && <NotificationDropdown currentUser={currentUser} />}

        <div className="relative">
          <button id="user-menu-button" className="flex items-center text-sm focus:outline-none">
            <img
              className="w-8 h-8 rounded-full"
              src={
                currentUser?.account_photo ||
                `https://ui-avatars.com/api/?name=${currentUser?.full_name || "User"}`
              }
              alt="User Avatar"
            />
          </button>

          <div id="user-menu" className="hidden absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20">
            <Link
              href="/ProfilePage"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Profile
            </Link>
            
            {/* Accounts Section - Conditionally rendered */}
            {shouldShowAccountsSection() && (
              <div className="border-t border-gray-100">
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Accounts
                </div>
                <Link
                  href="/account-management"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 pl-6"
                >
                  Account Management
                </Link>
              </div>
            )}

            <div className="border-t border-gray-100">
              <button
                onClick={handleTopbarLogout} /* ← Use the enhanced function */
                className="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-red-100"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}