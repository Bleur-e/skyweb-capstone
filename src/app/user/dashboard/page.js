
  // UserDashboard.js (client component)
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UserDashboard({ children }) {
  const router = useRouter();
  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (!currentUser) {
      // not logged in
      router.push("/");
      return;
    }
    if (currentUser.role !== "user") {
      // not the correct role
      router.push("/");
      return;
    }
  }, [router]);

  return (
    <div>
      {children /* your dashboard content */}
          <div>
        <h1 className="text-2xl font-bold mb-4 text-blue-800">Dashboard</h1>
        
        <p className = "text-indigo-500 ">This is our dashboard content! 💜</p>
      </div>
    </div>
  );
}
   