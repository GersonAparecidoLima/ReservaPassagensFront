import { useCallback, useEffect, useState } from 'react'
import { deleteBooking, getAllBookings } from '../api'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EditPassengerModal } from '../components/EditPassengerModal'
import { BookingStatus } from '../types'
import type { Booking } from '../types'
import './Dashboard.css'

// ─── Formatting ───────────────────────────────────────────────────────────────

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(iso)
  )

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
            const isCanceled   = b.status === BookingStatus.Canceled
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
  const [bookings, setBookings]           = useState<Booking[]>([])
  const [bookingsState, setBookingsState] = useState<AsyncState>('loading')
  const [bookingsError, setBookingsError] = useState('')
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)
  const [cancelTarget, setCancelTarget]     = useState<Booking | null>(null)
  const [deletingId, setDeletingId]         = useState<string | null>(null)

  const fetchBookings = useCallback(() => {
    setBookingsState('loading')
    getAllBookings()
      .then((data) => { setBookings(data); setBookingsState('success') })
      .catch((err: Error) => {
        setBookingsError(err.message || 'Erro ao carregar reservas.')
        setBookingsState('error')
      })
  }, [])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  function handleEditSaved() {
    fetchBookings()
  }

  async function handleConfirmCancel() {
    if (!cancelTarget) return
    const targetId = cancelTarget.id
    setDeletingId(targetId)
    try {
      await deleteBooking(targetId)
      // Remove imediatamente do estado local (HTTP 204 recebido) antes do re-fetch
      setBookings(prev => prev.filter(b => b.id !== targetId))
      setCancelTarget(null)
      fetchBookings()
    } catch {
      setCancelTarget(null)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="dashboard">
      <main className="dash-main">
        <section>
          <div className="dash-section__head">
            <h2>Reservas</h2>
            {bookingsState === 'success' && (
              <span className="count-badge">{bookings.length}</span>
            )}
            <button
              className="btn btn--ghost dash-refresh"
              onClick={fetchBookings}
              disabled={bookingsState === 'loading'}
              aria-label="Atualizar reservas"
            >
              {bookingsState === 'loading' ? 'Atualizando…' : 'Atualizar'}
            </button>
          </div>

          {bookingsState === 'loading' && <Spinner />}
          {bookingsState === 'error'   && (
            <ErrorBox message={bookingsError} onRetry={fetchBookings} />
          )}
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

      {editingBooking && (
        <EditPassengerModal
          booking={editingBooking}
          onClose={() => setEditingBooking(null)}
          onSaved={handleEditSaved}
        />
      )}

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
