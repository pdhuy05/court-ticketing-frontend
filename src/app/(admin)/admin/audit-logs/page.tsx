"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  FiShield, FiSearch, FiRefreshCw, FiChevronLeft, FiChevronRight,
  FiCheckCircle, FiXCircle, FiAlertCircle, FiLogIn, FiLogOut,
  FiKey, FiTrash2, FiEdit2, FiToggleRight, FiUpload, FiSettings,
  FiSliders, FiClock, FiMoreHorizontal,
} from "react-icons/fi";
import { getAuditLogs, type AuditLog, type AuditLogFilter } from "@/services/admin.service";

// ─── Action metadata ──────────────────────────────────────────────────────────
const ACTION_META: Record<string, {
  label: string;
  icon: React.ReactNode;
  variant: "success" | "danger" | "info" | "warning" | "neutral";
}> = {
  LOGIN_SUCCESS:              { label: "Đăng nhập",        icon: <FiLogIn size={11} />,      variant: "success" },
  LOGIN_FAILED:               { label: "Đăng nhập thất bại", icon: <FiAlertCircle size={11} />, variant: "danger" },
  LOGOUT:                     { label: "Đăng xuất",        icon: <FiLogOut size={11} />,     variant: "neutral" },
  PASSWORD_CHANGED:           { label: "Đổi mật khẩu",     icon: <FiKey size={11} />,        variant: "info" },
  TICKET_RESET_DAY:           { label: "Reset vé ngày",     icon: <FiRefreshCw size={11} />,  variant: "warning" },
  TICKET_RESET_ALL:           { label: "Reset toàn bộ vé",  icon: <FiRefreshCw size={11} />,  variant: "danger" },
  TICKET_AUTO_RESET:          { label: "Auto reset vé",     icon: <FiRefreshCw size={11} />,  variant: "neutral" },
  SERVICE_CREATE:             { label: "Tạo quầy",          icon: <FiEdit2 size={11} />,      variant: "info" },
  SERVICE_UPDATE:             { label: "Sửa quầy",          icon: <FiEdit2 size={11} />,      variant: "info" },
  SERVICE_DELETE:             { label: "Xóa quầy",          icon: <FiTrash2 size={11} />,     variant: "danger" },
  SERVICE_TOGGLE:             { label: "Bật/tắt quầy",      icon: <FiToggleRight size={11} />,variant: "info" },
  COUNTER_CREATE:             { label: "Tạo phòng",         icon: <FiEdit2 size={11} />,      variant: "info" },
  COUNTER_UPDATE:             { label: "Sửa phòng",         icon: <FiEdit2 size={11} />,      variant: "info" },
  COUNTER_DELETE:             { label: "Xóa phòng",         icon: <FiTrash2 size={11} />,     variant: "danger" },
  COUNTER_TOGGLE:             { label: "Bật/tắt phòng",     icon: <FiToggleRight size={11} />,variant: "info" },
  USER_CREATE:                { label: "Tạo người dùng",    icon: <FiEdit2 size={11} />,      variant: "info" },
  USER_UPDATE:                { label: "Sửa người dùng",    icon: <FiEdit2 size={11} />,      variant: "info" },
  USER_DELETE:                { label: "Xóa người dùng",    icon: <FiTrash2 size={11} />,     variant: "danger" },
  USER_TOGGLE:                { label: "Bật/tắt tài khoản", icon: <FiToggleRight size={11} />,variant: "info" },
  USER_PERMISSION_UPDATE:     { label: "Cập nhật quyền",    icon: <FiSliders size={11} />,    variant: "info" },
  STAFF_SHIFT_START:          { label: "Bắt đầu ca",        icon: <FiClock size={11} />,      variant: "success" },
  STAFF_SHIFT_END:            { label: "Kết thúc ca",       icon: <FiClock size={11} />,      variant: "neutral" },
  SETTING_TTS_UPDATE:         { label: "Cài đặt TTS",       icon: <FiSettings size={11} />,   variant: "info" },
  SETTING_AUTO_RESET_UPDATE:  { label: "Cài đặt auto reset",icon: <FiSettings size={11} />,   variant: "info" },
  SETTING_SITE_CONFIG_UPDATE: { label: "Cài đặt giao diện", icon: <FiSettings size={11} />,   variant: "info" },
  SETTING_DISPLAY_MODE_UPDATE:{ label: "Cài đặt màn hình",  icon: <FiSettings size={11} />,   variant: "info" },
  SETTING_LOGO_UPLOAD:        { label: "Upload logo",        icon: <FiUpload size={11} />,     variant: "info" },
};

