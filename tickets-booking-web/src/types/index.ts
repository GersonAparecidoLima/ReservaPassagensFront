// ─── Enums ───────────────────────────────────────────────────────────────────

export const BookingStatus = {
  PendingPayment: 1,
  Confirmed: 2,
  Canceled: 3,
} as const

export type BookingStatus = typeof BookingStatus[keyof typeof BookingStatus]

// ─── Domain Entities ─────────────────────────────────────────────────────────

export interface Seat {
  id: string;
  tripId: string;
  seatNumber: string;
  isReserved: boolean;
}

export interface Trip {
  id: string;
  vehicleNumber: string;
  departurePlace: string;
  arrivalPlace: string;
  departureTime: string; // ISO 8601
  arrivalTime: string;   // ISO 8601
  price: number;
  seats?: Seat[];
}

export interface Booking {
  id: string;
  tripId: string;
  seatId: string;
  passengerName: string;
  passengerDocument: string;
  createdAt: string; // ISO 8601
  status: BookingStatus;
  trip?: Trip;
  seat?: Seat;
}

// ─── Response Shapes ─────────────────────────────────────────────────────────

/** Shape returned by GET /api/bookings/trips */
export interface AvailableTrip {
  id: string;
  origin: string;
  destination: string;
  departureTime: string; // ISO 8601
  price: number;
  availableSeats: string[]; // e.g. ["12A", "15B"]
}

/** Shape returned by POST /api/bookings (202 Accepted) */
export interface CreateBookingResponse {
  message: string;
  expiresAt: string; // ISO 8601 — Redis lock expiry (~10 min)
}

/** Shape returned by PUT /api/bookings/:id (200 OK) */
export interface UpdateBookingResponse {
  message: string;
}

/** Shape returned by DELETE /api/bookings/:id (404 Not Found) */
export interface BookingNotFoundResponse {
  message: string;
}

// ─── Request Payloads ────────────────────────────────────────────────────────

export interface CreateBookingRequest {
  tripId: string;
  seatNumber: string;
  passengerName: string;
  passengerDocument: string;
  price: number;
}

export interface UpdateBookingRequest {
  passengerName: string;
  passengerDocument: string;
}
