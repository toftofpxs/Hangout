import React, { useContext, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AuthContext } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { getEventById } from '../services/eventsService'
import { checkoutEventPayment, getPaymentStatus } from '../services/paymentsService'
import api from '../services/api'

export default function Payment() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useContext(AuthContext)
  const toast = useToast()

  const [event, setEvent] = useState(null)
  const [paymentStatus, setPaymentStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    cardholder_name: user?.name || '',
    card_number: '4242 4242 4242 4242',
    expiry: '12/30',
    cvc: '123',
  })

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
        if (mounted) toast.error("Impossible de charger la page de paiement.")
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [id, toast])

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const submit = async (e) => {
    e.preventDefault()
    try {
      setSubmitting(true)

      let paymentResult = { emailSent: false }
      if (paymentStatus?.requiresPayment && !paymentStatus?.isPaid) {
        paymentResult = await checkoutEventPayment({
          event_id: Number(id),
          cardholder_name: form.cardholder_name,
          card_number: form.card_number,
          expiry: form.expiry,
          cvc: form.cvc,
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
    ? `Payer ${price.toFixed(2)} €`
    : 'Finaliser mon inscription'

  return (
    <div className="max-w-5xl mx-auto px-0 sm:px-1 py-4 sm:py-8 grid gap-4 sm:gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="surface-section p-4 sm:p-6">
        <Link to={`/events/${event.id}`} className="text-sm text-slate-600 hover:text-slate-900">
          Retour à l'événement
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold mt-3">Paiement de l'événement</h1>
        <p className="mt-2 text-slate-600">Complète ce formulaire de paiement pour finaliser ton inscription.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nom du porteur</label>
            <input
              value={form.cardholder_name}
              onChange={(e) => updateField('cardholder_name', e.target.value)}
              className="w-full border p-3 rounded-lg"
              placeholder="Jean Dupont"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Numéro de carte</label>
            <input
              value={form.card_number}
              onChange={(e) => updateField('card_number', e.target.value)}
              className="w-full border p-3 rounded-lg tracking-[0.12em] sm:tracking-[0.25em]"
              placeholder="4242 4242 4242 4242"
              inputMode="numeric"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Expiration</label>
              <input
                value={form.expiry}
                onChange={(e) => updateField('expiry', e.target.value)}
                className="w-full border p-3 rounded-lg"
                placeholder="12/30"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">CVC</label>
              <input
                value={form.cvc}
                onChange={(e) => updateField('cvc', e.target.value)}
                className="w-full border p-3 rounded-lg"
                placeholder="123"
                inputMode="numeric"
                required
              />
            </div>
          </div>

          <div className="rounded-xl bg-slate-100 p-4 text-sm text-slate-700">
            Une confirmation de paiement sera enregistrée. Si SMTP est configuré côté backend, un email de confirmation sera envoyé à {user?.email || 'votre adresse'}.
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
