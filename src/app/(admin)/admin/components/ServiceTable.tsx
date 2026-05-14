"use client";

import React, { useEffect, useState, useCallback } from "react";
import { FiEdit } from "react-icons/fi";
import { RiDeleteBin6Line } from "react-icons/ri";
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
import "@/styles/admin-table.css";

// Helper function to get icon component from name
const getIconComponent = (iconName: string) => {
  const Icon = (RiIcons as Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>>)[iconName];
  return Icon || null;
};

export default function ServiceTable() {
  const PREFIX_NUMBER_MIN = 0;
  const PREFIX_NUMBER_MAX = 99;
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
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<
    boolean | null
  >(null);
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
  });

  const validatePrefixNumber = (value: number) => {
    if (!Number.isInteger(value)) {
      return "Số tiền tố phải là số nguyên.";
    }

    if (value < PREFIX_NUMBER_MIN || value > PREFIX_NUMBER_MAX) {
      return `Số tiền tố phải nằm trong khoảng từ ${PREFIX_NUMBER_MIN} đến ${PREFIX_NUMBER_MAX}.`;
    }

    return "";
  };

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
      });
      setPrefixNumberError("");
      const counterIds = service.counters?.map((counter) => counter._id) || [];
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
    setFormData({
      code: "",
      name: "",
      icon: "",
      description: "",
      displayOrder: 1,
      prefixNumber: 0,
      isActive: true,
      doublePrint: false,
    });
    setPrefixNumberError("");
    setSelectedCounters([]);
    setInitialCounters([]);
  };

  const handleCounterToggle = (counterId: string) => {
    if (selectedCounters.includes(counterId)) {
      setSelectedCounters((prev) => prev.filter((id) => id !== counterId));
      return;
    }
    setSelectedCounters((prev) => [...prev, counterId]);
  };

  const handleStatusChange = (newStatus: boolean) => {
    setPendingStatusChange(newStatus);
    setShowStatusConfirm(true);
  };

  const handleConfirmStatus = () => {
    if (pendingStatusChange !== null) {
      setFormData({ ...formData, isActive: pendingStatusChange });
    }
    setShowStatusConfirm(false);
    setPendingStatusChange(null);
  };

  const handleDelete = (serviceId: string) => {
    setPendingDeleteId(serviceId);
    setShowDeleteConfirm(true);
  };

  const handlePrefixNumberChange = (value: string) => {
    const nextValue = Number(value);
    setFormData((prev) => ({
      ...prev,
      prefixNumber: nextValue,
    }));
    setPrefixNumberError(validatePrefixNumber(nextValue));
  };

  const handleToggleDoublePrint = async (service: Service, nextValue: boolean) => {
    if (doublePrintTogglingId === service._id) return;
    if (Boolean(service.doublePrint) === nextValue) return;
    setDoublePrintTogglingId(service._id);
    try {
      const { service: updated, message } = await patchServiceDoublePrint(
        service._id,
        nextValue,
      );
      setServices((prev) =>
        prev.map((s) => (s._id === service._id ? { ...s, ...updated } : s)),
      );
      success(message);
    } catch (err) {
      error(
        err instanceof Error ? err.message : "Không cập nhật được in 2 vé",
      );
    } finally {
      setDoublePrintTogglingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (pendingDeleteId) {
      try {
        await deleteService(pendingDeleteId);
        success("Xóa quầy thành công");
        fetchServices();
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
        await updateService(editingId, {
          ...formData,
          prefixNumber: normalizedPrefixNumber,
        });

        const removedCounterIds = initialCounters.filter(
          (counterId) => !selectedCounters.includes(counterId),
        );
        if (removedCounterIds.length > 0) {
          await Promise.all(
            removedCounterIds.map((counterId) =>
              removeServiceFromCounter(counterId, editingId),
            ),
          );
        }

        const addedCounterIds = selectedCounters.filter(
          (counterId) => !initialCounters.includes(counterId),
        );
        if (addedCounterIds.length > 0) {
          await Promise.all(
            addedCounterIds.map((counterId) =>
              addServicesToCounter(counterId, [editingId]),
            ),
          );
        }

        success("Cập nhật quầy thành công");
        fetchServices();
        fetchCounters();
        handleCloseModal();
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
        });

        await Promise.all(
          selectedCounters.map((counterId) =>
            addServicesToCounter(counterId, [createdService._id]),
          ),
        );

        success("Tạo quầy thành công");
        fetchServices();
        fetchCounters();
        handleCloseModal();
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Lỗi lưu quầy thất bại";
      error(errorMessage);
    }
  };

  const filteredServices = services.filter((service) => {
    const matchesSearch =
      service.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCounter =
      filterCounterIds.includes("all") ||
      service.counters?.some((counter) => filterCounterIds.includes(counter._id));
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
      .map((counter, index) => [
        counter._id,
        getSequentialTagColorStyle(index),
      ]),
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedServices = filteredServices.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCounterIds, filterStatuses, filterPrefixNumbers]);

  return (
    <div className="admin-table-container">
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
      <div className="admin-table-header">
        <div className="font-bold text-2xl" style={{ color: "#003366" }}>
          QUẢN LÝ QUẦY
        </div>
        <div className="admin-table-actions">
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
                    new Set(services.map((service) => String(service.prefixNumber ?? 0))),
                  )
                    .sort((a, b) => Number(a) - Number(b))
                    .map((value) => ({
                      label: `Tiền tố ${value}`,
                      value,
                    })),
                ],
              },
            ]}
          />
          <input
            type="text"
            className="admin-table-search"
            placeholder="Tìm kiếm mã hoặc tên quầy..."
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
        Mã quầy
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
        Mã tiền tố
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
        Tên quầy
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
        Phòng
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
        Trạng thái
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
        }}
        title="Bật: in vé đầy đủ + tờ nhỏ kẹp hồ sơ. Tắt: chỉ một tờ."
      >
        In 2 vé
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
        Hành động
      </th>
    </tr>
  </thead>
  <tbody>
    {loading ? (
      <tr>
        <td
          colSpan={9}
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
    ) : paginatedServices.length > 0 ? (
      paginatedServices.map((service, rowIndex) => (
        <tr
          key={service._id}
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
            {indexOfFirstItem + rowIndex + 1}
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
            {service.code}
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
            {service.prefixNumber ?? 0}
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
              {service.icon &&
                getIconComponent(service.icon) &&
                React.createElement(getIconComponent(service.icon)!, {
                  size: 18,
                  style: { color: "#1e4775" },
                })}
              {service.name}
            </span>
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
                    {counter.name} ({counter.code})
                  </span>
                );
              })}
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
                background: service.isActive ? "#f0fdf4" : "#fef2f2",
                color: service.isActive ? "#166534" : "#991b1b",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: service.isActive ? "#10b981" : "#ef4444",
                }}
              />
              {service.isActive ? "Hoạt động" : "Vô hiệu"}
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
            title={service.description}
          >
            {service.description || "—"}
          </td>
          <td
            style={{
              padding: "clamp(12px, 1.8vh, 16px) 16px",
              borderTop: "1px solid #eef2f6",
              borderBottom: "1px solid #eef2f6",
              verticalAlign: "middle",
            }}
          >
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                cursor:
                  doublePrintTogglingId === service._id ? "wait" : "pointer",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={Boolean(service.doublePrint)}
                disabled={doublePrintTogglingId === service._id}
                onChange={(e) => {
                  void handleToggleDoublePrint(service, e.target.checked);
                }}
                style={{
                  width: "18px",
                  height: "18px",
                  cursor:
                    doublePrintTogglingId === service._id ? "wait" : "pointer",
                  accentColor: "#1e4775",
                }}
              />
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: service.doublePrint ? "#0f766e" : "#64748b",
                }}
              >
                {service.doublePrint ? "2 tờ" : "1 tờ"}
              </span>
            </label>
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
                onClick={() => handleOpenModal(service)}
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
                onClick={() => handleDelete(service._id)}
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
          colSpan={9}
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
            Không có quầy nào
          </div>
          <div
            style={{
              fontSize: "14px",
              color: "#94a3b8",
            }}
          >
            Nhấn &quot;Thêm Mới&quot; để thêm quầy đầu tiên
          </div>
        </td>
      </tr>
    )}
  </tbody>
