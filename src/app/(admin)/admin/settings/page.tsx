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

// ─── Toggle component ─────────────────────────────────────────────────────────

function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
      />
      <span
        style={{
          position: "relative",
          display: "inline-block",
          width: "46px",
          height: "26px",
          borderRadius: "999px",
          background: checked ? "#1e4775" : "#cbd5e1",
          transition: "background 0.2s ease",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: "3px",
            left: checked ? "23px" : "3px",
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
            transition: "left 0.2s ease",
          }}
        />
      </span>
    </label>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ on }: { on: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        fontSize: "12px",
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: "999px",
        background: on ? "#dcfce7" : "#f1f5f9",
        color: on ? "#15803d" : "#64748b",
        border: `1px solid ${on ? "#bbf7d0" : "#e2e8f0"}`,
        letterSpacing: "0.01em",
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: on ? "#16a34a" : "#94a3b8",
          flexShrink: 0,
        }}
      />
      {on ? "Đang bật" : "Đang tắt"}
    </span>
  );
}

// ─── Section card wrapper ─────────────────────────────────────────────────────

function SettingCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const card: CSSProperties = {
    background: "#fff",
    borderRadius: "16px",
    border: "1px solid #e8edf2",
    overflow: "hidden",
  };

  const header: CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: "14px",
    padding: "22px 24px 18px",
    borderBottom: "1px solid #f1f5f9",
  };

  const iconWrap: CSSProperties = {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    background: "linear-gradient(135deg, #1e4775 0%, #2d5a8c 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    flexShrink: 0,
  };

  return (
    <div style={card}>
      <div style={header}>
        <div style={iconWrap}>{icon}</div>
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "15px",
              fontWeight: 700,
              color: "#0f172a",
              lineHeight: 1.3,
            }}
          >
            {title}
          </h2>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "13px",
              color: "#64748b",
              lineHeight: 1.5,
            }}
          >
            {description}
          </p>
        </div>
      </div>
      <div style={{ padding: "20px 24px" }}>{children}</div>
    </div>
  );
}

// ─── Row: label + control ─────────────────────────────────────────────────────

function SettingRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        padding: "14px 16px",
        borderRadius: "10px",
        background: "#f8fafc",
        border: "1px solid #f1f5f9",
      }}
    >
      <div>
        <div style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>
          {label}
        </div>
        {hint && (
          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
            {hint}
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
        {children}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { toasts, removeToast, success, error } = useToast();

  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [autoResetEnabled, setAutoResetEnabled] = useState(false);
  const [autoResetTime, setAutoResetTime] = useState("00:00");

  const [loading, setLoading] = useState(true);
  const [savingTts, setSavingTts] = useState(false);
  const [savingReset, setSavingReset] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [tts, reset] = await Promise.all([
          getTtsSettings(),
          getAutoResetSettings(),
        ]);
        setTtsEnabled(tts.enabled);
        setAutoResetEnabled(reset.enabled);
        setAutoResetTime(reset.time);
      } catch (err) {
        error(
          err instanceof Error
            ? err.message
            : "Không lấy được cấu hình hệ thống",
        );
      } finally {
        setLoading(false);
      }
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
      error(
        err instanceof Error
          ? err.message
          : "Cập nhật cấu hình voice thất bại",
      );
    } finally {
      setSavingTts(false);
    }
  };

  const handleToggleAutoReset = async () => {
    if (loading || savingReset) return;
    setSavingReset(true);
    try {
      const updated = await updateAutoResetEnabled(!autoResetEnabled);
      setAutoResetEnabled(updated.enabled);
      setAutoResetTime(updated.time);
      success(
        updated.enabled
          ? "Đã bật tự động reset vé"
          : "Đã tắt tự động reset vé",
      );
    } catch (err) {
      error(
        err instanceof Error
          ? err.message
          : "Cập nhật tự động reset thất bại",
      );
    } finally {
      setSavingReset(false);
    }
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
      error(
        err instanceof Error ? err.message : "Cập nhật giờ reset thất bại",
      );
    } finally {
      setSavingReset(false);
    }
  };

  const isBusy = loading || savingTts || savingReset;

  return (
    <div
      style={{
        padding: "28px 24px",
        maxWidth: "680px",
        fontFamily: "inherit",
      }}
    >
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Card 1 — Voice TTS */}
        <SettingCard
          icon={<FiVolume2 size={18} />}
          title="Chế độ phát giọng nói"
          description="Cấu hình voice TTS cho chức năng gọi số tiếp theo và gọi lại số."
        >
          <SettingRow
            label="Bật / tắt voice"
            hint={
              loading
                ? "Đang tải cấu hình..."
                : savingTts
                  ? "Đang cập nhật..."
                  : "Áp dụng ngay cho thao tác gọi số"
            }
          >
            <StatusBadge on={ttsEnabled} />
            <Toggle
              checked={ttsEnabled}
              disabled={loading || savingTts}
              onChange={() => void handleToggleTts()}
            />
          </SettingRow>
        </SettingCard>

        {/* Card 2 — Auto Reset */}
        <SettingCard
          icon={<FiRefreshCw size={18} />}
          title="Tự động reset vé"
          description="Đặt lịch reset toàn bộ vé hằng ngày theo quyết định của admin."
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

            {/* Toggle row */}
            <SettingRow
              label="Bật / tắt auto reset"
              hint={
                loading
                  ? "Đang tải cấu hình..."
                  : savingReset
                    ? "Đang cập nhật..."
                    : autoResetEnabled
                      ? `Reset hằng ngày lúc ${autoResetTime}`
                      : "Chưa đặt lịch reset"
              }
            >
              <StatusBadge on={autoResetEnabled} />
              <Toggle
                checked={autoResetEnabled}
                disabled={loading || savingReset}
                onChange={() => void handleToggleAutoReset()}
              />
            </SettingRow>

            {/* Time picker row */}
            <div
              style={{
                padding: "16px",
                borderRadius: "10px",
                background: "#f8fafc",
                border: "1px solid #f1f5f9",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "12px",
                }}
              >
                <FiClock size={14} color="#64748b" />
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#1e293b",
                  }}
                >
                  Giờ reset mỗi ngày
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <input
                  type="time"
                  value={autoResetTime}
                  onChange={(e) => setAutoResetTime(e.target.value)}
                  disabled={isBusy}
                  style={{
                    flex: "1 1 160px",
                    height: "42px",
                    padding: "0 14px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    fontSize: "15px",
                    fontWeight: 600,
                    color: "#0f172a",
                    background: "#fff",
                    cursor: isBusy ? "not-allowed" : "text",
                    opacity: isBusy ? 0.6 : 1,
                    outline: "none",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />

                <button
                  type="button"
                  onClick={() => void handleSaveTime()}
                  disabled={isBusy}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    height: "42px",
                    padding: "0 20px",
                    border: "none",
                    borderRadius: "10px",
                    fontSize: "14px",
                    fontWeight: 700,
                    cursor: isBusy ? "not-allowed" : "pointer",
                    background: isBusy
                      ? "#94a3b8"
                      : "linear-gradient(135deg, #1e4775 0%, #2d5a8c 100%)",
                    color: "#fff",
                    transition: "opacity 0.15s ease",
                    whiteSpace: "nowrap",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={(e) => {
                    if (!isBusy)
                      e.currentTarget.style.opacity = "0.88";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                >
                  <FiSave size={15} />
                  {savingReset ? "Đang lưu..." : "Lưu giờ reset"}
                </button>
              </div>
            </div>

          </div>
        </SettingCard>

      </div>
    </div>
  );
}