const getActionMeta = (action: string) =>
  ACTION_META[action] ?? { label: action, icon: <FiSettings size={11} />, variant: "neutral" as const };

// ─── Filter groups (quick chips) ──────────────────────────────────────────────
type QuickFilter = { label: string; key: string; type: "date" | "action" | "status" };
const QUICK_FILTERS: QuickFilter[] = [
  { label: "Hôm nay",   key: "today",         type: "date" },
  { label: "7 ngày",    key: "7d",            type: "date" },
  { label: "30 ngày",   key: "30d",           type: "date" },
];
const ACTION_FILTERS: QuickFilter[] = [
  { label: "Đăng nhập", key: "LOGIN_SUCCESS",              type: "action" },
  { label: "Người dùng",key: "USER_CREATE",                type: "action" },
  { label: "Cài đặt",   key: "SETTING_SITE_CONFIG_UPDATE", type: "action" },
  { label: "Reset vé",  key: "TICKET_RESET_DAY",           type: "action" },
  { label: "Thất bại",  key: "failed",                     type: "status" },
];

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10);
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return {
    time: d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    date: d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }),
  };
};

const initials = (name: string) =>
  name.split("_").map(p => p[0]?.toUpperCase() ?? "").join("").slice(0, 2) || name.slice(0, 2).toUpperCase();

// ─── Badge component ──────────────────────────────────────────────────────────
const VARIANT_STYLE: Record<string, { bg: string; color: string }> = {
  success: { bg: "#f0fdf4", color: "#15803d" },
  danger:  { bg: "#fef2f2", color: "#b91c1c" },
  info:    { bg: "#eff6ff", color: "#1d4ed8" },
  warning: { bg: "#fffbeb", color: "#92400e" },
  neutral: { bg: "#f8fafc", color: "#475569" },
};

function Badge({ variant, icon, label }: { variant: string; icon: React.ReactNode; label: string }) {
  const s = VARIANT_STYLE[variant] ?? VARIANT_STYLE.neutral;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 99,
      fontSize: 11.5, fontWeight: 500,
      background: s.bg, color: s.color,
      whiteSpace: "nowrap",
    }}>
      {icon}{label}
    </span>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS: Record<string, { bg: string; color: string }> = {
  admin:  { bg: "#eff6ff", color: "#1d4ed8" },
  staff:  { bg: "#f0fdf4", color: "#15803d" },
  system: { bg: "#f1f5f9", color: "#64748b" },
};

function Avatar({ username, role }: { username: string; role: string }) {
  const c = AVATAR_COLORS[role] ?? AVATAR_COLORS.system;
  return (
    <div style={{
      width: 28, height: 28, borderRadius: "50%",
      background: c.bg, color: c.color,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 10.5, fontWeight: 600, flexShrink: 0,
    }}>
      {initials(username)}
    </div>
  );
}

// ─── Detail renderer ─────────────────────────────────────────────────────────
// ─── Helpers cho DetailCell ───────────────────────────────────────────────────
const PERM_VI: Record<string, string> = {
  dashboard:    "Thống kê",
  users:        "Nhân viên",
  counter:      "Phòng",
  services:     "Quầy",
  printers:     "Máy in",
  settings:     "Cài đặt",
  reports:      "Báo cáo",
  search:       "Tra cứu",
  "audit-logs": "Nhật ký",
  shift:        "Ca làm",
};

const ROLE_VI: Record<string, string> = {
  admin: "Admin", staff: "Nhân viên", system: "Hệ thống",
};

const TARGET_VI: Record<string, string> = {
  user: "Tài khoản", ticket: "Vé", service: "Quầy",
  counter: "Phòng", setting: "Cài đặt", printer: "Máy in",
};

