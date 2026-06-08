import React from 'react'
import { Link, useSearchParams } from 'react-router-dom'

export default function PaymentCancel() {
  const [searchParams] = useSearchParams()
  const eventId = Number(searchParams.get('event_id'))

  return (
    <div className="max-w-3xl mx-auto surface-section p-4 sm:p-6 text-center">
      <h1 className="text-2xl sm:text-3xl font-bold">Paiement annule</h1>
      <p className="mt-3 text-slate-700">
        Aucun paiement n'a ete valide. Vous pouvez reprendre plus tard si vous le souhaitez.
      </p>

      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
        {eventId > 0 ? (
          <Link to={`/payments/event/${eventId}`} className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 justify-center">
            Reessayer le paiement
          </Link>
        ) : (
          <Link to="/" className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 justify-center">
            Retour a l'accueil
          </Link>
        )}
        {eventId > 0 && (
          <Link to={`/events/${eventId}`} className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-black justify-center">
            Retour a l'evenement
          </Link>
        )}
      </div>
    </div>
  )
}
