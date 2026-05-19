"use client";

import {
  ADMIN_AUTH_EXPIRED_ERROR,
  isAuthExpiredMessage,
} from "@/lib/admin-auth";
import { getPublicApiBase } from "@/lib/runtime-config";

const API_BASE = getPublicApiBase();
export const DASHBOARD_AUTH_EXPIRED_ERROR = ADMIN_AUTH_EXPIRED_ERROR;

const getAuthHeaders = () => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

export interface DashboardAlert {
  type: string;
  message: string;
}

export interface DashboardServiceOverview {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  displayOrder: number;
  counters: number;
  waiting: number;
  processing: number;
  completedToday: number;
}

export interface DashboardCounterOverview {
  id: string;
  code: string;
  name: string;
  number: number;
  isActive: boolean;
  processedCount: number;
  waiting: number;
  overloadThreshold: number;
  isOverloaded: boolean;
  overloadLevel: string;
  isServing: boolean;
  currentTicket: {
    id: string;
    number: number;
    ticketNumber: string;
    customerName: string;
    status: string;
    serviceId: string;
  } | null;
    staff: Array<{
    id: string;
    fullName: string;
    username: string;
  }> | null;
}

export interface DashboardRecentTicket {
  id: string;
  number: number;
  ticketNumber: string;
  customerName: string;
  phone?: string;
  status: string;
  skipCount: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  service: {
    id: string;
    code: string;
    name: string;
  } | null;
  counter: {
    id: string;
    code: string;
    name: string;
    number: number;
  } | null;
}

export interface DashboardOverviewSummary {
  totalWaiting: number;
  totalProcessing: number;
  totalServices: number;
  activeServices: number;
  totalCounters: number;
  activeCounters: number;
  totalStaff: number;
  activeStaff: number;
  assignedStaff: number;
  unassignedStaff: number;
  ticketsIssuedToday: number;
  ticketsCompletedToday: number;
  ticketsSkippedToday: number;
  averageHandleTimeInMinutes: number;
  overloadedCounters: number;
  overloadThreshold: number;
}

export interface DashboardOverviewData {
  generatedAt: string;
  summary: DashboardOverviewSummary;
  alerts: DashboardAlert[];
  services: DashboardServiceOverview[];
  counters: DashboardCounterOverview[];
  recentTickets: DashboardRecentTicket[];
}

export interface DashboardReportSummary {
  issued: number;
  waiting: number;
  processing: number;
  completed: number;
  skipped: number;
  averageHandleTimeInMinutes: number;
}

export interface DashboardReportService {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  displayOrder: number;
  issued: number;
  completed: number;
  skipped: number;
  waitingNow: number;
}

export interface DashboardReportCounter {
  id: string;
  code: string;
  name: string;
  number: number;
  isActive: boolean;
  processedCount: number;
  served: number;
  completed: number;
  skipped: number;
  waitingNow: number;
  isOverloaded: boolean;
}

export interface DashboardReportTimelinePoint {
  label: string;
  issued: number;
  completed: number;
}

export interface DashboardReportData {
  generatedAt: string;
  period: "daily" | "monthly";
  label: string;
  range: {
    start: string;
    end: string;
  };
  summary: DashboardReportSummary;
  services: DashboardReportService[];
  counters: DashboardReportCounter[];
  timeline: DashboardReportTimelinePoint[];
}

export interface DashboardTicketOverview {
  totalTickets: number;
  statusCounts: {
    waiting: number;
    processing: number;
    completed: number;
    skipped: number;
  };
  serviceCounts: Array<{
    serviceId: string;
    serviceName: string;
    count: number;
  }>;
}

export interface DashboardCountersStatus {
  totalCounters: number;
  activeCounters: number;
  inactiveCounters: number;
  countersList: Array<{
    id?: string;
    code?: string;
    name?: string;
    number?: number;
    isActive?: boolean;
  }>;
}

export interface DashboardStaffData {
  totalStaff: number;
  onDutyStaff?: unknown[];
  offDutyStaff?: unknown[];
  staffList: Array<{
    id?: string;
    fullName: string;
    username?: string;
    isActive?: boolean;
    onDuty?: boolean;
    counterId?: {
      id?: string;
      name?: string;
      number?: number;
    } | null;
  }>;
}

export interface DashboardTicketsToday {
  totalToday: number;
  statusCounts: {
    completed: number;
    skipped: number;
    waiting: number;
    processing: number;
  };
  percentages?: {
    completed: number;
    skipped: number;
    waiting: number;
    processing: number;
  };
}

export interface DashboardRecentTickets {
  recentByCounter: Array<{
    counterId: string | { id?: string; name?: string; number?: number } | null;
    tickets: Array<{
      number: number;
      ticketNumber: string;
      status: string;
      createdAt: string;
      serviceId?: { name?: string; code?: string } | null;
      staffId?: { fullName?: string } | null;
    }>;
  }>;
  recentByService: Array<{
    serviceId: string | { id?: string; name?: string; code?: string } | null;
    tickets: Array<{
      number: number;
      ticketNumber: string;
      status: string;
      createdAt: string;
      serviceId?: { name?: string; code?: string } | null;
      staffId?: { fullName?: string } | null;
    }>;
  }>;
}

