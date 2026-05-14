"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { getSocketBaseUrl } from "@/lib/runtime-config";
import { useNewTicketAlerts } from "@/hooks/useNewTicketAlerts";
import type { NewTicketSocketPayload } from "@/types/new-ticket";

export default function NewTicketGlobalSocket() {
  const onNewTicket = useNewTicketAlerts();
  const onNewTicketRef = useRef(onNewTicket);

  useEffect(() => {
    onNewTicketRef.current = onNewTicket;
  }, [onNewTicket]);

  useEffect(() => {
    const url = getSocketBaseUrl();
    if (!url) return;

    const socket: Socket = io(url, {
      transports: ["websocket", "polling"],
    });

    const handler = (payload: NewTicketSocketPayload) => {
      onNewTicketRef.current(payload);
    };

    socket.on("new_ticket", handler);

    return () => {
      socket.off("new_ticket", handler);
      socket.disconnect();
    };
  }, []); // deps rỗng — socket chỉ tạo 1 lần, không reconnect khi re-render

  return null;
}
