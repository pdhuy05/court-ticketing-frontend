"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DASHBOARD_AUTH_EXPIRED_ERROR,
  getDashboardCounterAlert,
  getDashboardCountersStatus,
  getDashboardRecentTickets,
  getDashboardStaff,
  getDashboardTicketRatio,
  getDashboardTicketTrend,
  getDashboardTicketOverview,
  getDashboardTicketsToday,
  type DashboardCounterAlert,
  type DashboardCountersStatus,
  type DashboardRecentTickets,
  type DashboardStaffData,
  type DashboardTicketOverview,
  type DashboardTicketRatio,
  type DashboardTicketTrendPoint,
  type DashboardTicketsToday,
} from "@/services/dashboard.service";
import { getCounters, type Counter } from "@/services/admin.service";
import { adminPath } from "@/lib/admin-base";
import {
  STATUS_COLORS,
  PIE_COLORS,
  formatUnit,
  currentDay,
  currentMonth,
  previousDay,
  parseYearMonthLabel,
  buildStatusDoughnutData,
  buildStatusLegend,
} from "./dashboard-tech.helpers";

interface DashboardTechState {
  ticketOverview: DashboardTicketOverview | null;
  countersStatus: DashboardCountersStatus | null;
  staffData: DashboardStaffData | null;
  ticketsToday: DashboardTicketsToday | null;
  recentTicketsData: DashboardRecentTickets | null;
  ticketRatio: DashboardTicketRatio[] | null;
  trendDay: DashboardTicketTrendPoint[] | null;
  trendMonth: DashboardTicketTrendPoint[] | null;
  counterAlerts: DashboardCounterAlert[] | null;
  allCounters: Counter[];
  loading: boolean;
  error: string | null;
}

export function useDashboardTechData() {
  const router = useRouter();
  const [state, setState] = useState<DashboardTechState>({
    ticketOverview: null,
    countersStatus: null,
    staffData: null,
    ticketsToday: null,
    recentTicketsData: null,
    ticketRatio: null,
    trendDay: null,
    trendMonth: null,
    counterAlerts: null,
    allCounters: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const [
          overviewData,
          countersData,
          staffResponse,
          todayData,
          recentData,
          ratioData,
          trendDayData,
          trendMonthData,
          alertData,
          countersListData,
        ] = await Promise.all([
          getDashboardTicketOverview(),
          getDashboardCountersStatus(),
          getDashboardStaff(),
          getDashboardTicketsToday(),
          getDashboardRecentTickets(),
          getDashboardTicketRatio(),
          getDashboardTicketTrend("day"),
          getDashboardTicketTrend("month"),
          getDashboardCounterAlert(),
          getCounters(),
        ]);

        if (!mounted) return;

        setState({
          ticketOverview: overviewData,
          countersStatus: countersData,
          staffData: staffResponse,
          ticketsToday: todayData,
          recentTicketsData: recentData,
          ticketRatio: ratioData,
          trendDay: trendDayData,
          trendMonth: trendMonthData,
          counterAlerts: alertData,
          allCounters: countersListData,
          loading: false,
          error: null,
        });
      } catch (fetchError) {
        if (!mounted) return;

        if (fetchError instanceof Error && fetchError.message === DASHBOARD_AUTH_EXPIRED_ERROR) {
          localStorage.removeItem("adminToken");
          localStorage.removeItem("adminUser");
          router.push(`${adminPath("/admin/login")}?reason=session_expired`);
          return;
        }

        setState((prev) => ({
          ...prev,
          loading: false,
          error:
            fetchError instanceof Error
              ? fetchError.message
              : "Khong the tai du lieu thong ke.",
        }));
      }
    };

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [router]);

  return state;
}

// ==================== Filters & UI state ====================

export function useDashboardTechFilters() {
  const [dayValue, setDayValue] = useState(previousDay);
  const [monthValue, setMonthValue] = useState(currentMonth);
  const [roomFilter, setRoomFilter] = useState("Tất cả");
  const [counterFilter, setCounterFilter] = useState("Tất cả");
  const [pieCounter, setPieCounter] = useState("Tất cả");
  const [period, setPeriod] = useState<"day" | "month">("day");
  const [recentMode, setRecentMode] = useState<"counter" | "service">("counter");

  return {
    dayValue, setDayValue,
    monthValue, setMonthValue,
    roomFilter, setRoomFilter,
    counterFilter, setCounterFilter,
    pieCounter, setPieCounter,
    period, setPeriod,
    recentMode, setRecentMode,
  };
}

