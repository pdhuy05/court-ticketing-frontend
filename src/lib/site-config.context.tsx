"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { getPublicApiBase } from "@/lib/runtime-config";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SiteConfig {
  branchName: string;
  logoUrl: string;
  primaryColor: string;
  tickerText: string;
  workingHours: string;
  address: string;
  announcement: string;
}

const DEFAULT_CONFIG: SiteConfig = {
  branchName: "Tòa án nhân dân",
  logoUrl: "/assets/logotoaan.png",
  primaryColor: "#1a3c6e",
  tickerText: "",
  workingHours: "",
  address: "",
  announcement: "",
};

// ─── Context ──────────────────────────────────────────────────────────────────

interface SiteConfigContextValue {
  siteConfig: SiteConfig;
  isLoading: boolean;
  refreshSiteConfig: () => Promise<void>;
}

const SiteConfigContext = createContext<SiteConfigContextValue>({
  siteConfig: DEFAULT_CONFIG,
  isLoading: true,
  refreshSiteConfig: async () => {},
});

// ─── Fetch (public endpoint — không cần token) ────────────────────────────────

async function fetchSiteConfig(): Promise<SiteConfig> {
  const API_BASE = getPublicApiBase();
  const res = await fetch(`${API_BASE}/settings/site-config`, { cache: "no-store" });
  if (!res.ok) return DEFAULT_CONFIG;
  const data = await res.json();
  return data?.success && data?.data ? (data.data as SiteConfig) : DEFAULT_CONFIG;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SiteConfigProvider({ children }: { children: ReactNode }) {
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(DEFAULT_CONFIG);
  const [isLoading,  setIsLoading ] = useState(true);

  const refreshSiteConfig = useCallback(async () => {
    try {
      const config = await fetchSiteConfig();
      setSiteConfig(config);
    } catch {
      // giữ nguyên config hiện tại nếu lỗi
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSiteConfig();
  }, [refreshSiteConfig]);

  return (
    <SiteConfigContext.Provider value={{ siteConfig, isLoading, refreshSiteConfig }}>
      {children}
    </SiteConfigContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSiteConfig() {
  return useContext(SiteConfigContext);
}