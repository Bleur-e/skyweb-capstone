'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';

const mockNotifications = [
  {
    id: 1,
    message: 'TRK001 maintenance request approved.',
    timestamp: '2 hours ago',
  },
  {
    id: 2,
    message: 'New part added to inventory.',
    timestamp: '1 day ago',
  },
  {
    id: 3,
    message: 'TRK002 needs check-up soon.',
    timestamp: '3 days ago',
  },
];

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={toggleDropdown} className="relative p-2">
        <Bell className="w-6 h-6 text-amber-700" />
        <span className="absolute top-0 right-0 inline-block w-2 h-2 bg-red-500 rounded-full"></span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded shadow-lg z-50">
          <div className="p-4 font-semibold border-b text-blue-700">Notifications</div>
          <ul className="max-h-60 overflow-y-auto">
            {mockNotifications.map((notif) => (
              <li key={notif.id} className="p-4 hover:bg-gray-100 border-b text-sm text-gray-700">
                <p>{notif.message}</p>
                <span className="text-xs text-gray-500">{notif.timestamp}</span>
              </li>
            ))}
          </ul>
          {mockNotifications.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-500">No notifications</div>
          )}
        </div>
      )}
    </div>
  );
}