"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiEdit, FiRepeat } from "react-icons/fi";
import { RiDeleteBin6Line } from "react-icons/ri";
import {
  assignCounterToStaff,
  Counter,
  createStaff,
  deleteStaff,
  getCounters,
  getStaff,
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
import "@/styles/admin-table.css";

type ApiErrorShape = {
  response?: {
    data?: {
      errors?: Record<string, string | { message?: string }>;
      message?: string;
    };
  };
  message?: string;
};

const parseApiError = (err: unknown): string => {
  const apiError = err as ApiErrorShape;
  const data = apiError?.response?.data;

  if (!data) {
    return apiError?.message || "Lỗi không xác định";
  }

  if (data.errors) {
    const firstErrorKey = Object.keys(data.errors)[0];
    const firstError = data.errors[firstErrorKey];

    if (typeof firstError === "string") {
      return firstError;
    }

    if (firstError?.message) {
      return firstError.message;
    }
  }

  return data.message || "Lỗi không xác định";
};

type StaffTableService = StaffServiceInfo & {
  _id: string;
  id?: string;
};

export default function StaffTable() {
  const { toasts, removeToast, success, error } = useToast();
  const guardSession = useAdminSessionGuard();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [counters, setCounters] = useState<Counter[]>([]);
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

  useEffect(() => {
    void fetchStaff();
    void fetchCounters();
  }, [fetchStaff, fetchCounters]);

  const mapCounterServices = (counterId: string | null) => {
    const counterServices =
      counters.find((counter) => counter._id === (counterId || ""))?.services || [];

    return counterServices.map((service) => ({
      id: service._id,
      _id: service._id,
      code: service.code,
      name: service.name,
      icon: service.icon,
      displayOrder: service.displayOrder,
    }));
  };

  const handleOpenModal = (staff?: Staff) => {
    if (staff) {
      const normalizedAvailableServices = mapCounterServices(staff.counterId?._id || null);
      const initialSelected =
        staff.serviceRestrictionConfigured && staff.assignedServices
          ? new Set(staff.assignedServices.map((service) => service.id || service._id))
          : new Set(normalizedAvailableServices.map((service) => service.id || service._id));

      setEditingId(staff._id);
      setFormData({
        username: staff.username,
        password: "",
        fullName: staff.fullName,
        counterId: staff.counterId?._id || null,
        isActive: staff.isActive,
      });
      setFormAvailableServices(normalizedAvailableServices);
      setFormSelectedServiceIds(initialSelected);
    } else {
      setEditingId(null);
      setFormData({
        username: "",
        password: "",
        fullName: "",
        counterId: null,
        isActive: true,
      });
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

  const handleDelete = (staffId: string) => {
    setPendingDeleteId(staffId);
    setShowDeleteConfirm(true);
  };

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

  const handleFormCounterChange = (counterId: string | null) => {
    const normalizedAvailableServices = mapCounterServices(counterId);
    setFormData((prev) => ({ ...prev, counterId }));
    setFormAvailableServices(normalizedAvailableServices);
    setFormSelectedServiceIds(
      new Set(normalizedAvailableServices.map((service) => service.id || service._id)),
    );
  };

  const handleToggleFormService = (serviceId: string) => {
    setFormSelectedServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(serviceId)) next.delete(serviceId);
      else next.add(serviceId);
      return next;
    });
  };

  const handleSave = async () => {
    if (!formData.username || !formData.fullName) {
      error("Vui lòng nhập tên đăng nhập và họ tên");
      return;
    }

    if (!editingId && !formData.password) {
      error("Vui lòng nhập mật khẩu cho nhân viên mới");
      return;
    }

    const previousCounterId = editingId
      ? staffList.find((staff) => staff._id === editingId)?.counterId?._id ?? null
      : null;

    try {
      let savedStaff: Staff;

      if (editingId) {
        if (formData.counterId && formData.counterId !== previousCounterId) {
          await assignCounterToStaff(editingId, formData.counterId);
        }

        savedStaff = await updateStaff(editingId, {
          fullName: formData.fullName,
          isActive: formData.isActive,
          password: formData.password || undefined,
          counterId: formData.counterId,
        });

        if (formData.counterId) {
          await updateStaffServices(savedStaff._id, Array.from(formSelectedServiceIds));
        }

        success("Cập nhật nhân viên thành công");
      } else {
        savedStaff = await createStaff({
          username: formData.username,
          password: formData.password,
          fullName: formData.fullName,
        });

        if (formData.counterId) {
          await assignCounterToStaff(savedStaff._id, formData.counterId);
          if (formSelectedServiceIds.size > 0) {
            await updateStaffServices(savedStaff._id, Array.from(formSelectedServiceIds));
          }
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

  const handleOpenServiceModal = async (staff: Staff) => {
    setServiceModalStaff(staff);
    setShowServiceModal(true);
    setServiceModalLoading(true);

    try {
      const normalizedAvailableServices = mapCounterServices(staff.counterId?._id || null);
      const initialSelected =
        staff.serviceRestrictionConfigured && staff.assignedServices
          ? new Set(staff.assignedServices.map((service) => service.id || service._id))
          : new Set(normalizedAvailableServices.map((service) => service.id || service._id));

      setAvailableServices(normalizedAvailableServices);
      setSelectedServiceIds(initialSelected);
      setServiceRestrictionConfigured(Boolean(staff.serviceRestrictionConfigured));
    } catch (err) {
      error(err instanceof Error ? err.message : "Lỗi tải quầy");
      setShowServiceModal(false);
    } finally {
      setServiceModalLoading(false);
    }
  };

  const handleToggleService = (serviceId: string) => {
    setSelectedServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(serviceId)) next.delete(serviceId);
      else next.add(serviceId);
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
      const msg = err instanceof Error ? err.message : "Lỗi lưu quầy";
      if (msg.includes("404") || msg.toLowerCase().includes("not found")) {
        error("API gán quầy trả 404, vui lòng kiểm tra backend.");
      } else {
        error(msg);
      }
    } finally {
      setServiceModalSaving(false);
    }
  };

  const allServices = useMemo(() => {
    const map = new Map<string, StaffTableService>();
    counters.forEach((counter) => {
      counter.services?.forEach((service) => {
        map.set(service._id, service as StaffTableService);
      });
    });

    return Array.from(map.values()).sort(
      (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0),
    );
  }, [counters]);

  const serviceColorMap = useMemo(() => {
    const colorMap = new Map<string, ReturnType<typeof getSequentialTagColorStyle>>();
    allServices.forEach((service, index) => {
      const color = getSequentialTagColorStyle(index);
      if (service._id) colorMap.set(service._id, color);
      if (service.id) colorMap.set(service.id, color);
    });
    return colorMap;
  }, [allServices]);

  const filteredStaff = staffList.filter((staff) => {
    const matchesSearch =
      staff.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.fullName.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesCounter =
      filterCounterIds.includes("all") ||
      (filterCounterIds.includes("unassigned") && !staff.counterId) ||
      (staff.counterId && filterCounterIds.includes(staff.counterId._id));
      
    const matchesService = 
      filterServiceIds.includes("all") ||
      (filterServiceIds.includes("unassigned") && (!staff.effectiveServices || staff.effectiveServices.length === 0)) ||
      (staff.effectiveServices && staff.effectiveServices.some(s => filterServiceIds.includes(s.id || s._id)));

    const matchesStatus =
      filterStatuses.includes("all") ||
      (filterStatuses.includes("active") && staff.isActive) ||
      (filterStatuses.includes("inactive") && !staff.isActive);

    return matchesSearch && matchesCounter && matchesService && matchesStatus;
  });

  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
  const currentItems = filteredStaff.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCounterIds, filterServiceIds, filterStatuses]);

  const getCounterDisplay = (staff: Staff) => {
    if (!staff.counterId) return null;
    const matchedCounter = counters.find((counter) => counter._id === staff.counterId?._id);
    const counterCode = staff.counterId.code || matchedCounter?.code || "";
    return `${staff.counterId.name}${counterCode ? ` (${counterCode})` : ""}`;
  };

  return (
    <div className="admin-table-container">
      <div className="admin-table-header">
        <div className="font-bold text-2xl" style={{ color: "#003366" }}>
          QUẢN LÝ NHÂN VIÊN
        </div>
        <div className="admin-table-actions">
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
                    .map((counter) => ({
                      label: `${counter.name} (${counter.code})`,
                      value: counter._id,
                    })),
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
                  ...allServices.map((service) => ({
                    label: `${service.name} (${service.code})`,
                    value: service._id,
                  })),
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
          <input
            type="text"
            className="admin-table-search"
            placeholder="Tìm kiếm nhân viên..."
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
        {loading ? (
          <div className="admin-table-loading">Đang tải...</div>
        ) : (
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
        Tên đăng nhập
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
        Họ và tên
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
        Phòng trực
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
        Quầy trực
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
        Đăng nhập
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
    ) : currentItems.length > 0 ? (
      currentItems.map((staff) => (
        <tr
          key={staff._id}
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
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #1e4775 0%, #2d5a8c 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "white",
                }}
              >
                {staff.username?.charAt(0).toUpperCase() || "U"}
              </span>
              <span style={{ fontWeight: 600 }}>{staff.username}</span>
            </span>
          </td>
          <td
            style={{
              padding: "clamp(12px, 1.8vh, 16px) 16px",
              borderTop: "1px solid #eef2f6",
              borderBottom: "1px solid #eef2f6",
              color: "#475569",
              fontWeight: 500,
            }}
          >
            {staff.fullName || (
              <span style={{ color: "#94a3b8", fontStyle: "italic" }}>
                Chưa cập nhật
              </span>
            )}
          </td>
          <td
            style={{
              padding: "clamp(12px, 1.8vh, 16px) 16px",
              borderTop: "1px solid #eef2f6",
              borderBottom: "1px solid #eef2f6",
            }}
          >
            {staff.counterId ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 500,
                  background: "#e0e7ff",
                  color: "#3730a3",
                }}
              >
                {getCounterDisplay(staff)}
              </span>
            ) : (
              <span
                style={{
                  fontSize: "12px",
                  color: "#94a3b8",
                  fontStyle: "italic",
                }}
              >
                — Chưa gán —
              </span>
            )}
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
              {staff.effectiveServices && staff.effectiveServices.length > 0 ? (
                staff.effectiveServices.map((service) => {
                  const serviceId = service.id || service._id;
                  const tagStyle = serviceColorMap.get(serviceId) || {
                    background: "#dbeafe",
                    border: "#2563eb",
                    color: "#1e3a8a",
                  };

                  return (
                    <span
                      key={serviceId}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "4px 10px",
                        borderRadius: "20px",
                        fontSize: "11px",
                        fontWeight: 500,
                        background: tagStyle.background,
                        borderLeft: `3px solid ${tagStyle.border}`,
                        color: tagStyle.color,
                      }}
                    >
                       {service.name}
                      {service.code ? ` (${service.code})` : ""}
                    </span>
                  );
                })
              ) : staff.serviceRestrictionConfigured ? (
                <span
                  style={{
                    fontSize: "12px",
                    color: "#94a3b8",
                    fontStyle: "italic",
                  }}
                >
                  — Không có quầy —
                </span>
              ) : (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 10px",
                    borderRadius: "20px",
                    fontSize: "11px",
                    fontWeight: 500,
                    background: "#f1f5f9",
                    color: "#64748b",
                  }}
                >
                  📋 Tất cả (mặc định)
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
                background: staff.isActive ? "#f0fdf4" : "#fef2f2",
                color: staff.isActive ? "#166534" : "#991b1b",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: staff.isActive ? "#10b981" : "#ef4444",
                }}
              />
              {staff.isActive ? "Hoạt động" : "Vô hiệu"}
            </span>
          </td>
          <td
            style={{
              padding: "clamp(12px, 1.8vh, 16px) 16px",
              borderTop: "1px solid #eef2f6",
              borderBottom: "1px solid #eef2f6",
              color: "#64748b",
              fontSize: "12px",
              whiteSpace: "nowrap",
            }}
          >
            {staff.lastLoginAt ? (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {new Date(staff.lastLoginAt).toLocaleString("vi-VN")}
              </span>
            ) : (
              <span
                style={{
                  color: "#94a3b8",
                  fontStyle: "italic",
                }}
              >
                Chưa đăng nhập
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
                gap: "6px",
              }}
            >
              <button
                onClick={() => handleOpenModal(staff)}
                title="Sửa thông tin"
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
                onClick={() => handleOpenServiceModal(staff)}
                title="Phân quyền quầy"
                disabled={!staff.counterId}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  border: "none",
                  background: staff.counterId ? "#fef3c7" : "#f1f5f9",
                  color: staff.counterId ? "#d97706" : "#94a3b8",
                  cursor: staff.counterId ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                  opacity: staff.counterId ? 1 : 0.5,
                }}
                onMouseEnter={(e) => {
                  if (staff.counterId) {
                    e.currentTarget.style.background = "#fde68a";
                    e.currentTarget.style.transform = "scale(1.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (staff.counterId) {
                    e.currentTarget.style.background = "#fef3c7";
                    e.currentTarget.style.transform = "scale(1)";
                  }
                }}
              >
                <FiRepeat size={14} />
              </button>
              <button
                onClick={() => handleDelete(staff._id)}
                title="Xóa nhân viên"
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
            Không có nhân viên nào
          </div>
          <div
            style={{
              fontSize: "14px",
              color: "#94a3b8",
            }}
          >
            Nhấn &quot;Thêm Mới&quot; để thêm nhân viên đầu tiên
          </div>
        </td>
      </tr>
    )}
  </tbody>
