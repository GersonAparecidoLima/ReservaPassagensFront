import { apiClient } from './client';
import type {
  AvailableTrip,
  Booking,
  CreateBookingRequest,
  CreateBookingResponse,
  UpdateBookingRequest,
  UpdateBookingResponse,
} from '../types';

// ─── Trips ───────────────────────────────────────────────────────────────────

/**
 * GET /api/bookings/trips
 * Returns trips that still have at least one available seat.
 */
export async function getAvailableTrips(): Promise<AvailableTrip[]> {
  const { data } = await apiClient.get<AvailableTrip[]>('/bookings/trips');
  return data;
}

// ─── Bookings ────────────────────────────────────────────────────────────────

/**
 * GET /api/bookings
 * Returns all bookings (admin use).
 */
export async function getAllBookings(): Promise<Booking[]> {
  const { data } = await apiClient.get<Booking[]>('/bookings');
  return data;
}

/**
 * GET /api/bookings/:id
 * Returns a single booking with its related trip and seat.
 */
export async function getBookingById(id: string): Promise<Booking> {
  const { data } = await apiClient.get<Booking>(`/bookings/${id}`);
  return data;
}

/**
 * POST /api/bookings
 * Creates a booking asynchronously via Redis lock + RabbitMQ event.
 * Returns 202 Accepted immediately — the booking is processed in the background.
 * `expiresAt` reflects the 10-minute Redis seat-lock window.
 */
export async function createBooking(
  payload: CreateBookingRequest
): Promise<CreateBookingResponse> {
  const { data } = await apiClient.post<CreateBookingResponse>('/bookings', payload);
  return data;
}

/**
 * PUT /api/bookings/:id
 * Updates passenger name and document for an existing booking.
 */
export async function updateBooking(
  id: string,
  payload: UpdateBookingRequest
): Promise<UpdateBookingResponse> {
  const { data } = await apiClient.put<UpdateBookingResponse>(`/bookings/${id}`, payload);
  return data;
}

/**
 * DELETE /api/bookings/:id
 * Cancels and removes the booking; releases the associated seat.
 * Returns 204 No Content on success.
 */
export async function deleteBooking(id: string): Promise<void> {
  await apiClient.delete(`/bookings/${id}`);
}
