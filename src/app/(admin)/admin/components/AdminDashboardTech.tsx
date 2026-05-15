"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiGrid,
  FiRefreshCw,
  FiSkipForward,
  FiUsers,
  FiZap,
} from "react-icons/fi";
import styles from "./AdminDashboard.module.css";
import {
  DASHBOARD_AUTH_EXPIRED_ERROR,
  getDashboardCounterAlert,
  getDashboardCountersStatus,
  getDashboardRecentTickets,
  getDashboardStaff,
  getDashboardTicketOverview,
  getDashboardTicketRatio,
  getDashboardTicketTrend,
  getDashboardTicketsToday,
  getDashboardOverview,
  type DashboardCounterAlert,
  type DashboardCountersStatus,
  type DashboardOverviewData,
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

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  waiting: "#f59e0b",
  processing: "#3b82f6",
  completed: "#10b981",
  skipped: "#ef4444",
};

const TICKET_STATUS_LABELS: Record<string, string> = {
  waiting: "Đang chờ",
  processing: "Đang xử lý",
  completed: "Hoàn tất",
  skipped: "Bỏ qua",
};

// FIX #11: Đưa magic number ra constant có comment rõ ràng
const LIST_MAX_HEIGHT = 336; // 4 rows × ~76px + 3 × 8px gap

// FIX #10: Đưa chart options ra ngoài component — không phụ thuộc state
const BASE_CHART_OPTIONS = {
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "rgba(255,255,255,0.98)",
      titleColor: "#0f172a",
      bodyColor: "#475569",
      borderColor: "#e2e8f0",
      borderWidth: 1,
      padding: 10,
    },
  },
} as const;

