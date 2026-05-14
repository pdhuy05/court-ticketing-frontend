"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RiVolumeMuteLine, RiVolumeUpLine } from "react-icons/ri";
import { Ticket, Counter, Service } from "@/types/queue";
import Toast from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";
import {
  backTicketToWaitingApi,
  getStaffDisplay,
  callTicketById,
  completeTicketApi,
  skipTicketApi,
  AUTH_EXPIRED_ERROR,
  getRecallList,
  recallTicket,
  recallProcessingTicketApi,
  getTtsEnabledStatus,
} from "@/services/ticket.service";
import {
  StaffDisplayUpdatedPayload,
  createStaffSocket,
  joinCounterRoom,
  onJoinedCounterRoom,
  onSocketError,
  onStaffDisplayUpdated,
} from "@/lib/staff-socket";
import { useNewTicketAlerts } from "@/hooks/useNewTicketAlerts";
import type { NewTicketSocketPayload } from "@/types/new-ticket";
import NotificationPermissionButton from "@/components/NotificationPermissionButton";

const getTicketDisplayNumber = (ticket?: Ticket | null) =>
  ticket?.displayNumber ||
  ticket?.formattedNumber ||
  String(ticket?.number ?? "").padStart(3, "0");

const buildTicketCallConfirmMessage = (
  ticket: Ticket,
  actionLabel: "gọi" | "gọi lại",
) =>
  [
    `Xác nhận ${actionLabel} người này?`,
    "",
    `Số phiếu: ${getTicketDisplayNumber(ticket)}`,
    `Đương sự: ${ticket.customerName || "Chưa có thông tin"}`,
    `Quầy: ${ticket.serviceName || "Chưa có thông tin"}`,
  ].join("\n");

