import React, { useEffect } from "react";
import {
  FiAlertTriangle,
  FiCheck,
  FiInfo,
  FiX,
  FiXCircle,
} from "react-icons/fi";

interface ToastProps {
  isOpen: boolean;
  message: string;
  type?: "success" | "error" | "warning" | "info";
  onClose: () => void;
  duration?: number;
  inline?: boolean;
}

export default function Toast({
  isOpen,
  message,
  type = "info",
  onClose,
  duration = 3000,
  inline = false,
}: ToastProps) {
  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const colorMap = {
    success: {
      accent: "#10a96b",
      soft: "linear-gradient(135deg, rgba(16, 169, 107, 0.1), #ffffff 42%)",
      ring: "rgba(16, 169, 107, 0.18)",
      icon: FiCheck,
      title: "Thành công",
    },
    error: {
      accent: "#d84d4d",
      soft: "linear-gradient(135deg, rgba(216, 77, 77, 0.1), #ffffff 42%)",
      ring: "rgba(216, 77, 77, 0.18)",
      icon: FiXCircle,
      title: "Có lỗi xảy ra",
    },
    warning: {
      accent: "#f59e0b",
      soft: "linear-gradient(135deg, rgba(245, 158, 11, 0.12), #ffffff 42%)",
      ring: "rgba(245, 158, 11, 0.22)",
      icon: FiAlertTriangle,
      title: "Cảnh báo",
    },
    info: {
      accent: "#4f7bd9",
      soft: "linear-gradient(135deg, rgba(79, 123, 217, 0.1), #ffffff 42%)",
      ring: "rgba(79, 123, 217, 0.18)",
      icon: FiInfo,
      title: "Thông báo",
    },
  };

  const colors = colorMap[type];
  const Icon = colors.icon;

  return (
    <div
      style={{
        ...(inline
          ? {}
          : {
              position: "fixed",
              top: 24,
              right: 24,
              zIndex: 9999,
              width: "min(520px, calc(100vw - 32px))",
            }),
        animation: "toastSlideIn 0.32s cubic-bezier(0.2, 0.8, 0.2, 1)",
      }}
    >
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          background: colors.soft,
          borderRadius: 16,
          boxShadow: "0 18px 45px rgba(15, 23, 42, 0.14)",
          display: "flex",
          alignItems: "flex-start",
          gap: 16,
          padding: "20px 52px 20px 22px",
          minHeight: 76,
          border: "1px solid rgba(148, 163, 184, 0.26)",
          fontFamily: "inherit",
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: colors.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            flexShrink: 0,
            boxShadow: `0 0 0 8px ${colors.ring}`,
            marginTop: 1,
          }}
        >
          <Icon size={17} strokeWidth={2.8} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong
            style={{
              display: "block",
              margin: "0 0 4px",
              color: "#111827",
              fontSize: 16,
              lineHeight: 1.35,
              fontWeight: 800,
              wordBreak: "break-word",
            }}
          >
            {message}
          </strong>
          <p
            style={{
              margin: 0,
              color: "#526070",
              fontSize: 13,
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            {colors.title}
          </p>
        </div>
        <button
          type="button"
          aria-label="Đóng thông báo"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "transparent",
            border: "none",
            color: "#7c8794",
            cursor: "pointer",
            padding: 0,
            width: 24,
            height: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = "#111827";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = "#7c8794";
          }}
        >
          <FiX size={18} />
        </button>
      </div>

      <style>{`
        @keyframes toastSlideIn {
          from {
            transform: translateX(24px) scale(0.98);
            opacity: 0;
          }
          to {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
