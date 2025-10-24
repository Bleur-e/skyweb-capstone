'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCircle, Circle } from 'lucide-react';
import supabase from '../supabaseClient';

export default function NotificationDropdown({ currentUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const dropdownRef = useRef(null);
  const popupTimeoutRef = useRef(null);

  const toggleDropdown = () => setIsOpen((prev) => !prev);

  // ✅ Fetch notifications filtered by role or user
  const fetchNotifications = async () => {
    if (!currentUser) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .or(`role.eq.${currentUser.role},user_id.eq.${currentUser.id}`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Fetch notifications error:', error);
      return;
    }
    setNotifications(data);
  };

  // ✅ Check if notification is read by current user
  const isReadByUser = (notif) => {
    if (!notif.read_by) return false;
    const readByArray = Array.isArray(notif.read_by)
      ? notif.read_by
      : notif.read_by?.array || [];
    return readByArray.includes(currentUser.id);
  };

  // ✅ Mark notification as read for current user only
  const markAsRead = async (notif) => {
    if (isReadByUser(notif)) return; // already read

    const currentReadBy = Array.isArray(notif.read_by)
      ? notif.read_by
      : notif.read_by?.array || [];
    const updatedReadBy = [...currentReadBy, currentUser.id];

    const { error } = await supabase
      .from('notifications')
      .update({ read_by: updatedReadBy })
      .eq('id', notif.id);

    if (error) {
      console.error('Error marking as read:', error);
      return;
    }

    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notif.id ? { ...n, read_by: updatedReadBy } : n
      )
    );
  };

  // ✅ Center popup for new notifications
  const showCenterPopup = (message) => {
    setPopupMessage(message);
    setShowPopup(true);

    if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
    popupTimeoutRef.current = setTimeout(() => setShowPopup(false), 5000);
  };

  const handleNotificationClick = async (notif) => {
    showCenterPopup(notif.message);
    await markAsRead(notif);
  };

  // ✅ Format time
  const formatTime = (timestamp) => {
    const now = new Date();
    const diffMs = now - new Date(timestamp);
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  // ✅ Realtime notifications (filtered by role or user)
  useEffect(() => {
    fetchNotifications();

    if (!currentUser) return;

    const channel = supabase
      .channel('realtime-notifs')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      }, (payload) => {
        const n = payload.new;
        // Only add notification if it matches role or user_id
        if (n.role === currentUser.role || n.user_id === currentUser.id) {
          setNotifications((prev) => {
            const exists = prev.some((p) => p.id === n.id);
            if (exists) return prev; // prevent duplicate
            return [n, ...prev].slice(0, 10);
          });
          showCenterPopup('New notification: ' + n.message);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
    };
  }, [currentUser]);

  // ✅ Count unread notifications
  const getUnreadCount = () =>
    notifications.filter((n) => !isReadByUser(n)).length;

  // ✅ Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={toggleDropdown}
        className="relative p-2 rounded-lg hover:bg-gray-800 transition-colors duration-200"
      >
        <Bell className="w-6 h-6 text-white" />
        {getUnreadCount() > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 bg-red-600 text-white text-xs font-medium rounded-full px-1">
            {getUnreadCount() > 9 ? '9+' : getUnreadCount()}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900 text-lg">Notifications</h3>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No notifications</div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-4 cursor-pointer transition-colors ${
                    isReadByUser(notif)
                      ? 'bg-white hover:bg-gray-50'
                      : 'bg-blue-50 hover:bg-blue-100'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {isReadByUser(notif) ? (
                      <CheckCircle className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Circle className="w-4 h-4 text-blue-600 fill-current" />
                    )}
                    <div>
                      <p className="text-sm text-gray-900">{notif.message}</p>
                      <p className="text-xs text-gray-500">
                        {formatTime(notif.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Center Popup */}
      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999]">
          <div className="bg-gray-900 text-white px-6 py-4 rounded-lg shadow-lg text-center max-w-md w-[90%] animate-fadeIn relative">
            <p className="text-sm font-medium">{popupMessage}</p>
            <button
              onClick={() => setShowPopup(false)}
              className="absolute top-2 right-3 text-gray-400 hover:text-white text-xl font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
