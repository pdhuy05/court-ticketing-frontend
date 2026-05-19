import { getPublicApiBase } from "@/lib/runtime-config";

const API_BASE = getPublicApiBase();

const getAuthHeaders = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
  const headers: { [key: string]: string } = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

type ApiErrorDetail = {
  field?: string;
  message?: string;
};

type ApiErrorPayload = {
  message?: string;
  errors?:
    | ApiErrorDetail[]
    | Record<string, string | string[] | ApiErrorDetail | ApiErrorDetail[]>;
};

const getApiErrorMessage = (
  payload: ApiErrorPayload | null | undefined,
  fallbackMessage: string,
) => {
  if (!payload) {
    return fallbackMessage;
  }

  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    const messages = payload.errors
      .map((error) => error.message || error.field)
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join("; ");
    }
  }

  if (payload.errors && typeof payload.errors === "object") {
    for (const value of Object.values(payload.errors)) {
      if (typeof value === "string" && value.trim()) {
        return value;
      }

      if (Array.isArray(value) && value.length > 0) {
        const messages = value
          .map((item) =>
            typeof item === "string" ? item : item.message || item.field,
          )
          .filter(Boolean);

        if (messages.length > 0) {
          return messages.join("; ");
        }
      }

      if (value && typeof value === "object") {
        const detail = value as ApiErrorDetail;
        if (detail.message || detail.field) {
          return detail.message || detail.field || fallbackMessage;
        }
      }
    }
  }

  if (payload.message && payload.message !== "Validation error") {
    return payload.message;
  }

  return fallbackMessage;
};

const parseJsonResponse = async <T>(response: Response): Promise<T> => {
  const contentType = response.headers.get("content-type") || "";
  const raw = await response.text();

  if (!contentType.includes("application/json")) {
    throw new Error(
      `API trả về dữ liệu không hợp lệ (${response.status}) từ ${response.url}. Kiểm tra NEXT_PUBLIC_BACKEND_API_URL.`,
    );
  }

  let data: T & ApiErrorPayload;

  try {
    data = JSON.parse(raw) as T & ApiErrorPayload;
  } catch {
    throw new Error(
      `Không đọc được JSON từ ${response.url}. Kiểm tra API backend theo biến môi trường.`,
    );
  }

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, "Yêu cầu không hợp lệ"));
  }

  return data as T;
};

// ==================== SERVICES ====================
export interface Service {
  _id: string;
  code: string;
  name: string;
  icon: string;
  isActive: boolean;
  /** In 2 tờ: vé đầy đủ + tờ nhỏ kẹp hồ sơ (theo cấu hình backend). */
  doublePrint?: boolean;
  /** Nhãn hiển thị khi dịch vụ tắt (isActive = false). Mặc định: "ĐANG THỬ NGHIỆM" */
  inactiveLabel?: string;
  description: string;
  displayOrder: number;
  prefixNumber: number;
  counters: Array<{
    _id: string;
    code: string;
    name: string;
    number: number;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export async function getServices(): Promise<Service[]> {
  try {
    const response = await fetch(`${API_BASE}/services`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (data.success && Array.isArray(data.data)) {
      return data.data.sort(
        (a: Service, b: Service) => a.displayOrder - b.displayOrder,
      );
    }
    return [];
  } catch (error) {
    console.error("Error fetching services:", error);
    return [];
  }
}

export async function getActiveServices(): Promise<Service[]> {
  try {
    const response = await fetch(`${API_BASE}/services/active`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (data.success && Array.isArray(data.data)) {
      return data.data.sort(
        (a: Service, b: Service) => a.displayOrder - b.displayOrder,
      );
    }
    return [];
  } catch (error) {
    console.error("Error fetching active services:", error);
    return [];
  }
}

export async function createService(
  serviceData: Omit<Service, "_id" | "createdAt" | "updatedAt" | "counters">,
): Promise<Service> {
  const response = await fetch(`${API_BASE}/services`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(serviceData),
  });
  const data = await parseJsonResponse<{ success: boolean; data: Service; message?: string }>(response);
  if (data.success) return data.data;
  throw new Error(getApiErrorMessage(data, "Lỗi tạo quầy"));
}

export async function updateService(
  id: string,
  serviceData: Partial<Service>,
): Promise<Service> {
  const response = await fetch(`${API_BASE}/services/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(serviceData),
  });
  const data = await parseJsonResponse<{ success: boolean; data: Service; message?: string }>(response);
  if (data.success) return data.data;
  throw new Error(getApiErrorMessage(data, "Lỗi cập nhật quầy"));
}

export interface ToggleDoublePrintResponse {
  success: boolean;
  data: Service;
  message: string;
}

/** Bật/tắt in 2 vé (vé đầy đủ + tờ nhỏ) cho một dịch vụ. */
export async function patchServiceDoublePrint(
  serviceId: string,
  doublePrint: boolean,
): Promise<{ service: Service; message: string }> {
  const response = await fetch(`${API_BASE}/services/${serviceId}/double-print`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ doublePrint }),
  });
  const data = await parseJsonResponse<ToggleDoublePrintResponse>(response);
  if (data.success) {
    return { service: data.data, message: data.message };
  }
  throw new Error(getApiErrorMessage(data, "Không cập nhật được in 2 vé"));
}

// ==================== COUNTERS ====================
export interface Counter {
  _id: string;
  code: string;
  name: string;
  number: number;
  isActive: boolean;
  processedCount: number;
  currentTicketId: string | null;
  note: string;
  services: Array<{
    _id: string;
    code: string;
    name: string;
    icon?: string;
    displayOrder?: number;
    isActive?: boolean;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export async function getCounters(): Promise<Counter[]> {
  try {
    const response = await fetch(`${API_BASE}/counters`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (data.success && Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  } catch (error) {
    console.error("Error fetching counters:", error);
    return [];
  }
}

export async function createCounter(counterData: {
  code: string;
  name: string;
  number: number;
  note: string;
  isActive?: boolean;
  serviceIds?: string[] | string;
}): Promise<Counter> {
  const response = await fetch(`${API_BASE}/counters`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(counterData),
  });
  const data = await response.json();
  if (data.success) return data.data;
  throw new Error(getApiErrorMessage(data, "Lỗi tạo quầy"));
}

export async function updateCounter(
  id: string,
  counterData: Partial<Counter>,
): Promise<Counter> {
  const response = await fetch(`${API_BASE}/counters/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(counterData),
  });
  const data = await response.json();
  if (data.success) return data.data;
  throw new Error(getApiErrorMessage(data, "Lỗi cập nhật quầy"));
}

export async function deleteCounter(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/counters/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message || "Lỗi xóa quầy");
  }
}

