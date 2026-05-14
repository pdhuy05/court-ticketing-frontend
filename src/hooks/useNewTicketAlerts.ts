"use client";

import { useCallback, useEffect, useRef } from "react";
import type { NewTicketSocketPayload } from "@/types/new-ticket";

const stripTitleBadge = (title: string) => title.replace(/^\(\d+\)\s+/, "");

function showDesktopNotification(payload: NewTicketSocketPayload) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;

  const { ticket, service } = payload;
  const label =
    ticket.displayNumber?.trim() || ticket.ticketNumber?.trim() || "—";

  try {
    const n = new Notification(`Vé mới — ${service.name}`, {
      body: `Số ${label} — ${ticket.name || "Đương sự"}`,
      tag: String(ticket._id),
      requireInteraction: false,
    });
    n.onclick = () => { window.focus(); n.close(); };
  } catch {
    // silent
  }
}

export function useNewTicketAlerts() {
  const baseTitleRef = useRef<string | null>(null);
  const unseenRef = useRef(0);

  useEffect(() => {
    if (typeof document === "undefined") return;
    baseTitleRef.current = stripTitleBadge(document.title);
    const onFocus = () => {
      unseenRef.current = 0;
      if (baseTitleRef.current !== null) document.title = baseTitleRef.current;
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  return useCallback(
    (payload: NewTicketSocketPayload) => {
      const { ticket, service } = payload;

      // 1. Browser notification (hiện kể cả khi tab ẩn)
      showDesktopNotification(payload);

      // 2. Badge title tab
      unseenRef.current += 1;
      const base = baseTitleRef.current ?? stripTitleBadge(typeof document !== "undefined" ? document.title : "");
      baseTitleRef.current = base;
      if (typeof document !== "undefined") {
        document.title = `(${unseenRef.current}) ${base}`;
      }
    },
    [],
  );
}