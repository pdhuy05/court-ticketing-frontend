"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  FiShield, FiSearch, FiRefreshCw, FiChevronLeft, FiChevronRight,
  FiCheckCircle, FiXCircle, FiAlertCircle, FiLogIn, FiLogOut,
  FiKey, FiTrash2, FiEdit2, FiToggleRight, FiUpload, FiSettings,
  FiSliders, FiClock, FiChevronDown, FiX, FiInbox,
} from "react-icons/fi";
import { getAuditLogs, type AuditLog, type AuditLogFilter } from "@/services/admin.service";

/* ════════════════════════════════════════════════════════════════════════
   DESIGN TOKENS — nguồn duy nhất cho màu / spacing / chuyển động.
   Đổi ở đây sẽ đổi toàn bộ trang, không cần sửa rải rác.
   ════════════════════════════════════════════════════════════════════════ */
const TOKENS = {
  ink:        "#0f172a",
  inkSoft:    "#475569",
  inkFaint:   "#94a3b8",
  line:       "#eef1f6",
  surface:    "#ffffff",
  canvas:     "#f8fafc",
  brand:      "#1e3c72",
  brandSoft:  "#eef2ff",
  ok:         "#15803d",
  okSoft:     "#f0fdf4",
  danger:     "#b91c1c",
  dangerSoft: "#fef2f2",
  warn:       "#92400e",
  warnSoft:   "#fffbeb",
  ease:       "cubic-bezier(.22,1,.36,1)",
};

/* ════════════════════════════════════════════════════════════════════════
   ACTION REGISTRY — nhãn, icon, sắc thái và cách đọc "detail" cho mỗi
   loại hành động. Đây là phần DUY NHẤT cần sửa khi backend có thêm action
   mới — không phải lục cả file để thêm dòng ở nhiều nơi.
   ════════════════════════════════════════════════════════════════════════ */
type Tone = "success" | "danger" | "info" | "warning" | "neutral";

type DetailLine = { label: string; value: string; emphasis?: boolean };

type ActionDef = {
  label: string;
  group: string;
  icon: React.ReactNode;
  tone: Tone;
  describe: (d: Record<string, unknown> | null, log: AuditLog) => DetailLine[];
};

const TARGET_VI: Record<string, string> = {
  user: "Tài khoản", ticket: "Vé", service: "Quầy",
  counter: "Phòng", setting: "Cài đặt", printer: "Máy in",
};

const PERM_VI: Record<string, string> = {
  dashboard: "Thống kê", users: "Nhân viên", counter: "Phòng", services: "Quầy",
  printers: "Máy in", settings: "Cài đặt", reports: "Báo cáo", search: "Tra cứu",
  "audit-logs": "Nhật ký", shift: "Ca làm",
};

const CHANGE_FIELD_VI: Record<string, string> = {
  name: "Tên", code: "Mã", number: "Số phòng", note: "Ghi chú",
  isActive: "Hoạt động", displayOrder: "Thứ tự", backgroundColor: "Màu nền",
  prefixNumber: "Prefix số", fullName: "Họ tên", email: "Email",
  phone: "SĐT", address: "Địa chỉ", counterId: "Phòng",
};

const shortId = (v: unknown) => "…" + String(v).slice(-8);

const fmtChangeValue = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return "(trống)";
  if (typeof v === "boolean") return v ? "Có" : "Không";
  if (Array.isArray(v)) return v.length === 0 ? "(trống)" : v.map((x) => shortId(x)).join(", ");
  return String(v);
};

const fmtChanges = (raw: unknown): string => {
  if (!raw || typeof raw !== "object") return "";
  const entries = Object.entries(raw as Record<string, unknown>).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return "";
  return entries.map(([k, v]) => `${CHANGE_FIELD_VI[k] ?? k}: ${fmtChangeValue(v)}`).join(" · ");
};

const fmtPerms = (raw: unknown): string => {
  if (!raw) return "";
  const list = String(raw).split(",").map((p) => PERM_VI[p.trim()] ?? p.trim()).filter(Boolean);
  return list.length === 0 ? "Không có quyền" : list.join(", ");
};

/** Mỗi action chỉ cần khai báo 1 lần ở đây — nhãn, icon, nhóm lọc, và
 *  hàm describe() đọc field nào từ `detail` để hiển thị khi mở rộng dòng. */
