import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const pushToast = useCallback((message, type = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    setToasts((prev) => [...prev, { id, message, type }])
    window.setTimeout(() => removeToast(id), 3500)
  }, [removeToast])

  const success = useCallback((message) => pushToast(message, 'success'), [pushToast])
  const error = useCallback((message) => pushToast(message, 'error'), [pushToast])
  const info = useCallback((message) => pushToast(message, 'info'), [pushToast])

  const value = useMemo(() => ({ success, error, info }), [success, error, info])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-3 right-3 left-3 sm:top-4 sm:right-4 sm:left-auto z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`w-full sm:min-w-64 sm:max-w-80 px-4 py-3 rounded shadow-lg text-white pointer-events-auto ${getToastClassName(toast.type)}`}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm leading-snug">{toast.message}</p>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-white/90 hover:text-white text-base leading-none"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}

function getToastClassName(type) {
  if (type === 'success') return 'bg-emerald-600'
  if (type === 'error') return 'bg-red-600'
  return 'bg-gray-900'
}
