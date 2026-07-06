"use client";

import { useEffect, useState } from "react";
import AdminTable from "../components/AdminTable";
import type { AdminProfile } from "@/services/auth.service";

const getCachedAdmin = (): AdminProfile | null => {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("adminUser") || "");
  } catch {
    return null;
  }
};

export default function PermissionsPage() {
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const user = getCachedAdmin();
    setAllowed(user?.isSuperAdmin === true);
    setReady(true);
  }, []);

  if (!ready) return null;

  if (!allowed) {
    return (
      <div style={{ padding: 24, color: "#991b1b", background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 12 }}>
        Chỉ Super Admin (Admin Chính) mới có quyền truy cập trang quản lý admin.
      </div>
    );
  }

  return (
    <div>
      <AdminTable />
    </div>
  );
}