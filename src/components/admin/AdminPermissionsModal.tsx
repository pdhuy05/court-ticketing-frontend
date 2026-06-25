"use client";

import React, { useEffect, useState } from "react";
import {
  getAdminPermissions,
  updateAdminPermissions,
  type AdminPermissionsData,
} from "@/services/admin.service";
import {
  ALL_ADMIN_PERMISSIONS,
  PERMISSION_LABELS,
  type AdminPermission,
} from "@/lib/admin-permissions";

interface Props {
  adminId: string;
  adminName: string;
  adminEmail?: string;
  currentUserId?: string;
  onClose: () => void;
  onUpdated?: () => void;
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const IconShield = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z"/>
  </svg>
);

const IconCrown = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 20h20M4 20l2-10 6 5 6-5 2 10"/>
    <circle cx="12" cy="7" r="1.5" fill={color} stroke="none"/>
    <circle cx="4.5" cy="10.5" r="1.5" fill={color} stroke="none"/>
    <circle cx="19.5" cy="10.5" r="1.5" fill={color} stroke="none"/>
  </svg>
);

const IconX = ({ size = 14, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);

const IconCheck = ({ size = 14, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12l5 5L20 7"/>
  </svg>
);

const IconSave = ({ size = 14, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
);

const IconLoader = ({ size = 14, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" style={{ animation: "amp-spin 0.75s linear infinite" }}>
    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity={0.25}/>
    <path d="M21 12a9 9 0 00-9-9"/>
  </svg>
);

const IconWarning = ({ size = 15, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const IconAlertCircle = ({ size = 15, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const IconUnlock = ({ size = 15, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 019.9-1"/>
  </svg>
);

const PERM_SVG: Record<string, React.ReactElement> = {
  dashboard: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  users: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    </svg>
  ),
  counter: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  services: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/>
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  ),
  printers: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9"/>
      <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
      <rect x="6" y="14" width="12" height="8"/>
    </svg>
  ),
  settings: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  ),
  reports: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  search: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  "audit-logs": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminPermissionsModal({
  adminId,
  adminName,
  adminEmail,
  currentUserId,
  onClose,
  onUpdated,
}: Props) {
  const [data, setData] = useState<AdminPermissionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [isFullAccess, setIsFullAccess] = useState(true);

  const isSelf = !!(currentUserId && adminId === currentUserId);

  useEffect(() => {
    setLoading(true);
    getAdminPermissions(adminId)
      .then((d) => {
        setData(d);
        setIsSuperAdmin(d.isSuperAdmin);
        if (d.adminPermissions === null) {
          setIsFullAccess(true);
          setSelectedPerms(new Set(ALL_ADMIN_PERMISSIONS));
        } else {
          setIsFullAccess(false);
          setSelectedPerms(new Set(d.adminPermissions));
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [adminId]);

  const togglePerm = (perm: string) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return next;
    });
  };

  const handleToggleFullAccess = (checked: boolean) => {
    setIsFullAccess(checked);
    if (checked) setSelectedPerms(new Set(ALL_ADMIN_PERMISSIONS));
  };

  const handleSave = async () => {
    if (isSelf) return;
    setSaving(true);
    setSaveState("saving");
    setError("");
    try {
      const permissions = isFullAccess ? null : Array.from(selectedPerms);
      await updateAdminPermissions(adminId, { permissions, isSuperAdmin });
      setSaveState("success");
      onUpdated?.();
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Lỗi cập nhật");
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 2000);
    } finally {
      setSaving(false);
    }
  };

  const countLabel = isSuperAdmin || isFullAccess ? "Full" : String(selectedPerms.size);

  return (
    <>
      <style>{`
        @keyframes amp-backdropIn { from { opacity:0 } to { opacity:1 } }
        @keyframes amp-panelIn {
          from { opacity:0; transform:translateY(22px) scale(0.96) }
          to   { opacity:1; transform:translateY(0) scale(1) }
        }
        @keyframes amp-slideDown {
          from { opacity:0; transform:translateY(8px) }
          to   { opacity:1; transform:translateY(0) }
        }
        @keyframes amp-spin { to { transform:rotate(360deg) } }
        @keyframes amp-shimmer {
          0%   { background-position:-400px 0 }
          100% { background-position:400px 0 }
        }

        .amp-backdrop {
          position:fixed; inset:0; z-index:1000;
          background:rgba(10,12,20,0.52);
          backdrop-filter:blur(6px);
          display:flex; align-items:center; justify-content:center; padding:16px;
          animation:amp-backdropIn 0.2s ease both;
        }
        .amp-panel {
          background:#fff; border-radius:20px;
          width:100%; max-width:498px;
          box-shadow:0 32px 72px rgba(0,0,0,0.18), 0 4px 20px rgba(0,0,0,0.07);
          overflow:hidden;
          animation:amp-panelIn 0.38s cubic-bezier(0.34,1.56,0.64,1) both;
          font-family:-apple-system,'Segoe UI',sans-serif;
        }
        .amp-header {
          display:flex; align-items:center; gap:12px;
          padding:16px 18px 15px;
          border-bottom:1px solid #f0f0f2;
        }
        .amp-header-icon {
          width:36px; height:36px; border-radius:10px;
          background:#EEF2FF;
          display:flex; align-items:center; justify-content:center; flex-shrink:0;
        }
        .amp-close-btn {
          width:28px; height:28px; border-radius:7px;
          border:1px solid #e5e7eb; background:#f9fafb;
          display:flex; align-items:center; justify-content:center;
          cursor:pointer; color:#9ca3af;
          transition:background 0.13s, color 0.13s, border-color 0.13s;
        }
        .amp-close-btn:hover { background:#f3f4f6; color:#374151; border-color:#d1d5db; }
        .amp-body { padding:18px; display:flex; flex-direction:column; gap:14px; }
        .amp-section-label {
          font-size:10px; font-weight:700; letter-spacing:0.09em;
          color:#c4c9d4; text-transform:uppercase; margin-bottom:7px;
        }
        .amp-toggle-card {
          display:flex; align-items:center; gap:12px;
          padding:12px 14px; border-radius:13px;
          border:1.5px solid #edf0f3; background:#fafbfc;
          cursor:pointer; transition:border-color 0.18s, background 0.18s;
        }
        .amp-toggle-card:hover:not(.amp-disabled) { border-color:#d1d5db; background:#f5f6f8; }
        .amp-toggle-card.amp-active { border-color:#818CF8; background:#FAFAFF; }
        .amp-toggle-card.amp-disabled { cursor:not-allowed; opacity:0.5; }
        .amp-card-svg-wrap {
          width:34px; height:34px; border-radius:9px;
          background:#fff; border:1px solid #e9ecef;
          display:flex; align-items:center; justify-content:center; flex-shrink:0;
          color:#9ca3af; transition:background 0.18s, border-color 0.18s, color 0.18s;
        }
        .amp-toggle-card.amp-active .amp-card-svg-wrap {
          background:#EEF2FF; border-color:#a5b4fc; color:#4F46E5;
        }
        .amp-switch {
          width:36px; height:20px; border-radius:10px;
          background:#e5e7eb; position:relative; flex-shrink:0;
          transition:background 0.2s;
        }
        .amp-switch.amp-on { background:#4F46E5; }
        .amp-switch::after {
          content:''; position:absolute; top:3px; left:3px;
          width:14px; height:14px; border-radius:50%; background:#fff;
          transition:transform 0.22s cubic-bezier(0.34,1.56,0.64,1);
          box-shadow:0 1px 3px rgba(0,0,0,0.18);
        }
        .amp-switch.amp-on::after { transform:translateX(16px); }
        .amp-perms-section { animation:amp-slideDown 0.22s ease both; }
        .amp-full-row {
          display:flex; align-items:center; gap:9px;
          padding:9px 13px; border-radius:10px;
          border:1.5px solid #edf0f3; background:#fafbfc;
          cursor:pointer; transition:border-color 0.15s, background 0.15s;
          margin-bottom:9px;
        }
        .amp-full-row:hover:not(.amp-disabled) { border-color:#d1d5db; }
        .amp-full-row.amp-active { border-color:#34D399; background:#F0FDF4; }
        .amp-full-row.amp-disabled { cursor:not-allowed; opacity:0.5; }
        .amp-full-badge {
          font-size:10px; font-weight:700; letter-spacing:0.04em;
          padding:2px 8px; border-radius:20px;
          background:#DCFCE7; color:#15803D;
        }
        .amp-cb {
          width:15px; height:15px; border-radius:4px;
          border:1.5px solid #d1d5db; background:#fff;
          display:flex; align-items:center; justify-content:center; flex-shrink:0;
          transition:background 0.13s, border-color 0.13s; color:#fff;
        }
        .amp-cb.amp-on { background:#4F46E5; border-color:#4F46E5; }
        .amp-cb.amp-green.amp-on { background:#16A34A; border-color:#16A34A; }
        .amp-grid {
          display:grid; grid-template-columns:1fr 1fr; gap:5px;
          transition:opacity 0.18s;
        }
        .amp-grid.amp-dimmed { opacity:0.3; pointer-events:none; }
        .amp-perm {
          display:flex; align-items:center; gap:8px;
          padding:8px 10px; border-radius:9px;
          border:1.5px solid #edf0f3; background:#fafbfc;
          cursor:pointer; transition:border-color 0.14s, background 0.14s;
        }
        .amp-perm:hover:not(.amp-disabled) { border-color:#d1d5db; background:#fff; }
        .amp-perm.amp-selected { border-color:#a5b4fc; background:#FAFAFF; }
        .amp-perm.amp-disabled { cursor:not-allowed; }
        .amp-perm-icon { color:#9ca3af; display:flex; align-items:center; flex-shrink:0; transition:color 0.14s; }
        .amp-perm.amp-selected .amp-perm-icon { color:#4F46E5; }
        .amp-warn {
          display:flex; align-items:center; gap:8px;
          padding:10px 13px; border-radius:10px;
          background:#FFFBEB; border:1px solid #FDE68A; color:#92400E;
          font-size:12px; font-weight:500;
        }
        .amp-err {
          display:flex; align-items:center; gap:8px;
          padding:10px 13px; border-radius:10px;
          background:#FFF1F2; border:1px solid #FECDD3; color:#BE123C;
          font-size:12px; font-weight:500;
        }
        .amp-skel {
          border-radius:10px;
          background:linear-gradient(90deg,#f3f4f6 25%,#e9ecef 50%,#f3f4f6 75%);
          background-size:400px 100%;
          animation:amp-shimmer 1.5s infinite linear;
        }
        .amp-footer {
          display:flex; align-items:center; gap:8px; justify-content:flex-end;
          padding:13px 18px;
          border-top:1px solid #f0f0f2; background:#fafbfc;
        }
        .amp-btn {
          display:flex; align-items:center; gap:6px;
          padding:7px 16px; border-radius:9px;
          font-size:13px; font-weight:600; cursor:pointer;
          transition:all 0.14s ease; border:none; font-family:inherit;
        }
        .amp-btn-cancel { background:#fff; border:1px solid #e5e7eb; color:#4b5563; }
        .amp-btn-cancel:hover { background:#f9fafb; color:#111827; border-color:#d1d5db; }
        .amp-btn-save { background:#4F46E5; color:#fff; box-shadow:0 2px 8px rgba(79,70,229,0.28); }
        .amp-btn-save:hover:not(:disabled) { background:#4338CA; transform:translateY(-1px); box-shadow:0 4px 14px rgba(79,70,229,0.35); }
        .amp-btn-save:active:not(:disabled) { transform:translateY(0); }
        .amp-btn-save:disabled { opacity:0.65; cursor:not-allowed; }
        .amp-btn-save.amp-success { background:#16A34A; box-shadow:0 2px 8px rgba(22,163,74,0.28); }
        .amp-btn-save.amp-error   { background:#DC2626; box-shadow:0 2px 8px rgba(220,38,38,0.28); }
        .amp-badge {
          font-size:10px; font-weight:700;
          background:rgba(255,255,255,0.2); border-radius:20px;
          padding:1px 8px; letter-spacing:0.03em;
        }
      `}</style>

      <div
        className="amp-backdrop"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="amp-panel" role="dialog" aria-modal="true" aria-label="Phân quyền Admin">

          <div className="amp-header">
            <div className="amp-header-icon">
              <IconShield size={18} color="#4F46E5" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", lineHeight: 1.3 }}>
                Phân quyền Admin
              </div>
              <div style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 2 }}>
                {adminName}{adminEmail ? <> &middot; <span style={{ color: "#6b7280" }}>{adminEmail}</span></> : ""}
              </div>
            </div>
            <button className="amp-close-btn" onClick={onClose} aria-label="Đóng">
              <IconX size={13} />
            </button>
          </div>

          <div className="amp-body">
            {isSelf && (
              <div className="amp-warn">
                <IconWarning size={14} color="#92400E" />
                Phân quyền của tài khoản hiện hành không thể được điều chỉnh.
              </div>
            )}

            {error && (
              <div className="amp-err">
                <IconAlertCircle size={14} color="#BE123C" />
                {error}
              </div>
            )}

            {loading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="amp-skel" style={{ height: 60 }} />
                <div className="amp-skel" style={{ height: 40 }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="amp-skel" style={{ height: 38 }} />
                  ))}
                </div>
              </div>
            )}

            {!loading && data && (
              <>
                <div>
                  <div className="amp-section-label">Cấp độ truy cập</div>
                  <div
                    className={`amp-toggle-card${isSuperAdmin ? " amp-active" : ""}${isSelf ? " amp-disabled" : ""}`}
                    onClick={() => !isSelf && setIsSuperAdmin((v) => !v)}
                  >
                    <div className="amp-card-svg-wrap">
                      <IconCrown size={15} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Super Admin</div>
                      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2, lineHeight: 1.5 }}>
                        Toàn quyền hệ thống, vượt qua mọi giới hạn phân quyền
                      </div>
                    </div>
                    <div className={`amp-switch${isSuperAdmin ? " amp-on" : ""}`} />
                  </div>
                </div>

                {!isSuperAdmin && (
                  <div className="amp-perms-section">
                    <div className="amp-section-label">Quyền cụ thể</div>

                    <div
                      className={`amp-full-row${isFullAccess ? " amp-active" : ""}${isSelf ? " amp-disabled" : ""}`}
                      onClick={() => !isSelf && handleToggleFullAccess(!isFullAccess)}
                    >
                      <div className={`amp-cb amp-green${isFullAccess ? " amp-on" : ""}`}>
                        {isFullAccess && <IconCheck size={9} color="#fff" />}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                        <IconUnlock size={13} color={isFullAccess ? "#16A34A" : "#9ca3af"} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>
                          Toàn quyền (mặc định)
                        </span>
                      </div>
                      <div className="amp-full-badge">Tất cả quyền truy cập</div>
                    </div>

                    <div className={`amp-grid${isFullAccess ? " amp-dimmed" : ""}`}>
                      {ALL_ADMIN_PERMISSIONS.map((perm, i) => {
                        const checked = selectedPerms.has(perm);
                        return (
                          <div
                            key={perm}
                            className={`amp-perm${checked ? " amp-selected" : ""}${isSelf ? " amp-disabled" : ""}`}
                            onClick={() => !isSelf && !isFullAccess && togglePerm(perm)}
                            style={{ animationDelay: `${i * 0.035}s` }}
                          >
                            <div className={`amp-cb${checked ? " amp-on" : ""}`}>
                              {checked && <IconCheck size={9} color="#fff" />}
                            </div>
                            <div className="amp-perm-icon">
                              {PERM_SVG[perm] ?? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round">
                                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                                </svg>
                              )}
                            </div>
                            <span style={{ fontSize: 11.5, fontWeight: checked ? 600 : 400, color: "#374151", flex: 1 }}>
                              {PERMISSION_LABELS[perm as AdminPermission]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {!loading && !isSelf && (
            <div className="amp-footer">
              <button className="amp-btn amp-btn-cancel" onClick={onClose}>
                <IconX size={12} color="#6b7280" /> Hủy
              </button>
              <button
                className={`amp-btn amp-btn-save${saveState === "success" ? " amp-success" : saveState === "error" ? " amp-error" : ""}`}
                onClick={handleSave}
                disabled={saving}
              >
                {saveState === "saving" && <IconLoader size={13} color="#fff" />}
                {saveState === "success" && <IconCheck size={13} color="#fff" />}
                {saveState === "error" && <IconX size={13} color="#fff" />}
                {saveState === "idle" && <IconSave size={13} color="#fff" />}
                <span>
                  {saveState === "saving" ? "Đang lưu..."
                    : saveState === "success" ? "Đã lưu!"
                    : saveState === "error" ? "Lỗi!"
                    : "Lưu phân quyền"}
                </span>
                {saveState === "idle" && <div className="amp-badge">{countLabel}</div>}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}