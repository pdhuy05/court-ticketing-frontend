import { getPublicApiBase } from "@/lib/runtime-config";

const API_URL = getPublicApiBase();
const AUTH_EXPIRED_ERROR = "AUTH_EXPIRED";

const parseApiJsonSafely = async (response: Response) => {
  const contentType = response.headers.get("content-type") || "";
  const raw = await response.text();

  if (!contentType.includes("application/json")) {
    return {
      success: false,
      message:
        response.status === 404
          ? "Backend chưa có API trả vé về hàng chờ hoặc route /tickets/:id/back chưa được deploy"
          : `API trả về dữ liệu không hợp lệ (${response.status})`,
      raw,
    };
  }

  try {
    return JSON.parse(raw);
  } catch {
    return {
      success: false,
      message: `Không đọc được JSON từ API (${response.status})`,
      raw,
    };
  }
};

const normalizeApiErrorMessage = (message?: string) => {
  if (!message) return "";
  return message.toLowerCase();
};

const isAuthExpiredMessage = (message?: string) => {
  const normalized = normalizeApiErrorMessage(message);
  return (
    normalized.includes("token") ||
    normalized.includes("hết hạn") ||
    normalized.includes("het han") ||
    normalized.includes("expired") ||
    normalized.includes("unauthorized") ||
    normalized.includes("không hợp lệ") ||
    normalized.includes("khong hop le")
  );
};

const extractTtsEnabled = (payload: unknown): boolean | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;

  if (typeof record.enabled === "boolean") {
    return record.enabled;
  }

  if (typeof record.ttsEnabled === "boolean") {
    return record.ttsEnabled;
  }

  if (typeof record.tts_enabled === "boolean") {
    return record.tts_enabled;
  }

  if (typeof record.isEnabled === "boolean") {
    return record.isEnabled;
  }

  if (typeof record.value === "boolean") {
    return record.value;
  }

  if (record.data && typeof record.data === "object") {
    return extractTtsEnabled(record.data);
  }

  if (record.setting && typeof record.setting === "object") {
    return extractTtsEnabled(record.setting);
  }

  if (record.result && typeof record.result === "object") {
    return extractTtsEnabled(record.result);
  }

  return null;
};

// Helper to get token
const getToken = () => {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("staffToken");
};

const getSettingsToken = () => {
  if (typeof window === "undefined") return null;

  const adminToken = localStorage.getItem("adminToken");
  if (adminToken) {
    return adminToken;
  }

  return sessionStorage.getItem("staffToken");
};

export const getStaffDisplay = async () => {
  const token = getToken();
  const response = await fetch(`${API_URL}/tickets/staff/display`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const error = await response.json();
    if (response.status === 401 || isAuthExpiredMessage(error.message)) {
      throw new Error(AUTH_EXPIRED_ERROR);
    }
    throw new Error(error.message || "Không thể tải dữ liệu màn hình nhân viên");
  }
  const data = await response.json();
  if (!data.success && isAuthExpiredMessage(data.message)) {
    throw new Error(AUTH_EXPIRED_ERROR);
  }
  return data;
};

export const callTicketById = async (ticketId: string, counterId: string) => {
  const token = getToken();
  const payload = { ticketId, counterId };
  console.log("[callTicketById] payload gửi lên:", JSON.stringify(payload));
  const response = await fetch(`${API_URL}/tickets/call-by-id`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || (data && data.success === false)) {
    console.error("[callTicketById] 400 response body:", data);
    if (response.status === 401 || isAuthExpiredMessage(data?.message)) {
      throw new Error(AUTH_EXPIRED_ERROR);
    }
    throw new Error(data?.message || "Không thể gọi vé");
  }
  return data;
};

