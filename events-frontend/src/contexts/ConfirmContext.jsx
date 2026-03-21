import React, { createContext, useContext, useMemo, useState } from 'react'

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({
    open: false,
    title: '',
    message: '',
    confirmText: 'Confirmer',
    cancelText: 'Annuler',
    danger: false,
    resolver: null,
  })

  const confirm = (options) => {
    return new Promise((resolve) => {
      setState({
        open: true,
        title: options?.title || 'Confirmation',
        message: options?.message || 'Voulez-vous continuer ?',
        confirmText: options?.confirmText || 'Confirmer',
        cancelText: options?.cancelText || 'Annuler',
        danger: Boolean(options?.danger),
        resolver: resolve,
      })
    })
  }

  const close = (value) => {
    if (state.resolver) state.resolver(value)
    setState((prev) => ({ ...prev, open: false, resolver: null }))
  }

  const value = useMemo(() => ({ confirm }), [])

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {state.open && (
        <div className="fixed inset-0 z-[110] bg-black/45 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-5">
            <h3 className="text-lg font-semibold mb-2">{state.title}</h3>
            <p className="text-sm text-gray-700 mb-5">{state.message}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => close(false)}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
              >
                {state.cancelText}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className={`px-4 py-2 rounded text-white ${state.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {state.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    throw new Error('useConfirm must be used within ConfirmProvider')
  }
  return ctx.confirm
}