export default function StaffCounterPage() {
  const params = useParams();
  const router = useRouter();
  const counterId = params.counterId as string;
  const [hovered, setHovered] = useState<string | null>(null);
  const [, setCounter] = useState<Counter | null>(null);
  const [staffName, setStaffName] = useState<string>("");
  const [staffId, setStaffId] = useState<string>("");
  const [restricted, setRestricted] = useState<boolean>(false);
  const [assignedServices, setAssignedServices] = useState<Service[]>([]);
  const [waitingTickets, setWaitingTickets] = useState<Ticket[]>([]);
  const [recallTickets, setRecallTickets] = useState<Ticket[]>([]);
  const [activeTab, setActiveTab] = useState<"waiting" | "recall">("waiting");
  const [totalWaiting, setTotalWaiting] = useState(0);
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [toast, setToast] = useState<{
    isOpen: boolean;
    message: string;
    type: "success" | "error" | "warning" | "info";
  }>({
    isOpen: false,
    message: "",
    type: "info",
  });
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const showToast = (
    message: string,
    type: "success" | "error" | "warning" | "info" = "info",
  ) => {
    setToast({ isOpen: true, message, type });
  };

  const handleSessionExpired = useCallback(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("staffToken");
      sessionStorage.removeItem("staffUser");
      sessionStorage.removeItem("staffName");
    }
    router.push("/staff/login?reason=session_expired");
  }, [router]);

  const applySnapshot = (snapshot: {
    counter: Counter;
    services: Service[];
    currentTicket: Ticket | null;
    waitingTickets: Ticket[];
    totalWaiting?: number;
    staffName?: string;
  }) => {
    setCounter(snapshot.counter);
    setCurrentTicket(snapshot.currentTicket);
    setWaitingTickets(snapshot.waitingTickets);
    setTotalWaiting(snapshot.totalWaiting ?? snapshot.waitingTickets.length);
    if (snapshot.staffName) {
      setStaffName(snapshot.staffName);
    }
  };

  const applyAdditionalInfo = (info: {
    staffId?: string;
    serviceRestrictionConfigured?: boolean;
    assignedServices?: Service[];
  }) => {
    if (info.staffId) setStaffId(info.staffId);
    if (info.serviceRestrictionConfigured !== undefined) {
      setRestricted(info.serviceRestrictionConfigured);
    }
    if (info.assignedServices) {
      setAssignedServices(info.assignedServices);
    }
  };

  const handleRecallListRefresh = useCallback(async () => {
    try {
      const res = await getRecallList();
      if (res.success) {
        setRecallTickets(res.data || []);
      }
    } catch (err) {
      console.error("Failed to refresh recall list:", err);
    }
  }, []);

  const onNewTicketAlert = useNewTicketAlerts();

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? sessionStorage.getItem("staffToken") : null;
    if (!token) {
      router.push("/staff/login");
      return;
    }

    const loadInitialData = async () => {
      try {
        setLoading(true);
        const response = await getStaffDisplay();
        if (response.success) {
          const {
            counter,
            services,
            currentTicket,
            waitingTickets,
            totalWaiting,
            staffName,
            staffId,
            serviceRestrictionConfigured,
            assignedServices,
          } = response.data;

          if (counter.id !== counterId) {
            sessionStorage.removeItem("staffToken");
            router.push("/staff/login?error=unauthorized");
            return;
          }

          applySnapshot({
            counter,
            services,
            currentTicket,
            waitingTickets,
            totalWaiting,
            staffName,
          });
          applyAdditionalInfo({
            staffId,
            serviceRestrictionConfigured,
            assignedServices,
          });
          setAuthenticated(true);
          void handleRecallListRefresh();
        } else {
          sessionStorage.removeItem("staffToken");
          router.push("/staff/login?error=session_expired");
        }
      } catch (error) {
        console.error("Failed to fetch staff display data:", error);
        if (error instanceof Error && error.message === AUTH_EXPIRED_ERROR) {
          handleSessionExpired();
          return;
        }
        sessionStorage.removeItem("staffToken");
        router.push("/staff/login?error=fetch_failed");
      } finally {
        setLoading(false);
      }
    };

    void loadInitialData();
  }, [counterId, handleRecallListRefresh, handleSessionExpired, router]);

  useEffect(() => {
    if (!authenticated) {
      return;
    }

    const socket = createStaffSocket();

    const unsubscribe = onStaffDisplayUpdated(
      socket,
      (payload: StaffDisplayUpdatedPayload) => {
        if (payload.staffId !== staffId) {
          return;
        }

        applySnapshot({
          counter: payload.data.counter as Counter,
          services: payload.data.services as Service[],
          currentTicket: payload.data.currentTicket as Ticket | null,
          waitingTickets: payload.data.waitingTickets as Ticket[],
          totalWaiting: payload.data.totalWaiting,
        });

        if (payload.data.recallTickets) {
          setRecallTickets(payload.data.recallTickets as Ticket[]);
        }
      },
    );

    const unsubscribeJoined = onJoinedCounterRoom(socket, (payload) => {
      console.log("Joined counter room on staff screen:", payload);
    });

    const unsubscribeSocketError = onSocketError(socket, (payload) => {
      console.error("Staff socket room error:", payload);
    });
    socket.on("connect", () => {
      joinCounterRoom(socket, counterId, staffId);
      console.log("Socket connected on staff screen");
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected on staff screen:", reason);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection failed on staff screen:", error);
    });

    const handleNewTicket = (payload: NewTicketSocketPayload) => {
      onNewTicketAlert(payload);
    };
    socket.on("new_ticket", handleNewTicket);

    return () => {
      socket.off("new_ticket", handleNewTicket);
      unsubscribe();
      unsubscribeJoined();
      unsubscribeSocketError();
      socket.disconnect();
    };
  }, [authenticated, counterId, staffId, onNewTicketAlert]);

  useEffect(() => {
    if (!authenticated) {
      return;
    }

    let active = true;

    const syncTtsStatus = async () => {
      try {
        const enabled = await getTtsEnabledStatus();
        if (active) {
          setTtsEnabled(enabled);
        }
      } catch (error) {
        console.error("Failed to load TTS status:", error);
        if (active) {
          setTtsEnabled(false);
        }
      }
    };

    void syncTtsStatus();
    const intervalId = window.setInterval(() => {
      void syncTtsStatus();
    }, 3000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [authenticated]);

  const handleCallNext = async () => {
    if (currentTicket) {
      try {
        const response = await recallProcessingTicketApi(currentTicket.id);
        if (response.success) {
          showToast("Đang gọi lại!", "info");
        } else {
          showToast(response.message || "Không thể gọi lại vé!", "error");
        }
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === AUTH_EXPIRED_ERROR) {
            handleSessionExpired();
            return;
          }
          showToast(error.message, "error");
          return;
        }
        showToast("Lỗi hệ thống khi gọi lại vé!", "error");
      }
      return;
    }

    try {
      if (activeTab === "recall") {
        const nextRecallTicket = recallTickets[0];
        if (!nextRecallTicket) {
          showToast("Không có vé nào trong danh sách bỏ qua!", "warning");
          return;
        }

        const response = await recallTicket(
          nextRecallTicket.id || (nextRecallTicket as Ticket & { _id?: string })._id || "",
        );
        if (response.success) {
          showToast("Đang gọi lại!", "success");
          void handleRecallListRefresh();
        } else {
          showToast(response.message || "Không thể gọi lại vé!", "error");
        }
        return;
      }

      const nextWaitingTicket = waitingTickets[0];
      if (!nextWaitingTicket) {
        showToast("Không có vé nào trong hàng chờ!", "warning");
        return;
      }

      const response = await callTicketById(nextWaitingTicket.id, counterId);
      if (response.success) {
        showToast(response.message || "Đang gọi vé!", "success");
      } else {
        showToast(response.message || "Không thể gọi vé!", "error");
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === AUTH_EXPIRED_ERROR) {
          handleSessionExpired();
          return;
        }
        showToast(error.message, "error");
        return;
      }
      console.error("Call ticket error:", error);
      showToast(
        activeTab === "recall"
          ? "Lỗi hệ thống khi đang gọi lại vé!"
          : "Lỗi hệ thống khi đang gọi vé!",
        "error",
      );
    }
  };

  const handleCallWaitingTicket = async (ticketId: string) => {
    try {
      const response = await callTicketById(ticketId, counterId);
      if (response.success) {
        showToast(response.message || "Đang gọi vé!", "success");
      } else {
        showToast(response.message || "Không thể gọi vé!", "error");
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === AUTH_EXPIRED_ERROR) {
          handleSessionExpired();
          return;
        }
        showToast(error.message, "error");
        return;
      }
      showToast("Lỗi hệ thống khi đang gọi vé!", "error");
    }
  };

  const handleRecallTicketAction = async (ticketId: string) => {
    try {
      const response = await recallTicket(ticketId);
      if (response.success) {
        showToast("Đang gọi lại!", "success");
        void handleRecallListRefresh();
      } else {
        showToast(response.message || "Không thể gọi lại vé!", "error");
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === AUTH_EXPIRED_ERROR) {
          handleSessionExpired();
          return;
        }
        showToast(error.message, "error");
        return;
      }
      showToast("Lỗi hệ thống khi gọi lại vé!", "error");
    }
  };

  const handleConfirmCallNext = () => {
    if (currentTicket) {
      setConfirmModal({
        isOpen: true,
        title: "Xác nhận gọi lại",
        message: buildTicketCallConfirmMessage(currentTicket, "gọi lại"),
        onConfirm: async () => {
          try {
            await handleCallNext();
          } finally {
            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          }
        },
      });
      return;
    }

    if (activeTab === "recall") {
      const nextRecallTicket = recallTickets[0];

      if (!nextRecallTicket) {
        showToast("Không có vé nào trong danh sách bỏ qua!", "warning");
        return;
      }

      setConfirmModal({
        isOpen: true,
        title: "Xác nhận gọi lại",
        message: buildTicketCallConfirmMessage(nextRecallTicket, "gọi lại"),
        onConfirm: async () => {
          try {
            await handleCallNext();
          } finally {
            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          }
        },
      });
      return;
    }

    const nextWaitingTicket = waitingTickets[0];

    if (!nextWaitingTicket) {
      showToast("Không có vé nào trong hàng chờ!", "warning");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Xác nhận gọi người tiếp theo",
      message: buildTicketCallConfirmMessage(nextWaitingTicket, "gọi"),
      onConfirm: async () => {
        try {
          await handleCallNext();
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleConfirmCallWaitingTicket = (ticket: Ticket) => {
    setConfirmModal({
      isOpen: true,
      title: "Xác nhận gọi vé",
      message: buildTicketCallConfirmMessage(ticket, "gọi"),
      onConfirm: async () => {
        try {
          await handleCallWaitingTicket(ticket.id);
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleConfirmRecallTicketAction = (ticket: Ticket) => {
    const ticketId = ticket.id || (ticket as Ticket & { _id?: string })._id || "";

    setConfirmModal({
      isOpen: true,
      title: "Xác nhận gọi lại",
      message: buildTicketCallConfirmMessage(ticket, "gọi lại"),
      onConfirm: async () => {
        try {
          await handleRecallTicketAction(ticketId);
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleComplete = async () => {
    if (!currentTicket) {
      showToast("Không có vé nào đang được xử lý!", "error");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Xác nhận hoàn thành",
      message: `Xác nhận hoàn thành vé số ${getTicketDisplayNumber(currentTicket)}?`,
      onConfirm: async () => {
        try {
          const response = await completeTicketApi(currentTicket.id);
          if (response.success) {
            showToast(response.message, "success");
          } else {
            showToast(response.message || "Không thể hoàn thành vé!", "error");
          }
        } catch (error) {
          if (error instanceof Error) {
            if (error.message === AUTH_EXPIRED_ERROR) {
              handleSessionExpired();
              return;
            }
            showToast(error.message, "error");
          } else {
            showToast("Lỗi hệ thống khi hoàn thành vé!", "error");
          }
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleSkip = async () => {
    if (!currentTicket) {
      showToast("Không có vé nào đang được xử lý!", "error");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Xác nhận bỏ qua",
      message: `Xác nhận bỏ qua vé số ${getTicketDisplayNumber(currentTicket)}?`,
      onConfirm: async () => {
        try {
          const response = await skipTicketApi(currentTicket.id);
          if (response.success) {
            showToast(response.message, "success");
            void handleRecallListRefresh();
          } else {
            showToast(response.message || "Không thể bỏ qua vé!", "error");
          }
        } catch (error) {
          if (error instanceof Error) {
            if (error.message === AUTH_EXPIRED_ERROR) {
              handleSessionExpired();
              return;
            }
            showToast(error.message, "error");
          } else {
            showToast("Lỗi hệ thống khi bỏ qua vé!", "error");
          }
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleBackToWaiting = async () => {
    if (!currentTicket) {
      showToast("Không có vé nào đang được xử lý!", "error");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Xác nhận trả lại",
      message: `Xác nhận trả số ${getTicketDisplayNumber(currentTicket)} về hàng chờ?\nVé sẽ được đưa lên đầu hàng chờ.`,
      onConfirm: async () => {
        try {
          const response = await backTicketToWaitingApi(currentTicket.id, "front");
          if (response.success) {
            showToast(response.message || "Đã trả vé về hàng chờ", "success");
          } else {
            showToast(response.message || "Không thể trả vé về hàng chờ!", "error");
          }
        } catch (error) {
          if (error instanceof Error) {
            if (error.message === AUTH_EXPIRED_ERROR) {
              handleSessionExpired();
              return;
            }
            showToast(error.message, "error");
          } else {
            showToast("Lỗi hệ thống khi trả vé về hàng chờ!", "error");
          }
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleLogout = () => {
    setConfirmModal({
      isOpen: true,
      title: "Xác nhận đăng xuất",
      message: "Bạn có chắc chắn muốn đăng xuất?",
      onConfirm: () => {
        sessionStorage.removeItem("staffToken");
        sessionStorage.removeItem("staffName");
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        router.push("/staff/login");
      },
    });
  };

  if (!authenticated || loading) {
    return (
      <div style={{ padding: 20 }}>
        <p>Đang tải...</p>
      </div>
    );
  }

  return (
    <div
      className="staff-page"
      style={{
        display: "flex",
        flexDirection: "column",
        width: "min(1420px, 100%)",
        height: "100%",
        maxWidth: "100%",
        padding: "0 clamp(16px, 2.4vw, 36px)",
        boxSizing: "border-box",
        margin: "0 auto",
      }}
    >
      <div
        className="staff-page__topbar"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "clamp(6px, 1vh, 12px)",
          fontSize: "clamp(14px, 1.2vw, 20px)",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div
  style={{
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
    padding: "8px 0",
  }}
>
  {staffName && (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
    }}
  >
    <div
      style={{
        width: "36px",
        height: "36px",
        borderRadius: "50%",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontWeight: 600,
        fontSize: "16px",
        boxShadow: "0 2px 8px rgba(102, 126, 234, 0.25)",
      }}
    >
      {staffName.charAt(0).toUpperCase()}
    </div>
    <div>
      <div
        style={{
          fontSize: "clamp(13px, 0.9vw, 14px)",
          fontWeight: 400,
          color: "#94a3b8",
          letterSpacing: "0.3px",
        }}
      >
        Chào mừng trở lại
      </div>
      <div
        style={{
          fontSize: "clamp(16px, 1.3vw, 22px)",
          fontWeight: 600,
          color: "#1e293b",
          lineHeight: 1.3,
        }}
      >
        {staffName}
      </div>
    </div>
  </div>
)}

  {/* Restriction Badge */}
  {restricted && (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        background: "#fef9e6",
        border: "1px solid #ffe5b4",
        borderRadius: "40px",
        padding: "4px 14px 4px 12px",
        fontSize: "0.85rem",
        fontWeight: 500,
        color: "#b85c00",
        boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        backdropFilter: "blur(2px)",
      }}
    >
      <span style={{ whiteSpace: "nowrap" }}>Giới hạn quầy:</span>
      <span
        style={{
          padding: "2px 10px",
          borderRadius: "30px",
          fontSize: "0.8rem",
          fontWeight: 400,
          color: "#a64b00",
        }}
      >
        {restricted && (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      background: "#fef9e6",
      borderRadius: "40px",
      padding: "4px 14px 4px 12px",
      fontSize: "0.85rem",
      fontWeight: 500,
      color: "#b85c00",
    }}
  >
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
      {assignedServices.map((s, idx) => (
        <span
          key={idx}
          style={{
            background: "#fcdfb7",
            padding: "2px 10px",
            borderRadius: "30px",
            fontSize: "0.8rem",
            fontWeight: 400,
            color: "#a64b00",
            whiteSpace: "nowrap",
          }}
        >
          {s.name}
        </span>
      ))}
    </div>
  </div>
)}
      </span>
    </div>
  )}
</div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginLeft: "auto",
          }}
        >
          <NotificationPermissionButton variant="staff" />
          <div
            title={ttsEnabled ? "Loa đang bật" : "Loa đang tắt"}
            aria-label={ttsEnabled ? "Loa đang bật" : "Loa đang tắt"}
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 48,
              height: 48,
              borderRadius: 12,
              border: `2px solid ${ttsEnabled ? "#16a34a" : "#dc2626"}`,
              background: ttsEnabled ? "#f0fdf4" : "#fef2f2",
              color: ttsEnabled ? "#15803d" : "#dc2626",
              flexShrink: 0,
            }}
          >
            {ttsEnabled ? <RiVolumeUpLine size={24} /> : <RiVolumeMuteLine size={24} />}
            {!ttsEnabled && (
              <span
                style={{
                  position: "absolute",
                  width: 30,
                  height: 3,
                  background: "#dc2626",
                  transform: "rotate(-45deg)",
                  borderRadius: 999,
                }}
              />
            )}
          </div>
          <button
            onClick={handleLogout}
            className="staff-page__logout"
            style={{
              padding: "clamp(10px, 1vh, 12px) clamp(16px, 1.4vw, 22px)",
              fontSize: "clamp(14px, 1.1vw, 18px)",
              fontWeight: 600,
              background: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            {"Đăng xuất"}
          </button>
        </div>
      </div>

      <div
        className="staff-page__content"
        style={{ display: "flex", gap: "clamp(16px, 2vw, 28px)", flex: 1 }}
      >
        <div
          className="staff-page__queue"
          style={{
            flex: 0.6,
            overflowY: "auto",
            minWidth: 0,
            height: "75vh",
            maxHeight: "75vh",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "16px",
              marginBottom: "clamp(12px, 1.6vh, 18px)",
              borderBottom: "2px solid #eee",
            }}
          >
            <h3
              onClick={() => setActiveTab("waiting")}
              style={{
                margin: 0,
                paddingBottom: "8px",
                color: activeTab === "waiting" ? "#003366" : "#999",
                fontSize: "clamp(20px, 2vw, 28px)",
                fontWeight: 700,
                cursor: "pointer",
                borderBottom:
                  activeTab === "waiting"
                    ? "3px solid #003366"
                    : "3px solid transparent",
                transition: "all 0.2s",
              }}
            >
              Đang chờ ({totalWaiting})
            </h3>
            <h3
              onClick={() => setActiveTab("recall")}
              style={{
                margin: 0,
                paddingBottom: "8px",
                color: activeTab === "recall" ? "#003366" : "#999",
                fontSize: "clamp(20px, 2vw, 28px)",
                fontWeight: 700,
                cursor: "pointer",
                borderBottom:
                  activeTab === "recall"
                    ? "3px solid #003366"
                    : "3px solid transparent",
                transition: "all 0.2s",
              }}
            >
              Bỏ qua ({recallTickets.length})
            </h3>
          </div>

          <table
            className="staff-page__table"
            style={{
              width: "100%",
              borderCollapse: "collapse",
              background: "#ffffff",
              boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
              fontSize: "clamp(14px, 1.1vw, 20px)",
              textAlign: "center",
              tableLayout: "fixed",
            }}
          >
            <thead>
              <tr style={{ background: "#003366", color: "white" }}>
                <th
                  style={{
                    width: "10%",
                    padding: "clamp(8px, 1vh, 12px) 10px",
                    borderRight: "1px solid #ddd",
                    fontSize: "clamp(12px, 0.9vw, 16px)",
                  }}
                >
                  STT
                </th>
                <th
                  style={{
                    width: "20%",
                    padding: "clamp(8px, 1vh, 12px) 10px",
                    borderRight: "1px solid #ddd",
                    fontSize: "clamp(12px, 0.9vw, 16px)",
                  }}
                >
                  SỐ PHIẾU
                </th>
                <th
                  style={{
                    width: activeTab === "recall" ? "30%" : "28%",
                    padding: "clamp(8px, 1vh, 12px) 10px",
                    borderRight: "1px solid #ddd",
                    fontSize: "clamp(12px, 0.9vw, 16px)",
                  }}
                >
                  HỌ VÀ TÊN
                </th>
                <th
                  style={{
                    width: activeTab === "recall" ? "20%" : "22%",
                    padding: "clamp(8px, 1vh, 12px) 10px",
                    borderRight: "1px solid #ddd",
                    fontSize: "clamp(12px, 0.9vw, 16px)",
                  }}
                >
                  QUẦY
                </th>
                <th
                  style={{
                    width: "20%",
                    padding: "clamp(8px, 1vh, 12px) 10px",
                    fontSize: "clamp(12px, 0.9vw, 16px)",
                  }}
                >
                  HÀNH ĐỘNG
                </th>
              </tr>
            </thead>
            <tbody>
              {activeTab === "waiting" ? (
                waitingTickets.length > 0 ? (
                  waitingTickets.slice(0, 10).map((ticket, index) => (
                    <tr key={ticket.id} style={{ borderBottom: "1px solid #e0e0e0" }}>
                      <td
                        style={{
                          padding: "clamp(8px, 0.95vh, 12px) 10px",
                          borderRight: "1px solid #ddd",
                          fontSize: "clamp(14px, 1vw, 18px)",
                        }}
                      >
                        {index + 1}
                      </td>
                      <td
                        style={{
                          padding: "clamp(8px, 0.95vh, 12px) 10px",
                          color: "#003366",
                          fontWeight: 700,
                          fontSize: "clamp(16px, 1.25vw, 20px)",
                          borderRight: "1px solid #ddd",
                        }}
                      >
                        {getTicketDisplayNumber(ticket)}
                      </td>
                      <td
                        style={{
                          padding: "clamp(8px, 0.95vh, 12px) 10px",
                          borderRight: "1px solid #ddd",
                          fontSize: "clamp(14px, 1vw, 17px)",
                          lineHeight: 1.2,
                          wordBreak: "break-word",
                        }}
                      >
                        {ticket.customerName}
                      </td>
                      <td
                        style={{
                          padding: "clamp(8px, 0.95vh, 12px) 10px",
                          borderRight: "1px solid #ddd",
                          fontSize: "clamp(14px, 1vw, 17px)",
                          fontWeight: 600,
                          lineHeight: 1.2,
                          wordBreak: "break-word",
                        }}
                      >
                        {ticket.serviceName}
                      </td>
                      <td style={{ padding: "clamp(8px, 0.95vh, 12px) 10px" }}>
                        <button
                          onClick={() => handleConfirmCallWaitingTicket(ticket)}
                          style={{
                            padding: "6px 12px",
                            background: "#003366",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "clamp(13px, 0.9vw, 15px)",
                            fontWeight: 600,
                          }}
                        >
                          Gọi
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: "24px 16px",
                        color: "#6b7280",
                        fontStyle: "italic",
                        fontSize: 22,
                      }}
                    >
                      Không có vé chờ
                    </td>
                  </tr>
                )
              ) : recallTickets.length > 0 ? (
                recallTickets.map((ticket, index) => (
                  <tr
                    key={ticket.id || (ticket as Ticket & { _id?: string })._id}
                    style={{ borderBottom: "1px solid #e0e0e0" }}
                  >
                    <td
                      style={{
                        padding: "clamp(8px, 0.95vh, 12px) 10px",
                        borderRight: "1px solid #ddd",
                        fontSize: "clamp(14px, 1vw, 18px)",
                      }}
                    >
                      {index + 1}
                    </td>
                    <td
                      style={{
                        padding: "clamp(8px, 0.95vh, 12px) 10px",
                        color: "#003366",
                        fontWeight: 700,
                        fontSize: "clamp(16px, 1.25vw, 20px)",
                        borderRight: "1px solid #ddd",
                      }}
                    >
                      {getTicketDisplayNumber(ticket)}
                    </td>
                    <td
                      style={{
                        padding: "clamp(8px, 0.95vh, 12px) 10px",
                        borderRight: "1px solid #ddd",
                        fontSize: "clamp(14px, 1vw, 17px)",
                        lineHeight: 1.2,
                        wordBreak: "break-word",
                      }}
                    >
                      {ticket.customerName}
                    </td>
                    <td
                      style={{
                        padding: "clamp(8px, 0.95vh, 12px) 10px",
                        borderRight: "1px solid #ddd",
                        fontSize: "clamp(14px, 1vw, 17px)",
                        fontWeight: 600,
                        lineHeight: 1.2,
                        wordBreak: "break-word",
                      }}
                    >
                      {ticket.serviceName}
                    </td>
                    <td style={{ padding: "clamp(8px, 0.95vh, 12px) 10px" }}>
                      <button
                        onClick={() => handleConfirmRecallTicketAction(ticket)}
                        style={{
                          padding: "6px 12px",
                          background: "#003366",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "clamp(13px, 0.9vw, 15px)",
                          fontWeight: 600,
                        }}
                      >
                        Gọi lại
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: "24px 16px",
                      color: "#6b7280",
                      fontStyle: "italic",
                      fontSize: 22,
                    }}
                  >
                    Không có vé bỏ qua
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div
          className="staff-page__actions"
          style={{
            flex: 0.4,
            display: "flex",
            flexDirection: "column",
            gap: "clamp(16px, 1.8vh, 24px)",
            minWidth: 0,
          }}
        >
          <div
            className="staff-page__current-ticket"
            style={{
              background: "white",
              border: "2px solid #003366",
              borderRadius: 12,
              padding: "clamp(16px, 1.8vw, 24px)",
              flex: "0 0 auto",
              marginTop: "clamp(24px, 4vh, 52px)",
              boxShadow: "0 10px 24px rgba(0, 61, 130, 0.08)",
              minHeight: "35vh",
              overflowY: "auto",
            }}
          >
            <h2
              style={{
                margin: "0 0 20px 0",
                color: "#003366",
                fontSize: "clamp(32px, 3vw, 48px)",
                fontWeight: 700,
                textAlign: "center",
              }}
            >
              Vé đang xử lý
            </h2>
            {currentTicket ? (
              <div
                style={{
                  fontSize: "clamp(18px, 1.8vw, 30px)",
                  marginLeft: 16,
                  lineHeight: 1.45,
                }}
              >
                <div style={{ marginBottom: 12 }}>
                  <span style={{ fontWeight: 700, color: "#333" }}>Số phiếu: </span>
                  <span
                    style={{
                      color: "#003366",
                      fontWeight: 700,
                      fontSize: "clamp(22px, 2vw, 34px)",
                    }}
                  >
                    {getTicketDisplayNumber(currentTicket)}
                  </span>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <span style={{ fontWeight: 700, color: "#333" }}>Đương sự: </span>
                  <span style={{ color: "#555" }}>{currentTicket.customerName}</span>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <span style={{ fontWeight: 700, color: "#333" }}>Quầy: </span>
                  <span style={{ color: "#555" }}>{currentTicket.serviceName}</span>
                </div>
              </div>
            ) : (
              <div
                style={{
                  color: "#999",
                  fontSize: "clamp(15px, 1.2vw, 22px)",
                  fontStyle: "italic",
                  textAlign: "center",
                }}
              >
                Chờ gọi người tiếp theo
              </div>
            )}
          </div>

          <div
            className="staff-page__button-group"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "clamp(10px, 1.2vh, 14px)",
              flex: 0.5,
            }}
          >
            <div
              className="staff-page__call-row"
              style={{ display: "flex", gap: "clamp(10px, 1vw, 14px)" }}
            >
              <button
                type="button"
                onClick={handleBackToWaiting}
                disabled={!currentTicket || activeTab === "recall"}
                onMouseEnter={() => setHovered("back")}
                onMouseLeave={() => setHovered(null)}
                style={{
                  flex: 1,
                  padding: "clamp(12px, 1.5vh, 18px) 20px",
                  fontSize: "clamp(18px, 1.8vw, 28px)",
                  fontWeight: 700,
                  background:
                    hovered === "back" && currentTicket && activeTab !== "recall"
                      ? "#003366"
                      : currentTicket && activeTab !== "recall"
                        ? "#f3f4f6"
                        : "#f0f0f0",
                  color:
                    hovered === "back" && currentTicket && activeTab !== "recall"
                      ? "white"
                      : currentTicket && activeTab !== "recall"
                        ? "#000000"
                        : "#000000",
                  border: `2px solid ${currentTicket && activeTab !== "recall" ? "#003366" : "#ccc"}`,
                  borderRadius: 10,
                  cursor: currentTicket && activeTab !== "recall" ? "pointer" : "not-allowed",
                  transition: "all 0.2s ease",
                }}
              >
                Trả lại
              </button>

              <button
                onClick={handleConfirmCallNext}
                onMouseEnter={() => setHovered("call")}
                onMouseLeave={() => setHovered(null)}
                style={{
                  flex: 1,
                  padding: "clamp(12px, 1.5vh, 18px) 20px",
                  fontSize: "clamp(18px, 1.8vw, 28px)",
                  fontWeight: 700,
                  background: hovered === "call" ? "#003366" : "green",
                  color: "white",
                  border: "2px solid #003366",
                  borderRadius: 10,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {currentTicket ? "Gọi lại" : "Người tiếp theo"}
              </button>
            </div>

            <button
              onClick={handleComplete}
              disabled={!currentTicket}
              onMouseEnter={() => setHovered("complete")}
              onMouseLeave={() => setHovered(null)}
              style={{
                padding: "clamp(12px, 1.5vh, 18px) 20px",
                fontSize: "clamp(18px, 1.8vw, 28px)",
                fontWeight: 700,
                background:
                  hovered === "complete" && currentTicket
                    ? "#003366"
                    : currentTicket
                      ? "#007bff"
                      : "#f0f0f0",
                color: currentTicket ? "white" : "black",
                border: `2px solid ${currentTicket ? "#003366" : "#ccc"}`,
                borderRadius: 10,
                cursor: currentTicket ? "pointer" : "not-allowed",
                transition: "all 0.2s ease",
              }}
            >
              Hoàn thành
            </button>

            <button
              onClick={handleSkip}
              disabled={!currentTicket}
              onMouseEnter={() => setHovered("skip")}
              onMouseLeave={() => setHovered(null)}
              style={{
                padding: "clamp(12px, 1.5vh, 18px) 20px",
                fontSize: "clamp(18px, 1.8vw, 28px)",
                fontWeight: 700,
                background:
                  hovered === "skip" && currentTicket
                    ? "#003366"
                    : currentTicket
                      ? "#ff9800"
                      : "#f0f0f0",
                color: currentTicket ? "white" : "black",
                border: `2px solid ${currentTicket ? "#003366" : "#ccc"}`,
                borderRadius: 10,
                cursor: currentTicket ? "pointer" : "not-allowed",
                transition: "all 0.2s ease",
              }}
            >
              Bỏ qua
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1600px) and (max-height: 900px) {
          .staff-page {
            width: min(1280px, 100%) !important;
            padding: 0 20px !important;
          }

          .staff-page__topbar {
            margin-bottom: 14px !important;
          }

          .staff-page__content {
            gap: 16px !important;
          }

          .staff-page__queue {
            flex: 0.62 !important;
          }

          .staff-page__actions {
            flex: 0.38 !important;
            gap: 14px !important;
          }

          .staff-page__title {
            margin-bottom: 12px !important;
            font-size: 24px !important;
            line-height: 1.15 !important;
          }

          .staff-page__table {
            font-size: 15px !important;
          }

          .staff-page__table th {
            padding: 8px 8px !important;
            font-size: 12px !important;
          }

          .staff-page__table td {
            padding: 9px 8px !important;
          }

          .staff-page__current-ticket {
            margin-top: 12px !important;
            padding: 16px !important;
          }

          .staff-page__button-group {
            gap: 10px !important;
          }

          .staff-page__button-group button {
            padding: 12px 16px !important;
            font-size: 20px !important;
          }
        }

        @media (max-width: 1366px) {
          .staff-page__content {
            gap: 16px !important;
          }

          .staff-page__queue {
            flex: 0.58 !important;
          }

          .staff-page__actions {
            flex: 0.42 !important;
          }

          .staff-page__current-ticket {
            margin-top: 24px !important;
          }
        }

        @media (max-width: 1366px) and (max-height: 800px) {
          .staff-page {
            padding: 0 16px !important;
          }

          .staff-page__topbar {
            margin-bottom: 10px !important;
          }

          .staff-page__queue {
            flex: 0.64 !important;
          }

          .staff-page__actions {
            flex: 0.36 !important;
            gap: 12px !important;
          }

          .staff-page__title {
            font-size: 22px !important;
          }

          .staff-page__table th {
            font-size: 11px !important;
            padding: 7px 6px !important;
          }

          .staff-page__table td {
            padding: 8px 6px !important;
            font-size: 14px !important;
          }

          .staff-page__current-ticket h2 {
            font-size: 30px !important;
            margin-bottom: 14px !important;
          }

          .staff-page__current-ticket > div {
            font-size: 18px !important;
            margin-left: 4px !important;
            line-height: 1.35 !important;
          }

          .staff-page__current-ticket > div span {
            word-break: break-word;
          }

          .staff-page__button-group button {
            font-size: 18px !important;
            padding: 11px 14px !important;
          }
        }

        @media (max-width: 1180px) {
          .staff-page__content {
            flex-direction: column !important;
          }

          .staff-page__queue,
          .staff-page__actions {
            flex: 1 1 auto !important;
            width: 100% !important;
          }

          .staff-page__current-ticket {
            margin-top: 0 !important;
          }
        }

        @media (max-width: 768px) {
          .staff-page__topbar {
            align-items: stretch !important;
          }

          .staff-page__logout {
            width: 100%;
            justify-content: center;
          }

          .staff-page__button-group button {
            width: 100%;
          }

          .staff-page__call-row {
            flex-direction: column;
          }
        }
      `}</style>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, isOpen: false }))}
        duration={3000}
      />
    </div>
  );
}
