"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import supabase from "../supabaseClient"; 

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

// LoginForm.js (only the handleSubmit part changes)
const handleSubmit = async (e) => {
  e.preventDefault();

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .eq("password", password) // plaintext for now (dev only)
    .single();

  if (error || !data) {
    alert("Wrong Username or Password!");
    return;
  }

  // Save the logged-in user to localStorage for later use
  // IMPORTANT: store only what you need (id, username, full_name, role)
  const safeUser = {
    id: data.id,
    username: data.username,
    full_name: data.full_name,
    role: data.role,
    account_photo: data.account_photo || null,
  };
  localStorage.setItem("currentUser", JSON.stringify(safeUser));

  // Redirect based on role
  if (data.role === "admin") {
    router.push("/admin/dashboard");
  } else if (data.role === "user") {
    router.push("/user/dashboard");
  } else {
    alert("Unknown role!");
  }
};


  return (
    <div className="bg-white p-8 rounded-lg shadow-lg w-96">
      <h1 className="text-2xl font-bold text-gray-800 text-center mb-2">Login</h1>
      <p className="text-sm text-gray-500 text-center mb-6">Skyweb Motorpool</p>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Username</label>
          <input
            type="text"
            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="w-full bg-orange-500 text-white py-2 px-4 rounded-md hover:bg-blue-500 transition duration-300"
        >
          Login
        </button>
      </form>
    </div>
  );
}