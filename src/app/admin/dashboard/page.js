
// AdminDashboard.js (client component)
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboard({ children }) {
  const router = useRouter();
  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (!currentUser) {
      router.push("/");
      return;
    }
    if (currentUser.role !== "admin") {
      router.push("/");
      return;
    }
  }, [router]);

  return (
    <div>
      {children}
      <h1 className="text-2xl font-bold text-amber-600">Welcome Admin! 🚛✨</h1>;
    </div>
  );
}