// ==================== Name Maps ====================

export function useNameMaps(
  countersStatus: DashboardCountersStatus | null,
  allCounters: Counter[],
  ticketOverview: DashboardTicketOverview | null,
) {
  const counterNameMap = useMemo(() => {
    const map = new Map<string, string>();
    // Map from full counters list (getCounters API) — has _id which matches raw IDs
    allCounters.forEach((counter) => {
      if (counter._id) map.set(counter._id, counter.name || counter._id);
      if (counter.code) map.set(counter.code, counter.name || counter.code);
      if (counter.number !== undefined) {
        map.set(String(counter.number), counter.name || `Phòng ${counter.number}`);
      }
      if (counter.name) map.set(counter.name, counter.name);
    });
    // Also map from dashboard countersList as fallback
    countersStatus?.countersList.forEach((counter) => {
      if (counter.id && !map.has(counter.id)) map.set(counter.id, counter.name || counter.id);
      if (counter.code && !map.has(counter.code)) map.set(counter.code, counter.name || counter.code);
      if (counter.number !== undefined && !map.has(String(counter.number))) {
        map.set(String(counter.number), counter.name || `Phòng ${counter.number}`);
      }
      if (counter.name && !map.has(counter.name)) map.set(counter.name, counter.name);
    });
    return map;
  }, [countersStatus, allCounters]);

  const serviceNameMap = useMemo(() => {
    const map = new Map<string, string>();
    ticketOverview?.serviceCounts.forEach((service) => {
      map.set(service.serviceId, service.serviceName);
      map.set(service.serviceName, service.serviceName);
    });
    return map;
  }, [ticketOverview]);

  const getServiceName = useCallback(
    (serviceId: string | { id?: string; name?: string } | null | undefined) => {
      if (!serviceId) return "Chưa rõ";
      if (typeof serviceId === "string") {
        return serviceNameMap.get(serviceId) || serviceId;
      }
      return serviceId.name || serviceId.id || "Chưa rõ";
    },
    [serviceNameMap],
  );

  const getCounterName = useCallback(
    (
      counterId: DashboardRecentTickets["recentByCounter"][0]["counterId"],
    ) => {
      if (!counterId) return "Chưa gán";
      if (typeof counterId === "string") {
        return counterNameMap.get(counterId) || counterId;
      }
      return counterId.name || counterId.id || "Chưa gán";
    },
    [counterNameMap],
  );

  return { counterNameMap, serviceNameMap, getServiceName, getCounterName };
}

// ==================== Computed Data ====================

