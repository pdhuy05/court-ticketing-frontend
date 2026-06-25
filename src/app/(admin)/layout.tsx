"use client";

import Link from "next/link";
import { ReactNode, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import ConfirmModal from "@/components/ConfirmModal";
import NewTicketGlobalSocket from "@/components/NewTicketGlobalSocket";
import NotificationPermissionButton from "@/components/NotificationPermissionButton";
import { clearAdminSession } from "@/lib/admin-auth";
import { adminPath } from "@/lib/admin-base";
import { getMyProfile } from "@/services/auth.service";
import type { AdminProfile } from "@/services/auth.service";
import { SiteConfigProvider, useSiteConfig } from "@/lib/site-config.context";
import { hasPermission, ROUTE_PERMISSION_MAP, type AdminPermission } from "@/lib/admin-permissions";

import {
  FiActivity, FiFileText, FiLogOut, FiPrinter,
  FiSearch, FiSettings, FiUsers, FiChevronLeft,
  FiChevronRight, FiUser, FiShield, FiClock,
} from "react-icons/fi";
import { TbBuildingBank, TbLayoutGrid } from "react-icons/tb";
import { IconType } from "react-icons";

type NavItem = { href: string; label: string; icon: IconType };

const getCachedAdminUser = (): AdminProfile | null => {
  if (typeof window === "undefined") return null;
  const cached = localStorage.getItem("adminUser");
  if (!cached) return null;
  try {
    return JSON.parse(cached) as AdminProfile;
  } catch {
    return null;
  }
};

const hasAdminToken = () =>
  typeof window !== "undefined" && Boolean(localStorage.getItem("adminToken"));

const navItems: NavItem[] = [
  { href: "/admin",             label: "Thống kê",   icon: FiActivity     },
  { href: "/admin/users",       label: "Nhân viên",  icon: FiUsers        },
  { href: "/admin/counter",     label: "Phòng",      icon: TbBuildingBank },
  { href: "/admin/services",    label: "Quầy",       icon: TbLayoutGrid   },
  { href: "/admin/printers",    label: "Máy in",     icon: FiPrinter      },
  { href: "/admin/settings",    label: "Cài đặt",    icon: FiSettings     },
  { href: "/admin/reports",     label: "Báo cáo",    icon: FiFileText     },
  { href: "/admin/search",      label: "Tra cứu vé", icon: FiSearch       },
  { href: "/admin/permissions", label: "Phân quyền", icon: FiShield       },
  { href: "/admin/audit-logs",  label: "Nhật ký",    icon: FiClock        },
  { href: "/admin/profile",     label: "Hồ sơ",      icon: FiUser         },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <SiteConfigProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </SiteConfigProvider>
  );
}

