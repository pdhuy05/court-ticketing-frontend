"use client";

import { io, Socket } from "socket.io-client";
import { getSocketBaseUrl } from "@/lib/runtime-config";

export interface StaffDisplayTicket {
  id: string;
  number: number;
  formattedNumber: string;
  displayNumber?: string;
  customerName: string;
  phone: string;
  status: "waiting" | "processing" | "completed" | "skipped" | "done";
  serviceName: string;
  createdAt: string;
}

export interface StaffDisplaySnapshot {
  counter: {
    id: string;
    name: string;
    number: number;
    isActive: boolean;
    processedCount: number;
  };
  services: Array<{ id: string; _id?: string; name: string; code: string; icon?: string; displayOrder?: number; isActive?: boolean }>;
  availableServices?: Array<{ id: string; _id?: string; name: string; code: string; icon?: string; displayOrder?: number; isActive?: boolean }>;
  assignedServices?: Array<{ id: string; _id?: string; name: string; code: string; icon?: string; displayOrder?: number; isActive?: boolean }>;
  serviceRestrictionConfigured?: boolean;
  currentTicket: StaffDisplayTicket | null;
  processingTickets?: StaffDisplayTicket[];
  waitingTickets: StaffDisplayTicket[];
  recallTickets?: StaffDisplayTicket[];
  totalWaiting: number;
  staffName?: string;
  staffId?: string;
}

export interface StaffDisplayUpdatedPayload {
  reason: string;
  counterId: string;
  staffId?: string;
  updatedAt?: string;
  ticketId?: string;
  serviceId?: string;
  data: StaffDisplaySnapshot;
}

export interface JoinedCounterRoomPayload {
  counterId: string;
  room: string;
}

export interface SocketErrorPayload {
  message: string;
}

export interface TicketBackToWaitingPayload {
  ticketId: string;
  number: number;
  formattedNumber?: string;
  displayNumber?: string;
  customerName: string;
  serviceName: string;
  counterId?: string;
  counterName?: string;
  position: "front" | "back";
  returnedAt?: string;
}

export function createStaffSocket() {
  const url = getSocketBaseUrl();
  return io(url, {
    transports: ["websocket"],
  });
}

export function joinStaffDisplayRoom(socket: Socket, counterId: string, staffId?: string) {
  if (staffId) {
    socket.emit("join-staff-display", { counterId, staffId });
  } else {
    socket.emit("join-staff-display", { counterId });
  }
}

export function joinCounterRoom(socket: Socket, counterId: string, staffId?: string) {
  joinStaffDisplayRoom(socket, counterId, staffId);
  socket.emit("join-counter", counterId);
}

export function onStaffDisplayUpdated(
  socket: Socket,
  handler: (payload: StaffDisplayUpdatedPayload) => void,
) {
  socket.on("staff-display-updated", handler);
  return () => {
    socket.off("staff-display-updated", handler);
  };
}

export function onJoinedCounterRoom(
  socket: Socket,
  handler: (payload: JoinedCounterRoomPayload) => void,
) {
  socket.on("joined-counter-room", handler);
  return () => {
    socket.off("joined-counter-room", handler);
  };
}

export function onSocketError(
  socket: Socket,
  handler: (payload: SocketErrorPayload) => void,
) {
  socket.on("socket-error", handler);
  return () => {
    socket.off("socket-error", handler);
  };
}

export function onTicketBackToWaiting(
  socket: Socket,
  handler: (payload: TicketBackToWaitingPayload) => void,
) {
  socket.on("ticket-back-to-waiting", handler);
  return () => {
    socket.off("ticket-back-to-waiting", handler);
  };
}