"use client";

import React, { useEffect, useState, useCallback } from "react";
import { FiEdit2, FiSearch, FiTrash2, FiX } from "react-icons/fi";
import { TbPlus, TbBuildingHospital } from "react-icons/tb";
import {
  getCounters,
  createCounter,
  updateCounter,
  addServicesToCounter,
  deleteCounter,
  removeServiceFromCounter,
  Counter,
  getServices,
  Service,
} from "@/services/admin.service";
import { useToast } from "@/hooks/useToast";
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
} as const;

/* ─────────────────────────────────────────────────────── */
/* Grid layout                                             */
/* ─────────────────────────────────────────────────────── */

const GRID_TEMPLATE =
  "44px minmax(80px,.6fr) minmax(160px,1.2fr) minmax(220px,2fr) minmax(120px,.8fr) minmax(160px,1fr) 90px";

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
/* Component                                               */
/* ─────────────────────────────────────────────────────── */

export default function CounterTable() {
  const { toasts, removeToast, success, error } = useToast();

  const [counters, setCounters] = useState<Counter[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterServiceIds, setFilterServiceIds] = useState<string[]>(["all"]);
  const [filterStatuses, setFilterStatuses] = useState<string[]>(["all"]);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [initialServices, setInitialServices] = useState<string[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<boolean | null>(null);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    number: 1,
    note: "",
    isActive: true,
  });

  /* ── Fetch ── */

  const fetchCounters = useCallback(async () => {
    setLoading(true);
    const data = await getCounters();
    setCounters(data);
    setLoading(false);
  }, []);

  const fetchServices = useCallback(async () => {
    const data = await getServices();
    setServices(data);
  }, []);

  useEffect(() => {
    void fetchCounters();
    void fetchServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterServiceIds, filterStatuses]);

  /* ── Modal ── */

  const handleOpenModal = (counter?: Counter) => {
    if (counter) {
      setEditingId(counter._id);
      setFormData({
        code: counter.code,
        name: counter.name,
        number: counter.number,
        note: counter.note,
        isActive: counter.isActive,
      });
      const serviceIds = counter.services.map((s) => s._id);
      setSelectedServices(serviceIds);
      setInitialServices(serviceIds);
    } else {
      setEditingId(null);
      setFormData({ code: "", name: "", number: 1, note: "", isActive: true });
      setSelectedServices([]);
      setInitialServices([]);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({ code: "", name: "", number: 1, note: "", isActive: true });
    setSelectedServices([]);
    setInitialServices([]);
  };

  /* ── Handlers ── */

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    );
  };

  const handleStatusChange = (nextStatus: boolean) => {
    setPendingStatusChange(nextStatus);
    setShowStatusConfirm(true);
  };

  const handleConfirmStatus = () => {
    if (pendingStatusChange !== null)
      setFormData((prev) => ({ ...prev, isActive: pendingStatusChange }));
    setPendingStatusChange(null);
    setShowStatusConfirm(false);
  };

  const handleConfirmDelete = async () => {
    if (pendingDeleteId) {
      try {
        await deleteCounter(pendingDeleteId);
        success("Xóa phòng thành công");
        void fetchCounters();
      } catch (err) {
        error(err instanceof Error ? err.message : "Xóa phòng thất bại");
      }
    }
    setShowDeleteConfirm(false);
    setPendingDeleteId(null);
  };

  const handleSave = async () => {
    if (!formData.code || !formData.name) {
      error("Vui lòng nhập mã và tên phòng");
      return;
    }
    try {
      if (editingId) {
        await updateCounter(editingId, {
          code: formData.code,
          name: formData.name,
          number: formData.number,
          note: formData.note,
          isActive: formData.isActive,
        });
        const removedServiceIds = initialServices.filter(
          (id) => !selectedServices.includes(id)
        );
        await Promise.all(
          removedServiceIds.map((id) => removeServiceFromCounter(editingId, id))
        );
        if (selectedServices.length > 0)
          await addServicesToCounter(editingId, selectedServices);
        success("Cập nhật phòng thành công");
      } else {
        const result = await createCounter({
          code: formData.code,
          name: formData.name,
          number: formData.number,
          note: formData.note,
          isActive: formData.isActive,
          serviceIds: selectedServices.length > 0 ? selectedServices : "",
        });
        if (selectedServices.length > 0)
          await addServicesToCounter(result._id, selectedServices);
        success("Tạo phòng thành công");
      }
      void fetchCounters();
      handleCloseModal();
    } catch (err) {
      error(err instanceof Error ? err.message : "Lỗi lưu phòng");
    }
  };

  /* ── Filtering ── */

  const filteredCounters = counters.filter((counter) => {
    const q = searchTerm.toLowerCase();
    return (
      (counter.code.toLowerCase().includes(q) ||
        counter.name.toLowerCase().includes(q)) &&
      (filterServiceIds.includes("all") ||
        counter.services.some((s) => filterServiceIds.includes(s._id))) &&
      (filterStatuses.includes("all") ||
        (filterStatuses.includes("active") && counter.isActive) ||
        (filterStatuses.includes("inactive") && !counter.isActive))
    );
  });

  const serviceColorMap = new Map(
    [...services]
      .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name))
      .map((service, index) => [service._id, getSequentialTagColorStyle(index)])
  );

  const totalPages = Math.ceil(filteredCounters.length / itemsPerPage);
  const currentItems = filteredCounters.slice(
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
              <TbBuildingHospital size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.gray900 }}>
                Quản lý phòng
              </div>
              <div style={{ marginTop: 3, fontSize: 12, color: C.gray400 }}>
                {counters.length} phòng dịch vụ
              </div>
            </div>
          </div>

          {/* Right */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AdminTableFilter
              activeCount={
                (filterServiceIds.includes("all") ? 0 : filterServiceIds.length) +
                (filterStatuses.includes("all") ? 0 : filterStatuses.length)
              }
              onReset={() => {
                setFilterServiceIds(["all"]);
                setFilterStatuses(["all"]);
              }}
              sections={[
                {
                  id: "counter-service",
                  label: "Quầy",
                  value: filterServiceIds,
                  onChange: setFilterServiceIds,
                  options: [
                    { label: "Tất cả quầy", value: "all" },
                    ...[...services]
                      .sort(
                        (a, b) =>
                          a.displayOrder - b.displayOrder ||
                          a.name.localeCompare(b.name)
                      )
                      .map((s) => ({
                        label: `${s.name} (${s.code})`,
                        value: s._id,
                      })),
                  ],
                },
                {
                  id: "counter-status",
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
                placeholder="Tìm kiếm mã hoặc tên phòng..."
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
          ) : filteredCounters.length === 0 ? (
            <div style={{ padding: "60px 0", textAlign: "center" }}>
              <TbBuildingHospital size={42} style={{ color: C.gray200, marginBottom: 12 }} />
              <div style={{ fontSize: 14, color: C.gray400 }}>Không có phòng nào</div>
              <div style={{ marginTop: 6, fontSize: 12, color: C.gray300 }}>
                Nhấn &quot;Thêm mới&quot; để tạo phòng đầu tiên
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
                <div>Mã phòng</div>
                <div>Tên phòng</div>
                <div>Quầy phục vụ</div>
                <div>Trạng thái</div>
                <div>Mô tả</div>
                <div>Hành động</div>
              </div>

              {/* Rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {currentItems.map((counter, rowIndex) => (
                  <div
                    key={counter._id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: GRID_TEMPLATE,
                      alignItems: "center",
                      columnGap: 16,
                      minHeight: 68,
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

                    {/* Mã phòng */}
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: 13,
                        fontWeight: 700,
                        color: C.gray700,
                      }}
                    >
                      {counter.code}
                    </div>

                    {/* Tên phòng */}
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: C.gray900,
                        lineHeight: 1.3,
                      }}
                    >
                      {counter.name}
                    </div>

                    {/* Quầy phục vụ */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {counter.services.length > 0 ? (
                        counter.services.map((service) => {
                          const colors = serviceColorMap.get(service._id) || {
                            background: "#dbeafe",
                            border: "#2563eb",
                            color: "#1e3a8a",
                          };
                          return (
                            <span
                              key={service._id}
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
                              {service.name}
                            </span>
                          );
                        })
                      ) : (
                        <span
                          style={{
                            fontSize: 12,
                            color: C.gray400,
                            fontStyle: "italic",
                          }}
                        >
                          —
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
                          background: counter.isActive ? C.greenSoft : C.redSoft,
                          color: counter.isActive ? C.greenText : C.redText,
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
                            background: counter.isActive ? C.green : C.red,
                          }}
                        />
                        {counter.isActive ? "Hoạt động" : "Vô hiệu"}
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
                        maxWidth: 200,
                        fontStyle: counter.note?.trim() ? "normal" : "italic",
                      }}
                      title={counter.note}
                    >
                      {counter.note?.trim() || "—"}
                    </div>

                    {/* Hành động */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: 8,
                      }}
                    >
                      <button
                        onClick={() => handleOpenModal(counter)}
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
                        onClick={() => {
                          setPendingDeleteId(counter._id);
                          setShowDeleteConfirm(true);
                        }}
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
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── FOOTER ── */}
        {!loading && filteredCounters.length > 0 && (
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
              {currentItems.length} / {filteredCounters.length} phòng
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
              maxWidth: 880,
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
                  {editingId ? "Chỉnh sửa phòng" : "Thêm phòng mới"}
                </div>
                <div style={{ marginTop: 3, fontSize: 12, color: C.gray400 }}>
                  {editingId
                    ? "Cập nhật thông tin phòng dịch vụ"
                    : "Tạo phòng mới để quản lý các quầy dịch vụ"}
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

                  {/* Mã phòng */}
                  <div>
                    <Label>Mã phòng <span style={{ color: C.red }}>*</span></Label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      disabled={!!editingId}
                      placeholder="VD: ROOM001"
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

                  {/* Tên phòng */}
                  <div>
                    <Label>Tên phòng <span style={{ color: C.red }}>*</span></Label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="VD: Phòng VIP, Phòng Thường..."
                      style={field}
                      onFocus={focusField}
                      onBlur={blurField}
                    />
                  </div>

                  {/* Số thứ tự */}
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
                          setFormData({ ...formData, number: (formData.number || 1) - 1 })
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
                        value={formData.number}
                        onChange={(e) =>
                          setFormData({ ...formData, number: parseInt(e.target.value) || 0 })
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
                          setFormData({ ...formData, number: (formData.number || 0) + 1 })
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
                    <div style={{ marginTop: 6, fontSize: 11, color: C.gray400 }}>
                      Số càng nhỏ càng ưu tiên hiển thị đầu
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
                        <div
                          style={{
                            fontSize: 12,
                            color: formData.isActive ? "#22cc60" : "#fca5a5",
                            marginTop: 2,
                          }}
                        >
                          {formData.isActive
                            ? "Phòng đang hoạt động bình thường"
                            : "Phòng tạm thời không sử dụng"}
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Mô tả */}
                  <div>
                    <Label>Mô tả</Label>
                    <textarea
                      value={formData.note}
                      onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                      placeholder="Nhập mô tả chi tiết về phòng..."
                      rows={4}
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
                </div>

                {/* ── Right column — Quầy phục vụ ── */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Label>
                    Quầy phục vụ{" "}
                    <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                      ({services.length} quầy)
                    </span>
                  </Label>

                  <div
                    style={{
                      border: `1px solid ${C.gray200}`,
                      borderRadius: 16,
                      padding: 14,
                      flex: 1,
                      overflowY: "auto",
                      background: C.gray50,
                      maxHeight: 420,
                    }}
                  >
                    {services.length === 0 ? (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "40px 20px",
                          fontSize: 13,
                          color: C.gray400,
                        }}
                      >
                        Chưa có quầy nào
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {services.map((service) => {
                          const isInactive = service.isActive === false;
                          const checked = selectedServices.includes(service._id);
                          return (
                            <label
                              key={service._id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                padding: "11px 13px",
                                background: checked ? C.blueSoft : C.white,
                                border: `1px solid ${checked ? C.blue : C.gray200}`,
                                borderRadius: 12,
                                cursor: isInactive ? "not-allowed" : "pointer",
                                transition: "all .15s ease",
                                opacity: isInactive ? 0.55 : 1,
                              }}
                              onMouseEnter={(e) => {
                                if (!checked && !isInactive) {
                                  e.currentTarget.style.borderColor = C.gray300;
                                  e.currentTarget.style.background = C.gray50;
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!checked && !isInactive) {
                                  e.currentTarget.style.borderColor = C.gray200;
                                  e.currentTarget.style.background = C.white;
                                }
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleServiceToggle(service._id)}
                                disabled={isInactive}
                                style={{
                                  width: 16,
                                  height: 16,
                                  cursor: isInactive ? "not-allowed" : "pointer",
                                  accentColor: C.blue,
                                  flexShrink: 0,
                                }}
                              />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 7,
                                  }}
                                >
                                  <span
                                    style={{
                                      fontWeight: 700,
                                      fontSize: 13,
                                      color: C.gray900,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {service.name}
                                  </span>
                                  {isInactive && (
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: C.redText,
                                        background: C.redSoft,
                                        border: `1px solid #fecaca`,
                                        borderRadius: 4,
                                        padding: "1px 6px",
                                        whiteSpace: "nowrap",
                                        flexShrink: 0,
                                      }}
                                    >
                                      Vô hiệu
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: 11, color: C.gray400, marginTop: 2 }}>
                                  {service.code}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {selectedServices.length > 0 && (
                    <div
                      style={{
                        padding: "8px 12px",
                        background: C.blueSoft,
                        border: `1px solid #bfdbfe`,
                        borderRadius: 10,
                        fontSize: 12,
                        color: C.blueText,
                        fontWeight: 600,
                      }}
                    >
                      Đã chọn {selectedServices.length} quầy
                    </div>
                  )}
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
                {editingId ? "Cập nhật" : "Thêm phòng"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm dialogs ── */}
      <AdminConfirmDialog
        isOpen={showStatusConfirm}
        title="Xác nhận thay đổi trạng thái"
        message={`Bạn có chắc chắn muốn chuyển trạng thái phòng thành ${pendingStatusChange ? "Hoạt động" : "Vô hiệu"}?`}
        onConfirm={handleConfirmStatus}
        onCancel={() => { setShowStatusConfirm(false); setPendingStatusChange(null); }}
      />

      <AdminConfirmDialog
        isOpen={showDeleteConfirm}
        title="Xác nhận xóa phòng"
        message="Bạn có chắc chắn muốn xóa phòng này? Hành động này không thể hoàn tác."
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}