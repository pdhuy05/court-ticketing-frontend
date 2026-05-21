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

  interface Ticket {
    id: string;
    number: number;
    formattedNumber: string;
    displayNumber?: string;
    customerName: string;
    phone: string;
    status: "waiting" | "processing" | "completed" | "skipped" | "done";
    serviceName: string;
  }

  interface Counter {
    id: string;
    name: string;
    number: number;
    isActive: boolean;
    processedCount: number;
  }

  interface DisplayData {
    counter: Counter;
    services: Array<{ id: string; name: string; code: string }>;
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

    return `${formattedName.slice(0, lastDotIndex + 1)} ${formattedName.slice(
      lastDotIndex + 1,
    )}`;
  };

  const VIEWPORT_HEIGHT = "100dvh";
  const TOP_HEADER_HEIGHT = "clamp(84px, 8.4dvh, 126px)";
  const INFO_BAR_HEIGHT = "clamp(42px, 4.4dvh, 68px)";
  const TABLE_HEADER_HEIGHT = "clamp(70px, 6.5dvh, 100px)";
  const TABLE_SAFE_SPACE = "clamp(12px, 1.4dvh, 24px)";
  const TABLE_ROW_HEIGHT = `calc((${VIEWPORT_HEIGHT} - ${TOP_HEADER_HEIGHT} - ${INFO_BAR_HEIGHT} - ${TABLE_HEADER_HEIGHT} - ${TABLE_SAFE_SPACE}) / 5)`;
  const getTicketDisplayNumber = (ticket?: Ticket | null) =>
    ticket?.displayNumber || ticket?.formattedNumber || String(ticket?.number ?? "").padStart(3, "0");

  export default function CounterDisplayPage() {
    const params = useParams();
    const counterParam = params.counterId as string;

    const [data, setData] = useState<DisplayData | null>(null);
    const [resolvedCounterId, setResolvedCounterId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
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

      if (!/^\d+$/.test(normalizedIdentifier)) {
        return normalizedIdentifier;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/counters`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch counters");
      }

      const result = await response.json();
      const counters = Array.isArray(result.data) ? result.data : [];
      const matchedCounter = counters.find(
        (counter: { _id?: string; number?: number }) =>
          String(counter.number) === normalizedIdentifier,
      );

      if (!matchedCounter?._id) {
        throw new Error(`Không tìm thấy quầy số ${normalizedIdentifier}`);
      }

      return matchedCounter._id;
    }, []);

    const fetchDisplayData = useCallback(async () => {
      try {
        setLoading(true);
        const targetCounterId = await resolveCounterId(counterParam);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/tickets/counters/${targetCounterId}/display`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch display data");
        }

        const result = await response.json();
        setResolvedCounterId(targetCounterId);
        applySnapshot(result.data);
        setError(null);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Lỗi hiển thị không xác định";
        setError(errorMessage);
        setResolvedCounterId(null);
        console.error("Error fetching display data:", err);
      } finally {
        setLoading(false);
      }
    }, [counterParam, resolveCounterId]);

    useEffect(() => {
      if (counterParam) {
        void fetchDisplayData();
      }
    }, [counterParam, fetchDisplayData]);

    useEffect(() => {
      if (!resolvedCounterId) {
        return;
      }

      const socket = createStaffSocket();

      const unsubscribe = onStaffDisplayUpdated(
        socket,
        (payload: StaffDisplayUpdatedPayload) => {
          if (payload.counterId && payload.counterId !== resolvedCounterId) {
            return;
          }

          applySnapshot(payload.data);
        },
      );
      const unsubscribeSocketError = onSocketError(socket, (payload) => {
        console.error("Display socket room error:", payload);
      });

      socket.on("connect", () => {
        joinStaffDisplayRoom(socket, resolvedCounterId);
        console.log("Socket connected on display screen");
      });

      socket.on("disconnect", (reason) => {
        console.log("Socket disconnected on display screen:", reason);
      });

      socket.on("connect_error", (socketError) => {
        console.error("Socket connection failed on display screen:", socketError);
      });

      return () => {
        unsubscribe();
        unsubscribeSocketError();
        socket.disconnect();
      };
    }, [resolvedCounterId]);

    const displayTickets: Ticket[] = useMemo(() => {
      if (!data) {
        return [];
      }

      const allTickets: Ticket[] = [];

      if (data.currentTicket) {
        allTickets.push(data.currentTicket);
      }

      if (data.processingTickets) {
        allTickets.push(...data.processingTickets);
      }

      allTickets.push(...data.waitingTickets);

      const uniqueTickets = Array.from(
        new Map(allTickets.map((ticket) => [ticket.id, ticket])).values(),
      );

      return uniqueTickets.slice(0, 5);
    }, [data]);

    useLayoutEffect(() => {
      const previousRects = previousRowRectsRef.current;
      const nextRects = new Map<string, DOMRect>();

      displayTickets.forEach((ticket) => {
        const element = rowElementsRef.current.get(ticket.id);

        if (!element) {
          return;
        }

        const nextRect = element.getBoundingClientRect();
        const previousRect = previousRects.get(ticket.id);
        nextRects.set(ticket.id, nextRect);

        if (previousRect) {
          const moveY = previousRect.top - nextRect.top;

          if (Math.abs(moveY) > 1) {
            element.animate(
              [
                { transform: `translate3d(0, ${moveY}px, 0)` },
                { transform: "translate3d(0, 0, 0)" },
              ],
              {
                duration: 460,
                easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              },
            );
          }

          return;
        }

        element.animate(
          [
            { opacity: 0, transform: "translate3d(0, 18px, 0)" },
            { opacity: 1, transform: "translate3d(0, 0, 0)" },
          ],
          {
            duration: 360,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          },
        );
      });

      previousRowRectsRef.current = nextRects;
    }, [displayTickets]);

    if (loading) {
      return (
        <div
          style={{
            width: "100vw",
            height: VIEWPORT_HEIGHT,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f5f5f5",
            fontSize: 24,
            color: "#666",
          }}
        >
          Đang tải...
        </div>
      );
    }

    if (error || !data) {
      return (
        <div
          style={{
            width: "100vw",
            height: VIEWPORT_HEIGHT,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f5f5f5",
            fontSize: 24,
            color: "#dc3545",
          }}
        >
          {error || "Không có dữ liệu"}
        </div>
      );
    }

    return (
      <div
        className="displayPortraitViewport"
        style={{
          width: "100vw",
          height: VIEWPORT_HEIGHT,
          overflow: "hidden",
          background: "#091a2d",
        }}
      >
        <div className="displayPortraitStage">
          <div
            className="displayPortraitCanvas"
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              background:
                "linear-gradient(180deg, #fdfcf9 0%, #f8f6f1 32%, #f3f3f3 100%)",
              padding: 0,
              margin: 0,
              overflow: "hidden",
              fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
              color: "#003366",
            }}
          >
            <div
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,249,240,0.98) 100%)",
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  gap: "clamp(8px, 1vw, 14px)",
                  minWidth: 0,
                  flex: "1 1 auto",
                }}
              >
                <img
                  src="/assets/logotoaan.png"
                  alt="Logo"
                  style={{
                    height: "clamp(46px, 5vw, 68px)",
                    maxHeight: "clamp(40px, 4.5vw, 60px)",
                    width: "auto",
                    flexShrink: 0,
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    justifyContent: "center",
                    textAlign: "left",
                    minWidth: 0,
                  }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div
                      style={{
                        margin: 0,
                        fontSize: "clamp(16px, 2vw, 26px)",
                        fontWeight: 900,
                        lineHeight: 1.2,
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                        color: "#111111",
                      }}
                    >
                      TÒA ÁN
                    </div>
                    <div
                      style={{
                        margin: 0,
                        fontSize: "clamp(16px, 2vw, 26px)",
                        fontWeight: 800,
                        lineHeight: 1.1,
                        letterSpacing: "0.2px",
                        textTransform: "uppercase",
                        color: "#111111",
                      }}
                    >
                      NHÂN DÂN KHU VỰC 1
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: "clamp(1px, 0.25vh, 4px)",
                      fontSize: "clamp(13px, 1.3vw, 18px)",
                      fontWeight: 500,
                      lineHeight: 1.1,
                      letterSpacing: "0px",
                      color: "#6c6c6c",
                    }}
                  >
                    Thành Phố Hồ Chí Minh
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  textAlign: "right",
                  gap: "clamp(4px, 0.6vh, 8px)",
                  flexShrink: 0,
                }}
              >
                {/* <h2
              style={{
                margin: 0,
                fontSize: "clamp(18px, 2.2vw, 32px)",
                fontWeight: 800,
                color: "#003366",
                letterSpacing: "0.4px",
                lineHeight: 1.02,
                textTransform: "uppercase",
              }}
            >
              Danh Sách Chờ Xử Lý
            </h2> */}
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
                    width: "fit-content",
                    minWidth: 0,
                    maxWidth: "42vw",
                    whiteSpace: "nowrap",
                  }}
                >
                  {data.counter.name}
                </div>
              </div>
            </div>

            <div
              style={{
                flex: 1,
                overflow: "hidden",
                background: "white",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "28% 50% 22%",
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
                    borderRight: "2px solid rgba(255, 255, 255, 0.28)",

                    minHeight: TABLE_HEADER_HEIGHT,
                    paddingTop: "clamp(12px, 1.2vh, 18px)",
                    paddingBottom: "clamp(12px, 1.2vh, 18px)",
                    lineHeight: 1.45,
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
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
                    borderRight: "2px solid rgba(255, 255, 255, 0.28)",
                    height: TABLE_HEADER_HEIGHT,
                    lineHeight: 1.12,
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                    textTransform: "uppercase",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  Thông Tin
                </div>
                <div
                  style={{
                    padding: "clamp(10px, 1vh, 14px) clamp(10px, 1.2vw, 18px)",
                    textAlign: "center",
                    fontWeight: 800,
                    fontSize: "clamp(22px, 2.5vw, 34px)",
                    letterSpacing: "0.5px",
                    height: TABLE_HEADER_HEIGHT,
                    lineHeight: 1.12,
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                    textTransform: "uppercase",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  Trạng Thái
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  display: "grid",
                  gridTemplateRows: "repeat(5, 1fr)",
                  overflow: "hidden",
                  background: "white",
                }}
              >
                {displayTickets.length > 0 ? (
                  displayTickets.map((ticket, index) => {
                    const isEvenRow = (index + 1) % 2 === 0;
                    const isProcessing = ticket.status === "processing";
                    const bgColor = isEvenRow ? "#0a3d78" : "#ffffff";
                    const textColor = isEvenRow ? "#ffffff" : "#003366";
                    const statusDisplay =
                      isProcessing
                        ? "Đang xử lý"
                        : ticket.status === "completed"
                          ? "Hoàn thành"
                          : "Vui lòng chờ";
                    const statusColor =
                      isProcessing
                        ? "#4dd06d"
                        : ticket.status === "completed"
                          ? "#ff6b6b"
                          : "#ffb347";

                    return (
                      <div
                        key={ticket.id}
                        className={`ticketDisplayRow ${
                          isProcessing ? "ticketDisplayRowProcessing" : ""
                        }`}
                        ref={(element) => {
                          if (element) {
                            rowElementsRef.current.set(ticket.id, element);
                            return;
                          }

                          rowElementsRef.current.delete(ticket.id);
                        }}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "28% 50% 22%",
                          background: isProcessing
                            ? isEvenRow
                              ? "linear-gradient(180deg, #164b87 0%, #0a3d78 100%)"
                              : "linear-gradient(180deg, #ffffff 0%, #f3fbf5 100%)"
                            : bgColor,
                          borderBottom:
                            index === displayTickets.length - 1
                              ? "none"
                              : "2px solid #d8e0ea",
                          // height: TABLE_ROW_HEIGHT,
                          // minHeight: TABLE_ROW_HEIGHT,
                          // maxHeight: TABLE_ROW_HEIGHT,
                          boxSizing: "border-box",
                          position: "relative",
                          overflow: "hidden",
                          boxShadow: isProcessing
                            ? "inset 0 0 0 8px rgba(77, 208, 109, 0.96), 0 0 22px rgba(77, 208, 109, 0.22)"
                            : "none",
                          animation: isProcessing
                            ? "processingRowPulse 1.8s ease-in-out infinite"
                            : "none",
                          willChange: "transform, box-shadow",
                          // flex: "0 0 auto",
                        }}
                      >
                        <div
                          style={{
                            padding: "clamp(8px, 0.8vh, 12px) clamp(8px, 1vw, 16px)",
                            textAlign: "center",
                            fontWeight: 900,
                            color: textColor,
                            fontSize: "clamp(30px, 3vw, 46px)",
                            borderRight: "1px solid rgba(0, 0, 0, 0.12)",
                            overflow: "hidden",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "100%",
                              height: "100%",
                              textAlign: "center",
                              whiteSpace: "normal",
                              wordBreak: "break-word",
                              overflowWrap: "anywhere",
                              lineHeight: 1.15,
                              maxHeight: "100%",
                              overflow: "hidden",
                            }}
                          >
                            {formatServiceName(ticket.serviceName)}
                          </div>
                        </div>

                        <div
                          style={{
                            padding: "clamp(8px, 0.8vh, 12px) clamp(8px, 1vw, 16px)",
                            textAlign: "center",
                            color: textColor,
                            fontSize: "clamp(32px, 3.5vw, 56px)",
                            borderRight: "1px solid rgba(0, 0, 0, 0.12)",
                            overflow: "hidden",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "100%",
                              height: "100%",
                              gap: "clamp(6px, 0.65vh, 10px)",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "clamp(84px, 9vw, 140px)",
                                fontWeight: 900,
                                letterSpacing: "1px",
                                lineHeight: 0.96,
                                color: textColor,
                              }}
                            >
                              {getTicketDisplayNumber(ticket)}
                            </div>
                            <div
                              style={{
                                fontSize: "clamp(24px, 2.35vw, 36px)",
                                fontWeight: 700,
                                lineHeight: 1.05,
                                maxWidth: "100%",
                                whiteSpace: "normal",
                                wordBreak: "break-word",
                                overflowWrap: "anywhere",
                              }}
                            >
                              {formatDisplayStaffName(ticket.customerName)}
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            padding: "clamp(8px, 0.8vh, 12px) clamp(8px, 1vw, 16px)",
                            textAlign: "center",
                            color: textColor,
                            fontSize: "clamp(22px, 2.2vw, 34px)",
                            overflow: "hidden",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <span
                            style={{
                              color: statusColor,
                              padding: 0,
                              borderRadius: 0,
                              fontWeight: 900,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minWidth: 0,
                              maxWidth: "100%",
                              fontSize: "clamp(24px, 2.1vw, 34px)",
                              whiteSpace: "normal",
                              wordBreak: "break-word",
                              overflowWrap: "anywhere",
                              lineHeight: 1,
                              textAlign: "center",
                              background: "transparent",
                              boxShadow: "none",
                            }}
                          >
                            {statusDisplay}
                          </span>
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
                    }}
                  >
                    Chưa có đương sự nào chờ xử lý
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                // background: "linear-gradient(180deg, #e6eef9 0%, #d8e7fb 100%)",
                padding: "clamp(6px, 0.8vh, 10px) clamp(16px, 2vw, 28px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderTop: "3px solid #003366",
                minHeight: INFO_BAR_HEIGHT,
                flexShrink: 0,
                textAlign: "center",
                background: "red",
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
            0%, 100% {
              box-shadow: inset 0 0 0 8px rgba(77, 208, 109, 0.88), 0 0 18px rgba(77, 208, 109, 0.18);
            }
            50% {
              box-shadow: inset 0 0 0 12px rgba(77, 208, 109, 1), 0 0 34px rgba(77, 208, 109, 0.32);
            }
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
              rgba(77, 208, 109, 0.22) 0deg,
              rgba(77, 208, 109, 0.22) 52deg,
              rgba(163, 255, 190, 0.78) 72deg,
              rgba(255, 255, 255, 0.98) 88deg,
              rgba(163, 255, 190, 0.78) 104deg,
              rgba(77, 208, 109, 0.22) 124deg,
              rgba(77, 208, 109, 0.22) 360deg
            );
            filter: drop-shadow(0 0 16px rgba(77, 208, 109, 0.95));
            -webkit-mask:
              linear-gradient(#000 0 0) content-box,
              linear-gradient(#000 0 0);
            -webkit-mask-composite: xor;
            mask:
              linear-gradient(#000 0 0) content-box,
              linear-gradient(#000 0 0);
            mask-composite: exclude;
            animation: processingBorderRun 2.8s linear infinite;
          }

          @keyframes processingBorderRun {
            to {
              --processing-border-angle: 360deg;
            }
          }
  @keyframes pulseScale {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.15);
    }
  }
        `}</style>
          </div>
        </div>
      </div>
    );
  }
