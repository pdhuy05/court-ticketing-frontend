/**
 * Payload broadcast từ backend khi đương sự lấy số thành công (Socket.IO `new_ticket`).
 * @see docs/SOCKET_NEW_TICKET_FE.md
 */
export interface NewTicketSocketPayload {
  ticket: {
    _id: string;
    ticketNumber: string;
    displayNumber: string | null;
    name: string;
    phone: string;
    createdAt: string;
  };
  service: {
    _id: string;
    name: string;
    code: string;
  };
}
