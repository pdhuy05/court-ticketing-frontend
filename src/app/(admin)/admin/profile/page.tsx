"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FiEdit3,
  FiLogOut,
  FiMail,
  FiMapPin,
  FiPhone,
  FiShield,
  FiUser,
} from "react-icons/fi";
import ToastContainer from "@/components/ToastContainer";
import { clearAdminSession } from "@/lib/admin-auth";
import { useToast } from "@/hooks/useToast";
import { AdminProfile, getMyProfile } from "@/services/auth.service";

type StatusBadgeProps = {
  tone: "green" | "red" | "gray" | "blue";
  children: ReactNode;
};

const LOGIN_PATH = "/admin/login";

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  padding: "32px",
  background: "#f1f5f9",
  color: "#1e293b",
};

const shellStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "24px",
  maxWidth: "1200px",
  margin: "0 auto",
};

const headerStyle: CSSProperties = {
  borderRadius: "24px",
  padding: "32px 36px",
  background: "linear-gradient(135deg, #1e4775 0%, #0f2b48 100%)",
  color: "white",
  boxShadow: "0 20px 40px rgba(30, 71, 117, 0.25)",
  position: "relative",
  overflow: "hidden",
};

const cardStyle: CSSProperties = {
  overflow: "hidden",
  borderRadius: "24px",
  border: "1px solid #eef2f6",
  background: "#ffffff",
  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)",
};

const cardHeadStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "24px",
  padding: "28px 32px",
  borderBottom: "1px solid #f1f5f9",
  background: "white",
};

const avatarStyle: CSSProperties = {
  width: "80px",
  height: "80px",
  borderRadius: "24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "0 0 auto",
  background: "linear-gradient(135deg, #1e4775 0%, #2d5a8c 100%)",
  color: "white",
  fontSize: "32px",
  fontWeight: 800,
  boxShadow: "0 8px 20px rgba(30, 71, 117, 0.3)",
};

const sectionGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "20px",
  padding: "28px 32px",
};

const sectionStyle: CSSProperties = {
  borderRadius: "16px",
  border: "1px solid #eef2f6",
  background: "#ffffff",
  padding: "20px",
  transition: "all 0.2s ease",
};

const sectionTitleStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  margin: "0 0 20px",
  color: "#1e4775",
  fontSize: "15px",
  fontWeight: 700,
  letterSpacing: "0.3px",
};

const rowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 0",
  borderBottom: "1px solid #f1f5f9",
};

const labelStyle: CSSProperties = {
  color: "#64748b",
  fontSize: "13px",
  fontWeight: 500,
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const valueStyle: CSSProperties = {
  color: "#1e293b",
  fontSize: "14px",
  fontWeight: 600,
  wordBreak: "break-word",
  textAlign: "right",
};

const actionBarStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "flex-end",
  gap: "12px",
  padding: "20px 32px 32px",
  borderTop: "1px solid #f1f5f9",
  background: "#fafbfc",
};

const buttonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  minHeight: "44px",
  border: "none",
  borderRadius: "14px",
  padding: "0 24px",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const formatRole = (role?: string) => {
  if (role === "admin") return "Quản trị viên";
  if (role === "staff") return "Nhân viên";
  return role || "—";
};

const getDisplayName = (user: AdminProfile) =>
  user.fullName?.trim() || user.username?.trim() || "Admin";

const getContactValue = (value?: string | null) => value?.trim() || "Chưa cập nhật";

function StatusBadge({ tone, children }: StatusBadgeProps) {
  const colorMap: Record<StatusBadgeProps["tone"], CSSProperties> = {
    green: {
      color: "#059669",
      background: "#d1fae5",
      borderColor: "#a7f3d0",
    },
    red: {
      color: "#dc2626",
      background: "#fee2e2",
      borderColor: "#fecaca",
    },
    gray: {
      color: "#64748b",
      background: "#f1f5f9",
      borderColor: "#e2e8f0",
    },
    blue: {
      color: "#2563eb",
      background: "#dbeafe",
      borderColor: "#bfdbfe",
    },
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        border: "1px solid",
        borderRadius: "40px",
        padding: "4px 12px",
        fontSize: "12px",
        fontWeight: 600,
        ...colorMap[tone],
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: colorMap[tone].color,
        }}
      />
      {children}
    </span>
  );
}

function InfoRow({
  label,
  children,
  icon,
}: {
  label: string;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div style={rowStyle}>
      <span style={labelStyle}>
        {icon && <span style={{ fontSize: "14px" }}>{icon}</span>}
        {label}
      </span>
      <div style={valueStyle}>{children}</div>
    </div>
  );
}