</table>

        )}
      </div>

      <div className="admin-table-footer">
        <span>Hiển thị {currentItems.length} trên tổng số {filteredStaff.length} kết quả</span>
      </div>
      {filteredStaff.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => setCurrentPage(page)}
        />
      )}

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
            {editingId ? "Chỉnh Sửa Nhân Viên" : "Thêm Nhân Viên Mới"}
          </h2>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "13px",
              color: "#94a3b8",
            }}
          >
            {editingId
              ? "Cập nhật thông tin nhân viên"
              : "Tạo tài khoản nhân viên mới để quản lý hệ thống"}
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
            {/* Tên đăng nhập */}
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
                Tên đăng nhập <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                disabled={!!editingId}
                placeholder="Nhập tên đăng nhập"
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

            {/* Mật khẩu */}
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
                Mật khẩu {!editingId && <span style={{ color: "#ef4444" }}>*</span>}
                {editingId && (
                  <span
                    style={{
                      marginLeft: "8px",
                      fontSize: "11px",
                      color: "#94a3b8",
                      fontWeight: 400,
                    }}
                  >
                    (Để trống nếu không đổi)
                  </span>
                )}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder={editingId ? "Nhập mật khẩu mới nếu muốn đổi" : "Nhập mật khẩu"}
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

            {/* Họ và tên */}
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
                Họ và tên <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                placeholder="Nhập họ và tên"
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
          </div>

          {/* Right Column */}
          <div>
            {/* Gán phòng */}
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
                Gán phòng
              </label>
              <select
                value={formData.counterId || ""}
                onChange={(e) => handleFormCounterChange(e.target.value || null)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: "14px",
                  border: "2px solid #e2e8f0",
                  borderRadius: "12px",
                  outline: "none",
                  transition: "all 0.2s ease",
                  backgroundColor: "white",
                  cursor: "pointer",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#3b82f6";
                  e.target.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e2e8f0";
                  e.target.style.boxShadow = "none";
                }}
              >
                <option value="">— Không gán phòng —</option>
                {counters.map((counter) => (
                  <option key={counter._id} value={counter._id}>
                    {counter.name} ({counter.code})
                  </option>
                ))}
              </select>
              <div
                style={{
                  marginTop: "8px",
                  padding: "8px 12px",
                  background: "#f0fdf4",
                  borderRadius: "10px",
                  fontSize: "11px",
                  color: "#166534",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                Sau khi lưu gán phòng, hệ thống sẽ chuyển sang bước chọn quầy
              </div>
            </div>

            {/* Quầy áp dụng - Chỉ hiển thị khi đã chọn phòng */}
            {formData.counterId && (
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
                  Quầy áp dụng cho nhân viên
                  <span
                    style={{
                      marginLeft: "8px",
                      fontSize: "11px",
                      color: "#94a3b8",
                      fontWeight: 400,
                    }}
                  >
                    ({formAvailableServices.length} quầy)
                  </span>
                </label>

                {formAvailableServices.length === 0 ? (
                  <div
                    style={{
                      padding: "40px 20px",
                      textAlign: "center",
                      background: "#fafbfc",
                      border: "2px dashed #e2e8f0",
                      borderRadius: "16px",
                      color: "#94a3b8",
                    }}
                  >
                    <div style={{ fontSize: "40px", marginBottom: "8px" }}>
                      📭
                    </div>
                    <div style={{ fontSize: "14px" }}>Phòng này chưa có quầy nào</div>
                    <div style={{ fontSize: "12px", marginTop: "4px" }}>
                      Vui lòng thêm quầy vào phòng trước
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      border: "2px solid #e2e8f0",
                      borderRadius: "16px",
                      padding: "12px",
                      maxHeight: "240px",
                      overflowY: "auto",
                      background: "#fafbfc",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      {formAvailableServices.map((service) => {
                        const id = service.id || service._id;
                        const checked = formSelectedServiceIds.has(id);

                        return (
                          <label
                            key={id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                              padding: "12px",
                              background: checked ? "#eff6ff" : "white",
                              border: `1px solid ${
                                checked ? "#3b82f6" : "#e2e8f0"
                              }`,
                              borderRadius: "12px",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                              if (!checked) {
                                e.currentTarget.style.borderColor = "#94a3b8";
                                e.currentTarget.style.background = "#f8fafc";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!checked) {
                                e.currentTarget.style.borderColor = "#e2e8f0";
                                e.currentTarget.style.background = "white";
                              }
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleToggleFormService(id)}
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
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {formAvailableServices.length > 0 && formSelectedServiceIds.size === 0 && (
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "8px 12px",
                      background: "#fef2f2",
                      borderRadius: "10px",
                      fontSize: "12px",
                      color: "#dc2626",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    Vui lòng chọn ít nhất một quầy cho nhân viên
                  </div>
                )}

                {formSelectedServiceIds.size > 0 && (
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
                      Đã chọn <strong>{formSelectedServiceIds.size}</strong> quầy
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Kích hoạt tài khoản */}
            <div>
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
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      isActive: e.target.checked,
                    })
                  }
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
                    {formData.isActive ? "Tài khoản hoạt động" : "Tài khoản bị khóa"}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: formData.isActive ? "#26b85e" : "#ff8484",
                    }}
                  >
                    {formData.isActive
                      ? "Nhân viên có thể đăng nhập và làm việc"
                      : "Nhân viên không thể đăng nhập vào hệ thống"}
                  </div>
                </div>
              </label>
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
          {editingId ? "Cập nhật" : "Thêm nhân viên"}
        </button>
      </div>
    </div>
  </div>
)}

      <AdminConfirmDialog
        isOpen={showDeleteConfirm}
        title="Xác nhận xóa nhân viên"
        message="Bạn có chắc chắn muốn xóa nhân viên này? Hành động này không thể hoàn tác."
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />

      {showServiceModal && serviceModalStaff && (
        <div className="admin-modal">
          <div className="admin-modal-content" style={{ maxWidth: 480 }}>
            <button className="admin-modal-close" onClick={() => setShowServiceModal(false)}>
              ×
            </button>
            <h3>Phân quyền quầy - {serviceModalStaff.fullName}</h3>

            {!serviceModalStaff.counterId && (
              <p
                style={{
                  color: "#856404",
                  background: "#fff3cd",
                  padding: "8px 12px",
                  borderRadius: 6,
                  fontSize: 14,
                }}
              >
                Nhân viên chưa được gán phòng, vui lòng gán phòng trước.
              </p>
            )}

            {serviceModalLoading ? (
              <p style={{ color: "#666", textAlign: "center", padding: 20 }}>Đang tải quầy...</p>
            ) : (
              <>
                <p style={{ fontSize: 13, color: "#555", marginBottom: 12 }}>
                  {serviceRestrictionConfigured
                    ? "Nhân viên đang áp dụng giới hạn quầy riêng. Hãy chọn rõ quầy nào được áp dụng cho nhân viên này."
                    : "Chưa cấu hình, nhân viên đang xử lý tất cả quầy của phòng."}
                </p>

                {availableServices.length === 0 ? (
                  <p style={{ color: "#999", fontStyle: "italic" }}>Phòng không có quầy nào.</p>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      marginBottom: 20,
                    }}
                  >
                    {availableServices.map((service) => {
                      const id = service.id || service._id;
                      const checked = selectedServiceIds.has(id);

                      return (
                        <label
                          key={id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            cursor: "pointer",
                            padding: "8px 12px",
                            borderRadius: 6,
                            background: checked ? "#e8f0fe" : "#f9f9f9",
                            border: `1px solid ${checked ? "#4a7fd4" : "#ddd"}`,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleToggleService(id)}
                            style={{ width: 16, height: 16 }}
                          />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14, color: "#003366" }}>
                              {service.name}
                            </div>
                            <div style={{ fontSize: 12, color: "#888" }}>{service.code}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                <div className="admin-form-actions">
                  <button
                    className="submit"
                    onClick={handleSaveServices}
                    disabled={serviceModalSaving}
                  >
                    {serviceModalSaving ? "Đang lưu..." : "Lưu"}
                  </button>
                  <button className="cancel" onClick={() => setShowServiceModal(false)}>
                    Hủy
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
