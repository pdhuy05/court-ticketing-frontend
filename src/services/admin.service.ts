import { getPublicApiBase, getSocketBaseUrl } from "@/lib/runtime-config";

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
  /** Còn trong giờ lấy vé hay không (theo lịch quầy đã set, tự động cập nhật mỗi phút). */
  isOpen?: boolean;
  /** Override thủ công của admin: 'open' | 'closed' | null (null = theo lịch tự động). */
  manualOverride?: 'open' | 'closed' | null;
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
  ttsEnabled: boolean;
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

// ==================== SERVICE SCHEDULE (Giờ lấy vé) ====================
export interface TimeSlot {
  openTime: string; // "HH:MM"
  closeTime: string; // "HH:MM"
}

export interface ServiceSchedule {
  serviceId:
    | "ALL"
    | {
        _id: string;
        code?: string;
        name?: string;
        isActive?: boolean;
        isOpen?: boolean;
        manualOverride?: 'open' | 'closed' | null;
      };
  slots: TimeSlot[];
  openTime?: string; // legacy
  closeTime?: string; // legacy
  isEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export async function getServiceSchedules(): Promise<ServiceSchedule[]> {
  const response = await fetch(`${API_BASE}/admin/shift/service-schedules`, {
    headers: getAuthHeaders(),
  });

  const data = await parseJsonResponse<{
    success?: boolean;
    data?: ServiceSchedule[];
    message?: string;
  }>(response);

  if (data.success === false) {
    throw new Error(data.message || "Không lấy được lịch giờ lấy vé");
  }

  return Array.isArray(data.data) ? data.data : [];
}

export async function upsertServiceSchedule(payload: {
  serviceId: string; // ObjectId hoặc "ALL"
  slots?: TimeSlot[]; // Nhiều ca (slot) mỗi ngày
  openTime?: string; // legacy fallback
  closeTime?: string; // legacy fallback
  isEnabled?: boolean;
}): Promise<ServiceSchedule> {
  const response = await fetch(`${API_BASE}/admin/shift/service-schedules`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await parseJsonResponse<{
    success?: boolean;
    data?: ServiceSchedule;
    message?: string;
  }>(response);

  if (data.success === false || !data.data) {
    throw new Error(data.message || "Lưu lịch giờ lấy vé thất bại");
  }

  return data.data;
}

export async function deleteServiceSchedule(
  serviceId: string,
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/admin/shift/service-schedules/${serviceId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    },
  );

  const data = await parseJsonResponse<{
    success?: boolean;
    message?: string;
  }>(response);

  if (data.success === false) {
    throw new Error(data.message || "Xóa lịch giờ lấy vé thất bại");
  }
}

export async function toggleServiceSchedule(
  serviceId: string,
  isEnabled: boolean,
): Promise<ServiceSchedule> {
  const response = await fetch(
    `${API_BASE}/admin/shift/service-schedules/${serviceId}/toggle`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ isEnabled }),
    },
  );

  const data = await parseJsonResponse<{
    success?: boolean;
    data?: ServiceSchedule;
    message?: string;
  }>(response);

  if (data.success === false || !data.data) {
    throw new Error(data.message || "Cập nhật trạng thái lịch thất bại");
  }

  return data.data;
}

export async function setServiceManualOverride(
  serviceId: string, // ObjectId hoặc "ALL"
  override: 'open' | 'closed' | null,
): Promise<{ serviceId: string | 'ALL'; manualOverride: string | null; isOpen: boolean }> {
  const response = await fetch(
    `${API_BASE}/admin/shift/service-override/${serviceId}`,
    {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ override }),
    },
  );

  const data = await parseJsonResponse<{
    success?: boolean;
    data?: { serviceId: string; manualOverride: string | null; isOpen: boolean };
    message?: string;
  }>(response);

  if (data.success === false || !data.data) {
    throw new Error(data.message || 'Cập nhật trạng thái dịch vụ thất bại');
  }

  return data.data;
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

