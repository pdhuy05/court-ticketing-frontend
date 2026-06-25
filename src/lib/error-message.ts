const RAW_NETWORK_ERROR_PATTERNS = [
  "failed to fetch",
  "load failed",
  "network error",
  "networkerror",
  "fetch failed",
  "the network connection was lost",
  "network request failed",
  "connection refused",
  "err_connection",
  "err_internet_disconnected",
  "err_name_not_resolved",
];

export function getErrorMessage(
  error: unknown,
  fallback: string = "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.",
): string {
  if (error instanceof Error && error.message) {
    const normalized = error.message.trim().toLowerCase();
    const isRawNetworkError = RAW_NETWORK_ERROR_PATTERNS.some((pattern) =>
      normalized.includes(pattern),
    );

    if (!isRawNetworkError) {
      return error.message;
    }
  }

  return fallback;
}