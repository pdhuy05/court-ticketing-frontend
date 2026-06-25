export type TicketStatus =
  | "waiting"
  | "calling"
  | "processing"
  | "completed"
  | "skipped"
  | "done";

export interface Ticket {
  id: string;
  number: number;
  formattedNumber: string;
  displayNumber?: string;
  customerName: string;
  phone: string;
  status: TicketStatus;
  serviceName: string;
  createdAt: string;
  processingAt?: string | null;
  name: string;
  note?: string | null;
}

export interface Counter {
  id: string;
  name: string;
  number: number;
  isActive: boolean;
  processedCount: number;
}

export interface Service {
  id: string;
  name: string;
  code: string;
}