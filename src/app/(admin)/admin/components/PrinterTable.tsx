"use client";

import { useCallback, useEffect, useState } from "react";
import { FiEdit2, FiSearch, FiTrash2, FiX } from "react-icons/fi";
import { TbPlus, TbPrinter } from "react-icons/tb";

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

/* ───────────────────────────────────────────── */

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

/* ───────────────────────────────────────────── */

const GRID_TEMPLATE =
  "minmax(260px,1.4fr) minmax(220px,1.2fr) minmax(180px,.9fr) minmax(150px,.7fr) minmax(140px,.7fr) 90px";

/* ───────────────────────────────────────────── */

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
  e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>
) => {
  e.target.style.borderColor = "#bfdbfe";
  e.target.style.boxShadow = "0 0 0 4px rgba(37,99,235,.08)";
};

const blurField = (
  e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>
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

type PrinterFormData = Omit<Printer, "_id" | "services">;

const emptyForm: PrinterFormData = {
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
};

/* ───────────────────────────────────────────── */

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
  const [formData, setFormData] = useState<PrinterFormData>(emptyForm);

  const itemsPerPage = 10;

  /* ── Fetch ── */

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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatuses, filterDefaults, filterTypes, filterLocations]);

  /* ── Modal ── */

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
      setFormData(emptyForm);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  /* ── Save ── */

  const handleSave = async () => {
    if (!formData.name || !formData.code || !formData.connection.host) {
      error("Vui lòng nhập đầy đủ thông tin bắt buộc");
      return;
    }
    try {
      const payload = {
        ...formData,
        connection: {
          host: formData.connection.host,
          port: Number(formData.connection.port),
        },
      };
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

  /* ── Delete ── */

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

  /* ── Filter ── */

  const filteredPrinters = printers.filter((p) => {
    const q = searchTerm.toLowerCase();
    return (
      (p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q)) &&
      (filterStatuses.includes("all") ||
        (filterStatuses.includes("active") && p.isActive) ||
        (filterStatuses.includes("inactive") && !p.isActive)) &&
      (filterDefaults.includes("all") ||
        (filterDefaults.includes("default") && p.isDefault) ||
        (filterDefaults.includes("not-default") && !p.isDefault)) &&
      (filterTypes.includes("all") || filterTypes.includes(p.type)) &&
      (filterLocations.includes("all") || filterLocations.includes(p.location || ""))
    );
  });

  const totalPages = Math.ceil(filteredPrinters.length / itemsPerPage);
  const currentItems = filteredPrinters.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  /* ─────────────────────────────────────────────────────── */
  /* Render                                                  */
  /* ─────────────────────────────────────────────────────── */

  return (
    <div>
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />

      {/* CARD */}
      <div
        style={{
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: 26,
          overflow: "hidden",
        }}
      >
        {/* HEADER */}
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
              <TbPrinter size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.gray900 }}>
                Quản lý máy in
              </div>
              <div style={{ marginTop: 3, fontSize: 12, color: C.gray400 }}>
                {printers.length} máy in
              </div>
            </div>
          </div>

          {/* Right */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                    { label: "Tất cả", value: "all" },
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
                    { label: "Mặc định", value: "default" },
                    { label: "Không mặc định", value: "not-default" },
                  ],
                },
                {
                  id: "printer-type",
                  label: "Loại kết nối",
                  value: filterTypes,
                  onChange: setFilterTypes,
                  options: [
                    { label: "Tất cả", value: "all" },
                    { label: "Network (TCP/IP)", value: "network" },
                    { label: "USB", value: "usb" },
                    { label: "Bluetooth", value: "bluetooth" },
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
                placeholder="Tìm kiếm tên, mã, vị trí..."
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

        {/* BODY */}
        <div style={{ padding: 22 }}>
          {loading ? (
            <div style={{ padding: "60px 0", textAlign: "center", fontSize: 14, color: C.gray400 }}>
              Đang tải dữ liệu...
            </div>
          ) : filteredPrinters.length === 0 ? (
            <div style={{ padding: "60px 0", textAlign: "center" }}>
              <TbPrinter size={42} style={{ color: C.gray200, marginBottom: 12 }} />
              <div style={{ fontSize: 14, color: C.gray400 }}>Không có máy in nào</div>
              <div style={{ marginTop: 6, fontSize: 12, color: C.gray300 }}>
                Nhấn &quot;Thêm mới&quot; để tạo máy in đầu tiên
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
                  columnGap: 24,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  color: C.gray400,
                }}
              >
                <div>Máy in</div>
                <div>Mã / Kết nối</div>
                <div>Vị trí</div>
                <div>Trạng thái</div>
                <div>Mặc định</div>
                <div>Hành động</div>
              </div>

              {/* Rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {currentItems.map((printer) => (
                  <div
                    key={printer._id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: GRID_TEMPLATE,
                      alignItems: "center",
                      columnGap: 24,
                      minHeight: 72,
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
                    {/* Tên máy in */}
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.gray900, lineHeight: 1.3 }}>
                        {printer.name}
                      </div>
                    </div>

                    {/* Mã / Kết nối */}
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.gray700, fontFamily: "monospace", lineHeight: 1.2 }}>
                        {printer.code}
                      </div>
                      <div style={{ marginTop: 5, fontSize: 12, color: C.gray400, fontFamily: "monospace", lineHeight: 1.2 }}>
                        {printer.connection.host}:{printer.connection.port}
                      </div>
                    </div>

                    {/* Vị trí */}
                    <div style={{ display: "flex", alignItems: "center", fontSize: 13, color: C.gray500 }}>
                      {printer.location || "—"}
                    </div>

                    {/* Trạng thái */}
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          height: 28,
                          padding: "0 12px",
                          borderRadius: 999,
                          background: printer.isActive ? C.greenSoft : C.redSoft,
                          color: printer.isActive ? C.greenText : C.redText,
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
                            background: printer.isActive ? C.green : C.red,
                          }}
                        />
                        {printer.isActive ? "Hoạt động" : "Vô hiệu"}
                      </span>
                    </div>

                    {/* Mặc định */}
                    <div style={{ display: "flex", alignItems: "center" }}>
                      {printer.isDefault ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            height: 28,
                            padding: "0 12px",
                            borderRadius: 999,
                            background: C.blueSoft,
                            color: C.blueText,
                            fontSize: 11.5,
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Mặc định
                        </span>
                      ) : (
                        <span style={{ color: C.gray300, fontSize: 18 }}>—</span>
                      )}
                    </div>

                    {/* Hành động */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                      <button
                        onClick={() => handleOpenModal(printer)}
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

                      <button
                        onClick={() => {
                          setPendingDeleteId(printer._id);
                          setShowDeleteConfirm(true);
                        }}
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

        {/* FOOTER */}
        {!loading && filteredPrinters.length > 0 && (
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
              {currentItems.length} / {filteredPrinters.length} máy in
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
              width: "92%",
              maxWidth: 760,
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
                  {editingId ? "Chỉnh sửa máy in" : "Thêm máy in mới"}
                </div>
                <div style={{ marginTop: 3, fontSize: 12, color: C.gray400 }}>
                  {editingId
                    ? "Cập nhật thông tin cấu hình máy in"
                    : "Thêm máy in mới vào hệ thống"}
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                style={{
                  width: 34, height: 34, borderRadius: 10,
                  border: `1px solid ${C.gray200}`, background: C.white,
                  cursor: "pointer", color: C.gray400,
                  display: "flex", alignItems: "center", justifyContent: "center",
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

                {/* ── Cột trái ── */}
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

                  {/* Tên máy in */}
                  <div>
                    <Label>Tên máy in <span style={{ color: C.red }}>*</span></Label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="VD: Máy in tầng 1"
                      style={field}
                      onFocus={focusField}
                      onBlur={blurField}
                    />
                  </div>

                  {/* Mã máy in */}
                  <div>
                    <Label>Mã máy in <span style={{ color: C.red }}>*</span></Label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      disabled={!!editingId}
                      placeholder="VD: PRINTER001"
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

                  {/* Vị trí */}
                  <div>
                    <Label>Vị trí</Label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="VD: Phòng chờ tầng 1"
                      style={field}
                      onFocus={focusField}
                      onBlur={blurField}
                    />
                  </div>

                  {/* Loại kết nối */}
                  <div>
                    <Label>Loại kết nối</Label>
                    <select
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value as "network" | "usb" | "bluetooth" })
                      }
                      style={{ ...field, cursor: "pointer" }}
                      onFocus={focusField}
                      onBlur={blurField}
                    >
                      <option value="network">Network (TCP/IP)</option>
                      <option value="usb">USB</option>
                      <option value="bluetooth">Bluetooth</option>
                    </select>
                  </div>
                </div>

                {/* ── Cột phải ── */}
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

                  {/* Host */}
                  <div>
                    <Label>
                      {formData.type === "network" ? "Địa chỉ IP" : "Địa chỉ thiết bị"}{" "}
                      <span style={{ color: C.red }}>*</span>
                    </Label>
                    <input
                      type="text"
                      value={formData.connection.host}
                      onChange={(e) =>
                        setFormData({ ...formData, connection: { ...formData.connection, host: e.target.value } })
                      }
                      placeholder={
                        formData.type === "network"
                          ? "VD: 192.168.1.100"
                          : formData.type === "usb"
                          ? "VD: /dev/usb/lp0"
                          : "VD: AA:BB:CC:DD:EE:FF"
                      }
                      style={field}
                      onFocus={focusField}
                      onBlur={blurField}
                    />
                  </div>

                  {/* Port — chỉ hiện khi network */}
                  {formData.type === "network" && (
                    <div>
                      <Label>Cổng (Port)</Label>
                      <input
                        type="number"
                        value={formData.connection.port}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            connection: { ...formData.connection, port: Number(e.target.value) },
                          })
                        }
                        placeholder="9100"
                        min={1}
                        max={65535}
                        style={field}
                        onFocus={focusField}
                        onBlur={blurField}
                      />
                      <div style={{ marginTop: 6, fontSize: 11, color: C.gray400 }}>
                        Mặc định: 9100 (RAW printing)
                      </div>
                    </div>
                  )}

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
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        style={{ width: 18, height: 18, cursor: "pointer", accentColor: formData.isActive ? C.green : C.red }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: formData.isActive ? C.greenText : C.redText }}>
                          {formData.isActive ? "Hoạt động" : "Vô hiệu"}
                        </div>
                        <div style={{ fontSize: 12, color: formData.isActive ? "#2bbf61" : "#fca5a5", marginTop: 2 }}>
                          {formData.isActive ? "Máy in đang được sử dụng" : "Máy in tạm thời không sử dụng"}
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Mặc định */}
                  <div>
                    <Label>Đặt làm mặc định</Label>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "14px 16px",
                        background: formData.isDefault ? C.blueSoft : C.gray50,
                        border: `1px solid ${formData.isDefault ? "#bfdbfe" : C.gray200}`,
                        borderRadius: 14,
                        cursor: "pointer",
                        transition: "all .15s ease",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.isDefault}
                        onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                        style={{ width: 18, height: 18, cursor: "pointer", accentColor: C.blue }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: formData.isDefault ? C.blueText : C.gray700 }}>
                          {formData.isDefault ? "Máy in mặc định" : "Không phải mặc định"}
                        </div>
                        <div style={{ fontSize: 12, color: formData.isDefault ? "#4282cb" : C.gray400, marginTop: 2 }}>
                          {formData.isDefault
                            ? "Hệ thống sẽ ưu tiên dùng máy in này"
                            : "Chỉ dùng khi được chỉ định rõ"}
                        </div>
                      </div>
                    </label>
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
                  height: 40, padding: "0 24px",
                  border: "none", borderRadius: 12,
                  background: C.navy, color: "#fff",
                  fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all .15s ease",
                  boxShadow: "0 4px 14px rgba(15,37,68,.2)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.navyHover; e.currentTarget.style.boxShadow = "0 6px 18px rgba(15,37,68,.28)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = C.navy; e.currentTarget.style.boxShadow = "0 4px 14px rgba(15,37,68,.2)"; }}
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
    </div>
  );
}