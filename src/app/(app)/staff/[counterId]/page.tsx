"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RiVolumeMuteLine, RiVolumeUpLine } from "react-icons/ri";
import { Ticket, Counter, Service } from "@/types/queue";
import Toast from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";
import { getErrorMessage } from "@/lib/error-message";
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
  updateTicketNoteApi,
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

/* ─── helpers ─────────────────────────────────────────────────────────── */
const getTicketDisplayNumber = (ticket?: Ticket | null) =>
  ticket?.displayNumber ||
  ticket?.formattedNumber ||
  String(ticket?.number ?? "").padStart(3, "0");

const abbreviateName = (name: string, maxLen = 18): string => {
  if (!name || name.length <= maxLen) return name;
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name.slice(0, maxLen) + "…";
  const last = parts[parts.length - 1];
  const initials = parts.slice(0, -1).map(p => p.charAt(0).toUpperCase() + ".").join("");
  return `${initials} ${last}`;
};

const buildConfirmFields = (ticket: Ticket) => [
  { label: "Số phiếu", value: getTicketDisplayNumber(ticket) },
  { label: "Đương sự",  value: ticket.customerName || "Chưa có thông tin" },
  { label: "Quầy",     value: ticket.serviceName  || "Chưa có thông tin" },
];

function useWaitMinutes(createdAt?: string | number | Date | null) {
  const [mins, setMins] = useState(0);
  useEffect(() => {
    if (!createdAt) return;
    const update = () => {
      const diff = Date.now() - new Date(createdAt).getTime();
      setMins(Math.floor(diff / 60000));
    };
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [createdAt]);
  return mins;
}

const formatWaitLabel = (mins: number): string => {
  if (mins < 1) return "Mới vào";
  if (mins < 60) return `Chờ ${mins} phút`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `Chờ ${h}h${m}p` : `Chờ ${h} giờ`;
};

const getWaitColorVar = (mins: number): string =>
  mins >= 20 ? "var(--red)" : mins >= 10 ? "var(--orange)" : "var(--muted)";

/* ─── sub-components ──────────────────────────────────────────────────── */

function KeyHint({ k, label }: { k: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted)" }}>
      <kbd style={{
        background: "var(--surface)",
        border: "1.5px solid var(--border2)",
        borderRadius: 4, padding: "2px 7px", fontFamily: "monospace",
        fontSize: 12, color: "var(--text2)", lineHeight: "18px",
        fontWeight: 600,
      }}>{k}</kbd>
      {label}
    </span>
  );
}

function StatCard({ value, label, accent }: { value: string | number; label: string; accent?: string }) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "2px solid var(--border)",
      borderRadius: 10,
      padding: "9px 16px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      boxShadow: "var(--shadow-sm)",
    }}>
      <div style={{
        fontSize: 24, fontWeight: 800,
        color: accent || "var(--text1)",
        fontVariantNumeric: "tabular-nums",
        letterSpacing: -0.5, lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 12, color: "var(--muted)",
        textTransform: "uppercase", letterSpacing: "0.07em", lineHeight: 1.3,
        fontWeight: 600,
      }}>
        {label}
      </div>
    </div>
  );
}

function ActionBtn({
  label, sublabel, onClick, disabled, variant, kbd,
}: {
  label: string; sublabel?: string; onClick: () => void;
  disabled?: boolean; variant: "primary" | "success" | "warning" | "ghost" | "back";
  kbd?: string;
}) {
  const [hov, setHov] = useState(false);
  const map = {
    primary: { bg: "#3b5bdb", hov: "#2f4ac4", text: "#fff",      border: "#3b5bdb" },
    success: { bg: "#2f9e44", hov: "#276b35", text: "#fff",      border: "#2f9e44" },
    warning: { bg: "#e8590c", hov: "#c24a09", text: "#fff",      border: "#e8590c" },
    ghost:   { bg: "transparent", hov: "#f0f2f8", text: "#4a5070", border: "#c8cfe8" },
    back:    { bg: "#eef1fd", hov: "#dde3fb", text: "#3b5bdb",   border: "#a8b8f0" },
  };
  const c = map[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: 1, padding: "18px 14px",
        background: disabled ? "var(--surface2)" : hov ? c.hov : c.bg,
        color: disabled ? "var(--muted)" : c.text,
        border: `2px solid ${disabled ? "var(--border)" : c.border}`,
        borderRadius: 10, cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 800, fontSize: 16,
        transition: "all 0.15s",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        position: "relative",
      }}
    >
      <span>{label}</span>
      {sublabel && <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.78 }}>{sublabel}</span>}
      {kbd && !disabled && (
        <kbd style={{
          position: "absolute", top: 7, right: 9,
          background: "rgba(0,0,0,0.14)", borderRadius: 3,
          padding: "0 5px", fontSize: 11, fontFamily: "monospace",
          color: variant === "ghost" || variant === "back" ? "var(--muted)" : "rgba(255,255,255,0.85)",
          border: "none", fontWeight: 700,
        }}>{kbd}</kbd>
      )}
    </button>
  );
}

