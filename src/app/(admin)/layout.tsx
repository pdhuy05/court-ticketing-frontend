"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import ConfirmModal from "@/components/ConfirmModal";
import { clearAdminSession } from "@/lib/admin-auth";
import { AdminProfile, getMyProfile } from "@/services/auth.service";
import {
  FiActivity,
  FiGrid,
  FiLogOut,
  FiPrinter,
  FiSettings,
  FiTool,
  FiUsers,
  FiChevronLeft,
  FiChevronRight,
  FiUser,
} from "react-icons/fi";
import { IconType } from "react-icons";

type NavItem = {
  href: string;
  label: string;
  icon: IconType;
};

const navItems: NavItem[] = [
  { href: "/admin", label: "Thống kê", icon: FiActivity },
  { href: "/admin/users", label: "Người dùng", icon: FiUsers },
  { href: "/admin/profile", label: "Hồ sơ", icon: FiUser },
  { href: "/admin/counter", label: "Quản lý phòng", icon: FiGrid },
  { href: "/admin/services", label: "Quản lý quầy", icon: FiTool },
  { href: "/admin/printers", label: "Máy in", icon: FiPrinter },
  { href: "/admin/settings", label: "Cài đặt", icon: FiSettings },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminProfile | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const isLoginPage = pathname === "/login" || pathname === "/admin/login";

  const handleSessionExpired = () => {
    clearAdminSession();
    router.replace("/admin/login?reason=session_expired");
  };

  useEffect(() => {
    if (isLoginPage) {
      return;
    }

    let isMounted = true;

    const hydrateAdminUser = async () => {
      const token = localStorage.getItem("adminToken");
      const user = localStorage.getItem("adminUser");

      if (!token) {
        router.replace("/admin/login");
        return;
      }

      try {
        if (user) {
          const cachedUser = JSON.parse(user) as AdminProfile;
          if (isMounted) {
            setAdminUser(cachedUser);
            setIsLoggedIn(true);
          }
        }

        const profile = await getMyProfile();
        localStorage.setItem("adminUser", JSON.stringify(profile));

        if (isMounted) {
          setAdminUser(profile);
          setIsLoggedIn(true);
        }
      } catch {
        handleSessionExpired();
      }
    };

    void hydrateAdminUser();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoginPage]);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    clearAdminSession();
    router.replace("/admin/login");
  };

  const getActiveIndex = () => {
    return navItems.findIndex((item) => {
      const isExactMatch = pathname === item.href;
      const isNestedMatch =
        item.href !== "/admin" && pathname.startsWith(`${item.href}/`);
      return isExactMatch || isNestedMatch;
    });
  };

  const activeIndex = getActiveIndex();

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          height: "100vh",
          flexDirection: "column",
          background: "#f1f5f9",
        }}
      >
        <div
          style={{
            display: "flex",
            flex: 1,
            overflow: "hidden",
            minHeight: 0,
          }}
        >
          {/* Sidebar */}
          <div
            style={{
              width: isSidebarCollapsed ? "80px" : "280px",
              background: "linear-gradient(180deg, #1e4775 0%, #0f2b48 100%)",
              display: "flex",
              flexDirection: "column",
              transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: "4px 0 20px rgba(0, 0, 0, 0.1)",
              position: "relative",
              zIndex: 10,
            }}
          >
            {/* Logo */}
            <div
  style={{
    padding: isSidebarCollapsed ? "20px 12px" : "24px 20px",
    textAlign: "center",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
    marginBottom: "20px",
    transition: "all 0.3s ease",
  }}
>
  <div
    style={{
      width: isSidebarCollapsed ? "50px" : "80px",
      height: isSidebarCollapsed ? "50px" : "80px",
      margin: "0 auto",
      backgroundImage: "url(/assets/logotoaan.png)",
      backgroundSize: "contain",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      transition: "all 0.3s ease",
    }}
  />
  
  {!isSidebarCollapsed && (
    <>
      <div
        style={{
          marginTop: "14px",
          fontSize: "13px",
          fontWeight: 700,
          color: "white",
          letterSpacing: "1px",
        }}
      >
        TÒA ÁN NHÂN DÂN
      </div>
      <div
        style={{
          fontSize: "10px",
          fontWeight: 500,
          color: "rgba(255, 255, 255, 0.7)",
          letterSpacing: "0.5px",
          marginTop: "2px",
        }}
      >
        KHU VỰC 1 - TP.HCM
      </div>
    </>
  )}
