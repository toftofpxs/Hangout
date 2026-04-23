import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'
import { getEventById } from '../services/eventsService'
import { checkoutEventPayment, getPaymentStatus } from '../services/paymentsService'
import api from '../services/api'

export default function Payment() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [event, setEvent] = useState(null)
  const [paymentStatus, setPaymentStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let mounted = true

    ;(async () => {
      try {
        const [eventData, statusData] = await Promise.all([
          getEventById(id),
          getPaymentStatus(id),
        ])
        if (!mounted) return
        setEvent(eventData)
        setPaymentStatus(statusData)
      } catch (err) {
        console.error(err)
        if (mounted) toast.error('Impossible de charger la page de paiement.')
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [id, toast])

  const submit = async (e) => {
    e.preventDefault()
    try {
      setSubmitting(true)

      let paymentResult = { emailSent: false }
      if (paymentStatus?.requiresPayment && !paymentStatus?.isPaid) {
        paymentResult = await checkoutEventPayment({
          event_id: Number(id),
          confirmPayment: true,
        })
      }

      await api.post('/inscriptions', { event_id: Number(id) })

      if (paymentResult.emailSent) {
        toast.success('Paiement validé et email de confirmation envoyé.')
      } else {
        toast.success('Paiement validé et inscription confirmée.')
      }

      navigate('/dashboard')
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.message || 'Erreur lors du paiement.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6">Chargement...</div>
  if (!event) return <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6">Événement introuvable.</div>

  const price = Number(event.price || 0)
  const submitLabel = paymentStatus?.requiresPayment && !paymentStatus?.isPaid
    ? `Confirmer le paiement de ${price.toFixed(2)} €`
    : 'Finaliser mon inscription'

  return (
    <div className="max-w-5xl mx-auto px-0 sm:px-1 py-4 sm:py-8 grid gap-4 sm:gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="surface-section p-4 sm:p-6">
        <Link to={`/events/${event.id}`} className="text-sm text-slate-600 hover:text-slate-900">
          Retour à l'événement
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold mt-3">Paiement de l'événement</h1>
        <p className="mt-2 text-slate-600">Aucune donnée bancaire n'est stockée dans l'application. La validation ci-dessous confirme simplement le paiement simulé.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="rounded-xl bg-slate-100 p-4 text-sm text-slate-700">
            En confirmant, vous validez le règlement de cet événement et autorisez la création de votre inscription.
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting ? 'Validation en cours...' : submitLabel}
          </button>
        </form>
      </section>

      <aside className="surface-section p-4 sm:p-6">
        <h2 className="text-xl font-semibold">Récapitulatif</h2>
        <div className="mt-4 space-y-3 text-sm text-slate-700">
          <div>
            <p className="font-semibold text-slate-900">Événement</p>
            <p>{event.title}</p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Lieu</p>
            <p>{event.location || 'Non précisé'}</p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Date</p>
            <p>{new Date(event.date).toLocaleString('fr-FR')}</p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Montant</p>
            <p className="text-lg font-bold">{price.toFixed(2)} €</p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Statut</p>
            <p>
              {paymentStatus?.isPaid ? 'Paiement déjà validé' : paymentStatus?.requiresPayment ? 'Paiement en attente' : 'Aucun paiement requis'}
            </p>
          </div>
        </div>
      </aside>
    </div>
  )
}
