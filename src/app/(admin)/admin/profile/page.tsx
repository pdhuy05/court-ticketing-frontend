"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FiEdit3, FiMail, FiMapPin, FiPhone, FiShield,
  FiUser, FiLogOut, FiClock, FiHash, FiLayers,
  FiCheckCircle, FiXCircle, FiCalendar, FiGrid,
  FiActivity, FiMonitor,
} from "react-icons/fi";
import ToastContainer from "@/components/ToastContainer";
import { clearAdminSession } from "@/lib/admin-auth";
import { useToast } from "@/hooks/useToast";
import { AdminProfile, getMyProfile } from "@/services/auth.service";

const LOGIN_PATH = "/admin/login";

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@500&display=swap');

  .pp * { box-sizing: border-box; margin: 0; padding: 0; }
  .pp {
    min-height: 100%;
    background: #f1f5f9;
    padding: 24px;
    font-family: 'DM Sans', system-ui, sans-serif;
    color: #1e293b;
  }

  /* ── Entrance animation ── */
  @keyframes ppUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .pp-enter { opacity: 0; animation: ppUp 0.45s cubic-bezier(0.22,1,0.36,1) forwards; }
  .pp-d1 { animation-delay: 0.04s; }
  .pp-d2 { animation-delay: 0.10s; }
  .pp-d3 { animation-delay: 0.16s; }
  .pp-d4 { animation-delay: 0.22s; }
  .pp-d5 { animation-delay: 0.28s; }

  /* ── Shimmer ── */
  @keyframes ppShimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }

  /* ── Pulse ── */
  @keyframes ppPulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(74,222,128,0.5); }
    50%      { box-shadow: 0 0 0 5px rgba(74,222,128,0); }
  }
  .pp-pulse { width: 7px; height: 7px; border-radius: 50%; background: #4ade80; animation: ppPulse 2s ease-in-out infinite; flex-shrink: 0; display: inline-block; }

  /* ══════════════════════════════════════════════
     LAYOUT: sidebar left + content right
  ══════════════════════════════════════════════ */
  .pp-layout {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 20px;
    align-items: start;
  }
  @media (max-width: 860px) {
    .pp-layout { grid-template-columns: 1fr; }
  }

  /* ══════════════════════════════════════════════
     SIDEBAR
  ══════════════════════════════════════════════ */
  .pp-sidebar {
    display: flex; flex-direction: column; gap: 14px;
  }

  /* Identity card */
  .pp-id-card {
    position: relative; overflow: hidden;
    background: linear-gradient(145deg, #1e4775 0%, #0d2540 100%);
    border-radius: 18px;
    padding: 28px 22px 22px;
    text-align: center;
  }
  .pp-id-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.28) 50%, transparent);
  }
  .pp-id-card::after {
    content: '';
    position: absolute; inset: 0; pointer-events: none;
    background-image:
      linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
    background-size: 28px 28px;
  }
  .pp-id-deco {
    position: absolute; top: -50px; right: -50px;
    width: 160px; height: 160px; border-radius: 50%;
    background: rgba(255,255,255,0.04); pointer-events: none;
  }

  /* Avatar */
  .pp-avatar-wrap { position: relative; z-index: 1; display: inline-flex; margin-bottom: 14px; }
  .pp-avatar-ring {
    position: absolute; inset: -3px; border-radius: 21px;
    background: linear-gradient(135deg, rgba(255,255,255,0.35), rgba(255,255,255,0.05));
    z-index: 0;
  }
  .pp-avatar {
    position: relative; z-index: 1;
    width: 82px; height: 82px; border-radius: 18px;
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.18);
    display: flex; align-items: center; justify-content: center;
    font-size: 28px; font-weight: 700; color: #fff; letter-spacing: -0.5px;
    overflow: hidden;
  }
  .pp-avatar::after {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%);
    background-size: 200% 100%;
    animation: ppShimmer 3.5s ease-in-out infinite;
  }

  .pp-id-name {
    position: relative; z-index: 1;
    font-size: 17px; font-weight: 700; color: #fff;
    letter-spacing: -0.3px; margin-bottom: 4px;
  }
  .pp-id-username {
    position: relative; z-index: 1;
    font-size: 12px; color: rgba(255,255,255,0.5);
    font-family: 'DM Mono', monospace; margin-bottom: 14px;
  }
  .pp-id-pills {
    position: relative; z-index: 1;
    display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin-bottom: 18px;
  }
  .pp-id-divider { height: 1px; background: rgba(255,255,255,0.08); margin: 0 0 16px; position: relative; z-index: 1; }

  /* Sidebar stat row */
  .pp-stat-row {
    position: relative; z-index: 1;
    display: flex; align-items: center; gap: 10px;
    padding: 9px 0;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .pp-stat-row:last-child { border-bottom: none; padding-bottom: 0; }
  .pp-stat-icon { color: rgba(255,255,255,0.35); display: flex; flex-shrink: 0; }
  .pp-stat-label { font-size: 11px; color: rgba(255,255,255,0.45); flex: 1; }
  .pp-stat-value { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.85); text-align: right; }

  /* Sidebar action buttons */
  .pp-side-actions { display: flex; flex-direction: column; gap: 8px; }
  .pp-side-btn {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    height: 42px; border-radius: 12px; font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all 0.18s; font-family: 'DM Sans', inherit;
    border: 1px solid;
  }
  .pp-side-btn-edit {
    background: #fff; color: #1e4775; border-color: #e2e8f0;
  }
  .pp-side-btn-edit:hover { background: #f8fafc; border-color: #c7d9ee; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(30,71,117,0.1); }
  .pp-side-btn-logout {
    background: #fff5f5; color: #dc2626; border-color: #fecaca;
  }
  .pp-side-btn-logout:hover { background: #fee2e2; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(220,38,38,0.1); }

  /* Sidebar counter card */
  .pp-counter-card {
    background: #fff; border: 1px solid #e8edf3; border-radius: 14px;
    overflow: hidden;
  }
  .pp-counter-head {
    display: flex; align-items: center; gap: 8px;
    padding: 12px 16px; border-bottom: 1px solid #f1f5f9; background: #fafbfc;
  }
  .pp-counter-head-icon { color: #1e4775; display: flex; }
  .pp-counter-head-title { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; }
  .pp-counter-body { padding: 14px 16px; }
  .pp-counter-name { font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
  .pp-counter-code { font-size: 11px; color: #94a3b8; font-family: 'DM Mono', monospace; }

  /* ══════════════════════════════════════════════
     MAIN CONTENT
  ══════════════════════════════════════════════ */
  .pp-content { display: flex; flex-direction: column; gap: 14px; }

  /* ── Tab bar ── */
  .pp-tabs {
    display: flex; gap: 4px;
    background: #fff; border: 1px solid #e8edf3;
    border-radius: 12px; padding: 5px;
  }
  .pp-tab {
    display: inline-flex; align-items: center; gap: 7px;
    height: 36px; padding: 0 14px; border-radius: 8px;
    font-size: 13px; font-weight: 600; cursor: pointer;
    border: none; background: transparent; color: #64748b;
    transition: all 0.16s; font-family: 'DM Sans', inherit;
    white-space: nowrap;
  }
  .pp-tab:hover { color: #1e4775; background: #f1f5f9; }
  .pp-tab.pp-tab-active { background: #1e4775; color: #fff; }
  .pp-tab-icon { display: flex; }

  /* ── White panel ── */
  .pp-panel {
    background: #fff; border: 1px solid #e8edf3; border-radius: 16px; overflow: hidden;
  }
  .pp-panel-head {
    display: flex; align-items: center; gap: 9px;
    padding: 14px 20px; border-bottom: 1px solid #f1f5f9; background: #fafbfc;
  }
  .pp-panel-icon { width: 28px; height: 28px; border-radius: 7px; background: #eff6ff; color: #1e4775; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .pp-panel-title { font-size: 13px; font-weight: 700; color: #1e293b; }

  /* ── Field ── */
  .pp-field {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 20px; border-bottom: 1px solid #f8fafc; transition: background 0.14s;
  }
  .pp-field:last-child { border-bottom: none; }
  .pp-field:hover { background: #f8fafc; }
  .pp-field-ico { width: 30px; height: 30px; border-radius: 7px; background: #f1f5f9; color: #64748b; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background 0.14s, color 0.14s; }
  .pp-field:hover .pp-field-ico { background: #eff6ff; color: #1e4775; }
  .pp-field-label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px; }
  .pp-field-val { font-size: 13.5px; font-weight: 500; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pp-field-val.mono { font-family: 'DM Mono', monospace; font-size: 12px; color: #475569; }

  /* ── Two-col grid ── */
  .pp-2col { display: grid; grid-template-columns: 1fr 1fr; }
  .pp-2col .pp-field:nth-child(odd) { border-right: 1px solid #f8fafc; }
  @media (max-width: 600px) { .pp-2col { grid-template-columns: 1fr; } .pp-2col .pp-field:nth-child(odd) { border-right: none; } }

  /* ── Services wrap ── */
  .pp-services { padding: 16px 20px; display: flex; flex-wrap: wrap; gap: 8px; }

  /* ── Activity timeline ── */
  .pp-timeline { padding: 4px 20px 8px; }
  .pp-tl-item { display: flex; gap: 14px; padding: 12px 0; border-bottom: 1px solid #f8fafc; }
  .pp-tl-item:last-child { border-bottom: none; }
  .pp-tl-dot-wrap { display: flex; flex-direction: column; align-items: center; gap: 0; }
  .pp-tl-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; margin-top: 3px; }
  .pp-tl-line { width: 1px; flex: 1; background: #f1f5f9; margin-top: 4px; }
  .pp-tl-body { flex: 1; min-width: 0; }
  .pp-tl-title { font-size: 13px; font-weight: 600; color: #1e293b; margin-bottom: 2px; }
  .pp-tl-time  { font-size: 11px; color: #94a3b8; font-family: 'DM Mono', monospace; }

  /* ── Pills ── */
  .pp-pill { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; letter-spacing: 0.02em; border: 1px solid; white-space: nowrap; }
  .pp-pill-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
  .pp-pill-blue  { background:#dbeafe; color:#1d4ed8; border-color:#bfdbfe; }
  .pp-pill-green { background:#dcfce7; color:#15803d; border-color:#bbf7d0; }
  .pp-pill-red   { background:#fee2e2; color:#dc2626; border-color:#fecaca; }
  .pp-pill-gray  { background:#f1f5f9; color:#475569; border-color:#e2e8f0; }
  .pp-pill-w     { background:rgba(255,255,255,0.15); color:#fff; border-color:rgba(255,255,255,0.25); }
  .pp-pill-gw    { background:rgba(74,222,128,0.2); color:#bbf7d0; border-color:rgba(74,222,128,0.3); }
  .pp-pill-rw    { background:rgba(252,165,165,0.2); color:#fecaca; border-color:rgba(252,165,165,0.3); }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (r?: string) => r === "admin" ? "Quản trị viên" : r === "staff" ? "Nhân viên" : r || "—";
const getName = (u: AdminProfile) => u.fullName?.trim() || u.username?.trim() || "Admin";
const getVal  = (v?: string | null) => v?.trim() || "Chưa cập nhật";
const getInit = (n: string) => n.split(" ").slice(-2).map(w => w[0]?.toUpperCase() ?? "").join("");
const fmtDate = (v?: string | null) => {
  if (!v) return "—";
  return new Date(v).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
};
const fmtDateShort = (v?: string | null) => {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};

// ─── Components ───────────────────────────────────────────────────────────────
function Pill({ cls, children }: { cls: string; children: ReactNode }) {
  return <span className={`pp-pill ${cls}`}><span className="pp-pill-dot" />{children}</span>;
}
function Field({ icon, label, value, mono, children }: {
  icon: ReactNode; label: string; value?: string; mono?: boolean; children?: ReactNode;
}) {
  return (
    <div className="pp-field">
      <div className="pp-field-ico">{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="pp-field-label">{label}</div>
        <div className={`pp-field-val${mono ? " mono" : ""}`}>{children ?? value ?? "—"}</div>
      </div>
    </div>
  );
}
function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="pp-panel">
      <div className="pp-panel-head">
        <div className="pp-panel-icon">{icon}</div>
        <span className="pp-panel-title">{title}</span>
      </div>
      {children}
    </div>
  );
}

type Tab = "info" | "activity" | "services";

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminProfilePage() {
  const router = useRouter();
  const { toasts, removeToast, info } = useToast();
  const [adminUser, setAdminUser] = useState<AdminProfile | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [tab, setTab] = useState<Tab>("info");

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!localStorage.getItem("adminToken")) { router.replace(LOGIN_PATH); return; }
      try {
        const p = await getMyProfile();
        localStorage.setItem("adminUser", JSON.stringify(p));
        if (!mounted) return;
        setAdminUser(p); setIsReady(true);
      } catch { clearAdminSession(); router.replace(LOGIN_PATH); }
    })();
    return () => { mounted = false; };
  }, [router]);

  if (!isReady || !adminUser) return null;

  const name     = getName(adminUser);
  const initials = getInit(name);
  const services = adminUser.effectiveServices || [];
  const available = adminUser.availableServices || [];

  const tabs: { key: Tab; label: string; icon: ReactNode }[] = [
    { key: "info",     label: "Thông tin",    icon: <FiUser size={13} /> },
    { key: "activity", label: "Hoạt động",    icon: <FiActivity size={13} /> },
    { key: "services", label: `Dịch vụ (${services.length})`, icon: <FiLayers size={13} /> },
  ];

  return (
    <main className="pp">
      <style>{STYLES}</style>
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />

      <div className="pp-layout">

        {/* ══ SIDEBAR ══════════════════════════════════════════════ */}
        <aside className="pp-sidebar">

          {/* Identity card */}
          <div className="pp-id-card pp-enter pp-d1">
            <div className="pp-id-deco" />
            <div className="pp-avatar-wrap">
              <div className="pp-avatar-ring" />
              <div className="pp-avatar">{initials}</div>
            </div>
            <div className="pp-id-name">{name}</div>
            <div className="pp-id-username">@{adminUser.username || "unknown"}</div>
            <div className="pp-id-pills">
              <Pill cls="pp-pill-w">{fmt(adminUser.role)}</Pill>
              {adminUser.isActive
                ? <Pill cls="pp-pill-gw">Hoạt động</Pill>
                : <Pill cls="pp-pill-rw">Bị khóa</Pill>}
              {adminUser.onDuty && (
                <span className="pp-pill pp-pill-gw">
                  <span className="pp-pulse" style={{ marginRight: 1 }} />
                  Đang trực
                </span>
              )}
            </div>
            <div className="pp-id-divider" />
            {adminUser.email && (
              <div className="pp-stat-row">
                <span className="pp-stat-icon"><FiMail size={12} /></span>
                <span className="pp-stat-label">Email</span>
                <span className="pp-stat-value" style={{ fontSize: 11 }}>{adminUser.email}</span>
              </div>
            )}
            {adminUser.phone && (
              <div className="pp-stat-row">
                <span className="pp-stat-icon"><FiPhone size={12} /></span>
                <span className="pp-stat-label">Điện thoại</span>
                <span className="pp-stat-value">{adminUser.phone}</span>
              </div>
            )}
            <div className="pp-stat-row">
              <span className="pp-stat-icon"><FiCalendar size={12} /></span>
              <span className="pp-stat-label">Tạo lúc</span>
              <span className="pp-stat-value">{fmtDateShort(adminUser.createdAt)}</span>
            </div>
            <div className="pp-stat-row">
              <span className="pp-stat-icon"><FiClock size={12} /></span>
              <span className="pp-stat-label">Đăng nhập cuối</span>
              <span className="pp-stat-value" style={{ fontSize: 11 }}>{fmtDateShort(adminUser.lastLoginAt)}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pp-side-actions pp-enter pp-d2">
            <button className="pp-side-btn pp-side-btn-edit" onClick={() => info("Tính năng đang phát triển")}>
              <FiEdit3 size={14} /> Chỉnh sửa hồ sơ
            </button>
          </div>

          {/* Counter card */}
          {adminUser.counter && (
            <div className="pp-counter-card pp-enter pp-d3">
              <div className="pp-counter-head">
                <span className="pp-counter-head-icon"><FiMonitor size={13} /></span>
                <span className="pp-counter-head-title">Quầy phụ trách</span>
              </div>
              <div className="pp-counter-body">
                <div className="pp-counter-name">{adminUser.counter.name || `Quầy ${adminUser.counter.number}`}</div>
                {adminUser.counter.code && (
                  <div className="pp-counter-code">{adminUser.counter.code}</div>
                )}
                <div style={{ marginTop: 10 }}>
                  <Pill cls={adminUser.counter.isActive ? "pp-pill-green" : "pp-pill-gray"}>
                    {adminUser.counter.isActive ? "Đang hoạt động" : "Tạm dừng"}
                  </Pill>
                </div>
              </div>
            </div>
          )}

        </aside>

        {/* ══ MAIN CONTENT ═════════════════════════════════════════ */}
        <div className="pp-content">

          {/* Tab bar */}
          <div className="pp-tabs pp-enter pp-d2">
            {tabs.map((t) => (
              <button
                key={t.key}
                className={`pp-tab${tab === t.key ? " pp-tab-active" : ""}`}
                onClick={() => setTab(t.key)}
              >
                <span className="pp-tab-icon">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Tab: Thông tin ── */}
          {tab === "info" && (
            <>
              <Panel title="Tài khoản" icon={<FiUser size={13} />}>
                <div className="pp-2col">
                  <Field icon={<FiUser size={13} />} label="Họ và tên" value={adminUser.fullName || "—"} />
                  <Field icon={<FiUser size={13} />} label="Tên đăng nhập" value={adminUser.username || "—"} mono />
                  <Field icon={<FiShield size={13} />} label="Vai trò">
                    <Pill cls={adminUser.role === "admin" ? "pp-pill-blue" : "pp-pill-gray"}>{fmt(adminUser.role)}</Pill>
                  </Field>
                  <Field icon={adminUser.isActive ? <FiCheckCircle size={13} /> : <FiXCircle size={13} />} label="Trạng thái tài khoản">
                    {adminUser.isActive ? <Pill cls="pp-pill-green">Đang hoạt động</Pill> : <Pill cls="pp-pill-red">Bị khóa</Pill>}
                  </Field>
                  <Field icon={<FiHash size={13} />} label="Mã tài khoản" value={adminUser.id || adminUser._id || "—"} mono />
                  <Field icon={<FiClock size={13} />} label="Trạng thái ca">
                    {adminUser.onDuty ? <Pill cls="pp-pill-green">Đang trực</Pill> : <Pill cls="pp-pill-gray">Không trực</Pill>}
                  </Field>
                </div>
              </Panel>

              <Panel title="Liên hệ" icon={<FiPhone size={13} />}>
                <div className="pp-2col">
                  <Field icon={<FiMail size={13} />} label="Email" value={getVal(adminUser.email)} />
                  <Field icon={<FiPhone size={13} />} label="Số điện thoại" value={getVal(adminUser.phone)} />
                  <Field icon={<FiMapPin size={13} />} label="Địa chỉ" value={getVal(adminUser.address)} />
                </div>
              </Panel>
            </>
          )}

          {/* ── Tab: Hoạt động ── */}
          {tab === "activity" && (
            <Panel title="Lịch sử hoạt động" icon={<FiActivity size={13} />}>
              <div className="pp-timeline">
                {[
                  { dot: "#3b82f6", title: "Đăng nhập gần nhất",  time: fmtDate(adminUser.lastLoginAt),   show: !!adminUser.lastLoginAt },
                  { dot: "#10b981", title: "Bắt đầu ca trực",      time: fmtDate(adminUser.lastShiftStart), show: !!adminUser.lastShiftStart },
                  { dot: "#f59e0b", title: "Kết thúc ca trực",     time: fmtDate(adminUser.lastShiftEnd),   show: !!adminUser.lastShiftEnd },
                  { dot: "#8b5cf6", title: "Tạo tài khoản",        time: fmtDate(adminUser.createdAt),      show: !!adminUser.createdAt },
                  { dot: "#64748b", title: "Cập nhật hồ sơ",       time: fmtDate(adminUser.updatedAt),      show: !!adminUser.updatedAt },
                ]
                  .filter((i) => i.show)
                  .map((item, idx, arr) => (
                    <div className="pp-tl-item" key={idx}>
                      <div className="pp-tl-dot-wrap">
                        <div className="pp-tl-dot" style={{ background: item.dot }} />
                        {idx < arr.length - 1 && <div className="pp-tl-line" />}
                      </div>
                      <div className="pp-tl-body">
                        <div className="pp-tl-title">{item.title}</div>
                        <div className="pp-tl-time">{item.time}</div>
                      </div>
                    </div>
                  ))}
                {!adminUser.lastLoginAt && !adminUser.createdAt && (
                  <div style={{ padding: "20px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                    Chưa có dữ liệu hoạt động
                  </div>
                )}
              </div>
            </Panel>
          )}

          {/* ── Tab: Dịch vụ ── */}
          {tab === "services" && (
            <>
              {services.length > 0 && (
                <Panel title="Dịch vụ hiệu lực" icon={<FiLayers size={13} />}>
                  <div className="pp-services">
                    {services.map((s) => (
                      <Pill key={s.id || s._id || s.code || s.name} cls="pp-pill-blue">
                        {s.name || s.code || "Dịch vụ"}
                      </Pill>
                    ))}
                  </div>
                </Panel>
              )}
              {available.length > 0 && (
                <Panel title="Dịch vụ khả dụng" icon={<FiGrid size={13} />}>
                  <div className="pp-services">
                    {available.map((s) => (
                      <Pill key={s.id || s._id || s.code || s.name} cls="pp-pill-gray">
                        {s.name || s.code || "Dịch vụ"}
                      </Pill>
                    ))}
                  </div>
                </Panel>
              )}
              {services.length === 0 && available.length === 0 && (
                <div className="pp-panel" style={{ padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
                  Chưa được phân quyền dịch vụ nào
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </main>
  );
}