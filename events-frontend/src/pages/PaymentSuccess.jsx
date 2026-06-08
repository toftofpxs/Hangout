import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'
import { confirmStripeCheckout, getPaymentStatus } from '../services/paymentsService'

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [isPaid, setIsPaid] = useState(false)

  const eventId = Number(searchParams.get('event_id'))
  const sessionId = String(searchParams.get('session_id') || '').trim()

  useEffect(() => {
    let mounted = true

    ;(async () => {
      if (!eventId) {
        if (mounted) setLoading(false)
        return
      }

      try {
        if (sessionId && eventId) {
          const confirmation = await confirmStripeCheckout({
            sessionId,
            eventId,
          })
          if (confirmation?.confirmed) {
            if (mounted) setIsPaid(true)
            return
          }
        }

        const status = await getPaymentStatus(eventId)
        if (!mounted) return
        setIsPaid(Boolean(status?.isPaid))
      } catch (err) {
        console.error(err)
        const paymentPending = err?.response?.status === 409
        if (mounted) {
          setIsPaid(false)
          if (!paymentPending) {
            toast.error("Impossible de verifier l'etat du paiement.")
          }
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [eventId, sessionId, toast])

  if (loading) {
    return <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6">Verification du paiement...</div>
  }

  return (
    <div className="max-w-3xl mx-auto surface-section p-4 sm:p-6 text-center">
      <h1 className="text-2xl sm:text-3xl font-bold">Paiement termine</h1>
      <p className="mt-3 text-slate-700">
        {isPaid
          ? "Paiement confirme. Votre inscription est finalisee."
          : "Paiement en cours de confirmation. Rechargez cette page dans quelques secondes."}
      </p>

      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
        <Link to="/dashboard" className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 justify-center">
          Aller au dashboard
        </Link>
        {eventId > 0 && (
          <Link to={`/events/${eventId}`} className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-black justify-center">
            Retour a l'evenement
          </Link>
        )}
      </div>
    </div>
  )
}
