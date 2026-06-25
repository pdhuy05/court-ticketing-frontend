"use client";

import { adminPath } from "@/lib/admin-base";

export const ADMIN_AUTH_EXPIRED_ERROR = "ADMIN_AUTH_EXPIRED";

const AUTH_KEYWORDS = [
  "token",
  "expired",
  "unauthorized",
  "hết hạn",
  "het han",
  "không hợp lệ",
  "khong hop le",
];

export const normalizeApiMessage = (message?: string) =>
  String(message || "").toLowerCase();

export const isAuthExpiredMessage = (message?: string) => {
  const normalized = normalizeApiMessage(message);
  return AUTH_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

export const clearAdminSession = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("adminToken");
  localStorage.removeItem("adminUser");
};

export const redirectToAdminLogin = () => {
  if (typeof window === "undefined") return;
  clearAdminSession();
  window.location.replace(`${adminPath("/admin/login")}?reason=session_expired`);
};