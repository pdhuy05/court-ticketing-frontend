"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { RiArrowLeftLine } from "react-icons/ri";
import { Service, getServices } from "@/mock/services";
import { createTicket, printTicket } from "@/services/ticket.service";
import { Ticket } from "@/mock/data";
import Toast from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";

interface DisplayTicket extends Ticket {
  _id?: string;
  qrCode?: string;
  serviceCode?: string;
  displayNumber?: string;
  formattedNumber?: string;
}

const MAX_FULL_NAME_LENGTH = 35;
const FULL_NAME_ALLOWED_PATTERN = /^[\p{L}\s]+$/u;
const FULL_NAME_REPEATED_CHAR_PATTERN = /([\p{L}])\1{2,}/u;

const sanitizeFullName = (value: string) =>
  value.replace(/\s+/g, " ").replace(/^\s+/g, "");

const normalizeFullName = (value: string) => sanitizeFullName(value).trim();

const getTicketDisplayNumber = (ticket?: Partial<DisplayTicket> | null) =>
  ticket?.displayNumber ||
  ticket?.formattedNumber ||
  String(ticket?.number ?? "").padStart(3, "0");

function ServiceTicketContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceId = params.serviceId as string;
  const selectedCounterId = searchParams.get("counterId")?.trim() || "";

  const [service, setService] = useState<Service | null>(null);
  const [step, setStep] = useState<"form" | "done">("form");
  const [ticket, setTicket] = useState<DisplayTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [hasPrinted, setHasPrinted] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [displayedName, setDisplayedName] = useState(fullName);
  const nameContainerRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLParagraphElement>(null);
  const [toast, setToast] = useState<{
    isOpen: boolean;
    message: string;
    type: "success" | "error" | "warning" | "info";
  }>({ isOpen: false, message: "", type: "info" });

  const name = normalizeFullName(fullName);

  const showToast = (
    message: string,
    type: "success" | "error" | "warning" | "info",
  ) => setToast({ isOpen: true, message, type });

  const handleCloseToast = useCallback(() => {
    setToast((prev) => ({ ...prev, isOpen: false }));
  }, []);

  useEffect(() => {
    const loadService = async () => {
      const services = await getServices();
      const found = services.find((s) => s._id === serviceId);
      if (found) setService(found);
      setLoading(false);
    };
    void loadService();
  }, [serviceId]);

  useEffect(() => {
    if (step === "done" && nameContainerRef.current && nameRef.current) {
      const containerWidth = nameContainerRef.current.offsetWidth;
      const nameWidth = nameRef.current.scrollWidth;
      setDisplayedName(nameWidth > containerWidth ? formatName(fullName) : fullName);
    }
  }, [fullName, step]);

  useEffect(() => {
    if (step !== "done") { setCountdown(60); return; }
    const interval = window.setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [step]);

  useEffect(() => {
    if (step === "done" && countdown === 0) router.push("/");
  }, [countdown, router, step]);

  const validateForm = () => {
    const normalizedName = normalizeFullName(fullName);
    if (!normalizedName) { showToast("Vui lòng nhập họ tên", "error"); return false; }
    if (!FULL_NAME_ALLOWED_PATTERN.test(normalizedName)) {
      showToast("Họ và tên chỉ được nhập chữ cái, không dùng ký tự đặc biệt", "error");
      return false;
    }
    if (normalizedName.length > MAX_FULL_NAME_LENGTH) {
      showToast("Họ và tên không được vượt quá 35 ký tự", "error");
      return false;
    }
    if (FULL_NAME_REPEATED_CHAR_PATTERN.test(normalizedName)) {
      showToast("Họ và tên không được có ký tự lặp liên tiếp từ 3 lần trở lên", "error");
      return false;
    }
    if (!phoneNumber.trim()) { showToast("Vui lòng nhập số điện thoại", "error"); return false; }
    if (!/^[0-9]{8,12}$/.test(phoneNumber.replace(/\D/g, ""))) {
      showToast("Vui lòng nhập đúng số điện thoại (tối thiểu 8 số đến 12 số)", "error");
      return false;
    }
    return true;
  };

  const submitTicket = async () => {
    if (isSubmitting || !service) return;
    setIsSubmitting(true);
    try {
      const result = await createTicket({
        serviceId,
        name,
        phone: phoneNumber,
        counterId: selectedCounterId || undefined,
      });
      if (result.success && result.data) {
        const ticketData = {
          ...result.data,
          id: result.data.id || result.data._id || "",
          serviceName: result.service?.name || result.data.serviceId?.name,
          serviceCode: result.service?.code || result.data.serviceId?.code,
          number: result.data.number,
          displayNumber: result.data.displayNumber || result.data.formattedNumber,
          formattedNumber: result.data.formattedNumber || result.data.displayNumber,
          qrCode: result.data.qrCode,
        };
        setTicket(ticketData as DisplayTicket);
        setStep("done");
        setIsSubmitting(false);
        showToast(result.message || "Lấy số thành công!", "success");
      } else {
        throw new Error(result.message || "Lỗi khi tạo vé");
      }
    } catch (error) {
      setIsSubmitting(false);
      showToast(
        error instanceof Error ? error.message : "Không thể kết nối với server",
        "error",
      );
    }
  };

  const handlePrintTicket = async () => {
    if (!ticket?._id || isPrinting || hasPrinted) return;
    setIsPrinting(true);
    setHasPrinted(true);
    try {
      const result = await printTicket(ticket._id);
      if (!result?.success) throw new Error(result?.message || "Loi khi gui lenh in ve");
      showToast(result.message || "Da gui lenh in ve", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Khong the ket noi voi server",
        "error",
      );
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validateForm()) return;
    setConfirmSubmitOpen(true);
  };

  const formatName = (inputName: string) => {
    if (!inputName) return "";
    const words = inputName.trim().split(/\s+/);
    if (words.length <= 2) return inputName;
    const firstName = words[0];
    const lastName = words[words.length - 1];
    const middleNames = words.slice(1, -1);
    const abbreviatedMiddleNames = middleNames
      .map((word) => `${word.charAt(0).toUpperCase()}.`)
      .join("");
    return `${firstName} ${abbreviatedMiddleNames}${lastName}`;
  };

  const handleReset = () => router.push("/");

  const qrData = ticket
    ? `${service?.code ?? ""}-${getTicketDisplayNumber(ticket)}|${fullName}|${service?.name ?? ""}`
    : "";

  if (loading) return <div style={{ padding: 20 }} />;

  if (!service) {
    return (
      <div style={{ padding: 20 }}>
        <p>Quầy không tồn tại</p>
        <Link href="/"><button style={{ padding: 10, fontSize: 16 }}>Quay lại</button></Link>
      </div>
    );
  }

  return (
    <div className="stp-root">

      {/* ── FORM ─────────────────────────────────────────────── */}
      {step === "form" && (
        <div className="stp-form-card">
          <h2 className="stp-form-title">{service.name}</h2>
          <p className="stp-form-desc">{service.description}</p>

          <form onSubmit={handleSubmit}>
            <div className="stp-field">
              <label className="stp-label">
                Họ và tên <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(sanitizeFullName(e.target.value))}
                onPaste={(e) => {
                  e.preventDefault();
                  const pastedText = e.clipboardData.getData("text");
                  setFullName((prev) => sanitizeFullName(`${prev} ${pastedText}`));
                }}
                placeholder="Nhập họ và tên"
                inputMode="text"
                autoComplete="name"
                className="stp-input"
              />
            </div>

            <div className="stp-field">
              <label className="stp-label">
                Số điện thoại <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Nhập số điện thoại"
                className="stp-input"
              />
            </div>

            <div className="stp-btn-row">
              <Link href="/" style={{ flex: 1, textDecoration: "none" }}>
                <button
                  type="button"
                  disabled={isSubmitting}
                  className="stp-btn-back"
                  onMouseOver={(e) => { if (!isSubmitting) (e.currentTarget as HTMLButtonElement).style.background = "#e0e0e0"; }}
                  onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.background = isSubmitting ? "#d1d5db" : "#f0f0f0"; }}
                >
                  <RiArrowLeftLine size={24} />
                  <span>Quay lại</span>
                </button>
              </Link>

              <button
                type="submit"
                disabled={isSubmitting}
                className="stp-btn-submit"
                onMouseOver={(e) => { if (!isSubmitting) (e.currentTarget as HTMLButtonElement).style.background = "#001f47"; }}
                onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.background = isSubmitting ? "#9ca3af" : "#003366"; }}
              >
                Lấy số
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── DONE ─────────────────────────────────────────────── */}
      {step === "done" && (
        <div className="stp-done-wrap">

          {/* Left: ticket info */}
          <div className="stp-done-main">
            <h1 className="stp-done-title">YÊU CẦU CỦA QUÝ ÔNG BÀ ĐÃ ĐƯỢC TIẾP NHẬN</h1>
            <p className="stp-done-sub">Xin vui lòng chờ đến thứ tự</p>

            <div className="stp-done-inner">
              {/* Name / service info */}
              <div className="stp-done-info" ref={nameContainerRef}>
                <p className="stp-done-info-label">Đương sự:</p>
                <p className="stp-done-info-value" ref={nameRef}>
                  <strong>{displayedName}</strong>
                </p>
                <p className="stp-done-info-label">YÊU CẦU:</p>
                <p className="stp-done-info-value">
                  <strong>{service.name}</strong>
                </p>
              </div>

              {/* Big number */}
              <div className="stp-done-number">
                {getTicketDisplayNumber(ticket)}
              </div>

              {/* QR */}
              <div className="stp-done-qr">
                <Image
                  src={
                    ticket?.qrCode ||
                    `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`
                  }
                  alt="QR mã số thứ tự"
                  width={200}
                  height={200}
                  className="stp-qr-img"
                  unoptimized
                />
                <p className="stp-qr-hint">Quý ông bà vui lòng chụp lại mã QR</p>
              </div>
            </div>
          </div>

          {/* Right: actions */}
          <div className="stp-done-side">
            <h1 className="stp-side-title">QUÝ ÔNG BÀ VUI LÒNG CHỤP LẠI VÉ</h1>
            <p className="stp-side-or">HOẶC</p>
            <button
              type="button"
              onClick={() => void handlePrintTicket()}
              disabled={isPrinting || hasPrinted || !ticket?._id}
              className="stp-btn-print"
              style={{
                background: isPrinting || hasPrinted ? "#7bbf8f" : "green",
                cursor: isPrinting || hasPrinted ? "not-allowed" : "pointer",
                opacity: isPrinting || hasPrinted ? 0.85 : 1,
              }}
            >
              {isPrinting ? "ĐANG IN VÉ..." : hasPrinted ? "ĐÃ GỬI LỆNH IN" : "TÔI MUỐN IN VÉ"}
            </button>
            <p className="stp-side-or">HOẶC</p>
            <button type="button" disabled className="stp-btn-zalo">
              GỬI ZALO
            </button>
            <button
              onClick={handleReset}
              className="stp-btn-done"
              onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#001f47"; }}
              onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#003366"; }}
            >
              Hoàn tất ({countdown}s)
            </button>
          </div>
        </div>
      )}

      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={handleCloseToast}
        duration={5000}
      />

      <ConfirmModal
        isOpen={confirmSubmitOpen}
        title="Xác nhận thông tin"
        message={`Họ và tên: ${name.toLocaleUpperCase("vi-VN")}\nSố điện thoại: ${phoneNumber.trim()}\nBạn có muốn lấy số không?`}
        onConfirm={() => { setConfirmSubmitOpen(false); void submitTicket(); }}
        onCancel={() => setConfirmSubmitOpen(false)}
      />

      {isSubmitting && step === "form" && (
        <div className="stp-overlay">
          <div className="stp-overlay-card">
            <div className="stp-overlay-header">
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Đang xử lý</h2>
            </div>
            <div className="stp-overlay-body">
              <div className="stp-spinner" />
              <p style={{ margin: 0, fontSize: 16 }}>
                Vui lòng chờ trong giây lát, hệ thống đang tạo vé cho bạn.
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* ── Root ───────────────────────────────────────────── */
        .stp-root {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: calc(100vh - 120px);
          padding: 16px;
          box-sizing: border-box;
        }

        /* ══ FORM ══════════════════════════════════════════════ */
        .stp-form-card {
          width: 100%;
          max-width: 1000px;
          background: #f9f9f9;
          padding: clamp(20px, 4vw, 40px);
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          box-sizing: border-box;
        }
        .stp-form-title {
          text-align: center;
          color: #003366;
          text-transform: uppercase;
          font-size: clamp(22px, 3.5vw, 40px);
          font-weight: bold;
          margin: 0 0 8px;
        }
        .stp-form-desc {
          text-align: center;
          color: #666;
          margin-bottom: 18px;
          font-size: clamp(16px, 2.2vw, 30px);
        }
        .stp-field { margin-bottom: 20px; }
        .stp-label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #333;
          font-size: clamp(14px, 1.4vw, 18px);
        }
        .stp-input {
          width: 100%;
          padding: 12px;
          font-size: clamp(16px, 2vw, 24px);
          border: 1px solid #ccc;
          border-radius: 4px;
          box-sizing: border-box;
          font-family: inherit;
        }
        .stp-btn-row {
          display: flex;
          gap: 10px;
        }
        .stp-btn-back {
          width: 100%;
          padding: 16px;
          height: clamp(52px, 7vh, 70px);
          font-size: clamp(16px, 1.8vw, 24px);
          background: #f0f0f0;
          color: #333;
          border: 1px solid #ccc;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-sizing: border-box;
        }
        .stp-btn-back:disabled {
          background: #d1d5db;
          color: #6b7280;
          cursor: not-allowed;
        }
        .stp-btn-submit {
          flex: 1;
          padding: 16px;
          height: clamp(52px, 7vh, 70px);
          font-size: clamp(18px, 2.5vw, 32px);
          font-weight: 600;
          background: #003366;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.3s ease;
        }
        .stp-btn-submit:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        /* ══ DONE ══════════════════════════════════════════════ */
        .stp-done-wrap {
          display: flex;
          width: 100%;
          max-width: 1380px;
          gap: clamp(12px, 2vw, 26px);
          align-items: stretch;
          /* Mobile: column */
          flex-direction: column;
        }

        /* Main panel */
        .stp-done-main {
          background: white;
          padding: clamp(12px, 2vw, 16px);
          border-radius: 18px;
          border: 1px solid #dbe6f2;
          box-shadow: 0 14px 36px rgba(0,39,91,0.12);
          text-align: center;
        }
        .stp-done-title {
          color: #003366;
          font-size: clamp(16px, 2.5vw, 36px);
          text-transform: uppercase;
          padding-top: 10px;
          margin-bottom: 6px;
        }
        .stp-done-sub {
          font-size: clamp(14px, 1.8vw, 24px);
          color: #333;
          margin-bottom: 10px;
          margin-top: 0;
        }
        .stp-done-inner {
          background: white;
          border: 2px solid #0b4a8a;
          border-radius: 16px;
          margin: 0 clamp(4px, 2vw, 24px) 12px;
          padding: clamp(12px, 2vw, 28px) clamp(8px, 1.8vw, 26px);
          display: flex;
          align-items: center;
          justify-content: space-around;
          gap: clamp(8px, 1.5vw, 18px);
          /* Mobile: column */
          flex-direction: column;
        }

        /* Info block */
        .stp-done-info {
          text-align: left;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-width: 0;
          /* Mobile: center */
          text-align: center;
        }
        .stp-done-info-label {
          font-size: clamp(14px, 1.8vw, 28px);
          color: #5c6773;
          text-transform: uppercase;
          font-style: italic;
          margin: 0 0 4px 0;
        }
        .stp-done-info-value {
          font-size: clamp(14px, 1.6vw, 24px);
          color: #5c6773;
          margin: 0 0 10px 0;
          text-transform: uppercase;
          word-break: break-word;
          overflow-wrap: anywhere;
          line-height: 1.35;
        }

        /* Big number */
        .stp-done-number {
          font-size: clamp(80px, 15vw, 190px);
          font-weight: bold;
          color: #003366;
          letter-spacing: 3px;
          line-height: 1;
          flex: 1;
          text-align: center;
        }

        /* QR block */
        .stp-done-qr {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }
        .stp-qr-img {
          width: clamp(120px, 20vw, 240px) !important;
          height: clamp(120px, 20vw, 240px) !important;
        }
        .stp-qr-hint {
          margin: 0;
          font-size: clamp(12px, 1.2vw, 18px);
          color: #44515f;
          line-height: 1.4;
          text-align: center;
        }

        /* Side panel */
        .stp-done-side {
          background: #ffffff;
          padding: clamp(16px, 2.5vw, 30px) clamp(12px, 2vw, 24px);
          border-radius: 18px;
          border: 1px solid #dbe6f2;
          box-shadow: 0 14px 36px rgba(0,39,91,0.12);
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 0;
        }
        .stp-side-title {
          color: #003366;
          text-transform: uppercase;
          font-size: clamp(14px, 1.8vw, 24px);
          font-weight: bold;
          margin: 0 0 16px 0;
          line-height: 1.45;
        }
        .stp-side-or {
          font-size: clamp(14px, 1.5vw, 20px);
          color: #64748b;
          margin: 0 0 14px 0;
        }
        .stp-btn-print {
          width: 100%;
          padding: clamp(12px, 1.5vh, 18px);
          border-radius: 12px;
          border: 1px solid #0f7a35;
          color: white;
          font-size: clamp(14px, 1.5vw, 18px);
          font-weight: 700;
          margin-bottom: 16px;
          transition: opacity 0.2s;
        }
        .stp-btn-zalo {
          width: 100%;
          padding: clamp(12px, 1.5vh, 18px);
          border-radius: 12px;
          border: none;
          background: #94a3b8;
          color: #e2e8f0;
          font-size: clamp(14px, 1.5vw, 18px);
          font-weight: 700;
          cursor: not-allowed;
          margin-bottom: 16px;
          opacity: 0.75;
        }
        .stp-btn-done {
          width: 100%;
          padding: clamp(12px, 1.5vh, 18px);
          border-radius: 12px;
          border: none;
          background: #003366;
          color: white;
          font-size: clamp(14px, 1.5vw, 18px);
          font-weight: 700;
          cursor: pointer;
          transition: background 0.3s ease;
          margin-top: clamp(16px, 2vh, 32px);
          box-shadow: 0 10px 22px rgba(0,51,102,0.18);
        }

        /* ══ Overlay ══════════════════════════════════════════ */
        .stp-overlay {
          position: fixed;
          inset: 0;
          background: rgba(6,20,37,0.46);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1100;
          padding: 24px;
        }
        .stp-overlay-card {
          background: #fff;
          width: min(100%, 360px);
          border-radius: 20px;
          box-shadow: 0 28px 70px rgba(8,27,54,0.24);
          border: 1px solid rgba(0,51,102,0.08);
          overflow: hidden;
        }
        .stp-overlay-header {
          background: #003366;
          color: #fff;
          padding: 18px 22px;
        }
        .stp-overlay-body {
          padding: 24px;
          color: #31475f;
          line-height: 1.6;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .stp-spinner {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 3px solid #dbe6f2;
          border-top-color: #003366;
          animation: stpSpin 0.8s linear infinite;
          flex-shrink: 0;
        }
        @keyframes stpSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        /* ══ BREAKPOINTS ═══════════════════════════════════════ */

        /* Tablet trở lên: done layout ngang */
        @media (min-width: 768px) {
          .stp-done-wrap {
            flex-direction: row;
          }
          .stp-done-main { width: 78%; }
          .stp-done-side { width: 22%; }
          .stp-done-inner {
            flex-direction: row;
            min-height: 360px;
          }
          .stp-done-info { text-align: left; }
        }

        /* Desktop */
        @media (min-width: 1200px) {
          .stp-root { padding: 0 20px 20px; }
        }

        /* Mobile nhỏ: thu padding */
        @media (max-width: 480px) {
          .stp-root { padding: 10px; min-height: unset; }
          .stp-done-number { font-size: clamp(64px, 22vw, 120px); }
        }
      `}</style>
    </div>
  );
}

export default function ServiceTicketPage() {
  return (
    <Suspense fallback={null}>
      <ServiceTicketContent />
    </Suspense>
  );
}