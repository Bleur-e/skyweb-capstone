'use client';

import React, { useState } from 'react';

export default function SettingsPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handlePasswordChange = () => {
    if (password !== confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    alert('Password change request submitted for admin approval.');
    setPassword('');
    setConfirmPassword('');
  };

  const boxClass = `p-6 rounded shadow mb-6 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`;

  return (
    <div className={`min-h-screen px-6 py-8 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <h1 className="text-2xl font-bold mb-6 text-blue-700">Settings</h1>

      {/* Change Password */}
      <div className={boxClass}>
        <h2 className="text-lg font-semibold mb-4 text-orange-700">Change Password</h2>
        <input
          type="password"
          placeholder="New Password"
          className="w-full p-2 mb-2 border rounded text-black"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          type="password"
          placeholder="Confirm New Password"
          className="w-full p-2 mb-4 border rounded text-black"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <button
          onClick={handlePasswordChange}
          className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded"
        >
          Request Change
        </button>
      </div>

      {/* Notifications */}
      <div className={boxClass}>
        <h2 className="text-lg font-semibold mb-4 text-orange-700">Notifications</h2>
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={notificationsEnabled}
            onChange={() => setNotificationsEnabled(!notificationsEnabled)}
            className="accent-blue-700 w-5 h-5"
          />
          <span>Email Notifications</span>
        </label>
      </div>

      {/* Appearance */}
      <div className={boxClass}>
        <h2 className="text-lg font-semibold mb-4 text-orange-700">Appearance</h2>
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={darkMode}
            onChange={() => setDarkMode(!darkMode)}
            className="accent-blue-700 w-5 h-5"
          />
          <span>Enable Dark Mode</span>
        </label>
      </div>

      <div className="text-right">
        <button
          onClick={() => alert('Logging out...')}
          className="text-red-600 hover:text-red-800 underline"
        >
          Logout
        </button>
      </div>
    </div>
  );
}