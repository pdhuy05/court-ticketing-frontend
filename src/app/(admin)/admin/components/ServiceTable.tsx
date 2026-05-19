"use client";

import React, { useEffect, useState, useCallback } from "react";
import { FiEdit2, FiSearch, FiTrash2, FiX } from "react-icons/fi";
import { TbPlus, TbLayoutGrid } from "react-icons/tb";
import * as RiIcons from "react-icons/ri";
import {
  getServices,
  getCounters,
  createService,
  updateService,
  deleteService,
  addServicesToCounter,
  removeServiceFromCounter,
  patchServiceDoublePrint,
  Counter,
  Service,
} from "@/services/admin.service";
import { FONTAWESOME_ICONS } from "@/constants/icons";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/ToastContainer";
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog";
import Pagination from "./Pagination";
import AdminTableFilter from "./AdminTableFilter";
import { getSequentialTagColorStyle } from "@/lib/adminTagColors";

/* ─────────────────────────────────────────────────────── */
/* Design tokens — mirrors PrinterTable's C palette        */
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

  teal: "#0891b2",
  tealSoft: "#ecfeff",
  tealText: "#0e7490",
} as const;

/* ─────────────────────────────────────────────────────── */
/* Grid layout — 8 data columns + actions                  */
/* ─────────────────────────────────────────────────────── */

const GRID_TEMPLATE =
  "44px minmax(80px,.6fr) minmax(90px,.5fr) minmax(160px,1.4fr) minmax(180px,1.4fr) minmax(110px,.8fr) minmax(120px,.9fr) minmax(80px,.5fr) 90px";

/* ─────────────────────────────────────────────────────── */
/* Shared form-field style (used inside modal)             */
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

const focusField = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  e.target.style.borderColor = "#bfdbfe";
  e.target.style.boxShadow = "0 0 0 4px rgba(37,99,235,.08)";
};

const blurField = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
/* Icon helper                                             */
/* ─────────────────────────────────────────────────────── */

const getIconComponent = (iconName: string) => {
  const Icon = (RiIcons as Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>>)[iconName];
  return Icon || null;
};

/* ─────────────────────────────────────────────────────── */
/* Constants                                               */
/* ─────────────────────────────────────────────────────── */

const PREFIX_NUMBER_MIN = 0;
const PREFIX_NUMBER_MAX = 99;

/* ─────────────────────────────────────────────────────── */
/* Component                                               */
/* ─────────────────────────────────────────────────────── */