export interface DashboardTicketRatio {
  counterId: string;
  counterName: string;
  total: number;
  completed: number;
  skipped: number;
  waiting: number;
  percentages?: {
    completed: number;
    skipped: number;
    waiting: number;
  };
}

export interface DashboardTicketTrendPoint {
  label: string;
  completed: number;
  skipped: number;
  waiting: number;
  total: number;
}

export interface DashboardCounterAlert {
  counterId: string;
  counterName: string;
  waitingCount: number;
  isAlert: boolean;
}

const ensureApiBase = () => {
  if (!API_BASE) {
    throw new Error(
      "NEXT_PUBLIC_BACKEND_API_URL is not configured in the environment.",
    );
  }

  return API_BASE;
};

const requestDashboard = async <T,>(path: string): Promise<T> => {
  const response = await fetch(`${ensureApiBase()}${path}`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  const data = await response.json();
  if (response.status === 401 || isAuthExpiredMessage(data?.message)) {
    throw new Error(DASHBOARD_AUTH_EXPIRED_ERROR);
  }
  if (!data.success) {
    throw new Error(data.message || "Khong the tai du lieu thong ke");
  }

  return data.data as T;
};

export async function getDashboardOverview(): Promise<DashboardOverviewData> {
  const response = await fetch(`${ensureApiBase()}/admin/dashboard/overview`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  const data = await response.json();
  const normalizedMessage = String(data?.message || "").toLowerCase();
  if (
    response.status === 401 ||
    normalizedMessage.includes("token") ||
    normalizedMessage.includes("expired") ||
    normalizedMessage.includes("hết hạn") ||
    normalizedMessage.includes("het han") ||
    normalizedMessage.includes("unauthorized") ||
    normalizedMessage.includes("không hợp lệ") ||
    normalizedMessage.includes("khong hop le")
  ) {
    throw new Error(DASHBOARD_AUTH_EXPIRED_ERROR);
  }
  if (!data.success) {
    throw new Error(data.message || "Khong the tai tong quan thong ke");
  }

  return data.data as DashboardOverviewData;
}

export async function getDashboardReport(params: {
  period: "daily" | "monthly";
  date?: string;
  month?: string;
}): Promise<DashboardReportData> {
  const searchParams = new URLSearchParams({ period: params.period });

  if (params.period === "daily" && params.date) {
    searchParams.set("date", params.date);
  }

  if (params.period === "monthly" && params.month) {
    searchParams.set("month", params.month);
  }

  const response = await fetch(
    `${ensureApiBase()}/admin/dashboard/reports?${searchParams.toString()}`,
    {
      headers: getAuthHeaders(),
      cache: "no-store",
    },
  );

  const data = await response.json();
  const normalizedMessage = String(data?.message || "").toLowerCase();
  if (
    response.status === 401 ||
    normalizedMessage.includes("token") ||
    normalizedMessage.includes("expired") ||
    normalizedMessage.includes("hết hạn") ||
    normalizedMessage.includes("het han") ||
    normalizedMessage.includes("unauthorized") ||
    normalizedMessage.includes("không hợp lệ") ||
    normalizedMessage.includes("khong hop le")
  ) {
    throw new Error(DASHBOARD_AUTH_EXPIRED_ERROR);
  }
  if (!data.success) {
    throw new Error(data.message || "Khong the tai bao cao thong ke");
  }

  return data.data as DashboardReportData;
}

export const getDashboardTicketOverview = () =>
  requestDashboard<DashboardTicketOverview>("/dashboard/tickets/overview");

export const getDashboardCountersStatus = () =>
  requestDashboard<DashboardCountersStatus>("/dashboard/counters/status");

export const getDashboardStaff = () =>
  requestDashboard<DashboardStaffData>("/dashboard/staff");

export const getDashboardTicketsToday = () =>
  requestDashboard<DashboardTicketsToday>("/dashboard/tickets/today");

export const getDashboardRecentTickets = () =>
  requestDashboard<DashboardRecentTickets>("/dashboard/tickets/recent");

export const getDashboardTicketRatio = () =>
  requestDashboard<DashboardTicketRatio[]>("/dashboard/tickets/ratio");

export const getDashboardTicketTrend = (
  groupBy: "day" | "month" | "year",
  options?: { date?: string; year?: string | number },
) => {
  const params = new URLSearchParams({ groupBy });
  if (options?.date) params.set("date", options.date);
  if (options?.year) params.set("year", String(options.year));
  return requestDashboard<DashboardTicketTrendPoint[]>(
    `/dashboard/tickets/trend?${params.toString()}`,
  );
};

export const getDashboardCounterAlert = () =>
  requestDashboard<DashboardCounterAlert[]>("/dashboard/counters/alert");