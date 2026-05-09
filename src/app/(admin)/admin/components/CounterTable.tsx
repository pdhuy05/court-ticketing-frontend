"use client";

import React, { useEffect, useState, useCallback } from "react";
import { FiEdit } from "react-icons/fi";
import { RiDeleteBin6Line } from "react-icons/ri";
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
import "@/styles/admin-table.css";

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

  // Pagination state
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
      setFormData({
        code: "",
        name: "",
        number: 1,
        note: "",
        isActive: true,
      });
      setSelectedServices([]);
      setInitialServices([]);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({
      code: "",
      name: "",
      number: 1,
      note: "",
      isActive: true,
    });
    setSelectedServices([]);
    setInitialServices([]);
  };

  const handleServiceToggle = (serviceId: string) => {
    if (selectedServices.includes(serviceId)) {
      setSelectedServices((prev) => prev.filter((id) => id !== serviceId));
    } else {
      setSelectedServices((prev) => [...prev, serviceId]);
    }
  };

  const handleDelete = (counterId: string) => {
    setPendingDeleteId(counterId);
    setShowDeleteConfirm(true);
  };

  const handleStatusChange = (nextStatus: boolean) => {
    setPendingStatusChange(nextStatus);
    setShowStatusConfirm(true);
  };

  const handleConfirmStatus = () => {
    if (pendingStatusChange !== null) {
      setFormData((prev) => ({ ...prev, isActive: pendingStatusChange }));
    }
    setPendingStatusChange(null);
    setShowStatusConfirm(false);
  };

  const handleConfirmDelete = async () => {
    if (pendingDeleteId) {
      try {
        await deleteCounter(pendingDeleteId);
        success("Xóa quầy thành công");
        fetchCounters();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Xóa quầy thất bại";
        error(errorMessage);
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
          (serviceId) => !selectedServices.includes(serviceId),
        );
        await Promise.all(
          removedServiceIds.map((serviceId) =>
            removeServiceFromCounter(editingId, serviceId),
          ),
        );

        // Đồng bộ danh sách quầy sau khi cập nhật thông tin quầy
        if (selectedServices.length > 0) {
          await addServicesToCounter(editingId, selectedServices);
        }
        success("Cập nhật phòng thành công");
        fetchCounters();
        handleCloseModal();
      } else {
        const serviceIdsPayload =
          selectedServices.length > 0 ? selectedServices : "";
        const result = await createCounter({
          code: formData.code,
          name: formData.name,
          number: formData.number,
          note: formData.note,
          isActive: formData.isActive,
          serviceIds: serviceIdsPayload,
        });
        // Thêm services cho counter
        if (selectedServices.length > 0) {
          await addServicesToCounter(result._id, selectedServices);
        }
        success("Tạo quầy thành công");
        fetchCounters();
        handleCloseModal();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Lỗi lưu quầy";
      error(errorMessage);
    }
  };

  const filteredCounters = counters.filter((counter) => {
    const matchesSearch =
      counter.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      counter.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesService =
      filterServiceIds.includes("all") ||
      counter.services.some((service) => filterServiceIds.includes(service._id));
    const matchesStatus =
      filterStatuses.includes("all") ||
      (filterStatuses.includes("active") && counter.isActive) ||
      (filterStatuses.includes("inactive") && !counter.isActive);

    return matchesSearch && matchesService && matchesStatus;
  });

  const serviceColorMap = new Map(
    [...services]
      .sort(
        (a, b) =>
          a.displayOrder - b.displayOrder || a.name.localeCompare(b.name),
      )
      .map((service, index) => [
        service._id,
        getSequentialTagColorStyle(index),
      ]),
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredCounters.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedCounters = filteredCounters.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterServiceIds, filterStatuses]);

  return (
    <div className="admin-table-container">
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
      <div className="admin-table-header">
        <div className="font-bold text-2xl" style={{ color: "#003366" }}>
          QUẢN LÝ PHÒNG
        </div>
        <div className="admin-table-actions">
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
                label: "Phòng",
                value: filterServiceIds,
                onChange: setFilterServiceIds,
                options: [
                  { label: "Tất cả phòng", value: "all" },
                  ...[...services]
                    .sort(
                      (a, b) =>
                        a.displayOrder - b.displayOrder ||
                        a.name.localeCompare(b.name),
                    )
                    .map((service) => ({
                      label: `${service.name} (${service.code})`,
                      value: service._id,
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
          <input
            type="text"
            className="admin-table-search"
            placeholder="Tìm kiếm mã hoặc tên phòng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            onClick={() => handleOpenModal()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 14px",
              background: "#003366",
              color: "white",
              border: "none",
              borderRadius: "20px",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: "18px", lineHeight: 1 }}>+</span>
            Thêm mới
          </button>
        </div>
      </div>
      <div className="admin-table-body">
        <table
  style={{
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: "0 8px",
    background: "transparent",
    fontSize: "clamp(13px, 0.9vw, 14px)",
    textAlign: "left",
  }}
>
  <thead>
    <tr>
      <th
        style={{
          padding: "clamp(10px, 1.5vh, 14px) 16px",
          background: "#1e4775",
          color: "white",
          fontSize: "clamp(12px, 0.85vw, 13px)",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          borderRadius: "12px 0 0 12px",
        }}
      >
        TT
      </th>
      <th
        style={{
          padding: "clamp(10px, 1.5vh, 14px) 16px",
          background: "#1e4775",
          color: "white",
          fontSize: "clamp(12px, 0.85vw, 13px)",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        Tên Phòng
      </th>
      <th
        style={{
          padding: "clamp(10px, 1.5vh, 14px) 16px",
          background: "#1e4775",
          color: "white",
          fontSize: "clamp(12px, 0.85vw, 13px)",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        Mã Phòng
      </th>
      <th
        style={{
          padding: "clamp(10px, 1.5vh, 14px) 16px",
          background: "#1e4775",
          color: "white",
          fontSize: "clamp(12px, 0.85vw, 13px)",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        Tên Quầy
      </th>
      <th
        style={{
          padding: "clamp(10px, 1.5vh, 14px) 16px",
          background: "#1e4775",
          color: "white",
          fontSize: "clamp(12px, 0.85vw, 13px)",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        Trạng Thái
      </th>
      <th
        style={{
          padding: "clamp(10px, 1.5vh, 14px) 16px",
          background: "#1e4775",
          color: "white",
          fontSize: "clamp(12px, 0.85vw, 13px)",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        Mô tả
      </th>
      <th
        style={{
          padding: "clamp(10px, 1.5vh, 14px) 16px",
          background: "#1e4775",
          color: "white",
          fontSize: "clamp(12px, 0.85vw, 13px)",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          borderRadius: "0 12px 12px 0",
        }}
      >
        Hành Động
      </th>
    </tr>
  </thead>
  <tbody>
    {loading ? (
      <tr>
        <td
          colSpan={7}
          style={{
            padding: "48px 24px",
            textAlign: "center",
            background: "white",
            borderRadius: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              color: "#64748b",
            }}
          >
            <div
              style={{
                width: "20px",
                height: "20px",
                border: "2px solid #e2e8f0",
                borderTopColor: "#1e4775",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            Đang tải...
          </div>
        </td>
      </tr>
    ) : paginatedCounters.length > 0 ? (
      paginatedCounters.map((counter) => (
        <tr
          key={counter._id}
          style={{
            background: "white",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#f8fafc";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "white";
          }}
        >
          <td
            style={{
              padding: "clamp(12px, 1.8vh, 16px) 16px",
              borderTop: "1px solid #eef2f6",
              borderBottom: "1px solid #eef2f6",
              borderLeft: "1px solid #eef2f6",
              borderRadius: "12px 0 0 12px",
              fontWeight: 600,
              color: "#1e293b",
              textAlign: "center",
              width: "60px",
            }}
          >
            {counter.number}
          </td>
          <td
            style={{
              padding: "clamp(12px, 1.8vh, 16px) 16px",
              borderTop: "1px solid #eef2f6",
              borderBottom: "1px solid #eef2f6",
              fontWeight: 600,
              color: "#1e293b",
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {counter.name}
            </span>
          </td>
          <td
            style={{
              padding: "clamp(12px, 1.8vh, 16px) 16px",
              borderTop: "1px solid #eef2f6",
              borderBottom: "1px solid #eef2f6",
              color: "#475569",
              fontFamily: "monospace",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            {counter.code}
          </td>
          <td
            style={{
              padding: "clamp(12px, 1.8vh, 16px) 16px",
              borderTop: "1px solid #eef2f6",
              borderBottom: "1px solid #eef2f6",
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
              }}
            >
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
                        gap: "4px",
                        padding: "4px 10px",
                        borderRadius: "20px",
                        fontSize: "11px",
                        fontWeight: 500,
                        background: colors.background,
                        borderLeft: `3px solid ${colors.border}`,
                        color: colors.color,
                      }}
                    >
                      {service.name} ({service.code})
                    </span>
                  );
                })
              ) : (
                <span
                  style={{
                    fontSize: "12px",
                    color: "#94a3b8",
                    fontStyle: "italic",
                  }}
                >
                  — Không có quầy —
                </span>
              )}
            </div>
          </td>
          <td
            style={{
              padding: "clamp(12px, 1.8vh, 16px) 16px",
              borderTop: "1px solid #eef2f6",
              borderBottom: "1px solid #eef2f6",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 12px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 600,
                background: counter.isActive ? "#f0fdf4" : "#fef2f2",
                color: counter.isActive ? "#166534" : "#991b1b",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: counter.isActive ? "#10b981" : "#ef4444",
                }}
              />
              {counter.isActive ? "Hoạt động" : "Vô hiệu"}
            </span>
          </td>
          <td
            style={{
              padding: "clamp(12px, 1.8vh, 16px) 16px",
              borderTop: "1px solid #eef2f6",
              borderBottom: "1px solid #eef2f6",
              color: "#64748b",
              maxWidth: "200px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={counter.note}
          >
            {counter.note?.trim() ? (
              counter.note
            ) : (
              <span style={{ color: "#94a3b8", fontStyle: "italic" }}>
                — Không có mô tả —
              </span>
            )}
          </td>
          <td
            style={{
              padding: "clamp(12px, 1.8vh, 16px) 16px",
              borderTop: "1px solid #eef2f6",
              borderBottom: "1px solid #eef2f6",
              borderRight: "1px solid #eef2f6",
              borderRadius: "0 12px 12px 0",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <button
                onClick={() => handleOpenModal(counter)}
                title="Sửa"
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#eff6ff",
                  color: "#2563eb",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#dbeafe";
                  e.currentTarget.style.transform = "scale(1.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#eff6ff";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                <FiEdit size={16} />
              </button>
              <button
                onClick={() => handleDelete(counter._id)}
                title="Xóa"
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#fef2f2",
                  color: "#dc2626",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#fee2e2";
                  e.currentTarget.style.transform = "scale(1.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#fef2f2";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                <RiDeleteBin6Line size={16} />
              </button>
            </div>
          </td>
        </tr>
      ))
    ) : (
      <tr>
        <td
          colSpan={7}
          style={{
            padding: "48px 24px",
            textAlign: "center",
            background: "white",
            borderRadius: "12px",
          }}
        >
          <div
            style={{
              fontSize: "48px",
              marginBottom: "12px",
              opacity: 0.5,
            }}
          >
          </div>
          <div
            style={{
              fontSize: "18px",
              fontWeight: 500,
              color: "#64748b",
              marginBottom: "8px",
            }}
          >
            Không có phòng nào
          </div>
          <div
            style={{
              fontSize: "14px",
              color: "#94a3b8",
            }}
          >
            Nhấn "Thêm Mới" để thêm phòng đầu tiên
          </div>
        </td>
      </tr>
    )}
  </tbody>
</table>
      </div>
      <div className="admin-table-footer admin-table-footer-inline">
        <span>
          Hiển thị {paginatedCounters.length} trên tổng số {filteredCounters.length}{" "}
          kết quả
        </span>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          className="admin-pagination-inline"
        />
      </div>
      {showModal && (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.6)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      animation: "fadeIn 0.2s ease",
    }}
    onClick={handleCloseModal}
  >
    <div
      style={{
        background: "white",
        borderRadius: "24px",
        width: "90%",
        maxWidth: "1000px",
        maxHeight: "90vh",
        overflow: "auto",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        animation: "slideUp 0.3s ease",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          background: "white",
          borderBottom: "1px solid #eef2f6",
          padding: "20px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 10,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "22px",
              fontWeight: 700,
              background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {editingId ? "Chỉnh Sửa Phòng" : "Thêm Phòng Mới"}
          </h2>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "13px",
              color: "#94a3b8",
            }}
          >
            {editingId
              ? "Cập nhật thông tin phòng dịch vụ"
              : "Tạo phòng mới để quản lý các quầy dịch vụ"}
          </p>
        </div>
        <button
          onClick={handleCloseModal}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "12px",
            border: "none",
            background: "#f1f5f9",
            fontSize: "24px",
            cursor: "pointer",
            color: "#64748b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#fee2e2";
            e.currentTarget.style.color = "#dc2626";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#f1f5f9";
            e.currentTarget.style.color = "#64748b";
          }}
        >
          ×
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: "28px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "32px",
          }}
        >
          {/* Left Column */}
          <div>
            {/* Mã Phòng */}
            <div style={{ marginBottom: "24px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#334155",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Mã Phòng <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                disabled={!!editingId}
                placeholder="VD: ROOM001"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: "14px",
                  border: "2px solid #e2e8f0",
                  borderRadius: "12px",
                  outline: "none",
                  transition: "all 0.2s ease",
                  backgroundColor: editingId ? "#f8fafc" : "#fff",
                  cursor: editingId ? "not-allowed" : "text",
                  opacity: editingId ? 0.7 : 1,
                  fontWeight: 500,
                }}
                onFocus={(e) => {
                  if (!editingId) {
                    e.target.style.borderColor = "#3b82f6";
                    e.target.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)";
                  }
                }}
                onBlur={(e) => {
                  if (!editingId) {
                    e.target.style.borderColor = "#e2e8f0";
                    e.target.style.boxShadow = "none";
                  }
                }}
              />
            </div>

            {/* Tên Phòng */}
            <div style={{ marginBottom: "24px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#334155",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Tên Phòng <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="VD: Phòng VIP, Phòng Thường, Phòng Ưu Tiên..."
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: "14px",
                  border: "2px solid #e2e8f0",
                  borderRadius: "12px",
                  outline: "none",
                  transition: "all 0.2s ease",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#3b82f6";
                  e.target.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e2e8f0";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Số Thứ Tự - Stepper */}
            <div style={{ marginBottom: "24px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#334155",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Số Thứ Tự
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#f8fafc",
                  border: "2px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "4px",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      number: (formData.number || 1) - 1,
                    })
                  }
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    border: "none",
                    background: "white",
                    cursor: "pointer",
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#64748b",
                    transition: "all 0.1s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f1f5f9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "white";
                  }}
                >
                  −
                </button>
                <input
                  type="number"
                  value={formData.number}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      number: parseInt(e.target.value) || 0,
                    })
                  }
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    textAlign: "center",
                    fontSize: "16px",
                    fontWeight: 600,
                    border: "none",
                    outline: "none",
                    background: "transparent",
                  }}
                />
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      number: (formData.number || 0) + 1,
                    })
                  }
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    border: "none",
                    background: "white",
                    cursor: "pointer",
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#64748b",
                    transition: "all 0.1s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f1f5f9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "white";
                  }}
                >
                  +
                </button>
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#94a3b8",
                  marginTop: "6px",
                  marginLeft: "4px",
                }}
              >
                Số càng nhỏ càng ưu tiên hiển thị đầu
              </div>
            </div>

            {/* Trạng Thái */}
            <div style={{ marginBottom: "24px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "12px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#334155",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Trạng Thái
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "16px",
                  background: formData.isActive ? "#f0fdf4" : "#fef2f2",
                  border: `2px solid ${formData.isActive ? "#bbf7d0" : "#fecaca"}`,
                  borderRadius: "16px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => handleStatusChange(e.target.checked)}
                  style={{
                    width: "20px",
                    height: "20px",
                    cursor: "pointer",
                    accentColor: formData.isActive ? "#10b981" : "#ef4444",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "14px",
                      color: formData.isActive ? "#166534" : "#991b1b",
                      marginBottom: "2px",
                    }}
                  >
                    {formData.isActive ? "Hoạt động" : "Vô hiệu"}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: formData.isActive ? "#006023" : "#fca5a5",
                    }}
                  >
                    {formData.isActive
                      ? "Phòng đang hoạt động bình thường"
                      : "Phòng tạm thời không sử dụng"}
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Right Column */}
          <div>
            {/* Quầy Phục Vụ */}
            <div style={{ marginBottom: "24px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "12px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#334155",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Quầy Phục Vụ
                <span
                  style={{
                    marginLeft: "8px",
                    fontSize: "11px",
                    color: "#94a3b8",
                    fontWeight: 400,
                  }}
                >
                  ({services.length} quầy)
                </span>
              </label>
              <div
                style={{
                  border: "2px solid #e2e8f0",
                  borderRadius: "16px",
                  padding: "12px",
                  height: "280px",
                  overflowY: "auto",
                  background: "#fafbfc",
                }}
              >
                {services.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "40px 20px",
                      color: "#94a3b8",
                    }}
                  >
                    <div style={{ fontSize: "40px", marginBottom: "8px" }}>
                      📭
                    </div>
                    <div style={{ fontSize: "14px" }}>Chưa có quầy nào</div>
                    <div style={{ fontSize: "12px", marginTop: "4px" }}>
                      Vui lòng thêm quầy trước
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    {services.map((service) => (
                      <label
                        key={service._id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "12px",
                          background: selectedServices.includes(service._id)
                            ? "#eff6ff"
                            : "white",
                          border: `1px solid ${
                            selectedServices.includes(service._id)
                              ? "#3b82f6"
                              : "#e2e8f0"
                          }`,
                          borderRadius: "12px",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (!selectedServices.includes(service._id)) {
                            e.currentTarget.style.borderColor = "#94a3b8";
                            e.currentTarget.style.background = "#f8fafc";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!selectedServices.includes(service._id)) {
                            e.currentTarget.style.borderColor = "#e2e8f0";
                            e.currentTarget.style.background = "white";
                          }
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedServices.includes(service._id)}
                          onChange={() => handleServiceToggle(service._id)}
                          style={{
                            width: "18px",
                            height: "18px",
                            cursor: "pointer",
                            accentColor: "#3b82f6",
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: "14px",
                              color: "#1e293b",
                              marginBottom: "2px",
                            }}
                          >
                            {service.name}
                          </div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#94a3b8",
                            }}
                          >
                            Mã: {service.code}
                          </div>
                        </div>
                        {service.isActive === false && (
                          <span
                            style={{
                              fontSize: "10px",
                              padding: "2px 8px",
                              background: "#fef2f2",
                              color: "#dc2626",
                              borderRadius: "20px",
                            }}
                          >
                            Vô hiệu
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {selectedServices.length > 0 && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "8px 12px",
                    background: "#eff6ff",
                    borderRadius: "10px",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span>
                    Đã chọn <strong>{selectedServices.length}</strong> quầy
                  </span>
                </div>
              )}
            </div>

            {/* Mô Tả */}
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#334155",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Mô Tả
              </label>
              <textarea
                value={formData.note}
                onChange={(e) =>
                  setFormData({ ...formData, note: e.target.value })
                }
                placeholder="Nhập mô tả chi tiết về phòng..."
                rows={4}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: "14px",
                  border: "2px solid #e2e8f0",
                  borderRadius: "12px",
                  outline: "none",
                  resize: "vertical",
                  fontFamily: "inherit",
                  transition: "all 0.2s ease",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#3b82f6";
                  e.target.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e2e8f0";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          background: "white",
          borderTop: "1px solid #eef2f6",
          padding: "16px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "12px",
        }}
      >
        <button
          onClick={handleCloseModal}
          style={{
            padding: "10px 24px",
            background: "white",
            color: "#64748b",
            border: "2px solid #e2e8f0",
            borderRadius: "12px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#f8fafc";
            e.currentTarget.style.borderColor = "#cbd5e1";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "white";
            e.currentTarget.style.borderColor = "#e2e8f0";
          }}
        >
          Hủy bỏ
        </button>
        <button
          onClick={handleSave}
          style={{
            padding: "10px 28px",
            background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
            color: "white",
            border: "none",
            borderRadius: "12px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: "0 4px 6px rgba(37, 99, 235, 0.2)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 6px 12px rgba(37, 99, 235, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 6px rgba(37, 99, 235, 0.2)";
          }}
        >
          {editingId ? "Cập nhật" : "Thêm phòng"}
        </button>
      </div>
    </div>
  </div>
)}

      <AdminConfirmDialog
        isOpen={showStatusConfirm}
        title="Xác thực thay đổi trạng thái"
        message={`Bạn có chắc chắn muốn chuyển trạng thái phòng thành ${pendingStatusChange ? "Hoạt động" : "Vô hiệu"}?`}
        onConfirm={handleConfirmStatus}
        onCancel={() => {
          setShowStatusConfirm(false);
          setPendingStatusChange(null);
        }}
      />

      <AdminConfirmDialog
        isOpen={showDeleteConfirm}
        title="Xác nhận xóa phòng"
        message="Bạn có chắc chắn muốn xóa phòng này? Hành động này không thể hoàn tác."
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
}