const ACTIONS: Record<string, ActionDef> = {
  LOGIN_SUCCESS: {
    label: "Đăng nhập", group: "auth", icon: <FiLogIn />, tone: "success",
    describe: (d) => {
      const lines: DetailLine[] = [];
      if (d?.role) lines.push({ label: "Vai trò", value: String(d.role) === "admin" ? "Admin" : String(d.role) === "staff" ? "Nhân viên" : String(d.role) });
      return lines;
    },
  },
  LOGIN_FAILED: {
    label: "Đăng nhập thất bại", group: "auth", icon: <FiAlertCircle />, tone: "danger",
    describe: (d) => (d?.reason ? [{ label: "Lý do", value: String(d.reason) }] : []),
  },
  LOGOUT: {
    label: "Đăng xuất", group: "auth", icon: <FiLogOut />, tone: "neutral",
    describe: () => [],
  },
  PASSWORD_CHANGED: {
    label: "Đổi mật khẩu", group: "auth", icon: <FiKey />, tone: "info",
    describe: () => [],
  },
  TICKET_RESET_DAY: {
    label: "Reset vé ngày", group: "ticket", icon: <FiRefreshCw />, tone: "warning",
    describe: (d) => resetLines(d),
  },
  TICKET_RESET_ALL: {
    label: "Reset toàn bộ vé", group: "ticket", icon: <FiRefreshCw />, tone: "danger",
    describe: (d) => resetLines(d),
  },
  TICKET_AUTO_RESET: {
    label: "Auto reset vé", group: "ticket", icon: <FiRefreshCw />, tone: "neutral",
    describe: (d) => resetLines(d),
  },
  SERVICE_CREATE: {
    label: "Tạo quầy", group: "service", icon: <FiEdit2 />, tone: "info",
    describe: (d) => nameCodeLines(d),
  },
  SERVICE_UPDATE: {
    label: "Sửa quầy", group: "service", icon: <FiEdit2 />, tone: "info",
    describe: (d) => updateLines(d),
  },
  SERVICE_DELETE: {
    label: "Xóa quầy", group: "service", icon: <FiTrash2 />, tone: "danger",
    describe: (d) => nameCodeLines(d),
  },
  SERVICE_TOGGLE: {
    label: "In 2 vé", group: "service", icon: <FiToggleRight />, tone: "info",
    describe: (d) => {
      const lines: DetailLine[] = [];
      if (d?.name) lines.push({ label: "Tên", value: String(d.name), emphasis: true });
      if (d?.doublePrint !== undefined) lines.push({ label: "In 2 vé", value: d.doublePrint ? "Bật" : "Tắt" });
      return lines;
    },
  },
  SERVICE_COUNTER_ADD: {
    label: "Thêm phòng vào quầy", group: "service", icon: <FiEdit2 />, tone: "info",
    describe: (d) => addRemoveLines(d, "counterIds", "addedCounters"),
  },
  SERVICE_COUNTER_REMOVE: {
    label: "Gỡ phòng khỏi quầy", group: "service", icon: <FiTrash2 />, tone: "warning",
    describe: (d) => removeOneLines(d, "counterId"),
  },
  COUNTER_CREATE: {
    label: "Tạo phòng", group: "counter", icon: <FiEdit2 />, tone: "info",
    describe: (d) => nameCodeLines(d),
  },
  COUNTER_UPDATE: {
    label: "Sửa phòng", group: "counter", icon: <FiEdit2 />, tone: "info",
    describe: (d) => updateLines(d),
  },
  COUNTER_DELETE: {
    label: "Xóa phòng", group: "counter", icon: <FiTrash2 />, tone: "danger",
    describe: (d) => nameCodeLines(d),
  },
  COUNTER_TOGGLE: {
    label: "Bật/tắt phòng", group: "counter", icon: <FiToggleRight />, tone: "info",
    describe: (d) => activeStateLines(d),
  },
  COUNTER_TTS_TOGGLE: {
    label: "Loa TTS", group: "counter", icon: <FiToggleRight />, tone: "info",
    describe: (d) => {
      const lines: DetailLine[] = [];
      if (d?.name) lines.push({ label: "Tên", value: String(d.name), emphasis: true });
      if (d?.ttsEnabled !== undefined) lines.push({ label: "Loa TTS", value: d.ttsEnabled ? "Bật" : "Tắt" });
      return lines;
    },
  },
  COUNTER_SERVICE_ADD: {
    label: "Thêm quầy vào phòng", group: "counter", icon: <FiEdit2 />, tone: "info",
    describe: (d) => addRemoveLines(d, "serviceIds", "addedCount"),
  },
  COUNTER_SERVICE_REMOVE: {
    label: "Gỡ quầy khỏi phòng", group: "counter", icon: <FiTrash2 />, tone: "warning",
    describe: (d) => removeOneLines(d, "serviceId"),
  },
  USER_CREATE: {
    label: "Tạo người dùng", group: "user", icon: <FiEdit2 />, tone: "info",
    describe: (d) => userTargetLines(d),
  },
  USER_UPDATE: {
    label: "Sửa người dùng", group: "user", icon: <FiEdit2 />, tone: "info",
    describe: (d) => {
      const lines = userTargetLines(d);
      if (d?.passwordChanged) lines.push({ label: "Mật khẩu", value: "Đã đổi" });
      const ch = fmtChanges(d?.changes);
      if (ch) lines.push({ label: "Thay đổi", value: ch });
      return lines;
    },
  },
  USER_DELETE: {
    label: "Xóa người dùng", group: "user", icon: <FiTrash2 />, tone: "danger",
    describe: (d) => userTargetLines(d),
  },
  USER_TOGGLE: {
    label: "Bật/tắt tài khoản", group: "user", icon: <FiToggleRight />, tone: "info",
    describe: (d) => userTargetLines(d),
  },
  USER_PERMISSION_UPDATE: {
    label: "Cập nhật quyền", group: "user", icon: <FiSliders />, tone: "info",
    describe: (d) => {
      const lines = userTargetLines(d);
      const perms = d?.permissions;
      if (perms === null || perms === "null") {
        lines.push({ label: "Quyền", value: "Toàn quyền (mặc định)" });
      } else if (perms !== undefined) {
        lines.push({ label: "Quyền được cấp", value: fmtPerms(perms) || "Không có quyền" });
      }
      if (d?.isSuperAdmin === true || d?.isSuperAdmin === "true") {
        lines.push({ label: "Super Admin", value: "Bật" });
      }
      return lines;
    },
  },
  STAFF_COUNTER_ASSIGN: {
    label: "Gán phòng", group: "shift", icon: <FiEdit2 />, tone: "info",
    describe: (d) => {
      const lines = userTargetLines(d);
      if (d?.counterId) lines.push({ label: "Phòng", value: shortId(d.counterId) });
      return lines;
    },
  },
  STAFF_COUNTER_REMOVE: {
    label: "Gỡ phòng", group: "shift", icon: <FiTrash2 />, tone: "warning",
    describe: (d) => userTargetLines(d),
  },
  STAFF_SERVICES_ASSIGN: {
    label: "Gán quầy nhân viên", group: "shift", icon: <FiSliders />, tone: "info",
    describe: (d) => {
      const lines = userTargetLines(d);
      const ids = d?.serviceIds;
      if (Array.isArray(ids)) lines.push({ label: "Số quầy được gán", value: String(ids.length) });
      return lines;
    },
  },
  STAFF_SHIFT_START: {
    label: "Bắt đầu ca", group: "shift", icon: <FiClock />, tone: "success",
    describe: (d) => shiftLines(d),
  },
  STAFF_SHIFT_END: {
    label: "Kết thúc ca", group: "shift", icon: <FiClock />, tone: "neutral",
    describe: (d) => shiftLines(d),
  },
  SETTING_TTS_UPDATE: {
    label: "Cài đặt TTS", group: "setting", icon: <FiSettings />, tone: "info",
    describe: (d) => fieldValueLines(d),
  },
  SETTING_AUTO_RESET_UPDATE: {
    label: "Cài đặt auto reset", group: "setting", icon: <FiSettings />, tone: "info",
    describe: (d) => fieldValueLines(d),
  },
  SETTING_SITE_CONFIG_UPDATE: {
    label: "Cài đặt giao diện", group: "setting", icon: <FiSettings />, tone: "info",
    describe: (d) => fieldValueLines(d),
  },
  SETTING_DISPLAY_MODE_UPDATE: {
    label: "Cài đặt màn hình", group: "setting", icon: <FiSettings />, tone: "info",
    describe: (d) => fieldValueLines(d),
  },
  SETTING_LOGO_UPLOAD: {
    label: "Upload logo", group: "setting", icon: <FiUpload />, tone: "info",
    describe: (d) => (d?.logoUrl ? [{ label: "Tệp", value: String(d.logoUrl) }] : []),
  },
};

