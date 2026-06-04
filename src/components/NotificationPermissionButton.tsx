"use client";

import { useCallback, useState } from "react";

type Variant = "staff" | "admin";

export default function NotificationPermissionButton({
  variant = "staff",
}: {
  variant?: Variant;
}) {
  const [permission, setPermission] = useState(() =>
    typeof Notification !== "undefined" ? Notification.permission : "denied",
  );

  const handleClick = useCallback(async () => {
    if (!("Notification" in window)) return;
    const next = await Notification.requestPermission();
    setPermission(next);
  }, []);

  if (typeof window === "undefined" || !("Notification" in window)) return null;
  if (permission !== "default") return null;

  const isAdmin = variant === "admin";

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      title="Cho phép trình duyệt hiển thị thông báo khi có vé mới"
      style={{
        padding: isAdmin ? "8px 14px" : "clamp(8px, 1vh, 10px) 14px",
        fontSize: isAdmin ? 13 : "clamp(12px, 1vw, 14px)",
        fontWeight: 600,
        background: isAdmin ? "#eff6ff" : "#f8fafc",
        color: "#1d4ed8",
        border: "1px solid #bfdbfe",
        borderRadius: isAdmin ? 40 : 8,
        cursor: "pointer",
        flexShrink: 0,
        whiteSpace: "nowrap",
      }}
    >
      Bật thông báo desktop
    </button>
  );
}