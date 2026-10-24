import { ReservationStatus } from '@generated/prisma/enums';

/** Map client-facing string → DB enum */
export const toStatus = (status?: string): ReservationStatus => {
  switch (status) {
    case 'Approved':
      return ReservationStatus.APPROVED;
    case 'Rejected':
      return ReservationStatus.REJECTED;
    case 'Cancelled':
      return ReservationStatus.CANCELLED;
    default:
      return ReservationStatus.PENDING;
  }
};

/** Map DB enum → client-facing string */
export const fromStatus = (status: ReservationStatus): string => {
  switch (status) {
    case ReservationStatus.APPROVED:
      return 'Approved';
    case ReservationStatus.REJECTED:
      return 'Rejected';
    case ReservationStatus.CANCELLED:
      return 'Cancelled';
    default:
      return 'Pending';
  }
};

/** Valid status transitions. Empty array = terminal state. */
export const VALID_RESERVATION_TRANSITIONS: Record<string, string[]> = {
  Pending: ['Approved', 'Rejected', 'Cancelled'],
  Approved: ['Cancelled'],
  Rejected: [],
  Cancelled: [],
};

export const parseReservationDate = (value: unknown): Date => {
  const date = new Date(String(value || ''));
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

export interface ReservationRecord {
  id: string;
  customerName: string;
  phone: string;
  email?: string | null;
  guests: number;
  displayTime?: string | null;
  reservationTime: Date;
  tableCode?: string | null;
  status: ReservationStatus;
  occasion?: string | null;
  notes?: string | null;
  userId?: string | null;
}

export const toClientReservation = (reservation?: ReservationRecord | null) => {
  if (!reservation) return null;
  return {
    id: reservation.id,
    customer: reservation.customerName,
    phone: reservation.phone,
    email: reservation.email ?? null,
    guests: reservation.guests,
    time: reservation.displayTime || reservation.reservationTime.toISOString(),
    table: reservation.tableCode || 'TBD',
    status: fromStatus(reservation.status),
    occasion: reservation.occasion ?? null,
    notes: reservation.notes ?? null,
    userId: reservation.userId ?? null,
  };
};