/* ── Các describe() dùng lại nhiều action — tách ra để không lặp code ── */
function userTargetLines(d: Record<string, unknown> | null): DetailLine[] {
  const lines: DetailLine[] = [];
  const name = d?.username ?? d?.fullName;
  if (name) lines.push({ label: "Tài khoản", value: String(name), emphasis: true });
  if (d?.isActive !== undefined) lines.push({ label: "Trạng thái", value: d.isActive ? "Hoạt động" : "Đã khóa" });
  return lines;
}
function nameCodeLines(d: Record<string, unknown> | null): DetailLine[] {
  const lines: DetailLine[] = [];
  if (d?.name) lines.push({ label: "Tên", value: String(d.name), emphasis: true });
  if (d?.code) lines.push({ label: "Mã", value: String(d.code) });
  return lines;
}
function updateLines(d: Record<string, unknown> | null): DetailLine[] {
  const lines: DetailLine[] = [];
  if (d?.name) lines.push({ label: "Tên", value: String(d.name), emphasis: true });
  const ch = fmtChanges(d?.changes);
  if (ch) lines.push({ label: "Thay đổi", value: ch });
  return lines;
}
function activeStateLines(d: Record<string, unknown> | null): DetailLine[] {
  const lines: DetailLine[] = [];
  if (d?.name) lines.push({ label: "Tên", value: String(d.name), emphasis: true });
  if (d?.isActive !== undefined) lines.push({ label: "Trạng thái", value: d.isActive ? "Hoạt động" : "Tắt" });
  return lines;
}
function resetLines(d: Record<string, unknown> | null): DetailLine[] {
  const lines: DetailLine[] = [];
  if (d?.date) lines.push({ label: "Ngày", value: String(d.date), emphasis: true });
  if (d?.resetCount !== undefined) lines.push({ label: "Số phòng reset", value: String(d.resetCount) });
  if (d?.counterCount !== undefined) lines.push({ label: "Số phòng", value: String(d.counterCount) });
  if (d?.reason) lines.push({ label: "Lý do lỗi", value: String(d.reason) });
  return lines;
}
function shiftLines(d: Record<string, unknown> | null): DetailLine[] {
  const lines = userTargetLines(d);
  if (d?.reason) lines.push({ label: "Lý do", value: String(d.reason) });
  if (d?.waitingTicketsCount !== undefined) lines.push({ label: "Vé đang chờ", value: String(d.waitingTicketsCount) });
  return lines;
}
function fieldValueLines(d: Record<string, unknown> | null): DetailLine[] {
  const lines: DetailLine[] = [];
  if (d?.field) lines.push({ label: "Trường", value: String(d.field) });
  if (d?.value !== undefined) lines.push({ label: "Giá trị", value: String(d.value) });
  return lines;
}
function addRemoveLines(d: Record<string, unknown> | null, idsKey: string, countKey: string): DetailLine[] {
  const lines: DetailLine[] = [];
  if (d?.name) lines.push({ label: "Tên", value: String(d.name), emphasis: true });
  const ids = d?.[idsKey];
  if (Array.isArray(ids)) lines.push({ label: "Số lượng thêm", value: String((d?.[countKey] as number) ?? ids.length) });
  return lines;
}
function removeOneLines(d: Record<string, unknown> | null, idKey: string): DetailLine[] {
  const lines: DetailLine[] = [];
  if (d?.name) lines.push({ label: "Tên", value: String(d.name), emphasis: true });
  if (d?.[idKey]) lines.push({ label: "ID gỡ", value: shortId(d[idKey]) });
  return lines;
}

