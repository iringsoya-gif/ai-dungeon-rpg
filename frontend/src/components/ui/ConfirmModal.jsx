import { useEffect, useRef } from 'react'

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = '확인',
  cancelLabel  = '취소',
  onConfirm,
  onCancel,
  danger       = false,
  alertOnly    = false,
}) {
  const btnRef = useRef(null)

  useEffect(() => {
    if (open) btnRef.current?.focus()
  }, [open])

  if (!open) return null

  return (
    <div
      onClick={alertOnly ? onConfirm : onCancel}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200, padding: '1rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#111120', border: '1px solid #2a2a40',
          borderRadius: '1rem', padding: '1.5rem',
          maxWidth: '22rem', width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 40px rgba(157,127,232,0.04)',
        }}
      >
        {title && (
          <h3 style={{ fontWeight: 700, color: '#e8e4f8', fontSize: '1rem', marginBottom: '0.5rem' }}>
            {title}
          </h3>
        )}
        {message && (
          <p style={{ color: '#8a8a9a', fontSize: '0.875rem', lineHeight: 1.65, marginBottom: '1.5rem' }}>
            {message}
          </p>
        )}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          {!alertOnly && (
            <button
              onClick={onCancel}
              style={{
                padding: '0.5rem 1.1rem', background: 'transparent',
                color: '#6a6a80', border: '1px solid #2a2a40',
                borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.85rem',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#a0a0b8'}
              onMouseLeave={e => e.currentTarget.style.color = '#6a6a80'}
            >
              {cancelLabel}
            </button>
          )}
          <button
            ref={btnRef}
            onClick={onConfirm}
            style={{
              padding: '0.5rem 1.1rem',
              background: danger ? 'rgba(239,68,68,0.12)' : 'rgba(157,127,232,0.12)',
              color: danger ? '#ef4444' : '#9d7fe8',
              border: `1px solid ${danger ? 'rgba(239,68,68,0.3)' : 'rgba(157,127,232,0.3)'}`,
              borderRadius: '0.5rem', cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: 600,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.2)' : 'rgba(157,127,232,0.22)'}
            onMouseLeave={e => e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.12)' : 'rgba(157,127,232,0.12)'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
