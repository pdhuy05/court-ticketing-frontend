"use client";

import { useCallback, useEffect, useState } from "react";
import { FiEdit } from "react-icons/fi";
import { RiDeleteBin6Line } from "react-icons/ri";
import {
  createPrinter,
  deletePrinter,
  getPrinters,
  Printer,
  updatePrinter,
} from "@/services/admin.service";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/ToastContainer";
import AdminConfirmDialog from "@/components/admin/AdminConfirmDialog";
import Pagination from "./Pagination";
import AdminTableFilter from "./AdminTableFilter";
import "@/styles/admin-table.css";

export default function PrinterTable() {
  const { toasts, removeToast, success, error } = useToast();
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatuses, setFilterStatuses] = useState<string[]>(["all"]);
  const [filterDefaults, setFilterDefaults] = useState<string[]>(["all"]);
  const [filterTypes, setFilterTypes] = useState<string[]>(["all"]);
  const [filterLocations, setFilterLocations] = useState<string[]>(["all"]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  type PrinterFormData = Omit<Printer, "_id" | "services">;

  const [formData, setFormData] = useState<PrinterFormData>({
    name: "",
    code: "",
    type: "network",
    connection: {
      host: "",
      port: 9100,
    },
    location: "",
    isActive: true,
    isDefault: false,
  });

  const fetchPrinters = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPrinters();
      setPrinters(data);
    } catch {
      error("Không thể tải danh sách máy in");
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    void fetchPrinters();
  }, [fetchPrinters]);

  const handleOpenModal = (printer?: Printer) => {
    if (printer) {
      setEditingId(printer._id);
      setFormData({
        name: printer.name,
        code: printer.code,
        type: printer.type,
        connection: {
          host: printer.connection.host || "",
          port: printer.connection.port || 9100,
        },
        location: printer.location,
        isActive: printer.isActive,
        isDefault: printer.isDefault,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        code: "",
        type: "network",
        connection: {
          host: "",
          port: 9100,
        },
        location: "",
        isActive: true,
        isDefault: false,
      });
    }

    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleDelete = (printerId: string) => {
    setPendingDeleteId(printerId);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return;

    try {
      await deletePrinter(pendingDeleteId);
      success("Xóa máy in thành công");
      await fetchPrinters();
    } catch (err) {
      error(err instanceof Error ? err.message : "Xóa máy in thất bại");
    } finally {
      setShowDeleteConfirm(false);
      setPendingDeleteId(null);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code || !formData.connection.host) {
      error("Vui lòng nhập đầy đủ thông tin bắt buộc");
      return;
    }

    const payload = {
      ...formData,
      connection: {
        host: formData.connection.host,
        port: Number(formData.connection.port),
      },
    };

    try {
      if (editingId) {
        await updatePrinter(editingId, payload);
        success("Cập nhật máy in thành công");
      } else {
        await createPrinter(payload);
        success("Tạo máy in thành công");
      }

      await fetchPrinters();
      handleCloseModal();
    } catch (err) {
      error(err instanceof Error ? err.message : "Lưu máy in thất bại");
    }
  };

  const filteredPrinters = printers.filter((printer) => {
    const matchesSearch =
      printer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      printer.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      printer.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatuses.includes("all") ||
      (filterStatuses.includes("active") && printer.isActive) ||
      (filterStatuses.includes("inactive") && !printer.isActive);
    const matchesDefault =
      filterDefaults.includes("all") ||
      (filterDefaults.includes("default") && printer.isDefault) ||
      (filterDefaults.includes("not-default") && !printer.isDefault);
    const matchesType =
      filterTypes.includes("all") || filterTypes.includes(printer.type);
    const matchesLocation =
      filterLocations.includes("all") || filterLocations.includes(printer.location || "");

    return (
      matchesSearch &&
      matchesStatus &&
      matchesDefault &&
      matchesType &&
      matchesLocation
    );
  });

  const totalPages = Math.ceil(filteredPrinters.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPrinters.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatuses, filterDefaults, filterTypes, filterLocations]);

  return (
    <div className="admin-table-container">
      <div className="admin-table-header">
        <div className="font-bold text-2xl" style={{ color: "#003366" }}>
          QUẢN LÝ MÁY IN
        </div>
        <div className="admin-table-actions">
          <AdminTableFilter
            activeCount={
              (filterStatuses.includes("all") ? 0 : filterStatuses.length) +
              (filterDefaults.includes("all") ? 0 : filterDefaults.length) +
              (filterTypes.includes("all") ? 0 : filterTypes.length) +
              (filterLocations.includes("all") ? 0 : filterLocations.length)
            }
            onReset={() => {
              setFilterStatuses(["all"]);
              setFilterDefaults(["all"]);
              setFilterTypes(["all"]);
              setFilterLocations(["all"]);
            }}
            sections={[
              {
                id: "printer-status",
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
                id: "printer-default",
                label: "Mặc định",
                value: filterDefaults,
                onChange: setFilterDefaults,
                options: [
                  { label: "Tất cả", value: "all" },
                  { label: "Máy in mặc định", value: "default" },
                  { label: "Không mặc định", value: "not-default" },
                ],
              },
              {
                id: "printer-type",
                label: "Loại kết nối",
                value: filterTypes,
                onChange: setFilterTypes,
                options: [
                  { label: "Tất cả loại", value: "all" },
                  ...Array.from(new Set(printers.map((printer) => printer.type))).map((type) => ({
                    label: type,
                    value: type,
                  })),
                ],
              },
              {
                id: "printer-location",
                label: "Vị trí",
                value: filterLocations,
                onChange: setFilterLocations,
                options: [
                  { label: "Tất cả vị trí", value: "all" },
                  ...Array.from(
                    new Set(
                      printers
                        .map((printer) => printer.location?.trim())
                        .filter((location): location is string => Boolean(location)),
                    ),
                  ).map((location) => ({
                    label: location,
                    value: location,
                  })),
                ],
              },
            ]}
          />
          <input
            type="text"
            className="admin-table-search"
            placeholder="Tìm kiếm máy in..."
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
          <div className="admin-table-loading">Đang tải dữ liệu...</div>
        ) : filteredPrinters.length === 0 ? (
          <div className="admin-table-empty">Không có máy in nào</div>
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
                  Tên Máy In
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
                  Mã Máy In
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
                  Vị trí
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
                  Kết nối
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
                  Mặc định
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
              {currentItems.map((printer) => (
                <tr
                  key={printer._id}
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
                    {printer.name}
                  </td>
                  <td
                    style={{
                      padding: "clamp(12px, 1.8vh, 16px) 16px",
                      borderTop: "1px solid #eef2f6",
                      borderBottom: "1px solid #eef2f6",
                      color: "#475569",
                      fontFamily: "monospace",
                      fontSize: "13px",
                    }}
                  >
                    {printer.code}
                  </td>
                  <td
                    style={{
                      padding: "clamp(12px, 1.8vh, 16px) 16px",
                      borderTop: "1px solid #eef2f6",
                      borderBottom: "1px solid #eef2f6",
                      color: "#64748b",
                    }}
                  >
                    {printer.location || "—"}
                  </td>
                  <td
                    style={{
                      padding: "clamp(12px, 1.8vh, 16px) 16px",
                      borderTop: "1px solid #eef2f6",
                      borderBottom: "1px solid #eef2f6",
                      color: "#475569",
                      fontFamily: "monospace",
                      fontSize: "12px",
                    }}
                  >
                    {printer.connection.host && printer.connection.port ? (
                      `${printer.connection.host}:${printer.connection.port}`
                    ) : (
                      <span style={{ color: "#94a3b8" }}>—</span>
                    )}
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
                        background: printer.isActive ? "#f0fdf4" : "#fef2f2",
                        color: printer.isActive ? "#166534" : "#991b1b",
                      }}
                    >
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: printer.isActive ? "#10b981" : "#ef4444",
                        }}
                      />
                      {printer.isActive ? "Hoạt động" : "Vô hiệu"}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "clamp(12px, 1.8vh, 16px) 16px",
                      borderTop: "1px solid #eef2f6",
                      borderBottom: "1px solid #eef2f6",
                    }}
                  >
                    {printer.isDefault ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "4px 10px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: 600,
                          background: "#eff6ff",
                          color: "#1e40af",
                        }}
                      >
                        Có
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: "12px",
                          color: "#94a3b8",
                        }}
                      >
                        —
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
                        onClick={() => handleOpenModal(printer)}
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
                        onClick={() => handleDelete(printer._id)}
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
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="admin-table-footer">
        <span>Hiển thị {currentItems.length} trên tổng số {filteredPrinters.length} kết quả</span>
      </div>
      {filteredPrinters.length > 0 && (
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
        maxWidth: "900px",
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
            {editingId ? "Chỉnh Sửa Máy In" : "Thêm Máy In Mới"}
          </h2>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "13px",
              color: "#94a3b8",
            }}
          >
            {editingId
              ? "Cập nhật thông tin máy in"
              : "Thêm máy in mới để phục vụ in vé"}
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
            gap: "24px",
          }}
        >
          {/* Tên Máy In */}
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
              Tên Máy In <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="VD: Máy in vé tầng 1, POS-01..."
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

          {/* Mã Máy In */}
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
              Mã Máy In <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value })
              }
              placeholder="VD: PR001, PRINTER_01..."
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

          {/* Loại kết nối */}
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
              Loại kết nối
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  type: e.target.value as PrinterFormData["type"],
                })
              }
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
              <option value="network">Network (Mạng)</option>
              <option value="serial">Serial (COM)</option>
              <option value="usb">USB</option>
            </select>
          </div>

          {/* Vị trí */}
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
              Vị trí
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              placeholder="VD: Phòng A, Tầng 1, Quầy số 3..."
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

          {/* Địa chỉ IP */}
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
              Địa chỉ IP
            </label>
            <input
              type="text"
              value={formData.connection.host}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  connection: { ...formData.connection, host: e.target.value },
                })
              }
              placeholder="VD: 192.168.1.100"
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

          {/* Cổng (Port) */}
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
              Cổng (Port)
            </label>
            <input
              type="number"
              value={formData.connection.port}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  connection: {
                    ...formData.connection,
                    port: Number(e.target.value),
                  },
                })
              }
              placeholder="VD: 9100"
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

        {/* Trạng thái - 2 cột */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
            marginTop: "24px",
          }}
        >
          {/* Kích hoạt */}
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
                setFormData({ ...formData, isActive: e.target.checked })
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
                {formData.isActive ? "Hoạt động" : "Vô hiệu"}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: formData.isActive ? "#47cf79" : "#fb6e6e",
                }}
              >
                {formData.isActive
                  ? "Máy in sẵn sàng phục vụ"
                  : "Máy in tạm thời không sử dụng"}
              </div>
            </div>
          </label>

          {/* Mặc định */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              padding: "16px",
              background: formData.isDefault ? "#eff6ff" : "#f8fafc",
              border: `2px solid ${
                formData.isDefault ? "#bfdbfe" : "#e2e8f0"
              }`,
              borderRadius: "16px",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <input
              type="checkbox"
              checked={formData.isDefault}
              onChange={(e) =>
                setFormData({ ...formData, isDefault: e.target.checked })
              }
              style={{
                width: "20px",
                height: "20px",
                cursor: "pointer",
                accentColor: "#3b82f6",
              }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: "14px",
                  color: formData.isDefault ? "#1e40af" : "#475569",
                  marginBottom: "2px",
                }}
              >
                {formData.isDefault ? "Mặc định" : "Không mặc định"}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: formData.isDefault ? "#93c5fd" : "#94a3b8",
                }}
              >
                {formData.isDefault
                  ? "Máy in sẽ được sử dụng mặc định"
                  : "Chỉ sử dụng khi được chọn"}
              </div>
            </div>
          </label>
        </div>

        {/* Thông tin kết nối mạng - Hint */}
        {formData.type === "network" && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px 16px",
              background: "#eff6ff",
              borderRadius: "12px",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#1e40af",
            }}
          >
            <span>
              Đảm bảo máy in đã được cấu hình IP tĩnh và kết nối mạng
            </span>
          </div>
        )}

        {formData.type === "serial" && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px 16px",
              background: "#fef3c7",
              borderRadius: "12px",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#92400e",
            }}
          >
            <span>
              Kết nối COM: Kiểm tra cổng COM và tốc độ Baudrate
            </span>
          </div>
        )}
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
          {editingId ? "Cập nhật" : "Thêm máy in"}
        </button>
      </div>
    </div>
  </div>
)}

      <AdminConfirmDialog
        isOpen={showDeleteConfirm}
        title="Xác nhận xóa máy in"
        message="Bạn có chắc chắn muốn xóa máy in này? Hành động này không thể hoàn tác."
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
}
