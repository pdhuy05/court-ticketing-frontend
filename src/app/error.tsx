"use client";

import AppErrorState from "@/components/AppErrorState";

function getVietnameseErrorTitle(error: Error & { digest?: string }) {
  const message = error.message.toLowerCase();

  if (
    message.includes("failed to fetch") ||
    message.includes("fetch failed") ||
    message.includes("networkerror")
  ) {
    return "Không thể kết nối máy chủ";
  }

  return "Hệ thống đang gặp sự cố";
}

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppErrorState
      code="500"
      title={getVietnameseErrorTitle(error)}
      actionLabel="Thử lại"
      onAction={reset}
    />
  );
}
