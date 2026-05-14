"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Clock from "../components/Clock";
import NewTicketGlobalSocket from "@/components/NewTicketGlobalSocket";
import NotificationPermissionButton from "@/components/NotificationPermissionButton";

export default function AppLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const pathname = usePathname();
  const isStaffLogin = pathname === "/staff/login";

  return (
    <>
      <NewTicketGlobalSocket />
      <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
        {!isStaffLogin && (
          <header
            style={{
              minHeight: 96,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              padding: "20px 20px 0",
              fontSize: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                flex: 1,
                minWidth: 0,
              }}
            >
              <img
                src="/assets/logotoaan.png"
                alt="Logo"
                style={{
                  height: 68,
                  width: "auto",
                  objectFit: "contain",
                  flexShrink: 0,
                }}
              />

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "flex-start",
                  minWidth: 0,
                }}
              >
                <h1 style={{ margin: 0, fontSize: 32, fontWeight: 750 }}>
                  TÒA ÁN NHÂN DÂN KHU VỰC 1
                </h1>
                <h4
                  style={{
                    margin: 0,
                    fontSize: 14,
                    fontWeight: 400,
                    opacity: 0.6,
                  }}
                >
                  Thành Phố Hồ Chí Minh
                </h4>
              </div>
            </div>

            <div
              style={{
                fontSize: 18,
                whiteSpace: "nowrap",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexShrink: 0,
                }}
              >
                <NotificationPermissionButton variant="staff" />
                <Clock />
              </div>
            </div>
          </header>
        )}

        <main
          style={{
            flex: 1,
            padding: isStaffLogin
              ? "0"
              : "2rem clamp(4px, 3.4vw, 64px) 20px",
            minHeight: 0,
            overflow: "hidden",
            display: isStaffLogin ? "flex" : "block",
            alignItems: isStaffLogin ? "center" : undefined,
            justifyContent: isStaffLogin ? "center" : undefined,
            background: isStaffLogin ? "#f5f7fb" : undefined,
            backgroundImage: isStaffLogin
              ? "url(/assets/background.png)"
              : undefined,
            backgroundSize: isStaffLogin ? "cover" : undefined,
            backgroundPosition: isStaffLogin ? "center" : undefined,
            backgroundRepeat: isStaffLogin ? "no-repeat" : undefined,
          }}
        >
          {children}
        </main>
      </div>
    </>
  );
}
