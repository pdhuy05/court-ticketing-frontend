"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { formatServiceName, formatStaffName } from "@/lib/formatter";
import {
  StaffDisplaySnapshot,
  StaffDisplayUpdatedPayload,
  createStaffSocket,
  joinStaffDisplayRoom,
  onSocketError,
  onStaffDisplayUpdated,
} from "@/lib/staff-socket";

// ── Display mode type ──────────────────────────────────────────────────────
type DisplayMode = "service" | "queue";

interface Ticket {
  id: string;
  number: number;
  formattedNumber: string;
  displayNumber?: string;
  customerName: string;
  phone: string;
  status: "waiting" | "processing" | "completed" | "skipped" | "done";
  serviceName: string;
  serviceId?: string;
}

interface Counter {
  id: string;
  name: string;
  number: number;
  isActive: boolean;
  processedCount: number;
}

interface Service {
  id: string;
  name: string;
  code: string;
}

interface DisplayData {
  counter: Counter;
  services: Service[];
  currentTicket: Ticket | null;
  processingTickets?: Ticket[];
  waitingTickets: Ticket[];
  totalWaiting: number;
}

const formatDisplayStaffName = (name: string) => {
  const formattedName = formatStaffName(name);
  const lastDotIndex = formattedName.lastIndexOf(".");
  if (lastDotIndex <= 0 || lastDotIndex === formattedName.length - 1) {
    return formattedName;
  }
  return `${formattedName.slice(0, lastDotIndex + 1)} ${formattedName.slice(lastDotIndex + 1)}`;
};

const VIEWPORT_HEIGHT = "100dvh";
const TOP_HEADER_HEIGHT = "clamp(84px, 8.4dvh, 126px)";
const INFO_BAR_HEIGHT = "clamp(42px, 4.4dvh, 68px)";
const TABLE_HEADER_HEIGHT = "clamp(70px, 6.5dvh, 100px)";

const getTicketDisplayNumber = (ticket?: Ticket | null) =>
  ticket?.displayNumber ||
  ticket?.formattedNumber ||
  String(ticket?.number ?? "").padStart(3, "0");

const TICKER_TEXT =
  "Thứ tự xử lý phụ thuộc vào tình trạng hồ sơ — Quý vị có thể không được gọi theo thứ tự số phiếu\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0";

