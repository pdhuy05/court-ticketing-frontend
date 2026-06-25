import type { AdminProfile } from "@/services/auth.service";

export const ALL_ADMIN_PERMISSIONS = [
  "dashboard",
  "users",
  "counter",
  "services",
  "printers",
  "settings",
  "reports",
  "search",
  "audit-logs",
] as const;

export type AdminPermission = (typeof ALL_ADMIN_PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<AdminPermission, string> = {
  dashboard:    "Thống kê",
  users:        "Quản lý nhân viên",
  counter:      "Quản lý phòng",
  services:     "Quản lý quầy",
  printers:     "Quản lý máy in",
  settings:     "Cài đặt hệ thống",
  reports:      "Báo cáo",
  search:       "Tra cứu vé",
  "audit-logs": "Nhật ký hoạt động",
};

export const ROUTE_PERMISSION_MAP: Record<string, AdminPermission> = {
  "/admin":           "dashboard",
  "/admin/users":     "users",
  "/admin/counter":   "counter",
  "/admin/services":  "services",
  "/admin/printers":  "printers",
  "/admin/settings":  "settings",
  "/admin/reports":   "reports",
  "/admin/search":    "search",
  "/admin/audit-logs": "audit-logs",
};

export function hasPermission(
  user: AdminProfile | null | undefined,
  permission: AdminPermission,
): boolean {
  if (!user || user.role !== "admin") return false;
  if (user.isSuperAdmin) return true;
  if (user.adminPermissions == null) return true;
  return user.adminPermissions.includes(permission);
}

export function getEffectivePermissions(user: AdminProfile | null | undefined): AdminPermission[] {
  if (!user || user.role !== "admin") return [];
  if (user.isSuperAdmin || user.adminPermissions == null) {
    return [...ALL_ADMIN_PERMISSIONS];
  }
  return (user.adminPermissions as AdminPermission[]).filter((p) =>
    ALL_ADMIN_PERMISSIONS.includes(p),
  );
}