export default function AdminProfilePage() {
  const router = useRouter();
  const { toasts, removeToast, info } = useToast();
  const [adminUser, setAdminUser] = useState<AdminProfile | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      const token = localStorage.getItem("adminToken");

      if (!token) {
        router.replace(LOGIN_PATH);
        return;
      }

      try {
        const profile = await getMyProfile();
        localStorage.setItem("adminUser", JSON.stringify(profile));

        if (!isMounted) {
          return;
        }

        setAdminUser(profile);
        setIsReady(true);
      } catch {
        clearAdminSession();
        router.replace(LOGIN_PATH);
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleLogout = () => {
    clearAdminSession();
    router.replace(LOGIN_PATH);
  };

  const handleEditProfile = () => {
    info("Tính năng đang phát triển");
  };

  if (!isReady || !adminUser) {
    return null;
  }

  const displayName = getDisplayName(adminUser);
  const initial = displayName.charAt(0).toUpperCase();
  const services = adminUser.effectiveServices || [];

  return (
    <main style={pageStyle}>
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />

      <div style={shellStyle}>
        {/* Header */}
        <section style={headerStyle}>
          <div
            style={{
              position: "absolute",
              top: -50,
              right: -50,
              width: "200px",
              height: "200px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.05)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -30,
              left: -30,
              width: "150px",
              height: "150px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.03)",
            }}
          />
          <p
            style={{
              margin: "0 0 8px",
              color: "rgba(255, 255, 255, 0.7)",
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}
          >
            Thông tin cá nhân
          </p>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(28px, 4vw, 36px)",
              fontWeight: 800,
            }}
          >
            Hồ sơ của tôi
          </h1>
          <p
            style={{
              margin: "12px 0 0",
              color: "rgba(255, 255, 255, 0.8)",
              fontSize: "14px",
            }}
          >
            Quản lý thông tin tài khoản và cài đặt cá nhân
          </p>
        </section>

        {/* Main Card */}
        <section style={cardStyle}>
          <div style={cardHeadStyle}>
            <div style={avatarStyle}>{initial}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    color: "#1e293b",
                    fontSize: "24px",
                    fontWeight: 800,
                    wordBreak: "break-word",
                  }}
                >
                  {displayName}
                </h2>
                <StatusBadge tone="blue">
                  {formatRole(adminUser.role)}
                </StatusBadge>
              </div>
              <p
                style={{
                  margin: "8px 0 0",
                  color: "#94a3b8",
                  fontSize: "13px",
                }}
              >
                @{adminUser.username || "unknown"}
              </p>
            </div>
          </div>

          {/* Info Sections Grid */}
          <div style={sectionGridStyle}>
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>
                <FiUser size={16} />
                Tài khoản
              </h3>
              <InfoRow label="Họ và tên" icon={<FiUser size={12} />}>
                {adminUser.fullName || "—"}
              </InfoRow>
              <InfoRow label="Tên đăng nhập" icon={<FiUser size={12} />}>
                {adminUser.username || "—"}
              </InfoRow>
              <InfoRow label="Vai trò" icon={<FiShield size={12} />}>
                {formatRole(adminUser.role)}
              </InfoRow>
              <InfoRow label="Trạng thái tài khoản">
                {adminUser.isActive ? (
                  <StatusBadge tone="green">Đang hoạt động</StatusBadge>
                ) : (
                  <StatusBadge tone="red">Bị khóa</StatusBadge>
                )}
              </InfoRow>
            </div>

            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>
                <FiPhone size={16} />
                Liên hệ
              </h3>
              <InfoRow label="Email" icon={<FiMail size={12} />}>
                {getContactValue(adminUser.email)}
              </InfoRow>
              <InfoRow label="Số điện thoại" icon={<FiPhone size={12} />}>
                {getContactValue(adminUser.phone)}
              </InfoRow>
              <InfoRow label="Địa chỉ" icon={<FiMapPin size={12} />}>
                {getContactValue(adminUser.address)}
              </InfoRow>
            </div>

            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>
                <FiShield size={16} />
                Thông tin hệ thống
              </h3>
              <InfoRow label="Mã tài khoản">
                {adminUser.id || adminUser._id || "—"}
              </InfoRow>
              <InfoRow label="Trạng thái ca">
                {adminUser.onDuty ? (
                  <StatusBadge tone="green">Đang trực</StatusBadge>
                ) : (
                  <StatusBadge tone="gray">Không trực</StatusBadge>
                )}
              </InfoRow>
            </div>

            {services.length > 0 && (
              <div style={sectionStyle}>
                <h3 style={sectionTitleStyle}>
                  <FiShield size={16} />
                  Dịch vụ được phân quyền
                </h3>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  {services.map((service) => (
                    <StatusBadge
                      key={service.id || service._id || service.code || service.name}
                      tone="blue"
                    >
                      {service.name || service.code || "Dịch vụ"}
                    </StatusBadge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={actionBarStyle}>
            <button
              type="button"
              onClick={handleEditProfile}
              style={{
                ...buttonStyle,
                background: "white",
                color: "#1e4775",
                border: "2px solid #e2e8f0",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f8fafc";
                e.currentTarget.style.borderColor = "#cbd5e1";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "white";
                e.currentTarget.style.borderColor = "#e2e8f0";
              }}
            >
              <FiEdit3 size={16} />
              Chỉnh sửa hồ sơ
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