const DEFAULT_ACTION: ActionDef = {
  label: "Khác", group: "other", icon: <FiSettings />, tone: "neutral",
  describe: (d) => {
    if (!d) return [];
    return Object.entries(d)
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .slice(0, 3)
      .map(([k, v]) => ({ label: k, value: String(v) }));
  },
};

const getAction = (action: string): ActionDef & { key: string } => ({
  key: action,
  ...(ACTIONS[action] ?? { ...DEFAULT_ACTION, label: action }),
});

const TONE_STYLE: Record<Tone, { fg: string; bg: string }> = {
  success: { fg: TOKENS.ok, bg: TOKENS.okSoft },
  danger:  { fg: TOKENS.danger, bg: TOKENS.dangerSoft },
  info:    { fg: "#1d4ed8", bg: "#eff6ff" },
  warning: { fg: TOKENS.warn, bg: TOKENS.warnSoft },
  neutral: { fg: TOKENS.inkSoft, bg: TOKENS.canvas },
};

const GROUP_FILTERS: { key: string; label: string }[] = [
  { key: "auth",    label: "Đăng nhập" },
  { key: "user",    label: "Người dùng" },
  { key: "shift",   label: "Ca làm" },
  { key: "service", label: "Quầy" },
  { key: "counter", label: "Phòng" },
  { key: "ticket",  label: "Vé" },
  { key: "setting", label: "Cài đặt" },
];

/* ════════════════════════════════════════════════════════════════════════
   HELPERS thời gian
   ════════════════════════════════════════════════════════════════════════ */
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const today = () => isoDate(new Date());
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return isoDate(d); };

