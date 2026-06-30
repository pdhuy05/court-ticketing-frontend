"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import {
  exportReport, getAuditLogs, ReportFilters, AuditLog,
} from "@/services/admin.service";
import {
  FiDownload, FiCalendar, FiBarChart2, FiGrid,
  FiList, FiLoader, FiCheckCircle, FiAlertCircle, FiClock, FiFilter,
  FiRefreshCw,
} from "react-icons/fi";
import { BsFiletypePdf, BsFiletypeCsv, BsFiletypeXlsx } from "react-icons/bs";
import styles from "./reports.module.css";

/* ── Helpers ── */
const today = () => new Date().toISOString().slice(0, 10);
const firstDayOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

/* ── Constants ── */
const PRESETS = [
  { label: "Hôm nay",   start: today(),          end: today() },
  { label: "7 ngày",    start: daysAgo(6),        end: today() },
  { label: "Tháng này", start: firstDayOfMonth(), end: today() },
  { label: "30 ngày",   start: daysAgo(29),       end: today() },
];

const REPORT_TYPES = [
  { value: "all",              label: "Toàn bộ",         icon: <FiList size={13} />,      desc: "Tất cả vé + đầy đủ sheet thống kê",    color: "#3b82f6" },
  { value: "longest_wait",     label: "Chờ lâu nhất",    icon: <FiClock size={13} />,     desc: "Top N vé có thời gian chờ lâu nhất",   color: "#ef4444" },
  { value: "longest_process",  label: "Xử lý lâu nhất",  icon: <FiBarChart2 size={13} />, desc: "Top N vé có thời gian xử lý lâu nhất", color: "#f97316" },
  { value: "by_status",        label: "Theo trạng thái", icon: <FiFilter size={13} />,    desc: "Lọc vé theo trạng thái cụ thể",        color: "#8b5cf6" },
  { value: "by_service",       label: "Theo dịch vụ",    icon: <FiGrid size={13} />,      desc: "Lọc vé theo dịch vụ",                  color: "#10b981" },
  { value: "by_counter",       label: "Theo quầy",       icon: <FiCalendar size={13} />,  desc: "Lọc vé theo phòng/quầy",               color: "#f59e0b" },
] as const;

