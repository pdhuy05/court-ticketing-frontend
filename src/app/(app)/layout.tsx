"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Clock from "../components/Clock";
import NewTicketGlobalSocket from "@/components/NewTicketGlobalSocket";
import NotificationPermissionButton from "@/components/NotificationPermissionButton";
import { getPublicApiBase } from "@/lib/runtime-config";

interface SiteConfig {
  branchName: string;
  logoUrl: string;
  primaryColor: string;
  tickerText: string;
  workingHours: string;
  address: string;
  announcement: string;
}

const DEFAULT_CONFIG: SiteConfig = {
  branchName: "TÒA ÁN NHÂN DÂN KHU VỰC 1",
  logoUrl: "/assets/logotoaan.png",
  primaryColor: "#1a3c6e",
  tickerText: "",
  workingHours: "",
  address: "Thành Phố Hồ Chí Minh",
  announcement: "",
};

async function fetchSiteConfig(): Promise<SiteConfig> {
  try {
    const res = await fetch(`${getPublicApiBase()}/settings/site-config`, { cache: "no-store" });
    if (!res.ok) return DEFAULT_CONFIG;
    const data = await res.json();
    return data?.success && data?.data ? (data.data as SiteConfig) : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export default function AppLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const pathname = usePathname();
  const isStaffLogin = pathname === "/staff/login";
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    void fetchSiteConfig().then(setSiteConfig);
  }, []);

  return (
    <>
      <NewTicketGlobalSocket />
      <div className="app-shell" style={{ display: "flex", flexDirection: "column" }}>
        {!isStaffLogin && (
          <header className="app-header">
            {/* Logo + title */}
            <div className="app-header__brand">
              <img
                src={siteConfig.logoUrl || "/assets/logotoaan.png"}
                alt="Logo"
                className="app-header__logo"
              />
              <div className="app-header__titles">
                <h1 className="app-header__h1">{siteConfig.branchName?.toUpperCase() || "TÒA ÁN NHÂN DÂN"}</h1>
                <h4 className="app-header__h4">{siteConfig.address || "Thành Phố Hồ Chí Minh"}</h4>
              </div>
            </div>

            {/* Clock + notification */}
            <div className="app-header__right">
              <NotificationPermissionButton variant="staff" />
              <Clock />
            </div>
          </header>
        )}

        <main
          style={{
            flex: 1,
            minHeight: 0,
            overflow: isStaffLogin ? "hidden" : "auto",
            WebkitOverflowScrolling: "touch",
            ...(isStaffLogin
              ? {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#f5f7fb",
                  backgroundImage: "url(/assets/background.png)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  padding: "0",
                }
              : {
                  display: "block",
                  padding: "clamp(8px, 2vw, 32px) clamp(4px, 3.4vw, 64px) 20px",
                }),
          }}
        >
          {children}
        </main>
      </div>

      <style>{`
        .app-shell {
          height: 100vh;
          height: 100dvh;
        }

        /* ── Header shell ─────────────────────────────────────── */
        .app-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 10px 12px;
          flex-shrink: 0;
        }

        /* ── Brand (logo + text) ──────────────────────────────── */
        .app-header__brand {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 0;
        }

        .app-header__logo {
          height: 40px;
          width: auto;
          object-fit: contain;
          flex-shrink: 0;
        }

        .app-header__titles {
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-width: 0;
        }

        .app-header__h1 {
          margin: 0;
          font-size: 15px;
          font-weight: 750;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .app-header__h4 {
          margin: 0;
          font-size: 11px;
          font-weight: 400;
          opacity: 0.6;
          white-space: nowrap;
        }

        /* ── Right side ───────────────────────────────────────── */
        .app-header__right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
          white-space: nowrap;
          font-size: 13px;
        }

        /* ══════════════════════════════════════════════════════
           BREAKPOINTS
        ══════════════════════════════════════════════════════ */

        /* Tablet portrait */
        @media (min-width: 540px) {
          .app-header        { padding: 12px 20px; gap: 12px; }
          .app-header__logo  { height: 52px; }
          .app-header__h1    { font-size: 20px; }
          .app-header__h4    { font-size: 13px; }
          .app-header__right { font-size: 15px; gap: 10px; }
        }

        /* Tablet landscape / small desktop */
        @media (min-width: 768px) {
          .app-header        { padding: 14px 28px; }
          .app-header__logo  { height: 60px; }
          .app-header__h1    { font-size: 26px; }
          .app-header__h4    { font-size: 14px; }
          .app-header__right { font-size: 17px; gap: 12px; }
        }

        /* Desktop */
        @media (min-width: 1200px) {
          .app-header        { padding: 20px 20px 0; min-height: 96px; }
          .app-header__logo  { height: 68px; }
          .app-header__h1    { font-size: 32px; }
          .app-header__h4    { font-size: 14px; }
          .app-header__right { font-size: 18px; gap: 12px; }
        }

        /* Landscape phone — giảm chiều cao header tối đa */
        @media (max-width: 767px) and (orientation: landscape) {
          .app-header        { padding: 6px 12px; }
          .app-header__logo  { height: 30px; }
          .app-header__h1    { font-size: 13px; }
          .app-header__h4    { font-size: 10px; }
          .app-header__right { font-size: 12px; gap: 6px; }
        }
      `}</style>
    </>
  );
}