"use client";

import type { CSSProperties } from "react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FiVolume2, FiRefreshCw, FiClock, FiSave, FiLayout,
  FiMapPin, FiAlignLeft, FiSun, FiImage, FiUpload, FiX,
  FiCheck, FiAlertCircle, FiSettings,
} from "react-icons/fi";
import ToastContainer from "@/components/ToastContainer";
import { useToast } from "@/hooks/useToast";
import { useSiteConfig } from "@/lib/site-config.context";
import {
  getAutoResetSettings,
  getTtsSettings,
  updateAutoResetEnabled,
  updateAutoResetTime,
  updateTtsSettings,
  getSiteConfig,
  updateSiteConfig,
  uploadLogo,
  type SiteConfig,
} from "@/services/admin.service";

// ─── Styles ───────────────────────────────────────────────────────────────────

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  .sp *, .sp *::before, .sp *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .sp {
    height: 100%;
    display: flex;
    flex-direction: column;
    font-family: 'Be Vietnam Pro', system-ui, sans-serif;
    color: #0f172a;
    background: #f6f8fb;
    overflow: hidden;
  }

  /* ── Top bar ── */
  .sp-topbar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px 28px 0;
    flex-shrink: 0;
  }
  .sp-topbar-icon {
    width: 34px; height: 34px; border-radius: 10px;
    background: #0f2744; color: #fff;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .sp-topbar-title {
    font-size: 17px; font-weight: 700; color: #0f172a; letter-spacing: -0.4px;
  }
  .sp-topbar-sub {
    font-size: 12px; color: #94a3b8; margin-left: 2px;
  }

  /* ── Tab nav ── */
  .sp-tabs {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 14px 28px 0;
    flex-shrink: 0;
    border-bottom: 1px solid #e8edf3;
    background: #f6f8fb;
  }
  .sp-tab {
    display: flex; align-items: center; gap: 7px;
    padding: 9px 16px 11px;
    font-size: 13px; font-weight: 600; color: #64748b;
    cursor: pointer; border: none; background: transparent;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    transition: color 0.15s, border-color 0.15s;
    white-space: nowrap;
    font-family: 'Be Vietnam Pro', sans-serif;
  }
  .sp-tab:hover { color: #0f172a; }
  .sp-tab.active { color: #0f2744; border-bottom-color: #0f2744; }
  .sp-tab-dot {
    width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
  }

  /* ── Tab content ── */
  .sp-tab-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px 28px;
  }

  /* ── Cards ── */
  .sp-card {
    background: #fff;
    border: 1px solid #e8edf3;
    border-radius: 14px;
    padding: 20px;
    margin-bottom: 14px;
  }
  .sp-card-title {
    font-size: 12px; font-weight: 700; color: #94a3b8;
    text-transform: uppercase; letter-spacing: 0.7px;
    margin-bottom: 14px;
  }

  /* ── Brand preview ── */
  .sp-brand-preview {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 14px; border-radius: 12px;
    background: #f8fafc; border: 1px solid #f1f5f9;
    margin-bottom: 16px;
  }
  .sp-brand-avatar {
    width: 42px; height: 42px; border-radius: 10px;
    border: 1px solid #e8edf3; background: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; font-weight: 700; flex-shrink: 0; overflow: hidden;
  }
  .sp-brand-name { font-size: 13px; font-weight: 700; color: #0f172a; }
  .sp-brand-sub { font-size: 11.5px; color: #64748b; margin-top: 2px; }

  /* ── Form elements ── */
  .sp-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 640px) { .sp-grid-2 { grid-template-columns: 1fr; } }

  .sp-field { display: flex; flex-direction: column; gap: 5px; }
  .sp-label {
    font-size: 11.5px; font-weight: 600; color: #475569;
    display: flex; align-items: center; gap: 5px;
  }
  .sp-input {
    width: 100%; height: 38px; padding: 0 11px;
    border: 1px solid #e2e8f0; border-radius: 9px;
    font-size: 13px; color: #0f172a; background: #f8fafc;
    font-family: 'Be Vietnam Pro', sans-serif; outline: none;
    transition: border-color 0.14s, background 0.14s, box-shadow 0.14s;
  }
  .sp-input:focus { border-color: #94a3b8; background: #fff; box-shadow: 0 0 0 3px rgba(15,39,68,0.07); }
  .sp-input:disabled { opacity: 0.45; cursor: not-allowed; }

  .sp-textarea {
    width: 100%; min-height: 76px; padding: 9px 11px;
    border: 1px solid #e2e8f0; border-radius: 9px;
    font-size: 13px; color: #0f172a; background: #f8fafc;
    font-family: 'Be Vietnam Pro', sans-serif; outline: none;
    resize: vertical; line-height: 1.55;
    transition: border-color 0.14s, background 0.14s;
  }
  .sp-textarea:focus { border-color: #94a3b8; background: #fff; box-shadow: 0 0 0 3px rgba(15,39,68,0.07); }
  .sp-textarea:disabled { opacity: 0.45; cursor: not-allowed; }

  .sp-hint { font-size: 11px; color: #94a3b8; line-height: 1.5; }

  .sp-color-row { display: flex; gap: 8px; align-items: center; }
  .sp-color-swatch {
    width: 38px; height: 38px; border-radius: 9px;
    border: 1px solid #e2e8f0; cursor: pointer; flex-shrink: 0;
    padding: 3px; background: transparent;
    transition: transform 0.14s;
  }
  .sp-color-swatch:hover { transform: scale(1.06); }

  /* ── Logo upload ── */
  .sp-logo-drop {
    position: relative; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 5px;
    padding: 20px 12px; border-radius: 10px;
    border: 1.5px dashed #cbd5e1; background: #f8fafc;
    cursor: pointer; text-align: center;
    transition: border-color 0.14s, background 0.14s;
  }
  .sp-logo-drop:hover { border-color: #94a3b8; background: #dbeafe; }
  .sp-logo-drop input[type="file"] { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
  .sp-logo-drop input[type="file"]:disabled { cursor: not-allowed; pointer-events: none; }
  .sp-logo-drop-icon { color: #94a3b8; }
  .sp-logo-drop-text { font-size: 12px; font-weight: 600; color: #475569; }
  .sp-logo-drop-sub { font-size: 11px; color: #94a3b8; }

  .sp-logo-file-row {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 10px; border-radius: 9px;
    background: #f0f4fa; border: 1px solid #e2e8f0;
  }
  .sp-logo-file-row img {
    width: 32px; height: 32px; object-fit: contain;
    border-radius: 6px; background: #fff; border: 1px solid #e2e8f0;
    flex-shrink: 0;
  }
  .sp-logo-file-name {
    font-size: 12px; color: #374151; font-weight: 500;
    flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .sp-logo-clear {
    width: 22px; height: 22px; border-radius: 6px; border: none;
    background: transparent; color: #94a3b8; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.12s, color 0.12s;
  }
  .sp-logo-clear:hover { background: #fee2e2; color: #ef4444; }

  /* ── Buttons ── */
  .sp-btn {
    display: inline-flex; align-items: center; gap: 6px;
    height: 36px; padding: 0 16px; border-radius: 9px;
    font-size: 13px; font-weight: 600; cursor: pointer;
    font-family: 'Be Vietnam Pro', sans-serif;
    transition: opacity 0.13s, transform 0.1s, background 0.12s;
    border: 1px solid #e2e8f0;
    background: transparent; color: #475569;
    white-space: nowrap;
  }

  .sp-btn-primary { background: #0f2744; color: #fff; border-color: transparent; }
  .sp-btn-primary:hover:not(:disabled) { opacity: 0.87; }
  .sp-btn-primary:active:not(:disabled) { transform: translateY(1px); }
  .sp-btn:disabled { opacity: 0.38; cursor: not-allowed; }
  .sp-btn-full { width: 100%; justify-content: center; }

  /* ── Footer bar ── */
  .sp-card-footer {
    display: flex; justify-content: flex-end; gap: 8px;
    padding-top: 14px; margin-top: 14px;
    border-top: 1px solid #f1f5f9;
  }

  /* ── Toggle ── */
  .sp-toggle-row {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 12px 14px; border-radius: 10px;
    background: #f8fafc; border: 1px solid #f1f5f9;
  }
  .sp-toggle-lbl { font-size: 13px; font-weight: 600; color: #1e293b; }
  .sp-toggle-hint { font-size: 11.5px; color: #94a3b8; margin-top: 2px; }
  .sp-toggle-track {
    position: relative; display: inline-block;
    width: 40px; height: 22px; border-radius: 999px;
    transition: background 0.22s; cursor: pointer; flex-shrink: 0;
  }
  .sp-toggle-thumb {
    position: absolute; top: 3px; width: 16px; height: 16px;
    border-radius: 50%; background: #fff;
    box-shadow: 0 1px 4px rgba(0,0,0,0.18); transition: left 0.22s;
  }

  /* ── Status strip ── */
  .sp-status {
    display: flex; align-items: center; gap: 7px; margin-top: 10px;
    padding: 9px 13px; border-radius: 9px;
    background: #f8fafc; border: 1px solid #f1f5f9;
    font-size: 12px; color: #64748b;
  }
  .sp-status-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

  /* ── Time controls ── */
  .sp-time-row { display: flex; gap: 8px; align-items: center; margin-top: 10px; }
  .sp-time-input {
    flex: 1; height: 38px; padding: 0 11px;
    border: 1px solid #e2e8f0; border-radius: 9px;
    font-size: 14px; font-weight: 500; color: #0f172a;
    background: #f8fafc; outline: none;
    font-family: 'JetBrains Mono', monospace;
    transition: border-color 0.14s, background 0.14s;
  }
  .sp-time-input:focus { border-color: #94a3b8; background: #fff; }
  .sp-time-input:disabled { opacity: 0.45; cursor: not-allowed; }

  .sp-uploading { font-size: 12px; color: #0f2744; font-weight: 600; text-align: center; padding: 4px 0; }
  .sp-divider { height: 1px; background: #f1f5f9; margin: 14px 0; }

  /* ── Badge ── */
  .sp-badge {
    font-size: 11px; font-weight: 600; padding: 2px 9px;
    border-radius: 99px; border: 1px solid;
  }
  .sp-badge-on  { background: #dcfce7; color: #15803d; border-color: #bbf7d0; }
  .sp-badge-off { background: #f1f5f9; color: #64748b; border-color: #e2e8f0; }
`;

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toggle({ checked, disabled, onChange }: { checked: boolean; disabled: boolean; onChange: () => void }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1 }}>
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled}
        style={{ position: "absolute", opacity: 0, pointerEvents: "none" }} />
      <span className="sp-toggle-track" style={{ background: checked ? "#0f2744" : "#cbd5e1" }}>
        <span className="sp-toggle-thumb" style={{ left: checked ? "21px" : "3px" }} />
      </span>
    </label>
  );
}

// ─── Tab definitions ──────────────────────────────────────────────────────────
type TabId = "brand" | "tts" | "reset";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "brand", label: "Giao diện", icon: <FiLayout size={13} /> },
  { id: "tts",   label: "Giọng nói", icon: <FiVolume2 size={13} /> },
  { id: "reset", label: "Tự động reset", icon: <FiRefreshCw size={13} /> },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { toasts, removeToast, success, error } = useToast();
  const { refreshSiteConfig } = useSiteConfig();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabId>("brand");

  const [ttsEnabled,       setTtsEnabled]       = useState(false);
  const [autoResetEnabled, setAutoResetEnabled] = useState(false);
  const [autoResetTime,    setAutoResetTime]    = useState("00:00");
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({
    branchName: "", logoUrl: "", primaryColor: "#1a3c6e",
    tickerText: "", workingHours: "", address: "", announcement: "",
  });
  const [siteDraft, setSiteDraft] = useState<SiteConfig>({ ...siteConfig });

  const [loading,       setLoading]       = useState(true);
  const [savingTts,     setSavingTts]     = useState(false);
  const [savingReset,   setSavingReset]   = useState(false);
  const [savingSite,    setSavingSite]    = useState(false);
  const [logoFile,      setLogoFile]      = useState<File | null>(null);
  const [logoPreview,   setLogoPreview]   = useState<string>("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [tts, reset, site] = await Promise.all([
          getTtsSettings(), getAutoResetSettings(), getSiteConfig(),
        ]);
        setTtsEnabled(tts.enabled);
        setAutoResetEnabled(reset.enabled);
        setAutoResetTime(reset.time);
        setSiteConfig(site);
        setSiteDraft(site);
      } catch (err) {
        error(err instanceof Error ? err.message : "Không lấy được cấu hình hệ thống");
      } finally { setLoading(false); }
    };
    void load();
  }, [error]);

  const handleToggleTts = async () => {
    if (loading || savingTts) return;
    setSavingTts(true);
    try {
      const updated = await updateTtsSettings(!ttsEnabled);
      setTtsEnabled(updated.enabled);
      success(updated.enabled ? "Đã bật voice TTS" : "Đã tắt voice TTS");
    } catch (err) {
      error(err instanceof Error ? err.message : "Cập nhật voice thất bại");
    } finally { setSavingTts(false); }
  };

  const handleToggleAutoReset = async () => {
    if (loading || savingReset) return;
    setSavingReset(true);
    try {
      const updated = await updateAutoResetEnabled(!autoResetEnabled);
      setAutoResetEnabled(updated.enabled);
      setAutoResetTime(updated.time);
      success(updated.enabled ? "Đã bật tự động reset vé" : "Đã tắt tự động reset vé");
    } catch (err) {
      error(err instanceof Error ? err.message : "Cập nhật auto reset thất bại");
    } finally { setSavingReset(false); }
  };

  const handleSaveTime = async () => {
    if (loading || savingReset) return;
    setSavingReset(true);
    try {
      const updated = await updateAutoResetTime(autoResetTime);
      setAutoResetEnabled(updated.enabled);
      setAutoResetTime(updated.time);
      success(`Đã lưu giờ reset: ${updated.time}`);
    } catch (err) {
      error(err instanceof Error ? err.message : "Cập nhật giờ reset thất bại");
    } finally { setSavingReset(false); }
  };

  const handleSiteChange = useCallback(<K extends keyof SiteConfig>(key: K, value: SiteConfig[K]) => {
    setSiteDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSaveSite = async () => {
    if (loading || savingSite) return;
    setSavingSite(true);
    try {
      const updated = await updateSiteConfig(siteDraft);
      setSiteConfig(updated);
      setSiteDraft(updated);
      await refreshSiteConfig();
      router.refresh();
      success("Đã cập nhật cấu hình giao diện thành công");
    } catch (err) {
      error(err instanceof Error ? err.message : "Cập nhật giao diện thất bại");
    } finally { setSavingSite(false); }
  };

  const handleResetSite = () => setSiteDraft({ ...siteConfig });

  const handleLogoFile = useCallback((file: File | null) => {
    if (!file) { setLogoFile(null); setLogoPreview(""); return; }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setLogoPreview(e.target?.result as string ?? "");
    reader.readAsDataURL(file);
  }, []);

  const handleUploadLogo = useCallback(async () => {
    if (!logoFile || uploadingLogo) return;
    setUploadingLogo(true);
    try {
      const { logoUrl } = await uploadLogo(logoFile);
      handleSiteChange("logoUrl", logoUrl);
      setSiteConfig(prev => ({ ...prev, logoUrl }));
      setSiteDraft(prev => ({ ...prev, logoUrl }));
      setLogoFile(null);
      setLogoPreview("");
      success("Upload logo thành công!");
    } catch (err) {
      error(err instanceof Error ? err.message : "Upload logo thất bại");
    } finally { setUploadingLogo(false); }
  }, [logoFile, uploadingLogo, handleSiteChange, success, error]);

  const isBusy = loading || savingTts || savingReset;
  const isSiteDirty = JSON.stringify(siteDraft) !== JSON.stringify(siteConfig);

  return (
    <div className="sp">
      <style>{STYLES}</style>

      {/* ── Top bar ── */}
      <div className="sp-topbar">
        <div className="sp-topbar-icon"><FiSettings size={16} /></div>
        <div>
          <div className="sp-topbar-title">Cài đặt hệ thống</div>
        </div>
      </div>

      {/* ── Tab nav ── */}
      <div className="sp-tabs">
        {TABS.map(tab => {
          const isActive = tab.id === activeTab;
          const dotColor =
            tab.id === "tts"   ? (ttsEnabled ? "#16a34a" : "#94a3b8") :
            tab.id === "reset" ? (autoResetEnabled ? "#16a34a" : "#94a3b8") :
            undefined;
          return (
            <button
              key={tab.id}
              className={`sp-tab${isActive ? " active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
              {dotColor && <span className="sp-tab-dot" style={{ background: dotColor }} />}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
      <div className="sp-tab-content">

        {/* ══ TAB: GIAO DIỆN ══ */}
        {activeTab === "brand" && (
          <>
            {/* Brand preview */}
            <div className="sp-brand-preview">
              <div className="sp-brand-avatar" style={{ color: siteDraft.primaryColor }}>
                {siteDraft.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={siteDraft.logoUrl} alt="logo"
                    style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (
                  siteDraft.branchName?.charAt(0)?.toUpperCase() || "T"
                )}
              </div>
              <div>
                <div className="sp-brand-name" style={{ color: "#0f172a" }}>
                  {siteDraft.branchName || "Tòa án nhân dân"}
                </div>
                <div className="sp-brand-sub">
                  {siteDraft.workingHours || "Giờ làm việc chưa cài đặt"}
                  {siteDraft.address ? ` · ${siteDraft.address}` : ""}
                </div>
              </div>
            </div>

            {/* Thông tin cơ bản */}
            <div className="sp-card">
              <div className="sp-card-title">Thông tin cơ bản</div>
              <div className="sp-grid-2" style={{ marginBottom: 12 }}>
                <div className="sp-field">
                  <label className="sp-label"><FiAlignLeft size={11} /> Tên đơn vị</label>
                  <input className="sp-input" placeholder="Tòa án nhân dân khu vực 1"
                    value={siteDraft.branchName}
                    onChange={(e) => handleSiteChange("branchName", e.target.value)}
                    disabled={loading || savingSite} />
                </div>
                <div className="sp-field">
                  <label className="sp-label"><FiSun size={11} /> Màu chủ đạo</label>
                  <div className="sp-color-row">
                    <input type="color" className="sp-color-swatch"
                      value={siteDraft.primaryColor}
                      onChange={(e) => handleSiteChange("primaryColor", e.target.value)}
                      disabled={loading || savingSite} title="Chọn màu" />
                    <input className="sp-input" placeholder="#1a3c6e"
                      value={siteDraft.primaryColor}
                      onChange={(e) => handleSiteChange("primaryColor", e.target.value)}
                      disabled={loading || savingSite}
                      style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13 }} />
                  </div>
                  <span className="sp-hint">Định dạng HEX, ví dụ: #1a3c6e</span>
                </div>
              </div>
              <div className="sp-grid-2">
                <div className="sp-field">
                  <label className="sp-label"><FiClock size={11} /> Giờ làm việc</label>
                  <input className="sp-input" placeholder="07:30 - 11:30 | 13:00 - 17:00"
                    value={siteDraft.workingHours}
                    onChange={(e) => handleSiteChange("workingHours", e.target.value)}
                    disabled={loading || savingSite} />
                </div>
                <div className="sp-field">
                  <label className="sp-label"><FiMapPin size={11} /> Địa chỉ</label>
                  <input className="sp-input" placeholder="123 Nguyễn Văn Linh, Q.7, TP.HCM"
                    value={siteDraft.address}
                    onChange={(e) => handleSiteChange("address", e.target.value)}
                    disabled={loading || savingSite} />
                </div>
              </div>
            </div>

            {/* Màn hình chờ */}
            <div className="sp-card">
              <div className="sp-card-title">Màn hình chờ</div>
              <div className="sp-grid-2" style={{ marginBottom: 12 }}>
                <div className="sp-field">
                  <label className="sp-label"><FiImage size={11} /> Logo</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {!logoPreview ? (
                      <div className="sp-logo-drop">
                        <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml"
                          disabled={loading || savingSite || uploadingLogo}
                          onChange={(e) => handleLogoFile(e.target.files?.[0] ?? null)} />
                        <FiUpload size={18} className="sp-logo-drop-icon" />
                        <span className="sp-logo-drop-text">Chọn hoặc kéo thả</span>
                        <span className="sp-logo-drop-sub">JPG, PNG, WEBP, SVG · tối đa 5MB</span>
                      </div>
                    ) : (
                      <div className="sp-logo-file-row">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={logoPreview} alt="preview" />
                        <span className="sp-logo-file-name">{logoFile?.name}</span>
                        <button className="sp-logo-clear" onClick={() => handleLogoFile(null)}>
                          <FiX size={12} />
                        </button>
                      </div>
                    )}
                    {logoFile && (
                      uploadingLogo ? (
                        <div className="sp-uploading">⏳ Đang upload...</div>
                      ) : (
                        <button className="sp-btn sp-btn-primary sp-btn-full"
                          onClick={() => void handleUploadLogo()}>
                          <FiUpload size={13} /> Upload logo
                        </button>
                      )
                    )}
                    {siteDraft.logoUrl && !logoFile && (
                      <span className="sp-hint" style={{ wordBreak: "break-all" }}>
                        Hiện tại: <strong style={{ color: "#475569" }}>{siteDraft.logoUrl}</strong>
                      </span>
                    )}
                    {!siteDraft.logoUrl && !logoFile && (
                      <span className="sp-hint">Chưa có logo — chọn file để upload</span>
                    )}
                  </div>
                </div>
                <div className="sp-field">
                  <label className="sp-label"><FiAlertCircle size={11} /> Thông báo tạm thời</label>
                  <textarea className="sp-textarea"
                    placeholder="VD: Nghỉ lễ 30/4 - 1/5. Làm việc trở lại từ ngày 2/5."
                    value={siteDraft.announcement}
                    onChange={(e) => handleSiteChange("announcement", e.target.value)}
                    disabled={loading || savingSite} style={{ minHeight: 82 }} />
                  <span className="sp-hint">Hiển thị nổi bật trên màn hình chờ. Để trống nếu không có.</span>
                </div>
              </div>
              <div className="sp-field">
                <label className="sp-label"><FiAlignLeft size={11} /> Văn bản chạy (ticker)</label>
                <input className="sp-input"
                  placeholder="Vui lòng giữ trật tự trong phòng chờ. Cảm ơn quý khách."
                  value={siteDraft.tickerText}
                  onChange={(e) => handleSiteChange("tickerText", e.target.value)}
                  disabled={loading || savingSite} />
                <span className="sp-hint">Hiển thị chạy ngang dưới màn hình chờ. Để trống nếu không dùng.</span>
              </div>

              <div className="sp-card-footer">
                <button className="sp-btn" onClick={handleResetSite}
                  disabled={!isSiteDirty || loading || savingSite}>
                  Hoàn tác
                </button>
                <button className="sp-btn sp-btn-primary" onClick={() => void handleSaveSite()}
                  disabled={!isSiteDirty || loading || savingSite}>
                  <FiCheck size={13} />
                  {savingSite ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ══ TAB: GIỌNG NÓI ══ */}
        {activeTab === "tts" && (
          <div className="sp-card">
            <div className="sp-card-title">Cài đặt giọng nói TTS</div>
            <div className="sp-toggle-row">
              <div>
                <div className="sp-toggle-lbl">Phát giọng khi gọi số</div>
                <div className="sp-toggle-hint">
                  {loading ? "Đang tải..." : savingTts ? "Đang cập nhật..." : "Áp dụng ngay cho thao tác gọi số"}
                </div>
              </div>
              <Toggle checked={ttsEnabled} disabled={loading || savingTts}
                onChange={() => void handleToggleTts()} />
            </div>
            <div className="sp-status">
              <span className="sp-status-dot" style={{ background: ttsEnabled ? "#16a34a" : "#94a3b8" }} />
              {ttsEnabled ? "Voice đang hoạt động" : "Voice đã tắt"}
            </div>
          </div>
        )}

        {/* ══ TAB: TỰ ĐỘNG RESET ══ */}
        {activeTab === "reset" && (
          <div className="sp-card">
            <div className="sp-card-title">Cài đặt tự động reset vé</div>
            <div className="sp-toggle-row">
              <div>
                <div className="sp-toggle-lbl">Bật lịch reset hằng ngày</div>
                <div className="sp-toggle-hint">
                  {loading ? "Đang tải..." : savingReset ? "Đang cập nhật..."
                    : autoResetEnabled ? `Reset lúc ${autoResetTime} mỗi ngày` : "Chưa đặt lịch reset"}
                </div>
              </div>
              <Toggle checked={autoResetEnabled} disabled={loading || savingReset}
                onChange={() => void handleToggleAutoReset()} />
            </div>
            <div className="sp-time-row">
              <input type="time" className="sp-time-input"
                value={autoResetTime}
                onChange={(e) => setAutoResetTime(e.target.value)}
                disabled={isBusy} />
              <button className="sp-btn sp-btn-primary" onClick={() => void handleSaveTime()}
                disabled={isBusy}>
                <FiSave size={13} />
                {savingReset ? "Đang lưu..." : "Lưu giờ"}
              </button>
            </div>
            <div className="sp-status">
              <span className="sp-status-dot" style={{ background: autoResetEnabled ? "#16a34a" : "#94a3b8" }} />
              {autoResetEnabled
                ? `Auto reset lúc ${autoResetTime} hằng ngày`
                : "Auto reset chưa kích hoạt"}
            </div>
          </div>
        )}

      </div>

      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
}