const FORMATS = [
  { value: "excel", label: "Excel", ext: ".xlsx", icon: <BsFiletypeXlsx size={16} />, color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
  { value: "pdf",   label: "PDF",   ext: ".pdf",  icon: <BsFiletypePdf size={16} />,  color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  { value: "csv",   label: "CSV",   ext: ".csv",  icon: <BsFiletypeCsv size={16} />,  color: "#0369a1", bg: "#f0f9ff", border: "#bae6fd" },
] as const;

const STATUS_OPTIONS = [
  { value: "",            label: "Tất cả trạng thái" },
  { value: "COMPLETED",  label: "Hoàn thành" },
  { value: "WAITING",    label: "Đang chờ" },
  { value: "PROCESSING", label: "Đang xử lý" },
  { value: "SKIPPED",    label: "Bỏ qua" },
];

const INCLUDES = [
  "Chi tiết vé",
  "Thống kê theo ngày",
  "Thống kê theo dịch vụ",
  "Thống kê theo quầy",
];

const HISTORY_FORMAT_META: Record<string, { label: string; icon: ReactNode; color: string }> = {
  excel: { label: "Excel", icon: <BsFiletypeXlsx size={13} />, color: "#16a34a" },
  pdf:   { label: "PDF",   icon: <BsFiletypePdf size={13} />,  color: "#dc2626" },
  csv:   { label: "CSV",   icon: <BsFiletypeCsv size={13} />,  color: "#0369a1" },
};

const TYPE_LABELS: Record<string, string> = {
  all:              "Toàn bộ",
  longest_wait:     "Chờ lâu nhất",
  longest_process:  "Xử lý lâu nhất",
  by_status:        "Theo trạng thái",
  by_service:       "Theo dịch vụ",
  by_counter:       "Theo quầy",
};

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
};

type ExportStatus = "idle" | "loading" | "success" | "error";
type FormatValue  = "excel" | "csv" | "pdf";

/* ══════════════════════════════════════════════════════ */
export default function ReportsPage() {
  const [startDate,    setStartDate]    = useState(firstDayOfMonth());
  const [endDate,      setEndDate]      = useState(today());
  const [reportType,   setReportType]   = useState("all");
  const [format,       setFormat]       = useState<FormatValue>("excel");
  const [exportStatus, setExportStatus] = useState<ExportStatus>("idle");
  const [errorMsg,     setErrorMsg]     = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [topN,         setTopN]         = useState(20);

  /* History state */
  const [history,        setHistory]        = useState<AuditLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError,   setHistoryError]   = useState("");

  /* Derived */
  const selType   = REPORT_TYPES.find((t) => t.value === reportType)!;
  const selFormat = FORMATS.find((f) => f.value === format)!;
  const showTopN         = reportType === "longest_wait" || reportType === "longest_process";
  const showStatusFilter = reportType === "by_status";
  const dayCount = startDate && endDate
    ? Math.max(0, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000) + 1)
    : 0;

  const applyPreset = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setExportStatus("idle");
  };

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const result = await getAuditLogs({ action: "REPORT_EXPORT", limit: 6, page: 1 });
      setHistory(result.logs);
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : "Không tải được lịch sử");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleExport = async () => {
    if (!startDate || !endDate) return;
    if (startDate > endDate) {
      setExportStatus("error");
      setErrorMsg("Ngày bắt đầu không được lớn hơn ngày kết thúc");
      return;
    }
    setExportStatus("loading");
    setErrorMsg("");
    try {
      const filters: ReportFilters = {
        startDate, endDate, format,
        reportType: reportType as ReportFilters["reportType"],
        topN,
        status: filterStatus || undefined,
      };
      await exportReport(filters);
      setExportStatus("success");
      setTimeout(() => setExportStatus("idle"), 3000);
      fetchHistory();
    } catch (err: unknown) {
      setExportStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Xuất báo cáo thất bại");
    }
  };

  /* ── Render ── */
  return (
    <div className={styles.page}>

      {/* ── Top bar ── */}
      <div className={styles.topbar}>
        <span className={styles.pageTitle}>Xuất báo cáo</span>
        <div className={styles.typePills}>
          {REPORT_TYPES.map((t) => {
            const active = reportType === t.value;
            return (
              <button
                key={t.value}
                className={`${styles.typePill} ${active ? styles.typePillActive : ""}`}
                style={active ? { borderColor: t.color, background: `${t.color}14`, color: t.color } : {}}
                onClick={() => { setReportType(t.value); setExportStatus("idle"); }}
              >
                <span className={styles.pillDot} style={{ background: t.color }} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main 2-col ── */}
      <div className={styles.main}>

        {/* ════ Left panel ════ */}
        <div className={styles.left}>

          {/* Description strip */}
          <div className={styles.descStrip}>
            <span className={styles.descDot} style={{ background: selType.color }} />
            {selType.desc}
          </div>

          {/* ── Row 1: Presets + Date range ── */}
          <div className={styles.row2}>

            <div className={styles.block}>
              <div className={styles.fieldLabel}>Thời gian nhanh</div>
              <div className={styles.chipRow}>
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    className={`${styles.chip} ${startDate === p.start && endDate === p.end ? styles.chipActive : ""}`}
                    onClick={() => applyPreset(p.start, p.end)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.block}>
              <div className={styles.fieldLabel}>Chọn ngày</div>
              <div className={styles.dateRow}>
                <div className={styles.dateField}>
                  <label>Từ ngày</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={startDate}
                    max={endDate || today()}
                    onChange={(e) => { setStartDate(e.target.value); setExportStatus("idle"); }}
                  />
                </div>
                <div className={styles.dateSep}>→</div>
                <div className={styles.dateField}>
                  <label>Đến ngày</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={endDate}
                    min={startDate}
                    max={today()}
                    onChange={(e) => { setEndDate(e.target.value); setExportStatus("idle"); }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.divider} />

          {/* ── Row 2: Conditional filter + Format ── */}
          <div className={styles.row2}>

            {/* Conditional filter */}
            <div className={styles.block}>
              {showTopN && (
                <>
                  <div className={styles.fieldLabel}>Số lượng top N</div>
                  <div className={styles.topNRow}>
                    {[10, 20, 50, 100].map((n) => (
                      <button
                        key={n}
                        className={`${styles.chip} ${topN === n ? styles.chipActive : ""}`}
                        onClick={() => setTopN(n)}
                      >
                        Top {n}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {showStatusFilter && (
                <>
                  <div className={styles.fieldLabel}>Trạng thái vé</div>
                  <select
                    className={styles.select}
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </>
              )}

              {!showTopN && !showStatusFilter && (
                <>
                  <div className={styles.fieldLabel} style={{ opacity: 0 }}>—</div>
                  <div className={styles.noFilter}>Không có bộ lọc bổ sung</div>
                </>
              )}
            </div>

            {/* Format selector */}
            <div className={styles.block}>
              <div className={styles.fieldLabel}>Định dạng xuất file</div>
              <div className={styles.row3}>
                {FORMATS.map((f) => {
                  const active = format === f.value;
                  return (
                    <button
                      key={f.value}
                      className={`${styles.formatBtn} ${active ? styles.formatBtnActive : ""}`}
                      style={active ? { borderColor: f.color, background: f.bg, color: f.color } : {}}
                      onClick={() => setFormat(f.value as FormatValue)}
                    >
                      <span style={{ color: active ? f.color : "#94a3b8" }}>{f.icon}</span>
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Alert */}
          {(exportStatus === "error" || exportStatus === "success") && (
            <div className={styles.alertWrap}>
              {exportStatus === "error" && (
                <div className={styles.alertError}>
                  <FiAlertCircle size={14} /> {errorMsg}
                </div>
              )}
              {exportStatus === "success" && (
                <div className={styles.alertSuccess}>
                  <FiCheckCircle size={14} /> Xuất thành công! File đang tải về.
                </div>
              )}
            </div>
          )}

          {/* ── Lịch sử xuất báo cáo (lấp khoảng trống) ── */}
          <div className={styles.historyWrap}>
            <div className={styles.historyHeader}>
              <span className={styles.historyTitle}>Lịch sử xuất gần đây</span>
              <button
                className={styles.historyRefreshBtn}
                onClick={fetchHistory}
                disabled={historyLoading}
                title="Tải lại"
              >
                <FiRefreshCw size={12} className={historyLoading ? styles.spin : ""} />
              </button>
            </div>

            <div className={styles.historyBody}>
              {historyLoading && (
                <div className={styles.historySkeletonWrap}>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className={styles.historySkeleton} />
                  ))}
                </div>
              )}

              {!historyLoading && historyError && (
                <div className={styles.historyEmpty}>
                  <FiAlertCircle size={16} color="#ef4444" />
                  <span style={{ color: "#ef4444" }}>{historyError}</span>
                </div>
              )}

              {!historyLoading && !historyError && history.length === 0 && (
                <div className={styles.historyEmpty}>
                  <FiDownload size={18} color="#cbd5e1" />
                  <span>Chưa có lần xuất nào</span>
                </div>
              )}

              {!historyLoading && !historyError && history.map((log) => {
                const detail = log.detail as Record<string, unknown> | null;
                const fmt    = String(detail?.format ?? "excel");
                const type   = String(detail?.reportType ?? "all");
                const from   = String(detail?.startDate ?? "");
                const to     = String(detail?.endDate ?? "");
                const meta   = HISTORY_FORMAT_META[fmt] ?? HISTORY_FORMAT_META.excel;

                return (
                  <div key={log._id} className={styles.historyRow}>
                    <div className={styles.historyRowIcon} style={{ color: meta.color }}>
                      {meta.icon}
                    </div>
                    <div className={styles.historyRowBody}>
                      <div className={styles.historyRowTop}>
                        <span className={styles.historyRowType}>
                          {TYPE_LABELS[type] ?? type}
                        </span>
                        <span className={styles.historyRowFmt} style={{ color: meta.color }}>
                          {meta.label}
                        </span>
                      </div>
                      <div className={styles.historyRowDate}>{from} → {to}</div>
                    </div>
                    <div className={styles.historyRowMeta}>
                      <span className={styles.historyRowAgo} title={formatDateTime(log.createdAt)}>
                        {timeAgo(log.createdAt)}
                      </span>
                      <span
                        className={styles.historyRowStatus}
                        style={{ color: log.status === "success" ? "#10b981" : "#ef4444" }}
                      >
                        {log.status === "success" ? "✓" : "✗"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* ════ Right panel ════ */}
        <div className={styles.right}>

          {/* Summary */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Tóm tắt lựa chọn</div>

            <div className={styles.infoRow}>
              <span className={styles.infoKey}>Loại báo cáo</span>
              <span className={styles.infoVal} style={{ color: selType.color }}>{selType.label}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoKey}>Từ ngày</span>
              <span className={styles.infoVal}>{startDate || "—"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoKey}>Đến ngày</span>
              <span className={styles.infoVal}>{endDate || "—"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoKey}>Số ngày</span>
              <span className={styles.infoVal}>{dayCount} ngày</span>
            </div>
            {showTopN && (
              <div className={styles.infoRow}>
                <span className={styles.infoKey}>Lấy top</span>
                <span className={styles.infoVal}>{topN} vé</span>
              </div>
            )}
            {showStatusFilter && filterStatus && (
              <div className={styles.infoRow}>
                <span className={styles.infoKey}>Trạng thái</span>
                <span className={styles.infoVal}>
                  {STATUS_OPTIONS.find((s) => s.value === filterStatus)?.label}
                </span>
              </div>
            )}
            <div className={styles.infoRow}>
              <span className={styles.infoKey}>Định dạng</span>
              <span className={styles.infoVal} style={{ color: selFormat.color }}>
                {selFormat.label} ({selFormat.ext})
              </span>
            </div>
          </div>

          {/* Includes */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Báo cáo toàn bộ gồm</div>
            {INCLUDES.map((s) => (
              <div key={s} className={styles.inclRow}>
                <span className={styles.inclLabel}>{s}</span>
                <span
                  className={styles.inclCheck}
                  style={{ color: reportType === "all" ? "#10b981" : "#cbd5e1" }}
                >
                  {reportType === "all" ? "✓" : "—"}
                </span>
              </div>
            ))}
          </div>

          {/* Export button */}
          <button
            className={styles.exportBtn}
            style={{ background: selFormat.color }}
            onClick={handleExport}
            disabled={exportStatus === "loading"}
          >
            {exportStatus === "loading" ? (
              <><FiLoader className={styles.spin} size={15} /> Đang xuất...</>
            ) : (
              <><FiDownload size={15} /> Xuất {selFormat.label} ({selFormat.ext})</>
            )}
          </button>

        </div>
      </div>
    </div>
  );
}