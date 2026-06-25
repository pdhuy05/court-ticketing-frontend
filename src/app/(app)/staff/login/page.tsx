"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginStaff } from "@/services/auth.service";
import Toast from "@/components/Toast";

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

type ToastType = "success" | "error" | "warning" | "info";

interface ToastState {
  isOpen: boolean;
  message: string;
  type: ToastType;
}

function StaffLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>({
    isOpen: false,
    message: "",
    type: "info",
  });
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const { time, date } = useLocalTime();

  useEffect(() => {
    if (redirectUrl) {
      console.log("Redirecting to:", redirectUrl);
      const timer = setTimeout(() => {
        router.push(redirectUrl);
      }, 1500); // Giữ lại delay để người dùng đọc toast
      return () => clearTimeout(timer);
    }
  }, [redirectUrl, router]);

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
      // Validate input
      if (!username.trim() || !password.trim()) {
        setToast({
          isOpen: true,
          message: "Vui lòng nhập tên đăng nhập và mật khẩu",
          type: "error",
        });
        setLoading(false);
        return;
      }

      const response = await loginStaff({ username, password });

      if (response.success && response.data) {
        const { accessToken, token, user } = response.data;
        const tokenToStore = accessToken || token;

        // Lưu vào sessionStorage (mỗi tab riêng biệt)
        if (typeof window !== "undefined") {
          sessionStorage.setItem("staffToken", tokenToStore ?? "");
          sessionStorage.setItem("staffUser", JSON.stringify(user));
          sessionStorage.setItem("staffName", user.fullName || user.username || "");
        }

        setToast({
          isOpen: true,
          message: "Đăng nhập thành công!",
          type: "success",
        });

        if (user.counterId) {
          setRedirectUrl(`/staff/${user.counterId}`);
        } else {
          // Xử lý trường hợp staff chưa được gán quầy
          setToast({
            isOpen: true,
            message: "Tài khoản chưa được gán quầy. Vui lòng liên hệ quản trị viên.",
            type: "error",
          });
          setLoading(false);
        }
      } else {
        setToast({
          isOpen: true,
          message: response.message || "Tên đăng nhập hoặc mật khẩu không đúng",
          type: "error",
        });
        setLoading(false);
      }
    } catch (error: unknown) {
      console.error("Login error:", error);
      const message = error instanceof Error ? error.message : "Lỗi đăng nhập, vui lòng thử lại";
      setToast({
        isOpen: true,
        message,
        type: "error",
      });
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
        ĐĂNG NHẬP NHÂN VIÊN
      </h1>

      <form onSubmit={handleLogin}>
        {/* Username */}
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

        {/* Password */}
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
                  showPassword
                    ? "fa-regular fa-eye-slash"
                    : "fa-regular fa-eye"
                }
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        {/* Submit button */}
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
            boxShadow: loading
              ? "none"
              : "0 10px 22px rgba(11, 59, 114, 0.24)",
          }}
          onMouseOver={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow =
                "0 14px 26px rgba(11, 59, 114, 0.3)";
            }
          }}
          onMouseOut={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 10px 22px rgba(11, 59, 114, 0.24)";
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
        onClose={() => setToast((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Demo Info */}
    </div>
  );
}

export default function StaffLoginPage() {
  return (
    <Suspense fallback={null}>
      <StaffLoginContent />
    </Suspense>
  );
}