const BAR_OPTIONS = {
  ...BASE_CHART_OPTIONS,
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: "#64748b", font: { size: 11 } },
    },
    y: {
      beginAtZero: true,
      grid: { color: "rgba(0,0,0,0.05)" },
      ticks: { color: "#64748b", font: { size: 11 } },
    },
  },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  // FIX #7: guard âm (clock skew server/client)
  if (mins <= 0) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
};

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ h = 20, w = "100%", r = 8 }: { h?: number; w?: number | string; r?: number }) {
  return (
    <div
      className={styles.skeleton}
      style={{ height: h, width: w, borderRadius: r }}
    />
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  icon,
  label,
  value,
  sub,
  accent,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
  loading?: boolean;
}) {
  return (
    <div className={styles.kpiCard} style={{ "--accent": accent } as React.CSSProperties}>
      <div className={styles.kpiIcon}>{icon}</div>
      <div className={styles.kpiBody}>
        <div className={styles.kpiLabel}>{label}</div>
        {loading ? (
          <Skeleton h={32} w={80} r={6} />
        ) : (
          <div className={styles.kpiValue}>{value}</div>
        )}
        {sub && <div className={styles.kpiSub}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status as keyof typeof STATUS_COLORS] ?? "#6b7280";
  const label = TICKET_STATUS_LABELS[status] ?? status;
  return (
    <span className={styles.badge} style={{ "--bc": color } as React.CSSProperties}>
      {label}
    </span>
  );
}

// ─── Panel wrapper ────────────────────────────────────────────────────────────
function Panel({
  title,
  sub,
  children,
  action,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <div>
          <h2 className={styles.panelTitle}>{title}</h2>
          {sub && <p className={styles.panelSub}>{sub}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
// FIX #9: Tách header thành component riêng thay vì inline JSX cũ
function DashboardHeader({
  lastUpdated,
  overloadedAlerts,
  onRefresh,
  refreshing,
}: {
  lastUpdated: Date | null;
  overloadedAlerts: { id: string; name: string; waiting: number; isAlert: boolean }[];
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const isLoading = !lastUpdated;
  return (
    <div className={styles.header}>
      <div className={styles.headerLeft}>
        <h1 className={styles.pageTitle}>HỆ THỐNG LẤY VÉ TỰ ĐỘNG TÒA ÁN KHU VỰC 1 - HỒ CHÍ MINH</h1>
        <div className={styles.statusRow}>
          {isLoading ? (
            <>
              <FiActivity size={13} className={styles.spinIcon} />
              <span className={styles.statusText}>Đang tải dữ liệu...</span>
            </>
          ) : (
            <>
              <span className={styles.liveDot} aria-hidden="true" />
              <span className={styles.statusText}>
                Cập nhật lúc {lastUpdated.toLocaleTimeString("vi-VN")}
              </span>
            </>
          )}
        </div>
      </div>
      <div className={styles.headerActions}>
        {overloadedAlerts.map((a) => (
          <span
            key={a.id}
            className={styles.alertBadge}
            role="status"
            aria-live="polite"
            title={`${a.name}: ${a.waiting} phiếu chờ`}
          >
            <FiAlertTriangle size={12} aria-hidden="true" />
            <span className={styles.alertBadgeName}>{a.name}</span>
            <span className={styles.alertBadgeCount}>{a.waiting}</span>
          </span>
        ))}
        <button
          className={styles.refreshBtn}
          onClick={onRefresh}
          disabled={isLoading || refreshing}
          aria-label="Làm mới dữ liệu"
        >
          <FiRefreshCw
            size={14}
            aria-hidden="true"
            className={refreshing ? styles.spinning : undefined}
          />
          <span>Làm mới</span>
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboardTech() {
  const router = useRouter();

  // ── State ──
  const [overview, setOverview] = useState<DashboardOverviewData | null>(null);
  const [ticketOverview, setTicketOverview] = useState<DashboardTicketOverview | null>(null);
  const [countersStatus, setCountersStatus] = useState<DashboardCountersStatus | null>(null);
  const [staffData, setStaffData] = useState<DashboardStaffData | null>(null);
  const [ticketsToday, setTicketsToday] = useState<DashboardTicketsToday | null>(null);
  const [recentTicketsData, setRecentTicketsData] = useState<DashboardRecentTickets | null>(null);
  const [ticketRatio, setTicketRatio] = useState<DashboardTicketRatio[] | null>(null);
  const [trendDay, setTrendDay] = useState<DashboardTicketTrendPoint[] | null>(null);
  const [trendMonth, setTrendMonth] = useState<DashboardTicketTrendPoint[] | null>(null);
  const [counterAlerts, setCounterAlerts] = useState<DashboardCounterAlert[] | null>(null);
  const [allCounters, setAllCounters] = useState<Counter[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // filters
  const [trendPeriod, setTrendPeriod] = useState<"day" | "month">("day");
  // FIX #1: Bỏ dayValue — không được sử dụng trong barData
  const [monthValue] = useState(currentMonth);
  const [recentMode, setRecentMode] = useState<"counter" | "service">("counter");
  const [pieCounter, setPieCounter] = useState("Tất cả");

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // FIX #2: Flag để tránh race condition khi fetch chồng chéo
  const fetchingRef = useRef(false);
  // FIX #8: Ref để tránh setState sau khi unmount
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ── Fetch ──
  const loadAll = useCallback(
    async (silent = false) => {
      // FIX #2: Bỏ qua nếu đang có request silent đang chạy
      if (silent && fetchingRef.current) return;
      fetchingRef.current = true;

      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError(null);

      try {
        const [
          ovData,
          tkOv,
          ctrStatus,
          staff,
          today,
          recent,
          ratio,
          tDay,
          tMonth,
          alerts,
          counters,
        ] = await Promise.all([
          getDashboardOverview(),
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

        // FIX #8: Không setState nếu đã unmount
        if (!mountedRef.current) return;

        setOverview(ovData);
        setTicketOverview(tkOv);
        setCountersStatus(ctrStatus);
        setStaffData(staff);
        setTicketsToday(today);
        setRecentTicketsData(recent);
        setTicketRatio(ratio);
        setTrendDay(tDay);
        setTrendMonth(tMonth);
        setCounterAlerts(alerts);
        setAllCounters(counters);
        setLastUpdated(new Date());
      } catch (err) {
        if (!mountedRef.current) return;
        if (err instanceof Error && err.message === DASHBOARD_AUTH_EXPIRED_ERROR) {
          localStorage.removeItem("adminToken");
          localStorage.removeItem("adminUser");
          router.push("/login?reason=session_expired");
          return;
        }
        setError(err instanceof Error ? err.message : "Không thể tải dữ liệu.");
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
        fetchingRef.current = false;
      }
    },
    [router],
  );

  useEffect(() => {
    loadAll();
    // FIX #2: Tăng interval lên 30s để tránh request chồng chéo
    intervalRef.current = setInterval(() => loadAll(true), 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadAll]);

  // ── Derived: name maps ──
  const counterNameMap = useMemo(() => {
    const map = new Map<string, string>();
    allCounters.forEach((c) => {
      if (c._id) map.set(c._id, c.name || c._id);
      if (c.code) map.set(c.code, c.name || c.code);
      if (c.number !== undefined) map.set(String(c.number), c.name || `Quầy ${c.number}`);
      if (c.name) map.set(c.name, c.name);
    });
    countersStatus?.countersList.forEach((c) => {
      if (c.id && !map.has(c.id)) map.set(c.id, c.name || c.id);
      if (c.name && !map.has(c.name)) map.set(c.name, c.name);
    });
    return map;
  }, [allCounters, countersStatus]);

  // ── Derived: service name map ──
  const serviceNameMap = useMemo(() => {
    const map = new Map<string, string>();
    (overview?.services ?? []).forEach((s) => {
      if (s.id) map.set(s.id, s.name || s.id);
      if (s.name) map.set(s.name, s.name);
    });
    return map;
  }, [overview]);

  const getCounterName = useCallback(
    (cid: DashboardRecentTickets["recentByCounter"][0]["counterId"]) => {
      if (!cid) return "Chưa gán";
      if (typeof cid === "string") return counterNameMap.get(cid) || cid;
      return cid.name || cid.id || "Chưa gán";
    },
    [counterNameMap],
  );

  const getServiceName = useCallback(
    (sid: string | { id?: string; name?: string } | null | undefined) => {
      if (!sid) return "Chưa rõ";
      if (typeof sid === "string") {
        const resolved = serviceNameMap.get(sid);
        // FIX #6: Log trong dev nếu không resolve được ID
        if (!resolved && process.env.NODE_ENV === "development") {
          console.warn(`[Dashboard] Không tìm thấy tên dịch vụ cho ID: ${sid}`);
        }
        return resolved || sid;
      }
      return sid.name || (sid.id ? serviceNameMap.get(sid.id) || sid.id : "Chưa rõ");
    },
    [serviceNameMap],
  );

  // ── Derived: recent tickets ──
  const recentTickets = useMemo(() => {
    if (!recentTicketsData) return [];
    if (recentMode === "service") {
      return recentTicketsData.recentByService
        .flatMap((g, gi) =>
          g.tickets.map((t, ti) => ({
            // FIX #5: Key đủ unique — thêm serviceId vào
            id: `svc-${g.serviceId}-${t.ticketNumber}-${gi}-${ti}`,
            ticketNumber: t.ticketNumber,
            status: t.status,
            createdAt: t.createdAt,
            serviceName: getServiceName(g.serviceId),
            counterName: "—",
          })),
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);
    }
    return recentTicketsData.recentByCounter
      .flatMap((g, gi) =>
        g.tickets.map((t, ti) => ({
          // FIX #5: Key đủ unique — thêm counterId vào
          id: `ctr-${String(g.counterId)}-${t.ticketNumber}-${gi}-${ti}`,
          ticketNumber: t.ticketNumber,
          status: t.status,
          createdAt: t.createdAt,
          serviceName: getServiceName(t.serviceId),
          counterName: getCounterName(g.counterId),
        })),
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [recentTicketsData, recentMode, getCounterName, getServiceName]);

  // ── Derived: trend chart data ──
  const barData = useMemo(() => {
    if (trendPeriod === "day") {
      const source = trendDay ?? [];
      return {
        labels: source.map((p) => p.label),
        datasets: [
          {
            label: "Hoàn tất",
            data: source.map((p) => p.completed),
            backgroundColor: STATUS_COLORS.completed,
            borderRadius: 6,
            maxBarThickness: 22,
          },
          {
            label: "Bỏ qua",
            data: source.map((p) => p.skipped),
            backgroundColor: STATUS_COLORS.skipped,
            borderRadius: 6,
            maxBarThickness: 22,
          },
          {
            label: "Chờ",
            data: source.map((p) => p.waiting),
            backgroundColor: STATUS_COLORS.waiting,
            borderRadius: 6,
            maxBarThickness: 22,
          },
        ],
      };
    }

    const year = monthValue.split("-")[0];
    const monthlyMap = new Map<number, DashboardTicketTrendPoint>();
    (trendMonth ?? []).forEach((p) => {
      const m = p.label.match(/(\d{4})-(\d{1,2})/);
      if (m && m[1] === year) monthlyMap.set(Number(m[2]), p);
    });
    const labels = Array.from({ length: 12 }, (_, i) => `T${i + 1}`);
    return {
      labels,
      datasets: [
        {
          label: "Hoàn tất",
          data: labels.map((_, i) => monthlyMap.get(i + 1)?.completed ?? 0),
          backgroundColor: STATUS_COLORS.completed,
          borderRadius: 6,
          maxBarThickness: 22,
        },
        {
          label: "Bỏ qua",
          data: labels.map((_, i) => monthlyMap.get(i + 1)?.skipped ?? 0),
          backgroundColor: STATUS_COLORS.skipped,
          borderRadius: 6,
          maxBarThickness: 22,
        },
        {
          label: "Chờ",
          data: labels.map((_, i) => monthlyMap.get(i + 1)?.waiting ?? 0),
          backgroundColor: STATUS_COLORS.waiting,
          borderRadius: 6,
          maxBarThickness: 22,
        },
      ],
    };
    // FIX #1: Bỏ dayValue khỏi deps — không được dùng trong memo này
  }, [trendPeriod, trendDay, trendMonth, monthValue]);

  // ── Derived: donut today ──
  const donutTodayData = useMemo(() => {
    if (!ticketsToday) return null;
    const { waiting, processing, completed, skipped } = ticketsToday.statusCounts;
    return {
      labels: ["Chờ", "Xử lý", "Hoàn tất", "Bỏ qua"],
      datasets: [
        {
          data: [waiting, processing, completed, skipped],
          backgroundColor: [
            STATUS_COLORS.waiting,
            STATUS_COLORS.processing,
            STATUS_COLORS.completed,
            STATUS_COLORS.skipped,
          ],
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    };
  }, [ticketsToday]);

  // ── Derived: donut ratio by counter ──
  const donutRatioData = useMemo(() => {
    if (!ticketRatio || ticketRatio.length === 0) return null;
    const source =
      pieCounter === "Tất cả"
        ? ticketRatio
        : ticketRatio.filter((r) => r.counterName === pieCounter);
    const totals = source.reduce(
      (acc, r) => ({
        completed: acc.completed + r.completed,
        skipped: acc.skipped + r.skipped,
        waiting: acc.waiting + r.waiting,
      }),
      { completed: 0, skipped: 0, waiting: 0 },
    );
    return {
      labels: ["Hoàn tất", "Bỏ qua", "Chờ"],
      datasets: [
        {
          data: [totals.completed, totals.skipped, totals.waiting],
          backgroundColor: [STATUS_COLORS.completed, STATUS_COLORS.skipped, STATUS_COLORS.waiting],
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    };
  }, [ticketRatio, pieCounter]);

  const pieCounterOptions = useMemo(
    () => (ticketRatio ?? []).map((r) => r.counterName),
    [ticketRatio],
  );

  // ── Derived: alerts ──
  const alertItems = useMemo(() => {
    const alertMap = new Map<string, DashboardCounterAlert>();
    (counterAlerts ?? []).forEach((a) => {
      alertMap.set(a.counterId, a);
      alertMap.set(a.counterName, a);
    });

    // Map waiting count + overload info từ overview.counters — nguồn chính xác nhất
    const overviewMap = new Map<
      string,
      { waiting: number; isOverloaded: boolean; overloadThreshold: number }
    >();
    (overview?.counters ?? []).forEach((c) => {
      const entry = {
        waiting: c.waiting ?? 0,
        isOverloaded: c.isOverloaded ?? false,
        overloadThreshold: c.overloadThreshold ?? 0,
      };
      if (c.id) overviewMap.set(c.id, entry);
      if (c.name) overviewMap.set(c.name, entry);
    });

    return (countersStatus?.countersList ?? []).map((c) => {
      const key = c.id || c.name || String(c.number ?? "");
      const alert = key ? alertMap.get(key) : undefined;
      const overviewEntry =
        (c.id ? overviewMap.get(c.id) : undefined) ??
        (c.name ? overviewMap.get(c.name) : undefined);

      // Ưu tiên: overview.counters → countersStatus.waiting → counterAlerts.waitingCount → 0
      const waiting =
        overviewEntry?.waiting ??
        c.waiting ??
        alert?.waitingCount ??
        0;

      // isAlert: ưu tiên counterAlerts API → fallback overview.isOverloaded
      // → fallback tự tính nếu overloadThreshold > 0
      const apiAlert = alert?.isAlert ?? false;
      const overviewOverloaded = overviewEntry?.isOverloaded ?? false;
      const threshold = overviewEntry?.overloadThreshold ?? 0;
      const thresholdBreached = threshold > 0 && waiting >= threshold;
      const isAlert = apiAlert || overviewOverloaded || thresholdBreached;

      return {
        id: key || `ctr-${c.name}`,
        name: c.name || (c.number !== undefined ? `Quầy ${c.number}` : "Quầy"),
        waiting,
        isAlert,
      };
    });
  }, [countersStatus, counterAlerts, overview]);

  const overloadedAlerts = useMemo(
    () => alertItems.filter((a) => a.isAlert),
    [alertItems],
  );

  // FIX #4: Tính maxWaiting an toàn, tránh Math.max(...[]) trả về -Infinity
  const maxWaiting = useMemo(() => {
    if (alertItems.length === 0) return 1;
    return Math.max(...alertItems.map((x) => x.waiting), 0) || 1;
  }, [alertItems]);

  const summary = overview?.summary;
  const hasAlerts = (overview?.alerts?.length ?? 0) > 0 || overloadedAlerts.length > 0;

  // ── Render: error ──
  if (error && !overview) {
    return (
      <div className={styles.page}>
        <div className={styles.centerMsg}>
          <FiAlertTriangle size={40} color="#ef4444" />
          <h2>Không thể tải dữ liệu</h2>
          <p>{error}</p>
          <button className={styles.btnPrimary} onClick={() => loadAll()}>
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  // ── Render: main ──
  return (
    <div className={styles.page}>
      {/* ── Header (FIX #9: dùng component mới) ── */}
      <DashboardHeader
        lastUpdated={lastUpdated}
        overloadedAlerts={overloadedAlerts}
        onRefresh={() => loadAll()}
        refreshing={refreshing}
      />

      {/* ── Alerts banner ── */}
      {overloadedAlerts.length > 0 && (
        <div className={styles.alertsBanner}>
          {overloadedAlerts.map((a) => (
            <div key={a.id} className={styles.alertRow}>
              <FiAlertTriangle size={14} />
              <span>
                <strong>{a.name}</strong> đang quá tải với{" "}
                <strong>{fmt(a.waiting)}</strong> phiếu chờ
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── KPI Row ── */}
      <div className={styles.kpiGrid}>
        <KpiCard
          icon={<FiClock />}
          label="Đang chờ"
          value={loading ? "—" : fmt(summary?.totalWaiting ?? 0)}
          sub="phiếu trong hàng"
          accent="#f59e0b"
          loading={loading}
        />
        <KpiCard
          icon={<FiZap />}
          label="Đang xử lý"
          value={loading ? "—" : fmt(summary?.totalProcessing ?? 0)}
          sub="phiếu đang giao dịch"
          accent="#3b82f6"
          loading={loading}
        />
        <KpiCard
          icon={<FiCheckCircle />}
          label="Hoàn tất hôm nay"
          value={loading ? "—" : fmt(summary?.ticketsCompletedToday ?? 0)}
          sub={`/ ${fmt(summary?.ticketsIssuedToday ?? 0)} phiếu phát`}
          accent="#10b981"
          loading={loading}
        />
        <KpiCard
          icon={<FiSkipForward />}
          label="Bỏ qua hôm nay"
          value={loading ? "—" : fmt(summary?.ticketsSkippedToday ?? 0)}
          sub="phiếu không xử lý"
          accent="#ef4444"
          loading={loading}
        />
        <KpiCard
          icon={<FiGrid />}
          label="Quầy hoạt động"
          value={
            loading
              ? "—"
              : `${summary?.activeCounters ?? 0} / ${summary?.totalCounters ?? 0}`
          }
          sub={
            (summary?.overloadedCounters ?? 0) > 0
              ? `⚠ ${summary!.overloadedCounters} quầy quá tải`
              : "Hoạt động bình thường"
          }
          accent="#8b5cf6"
          loading={loading}
        />
        <KpiCard
          icon={<FiUsers />}
          label="Nhân viên trực"
          value={
            loading
              ? "—"
              : `${summary?.assignedStaff ?? 0} / ${summary?.totalStaff ?? 0}`
          }
          sub="đã nhận quầy"
          accent="#06b6d4"
          loading={loading}
        />
      </div>

      {/* ── Row 2: Bar chart + Donut today ── */}
      <div className={styles.gridTwoThree}>
        <Panel
          title="Xu hướng phiếu"
          sub="Thống kê phát sinh theo thời gian"
          action={
            <div className={styles.tabRow}>
              <button
                className={trendPeriod === "day" ? styles.tabActive : styles.tab}
                onClick={() => setTrendPeriod("day")}
              >
                Hôm nay
              </button>
              <button
                className={trendPeriod === "month" ? styles.tabActive : styles.tab}
                onClick={() => setTrendPeriod("month")}
              >
                Tháng này
              </button>
            </div>
          }
        >
          <div className={styles.chartWrap}>
            {loading ? (
              <Skeleton h={220} />
            ) : barData ? (
              <Bar data={barData} options={BAR_OPTIONS} />
            ) : (
              <div className={styles.emptyChart}>Chưa có dữ liệu</div>
            )}
          </div>
          <div className={styles.barLegend}>
            {[
              { label: "Hoàn tất", color: STATUS_COLORS.completed },
              { label: "Bỏ qua", color: STATUS_COLORS.skipped },
              { label: "Chờ", color: STATUS_COLORS.waiting },
            ].map((l) => (
              <span key={l.label} className={styles.legendDot}>
                <span style={{ background: l.color }} />
                {l.label}
              </span>
            ))}
          </div>
        </Panel>

        <Panel
          title="Phiếu hôm nay"
          sub={`Tổng: ${fmt(ticketsToday?.totalToday ?? 0)} phiếu`}
        >
          <div className={styles.donutWrap}>
            {loading ? (
              <Skeleton h={180} r={999} w={180} />
            ) : donutTodayData ? (
              <Doughnut
                data={donutTodayData}
                options={{ ...BASE_CHART_OPTIONS, cutout: "68%" }}
              />
            ) : (
              <div className={styles.emptyChart}>Chưa có dữ liệu</div>
            )}
          </div>
          <div className={styles.donutLegend}>
            {[
              { label: "Đang chờ", key: "waiting" as const, color: STATUS_COLORS.waiting },
              { label: "Đang xử lý", key: "processing" as const, color: STATUS_COLORS.processing },
              { label: "Hoàn tất", key: "completed" as const, color: STATUS_COLORS.completed },
              { label: "Bỏ qua", key: "skipped" as const, color: STATUS_COLORS.skipped },
            ].map((item) => (
              <div
                key={item.key}
                className={styles.donutLegendRow}
                style={{ "--dv-color": item.color } as React.CSSProperties}
              >
                <span className={styles.donutDot} style={{ background: item.color }} />
                <span className={styles.donutLegendLabel}>{item.label}</span>
                <span className={styles.donutLegendVal}>
                  {fmt(ticketsToday?.statusCounts[item.key] ?? 0)}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── Row 3: Counters + Services + Staff ── */}
      <div className={styles.gridThree}>
        {/* Counters */}
        <Panel title="Trạng thái quầy" sub="Hoạt động theo thời gian thực">
          {/* FIX #11: Dùng constant LIST_MAX_HEIGHT thay magic number */}
          <div className={styles.counterList} style={{ maxHeight: LIST_MAX_HEIGHT }}>
            {loading
              ? [1, 2, 3].map((i) => <Skeleton key={i} h={64} r={12} />)
              : (overview?.counters ?? []).map((ctr) => (
                  <div
                    key={ctr.id}
                    className={`${styles.counterCard} ${
                      ctr.isOverloaded
                        ? styles.counterOverload
                        : ctr.isServing
                        ? styles.counterActive
                        : ""
                    }`}
                  >
                    <div className={styles.counterTop}>
                      <span className={styles.counterName}>{ctr.name}</span>
                      <span
                        className={styles.counterStatus}
                        style={{
                          color: ctr.isOverloaded
                            ? STATUS_COLORS.skipped
                            : ctr.isServing
                            ? STATUS_COLORS.completed
                            : "#6b7280",
                        }}
                      >
                        {ctr.isOverloaded
                          ? "⚠ Quá tải"
                          : ctr.isServing
                          ? "● Đang phục vụ"
                          : "○ Trống"}
                      </span>
                    </div>
                    {ctr.staff && (
                      <div className={styles.counterStaff}>
                        <FiUsers size={11} /> {ctr.staff.fullName}
                      </div>
                    )}
                    {ctr.currentTicket && (
                      <div className={styles.counterTicket}>
                        Phiếu: <strong>{ctr.currentTicket.ticketNumber}</strong>
                        {" · "}
                        {ctr.currentTicket.customerName}
                      </div>
                    )}
                    <div className={styles.counterMeta}>
                      <span>
                        Chờ: <strong>{ctr.waiting}</strong>
                      </span>
                      <span>
                        Đã xử lý: <strong>{ctr.processedCount}</strong>
                      </span>
                    </div>
                  </div>
                ))}
            {!loading && (overview?.counters ?? []).length === 0 && (
              <div className={styles.emptyChart}>Không có dữ liệu quầy</div>
            )}
          </div>
        </Panel>

        {/* Services */}
        <Panel title="Theo dịch vụ" sub="Lượng phiếu phân theo dịch vụ">
          <div className={styles.serviceList} style={{ maxHeight: LIST_MAX_HEIGHT }}>
            {loading
              ? [1, 2, 3, 4].map((i) => <Skeleton key={i} h={52} r={10} />)
              : (overview?.services ?? []).map((svc) => {
                  const maxWait = Math.max(
                    ...(overview?.services ?? []).map((s) => s.waiting),
                    1,
                  );
                  return (
                    <div key={svc.id} className={styles.serviceRow}>
                      <div className={styles.serviceTop}>
                        <span className={styles.serviceName}>
                          {svc.name || serviceNameMap.get(svc.id) || svc.id}
                        </span>
                        <span
                          className={styles.serviceActiveDot}
                          style={{
                            color: svc.isActive ? STATUS_COLORS.completed : "#6b7280",
                          }}
                        >
                          {svc.isActive ? "● Hoạt động" : "○ Tạm dừng"}
                        </span>
                      </div>
                      <div className={styles.serviceStats}>
                        <span>
                          Chờ:{" "}
                          <strong style={{ color: STATUS_COLORS.waiting }}>
                            {svc.waiting}
                          </strong>
                        </span>
                        <span>
                          Xử lý:{" "}
                          <strong style={{ color: STATUS_COLORS.processing }}>
                            {svc.processing}
                          </strong>
                        </span>
                        <span>
                          Xong:{" "}
                          <strong style={{ color: STATUS_COLORS.completed }}>
                            {svc.completedToday}
                          </strong>
                        </span>
                      </div>
                      <div className={styles.progressBar}>
                        <div
                          className={styles.progressFill}
                          style={{ width: `${(svc.waiting / maxWait) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
          </div>
        </Panel>

        {/* Staff */}
        <Panel
          title="Nhân viên trực"
          sub={`${summary?.assignedStaff ?? 0} / ${summary?.totalStaff ?? 0} đã nhận quầy`}
        >
          <div className={styles.staffList} style={{ maxHeight: LIST_MAX_HEIGHT }}>
            {loading
              ? [1, 2, 3, 4].map((i) => <Skeleton key={i} h={44} r={10} />)
              : (staffData?.staffList ?? []).map((s, i) => {
                  const initials = s.fullName
                    .split(" ")
                    .slice(-2)
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase();
                  const counterLabel =
                    typeof s.counterId === "object" && s.counterId
                      ? s.counterId.name ||
                        (s.counterId.number !== undefined
                          ? `Quầy ${s.counterId.number}`
                          : null)
                      : null;
                  return (
                    <div key={i} className={styles.staffRow}>
                      <div
                        className={styles.staffAvatar}
                        style={{
                          background: s.onDuty
                            ? "rgba(16,185,129,0.15)"
                            : "rgba(107,114,128,0.15)",
                          color: s.onDuty ? STATUS_COLORS.completed : "#6b7280",
                        }}
                      >
                        {initials}
                      </div>
                      <div className={styles.staffInfo}>
                        <span className={styles.staffName}>{s.fullName}</span>
                        <span className={styles.staffCounter}>
                          {counterLabel ?? "Chưa nhận quầy"}
                        </span>
                      </div>
                      <span
                        className={styles.dutyBadge}
                        style={{
                          background: s.onDuty
                            ? "rgba(16,185,129,0.12)"
                            : "rgba(107,114,128,0.12)",
                          color: s.onDuty ? STATUS_COLORS.completed : "#6b7280",
                        }}
                      >
                        {s.onDuty ? "Đang trực" : "Nghỉ"}
                      </span>
                    </div>
                  );
                })}
          </div>
        </Panel>
      </div>

      {/* ── Row 4: Recent tickets + Ratio donut ── */}
      <div className={styles.gridTwoThree}>
        <Panel
          title="Phiếu gần đây"
          sub="10 phiếu mới nhất"
          action={
            <div className={styles.tabRow}>
              <button
                className={recentMode === "counter" ? styles.tabActive : styles.tab}
                onClick={() => setRecentMode("counter")}
              >
                Theo quầy
              </button>
              <button
                className={recentMode === "service" ? styles.tabActive : styles.tab}
                onClick={() => setRecentMode("service")}
              >
                Theo dịch vụ
              </button>
            </div>
          }
        >
          <div className={styles.ticketTable}>
            <div className={styles.ticketHead}>
              <span>Số phiếu</span>
              <span>Dịch vụ</span>
              <span>Quầy</span>
              <span>Trạng thái</span>
              <span>Thời gian</span>
            </div>
            {loading ? (
              [1, 2, 3, 4, 5].map((i) => <Skeleton key={i} h={40} r={8} />)
            ) : recentTickets.length === 0 ? (
              <div className={styles.emptyChart}>Không có phiếu gần đây</div>
            ) : (
              recentTickets.map((t) => (
                <div key={t.id} className={styles.ticketRow}>
                  <span className={styles.ticketNum}>{t.ticketNumber}</span>
                  <span className={styles.ticketService}>{t.serviceName}</span>
                  <span className={styles.ticketCounter}>{t.counterName}</span>
                  <StatusBadge status={t.status} />
                  <span className={styles.ticketTime}>{timeAgo(t.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel title="Tỉ lệ theo quầy" sub="Hoàn tất / Bỏ qua / Chờ">
          <div className={styles.filterRow}>
            <select
              className={styles.select}
              value={pieCounter}
              onChange={(e) => setPieCounter(e.target.value)}
            >
              <option value="Tất cả">Tất cả quầy</option>
              {pieCounterOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.donutWrap}>
            {loading ? (
              <Skeleton h={180} r={999} w={180} />
            ) : donutRatioData ? (
              <Doughnut
                data={donutRatioData}
                options={{ ...BASE_CHART_OPTIONS, cutout: "68%" }}
              />
            ) : (
              <div className={styles.emptyChart}>Chưa có dữ liệu</div>
            )}
          </div>
          <div className={styles.donutLegend}>
            {[
              { label: "Hoàn tất",   color: STATUS_COLORS.completed,  key: "completed" as const },
              { label: "Bỏ qua",     color: STATUS_COLORS.skipped,    key: "skipped"   as const },
              { label: "Đang chờ",   color: STATUS_COLORS.waiting,    key: "waiting"   as const },
            ].map((item) => {
              const source =
                pieCounter === "Tất cả"
                  ? ticketRatio ?? []
                  : (ticketRatio ?? []).filter((r) => r.counterName === pieCounter);
              const total = source.reduce((sum, r) => sum + (r[item.key] ?? 0), 0);
              return (
                <div
                  key={item.key}
                  className={styles.donutLegendRow}
                  style={{ "--dv-color": item.color } as React.CSSProperties}
                >
                  <span className={styles.donutDot} style={{ background: item.color }} />
                  <span className={styles.donutLegendLabel}>{item.label}</span>
                  <span className={styles.donutLegendVal}>{fmt(total)}</span>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {(loading || alertItems.length > 0) && (
        <Panel title="Cảnh báo quá tải" sub="Trạng thái tải theo từng quầy">
          {loading ? (
            <div className={styles.overloadGrid}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} h={80} r={12} />
              ))}
            </div>
          ) : (
            <div className={styles.overloadGrid}>
              {alertItems.map((a) => (
                <div
                  key={a.id}
                  className={`${styles.overloadCard} ${a.isAlert ? styles.overloadDanger : ""}`}
                >
                  <div className={styles.overloadCardHeader}>
                    <div
                      className={styles.overloadIconWrap}
                      style={{
                        background: a.isAlert
                          ? "rgba(239,68,68,0.1)"
                          : "rgba(16,185,129,0.1)",
                        color: a.isAlert ? STATUS_COLORS.skipped : STATUS_COLORS.completed,
                      }}
                    >
                      <FiGrid size={14} />
                    </div>
                    <span className={styles.overloadName2}>{a.name}</span>
                    <span
                      className={styles.overloadChip}
                      style={{
                        background: a.isAlert
                          ? "rgba(239,68,68,0.12)"
                          : "rgba(16,185,129,0.12)",
                        color: a.isAlert ? STATUS_COLORS.skipped : STATUS_COLORS.completed,
                      }}
                    >
                      {a.isAlert ? "Quá tải" : "Bình thường"}
                    </span>
                  </div>
                  <div className={styles.overloadWaitRow}>
                    <span className={styles.overloadWaitLabel}>Đang chờ</span>
                    <span
                      className={styles.overloadWaitCount}
                      style={{
                        color: a.isAlert ? STATUS_COLORS.skipped : STATUS_COLORS.completed,
                      }}
                    >
                      {fmt(a.waiting)}
                    </span>
                  </div>
                  <div className={styles.progressBar} style={{ marginTop: 6 }}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${Math.min((a.waiting / maxWaiting) * 100, 100)}%`,
                        background: a.isAlert
                          ? STATUS_COLORS.skipped
                          : STATUS_COLORS.completed,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}