function AdminLayoutInner({ children }: { children: ReactNode }) {
  const { siteConfig } = useSiteConfig();
  const router    = useRouter();
  const pathname  = usePathname(); // Lưu ý: đây là pathname THẬT trên browser (secret path), không phải "/admin/..."
  const routerRef = useRef(router);

  const [isLoggedIn,         setIsLoggedIn        ] = useState(hasAdminToken);
  const [adminUser,          setAdminUser          ] = useState<AdminProfile | null>(getCachedAdminUser);
  const [showLogoutConfirm,  setShowLogoutConfirm  ] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed ] = useState(false);

  // base = "/p-xxxxx" (secret path hiện tại) hoặc "/admin" nếu không có cookie (fallback an toàn)
  const base = adminPath("/admin");
  const loginHref = adminPath("/admin/login");
  const isLoginPage = pathname === loginHref;

  useEffect(() => {
    if (pathname === loginHref) return;

    let mounted = true;

    const token = localStorage.getItem("adminToken");
    if (!token) {
      routerRef.current.replace(loginHref);
      return;
    }

    getMyProfile()
      .then((profile) => {
        if (!mounted) return;
        localStorage.setItem("adminUser", JSON.stringify(profile));
        setAdminUser(profile);
        setIsLoggedIn(true);
      })
      .catch(() => {
        if (!mounted) return;
        clearAdminSession();
        setIsLoggedIn(false);
        routerRef.current.replace(`${loginHref}?reason=session_expired`);
      });

    return () => { mounted = false; };
  }, [pathname, loginHref]);

  const isActive = (internalHref: string) => {
    const href = adminPath(internalHref);
    return href === base ? pathname === base : pathname === href || pathname.startsWith(`${href}/`);
  };

  const handleLogout        = () => setShowLogoutConfirm(true);
  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    clearAdminSession();
    routerRef.current.replace(loginHref);
  };

  if (isLoginPage) return <>{children}</>;
  if (!isLoggedIn) return null;

  return (
    <>
      <NewTicketGlobalSocket />

      <div className="flex h-screen overflow-hidden bg-gray-50">

        {/* ================= SIDEBAR ================= */}
        <div
          className="relative flex h-full flex-col border-r border-gray-200 bg-white shadow-sm transition-all duration-300"
          style={{ width: isSidebarCollapsed ? "72px" : "280px" }}
        >
          {/* Logo */}
          <div className="border-b border-gray-100 pt-8 pb-6">
            <div className="flex justify-center px-4">
              <div
                className="bg-contain bg-center bg-no-repeat transition-all duration-300"
                style={{
                  backgroundImage: `url(${siteConfig.logoUrl || "/assets/logotoaan.png"})`,
                  width:  isSidebarCollapsed ? "44px" : "56px",
                  height: isSidebarCollapsed ? "44px" : "56px",
                }}
              />
            </div>
            {!isSidebarCollapsed && (
              <div className="mt-5 px-2 text-center">
                <div
                  className="text-lg font-bold tracking-tight"
                  style={{ color: "#0f172a" }}
                >
                  {siteConfig.branchName?.toUpperCase() || "TÒA ÁN NHÂN DÂN"}
                </div>
                {siteConfig.address && (
                  <div className="text-xs text-gray-500 mt-1 line-clamp-1">{siteConfig.address}</div>
                )}
                {siteConfig.workingHours && (
                  <div className="text-xs text-gray-400 mt-0.5">{siteConfig.workingHours}</div>
                )}
              </div>
            )}
          </div>

          {/* Toggle */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute top-28 -right-3 z-50 flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white shadow-md transition-all hover:scale-110 hover:shadow-lg"
          >
            {isSidebarCollapsed ? <FiChevronRight size={18} /> : <FiChevronLeft size={18} />}
          </button>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-6" style={{ paddingLeft: "10px", paddingRight: "10px" }}>
            <ul className="space-y-2">
              {navItems
                .filter((item) => {
                  // Mục "Phân quyền" chỉ dành cho superAdmin hoặc admin toàn quyền
                  if (item.href === "/admin/permissions") {
                    return adminUser?.isSuperAdmin || adminUser?.adminPermissions == null;
                  }
                  // /admin/profile luôn hiển thị
                  if (item.href === "/admin/profile") return true;
                  // Các route khác: kiểm tra permission tương ứng (bao gồm audit-logs)
                  const perm = ROUTE_PERMISSION_MAP[item.href] as AdminPermission | undefined;
                  if (!perm) return true;
                  return hasPermission(adminUser, perm);
                })
                .map((item) => {
                const Icon   = item.icon;
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={adminPath(item.href)}
                      prefetch={true}
                      className={`flex items-center rounded-2xl py-3 text-sm font-medium transition-all ${
                        isSidebarCollapsed
                          ? "justify-center px-0"
                          : "gap-3 px-4"
                      }`}
                      style={active ? {
                        background: siteConfig.primaryColor || "#2563eb",
                        color: "#fff",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
                      } : {}}
                    >
                      <Icon size={22} className="flex-shrink-0" style={!active ? { color: "#4b5563" } : {}} />
                      {!isSidebarCollapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User Info */}
          <div className="mt-auto border-t border-gray-100 p-4">
            <div
              className={`flex items-center rounded-2xl bg-gray-50 py-3 ${
                isSidebarCollapsed ? "justify-center px-0" : "gap-3 px-3"
              }`}
            >
              <div
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl"
                style={{ background: siteConfig.primaryColor || "#2563eb" }}
              >
                <span className="translate-y-[-1px] text-lg font-bold leading-none text-white">
                  {adminUser?.fullName?.charAt(0)?.toUpperCase() ?? "A"}
                </span>
              </div>
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-800">{adminUser?.fullName}</p>
                  <p className="text-xs text-gray-500">
                    {adminUser?.role === "admin" ? "Quản trị viên" : "Nhân viên"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= MAIN ================= */}
        <div className="flex flex-1 flex-col overflow-hidden">

          {/* Header */}
          <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-gray-200/80 bg-white px-6">
            <div className="flex items-center gap-3">
              <div
                className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-md ring-1 ring-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition hover:scale-105"
                style={{ background: siteConfig.primaryColor || "#0f172a" }}
              >
                <span className="relative z-10 text-lg font-black leading-none text-white">
                  {siteConfig.branchName?.charAt(0)?.toUpperCase() || "T"}
                </span>
              </div>
              <h1 className="text-sm font-semibold tracking-tight text-gray-800">
                {siteConfig.branchName?.toUpperCase() || "HỆ THỐNG QUẢN LÝ VÉ ĐIỆN TỬ"}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <NotificationPermissionButton variant="admin" />
              <div className="h-6 w-px bg-gray-200" />
              <div className="flex items-center gap-2.5">
                <div className="hidden text-right leading-tight sm:block">
                  <p className="text-sm font-medium text-gray-700">{adminUser?.fullName ?? "Admin"}</p>
                  <p className="text-[11px] text-gray-400">
                    {adminUser?.role === "admin" ? "Quản trị viên" : "Nhân viên"}
                  </p>
                </div>
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ring-2 ring-gray-100"
                  style={{ background: siteConfig.primaryColor || "#2563eb" }}
                >
                  <span className="translate-y-[-1px] text-lg font-bold leading-none text-white">
                    {adminUser?.fullName?.charAt(0)?.toUpperCase() ?? "A"}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors duration-200 hover:bg-red-50 hover:text-red-500"
                title="Đăng xuất"
              >
                <FiLogOut size={18} />
              </button>
            </div>
          </header>

          <style>{`
            @keyframes adminPageFadeUp {
              from { opacity: 0; transform: translateY(16px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            .admin-page-enter {
              animation: adminPageFadeUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
            }
          `}</style>
          <main key={pathname} className="admin-page-enter flex-1 overflow-auto bg-gray-50 p-8">{children}</main>
        </div>
      </div>

      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Xác nhận đăng xuất"
        message="Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?"
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  );
}