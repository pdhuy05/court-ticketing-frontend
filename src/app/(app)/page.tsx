"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import * as RiIcons from "react-icons/ri";
import type { IconType } from "react-icons";
import { io, Socket } from "socket.io-client";
import AppErrorState from "@/components/AppErrorState";
import { getPublicApiBase, getSocketBaseUrl } from "@/lib/runtime-config";

interface Service {
  _id: string;
  code: string;
  name: string;
  icon: string;
  description: string;
  displayOrder: number;
  id: string;
  isActive: boolean;
  isOpen?: boolean;
  doublePrint?: boolean;
  inactiveLabel?: string;
  counters: Array<{
    _id: string;
    code: string;
    name: string;
    number: number;
  }>;
}

interface ModalInfo {
  type: "closed";
  serviceName: string;
}

export default function HomePage() {
  const [servicesList, setServicesList] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tickerText, setTickerText] = useState("");
  const [announcement, setAnnouncement] = useState("");

  const [modal, setModal] = useState<ModalInfo | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setTimeout(() => setModal(null), 300); 
  }, []);

  const openModal = useCallback(
    (info: ModalInfo) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);

      setModal(info);
      setCountdown(15);
      setModalVisible(true);

      // Countdown
      let remaining = 15;
      countdownRef.current = setInterval(() => {
        remaining -= 1;
        setCountdown(remaining);
        if (remaining <= 0) {
          if (countdownRef.current) clearInterval(countdownRef.current);
        }
      }, 1000);

      // Auto close after 15s
      timerRef.current = setTimeout(() => {
        closeModal();
      }, 15000);
    },
    [closeModal],
  );

  const loadServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/services/active");
      if (!response.ok) throw new Error("Không thể tải danh sách dịch vụ");
      const data = await response.json();
      const sorted = data.data.sort(
        (a: Service, b: Service) => a.displayOrder - b.displayOrder,
      );
      setServicesList(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch(`${getPublicApiBase()}/settings/site-config`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.success && data?.data) {
            setTickerText(data.data.tickerText || "");
            setAnnouncement(data.data.announcement || "");
          }
        }
      } catch {
        /* giữ nguyên default */
      }
    };
    void loadConfig();
  }, []);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  // Lắng nghe realtime: mỗi khi admin lưu/xóa/bật/tắt "giờ lấy vé" (schedule) hoặc
  // mở/đóng thủ công 1 dịch vụ, backend sẽ bắn socket "services-updated" —
  // ta tải lại danh sách dịch vụ ngay để khoá/mở nút mà KHÔNG cần reload trang.
  useEffect(() => {
    const url = getSocketBaseUrl();
    if (!url) return;

    const socket: Socket = io(url, {
      transports: ["websocket", "polling"],
    });

    const handleServicesUpdated = () => {
      void loadServices();
    };

    socket.on("services-updated", handleServicesUpdated);

    return () => {
      socket.off("services-updated", handleServicesUpdated);
      socket.disconnect();
    };
  }, [loadServices]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const renderIcon = (iconName: string, color: string) => {
    if (iconName.startsWith("Ri")) {
      const iconMap = RiIcons as Record<string, IconType>;
      const IconComponent = iconMap[iconName];
      if (IconComponent) {
        return <IconComponent size="clamp(34px, 5vh, 62px)" color={color} />;
      }
    }
    const faClass = iconName.startsWith("fa-")
      ? `fas ${iconName}`
      : `fas ${iconName}`;
    return <i className={faClass}></i>;
  };

  const SERVICE_COLORS = [
    { bg: "#F05769", hover: "#E84655" },
    { bg: "#41B660", hover: "#36944E" },
    { bg: "#0B6D7F", hover: "#084F5A" },
    { bg: "#8383C1", hover: "#6B6BA5" },
    { bg: "#FF8C42", hover: "#E6762F" },
    { bg: "#6BCB77", hover: "#57A863" },
    { bg: "#4D96FF", hover: "#3B7EDB" },
    { bg: "#B76EFF", hover: "#9A59DB" },
    { bg: "#FF6B6B", hover: "#E05555" },
    { bg: "#00A8A8", hover: "#008080" },
  ];

  const getCardBackground = (index: number) => {
    const colorSet = SERVICE_COLORS[index % SERVICE_COLORS.length];
    return {
      background: colorSet.bg,
      hoverBackground: colorSet.hover,
      color: "#ffffff",
    };
  };

  if (error) {
    return (
      <AppErrorState
        code="503"
        title={error || "Không thể kết nối máy chủ"}
        actionLabel={loading ? "Đang thử lại..." : "Thử lại"}
        onAction={() => void loadServices()}
        actionDisabled={loading}
      />
    );
  }

  const n = servicesList.length;
  const cols = n <= 4 ? 2 : n <= 6 ? 3 : n <= 9 ? 3 : 4;

  return (
    <>
      <div
        style={{
          height: "100%",
          width: "100%",
          maxWidth: "1800px",
          margin: "0 auto",
          padding: "0 clamp(12px, 9vw, 180px)",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <h2
          style={{
            textAlign: "center",
            margin: 0,
            paddingBottom: 30,
            fontWeight: 700,
            fontSize: "clamp(10px, 2vw, 34px)",
            lineHeight: 1.2,
          }}
        >
          QUÝ ÔNG BÀ VUI LÒNG CHỌN YÊU CẦU
        </h2>

        {loading ? (
          <p style={{ textAlign: "center" }}>Đang tải...</p>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                gridTemplateRows: "repeat(2, minmax(0, 1fr))",
                gap: "clamp(24px, 3vw, 44px)",
                flex: 1,
                minHeight: 0,
              }}
            >
              {servicesList.map((s, index) => {
                const { background, hoverBackground, color } =
                  getCardBackground(index);
                const isDisabledService = !s.isActive;
                const isClosedByHours = s.isActive && s.isOpen === false;
                const isLocked = isDisabledService || isClosedByHours;

                if (isLocked) {
                  return (
                    <div key={s._id} style={{ display: "block", height: "100%" }}>
                      <button
                        disabled={isDisabledService}
                        onClick={
                          isDisabledService
                            ? undefined
                            : () => {
                                openModal({
                                  type: "closed",
                                  serviceName: s.name,
                                });
                              }
                        }
                        style={{
                          height: "100%",
                          padding: "clamp(12px, 1.6vw, 20px)",
                          fontSize: "clamp(14px, 1.2vw, 22px)",
                          borderRadius: 10,
                          background,
                          color,
                          boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "clamp(8px, 1vh, 12px)",
                          cursor: isDisabledService ? "not-allowed" : "pointer",
                          transition: "all 0.3s ease",
                          width: "100%",
                          border: "none",
                          opacity: 0.65,
                          filter: "grayscale(20%)",
                        }}
                        onMouseOver={
                          isDisabledService
                            ? undefined
                            : (e) => {
                                e.currentTarget.style.opacity = "0.85";
                                e.currentTarget.style.transform = "translateY(-2px)";
                              }
                        }
                        onMouseOut={
                          isDisabledService
                            ? undefined
                            : (e) => {
                                e.currentTarget.style.opacity = "0.65";
                                e.currentTarget.style.transform = "translateY(0)";
                              }
                        }
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            height: "clamp(34px, 5vh, 62px)",
                            fontSize: "clamp(21px, 2.55vw, 39px)",
                            color,
                          }}
                        >
                          {renderIcon(s.icon, color)}
                        </div>
                        <div style={{ textAlign: "center", width: "100%" }}>
                          <div
                            style={{
                              fontWeight: "bold",
                              fontSize: "clamp(24px, 2.8vw, 50px)",
                              lineHeight: 1.15,
                              whiteSpace: "normal",
                              overflowWrap: "anywhere",
                            }}
                          >
                            {s.name}
                          </div>
                          <div
                            style={{
                              fontSize: "clamp(16px, 1.4vw, 24px)",
                              marginTop: 4,
                              opacity: 0.8,
                            }}
                          >
                            {s.description}
                          </div>

                          {/* Badge chỉ hiện khi dịch vụ inactive (do admin tắt) */}
                          {isDisabledService && (
                            <div
                              style={{
                                marginTop: "clamp(8px, 1vh, 14px)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 7,
                                padding: "clamp(5px, 0.7vh, 8px) clamp(12px, 1.2vw, 20px)",
                                background: "rgba(0,0,0,0.45)",
                                backdropFilter: "blur(4px)",
                                borderRadius: 99,
                                border: "1px solid rgba(248,113,113,0.5)",
                              }}
                            >
                              <span
                                style={{
                                  width: "clamp(6px, 0.6vw, 9px)",
                                  height: "clamp(6px, 0.6vw, 9px)",
                                  borderRadius: "50%",
                                  flexShrink: 0,
                                  background: "#f87171",
                                  animation: "pulse 1.5s infinite",
                                }}
                              />
                              <span
                                style={{
                                  fontSize: "clamp(11px, 0.95vw, 15px)",
                                  fontWeight: 700,
                                  letterSpacing: "0.5px",
                                  color: "#fca5a5",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {s.inactiveLabel?.trim() || "ĐANG THỬ NGHIỆM"}
                              </span>
                            </div>
                          )}
                        </div>
                      </button>
                    </div>
                  );
                }

                return (
                  <Link
                    key={s._id}
                    href={
                      s.counters.length === 1
                        ? `/service/${s._id}?counterId=${s.counters[0]._id}`
                        : `/service/${s._id}`
                    }
                    style={{ display: "block", height: "100%" }}
                  >
                    <button
                      style={{
                        height: "100%",
                        padding: "clamp(12px, 1.6vw, 20px)",
                        fontSize: "clamp(14px, 1.2vw, 22px)",
                        borderRadius: 10,
                        background,
                        color,
                        boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "clamp(8px, 1vh, 12px)",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        width: "100%",
                        border: "none",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = hoverBackground;
                        e.currentTarget.style.boxShadow =
                          "0 4px 12px rgba(0,123,255,0.3)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = background;
                        e.currentTarget.style.boxShadow =
                          "0 2px 5px rgba(0,0,0,0.1)";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: "clamp(34px, 5vh, 62px)",
                          fontSize: "clamp(21px, 2.55vw, 39px)",
                          color,
                        }}
                      >
                        {renderIcon(s.icon, color)}
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div
                          style={{
                            fontWeight: "bold",
                            fontSize: "clamp(24px, 2.8vw, 50px)",
                            lineHeight: 1.15,
                            whiteSpace: "normal",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {s.name}
                        </div>
                        <div
                          style={{
                            fontSize: "clamp(16px, 1.4vw, 24px)",
                            marginTop: 4,
                            opacity: 0.8,
                          }}
                        >
                          {s.description}
                        </div>
                      </div>
                    </button>
                  </Link>
                );
              })}
            </div>

            {announcement && (
              <p
                style={{
                  textAlign: "center",
                  paddingTop: 16,
                  fontSize: "clamp(15px, 1.2vw, 20px)",
                  fontWeight: 600,
                  color: "#dc2626",
                  flexShrink: 0,
                }}
              >
                {announcement}
              </p>
            )}
            <p
              style={{
                textAlign: "center",
                paddingTop: announcement ? 8 : 40,
                fontSize: "clamp(15px, 1.2vw, 20px)",
                fontWeight: 500,
                flexShrink: 0,
              }}
            >
              {tickerText ||
                "Thời gian làm việc từ thứ 2 đến thứ 6 hằng tuần - Sáng từ 8 giờ đến 12 giờ - Chiều từ 13 giờ 30 phút đến 16 giờ 30 phút."}
            </p>
          </div>
        )}
      </div>

      {/* Modal: hết giờ nhận lượt */}
      {modal && (
        <div
          className="closed-modal-overlay"
          onClick={closeModal}
          style={{
            opacity: modalVisible ? 1 : 0,
            pointerEvents: modalVisible ? "auto" : "none",
          }}
        >
          <div
            className="closed-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              transform: modalVisible
                ? "scale(1) translateY(0)"
                : "scale(0.97) translateY(12px)",
              opacity: modalVisible ? 1 : 0,
            }}
          >
            <div className="closed-modal-court-frame">
              <div className="closed-modal-court-inner">
                <div className="closed-modal-court-header">
                  <span className="closed-modal-court-header-line" aria-hidden="true" />
                  <span className="closed-modal-court-header-text">Thông báo</span>
                  <span className="closed-modal-court-header-line" aria-hidden="true" />
                </div>

                <div className="closed-modal-logo">
                  <img src="/assets/logotoaan.png" alt="Logo" />
                </div>

                <div className="closed-modal-service-wrap">
                  <span className="closed-modal-service-label">Dịch vụ</span>
                  <span className="closed-modal-service">{modal.serviceName}</span>
                </div>

                <h3 className="closed-modal-title">Hết giờ nhận lượt</h3>

                <div className="closed-modal-message">
                  <p className="closed-modal-message-notice">
                    Thời gian tiếp nhận hồ sơ trong ngày hôm nay đã kết thúc.
                  </p>
                  <p className="closed-modal-message-action">
                    Quý ông bà vui lòng quay lại buổi làm việc tiếp theo.
                  </p>
                  <p className="closed-modal-message-thanks">
                    Tòa án chân thành cảm ơn quý ông bà.
                  </p>
                </div>

                <button type="button" className="closed-modal-btn" onClick={closeModal}>
                  Đã hiểu
                </button>
              </div>
            </div>

            <div className="closed-modal-progress">
              <div
                className="closed-modal-progress-fill"
                style={{ width: `${(countdown / 15) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.4; }
          }

          .closed-modal-overlay {
            position: fixed;
            inset: 0;
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background: rgba(15, 23, 42, 0.42);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            transition: opacity 0.28s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .closed-modal-card {
            position: relative;
            width: min(900px, 96vw);
            background: #faf8f4;
            border-radius: 6px;
            padding: 0;
            box-shadow:
              0 10px 28px rgba(15, 39, 68, 0.18),
              0 28px 64px rgba(15, 39, 68, 0.14);
            overflow: hidden;
            transition:
              transform 0.32s cubic-bezier(0.16, 1, 0.3, 1),
              opacity 0.28s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .closed-modal-court-frame {
            position: relative;
            margin: 10px;
            border: 3px solid #1a3c6e;
            background: #fffdf8;
            box-shadow:
              inset 0 0 0 1px rgba(201, 162, 39, 0.55),
              inset 0 0 0 5px #fffdf8,
              inset 0 0 0 6px rgba(26, 60, 110, 0.18);
          }

          .closed-modal-court-frame::before,
          .closed-modal-court-frame::after {
            content: "";
            position: absolute;
            width: 18px;
            height: 18px;
            border: 2px solid #c9a227;
            pointer-events: none;
            z-index: 1;
          }

          .closed-modal-court-frame::before {
            top: 8px;
            left: 8px;
            border-right: none;
            border-bottom: none;
          }

          .closed-modal-court-frame::after {
            bottom: 8px;
            right: 8px;
            border-left: none;
            border-top: none;
          }

          .closed-modal-court-inner {
            position: relative;
            padding: clamp(22px, 3vw, 30px) clamp(24px, 3.5vw, 36px) clamp(24px, 3vh, 30px);
          }

          .closed-modal-court-inner::before,
          .closed-modal-court-inner::after {
            content: "";
            position: absolute;
            width: 18px;
            height: 18px;
            border: 2px solid #c9a227;
            pointer-events: none;
          }

          .closed-modal-court-inner::before {
            top: 8px;
            right: 8px;
            border-left: none;
            border-bottom: none;
          }

          .closed-modal-court-inner::after {
            bottom: 8px;
            left: 8px;
            border-right: none;
            border-top: none;
          }

          .closed-modal-court-header {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: clamp(10px, 1.5vw, 16px);
            margin-bottom: clamp(18px, 2.2vh, 24px);
          }

          .closed-modal-court-header-line {
            flex: 1;
            height: 1px;
            background: linear-gradient(
              90deg,
              transparent 0%,
              rgba(201, 162, 39, 0.35) 18%,
              #c9a227 50%,
              rgba(201, 162, 39, 0.35) 82%,
              transparent 100%
            );
          }

          .closed-modal-court-header-text {
            flex-shrink: 0;
            padding: 6px 18px;
            border: 1px solid rgba(201, 162, 39, 0.55);
            border-radius: 999px;
            background: linear-gradient(180deg, #1a3c6e 0%, #0f2744 100%);
            color: #e8c872;
            font-size: clamp(12px, 1vw, 14px);
            font-weight: 700;
            letter-spacing: 0.22em;
            text-transform: uppercase;
          }

          .closed-modal-logo {
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto clamp(16px, 2vh, 22px);
          }

          .closed-modal-logo img {
            height: clamp(64px, 8vw, 96px);
            width: auto;
            object-fit: contain;
          }

          .closed-modal-service-wrap {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: clamp(6px, 0.8vh, 8px);
            margin-bottom: clamp(14px, 1.8vh, 20px);
          }

          .closed-modal-service-label {
            font-size: clamp(11px, 0.95vw, 13px);
            font-weight: 600;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: #92702a;
          }

          .closed-modal-service {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            max-width: 100%;
            padding: clamp(10px, 1.2vh, 14px) clamp(22px, 3vw, 36px);
            border: 2px solid #c9a227;
            border-radius: 10px;
            background: linear-gradient(180deg, #fff6dc 0%, #fffdf5 100%);
            color: #9b1c1c;
            font-size: clamp(22px, 2.2vw, 32px);
            font-weight: 800;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            line-height: 1.2;
            box-shadow:
              0 2px 10px rgba(201, 162, 39, 0.16),
              inset 0 1px 0 rgba(255, 255, 255, 0.8);
          }

          .closed-modal-title {
            position: relative;
            margin: 0 0 clamp(14px, 1.8vh, 18px);
            padding-top: clamp(14px, 1.8vh, 18px);
            text-align: center;
            font-size: clamp(22px, 2.1vw, 30px);
            font-weight: 800;
            color: #0f2744;
            line-height: 1.25;
          }

          .closed-modal-title::before {
            content: "";
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            width: min(140px, 36%);
            height: 2px;
            background: linear-gradient(
              90deg,
              transparent 0%,
              rgba(201, 162, 39, 0.45) 20%,
              #c9a227 50%,
              rgba(201, 162, 39, 0.45) 80%,
              transparent 100%
            );
          }

          .closed-modal-message {
            text-align: center;
            margin-bottom: clamp(22px, 3vh, 28px);
            padding: clamp(18px, 2.2vh, 24px) clamp(16px, 2.5vw, 24px);
            border: 1px solid rgba(201, 162, 39, 0.32);
            border-radius: 8px;
            background:
              linear-gradient(180deg, rgba(255, 253, 248, 0.98) 0%, rgba(250, 248, 244, 0.96) 100%);
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85);
          }

          .closed-modal-message p {
            margin: 0;
            font-size: clamp(16px, 1.45vw, 21px);
            line-height: 1.68;
            color: #334155;
          }

          .closed-modal-message-lead {
            display: inline;
            font-weight: 800;
            color: #0f2744;
          }

          .closed-modal-message-notice {
            white-space: nowrap;
            font-size: clamp(15px, 1.25vw, 19px);
          }

          .closed-modal-message-action {
            margin-top: clamp(12px, 1.5vh, 16px) !important;
            padding-top: clamp(12px, 1.5vh, 16px);
            border-top: 1px dashed rgba(201, 162, 39, 0.35);
            font-weight: 600;
            color: #1e293b;
          }

          .closed-modal-message-thanks {
            margin-top: clamp(10px, 1.2vh, 14px) !important;
            font-size: clamp(15px, 1.25vw, 19px) !important;
            font-style: italic;
            color: #64748b;
          }

          .closed-modal-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            width: 100%;
            padding: clamp(14px, 1.6vh, 18px) 24px;
            border: 2px solid #1a3c6e;
            border-radius: 8px;
            background: linear-gradient(180deg, #1a3c6e 0%, #0f2744 100%);
            color: #f8fafc;
            font-size: clamp(17px, 1.4vw, 20px);
            font-weight: 700;
            cursor: pointer;
            letter-spacing: 0.03em;
            transition:
              background 0.2s ease,
              border-color 0.2s ease,
              transform 0.15s ease,
              box-shadow 0.2s ease;
            box-shadow: 0 8px 18px rgba(15, 39, 68, 0.18);
          }

          .closed-modal-btn:hover {
            background: linear-gradient(180deg, #214a85 0%, #16345c 100%);
            border-color: #c9a227;
            box-shadow: 0 10px 22px rgba(15, 39, 68, 0.22);
          }

          .closed-modal-btn:active {
            transform: scale(0.98);
          }

          .closed-modal-progress {
            height: 5px;
            background: #1a3c6e;
          }

          .closed-modal-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #c9a227, #e8c872);
            transition: width 1s linear;
          }
        `}
      </style>
    </>
  );
}