"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  searchTickets,
  getServices,
  getCounters,
  TicketSearchResult,
  TicketSearchPagination,
  TicketSearchFilters,
  Service,
  Counter,
} from "@/services/admin.service";
import {
  FiSearch,
  FiRefreshCw,
  FiLoader,
  FiAlertCircle,
  FiInbox,
  FiInfo,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import { hasPermission } from "@/lib/admin-permissions";
import { adminPath } from "@/lib/admin-base";
import type { AdminProfile } from "@/services/auth.service";
import styles from "./search.module.css";

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "waiting", label: "Đang chờ" },
  { value: "processing", label: "Đang xử lý" },
  { value: "completed", label: "Hoàn thành" },
  { value: "skipped", label: "Bỏ qua" },
];

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  waiting:    { label: "Đang chờ",    cls: styles.statusWaiting },
  processing: { label: "Đang xử lý",  cls: styles.statusProcessing },
  completed:  { label: "Hoàn thành",  cls: styles.statusCompleted },
  skipped:    { label: "Bỏ qua",      cls: styles.statusSkipped },
};

const fmtDuration = (seconds: number) => {
  if (!seconds) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}p ${s}s` : `${m}p`;
};

const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

type LoadState = "idle" | "loading" | "done" | "error";

const EMPTY_FILTERS: TicketSearchFilters = {
  phone: "",
  name: "",
  ticketNumber: "",
  date: "",
  dateFrom: "",
  dateTo: "",
  status: "",
  serviceId: "",
  counterId: "",
  page: 1,
  limit: 10,
};

export default function TicketSearchPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<TicketSearchFilters>({ ...EMPTY_FILTERS });
  const [tickets, setTickets] = useState<TicketSearchResult[]>([]);
  const [pagination, setPagination] = useState<TicketSearchPagination | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const [services, setServices] = useState<Service[]>([]);
  const [counters, setCounters] = useState<Counter[]>([]);
  // null = chưa kiểm tra, true = có quyền, false = bị chặn
  const accessAllowed = useMemo<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const cached = localStorage.getItem("adminUser");
      if (!cached) return true;
      const user = JSON.parse(cached) as AdminProfile;
      return hasPermission(user, "search");
    } catch {
      return true;
    }
  }, []);

  useEffect(() => {
    if (!accessAllowed) return;
    getServices().then(setServices).catch(() => {});
    getCounters().then(setCounters).catch(() => {});
  }, [accessAllowed]);

  const set = (key: keyof TicketSearchFilters, value: string | number) =>
    setFilters((prev) => ({ ...prev, [key]: value, page: key !== "page" ? 1 : (value as number) }));

  const doSearch = useCallback(
    async (overrideFilters?: TicketSearchFilters) => {
      const f = overrideFilters ?? filters;

      const hasCriteria = [
        f.phone, f.name, f.ticketNumber, f.date,
        f.dateFrom, f.dateTo, f.status, f.serviceId, f.counterId,
      ].some((v) => v && String(v).trim());

      if (!hasCriteria) {
        setErrorMsg("Vui lòng nhập ít nhất một tiêu chí tìm kiếm");
        setLoadState("error");
        return;
      }

      setLoadState("loading");
      setErrorMsg("");
      try {
        const result = await searchTickets(f);
        setTickets(result.tickets);
        setPagination(result.pagination);
        setLoadState("done");
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Lỗi tra cứu");
        setLoadState("error");
      }
    },
    [filters],
  );

  const handleReset = () => {
    setFilters({ ...EMPTY_FILTERS });
    setTickets([]);
    setPagination(null);
    setLoadState("idle");
    setErrorMsg("");
  };

  const goPage = (p: number) => {
    const next = { ...filters, page: p };
    setFilters(next);
    doSearch(next);
  };

  const isLoading = loadState === "loading";

  // Không có quyền
  if (!accessAllowed) {
    return (
      <div className={styles.page}>
        <div className={styles.resultsCard} style={{ textAlign: "center", padding: "60px 24px" }}>
          <FiAlertCircle size={48} style={{ color: "#ef4444", margin: "0 auto 16px" }} />
          <div style={{ fontSize: "18px", fontWeight: 600, color: "#111827", marginBottom: 8 }}>
            Không có quyền truy cập
          </div>
          <div style={{ color: "#6b7280", fontSize: "14px", marginBottom: 24 }}>
            Tài khoản của bạn không có quyền sử dụng tính năng Tra cứu vé.
            <br />Vui lòng liên hệ quản trị viên để được cấp quyền.
          </div>
          <button
            className={styles.resetBtn}
            onClick={() => router.push(adminPath("/admin"))}
            style={{ margin: "0 auto" }}
          >
            Quay về Thống kê
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>

      {/* Filter */}
      <div className={styles.filterCard}>
        <div className={styles.filterTitle}>Bộ lọc tìm kiếm</div>

        <div className={styles.filterGrid}>
          <div className={styles.filterField}>
            <label className={styles.label}>Số điện thoại</label>
            <input
              className={styles.input}
              placeholder="Nhập SĐT (ít nhất 4 số)"
              value={filters.phone ?? ""}
              onChange={(e) => set("phone", e.target.value)}
            />
          </div>

          <div className={styles.filterField}>
            <label className={styles.label}>Tên khách hàng</label>
            <input
              className={styles.input}
              placeholder="Nhập tên (ít nhất 2 ký tự)"
              value={filters.name ?? ""}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          <div className={styles.filterField}>
            <label className={styles.label}>Số vé</label>
            <input
              className={styles.input}
              placeholder="VD: 003, 2003"
              value={filters.ticketNumber ?? ""}
              onChange={(e) => set("ticketNumber", e.target.value)}
            />
          </div>

          <div className={styles.filterField}>
            <label className={styles.label}>Ngày cụ thể</label>
            <input
              type="date"
              className={styles.input}
              value={filters.date ?? ""}
              onChange={(e) => set("date", e.target.value)}
            />
          </div>

          <div className={styles.filterField}>
            <label className={styles.label}>Từ ngày</label>
            <input
              type="date"
              className={styles.input}
              value={filters.dateFrom ?? ""}
              onChange={(e) => set("dateFrom", e.target.value)}
            />
          </div>

          <div className={styles.filterField}>
            <label className={styles.label}>Đến ngày</label>
            <input
              type="date"
              className={styles.input}
              value={filters.dateTo ?? ""}
              onChange={(e) => set("dateTo", e.target.value)}
            />
          </div>

          <div className={styles.filterField}>
            <label className={styles.label}>Trạng thái</label>
            <select
              className={styles.select}
              value={filters.status ?? ""}
              onChange={(e) => set("status", e.target.value)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className={styles.filterField}>
            <label className={styles.label}>Dịch vụ</label>
            <select
              className={styles.select}
              value={filters.serviceId ?? ""}
              onChange={(e) => set("serviceId", e.target.value)}
            >
              <option value="">Tất cả dịch vụ</option>
              {services.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.filterField}>
            <label className={styles.label}>Phòng / Quầy</label>
            <select
              className={styles.select}
              value={filters.counterId ?? ""}
              onChange={(e) => set("counterId", e.target.value)}
            >
              <option value="">Tất cả phòng</option>
              {counters.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {loadState === "error" && (
          <div className={styles.alertError}>
            <FiAlertCircle size={15} />
            {errorMsg}
          </div>
        )}

        <div className={styles.filterActions}>
          <button className={styles.resetBtn} onClick={handleReset} disabled={isLoading}>
            <FiRefreshCw size={14} />
            Đặt lại
          </button>
          <button className={styles.searchBtn} onClick={() => doSearch()} disabled={isLoading}>
            {isLoading ? <FiLoader size={15} className={styles.spin} /> : <FiSearch size={15} />}
            {isLoading ? "Đang tìm..." : "Tìm kiếm"}
          </button>
        </div>
      </div>

      {/* Results */}
      {(loadState === "done" || isLoading) && (
        <div className={styles.resultsCard}>
          <div className={styles.resultsHeader}>
            <div className={styles.resultsTitle}>
              Kết quả tìm kiếm
              {pagination && (
                <span className={styles.badge}>{pagination.total} vé</span>
              )}
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Số vé</th>
                  <th>Ngày</th>
                  <th>Khách hàng</th>
                  <th>SĐT</th>
                  <th>Trạng thái</th>
                  <th>Dịch vụ</th>
                  <th>Phòng</th>
                  <th>Thời gian chờ</th>
                  <th>Tổng TG</th>
                  <th>Tạo lúc</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr className={styles.loadingRow}>
                    <td colSpan={10}>
                      <FiLoader size={20} className={styles.spin} />
                    </td>
                  </tr>
                )}
                {!isLoading && tickets.length === 0 && (
                  <tr>
                    <td colSpan={10}>
                      <div className={styles.emptyState}>
                        <FiInbox size={36} className={styles.emptyIcon} />
                        <div className={styles.emptyText}>Không tìm thấy vé nào</div>
                        <div className={styles.emptyHint}>Thử thay đổi tiêu chí tìm kiếm</div>
                      </div>
                    </td>
                  </tr>
                )}
                {!isLoading && tickets.map((t) => {
                  const st = STATUS_MAP[t.status] ?? { label: t.status, cls: "" };
                  return (
                    <tr key={t._id}>
                      <td><span className={styles.ticketNum}>{t.formattedNumber || t.ticketNumber}</span></td>
                      <td><span className={styles.dateCell}>{t.date}</span></td>
                      <td><span className={styles.nameCell}>{t.name || "—"}</span></td>
                      <td><span className={styles.phoneCell}>{t.phone || "—"}</span></td>
                      <td>
                        <span className={`${styles.status} ${st.cls}`}>{st.label}</span>
                      </td>
                      <td><span className={styles.serviceCell}>{t.service?.name ?? "—"}</span></td>
                      <td><span className={styles.counterCell}>{t.counter?.name ?? t.queueCounter?.name ?? "—"}</span></td>
                      <td><span className={styles.duration}>{fmtDuration(t.waitingDuration)}</span></td>
                      <td><span className={styles.duration}>{fmtDuration(t.totalDuration)}</span></td>
                      <td><span className={styles.dateCell}>{fmtDate(t.createdAt)}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className={styles.pagination}>
              <div className={styles.paginationInfo}>
                Trang {pagination.page}/{pagination.totalPages} &nbsp;·&nbsp; {pagination.total} kết quả
              </div>
              <div className={styles.paginationBtns}>
                <button
                  className={styles.pageBtn}
                  disabled={!pagination.hasPrev}
                  onClick={() => goPage(pagination.page - 1)}
                >
                  <FiChevronLeft size={14} /> Trước
                </button>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter((p) => Math.abs(p - pagination.page) <= 2)
                  .map((p) => (
                    <button
                      key={p}
                      className={`${styles.pageBtn} ${p === pagination.page ? styles.pageBtnActive : ""}`}
                      onClick={() => goPage(p)}
                    >
                      {p}
                    </button>
                  ))}
                <button
                  className={styles.pageBtn}
                  disabled={!pagination.hasNext}
                  onClick={() => goPage(pagination.page + 1)}
                >
                  Sau <FiChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {loadState === "idle" && (
        <div className={styles.resultsCard}>
          <div className={styles.emptyState}>
            <FiInfo size={32} className={styles.emptyIcon} />
            <div className={styles.emptyText}>Nhập tiêu chí và bấm Tìm kiếm</div>
            <div className={styles.emptyHint}>Hỗ trợ tìm theo SĐT, tên, số vé, ngày, trạng thái, dịch vụ, phòng</div>
          </div>
        </div>
      )}
    </div>
  );
}