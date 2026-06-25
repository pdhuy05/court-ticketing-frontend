"use client";

import type { CSSProperties } from "react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FiVolume2, FiRefreshCw, FiClock, FiSave, FiLayout,
  FiMapPin, FiAlignLeft, FiSun, FiImage, FiUpload, FiX,
  FiCheck, FiAlertCircle, FiSettings, FiMonitor, FiPlus, FiTrash2, FiArrowRight,
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
  getDisplayMode,
  updateDisplayMode,
  getServices,
  getServiceSchedules,
  upsertServiceSchedule,
  deleteServiceSchedule,
  toggleServiceSchedule,
  setServiceManualOverride,
  type SiteConfig,
  type DisplayMode,
  type Service,
  type ServiceSchedule,
  type TimeSlot,
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
    display: flex; align-items: center; gap: 7px;
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

  /* ── Display Mode Cards ── */
  .sp-display-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin-bottom: 14px;
  }
  @media (max-width: 640px) { .sp-display-grid { grid-template-columns: 1fr; } }

  .sp-display-card {
    position: relative;
    border: 2px solid #e2e8f0;
    border-radius: 14px;
    padding: 18px 16px 16px;
    cursor: pointer;
    transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
    background: #f8fafc;
    overflow: hidden;
  }
  .sp-display-card:hover { border-color: #94a3b8; background: #fff; }
  .sp-display-card.selected {
    border-color: #0f2744;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(15,39,68,0.10);
  }
  .sp-display-card-check {
    position: absolute; top: 10px; right: 10px;
    width: 20px; height: 20px; border-radius: 50%;
    background: #0f2744; color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px;
    opacity: 0; transform: scale(0.7); transition: opacity 0.18s, transform 0.18s;
  }
  .sp-display-card.selected .sp-display-card-check { opacity: 1; transform: scale(1); }
  .sp-display-card-preview {
    width: 100%; aspect-ratio: 16/10;
    border-radius: 9px; border: 1px solid #e2e8f0;
    background: #e8edf5;
    overflow: hidden;
    margin-bottom: 12px;
    display: flex; flex-direction: column;
  }
  .sp-display-card-title { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 3px; }
  .sp-display-card-desc { font-size: 11.5px; color: #64748b; line-height: 1.5; }

  /* ── Override pulse dot ── */
  @keyframes sp-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.4; transform: scale(0.72); }
  }
  .sp-override-dot {
    display: inline-block;
    width: 7px; height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
    animation: sp-pulse 1.4s ease-in-out infinite;
  }
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
type TabId = "brand" | "display" | "tts" | "reset" | "ticket-hours";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "brand",        label: "Giao diện",       icon: <FiLayout size={13} /> },
  { id: "display",      label: "Màn hình quầy",   icon: <FiMonitor size={13} /> },
  { id: "tts",          label: "Giọng nói",        icon: <FiVolume2 size={13} /> },
  { id: "reset",        label: "Tự động reset",    icon: <FiRefreshCw size={13} /> },
  { id: "ticket-hours", label: "Giờ lấy vé",       icon: <FiClock size={13} /> },
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
  const [displayMode,      setDisplayMode]      = useState<DisplayMode>("service");
  const [savingDisplay,    setSavingDisplay]    = useState(false);
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

  // ── Giờ lấy vé ──
  const [services,          setServices]          = useState<Service[]>([]);
  const [schedules,         setSchedules]         = useState<ServiceSchedule[]>([]);
  const [loadingSchedules,  setLoadingSchedules]  = useState(true);
  const [savingScheduleKey, setSavingScheduleKey] = useState<string | null>(null);
  const [allSlots,          setAllSlots]          = useState<TimeSlot[]>([{ openTime: "07:30", closeTime: "11:30" }]);
  const [pickedServiceId,   setPickedServiceId]   = useState("");
  const [svcSlots,          setSvcSlots]          = useState<TimeSlot[]>([{ openTime: "07:30", closeTime: "11:30" }]);
  const [overrideServiceId, setOverrideServiceId] = useState("ALL");
  const [savingOverride,    setSavingOverride]    = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [tts, reset, site, display] = await Promise.all([
          getTtsSettings(), getAutoResetSettings(), getSiteConfig(), getDisplayMode(),
        ]);
        setTtsEnabled(tts.enabled);
        setAutoResetEnabled(reset.enabled);
        setAutoResetTime(reset.time);
        setSiteConfig(site);
        setSiteDraft(site);
        setDisplayMode(display);
      } catch (err) {
        error(err instanceof Error ? err.message : "Không lấy được cấu hình hệ thống");
      } finally { setLoading(false); }
    };
    void load();
  }, [error]);

  const loadSchedules = useCallback(async () => {
    setLoadingSchedules(true);
    try {
      const [svcList, scheduleList] = await Promise.all([
        getServices(), getServiceSchedules(),
      ]);
      setServices(svcList);
      setSchedules(scheduleList);
      if (!pickedServiceId && svcList.length > 0) {
        setPickedServiceId(svcList[0]._id);
      }
    } catch (err) {
      error(err instanceof Error ? err.message : "Không lấy được lịch giờ lấy vé");
    } finally { setLoadingSchedules(false); }
  }, [error, pickedServiceId]);

  useEffect(() => {
    void loadSchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleSaveDisplayMode = async (mode: DisplayMode) => {
    if (savingDisplay) return;
    setSavingDisplay(true);
    try {
      const updated = await updateDisplayMode(mode);
      setDisplayMode(updated);
      success(updated === "service" ? "Màn hình quầy: hiển thị theo Yêu Cầu" : "Màn hình quầy: hiển thị Danh Sách Chờ");
    } catch (err) {
      error(err instanceof Error ? err.message : "Cập nhật chế độ màn hình thất bại");
    } finally { setSavingDisplay(false); }
  };

  // ── Giờ lấy vé helpers ──
  const getScheduleId = (schedule: ServiceSchedule): string =>
    schedule.serviceId === "ALL" ? "ALL" : (schedule.serviceId as { _id: string })?._id || "";

  const allSchedule = schedules.find((s) => getScheduleId(s) === "ALL") || null;
  const perServiceSchedules = schedules.filter((s) => getScheduleId(s) !== "ALL");

  const getServiceName = (id: string) =>
    services.find((s) => s._id === id)?.name || "Dịch vụ đã xóa";

  const getServiceOverride = (id: string): "open" | "closed" | null => {
    const svc = services.find((s) => s._id === id);
    return svc?.manualOverride ?? null;
  };

  // Slot helpers
  const addSlot = (setter: React.Dispatch<React.SetStateAction<TimeSlot[]>>) => {
    setter((prev) => [...prev, { openTime: "13:00", closeTime: "17:00" }]);
  };

  const removeSlot = (setter: React.Dispatch<React.SetStateAction<TimeSlot[]>>, idx: number) => {
    setter((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateSlot = (setter: React.Dispatch<React.SetStateAction<TimeSlot[]>>, idx: number, field: keyof TimeSlot, value: string) => {
    setter((prev) => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const validateSlots = (slots: TimeSlot[]): string | null => {
    if (slots.length === 0) return "Cần ít nhất 1 ca";
    for (const s of slots) {
      if (!s.openTime || !s.closeTime || s.openTime >= s.closeTime)
        return `Giờ mở phải trước giờ đóng (${s.openTime} - ${s.closeTime})`;
    }
    const sorted = [...slots].sort((a, b) => a.openTime.localeCompare(b.openTime));
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].openTime < sorted[i - 1].closeTime)
        return `Các ca bị chồng giờ nhau`;
    }
    return null;
  };

  const handleSaveAllSchedule = async () => {
    const err2 = validateSlots(allSlots);
    if (err2) { error(err2); return; }
    setSavingScheduleKey("ALL");
    try {
      await upsertServiceSchedule({ serviceId: "ALL", slots: allSlots, isEnabled: true });
      await loadSchedules();
      success(`Đã lưu ${allSlots.length} ca cho tất cả dịch vụ`);
    } catch (err) {
      error(err instanceof Error ? err.message : "Lưu giờ chung thất bại");
    } finally { setSavingScheduleKey(null); }
  };

  const handleToggleAllSchedule = async () => {
    if (!allSchedule) return;
    setSavingScheduleKey("ALL");
    try {
      await toggleServiceSchedule("ALL", !allSchedule.isEnabled);
      await loadSchedules();
      success(!allSchedule.isEnabled ? "Đã bật giờ lấy vé chung" : "Đã tắt giờ lấy vé chung");
    } catch (err) {
      error(err instanceof Error ? err.message : "Cập nhật trạng thái thất bại");
    } finally { setSavingScheduleKey(null); }
  };

  const handleDeleteAllSchedule = async () => {
    setSavingScheduleKey("ALL");
    try {
      await deleteServiceSchedule("ALL");
      await loadSchedules();
      success("Đã xóa giờ lấy vé chung");
    } catch (err) {
      error(err instanceof Error ? err.message : "Xóa giờ chung thất bại");
    } finally { setSavingScheduleKey(null); }
  };

  const handleSaveServiceSchedule = async () => {
    if (!pickedServiceId) { error("Vui lòng chọn dịch vụ"); return; }
    const err2 = validateSlots(svcSlots);
    if (err2) { error(err2); return; }
    setSavingScheduleKey(pickedServiceId);
    try {
      await upsertServiceSchedule({ serviceId: pickedServiceId, slots: svcSlots, isEnabled: true });
      await loadSchedules();
      success(`Đã lưu ${svcSlots.length} ca cho "${getServiceName(pickedServiceId)}"`);
    } catch (err) {
      error(err instanceof Error ? err.message : "Lưu giờ thất bại");
    } finally { setSavingScheduleKey(null); }
  };

  const handleToggleServiceSchedule = async (schedule: ServiceSchedule) => {
    const id = getScheduleId(schedule);
    if (!id) return;
    setSavingScheduleKey(id);
    try {
      await toggleServiceSchedule(id, !schedule.isEnabled);
      await loadSchedules();
      success(!schedule.isEnabled ? "Đã bật lịch giờ" : "Đã tắt lịch giờ");
    } catch (err) {
      error(err instanceof Error ? err.message : "Cập nhật trạng thái thất bại");
    } finally { setSavingScheduleKey(null); }
  };

  const handleDeleteServiceSchedule = async (schedule: ServiceSchedule) => {
    const id = getScheduleId(schedule);
    if (!id) return;
    setSavingScheduleKey(id);
    try {
      await deleteServiceSchedule(id);
      await loadSchedules();
      success("Đã xóa lịch giờ riêng cho dịch vụ này");
    } catch (err) {
      error(err instanceof Error ? err.message : "Xóa lịch thất bại");
    } finally { setSavingScheduleKey(null); }
  };

  const handleSetOverride = async (override: "open" | "closed" | null) => {
    setSavingOverride(true);
    try {
      await setServiceManualOverride(overrideServiceId, override);
      await loadSchedules();
      const label = overrideServiceId === "ALL" ? "Tất cả dịch vụ" : getServiceName(overrideServiceId);
      if (override === null) success(`${label}: trả về chế độ tự động theo lịch`);
      else if (override === "open") success(`${label}: đã mở ngay lập tức`);
      else success(`${label}: đã đóng ngay lập tức`);
    } catch (err) {
      error(err instanceof Error ? err.message : "Thao tác thất bại");
    } finally { setSavingOverride(false); }
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

  // ── Tính trạng thái override tổng hợp để hiển thị dot trên tiêu đề card ──
  const overallOverrideStatus: "open" | "closed" | "mixed" | null = (() => {
    if (services.length === 0) return null;
    const overrides = services.map((s) => s.manualOverride ?? null);
    const hasOpen   = overrides.some((o) => o === "open");
    const hasClosed = overrides.some((o) => o === "closed");
    if (hasOpen && hasClosed) return "mixed";
    if (hasOpen)   return "open";
    if (hasClosed) return "closed";
    return null;
  })();

  const overrideDotColor =
    overallOverrideStatus === "open"   ? "#16a34a" :
    overallOverrideStatus === "closed" ? "#dc2626" :
    overallOverrideStatus === "mixed"  ? "#f59e0b" :
    null;

  const overrideDotTitle =
    overallOverrideStatus === "open"   ? "Có dịch vụ đang giữ MỞ thủ công" :
    overallOverrideStatus === "closed" ? "Có dịch vụ đang giữ ĐÓNG thủ công" :
    overallOverrideStatus === "mixed"  ? "Có dịch vụ vừa mở vừa đóng thủ công" :
    "";

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
            tab.id === "tts"          ? (ttsEnabled ? "#16a34a" : "#94a3b8") :
            tab.id === "reset"        ? (autoResetEnabled ? "#16a34a" : "#94a3b8") :
            tab.id === "ticket-hours" ? (schedules.some((s) => s.isEnabled) ? "#16a34a" : "#94a3b8") :
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
                        <span className="sp-logo-drop-sub">JPG, PNG, WEBP · tối đa 5MB</span>
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

        {/* ══ TAB: MÀN HÌNH QUẦY ══ */}
        {activeTab === "display" && (
          <div className="sp-card">
            <div className="sp-card-title">Chế độ hiển thị màn hình quầy</div>

            <div className="sp-display-grid">
              {/* Option: Service mode */}
              <div
                className={`sp-display-card${displayMode === "service" ? " selected" : ""}`}
                onClick={() => !savingDisplay && void handleSaveDisplayMode("service")}
              >
                <div className="sp-display-card-check"><FiCheck size={11} /></div>
                <div className="sp-display-card-preview">
                  <div style={{ background: "#003366", height: "22%", display: "flex", alignItems: "center", padding: "0 6px", gap: 4 }}>
                    <div style={{ width: 14, height: 14, borderRadius: 2, background: "rgba(255,255,255,0.3)" }} />
                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.25)" }} />
                    <div style={{ width: 28, height: 10, borderRadius: 9, background: "#ffc233" }} />
                  </div>
                  <div style={{ flex: 1, display: "grid", gridTemplateRows: "repeat(3,1fr)", padding: "2px 4px", gap: 2 }}>
                    {[["#e8edf5","#003366"],["#003366","#fff"],["#e8edf5","#003366"]].map(([bg, fg], i) => (
                      <div key={i} style={{ background: bg, borderRadius: 4, display: "grid", gridTemplateColumns: "35% 1fr", overflow: "hidden" }}>
                        <div style={{ borderRight: `1px solid ${fg === "#fff" ? "rgba(255,255,255,0.2)" : "#ccc"}`, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>
                          <div style={{ width: "70%", height: 5, borderRadius: 2, background: fg === "#fff" ? "rgba(255,255,255,0.6)" : "rgba(0,51,102,0.35)" }} />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
                          <div style={{ width: 18, height: 10, borderRadius: 2, background: fg === "#fff" ? "rgba(255,255,255,0.8)" : "rgba(0,51,102,0.4)", fontFamily: "monospace", fontSize: 7, display: "flex", alignItems: "center", justifyContent: "center", color: fg }} />
                          <div style={{ width: "55%", height: 3, borderRadius: 1, background: fg === "#fff" ? "rgba(255,255,255,0.4)" : "rgba(0,51,102,0.2)" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: "#c0392b", height: "16%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: "60%", height: 5, borderRadius: 2, background: "rgba(255,255,255,0.6)" }} />
                  </div>
                </div>
                <div className="sp-display-card-title">Theo Yêu Cầu</div>
                <div className="sp-display-card-desc">
                  Mỗi hàng là một loại yêu cầu, hiển thị số phiếu + tên đương sự đang xử lý cho từng yêu cầu.
                </div>
              </div>

              {/* Option: Queue mode */}
              <div
                className={`sp-display-card${displayMode === "queue" ? " selected" : ""}`}
                onClick={() => !savingDisplay && void handleSaveDisplayMode("queue")}
              >
                <div className="sp-display-card-check"><FiCheck size={11} /></div>
                <div className="sp-display-card-preview">
                  <div style={{ background: "#003366", height: "22%", display: "flex", alignItems: "center", padding: "0 6px", gap: 4 }}>
                    <div style={{ width: 14, height: 14, borderRadius: 2, background: "rgba(255,255,255,0.3)" }} />
                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.25)" }} />
                    <div style={{ width: 28, height: 10, borderRadius: 9, background: "#ffc233" }} />
                  </div>
                  <div style={{ background: "#003366", height: "14%", display: "grid", gridTemplateColumns: "28% 50% 22%", borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
                    {["", "", ""].map((_, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.15)" : "none" }}>
                        <div style={{ width: "60%", height: 4, borderRadius: 1, background: "rgba(255,255,255,0.5)" }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ flex: 1, display: "grid", gridTemplateRows: "repeat(4,1fr)", padding: "2px 4px", gap: 1 }}>
                    {[0,1,2,3].map((i) => {
                      const isEven = i % 2 === 0;
                      const isFirst = i === 0;
                      return (
                        <div key={i} style={{ background: isFirst ? (isEven ? "linear-gradient(90deg,#164b87,#0a3d78)" : "#f3fbf5") : (isEven ? "#e8edf5" : "#fff"), borderRadius: 3, display: "grid", gridTemplateColumns: "28% 50% 22%", overflow: "hidden", boxShadow: isFirst ? "inset 0 0 0 2px rgba(77,208,109,0.7)" : "none" }}>
                          {[0,1,2].map((j) => (
                            <div key={j} style={{ display: "flex", alignItems: "center", justifyContent: "center", borderRight: j < 2 ? "1px solid rgba(0,0,0,0.08)" : "none" }}>
                              <div style={{ width: j === 1 ? 16 : "50%", height: j === 1 ? 10 : 4, borderRadius: 2, background: isFirst ? (isEven ? "rgba(255,255,255,0.7)" : "rgba(0,51,102,0.4)") : "rgba(0,51,102,0.2)" }} />
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ background: "#c0392b", height: "12%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: "55%", height: 4, borderRadius: 2, background: "rgba(255,255,255,0.6)" }} />
                  </div>
                </div>
                <div className="sp-display-card-title">Danh Sách Chờ</div>
                <div className="sp-display-card-desc">
                  Hiển thị danh sách tối đa 5 vé (đang xử lý + đang chờ), có cột Yêu Cầu, Thông Tin và Trạng Thái.
                </div>
              </div>
            </div>

            <div className="sp-status">
              <span className="sp-status-dot" style={{ background: "#0f2744" }} />
              {savingDisplay
                ? "Đang cập nhật..."
                : displayMode === "service"
                  ? "Đang dùng: Màn hình theo Yêu Cầu"
                  : "Đang dùng: Màn hình Danh Sách Chờ"}
            </div>
          </div>
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

        {/* ══ TAB: GIỜ LẤY VÉ ══ */}
        {activeTab === "ticket-hours" && (
          <>
            {/* ─ Giờ chung ─ */}
            <div className="sp-card">
              <div className="sp-card-title">Giờ lấy vé chung</div>
              <span className="sp-hint">
                Áp dụng cho tất cả dịch vụ. Lịch riêng từng dịch vụ sẽ ưu tiên hơn.
              </span>

              {allSchedule && (
                <div className="sp-toggle-row" style={{ marginTop: 12 }}>
                  <div>
                    <div className="sp-toggle-lbl">Bật lịch chung</div>
                    <div className="sp-toggle-hint">
                      {savingScheduleKey === "ALL" ? "Đang cập nhật..."
                        : allSchedule.isEnabled
                          ? `Đang áp dụng ${allSchedule.slots?.length || 1} ca`
                          : "Đã tắt"}
                    </div>
                  </div>
                  <Toggle checked={allSchedule.isEnabled}
                    disabled={loadingSchedules || savingScheduleKey === "ALL"}
                    onChange={() => void handleToggleAllSchedule()} />
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
                {allSlots.map((slot, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, color: "#94a3b8", width: 36, flexShrink: 0 }}>
                      Ca {idx + 1}
                    </span>
                    <input type="time" className="sp-time-input" style={{ flex: 1 }}
                      value={slot.openTime}
                      onChange={(e) => updateSlot(setAllSlots, idx, "openTime", e.target.value)}
                      disabled={loadingSchedules || savingScheduleKey === "ALL"} />
                    <FiArrowRight size={13} style={{ color: "#94a3b8", flexShrink: 0 }} />
                    <input type="time" className="sp-time-input" style={{ flex: 1 }}
                      value={slot.closeTime}
                      onChange={(e) => updateSlot(setAllSlots, idx, "closeTime", e.target.value)}
                      disabled={loadingSchedules || savingScheduleKey === "ALL"} />
                    <button
                      className="sp-logo-clear"
                      style={{ width: 28, height: 28, opacity: allSlots.length > 1 ? 1 : 0, pointerEvents: allSlots.length > 1 ? "auto" : "none" }}
                      onClick={() => removeSlot(setAllSlots, idx)}
                      disabled={loadingSchedules || savingScheduleKey === "ALL"}>
                      <FiX size={13} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="sp-card-footer" style={{ justifyContent: "space-between" }}>
                <button className="sp-btn"
                  onClick={() => addSlot(setAllSlots)}
                  disabled={loadingSchedules || savingScheduleKey === "ALL" || allSlots.length >= 5}>
                  <FiPlus size={13} /> Thêm ca
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  {allSchedule && (
                    <button className="sp-btn"
                      onClick={() => void handleDeleteAllSchedule()}
                      disabled={loadingSchedules || savingScheduleKey === "ALL"}>
                      Xóa lịch
                    </button>
                  )}
                  <button className="sp-btn sp-btn-primary"
                    onClick={() => void handleSaveAllSchedule()}
                    disabled={loadingSchedules || savingScheduleKey === "ALL"}>
                    <FiSave size={13} />
                    {savingScheduleKey === "ALL" ? "Đang lưu..." : "Lưu"}
                  </button>
                </div>
              </div>
            </div>

            {/* ─ Giờ riêng ─ */}
            <div className="sp-card">
              <div className="sp-card-title">Giờ riêng theo dịch vụ</div>
              <span className="sp-hint">Ưu tiên hơn lịch chung khi được đặt.</span>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
                <select className="sp-input" style={{ cursor: "pointer" }}
                  value={pickedServiceId}
                  onChange={(e) => setPickedServiceId(e.target.value)}
                  disabled={loadingSchedules || services.length === 0}>
                  {services.length === 0 && <option value="">Không có dịch vụ</option>}
                  {services.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>

                {svcSlots.map((slot, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, color: "#94a3b8", width: 36, flexShrink: 0 }}>
                      Ca {idx + 1}
                    </span>
                    <input type="time" className="sp-time-input" style={{ flex: 1 }}
                      value={slot.openTime}
                      onChange={(e) => updateSlot(setSvcSlots, idx, "openTime", e.target.value)}
                      disabled={loadingSchedules} />
                    <FiArrowRight size={13} style={{ color: "#94a3b8", flexShrink: 0 }} />
                    <input type="time" className="sp-time-input" style={{ flex: 1 }}
                      value={slot.closeTime}
                      onChange={(e) => updateSlot(setSvcSlots, idx, "closeTime", e.target.value)}
                      disabled={loadingSchedules} />
                    <button
                      className="sp-logo-clear"
                      style={{ width: 28, height: 28, opacity: svcSlots.length > 1 ? 1 : 0, pointerEvents: svcSlots.length > 1 ? "auto" : "none" }}
                      onClick={() => removeSlot(setSvcSlots, idx)}
                      disabled={loadingSchedules}>
                      <FiX size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {perServiceSchedules.length > 0 && (
                <>
                  <div className="sp-divider" style={{ marginTop: 16 }} />
                  <div className="sp-card-title" style={{ marginBottom: 10 }}>
                    Đã đặt ({perServiceSchedules.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {perServiceSchedules.map((schedule) => {
                      const id = getScheduleId(schedule);
                      const isSaving = savingScheduleKey === id;
                      const slots = schedule.slots?.length
                        ? schedule.slots
                        : schedule.openTime ? [{ openTime: schedule.openTime, closeTime: schedule.closeTime ?? "" }] : [];
                      return (
                        <div key={id} className="sp-toggle-row">
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="sp-toggle-lbl">{getServiceName(id)}</div>
                            <div className="sp-toggle-hint">
                              {isSaving ? "Đang cập nhật..."
                                : slots.map((s) => `${s.openTime}–${s.closeTime}`).join(" · ")}
                              {" "}
                              <span className={`sp-badge ${schedule.isEnabled ? "sp-badge-on" : "sp-badge-off"}`}>
                                {schedule.isEnabled ? "Đang áp dụng" : "Đã tắt"}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <Toggle checked={schedule.isEnabled} disabled={isSaving}
                              onChange={() => void handleToggleServiceSchedule(schedule)} />
                            <button className="sp-logo-clear" style={{ width: 26, height: 26 }}
                              onClick={() => void handleDeleteServiceSchedule(schedule)}
                              disabled={isSaving}>
                              <FiTrash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              <div className="sp-card-footer" style={{ justifyContent: "space-between" }}>
                <button className="sp-btn"
                  onClick={() => addSlot(setSvcSlots)}
                  disabled={loadingSchedules || svcSlots.length >= 5}>
                  <FiPlus size={13} /> Thêm ca
                </button>
                <button className="sp-btn sp-btn-primary"
                  onClick={() => void handleSaveServiceSchedule()}
                  disabled={loadingSchedules || !pickedServiceId || savingScheduleKey === pickedServiceId}>
                  <FiSave size={13} />
                  {savingScheduleKey === pickedServiceId ? "Đang lưu..." : "Lưu giờ riêng"}
                </button>
              </div>
            </div>

            {/* ─ Điều chỉnh thủ công ─ */}
            <div className="sp-card">
              {/* Tiêu đề + pulse dot */}
              <div className="sp-card-title">
                Điều chỉnh thủ công
                {overrideDotColor && (
                  <span
                    className="sp-override-dot"
                    title={overrideDotTitle}
                    style={{ background: overrideDotColor }}
                  />
                )}
              </div>
              <span className="sp-hint">
                Ghi đè lịch tự động, có hiệu lực ngay. Chọn &quot;Tự động&quot; để trả lại quyền kiểm soát cho lịch.
              </span>

              <select
                className="sp-input"
                style={{ cursor: "pointer", marginTop: 12 }}
                value={overrideServiceId}
                onChange={(e) => setOverrideServiceId(e.target.value)}
                disabled={savingOverride}
              >
                <option value="ALL">Tất cả dịch vụ</option>
                {services.map((s) => {
                  const ov = s.manualOverride;
                  const tag = ov === "open" ? " [Đang mở]" : ov === "closed" ? " [Đã đóng]" : "";
                  return (
                    <option key={s._id} value={s._id}>
                      {s.name}{tag}
                    </option>
                  );
                })}
              </select>

              {/* ── Trạng thái hiện tại của mục đang chọn ── */}
              {(() => {
                const currentOverride =
                  overrideServiceId === "ALL" ? null : getServiceOverride(overrideServiceId);
                const isOpen   = currentOverride === "open";
                const isClosed = currentOverride === "closed";
                return (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    marginTop: 10, padding: "9px 13px", borderRadius: 9,
                    background: isOpen ? "#f0fdf4" : isClosed ? "#fef2f2" : "#f8fafc",
                    border: `1px solid ${isOpen ? "#bbf7d0" : isClosed ? "#fecaca" : "#e2e8f0"}`,
                  }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                      background: isOpen ? "#16a34a" : isClosed ? "#dc2626" : "#94a3b8",
                    }} />
                    <span style={{
                      fontSize: 12, fontWeight: 600,
                      color: isOpen ? "#15803d" : isClosed ? "#dc2626" : "#64748b",
                    }}>
                      {overrideServiceId === "ALL"
                        ? "Tất cả dịch vụ — chọn hành động bên dưới"
                        : isOpen
                        ? `"${getServiceName(overrideServiceId)}" đang được giữ MỞ thủ công`
                        : isClosed
                        ? `"${getServiceName(overrideServiceId)}" đang được giữ ĐÓNG thủ công`
                        : `"${getServiceName(overrideServiceId)}" đang chạy theo lịch tự động`}
                    </span>
                  </div>
                );
              })()}

              {/* ── Nút hành động ── */}
              {(() => {
                const currentOverride =
                  overrideServiceId === "ALL" ? null : getServiceOverride(overrideServiceId);
                const isActiveOpen   = currentOverride === "open";
                const isActiveClosed = currentOverride === "closed";
                const isActiveAuto   = currentOverride === null || currentOverride === undefined;
                return (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 10 }}>
                    <button
                      className="sp-btn"
                      style={{
                        justifyContent: "center",
                        background:   isActiveOpen ? "#16a34a" : "#f0fdf4",
                        color:        isActiveOpen ? "#fff"    : "#15803d",
                        borderColor:  isActiveOpen ? "#16a34a" : "#bbf7d0",
                        fontWeight:   isActiveOpen ? 700 : 600,
                        boxShadow:    isActiveOpen ? "0 0 0 3px rgba(22,163,74,0.18)" : "none",
                      }}
                      onClick={() => void handleSetOverride("open")}
                      disabled={savingOverride || loadingSchedules}
                    >
                      {isActiveOpen ? "Đang mở ✓" : "Mở ngay"}
                    </button>

                    <button
                      className="sp-btn"
                      style={{
                        justifyContent: "center",
                        background:   isActiveClosed ? "#dc2626" : "#fef2f2",
                        color:        isActiveClosed ? "#fff"    : "#dc2626",
                        borderColor:  isActiveClosed ? "#dc2626" : "#fecaca",
                        fontWeight:   isActiveClosed ? 700 : 600,
                        boxShadow:    isActiveClosed ? "0 0 0 3px rgba(220,38,38,0.18)" : "none",
                      }}
                      onClick={() => void handleSetOverride("closed")}
                      disabled={savingOverride || loadingSchedules}
                    >
                      {isActiveClosed ? "Đang đóng ✓" : "Đóng ngay"}
                    </button>

                    <button
                      className="sp-btn"
                      style={{
                        justifyContent: "center",
                        background:   isActiveAuto ? "#0f2744"     : "transparent",
                        color:        isActiveAuto ? "#fff"         : "#475569",
                        borderColor:  isActiveAuto ? "#0f2744"     : "#e2e8f0",
                        fontWeight:   isActiveAuto ? 700 : 600,
                        boxShadow:    isActiveAuto ? "0 0 0 3px rgba(15,39,68,0.14)" : "none",
                      }}
                      onClick={() => void handleSetOverride(null)}
                      disabled={savingOverride || loadingSchedules}
                    >
                      <FiRefreshCw size={13} />
                      {isActiveAuto ? "Tự động ✓" : "Tự động"}
                    </button>
                  </div>
                );
              })()}

              {savingOverride && (
                <div className="sp-status" style={{ marginTop: 10 }}>
                  <span className="sp-status-dot" style={{ background: "#f59e0b" }} />
                  Đang cập nhật...
                </div>
              )}
            </div>
          </>
        )}

      </div>

      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
}