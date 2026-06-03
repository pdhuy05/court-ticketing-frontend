"use client";

import React, { useCallback, useEffect, useState } from "react";
import { FiEdit2, FiSearch, FiTrash2, FiX, FiShield } from "react-icons/fi";
import { TbPlus } from "react-icons/tb";
import {
  getAllAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  toggleAdminActive,
  type AdminAccount,
  type CreateAdminPayload,
  type UpdateAdminPayload,
} from "@/services/admin.service";
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog";
import AdminPermissionsModal from "@/components/admin/AdminPermissionsModal";
import type { AdminProfile } from "@/services/auth.service";

/* ─── Types ──────────────────────────────────────────────────────────────── */
type FormData = {
  username: string;
  password: string;
  fullName: string;
  isSuperAdmin: boolean;
  permissions: string[];
};

type EditFormData = {
  password: string;
  fullName: string;
};

const EMPTY_FORM: FormData = { username: "", password: "", fullName: "", isSuperAdmin: false, permissions: [] };
const EMPTY_EDIT: EditFormData = { password: "", fullName: "" };

const getCachedAdmin = (): AdminProfile | null => {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem("adminUser") || ""); } catch { return null; }
};

/* ─── Permissions list ──────────────────────────────────────────────────── */
const ALL_PERMISSIONS: { key: string; label: string; icon: string }[] = [
  { key: "dashboard", label: "Thống kê", icon: "📊" },
  { key: "users",     label: "Quản lý nhân viên", icon: "👥" },
  { key: "counter",   label: "Quản lý phòng", icon: "🏢" },
  { key: "services",  label: "Quản lý quầy", icon: "🪟" },
  { key: "printers",  label: "Quản lý máy in", icon: "🖨️" },
  { key: "settings",  label: "Cài đặt hệ thống", icon: "⚙️" },
  { key: "reports",   label: "Báo cáo", icon: "📋" },
  { key: "search",    label: "Tra cứu vé", icon: "🔍" },
];

