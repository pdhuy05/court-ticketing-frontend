import { getPublicApiBase } from "@/lib/runtime-config";

const API_BASE = getPublicApiBase();

type ApiErrorPayload = {
  message?: string;
  errors?: Record<string, string | string[]>;
};

const getErrorMessageFromPayload = (
  payload: ApiErrorPayload | null,
  rawText: string,
  fallbackMessage: string,
) => {
  if (!payload) {
    if (rawText.trim()) {
      return rawText.trim();
    }

    return fallbackMessage;
  }

  if (typeof payload.message === "string" && payload.message.trim()) {
    return payload.message;
  }

  if (payload.errors && typeof payload.errors === "object") {
    for (const value of Object.values(payload.errors)) {
      if (Array.isArray(value) && value.length > 0) {
        return String(value[0]);
      }

      if (typeof value === "string" && value.trim()) {
        return value;
      }
    }
  }

  return fallbackMessage;
};

const parseJsonSafely = <T>(rawText: string): T | null => {
  try {
    return JSON.parse(rawText) as T;
  } catch {
    return null;
  }
};

export interface StaffLoginResponse {
  success: boolean;
  data: {
    token: string;
    user: {
      id: string;
      username: string;
      fullName: string;
      role: "staff";
      counterId: string;
    };
  };
  message?: string;
}

export async function loginStaff(
  credentials: Record<"username" | "password", string>,
): Promise<StaffLoginResponse> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  const rawText = await response.text();
  const data = parseJsonSafely<StaffLoginResponse & ApiErrorPayload>(rawText);

  if (!response.ok) {
    throw new Error(
      getErrorMessageFromPayload(data, rawText, "Đăng nhập thất bại"),
    );
  }

  if (!data) {
    throw new Error("Phản hồi đăng nhập không hợp lệ");
  }

  return data;
}

export interface AdminLoginResponse {
  success: boolean;
  data: {
    token: string;
    user: AdminProfile;
  };
  message?: string;
}

export async function loginAdmin(
  credentials: Record<"username" | "password", string>,
): Promise<AdminLoginResponse> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  const rawText = await response.text();
  const data = parseJsonSafely<AdminLoginResponse & ApiErrorPayload>(rawText);

  if (!response.ok) {
    throw new Error(
      getErrorMessageFromPayload(data, rawText, "Đăng nhập admin thất bại"),
    );
  }

  if (!data) {
    throw new Error("Phản hồi đăng nhập admin không hợp lệ");
  }

  return data;
}

export type ProfileCounter = {
  _id?: string;
  id?: string;
  code?: string;
  name?: string;
  number?: number;
  isActive?: boolean;
};

export type ProfileService = {
  _id?: string;
  id?: string;
  code?: string;
  name?: string;
  icon?: string;
  displayOrder?: number;
  isActive?: boolean;
};

export type AdminProfile = {
  _id?: string;
  id?: string;
  username?: string;
  fullName?: string;
  role?: "admin" | "staff" | string;
  counterId?: string | null;
  counter?: ProfileCounter | null;
  isActive?: boolean;
  lastLoginAt?: string | null;
  onDuty?: boolean;
  lastShiftStart?: string | null;
  lastShiftEnd?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  availableServices?: ProfileService[];
  assignedServices?: ProfileService[];
  effectiveServices?: ProfileService[];
  serviceRestrictionConfigured?: boolean;
};

export type MeResponse = {
  success: boolean;
  data: AdminProfile;
  message?: string;
};

export async function getMyProfile(): Promise<AdminProfile> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;

  if (!token) {
    throw new Error("NO_TOKEN");
  }

  const response = await fetch(`${API_BASE}/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const rawText = await response.text();
  const data = parseJsonSafely<MeResponse & ApiErrorPayload>(rawText);

  if (!response.ok) {
    throw new Error(
      getErrorMessageFromPayload(data, rawText, "Không thể tải hồ sơ"),
    );
  }

  if (!data?.data) {
    throw new Error("Phản hồi hồ sơ không hợp lệ");
  }

  return data.data;
}
