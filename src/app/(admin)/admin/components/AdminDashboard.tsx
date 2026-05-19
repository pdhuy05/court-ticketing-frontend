"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartCore,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  Plugin,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import {
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiCpu,
  FiLayers,
} from "react-icons/fi";
import styles from "./AdminDashboard.module.css";
import {
  DashboardCounterOverview,
  DashboardReportData,
  DashboardReportService,
  DashboardServiceOverview,
  getDashboardOverview,
  getDashboardReport,
} from "@/services/dashboard.service";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
);

const CHART_COLORS = ["#37c2eb", "#4f7cff", "#20c37a", "#ff8b5c", "#9b6ef3"];
const SERVICE_COLORS: Record<string, string> = {
  ND: "#37c2eb",
  TKQ: "#4f7cff",
  SYTL: "#20c37a",
  KC: "#ff8b5c",
};
const OVERVIEW_STATUS_COLORS = ["#ffb020", "#37c2eb", "#20c37a", "#ff8b5c"];
const DAILY_STATUS_COLORS = ["#4f7cff", "#20c37a", "#ffb020", "#37c2eb"];

const doughnutLabelPlugin: Plugin<"doughnut"> = {
  id: "doughnutLabelPlugin",
  afterDatasetsDraw(chart: ChartCore<"doughnut">) {
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
      const x =
        arc.x +
        Math.cos(angle) * (arc.innerRadius + (arc.outerRadius - arc.innerRadius) * 0.55);
      const y =
        arc.y +
        Math.sin(angle) * (arc.innerRadius + (arc.outerRadius - arc.innerRadius) * 0.55);

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

// ✅ doughnutLabelPlugin được khai báo nhưng dùng tùy nơi — giữ lại để tránh xóa nhầm
void doughnutLabelPlugin;

const chartOptionsBase = {
  maintainAspectRatio: false,
  layout: {
    padding: 6,
  },
  plugins: {
    legend: {
      display: false,
    },
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

const formatNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

const formatUnit = (value: number, unit: string) =>
  `${formatNumber(value)} ${unit}`;

const formatMinutes = (value: number) =>
  `${new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value)} phút`;

const formatDateTime = (value?: string) => {
  if (!value) {
    return "--";
  }

  return new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

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

const previousDay = () => {
  const value = new Date();
  value.setDate(value.getDate() - 1);
  return formatDateInput(value);
};

const currentMonth = () => formatMonthInput(new Date());

const buildServiceDoughnutData = (services: DashboardServiceOverview[]) => ({
  labels: services.map((service) => service.name),
  datasets: [
    {
      data: services.map((service) => service.waiting + service.processing),
      backgroundColor: services.map(
        (service, index) =>
          SERVICE_COLORS[service.code] || CHART_COLORS[index % CHART_COLORS.length],
      ),
      borderWidth: 0,
      hoverOffset: 8,
      cutout: "66%",
    },
  ],
});

const buildStatusDoughnutData = (report: DashboardReportData) => ({
  labels: ["Đã phát", "Đã hoàn tất", "Đang chờ", "Đang xử lý"],
  datasets: [
    {
      data: [
        report.summary.issued,
        report.summary.completed,
        report.summary.waiting,
        report.summary.processing,
      ],
      backgroundColor: DAILY_STATUS_COLORS,
      borderWidth: 0,
      hoverOffset: 8,
      cutout: "66%",
    },
  ],
});

const buildTimelineData = (report: DashboardReportData) => ({
  labels: report.timeline.map((point) => point.label),
  datasets: [
    {
      label: "Phát hành",
      data: report.timeline.map((point) => point.issued),
      borderColor: "#4f7cff",
      backgroundColor: "rgba(79, 124, 255, 0.12)",
      pointBackgroundColor: "#4f7cff",
      pointRadius: 2.5,
      pointHoverRadius: 4,
      borderWidth: 2,
      tension: 0.35,
      fill: true,
    },
    {
      label: "Hoàn tất",
      data: report.timeline.map((point) => point.completed),
      borderColor: "#20c37a",
      backgroundColor: "rgba(32, 195, 122, 0.12)",
      pointBackgroundColor: "#20c37a",
      pointRadius: 2.5,
      pointHoverRadius: 4,
      borderWidth: 2,
      tension: 0.35,
      fill: true,
    },
  ],
});

const buildMonthlyBars = (report: DashboardReportData) => ({
  labels: report.timeline.map((point) => point.label.slice(8)),
  datasets: [
    {
      label: "Phát hành",
      data: report.timeline.map((point) => point.issued),
      backgroundColor: "#4f7cff",
      borderRadius: 8,
      maxBarThickness: 12,
    },
    {
      label: "Hoàn tất",
      data: report.timeline.map((point) => point.completed),
      backgroundColor: "#20c37a",
      borderRadius: 8,
      maxBarThickness: 12,
    },
  ],
});

function MetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className={styles.statCard}>
      <div className={styles.metricTop}>
        <span className={styles.dot} style={{ background: "#8fe8ff" }} />
        <span className={styles.metricIcon}>{icon}</span>
        <span className={styles.metricLabel}>{label}</span>
      </div>
      <p className={styles.statValue}>{value}</p>
      <div className={styles.statHint}>{hint}</div>
    </div>
  );
}

function ServiceTable({ services }: { services: DashboardReportService[] }) {
  return (
    <div className={styles.tablePanel}>
      <div className={styles.tableHeader}>
        <div>
          <h3 className={styles.panelTitle}>Hiệu suất theo quầy</h3>
          <div className={styles.muted}>
            Theo dõi lưu lượng, xử lý và hàng chờ hiện tại của từng nghiệp vụ.
          </div>
        </div>
      </div>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Yêu cầu</th>
              <th>Phát hành</th>
              <th>Hoàn tất</th>
              <th>Đang chờ</th>
              <th>Bỏ qua</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr key={service.id}>
                <td>
                  <div className={styles.serviceName}>
                    <span
                      className={styles.dot}
                      style={{
                        background:
                          SERVICE_COLORS[service.code] ||
                          CHART_COLORS[service.displayOrder % CHART_COLORS.length],
                      }}
                    />
                    {service.name}
                  </div>
                </td>
                <td>{formatUnit(service.issued, "vé")}</td>
                <td>{formatUnit(service.completed, "vé")}</td>
                <td>{formatUnit(service.waitingNow, "vé")}</td>
                <td>{formatUnit(service.skipped, "vé")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [overview, setOverview] = useState<Awaited<
    ReturnType<typeof getDashboardOverview>
  > | null>(null);
  const [dailyReport, setDailyReport] = useState<DashboardReportData | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<DashboardReportData | null>(null);
  const [dailyDate, setDailyDate] = useState(previousDay);
  const [monthValue, setMonthValue] = useState(currentMonth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const [overviewData, dailyData, monthlyData] = await Promise.all([
          getDashboardOverview(),
          getDashboardReport({ period: "daily", date: dailyDate }),
          getDashboardReport({ period: "monthly", month: monthValue }),
        ]);

        if (!mounted) return;

        setOverview(overviewData);
        setDailyReport(dailyData);
        setMonthlyReport(monthlyData);
      } catch (fetchError) {
        if (!mounted) return;

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Khong the tai du lieu thong ke.",
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [dailyDate, monthValue]);

  const overviewStatusData = useMemo(() => {
    if (!overview) return null;

    return {
      labels: ["Đang chờ", "Đang xử lý", "Hoàn tất hôm nay", "Bỏ qua hôm nay"],
      datasets: [
        {
          data: [
            overview.summary.totalWaiting,
            overview.summary.totalProcessing,
            overview.summary.ticketsCompletedToday,
            overview.summary.ticketsSkippedToday,
          ],
          backgroundColor: OVERVIEW_STATUS_COLORS,
          borderWidth: 0,
          hoverOffset: 8,
          cutout: "66%",
        },
      ],
    };
  }, [overview]);

  const serviceLoadData = useMemo(
    () => (overview ? buildServiceDoughnutData(overview.services) : null),
    [overview],
  );

  const dailyStatusData = useMemo(
    () => (dailyReport ? buildStatusDoughnutData(dailyReport) : null),
    [dailyReport],
  );

  const dailyLineData = useMemo(
    () => (dailyReport ? buildTimelineData(dailyReport) : null),
    [dailyReport],
  );

  const monthlyBarData = useMemo(
    () => (monthlyReport ? buildMonthlyBars(monthlyReport) : null),
    [monthlyReport],
  );

  if (loading && !overview) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <h2>Đang dựng bảng điều hành thống kê</h2>
          <p>Hệ thống đang lấy overview, báo cáo ngày và báo cáo tháng từ API.</p>
        </div>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <h2>Không thể tải dữ liệu thống kê</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!overview || !dailyReport || !monthlyReport || !dailyStatusData) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>Chưa có dữ liệu thống kê để hiển thị.</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.heroTop}>
            <div className={styles.heroText}>
              <span className={styles.eyebrow}>
                <FiCpu />
                Trung tâm điều hành thống kê thời gian thực
              </span>
            </div>
            <div className={styles.heroMeta}>
              <div className={styles.metaCard}>
                <span className={styles.metaLabel}>Dữ liệu realtime</span>
                <div className={styles.metaValue}>
                  Cập nhật lúc {formatDateTime(overview.generatedAt)}
                </div>
              </div>
              <div className={styles.metaCard}>
                <span className={styles.metaLabel}>Kỳ báo cáo đang xem</span>
                <div className={styles.metaValue}>
                  Ngày {dailyReport.label} và tháng {monthlyReport.label}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.statGrid}>
            <MetricCard
              icon={<FiLayers />}
              label="Tổng hàng chờ"
              value={formatUnit(overview.summary.totalWaiting, "vé")}
              hint={`${formatNumber(overview.summary.totalServices)} quầy đang hoạt động`}
            />
            <MetricCard
              icon={<FiActivity />}
              label="Đang xử lý"
              value={formatUnit(overview.summary.totalProcessing, "vé")}
              hint={`${formatNumber(overview.summary.activeCounters)} quầy đang mở`}
            />
            <MetricCard
              icon={<FiCheckCircle />}
              label="Hoàn tất hôm nay"
              value={formatUnit(overview.summary.ticketsCompletedToday, "vé")}
              hint={`${formatNumber(overview.summary.ticketsIssuedToday)} vé phát hành hôm nay`}
            />
            <MetricCard
              icon={<FiClock />}
              label="Thời gian xử lý TB"
              value={formatMinutes(overview.summary.averageHandleTimeInMinutes)}
              hint={`${formatNumber(overview.summary.assignedStaff)}/${formatNumber(overview.summary.totalStaff)} nhân sự đã gán quầy`}
            />
          </div>
        </section>

        <section className={styles.filters}>
          <div className={styles.filterCard}>
            <div className={styles.filterHead}>
              <div>
                <h2 className={styles.filterTitle}>Báo cáo ngày</h2>
                <div className={styles.muted}>
                  Chọn ngày để cập nhật line chart và tỷ trọng trạng thái.
                </div>
              </div>
              <span className={styles.chip}>{dailyReport.label}</span>
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label} htmlFor="daily-report-date">
                Ngày báo cáo
              </label>
              <input
                id="daily-report-date"
                className={`${styles.input} ${styles.inputAccent}`}
                type="date"
                value={dailyDate}
                onChange={(event) => setDailyDate(event.target.value)}
              />
            </div>
          </div>

          <div className={styles.filterCard}>
            <div className={styles.filterHead}>
              <div>
                <h2 className={styles.filterTitle}>Báo cáo tháng</h2>
                <div className={styles.muted}>
                  Chọn tháng để xem lưu lượng toàn kỳ theo từng ngày.
                </div>
              </div>
              <span className={styles.chip}>{monthlyReport.label}</span>
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label} htmlFor="monthly-report-date">
                Tháng báo cáo
              </label>
              <input
                id="monthly-report-date"
                className={`${styles.input} ${styles.inputAccent}`}
                type="month"
                value={monthValue}
                onChange={(event) => setMonthValue(event.target.value)}
              />
            </div>
          </div>
        </section>

        <section className={styles.gridTwo}>
          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Toàn cảnh vận hành hiện tại</h2>
                <div className={styles.muted}>
                  Phân bố trạng thái từ API overview thời gian thực.
                </div>
              </div>
              <span className={styles.chipSuccess}>
                {formatNumber(overview.summary.activeCounters)} quầy hoạt động
              </span>
            </div>
            <div className={styles.chartWrapCompact}>
              {overviewStatusData && (
                <Doughnut data={overviewStatusData} options={chartOptionsBase} />
              )}
            </div>
            <div className={styles.legendList}>
              {overviewStatusData?.labels.map((label, index) => (
                <div key={label} className={styles.legendItem}>
                  <div className={styles.legendLabel}>
                    <span
                      className={styles.dot}
                      style={{
                        background: (
                          overviewStatusData.datasets[0].backgroundColor as string[]
                        )[index],
                      }}
                    />
                    {label}
                  </div>
                  <div className={styles.legendValue}>
                    {formatNumber(
                      overviewStatusData.datasets[0].data[index] as number,
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Tải chờ theo quầy</h2>
                <div className={styles.muted}>
                  Doughnut chart thể hiện tổng chờ và đang xử lý của từng quầy.
                </div>
              </div>
              <span className={styles.chip}>
                {formatNumber(overview.summary.totalWaiting)} hồ sơ đang chờ
              </span>
            </div>
            <div className={styles.chartWrapCompact}>
              {serviceLoadData && (
                <Doughnut data={serviceLoadData} options={chartOptionsBase} />
              )}
            </div>
            <div className={styles.serviceList}>
              {overview.services.map((service, index) => (
                <div key={service.id}>
                  <div className={styles.serviceItem}>
                    <div className={styles.serviceName}>
                      <span
                        className={styles.dot}
                        style={{
                          background: CHART_COLORS[index % CHART_COLORS.length],
                        }}
                      />
                      {service.name}
                    </div>
                    <div className={styles.serviceValue}>
                      {formatNumber(service.waiting + service.processing)}
                    </div>
                  </div>
                  <div className={styles.serviceMetricRow}>
                    <span className={styles.chip}>
                      Chờ: {formatNumber(service.waiting)}
                    </span>
                    <span className={styles.chip}>
                      Xử lý: {formatNumber(service.processing)}
                    </span>
                    <span className={styles.chipSuccess}>
                      Xong hôm nay: {formatNumber(service.completedToday)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.gridTwo}>
          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Xu hướng báo cáo ngày</h2>
                <div className={styles.muted}>
                  Theo mốc thời gian trong ngày {dailyReport.label}.
                </div>
              </div>
              <span className={styles.chipSuccess}>
                TB xử lý {formatMinutes(dailyReport.summary.averageHandleTimeInMinutes)}
              </span>
            </div>
            <div className={styles.chartWrap}>
              {dailyLineData && (
                <Line
                  data={dailyLineData}
                  options={{
                    ...chartOptionsBase,
                    scales: {
                      x: {
                        grid: { display: false },
                      },
                      y: {
                        beginAtZero: true,
                        grid: { color: "rgba(15, 34, 56, 0.08)" },
                      },
                    },
                  }}
                />
              )}
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Tỷ trọng báo cáo ngày</h2>
                <div className={styles.muted}>
                  Biểu đồ tròn cho kỳ báo cáo ngày đang chọn.
                </div>
              </div>
              <span className={styles.chip}>{dailyReport.label}</span>
            </div>
            <div className={styles.chartWrapCompact}>
              <Doughnut
                data={buildStatusDoughnutData(dailyReport)}
                options={chartOptionsBase}
              />
            </div>
            <div className={styles.timelineStats}>
              <div className={styles.timelineItem}>
                <div className={styles.timelineLabel}>Vé phát hành</div>
                <div className={styles.timelineValue}>
                  {formatNumber(dailyReport.summary.issued)}
                </div>
              </div>
              <div className={styles.timelineItem}>
                <div className={styles.timelineLabel}>Vé hoàn tất</div>
                <div className={styles.timelineValue}>
                  {formatNumber(dailyReport.summary.completed)}
                </div>
              </div>
              <div className={styles.timelineItem}>
                <div className={styles.timelineLabel}>Đang chờ</div>
                <div className={styles.timelineValue}>
                  {formatNumber(dailyReport.summary.waiting)}
                </div>
              </div>
              <div className={styles.timelineItem}>
                <div className={styles.timelineLabel}>Đang xử lý</div>
                <div className={styles.timelineValue}>
                  {formatNumber(dailyReport.summary.processing)}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.gridTwo}>
          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Báo cáo tháng theo ngày</h2>
                <div className={styles.muted}>
                  Cột so sánh phát hành và hoàn tất trong tháng {monthlyReport.label}.
                </div>
              </div>
              <span className={styles.chip}>
                {formatNumber(monthlyReport.summary.issued)} vé phát hành
              </span>
            </div>
            <div className={styles.chartWrap}>
              {monthlyBarData && (
                <Bar
                  data={monthlyBarData}
                  options={{
                    ...chartOptionsBase,
                    scales: {
                      x: {
                        stacked: false,
                        grid: { display: false },
                      },
                      y: {
                        beginAtZero: true,
                        grid: { color: "rgba(15, 34, 56, 0.08)" },
                      },
                    },
                  }}
                />
              )}
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Năng lực theo quầy</h2>
                <div className={styles.muted}>
                  Ghép dữ liệu realtime với công suất phục vụ của từng quầy.
                </div>
              </div>
              <span
                className={
                  overview.summary.overloadedCounters > 0
                    ? `${styles.chip} ${styles.chipDanger}`
                    : styles.chipSuccess
                }
              >
                {overview.summary.overloadedCounters > 0
                  ? `${formatNumber(overview.summary.overloadedCounters)} quầy quá tải`
                  : "Không có quầy quá tải"}
              </span>
            </div>
            <div className={styles.counterList}>
              {overview.counters.map((counter) => {
                const monthlyCounter = monthlyReport.counters.find(
                  (item) => item.id === counter.id,
                );

                return (
                  <CounterCard
                    key={counter.id}
                    counter={counter}
                    monthlyCompleted={monthlyCounter?.completed ?? 0}
                  />
                );
              })}
            </div>
          </div>
        </section>

        {overview.alerts.length > 0 && (
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Cảnh báo hệ thống</h2>
                <div className={styles.muted}>
                  Những điểm cần chú ý từ dashboard realtime.
                </div>
              </div>
            </div>
            <div className={styles.serviceList}>
              {overview.alerts.map((alert, index) => (
                <div key={`${alert.type}-${index}`} className={styles.serviceItem}>
                  <div className={styles.serviceName}>
                    <FiAlertTriangle />
                    {alert.message}
                  </div>
                  <span className={`${styles.chip} ${styles.chipDanger}`}>
                    {alert.type}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <ServiceTable services={dailyReport.services} />
      </div>
    </div>
  );
}

function CounterCard({
  counter,
  monthlyCompleted,
}: {
  counter: DashboardCounterOverview;
  monthlyCompleted: number;
}) {
  const firstStaff = Array.isArray(counter.staff) ? counter.staff[0] : null;

  return (
    <div className={styles.panel} style={{ padding: 18 }}>
      <div className={styles.counterItem}>
        <div>
          <div className={styles.counterName}>
            <span
              className={styles.dot}
              style={{
                background: counter.isServing ? "#19c37d" : "#4f7cff",
              }}
            />
            {counter.name}
          </div>
          <div className={styles.muted}>
            {counter.code} • Quầy số {counter.number}
          </div>
        </div>
        <span
          className={
            counter.isOverloaded
              ? `${styles.chip} ${styles.chipDanger}`
              : styles.chipSuccess
          }
        >
          {counter.isOverloaded
            ? "Quá tải"
            : counter.isServing
            ? "Đang phục vụ"
            : "Sẵn sàng"}
        </span>
      </div>
      <div className={styles.counterMeta}>
        <span className={styles.chip}>Chờ: {formatNumber(counter.waiting)}</span>
        <span className={styles.chip}>
          Đã xử lý: {formatNumber(counter.processedCount)}
        </span>
        <span className={styles.chipSuccess}>
          Hoàn tất tháng: {formatNumber(monthlyCompleted)}
        </span>
        <span className={styles.chip}>
          Nhân sự: {firstStaff?.fullName ?? "Chưa gán"}
        </span>
      </div>
      {counter.currentTicket && (
        <div className={styles.serviceMetricRow}>
          <span className={styles.chipSuccess}>
            Vé hiện tại: {counter.currentTicket.ticketNumber}
          </span>
          <span className={styles.chip}>
            Khách: {counter.currentTicket.customerName}
          </span>
        </div>
      )}
    </div>
  );
}