import { useCallback, useEffect, useState } from 'react'
import { deleteBooking, getAllBookings, getAvailableTrips } from '../api'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EditPassengerModal } from '../components/EditPassengerModal'
import { SeatMapModal } from '../components/SeatMapModal'
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
      <button className="btn btn--ghost" onClick={onRetry}>Tentar novamente</button>
    </div>
  )
}

function EmptyBox({ message }: { message: string }) {
  return <div className="state-box state-box--empty"><p>{message}</p></div>
}

// ─── Trip Card ────────────────────────────────────────────────────────────────

const MAX_SEAT_CHIPS = 5

interface TripCardProps {
  trip: AvailableTrip
  onSelect: () => void
}

function TripCard({ trip, onSelect }: TripCardProps) {
  const visible = trip.availableSeats.slice(0, MAX_SEAT_CHIPS)
  const extra = trip.availableSeats.length - MAX_SEAT_CHIPS
  const hasSeats = trip.availableSeats.length > 0

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
          {hasSeats
            ? `${trip.availableSeats.length} poltrona${trip.availableSeats.length > 1 ? 's' : ''} disponível${trip.availableSeats.length > 1 ? 'eis' : ''}`
            : 'Sem poltronas disponíveis'}
        </span>
        {hasSeats && (
          <div className="trip-card__chips">
            {visible.map((s) => <span key={s} className="chip">{s}</span>)}
            {extra > 0 && <span className="chip chip--more">+{extra}</span>}
          </div>
        )}
      </div>

      <button
        className="btn btn--primary trip-card__cta"
        onClick={onSelect}
        disabled={!hasSeats}
        aria-label={`Selecionar poltrona para ${trip.origin} → ${trip.destination}`}
      >
        {hasSeats ? 'Selecionar Poltrona' : 'Esgotado'}
      </button>
    </article>
  )
}

// ─── Bookings Table ───────────────────────────────────────────────────────────

interface BookingsTableProps {
  bookings: Booking[]
  onEdit: (booking: Booking) => void
  onCancelRequest: (booking: Booking) => void
  processingId: string | null
}

