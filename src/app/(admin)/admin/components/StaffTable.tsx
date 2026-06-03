"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FiEdit2, FiSearch, FiTrash2, FiX } from "react-icons/fi";
import { FiRepeat } from "react-icons/fi";
import { TbPlus, TbUsers } from "react-icons/tb";
import {
  assignCounterToStaff,
  Counter,
  createStaff,
  deleteStaff,
  getCounters,
  getServices,
  getStaff,
  Service,
  Staff,
  StaffServiceInfo,
  updateStaff,
  updateStaffServices,
} from "@/services/admin.service";
import { useToast } from "@/hooks/useToast";
import { useAdminSessionGuard } from "@/hooks/useAdminSessionGuard";
import ToastContainer from "@/components/ToastContainer";
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog";
import Pagination from "./Pagination";
import AdminTableFilter from "./AdminTableFilter";
import { getSequentialTagColorStyle } from "@/lib/adminTagColors";

/* ─────────────────────────────────────────────────────── */
/* Design tokens                                           */
/* ─────────────────────────────────────────────────────── */

const C = {
  navy: "#0f2544",
  navyHover: "#17345f",
  white: "#ffffff",
  gray50: "#f8fafc",
  gray100: "#f1f5f9",
  gray200: "#e2e8f0",
  gray300: "#cbd5e1",
  gray400: "#94a3b8",
  gray500: "#64748b",
  gray700: "#334155",
  gray900: "#0f172a",
  border: "#edf2f7",
  blue: "#2563eb",
  blueSoft: "#f5f8ff",
  blueText: "#1d4ed8",
  green: "#16a34a",
  greenSoft: "#f0fdf4",
  greenText: "#166534",
  red: "#dc2626",
  redSoft: "#fff5f5",
  redText: "#991b1b",
  amber: "#d97706",
  amberSoft: "#fffbeb",
  amberText: "#92400e",
} as const;

/* ─────────────────────────────────────────────────────── */
/* Grid layout                                             */
/* ─────────────────────────────────────────────────────── */

const GRID_TEMPLATE =
  "44px minmax(120px,.8fr) minmax(140px,1fr) minmax(140px,1fr) minmax(200px,1.8fr) minmax(100px,.7fr) minmax(130px,.9fr) 100px";

/* ─────────────────────────────────────────────────────── */
/* Shared form-field helpers                               */
/* ─────────────────────────────────────────────────────── */

const field: React.CSSProperties = {
  width: "100%",
  height: 42,
  padding: "0 14px",
  borderRadius: 12,
  border: `1px solid ${C.gray200}`,
  background: C.white,
  outline: "none",
  fontSize: 13,
  color: C.gray900,
  transition: "all .15s ease",
  boxSizing: "border-box",
};

const focusField = (
  e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
) => {
  e.target.style.borderColor = "#bfdbfe";
  e.target.style.boxShadow = "0 0 0 4px rgba(37,99,235,.08)";
};

const blurField = (
  e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
) => {
  e.target.style.borderColor = C.gray200;
  e.target.style.boxShadow = "none";
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      marginBottom: 8,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: ".06em",
      textTransform: "uppercase",
      color: C.gray400,
    }}
  >
    {children}
  </div>
);

/* ─────────────────────────────────────────────────────── */
/* Error parser                                            */
/* ─────────────────────────────────────────────────────── */

type ApiErrorShape = {
  response?: { data?: { errors?: Record<string, string | { message?: string }>; message?: string } };
  message?: string;
};

const parseApiError = (err: unknown): string => {
  const e = err as ApiErrorShape;
  const data = e?.response?.data;
  if (!data) return e?.message || "Lỗi không xác định";
  if (data.errors) {
    const first = data.errors[Object.keys(data.errors)[0]];
    if (typeof first === "string") return first;
    if (first?.message) return first.message;
  }
  return data.message || "Lỗi không xác định";
};

type StaffTableService = StaffServiceInfo & { _id: string; id?: string };

/* ─────────────────────────────────────────────────────── */
/* Component                                               */
/* ─────────────────────────────────────────────────────── */

