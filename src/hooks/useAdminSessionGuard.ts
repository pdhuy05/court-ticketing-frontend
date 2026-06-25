"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ADMIN_AUTH_EXPIRED_ERROR,
  clearAdminSession,
  isAuthExpiredMessage,
} from "@/lib/admin-auth";
import { adminPath } from "@/lib/admin-base";

export function useAdminSessionGuard() {
  const router = useRouter();

  return useCallback(
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error || "");

      if (
        message === ADMIN_AUTH_EXPIRED_ERROR ||
        isAuthExpiredMessage(message)
      ) {
        clearAdminSession();
        router.replace(`${adminPath("/admin/login")}?reason=session_expired`);
        return true;
      }

      return false;
    },
    [router],
  );
}