export const completeTicketApi = async (ticketId: string) => {
  const token = getToken();
  const response = await fetch(`${API_URL}/tickets/${ticketId}/complete`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json();
  if (!response.ok || (data && data.success === false)) {
    if (response.status === 401 || isAuthExpiredMessage(data?.message)) {
      throw new Error(AUTH_EXPIRED_ERROR);
    }
    throw new Error(data?.message || "Không thể hoàn thành vé");
  }
  return data;
};

export const skipTicketApi = async (ticketId: string) => {
  const token = getToken();
  const response = await fetch(`${API_URL}/tickets/${ticketId}/skip`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json();
  if (!response.ok || (data && data.success === false)) {
    if (response.status === 401 || isAuthExpiredMessage(data?.message)) {
      throw new Error(AUTH_EXPIRED_ERROR);
    }
    throw new Error(data?.message || "Không thể bỏ qua vé");
  }
  return data;
};

export const getTtsEnabledStatus = async () => {
  const token = getSettingsToken();
  const response = await fetch(`${API_URL}/admin/settings/tts`, {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
  });

  const data = await parseApiJsonSafely(response);
  if (!response.ok || data?.success === false) {
    throw new Error(data?.message || "Khong lay duoc cau hinh voice");
  }
  const enabled = extractTtsEnabled(data);

  if (typeof enabled === "boolean") {
    return enabled;
  }

  throw new Error(data?.message || "Khong lay duoc cau hinh voice");
};

export const backTicketToWaitingApi = async (
  ticketId: string,
  position: "front" | "back" = "front",
) => {
  const token = getToken();
  const response = await fetch(`${API_URL}/tickets/${ticketId}/back`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ position }),
  });
  const data = await parseApiJsonSafely(response);
  if (!response.ok || (data && data.success === false)) {
    if (response.status === 401 || isAuthExpiredMessage(data?.message)) {
      throw new Error(AUTH_EXPIRED_ERROR);
    }
    throw new Error(data?.message || "Không thể trả vé về hàng chờ");
  }
  return data;
};

export const callNextTicket = async (counterId: string) => {
  const token = getToken();
  const response = await fetch(`${API_URL}/tickets/call-next`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ counterId }),
  });
  const data = await response.json();
  if (!response.ok || data?.success === false) {
    if (response.status === 401 || isAuthExpiredMessage(data?.message)) {
      throw new Error(AUTH_EXPIRED_ERROR);
    }
    throw new Error(data?.message || "Không thể gọi số tiếp theo");
  }
  return data;
};

export const recallTicket = async (ticketId: string) => {
  const token = getToken();
  const response = await fetch(`${API_URL}/tickets/${ticketId}/recall`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });
  const data = await response.json();
  if (!response.ok || data?.success === false) {
    if (response.status === 401 || isAuthExpiredMessage(data?.message)) {
      throw new Error(AUTH_EXPIRED_ERROR);
    }
    throw new Error(data?.message || "Không thể gọi lại vé");
  }
  return data;
};

export const recallProcessingTicketApi = async (ticketId: string) => {
  const token = getToken();
  const response = await fetch(`${API_URL}/tickets/${ticketId}/recall-processing`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });
  const data = await response.json();
  if (!response.ok || data?.success === false) {
    if (response.status === 401 || isAuthExpiredMessage(data?.message)) {
      throw new Error(AUTH_EXPIRED_ERROR);
    }
    throw new Error(data?.message || "Không thể gọi lại vé đang xử lý");
  }
  return data;
};

export const getRecallList = async () => {
  const token = getToken();
  const response = await fetch(`${API_URL}/tickets/recall-list`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json();
  if (!response.ok || data?.success === false) {
    if (response.status === 401 || isAuthExpiredMessage(data?.message)) {
      throw new Error(AUTH_EXPIRED_ERROR);
    }
    throw new Error(data?.message || "Không thể tải danh sách bỏ qua");
  }
  return data;
};

export { AUTH_EXPIRED_ERROR };

export const createTicket = async (data: {
  name: string;
  phone: string;
  serviceId: string;
  counterId?: string;
}) => {
  const response = await fetch(`${API_URL}/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return response.json();
};

export const printTicket = async (ticketId: string) => {
  const response = await fetch(`${API_URL}/tickets/${ticketId}/print`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  return response.json();
};

export const updateTicketNoteApi = async (ticketId: string, note: string) => {
  const token = getToken();
  const response = await fetch(`${API_URL}/tickets/${ticketId}/note`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ note }),
  });
  const data = await parseApiJsonSafely(response);
  if (response.status === 401 || isAuthExpiredMessage(data?.message)) {
    throw new Error(AUTH_EXPIRED_ERROR);
  }
  return data;
};