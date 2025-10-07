'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import supabase from '../supabaseClient'; // adjust path

// ✅ Accept currentUser from props (so we know who’s logged in)
export default function NotificationDropdown({ currentUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const dropdownRef = useRef(null);

  const toggleDropdown = () => setIsOpen((prev) => !prev);

  // Fetch notifications (filter by role or user)
  const fetchNotifications = async () => {
    if (!currentUser) return;

    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    // ✅ Show only role-based OR user-specific notifications
    query = query.or(`role.eq.${currentUser.role},user_id.eq.${currentUser.id}`);

    const { data, error } = await query;
    if (!error && data) {
      setNotifications(data);
    } else if (error) {
      console.error('Fetch notifications error:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();

    if (!currentUser) return;

    // ✅ Realtime subscription
    const channel = supabase
      .channel('realtime-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const n = payload.new;
          if (
            n.role === currentUser.role || // matches role
            n.user_id === currentUser.id || // matches user
            (!n.role && !n.user_id) // global
          ) {
            setNotifications((prev) => [n, ...prev].slice(0, 10));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  // For click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="relative focus:outline-none"
        aria-label="Notifications"
      >
        {/* Bell Icon */}
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2"
          viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {/* Optional: Unread badge */}
        {notifications.length > 0 && (
          <span className="absolute top-0 right-0 inline-block w-2 h-2 bg-red-600 rounded-full"></span>
        )}
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-30">
          <div className="p-4 border-b font-semibold text-gray-700">Notifications</div>
          <ul className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="p-4 text-gray-500 text-center">No notifications</li>
            ) : (
              notifications.map((notif, idx) => (
                <li key={idx} className="p-4 border-b last:border-b-0 text-gray-700">
                  {notif.message}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}