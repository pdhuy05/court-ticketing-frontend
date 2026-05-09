"use client";

import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  PointElement,
  Tooltip,
  type Chart,
  type Plugin,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { FiAlertTriangle, FiCheckCircle, FiClock, FiLayers } from "react-icons/fi";
import styles from "./AdminDashboardTech.module.css";
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

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  PointElement,
  Tooltip,
);

const STATUS_COLORS = {
  waiting: "#ffb020",
  processing: "#37c2eb",
  completed: "#20c37a",
  skipped: "#ff8b5c",
};

const PIE_COLORS = ["#4f7cff", "#37c2eb", "#20c37a", "#ff8b5c"];

const TICKET_STATUS_LABELS: Record<string, string> = {
  waiting: "Đang chờ",
  processing: "Đang xử lý",
  completed: "Hoàn tất",
  skipped: "Bỏ qua",
};

const getTicketStatusLabel = (status?: string | null) => {
  if (!status) return "Khong xac dinh";
  return TICKET_STATUS_LABELS[status] || status;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

const formatUnit = (value: number, unit: string) =>
  `${formatNumber(value)} ${unit}`;

const formatDateInput = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatMonthInput = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
};

const parseYearMonthLabel = (label: string) => {
  const isoMatch = label.match(/^(\d{4})-(\d{1,2})$/);
  if (isoMatch) {
    return { year: isoMatch[1], month: Number(isoMatch[2]) };
  }

  const slashMatch = label.match(/^(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    return { year: slashMatch[2], month: Number(slashMatch[1]) };
  }

  const dateMatch = label.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateMatch) {
    return { year: dateMatch[1], month: Number(dateMatch[2]) };
  }

  return null;
};

const previousDay = () => {
  const value = new Date();
  value.setDate(value.getDate() - 1);
  return formatDateInput(value);
};

const currentDay = () => formatDateInput(new Date());

const currentMonth = () => formatMonthInput(new Date());

const doughnutLabelPlugin: Plugin<"doughnut"> = {
  id: "doughnutLabelPlugin",
  afterDatasetsDraw(chart: Chart<"doughnut">) {
    const dataset = chart.data.datasets[0];
    const meta = chart.getDatasetMeta(0);
    if (!dataset || !meta?.data?.length) return;

    const values = (dataset.data as number[]).map((value) => Number(value) || 0);
    const total = values.reduce((sum, value) => sum + value, 0);
    if (!total) return;

    const { ctx } = chart;
    ctx.save();

    meta.data.forEach((arcElement, index) => {
      const value = values[index];
      if (!value) return;

      const arc = arcElement as ArcElement;
      const angle = (arc.startAngle + arc.endAngle) / 2;
      const percent = Math.round((value / total) * 100);
      const x = arc.x + Math.cos(angle) * (arc.innerRadius + (arc.outerRadius - arc.innerRadius) * 0.55);
      const y = arc.y + Math.sin(angle) * (arc.innerRadius + (arc.outerRadius - arc.innerRadius) * 0.55);

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      if (percent >= 8) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "700 11px Arial";
        ctx.fillText(`${formatNumber(value)}`, x, y - 7);
        ctx.font = "600 10px Arial";
        ctx.fillText(`${percent}%`, x, y + 7);
        return;
      }

      const outX = arc.x + Math.cos(angle) * (arc.outerRadius + 18);
      const outY = arc.y + Math.sin(angle) * (arc.outerRadius + 12);
      ctx.fillStyle = "#18324f";
      ctx.font = "700 10px Arial";
      ctx.fillText(`${formatNumber(value)} ${percent}%`, outX, outY);
    });

    ctx.restore();
  },
};

const chartOptionsBase = {
  maintainAspectRatio: false,
  layout: { padding: 6 },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "rgba(9, 18, 32, 0.95)",
      titleColor: "#ffffff",
      bodyColor: "#ffffff",
      borderColor: "rgba(79, 124, 255, 0.28)",
      borderWidth: 1,
      padding: 10,
      displayColors: true,
    },
  },
};

function SummaryCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className={styles.summaryCard}>
      <div className={styles.summaryHeader}>
        <span className={styles.summaryIcon}>{icon}</span>
        <h3 className={styles.summaryTitle}>{title}</h3>
      </div>
      <div className={styles.summaryBody}>{children}</div>
    </div>
  );
}