export default function StaffTable() {
  const { toasts, removeToast, success, error } = useToast();
  const guardSession = useAdminSessionGuard();

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [counters, setCounters] = useState<Counter[]>([]);
  const [allServicesFull, setAllServicesFull] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCounterIds, setFilterCounterIds] = useState<string[]>(["all"]);
  const [filterServiceIds, setFilterServiceIds] = useState<string[]>(["all"]);
  const [filterStatuses, setFilterStatuses] = useState<string[]>(["all"]);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceModalStaff, setServiceModalStaff] = useState<Staff | null>(null);
  const [availableServices, setAvailableServices] = useState<StaffServiceInfo[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [serviceModalLoading, setServiceModalLoading] = useState(false);
  const [serviceModalSaving, setServiceModalSaving] = useState(false);
  const [serviceRestrictionConfigured, setServiceRestrictionConfigured] = useState(false);

  const [formAvailableServices, setFormAvailableServices] = useState<StaffServiceInfo[]>([]);
  const [formSelectedServiceIds, setFormSelectedServiceIds] = useState<Set<string>>(new Set());

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    fullName: "",
    counterId: null as string | null,
    isActive: true,
  });

  /* ── Fetch ── */

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getStaff();
      setStaffList(data);
    } catch (err) {
      if (guardSession(err)) return;
      error("Không thể tải danh sách nhân viên");
    } finally {
      setLoading(false);
    }
  }, [error, guardSession]);

  const fetchCounters = useCallback(async () => {
    try {
      const data = await getCounters();
      setCounters(data);
    } catch (err) {
      if (guardSession(err)) return;
      error("Không thể tải danh sách phòng");
    }
  }, [error, guardSession]);

  const fetchServices = useCallback(async () => {
    try {
      const data = await getServices();
      setAllServicesFull(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    void fetchStaff();
    void fetchCounters();
    void fetchServices();
  }, [fetchStaff, fetchCounters, fetchServices]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCounterIds, filterServiceIds, filterStatuses]);

  /* ── Helpers ── */

  const mapCounterServices = (counterId: string | null) => {
    const counterServices =
      counters.find((c) => c._id === (counterId || ""))?.services || [];
    return counterServices.map((s) => {
      const full = allServicesFull.find((f) => f._id === s._id);
      return { id: s._id, _id: s._id, code: s.code, name: s.name, icon: s.icon, displayOrder: s.displayOrder, isActive: full?.isActive ?? s.isActive };
    });
  };

  /* ── Modal ── */

  const handleOpenModal = (staff?: Staff) => {
    if (staff) {
      const avail = mapCounterServices(staff.counterId?._id || null);
      const selected =
        staff.serviceRestrictionConfigured && staff.assignedServices
          ? new Set(staff.assignedServices.map((s) => s.id || s._id))
          : new Set(avail.map((s) => s.id || s._id));
      setEditingId(staff._id);
      setFormData({
        username: staff.username,
        password: "",
        fullName: staff.fullName,
        counterId: staff.counterId?._id || null,
        isActive: staff.isActive,
      });
      setFormAvailableServices(avail);
      setFormSelectedServiceIds(selected);
    } else {
      setEditingId(null);
      setFormData({ username: "", password: "", fullName: "", counterId: null, isActive: true });
      setFormAvailableServices([]);
      setFormSelectedServiceIds(new Set());
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormAvailableServices([]);
    setFormSelectedServiceIds(new Set());
  };

  const handleFormCounterChange = (counterId: string | null) => {
    const avail = mapCounterServices(counterId);
    setFormData((prev) => ({ ...prev, counterId }));
    setFormAvailableServices(avail);
    setFormSelectedServiceIds(new Set(avail.map((s) => s.id || s._id)));
  };

  const handleToggleFormService = (id: string) => {
    setFormSelectedServiceIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* ── Save ── */

  const handleSave = async () => {
    if (!formData.username || !formData.fullName) {
      error("Vui lòng nhập tên đăng nhập và họ tên");
      return;
    }
    if (!editingId && !formData.password) {
      error("Vui lòng nhập mật khẩu cho nhân viên mới");
      return;
    }
    const prevCounterId = editingId
      ? staffList.find((s) => s._id === editingId)?.counterId?._id ?? null
      : null;
    try {
      let saved: Staff;
      if (editingId) {
        if (formData.counterId && formData.counterId !== prevCounterId)
          await assignCounterToStaff(editingId, formData.counterId);
        saved = await updateStaff(editingId, {
          fullName: formData.fullName,
          isActive: formData.isActive,
          password: formData.password || undefined,
          counterId: formData.counterId,
        });
        if (formData.counterId)
          await updateStaffServices(saved._id, Array.from(formSelectedServiceIds));
        success("Cập nhật nhân viên thành công");
      } else {
        saved = await createStaff({ username: formData.username, password: formData.password, fullName: formData.fullName });
        if (formData.counterId) {
          await assignCounterToStaff(saved._id, formData.counterId);
          if (formSelectedServiceIds.size > 0)
            await updateStaffServices(saved._id, Array.from(formSelectedServiceIds));
        }
        success("Tạo nhân viên thành công");
      }
    } catch (err) {
      await fetchStaff();
      error(parseApiError(err));
      return;
    }
    handleCloseModal();
    await fetchStaff();
  };

  /* ── Delete ── */

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await deleteStaff(pendingDeleteId);
      success("Xóa nhân viên thành công");
      await fetchStaff();
    } catch (err) {
      error(err instanceof Error ? err.message : "Xóa nhân viên thất bại");
    } finally {
      setShowDeleteConfirm(false);
      setPendingDeleteId(null);
    }
  };

  /* ── Service modal ── */

  const handleOpenServiceModal = async (staff: Staff) => {
    setServiceModalStaff(staff);
    setShowServiceModal(true);
    setServiceModalLoading(true);
    try {
      const avail = mapCounterServices(staff.counterId?._id || null);
      const selected =
        staff.serviceRestrictionConfigured && staff.assignedServices
          ? new Set(staff.assignedServices.map((s) => s.id || s._id))
          : new Set(avail.map((s) => s.id || s._id));
      setAvailableServices(avail);
      setSelectedServiceIds(selected);
      setServiceRestrictionConfigured(Boolean(staff.serviceRestrictionConfigured));
    } catch (err) {
      error(err instanceof Error ? err.message : "Lỗi tải quầy");
      setShowServiceModal(false);
    } finally {
      setServiceModalLoading(false);
    }
  };

  const handleToggleService = (id: string) => {
    setSelectedServiceIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSaveServices = async () => {
    if (!serviceModalStaff) return;
    setServiceModalSaving(true);
    try {
      await updateStaffServices(serviceModalStaff._id, Array.from(selectedServiceIds));
      success("Cập nhật quầy thành công");
      setShowServiceModal(false);
      await fetchStaff();
    } catch (err) {
      error(err instanceof Error ? err.message : "Lỗi lưu quầy");
    } finally {
      setServiceModalSaving(false);
    }
  };

  /* ── Derived ── */

  const allServices = useMemo(() => {
    const map = new Map<string, StaffTableService>();
    counters.forEach((c) => c.services?.forEach((s) => map.set(s._id, s as StaffTableService)));
    return Array.from(map.values()).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [counters]);

  const serviceColorMap = useMemo(() => {
    const m = new Map<string, ReturnType<typeof getSequentialTagColorStyle>>();
    allServices.forEach((s, i) => {
      const color = getSequentialTagColorStyle(i);
      if (s._id) m.set(s._id, color);
      if (s.id) m.set(s.id, color);
    });
    return m;
  }, [allServices]);

  const filteredStaff = staffList.filter((staff) => {
    const q = searchTerm.toLowerCase();
    return (
      (staff.username.toLowerCase().includes(q) || staff.fullName.toLowerCase().includes(q)) &&
      (filterCounterIds.includes("all") ||
        (filterCounterIds.includes("unassigned") && !staff.counterId) ||
        (staff.counterId && filterCounterIds.includes(staff.counterId._id))) &&
      (filterServiceIds.includes("all") ||
        (filterServiceIds.includes("unassigned") && (!staff.effectiveServices || staff.effectiveServices.length === 0)) ||
        (staff.effectiveServices && staff.effectiveServices.some((s) => filterServiceIds.includes(s.id || s._id)))) &&
      (filterStatuses.includes("all") ||
        (filterStatuses.includes("active") && staff.isActive) ||
        (filterStatuses.includes("inactive") && !staff.isActive))
    );
  });

  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
  const currentItems = filteredStaff.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getCounterDisplay = (staff: Staff) => {
    if (!staff.counterId) return null;
    const matched = counters.find((c) => c._id === staff.counterId?._id);
    const code = staff.counterId.code || matched?.code || "";
    return `${staff.counterId.name}${code ? ` (${code})` : ""}`;
  };

  /* ─────────────────────────────────────────────────────── */
  /* Render                                                  */
  /* ─────────────────────────────────────────────────────── */

  return (
    <div>
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />

      {/* ── CARD ── */}
      <div
        style={{
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: 26,
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {/* ── HEADER ── */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {/* Left */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                background: C.navy,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <TbUsers size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.gray900 }}>Quản lý nhân viên</div>
              <div style={{ marginTop: 3, fontSize: 12, color: C.gray400 }}>{staffList.length} nhân viên</div>
            </div>
          </div>

          {/* Right */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <AdminTableFilter
              activeCount={
                (filterCounterIds.includes("all") ? 0 : filterCounterIds.length) +
                (filterServiceIds.includes("all") ? 0 : filterServiceIds.length) +
                (filterStatuses.includes("all") ? 0 : filterStatuses.length)
              }
              onReset={() => {
                setFilterCounterIds(["all"]);
                setFilterServiceIds(["all"]);
                setFilterStatuses(["all"]);
              }}
              sections={[
                {
                  id: "staff-counter",
                  label: "Phòng trực",
                  value: filterCounterIds,
                  onChange: setFilterCounterIds,
                  options: [
                    { label: "Tất cả phòng", value: "all" },
                    { label: "Chưa gán phòng", value: "unassigned" },
                    ...[...counters]
                      .sort((a, b) => a.number - b.number)
                      .map((c) => ({ label: `${c.name} (${c.code})`, value: c._id })),
                  ],
                },
                {
                  id: "staff-service",
                  label: "Quầy trực",
                  value: filterServiceIds,
                  onChange: setFilterServiceIds,
                  options: [
                    { label: "Tất cả quầy", value: "all" },
                    { label: "Không có quầy", value: "unassigned" },
                    ...allServices.map((s) => ({ label: `${s.name} (${s.code})`, value: s._id })),
                  ],
                },
                {
                  id: "staff-status",
                  label: "Trạng thái",
                  value: filterStatuses,
                  onChange: setFilterStatuses,
                  options: [
                    { label: "Tất cả trạng thái", value: "all" },
                    { label: "Hoạt động", value: "active" },
                    { label: "Vô hiệu", value: "inactive" },
                  ],
                },
              ]}
            />

            {/* Search */}
            <div
              style={{
                height: 38,
                width: "clamp(160px, 20vw, 240px)",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "0 12px",
                background: C.gray50,
                border: `1px solid transparent`,
                borderRadius: 12,
              }}
            >
              <FiSearch size={15} style={{ color: C.gray400, flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Tìm kiếm nhân viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: 13,
                  color: C.gray900,
                }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  style={{ border: "none", background: "none", cursor: "pointer", padding: 0, display: "flex", color: C.gray400 }}
                >
                  <FiX size={14} />
                </button>
              )}
            </div>

            {/* Add button */}
            <button
              onClick={() => handleOpenModal()}
              style={{
                height: 38,
                padding: "0 16px",
                border: "none",
                borderRadius: 12,
                background: C.navy,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all .15s ease",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.navyHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = C.navy; }}
            >
              <TbPlus size={16} />
              Thêm mới
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div style={{ padding: 22, overflowX: "auto" }}>
          {loading ? (
            <div style={{ padding: "60px 0", textAlign: "center", fontSize: 14, color: C.gray400 }}>
              Đang tải dữ liệu...
            </div>
          ) : filteredStaff.length === 0 ? (
            <div style={{ padding: "60px 0", textAlign: "center" }}>
              <TbUsers size={42} style={{ color: C.gray200, marginBottom: 12 }} />
              <div style={{ fontSize: 14, color: C.gray400 }}>Không có nhân viên nào</div>
              <div style={{ marginTop: 6, fontSize: 12, color: C.gray300 }}>
                Nhấn &quot;Thêm mới&quot; để tạo nhân viên đầu tiên
              </div>
            </div>
          ) : (
            <>
              {/* Column headers */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: GRID_TEMPLATE,
                  alignItems: "center",
                  padding: "0 18px 12px",
                  columnGap: 16,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  color: C.gray400,
                  minWidth: 900,
                }}
              >
                <div style={{ textAlign: "center" }}>TT</div>
                <div>Tên đăng nhập</div>
                <div>Họ và tên</div>
                <div>Phòng trực</div>
                <div>Quầy trực</div>
                <div>Trạng thái</div>
                <div>Đăng nhập</div>
                <div>Hành động</div>
              </div>

              {/* Rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {currentItems.map((staff, rowIndex) => (
                  <div
                    key={staff._id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: GRID_TEMPLATE,
                      alignItems: "center",
                      columnGap: 16,
                      minHeight: 68,
                      minWidth: 900,
                      padding: "12px 18px",
                      border: `1px solid ${C.border}`,
                      borderRadius: 20,
                      background: C.white,
                      transition: "all .15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#dbe4f0";
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow = "0 8px 20px rgba(15,23,42,.04)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = C.border;
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {/* TT */}
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.gray400, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {(currentPage - 1) * itemsPerPage + rowIndex + 1}
                    </div>

                    {/* Tên đăng nhập */}
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: "50%",
                          background: C.navy,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#fff",
                          flexShrink: 0,
                        }}
                      >
                        {staff.username?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: C.gray700 }}>
                        {staff.username}
                      </span>
                    </div>

                    {/* Họ và tên */}
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.gray900, lineHeight: 1.3 }}>
                      {staff.fullName || (
                        <span style={{ color: C.gray400, fontStyle: "italic", fontWeight: 400 }}>Chưa cập nhật</span>
                      )}
                    </div>

                    {/* Phòng trực */}
                    <div style={{ display: "flex", alignItems: "center" }}>
                      {staff.counterId ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            height: 26,
                            padding: "0 10px",
                            borderRadius: 999,
                            fontSize: 11.5,
                            fontWeight: 600,
                            background: "#e0e7ff",
                            color: "#3730a3",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {getCounterDisplay(staff)}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: C.gray400, fontStyle: "italic" }}>— Chưa gán —</span>
                      )}
                    </div>

                    {/* Quầy trực */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {staff.effectiveServices && staff.effectiveServices.length > 0 ? (
                        staff.effectiveServices.map((s) => {
                          const sid = s.id || s._id;
                          const colors = serviceColorMap.get(sid) || { background: "#dbeafe", border: "#2563eb", color: "#1e3a8a" };
                          return (
                            <span
                              key={sid}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "3px 9px",
                                borderRadius: 999,
                                fontSize: 11,
                                fontWeight: 600,
                                background: colors.background,
                                borderLeft: `3px solid ${colors.border}`,
                                color: colors.color,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {s.name}{s.code ? ` (${s.code})` : ""}
                            </span>
                          );
                        })
                      ) : staff.serviceRestrictionConfigured ? (
                        <span style={{ fontSize: 12, color: C.gray400, fontStyle: "italic" }}>— Không có quầy —</span>
                      ) : (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "3px 9px",
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 600,
                            background: C.gray100,
                            color: C.gray500,
                          }}
                        >
                          Tất cả (mặc định)
                        </span>
                      )}
                    </div>

                    {/* Trạng thái */}
                    <div>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          height: 28,
                          padding: "0 12px",
                          borderRadius: 999,
                          background: staff.isActive ? C.greenSoft : C.redSoft,
                          color: staff.isActive ? C.greenText : C.redText,
                          fontSize: 11.5,
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: staff.isActive ? C.green : C.red,
                          }}
                        />
                        {staff.isActive ? "Hoạt động" : "Vô hiệu"}
                      </span>
                    </div>

                    {/* Đăng nhập gần nhất */}
                    <div style={{ fontSize: 12, color: C.gray400 }}>
                      {staff.lastLoginAt ? (
                        new Date(staff.lastLoginAt).toLocaleString("vi-VN")
                      ) : (
                        <span style={{ fontStyle: "italic" }}>Chưa đăng nhập</span>
                      )}
                    </div>

                    {/* Hành động */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                      {/* Edit */}
                      <button
                        onClick={() => handleOpenModal(staff)}
                        title="Sửa thông tin"
                        style={{
                          width: 34, height: 34, borderRadius: 11,
                          border: `1px solid ${C.gray200}`, background: "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: C.gray500, cursor: "pointer", transition: "all .15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "#bfdbfe";
                          e.currentTarget.style.color = C.blue;
                          e.currentTarget.style.background = C.blueSoft;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = C.gray200;
                          e.currentTarget.style.color = C.gray500;
                          e.currentTarget.style.background = "#fff";
                        }}
                      >
                        <FiEdit2 size={14} />
                      </button>

                      {/* Assign services */}
                      <button
                        onClick={() => staff.counterId && handleOpenServiceModal(staff)}
                        title={staff.counterId ? "Phân quyền quầy" : "Cần gán phòng trước"}
                        disabled={!staff.counterId}
                        style={{
                          width: 34, height: 34, borderRadius: 11,
                          border: `1px solid ${C.gray200}`,
                          background: "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: staff.counterId ? C.amber : C.gray300,
                          cursor: staff.counterId ? "pointer" : "not-allowed",
                          transition: "all .15s ease",
                          opacity: staff.counterId ? 1 : 0.5,
                        }}
                        onMouseEnter={(e) => {
                          if (staff.counterId) {
                            e.currentTarget.style.borderColor = "#fcd34d";
                            e.currentTarget.style.background = C.amberSoft;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (staff.counterId) {
                            e.currentTarget.style.borderColor = C.gray200;
                            e.currentTarget.style.background = "#fff";
                          }
                        }}
                      >
                        <FiRepeat size={14} />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => { setPendingDeleteId(staff._id); setShowDeleteConfirm(true); }}
                        title="Xóa nhân viên"
                        style={{
                          width: 34, height: 34, borderRadius: 11,
                          border: `1px solid ${C.gray200}`, background: "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: C.red, cursor: "pointer", transition: "all .15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "#fca5a5";
                          e.currentTarget.style.background = C.redSoft;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = C.gray200;
                          e.currentTarget.style.background = "#fff";
                        }}
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── FOOTER ── */}
        {!loading && filteredStaff.length > 0 && (
          <div
            style={{
              padding: "14px 20px",
              borderTop: `1px solid ${C.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 12, color: C.gray400 }}>
              {currentItems.length} / {filteredStaff.length} nhân viên
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────── */}
      {/* MODAL THÊM / CHỈNH SỬA                                 */}
      {/* ─────────────────────────────────────────────────────── */}

      {showModal && (
        <div
          onClick={handleCloseModal}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(15,23,42,.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "94%", maxWidth: 880, maxHeight: "90vh",
              background: "#fff", borderRadius: 24, overflow: "hidden",
              display: "flex", flexDirection: "column",
              boxShadow: "0 24px 80px rgba(0,0,0,.18)",
            }}
          >
            {/* Modal header */}
            <div
              style={{
                padding: "20px 28px", borderBottom: `1px solid ${C.border}`,
                display: "flex", alignItems: "center", justifyContent: "space-between",
                flexShrink: 0,
              }}
            >
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: C.gray900 }}>
                  {editingId ? "Chỉnh sửa nhân viên" : "Thêm nhân viên mới"}
                </div>
                <div style={{ marginTop: 3, fontSize: 12, color: C.gray400 }}>
                  {editingId ? "Cập nhật thông tin tài khoản nhân viên" : "Tạo tài khoản nhân viên mới"}
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                style={{
                  width: 34, height: 34, borderRadius: 10,
                  border: `1px solid ${C.gray200}`, background: C.white,
                  fontSize: 20, cursor: "pointer", color: C.gray400,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all .15s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.redSoft; e.currentTarget.style.color = C.red; e.currentTarget.style.borderColor = "#fca5a5"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = C.white; e.currentTarget.style.color = C.gray400; e.currentTarget.style.borderColor = C.gray200; }}
              >
                <FiX size={16} />
              </button>
            </div>

            {/* Modal body — auto-fit grid, xuống 1 cột trên màn nhỏ */}
            <div style={{ padding: "24px 28px", overflowY: "auto", flex: 1 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 28 }}>

                {/* ── Left column ── */}
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

                  <div>
                    <Label>Tên đăng nhập <span style={{ color: C.red }}>*</span></Label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      disabled={!!editingId}
                      placeholder="VD: nhanvien01"
                      style={{
                        ...field,
                        backgroundColor: editingId ? C.gray50 : C.white,
                        cursor: editingId ? "not-allowed" : "text",
                        opacity: editingId ? 0.7 : 1,
                      }}
                      onFocus={editingId ? undefined : focusField}
                      onBlur={editingId ? undefined : blurField}
                    />
                  </div>

                  <div>
                    <Label>
                      Mật khẩu {!editingId && <span style={{ color: C.red }}>*</span>}
                      {editingId && (
                        <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                          {" "}(để trống nếu không đổi)
                        </span>
                      )}
                    </Label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editingId ? "Nhập mật khẩu mới nếu muốn đổi" : "Nhập mật khẩu"}
                      style={field}
                      onFocus={focusField}
                      onBlur={blurField}
                    />
                  </div>

                  <div>
                    <Label>Họ và tên <span style={{ color: C.red }}>*</span></Label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="VD: Nguyễn Văn A"
                      style={field}
                      onFocus={focusField}
                      onBlur={blurField}
                    />
                  </div>

                  <div>
                    <Label>Gán phòng</Label>
                    <select
                      value={formData.counterId || ""}
                      onChange={(e) => handleFormCounterChange(e.target.value || null)}
                      style={{ ...field, cursor: "pointer" }}
                      onFocus={focusField}
                      onBlur={blurField}
                    >
                      <option value="">— Không gán phòng —</option>
                      {counters.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label>Trạng thái</Label>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "14px 16px",
                        background: formData.isActive ? C.greenSoft : C.redSoft,
                        border: `1px solid ${formData.isActive ? "#bbf7d0" : "#fecaca"}`,
                        borderRadius: 14,
                        cursor: "pointer",
                        transition: "all .15s ease",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        style={{ width: 18, height: 18, cursor: "pointer", accentColor: formData.isActive ? C.green : C.red }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: formData.isActive ? C.greenText : C.redText }}>
                          {formData.isActive ? "Tài khoản hoạt động" : "Tài khoản bị khóa"}
                        </div>
                        <div style={{ fontSize: 12, color: formData.isActive ? "#2ebf63" : "#fca5a5", marginTop: 2 }}>
                          {formData.isActive
                            ? "Nhân viên có thể đăng nhập và làm việc"
                            : "Nhân viên không thể đăng nhập vào hệ thống"}
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* ── Right column — Quầy áp dụng ── */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Label>
                    Quầy áp dụng{" "}
                    <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                      ({formAvailableServices.length} quầy)
                    </span>
                  </Label>

                  {!formData.counterId ? (
                    <div
                      style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                        border: `1px dashed ${C.gray200}`, borderRadius: 16,
                        padding: "40px 20px", textAlign: "center",
                        background: C.gray50, minHeight: 200,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, color: C.gray400 }}>Chọn phòng để xem quầy</div>
                        <div style={{ marginTop: 4, fontSize: 12, color: C.gray300 }}>
                          Sau khi chọn phòng, các quầy sẽ hiển thị tại đây
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        border: `1px solid ${C.gray200}`, borderRadius: 16,
                        padding: 14, flex: 1, overflowY: "auto",
                        background: C.gray50, maxHeight: 420,
                      }}
                    >
                      {formAvailableServices.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "40px 20px", fontSize: 13, color: C.gray400 }}>
                          Phòng này chưa có quầy nào
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {formAvailableServices.map((service) => {
                            const id = service.id || service._id;
                            const isInactive = service.isActive === false;
                            const checked = formSelectedServiceIds.has(id);
                            return (
                              <label
                                key={id}
                                style={{
                                  display: "flex", alignItems: "center", gap: 12,
                                  padding: "11px 13px",
                                  background: checked ? C.blueSoft : C.white,
                                  border: `1px solid ${checked ? C.blue : C.gray200}`,
                                  borderRadius: 12,
                                  cursor: isInactive ? "not-allowed" : "pointer",
                                  transition: "all .15s ease",
                                  opacity: isInactive ? 0.55 : 1,
                                }}
                                onMouseEnter={(e) => {
                                  if (!checked && !isInactive) { e.currentTarget.style.borderColor = C.gray300; e.currentTarget.style.background = C.gray50; }
                                }}
                                onMouseLeave={(e) => {
                                  if (!checked && !isInactive) { e.currentTarget.style.borderColor = C.gray200; e.currentTarget.style.background = C.white; }
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => handleToggleFormService(id)}
                                  disabled={isInactive}
                                  style={{ width: 16, height: 16, cursor: isInactive ? "not-allowed" : "pointer", accentColor: C.blue, flexShrink: 0 }}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                    <span style={{ fontWeight: 700, fontSize: 13, color: C.gray900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {service.name}
                                    </span>
                                    {isInactive && (
                                      <span style={{ fontSize: 10, fontWeight: 700, color: C.redText, background: C.redSoft, border: "1px solid #fecaca", borderRadius: 4, padding: "1px 6px", whiteSpace: "nowrap", flexShrink: 0 }}>
                                        Vô hiệu
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: 11, color: C.gray400, marginTop: 2 }}>{service.code}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {formData.counterId && formSelectedServiceIds.size > 0 && (
                    <div
                      style={{
                        padding: "8px 12px", background: C.blueSoft,
                        border: "1px solid #bfdbfe", borderRadius: 10,
                        fontSize: 12, color: C.blueText, fontWeight: 600,
                      }}
                    >
                      Đã chọn {formSelectedServiceIds.size} quầy
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div
              style={{
                padding: "16px 28px", borderTop: `1px solid ${C.border}`,
                display: "flex", alignItems: "center", justifyContent: "flex-end",
                gap: 10, flexShrink: 0,
              }}
            >
              <button
                onClick={handleCloseModal}
                style={{
                  height: 40, padding: "0 22px",
                  border: `1px solid ${C.gray200}`, borderRadius: 12,
                  background: C.white, color: C.gray500,
                  fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all .15s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.gray50; e.currentTarget.style.borderColor = C.gray300; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = C.white; e.currentTarget.style.borderColor = C.gray200; }}
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSave}
                style={{
                  height: 40, padding: "0 24px", border: "none", borderRadius: 12,
                  background: C.navy, color: "#fff",
                  fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all .15s ease",
                  boxShadow: "0 4px 14px rgba(15,37,68,.2)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.navyHover; e.currentTarget.style.boxShadow = "0 6px 18px rgba(15,37,68,.28)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = C.navy; e.currentTarget.style.boxShadow = "0 4px 14px rgba(15,37,68,.2)"; }}
              >
                {editingId ? "Cập nhật" : "Thêm nhân viên"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────── */}
      {/* MODAL PHÂN QUYỀN QUẦY                                  */}
      {/* ─────────────────────────────────────────────────────── */}

      {showServiceModal && serviceModalStaff && (
        <div
          onClick={() => setShowServiceModal(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(15,23,42,.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "94%", maxWidth: 480, maxHeight: "90vh",
              background: "#fff", borderRadius: 24, overflow: "hidden",
              display: "flex", flexDirection: "column",
              boxShadow: "0 24px 80px rgba(0,0,0,.18)",
            }}
          >
            {/* Header */}
            <div style={{ padding: "20px 28px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: C.gray900 }}>Phân quyền quầy</div>
                <div style={{ marginTop: 3, fontSize: 12, color: C.gray400 }}>{serviceModalStaff.fullName}</div>
              </div>
              <button
                onClick={() => setShowServiceModal(false)}
                style={{
                  width: 34, height: 34, borderRadius: 10,
                  border: `1px solid ${C.gray200}`, background: C.white,
                  cursor: "pointer", color: C.gray400,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all .15s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.redSoft; e.currentTarget.style.color = C.red; e.currentTarget.style.borderColor = "#fca5a5"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = C.white; e.currentTarget.style.color = C.gray400; e.currentTarget.style.borderColor = C.gray200; }}
              >
                <FiX size={16} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "20px 28px", overflowY: "auto", flex: 1 }}>
              {serviceModalLoading ? (
                <div style={{ padding: "40px 0", textAlign: "center", fontSize: 14, color: C.gray400 }}>Đang tải...</div>
              ) : (
                <>
                  <div
                    style={{
                      marginBottom: 16, padding: "10px 14px",
                      background: serviceRestrictionConfigured ? C.blueSoft : C.gray50,
                      border: `1px solid ${serviceRestrictionConfigured ? "#bfdbfe" : C.gray200}`,
                      borderRadius: 12, fontSize: 12,
                      color: serviceRestrictionConfigured ? C.blueText : C.gray500,
                    }}
                  >
                    {serviceRestrictionConfigured
                      ? "Nhân viên đang áp dụng giới hạn quầy riêng"
                      : "Chưa cấu hình — nhân viên xử lý tất cả quầy của phòng"}
                  </div>

                  {availableServices.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 20px", fontSize: 13, color: C.gray400 }}>Phòng không có quầy nào</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {availableServices.map((service) => {
                        const id = service.id || service._id;
                        const checked = selectedServiceIds.has(id);
                        return (
                          <label
                            key={id}
                            style={{
                              display: "flex", alignItems: "center", gap: 12, padding: "11px 13px",
                              background: checked ? C.blueSoft : C.white,
                              border: `1px solid ${checked ? C.blue : C.gray200}`,
                              borderRadius: 12, cursor: "pointer", transition: "all .15s ease",
                            }}
                            onMouseEnter={(e) => { if (!checked) { e.currentTarget.style.borderColor = C.gray300; e.currentTarget.style.background = C.gray50; } }}
                            onMouseLeave={(e) => { if (!checked) { e.currentTarget.style.borderColor = C.gray200; e.currentTarget.style.background = C.white; } }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleToggleService(id)}
                              style={{ width: 16, height: 16, cursor: "pointer", accentColor: C.blue, flexShrink: 0 }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: 13, color: C.gray900 }}>{service.name}</div>
                              <div style={{ fontSize: 11, color: C.gray400, marginTop: 2 }}>{service.code}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {selectedServiceIds.size > 0 && (
                    <div style={{ marginTop: 12, padding: "8px 12px", background: C.blueSoft, border: "1px solid #bfdbfe", borderRadius: 10, fontSize: 12, color: C.blueText, fontWeight: 600 }}>
                      Đã chọn {selectedServiceIds.size} quầy
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "16px 28px", borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, flexShrink: 0 }}>
              <button
                onClick={() => setShowServiceModal(false)}
                style={{ height: 40, padding: "0 22px", border: `1px solid ${C.gray200}`, borderRadius: 12, background: C.white, color: C.gray500, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all .15s ease" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.gray50; e.currentTarget.style.borderColor = C.gray300; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = C.white; e.currentTarget.style.borderColor = C.gray200; }}
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveServices}
                disabled={serviceModalSaving}
                style={{
                  height: 40, padding: "0 24px", border: "none", borderRadius: 12,
                  background: serviceModalSaving ? C.gray300 : C.navy, color: "#fff",
                  fontSize: 13, fontWeight: 600, cursor: serviceModalSaving ? "not-allowed" : "pointer",
                  transition: "all .15s ease", boxShadow: "0 4px 14px rgba(15,37,68,.2)",
                }}
                onMouseEnter={(e) => { if (!serviceModalSaving) e.currentTarget.style.background = C.navyHover; }}
                onMouseLeave={(e) => { if (!serviceModalSaving) e.currentTarget.style.background = C.navy; }}
              >
                {serviceModalSaving ? "Đang lưu..." : "Lưu cấu hình"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm dialogs ── */}
      <AdminConfirmDialog
        isOpen={showDeleteConfirm}
        title="Xác nhận xóa nhân viên"
        message="Bạn có chắc chắn muốn xóa nhân viên này? Hành động này không thể hoàn tác."
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}