export async function deleteService(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/services/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message || "Lỗi xóa quầy");
  }
}

// ==================== SETTINGS ====================
export interface TtsSettings {
  enabled: boolean;
}

export interface AutoResetSettings {
  enabled: boolean;
  time: string;
}

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

export async function getTtsSettings(): Promise<TtsSettings> {
  const response = await fetch(`${API_BASE}/admin/settings/tts`, {
    headers: getAuthHeaders(),
  });

  const data = await parseJsonResponse<{
    success?: boolean;
    data?: TtsSettings;
    enabled?: boolean;
    message?: string;
  }>(response);

  const enabled = extractTtsEnabled(data);
  if (typeof enabled === "boolean") {
    return { enabled };
  }

  if (data.success === false) {
    throw new Error(data.message || "Không lấy được cấu hình voice");
  }

  throw new Error("Dữ liệu cấu hình voice không hợp lệ");
}

export async function updateTtsSettings(enabled: boolean): Promise<TtsSettings> {
  const response = await fetch(`${API_BASE}/admin/settings/tts`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ enabled }),
  });

  const data = await parseJsonResponse<{
    success?: boolean;
    data?: TtsSettings;
    enabled?: boolean;
    message?: string;
  }>(response);

  const nextEnabled = extractTtsEnabled(data);
  if (typeof nextEnabled === "boolean") {
    return { enabled: nextEnabled };
  }

  if (data.success === false) {
    throw new Error(data.message || "Cap nhat cau hinh voice that bai");
  }

  return { enabled };
}

const extractAutoResetSettings = (payload: unknown): AutoResetSettings | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const enabled =
    typeof record.enabled === "boolean"
      ? record.enabled
      : typeof record.auto_reset_enabled === "boolean"
        ? record.auto_reset_enabled
        : typeof record.autoResetEnabled === "boolean"
          ? record.autoResetEnabled
          : null;
  const time =
    typeof record.time === "string"
      ? record.time
      : typeof record.auto_reset_time === "string"
        ? record.auto_reset_time
        : typeof record.autoResetTime === "string"
          ? record.autoResetTime
          : null;

  if (enabled !== null && time !== null) {
    return { enabled, time };
  }

  if (record.data && typeof record.data === "object") {
    return extractAutoResetSettings(record.data);
  }

  if (record.setting && typeof record.setting === "object") {
    return extractAutoResetSettings(record.setting);
  }

  if (record.result && typeof record.result === "object") {
    return extractAutoResetSettings(record.result);
  }

  return null;
};

