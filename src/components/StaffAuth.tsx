"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      if (typeof window === "undefined") {
        return;
      }

      const token = sessionStorage.getItem("staffToken");
      if (!token || token.trim() === "") {
        router.push("/staff/login");
        setIsLoading(false);
        return;
      }

      // Token tồn tại và không rỗng → coi là hợp lệ
      // Backend sẽ validate JWT thực sự khi gọi API
      setIsAuthenticated(true);
      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return <div>Đang tải...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

export function StaffLogoutButton() {
  const router = useRouter();
  const staffName =
    typeof window !== "undefined"
      ? sessionStorage.getItem("staffName") || sessionStorage.getItem("staffUser")
          ? (() => {
              try {
                const u = JSON.parse(sessionStorage.getItem("staffUser") || "{}");
                return sessionStorage.getItem("staffName") || u.fullName || u.username || "";
              } catch {
                return sessionStorage.getItem("staffName") || "";
              }
            })()
          : ""
      : "";

  const handleLogout = () => {
    sessionStorage.removeItem("staffToken");
    sessionStorage.removeItem("staffUser");
    sessionStorage.removeItem("staffName");
    router.push("/staff/login");
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 10,
        right: 20,
        display: "flex",
        alignItems: "center",
        gap: 15,
      }}
    >
      <span style={{ fontSize: 14, color: "#666" }}>
        {staffName && `Xin chào: ${staffName}`}
      </span>
      <button
        onClick={handleLogout}
        style={{
          padding: "8px 16px",
          fontSize: 14,
          background: "#dc3545",
          color: "white",
          border: "none",
          borderRadius: 4,
          cursor: "pointer",
        }}
      >
        Đăng xuất
      </button>
    </div>
  );
}