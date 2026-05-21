"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { FiVolume2, FiRefreshCw, FiClock, FiSave } from "react-icons/fi";
import ToastContainer from "@/components/ToastContainer";
import { useToast } from "@/hooks/useToast";
import {
  getAutoResetSettings,
  getTtsSettings,
  updateAutoResetEnabled,
  updateAutoResetTime,
  updateTtsSettings,
} from "@/services/admin.service";

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap');

  .sp *, .sp *::before, .sp *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .sp {
    min-height: 100%;
    padding: 32px 36px;
    font-family: 'Outfit', system-ui, sans-serif;
    color: #0f172a;
  }

  @keyframes spUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .sp-anim { opacity: 0; animation: spUp 0.45s cubic-bezier(0.22,1,0.36,1) forwards; }
  .sp-d0 { animation-delay: 0s; }
  .sp-d1 { animation-delay: 0.08s; }
  .sp-d2 { animation-delay: 0.16s; }

  .sp-page-header { margin-bottom: 28px; }
  .sp-page-title { font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; margin-bottom: 4px; }
  .sp-page-sub { font-size: 14px; color: #64748b; }

  .sp-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    align-items: start;
  }
  @media (max-width: 860px) { .sp-grid { grid-template-columns: 1fr; } }

  .sp-card {
    background: #fff; border-radius: 18px; border: 1px solid #e4eaf1;
    overflow: hidden; transition: box-shadow 0.2s;
  }
  .sp-card:hover { box-shadow: 0 6px 28px rgba(0,0,0,0.07); }

  .sp-card-head {
    padding: 22px 24px 18px; border-bottom: 1px solid #f1f5f9;
    display: flex; align-items: flex-start; gap: 14px;
  }
  .sp-card-ico {
    width: 44px; height: 44px; border-radius: 12px; background: #0f2744;
    display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0;
  }
  .sp-card-ttl { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
  .sp-card-desc { font-size: 13px; color: #64748b; line-height: 1.5; }
  .sp-card-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; }

  .sp-row {
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
    padding: 14px 16px; border-radius: 12px; background: #f8fafc; border: 1px solid #eef2f7;
  }
  .sp-row-lbl { font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 3px; }
  .sp-row-hint { font-size: 12px; color: #94a3b8; }
  .sp-row-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

  .sp-toggle-track {
    position: relative; display: inline-block;
    width: 48px; height: 27px; border-radius: 999px;
    transition: background 0.22s ease; cursor: pointer; flex-shrink: 0;
  }
  .sp-toggle-thumb {
    position: absolute; top: 3px; width: 21px; height: 21px;
    border-radius: 50%; background: #fff;
    box-shadow: 0 1px 5px rgba(0,0,0,0.22); transition: left 0.22s ease;
  }

  .sp-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 10px; border-radius: 999px;
    font-size: 12px; font-weight: 600; border: 1px solid;
  }
  .sp-badge-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

  .sp-time-wrap {
    padding: 16px; border-radius: 12px; background: #f8fafc; border: 1px solid #eef2f7;
  }
  .sp-time-label {
    display: flex; align-items: center; gap: 7px;
    font-size: 13px; font-weight: 600; color: #1e293b; margin-bottom: 12px;
  }
  .sp-time-label-ico { color: #64748b; display: flex; }
  .sp-time-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

  .sp-time-input {
    flex: 1 1 150px; height: 42px; padding: 0 14px;
    border: 1px solid #dde5ef; border-radius: 10px;
    font-size: 15px; font-weight: 600; color: #0f172a;
    background: #fff; outline: none;
    font-family: 'JetBrains Mono', monospace;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .sp-time-input:focus { border-color: #0f2744; box-shadow: 0 0 0 3px rgba(15,39,68,0.1); }
  .sp-time-input:disabled { opacity: 0.55; cursor: not-allowed; }

  .sp-save-btn {
    display: inline-flex; align-items: center; gap: 7px;
    height: 42px; padding: 0 20px; border: none; border-radius: 10px;
    font-size: 14px; font-weight: 700; cursor: pointer;
    background: #0f2744; color: #fff;
    font-family: 'Outfit', inherit;
    transition: opacity 0.15s, transform 0.1s; white-space: nowrap;
  }
  .sp-save-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
  .sp-save-btn:active:not(:disabled) { transform: translateY(0); }
  .sp-save-btn:disabled { background: #94a3b8; cursor: not-allowed; }

  .sp-status-strip {
    padding: 12px 24px; border-top: 1px solid #f1f5f9; background: #fafbfd;
    display: flex; align-items: center; gap: 8px;
    font-size: 12px; color: #94a3b8;
  }
  .sp-status-strip strong { color: #475569; font-weight: 600; }
`;

function Toggle({ checked, disabled, onChange }: { checked: boolean; disabled: boolean; onChange: () => void }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1 }}>
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled}
        style={{ position: "absolute", opacity: 0, pointerEvents: "none" }} />
      <span className="sp-toggle-track" style={{ background: checked ? "#0f2744" : "#cbd5e1" }}>
        <span className="sp-toggle-thumb" style={{ left: checked ? "24px" : "3px" }} />
      </span>
    </label>
  );
}

function Badge({ on }: { on: boolean }) {
  return (
    <span className="sp-badge" style={{
      background: on ? "#dcfce7" : "#f1f5f9",
      color: on ? "#15803d" : "#64748b",
      borderColor: on ? "#bbf7d0" : "#e2e8f0",
    }}>
      <span className="sp-badge-dot" style={{ background: on ? "#16a34a" : "#94a3b8" }} />
      {on ? "Đang bật" : "Đang tắt"}
    </span>
  );
}

function SettingRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="sp-row">
      <div>
        <div className="sp-row-lbl">{label}</div>
        {hint && <div className="sp-row-hint">{hint}</div>}
      </div>
      <div className="sp-row-right">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { toasts, removeToast, success, error } = useToast();

  const [ttsEnabled,       setTtsEnabled]       = useState(false);
  const [autoResetEnabled, setAutoResetEnabled] = useState(false);
  const [autoResetTime,    setAutoResetTime]    = useState("00:00");
  const [loading,          setLoading]          = useState(true);
  const [savingTts,        setSavingTts]        = useState(false);
  const [savingReset,      setSavingReset]      = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [tts, reset] = await Promise.all([getTtsSettings(), getAutoResetSettings()]);
        setTtsEnabled(tts.enabled);
        setAutoResetEnabled(reset.enabled);
        setAutoResetTime(reset.time);
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

  const isBusy = loading || savingTts || savingReset;

  return (
    <div className="sp">
      <style>{STYLES}</style>
      <div className="sp-grid">

        <div className="sp-card sp-anim sp-d1">
          <div className="sp-card-head">
            <div className="sp-card-ico"><FiVolume2 size={20} /></div>
            <div>
              <div className="sp-card-ttl">Giọng nói TTS</div>
              <div className="sp-card-desc">Phát âm thanh khi gọi số tiếp theo và gọi lại số vé</div>
            </div>
          </div>

          <div className="sp-card-body">
            <SettingRow
              label="Bật / tắt voice"
              hint={loading ? "Đang tải..." : savingTts ? "Đang cập nhật..." : "Áp dụng ngay cho thao tác gọi số"}
            >
              <Badge on={ttsEnabled} />
              <Toggle checked={ttsEnabled} disabled={loading || savingTts} onChange={() => void handleToggleTts()} />
            </SettingRow>
          </div>

          <div className="sp-status-strip">
            <FiVolume2 size={13} />
            Trạng thái:&nbsp;<strong>{ttsEnabled ? "Voice đang hoạt động" : "Voice đã tắt"}</strong>
          </div>
        </div>

        {/* Card 2 — Auto Reset */}
        <div className="sp-card sp-anim sp-d2">
          <div className="sp-card-head">
            <div className="sp-card-ico"><FiRefreshCw size={20} /></div>
            <div>
              <div className="sp-card-ttl">Tự động reset vé</div>
              <div className="sp-card-desc">Đặt lịch xóa toàn bộ vé hằng ngày theo giờ cố định</div>
            </div>
          </div>

          <div className="sp-card-body">
            <SettingRow
              label="Bật / tắt auto reset"
              hint={
                loading ? "Đang tải..." :
                savingReset ? "Đang cập nhật..." :
                autoResetEnabled ? `Reset hằng ngày lúc ${autoResetTime}` : "Chưa đặt lịch reset"
              }
            >
              <Badge on={autoResetEnabled} />
              <Toggle checked={autoResetEnabled} disabled={loading || savingReset} onChange={() => void handleToggleAutoReset()} />
            </SettingRow>

            <div className="sp-time-wrap">
              <div className="sp-time-label">
                <span className="sp-time-label-ico"><FiClock size={14} /></span>
                Giờ reset mỗi ngày
              </div>
              <div className="sp-time-controls">
                <input
                  type="time"
                  className="sp-time-input"
                  value={autoResetTime}
                  onChange={(e) => setAutoResetTime(e.target.value)}
                  disabled={isBusy}
                />
                <button
                  type="button"
                  className="sp-save-btn"
                  onClick={() => void handleSaveTime()}
                  disabled={isBusy}
                >
                  <FiSave size={15} />
                  {savingReset ? "Đang lưu..." : "Lưu giờ reset"}
                </button>
              </div>
            </div>
          </div>

          <div className="sp-status-strip">
            <FiRefreshCw size={13} />
            {autoResetEnabled
              ? <>Auto reset:&nbsp;<strong>lúc {autoResetTime} hằng ngày</strong></>
              : <>Auto reset:&nbsp;<strong>chưa kích hoạt</strong></>}
          </div>
        </div>

      </div>
    </div>
  );
}