function formatPerms(raw: unknown): string {
  if (!raw) return "";
  const list = String(raw).split(",").map(p => PERM_VI[p.trim()] ?? p.trim()).filter(Boolean);
  if (list.length === 0) return "Không có quyền";
  return list.join(", ");
}

type DetailLine = { label: string; value: string; highlight?: boolean };

function buildDetailLines(log: AuditLog): DetailLine[] {
  const d = log.detail as Record<string, unknown> | null;
  const lines: DetailLine[] = [];

  // Tài khoản bị tác động (dùng actorUsername từ detail nếu có, hoặc targetId)
  const addTarget = () => {
    const name = d?.username ?? d?.targetUsername ?? d?.name;
    if (name) {
      lines.push({ label: TARGET_VI[log.targetType ?? ""] ?? "Đối tượng", value: String(name), highlight: true });
    } else if (log.targetId) {
      const label = TARGET_VI[log.targetType ?? ""] ?? log.targetType ?? "ID";
      lines.push({ label, value: "…" + log.targetId.slice(-8) });
    }
  };

  switch (log.action) {
    case "LOGIN_SUCCESS":
    case "LOGIN_FAILED": {
      const role = d?.role ? ROLE_VI[String(d.role)] ?? String(d.role) : null;
      if (role) lines.push({ label: "Vai trò", value: role });
      if (d?.reason) lines.push({ label: "Lý do", value: String(d.reason) });
      break;
    }
    case "USER_PERMISSION_UPDATE": {
      addTarget();
      const perms = d?.permissions;
      if (perms === null || perms === "null") {
        lines.push({ label: "Quyền", value: "Toàn quyền (mặc định)" });
      } else if (perms !== undefined) {
        const formatted = formatPerms(perms);
        lines.push({ label: "Quyền được cấp", value: formatted || "Không có quyền" });
      }
      const isSuper = d?.isSuperAdmin;
      if (isSuper === true || isSuper === "true") lines.push({ label: "Super Admin", value: "Bật" });
      break;
    }
    case "USER_CREATE":
    case "USER_UPDATE":
    case "USER_DELETE":
    case "USER_TOGGLE": {
      addTarget();
      if (d?.active !== undefined) lines.push({ label: "Trạng thái", value: d.active ? "Hoạt động" : "Đã khóa" });
      break;
    }
    case "TICKET_RESET_DAY":
    case "TICKET_RESET_ALL":
    case "TICKET_AUTO_RESET": {
      if (d?.date) lines.push({ label: "Ngày", value: String(d.date) });
      if (d?.tickets !== undefined) lines.push({ label: "Số vé", value: String(d.tickets) });
      break;
    }
    case "SERVICE_CREATE":
    case "SERVICE_UPDATE":
    case "SERVICE_DELETE":
    case "SERVICE_TOGGLE":
    case "COUNTER_CREATE":
    case "COUNTER_UPDATE":
    case "COUNTER_DELETE":
    case "COUNTER_TOGGLE": {
      addTarget();
      if (d?.active !== undefined) lines.push({ label: "Trạng thái", value: d.active ? "Hoạt động" : "Tắt" });
      break;
    }
    case "SETTING_TTS_UPDATE":
    case "SETTING_AUTO_RESET_UPDATE":
    case "SETTING_SITE_CONFIG_UPDATE":
    case "SETTING_DISPLAY_MODE_UPDATE": {
      if (d?.field) lines.push({ label: "Trường", value: String(d.field) });
      if (d?.value !== undefined) lines.push({ label: "Giá trị", value: String(d.value) });
      break;
    }
    case "PASSWORD_CHANGED": {
      addTarget();
      break;
    }
    case "STAFF_SHIFT_START":
    case "STAFF_SHIFT_END": {
      if (d?.counter) lines.push({ label: "Phòng", value: String(d.counter) });
      break;
    }
    default: {
      // Generic: hiển thị tối đa 2 cặp key-value từ detail
      if (d) {
        Object.entries(d)
          .filter(([, v]) => v !== null && v !== undefined && v !== "")
          .slice(0, 2)
          .forEach(([k, v]) => lines.push({ label: k, value: String(v) }));
      }
      addTarget();
    }
  }

  return lines;
}