export default function AdminDashboardTech() {
  const router = useRouter();
  const [ticketOverview, setTicketOverview] = useState<
    DashboardTicketOverview | null
  >(null);
  const [countersStatus, setCountersStatus] = useState<DashboardCountersStatus | null>(
    null,
  );
  const [staffData, setStaffData] = useState<DashboardStaffData | null>(null);
  const [ticketsToday, setTicketsToday] = useState<DashboardTicketsToday | null>(
    null,
  );
  const [recentTicketsData, setRecentTicketsData] = useState<
    DashboardRecentTickets | null
  >(null);
  const [ticketRatio, setTicketRatio] = useState<DashboardTicketRatio[] | null>(
    null,
  );
  const [trendDay, setTrendDay] = useState<DashboardTicketTrendPoint[] | null>(
    null,
  );
  const [trendMonth, setTrendMonth] = useState<DashboardTicketTrendPoint[] | null>(
    null,
  );
  const [counterAlerts, setCounterAlerts] = useState<
    DashboardCounterAlert[] | null
  >(null);
  const [allCounters, setAllCounters] = useState<Counter[]>([]);
  const [dayValue, setDayValue] = useState(previousDay);
  const [monthValue, setMonthValue] = useState(currentMonth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomFilter, setRoomFilter] = useState("Tất cả");
  const [counterFilter, setCounterFilter] = useState("Tất cả");
  const [pieCounter, setPieCounter] = useState("Tất cả");
  const [period, setPeriod] = useState<"day" | "month">("day");
  const [recentMode, setRecentMode] = useState<"counter" | "service">("counter");

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

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

        setTicketOverview(overviewData);
        setCountersStatus(countersData);
        setStaffData(staffResponse);
        setTicketsToday(todayData);
        setRecentTicketsData(recentData);
        setTicketRatio(ratioData);
        setTrendDay(trendDayData);
        setTrendMonth(trendMonthData);
        setCounterAlerts(alertData);
        setAllCounters(countersListData);
      } catch (fetchError) {
        if (!mounted) return;

        if (fetchError instanceof Error && fetchError.message === DASHBOARD_AUTH_EXPIRED_ERROR) {
          localStorage.removeItem("adminToken");
          localStorage.removeItem("adminUser");
          router.push("/login?reason=session_expired");
          return;
        }

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Khong the tai du lieu thong ke.",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [router]);

  const todayValue = useMemo(currentDay, []);
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
    if (allCounters.length > 0) {
      return allCounters.map((counter) => ({
        id: counter.name || `Phòng ${counter.number}`,
        name: counter.name || `Phòng ${counter.number}`,
      }));
    }

    return (countersStatus?.countersList ?? []).map((counter) => ({
      id: counter.name || (counter.number !== undefined ? `Phòng ${counter.number}` : "Chưa gán"),
      name: counter.name || (counter.number !== undefined ? `Phòng ${counter.number}` : "Chưa gán"),
    }));
  }, [countersStatus, recentMode, recentTicketsData, getCounterName, allCounters]);

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
    const counts = ticketOverview.statusCounts;
    return {
      labels: ["Đang chờ", "Đang xử lý", "Hoàn tất", "Bỏ qua"],
      datasets: [
        {
          data: [counts.waiting, counts.processing, counts.completed, counts.skipped],
          backgroundColor: [
            STATUS_COLORS.waiting,
            STATUS_COLORS.processing,
            STATUS_COLORS.completed,
            STATUS_COLORS.skipped,
          ],
          borderWidth: 0,
          hoverOffset: 8,
          cutout: "66%",
        },
      ],
    };
  }, [ticketOverview]);

  const todayStatusData = useMemo(() => {
    if (!ticketsToday) return null;
    const counts = ticketsToday.statusCounts;
    return {
      labels: ["Đang chờ", "Đang xử lý", "Hoàn tất", "Bỏ qua"],
      datasets: [
        {
          data: [counts.waiting, counts.processing, counts.completed, counts.skipped],
          backgroundColor: [
            STATUS_COLORS.waiting,
            STATUS_COLORS.processing,
            STATUS_COLORS.completed,
            STATUS_COLORS.skipped,
          ],
          borderWidth: 0,
          hoverOffset: 8,
          cutout: "66%",
        },
      ],
    };
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

  if (loading && !ticketOverview) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <h2>Đang dựng bảng điều hành thống kê</h2>
          <p>Hệ thống đang lấy dữ liệu thống kê tổng quan từ API.</p>
        </div>
      </div>
    );
  }

  if (error && !ticketOverview) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <h2>Không thể tải dữ liệu thống kê</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (
    !ticketOverview ||
    !countersStatus ||
    !staffData ||
    !ticketsToday ||
    !recentTicketsData ||
    !ticketRatio ||
    !trendDay ||
    !trendMonth ||
    !counterAlerts
  ) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>Chưa có dữ liệu thống kê để hiển thị.</div>
      </div>
    );
  }

  const totalTickets = ticketOverview.totalTickets;
  const inactiveCounters = countersStatus.inactiveCounters ?? Math.max(
    countersStatus.totalCounters - countersStatus.activeCounters,
    0,
  );
  const staffByCounter = staffData.staffList.reduce<Record<string, string[]>>(
    (acc, staff) => {
      const label =
        staff.counterId?.name ||
        (staff.counterId?.number !== undefined
          ? `Quầy ${staff.counterId.number}`
          : "Chưa gán");
      if (!acc[label]) acc[label] = [];
      acc[label].push(staff.fullName);
      return acc;
    },
    {},
  );
  const staffGroups = Object.entries(staffByCounter).map(([label, staff]) => ({
    label,
    staff,
  }));
  const pieCounterOptions = ticketRatio.map((counter) => counter.counterName);
  const alertMap = new Map<string, DashboardCounterAlert>();
  counterAlerts.forEach((alert) => {
    alertMap.set(alert.counterId, alert);
    alertMap.set(alert.counterName, alert);
  });
  const alertItems = countersStatus.countersList.map((counter) => {
    const key =
      counter.id || counter.code || counter.name || String(counter.number ?? "");
    const alert = key ? alertMap.get(key) : undefined;
    const waiting = alert?.waitingCount ?? 0;
    return {
      id: key || `counter-${counter.name || counter.number}`,
      name: counter.name || (counter.number !== undefined ? `Quầy ${counter.number}` : "Quầy"),
      waiting,
      isAlert: alert?.isAlert ?? waiting >= 50,
    };
  });

  const overviewStatusLegend = [
    {
      label: "Đang chờ",
      value: ticketOverview.statusCounts.waiting,
      color: STATUS_COLORS.waiting,
    },
    {
      label: "Đang xử lý",
      value: ticketOverview.statusCounts.processing,
      color: STATUS_COLORS.processing,
    },
    {
      label: "Hoàn tất",
      value: ticketOverview.statusCounts.completed,
      color: STATUS_COLORS.completed,
    },
    {
      label: "Bỏ qua",
      value: ticketOverview.statusCounts.skipped,
      color: STATUS_COLORS.skipped,
    },
  ];

  const todayStatusLegend = [
    {
      label: "Đang chờ",
      value: ticketsToday.statusCounts.waiting,
      color: STATUS_COLORS.waiting,
    },
    {
      label: "Đang xử lý",
      value: ticketsToday.statusCounts.processing,
      color: STATUS_COLORS.processing,
    },
    {
      label: "Hoàn tất",
      value: ticketsToday.statusCounts.completed,
      color: STATUS_COLORS.completed,
    },
    {
      label: "Bỏ qua",
      value: ticketsToday.statusCounts.skipped,
      color: STATUS_COLORS.skipped,
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
       

        <section className={styles.summaryGrid}>
          <SummaryCard icon={<FiLayers />} title="Tổng vé">
            <div className={styles.summaryValue}>{formatUnit(totalTickets, "vé")}</div>
            <div className={styles.summaryNote}>Tổng vé từ trước đến nay</div>
          </SummaryCard>
          <SummaryCard icon={<FiClock />} title="Tổng phòng">
            <div className={styles.summaryList}>
              <div className={styles.summaryItem}>Tổng: {formatUnit(countersStatus.totalCounters, "phòng")}</div>
              <div className={styles.summaryItem}>Đang hoạt động: {formatUnit(countersStatus.activeCounters, "phòng")}</div>
              <div className={styles.summaryItem}>Ngừng hoạt động: {formatUnit(inactiveCounters, "phòng")}</div>
            </div>
          </SummaryCard>
          <SummaryCard icon={<FiCheckCircle />} title="Tổng nhân viên">
            <div className={styles.summaryList}>
              {staffGroups.map((group) => (
                <div key={group.label} className={styles.summaryItem}>
                  {group.label} — Số lượng nhân viên: {group.staff.length}
                </div>
              ))}
            </div>
          </SummaryCard>
          <SummaryCard icon={<FiCheckCircle />} title="Vé hôm nay">
            <div className={styles.summaryList}>
              <div className={styles.summaryItem}>Tổng vé hôm nay: {formatUnit(ticketsToday.totalToday, "vé")}</div>
              <div className={styles.summaryItem}>Vé đang xử lý: {formatUnit(ticketsToday.statusCounts.processing, "vé")}</div>
              <div className={styles.summaryItem}>Vé chờ xử lý: {formatUnit(ticketsToday.statusCounts.waiting, "vé")}</div>
              <div className={styles.summaryItem}>Vé bỏ qua: {formatUnit(ticketsToday.statusCounts.skipped, "vé")}</div>
              <div className={styles.summaryItem}>Vé hoàn thành: {formatUnit(ticketsToday.statusCounts.completed, "vé")}</div>
            </div>
          </SummaryCard>
        </section>

        <section className={styles.gridTwo}>
          <div className={`${styles.panel} ${styles.statusPanel}`}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Tổng quan trạng thái vé</h2>
                <div className={styles.muted}>Thống kê từ trước đến nay theo trạng thái.</div>
              </div>
            </div>
            <div className={styles.chartWrapCompact}>
              {overviewStatusData ? (
                <Doughnut
                  data={overviewStatusData}
                  plugins={[doughnutLabelPlugin]}
                  options={chartOptionsBase}
                />
              ) : (
                <div className={styles.empty}>Chưa có dữ liệu thống kê.</div>
              )}
            </div>
            <div className={styles.legendList}>
              {overviewStatusLegend.map((item) => (
                <div key={item.label} className={styles.legendItem}>
                  <div className={styles.legendLabel}>
                    <span className={styles.dot} style={{ background: item.color }} />
                    {item.label}
                  </div>
                  <div className={styles.legendValue}>{formatUnit(item.value, "vé")}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={`${styles.panel} ${styles.statusPanel}`}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Trạng thái vé hôm nay</h2>
                <div className={styles.muted}>Tỷ lệ vé trong ngày hiện tại.</div>
              </div>
            </div>
            <div className={styles.chartWrapCompact}>
              {todayStatusData ? (
                <Doughnut
                  data={todayStatusData}
                  plugins={[doughnutLabelPlugin]}
                  options={chartOptionsBase}
                />
              ) : (
                <div className={styles.empty}>Chưa có dữ liệu thống kê.</div>
              )}
            </div>
            <div className={styles.legendList}>
              {todayStatusLegend.map((item) => (
                <div key={item.label} className={styles.legendItem}>
                  <div className={styles.legendLabel}>
                    <span className={styles.dot} style={{ background: item.color }} />
                    {item.label}
                  </div>
                  <div className={styles.legendValue}>{formatUnit(item.value, "vé")}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.gridTwo}>
          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Danh sách 5 vé gần nhất</h2>
                <div className={styles.muted}>Lọc theo phòng và quầy để xem nhanh danh sách.</div>
              </div>
            </div>
            <div className={styles.filterRow}>
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="recent-mode">Kiểu danh sách</label>
                <select
                  id="recent-mode"
                  className={styles.input}
                  value={recentMode}
                  onChange={(event) => setRecentMode(event.target.value as "counter" | "service")}
                >
                  <option value="counter">Theo phòng</option>
                  <option value="service">Theo quầy</option>
                </select>
              </div>
              {recentMode === "service" && (
                <div className={styles.inputGroup}>
                  <label className={styles.label} htmlFor="room-filter">Quầy</label>
                  <select
                    id="room-filter"
                    className={styles.input}
                    value={roomFilter}
                    onChange={(event) => setRoomFilter(event.target.value)}
                  >
                    <option value="Tất cả">Tất cả</option>
                    {serviceOptions.map((service) => (
                      <option key={service.id} value={service.id}>{service.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {recentMode === "counter" && (
                <div className={styles.inputGroup}>
                  <label className={styles.label} htmlFor="counter-filter">Phòng</label>
                  <select
                    id="counter-filter"
                    className={styles.input}
                    value={counterFilter}
                    onChange={(event) => setCounterFilter(event.target.value)}
                  >
                    <option value="Tất cả">Tất cả</option>
                    {counterOptions.map((counter) => (
                      <option key={counter.id} value={counter.id}>{counter.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className={styles.ticketList}>
              {filteredTickets.length === 0 ? (
                <div className={styles.empty}>Không có vé phù hợp.</div>
              ) : (
                filteredTickets.map((ticket) => (
                  <div key={ticket.id} className={styles.ticketItem}>
                    <div className={styles.ticketLeft}>
                      <span className={styles.ticketCode}>{ticket.ticketNumber}</span>
                      <span className={styles.ticketMeta}>{ticket.serviceName}</span>
                    </div>
                    <div className={styles.ticketRight}>
                      <span className={styles.ticketStatus}>{getTicketStatusLabel(ticket.status)}</span>
                      <span className={styles.ticketTime}>{new Date(ticket.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Tỷ lệ vé theo phòng</h2>
                <div className={styles.muted}>Biểu đồ tròn phản ánh lưu lượng theo từng quầy.</div>
              </div>
            </div>
            <div className={styles.filterRow}>
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="pie-room">Lọc phòng</label>
                <select
                  id="pie-room"
                  className={styles.input}
                  value={pieCounter}
                  onChange={(event) => setPieCounter(event.target.value)}
                >
                  <option value="Tất cả">Tất cả</option>
                  {pieCounterOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.chartWrapCompact}>
              {pieData ? (
                <Doughnut
                  data={pieData}
                  plugins={[doughnutLabelPlugin]}
                  options={chartOptionsBase}
                />
              ) : (
                <div className={styles.empty}>Chưa có dữ liệu thống kê.</div>
              )}
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2 className={styles.panelTitle}>Tỷ lệ hoàn thành / bỏ qua / chờ</h2>
              <div className={styles.muted}>Chọn kỳ thời gian để xem thống kê tương ứng.</div>
            </div>
          </div>
          <div className={styles.filterRow}>
            <div className={styles.inputGroup}>
              <label className={styles.label} htmlFor="period">Kỳ báo cáo</label>
              <select
                id="period"
                className={styles.input}
                value={period}
                onChange={(event) => setPeriod(event.target.value as "day" | "month")}
              >
                <option value="day">Theo ngày</option>
                <option value="month">Theo tháng</option>
              </select>
            </div>
            {period === "day" && (
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="day-value">Ngày</label>
                <input
                  id="day-value"
                  type="date"
                  className={styles.input}
                  value={dayValue}
                  onChange={(event) => setDayValue(event.target.value)}
                />
              </div>
            )}
            {period === "month" && (
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="month-value">Tháng</label>
                <input
                  id="month-value"
                  type="month"
                  className={styles.input}
                  value={monthValue}
                  onChange={(event) => setMonthValue(event.target.value)}
                />
              </div>
            )}
          </div>
          <div className={styles.chartWrap}>
            {barData ? (
              <Bar
                data={barData}
                options={{
                  ...chartOptionsBase,
                  scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true, grid: { color: "rgba(15, 34, 56, 0.08)" } },
                  },
                  plugins: {
                    ...chartOptionsBase.plugins,
                    tooltip: {
                      ...chartOptionsBase.plugins.tooltip,
                      callbacks: {
                        label: (context) =>
                          `${context.dataset.label || "Dữ liệu"}: ${formatUnit(Number(context.parsed.y ?? 0), "vé")}`,
                      },
                    },
                  },
                }}
              />
            ) : (
              <div className={styles.empty}>Chưa có dữ liệu thống kê.</div>
            )}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2 className={styles.panelTitle}>Cảnh báo quá tải</h2>
              <div className={styles.muted}>Những quầy có số lượng vé vượt 50 sẽ được cảnh báo.</div>
            </div>
          </div>
          <div className={styles.alertList}>
            {alertItems.map((counter) => (
              <div key={counter.id} className={styles.alertItem}>
                <div className={styles.alertName}>
                  <FiAlertTriangle />
                  {counter.name}
                </div>
                <div className={styles.alertRight}>
                  <span className={styles.alertCount}>{formatUnit(counter.waiting, "vé")}</span>
                  <span className={counter.isAlert ? styles.chipDanger : styles.chip}>
                    {counter.isAlert ? "Quá tải" : "Bình thường"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
} 