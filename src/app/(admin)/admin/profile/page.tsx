"use client";

import type { ReactNode } from "react";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FiEdit3, FiMail, FiMapPin, FiPhone, FiShield,
  FiUser, FiClock, FiHash, FiLayers,
  FiCheckCircle, FiXCircle, FiCalendar, FiGrid,
  FiActivity, FiMonitor, FiLogOut, FiLock, FiSave, FiX,
  FiAlertCircle, FiEye, FiEyeOff,
} from "react-icons/fi";
import ToastContainer from "@/components/ToastContainer";
import { clearAdminSession } from "@/lib/admin-auth";
import { adminPath } from "@/lib/admin-base";
import { useToast } from "@/hooks/useToast";
import { AdminProfile, getMyProfile, updateMyProfile } from "@/services/auth.service";

const getLoginPath = () => adminPath("/admin/login");

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap');

  .pp *, .pp *::before, .pp *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .pp {
    min-height: 100%;
    padding: 28px 32px;
    font-family: 'Outfit', system-ui, sans-serif;
    color: #0f172a;
    background: #f0f4f8;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .anim { opacity: 0; animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) forwards; }
  .d0 { animation-delay: 0s; }
  .d1 { animation-delay: 0.07s; }
  .d2 { animation-delay: 0.14s; }
  .d3 { animation-delay: 0.21s; }
  .d4 { animation-delay: 0.28s; }

  @keyframes pulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(74,222,128,0.55); }
    50%      { box-shadow: 0 0 0 5px rgba(74,222,128,0); }
  }
  .pulse-dot { width: 7px; height: 7px; border-radius: 50%; background: #4ade80; animation: pulse 2s ease-in-out infinite; display: inline-block; }

  @keyframes shimmer {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  .pp-grid {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 22px;
    align-items: start;
  }
  @media (max-width: 900px) { .pp-grid { grid-template-columns: 1fr; } }

  .sidebar { display: flex; flex-direction: column; gap: 14px; }

  .hero-card {
    border-radius: 20px;
    background: #0f2744;
    padding: 0;
    overflow: hidden;
    position: relative;
  }
  .hero-banner {
    height: 72px;
    background: linear-gradient(135deg, #1a3a5c 0%, #0a1f38 100%);
    position: relative;
    overflow: hidden;
  }
  .hero-banner::before {
    content: '';
    position: absolute; inset: 0;
    background-image: repeating-linear-gradient(
      -45deg,
      transparent, transparent 6px,
      rgba(255,255,255,0.025) 6px, rgba(255,255,255,0.025) 7px
    );
  }
  .hero-banner-circle {
    position: absolute; right: -30px; top: -30px;
    width: 120px; height: 120px; border-radius: 50%;
    background: rgba(255,255,255,0.04);
  }
  .hero-banner-circle2 {
    position: absolute; left: 20px; bottom: -40px;
    width: 90px; height: 90px; border-radius: 50%;
    background: rgba(255,255,255,0.03);
  }

  .hero-body { padding: 0 22px 22px; }

  .avatar-wrap { margin-top: -30px; margin-bottom: 12px; position: relative; display: inline-flex; }
  .avatar {
    width: 72px; height: 72px; border-radius: 16px;
    background: linear-gradient(135deg, #1e5ba8, #0f3870);
    border: 3px solid #0f2744;
    display: flex; align-items: center; justify-content: center;
    font-size: 24px; font-weight: 800; color: #fff;
    letter-spacing: -1px; position: relative; overflow: hidden;
  }
  .avatar::after {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.15) 50%, transparent 75%);
    animation: shimmer 2.8s ease-in-out infinite;
  }
  .status-ring {
    position: absolute; bottom: -2px; right: -2px;
    width: 18px; height: 18px; border-radius: 50%;
    border: 3px solid #0f2744;
    display: flex; align-items: center; justify-content: center;
  }
  .status-ring-dot { width: 8px; height: 8px; border-radius: 50%; }

  .hero-name { font-size: 17px; font-weight: 700; color: #fff; margin-bottom: 2px; letter-spacing: -0.3px; }
  .hero-username { font-size: 12px; color: rgba(255,255,255,0.4); font-family: 'JetBrains Mono', monospace; margin-bottom: 14px; }

  .hero-pills { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 18px; }

  .hero-divider { height: 1px; background: rgba(255,255,255,0.07); margin-bottom: 14px; }

  .hero-stat {
    display: flex; align-items: center; gap: 10px;
    padding: 7px 0; border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .hero-stat:last-child { border-bottom: none; padding-bottom: 0; }
  .hero-stat-ico { color: rgba(255,255,255,0.28); display: flex; flex-shrink: 0; }
  .hero-stat-lbl { font-size: 11px; color: rgba(255,255,255,0.38); flex: 1; }
  .hero-stat-val { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.75); }

  .side-actions { display: flex; gap: 8px; }
  .side-btn {
    flex: 1; height: 40px; border-radius: 11px;
    display: flex; align-items: center; justify-content: center; gap: 7px;
    font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid;
    font-family: 'Outfit', inherit; transition: all 0.17s;
  }
  .side-btn-edit { background: #fff; color: #0f2744; border-color: #dde5ef; }
  .side-btn-edit:hover { background: #f7faff; border-color: #b8ccdf; box-shadow: 0 3px 10px rgba(15,39,68,0.1); transform: translateY(-1px); }
  .side-btn-logout { background: #fff5f5; color: #dc2626; border-color: #fecaca; }
  .side-btn-logout:hover { background: #fee2e2; box-shadow: 0 3px 10px rgba(220,38,38,0.1); transform: translateY(-1px); }

  .counter-card {
    background: #fff; border-radius: 14px;
    border: 1px solid #e4eaf1; overflow: hidden;
  }
  .counter-head {
    display: flex; align-items: center; gap: 8px;
    padding: 11px 16px; border-bottom: 1px solid #f1f5f9;
    background: #fafbfd;
  }
  .counter-head-ico { color: #0f2744; display: flex; }
  .counter-head-ttl { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; }
  .counter-body { padding: 14px 16px; }
  .counter-name { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 3px; }
  .counter-code { font-size: 11px; color: #94a3b8; font-family: 'JetBrains Mono', monospace; margin-bottom: 10px; }

  .pp-main { display: flex; flex-direction: column; gap: 16px; }

  .stat-bar {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
  }
  .stat-card {
    background: #fff; border-radius: 14px; border: 1px solid #e4eaf1;
    padding: 16px 18px; display: flex; align-items: center; gap: 14px;
    transition: box-shadow 0.17s;
  }
  .stat-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.07); }
  .stat-ico {
    width: 40px; height: 40px; border-radius: 11px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .stat-lbl { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 3px; }
  .stat-val { font-size: 16px; font-weight: 700; color: #0f172a; }

  .tabs {
    display: flex; gap: 3px;
    background: #fff; border: 1px solid #e4eaf1; border-radius: 13px; padding: 5px;
  }
  .tab {
    display: inline-flex; align-items: center; gap: 6px;
    height: 34px; padding: 0 14px; border-radius: 9px;
    font-size: 13px; font-weight: 600; cursor: pointer;
    border: none; background: transparent; color: #64748b;
    transition: all 0.16s; font-family: 'Outfit', inherit; white-space: nowrap;
  }
  .tab:hover:not(.tab-active) { color: #0f2744; background: #f0f4f8; }
  .tab.tab-active { background: #0f2744; color: #fff; }

  .panel {
    background: #fff; border: 1px solid #e4eaf1; border-radius: 16px; overflow: hidden;
  }
  .panel-head {
    display: flex; align-items: center; gap: 10px;
    padding: 14px 20px; border-bottom: 1px solid #f1f5f9; background: #fafbfd;
  }
  .panel-ico { width: 28px; height: 28px; border-radius: 8px; background: #eef3fa; color: #0f2744; display: flex; align-items: center; justify-content: center; }
  .panel-ttl { font-size: 13px; font-weight: 700; color: #0f172a; }

  .field-grid { display: grid; grid-template-columns: 1fr 1fr; }
  @media (max-width: 640px) { .field-grid { grid-template-columns: 1fr; } }
  .field-grid .field:nth-child(odd):not(.field-span) { border-right: 1px solid #f8fafc; }
  .field-span { grid-column: 1 / -1; border-right: none !important; }

  .field {
    display: flex; align-items: center; gap: 12px;
    padding: 13px 20px; border-bottom: 1px solid #f8fafc; transition: background 0.14s;
  }
  .field:last-child { border-bottom: none; }
  .field-grid .field:nth-last-child(2):nth-child(odd) { border-bottom: none; }
  .field:hover { background: #f8fafc; }
  .field-ico {
    width: 32px; height: 32px; border-radius: 8px;
    background: #f1f5f9; color: #64748b;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    transition: background 0.14s, color 0.14s;
  }
  .field:hover .field-ico { background: #eef3fa; color: #0f2744; }
  .field-lbl { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 3px; }
  .field-val { font-size: 13.5px; font-weight: 500; color: #0f172a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .field-val.mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #475569; }

  .timeline { padding: 6px 20px 10px; }
  .tl-item { display: flex; gap: 14px; padding: 12px 0; border-bottom: 1px solid #f8fafc; }
  .tl-item:last-child { border-bottom: none; }
  .tl-col { display: flex; flex-direction: column; align-items: center; }
  .tl-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; margin-top: 2px; }
  .tl-line { width: 1px; flex: 1; background: #e8edf3; margin-top: 5px; }
  .tl-body { flex: 1; }
  .tl-ttl { font-size: 13px; font-weight: 600; color: #0f172a; margin-bottom: 2px; }
  .tl-time { font-size: 11px; color: #94a3b8; font-family: 'JetBrains Mono', monospace; }

  .services-wrap { padding: 18px 20px; display: flex; flex-wrap: wrap; gap: 8px; }
  .svc-empty { padding: 36px 20px; text-align: center; color: #94a3b8; font-size: 14px; }

  .pill {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 10px 3px 7px; border-radius: 999px;
    font-size: 11px; font-weight: 600; letter-spacing: 0.02em; border: 1px solid;
    white-space: nowrap;
  }
  .pill-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
  .pill-blue   { background:#dbeafe; color:#1d4ed8; border-color:#bfdbfe; }
  .pill-green  { background:#dcfce7; color:#15803d; border-color:#bbf7d0; }
  .pill-red    { background:#fee2e2; color:#dc2626; border-color:#fecaca; }
  .pill-gray   { background:#f1f5f9; color:#475569; border-color:#e2e8f0; }
  .pill-white  { background:rgba(255,255,255,0.14); color:#fff; border-color:rgba(255,255,255,0.28); }
  .pill-gw     { background:rgba(74,222,128,0.18); color:#86efac; border-color:rgba(74,222,128,0.3); }
  .pill-rw     { background:rgba(252,165,165,0.18); color:#fca5a5; border-color:rgba(252,165,165,0.3); }
  .pill-amber  { background:#fef3c7; color:#b45309; border-color:#fde68a; }

  /* ─── MODAL ─── */
  .modal-backdrop {
    position: fixed; inset: 0; z-index: 1000;
    background: rgba(10,20,40,0.55);
    backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    padding: 16px;
  }
  @keyframes modalIn {
    from { opacity: 0; transform: scale(0.95) translateY(12px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  .modal {
    background: #fff;
    border-radius: 20px;
    width: 100%;
    max-width: 540px;
    max-height: 90vh;
    overflow-y: auto;
    animation: modalIn 0.25s cubic-bezier(0.22,1,0.36,1);
    box-shadow: 0 24px 60px rgba(0,0,0,0.2);
  }
  .modal-head {
    display: flex; align-items: center; gap: 12px;
    padding: 20px 24px 16px;
    border-bottom: 1px solid #f1f5f9;
    position: sticky; top: 0; background: #fff; z-index: 1;
    border-radius: 20px 20px 0 0;
  }
  .modal-head-ico {
    width: 36px; height: 36px; border-radius: 10px;
    background: #eef3fa; color: #0f2744;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .modal-head-text { flex: 1; min-width: 0; }
  .modal-head-title { font-size: 15px; font-weight: 700; color: #0f172a; }
  .modal-head-sub { font-size: 12px; color: #94a3b8; margin-top: 1px; }
  .modal-close {
    width: 32px; height: 32px; border-radius: 8px;
    border: 1px solid #e4eaf1; background: #f8fafc;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: #64748b; transition: all 0.15s;
    flex-shrink: 0; margin-left: auto;
  }
  .modal-close:hover { background: #fee2e2; border-color: #fecaca; color: #dc2626; }

  .modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 18px; }

  .modal-section-title {
    font-size: 11px; font-weight: 700; color: #64748b;
    text-transform: uppercase; letter-spacing: 0.08em;
    padding-bottom: 10px; border-bottom: 1px solid #f1f5f9;
    display: flex; align-items: center; gap: 7px;
  }

  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 480px) { .form-row { grid-template-columns: 1fr; } }

  .form-group { display: flex; flex-direction: column; gap: 6px; }
  .form-group.full { grid-column: 1/-1; }
  .form-label {
    font-size: 12px; font-weight: 600; color: #475569;
    display: flex; align-items: center; gap: 5px;
  }
  .form-label svg { color: #94a3b8; }
  .form-input {
    height: 40px; border-radius: 10px;
    border: 1.5px solid #e4eaf1;
    padding: 0 12px;
    font-size: 13.5px; font-weight: 500; color: #0f172a;
    font-family: 'Outfit', inherit;
    transition: border-color 0.15s, box-shadow 0.15s;
    outline: none; background: #fafbfd;
    width: 100%;
  }
  .form-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); background: #fff; }
  .form-input:disabled { background: #f1f5f9; color: #94a3b8; cursor: not-allowed; }
  .form-input.error { border-color: #f87171; box-shadow: 0 0 0 3px rgba(248,113,113,0.1); }

  .form-hint { font-size: 11px; color: #94a3b8; }
  .form-error { font-size: 11px; color: #dc2626; display: flex; align-items: center; gap: 4px; }

  .pw-toggle-wrap { position: relative; }
  .pw-toggle-wrap .form-input { padding-right: 40px; }
  .pw-toggle {
    position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer; color: #94a3b8;
    display: flex; align-items: center;
    transition: color 0.15s; padding: 0;
  }
  .pw-toggle:hover { color: #0f2744; }

  .modal-footer {
    display: flex; gap: 10px; justify-content: flex-end;
    padding: 16px 24px 20px;
    border-top: 1px solid #f1f5f9;
    position: sticky; bottom: 0; background: #fff;
    border-radius: 0 0 20px 20px;
  }
  .btn {
    height: 40px; padding: 0 18px; border-radius: 10px;
    font-size: 13px; font-weight: 600; cursor: pointer;
    display: flex; align-items: center; gap: 7px;
    font-family: 'Outfit', inherit; transition: all 0.17s; border: 1px solid;
  }
  .btn-cancel { background: #f8fafc; color: #64748b; border-color: #e4eaf1; }
  .btn-cancel:hover { background: #f1f5f9; }
  .btn-save { background: #0f2744; color: #fff; border-color: #0f2744; }
  .btn-save:hover:not(:disabled) { background: #1a3a5c; box-shadow: 0 4px 14px rgba(15,39,68,0.25); transform: translateY(-1px); }
  .btn-save:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

  @keyframes spin { to { transform: rotate(360deg); } }
  .spinner {
    width: 14px; height: 14px; border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    animation: spin 0.7s linear infinite;
  }
`;

const fmt      = (r?: string) => r === "admin" ? "Quản trị viên" : r === "staff" ? "Nhân viên" : r || "—";
const getName  = (u: AdminProfile) => u.fullName?.trim() || u.username?.trim() || "Admin";
const getVal   = (v?: string | null) => v?.trim() || "Chưa cập nhật";
const getInit  = (n: string) => n.split(" ").slice(-2).map(w => w[0]?.toUpperCase() ?? "").join("");
const fmtDate  = (v?: string | null) => {
  if (!v) return "—";
  return new Date(v).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
};
const fmtShort = (v?: string | null) => {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};

function Pill({ cls, children }: { cls: string; children: ReactNode }) {
  return <span className={`pill ${cls}`}><span className="pill-dot" />{children}</span>;
}

function Field({ icon, label, value, mono, span, children }: {
  icon: ReactNode; label: string; value?: string; mono?: boolean; span?: boolean; children?: ReactNode;
}) {
  return (
    <div className={`field${span ? " field-span" : ""}`}>
      <div className="field-ico">{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="field-lbl">{label}</div>
        <div className={`field-val${mono ? " mono" : ""}`}>{children ?? value ?? "—"}</div>
      </div>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-ico">{icon}</div>
        <span className="panel-ttl">{title}</span>
      </div>
      {children}
    </div>
  );
}

// ── Edit Modal ──
type EditForm = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type EditErrors = Partial<Record<keyof EditForm, string>>;

function EditModal({
  user,
  onClose,
  onSaved,
}: {
  user: AdminProfile;
  onClose: () => void;
  onSaved: (updated: AdminProfile) => void;
}) {
  const [form, setForm] = useState<EditForm>({
    fullName: user.fullName || "",
    email: user.email || "",
    phone: user.phone || "",
    address: user.address || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<EditErrors>({});
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [apiError, setApiError] = useState("");
  const backdropRef = useRef<HTMLDivElement>(null);

  const set = (field: keyof EditForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setErrors(er => ({ ...er, [field]: undefined }));
    setApiError("");
  };

  const validate = (): boolean => {
    const errs: EditErrors = {};
    if (!form.fullName.trim()) errs.fullName = "Họ và tên không được để trống";
    else if (form.fullName.trim().length < 2) errs.fullName = "Ít nhất 2 ký tự";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Email không hợp lệ";
    if (form.phone && !/^[0-9+\-\s()]{7,20}$/.test(form.phone)) errs.phone = "Số điện thoại không hợp lệ";
    if (form.newPassword) {
      if (!form.currentPassword) errs.currentPassword = "Nhập mật khẩu hiện tại để đổi";
      if (form.newPassword.length < 6) errs.newPassword = "Ít nhất 6 ký tự";
      if (form.newPassword !== form.confirmPassword) errs.confirmPassword = "Mật khẩu xác nhận không khớp";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setApiError("");
    try {
      const payload: Parameters<typeof updateMyProfile>[0] = {
        fullName: form.fullName.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
      };
      if (form.newPassword) {
        payload.currentPassword = form.currentPassword;
        payload.newPassword = form.newPassword;
      }
      const updated = await updateMyProfile(payload);
      onSaved(updated);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  const ErrMsg = ({ field }: { field: keyof EditForm }) =>
    errors[field] ? (
      <span className="form-error">
        <FiAlertCircle size={11} />{errors[field]}
      </span>
    ) : null;

  return (
    <div className="modal-backdrop" ref={backdropRef} onClick={handleBackdropClick}>
      <div className="modal" role="dialog" aria-modal="true">

        {/* Header — icon bên trái, nút X bên phải */}
        <div className="modal-head">
          <div className="modal-head-ico"><FiEdit3 size={16} /></div>
          <div className="modal-head-text">
            <div className="modal-head-title">Chỉnh sửa hồ sơ</div>
            <div className="modal-head-sub">Cập nhật thông tin cá nhân của bạn</div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Đóng">
            <FiX size={15} />
          </button>
        </div>

        <div className="modal-body">
          {apiError && (
            <div style={{
              background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 10,
              padding: "10px 14px", fontSize: 13, color: "#dc2626",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <FiAlertCircle size={15} />{apiError}
            </div>
          )}

          {/* Basic info */}
          <div>
            <div className="modal-section-title">
              <FiUser size={12} />Thông tin cơ bản
            </div>
          </div>

          <div className="form-row">
            <div className="form-group full">
              <label className="form-label"><FiUser size={12} />Họ và tên</label>
              <input
                className={`form-input${errors.fullName ? " error" : ""}`}
                value={form.fullName}
                onChange={set("fullName")}
                placeholder="Nguyễn Văn A"
              />
              <ErrMsg field="fullName" />
            </div>

            <div className="form-group">
              <label className="form-label"><FiUser size={12} />Tên đăng nhập</label>
              <input className="form-input" value={user.username || ""} disabled />
              <span className="form-hint">Không thể thay đổi</span>
            </div>

            <div className="form-group">
              <label className="form-label"><FiShield size={12} />Vai trò</label>
              <input className="form-input" value={fmt(user.role)} disabled />
              <span className="form-hint">Không thể thay đổi</span>
            </div>
          </div>

          {/* Contact */}
          <div>
            <div className="modal-section-title">
              <FiPhone size={12} />Thông tin liên hệ
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label"><FiMail size={12} />Email</label>
              <input
                className={`form-input${errors.email ? " error" : ""}`}
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="example@email.com"
              />
              <ErrMsg field="email" />
            </div>

            <div className="form-group">
              <label className="form-label"><FiPhone size={12} />Điện thoại</label>
              <input
                className={`form-input${errors.phone ? " error" : ""}`}
                value={form.phone}
                onChange={set("phone")}
                placeholder="0901 234 567"
              />
              <ErrMsg field="phone" />
            </div>

            <div className="form-group full">
              <label className="form-label"><FiMapPin size={12} />Địa chỉ</label>
              <input
                className={`form-input${errors.address ? " error" : ""}`}
                value={form.address}
                onChange={set("address")}
                placeholder="123 Đường ABC, Quận 1, TP.HCM"
              />
              <ErrMsg field="address" />
            </div>
          </div>

          {/* Change password */}
          <div>
            <div className="modal-section-title">
              <FiLock size={12} />Đổi mật khẩu
              <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>
                — để trống nếu không muốn đổi
              </span>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label"><FiLock size={12} />Mật khẩu hiện tại</label>
              <div className="pw-toggle-wrap">
                <input
                  className={`form-input${errors.currentPassword ? " error" : ""}`}
                  type={showCurrent ? "text" : "password"}
                  value={form.currentPassword}
                  onChange={set("currentPassword")}
                  placeholder="••••••••"
                />
                <button type="button" className="pw-toggle" onClick={() => setShowCurrent(v => !v)}>
                  {showCurrent ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
              </div>
              <ErrMsg field="currentPassword" />
            </div>

            <div className="form-group" />

            <div className="form-group">
              <label className="form-label"><FiLock size={12} />Mật khẩu mới</label>
              <div className="pw-toggle-wrap">
                <input
                  className={`form-input${errors.newPassword ? " error" : ""}`}
                  type={showNew ? "text" : "password"}
                  value={form.newPassword}
                  onChange={set("newPassword")}
                  placeholder="••••••••"
                />
                <button type="button" className="pw-toggle" onClick={() => setShowNew(v => !v)}>
                  {showNew ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
              </div>
              <ErrMsg field="newPassword" />
            </div>

            <div className="form-group">
              <label className="form-label"><FiLock size={12} />Xác nhận mật khẩu mới</label>
              <input
                className={`form-input${errors.confirmPassword ? " error" : ""}`}
                type="password"
                value={form.confirmPassword}
                onChange={set("confirmPassword")}
                placeholder="••••••••"
              />
              <ErrMsg field="confirmPassword" />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-cancel" onClick={onClose} disabled={saving}>
            <FiX size={14} />Hủy
          </button>
          <button className="btn btn-save" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner" /> : <FiSave size={14} />}
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}

type Tab = "info" | "activity" | "services";

export default function AdminProfilePage() {
  const router = useRouter();
  const { toasts, removeToast, success } = useToast();
  const [adminUser, setAdminUser] = useState<AdminProfile | null>(null);
  const [isReady,   setIsReady]   = useState(false);
  const [tab,       setTab]       = useState<Tab>("info");
  const [showEdit,  setShowEdit]  = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!localStorage.getItem("adminToken")) { router.replace(getLoginPath()); return; }
      try {
        const p = await getMyProfile();
        localStorage.setItem("adminUser", JSON.stringify(p));
        if (!mounted) return;
        setAdminUser(p); setIsReady(true);
      } catch { clearAdminSession(); router.replace(getLoginPath()); }
    })();
    return () => { mounted = false; };
  }, [router]);

  if (!isReady || !adminUser) return null;

  const name      = getName(adminUser);
  const initials  = getInit(name);
  const services  = adminUser.effectiveServices || [];
  const available = adminUser.availableServices || [];

  const tabs: { key: Tab; label: string; icon: ReactNode }[] = [
    { key: "info",     label: "Thông tin",                    icon: <FiUser size={13} /> },
    { key: "activity", label: "Hoạt động",                    icon: <FiActivity size={13} /> },
    { key: "services", label: `Dịch vụ (${services.length})`, icon: <FiLayers size={13} /> },
  ];

  const handleLogout = () => { clearAdminSession(); router.replace(getLoginPath()); };

  const handleSaved = (updated: AdminProfile) => {
    setAdminUser(updated);
    localStorage.setItem("adminUser", JSON.stringify(updated));
    setShowEdit(false);
    success("Cập nhật hồ sơ thành công!");
  };

  return (
    <main className="pp">
      <style>{STYLES}</style>
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />

      {showEdit && adminUser && (
        <EditModal
          user={adminUser}
          onClose={() => setShowEdit(false)}
          onSaved={handleSaved}
        />
      )}

      <div className="pp-grid">

        {/* ══ SIDEBAR ══════════════════════════════ */}
        <aside className="sidebar">

          {/* Hero card */}
          <div className="hero-card anim d0">
            <div className="hero-banner">
              <div className="hero-banner-circle" />
              <div className="hero-banner-circle2" />
            </div>
            <div className="hero-body">
              <div className="avatar-wrap">
                <div className="avatar">
                  {initials}
                  <div className="status-ring" style={{ background: "#0f2744" }}>
                    <div className="status-ring-dot" style={{ background: adminUser.isActive ? "#4ade80" : "#f87171" }} />
                  </div>
                </div>
              </div>

              <div className="hero-name">{name}</div>
              <div className="hero-username">@{adminUser.username || "unknown"}</div>

              <div className="hero-pills">
                <Pill cls="pill-white">{fmt(adminUser.role)}</Pill>
                {adminUser.isActive
                  ? <Pill cls="pill-gw">Hoạt động</Pill>
                  : <Pill cls="pill-rw">Bị khóa</Pill>}
                {adminUser.onDuty && (
                  <span className="pill pill-gw">
                    <span className="pulse-dot" style={{ marginRight: 2 }} />
                    Đang trực
                  </span>
                )}
              </div>

              <div className="hero-divider" />

              {adminUser.email && (
                <div className="hero-stat">
                  <span className="hero-stat-ico"><FiMail size={12} /></span>
                  <span className="hero-stat-lbl">Email</span>
                  <span className="hero-stat-val" style={{ fontSize: 11 }}>{adminUser.email}</span>
                </div>
              )}
              {adminUser.phone && (
                <div className="hero-stat">
                  <span className="hero-stat-ico"><FiPhone size={12} /></span>
                  <span className="hero-stat-lbl">Điện thoại</span>
                  <span className="hero-stat-val">{adminUser.phone}</span>
                </div>
              )}
              <div className="hero-stat">
                <span className="hero-stat-ico"><FiCalendar size={12} /></span>
                <span className="hero-stat-lbl">Ngày tạo</span>
                <span className="hero-stat-val">{fmtShort(adminUser.createdAt)}</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-ico"><FiClock size={12} /></span>
                <span className="hero-stat-lbl">Đăng nhập cuối</span>
                <span className="hero-stat-val" style={{ fontSize: 11 }}>{fmtShort(adminUser.lastLoginAt)}</span>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="side-actions anim d1">
            <button className="side-btn side-btn-edit" onClick={() => setShowEdit(true)}>
              <FiEdit3 size={14} /> Chỉnh sửa
            </button>
          </div>

          {/* Counter card */}
          {adminUser.counter && (
            <div className="counter-card anim d2">
              <div className="counter-head">
                <span className="counter-head-ico"><FiMonitor size={13} /></span>
                <span className="counter-head-ttl">Quầy phụ trách</span>
              </div>
              <div className="counter-body">
                <div className="counter-name">{adminUser.counter.name || `Quầy ${adminUser.counter.number}`}</div>
                {adminUser.counter.code && (
                  <div className="counter-code">{adminUser.counter.code}</div>
                )}
                <Pill cls={adminUser.counter.isActive ? "pill-green" : "pill-gray"}>
                  {adminUser.counter.isActive ? "Đang hoạt động" : "Tạm dừng"}
                </Pill>
              </div>
            </div>
          )}
        </aside>

        {/* ══ MAIN ═════════════════════════════════ */}
        <div className="pp-main">

          {/* Stat bar */}
          <div className="stat-bar anim d1">
            <div className="stat-card">
              <div className="stat-ico" style={{ background: "#eef3fa", color: "#1e4775" }}>
                <FiShield size={18} />
              </div>
              <div>
                <div className="stat-lbl">Vai trò</div>
                <div className="stat-val">{fmt(adminUser.role)}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-ico" style={{ background: adminUser.onDuty ? "#dcfce7" : "#f1f5f9", color: adminUser.onDuty ? "#15803d" : "#64748b" }}>
                <FiActivity size={18} />
              </div>
              <div>
                <div className="stat-lbl">Ca trực</div>
                <div className="stat-val">{adminUser.onDuty ? "Đang trực" : "Ngoài ca"}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-ico" style={{ background: "#fef3c7", color: "#b45309" }}>
                <FiLayers size={18} />
              </div>
              <div>
                <div className="stat-lbl">Dịch vụ</div>
                <div className="stat-val">{services.length} dịch vụ</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs anim d2">
            {tabs.map((t) => (
              <button
                key={t.key}
                className={`tab${tab === t.key ? " tab-active" : ""}`}
                onClick={() => setTab(t.key)}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Tab: Thông tin ── */}
          {tab === "info" && (
            <div className="anim d3" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Panel title="Tài khoản" icon={<FiUser size={13} />}>
                <div className="field-grid">
                  <Field icon={<FiUser size={13} />} label="Họ và tên" value={adminUser.fullName || "—"} />
                  <Field icon={<FiUser size={13} />} label="Tên đăng nhập" value={adminUser.username || "—"} mono />
                  <Field icon={<FiShield size={13} />} label="Vai trò">
                    <Pill cls={adminUser.role === "admin" ? "pill-blue" : "pill-gray"}>{fmt(adminUser.role)}</Pill>
                  </Field>
                  <Field icon={adminUser.isActive ? <FiCheckCircle size={13} /> : <FiXCircle size={13} />} label="Trạng thái">
                    {adminUser.isActive
                      ? <Pill cls="pill-green">Đang hoạt động</Pill>
                      : <Pill cls="pill-red">Bị khóa</Pill>}
                  </Field>
                  <Field icon={<FiHash size={13} />} label="Mã tài khoản" value={(() => { const id = adminUser.id || adminUser._id; return id ? `…${id.slice(-6)}` : "—"; })()} mono />
                  <Field icon={<FiClock size={13} />} label="Trạng thái ca">
                    {adminUser.onDuty
                      ? <Pill cls="pill-green">Đang trực</Pill>
                      : <Pill cls="pill-gray">Ngoài ca</Pill>}
                  </Field>
                </div>
              </Panel>

              <Panel title="Liên hệ" icon={<FiPhone size={13} />}>
                <div className="field-grid">
                  <Field icon={<FiMail size={13} />}  label="Email"      value={getVal(adminUser.email)} />
                  <Field icon={<FiPhone size={13} />}  label="Điện thoại" value={getVal(adminUser.phone)} />
                  <Field icon={<FiMapPin size={13} />} label="Địa chỉ"    value={getVal(adminUser.address)} span />
                </div>
              </Panel>
            </div>
          )}

          {/* ── Tab: Hoạt động ── */}
          {tab === "activity" && (
            <div className="anim d3">
              <Panel title="Lịch sử hoạt động" icon={<FiActivity size={13} />}>
                <div className="timeline">
                  {[
                    { dot: "#3b82f6", title: "Đăng nhập gần nhất",  time: fmtDate(adminUser.lastLoginAt),   show: !!adminUser.lastLoginAt },
                    { dot: "#10b981", title: "Bắt đầu ca trực",      time: fmtDate(adminUser.lastShiftStart), show: !!adminUser.lastShiftStart },
                    { dot: "#f59e0b", title: "Kết thúc ca trực",     time: fmtDate(adminUser.lastShiftEnd),   show: !!adminUser.lastShiftEnd },
                    { dot: "#8b5cf6", title: "Tạo tài khoản",        time: fmtDate(adminUser.createdAt),      show: !!adminUser.createdAt },
                    { dot: "#64748b", title: "Cập nhật hồ sơ",       time: fmtDate(adminUser.updatedAt),      show: !!adminUser.updatedAt },
                  ]
                    .filter(i => i.show)
                    .map((item, idx, arr) => (
                      <div className="tl-item" key={idx}>
                        <div className="tl-col">
                          <div className="tl-dot" style={{ background: item.dot }} />
                          {idx < arr.length - 1 && <div className="tl-line" />}
                        </div>
                        <div className="tl-body">
                          <div className="tl-ttl">{item.title}</div>
                          <div className="tl-time">{item.time}</div>
                        </div>
                      </div>
                    ))}
                  {!adminUser.lastLoginAt && !adminUser.createdAt && (
                    <div style={{ padding: "24px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                      Chưa có dữ liệu hoạt động
                    </div>
                  )}
                </div>
              </Panel>
            </div>
          )}

          {/* ── Tab: Dịch vụ ── */}
          {tab === "services" && (
            <div className="anim d3" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {services.length > 0 && (
                <Panel title="Dịch vụ hiệu lực" icon={<FiLayers size={13} />}>
                  <div className="services-wrap">
                    {services.map((s) => (
                      <Pill key={s.id || s._id || s.code || s.name} cls="pill-blue">
                        {s.name || s.code || "Dịch vụ"}
                      </Pill>
                    ))}
                  </div>
                </Panel>
              )}
              {available.length > 0 && (
                <Panel title="Dịch vụ khả dụng" icon={<FiGrid size={13} />}>
                  <div className="services-wrap">
                    {available.map((s) => (
                      <Pill key={s.id || s._id || s.code || s.name} cls="pill-gray">
                        {s.name || s.code || "Dịch vụ"}
                      </Pill>
                    ))}
                  </div>
                </Panel>
              )}
              {services.length === 0 && available.length === 0 && (
                <div className="panel">
                  <div className="svc-empty">Chưa được phân quyền dịch vụ nào</div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </main>
  );
}