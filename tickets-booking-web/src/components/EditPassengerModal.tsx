import { useEffect, useRef, useState } from 'react'
import { updateBooking } from '../api'
import type { Booking, UpdateBookingRequest } from '../types'
import './EditPassengerModal.css'

interface EditPassengerModalProps {
  booking: Booking
  onClose: () => void
  onSaved: () => void
}

export function EditPassengerModal({ booking, onClose, onSaved }: EditPassengerModalProps) {
  const [name, setName] = useState(booking.passengerName)
  const [document, setDocument] = useState(booking.passengerDocument)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const firstInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { firstInputRef.current?.focus() }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, saving])

  const nameChanged = name.trim() !== booking.passengerName
  const docChanged  = document.trim() !== booking.passengerDocument
  const hasChanges  = nameChanged || docChanged
  const canSave     = hasChanges && name.trim().length > 0 && document.trim().length > 0

  async function handleSave() {
    if (!canSave || saving) return
    setSaving(true)
    setError('')

    const payload: UpdateBookingRequest = {
      passengerName: name.trim(),
      passengerDocument: document.trim(),
    }

    try {
      await updateBooking(booking.id, payload)
      onSaved()
      onClose()
    } catch (err: unknown) {
      const status = (err as { response?: { status: number } }).response?.status
      if (status === 404) {
        setError('Reserva não encontrada. Pode ter sido cancelada por outro processo.')
      } else if (status === 400) {
        setError('Dados inválidos. Verifique as informações e tente novamente.')
      } else {
        setError((err as Error).message || 'Erro ao atualizar a reserva.')
      }
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && canSave && !saving) handleSave()
  }

  const seatLabel  = booking.seat?.seatNumber ?? '—'
  const routeLabel = booking.trip
    ? `${booking.trip.departurePlace} → ${booking.trip.arrivalPlace}`
    : null

  return (
    <div
      className="ep-overlay"
      onClick={e => { if (e.target === e.currentTarget && !saving) onClose() }}
    >
      <div
        className="ep-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Editar dados do passageiro"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="ep-header">
          <div>
            <h2 className="ep-title">Editar Passageiro</h2>
            <p className="ep-subtitle">
              Poltrona <strong>{seatLabel}</strong>
              {routeLabel && <> · {routeLabel}</>}
            </p>
          </div>
          <button
            className="ep-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Fechar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="ep-body">
          <div className="ep-fields">
            <label className="ep-label">
              Nome do Passageiro
              <input
                ref={firstInputRef}
                className="ep-input"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nome completo"
                disabled={saving}
              />
            </label>
            <label className="ep-label">
              Documento (CPF / RG)
              <input
                className="ep-input"
                type="text"
                value={document}
                onChange={e => setDocument(e.target.value)}
                placeholder="000.000.000-00"
                disabled={saving}
              />
            </label>
          </div>

          {error && (
            <p className="ep-message ep-message--error" role="alert">{error}</p>
          )}

          <div className="ep-actions">
            <button
              className="btn btn--ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              className="btn btn--primary"
              onClick={handleSave}
              disabled={!canSave || saving}
            >
              {saving ? 'Salvando…' : 'Salvar Alterações'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
