"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { io, Socket } from "socket.io-client";
import { RiArrowLeftLine } from "react-icons/ri";
import { Service } from "@/mock/services";
import { createTicket, printTicket } from "@/services/ticket.service";
import { Ticket } from "@/mock/data";
import Toast from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";
import AppErrorState from "@/components/AppErrorState";
import { getSocketBaseUrl } from "@/lib/runtime-config";

interface DisplayTicket extends Ticket {
  _id?: string;
  qrCode?: string;
  serviceCode?: string;
  displayNumber?: string;
  formattedNumber?: string;
}

const FULL_NAME_ALLOWED_PATTERN = /^[\p{L}\s]+$/u;
const FULL_NAME_REPEATED_CHAR_PATTERN = /([\p{L}])\1{2,}/u;

const sanitizeFullName = (value: string) =>
  value
    .replace(/\s+/g, " ")
    .replace(/^\s+/g, "");

const normalizeFullName = (value: string) => sanitizeFullName(value).trim();

const capitalizeName = (value: string): string =>
  value.replace(/(?:^|\s)\S/g, (char) => char.toLocaleUpperCase("vi-VN"));

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [hasPrinted, setHasPrinted] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [countdown, setCountdown] = useState(20);
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [displayedName, setDisplayedName] = useState(fullName);
  const nameContainerRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLParagraphElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<{
    isOpen: boolean;
    message: string;
    type: "success" | "error" | "warning" | "info";
  }>({
    isOpen: false,
    message: "",
    type: "info",
  });

  const name = normalizeFullName(fullName);

  const showToast = (
    message: string,
    type: "success" | "error" | "warning" | "info",
  ) => {
    setToast({ isOpen: true, message, type });
  };

  const handleCloseToast = useCallback(() => {
    setToast((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const loadService = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch("/api/services/active", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Không thể tải danh sách dịch vụ");
      }
      const data = await response.json();
      if (!data?.success || !Array.isArray(data?.data)) {
        throw new Error(data?.message || "Không thể tải danh sách dịch vụ");
      }
      const found = (data.data as Service[]).find((s) => s._id === serviceId);
      setService(found || null);
    } catch (err) {
      setService(null);
      setLoadError(err instanceof Error ? err.message : "Không thể kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    void loadService();
  }, [loadService]);

  useEffect(() => {
    const url = getSocketBaseUrl();
    if (!url) return;

    const socket: Socket = io(url, {
      transports: ["websocket", "polling"],
    });

    const handleServicesUpdated = (payload?: { serviceId?: string; isOpen?: boolean }) => {
      const affectsThisService =
        !payload?.serviceId ||
        payload.serviceId === "ALL" ||
        payload.serviceId === serviceId;

      if (!affectsThisService) return;

      void (async () => {
        try {
          const response = await fetch("/api/services/active", { cache: "no-store" });
          if (!response.ok) return;
          const data = await response.json();
          const found = Array.isArray(data?.data)
            ? (data.data as Service[]).find((s) => s._id === serviceId)
            : null;

          const stillTakeable = found && found.isActive && found.isOpen !== false;
          if (!stillTakeable && step === "form") {
            showToast(
              "Quầy này vừa đóng (hết giờ nhận số). Vui lòng quay lại trang chủ.",
              "warning",
            );
            setTimeout(() => router.push("/"), 1500);
          }
        } catch {
          /* bỏ qua, lần submit tiếp theo server vẫn sẽ chặn nếu đã đóng */
        }
      })();
    };

    socket.on("services-updated", handleServicesUpdated);

    return () => {
      socket.off("services-updated", handleServicesUpdated);
      socket.disconnect();
    };
  }, [serviceId, step, router]);

  useEffect(() => {
    if (step === "done" && nameContainerRef.current && nameRef.current) {
      const containerWidth = nameContainerRef.current.offsetWidth;
      const nameWidth = nameRef.current.scrollWidth;
      setDisplayedName(nameWidth > containerWidth ? formatName(fullName) : fullName);
    }
  }, [fullName, step]);

  useEffect(() => {
    if (step !== "done") {
      setCountdown(20);
      return;
    }

    const interval = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [step]);

  useEffect(() => {
    if (step === "done" && countdown === 0) {
      router.push("/");
    }
  }, [countdown, router, step]);

  const validateForm = () => {
    const normalizedName = normalizeFullName(fullName);

    if (!normalizedName) {
      showToast("Vui lòng nhập họ tên", "error");
      return false;
    }

    if (!FULL_NAME_ALLOWED_PATTERN.test(normalizedName)) {
      showToast(
        "Họ và tên chỉ được nhập chữ cái, không dùng ký tự đặc biệt",
        "error",
      );
      return false;
    }

    if (FULL_NAME_REPEATED_CHAR_PATTERN.test(normalizedName)) {
      showToast("Họ và tên không được có ký tự lặp liên tiếp từ 3 lần trở lên", "error");
      return false;
    }

    const rawPhone = phoneNumber.replace(/\D/g, "");

    if (!rawPhone) {
      showToast("Vui lòng nhập số điện thoại", "error");
      return false;
    }

    if (!/^[0-9]{8,12}$/.test(rawPhone)) {
      showToast(
        `Số điện thoại không hợp lệ (đang có ${rawPhone.length} số, cần từ 8 đến 12 số)`,
        "error",
      );
      return false;
    }

    return true;
  };

  const submitTicket = async () => {
    if (isSubmitting || !service) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createTicket({
        serviceId,
        name,
        phone: phoneNumber.replace(/\D/g, ""),
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
          formattedNumber:
            result.data.formattedNumber || result.data.displayNumber,
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
      console.error("Error creating ticket:", error);
      showToast(
        error instanceof Error ? error.message : "Không thể kết nối với server",
        "error",
      );
    }
  };

  const handlePrintTicket = async () => {
    if (!ticket?._id || isPrinting || hasPrinted) {
      return;
    }

    setIsPrinting(true);
    setHasPrinted(true);
    try {
      const result = await printTicket(ticket._id);

      if (!result?.success) {
        throw new Error(result?.message || "Loi khi gui lenh in ve");
      }

      showToast(result.message || "Da gui lenh in ve", "success");
    } catch (error) {
      console.error("Error printing ticket:", error);
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
    if (isSubmitting) {
      return;
    }
    if (!validateForm()) {
      return;
    }
    setConfirmSubmitOpen(true);
  };

  const formatName = (inputName: string) => {
    if (!inputName) return "";
    const words = inputName.trim().split(/\s+/);
    if (words.length <= 2) {
      return inputName;
    }
    const firstName = words[0];
    const lastName = words[words.length - 1];
    const middleNames = words.slice(1, -1);
    const abbreviatedMiddleNames = middleNames
      .map((word) => `${word.charAt(0).toUpperCase()}.`)
      .join("");
    return `${firstName} ${abbreviatedMiddleNames}${lastName}`;
  };

  const handleReset = () => {
    router.push("/");
  };

  const qrData = ticket
    ? `${service?.code ?? ""}-${getTicketDisplayNumber(ticket)}|${fullName}|${service?.name ?? ""}`
    : "";

  if (loading) {
    return <div style={{ padding: 20 }} />;
  }

  if (loadError) {
    return (
      <AppErrorState
        code="503"
        title={loadError || "Không thể kết nối máy chủ"}
        actionLabel={loading ? "Đang thử lại..." : "Thử lại"}
        onAction={() => void loadService()}
        actionDisabled={loading}
      />
    );
  }

  if (!service) {
    return (
      <div style={{ padding: 20 }}>
        <p>Quầy không tồn tại</p>
        <Link href="/">
          <button style={{ padding: 10, fontSize: 16 }}>Quay lại</button>
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "calc(100vh - 120px)",
        paddingTop: 0,
        paddingBottom: 20,
      }}
    >
      {step === "form" && (
        <div
          style={{
            width: "100%",
            maxWidth: 1000,
            background: "#f9f9f9",
            padding: 40,
            borderRadius: 8,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <h2
            style={{
              textAlign: "center",
              color: "#003366",
              textTransform: "uppercase",
              fontSize: "40px",
              fontWeight: "bold",
            }}
          >
            {service.name}
          </h2>
          <p
            style={{
              textAlign: "center",
              color: "#666",
              marginBottom: 18,
              fontSize: 30,
            }}
          >
            {service.description}
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontWeight: 600,
                  color: "#333",
                }}
              >
                Họ và tên <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(sanitizeFullName(e.target.value));
                }}
                onBlur={(e) => {
                  setFullName(capitalizeName(sanitizeFullName(e.target.value)));
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  const pastedText = e.clipboardData.getData("text");
                  setFullName((prev) =>
                    capitalizeName(sanitizeFullName(`${prev} ${pastedText}`))
                  );
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setFullName((prev) => capitalizeName(sanitizeFullName(prev)));
                    phoneInputRef.current?.focus();
                    phoneInputRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                  }
                }}
                placeholder="Nhập họ và tên"
                inputMode="text"
                autoComplete="name"
                enterKeyHint="next"
                style={{
                  width: "100%",
                  padding: 12,
                  fontSize: 24,
                  border: "1px solid #ccc",
                  borderRadius: 4,
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontWeight: 600,
                  color: "#333",
                }}
              >
                Số điện thoại <span style={{ color: "red" }}>*</span>
              </label>
              <input
                ref={phoneInputRef}
                type="tel"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value.replace(/[^\d\s\-+()]/g, ""));
                }}
                onFocus={(e) => {
                  setTimeout(() => {
                    e.target.scrollIntoView({ behavior: "smooth", block: "center" });
                  }, 300);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (isSubmitting) return;
                    if (!validateForm()) return;
                    setConfirmSubmitOpen(true);
                  }
                }}
                placeholder="Nhập số điện thoại"
                inputMode="numeric"
                enterKeyHint="done"
                style={{
                  width: "100%",
                  padding: 12,
                  fontSize: 24,
                  border: "1px solid #ccc",
                  borderRadius: 4,
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <Link href="/" style={{ flex: 1, textDecoration: "none" }}>
                <button
                  type="button"
                  disabled={isSubmitting}
                  style={{
                    width: "100%",
                    padding: 16,
                    height: 70,
                    fontSize: 24,
                    background: isSubmitting ? "#d1d5db" : "#f0f0f0",
                    color: isSubmitting ? "#6b7280" : "#333",
                    border: "1px solid #ccc",
                    borderRadius: 4,
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    transition: "background 0.3s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                  }}
                  onMouseOver={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.background = "#e0e0e0";
                    }
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = isSubmitting
                      ? "#d1d5db"
                      : "#f0f0f0";
                  }}
                >
                  <RiArrowLeftLine size={28} />
                  <span>Quay lại</span>
                </button>
              </Link>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  padding: 16,
                  height: 70,
                  fontSize: 32,
                  fontWeight: 600,
                  background: isSubmitting ? "#9ca3af" : "#003366",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  transition: "background 0.3s ease",
                  opacity: isSubmitting ? 0.95 : 1,
                }}
                onMouseOver={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.background = "#001f47";
                  }
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = isSubmitting
                    ? "#9ca3af"
                    : "#003366";
                }}
              >
                Lấy số
              </button>
            </div>
          </form>
        </div>
      )}

      {step === "done" && (
        <div
          style={{
            display: "flex",
            width: "100%",
            maxWidth: 1380,
            gap: 26,
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              width: "78%",
              background: "white",
              padding: 10,
              borderRadius: 18,
              border: "1px solid #dbe6f2",
              boxShadow: "0 14px 36px rgba(0, 39, 91, 0.12)",
              textAlign: "center",
            }}
          >
            <h1
              style={{
                color: "#003366",
                fontSize: 36,
                textTransform: "uppercase",
                paddingTop: 14,
                marginBottom: 8,
              }}
            >
              YÊU CẦU CỦA QUÝ ÔNG BÀ ĐÃ ĐƯỢC TIẾP NHẬN
            </h1>
            <p style={{ fontSize: 24, color: "#333", marginBottom: 10, marginTop: 0 }}>
              Xin vui lòng chờ đến thứ tự
            </p>

            <div
              style={{
                background: "white",
                border: "2px solid #0b4a8a",
                borderRadius: 16,
                margin: "0 24px 16px",
                padding: "28px 26px",
                minHeight: "360px",
                display: "flex",
                alignItems: "stretch",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-around",
                  alignItems: "center",
                  width: "100%",
                  gap: 18,
                }}
              >
                <div
                  style={{
                    paddingLeft: 10,
                    textAlign: "left",
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                  ref={nameContainerRef}
                >
                  <p
                    style={{
                      fontSize: 28,
                      color: "#5c6773",
                      textTransform: "uppercase",
                      fontStyle: "italic",
                      margin: "0 0 8px 0",
                    }}
                  >
                    Đương sự:
                  </p>
                  <p
                    style={{
                      fontSize: 24,
                      color: "#5c6773",
                      margin: "0 0 12px 0",
                      textTransform: "uppercase",
                      whiteSpace: "normal",
                      wordBreak: "break-word",
                      overflowWrap: "anywhere",
                      maxWidth: "100%",
                      lineHeight: 1.35,
                    }}
                    ref={nameRef}
                  >
                    <strong>{displayedName}</strong>
                  </p>
                  <p
                    style={{
                      fontSize: 28,
                      color: "#5c6773",
                      textTransform: "uppercase",
                      fontStyle: "italic",
                      margin: "0 0 8px 0",
                    }}
                  >
                    YÊU CẦU:
                  </p>
                  <p
                    style={{
                      fontSize: 24,
                      color: "#5c6773",
                      margin: "0 0 4px 0",
                      textTransform: "uppercase",
                    }}
                  >
                    <strong>{service.name}</strong>
                  </p>
                </div>

                <div
                  style={{
                    textAlign: "center",
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <h2
                    style={{
                      fontSize: 190,
                      fontWeight: "bold",
                      color: "#003366",
                      margin: "0",
                      letterSpacing: 3,
                      lineHeight: 1,
                    }}
                  >
                    {getTicketDisplayNumber(ticket)}
                  </h2>
                </div>

                <div
                  style={{
                    flex: 1,
                    background: "white",
                    borderRadius: 10,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "260px",
                    gap: 18,
                  }}
                >
                  <Image
                    src={
                      ticket?.qrCode ||
                      `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`
                    }
                    alt="QR mã số thứ tự"
                    width={240}
                    height={240}
                    style={{ display: "block" }}
                    unoptimized
                  />
                  <p
                    style={{
                      margin: 0,
                      fontSize: 18,
                      color: "#44515f",
                      lineHeight: 1.4,
                      textAlign: "center",
                    }}
                  >
                    Quý ông bà vui lòng chụp lại mã QR
                  </p>
                </div>
              </div>
            </div>

          </div>

          <div
            style={{
              width: "22%",
              background: "#ffffff",
              padding: "30px 24px",
              borderRadius: 18,
              border: "1px solid #dbe6f2",
              boxShadow: "0 14px 36px rgba(0, 39, 91, 0.12)",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 0,
            }}
          >
            <h1
              style={{
                color: "#003366",
                textTransform: "uppercase",
                fontSize: 24,
                fontWeight: "bold",
                margin: "0 0 26px 0",
                lineHeight: 1.45,
              }}
            >
              QUÝ ÔNG BÀ VUI LÒNG CHỤP LẠI VÉ
            </h1>
            <p style={{ fontSize: 20, color: "#64748b", margin: "0 0 22px 0" }}>HOẶC</p>
            <button
              type="button"
              onClick={() => void handlePrintTicket()}
              disabled={isPrinting || hasPrinted || !ticket?._id}
              style={{
                width: "100%",
                padding: "18px 18px",
                borderRadius: 12,
                border: "1px solid #0f7a35",
                background: isPrinting || hasPrinted ? "#7bbf8f" : "green",
                color: "white",
                fontSize: 18,
                fontWeight: 700,
                cursor: isPrinting || hasPrinted ? "not-allowed" : "pointer",
                marginBottom: 26,
                opacity: isPrinting || hasPrinted ? 0.85 : 1,
              }}
            >
              {isPrinting
                ? "ĐANG IN VÉ..."
                : hasPrinted
                  ? "ĐÃ GỬI LỆNH IN"
                  : "TÔI MUỐN IN VÉ"}
            </button>
            <p style={{ fontSize: 20, color: "#64748b", margin: "0 0 18px 0" }}>HOẶC</p>
            <button
              type="button"
              disabled
              style={{
                width: "100%",
                padding: "18px 18px",
                borderRadius: 12,
                border: "none",
                background: "#94a3b8",
                color: "#e2e8f0",
                fontSize: 18,
                fontWeight: 700,
                cursor: "not-allowed",
                marginBottom: 16,
                boxShadow: "none",
                opacity: 0.75,
              }}
            >
              GỬI ZALO
            </button>
            <button
              onClick={handleReset}
              style={{
                width: "100%",
                padding: "18px 18px",
                borderRadius: 12,
                border: "none",
                background: "#003366",
                color: "white",
                fontSize: 18,
                fontWeight: 700,
                cursor: "pointer",
                transition: "background 0.3s ease",
                marginTop: 32,
                boxShadow: "0 10px 22px rgba(0, 51, 102, 0.18)",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "#001f47";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "#003366";
              }}
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
        fields={[
          { label: "Họ và tên", value: name.toLocaleUpperCase("vi-VN") },
          { label: "Số điện thoại", value: phoneNumber.replace(/\D/g, "") },
        ]}
        onConfirm={() => { setConfirmSubmitOpen(false); void submitTicket(); }}
        onCancel={() => setConfirmSubmitOpen(false)}
      />

      {isSubmitting && step === "form" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(6, 20, 37, 0.46)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
            padding: 24,
          }}
        >
          <div
            style={{
              background: "#fff",
              width: "min(100%, 360px)",
              borderRadius: 20,
              boxShadow: "0 28px 70px rgba(8, 27, 54, 0.24)",
              border: "1px solid rgba(0, 51, 102, 0.08)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: "#003366",
                color: "#fff",
                padding: "18px 22px",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                Đang xử lý
              </h2>
            </div>
            <div
              style={{
                padding: 24,
                color: "#31475f",
                lineHeight: 1.6,
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  border: "3px solid #dbe6f2",
                  borderTopColor: "#003366",
                  animation: "serviceTicketSpin 0.8s linear infinite",
                  flexShrink: 0,
                }}
              />
              <p style={{ margin: 0, fontSize: 16 }}>
                Vui lòng chờ trong giây lát, hệ thống đang tạo vé cho bạn.
              </p>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes serviceTicketSpin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
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