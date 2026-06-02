import { useCallback, useEffect, useState } from 'react'
import { getAllBookings, getAvailableTrips } from '../api'
import { SeatMapModal } from '../components/SeatMapModal'
import type { AvailableTrip, Booking } from '../types'
import './TripsPage.css'

// ─── Formatting ───────────────────────────────────────────────────────────────

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(iso)
  )

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

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
  const visible  = trip.availableSeats.slice(0, MAX_SEAT_CHIPS)
  const extra    = trip.availableSeats.length - MAX_SEAT_CHIPS
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

// ─── TripsPage ────────────────────────────────────────────────────────────────

export function TripsPage() {
  const [trips, setTrips]       = useState<AvailableTrip[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [state, setState]       = useState<AsyncState>('loading')
  const [error, setError]       = useState('')
  const [selectedTrip, setSelectedTrip] = useState<AvailableTrip | null>(null)

  const fetchData = useCallback(() => {
    setState('loading')
    Promise.all([getAvailableTrips(), getAllBookings()])
      .then(([tripsData, bookingsData]) => {
        setTrips(tripsData)
        setBookings(bookingsData)
        setState('success')
      })
      .catch((err: Error) => {
        setError(err.message || 'Erro ao carregar viagens.')
        setState('error')
      })
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div className="trips-page">
      <main className="trips-main">
        <section>
          <div className="dash-section__head">
            <h2>Viagens Disponíveis</h2>
            {state === 'success' && <span className="count-badge">{trips.length}</span>}
            <button
              className="btn btn--ghost trips-page__refresh"
              onClick={fetchData}
              disabled={state === 'loading'}
              aria-label="Atualizar viagens"
            >
              {state === 'loading' ? 'Atualizando…' : 'Atualizar'}
            </button>
          </div>

          {state === 'loading' && <Spinner />}
          {state === 'error'   && <ErrorBox message={error} onRetry={fetchData} />}
          {state === 'success' && (
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
      </main>

      {selectedTrip && (
        <SeatMapModal
          trip={selectedTrip}
          bookings={bookings}
          onClose={() => setSelectedTrip(null)}
          onBookingCreated={fetchData}
        />
      )}
    </div>
  )
}
