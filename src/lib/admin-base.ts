"use client";

/**
 * Khu vực admin được truy cập qua một "secret path" (xem src/middleware.ts),
 * KHÔNG còn truy cập được trực tiếp qua "/admin" (route đó luôn trả 404).
 *
 * Vấn đề: code trong app (Link, router.push, router.replace, window.location...)
 * vẫn cần build URL nội bộ trỏ tới các trang admin (vd "Cài đặt", "Đăng xuất"...).
 * Nếu hardcode "/admin/..." thì khi người dùng bấm, browser điều hướng thẳng tới
 * "/admin/..." thật — bị middleware chặn 404 ngay.
 *
 * Giải pháp: middleware, mỗi khi rewrite từ secret path -> /admin, sẽ set kèm
 * cookie "admin_base" = secret path hiện tại. Các hàm dưới đây đọc cookie đó để
 * build URL đúng. Nếu vì lý do gì cookie chưa có (vd lần đầu chưa qua middleware),
 * fallback về "/admin" để không crash — nhưng trong luồng dùng thực tế (luôn vào
 * qua secret path) thì cookie luôn tồn tại trước khi nav xảy ra.
 */

const FALLBACK_BASE = "/admin";
const COOKIE_NAME = "admin_base";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1));
}

/** Trả về base path hiện tại của khu vực admin, ví dụ "/p-7f3k9d2q" hoặc fallback "/admin". */
export function getAdminBase(): string {
  const fromCookie = readCookie(COOKIE_NAME);
  if (fromCookie && fromCookie.startsWith("/")) return fromCookie;
  return FALLBACK_BASE;
}

/**
 * Chuyển một path nội bộ viết dưới dạng "/admin/xxx" hoặc "/admin" thành URL thật
 * cần điều hướng tới, theo base hiện tại. Dùng cho href, router.push, router.replace...
 *
 *   adminPath("/admin")          -> "/p-7f3k9d2q"
 *   adminPath("/admin/settings") -> "/p-7f3k9d2q/settings"
 *   adminPath("/admin/login?reason=session_expired") -> "/p-7f3k9d2q/login?reason=session_expired"
 */
export function adminPath(internalAdminPath: string): string {
  const base = getAdminBase();
  if (internalAdminPath === "/admin") return base;
  if (internalAdminPath.startsWith("/admin/")) {
    return `${base}${internalAdminPath.slice("/admin".length)}`;
  }
  // Không bắt đầu bằng /admin -> trả lại nguyên vẹn (an toàn, không đoán bậy).
  return internalAdminPath;
}