function DetailCell({ log }: { log: AuditLog }) {
  const lines = buildDetailLines(log);
  if (lines.length === 0) return <span style={{ color: "#94a3b8" }}>—</span>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {lines.map((l, i) => (
        <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 4, minWidth: 0 }}>
          <span style={{ fontSize: 10.5, color: "#94a3b8", flexShrink: 0, fontWeight: 500 }}>
            {l.label}
          </span>
          <span style={{
            fontSize: 12,
            color: l.highlight ? "#0f172a" : "#475569",
            fontWeight: l.highlight ? 600 : 400,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 200,
          }}>
            {l.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function AuditLogPage() {
  const [logs,       setLogs]       = useState<AuditLog[]>([]);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [activeDate, setActiveDate] = useState("7d");
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [searchVal,  setSearchVal]  = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [filter, setFilter] = useState<AuditLogFilter>({
    dateFrom: daysAgo(6), dateTo: today(), page: 1, limit: 10,
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async (f: AuditLogFilter) => {
    setLoading(true); setError(null);
    try {
      const res = await getAuditLogs(f);
      setLogs(res.logs); setTotal(res.total);
      setTotalPages(res.totalPages); setPage(res.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được nhật ký");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchLogs(filter); }, []); // eslint-disable-line

  const applyFilter = (patch: Partial<AuditLogFilter>) => {
    const next = { ...filter, ...patch, page: 1 };
    setFilter(next); void fetchLogs(next);
  };

  const handleDateChip = (key: string) => {
    setActiveDate(key);
    if (key === "today") applyFilter({ dateFrom: today(), dateTo: today() });
    else if (key === "7d") applyFilter({ dateFrom: daysAgo(6), dateTo: today() });
    else if (key === "30d") applyFilter({ dateFrom: daysAgo(29), dateTo: today() });
  };

  const handleActionChip = (chip: QuickFilter) => {
    const next = activeAction === chip.key ? null : chip.key;
    setActiveAction(next);
    if (!next) { applyFilter({ action: "", status: "" }); return; }
    if (chip.type === "status") applyFilter({ action: "", status: "failed" });
    else applyFilter({ action: next, status: "" });
  };

  const handleSearch = (val: string) => {
    setSearchVal(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => applyFilter({ actorUsername: val }), 400);
  };

  const goPage = (p: number) => {
    const next = { ...filter, page: p }; setFilter(next); void fetchLogs(next);
  };

  const renderPages = () => {
    const pages: (number | "…")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("…");
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
      if (page < totalPages - 2) pages.push("…");
      pages.push(totalPages);
    }
    return pages.map((p, i) =>
      p === "…"
        ? <span key={`e${i}`} style={{ fontSize: 12, color: "#94a3b8", padding: "0 2px", alignSelf: "center" }}>…</span>
        : <button key={p} className={`al-pgbtn${p === page ? " active" : ""}`} onClick={() => goPage(p as number)}>{p}</button>
    );
  };

  return (
    <div className="al-wrap">
      <style>{`
        .al-wrap { font-family: 'Be Vietnam Pro', system-ui, sans-serif; color: #0f172a; }

        /* Top bar */
        .al-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:18px; flex-wrap:wrap; gap:12px; }
        .al-title-row { display:flex; align-items:center; gap:10px; }
        .al-icon-wrap { width:34px;height:34px;border-radius:10px;background:#f1f5f9;border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;color:#475569; }
        .al-title { font-size:16px;font-weight:700;letter-spacing:-0.3px; }
        .al-sub { font-size:12px;color:#94a3b8;margin-top:1px; }
        .al-top-actions { display:flex;align-items:center;gap:8px; }

        /* Search */
        .al-search { display:flex;align-items:center;gap:7px;padding:0 11px;height:34px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;font-size:13px;color:#0f172a;font-family:inherit; }
        .al-search input { border:none;background:transparent;outline:none;font-size:13px;color:#0f172a;font-family:inherit;width:160px; }
        .al-search input::placeholder { color:#94a3b8; }

        /* Refresh btn */
        .al-refresh { display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 12px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;font-size:13px;font-weight:500;color:#475569;cursor:pointer;font-family:inherit;transition:background .13s; }
        .al-refresh:hover { background:#f8fafc; }

        /* Filter chips */
        .al-chips { display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-bottom:14px; }
        .al-chip { display:inline-flex;align-items:center;gap:5px;padding:4px 11px;border-radius:99px;border:1px solid #e2e8f0;background:#fff;font-size:12px;color:#64748b;cursor:pointer;font-family:inherit;transition:all .13s; }
        .al-chip:hover { border-color:#cbd5e1;color:#334155; }
        .al-chip.on { background:#0f172a;color:#fff;border-color:#0f172a;font-weight:600; }
        .al-chip.on-action { background:#1e40af;color:#fff;border-color:#1e40af;font-weight:500; }
        .al-divider { width:1px;height:18px;background:#e2e8f0; }

        /* Table */
        .al-table-wrap { border:1px solid #e8edf3;border-radius:12px;overflow:hidden;background:#fff; }
        .al-table { width:100%;border-collapse:collapse;table-layout:fixed; }
        .al-th { padding:9px 14px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;text-align:left;background:#f8fafc;border-bottom:1px solid #f1f5f9;white-space:nowrap; }
        .al-td { padding:11px 14px;font-size:13px;border-bottom:1px solid #f8fafc;vertical-align:middle; }
        .al-tr:last-child .al-td { border-bottom:none; }
        .al-tr:hover .al-td { background:#fafbfc; }

        /* Time */
        .al-time { font-size:12.5px;font-family:'JetBrains Mono',monospace;color:#334155; }
        .al-date { font-size:11px;color:#94a3b8;margin-top:1px; }

        /* Actor */
        .al-actor { display:flex;align-items:center;gap:8px; }
        .al-actor-name { font-size:13px;font-weight:600;color:#0f172a; }
        .al-actor-role { font-size:11px;color:#94a3b8; }

        /* IP */
        .al-ip { font-family:'JetBrains Mono',monospace;font-size:11.5px;color:#94a3b8; }

        /* Status dot */
        .al-ok { color:#15803d; }
        .al-err { color:#b91c1c; }

        /* Pagination */
        .al-pager { display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-top:1px solid #f1f5f9;flex-wrap:wrap;gap:8px; }
        .al-pager-info { font-size:12px;color:#94a3b8; }
        .al-pgbtns { display:flex;gap:3px;align-items:center; }
        .al-pgbtn { min-width:28px;height:28px;padding:0 4px;border-radius:6px;border:1px solid #e2e8f0;background:#fff;font-size:12px;font-weight:500;color:#475569;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:inherit;transition:all .13s; }
        .al-pgbtn:hover:not(:disabled) { background:#f1f5f9;border-color:#cbd5e1; }
        .al-pgbtn:disabled { opacity:.3;cursor:not-allowed; }
        .al-pgbtn.active { background:#0f172a;color:#fff;border-color:#0f172a; }

        /* States */
        .al-loading { display:flex;align-items:center;justify-content:center;gap:8px;padding:52px;color:#94a3b8;font-size:13px; }
        .al-empty { text-align:center;padding:52px;color:#94a3b8;font-size:13px; }
        .al-error { color:#ef4444;text-align:center;padding:52px;font-size:13px;font-weight:500; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .spin { animation:spin .8s linear infinite; }
      `}</style>

      {/* Top bar */}
      <div className="al-top">
        <div className="al-title-row">
          <div className="al-icon-wrap"><FiShield size={16} /></div>
          <div>
            <div className="al-title">Nhật ký hoạt động</div>
            <div className="al-sub">Theo dõi mọi thao tác nhạy cảm trong hệ thống</div>
          </div>
        </div>
        <div className="al-top-actions">
          <div className="al-search">
            <FiSearch size={13} color="#94a3b8" />
            <input
              placeholder="Tìm tài khoản..."
              value={searchVal}
              onChange={e => handleSearch(e.target.value)}
            />
          </div>
          <button className="al-refresh" onClick={() => void fetchLogs(filter)}>
            <FiRefreshCw size={13} className={loading ? "spin" : ""} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="al-chips">
        {QUICK_FILTERS.map(f => (
          <button
            key={f.key}
            className={`al-chip${activeDate === f.key ? " on" : ""}`}
            onClick={() => handleDateChip(f.key)}
          >
            {f.label}
          </button>
        ))}
        <div className="al-divider" />
        {ACTION_FILTERS.map(f => (
          <button
            key={f.key}
            className={`al-chip${activeAction === f.key ? " on-action" : ""}`}
            onClick={() => handleActionChip(f)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="al-table-wrap">
        {error ? (
          <div className="al-error">{error}</div>
        ) : loading ? (
          <div className="al-loading">
            <FiRefreshCw size={15} className="spin" /> Đang tải...
          </div>
        ) : logs.length === 0 ? (
          <div className="al-empty">Không có bản ghi nào phù hợp</div>
        ) : (
          <>
            <table className="al-table">
              <thead>
                <tr>
                  <th className="al-th" style={{ width: 100 }}>Thời gian</th>
                  <th className="al-th" style={{ width: 155 }}>Tài khoản</th>
                  <th className="al-th" style={{ width: 175 }}>Hành động</th>
                  <th className="al-th" style={{ width: 72 }}>Kết quả</th>
                  <th className="al-th" style={{ width: 105 }}>IP</th>
                  <th className="al-th" style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const meta = getActionMeta(log.action);
                  const { time, date } = formatTime(log.createdAt);
                  const ok = log.status === "success";
                  const isExpanded = expandedId === log._id;
                  const lines = buildDetailLines(log);
                  return (
                    <>
                      <tr
                        key={log._id}
                        className="al-tr"
                        style={{ cursor: lines.length > 0 ? "pointer" : "default" }}
                        onClick={() => lines.length > 0 && setExpandedId(isExpanded ? null : log._id)}
                      >
                        <td className="al-td">
                          <div className="al-time">{time}</div>
                          <div className="al-date">{date}</div>
                        </td>
                        <td className="al-td">
                          <div className="al-actor">
                            <Avatar username={log.actorUsername} role={log.actorRole} />
                            <div>
                              <div className="al-actor-name">{log.actorUsername}</div>
                              <div className="al-actor-role">
                                {log.actorRole === "admin" ? "Admin" : log.actorRole === "staff" ? "Nhân viên" : "Hệ thống"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="al-td">
                          <Badge variant={meta.variant} icon={meta.icon} label={meta.label} />
                        </td>
                        <td className="al-td">
                          {ok
                            ? <FiCheckCircle size={16} className="al-ok" />
                            : <FiXCircle size={16} className="al-err" />}
                        </td>
                        <td className="al-td">
                          <span className="al-ip">{log.ipAddress ?? "—"}</span>
                        </td>
                        <td className="al-td" style={{ textAlign: "center", color: "#94a3b8" }}>
                          {lines.length > 0 && (
                            <FiChevronRight
                              size={14}
                              style={{
                                transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                                transition: "transform 0.2s ease",
                                display: "inline-block",
                              }}
                            />
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${log._id}-detail`} className="al-tr-detail">
                          <td colSpan={6} style={{ padding: 0, borderBottom: "1px solid #f1f5f9" }}>
                            <div style={{
                              background: "#f8fafc",
                              borderTop: "1px solid #f1f5f9",
                              padding: "12px 20px",
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "16px 32px",
                            }}>
                              {lines.map((l, i) => (
                                <div key={i} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                  <span style={{ fontSize: 10.5, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    {l.label}
                                  </span>
                                  <span style={{
                                    fontSize: 13,
                                    color: l.highlight ? "#0f172a" : "#475569",
                                    fontWeight: l.highlight ? 600 : 400,
                                  }}>
                                    {l.value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>

            <div className="al-pager">
              <span className="al-pager-info">
                {(page - 1) * (filter.limit ?? 10) + 1}–{Math.min(page * (filter.limit ?? 10), total)} / {total} bản ghi
              </span>
              <div className="al-pgbtns">
                <button className="al-pgbtn" disabled={page <= 1} onClick={() => goPage(page - 1)}>
                  <FiChevronLeft size={13} />
                </button>
                {renderPages()}
                <button className="al-pgbtn" disabled={page >= totalPages} onClick={() => goPage(page + 1)}>
                  <FiChevronRight size={13} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}