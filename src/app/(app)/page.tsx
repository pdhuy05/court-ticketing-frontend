"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import * as RiIcons from "react-icons/ri";
import type { IconType } from "react-icons";

interface Service {
  _id: string;
  code: string;
  name: string;
  icon: string;
  description: string;
  displayOrder: number;
  id: string;
  isActive: boolean;
  doublePrint?: boolean;
  inactiveLabel?: string;
  counters: Array<{
    _id: string;
    code: string;
    name: string;
    number: number;
  }>;
}

export default function HomePage() {
  const [servicesList, setServicesList] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadServices = async () => {
      try {
        const response = await fetch("/api/services/active");
        if (!response.ok) {
          throw new Error("Failed to fetch services");
        }
        const data = await response.json();
        const sorted = data.data.sort(
          (a: Service, b: Service) => a.displayOrder - b.displayOrder,
        );
        setServicesList(sorted);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };
    loadServices();
  }, []);

  const renderIcon = (iconName: string, color: string) => {
    if (iconName.startsWith("Ri")) {
      const iconMap = RiIcons as Record<string, IconType>;
      const IconComponent = iconMap[iconName];
      if (IconComponent) {
        return <IconComponent size="clamp(34px, 5vh, 62px)" color={color} />;
      }
    }
    const faClass = iconName.startsWith("fa-") ? `fas ${iconName}` : `fas ${iconName}`;
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
      <div style={{ padding: 20, color: "red" }}>
        <p>Error: {error}</p>
      </div>
    );
  }

  // Tính số cột dựa trên số lượng service
  const n = servicesList.length;
  const cols = n <= 4 ? 2 : n <= 6 ? 3 : n <= 9 ? 3 : 4;

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        maxWidth: "1800px",
        margin: "0 auto",
        // ← Chỉ sửa chỗ này: clamp bắt đầu từ 12px thay vì 90px
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
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <div
            style={{
              display: "grid",
              // ← Chỉ sửa chỗ này: dùng cols thay vì hardcode 2
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              gridTemplateRows: "repeat(2, minmax(0, 1fr))",
              gap: "clamp(24px, 3vw, 44px)",
              flex: 1,
              minHeight: 0,
            }}
          >
            {servicesList.map((s, index) => {
              const { background, hoverBackground, color } = getCardBackground(index);
              const isInactive = !s.isActive;

              if (isInactive) {
                return (
                  <div
                    key={s._id}
                    style={{ display: "block", height: "100%" }}
                  >
                    <button
                      disabled
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
                        cursor: "not-allowed",
                        transition: "all 0.3s ease",
                        width: "100%",
                        border: "none",
                        opacity: 0.7,
                        filter: "grayscale(15%)",
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
                          opacity: 0.6,
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
                            opacity: 0.6,
                          }}
                        >
                          {s.name}
                        </div>
                        <div style={{ fontSize: "clamp(16px, 1.4vw, 24px)", marginTop: 4, opacity: 0.5 }}>
                          {s.description}
                        </div>
                        <div
                          style={{
                            marginTop: 14,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px 20px",
                            background: "rgba(0,0,0,0.75)",
                            backdropFilter: "blur(4px)",
                            borderRadius: 40,
                            fontSize: "clamp(12px, 1.2vw, 15px)",
                            fontWeight: 700,
                            color: "#f87171",
                            letterSpacing: "0.5px",
                            border: "1px solid rgba(248,113,113,0.3)",
                          }}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: "#f87171",
                              animation: "pulse 1.5s infinite",
                            }}
                          />
                          {s.inactiveLabel?.trim() || "ĐANG THỬ NGHIỆM"}
                        </div>
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
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,123,255,0.3)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = background;
                      e.currentTarget.style.boxShadow = "0 2px 5px rgba(0,0,0,0.1)";
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
                      <div style={{ fontSize: "clamp(16px, 1.4vw, 24px)", marginTop: 4, opacity: 0.8 }}>
                        {s.description}
                      </div>
                    </div>
                  </button>
                </Link>
              );
            })}
          </div>
          <p
            style={{
              textAlign: "center",
              paddingTop: 40,
              fontSize: "clamp(15px, 1.2vw, 20px)",
              fontWeight: 500,
              flexShrink: 0,
            }}
          >
            Thời gian làm việc từ thứ 2 đến thứ 6 hằng tuần - Sáng từ 8 giờ đến 12 giờ - Chiều từ 13 giờ 30 phút đến 16 giờ 30 phút.
          </p>
        </div>
      )}

      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.4; }
          }
        `}
      </style>
    </div>
  );
}