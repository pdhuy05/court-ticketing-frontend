"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Toast from "@/components/Toast";
import { loginAdmin } from "@/services/auth.service";
import { getErrorMessage } from "@/lib/error-message";
import { adminPath } from "@/lib/admin-base";

const MAX_CREDENTIAL_LENGTH = 25;

function useLocalTime() {
  const [time, setTime] = useState("00:00:00");
  const [date, setDate] = useState("--/--/----");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("vi-VN"));
      setDate(
        now.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
      );
    };

    update();
    const interval = setInterval(update, 1000);

    return () => clearInterval(interval);
  }, []);

  return { time, date };
}

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({
    isOpen: false,
    message: "",
    type: "info" as "success" | "error" | "warning" | "info",
  });
  const { time, date } = useLocalTime();

  useEffect(() => {
    const reason = searchParams.get("reason");
    if (reason === "session_expired") {
      setToast({
        isOpen: true,
        message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
        type: "warning",
      });
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const trimmedUsername = username.trim();
      const trimmedPassword = password.trim();

      if (!trimmedUsername || !trimmedPassword) {
        setToast({
          isOpen: true,
          message: "Vui lòng nhập tên đăng nhập và mật khẩu",
          type: "error",
        });
        setLoading(false);
        return;
      }

      if (
        trimmedUsername.length > MAX_CREDENTIAL_LENGTH ||
        trimmedPassword.length > MAX_CREDENTIAL_LENGTH
      ) {
        setToast({
          isOpen: true,
          message: "Tên đăng nhập và mật khẩu chỉ được tối đa 25 ký tự",
          type: "error",
        });
        setLoading(false);
        return;
      }

      const data = await loginAdmin({
        username: trimmedUsername,
        password: trimmedPassword,
      });

      const token = data.data.accessToken ?? data.data.token ?? "";

      if (data.success && token) {
        if (data.data.user.role !== "admin") {
          throw new Error("Tài khoản này không có quyền quản trị");
        }

        if (typeof window !== "undefined") {
          localStorage.setItem("adminToken", token);
          localStorage.setItem("adminUser", JSON.stringify(data.data.user));
        }

        setToast({
          isOpen: true,
          message: "Đăng nhập thành công!",
          type: "success",
        });

        setTimeout(() => {
          router.push(adminPath("/admin"));
        }, 1000);
      } else {
        setToast({
          isOpen: true,
          message: data.message || "Tên đăng nhập hoặc mật khẩu không đúng",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      setToast({
        isOpen: true,
        message: getErrorMessage(error, "Lỗi kết nối với server, vui lòng thử lại"),
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        width: "min(560px, calc(100vw - 32px))",
        background: "white",
        borderRadius: 18,
        padding: "clamp(28px, 3vw, 44px)",
        boxShadow: "0 24px 60px rgba(7, 35, 83, 0.15)",
        boxSizing: "border-box",
        border: "1px solid rgba(0, 51, 102, 0.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img
            src="/assets/logotoaan.png"
            alt="Logo"
            style={{ height: 54, width: "auto", objectFit: "contain" }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 14, color: "#72809a", fontWeight: 700 }}>
              TÒA ÁN NHÂN DÂN KHU VỰC 1
            </span>
            <span style={{ fontSize: 12, color: "#9aa6bf" }}>
              Thành Phố Hồ Chí Minh
            </span>
          </div>
        </div>
        <div style={{ textAlign: "right", color: "#7a879d" }}>
          <div style={{ fontSize: 12, letterSpacing: "0.4px" }}>{date}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#274263" }}>
            {time}
          </div>
        </div>
      </div>

      <div
        style={{
          height: 1,
          background: "linear-gradient(90deg, #d7e3ff, #ffffff)",
          margin: "20px 0 26px",
        }}
      />

      <h1
        style={{
          textAlign: "center",
          color: "#0b2c54",
          marginBottom: 30,
          fontWeight: 700,
          fontSize: "clamp(24px, 2vw, 32px)",
          letterSpacing: "0.6px",
        }}
      >
        ĐĂNG NHẬP HỆ THỐNG
      </h1>

      <form onSubmit={handleLogin} noValidate>
        <div style={{ marginBottom: 22 }}>
          <label
            style={{
              display: "block",
              marginBottom: 8,
              fontWeight: 600,
              color: "#23324d",
              fontSize: 16,
            }}
          >
            Tên đăng nhập <span style={{ color: "red" }}>*</span>
          </label>
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 16,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#8a99b2",
                fontSize: 16,
              }}
            >
              <i className="fa-regular fa-user" aria-hidden="true" />
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={MAX_CREDENTIAL_LENGTH}
              placeholder="Nhập tên đăng nhập"
              style={{
                width: "100%",
                padding: "14px 16px 14px 44px",
                fontSize: 18,
                border: "1px solid #d6deeb",
                borderRadius: 10,
                boxSizing: "border-box",
                fontFamily: "inherit",
                outline: "none",
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 26 }}>
          <label
            style={{
              display: "block",
              marginBottom: 8,
              fontWeight: 600,
              color: "#23324d",
              fontSize: 16,
            }}
          >
            Mật khẩu <span style={{ color: "red" }}>*</span>
          </label>
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 16,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#8a99b2",
                fontSize: 16,
              }}
            >
              <i className="fa-solid fa-lock" aria-hidden="true" />
            </span>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={MAX_CREDENTIAL_LENGTH}
              placeholder="Nhập mật khẩu"
              style={{
                width: "100%",
                padding: "14px 46px 14px 44px",
                fontSize: 18,
                border: "1px solid #d6deeb",
                borderRadius: 10,
                boxSizing: "border-box",
                fontFamily: "inherit",
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 16,
                color: "#5d6c85",
                padding: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              <i
                className={
                  showPassword ? "fa-regular fa-eye-slash" : "fa-regular fa-eye"
                }
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "16px 20px",
            fontSize: 20,
            fontWeight: 600,
            background: loading
              ? "#cbd5e1"
              : "linear-gradient(90deg, #0b3b72 0%, #0a4a8c 100%)",
            color: "white",
            border: "none",
            borderRadius: 10,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            boxShadow: loading ? "none" : "0 10px 22px rgba(11, 59, 114, 0.24)",
          }}
          onMouseOver={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 14px 26px rgba(11, 59, 114, 0.3)";
            }
          }}
          onMouseOut={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 10px 22px rgba(11, 59, 114, 0.24)";
            }
          }}
        >
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>

      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, isOpen: false })}
      />
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginContent />
    </Suspense>
  );
}