export async function getAutoResetSettings(): Promise<AutoResetSettings> {
  const response = await fetch(`${API_BASE}/admin/settings/auto-reset`, {
    headers: getAuthHeaders(),
  });

  const data = await parseJsonResponse<{
    success?: boolean;
    data?: AutoResetSettings;
    message?: string;
  }>(response);

  const settings = extractAutoResetSettings(data);
  if (settings) {
    return settings;
  }

  if (data.success === false) {
    throw new Error(data.message || "Không lấy được cấu hình tự động reset");
  }

  throw new Error("Dữ liệu tự động reset không hợp lệ");
}

export async function updateAutoResetEnabled(
  enabled: boolean,
): Promise<AutoResetSettings> {
  const response = await fetch(
    `${API_BASE}/admin/settings/auto-reset/enabled`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ enabled }),
    },
  );

  const data = await parseJsonResponse<{
    success?: boolean;
    data?: {
      auto_reset_enabled?: boolean;
      enabled?: boolean;
    };
    message?: string;
  }>(response);

  if (data.success === false) {
    throw new Error(data.message || "Cập nhật trạng thái tự động reset thất bại");
  }

  const current = await getAutoResetSettings();
  return {
    ...current,
    enabled:
      typeof data.data?.auto_reset_enabled === "boolean"
        ? data.data.auto_reset_enabled
        : typeof data.data?.enabled === "boolean"
          ? data.data.enabled
          : enabled,
  };
}

export async function updateAutoResetTime(
  time: string,
): Promise<AutoResetSettings> {
  const response = await fetch(`${API_BASE}/admin/settings/auto-reset/time`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ time }),
  });

  const data = await parseJsonResponse<{
    success?: boolean;
    data?: {
      auto_reset_time?: string;
      time?: string;
    };
    message?: string;
  }>(response);

  if (data.success === false) {
    throw new Error(data.message || "Cập nhật giờ tự động reset thất bại");
  }

  const current = await getAutoResetSettings();
  return {
    ...current,
    time:
      typeof data.data?.auto_reset_time === "string"
        ? data.data.auto_reset_time
        : typeof data.data?.time === "string"
          ? data.data.time
          : time,
  };
}

// ==================== PRINTERS ====================
export interface Printer {
  _id: string;
  name: string;
  code: string;
  type: "network" | "serial" | "usb";
  connection: {
    host?: string;
    port?: number;
    path?: string;
  };
  location: string;
  isActive: boolean;
  isDefault: boolean;
  lastTestStatus?: "success" | "failed" | "pending";
  services: string[];
}
export async function updateStaff(
  id: string,
  staffData: UpdateStaffPayload,
): Promise<Staff> {
  const response = await fetch(`${API_BASE}/admin/users/staff/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(staffData),
  });

  const data = await response.json();

  if (data.success) return data.data;

  // 👇 đoạn này bạn viết OK rồi
  if (Array.isArray(data.errors) && data.errors.length > 0) {
    const errorMessages = data.errors
      .map((err: { field?: string; message?: string }) =>
        err.message || err.field || "Lỗi không xác định"
      )
      .join("; ");
    throw new Error(errorMessages);
  }

  throw new Error(data.message || "Lỗi cập nhật nhân viên");
}
export async function getPrinters(): Promise<Printer[]> {
  try {
    const response = await fetch(`${API_BASE}/printers`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (data.success && Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  } catch (error) {
    console.error("Error fetching printers:", error);
    return [];
  }
}

export async function createPrinter(
  printerData: Omit<Printer, "_id" | "services">,
): Promise<Printer> {
  const response = await fetch(`${API_BASE}/printers`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(printerData),
  });
  const data = await response.json();
  if (data.success) return data.data;
  throw new Error(data.message || "Lỗi tạo máy in");
}

export async function updatePrinter(
  id: string,
  printerData: Partial<Omit<Printer, "_id">>,
): Promise<Printer> {
  const response = await fetch(`${API_BASE}/printers/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(printerData),
  });
  const data = await response.json();
  if (data.success) return data.data;
  throw new Error(data.message || "Lỗi cập nhật máy in");
}

export async function deletePrinter(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/printers/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message || "Lỗi xóa máy in");
  }
}

// ==================== STAFF ====================
export interface StaffServiceInfo {
  id: string;
  _id: string;
  code: string;
  name: string;
  icon?: string;
  displayOrder?: number;
  isActive?: boolean;
}
   

