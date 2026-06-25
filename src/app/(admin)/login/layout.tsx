"use client";

import { ReactNode } from "react";

export default function AdminLoginLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        width: "100%",
        minHeight: "100vh",
        background: "#f5f7fb",
        backgroundImage: "url(/assets/background.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "clamp(24px, 4vh, 48px) 16px",
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    </div>
  );
}