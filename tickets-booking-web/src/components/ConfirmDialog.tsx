import { useEffect } from 'react'
import './ConfirmDialog.css'

interface ConfirmDialogProps {
  title: string
  description: string
  detail?: string
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  description,
  detail,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel, loading])

  return (
    <div
      className="cd-overlay"
      onClick={e => { if (e.target === e.currentTarget && !loading) onCancel() }}
    >
      <div
        className="cd-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cd-title"
        aria-describedby="cd-desc"
      >
        <div className="cd-icon" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <h3 id="cd-title" className="cd-title">{title}</h3>
        <p id="cd-desc" className="cd-description">{description}</p>
        {detail && <p className="cd-detail">{detail}</p>}

        <div className="cd-actions">
          <button
            className="btn btn--ghost"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            className="btn btn--danger"
            onClick={onConfirm}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? (
              <span className="cd-loading-row">
                <span className="cd-spinner" aria-hidden="true" />
                Cancelando…
              </span>
            ) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