export default function ServiceTable() {
  const { toasts, removeToast, success, error } = useToast();

  const [services, setServices] = useState<Service[]>([]);
  const [counters, setCounters] = useState<Counter[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCounterIds, setFilterCounterIds] = useState<string[]>(["all"]);
  const [filterStatuses, setFilterStatuses] = useState<string[]>(["all"]);
  const [filterPrefixNumbers, setFilterPrefixNumbers] = useState<string[]>(["all"]);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCounters, setSelectedCounters] = useState<string[]>([]);
  const [initialCounters, setInitialCounters] = useState<string[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<boolean | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [prefixNumberError, setPrefixNumberError] = useState("");
  const [doublePrintTogglingId, setDoublePrintTogglingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    icon: "",
    description: "",
    displayOrder: 1,
    prefixNumber: 0,
    isActive: true,
    doublePrint: false,
    inactiveLabel: "ĐANG THỬ NGHIỆM",
  });

  /* ── Validation ── */

  const validatePrefixNumber = (value: number) => {
    if (!Number.isInteger(value)) return "Số tiền tố phải là số nguyên.";
    if (value < PREFIX_NUMBER_MIN || value > PREFIX_NUMBER_MAX)
      return `Số tiền tố phải nằm trong khoảng từ ${PREFIX_NUMBER_MIN} đến ${PREFIX_NUMBER_MAX}.`;
    return "";
  };

  /* ── Fetch ── */

  const fetchServices = useCallback(async () => {
    setLoading(true);
    const data = await getServices();
    setServices(data);
    setLoading(false);
  }, []);

  const fetchCounters = useCallback(async () => {
    const data = await getCounters();
    setCounters(data);
  }, []);

  useEffect(() => {
    void fetchServices();
    void fetchCounters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Reset page on filter/search change ── */

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCounterIds, filterStatuses, filterPrefixNumbers]);

  /* ── Modal ── */

  const handleOpenModal = (service?: Service) => {
    if (service) {
      setEditingId(service._id);
      setFormData({
        code: service.code,
        name: service.name,
        icon: service.icon,
        description: service.description,
        displayOrder: service.displayOrder,
        prefixNumber: service.prefixNumber ?? 0,
        isActive: service.isActive,
        doublePrint: Boolean(service.doublePrint),
        inactiveLabel: service.inactiveLabel ?? "ĐANG THỬ NGHIỆM",
      });
      setPrefixNumberError("");
      const counterIds = service.counters?.map((c) => c._id) || [];
      setSelectedCounters(counterIds);
      setInitialCounters(counterIds);
    } else {
      setEditingId(null);
      setFormData({
        code: "",
        name: "",
        icon: "",
        description: "",
        displayOrder: 1,
        prefixNumber: 0,
        isActive: true,
        doublePrint: false,
        inactiveLabel: "ĐANG THỬ NGHIỆM",
      });
      setPrefixNumberError("");
      setSelectedCounters([]);
      setInitialCounters([]);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setPrefixNumberError("");
    setSelectedCounters([]);
    setInitialCounters([]);
  };

  /* ── Handlers ── */

  const handleCounterToggle = (counterId: string) => {
    setSelectedCounters((prev) =>
      prev.includes(counterId) ? prev.filter((id) => id !== counterId) : [...prev, counterId]
    );
  };

  const handleStatusChange = (newStatus: boolean) => {
    setPendingStatusChange(newStatus);
    setShowStatusConfirm(true);
  };

  const handleConfirmStatus = () => {
    if (pendingStatusChange !== null) setFormData({ ...formData, isActive: pendingStatusChange });
    setShowStatusConfirm(false);
    setPendingStatusChange(null);
  };

  const handlePrefixNumberChange = (value: string) => {
    const nextValue = Number(value);
    setFormData((prev) => ({ ...prev, prefixNumber: nextValue }));
    setPrefixNumberError(validatePrefixNumber(nextValue));
  };

  const handleToggleDoublePrint = async (service: Service, nextValue: boolean) => {
    if (doublePrintTogglingId === service._id) return;
    if (Boolean(service.doublePrint) === nextValue) return;
    setDoublePrintTogglingId(service._id);
    try {
      const { service: updated, message } = await patchServiceDoublePrint(service._id, nextValue);
      setServices((prev) => prev.map((s) => (s._id === service._id ? { ...s, ...updated } : s)));
      success(message);
    } catch (err) {
      error(err instanceof Error ? err.message : "Không cập nhật được in 2 vé");
    } finally {
      setDoublePrintTogglingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (pendingDeleteId) {
      try {
        await deleteService(pendingDeleteId);
        success("Xóa quầy thành công");
        void fetchServices();
      } catch (err) {
        error(err instanceof Error ? err.message : "Xóa quầy thất bại");
      }
    }
    setShowDeleteConfirm(false);
    setPendingDeleteId(null);
  };

  const handleSave = async () => {
    if (!formData.code || !formData.name) {
      error("Vui lòng nhập mã và tên quầy");
      return;
    }
    const normalizedPrefixNumber = Number(formData.prefixNumber);
    const prefixValidationMessage = validatePrefixNumber(normalizedPrefixNumber);
    if (prefixValidationMessage) {
      setPrefixNumberError(prefixValidationMessage);
      error(prefixValidationMessage);
      return;
    }
    setPrefixNumberError("");

    try {
      if (editingId) {
        await updateService(editingId, { ...formData, prefixNumber: normalizedPrefixNumber });
        const removedCounterIds = initialCounters.filter((id) => !selectedCounters.includes(id));
        const addedCounterIds = selectedCounters.filter((id) => !initialCounters.includes(id));
        if (removedCounterIds.length > 0)
          await Promise.all(removedCounterIds.map((id) => removeServiceFromCounter(id, editingId)));
        if (addedCounterIds.length > 0)
          await Promise.all(addedCounterIds.map((id) => addServicesToCounter(id, [editingId])));
        success("Cập nhật quầy thành công");
      } else {
        const createdService = await createService({
          code: formData.code,
          name: formData.name,
          icon: formData.icon,
          description: formData.description,
          displayOrder: formData.displayOrder,
          prefixNumber: normalizedPrefixNumber,
          isActive: formData.isActive,
          doublePrint: formData.doublePrint,
          inactiveLabel: formData.inactiveLabel || "ĐANG THỬ NGHIỆM",
        });
        await Promise.all(selectedCounters.map((id) => addServicesToCounter(id, [createdService._id])));
        success("Tạo quầy thành công");
      }
      void fetchServices();
      void fetchCounters();
      handleCloseModal();
    } catch (err) {
      error(err instanceof Error ? err.message : "Lỗi lưu quầy thất bại");
    }
  };

  /* ── Filtering ── */

  const filteredServices = services.filter((service) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      service.code.toLowerCase().includes(q) || service.name.toLowerCase().includes(q);
    const matchesCounter =
      filterCounterIds.includes("all") ||
      service.counters?.some((c) => filterCounterIds.includes(c._id));
    const matchesStatus =
      filterStatuses.includes("all") ||
      (filterStatuses.includes("active") && service.isActive) ||
      (filterStatuses.includes("inactive") && !service.isActive);
    const matchesPrefix =
      filterPrefixNumbers.includes("all") ||
      filterPrefixNumbers.includes(String(service.prefixNumber ?? 0));
    return matchesSearch && matchesCounter && matchesStatus && matchesPrefix;
  });

  const counterColorMap = new Map(
    [...counters]
      .sort((a, b) => a.number - b.number || a.name.localeCompare(b.name))
      .map((counter, index) => [counter._id, getSequentialTagColorStyle(index)])
  );

  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
  const currentItems = filteredServices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
        }}
      >
        {/* ── HEADER ── */}
        <div
          style={{
            padding: "20px 22px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          {/* Left — title + icon */}
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
              <TbLayoutGrid size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.gray900 }}>
                Quản lý quầy
              </div>
              <div style={{ marginTop: 3, fontSize: 12, color: C.gray400 }}>
                {services.length} quầy dịch vụ
              </div>
            </div>
          </div>

          {/* Right — filter + search + button */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AdminTableFilter
              activeCount={
                (filterCounterIds.includes("all") ? 0 : filterCounterIds.length) +
                (filterStatuses.includes("all") ? 0 : filterStatuses.length) +
                (filterPrefixNumbers.includes("all") ? 0 : filterPrefixNumbers.length)
              }
              onReset={() => {
                setFilterCounterIds(["all"]);
                setFilterStatuses(["all"]);
                setFilterPrefixNumbers(["all"]);
              }}
              sections={[
                {
                  id: "service-counter",
                  label: "Phòng",
                  value: filterCounterIds,
                  onChange: setFilterCounterIds,
                  options: [
                    { label: "Tất cả phòng", value: "all" },
                    ...[...counters]
                      .sort((a, b) => a.number - b.number)
                      .map((counter) => ({
                        label: `${counter.name} (${counter.code})`,
                        value: counter._id,
                      })),
                  ],
                },
                {
                  id: "service-status",
                  label: "Trạng thái",
                  value: filterStatuses,
                  onChange: setFilterStatuses,
                  options: [
                    { label: "Tất cả trạng thái", value: "all" },
                    { label: "Hoạt động", value: "active" },
                    { label: "Vô hiệu", value: "inactive" },
                  ],
                },
                {
                  id: "service-prefix",
                  label: "Mã tiền tố",
                  value: filterPrefixNumbers,
                  onChange: setFilterPrefixNumbers,
                  options: [
                    { label: "Tất cả mã tiền tố", value: "all" },
                    ...Array.from(
                      new Set(services.map((s) => String(s.prefixNumber ?? 0)))
                    )
                      .sort((a, b) => Number(a) - Number(b))
                      .map((value) => ({ label: `Tiền tố ${value}`, value })),
                  ],
                },
              ]}
            />

            {/* Search */}
            <div
              style={{
                height: 38,
                width: 240,
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
                placeholder="Tìm kiếm mã hoặc tên quầy..."
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
                  style={{
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    color: C.gray400,
                  }}
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
        <div style={{ padding: 22 }}>
          {loading ? (
            <div
              style={{
                padding: "60px 0",
                textAlign: "center",
                fontSize: 14,
                color: C.gray400,
              }}
            >
              Đang tải dữ liệu...
            </div>
          ) : filteredServices.length === 0 ? (
            <div style={{ padding: "60px 0", textAlign: "center" }}>
              <TbLayoutGrid size={42} style={{ color: C.gray200, marginBottom: 12 }} />
              <div style={{ fontSize: 14, color: C.gray400 }}>Không có quầy nào</div>
              <div style={{ marginTop: 6, fontSize: 12, color: C.gray300 }}>
                Nhấn &quot;Thêm mới&quot; để tạo quầy đầu tiên
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
                }}
              >
                <div>TT</div>
                <div>Mã quầy</div>
                <div>Tiền tố</div>
                <div>Tên quầy</div>
                <div>Phòng</div>
                <div>Trạng thái</div>
                <div>Mô tả</div>
                <div title="In 2 vé">In 2 vé</div>
                <div>Hành động</div>
              </div>

              {/* Rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {currentItems.map((service, rowIndex) => {
                  const IconComp = service.icon ? getIconComponent(service.icon) : null;
                  return (
                    <div
                      key={service._id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: GRID_TEMPLATE,
                        alignItems: "center",
                        columnGap: 16,
                        minHeight: 68,
                        padding: "0 18px",
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
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: C.gray400,
                          textAlign: "center",
                        }}
                      >
                        {(currentPage - 1) * itemsPerPage + rowIndex + 1}
                      </div>

                      {/* Mã quầy */}
                      <div
                        style={{
                          fontFamily: "monospace",
                          fontSize: 13,
                          fontWeight: 700,
                          color: C.gray700,
                        }}
                      >
                        {service.code}
                      </div>

                      {/* Tiền tố */}
                      <div
                        style={{
                          fontFamily: "monospace",
                          fontSize: 13,
                          fontWeight: 600,
                          color: C.gray500,
                        }}
                      >
                        {service.prefixNumber ?? 0}
                      </div>

                      {/* Tên quầy */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 14,
                          fontWeight: 700,
                          color: C.gray900,
                        }}
                      >
                        {IconComp && (
                          <IconComp size={17} style={{ color: C.navy, flexShrink: 0 }} />
                        )}
                        {service.name}
                      </div>

                      {/* Phòng */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {service.counters?.map((counter) => {
                          const colors = counterColorMap.get(counter._id) || {
                            background: "#dbeafe",
                            border: "#2563eb",
                            color: "#1e3a8a",
                          };
                          return (
                            <span
                              key={counter._id}
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
                              {counter.name}
                            </span>
                          );
                        })}
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
                            background: service.isActive ? C.greenSoft : C.redSoft,
                            color: service.isActive ? C.greenText : C.redText,
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
                              background: service.isActive ? C.green : C.red,
                            }}
                          />
                          {service.isActive ? "Hoạt động" : "Vô hiệu"}
                        </span>
                      </div>

                      {/* Mô tả */}
                      <div
                        style={{
                          fontSize: 12,
                          color: C.gray400,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: 180,
                        }}
                        title={service.description}
                      >
                        {service.description || "—"}
                      </div>

                      {/* In 2 vé */}
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <label
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 7,
                            cursor: doublePrintTogglingId === service._id ? "wait" : "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(service.doublePrint)}
                            disabled={doublePrintTogglingId === service._id}
                            onChange={(e) => { void handleToggleDoublePrint(service, e.target.checked); }}
                            style={{
                              width: 16,
                              height: 16,
                              cursor: doublePrintTogglingId === service._id ? "wait" : "pointer",
                              accentColor: C.teal,
                            }}
                          />
                          <span
                            style={{
                              fontSize: 11.5,
                              fontWeight: 700,
                              color: service.doublePrint ? C.tealText : C.gray400,
                            }}
                          >
                            {service.doublePrint ? "2 tờ" : "1 tờ"}
                          </span>
                        </label>
                      </div>

                      {/* Hành động */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                        <button
                          onClick={() => handleOpenModal(service)}
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 11,
                            border: `1px solid ${C.gray200}`,
                            background: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: C.gray500,
                            cursor: "pointer",
                            transition: "all .15s ease",
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
                        <button
                          onClick={() => { setPendingDeleteId(service._id); setShowDeleteConfirm(true); }}
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 11,
                            border: `1px solid ${C.gray200}`,
                            background: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: C.red,
                            cursor: "pointer",
                            transition: "all .15s ease",
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
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ── FOOTER ── */}
        {!loading && filteredServices.length > 0 && (
          <div
            style={{
              padding: "18px 22px",
              borderTop: `1px solid ${C.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ fontSize: 12, color: C.gray400 }}>
              {currentItems.length} / {filteredServices.length} quầy
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
      {/* MODAL                                                   */}
      {/* ─────────────────────────────────────────────────────── */}

      {showModal && (
        <div
          onClick={handleCloseModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "94%",
              maxWidth: 1100,
              maxHeight: "90vh",
              background: "#fff",
              borderRadius: 24,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 24px 80px rgba(0,0,0,.18)",
            }}
          >
            {/* Modal header */}
            <div
              style={{
                padding: "20px 28px",
                borderBottom: `1px solid ${C.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
              }}
            >
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: C.gray900 }}>
                  {editingId ? "Chỉnh sửa quầy" : "Thêm quầy mới"}
                </div>
                <div style={{ marginTop: 3, fontSize: 12, color: C.gray400 }}>
                  {editingId ? "Cập nhật thông tin quầy dịch vụ" : "Tạo quầy dịch vụ mới"}
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  border: `1px solid ${C.gray200}`,
                  background: C.white,
                  fontSize: 20,
                  cursor: "pointer",
                  color: C.gray400,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all .15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = C.redSoft;
                  e.currentTarget.style.color = C.red;
                  e.currentTarget.style.borderColor = "#fca5a5";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = C.white;
                  e.currentTarget.style.color = C.gray400;
                  e.currentTarget.style.borderColor = C.gray200;
                }}
              >
                <FiX size={16} />
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: "24px 28px", overflowY: "auto", flex: 1 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>

                {/* ── Left column ── */}
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

                  {/* Mã quầy */}
                  <div>
                    <Label>Mã quầy <span style={{ color: C.red }}>*</span></Label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      disabled={!!editingId}
                      placeholder="VD: QMS-01"
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

                  {/* Tên quầy */}
                  <div>
                    <Label>Tên quầy <span style={{ color: C.red }}>*</span></Label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="VD: Quầy số 1, Quầy VIP..."
                      style={field}
                      onFocus={focusField}
                      onBlur={blurField}
                    />
                  </div>

                  {/* Số thứ tự + Mã tiền tố */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div>
                      <Label>Số thứ tự</Label>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          border: `1px solid ${C.gray200}`,
                          borderRadius: 12,
                          overflow: "hidden",
                          background: C.gray50,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, displayOrder: (formData.displayOrder || 1) - 1 })
                          }
                          style={{
                            width: 38,
                            height: 42,
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            fontSize: 18,
                            color: C.gray500,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          value={formData.displayOrder}
                          onChange={(e) =>
                            setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })
                          }
                          style={{
                            flex: 1,
                            border: "none",
                            outline: "none",
                            background: "transparent",
                            textAlign: "center",
                            fontSize: 15,
                            fontWeight: 700,
                            color: C.gray900,
                          }}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, displayOrder: (formData.displayOrder || 0) + 1 })
                          }
                          style={{
                            width: 38,
                            height: 42,
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            fontSize: 18,
                            color: C.gray500,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div>
                      <Label>
                        Mã tiền tố{" "}
                        <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                          ({PREFIX_NUMBER_MIN}–{PREFIX_NUMBER_MAX})
                        </span>
                      </Label>
                      <input
                        type="number"
                        min={PREFIX_NUMBER_MIN}
                        max={PREFIX_NUMBER_MAX}
                        value={formData.prefixNumber}
                        onChange={(e) => handlePrefixNumberChange(e.target.value)}
                        style={{
                          ...field,
                          borderColor: prefixNumberError ? C.red : C.gray200,
                        }}
                        onFocus={prefixNumberError ? undefined : focusField}
                        onBlur={prefixNumberError ? undefined : blurField}
                      />
                      {prefixNumberError && (
                        <div style={{ marginTop: 5, fontSize: 11, color: C.red }}>
                          {prefixNumberError}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Trạng thái */}
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
                        onChange={(e) => handleStatusChange(e.target.checked)}
                        style={{
                          width: 18,
                          height: 18,
                          cursor: "pointer",
                          accentColor: formData.isActive ? C.green : C.red,
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 13,
                            color: formData.isActive ? C.greenText : C.redText,
                          }}
                        >
                          {formData.isActive ? "Hoạt động" : "Vô hiệu"}
                        </div>
                        <div style={{ fontSize: 12, color: formData.isActive ? "#86efac" : "#fca5a5", marginTop: 2 }}>
                          {formData.isActive
                            ? "Quầy đang hoạt động bình thường"
                            : "Quầy tạm thời không phục vụ"}
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Nhãn khi tắt */}
                  {!formData.isActive && (
                    <div>
                      <Label>Nhãn hiển thị khi tắt dịch vụ</Label>
                      <input
                        type="text"
                        value={formData.inactiveLabel}
                        onChange={(e) => setFormData({ ...formData, inactiveLabel: e.target.value })}
                        placeholder="VD: TẠM DỪNG, BẢO TRÌ..."
                        maxLength={40}
                        style={{
                          ...field,
                          borderColor: "#fecaca",
                          fontWeight: 700,
                          color: C.redText,
                          background: "#fff5f5",
                          letterSpacing: "0.5px",
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = "#f87171";
                          e.target.style.boxShadow = "0 0 0 4px rgba(248,113,113,.1)";
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = "#fecaca";
                          e.target.style.boxShadow = "none";
                        }}
                      />
                    </div>
                  )}

                  {/* In 2 vé */}
                  <div>
                    <Label>In 2 vé (tờ nhỏ kẹp hồ sơ)</Label>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "14px 16px",
                        background: formData.doublePrint ? C.tealSoft : C.gray50,
                        border: `1px solid ${formData.doublePrint ? "#67e8f9" : C.gray200}`,
                        borderRadius: 14,
                        cursor: "pointer",
                        transition: "all .15s ease",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.doublePrint}
                        onChange={(e) => setFormData({ ...formData, doublePrint: e.target.checked })}
                        style={{ width: 18, height: 18, cursor: "pointer", accentColor: C.teal }}
                      />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 13,
                            color: formData.doublePrint ? C.tealText : C.gray500,
                          }}
                        >
                          {formData.doublePrint ? "Bật — in vé đầy đủ + tờ nhỏ" : "Tắt — chỉ in một tờ vé đầy đủ"}
                        </div>
                        <div style={{ fontSize: 12, color: formData.doublePrint ? "#21a8bc" : C.gray400, marginTop: 2 }}>
                          Có thể bật / tắt nhanh trong bảng (cột In 2 vé).
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* ── Right column ── */}
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

                  {/* Icon picker */}
                  <div>
                    <Label>Biểu tượng</Label>
                    <div
                      style={{
                        border: `1px solid ${C.gray200}`,
                        borderRadius: 16,
                        padding: 14,
                        maxHeight: 220,
                        overflowY: "auto",
                        display: "grid",
                        gridTemplateColumns: "repeat(6, 1fr)",
                        gap: 8,
                        background: C.gray50,
                      }}
                    >
                      {FONTAWESOME_ICONS.map((icon) => {
                        const IconComponent = getIconComponent(icon.class);
                        const isSelected = formData.icon === icon.class;
                        return (
                          <button
                            key={icon.id}
                            onClick={() => setFormData({ ...formData, icon: icon.class })}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: "10px 6px",
                              border: isSelected ? `1.5px solid ${C.blue}` : `1px solid ${C.gray200}`,
                              borderRadius: 12,
                              background: isSelected ? C.blueSoft : C.white,
                              cursor: "pointer",
                              transition: "all .15s ease",
                              gap: 5,
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.borderColor = C.gray300;
                                e.currentTarget.style.background = C.gray50;
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.borderColor = C.gray200;
                                e.currentTarget.style.background = C.white;
                              }
                            }}
                          >
                            {IconComponent ? (
                              <IconComponent
                                size={20}
                                style={{ color: isSelected ? C.blue : C.gray500 }}
                              />
                            ) : (
                              <span style={{ fontSize: 11, color: C.gray300 }}>N/A</span>
                            )}
                            <span
                              style={{
                                fontSize: 9,
                                color: isSelected ? C.blue : C.gray400,
                                fontWeight: isSelected ? 700 : 400,
                                lineHeight: 1.2,
                                textAlign: "center",
                              }}
                            >
                              {icon.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div
                      style={{
                        marginTop: 10,
                        padding: "8px 12px",
                        background: C.gray50,
                        border: `1px solid ${C.border}`,
                        borderRadius: 10,
                        fontSize: 12,
                        color: C.gray500,
                      }}
                    >
                      Đã chọn: <strong style={{ color: C.gray900 }}>{formData.icon || "Chưa chọn"}</strong>
                    </div>
                  </div>

                  {/* Mô tả */}
                  <div>
                    <Label>Mô tả</Label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Nhập mô tả chi tiết về quầy..."
                      rows={3}
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        fontSize: 13,
                        border: `1px solid ${C.gray200}`,
                        borderRadius: 12,
                        outline: "none",
                        resize: "vertical",
                        fontFamily: "inherit",
                        transition: "all .15s ease",
                        color: C.gray900,
                        boxSizing: "border-box",
                      }}
                      onFocus={focusField}
                      onBlur={blurField}
                    />
                  </div>

                  {/* Thêm vào phòng */}
                  <div style={{ flex: 1 }}>
                    <Label>Thêm vào phòng</Label>
                    <div
                      style={{
                        border: `1px solid ${C.gray200}`,
                        borderRadius: 16,
                        padding: 14,
                        background: C.gray50,
                        maxHeight: 200,
                        overflowY: "auto",
                      }}
                    >
                      {counters.length === 0 ? (
                        <div
                          style={{
                            textAlign: "center",
                            padding: "20px",
                            fontSize: 13,
                            color: C.gray400,
                          }}
                        >
                          Chưa có phòng nào
                        </div>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                          {counters.map((counter) => {
                            const isChecked = selectedCounters.includes(counter._id);
                            return (
                              <label
                                key={counter._id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                  padding: "10px 12px",
                                  background: isChecked ? C.blueSoft : C.white,
                                  border: `1px solid ${isChecked ? C.blue : C.gray200}`,
                                  borderRadius: 12,
                                  cursor: "pointer",
                                  transition: "all .15s ease",
                                }}
                                onMouseEnter={(e) => {
                                  if (!isChecked) {
                                    e.currentTarget.style.borderColor = C.gray300;
                                    e.currentTarget.style.background = C.gray50;
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isChecked) {
                                    e.currentTarget.style.borderColor = C.gray200;
                                    e.currentTarget.style.background = C.white;
                                  }
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleCounterToggle(counter._id)}
                                  style={{
                                    width: 16,
                                    height: 16,
                                    cursor: "pointer",
                                    accentColor: C.blue,
                                  }}
                                />
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: 13, color: C.gray900 }}>
                                    {counter.name}
                                  </div>
                                  <div style={{ fontSize: 11, color: C.gray400, marginTop: 1 }}>
                                    {counter.code}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div
              style={{
                padding: "16px 28px",
                borderTop: `1px solid ${C.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 10,
                flexShrink: 0,
              }}
            >
              <button
                onClick={handleCloseModal}
                style={{
                  height: 40,
                  padding: "0 22px",
                  border: `1px solid ${C.gray200}`,
                  borderRadius: 12,
                  background: C.white,
                  color: C.gray500,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all .15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = C.gray50;
                  e.currentTarget.style.borderColor = C.gray300;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = C.white;
                  e.currentTarget.style.borderColor = C.gray200;
                }}
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSave}
                style={{
                  height: 40,
                  padding: "0 24px",
                  border: "none",
                  borderRadius: 12,
                  background: C.navy,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all .15s ease",
                  boxShadow: "0 4px 14px rgba(15,37,68,.2)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = C.navyHover;
                  e.currentTarget.style.boxShadow = "0 6px 18px rgba(15,37,68,.28)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = C.navy;
                  e.currentTarget.style.boxShadow = "0 4px 14px rgba(15,37,68,.2)";
                }}
              >
                {editingId ? "Cập nhật" : "Thêm mới"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm dialogs ── */}
      <AdminConfirmDialog
        isOpen={showStatusConfirm}
        title="Xác nhận thay đổi trạng thái"
        message={`Bạn có chắc chắn muốn chuyển trạng thái quầy thành ${pendingStatusChange ? "Hoạt động" : "Vô hiệu"}?`}
        onConfirm={handleConfirmStatus}
        onCancel={() => { setShowStatusConfirm(false); setPendingStatusChange(null); }}
      />

      <AdminConfirmDialog
        isOpen={showDeleteConfirm}
        title="Xác nhận xóa quầy"
        message="Bạn có chắc chắn muốn xóa quầy này? Hành động này không thể hoàn tác."
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}