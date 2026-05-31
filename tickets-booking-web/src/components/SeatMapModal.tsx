import { useCallback, useEffect, useRef, useState } from 'react'
import { createBooking, getAvailableTrips } from '../api'
import type { AvailableTrip, Booking } from '../types'
import './SeatMapModal.css'

// ─── Formatting ───────────────────────────────────────────────────────────────

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(iso)
  )

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

// ─── Seat Grid Types ──────────────────────────────────────────────────────────

interface ParsedSeat {
  seatNumber: string
  row: number
  col: string
  isAvailable: boolean
}

interface SeatRow {
  rowLabel: number
  left: ParsedSeat[]
  right: ParsedSeat[]
}

// ─── Grid Logic ───────────────────────────────────────────────────────────────

function parseSeat(sn: string, isAvailable: boolean): ParsedSeat {
  const m = sn.match(/^(\d+)([A-Ea-e]?)$/)
  if (m) {
    return { seatNumber: sn, row: parseInt(m[1], 10), col: m[2].toUpperCase(), isAvailable }
  }
  return { seatNumber: sn, row: 0, col: sn, isAvailable }
}

function buildSeatRows(available: string[], occupied: string[]): SeatRow[] {
  const occupiedUniq = occupied.filter(sn => !available.includes(sn))
  const allSeats = [
    ...available.map(sn => parseSeat(sn, true)),
    ...occupiedUniq.map(sn => parseSeat(sn, false)),
  ]

  const hasColumns = allSeats.some(s => /^[A-E]$/.test(s.col))
  const LEFT_COLS = new Set(['A', 'B'])

  if (hasColumns) {
    const rowMap = new Map<number, ParsedSeat[]>()
    for (const seat of allSeats) {
      if (!rowMap.has(seat.row)) rowMap.set(seat.row, [])
      rowMap.get(seat.row)!.push(seat)
    }
    return [...rowMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([rowNum, seats]) => {
        const sorted = [...seats].sort((a, b) => a.col.localeCompare(b.col))
        return {
          rowLabel: rowNum,
          left: sorted.filter(s => LEFT_COLS.has(s.col)),
          right: sorted.filter(s => !LEFT_COLS.has(s.col)),
        }
      })
  }

  // Numeric-only: sort and group 4 per visual row
  const sorted = [...allSeats].sort((a, b) => a.row - b.row)
  return sorted.reduce<SeatRow[]>((rows, seat, i) => {
    const rowIdx = Math.floor(i / 4)
    if (!rows[rowIdx]) rows[rowIdx] = { rowLabel: rowIdx + 1, left: [], right: [] }
    if (i % 4 < 2) rows[rowIdx].left.push(seat)
    else rows[rowIdx].right.push(seat)
    return rows
  }, [])
}

// ─── SeatButton ───────────────────────────────────────────────────────────────

interface SeatButtonProps {
  seat: ParsedSeat
  selected: boolean
  onClick: () => void
}

function SeatButton({ seat, selected, onClick }: SeatButtonProps) {
  const cls = [
    'seat-btn',
    !seat.isAvailable
      ? 'seat-btn--occupied'
      : selected
        ? 'seat-btn--selected'
        : 'seat-btn--available',
  ].join(' ')

  return (
    <button
      className={cls}
      onClick={onClick}
      disabled={!seat.isAvailable}
      aria-label={`Poltrona ${seat.seatNumber} — ${seat.isAvailable ? 'disponível' : 'ocupada'}`}
      aria-pressed={selected}
    >
      {seat.seatNumber}
    </button>
  )
}

// ─── SeatMapModal ─────────────────────────────────────────────────────────────

export interface SeatMapModalProps {
  trip: AvailableTrip
  bookings: Booking[]
  onClose: () => void
  onBookingCreated: () => void
}