const dayLabel = (iso: string): string => {
  const d = new Date(iso + "T00:00:00");
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const diffDays = Math.round((t.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return "Hôm nay";
  if (diffDays === 1) return "Hôm qua";
  return d.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
};

const timeOnly = (iso: string) =>
  new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

const initials = (name: string) => {
  const cleaned = name.replace(/[._-]+/g, " ").trim();
  const parts = cleaned.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

/* ════════════════════════════════════════════════════════════════════════
   COMPONENT: ActionBadge — viên thuốc icon + nhãn, tái dùng khắp nơi
   ════════════════════════════════════════════════════════════════════════ */
function ActionBadge({ def }: { def: ActionDef }) {
  const s = TONE_STYLE[def.tone];
  return (
    <span className="nk-badge" style={{ color: s.fg, background: s.bg }}>
      <span className="nk-badge-icon">{def.icon}</span>
      {def.label}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   COMPONENT: ActorAvatar — chữ cái đầu theo vai trò, tái dùng được
   ════════════════════════════════════════════════════════════════════════ */
function ActorAvatar({ username, role }: { username: string; role: string }) {
  const roleClass = role === "admin" ? "is-admin" : role === "staff" ? "is-staff" : "is-system";
  return <div className={`nk-avatar ${roleClass}`}>{initials(username)}</div>;
}

/* ════════════════════════════════════════════════════════════════════════
   COMPONENT: StatusDot
   ════════════════════════════════════════════════════════════════════════ */
function StatusDot({ ok }: { ok: boolean }) {
  return ok
    ? <FiCheckCircle className="nk-status is-ok" size={16} />
    : <FiXCircle className="nk-status is-bad" size={16} />;
}

/* ════════════════════════════════════════════════════════════════════════
   COMPONENT: DetailGrid — lưới chi tiết khi mở rộng 1 dòng nhật ký
   ════════════════════════════════════════════════════════════════════════ */
function DetailGrid({ lines }: { lines: DetailLine[] }) {
  if (lines.length === 0) {
    return <div className="nk-detail-empty">Không có dữ liệu chi tiết cho hành động này.</div>;
  }
  return (
    <div className="nk-detail-grid">
      {lines.map((l, i) => (
        <div className="nk-detail-item" key={i} style={{ animationDelay: `${i * 35}ms` }}>
          <span className="nk-detail-label">{l.label}</span>
          <span className={`nk-detail-value ${l.emphasis ? "is-emphasis" : ""}`}>{l.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   COMPONENT: LogRow — một dòng nhật ký, mở rộng mượt bằng grid-rows
   ════════════════════════════════════════════════════════════════════════ */
function LogRow({ log, index }: { log: AuditLog; index: number }) {
  const [open, setOpen] = useState(false);
  const def = useMemo(() => getAction(log.action), [log.action]);
  const lines = useMemo(() => def.describe(log.detail as Record<string, unknown> | null, log), [def, log]);
  const hasDetail = lines.length > 0;
  const ok = log.status === "success";

  return (
    <li className="nk-row" style={{ animationDelay: `${Math.min(index, 14) * 28}ms` }}>
      <button
        type="button"
        className={`nk-row-head ${open ? "is-open" : ""} ${!hasDetail ? "is-static" : ""}`}
        onClick={() => hasDetail && setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="nk-row-time">{timeOnly(log.createdAt)}</span>

        <ActorAvatar username={log.actorUsername} role={log.actorRole} />

        <span className="nk-row-actor">
          <span className="nk-row-actor-name">{log.actorUsername}</span>
          <span className="nk-row-actor-role">
            {log.actorRole === "admin" ? "Admin" : log.actorRole === "staff" ? "Nhân viên" : "Hệ thống"}
          </span>
        </span>

        <span className="nk-row-action"><ActionBadge def={def} /></span>

        <span className="nk-row-ip">{log.ipAddress ?? "—"}</span>

        <StatusDot ok={ok} />

        <FiChevronDown className={`nk-row-chevron ${open ? "is-open" : ""} ${!hasDetail ? "is-hidden" : ""}`} size={15} />
      </button>

      <div className="nk-row-detail" style={{ gridTemplateRows: open ? "1fr" : "0fr" }}>
        <div className="nk-row-detail-inner">
          <DetailGrid lines={lines} />
        </div>
      </div>
    </li>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   COMPONENT: DayGroup — gom các log trong cùng ngày dưới 1 nhãn mốc thời gian
   ════════════════════════════════════════════════════════════════════════ */
function DayGroup({ dateKey, items, baseIndex }: { dateKey: string; items: AuditLog[]; baseIndex: number }) {
  return (
    <div className="nk-day-group">
      <div className="nk-day-label">
        <span className="nk-day-dot" />
        {dayLabel(dateKey)}
        <span className="nk-day-count">{items.length} hoạt động</span>
      </div>
      <ul className="nk-rows">
        {items.map((log, i) => <LogRow key={log._id} log={log} index={baseIndex + i} />)}
      </ul>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   COMPONENT: SkeletonRow — trạng thái loading có nhịp thở, không phải spinner
   ════════════════════════════════════════════════════════════════════════ */
function SkeletonRow({ delay }: { delay: number }) {
  return (
    <div className="nk-skeleton-row" style={{ animationDelay: `${delay}ms` }}>
      <div className="nk-sk nk-sk-time" />
      <div className="nk-sk nk-sk-avatar" />
      <div className="nk-sk nk-sk-actor" />
      <div className="nk-sk nk-sk-badge" />
      <div className="nk-sk nk-sk-ip" />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   COMPONENT: EmptyState
   ════════════════════════════════════════════════════════════════════════ */
function EmptyState() {
  return (
    <div className="nk-empty">
      <FiInbox size={28} />
      <p>Không có hoạt động nào khớp với bộ lọc hiện tại.</p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   COMPONENT: Pagination
   ════════════════════════════════════════════════════════════════════════ */
function Pagination({
  page, totalPages, total, limit, onPage,
}: { page: number; totalPages: number; total: number; limit: number; onPage: (p: number) => void }) {
  const pages = useMemo<(number | "…")[]>(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const list: (number | "…")[] = [1];
    if (page > 3) list.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) list.push(i);
    if (page < totalPages - 2) list.push("…");
    list.push(totalPages);
    return list;
  }, [page, totalPages]);

  return (
    <div className="nk-pager">
      <span className="nk-pager-info">
        {(page - 1) * limit + 1}–{Math.min(page * limit, total)} / {total} bản ghi
      </span>
      <div className="nk-pager-btns">
        <button className="nk-pgbtn" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Trang trước">
          <FiChevronLeft size={14} />
        </button>
        {pages.map((p, i) =>
          p === "…"
            ? <span key={`e${i}`} className="nk-pgdot">⋯</span>
            : (
              <button key={p} className={`nk-pgbtn ${p === page ? "is-active" : ""}`} onClick={() => onPage(p)}>
                {p}
              </button>
            )
        )}
        <button className="nk-pgbtn" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Trang sau">
          <FiChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   PAGE
   ════════════════════════════════════════════════════════════════════════ */
type DateRangeKey = "today" | "7d" | "30d";

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeRange, setActiveRange] = useState<DateRangeKey>("7d");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [onlyFailed, setOnlyFailed] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [filter, setFilter] = useState<AuditLogFilter>({
    dateFrom: daysAgo(6), dateTo: today(), page: 1, limit: 20,
  });

  const fetchLogs = useCallback(async (f: AuditLogFilter) => {
    setLoading(true); setError(null);
    try {
      const res = await getAuditLogs(f);
      setLogs(res.logs); setTotal(res.total);
      setTotalPages(res.totalPages); setPage(res.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được nhật ký");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchLogs(filter); }, []); // eslint-disable-line

  const applyFilter = (patch: Partial<AuditLogFilter>) => {
    const next = { ...filter, ...patch, page: 1 };
    setFilter(next); void fetchLogs(next);
  };

  const handleRange = (key: DateRangeKey) => {
    setActiveRange(key);
    if (key === "today") applyFilter({ dateFrom: today(), dateTo: today() });
    else if (key === "7d") applyFilter({ dateFrom: daysAgo(6), dateTo: today() });
    else applyFilter({ dateFrom: daysAgo(29), dateTo: today() });
  };

  // Lọc theo nhóm action thực hiện ở client vì danh sách action khá lớn —
  // tránh phải thêm field "group" vào backend chỉ để phục vụ UI.
  const groupActionKeys = useMemo(
    () => (activeGroup ? Object.entries(ACTIONS).filter(([, v]) => v.group === activeGroup).map(([k]) => k) : []),
    [activeGroup],
  );

  const handleGroupChip = (key: string) => {
    setActiveGroup((cur) => (cur === key ? null : key));
  };

  const toggleFailedChip = () => {
    const next = !onlyFailed;
    setOnlyFailed(next);
    applyFilter({ status: next ? "failed" : "" });
  };

  const handleSearch = (val: string) => {
    setSearchVal(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => applyFilter({ actorUsername: val }), 400);
  };

  const goPage = (p: number) => {
    const next = { ...filter, page: p }; setFilter(next); void fetchLogs(next);
  };

  // Lọc nhóm action ở client + nhóm theo ngày để hiển thị timeline.
  const grouped = useMemo(() => {
    const visible = activeGroup ? logs.filter((l) => groupActionKeys.includes(l.action)) : logs;
    const map = new Map<string, AuditLog[]>();
    for (const log of visible) {
      const key = log.createdAt.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(log);
    }
    return Array.from(map.entries());
  }, [logs, activeGroup, groupActionKeys]);

  let runningIndex = 0;

  return (
    <div className="nk-page">
      <style>{STYLES}</style>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="nk-header">
        <div className="nk-header-title">
          <div className="nk-header-icon"><FiShield size={17} /></div>
          <div>
            <h1>Nhật ký hoạt động</h1>
            <p>Theo dõi mọi thao tác nhạy cảm trong hệ thống</p>
          </div>
        </div>

        <div className="nk-header-actions">
          <label className="nk-search">
            <FiSearch size={14} />
            <input
              placeholder="Tìm theo tài khoản…"
              value={searchVal}
              onChange={(e) => handleSearch(e.target.value)}
            />
            {searchVal && (
              <button className="nk-search-clear" onClick={() => handleSearch("")} aria-label="Xóa tìm kiếm">
                <FiX size={13} />
              </button>
            )}
          </label>
          <button className="nk-refresh" onClick={() => void fetchLogs(filter)} disabled={loading}>
            <FiRefreshCw size={14} className={loading ? "nk-spin" : ""} />
            Làm mới
          </button>
        </div>
      </header>

      {/* ── Filter bar ───────────────────────────────────────────────── */}
      <div className="nk-filterbar">
        <div className="nk-chip-row">
          {([
            { key: "today", label: "Hôm nay" },
            { key: "7d", label: "7 ngày" },
            { key: "30d", label: "30 ngày" },
          ] as { key: DateRangeKey; label: string }[]).map((f) => (
            <button
              key={f.key}
              className={`nk-chip is-date ${activeRange === f.key ? "is-active" : ""}`}
              onClick={() => handleRange(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="nk-divider" />

        <div className="nk-chip-row nk-chip-row-scroll">
          {GROUP_FILTERS.map((g) => (
            <button
              key={g.key}
              className={`nk-chip ${activeGroup === g.key ? "is-active" : ""}`}
              onClick={() => handleGroupChip(g.key)}
            >
              {g.label}
            </button>
          ))}
          <button className={`nk-chip is-warn ${onlyFailed ? "is-active" : ""}`} onClick={toggleFailedChip}>
            Thất bại
          </button>
        </div>
      </div>

      {/* ── Timeline ─────────────────────────────────────────────────── */}
      <div className="nk-timeline-wrap">
        {error ? (
          <div className="nk-error">{error}</div>
        ) : loading ? (
          <div className="nk-skeleton-list">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} delay={i * 50} />)}
          </div>
        ) : grouped.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="nk-timeline">
            {grouped.map(([dateKey, items]) => {
              const base = runningIndex;
              runningIndex += items.length;
              return <DayGroup key={dateKey} dateKey={dateKey} items={items} baseIndex={base} />;
            })}
          </div>
        )}
      </div>

      {!loading && !error && grouped.length > 0 && (
        <Pagination page={page} totalPages={totalPages} total={total} limit={filter.limit ?? 20} onPage={goPage} />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   STYLES
   Toàn bộ CSS dùng custom properties từ TOKENS phía trên qua inline style
   ở mức cao nhất, còn lại là class thuần để dễ đọc và dễ tách file sau.
   ════════════════════════════════════════════════════════════════════════ */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap');

  .nk-page { font-family: 'Be Vietnam Pro', system-ui, sans-serif; color: ${TOKENS.ink}; }
  .nk-page * { box-sizing: border-box; }

  @keyframes nk-fade-up { from { opacity:0; transform: translateY(6px); } to { opacity:1; transform: translateY(0); } }
  @keyframes nk-fade-in { from { opacity:0; } to { opacity:1; } }
  @keyframes nk-spin { to { transform: rotate(360deg); } }
  @keyframes nk-pulse { 0%,100% { opacity:.55; } 50% { opacity:1; } }
  @keyframes nk-pop { 0% { transform: scale(.92); opacity:0; } 100% { transform: scale(1); opacity:1; } }

  @media (prefers-reduced-motion: reduce) {
    .nk-page *, .nk-page *::before, .nk-page *::after { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
  }

  /* ── Header ── */
  .nk-header { display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-bottom:18px; animation: nk-fade-up .4s ${TOKENS.ease}; }
  .nk-header-title { display:flex; align-items:center; gap:12px; }
  .nk-header-icon {
    width:38px; height:38px; border-radius:11px; flex-shrink:0;
    background: linear-gradient(135deg, ${TOKENS.brand} 0%, #2a5298 100%);
    color:#fff; display:flex; align-items:center; justify-content:center;
    box-shadow: 0 6px 16px rgba(30,60,114,0.28);
  }
  .nk-header-title h1 { margin:0; font-size:17px; font-weight:800; letter-spacing:-0.3px; }
  .nk-header-title p { margin:1px 0 0; font-size:12.5px; color:${TOKENS.inkFaint}; }

  .nk-header-actions { display:flex; align-items:center; gap:8px; }

  .nk-search {
    display:flex; align-items:center; gap:7px; height:36px; padding:0 12px;
    border:1px solid ${TOKENS.line}; border-radius:10px; background:${TOKENS.canvas};
    color:${TOKENS.inkFaint}; transition: border-color .15s, box-shadow .15s, background .15s;
  }
  .nk-search:focus-within { border-color:${TOKENS.brand}; background:#fff; box-shadow: 0 0 0 3px rgba(30,60,114,0.08); }
  .nk-search input { border:none; outline:none; background:transparent; font-size:13px; color:${TOKENS.ink}; font-family:inherit; width:170px; }
  .nk-search input::placeholder { color:${TOKENS.inkFaint}; }
  .nk-search-clear { display:flex; border:none; background:transparent; color:${TOKENS.inkFaint}; cursor:pointer; padding:2px; border-radius:50%; transition: background .15s, color .15s; }
  .nk-search-clear:hover { background:${TOKENS.line}; color:${TOKENS.ink}; }

  .nk-refresh {
    display:inline-flex; align-items:center; gap:6px; height:36px; padding:0 14px;
    border-radius:10px; border:1px solid ${TOKENS.line}; background:#fff;
    font-size:13px; font-weight:600; color:${TOKENS.inkSoft}; cursor:pointer; font-family:inherit;
    transition: background .15s, border-color .15s, transform .12s;
  }
  .nk-refresh:hover:not(:disabled) { background:${TOKENS.canvas}; border-color:#cbd5e1; }
  .nk-refresh:active:not(:disabled) { transform: scale(.97); }
  .nk-refresh:disabled { opacity:.6; cursor:default; }
  .nk-spin { animation: nk-spin .7s linear infinite; }

  /* ── Filter bar ── */
  .nk-filterbar {
    display:flex; align-items:center; gap:10px; margin-bottom:16px; padding:10px 12px;
    background:${TOKENS.surface}; border:1px solid ${TOKENS.line}; border-radius:12px;
    flex-wrap:wrap; animation: nk-fade-up .45s ${TOKENS.ease} .05s backwards;
  }
  .nk-chip-row { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
  .nk-chip-row-scroll { flex:1; min-width:0; }
  .nk-divider { width:1px; height:20px; background:${TOKENS.line}; flex-shrink:0; }

  .nk-chip {
    display:inline-flex; align-items:center; gap:5px; padding:6px 13px; border-radius:999px;
    border:1px solid ${TOKENS.line}; background:#fff; font-size:12.5px; font-weight:600;
    color:${TOKENS.inkSoft}; cursor:pointer; font-family:inherit;
    transition: background .16s ${TOKENS.ease}, color .16s, border-color .16s, transform .12s;
  }
  .nk-chip:hover { border-color:#cbd5e1; color:${TOKENS.ink}; }
  .nk-chip:active { transform: scale(.96); }
  .nk-chip.is-active { background:${TOKENS.ink}; color:#fff; border-color:${TOKENS.ink}; }
  .nk-chip.is-date.is-active { background: linear-gradient(135deg, ${TOKENS.brand}, #2a5298); border-color:transparent; }
  .nk-chip.is-warn.is-active { background:${TOKENS.danger}; border-color:transparent; }

  /* ── Timeline ── */
  .nk-timeline-wrap { min-height:240px; }
  .nk-timeline { display:flex; flex-direction:column; gap:22px; }

  .nk-day-group { animation: nk-fade-up .4s ${TOKENS.ease} backwards; }
  .nk-day-label {
    display:flex; align-items:center; gap:8px; font-size:12.5px; font-weight:700;
    color:${TOKENS.inkSoft}; text-transform:uppercase; letter-spacing:.04em; margin-bottom:8px; padding-left:2px;
  }
  .nk-day-dot { width:6px; height:6px; border-radius:50%; background:${TOKENS.brand}; flex-shrink:0; }
  .nk-day-count { margin-left:auto; font-weight:500; text-transform:none; color:${TOKENS.inkFaint}; letter-spacing:0; }

  .nk-rows { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:6px; }

  .nk-row {
    background:#fff; border:1px solid ${TOKENS.line}; border-radius:12px; overflow:hidden;
    animation: nk-fade-up .38s ${TOKENS.ease} backwards;
    transition: border-color .15s, box-shadow .15s;
  }
  .nk-row:hover { border-color:#dbe3ee; box-shadow: 0 2px 10px rgba(15,23,42,0.05); }

  .nk-row-head {
    width:100%; display:grid; align-items:center; gap:14px; text-align:left;
    grid-template-columns: 52px 30px minmax(0,1fr) minmax(0,170px) 100px 18px 16px;
    padding:10px 14px; border:none; background:transparent; cursor:pointer; font-family:inherit;
    transition: background .15s;
  }
  .nk-row-head.is-static { cursor:default; }
  .nk-row-head:hover { background:${TOKENS.canvas}; }
  .nk-row-head.is-open { background:${TOKENS.canvas}; }

  .nk-row-time { font-size:12px; font-family:'JetBrains Mono',monospace; color:${TOKENS.inkSoft}; }

  .nk-avatar {
    width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center;
    font-size:10.5px; font-weight:700; flex-shrink:0;
  }
  .nk-avatar.is-admin  { background:#eff6ff; color:#1d4ed8; }
  .nk-avatar.is-staff  { background:${TOKENS.okSoft}; color:${TOKENS.ok}; }
  .nk-avatar.is-system { background:${TOKENS.canvas}; color:${TOKENS.inkFaint}; }

  .nk-row-actor { display:flex; flex-direction:column; min-width:0; gap:1px; }
  .nk-row-actor-name { font-size:13px; font-weight:600; color:${TOKENS.ink}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .nk-row-actor-role { font-size:10.5px; color:${TOKENS.inkFaint}; }

  .nk-row-action { min-width:0; overflow:hidden; }

  .nk-badge {
    display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:999px;
    font-size:11.5px; font-weight:600; white-space:nowrap; max-width:100%; overflow:hidden; text-overflow:ellipsis;
  }
  .nk-badge-icon { display:flex; flex-shrink:0; font-size:11px; }

  .nk-row-ip { font-size:11.5px; font-family:'JetBrains Mono',monospace; color:${TOKENS.inkFaint}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

  .nk-status.is-ok  { color:${TOKENS.ok}; }
  .nk-status.is-bad { color:${TOKENS.danger}; }

  .nk-row-chevron { color:${TOKENS.inkFaint}; transition: transform .25s ${TOKENS.ease}; }
  .nk-row-chevron.is-open { transform: rotate(180deg); }
  .nk-row-chevron.is-hidden { opacity:0; }

  /* Mở rộng chi tiết bằng grid-template-rows: mượt hơn height:auto vì
     không cần đo DOM, và mượt hơn display:none vì có animation thật. */
  .nk-row-detail { display:grid; grid-template-rows: 0fr; transition: grid-template-rows .3s ${TOKENS.ease}; }
  .nk-row-detail-inner { overflow:hidden; min-height:0; }

  .nk-detail-grid { display:flex; flex-wrap:wrap; gap:14px 28px; padding:14px 16px 16px 96px; border-top:1px dashed ${TOKENS.line}; }
  .nk-detail-empty { padding:14px 16px 16px 96px; font-size:12.5px; color:${TOKENS.inkFaint}; border-top:1px dashed ${TOKENS.line}; }

  .nk-detail-item { display:flex; flex-direction:column; gap:2px; animation: nk-fade-in .25s ${TOKENS.ease} backwards; }
  .nk-detail-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:${TOKENS.inkFaint}; }
  .nk-detail-value { font-size:13px; color:${TOKENS.inkSoft}; max-width:320px; }
  .nk-detail-value.is-emphasis { color:${TOKENS.ink}; font-weight:600; }

  /* ── Skeleton loading ── */
  .nk-skeleton-list { display:flex; flex-direction:column; gap:6px; }
  .nk-skeleton-row {
    display:grid; grid-template-columns: 52px 30px 1fr 140px 90px; gap:14px; align-items:center;
    padding:14px; border:1px solid ${TOKENS.line}; border-radius:12px; background:#fff;
    animation: nk-fade-in .3s ${TOKENS.ease} backwards;
  }
  .nk-sk { background: linear-gradient(90deg, #eef1f6, #f5f7fa, #eef1f6); border-radius:6px; animation: nk-pulse 1.4s ease-in-out infinite; }
  .nk-sk-time   { height:11px; width:38px; }
  .nk-sk-avatar { height:28px; width:28px; border-radius:50%; }
  .nk-sk-actor  { height:11px; width:60%; }
  .nk-sk-badge  { height:20px; width:100px; border-radius:999px; }
  .nk-sk-ip     { height:11px; width:70px; }

  /* ── Empty / error ── */
  .nk-empty {
    display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px;
    padding:64px 20px; color:${TOKENS.inkFaint}; text-align:center;
    animation: nk-pop .35s ${TOKENS.ease};
  }
  .nk-empty p { margin:0; font-size:13px; max-width:280px; }
  .nk-error { padding:48px 20px; text-align:center; color:${TOKENS.danger}; font-size:13px; font-weight:600; }

  /* ── Pagination ── */
  .nk-pager { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:16px; flex-wrap:wrap; }
  .nk-pager-info { font-size:12px; color:${TOKENS.inkFaint}; }
  .nk-pager-btns { display:flex; gap:3px; align-items:center; }
  .nk-pgdot { font-size:12px; color:${TOKENS.inkFaint}; padding:0 2px; }
  .nk-pgbtn {
    min-width:28px; height:28px; padding:0 6px; border-radius:7px; border:1px solid ${TOKENS.line};
    background:#fff; font-size:12px; font-weight:600; color:${TOKENS.inkSoft}; cursor:pointer;
    display:flex; align-items:center; justify-content:center; font-family:inherit;
    transition: background .15s, border-color .15s, transform .12s;
  }
  .nk-pgbtn:hover:not(:disabled) { background:${TOKENS.canvas}; border-color:#cbd5e1; }
  .nk-pgbtn:active:not(:disabled) { transform: scale(.93); }
  .nk-pgbtn:disabled { opacity:.35; cursor:not-allowed; }
  .nk-pgbtn.is-active { background:${TOKENS.ink}; color:#fff; border-color:${TOKENS.ink}; }

  /* ── Responsive: ẩn bớt cột trên màn hẹp, giữ thông tin quan trọng nhất ── */
  @media (max-width: 760px) {
    .nk-row-head { grid-template-columns: 30px minmax(0,1fr) auto 16px; }
    .nk-row-time, .nk-row-ip { display:none; }
    .nk-detail-grid, .nk-detail-empty { padding-left:16px; }
    .nk-header-actions { width:100%; }
    .nk-search { flex:1; }
    .nk-search input { width:100%; }
  }
`;