export default function CounterDisplayPage() {
  const params = useParams();
  const counterParam = params.counterId as string;

  const [data, setData] = useState<DisplayData | null>(null);
  const [resolvedCounterId, setResolvedCounterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayMode, setDisplayModeState] = useState<DisplayMode>("service");
  const rowElementsRef = useRef(new Map<string, HTMLDivElement>());
  const previousRowRectsRef = useRef(new Map<string, DOMRect>());

  const applySnapshot = (snapshot: StaffDisplaySnapshot) => {
    setData({
      ...snapshot,
      processingTickets: snapshot.processingTickets || [],
    });
  };

  const resolveCounterId = useCallback(async (identifier: string) => {
    const normalizedIdentifier = identifier.trim();
    if (!/^\d+$/.test(normalizedIdentifier)) return normalizedIdentifier;

    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/counters`);
    if (!response.ok) throw new Error("Failed to fetch counters");

    const result = await response.json();
    const counters = Array.isArray(result.data) ? result.data : [];
    const matchedCounter = counters.find(
      (counter: { _id?: string; number?: number }) =>
        String(counter.number) === normalizedIdentifier,
    );
    if (!matchedCounter?._id) throw new Error(`Không tìm thấy quầy số ${normalizedIdentifier}`);
    return matchedCounter._id;
  }, []);

  const fetchDisplayData = useCallback(async () => {
    try {
      setLoading(true);
      const [targetCounterId, modeRes] = await Promise.all([
        resolveCounterId(counterParam),
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/settings/display-mode`).then(r => r.json()).catch(() => ({ data: { display_mode: "service" } })),
      ]);
      const mode: DisplayMode = modeRes?.data?.display_mode === "queue" ? "queue" : "service";
      setDisplayModeState(mode);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/tickets/counters/${targetCounterId}/display`,
      );
      if (!response.ok) throw new Error("Failed to fetch display data");

      const result = await response.json();
      setResolvedCounterId(targetCounterId);
      applySnapshot(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi hiển thị không xác định");
      setResolvedCounterId(null);
    } finally {
      setLoading(false);
    }
  }, [counterParam, resolveCounterId]);

  useEffect(() => {
    if (counterParam) void fetchDisplayData();
  }, [counterParam, fetchDisplayData]);

  useEffect(() => {
    if (!resolvedCounterId) return;
    const socket = createStaffSocket();

    const unsubscribe = onStaffDisplayUpdated(socket, (payload: StaffDisplayUpdatedPayload) => {
      if (payload.counterId && payload.counterId !== resolvedCounterId) return;
      applySnapshot(payload.data);
    });
    const unsubscribeSocketError = onSocketError(socket, (payload) => {
      console.error("Display socket room error:", payload);
    });

    socket.on("connect", () => {
      joinStaffDisplayRoom(socket, resolvedCounterId);
    });
    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });
    socket.on("connect_error", (socketError) => {
      console.error("Socket connection failed:", socketError);
    });

    return () => {
      unsubscribe();
      unsubscribeSocketError();
      socket.disconnect();
    };
  }, [resolvedCounterId]);

  // Poll display mode mỗi 30 giây để nhận thay đổi admin realtime
  useEffect(() => {
    const pollMode = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/settings/display-mode`);
        const json = await res.json();
        const mode: DisplayMode = json?.data?.display_mode === "queue" ? "queue" : "service";
        setDisplayModeState(mode);
      } catch { /* silent */ }
    };
    const interval = setInterval(() => void pollMode(), 30_000);
    return () => clearInterval(interval);
  }, []);

  const processingTickets: Ticket[] = useMemo(() => {
    if (!data) return [];
    const all: Ticket[] = [];
    if (data.currentTicket) all.push(data.currentTicket);
    if (data.processingTickets) all.push(...data.processingTickets);
    return Array.from(new Map(all.map((t) => [t.id, t])).values());
  }, [data]);

  const serviceRows = useMemo(() => {
    if (!data) return [];
    return data.services.map((service) => {
      const processingTicket =
        processingTickets.find(
          (t) =>
            t.serviceId === service.id ||
            t.serviceName === service.name ||
            t.serviceName === service.code,
        ) ?? null;
      return { service, processingTicket };
    });
  }, [data, processingTickets]);

  useLayoutEffect(() => {
    const previousRects = previousRowRectsRef.current;
    const nextRects = new Map<string, DOMRect>();

    serviceRows.forEach(({ service, processingTicket }) => {
      const key = processingTicket?.id ?? `empty-${service.id}`;
      const element = rowElementsRef.current.get(key);
      if (!element) return;

      const nextRect = element.getBoundingClientRect();
      const previousRect = previousRects.get(key);
      nextRects.set(key, nextRect);

      if (previousRect) {
        const moveY = previousRect.top - nextRect.top;
        if (Math.abs(moveY) > 1) {
          element.animate(
            [{ transform: `translate3d(0, ${moveY}px, 0)` }, { transform: "translate3d(0, 0, 0)" }],
            { duration: 460, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
          );
        }
        return;
      }
      element.animate(
        [{ opacity: 0, transform: "translate3d(0, 18px, 0)" }, { opacity: 1, transform: "translate3d(0, 0, 0)" }],
        { duration: 360, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
    });

    previousRowRectsRef.current = nextRects;
  }, [serviceRows]);

  if (loading) {
    return (
      <div style={{ width: "100vw", height: VIEWPORT_HEIGHT, display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5", fontSize: 24, color: "#666" }}>
        Đang tải...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ width: "100vw", height: VIEWPORT_HEIGHT, display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5", fontSize: 24, color: "#dc3545" }}>
        {error || "Không có dữ liệu"}
      </div>
    );
  }

  // ── Queue mode layout (Document 2 — danh sách chờ) ──────────────────────
  if (displayMode === "queue") {
    const TABLE_SAFE_SPACE = "clamp(12px, 1.4dvh, 24px)";
    const TABLE_ROW_HEIGHT = `calc((${VIEWPORT_HEIGHT} - ${TOP_HEADER_HEIGHT} - ${INFO_BAR_HEIGHT} - ${TABLE_HEADER_HEIGHT} - ${TABLE_SAFE_SPACE}) / 5)`;

    const allTickets: Ticket[] = [];
    if (data.currentTicket) allTickets.push(data.currentTicket);
    if (data.processingTickets) allTickets.push(...data.processingTickets);
    allTickets.push(...data.waitingTickets);
    const queueTickets = Array.from(new Map(allTickets.map((t) => [t.id, t])).values()).slice(0, 5);

    return (
      <div className="displayPortraitViewport" style={{ width: "100vw", height: VIEWPORT_HEIGHT, overflow: "hidden", background: "#091a2d" }}>
        <div className="displayPortraitStage">
          <div className="displayPortraitCanvas" style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "linear-gradient(180deg, #fdfcf9 0%, #f8f6f1 32%, #f3f3f3 100%)", padding: 0, margin: 0, overflow: "hidden", fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", color: "#003366" }}>
            {/* Header */}
            <div style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,249,240,0.98) 100%)", padding: "clamp(8px, 1vh, 14px) clamp(18px, 2.4vw, 34px)", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "3px solid #003366", minHeight: TOP_HEADER_HEIGHT, flexShrink: 0, gap: "clamp(8px, 1vw, 14px)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "clamp(8px, 1vw, 14px)", minWidth: 0, flex: "1 1 auto" }}>
                <img src="/assets/logotoaan.png" alt="Logo" style={{ height: "clamp(46px, 5vw, 68px)", maxHeight: "clamp(40px, 4.5vw, 60px)", width: "auto", flexShrink: 0 }} />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", minWidth: 0 }}>
                  <div>
                    <div style={{ margin: 0, fontSize: "clamp(16px, 2vw, 26px)", fontWeight: 900, lineHeight: 1.2, letterSpacing: "0.5px", textTransform: "uppercase", color: "#111111" }}>TÒA ÁN</div>
                    <div style={{ margin: 0, fontSize: "clamp(16px, 2vw, 26px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "0.2px", textTransform: "uppercase", color: "#111111" }}>NHÂN DÂN KHU VỰC 1</div>
                  </div>
                  <div style={{ marginTop: "clamp(1px, 0.25vh, 4px)", fontSize: "clamp(13px, 1.3vw, 18px)", fontWeight: 500, lineHeight: 1.1, color: "#6c6c6c" }}>Thành Phố Hồ Chí Minh</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", flexShrink: 0 }}>
                <div style={{ fontSize: "clamp(18px, 2vw, 28px)", fontWeight: 800, color: "#003366", letterSpacing: "0.3px", textTransform: "uppercase", lineHeight: 1.1, background: "linear-gradient(180deg, #ffd86d 0%, #ffc233 100%)", borderRadius: 999, padding: "clamp(4px, 0.4vh, 7px) clamp(18px, 1.8vw, 28px)", boxShadow: "0 6px 16px rgba(0,0,0,0.12)", display: "inline-flex", alignItems: "center", justifyContent: "center", maxWidth: "42vw", whiteSpace: "nowrap" }}>
                  {data.counter.name}
                </div>
              </div>
            </div>

            {/* Table */}
            <div style={{ flex: 1, overflow: "hidden", background: "white", display: "flex", flexDirection: "column" }}>
              {/* Table header */}
              <div style={{ display: "grid", gridTemplateColumns: "28% 50% 22%", background: "#003366", color: "white", flexShrink: 0 }}>
                {(["Yêu Cầu", "Thông Tin", "Trạng Thái"] as const).map((label, i) => (
                  <div key={i} style={{ padding: "clamp(10px,1vh,14px) clamp(10px,1.2vw,18px)", textAlign: "center", fontWeight: 800, fontSize: "clamp(22px, 2.5vw, 36px)", letterSpacing: "0.5px", borderRight: i < 2 ? "2px solid rgba(255,255,255,0.28)" : "none", minHeight: TABLE_HEADER_HEIGHT, textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center" }}>{label}</div>
                ))}
              </div>
              {/* Rows */}
              <div style={{ flex: 1, display: "grid", gridTemplateRows: "repeat(5, 1fr)", overflow: "hidden" }}>
                {queueTickets.length > 0 ? (
                  queueTickets.map((ticket, index) => {
                    const isEvenRow = (index + 1) % 2 === 0;
                    const isProcessing = ticket.status === "processing";
                    const bgColor = isEvenRow ? "#0a3d78" : "#ffffff";
                    const textColor = isEvenRow ? "#ffffff" : "#003366";
                    const statusDisplay = isProcessing ? "Đang xử lý" : ticket.status === "completed" ? "Hoàn thành" : "Vui lòng chờ";
                    const statusColor = isProcessing ? "#4dd06d" : ticket.status === "completed" ? "#ff6b6b" : "#ffb347";
                    return (
                      <div key={ticket.id}
                        className={`ticketDisplayRow${isProcessing ? " ticketDisplayRowProcessing" : ""}`}
                        ref={(el) => { if (el) rowElementsRef.current.set(ticket.id, el); else rowElementsRef.current.delete(ticket.id); }}
                        style={{ display: "grid", gridTemplateColumns: "28% 50% 22%", background: isProcessing ? (isEvenRow ? "linear-gradient(180deg,#164b87 0%,#0a3d78 100%)" : "linear-gradient(180deg,#ffffff 0%,#f3fbf5 100%)") : bgColor, borderBottom: index === queueTickets.length - 1 ? "none" : "2px solid #d8e0ea", boxSizing: "border-box", position: "relative", overflow: "hidden", boxShadow: isProcessing ? "inset 0 0 0 8px rgba(77,208,109,0.96), 0 0 22px rgba(77,208,109,0.22)" : "none", animation: isProcessing ? "processingRowPulse 1.8s ease-in-out infinite" : "none", willChange: "transform, box-shadow" }}>
                        {/* Col Yêu cầu */}
                        <div style={{ padding: "clamp(8px,0.8vh,12px) clamp(8px,1vw,16px)", textAlign: "center", fontWeight: 900, color: textColor, fontSize: "clamp(26px, 2.6vw, 42px)", borderRight: "1px solid rgba(0,0,0,0.12)", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <div style={{ width: "100%", textAlign: "center", whiteSpace: "normal", wordBreak: "break-word", overflowWrap: "anywhere", lineHeight: 1.2 }}>{formatServiceName(ticket.serviceName)}</div>
                        </div>
                        {/* Col Thông tin */}
                        <div style={{ padding: "clamp(8px,0.8vh,12px) clamp(8px,1vw,16px)", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", borderRight: "1px solid rgba(0,0,0,0.12)", overflow: "hidden" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", gap: "clamp(2px,0.4vh,6px)", overflow: "hidden" }}>
                            <div style={{ fontSize: "clamp(64px, 7.5vw, 120px)", fontWeight: 900, letterSpacing: "1px", lineHeight: 0.96, color: textColor }}>{getTicketDisplayNumber(ticket)}</div>
                            <div style={{ fontSize: "clamp(20px, 2vw, 32px)", fontWeight: 700, lineHeight: 1.1, color: textColor, maxWidth: "100%", whiteSpace: "normal", wordBreak: "break-word", overflowWrap: "anywhere", textAlign: "center" }}>{formatDisplayStaffName(ticket.customerName)}</div>
                          </div>
                        </div>
                        {/* Col Trạng thái */}
                        <div style={{ padding: "clamp(8px,0.8vh,12px) clamp(8px,1vw,16px)", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ color: statusColor, fontWeight: 900, fontSize: "clamp(20px, 2vw, 30px)", whiteSpace: "normal", wordBreak: "break-word", overflowWrap: "anywhere", lineHeight: 1.1, textAlign: "center" }}>{statusDisplay}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: "40px 24px", textAlign: "center", color: "#999", fontSize: 26, display: "flex", alignItems: "center", justifyContent: "center" }}>Chưa có đương sự nào chờ xử lý</div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{ borderTop: "3px solid #003366", flexShrink: 0, background: "#c0392b", padding: "clamp(6px,0.8vh,10px) clamp(16px,2vw,28px)", display: "flex", alignItems: "center", justifyContent: "center", minHeight: INFO_BAR_HEIGHT }}>
              <div style={{ fontSize: "clamp(20px, 2.2vw, 30px)", fontWeight: 800, color: "white", letterSpacing: "0.5px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "10px" }}>
                <span>Còn</span>
                <span style={{ display: "inline-block", fontSize: "clamp(30px, 3.2vw, 42px)", fontWeight: 900, color: "#ffd86d", animation: "pulseScale 1.2s ease-in-out infinite" }}>{data.totalWaiting}</span>
                <span>đương sự chờ xử lý</span>
              </div>
            </div>

            <style>{`
              .displayPortraitStage { position: relative; width: 100%; height: 100%; overflow: hidden; }
              .displayPortraitCanvas { width: 100%; height: 100%; }
              @media (orientation: landscape) {
                .displayPortraitStage { position: absolute; top: 100%; left: 0; width: 100dvh; height: 100vw; transform: rotate(-90deg); transform-origin: top left; }
              }
              @keyframes processingRowPulse {
                0%, 100% { box-shadow: inset 0 0 0 8px rgba(77,208,109,0.88), 0 0 18px rgba(77,208,109,0.18); }
                50% { box-shadow: inset 0 0 0 12px rgba(77,208,109,1), 0 0 34px rgba(77,208,109,0.32); }
              }
              .ticketDisplayRow > div { position: relative; z-index: 3; }
              @property --processing-border-angle { syntax: "<angle>"; inherits: false; initial-value: 0deg; }
              .ticketDisplayRowProcessing::before {
                content: ""; position: absolute; inset: 0; z-index: 2; pointer-events: none; padding: 12px;
                background: conic-gradient(from var(--processing-border-angle), rgba(77,208,109,0.22) 0deg, rgba(77,208,109,0.22) 52deg, rgba(163,255,190,0.78) 72deg, rgba(255,255,255,0.98) 88deg, rgba(163,255,190,0.78) 104deg, rgba(77,208,109,0.22) 124deg, rgba(77,208,109,0.22) 360deg);
                filter: drop-shadow(0 0 16px rgba(77,208,109,0.95));
                -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
                -webkit-mask-composite: xor; mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask-composite: exclude;
                animation: processingBorderRun 2.8s linear infinite;
              }
              @keyframes processingBorderRun { to { --processing-border-angle: 360deg; } }
              @keyframes pulseScale { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }
            `}</style>
          </div>
        </div>
      </div>
    );
  }

  // ── Service mode layout (Document 1 — theo yêu cầu, mặc định) ────────────
  const rowCount = Math.max(serviceRows.length, 1);

  return (
    <div
      className="displayPortraitViewport"
      style={{ width: "100vw", height: VIEWPORT_HEIGHT, overflow: "hidden", background: "#091a2d" }}
    >
      <div className="displayPortraitStage">
        <div
          className="displayPortraitCanvas"
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            background: "linear-gradient(180deg, #fdfcf9 0%, #f8f6f1 32%, #f3f3f3 100%)",
            padding: 0,
            margin: 0,
            overflow: "hidden",
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            color: "#003366",
          }}
        >
          {/* ── HEADER ── */}
          <div
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,249,240,0.98) 100%)",
              padding: "clamp(8px, 1vh, 14px) clamp(18px, 2.4vw, 34px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "3px solid #003366",
              minHeight: TOP_HEADER_HEIGHT,
              flexShrink: 0,
              gap: "clamp(8px, 1vw, 14px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "clamp(8px, 1vw, 14px)", minWidth: 0, flex: "1 1 auto" }}>
              <img
                src="/assets/logotoaan.png"
                alt="Logo"
                style={{ height: "clamp(46px, 5vw, 68px)", maxHeight: "clamp(40px, 4.5vw, 60px)", width: "auto", flexShrink: 0 }}
              />
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", minWidth: 0 }}>
                <div>
                  <div style={{ margin: 0, fontSize: "clamp(16px, 2vw, 26px)", fontWeight: 900, lineHeight: 1.2, letterSpacing: "0.5px", textTransform: "uppercase", color: "#111111" }}>
                    TÒA ÁN
                  </div>
                  <div style={{ margin: 0, fontSize: "clamp(16px, 2vw, 26px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "0.2px", textTransform: "uppercase", color: "#111111" }}>
                    NHÂN DÂN KHU VỰC 1
                  </div>
                </div>
                <div style={{ marginTop: "clamp(1px, 0.25vh, 4px)", fontSize: "clamp(13px, 1.3vw, 18px)", fontWeight: 500, lineHeight: 1.1, color: "#6c6c6c" }}>
                  Thành Phố Hồ Chí Minh
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", flexShrink: 0 }}>
              <div
                style={{
                  fontSize: "clamp(18px, 2vw, 28px)",
                  fontWeight: 800,
                  color: "#003366",
                  letterSpacing: "0.3px",
                  textTransform: "uppercase",
                  lineHeight: 1.1,
                  background: "linear-gradient(180deg, #ffd86d 0%, #ffc233 100%)",
                  borderRadius: 999,
                  padding: "clamp(4px, 0.4vh, 7px) clamp(18px, 1.8vw, 28px)",
                  boxShadow: "0 6px 16px rgba(0, 0, 0, 0.12)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  maxWidth: "42vw",
                  whiteSpace: "nowrap",
                }}
              >
                {data.counter.name}
              </div>
            </div>
          </div>

          {/* ── TABLE ── */}
          <div style={{ flex: 1, overflow: "hidden", background: "white", display: "flex", flexDirection: "column" }}>
            {/* Table Header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "35% 1fr",
                background: "#003366",
                color: "white",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  padding: "clamp(10px, 1vh, 14px) clamp(10px, 1.2vw, 18px)",
                  textAlign: "center",
                  fontWeight: 800,
                  fontSize: "clamp(24px, 2.8vw, 38px)",
                  letterSpacing: "0.5px",
                  borderRight: "2px solid rgba(255,255,255,0.28)",
                  minHeight: TABLE_HEADER_HEIGHT,
                  textTransform: "uppercase",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                Yêu Cầu
              </div>
              <div
                style={{
                  padding: "clamp(10px, 1vh, 14px) clamp(10px, 1.2vw, 18px)",
                  textAlign: "center",
                  fontWeight: 800,
                  fontSize: "clamp(24px, 2.8vw, 38px)",
                  letterSpacing: "0.5px",
                  minHeight: TABLE_HEADER_HEIGHT,
                  textTransform: "uppercase",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                Thông Tin
              </div>
            </div>

            {/* Rows — 1 row per service */}
            <div
              style={{
                flex: 1,
                display: "grid",
                gridTemplateRows: `repeat(${rowCount}, 1fr)`,
                overflow: "hidden",
              }}
            >
              {serviceRows.length > 0 ? (
                serviceRows.map(({ service, processingTicket }, index) => {
                  const isEvenRow = (index + 1) % 2 === 0;
                  const isProcessing = !!processingTicket;
                  const bgColor = isEvenRow ? "#0a3d78" : "#ffffff";
                  const textColor = isEvenRow ? "#ffffff" : "#003366";
                  const rowKey = processingTicket?.id ?? `empty-${service.id}`;
                  const featuredTicket = processingTicket;

                  return (
                    <div
                      key={service.id}
                      className={`ticketDisplayRow ${isProcessing ? "ticketDisplayRowProcessing" : ""}`}
                      ref={(el) => {
                        if (el) rowElementsRef.current.set(rowKey, el);
                        else rowElementsRef.current.delete(rowKey);
                      }}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "35% 1fr",
                        background: isProcessing
                          ? isEvenRow
                            ? "linear-gradient(180deg, #164b87 0%, #0a3d78 100%)"
                            : "linear-gradient(180deg, #ffffff 0%, #f3fbf5 100%)"
                          : bgColor,
                        borderBottom: index === serviceRows.length - 1 ? "none" : "2px solid #d8e0ea",
                        boxSizing: "border-box",
                        position: "relative",
                        overflow: "hidden",
                        boxShadow: isProcessing
                          ? "inset 0 0 0 8px rgba(77, 208, 109, 0.96), 0 0 22px rgba(77, 208, 109, 0.22)"
                          : "none",
                        animation: isProcessing ? "processingRowPulse 1.8s ease-in-out infinite" : "none",
                        willChange: "transform, box-shadow",
                      }}
                    >
                      {/* Cột Yêu Cầu */}
                      <div
                        style={{
                          padding: "clamp(8px, 0.8vh, 12px) clamp(8px, 1vw, 16px)",
                          textAlign: "center",
                          fontWeight: 900,
                          color: textColor,
                          fontSize: "clamp(26px, 2.6vw, 42px)",
                          borderRight: "1px solid rgba(0,0,0,0.12)",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            textAlign: "center",
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                            overflowWrap: "anywhere",
                            lineHeight: 1.2,
                          }}
                        >
                          {formatServiceName(service.name)}
                        </div>
                      </div>

                      {/* Cột Thông Tin */}
                      <div
                        style={{
                          padding: "clamp(8px, 0.8vh, 12px) clamp(8px, 1vw, 16px)",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                        }}
                      >
                        {featuredTicket ? (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "100%",
                              height: "100%",
                              gap: "clamp(2px, 0.4vh, 6px)",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "clamp(64px, 7.5vw, 120px)",
                                fontWeight: 900,
                                letterSpacing: "1px",
                                lineHeight: 0.96,
                                color: textColor,
                              }}
                            >
                              {getTicketDisplayNumber(featuredTicket)}
                            </div>
                            <div
                              style={{
                                fontSize: "clamp(20px, 2vw, 32px)",
                                fontWeight: 700,
                                lineHeight: 1.1,
                                color: textColor,
                                maxWidth: "100%",
                                whiteSpace: "normal",
                                wordBreak: "break-word",
                                overflowWrap: "anywhere",
                                textAlign: "center",
                              }}
                            >
                              {formatDisplayStaffName(featuredTicket.customerName)}
                            </div>
                          </div>
                        ) : (
                          <div
                            style={{
                              fontSize: "clamp(18px, 1.8vw, 26px)",
                              fontWeight: 600,
                              color: isEvenRow ? "rgba(255,255,255,0.45)" : "rgba(0,51,102,0.35)",
                              textAlign: "center",
                              fontStyle: "italic",
                            }}
                          >
                            -- Chưa có lượt xử lý --
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div
                  style={{
                    padding: "40px 24px",
                    textAlign: "center",
                    color: "#999",
                    fontSize: 26,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  Chưa có dịch vụ nào được gán
                </div>
              )}
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div
            style={{
              borderTop: "3px solid #003366",
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Dòng 1: số đương sự chờ */}
            <div
              style={{
                padding: "clamp(6px, 0.8vh, 10px) clamp(16px, 2vw, 28px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: INFO_BAR_HEIGHT,
                background: "#c0392b",
              }}
            >
              <div
                style={{
                  fontSize: "clamp(20px, 2.2vw, 30px)",
                  fontWeight: 800,
                  color: "white",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <span>Còn</span>
                <span
                  style={{
                    display: "inline-block",
                    fontSize: "clamp(30px, 3.2vw, 42px)",
                    fontWeight: 900,
                    color: "#ffd86d",
                    animation: "pulseScale 1.2s ease-in-out infinite",
                  }}
                >
                  {data.totalWaiting}
                </span>
                <span>đương sự chờ xử lý</span>
              </div>
            </div>

            {/* Dòng 2: ticker thông báo */}
            <div
              style={{
                overflow: "hidden",
                whiteSpace: "nowrap",
                padding: "clamp(5px, 0.6vh, 9px) 0",
                background: "#ffc233",
                borderTop: "2px solid #e6a800",
              }}
            >
              <span
                className="tickerText"
                style={{
                  display: "inline-block",
                  fontSize: "clamp(13px, 1.3vw, 18px)",
                  fontWeight: 700,
                  color: "#003366",
                  letterSpacing: "0.3px",
                }}
              >
                {TICKER_TEXT}{TICKER_TEXT}
              </span>
            </div>
          </div>

          <style>{`
            .displayPortraitStage {
              position: relative;
              width: 100%;
              height: 100%;
              overflow: hidden;
            }
            .displayPortraitCanvas {
              width: 100%;
              height: 100%;
            }
            @media (orientation: landscape) {
              .displayPortraitStage {
                position: absolute;
                top: 100%;
                left: 0;
                width: 100dvh;
                height: 100vw;
                transform: rotate(-90deg);
                transform-origin: top left;
              }
              .displayPortraitCanvas {
                width: 100%;
                height: 100%;
              }
            }
            @keyframes processingRowPulse {
              0%, 100% { box-shadow: inset 0 0 0 8px rgba(77,208,109,0.88), 0 0 18px rgba(77,208,109,0.18); }
              50% { box-shadow: inset 0 0 0 12px rgba(77,208,109,1), 0 0 34px rgba(77,208,109,0.32); }
            }
            .ticketDisplayRow > div {
              position: relative;
              z-index: 3;
            }
            @property --processing-border-angle {
              syntax: "<angle>";
              inherits: false;
              initial-value: 0deg;
            }
            .ticketDisplayRowProcessing::before {
              content: "";
              position: absolute;
              inset: 0;
              z-index: 2;
              pointer-events: none;
              padding: 12px;
              background: conic-gradient(
                from var(--processing-border-angle),
                rgba(77,208,109,0.22) 0deg,
                rgba(77,208,109,0.22) 52deg,
                rgba(163,255,190,0.78) 72deg,
                rgba(255,255,255,0.98) 88deg,
                rgba(163,255,190,0.78) 104deg,
                rgba(77,208,109,0.22) 124deg,
                rgba(77,208,109,0.22) 360deg
              );
              filter: drop-shadow(0 0 16px rgba(77,208,109,0.95));
              -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
              -webkit-mask-composite: xor;
              mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
              mask-composite: exclude;
              animation: processingBorderRun 2.8s linear infinite;
            }
            @keyframes processingBorderRun {
              to { --processing-border-angle: 360deg; }
            }
            @keyframes pulseScale {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.15); }
            }
            @keyframes ticker {
              0%   { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .tickerText {
              animation: ticker 20s linear infinite;
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}