function BookingsTable({ bookings, onEdit, onCancelRequest, processingId }: BookingsTableProps) {
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
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => {
            const cfg = STATUS_CONFIG[b.status]
            const route = b.trip
              ? `${b.trip.departurePlace} → ${b.trip.arrivalPlace}`
              : '—'
            const isCanceled  = b.status === BookingStatus.Canceled
            const isProcessing = processingId === b.id

            return (
              <tr key={b.id} className={isCanceled ? 'row--canceled' : undefined}>
                <td>{b.passengerName}</td>
                <td className="cell--mono">{b.passengerDocument}</td>
                <td><span className="chip">{b.seat?.seatNumber ?? '—'}</span></td>
                <td>{route}</td>
                <td><span className={`badge ${cfg.cls}`}>{cfg.label}</span></td>
                <td className="cell--nowrap">{formatDate(b.createdAt)}</td>
                <td className="actions-cell">
                  {!isCanceled && (
                    <div className="action-btns">
                      <button
                        className="btn btn--action btn--action-edit"
                        onClick={() => onEdit(b)}
                        disabled={isProcessing}
                        aria-label={`Editar passageiro ${b.passengerName}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Editar
                      </button>
                      <button
                        className="btn btn--action btn--action-cancel"
                        onClick={() => onCancelRequest(b)}
                        disabled={isProcessing}
                        aria-label={`Cancelar reserva de ${b.passengerName}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="15" y1="9" x2="9" y2="15" />
                          <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                        {isProcessing ? '…' : 'Cancelar'}
                      </button>
                    </div>
                  )}
                </td>
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

  // Modal state
  const [selectedTrip, setSelectedTrip]     = useState<AvailableTrip | null>(null)
  const [editingBooking, setEditingBooking]  = useState<Booking | null>(null)
  const [cancelTarget, setCancelTarget]      = useState<Booking | null>(null)
  const [deletingId, setDeletingId]          = useState<string | null>(null)

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

  // Seat map → new booking created
  function handleBookingCreated() {
    fetchTrips()
    fetchBookings()
  }

  // Edit modal → saved successfully
  function handleEditSaved() {
    fetchBookings()
  }

  // Confirm dialog → confirm cancellation
  async function handleConfirmCancel() {
    if (!cancelTarget) return
    setDeletingId(cancelTarget.id)
    try {
      await deleteBooking(cancelTarget.id)
      setCancelTarget(null)
      fetchTrips()    // libera assento → atualiza contagem
      fetchBookings()
    } catch {
      // manter diálogo aberto em caso de erro não é crítico aqui,
      // mas fechar é aceitável — o refetch vai mostrar o estado real
      setCancelTarget(null)
    } finally {
      setDeletingId(null)
    }
  }

  const isRefreshing = tripsState === 'loading' || bookingsState === 'loading'

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="dash-header__brand">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
            <path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" />
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
            {tripsState === 'success' && <span className="count-badge">{trips.length}</span>}
          </div>

          {tripsState === 'loading' && <Spinner />}
          {tripsState === 'error'   && <ErrorBox message={tripsError} onRetry={fetchTrips} />}
          {tripsState === 'success' && (
            trips.length === 0
              ? <EmptyBox message="Nenhuma viagem disponível no momento." />
              : (
                <div className="trips-grid">
                  {trips.map((t) => (
                    <TripCard key={t.id} trip={t} onSelect={() => setSelectedTrip(t)} />
                  ))}
                </div>
              )
          )}
        </section>

        {/* ── Reservas ── */}
        <section className="dash-section">
          <div className="dash-section__head">
            <h2>Reservas</h2>
            {bookingsState === 'success' && <span className="count-badge">{bookings.length}</span>}
          </div>

          {bookingsState === 'loading' && <Spinner />}
          {bookingsState === 'error'   && <ErrorBox message={bookingsError} onRetry={fetchBookings} />}
          {bookingsState === 'success' && (
            bookings.length === 0
              ? <EmptyBox message="Nenhuma reserva encontrada." />
              : (
                <BookingsTable
                  bookings={bookings}
                  onEdit={(b) => setEditingBooking(b)}
                  onCancelRequest={(b) => setCancelTarget(b)}
                  processingId={deletingId}
                />
              )
          )}
        </section>

      </main>

      {/* ── Seat Map Modal ── */}
      {selectedTrip && (
        <SeatMapModal
          trip={selectedTrip}
          bookings={bookings}
          onClose={() => setSelectedTrip(null)}
          onBookingCreated={handleBookingCreated}
        />
      )}

      {/* ── Edit Passenger Modal ── */}
      {editingBooking && (
        <EditPassengerModal
          booking={editingBooking}
          onClose={() => setEditingBooking(null)}
          onSaved={handleEditSaved}
        />
      )}

      {/* ── Cancel Confirm Dialog ── */}
      {cancelTarget && (
        <ConfirmDialog
          title="Cancelar Reserva"
          description={`Deseja cancelar a reserva de ${cancelTarget.passengerName}? A poltrona será liberada imediatamente.`}
          detail={
            [
              cancelTarget.seat?.seatNumber && `Poltrona ${cancelTarget.seat.seatNumber}`,
              cancelTarget.trip && `${cancelTarget.trip.departurePlace} → ${cancelTarget.trip.arrivalPlace}`,
            ]
              .filter(Boolean)
              .join('  ·  ') || undefined
          }
          confirmLabel="Sim, cancelar reserva"
          cancelLabel="Manter reserva"
          loading={deletingId === cancelTarget.id}
          onConfirm={handleConfirmCancel}
          onCancel={() => setCancelTarget(null)}
        />
      )}
    </div>
  )
}