export function SeatMapModal({ trip, bookings, onClose, onBookingCreated }: SeatMapModalProps) {
  const [availableSeats, setAvailableSeats] = useState<string[]>(trip.availableSeats)
  const [fetchState, setFetchState] = useState<'loading' | 'done'>('loading')

  const [selectedSeat, setSelectedSeat] = useState<string | null>(null)
  const [passengerName, setPassengerName] = useState('')
  const [passengerDocument, setPassengerDocument] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const dialogRef = useRef<HTMLDivElement>(null)

  // Re-fetch fresh seat state when modal opens
  useEffect(() => {
    getAvailableTrips()
      .then(trips => {
        const fresh = trips.find(t => t.id === trip.id)
        setAvailableSeats(fresh?.availableSeats ?? [])
      })
      .catch(() => { /* keep prop value as fallback */ })
      .finally(() => setFetchState('done'))
  }, [trip.id])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Move focus into dialog on mount
  useEffect(() => { dialogRef.current?.focus() }, [])

  // Derive occupied seats from bookings already loaded in Dashboard
  const occupiedSeats = bookings
    .filter(b => b.tripId === trip.id)
    .map(b => b.seat?.seatNumber)
    .filter((sn): sn is string => Boolean(sn))

  const seatRows = buildSeatRows(availableSeats, occupiedSeats)

  const handleSeatClick = useCallback((sn: string) => {
    setSelectedSeat(sn)
    setSubmitError('')
    setSubmitSuccess(false)
  }, [])

  async function handleConfirm() {
    if (!selectedSeat || !passengerName.trim() || !passengerDocument.trim()) return

    setSubmitting(true)
    setSubmitError('')

    try {
      await createBooking({
        tripId: trip.id,
        seatNumber: selectedSeat,
        passengerName: passengerName.trim(),
        passengerDocument: passengerDocument.trim(),
        price: trip.price,
      })
      setSubmitSuccess(true)
      setTimeout(() => {
        onBookingCreated()
        onClose()
      }, 1800)
    } catch (err: unknown) {
      const status = (err as { response?: { status: number } }).response?.status
      if (status === 409) {
        setSubmitError('Esta poltrona acabou de ser reservada. Por favor, escolha outra.')
        setSelectedSeat(null)
      } else if (status === 400) {
        setSubmitError('Dados inválidos. Verifique as informações e tente novamente.')
      } else {
        setSubmitError((err as Error).message || 'Erro ao confirmar a reserva. Tente novamente.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = Boolean(selectedSeat && passengerName.trim() && passengerDocument.trim())

  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Mapa de poltronas — ${trip.origin} para ${trip.destination}`}
        tabIndex={-1}
        ref={dialogRef}
      >
        {/* ── Header ── */}
        <div className="modal-header">
          <div className="modal-header__info">
            <div className="modal-header__route">
              <span>{trip.origin}</span>
              <span className="modal-header__arrow" aria-hidden="true">→</span>
              <span>{trip.destination}</span>
            </div>
            <p className="modal-header__meta">
              {formatDate(trip.departureTime)} · {formatCurrency(trip.price)} por poltrona
            </p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="modal-body">
          {fetchState === 'loading' ? (
            <div className="modal-spinner-wrap">
              <div className="spinner" role="status" aria-label="Carregando poltronas..." />
            </div>
          ) : (
            <div className="modal-content">

              {/* Seat Map */}
              <div className="seatmap">
                <div className="seatmap__legend" aria-label="Legenda">
                  <span className="seatmap__legend-item">
                    <span className="seatmap__dot seatmap__dot--available" aria-hidden="true" />
                    Disponível
                  </span>
                  <span className="seatmap__legend-item">
                    <span className="seatmap__dot seatmap__dot--selected" aria-hidden="true" />
                    Selecionada
                  </span>
                  <span className="seatmap__legend-item">
                    <span className="seatmap__dot seatmap__dot--occupied" aria-hidden="true" />
                    Ocupada
                  </span>
                </div>

                <div className="seatmap__vehicle" role="region" aria-label="Mapa de poltronas do veículo">
                  <div className="seatmap__front" aria-hidden="true">
                    ⊟ Motorista
                  </div>

                  {seatRows.length === 0 ? (
                    <p className="seatmap__empty">Nenhuma poltrona disponível para esta viagem.</p>
                  ) : (
                    <div className="seatmap__rows">
                      {seatRows.map(row => (
                        <div key={row.rowLabel} className="seat-row">
                          <span className="seat-row__label" aria-hidden="true">{row.rowLabel}</span>
                          <div className="seat-row__side">
                            {row.left.map(seat => (
                              <SeatButton
                                key={seat.seatNumber}
                                seat={seat}
                                selected={selectedSeat === seat.seatNumber}
                                onClick={() => handleSeatClick(seat.seatNumber)}
                              />
                            ))}
                          </div>
                          <div className="seat-row__aisle" aria-hidden="true" />
                          <div className="seat-row__side">
                            {row.right.map(seat => (
                              <SeatButton
                                key={seat.seatNumber}
                                seat={seat}
                                selected={selectedSeat === seat.seatNumber}
                                onClick={() => handleSeatClick(seat.seatNumber)}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Booking Form — appears when a seat is selected */}
              {selectedSeat && (
                <div className="booking-form" role="region" aria-label="Formulário de reserva">
                  <div className="booking-form__header">
                    <h3>
                      Poltrona{' '}
                      <span className="booking-form__seat-chip">{selectedSeat}</span>{' '}
                      selecionada
                    </h3>
                    <button
                      className="btn-link"
                      onClick={() => setSelectedSeat(null)}
                      disabled={submitting || submitSuccess}
                    >
                      Trocar poltrona
                    </button>
                  </div>

                  <div className="form-fields">
                    <label className="form-label">
                      Nome do Passageiro
                      <input
                        className="form-input"
                        type="text"
                        value={passengerName}
                        onChange={e => setPassengerName(e.target.value)}
                        placeholder="Nome completo"
                        disabled={submitting || submitSuccess}
                        autoFocus
                      />
                    </label>
                    <label className="form-label">
                      Documento (CPF / RG)
                      <input
                        className="form-input"
                        type="text"
                        value={passengerDocument}
                        onChange={e => setPassengerDocument(e.target.value)}
                        placeholder="000.000.000-00"
                        disabled={submitting || submitSuccess}
                      />
                    </label>
                  </div>

                  {submitError && (
                    <p className="form-message form-message--error" role="alert">{submitError}</p>
                  )}
                  {submitSuccess && (
                    <p className="form-message form-message--success" role="status">
                      ✓ Reserva enviada! Aguardando confirmação do pagamento...
                    </p>
                  )}

                  <button
                    className="btn btn--primary booking-form__submit"
                    onClick={handleConfirm}
                    disabled={!canSubmit || submitting || submitSuccess}
                  >
                    {submitting ? 'Enviando reserva…' : 'Confirmar Reserva'}
                  </button>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  )
}