</div>

            {/* Toggle Button */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              style={{
                position: "absolute",
                right: "-12px",
                top: "28px",
                width: "24px",
                height: "24px",
                borderRadius: "12px",
                background: "white",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                zIndex: 20,
                color: "#1e4775",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              {isSidebarCollapsed ? <FiChevronRight size={14} /> : <FiChevronLeft size={14} />}
            </button>

            {/* Navigation */}
            <nav
              style={{
                flex: 1,
                overflowY: "auto",
                padding: isSidebarCollapsed ? "0 12px" : "0 16px",
              }}
            >
              <ul
                style={{
                  listStyle: "none",
                  margin: 0,
                  padding: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                {navItems.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = activeIndex === index;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: isSidebarCollapsed ? "center" : "flex-start",
                          gap: isSidebarCollapsed ? 0 : "14px",
                          padding: isSidebarCollapsed ? "12px" : "12px 16px",
                          borderRadius: "12px",
                          background: isActive ? "rgba(255, 255, 255, 0.15)" : "transparent",
                          color: isActive ? "white" : "rgba(255, 255, 255, 0.7)",
                          textDecoration: "none",
                          transition: "all 0.2s ease",
                          fontWeight: isActive ? 600 : 500,
                          fontSize: "14px",
                          width: "100%",
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                            e.currentTarget.style.color = "white";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "rgba(255, 255, 255, 0.7)";
                          }
                        }}
                      >
                        <Icon size={isSidebarCollapsed ? 22 : 20} style={{ minWidth: "20px" }} />
                        {!isSidebarCollapsed && <span>{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* User Footer */}
            <div
              style={{
                padding: isSidebarCollapsed ? "16px 12px" : "20px 16px",
                borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                marginTop: "auto",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: isSidebarCollapsed ? "center" : "flex-start",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "rgba(255, 255, 255, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "white",
                  }}
                >
                  {adminUser?.fullName?.charAt(0)?.toUpperCase() || <FiUser size={16} />}
                </div>
                {!isSidebarCollapsed && (
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "white",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {adminUser?.fullName || "Admin"}
                    </div>
                    <div
                      style={{
                        fontSize: "10px",
                        color: "rgba(255, 255, 255, 0.6)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {adminUser?.role === "admin" ? "Quản trị viên" : "Nhân viên"}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              minHeight: 0,
              background: "#f1f5f9",
            }}
          >
            {/* Header */}
            <div
              style={{
                background: "white",
                borderBottom: "1px solid #eef2f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 28px",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
              }}
            >
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: "clamp(16px, 1.2vw, 20px)",
                    fontWeight: 700,
                    background: "linear-gradient(135deg, #1e4775 0%, #2d5a8c 100%)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  TÒA ÁN NHÂN DÂN KHU VỰC 1 - THÀNH PHỐ HỒ CHÍ MINH
                </h1>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: "12px",
                    color: "#94a3b8",
                  }}
                >
                  Hệ thống quản lý vé điện tử
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                }}
              >
                {/* User Info Card */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "6px 16px 6px 12px",
                    background: "#f8fafc",
                    borderRadius: "40px",
                    border: "1px solid #eef2f6",
                  }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #1e4775 0%, #2d5a8c 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: 600,
                      fontSize: "14px",
                    }}
                  >
                    {adminUser?.fullName?.charAt(0)?.toUpperCase() || "A"}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#1e293b",
                      }}
                    >
                      {adminUser?.fullName || "Admin"}
                    </span>
                    <span
                      style={{
                        fontSize: "10px",
                        color: "#94a3b8",
                      }}
                    >
                      {adminUser?.role === "admin" ? "Quản trị viên" : "Nhân viên"}
                    </span>
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 20px",
                    background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "40px",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: "0 2px 4px rgba(220, 38, 38, 0.2)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 4px 8px rgba(220, 38, 38, 0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 4px rgba(220, 38, 38, 0.2)";
                  }}
                >
                  <FiLogOut size={16} />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>

            {/* Page Content */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                overflowX: "hidden",
                minHeight: 0,
                padding: "10px",
              }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Xác Nhận Đăng Xuất"
        message="Bạn có chắc chắn muốn đăng xuất khỏi hệ thống này?"
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  );
}