export async function toggleCounterTts(id: string): Promise<Counter | null> {
  try {
    const response = await fetch(`${API_BASE}/counters/${id}/toggle-tts`, {
      method: "PATCH",
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (data.success) return data.data;
    return null;
  } catch (error) {
    console.error("Error toggling counter TTS:", error);
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
// ==================== REPORT EXPORT ====================
export interface ReportFilters {
  startDate: string;
  endDate: string;
  format: "excel" | "csv" | "pdf";
  reportType?: "all" | "longest_wait" | "longest_process" | "by_status" | "by_service" | "by_counter";
  status?: string;
  serviceId?: string;
  counterId?: string;
  topN?: number;
}

export async function exportReport(filters: ReportFilters): Promise<void> {
  const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const { format, startDate, endDate, reportType = "all", status, serviceId, counterId, topN = 20 } = filters;

  const extMap: Record<string, string> = { excel: "xlsx", csv: "csv", pdf: "pdf" };
  const endpoint = format === "excel" ? "export/excel" : format === "csv" ? "export/csv" : "export/pdf";

  const params = new URLSearchParams({ startDate, endDate, reportType, topN: String(topN) });
  if (status) params.set("status", status);
  if (serviceId) params.set("serviceId", serviceId);
  if (counterId) params.set("counterId", counterId);

  const response = await fetch(`${API_BASE}/reports/${endpoint}?${params}`, { headers });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Xuất báo cáo thất bại");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const typeSuffix = reportType !== "all" ? `-${reportType}` : "";
  a.download = `bao-cao${typeSuffix}-${startDate}_${endDate}.${extMap[format]}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
// ==================== TICKET SEARCH ====================
export interface TicketSearchResult {
  _id: string;
  ticketNumber: string;
  displayNumber: string | null;
  formattedNumber: string;
  date: string;
  status: "waiting" | "processing" | "completed" | "skipped";
  name: string;
  phone: string;
  service: { id: string; name: string; code: string } | null;
  counter: { id: string; name: string; number: number } | null;
  queueCounter: { id: string; name: string; number: number } | null;
  staff: { id: string; name: string } | null;
  skipCount: number;
  note: string | null;
  waitingDuration: number;
  processingDuration: number;
  totalDuration: number;
  createdAt: string;
  calledAt: string | null;
  completedAt: string | null;
  skippedAt: string | null;
}

export interface TicketSearchPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface TicketSearchFilters {
  phone?: string;
  name?: string;
  ticketNumber?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  serviceId?: string;
  counterId?: string;
  page?: number;
  limit?: number;
}

export interface TicketSearchResponse {
  tickets: TicketSearchResult[];
  pagination: TicketSearchPagination;
}

export async function searchTickets(
  filters: TicketSearchFilters,
): Promise<TicketSearchResponse> {
  const params = new URLSearchParams();
  if (filters.phone) params.set("phone", filters.phone);
  if (filters.name) params.set("name", filters.name);
  if (filters.ticketNumber) params.set("ticketNumber", filters.ticketNumber);
  if (filters.date) params.set("date", filters.date);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.status) params.set("status", filters.status);
  if (filters.serviceId) params.set("serviceId", filters.serviceId);
  if (filters.counterId) params.set("counterId", filters.counterId);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));

  const response = await fetch(
    `${API_BASE}/admin/tickets/search?${params.toString()}`,
    { headers: getAuthHeaders() },
  );
  const data = await parseJsonResponse<{
    success: boolean;
    data: TicketSearchResult[];
    pagination: TicketSearchPagination;
    message?: string;
  }>(response);

  if (data.success) {
    return { tickets: data.data, pagination: data.pagination };
  }
  throw new Error(getApiErrorMessage(data, "Lỗi tra cứu vé"));
}
// ─── Site Config ─────────────────────────────────────────────────────────────

export interface SiteConfig {
  branchName: string;
  logoUrl: string;
  primaryColor: string;
  tickerText: string;
  workingHours: string;
  address: string;
  announcement: string;
}

export async function getSiteConfig(): Promise<SiteConfig> {
  const response = await fetch(`${API_BASE}/admin/settings/site-config`, {
    headers: getAuthHeaders(),
  });
  const data = await parseJsonResponse<{ success: boolean; data: SiteConfig; message?: string }>(response);
  if (data.success) return data.data;
  throw new Error(getApiErrorMessage(data, "Không lấy được cấu hình giao diện"));
}

export async function updateSiteConfig(fields: Partial<SiteConfig>): Promise<SiteConfig> {
  const response = await fetch(`${API_BASE}/admin/settings/site-config`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(fields),
  });
  const data = await parseJsonResponse<{ success: boolean; data: SiteConfig; message?: string }>(response);
  if (data.success) return data.data;
  throw new Error(getApiErrorMessage(data, "Cập nhật cấu hình giao diện thất bại"));
}
// ─── Upload Logo ─────────────────────────────────────────────────────────────
export async function uploadLogo(file: File): Promise<{ logoUrl: string }> {
  const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const formData = new FormData();
  formData.append("logo", file);

  const response = await fetch(`${API_BASE}/admin/settings/upload-logo`, {
    method: "POST",
    headers,
    body: formData,
  });

  const data = await parseJsonResponse<{ success: boolean; data: { logoUrl: string }; message?: string }>(response);
  if (data.success) {
    const raw = data.data.logoUrl;
    const beBase = getSocketBaseUrl(); 
    const logoUrl = raw.startsWith("http") ? raw : `${beBase}${raw}`;
    return { logoUrl };
  }
  throw new Error(getApiErrorMessage(data, "Upload logo thất bại"));
}
// ─── Phân quyền Admin ────────────────────────────────────────────────────────

export type AdminPermissionsData = {
  _id: string;
  fullName: string;
  username: string;
  isSuperAdmin: boolean;
  adminPermissions: string[] | null;
  allPermissions: string[];
};

export async function getAdminPermissions(adminId: string): Promise<AdminPermissionsData> {
  const response = await fetch(`${API_BASE}/admin/users/admins/${adminId}/permissions`, {
    headers: getAuthHeaders(),
  });
  const data = await parseJsonResponse<{ success: boolean; data: AdminPermissionsData; message?: string }>(response);
  if (data.success) return data.data;
  throw new Error(getApiErrorMessage(data, "Không lấy được phân quyền"));
}

export async function updateAdminPermissions(
  adminId: string,
  payload: { permissions?: string[] | null; isSuperAdmin?: boolean },
): Promise<AdminPermissionsData> {
  const response = await fetch(`${API_BASE}/admin/users/admins/${adminId}/permissions`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await parseJsonResponse<{ success: boolean; data: AdminPermissionsData; message?: string }>(response);
  if (data.success) return data.data;
  throw new Error(getApiErrorMessage(data, "Cập nhật phân quyền thất bại"));
}
// ─── Admin Accounts CRUD ─────────────────────────────────────────────────────

export type AdminAccount = {
  _id: string;
  username: string;
  fullName: string;
  role: "admin";
  isActive: boolean;
  isSuperAdmin: boolean;
  adminPermissions: string[] | null;
  createdAt?: string;
  lastLoginAt?: string | null;
};

export type CreateAdminPayload = {
  username: string;
  password: string;
  fullName: string;
  isSuperAdmin?: boolean;
  adminPermissions?: string[] | null;
};

export type UpdateAdminPayload = {
  password?: string;
  fullName?: string;
  isActive?: boolean;
};

export async function getAllAdmins(): Promise<AdminAccount[]> {
  const response = await fetch(`${API_BASE}/admin/users/admins`, {
    headers: getAuthHeaders(),
  });
  const data = await parseJsonResponse<{ success: boolean; data: AdminAccount[]; message?: string }>(response);
  if (data.success) return data.data;
  throw new Error(getApiErrorMessage(data, "Không lấy được danh sách admin"));
}

export async function createAdmin(payload: CreateAdminPayload): Promise<AdminAccount> {
  const response = await fetch(`${API_BASE}/admin/users/admins`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await parseJsonResponse<{ success: boolean; data: AdminAccount; message?: string }>(response);
  if (data.success) return data.data;
  throw new Error(getApiErrorMessage(data, "Tạo admin thất bại"));
}

export async function updateAdmin(id: string, payload: UpdateAdminPayload): Promise<AdminAccount> {
  const response = await fetch(`${API_BASE}/admin/users/admins/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await parseJsonResponse<{ success: boolean; data: AdminAccount; message?: string }>(response);
  if (data.success) return data.data;
  throw new Error(getApiErrorMessage(data, "Cập nhật admin thất bại"));
}

export async function deleteAdmin(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/admin/users/admins/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  const data = await parseJsonResponse<{ success: boolean; message?: string }>(response);
  if (!data.success) throw new Error(getApiErrorMessage(data, "Xóa admin thất bại"));
}

export async function toggleAdminActive(id: string): Promise<AdminAccount> {
  const response = await fetch(`${API_BASE}/admin/users/admins/${id}/toggle-active`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  });
  const data = await parseJsonResponse<{ success: boolean; data: AdminAccount; message?: string }>(response);
  if (data.success) return data.data;
  throw new Error(getApiErrorMessage(data, "Cập nhật trạng thái thất bại"));
}
// ─────────────────────────────────────────────────────────────────────────────
// PATCH — Thêm vào CUỐI file:
//   /src/services/admin.service.ts
// ─────────────────────────────────────────────────────────────────────────────

export type DisplayMode = 'service' | 'queue';

export async function getDisplayMode(): Promise<DisplayMode> {
  const response = await fetch(`${API_BASE}/admin/settings/display-mode`, {
    headers: getAuthHeaders(),
  });
  const data = await parseJsonResponse<{ success: boolean; data: { display_mode: DisplayMode } }>(response);
  if (data.success) return data.data.display_mode;
  throw new Error('Không lấy được chế độ màn hình');
}

export async function updateDisplayMode(mode: DisplayMode): Promise<DisplayMode> {
  const response = await fetch(`${API_BASE}/admin/settings/display-mode`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ mode }),
  });
  const data = await parseJsonResponse<{ success: boolean; data: { display_mode: DisplayMode }; message?: string }>(response);
  if (data.success) return data.data.display_mode;
  throw new Error(getApiErrorMessage(data, 'Cập nhật chế độ màn hình thất bại'));
}

