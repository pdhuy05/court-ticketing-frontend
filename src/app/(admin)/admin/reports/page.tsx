"use client";

import { useState } from "react";
import { exportReport } from "@/services/admin.service";
import {
  FiDownload,
  FiCalendar,
  FiFileText,
  FiBarChart2,
  FiGrid,
  FiList,
  FiLoader,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";
import styles from "./reports.module.css";

const today = () => new Date().toISOString().slice(0, 10);
const firstDayOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

const PRESETS = [
  { label: "Hôm nay", start: today(), end: today() },
  {
    label: "7 ngày qua",
    start: (() => {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      return d.toISOString().slice(0, 10);
    })(),
    end: today(),
  },
  {
    label: "Tháng này",
    start: firstDayOfMonth(),
    end: today(),
  },
  {
    label: "30 ngày qua",
    start: (() => {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      return d.toISOString().slice(0, 10);
    })(),
    end: today(),
  },
];

type Status = "idle" | "loading" | "success" | "error";

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(firstDayOfMonth());
  const [endDate, setEndDate] = useState(today());
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handlePreset = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setStatus("idle");
  };

  const handleExport = async () => {
    if (!startDate || !endDate) return;
    if (startDate > endDate) {
      setStatus("error");
      setErrorMsg("Ngày bắt đầu không được lớn hơn ngày kết thúc");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      await exportReport(startDate, endDate);
      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Xuất báo cáo thất bại");
    }
  };

  return (
    <div className={styles.page}>

      {/* Sheet info cards — full width trên cùng */}
      <div className={styles.sheetCards}>
        {[
          { icon: <FiList size={20} />, label: "Chi tiết vé", desc: "Toàn bộ vé trong kỳ, đầy đủ trạng thái và thời gian", color: "#3b82f6" },
          { icon: <FiBarChart2 size={20} />, label: "Theo ngày", desc: "Tổng vé, tỷ lệ hoàn thành, thời gian chờ trung bình mỗi ngày", color: "#10b981" },
          { icon: <FiGrid size={20} />, label: "Theo dịch vụ", desc: "So sánh hiệu suất và lượng vé từng dịch vụ", color: "#f59e0b" },
          { icon: <FiCalendar size={20} />, label: "Theo quầy", desc: "Hiệu suất xử lý của từng phòng/quầy", color: "#8b5cf6" },
        ].map((s) => (
          <div key={s.label} className={styles.sheetCard}>
            <div className={styles.sheetCardIcon} style={{ background: `${s.color}20`, color: s.color }}>
              {s.icon}
            </div>
            <div>
              <div className={styles.sheetCardLabel}>{s.label}</div>
              <div className={styles.sheetCardDesc}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Body 2 cột */}
      <div className={styles.body}>

        {/* Cột trái — form xuất */}
        <div className={styles.formCard}>
          <div className={styles.formTitle}>Chọn khoảng thời gian xuất báo cáo</div>

          <div className={styles.presets}>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                className={`${styles.presetBtn} ${startDate === p.start && endDate === p.end ? styles.presetBtnActive : ""}`}
                onClick={() => handlePreset(p.start, p.end)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className={styles.dateRow}>
            <div className={styles.dateField}>
              <label className={styles.label}>Từ ngày</label>
              <input type="date" className={styles.input} value={startDate} max={endDate || today()}
                onChange={(e) => { setStartDate(e.target.value); setStatus("idle"); }} />
            </div>
            <div className={styles.dateSep}>→</div>
            <div className={styles.dateField}>
              <label className={styles.label}>Đến ngày</label>
              <input type="date" className={styles.input} value={endDate} min={startDate} max={today()}
                onChange={(e) => { setEndDate(e.target.value); setStatus("idle"); }} />
            </div>
          </div>

          {status === "error" && (
            <div className={styles.alertError}><FiAlertCircle size={16} />{errorMsg}</div>
          )}
          {status === "success" && (
            <div className={styles.alertSuccess}><FiCheckCircle size={16} />Xuất thành công! File đang được tải về máy.</div>
          )}

          <button className={styles.exportBtn} onClick={handleExport} disabled={status === "loading"}>
            {status === "loading" ? (
              <><FiLoader className={styles.spin} size={18} />Đang xuất...</>
            ) : (
              <><FiDownload size={18} />Xuất Excel</>
            )}
          </button>
        </div>

        {/* Cột phải — thông tin */}
        <div className={styles.infoPanel}>
          <div className={styles.infoPanelCard}>
            <div className={styles.infoPanelTitle}>Kỳ đã chọn</div>
            <div className={styles.infoRow}>
              <span>Từ ngày</span>
              <span className={styles.infoRowValue}>{startDate || "—"}</span>
            </div>
            <div className={styles.infoRow}>
              <span>Đến ngày</span>
              <span className={styles.infoRowValue}>{endDate || "—"}</span>
            </div>
            <div className={styles.infoRow}>
              <span>Số ngày</span>
              <span className={styles.infoRowValue}>
                {startDate && endDate
                  ? Math.max(0, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1) + " ngày"
                  : "—"}
              </span>
            </div>
          </div>

          <div className={styles.infoPanelCard}>
            <div className={styles.infoPanelTitle}>File xuất gồm</div>
            {["Chi tiết vé", "Thống kê theo ngày", "Thống kê theo dịch vụ", "Thống kê theo quầy"].map((s) => (
              <div key={s} className={styles.infoRow}>
                <span>{s}</span>
                <span style={{ color: "#10b981", fontSize: 13, fontWeight: 600 }}>✓ Sheet</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}