/* ─── Global CSS ─────────────────────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap');

  .at-wrap * { font-family: 'Be Vietnam Pro', sans-serif; box-sizing: border-box; }

  /* Running border animation for current user row */
  @keyframes at-spin {
    to { --at-angle: 360deg; }
  }
  @property --at-angle {
    syntax: '<angle>';
    initial-value: 0deg;
    inherits: false;
  }
  .at-self-row {
    position: relative;
    border-radius: 14px !important;
    background: linear-gradient(#fffdf0, #fffbeb) padding-box,
                conic-gradient(from var(--at-angle), #d97706 0%, #fcd34d 30%, #f59e0b 55%, #fbbf24 75%, #d97706 100%) border-box !important;
    border: 2.5px solid transparent !important;
    animation: at-spin 2.5s linear infinite;
    z-index: 1;
  }
  .at-self-row:hover {
    background: linear-gradient(#fff8d6, #fef3c7) padding-box,
                conic-gradient(from var(--at-angle), #d97706 0%, #fcd34d 30%, #f59e0b 55%, #fbbf24 75%, #d97706 100%) border-box !important;
  }

  /* Row hover (normal rows only) */
  .at-row { transition: background 0.15s; }
  .at-row:not(.at-self-row):hover { background: #f8faff !important; }

  /* Fade-in rows */
  @keyframes at-fadein {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .at-row-anim {
    animation: at-fadein 0.25s ease both;
  }

  /* Input focus */
  .at-input:focus {
    border-color: #2563eb !important;
    box-shadow: 0 0 0 3px rgba(37,99,235,0.10) !important;
    outline: none;
  }

  /* Avatar */
  .at-avatar {
    width: 36px; height: 36px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 700; flex-shrink: 0;
  }

  /* Icon btn hover */
  .at-icon-btn { transition: background 0.12s, color 0.12s, border-color 0.12s; }
  .at-icon-btn:hover { filter: brightness(0.92); }

  /* Badge */
  .at-badge {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 11px; font-weight: 600; padding: 3px 9px;
    border-radius: 20px; letter-spacing: 0.01em; white-space: nowrap;
  }

  /* Overlay backdrop */
  .at-overlay {
    position: fixed; inset: 0; z-index: 999;
    background: rgba(15,21,36,0.45);
    backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center; padding: 16px;
  }

  /* Modal */
  .at-modal {
    background: #fff; border-radius: 20px;
    width: 100%; box-shadow: 0 24px 80px rgba(0,0,0,0.18);
    overflow: hidden;
    animation: at-fadein 0.2s ease both;
  }

  /* Toggle switch */
  .at-toggle-track {
    width: 36px; height: 20px; border-radius: 20px;
    display: flex; align-items: center; padding: 2px;
    cursor: pointer; transition: background 0.2s; flex-shrink: 0;
  }
  .at-toggle-thumb {
    width: 16px; height: 16px; border-radius: 50%; background: #fff;
    transition: transform 0.2s;
  }
`;

/* ─── Avatar color by initials ───────────────────────────────────────────── */
const AVATAR_COLORS = [
  { bg: "#e0e7ff", color: "#4338ca" },
  { bg: "#fce7f3", color: "#be185d" },
  { bg: "#d1fae5", color: "#065f46" },
  { bg: "#fef3c7", color: "#92400e" },
  { bg: "#ede9fe", color: "#5b21b6" },
  { bg: "#fee2e2", color: "#991b1b" },
  { bg: "#e0f2fe", color: "#0369a1" },
];
const getAvatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
const getInitials = (name: string) => name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function AdminTable() {
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  const [editTarget, setEditTarget] = useState<AdminAccount | null>(null);
  const [editForm, setEditForm] = useState<EditFormData>(EMPTY_EDIT);
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminAccount | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [permTarget, setPermTarget] = useState<AdminAccount | null>(null);

  const currentUser = getCachedAdmin();
  const currentUserId = currentUser?._id || currentUser?.id;

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setAdmins(await getAllAdmins()); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = admins.filter(a =>
    !search ||
    a.fullName.toLowerCase().includes(search.toLowerCase()) ||
    a.username.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!form.username || !form.password || !form.fullName) { setCreateError("Vui lòng điền đầy đủ thông tin"); return; }
    setCreating(true); setCreateError("");
    try {
      await createAdmin({ username: form.username, password: form.password, fullName: form.fullName, isSuperAdmin: form.isSuperAdmin, adminPermissions: form.isSuperAdmin ? null : form.permissions } as CreateAdminPayload);
      setShowCreate(false); setForm(EMPTY_FORM); load();
    } catch (e: unknown) { setCreateError(e instanceof Error ? e.message : "Lỗi tạo admin"); }
    finally { setCreating(false); }
  };

  const openEdit = (admin: AdminAccount) => { setEditTarget(admin); setEditForm({ password: "", fullName: admin.fullName }); setEditError(""); };

  const handleEdit = async () => {
    if (!editTarget) return;
    setSaving(true); setEditError("");
    try {
      const payload: UpdateAdminPayload = {};
      if (editForm.fullName && editForm.fullName !== editTarget.fullName) payload.fullName = editForm.fullName;
      if (editForm.password) payload.password = editForm.password;
      if (!Object.keys(payload).length) { setEditError("Không có thay đổi nào"); setSaving(false); return; }
      await updateAdmin(editTarget._id, payload);
      setEditTarget(null); load();
    } catch (e: unknown) { setEditError(e instanceof Error ? e.message : "Lỗi cập nhật"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await deleteAdmin(deleteTarget._id); setDeleteTarget(null); load(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Lỗi xóa admin"); setDeleteTarget(null); }
    finally { setDeleting(false); }
  };

  const handleToggle = async (admin: AdminAccount) => {
    try { await toggleAdminActive(admin._id); load(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Lỗi cập nhật trạng thái"); }
  };

  /* ── Shared input style ─────────────────────────────────────────────── */
  const inputStyle: React.CSSProperties = {
    width: "100%", height: 44, padding: "0 14px",
    borderRadius: 12, border: "1.5px solid #e2e8f0",
    background: "#f8fafc", fontSize: 13, color: "#0f172a",
    transition: "border-color 0.15s, box-shadow 0.15s",
  };

  const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 };

  /* ─── Render ────────────────────────────────────────────────────────── */
  return (
    <div className="at-wrap">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0, letterSpacing: "-0.4px" }}>
            Quản lý Admin
          </h1>
          <p style={{ fontSize: 13, color: "#64748b", margin: "5px 0 0" }}>
            {admins.length} tài khoản quản trị viên
          </p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setCreateError(""); setForm(EMPTY_FORM); }}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "10px 18px", background: "#0f2544", color: "#fff",
            border: "none", borderRadius: 12, fontSize: 13, fontWeight: 600,
            cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
          }}
        >
          <TbPlus size={17} /> Thêm Admin
        </button>
      </div>

      {/* ── Error ───────────────────────────────────────────────────── */}
      {error && (
        <div style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 10, padding: "11px 16px", color: "#dc2626", fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* ── Search bar ──────────────────────────────────────────────── */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <FiSearch size={15} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
        <input
          className="at-input"
          placeholder="Tìm theo tên hoặc tài khoản..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, paddingLeft: 40, paddingRight: search ? 36 : 14 }}
        />
        {search && (
          <button onClick={() => setSearch("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", cursor: "pointer", color: "#94a3b8", display: "flex" }}>
            <FiX size={14} />
          </button>
        )}
      </div>

      {/* ── Table card ──────────────────────────────────────────────── */}
      <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #edf2f7", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>

        {/* Table head */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 140px 130px 150px 116px",
          padding: "11px 20px",
          background: "#f8fafc",
          borderBottom: "1px solid #edf2f7",
          fontSize: 11, fontWeight: 700, color: "#94a3b8",
          textTransform: "uppercase", letterSpacing: "0.07em",
        }}>
          <span>Thành viên</span>
          <span>Loại</span>
          <span>Quyền</span>
          <span>Trạng thái</span>
          <span style={{ textAlign: "right" }}>Thao tác</span>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ padding: "52px 20px", textAlign: "center" }}>
            <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, border: "3px solid #e2e8f0", borderTopColor: "#2563eb", borderRadius: "50%", animation: "at-spin 0.7s linear infinite" }} />
              <span style={{ fontSize: 13, color: "#94a3b8" }}>Đang tải...</span>
            </div>
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div style={{ padding: "52px 20px", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
            {search ? `Không tìm thấy kết quả cho "${search}"` : "Chưa có tài khoản admin nào"}
          </div>
        )}

        {/* Rows */}
        {!loading && filtered.map((admin, idx) => {
          const isSelf = admin._id === currentUserId;
          const av = getAvatarColor(admin.fullName);
          const permCount = admin.isSuperAdmin || admin.adminPermissions === null
            ? "Toàn quyền"
            : `${admin.adminPermissions.length}/8 quyền`;
          // null = toàn quyền (super admin không bị giới hạn)
          // [] = không có quyền nào (mới tạo, chưa phân quyền)
          // [...] = có quyền cụ thể
          const isSuperAdminRole = admin.isSuperAdmin || admin.adminPermissions === null;
          const permStyle = isSelf
            ? { bg: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }
            : isSuperAdminRole
              ? { bg: "#ede9fe", color: "#5b21b6", border: "none" }
              : { bg: "#f0f9ff", color: "#0369a1", border: "none" };

          return (
            <div
              key={admin._id}
              className={`at-row at-row-anim${isSelf ? " at-self-row" : ""}`}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 140px 130px 150px 116px",
                padding: isSelf ? "13px 18px" : "12px 20px",
                alignItems: "center",
                borderBottom: idx < filtered.length - 1 ? "1px solid #f1f5f9" : "none",
                background: isSelf ? undefined : "#fff",
                animationDelay: `${idx * 40}ms`,
              }}
            >
              {/* Thành viên */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div className="at-avatar" style={{ background: isSelf ? "#fef3c7" : av.bg, color: isSelf ? "#92400e" : av.color, border: isSelf ? "2px solid #fbbf24" : "none" }}>
                    {getInitials(admin.fullName)}
                  </div>
                  {isSelf && (
                    <div style={{
                      position: "absolute", top: -8, left: -8,
                      width: 22, height: 22, borderRadius: "50%",
                      background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
                      border: "2px solid #fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, boxShadow: "0 2px 6px rgba(245,158,11,0.5)",
                    }}>
                      <svg width="12" height="10" viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 8.5H11M1.5 4L3.5 6.5L6 1L8.5 6.5L10.5 4L11 8.5H1L1.5 4Z" stroke="#92400e" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="1.5" cy="3.5" r="1" fill="#f59e0b"/>
                        <circle cx="6" cy="1" r="1" fill="#f59e0b"/>
                        <circle cx="10.5" cy="3.5" r="1" fill="#f59e0b"/>
                      </svg>
                    </div>
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a", display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{admin.fullName}</span>
                    {isSelf && (
                      <span className="at-badge" style={{ background: "#fef3c7", color: "#92400e", fontSize: 10, border: "1px solid #fde68a" }}>
                        ★ Bạn
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: isSelf ? "#b45309" : "#94a3b8", marginTop: 2, fontFamily: "monospace", fontWeight: isSelf ? 600 : 400 }}>
                    @{admin.username}
                  </div>
                </div>
              </div>

              {/* Loại */}
              <div>
                {isSuperAdminRole
                  ? <span className="at-badge" style={{ background: isSelf ? "#fef3c7" : "#fef9c3", color: isSelf ? "#92400e" : "#854d0e", border: `1px solid ${isSelf ? "#fde68a" : "#fef08a"}` }}>
                      Super Admin
                    </span>
                  : <span className="at-badge" style={{ background: "#f0f9ff", color: "#0369a1" }}>Admin</span>}
              </div>

              {/* Quyền */}
              <div>
                <span className="at-badge" style={{ background: permStyle.bg, color: permStyle.color, border: permStyle.border }}>
                  {permCount}
                </span>
              </div>

              {/* Trạng thái — toggle switch */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  className="at-toggle-track"
                  style={{ background: admin.isActive ? "#22c55e" : "#e2e8f0", cursor: isSelf ? "not-allowed" : "pointer", opacity: isSelf ? 0.6 : 1 }}
                  onClick={() => !isSelf && handleToggle(admin)}
                  title={admin.isActive ? "Nhấn để vô hiệu hóa" : "Nhấn để kích hoạt"}
                >
                  <div className="at-toggle-thumb" style={{ transform: admin.isActive ? "translateX(16px)" : "translateX(0)" }} />
                </div>
                <span style={{ fontSize: 12, color: admin.isActive ? "#16a34a" : "#94a3b8", fontWeight: 500 }}>
                  {admin.isActive ? "Hoạt động" : "Vô hiệu"}
                </span>
              </div>

              {/* Thao tác */}
              <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
                {[
                  { icon: <FiShield size={13} />, title: "Phân quyền", color: "#7c3aed", bg: "#f5f3ff", onClick: () => setPermTarget(admin), disabled: false },
                  { icon: <FiEdit2 size={13} />, title: "Chỉnh sửa", color: "#2563eb", bg: "#eff6ff", onClick: () => openEdit(admin), disabled: false },
                  { icon: <FiTrash2 size={13} />, title: "Xóa", color: "#dc2626", bg: "#fff5f5", onClick: () => !isSelf && setDeleteTarget(admin), disabled: isSelf },
                ].map((btn, i) => (
                  <button
                    key={i}
                    title={btn.title}
                    className="at-icon-btn"
                    disabled={btn.disabled}
                    onClick={btn.onClick}
                    style={{
                      width: 30, height: 30, borderRadius: 8,
                      border: `1.5px solid ${btn.bg}`,
                      background: btn.bg,
                      color: btn.color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: btn.disabled ? "not-allowed" : "pointer",
                      opacity: btn.disabled ? 0.35 : 1,
                    }}
                  >
                    {btn.icon}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ══ Create Modal ══════════════════════════════════════════════════ */}
      {showCreate && (
        <div className="at-overlay" onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div className="at-modal" style={{ maxWidth: 460 }}>
            <div style={{ padding: "22px 26px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>Thêm tài khoản Admin</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>Điền thông tin để tạo tài khoản mới</div>
              </div>
              <button onClick={() => setShowCreate(false)} style={{ border: "none", background: "#f1f5f9", borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center" }}><FiX size={16} /></button>
            </div>
            <div style={{ padding: "24px 26px" }}>
              {createError && <div style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", color: "#dc2626", fontSize: 13, marginBottom: 16 }}>{createError}</div>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>Tên đăng nhập *</label>
                  <input className="at-input" style={inputStyle} placeholder="admin_nguyen" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Họ và tên *</label>
                  <input className="at-input" style={inputStyle} placeholder="Nguyễn Văn A" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
                </div>
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>Mật khẩu *</label>
                <input className="at-input" style={inputStyle} type="password" placeholder="Tối thiểu 8 ký tự" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              {/* Super Admin toggle */}
              <label style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: form.isSuperAdmin ? 22 : 14, cursor: "pointer", padding: "12px 14px", borderRadius: 12, border: `1.5px solid ${form.isSuperAdmin ? "#fde68a" : "#e2e8f0"}`, background: form.isSuperAdmin ? "#fffbeb" : "#f8fafc" }}>
                <input type="checkbox" checked={form.isSuperAdmin} onChange={e => setForm(f => ({ ...f, isSuperAdmin: e.target.checked, permissions: e.target.checked ? [] : f.permissions }))} style={{ width: 16, height: 16, accentColor: "#f59e0b", marginTop: 1, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>

                    Super Admin
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Toàn quyền hệ thống, không thể bị giới hạn</div>
                </div>
              </label>

              {/* Permissions grid — chỉ hiện khi KHÔNG phải Super Admin */}
              {!form.isSuperAdmin && (
                <div style={{ marginBottom: 22 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
                    Phân quyền
                    <span style={{ fontWeight: 400, color: "#94a3b8", marginLeft: 6 }}>
                      ({form.permissions.length}/{ALL_PERMISSIONS.length} quyền được chọn)
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {ALL_PERMISSIONS.map(p => {
                      const checked = form.permissions.includes(p.key);
                      return (
                        <label key={p.key} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", borderRadius: 10, border: `1.5px solid ${checked ? "#bfdbfe" : "#e2e8f0"}`, background: checked ? "#eff6ff" : "#f8fafc", cursor: "pointer", transition: "all 0.12s" }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={e => setForm(f => ({
                              ...f,
                              permissions: e.target.checked
                                ? [...f.permissions, p.key]
                                : f.permissions.filter(x => x !== p.key)
                            }))}
                            style={{ width: 14, height: 14, accentColor: "#2563eb", flexShrink: 0 }}
                          />
                          <span style={{ fontSize: 12, fontWeight: checked ? 600 : 400, color: checked ? "#1d4ed8" : "#475569" }}>
                            {p.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {/* Select all / Deselect all */}
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button type="button" onClick={() => setForm(f => ({ ...f, permissions: ALL_PERMISSIONS.map(p => p.key) }))} style={{ fontSize: 11, color: "#2563eb", background: "none", border: "none", cursor: "pointer", padding: "2px 0", fontWeight: 500 }}>
                      Chọn tất cả
                    </button>
                    <span style={{ color: "#e2e8f0" }}>|</span>
                    <button type="button" onClick={() => setForm(f => ({ ...f, permissions: [] }))} style={{ fontSize: 11, color: "#64748b", background: "none", border: "none", cursor: "pointer", padding: "2px 0", fontWeight: 500 }}>
                      Bỏ chọn tất cả
                    </button>
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setShowCreate(false)} style={{ padding: "10px 18px", borderRadius: 11, border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Hủy</button>
                <button onClick={handleCreate} disabled={creating} style={{ padding: "10px 20px", borderRadius: 11, border: "none", background: "#0f2544", color: "#fff", fontSize: 13, fontWeight: 600, cursor: creating ? "not-allowed" : "pointer", opacity: creating ? 0.7 : 1 }}>
                  {creating ? "Đang tạo..." : "Tạo tài khoản"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ Edit Modal ════════════════════════════════════════════════════ */}
      {editTarget && (
        <div className="at-overlay" onClick={e => { if (e.target === e.currentTarget) setEditTarget(null); }}>
          <div className="at-modal" style={{ maxWidth: 420 }}>
            <div style={{ padding: "22px 26px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="at-avatar" style={{ ...getAvatarColor(editTarget.fullName) }}>
                  {getInitials(editTarget.fullName)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{editTarget.fullName}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>@{editTarget.username}</div>
                </div>
              </div>
              <button onClick={() => setEditTarget(null)} style={{ border: "none", background: "#f1f5f9", borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center" }}><FiX size={16} /></button>
            </div>
            <div style={{ padding: "24px 26px" }}>
              {editError && <div style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", color: "#dc2626", fontSize: 13, marginBottom: 16 }}>{editError}</div>}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Họ và tên</label>
                <input className="at-input" style={inputStyle} value={editForm.fullName} onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))} />
              </div>
              <div style={{ marginBottom: 22 }}>
                <label style={labelStyle}>Mật khẩu mới <span style={{ fontWeight: 400, color: "#94a3b8" }}>(để trống nếu không đổi)</span></label>
                <input className="at-input" style={inputStyle} type="password" placeholder="••••••••" value={editForm.password} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setEditTarget(null)} style={{ padding: "10px 18px", borderRadius: 11, border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Hủy</button>
                <button onClick={handleEdit} disabled={saving} style={{ padding: "10px 20px", borderRadius: 11, border: "none", background: "#0f2544", color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ Delete Confirm ════════════════════════════════════════════════ */}
      <AdminConfirmDialog
        isOpen={!!deleteTarget}
        title="Xóa tài khoản Admin"
        message={`Bạn có chắc muốn xóa tài khoản "${deleteTarget?.fullName}" (@${deleteTarget?.username})? Hành động này không thể hoàn tác.`}
        confirmText={deleting ? "Đang xóa..." : "Xóa"}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* ══ Permissions Modal ═════════════════════════════════════════════ */}
      {permTarget && (
        <AdminPermissionsModal
          adminId={permTarget._id}
          adminName={permTarget.fullName}
          currentUserId={currentUserId}
          onClose={() => setPermTarget(null)}
          onUpdated={() => { load(); setPermTarget(null); }}
        />
      )}
    </div>
  );
}