export function useDashboardTechComputed(
  state: ReturnType<typeof useDashboardTechData>,
  filters: ReturnType<typeof useDashboardTechFilters>,
  nameMaps: ReturnType<typeof useNameMaps>,
) {
  const { ticketOverview, countersStatus, ticketsToday, recentTicketsData, ticketRatio, trendDay, trendMonth } = state;
  const { dayValue, monthValue, pieCounter, period, recentMode, roomFilter, counterFilter } = filters;
  const { getCounterName, getServiceName, counterNameMap, serviceNameMap } = nameMaps;

  const todayValue = useMemo(currentDay, []);

  const recentTickets = useMemo(() => {
    if (!recentTicketsData) return [];

    if (recentMode === "service") {
      const items = recentTicketsData.recentByService.flatMap((group, groupIndex) => {
        const serviceIdKey = typeof group.serviceId === "string" ? group.serviceId : group.serviceId?.id;
        const serviceName = getServiceName(group.serviceId);

        return group.tickets.map((ticket, index) => {
          const rawCounter = (ticket as { counterId?: { id?: string; name?: string; number?: number } | string | null }).counterId;
          const counterName =
            (typeof rawCounter === "string" && (counterNameMap.get(rawCounter) || rawCounter)) ||
            (typeof rawCounter === "object" && (rawCounter?.name || (rawCounter?.number !== undefined ? `Phòng ${rawCounter.number}` : rawCounter?.id))) ||
            "Chưa gán";

          return {
            id: `${ticket.ticketNumber}-${ticket.createdAt}-${groupIndex}-${index}`,
            ticketNumber: ticket.ticketNumber,
            status: ticket.status,
            createdAt: ticket.createdAt,
            serviceName,
            serviceIdKey,
            counterName,
          };
        });
      });

      return items
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);
    }

    const items = recentTicketsData.recentByCounter.flatMap((group, groupIndex) => {
      const counterName = getCounterName(group.counterId);
      const counterIdKey = typeof group.counterId === "string" ? group.counterId : group.counterId?.id;
      return group.tickets.map((ticket, index) => ({
        id: `${ticket.ticketNumber}-${ticket.createdAt}-${groupIndex}-${index}`,
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
        createdAt: ticket.createdAt,
        serviceName: ticket.serviceId?.name || "Chưa rõ",
          serviceIdKey: ticket.serviceId?.code || ticket.serviceId?.name,
        counterName,
        counterIdKey,
      }));
    });

    return items
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [recentTicketsData, getCounterName, recentMode, serviceNameMap, counterNameMap, getServiceName]);

  const buildSummaryFromTrend = (point: DashboardTicketTrendPoint) => {
    const processing = Math.max(
      point.total - point.completed - point.skipped - point.waiting,
      0,
    );
    return {
      total: point.total,
      completed: point.completed,
      skipped: point.skipped,
      waiting: point.waiting,
      processing,
    };
  };

  const dailySummary = useMemo(() => {
    if (dayValue === todayValue && ticketsToday) {
      return {
        total: ticketsToday.totalToday,
        completed: ticketsToday.statusCounts.completed,
        skipped: ticketsToday.statusCounts.skipped,
        waiting: ticketsToday.statusCounts.waiting,
        processing: ticketsToday.statusCounts.processing,
      };
    }

    const match = trendDay?.find((point) => point.label === dayValue);
    if (match) return buildSummaryFromTrend(match);

    return {
      total: 0,
      completed: 0,
      skipped: 0,
      waiting: 0,
      processing: 0,
    };
  }, [dayValue, todayValue, ticketsToday, trendDay]);

  const serviceOptions = useMemo(() => {
    return (ticketOverview?.serviceCounts ?? []).map((service) => ({
      id: service.serviceName,
      name: service.serviceName,
    }));
  }, [ticketOverview]);

  const counterOptions = useMemo(() => {
    if (recentMode !== "counter") return [];

    const recentCounters = recentTicketsData?.recentByCounter ?? [];
    if (recentCounters.length > 0) {
      const seen = new Set<string>();
      return recentCounters
        .map((group) => {
          const counterId = group.counterId;
          if (!counterId) return null;
          const name = getCounterName(counterId);
          if (!name || seen.has(name)) return null;
          seen.add(name);
          return {
            id: name,
            name,
          };
        })
        .filter((item): item is { id: string; name: string } => item !== null);
    }

    // Fallback: use full counters list for options
    if (state.allCounters.length > 0) {
      return state.allCounters.map((counter) => ({
        id: counter.name || `Phòng ${counter.number}`,
        name: counter.name || `Phòng ${counter.number}`,
      }));
    }

    return (countersStatus?.countersList ?? []).map((counter) => ({
      id: counter.name || (counter.number !== undefined ? `Phòng ${counter.number}` : "Chưa gán"),
      name: counter.name || (counter.number !== undefined ? `Phòng ${counter.number}` : "Chưa gán"),
    }));
  }, [countersStatus, recentMode, recentTicketsData, getCounterName, state.allCounters]);

  const filteredTickets = useMemo(() => {
    if (!recentTicketsData) return [];

    if (recentMode === "counter") {
      const groups = recentTicketsData.recentByCounter ?? [];
      const matchedGroups = counterFilter === "Tất cả"
        ? groups
        : groups.filter((group) => getCounterName(group.counterId) === counterFilter);

      const items = matchedGroups.flatMap((group, groupIndex) => {
        const counterName = getCounterName(group.counterId);
        const counterIdKey = typeof group.counterId === "string" ? group.counterId : group.counterId?.id;
        return group.tickets.map((ticket, index) => ({
          id: `${ticket.ticketNumber}-${ticket.createdAt}-${groupIndex}-${index}`,
          ticketNumber: ticket.ticketNumber,
          status: ticket.status,
          createdAt: ticket.createdAt,
          serviceName: ticket.serviceId?.name || "Chưa rõ",
          serviceIdKey: ticket.serviceId?.code,
          counterName,
          counterIdKey,
        }));
      });

      return items.slice(0, 5);
    }

    const items = roomFilter === "Tất cả"
      ? recentTickets
      : recentTickets.filter((ticket) => ticket.serviceName === roomFilter);

    return items.slice(0, 5);
  }, [recentTicketsData, recentMode, counterFilter, roomFilter, recentTickets, getCounterName]);

  const overviewStatusData = useMemo(() => {
    if (!ticketOverview) return null;
    return buildStatusDoughnutData(ticketOverview.statusCounts);
  }, [ticketOverview]);

  const todayStatusData = useMemo(() => {
    if (!ticketsToday) return null;
    return buildStatusDoughnutData(ticketsToday.statusCounts);
  }, [ticketsToday]);

  const overviewStatusLegend = useMemo(() => {
    if (!ticketOverview) return [];
    return buildStatusLegend(ticketOverview.statusCounts);
  }, [ticketOverview]);

  const todayStatusLegend = useMemo(() => {
    if (!ticketsToday) return [];
    return buildStatusLegend(ticketsToday.statusCounts);
  }, [ticketsToday]);

  const pieData = useMemo(() => {
    if (!ticketRatio) return null;

    const counters = ticketRatio.map((counter) => ({
      label: counter.counterName,
      value: Math.max(counter.total, 0),
    }));

    if (pieCounter !== "Tất cả") {
      const selected = counters.find((item) => item.label === pieCounter);
      if (!selected) return null;
      return {
        labels: [selected.label],
        datasets: [
          {
            data: [selected.value],
            backgroundColor: [PIE_COLORS[0]],
            borderWidth: 0,
            hoverOffset: 8,
            cutout: "66%",
          },
        ],
      };
    }

    return {
      labels: counters.map((item) => item.label),
      datasets: [
        {
          data: counters.map((item) => item.value),
          backgroundColor: counters.map((_, index) => PIE_COLORS[index % PIE_COLORS.length]),
          borderWidth: 0,
          hoverOffset: 8,
          cutout: "66%",
        },
      ],
    };
  }, [ticketRatio, pieCounter]);

  const barData = useMemo(() => {
    if (period === "month") {
      const year = monthValue.split("-")[0];
      const monthlyPoints = new Map<number, DashboardTicketTrendPoint>();
      trendMonth?.forEach((point) => {
        const parsed = parseYearMonthLabel(point.label);
        if (!parsed || parsed.year !== year) return;
        monthlyPoints.set(parsed.month, point);
      });

      const labels = Array.from({ length: 12 }, (_, index) => `T${index + 1}`);
      const completed = labels.map((_, index) => monthlyPoints.get(index + 1)?.completed ?? 0);
      const skipped = labels.map((_, index) => monthlyPoints.get(index + 1)?.skipped ?? 0);
      const waiting = labels.map((_, index) => monthlyPoints.get(index + 1)?.waiting ?? 0);

      return {
        labels,
        datasets: [
          {
            label: "Hoàn thành",
            data: completed,
            backgroundColor: STATUS_COLORS.completed,
            borderRadius: 8,
            maxBarThickness: 26,
          },
          {
            label: "Bỏ qua",
            data: skipped,
            backgroundColor: STATUS_COLORS.skipped,
            borderRadius: 8,
            maxBarThickness: 26,
          },
          {
            label: "Chờ",
            data: waiting,
            backgroundColor: STATUS_COLORS.waiting,
            borderRadius: 8,
            maxBarThickness: 26,
          },
        ],
      };
    }

    return {
      labels: ["Hoàn thành", "Bỏ qua", "Chờ"],
      datasets: [
        {
          label: `Ngày ${dayValue}`,
          data: [dailySummary.completed, dailySummary.skipped, dailySummary.waiting],
          backgroundColor: [
            STATUS_COLORS.completed,
            STATUS_COLORS.skipped,
            STATUS_COLORS.waiting,
          ],
          borderRadius: 8,
          maxBarThickness: 28,
        },
      ],
    };
  }, [dailySummary, period, dayValue, monthValue, trendMonth]);

  return {
    todayValue,
    recentTickets,
    dailySummary,
    serviceOptions,
    counterOptions,
    filteredTickets,
    overviewStatusData,
    todayStatusData,
    overviewStatusLegend,
    todayStatusLegend,
    pieData,
    barData,
  };
}