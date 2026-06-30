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

type ApiErrorPayload = { message?: string };

const parseJsonResponse = async <T>(response: Response): Promise<T> => {
  const contentType = response.headers.get("content-type") || "";
  const raw = await response.text();

  if (!contentType.includes("application/json")) {
    throw new Error(
      `API trả về dữ liệu không hợp lệ (${response.status}) từ ${response.url}.`,
    );
  }

  let data: T & ApiErrorPayload;
  try {
    data = JSON.parse(raw) as T & ApiErrorPayload;
  } catch {
    throw new Error(`Không đọc được JSON từ ${response.url}.`);
  }

  if (!response.ok) {
    throw new Error(data?.message || `Lỗi không xác định (${response.status})`);
  }

  return data;
};

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ChatReply = {
  reply: string;
  usage?: { input_tokens?: number; output_tokens?: number } | null;
};

export async function getAiKnowledge(): Promise<{ knowledge: string; isDefault: boolean }> {
  const response = await fetch(`${API_BASE}/ai/knowledge`, {
    headers: getAuthHeaders(),
  });
  const data = await parseJsonResponse<{
    success: boolean;
    data: { knowledge: string; isDefault?: boolean };
  }>(response);
  return {
    knowledge: data.data.knowledge || "",
    isDefault: Boolean(data.data.isDefault),
  };
}

export async function updateAiKnowledge(knowledge: string): Promise<string> {
  const response = await fetch(`${API_BASE}/ai/knowledge`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ knowledge }),
  });
  const data = await parseJsonResponse<{ success: boolean; data: { knowledge: string } }>(
    response,
  );
  return data.data.knowledge || "";
}

export async function askAi(message: string, history: ChatMessage[]): Promise<ChatReply> {
  const response = await fetch(`${API_BASE}/ai/chat`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ message, history }),
  });
  const data = await parseJsonResponse<{ success: boolean; data: ChatReply }>(response);
  return data.data;
}