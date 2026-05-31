import { useCallback, useEffect, useState } from 'react'
import { getAllBookings, getAvailableTrips } from '../api'
import { BookingStatus } from '../types'
import type { AvailableTrip, Booking } from '../types'
import './Dashboard.css'

// ─── Formatting ───────────────────────────────────────────────────────────────

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(iso)
  )

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  [BookingStatus.PendingPayment]: { label: 'Aguardando Pagamento', cls: 'badge--pending' },
  [BookingStatus.Confirmed]:      { label: 'Confirmada',           cls: 'badge--confirmed' },
  [BookingStatus.Canceled]:       { label: 'Cancelada',            cls: 'badge--canceled' },
} satisfies Record<BookingStatus, { label: string; cls: string }>

// ─── Async State ──────────────────────────────────────────────────────────────

type AsyncState = 'loading' | 'success' | 'error'

// ─── UI Primitives ────────────────────────────────────────────────────────────

function Spinner() {
  return <div className="spinner" role="status" aria-label="Carregando..." />
}

function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="state-box state-box--error">
      <p>{message}</p>
      <button className="btn btn--ghost" onClick={onRetry}>
        Tentar novamente
      </button>
    </div>
  )
}

function EmptyBox({ message }: { message: string }) {
  return (
    <div className="state-box state-box--empty">
      <p>{message}</p>
    </div>
  )
}

// ─── Trip Card ────────────────────────────────────────────────────────────────

const MAX_SEAT_CHIPS = 5

function TripCard({ trip }: { trip: AvailableTrip }) {
  const visible = trip.availableSeats.slice(0, MAX_SEAT_CHIPS)
  const extra = trip.availableSeats.length - MAX_SEAT_CHIPS

  return (
    <article className="trip-card">
      <div className="trip-card__route">
        <span className="trip-card__place">{trip.origin}</span>
        <span className="trip-card__arrow" aria-hidden="true">→</span>
        <span className="trip-card__place">{trip.destination}</span>
      </div>

      <dl className="trip-card__info">
        <div>
          <dt>Partida</dt>
          <dd>{formatDate(trip.departureTime)}</dd>
        </div>
        <div>
          <dt>Preço</dt>
          <dd className="trip-card__price">{formatCurrency(trip.price)}</dd>
        </div>
      </dl>

      <div className="trip-card__seats">
        <span className="trip-card__seats-label">
          {trip.availableSeats.length === 0
            ? 'Sem poltronas disponíveis'
            : `${trip.availableSeats.length} poltrona${trip.availableSeats.length > 1 ? 's' : ''} disponível${trip.availableSeats.length > 1 ? 'eis' : ''}`}
        </span>
        {trip.availableSeats.length > 0 && (
          <div className="trip-card__chips">
            {visible.map((s) => (
              <span key={s} className="chip">{s}</span>
            ))}
            {extra > 0 && <span className="chip chip--more">+{extra}</span>}
          </div>
        )}
      </div>
    </article>
  )
}

// ─── Bookings Table ───────────────────────────────────────────────────────────

function BookingsTable({ bookings }: { bookings: Booking[] }) {
  return (
    <div className="table-wrapper">
      <table className="bookings-table">
        <thead>
          <tr>
            <th>Passageiro</th>
            <th>Documento</th>
            <th>Poltrona</th>
            <th>Viagem</th>
            <th>Status</th>
            <th>Reservado em</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => {
            const cfg = STATUS_CONFIG[b.status]
            const route = b.trip
              ? `${b.trip.departurePlace} → ${b.trip.arrivalPlace}`
              : '—'

            return (
              <tr key={b.id}>
                <td>{b.passengerName}</td>
                <td className="cell--mono">{b.passengerDocument}</td>
                <td>
                  <span className="chip">{b.seat?.seatNumber ?? '—'}</span>
                </td>
                <td>{route}</td>
                <td>
                  <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
                </td>
                <td className="cell--nowrap">{formatDate(b.createdAt)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function Dashboard() {
  const [trips, setTrips] = useState<AvailableTrip[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [tripsState, setTripsState] = useState<AsyncState>('loading')
  const [bookingsState, setBookingsState] = useState<AsyncState>('loading')
  const [tripsError, setTripsError] = useState('')
  const [bookingsError, setBookingsError] = useState('')

  const fetchTrips = useCallback(() => {
    setTripsState('loading')
    getAvailableTrips()
      .then((data) => { setTrips(data); setTripsState('success') })
      .catch((err: Error) => {
        setTripsError(err.message || 'Erro ao carregar viagens.')
        setTripsState('error')
      })
  }, [])

  const fetchBookings = useCallback(() => {
    setBookingsState('loading')
    getAllBookings()
      .then((data) => { setBookings(data); setBookingsState('success') })
      .catch((err: Error) => {
        setBookingsError(err.message || 'Erro ao carregar reservas.')
        setBookingsState('error')
      })
  }, [])

  useEffect(() => { fetchTrips() }, [fetchTrips])
  useEffect(() => { fetchBookings() }, [fetchBookings])

  const isRefreshing = tripsState === 'loading' || bookingsState === 'loading'

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="dash-header__brand">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
            <path d="M13 5v2" />
            <path d="M13 17v2" />
            <path d="M13 11v2" />
          </svg>
          <span>Tickets Booking</span>
        </div>

        <button
          className="btn btn--ghost"
          onClick={() => { fetchTrips(); fetchBookings() }}
          disabled={isRefreshing}
          aria-label="Atualizar dados"
        >
          {isRefreshing ? 'Atualizando…' : 'Atualizar'}
        </button>
      </header>

      <main className="dash-main">

        {/* ── Viagens Disponíveis ── */}
        <section className="dash-section">
          <div className="dash-section__head">
            <h2>Viagens Disponíveis</h2>
            {tripsState === 'success' && (
              <span className="count-badge">{trips.length}</span>
            )}
          </div>

          {tripsState === 'loading' && <Spinner />}
          {tripsState === 'error' && (
            <ErrorBox message={tripsError} onRetry={fetchTrips} />
          )}
          {tripsState === 'success' && (
            trips.length === 0
              ? <EmptyBox message="Nenhuma viagem disponível no momento." />
              : (
                <div className="trips-grid">
                  {trips.map((t) => <TripCard key={t.id} trip={t} />)}
                </div>
              )
          )}
        </section>

        {/* ── Reservas ── */}
        <section className="dash-section">
          <div className="dash-section__head">
            <h2>Reservas</h2>
            {bookingsState === 'success' && (
              <span className="count-badge">{bookings.length}</span>
            )}
          </div>

          {bookingsState === 'loading' && <Spinner />}
          {bookingsState === 'error' && (
            <ErrorBox message={bookingsError} onRetry={fetchBookings} />
          )}
          {bookingsState === 'success' && (
            bookings.length === 0
              ? <EmptyBox message="Nenhuma reserva encontrada." />
              : <BookingsTable bookings={bookings} />
          )}
        </section>

      </main>
    </div>
  )
}