/* ─── main page ───────────────────────────────────────────────────────── */
export default function StaffCounterPage() {
  const params = useParams();
  const router = useRouter();
  const counterId = params.counterId as string;

  const [counter, setCounter] = useState<Counter | null>(null);
  const [staffName, setStaffName] = useState("");
  const [staffId, setStaffId] = useState("");
  const [restricted, setRestricted] = useState(false);
  const [assignedServices, setAssignedServices] = useState<Service[]>([]);
  const [waitingTickets, setWaitingTickets] = useState<Ticket[]>([]);
  const [recallTickets, setRecallTickets] = useState<Ticket[]>([]);
  const [activeTab, setActiveTab] = useState<"waiting" | "recall">("waiting");
  const [totalWaiting, setTotalWaiting] = useState(0);
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [doneToday, setDoneToday] = useState(0);
  const [socketOk, setSocketOk] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const noteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 7;
  const [topbarExpanded, setTopbarExpanded] = useState(false);
  const [openNoteTicketId, setOpenNoteTicketId] = useState<string | null>(null);

  const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: "success" | "error" | "warning" | "info" }>({ isOpen: false, message: "", type: "info" });
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message?: string; fields?: { label: string; value: string }[]; onConfirm: () => void }>({ isOpen: false, title: "", onConfirm: () => {} });

  const showToast = (message: string, type: "success" | "error" | "warning" | "info" = "info") =>
    setToast({ isOpen: true, message, type });

  const handleSessionExpired = useCallback(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("staffToken");
      sessionStorage.removeItem("staffUser");
      sessionStorage.removeItem("staffName");
    }
    router.push("/staff/login?reason=session_expired");
  }, [router]);

  const applySnapshot = (snapshot: {
    counter: Counter; services: Service[]; currentTicket: Ticket | null;
    waitingTickets: Ticket[]; totalWaiting?: number; staffName?: string;
  }) => {
    setCounter(snapshot.counter);
    setCurrentTicket(snapshot.currentTicket);
    setWaitingTickets(snapshot.waitingTickets);
    setTotalWaiting(snapshot.totalWaiting ?? snapshot.waitingTickets.length);
    if (snapshot.staffName) setStaffName(snapshot.staffName);
  };

  const handleRecallListRefresh = useCallback(async () => {
    try {
      const res = await getRecallList();
      if (res.success) setRecallTickets(res.data || []);
    } catch (err) { console.error(err); }
  }, []);

  const onNewTicketAlert = useNewTicketAlerts();

  useEffect(() => {
    const token = typeof window !== "undefined" ? sessionStorage.getItem("staffToken") : null;
    if (!token) { router.push("/staff/login"); return; }
    const load = async () => {
      try {
        setLoading(true);
        const response = await getStaffDisplay();
        if (response.success) {
          const { counter, services, currentTicket, waitingTickets, totalWaiting, staffName, staffId, serviceRestrictionConfigured, assignedServices } = response.data;
          if (counter.id !== counterId) { sessionStorage.removeItem("staffToken"); router.push("/staff/login?error=unauthorized"); return; }
          applySnapshot({ counter, services, currentTicket, waitingTickets, totalWaiting, staffName });
          if (staffId) setStaffId(staffId);
          if (serviceRestrictionConfigured !== undefined) setRestricted(serviceRestrictionConfigured);
          if (assignedServices) setAssignedServices(assignedServices);
          setAuthenticated(true);
          void handleRecallListRefresh();
        } else { sessionStorage.removeItem("staffToken"); router.push("/staff/login?error=session_expired"); }
      } catch (error) {
        if (error instanceof Error && error.message === AUTH_EXPIRED_ERROR) { handleSessionExpired(); return; }
        sessionStorage.removeItem("staffToken"); router.push("/staff/login?error=fetch_failed");
      } finally { setLoading(false); }
    };
    void load();
  }, [counterId, handleRecallListRefresh, handleSessionExpired, router]);

  useEffect(() => {
    if (!authenticated) return;
    const socket = createStaffSocket();
    const unsub = onStaffDisplayUpdated(socket, (payload: StaffDisplayUpdatedPayload) => {
      if (payload.staffId !== staffId) return;
      applySnapshot({ counter: payload.data.counter as Counter, services: payload.data.services as Service[], currentTicket: payload.data.currentTicket as Ticket | null, waitingTickets: payload.data.waitingTickets as Ticket[], totalWaiting: payload.data.totalWaiting });
      if (payload.data.recallTickets) setRecallTickets(payload.data.recallTickets as Ticket[]);
    });
    const unsubJoined = onJoinedCounterRoom(socket, () => {});
    const unsubErr = onSocketError(socket, () => setSocketOk(false));
    socket.on("connect", () => { setSocketOk(true); joinCounterRoom(socket, counterId, staffId); });
    socket.on("disconnect", () => setSocketOk(false));
    socket.on("connect_error", () => setSocketOk(false));
    const handleNew = (p: NewTicketSocketPayload) => onNewTicketAlert(p);
    socket.on("new_ticket", handleNew);
    return () => { socket.off("new_ticket", handleNew); unsub(); unsubJoined(); unsubErr(); socket.disconnect(); };
  }, [authenticated, counterId, staffId, onNewTicketAlert]);

  useEffect(() => {
    if (!authenticated) return;
    let active = true;
    const sync = async () => { try { const e = await getTtsEnabledStatus(); if (active) setTtsEnabled(e); } catch { if (active) setTtsEnabled(false); } };
    void sync();
    const id = window.setInterval(() => void sync(), 3000);
    return () => { active = false; window.clearInterval(id); };
  }, [authenticated]);

  const kbdHandlersRef = useRef({
    handleConfirmCallNext: () => {},
    handleComplete: () => {},
    handleSkip: () => {},
    handleBackToWaiting: () => {},
    setActiveTab,
  });

  // Sync ghi chú khi đổi vé
  useEffect(() => {
    setNoteText(currentTicket?.note || "");
    setNoteSaved(false);
    if (noteDebounceRef.current) clearTimeout(noteDebounceRef.current);
  }, [currentTicket?.id]);

  const handleNoteChange = (val: string) => {
    setNoteText(val);
    setNoteSaved(false);
    if (noteDebounceRef.current) clearTimeout(noteDebounceRef.current);
    if (!currentTicket) return;
    noteDebounceRef.current = setTimeout(async () => {
      try {
        setNoteSaving(true);
        await updateTicketNoteApi(currentTicket.id, val);
        setNoteSaved(true);
      } catch {
        // im lặng, không làm phiền staff
      } finally {
        setNoteSaving(false);
      }
    }, 800);
  };

  const handleNoteClear = async () => {
    setNoteText("");
    setNoteSaved(false);
    if (!currentTicket) return;
    try {
      setNoteSaving(true);
      await updateTicketNoteApi(currentTicket.id, "");
      setNoteSaved(true);
    } catch { /* ignore */ } finally {
      setNoteSaving(false);
    }
  };

  useEffect(() => {
    kbdHandlersRef.current.handleConfirmCallNext = handleConfirmCallNext;
    kbdHandlersRef.current.handleComplete = handleComplete;
    kbdHandlersRef.current.handleSkip = handleSkip;
    kbdHandlersRef.current.handleBackToWaiting = handleBackToWaiting;
  });

  useEffect(() => {
    if (!authenticated) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.metaKey || e.ctrlKey) return;
      const h = kbdHandlersRef.current;
      if (e.key === " " || e.key === "n") { e.preventDefault(); h.handleConfirmCallNext(); }
      if (e.key === "c") h.handleComplete();
      if (e.key === "s") h.handleSkip();
      if (e.key === "r") h.handleBackToWaiting();
      if (e.key === "1") h.setActiveTab("waiting");
      if (e.key === "2") h.setActiveTab("recall");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [authenticated]);

  /* ── actions ── */
  const handleCallNext = async () => {
    if (currentTicket) {
      try {
        const res = await recallProcessingTicketApi(currentTicket.id);
        res.success ? showToast("Đang gọi lại!", "info") : showToast(res.message || "Không thể gọi lại!", "error");
      } catch (error) {
        if (error instanceof Error) { if (error.message === AUTH_EXPIRED_ERROR) { handleSessionExpired(); return; } showToast(getErrorMessage(error, "Không thể kết nối máy chủ"), "error"); }
        else showToast("Lỗi hệ thống!", "error");
      }
      return;
    }
    try {
      if (activeTab === "recall") {
        const next = recallTickets[0];
        if (!next) { showToast("Không có vé bỏ qua!", "warning"); return; }
        const res = await recallTicket(next.id || (next as Ticket & { _id?: string })._id || "");
        if (res.success) { showToast("Đang gọi lại!", "success"); void handleRecallListRefresh(); }
        else showToast(res.message || "Không thể gọi lại!", "error");
        return;
      }
      const next = waitingTickets[0];
      if (!next) { showToast("Không có vé chờ!", "warning"); return; }
      const res = await callTicketById(next.id, counterId);
      res.success ? showToast(res.message || "Đang gọi!", "success") : showToast(res.message || "Không thể gọi!", "error");
    } catch (error) {
      if (error instanceof Error) { if (error.message === AUTH_EXPIRED_ERROR) { handleSessionExpired(); return; } showToast(getErrorMessage(error, "Không thể kết nối máy chủ"), "error"); }
      else showToast("Lỗi hệ thống!", "error");
    }
  };

  const handleConfirmCallNext = () => {
    if (currentTicket) {
      setConfirmModal({ isOpen: true, title: "Gọi lại", fields: buildConfirmFields(currentTicket), onConfirm: async () => { try { await handleCallNext(); } finally { setConfirmModal(p => ({ ...p, isOpen: false })); } } });
      return;
    }
    if (activeTab === "recall") {
      const next = recallTickets[0];
      if (!next) { showToast("Không có vé bỏ qua!", "warning"); return; }
      setConfirmModal({ isOpen: true, title: "Gọi lại", fields: buildConfirmFields(next), onConfirm: async () => { try { await handleCallNext(); } finally { setConfirmModal(p => ({ ...p, isOpen: false })); } } });
      return;
    }
    const next = waitingTickets[0];
    if (!next) { showToast("Không có vé chờ!", "warning"); return; }
    setConfirmModal({ isOpen: true, title: "Gọi người tiếp theo", fields: buildConfirmFields(next), onConfirm: async () => { try { await handleCallNext(); } finally { setConfirmModal(p => ({ ...p, isOpen: false })); } } });
  };

  const handleComplete = async () => {
    if (!currentTicket) { showToast("Không có vé đang xử lý!", "error"); return; }
    setConfirmModal({
      isOpen: true, title: "Hoàn thành",
      fields: buildConfirmFields(currentTicket),
      onConfirm: async () => {
        try {
          const res = await completeTicketApi(currentTicket.id);
          if (res.success) { showToast(res.message, "success"); setDoneToday(d => d + 1); }
          else showToast(res.message || "Không thể hoàn thành!", "error");
        } catch (error) {
          if (error instanceof Error) { if (error.message === AUTH_EXPIRED_ERROR) { handleSessionExpired(); return; } showToast(getErrorMessage(error, "Không thể kết nối máy chủ"), "error"); }
          else showToast("Lỗi hệ thống!", "error");
        } finally { setConfirmModal(p => ({ ...p, isOpen: false })); }
      },
    });
  };

  const handleSkip = async () => {
    if (!currentTicket) { showToast("Không có vé đang xử lý!", "error"); return; }
    setConfirmModal({
      isOpen: true, title: "Bỏ qua",
      fields: buildConfirmFields(currentTicket),
      onConfirm: async () => {
        try {
          const res = await skipTicketApi(currentTicket.id);
          if (res.success) { showToast(res.message, "success"); void handleRecallListRefresh(); }
          else showToast(res.message || "Không thể bỏ qua!", "error");
        } catch (error) {
          if (error instanceof Error) { if (error.message === AUTH_EXPIRED_ERROR) { handleSessionExpired(); return; } showToast(getErrorMessage(error, "Không thể kết nối máy chủ"), "error"); }
          else showToast("Lỗi hệ thống!", "error");
        } finally { setConfirmModal(p => ({ ...p, isOpen: false })); }
      },
    });
  };

  const handleBackToWaiting = async () => {
    if (!currentTicket) { showToast("Không có vé đang xử lý!", "error"); return; }
    setConfirmModal({
      isOpen: true, title: "Trả về hàng chờ",
      fields: buildConfirmFields(currentTicket),
      onConfirm: async () => {
        try {
          const res = await backTicketToWaitingApi(currentTicket.id, "front");
          res.success ? showToast(res.message || "Đã trả về hàng chờ", "success") : showToast(res.message || "Không thể trả về!", "error");
        } catch (error) {
          if (error instanceof Error) { if (error.message === AUTH_EXPIRED_ERROR) { handleSessionExpired(); return; } showToast(getErrorMessage(error, "Không thể kết nối máy chủ"), "error"); }
          else showToast("Lỗi hệ thống!", "error");
        } finally { setConfirmModal(p => ({ ...p, isOpen: false })); }
      },
    });
  };

  const handleCallSpecific = (ticket: Ticket) => {
    setConfirmModal({
      isOpen: true, title: "Gọi vé", fields: buildConfirmFields(ticket),
      onConfirm: async () => {
        try {
          const res = await callTicketById(ticket.id, counterId);
          res.success ? showToast(res.message || "Đang gọi!", "success") : showToast(res.message || "Không thể gọi!", "error");
        } catch (error) {
          if (error instanceof Error) { if (error.message === AUTH_EXPIRED_ERROR) { handleSessionExpired(); return; } showToast(getErrorMessage(error, "Không thể kết nối máy chủ"), "error"); }
          else showToast("Lỗi hệ thống!", "error");
        } finally { setConfirmModal(p => ({ ...p, isOpen: false })); }
      },
    });
  };

  const handleRecallSpecific = (ticket: Ticket) => {
    const id = ticket.id || (ticket as Ticket & { _id?: string })._id || "";
    setConfirmModal({
      isOpen: true, title: "Gọi lại", fields: buildConfirmFields(ticket),
      onConfirm: async () => {
        try {
          const res = await recallTicket(id);
          if (res.success) { showToast("Đang gọi lại!", "success"); void handleRecallListRefresh(); }
          else showToast(res.message || "Không thể gọi lại!", "error");
        } catch (error) {
          if (error instanceof Error) { if (error.message === AUTH_EXPIRED_ERROR) { handleSessionExpired(); return; } showToast(getErrorMessage(error, "Không thể kết nối máy chủ"), "error"); }
          else showToast("Lỗi hệ thống!", "error");
        } finally { setConfirmModal(p => ({ ...p, isOpen: false })); }
      },
    });
  };

  const handleLogout = () => {
    setConfirmModal({
      isOpen: true, title: "Đăng xuất", message: "Bạn có chắc muốn đăng xuất?",
      onConfirm: () => { sessionStorage.removeItem("staffToken"); sessionStorage.removeItem("staffName"); setConfirmModal(p => ({ ...p, isOpen: false })); router.push("/staff/login"); },
    });
  };

  const handleTicketNoteChange = useCallback((ticketId: string, note: string) => {
    setWaitingTickets(prev => prev.map(t => t.id === ticketId ? { ...t, note } : t));
    setRecallTickets(prev => prev.map(t => t.id === ticketId ? { ...t, note } : t));
  }, []);

  const handleToggleNote = useCallback((ticketId: string) => {
    setOpenNoteTicketId(prev => (prev === ticketId ? null : ticketId));
  }, []);

  useEffect(() => { setPage(1); setOpenNoteTicketId(null); }, [activeTab, search, serviceFilter]);

  const allTickets = activeTab === "waiting" ? waitingTickets : recallTickets;
  const serviceOptions = Array.from(new Set(allTickets.map(t => t.serviceName).filter(Boolean))) as string[];
  const filteredTickets = allTickets.filter(t => {
    const matchSearch = !search.trim() ||
      getTicketDisplayNumber(t).toLowerCase().includes(search.toLowerCase()) ||
      (t.customerName || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.serviceName || "").toLowerCase().includes(search.toLowerCase());
    const matchService = !serviceFilter || t.serviceName === serviceFilter;
    return matchSearch && matchService;
  });
  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const displayTickets = filteredTickets.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (!authenticated || loading) {
    return (
      <>
        <style>{CSS}</style>
        <div className="sp-loading">
          <div className="sp-loading__spinner" />
          <span>Đang tải...</span>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="sp">

        {/* ── TOPBAR (collapsible) ── */}
        <header className={`sp__topbar ${topbarExpanded ? "sp__topbar--expanded" : ""}`}>
          <div className="sp__topbar-main">
            <button
              type="button"
              className="sp__topbar-toggle"
              onClick={() => setTopbarExpanded(v => !v)}
              aria-expanded={topbarExpanded}
              aria-label={topbarExpanded ? "Thu gọn thông tin tài khoản" : "Mở rộng thông tin tài khoản"}
              title={topbarExpanded ? "Thu gọn" : "Mở rộng"}
            >
              {topbarExpanded ? "▴" : "▾"}
            </button>

            <div className="sp__avatar sp__avatar--compact">{staffName.charAt(0).toUpperCase()}</div>

            <div className="sp__topbar-info">
              <div className="sp__name sp__name--compact">{staffName}</div>
              {!topbarExpanded && restricted && assignedServices.length > 0 && (
                <div
                  className="sp__restrict-summary"
                  title={assignedServices.map(s => s.name).join(", ")}
                >
                  Giới hạn {assignedServices.length} dịch vụ
                </div>
              )}
            </div>

            <div className="sp__topbar-right">
              <NotificationPermissionButton variant="staff" />
              <button className="sp__logout" onClick={handleLogout}>
                {topbarExpanded ? "Đăng xuất" : "Thoát"}
              </button>
            </div>
          </div>

          <div className="sp__topbar-details">
            <div className="sp__greeting">Chào mừng trở lại</div>
            {restricted && assignedServices.length > 0 && (
              <div className="sp__restrict-badge">
                <span className="sp__restrict-dot" />
                Giới hạn:{" "}
                {assignedServices.map((s, i) => (
                  <span key={i} className="sp__service-tag">{s.name}</span>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* ── MAIN GRID ── */}
        <div className="sp__grid">

          {/* LEFT — queue */}
          <section className="sp__queue">
            <div className="sp__tabs">
              <button className={`sp__tab ${activeTab === "waiting" ? "sp__tab--active" : ""}`} onClick={() => setActiveTab("waiting")}>
                Đang chờ
                <span className="sp__tab-count">{totalWaiting}</span>
                <KeyHint k="1" label="" />
              </button>
              <button className={`sp__tab ${activeTab === "recall" ? "sp__tab--active sp__tab--recall" : ""}`} onClick={() => setActiveTab("recall")}>
                Bỏ qua
                <span className={`sp__tab-count ${recallTickets.length > 0 ? "sp__tab-count--warn" : ""}`}>{recallTickets.length}</span>
                <KeyHint k="2" label="" />
              </button>
              <div className="sp__search-bar">
                <span className="sp__search-icon">⌕</span>
                <input
                  className="sp__search-input"
                  type="text"
                  placeholder="Tìm số phiếu, tên..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && (
                  <button className="sp__search-clear" onClick={() => setSearch("")}>✕</button>
                )}
              </div>
            </div>

            {serviceOptions.length > 1 && (
              <div className="sp__service-pills">
                <button
                  className={`sp__pill ${serviceFilter === "" ? "sp__pill--active" : ""}`}
                  onClick={() => setServiceFilter("")}
                >
                  Tất cả
                  <span className="sp__pill-count">{allTickets.length}</span>
                </button>
                {serviceOptions.map(s => {
                  const cnt = allTickets.filter(t => t.serviceName === s).length;
                  return (
                    <button
                      key={s}
                      className={`sp__pill ${serviceFilter === s ? "sp__pill--active" : ""}`}
                      onClick={() => setServiceFilter(prev => prev === s ? "" : s)}
                    >
                      {s}
                      <span className={`sp__pill-count ${cnt > 5 ? "sp__pill-count--hot" : ""}`}>{cnt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="sp__table-wrap">
              <table className="sp__table">
                <thead>
                  <tr>
                    <th style={{ width: "6%" }}>#</th>
                    <th style={{ width: "16%" }}>Số phiếu</th>
                    <th style={{ width: "36%" }}>Họ và tên</th>
                    <th style={{ width: "30%" }}>Dịch vụ</th>
                    <th style={{ width: "12%" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {displayTickets.length > 0 ? (
                    displayTickets.map((ticket, index) => {
                      const rowId = ticket.id || (ticket as Ticket & { _id?: string })._id || "";
                      return (
                        <TicketRow
                          key={rowId}
                          ticket={ticket}
                          index={(safePage - 1) * PAGE_SIZE + index}
                          isRecall={activeTab === "recall"}
                          onCall={() => activeTab === "waiting" ? handleCallSpecific(ticket) : handleRecallSpecific(ticket)}
                          onNoteChange={handleTicketNoteChange}
                          onCopyToast={(msg) => showToast(msg, "success")}
                          isNoteOpen={openNoteTicketId === rowId}
                          onToggleNote={() => handleToggleNote(rowId)}
                        />
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="sp__empty">
                        {search || serviceFilter ? "Không tìm thấy kết quả" : activeTab === "waiting" ? "Không có vé chờ" : "Không có vé bỏ qua"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="sp__pagination">
                <button
                  className="sp__page-btn"
                  disabled={safePage === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >←</button>
                <div className="sp__page-nums">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(n => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
                    .reduce<(number | "...")[]>((acc, n, i, arr) => {
                      if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push("...");
                      acc.push(n);
                      return acc;
                    }, [])
                    .map((n, i) =>
                      n === "..."
                        ? <span key={"e" + i} className="sp__page-ellipsis">…</span>
                        : <button
                            key={n}
                            className={"sp__page-num" + (n === safePage ? " sp__page-num--active" : "")}
                            onClick={() => setPage(n as number)}
                          >{n}</button>
                    )
                  }
                </div>
                <button
                  className="sp__page-btn"
                  disabled={safePage === totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >→</button>
                <span className="sp__page-info">{filteredTickets.length} vé</span>
              </div>
            )}
          </section>

          {/* RIGHT — current + actions */}
          <aside className="sp__panel">
            <div className={`sp__current ${currentTicket ? "sp__current--active" : ""}`}>
              {currentTicket?.note && (
                <div className="sp__current-note">
                  <span className="sp__current-note-text">{currentTicket.note}</span>
                </div>
              )}
              {currentTicket ? (
                <>
                  <div className="sp__current-number">{getTicketDisplayNumber(currentTicket)}</div>
                  <div className="sp__current-meta">
                    <div className="sp__meta-card">
                      <span className="sp__meta-label">Đương sự</span>
                      <span className="sp__meta-val" title={currentTicket.customerName || undefined}>
                        {abbreviateName(currentTicket.customerName || "—")}
                      </span>
                    </div>
                    <div className="sp__meta-card">
                      <span className="sp__meta-label">Quầy</span>
                      <span className="sp__meta-val">{currentTicket.serviceName || "—"}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="sp__current-empty">
                  <div className="sp__current-empty-icon">○</div>
                  <div>Chờ gọi người tiếp theo</div>
                </div>
              )}
            </div>

            <div className="sp__actions">
              <div className="sp__actions-row">
                <ActionBtn label="Trả lại" sublabel="Về lại hàng" onClick={handleBackToWaiting} disabled={!currentTicket || activeTab === "recall"} variant="back" kbd="R" />
                <ActionBtn label={currentTicket ? "Gọi lại" : "Tiếp theo"} sublabel={currentTicket ? "Gọi lại vé này" : "gọi vé kế"} onClick={handleConfirmCallNext} variant="success" kbd="Space" />
              </div>
              <ActionBtn label="Hoàn thành" sublabel="Lưu và xong" onClick={handleComplete} disabled={!currentTicket} variant="primary" kbd="C" />
              <ActionBtn label="Bỏ qua" sublabel="Chuyển sang bỏ qua" onClick={handleSkip} disabled={!currentTicket} variant="warning" kbd="S" />
            </div>

            <div className="sp__hints">
              <KeyHint k="Space" label="Gọi" />
              <KeyHint k="C" label="Hoàn thành" />
              <KeyHint k="S" label="Bỏ qua" />
              <KeyHint k="R" label="Trả lại" />
            </div>
          </aside>
        </div>
      </div>

      <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} fields={confirmModal.fields} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(p => ({ ...p, isOpen: false }))} />
      <Toast isOpen={toast.isOpen} message={toast.message} type={toast.type} onClose={() => setToast(p => ({ ...p, isOpen: false }))} duration={3000} />


    </>
  );
}

/* ─── ticket row ── */
function TicketRow({ ticket, index, isRecall, onCall, onNoteChange, onCopyToast, isNoteOpen, onToggleNote }: {
  ticket: Ticket; index: number; isRecall: boolean;
  onCall: () => void;
  onNoteChange: (ticketId: string, note: string) => void;
  onCopyToast: (msg: string) => void;
  isNoteOpen: boolean;
  onToggleNote: () => void;
}) {
  const mins = useWaitMinutes((ticket as Ticket & { createdAt?: string }).createdAt);
  const [copied, setCopied] = useState(false);
  const [noteVal, setNoteVal] = useState(ticket.note || "");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const lastTicketIdRef = useRef<string | null>(null);

  useEffect(() => {
    const ticketId = ticket.id;
    if (ticketId !== lastTicketIdRef.current) {
      lastTicketIdRef.current = ticketId;
      setNoteVal(ticket.note || "");
      setNoteSaved(false);
    }
  }, [ticket.id, ticket.note]);

  // Khi dòng này được mở (vì dòng khác bị đóng lại), focus vào textarea
  useEffect(() => {
    if (isNoteOpen) {
      setNoteSaved(false);
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isNoteOpen]);

  // Click vào tên để copy
  const handleNameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!ticket.customerName) return;
    const doFeedback = () => {
      setCopied(true);
      onCopyToast(`Đã sao chép: ${ticket.customerName}`);
      setTimeout(() => setCopied(false), 1500);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(ticket.customerName).then(doFeedback).catch(() => {});
    } else {
      const el = document.createElement("textarea");
      el.value = ticket.customerName; el.style.position = "fixed"; el.style.opacity = "0";
      document.body.appendChild(el); el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      doFeedback();
    }
  };

  const handleNoteBtnClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleNote();
  };

  const saveNote = (val: string) => {
    setNoteSaving(true);
    setNoteSaved(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await updateTicketNoteApi(ticket.id, val);
        onNoteChange(ticket.id, val);
        setNoteSaved(true);
      } catch { /* silent */ } finally {
        setNoteSaving(false);
      }
    }, 700);
  };

  const handleNoteInput = (val: string) => {
    setNoteVal(val);
    setNoteSaved(false);
    saveNote(val);
  };

  const handleNoteClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNoteVal("");
    saveNote("");
  };

  const hasNote = (noteVal || "").trim().length > 0;

  return (
    <>
      <tr className={`sp__tr ${index === 0 ? "sp__tr--first" : ""} ${isNoteOpen ? "sp__tr--note-open" : ""}`}>
        <td className="sp__td sp__td--idx">{index + 1}</td>
        <td
          className="sp__td sp__td--num"
          style={{ color: mins >= 20 ? "var(--red)" : mins >= 10 ? "var(--orange)" : "var(--accent)" }}
          title={`Chờ ${mins} phút`}
        >
          {getTicketDisplayNumber(ticket)}
        </td>
        <td className="sp__td sp__td--name">
          {/* Click thẳng vào tên để copy, không cần nút riêng */}
          <span
            className={`sp__name-copy ${copied ? "sp__name-copy--copied" : ""} ${ticket.customerName ? "sp__name-copy--clickable" : ""}`}
            onClick={ticket.customerName ? handleNameClick : undefined}
            title={ticket.customerName ? "Nhấn để sao chép tên" : undefined}
          >
            {copied ? "✓ Đã sao chép" : (ticket.customerName || "—")}
          </span>
        </td>
        <td className="sp__td sp__td--service">
          <div className="sp__service-cell">
            <span className="sp__service-name">{ticket.serviceName || "—"}</span>
            <span className="sp__service-wait" style={{ color: getWaitColorVar(mins) }}>
              {formatWaitLabel(mins)}
            </span>
          </div>
        </td>
        <td className="sp__td sp__td--action">
          <div style={{ display: "flex", alignItems: "stretch", justifyContent: "flex-end", gap: 6 }}>
            <button
              onClick={handleNoteBtnClick}
              className={`sp__note-btn ${hasNote ? "sp__note-btn--has" : ""} ${isNoteOpen ? "sp__note-btn--open" : ""}`}
              title={hasNote ? `Ghi chú: ${noteVal}` : "Thêm ghi chú"}
            >
              ✎{hasNote && <span className="sp__note-dot" />}
            </button>
            <button onClick={onCall} className={`sp__call-btn ${isRecall ? "sp__call-btn--recall" : ""}`}>
              {isRecall ? "Gọi lại" : "Gọi"}
            </button>
          </div>
        </td>
      </tr>

      {isNoteOpen && (
        <tr className="sp__tr-note">
          <td colSpan={5} className="sp__td-note">
            <div className="sp__inline-note">
              <span className="sp__inline-note-label">Ghi chú — {getTicketDisplayNumber(ticket)}</span>
              <div className="sp__inline-note-row">
                <div className="sp__inline-textarea-wrap">
                  <textarea
                    ref={inputRef}
                    className="sp__inline-textarea"
                    placeholder="Vd: Thiếu CMND, hẹn thứ 6 tuần sau, chờ thẩm phán đóng dấu…"
                    value={noteVal}
                    onChange={e => handleNoteInput(e.target.value)}
                    maxLength={300}
                    rows={2}
                    onKeyDown={e => { if (e.key === "Escape") onToggleNote(); }}
                  />
                  {noteSaving && <span className="sp__note-status sp__note-status--saving">Đang lưu…</span>}
                  {!noteSaving && noteSaved && <span className="sp__note-status sp__note-status--saved">✓ Đã lưu</span>}
                </div>
                <div className="sp__inline-note-actions">
                  {hasNote && !noteSaving && (
                    <button className="sp__inline-clear" onClick={handleNoteClear} title="Xoá ghi chú">Xoá</button>
                  )}
                  <button className="sp__inline-close" onClick={onToggleNote}>Đóng</button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ─── CSS ── */
const CSS = `
  :root {
    --surface:    #ffffff;
    --surface2:   #f0f2f8;
    --border:     #c8cfe8;
    --border2:    #a8b4d8;
    --text1:      #1a1d2e;
    --text2:      #3a4060;
    --muted:      #7080a0;
    --accent:     #3b5bdb;
    --accent-bg:  #eef1fd;
    --accent2:    #2f4ac4;
    --green:      #2f9e44;
    --green-bg:   #ebfbee;
    --green-bdr:  #8ce99a;
    --orange:     #d9480f;
    --orange-bg:  #fff4e6;
    --orange-bdr: #ffc078;
    --red:        #e03131;
    --red-bg:     #fff5f5;
    --shadow-sm:  0 1px 4px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05);
    --shadow-md:  0 4px 14px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06);
    --radius:     10px;
    --font:       'DM Mono', 'Fira Code', 'Courier New', monospace;
    --font-sans:  'Inter', 'DM Sans', 'Segoe UI', system-ui, sans-serif;
  }
  * { box-sizing: border-box; }
  .sp {
    min-height: 100dvh; background: var(--bg); color: var(--text1);
    font-family: var(--font-sans); display: flex; flex-direction: column;
    gap: 10px; padding: 10px clamp(16px, 2.5vw, 36px) 20px;
  }
  .sp__topbar {
    flex-shrink: 0;
    background: var(--surface);
    border: 2px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
  }
  .sp__topbar-main {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 12px;
    min-height: 46px;
  }
  .sp__topbar-toggle {
    width: 30px;
    height: 30px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1.5px solid var(--border);
    border-radius: 7px;
    background: var(--surface2);
    color: var(--text2);
    cursor: pointer;
    font-size: 13px;
    line-height: 1;
    font-family: var(--font-sans);
    transition: background 0.15s, border-color 0.15s, color 0.15s;
  }
  .sp__topbar-toggle:hover {
    background: var(--accent-bg);
    border-color: #a8b8f0;
    color: var(--accent);
  }
  .sp__topbar-info {
    flex: 1;
    min-width: 0;
  }
  .sp__topbar-details {
    max-height: 0;
    opacity: 0;
    overflow: hidden;
    padding: 0 14px;
    transition: max-height 0.28s ease, opacity 0.22s ease, padding 0.28s ease;
  }
  /* ── FIX: thêm padding-top để nội dung không dính sát viền trên,
     tăng max-height để không bị cắt khi nhiều dịch vụ bị giới hạn ── */
  .sp__topbar--expanded .sp__topbar-details {
    max-height: 220px;
    opacity: 1;
    padding: 14px 14px 16px 52px;
    border-top: 1px solid var(--border);
  }
  .sp__identity { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
  .sp__avatar {
    width: 42px; height: 42px; border-radius: 50%;
    background: var(--accent-bg); border: 2px solid #a8b8f0;
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 18px; color: var(--accent); flex-shrink: 0;
  }
  .sp__avatar--compact {
    width: 34px;
    height: 34px;
    font-size: 15px;
  }
  .sp__greeting {
    font-size: 11px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: .06em;
    font-weight: 600;
    margin-bottom: 10px; /* FIX: tăng từ 6px để tách rõ khỏi badge "Giới hạn" phía dưới */
  }
  .sp__name { font-size: 18px; font-weight: 800; color: var(--text1); line-height: 1.2; }
  .sp__name--compact { font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sp__restrict-summary {
    margin-top: 2px;
    font-size: 11px;
    font-weight: 700;
    color: var(--orange);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sp__restrict-badge {
    display: inline-flex; align-items: center; gap: 7px;
    background: var(--orange-bg); border: 2px solid var(--orange-bdr);
    border-radius: 99px; padding: 5px 14px; font-size: 13px; color: var(--orange);
    flex-wrap: wrap; font-weight: 700;
  }
  .sp__restrict-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--orange); flex-shrink: 0; }
  .sp__service-tag { background: #ffe8d6; border-radius: 99px; padding: 2px 10px; font-size: 12px; color: var(--orange); font-weight: 700; }
  .sp__topbar-right { display: flex; align-items: center; gap: 8px; margin-left: auto; flex-shrink: 0; }
  .sp__socket {
    display: inline-flex; align-items: center; gap: 6px;
    border-radius: 99px; padding: 5px 12px; font-size: 13px; font-weight: 700;
  }
  .sp__socket--ok  { background: var(--green-bg);  border: 2px solid var(--green-bdr); color: var(--green); }
  .sp__socket--err { background: var(--red-bg);    border: 2px solid #ffc9c9;          color: var(--red); }
  .sp__socket-dot  { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .sp__socket--ok  .sp__socket-dot { background: var(--green); animation: blink 1.8s ease-in-out infinite; }
  .sp__socket--err .sp__socket-dot { background: var(--red); }
  .sp__tts {
    display: inline-flex; align-items: center; gap: 7px;
    border-radius: 8px; padding: 7px 14px; font-size: 14px; font-weight: 700; border: 2px solid;
  }
  .sp__tts--on  { background: var(--green-bg);  border-color: var(--green-bdr); color: var(--green); }
  .sp__tts--off { background: var(--red-bg);    border-color: #ffc9c9;          color: var(--red); }
  .sp__logout {
    padding: 7px 14px; background: var(--red); color: #fff;
    border: 2px solid var(--red); border-radius: 8px; cursor: pointer;
    font-weight: 800; font-size: 13px; font-family: var(--font-sans); transition: opacity .15s;
    white-space: nowrap;
  }
  .sp__logout:hover { opacity: .85; }
  .sp__stats { display: flex; gap: 8px; flex-wrap: wrap; }
  .sp__grid { display: grid; grid-template-columns: 1fr 440px; gap: 16px; flex: 1; min-height: 0; align-items: start; }
  .sp__queue {
    background: var(--surface); border: 2px solid var(--border);
    border-radius: var(--radius); display: flex; flex-direction: column;
    overflow: hidden; box-shadow: var(--shadow-sm);
  }
  .sp__tabs { display: flex; align-items: stretch; border-bottom: 2px solid var(--border); background: var(--surface); }
  .sp__tab {
    display: flex; align-items: center; gap: 8px; padding: 15px 24px;
    font-size: 15px; font-weight: 700; color: var(--muted);
    background: transparent; border: none; cursor: pointer; font-family: var(--font-sans);
    border-bottom: 3px solid transparent; margin-bottom: -2px; transition: color .15s;
  }
  .sp__tab:hover { color: var(--text2); }
  .sp__tab--active { color: var(--accent); border-bottom-color: var(--accent); }
  .sp__tab--recall.sp__tab--active { color: var(--orange); border-bottom-color: var(--orange); }
  .sp__tab-count {
    background: var(--surface2); border: 1.5px solid var(--border);
    border-radius: 99px; padding: 2px 10px; font-size: 13px;
    min-width: 30px; text-align: center; color: var(--text2); font-weight: 700;
  }
  .sp__tab-count--warn { background: var(--orange-bg); border-color: var(--orange-bdr); color: var(--orange); }
  .sp__table-wrap { overflow-y: auto; flex: 1; }
  .sp__table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 15px; }
  .sp__table thead tr { background: var(--surface2); position: sticky; top: 0; z-index: 1; }
  .sp__table th {
    padding: 11px 14px; text-align: left; font-size: 12px; font-weight: 800;
    color: var(--text2); text-transform: uppercase; letter-spacing: .07em;
    border-bottom: 2px solid var(--border);
  }
  .sp__tr { border-bottom: 1.5px solid var(--border); transition: background .1s; }
  .sp__tr:hover { background: var(--surface2); }
  .sp__tr--first { background: var(--accent-bg); }
  .sp__tr--first:hover { background: #e4e9fb; }
  .sp__td { padding: 13px 14px; color: var(--text2); vertical-align: middle; }
  .sp__td--idx     { color: var(--muted); font-size: 13px; font-weight: 600; }
  .sp__td--num     { font-weight: 800; font-family: var(--font); font-size: 17px; transition: color .2s; }
  .sp__td--name    { color: var(--text1); font-weight: 600; overflow: visible; }
  .sp__td--service { font-size: 14px; overflow: hidden; font-weight: 500; }
  .sp__td--action  { text-align: right; }

  /* dịch vụ + thời gian chờ (2 dòng) */
  .sp__service-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .sp__service-name {
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    color: var(--text2);
    font-weight: 700;
  }
  .sp__service-wait {
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: .01em;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

  /* click-to-copy name */
  .sp__name-copy {
    display: inline-block;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    max-width: 100%;
    border-radius: 4px;
    transition: background .12s, color .12s;
  }
  .sp__name-copy--clickable {
    cursor: pointer;
    padding: 2px 6px;
    margin: -2px -6px;
  }
  .sp__name-copy--clickable:hover {
    background: var(--accent-bg);
    color: var(--accent);
  }
  .sp__name-copy--copied {
    background: var(--green-bg) !important;
    color: var(--green) !important;
    font-weight: 700;
  }

  .sp__search-bar {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 14px; margin-left: auto;
    border-bottom: 2px solid transparent;
  }
  .sp__search-icon { font-size: 17px; color: var(--muted); flex-shrink: 0; line-height: 1; opacity: 0.7; }
  .sp__search-input {
    flex: 1; border: none; outline: none; font-size: 13px;
    color: var(--text2); background: transparent; font-family: var(--font-sans); font-weight: 500;
    width: 160px;
  }
  .sp__search-input::placeholder { color: var(--muted); opacity: 0.75; }
  .sp__search-clear {
    background: none; border: none; cursor: pointer; color: var(--muted);
    font-size: 14px; padding: 2px 6px; border-radius: 4px; line-height: 1;
    transition: color .15s, background .15s; font-weight: 700;
  }
  .sp__search-clear:hover { color: var(--text2); background: var(--surface2); }
  .sp__service-pills {
    display: flex; flex-wrap: wrap; gap: 6px;
    padding: 9px 14px 11px;
    border-bottom: 2px solid var(--border);
    background: var(--surface);
  }
  .sp__pill {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 12px; border-radius: 99px; cursor: pointer;
    font-size: 13px; font-weight: 700; font-family: var(--font-sans);
    border: 1.5px solid var(--border2); background: var(--surface2);
    color: var(--text2); transition: all .15s; white-space: nowrap;
  }
  .sp__pill:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-bg); }
  .sp__pill--active { background: var(--accent-bg); border-color: #a8b8f0; color: var(--accent); }
  .sp__pill-count {
    background: var(--border); border-radius: 99px;
    padding: 1px 8px; font-size: 12px; font-weight: 800; color: var(--text2);
    min-width: 22px; text-align: center;
  }
  .sp__pill--active .sp__pill-count { background: #a8b8f0; color: var(--accent2); }
  .sp__pill-count--hot { background: #ffd8a8 !important; color: var(--orange) !important; }
  .sp__empty { padding: 52px; text-align: center; color: var(--muted); font-style: italic; font-size: 15px; }
  .sp__pagination {
    display: flex; align-items: center; gap: 6px;
    padding: 10px 14px; border-top: 2px solid var(--border);
    background: var(--surface); flex-wrap: wrap;
  }
  .sp__page-btn {
    width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
    border: 1.5px solid var(--border); border-radius: 6px; background: var(--surface);
    color: var(--text2); font-size: 14px; cursor: pointer; transition: all .15s;
    font-family: var(--font-sans); font-weight: 700;
  }
  .sp__page-btn:disabled { color: var(--muted); cursor: not-allowed; opacity: .5; }
  .sp__page-btn:not(:disabled):hover { background: var(--surface2); border-color: var(--border2); }
  .sp__page-nums { display: flex; align-items: center; gap: 4px; }
  .sp__page-num {
    min-width: 32px; height: 32px; padding: 0 6px;
    display: flex; align-items: center; justify-content: center;
    border: 1.5px solid var(--border); border-radius: 6px; background: var(--surface);
    color: var(--text2); font-size: 14px; cursor: pointer; transition: all .15s;
    font-family: var(--font-sans); font-weight: 600;
  }
  .sp__page-num:hover { background: var(--surface2); border-color: var(--border2); }
  .sp__page-num--active { background: var(--accent-bg); border-color: #a8b8f0; color: var(--accent); font-weight: 800; }
  .sp__page-ellipsis { color: var(--muted); font-size: 14px; padding: 0 2px; }
  .sp__page-info { margin-left: auto; font-size: 13px; color: var(--muted); font-weight: 600; }
  .sp__call-btn {
    padding: 9px 28px; background: var(--accent-bg); color: var(--accent2);
    border: 1.5px solid #a8b8f0; border-radius: 7px; cursor: pointer;
    font-weight: 800; font-size: 14px; font-family: var(--font-sans);
    transition: background .15s, border-color .15s; white-space: nowrap;
    display: inline-block;
  }
  .sp__call-btn:hover { background: #dde3fb; border-color: var(--accent2); }
  .sp__call-btn--recall { background: var(--orange-bg); color: var(--orange); border-color: var(--orange-bdr); }
  .sp__call-btn--recall:hover { background: #ffe0c2; }
  .sp__panel { display: flex; flex-direction: column; gap: 12px; }

  /* ── current ticket card — chiều cao cố định để không nhảy khi có/không có vé ── */
  .sp__current {
    background: var(--surface); border: 2px solid var(--border);
    border-radius: var(--radius); padding: 20px; flex-shrink: 0;
    box-shadow: var(--shadow-sm); transition: border-color .3s, box-shadow .3s;
    display: flex; flex-direction: column; justify-content: center;
    min-height: 290px;
  }
  .sp__current--active { border-color: var(--accent); border-width: 2.5px; box-shadow: 0 0 0 4px var(--accent-bg), var(--shadow-md); }

  .sp__current-number {
    font-family: var(--font);
    font-size: clamp(110px, 13vw, 160px);
    font-weight: 800;
    color: var(--accent);
    letter-spacing: -5px;
    line-height: 1;
    text-align: center;
    margin-bottom: 18px;
    padding: 4px 0;
  }

  .sp__current-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .sp__meta-card {
    background: var(--surface2);
    border: 1.5px solid var(--border);
    border-radius: 10px;
    padding: 12px 14px;
    display: flex; flex-direction: column; gap: 5px;
    overflow: hidden;
  }
  .sp__meta-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .07em; font-weight: 700; }
  .sp__meta-val { font-size: 17px; color: var(--text1); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .sp__current-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: var(--muted); font-size: 17px; text-align: center; font-weight: 500; flex: 1; }
  .sp__current-empty-icon { font-size: 54px; opacity: .2; }

  .sp__actions { display: flex; flex-direction: column; gap: 10px; }
  .sp__actions-row { display: flex; gap: 10px; }
  .sp__hints {
    display: flex; flex-wrap: wrap; gap: 10px;
    background: var(--surface2); border: 1.5px solid var(--border);
    border-radius: var(--radius); padding: 12px 14px;
  }
  .sp-loading {
    min-height: 100dvh; display: flex; align-items: center; justify-content: center;
    flex-direction: column; gap: 16px; background: var(--bg); color: var(--text2);
    font-family: var(--font-sans);
  }
  .sp-loading__spinner { width: 38px; height: 38px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin .8s linear infinite; }
  .sp__note-btn {
    width: 36px; border-radius: 7px; border: 1.5px solid var(--border);
    background: var(--surface2); color: var(--muted); cursor: pointer;
    font-size: 15px; display: inline-flex; align-items: center; justify-content: center;
    position: relative; transition: all .15s; flex-shrink: 0;
  }
  .sp__note-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-bg); }
  .sp__note-btn--has  { border-color: #f0c060; color: #b07800; background: #fffbe6; }
  .sp__note-btn--has:hover { border-color: #d4a017; background: #fff3cd; }
  .sp__note-btn--open { border-color: var(--accent); color: var(--accent); background: var(--accent-bg); }
  .sp__note-dot {
    position: absolute; top: 3px; right: 3px;
    width: 6px; height: 6px; border-radius: 50%;
    background: #e8a000; border: 1.5px solid #fff;
  }
  .sp__tr--note-open { background: var(--accent-bg) !important; }
  .sp__tr-note { background: #f6f8ff; }
  .sp__tr-note:hover { background: #f6f8ff; }
  .sp__td-note { padding: 0 14px 12px 14px !important; border-bottom: 2px solid #c0cff0; }
  .sp__inline-note { padding-top: 10px; }
  .sp__inline-note-label {
    display: block; font-size: 11px; font-weight: 800; color: var(--accent);
    text-transform: uppercase; letter-spacing: .08em; margin-bottom: 8px;
  }
  .sp__inline-note-row { display: flex; gap: 10px; align-items: stretch; }
  .sp__inline-textarea-wrap { flex: 1; position: relative; display: flex; flex-direction: column; }
  .sp__inline-textarea {
    width: 100%; height: 100%; border: 1.5px solid #a8c0f0; border-radius: 8px;
    padding: 8px 12px; resize: none; font-size: 14px; line-height: 1.5;
    color: var(--text1); background: #fff; font-family: var(--font-sans);
    outline: none; transition: border-color .15s; display: block;
  }
  .sp__inline-textarea:focus { border-color: var(--accent); }
  .sp__inline-textarea::placeholder { color: var(--muted); font-style: italic; }
  .sp__inline-note-actions {
    display: flex; flex-direction: column; gap: 6px; align-items: stretch; flex-shrink: 0; align-self: stretch;
  }
  .sp__note-status {
    position: absolute; bottom: 8px; right: 8px;
    font-size: 11px; font-weight: 700; border-radius: 99px;
    padding: 2px 8px; white-space: nowrap; pointer-events: none;
  }
  .sp__note-status--saving { background: var(--surface2); color: var(--muted); }
  .sp__note-status--saved  { background: var(--green-bg); color: var(--green); }
  .sp__inline-clear {
    flex: 1; padding: 6px 12px; background: var(--red-bg); color: var(--red);
    border: 1.5px solid #ffc9c9; border-radius: 7px; cursor: pointer;
    font-size: 13px; font-weight: 700; font-family: var(--font-sans); transition: all .15s;
  }
  .sp__inline-clear:hover { background: #ffe0e0; }
  .sp__inline-close {
    flex: 1; padding: 6px 12px; background: var(--surface2); color: var(--text2);
    border: 1.5px solid var(--border); border-radius: 7px; cursor: pointer;
    font-size: 13px; font-weight: 700; font-family: var(--font-sans); transition: all .15s;
  }
  .sp__inline-close:hover { background: var(--border); }
  .sp__current-note {
    display: inline-flex; align-items: center; gap: 5px;
    background: #fffbe6; border: 1.5px solid #f0c060;
    border-radius: 99px; padding: 3px 12px;
    max-width: 100%;
    align-self: center;
    margin-bottom: 12px;
  }
  .sp__current-note-icon { font-size: 11px; color: #b07800; flex-shrink: 0; }
  .sp__current-note-text {
    font-size: 12px; color: #7a5000; font-weight: 700;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  @keyframes blink     { 0%,100%{opacity:1;} 50%{opacity:.3;} }
  @keyframes spin      { to{transform:rotate(360deg);} }
  @media (max-width: 1100px) {
    .sp__grid { grid-template-columns: 1fr; }
    .sp__panel { flex-direction: row; flex-wrap: wrap; }
    .sp__current { flex: 1 1 300px; }
    .sp__actions { flex: 1 1 260px; }
    .sp__hints { width: 100%; }
  }
  @media (max-width: 640px) {
    .sp__stats { gap: 8px; }
    .sp__panel { flex-direction: column; }
    .sp__actions-row { flex-direction: column; }
    .sp__current-meta { grid-template-columns: 1fr 1fr; }
  }
`;