export interface AuditLog {
  _id: string;
  actorId:       string | null;
  actorUsername: string;
  actorRole:     "admin" | "staff" | "system";
  action:        string;
  status:        "success" | "failed";
  targetId:      string | null;
  targetType:    string | null;
  detail:        Record<string, unknown> | null;
  ipAddress:     string | null;
  userAgent:     string | null;
  createdAt:     string;
  updatedAt:     string;
}

export interface AuditLogFilter {
  actorId?:      string;
  actorUsername?: string;
  action?:       string;
  status?:       "success" | "failed" | "";
  dateFrom?:     string;
  dateTo?:       string;
  page?:         number;
  limit?:        number;
}

export interface AuditLogResult {
  logs:       AuditLog[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

export async function getAuditLogs(filter: AuditLogFilter = {}): Promise<AuditLogResult> {
  const params = new URLSearchParams();
  if (filter.actorId)       params.set("actorId",       filter.actorId);
  if (filter.actorUsername) params.set("actorUsername",  filter.actorUsername);
  if (filter.action)        params.set("action",         filter.action);
  if (filter.status)        params.set("status",         filter.status);
  if (filter.dateFrom)      params.set("dateFrom",       filter.dateFrom);
  if (filter.dateTo)        params.set("dateTo",         filter.dateTo);
  if (filter.page)          params.set("page",           String(filter.page));
  if (filter.limit)         params.set("limit",          String(filter.limit));

  const response = await fetch(`${API_BASE}/admin/audit-logs?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  const data = await parseJsonResponse<{ success: boolean; data: AuditLogResult; message?: string }>(response);
  if (data.success) return data.data;
  throw new Error(getApiErrorMessage(data, "Không tải được nhật ký hoạt động"));
}