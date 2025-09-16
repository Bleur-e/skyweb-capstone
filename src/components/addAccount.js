import { useState } from "react";

export default function AddAccountForm({ onClose }) {
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [role, setRole] = useState("staff");

  const handleSave = () => {
    // For now just alert – in real setup you'd POST to backend
    alert(`New ${role} account for "${newUsername}" created!`);
    onClose();
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg w-96 mt-4">
      <h2 className="text-xl font-bold text-gray-800 text-center mb-4">Create New Account</h2>
      <input
        type="text"
        placeholder="New Username"
        className="mb-2 w-full px-3 py-2 border rounded"
        value={newUsername}
        onChange={(e) => setNewUsername(e.target.value)}
      />
      <input
        type="password"
        placeholder="New Password"
        className="mb-2 w-full px-3 py-2 border rounded"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />
      <select
        className="mb-4 w-full px-3 py-2 border rounded"
        value={role}
        onChange={(e) => setRole(e.target.value)}
      >
        <option value="staff">Motorpool Staff</option>
        <option value="admin">Admin</option>
      </select>
      <div className="flex justify-between">
        <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
          Save
        </button>
        <button onClick={onClose} className="text-red-500">Cancel</button>
      </div>
    </div>
  );
}