</table>
      </div>
      <div className="admin-table-footer">
        <span>
          Hiển thị {paginatedServices.length} trên tổng số {filteredServices.length}{" "}
          kết quả
        </span>
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
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
        maxWidth: "1200px",
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
            {editingId ? "Chỉnh Sửa Quầy" : "Thêm Quầy Mới"}
          </h2>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "13px",
              color: "#94a3b8",
            }}
          >
            {editingId
              ? "Cập nhật thông tin quầy dịch vụ"
              : "Tạo quầy dịch vụ mới để quản lý"}
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
            {/* Mã Quầy */}
            <div style={{ marginBottom: "20px" }}>
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
                Mã Quầy <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                disabled={!!editingId}
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

            {/* Tên Quầy */}
            <div style={{ marginBottom: "20px" }}>
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
                Tên Quầy <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="VD: Quầy số 1, Quầy VIP..."
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

            {/* Số Thứ Tự & Mã Tiền tố - 2 cột */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
                marginBottom: "20px",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#334155",
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
                        displayOrder: (formData.displayOrder || 1) - 1,
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
                    value={formData.displayOrder}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        displayOrder: parseInt(e.target.value) || 0,
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
                        displayOrder: (formData.displayOrder || 0) + 1,
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
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#334155",
                  }}
                >
                  Mã tiền tố
                  <span
                    style={{
                      marginLeft: "6px",
                      fontSize: "11px",
                      color: "#94a3b8",
                      fontWeight: 400,
                    }}
                  >
                    ({PREFIX_NUMBER_MIN}-{PREFIX_NUMBER_MAX})
                  </span>
                </label>
                <input
                  type="number"
                  min={PREFIX_NUMBER_MIN}
                  max={PREFIX_NUMBER_MAX}
                  value={formData.prefixNumber}
                  onChange={(e) => handlePrefixNumberChange(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    fontSize: "14px",
                    border: `2px solid ${prefixNumberError ? "#ef4444" : "#e2e8f0"}`,
                    borderRadius: "12px",
                    outline: "none",
                    transition: "all 0.2s ease",
                  }}
                  onFocus={(e) => {
                    if (!prefixNumberError) {
                      e.target.style.borderColor = "#3b82f6";
                    }
                  }}
                  onBlur={(e) => {
                    if (!prefixNumberError) {
                      e.target.style.borderColor = "#e2e8f0";
                    }
                  }}
                />
                {prefixNumberError && (
                  <div
                    style={{
                      marginTop: "6px",
                      fontSize: "11px",
                      color: "#ef4444",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span></span> {prefixNumberError}
                  </div>
                )}
              </div>
            </div>

            {/* Trạng Thái */}
            <div style={{ marginBottom: "20px" }}>
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
                      color: formData.isActive ? "#86efac" : "#fca5a5",
                    }}
                  >
                    {formData.isActive
                      ? "Quầy đang hoạt động bình thường"
                      : "Quầy tạm thời không phục vụ"}
                  </div>
                </div>
              </label>
            </div>

            <div style={{ marginBottom: "20px" }}>
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
                In 2 vé (tờ nhỏ kẹp hồ sơ)
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "16px",
                  background: formData.doublePrint ? "#ecfeff" : "#f8fafc",
                  border: `2px solid ${formData.doublePrint ? "#67e8f9" : "#e2e8f0"}`,
                  borderRadius: "16px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <input
                  type="checkbox"
                  checked={formData.doublePrint}
                  onChange={(e) =>
                    setFormData({ ...formData, doublePrint: e.target.checked })
                  }
                  style={{
                    width: "20px",
                    height: "20px",
                    cursor: "pointer",
                    accentColor: "#0891b2",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "14px",
                      color: formData.doublePrint ? "#0e7490" : "#475569",
                      marginBottom: "2px",
                    }}
                  >
                    {formData.doublePrint
                      ? "Bật — in vé đầy đủ + tờ nhỏ"
                      : "Tắt — chỉ in một tờ vé đầy đủ"}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: formData.doublePrint ? "#22d3ee" : "#94a3b8",
                    }}
                  >
                    Có thể bật/tắt nhanh trong bảng (cột In 2 vé).
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Right Column */}
          <div>
            {/* Biểu tượng */}
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
                Biểu tượng
              </label>
              <div
                style={{
                  border: "2px solid #e2e8f0",
                  borderRadius: "16px",
                  padding: "16px",
                  maxHeight: "240px",
                  overflowY: "auto",
                  display: "grid",
                  gridTemplateColumns: "repeat(6, 1fr)",
                  gap: "10px",
                  background: "#fafbfc",
                }}
              >
                {FONTAWESOME_ICONS.map((icon) => {
                  const IconComponent = getIconComponent(icon.class);
                  return (
                    <button
                      key={icon.id}
                      onClick={() => setFormData({ ...formData, icon: icon.class })}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "12px 8px",
                        border:
                          formData.icon === icon.class
                            ? "2px solid #3b82f6"
                            : "1px solid #e2e8f0",
                        borderRadius: "12px",
                        background:
                          formData.icon === icon.class ? "#eff6ff" : "white",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        gap: "6px",
                      }}
                      onMouseEnter={(e) => {
                        if (formData.icon !== icon.class) {
                          e.currentTarget.style.borderColor = "#94a3b8";
                          e.currentTarget.style.background = "#f8fafc";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (formData.icon !== icon.class) {
                          e.currentTarget.style.borderColor = "#e2e8f0";
                          e.currentTarget.style.background = "white";
                        }
                      }}
                    >
                      {IconComponent ? (
                        <IconComponent
                          size={22}
                          style={{
                            color: formData.icon === icon.class ? "#3b82f6" : "#64748b",
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: "12px", color: "#999" }}>
                          N/A
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: "9px",
                          color: formData.icon === icon.class ? "#3b82f6" : "#94a3b8",
                          fontWeight: formData.icon === icon.class ? 600 : 400,
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
                  marginTop: "12px",
                  padding: "10px 12px",
                  background: "#f0fdf4",
                  borderRadius: "10px",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>
                  Đã chọn: <strong>{formData.icon || "Chưa chọn"}</strong>
                </span>
              </div>
            </div>

            {/* Mô Tả */}
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
                Mô Tả
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Nhập mô tả chi tiết về quầy..."
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

            {/* Thêm vào phòng */}
            <div>
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
                Thêm vào phòng
              </label>
              <div
                style={{
                  border: "2px solid #e2e8f0",
                  borderRadius: "16px",
                  padding: "16px",
                  background: "#fafbfc",
                  maxHeight: "160px",
                  overflowY: "auto",
                }}
              >
                {counters.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "20px",
                      color: "#94a3b8",
                    }}
                  >
                    📭 Chưa có phòng nào
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: "12px",
                    }}
                  >
                    {counters.map((counter) => (
                      <label
                        key={counter._id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "10px 12px",
                          background: selectedCounters.includes(counter._id)
                            ? "#eff6ff"
                            : "white",
                          border: `1px solid ${
                            selectedCounters.includes(counter._id)
                              ? "#3b82f6"
                              : "#e2e8f0"
                          }`,
                          borderRadius: "10px",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (!selectedCounters.includes(counter._id)) {
                            e.currentTarget.style.borderColor = "#94a3b8";
                            e.currentTarget.style.background = "#f8fafc";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!selectedCounters.includes(counter._id)) {
                            e.currentTarget.style.borderColor = "#e2e8f0";
                            e.currentTarget.style.background = "white";
                          }
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedCounters.includes(counter._id)}
                          onChange={() => handleCounterToggle(counter._id)}
                          style={{
                            width: "18px",
                            height: "18px",
                            cursor: "pointer",
                            accentColor: "#3b82f6",
                          }}
                        />
                        <div>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: "13px",
                              color: "#1e293b",
                            }}
                          >
                            {counter.name}
                          </div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#94a3b8",
                            }}
                          >
                            {counter.code}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
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
          {editingId ? "Cập nhật" : "Thêm mới"}
        </button>
      </div>
    </div>
  </div>
)}

      <AdminConfirmDialog
        isOpen={showStatusConfirm}
        title="Xác thực thay đổi trạng thái"
        message={`Bạn có chắc chắn muốn chuyển trạng thái quầy thành ${pendingStatusChange ? "Hoạt động" : "Vô hiệu"}?`}
        onConfirm={handleConfirmStatus}
        onCancel={() => {
          setShowStatusConfirm(false);
          setPendingStatusChange(null);
        }}
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