export type UpdateStaffPayload = {
  fullName?: string;
  isActive?: boolean;
  password?: string;
  counterId?: string | null; // 👈 QUAN TRỌNG
};



export interface Staff {
  _id: string;
  username: string;
  fullName: string;
  role: "staff";
  counterId: {
    _id: string;
    name: string;
    code: string;
  } | null;
  isActive: boolean;
  lastLoginAt: string | null;
  serviceRestrictionConfigured?: boolean;
  availableServices?: StaffServiceInfo[];
  assignedServices?: StaffServiceInfo[];
  effectiveServices?: StaffServiceInfo[];
  createdAt?: string;
  updatedAt?: string;
}

export async function getStaff(): Promise<Staff[]> {
  try {
    const response = await fetch(`${API_BASE}/admin/users/staff`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (data.success && Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  } catch (error) {
    console.error("Error fetching staff:", error);
    return [];
  }
}

export async function createStaff(
  staffData: Omit<Staff, "_id" | "role" | "counterId" | "isActive" | "lastLoginAt"> & { password?: string },
): Promise<Staff> {
  const response = await fetch(`${API_BASE}/admin/users/staff`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(staffData),
  });
  const data = await response.json();
  if (data.success) return data.data;

  // Trích xuất thông báo lỗi cụ thể từ mảng errors (validation errors)
  if (Array.isArray(data.errors) && data.errors.length > 0) {
    const errorMessages = data.errors
      .map((err: { field?: string; message?: string }) => err.message || err.field || "Lỗi không xác định")
      .join("; ");
    throw new Error(errorMessages);
  }

  throw new Error(data.message || "Lỗi tạo nhân viên");
}



export async function deleteStaff(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/admin/users/staff/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message || "Lỗi xóa nhân viên");
  }
}

export async function assignCounterToStaff(
  staffId: string,
  counterId: string | null,
): Promise<Staff> {
  const response = await fetch(
    `${API_BASE}/admin/users/staff/${staffId}/assign-counter`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ counterId }),
    },
  );
  const data = await response.json();
  if (data.success) return data.data;
  throw new Error(data.message || "Lỗi gán quầy cho nhân viên");
}

export async function toggleCounterActive(id: string): Promise<Counter | null> {
  try {
    const response = await fetch(`${API_BASE}/counters/${id}/toggle-active`, {
      method: "PATCH",
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (data.success) return data.data;
    return null;
  } catch (error) {
    console.error("Error toggling counter active:", error);
    return null;
  }
}

export async function addServicesToCounter(
  counterId: string,
  serviceIds: string[],
): Promise<Counter> {
  const response = await fetch(`${API_BASE}/counters/${counterId}/services`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ serviceIds }),
  });
  const data = await response.json();
  if (data.success) return data.data;
  throw new Error(data.message || "Lỗi thêm quầy vào quầy");
}

export async function removeServiceFromCounter(
  counterId: string,
  serviceId: string,
): Promise<Counter> {
  const response = await fetch(
    `${API_BASE}/counters/${counterId}/services/${serviceId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    },
  );
  const data = await response.json();
  if (data.success) return data.data;
  throw new Error(data.message || "Lỗi xóa quầy khỏi quầy");
}

// ==================== STAFF SERVICE ASSIGNMENT ====================
export interface StaffServicesResponse {
  staffId: string;
  counterId?: string;
  serviceRestrictionConfigured: boolean;
  availableServices: StaffServiceInfo[];
  assignedServices: StaffServiceInfo[];
  effectiveServices: StaffServiceInfo[];
}

export async function getStaffServices(staffId: string): Promise<StaffServicesResponse> {
  const response = await fetch(`${API_BASE}/admin/users/staff/${staffId}/services`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`404: API gán quầy chưa được deploy (GET /staff/${staffId}/services trả ${response.status})`);
  }
  const data = await response.json();
  if (data.success) return data.data;
  throw new Error(data.message || "Lỗi lấy thông tin quầy nhân viên");
}

export async function updateStaffServices(
  staffId: string,
  serviceIds: string[],
): Promise<StaffServicesResponse> {
  const response = await fetch(`${API_BASE}/admin/users/staff/${staffId}/services`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ serviceIds }),
  });
  if (!response.ok) {
    throw new Error(`404: API gán quầy chưa được deploy (PUT /staff/${staffId}/services trả ${response.status})`);
  }
  const data = await response.json();
  if (data.success) return data.data;
  throw new Error(data.message || "Lỗi cập nhật quầy nhân viên");
}