import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import { useToast } from '../contexts/ToastContext'
import { createBulkInscriptions } from '../services/inscriptionsService'
import { checkoutCartPayment, getPaymentStatus } from '../services/paymentsService'

export default function CartPayment() {
  const navigate = useNavigate()
  const { items, removeManyFromCart, clearCart } = useCart()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [statuses, setStatuses] = useState({})

  useEffect(() => {
    let mounted = true

    ;(async () => {
      if (!items.length) {
        setLoading(false)
        return
      }

      try {
        const entries = await Promise.all(
          items.map(async (item) => {
            const status = await getPaymentStatus(item.id)
            return [item.id, status]
          })
        )

        if (!mounted) return
        setStatuses(Object.fromEntries(entries))
      } catch (err) {
        console.error(err)
        if (mounted) toast.error('Impossible de charger les statuts de paiement du panier.')
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [items, toast])

  const payableItems = useMemo(
    () => items.filter((item) => statuses[item.id]?.requiresPayment && !statuses[item.id]?.isPaid),
    [items, statuses]
  )

  const totalDue = useMemo(
    () => payableItems.reduce((sum, item) => sum + Number(statuses[item.id]?.amount ?? item.price ?? 0), 0),
    [payableItems, statuses]
  )

  const submit = async (e) => {
    e.preventDefault()
    try {
      setSubmitting(true)

      let paymentResult = { emailSent: false }
      if (payableItems.length > 0) {
        paymentResult = await checkoutCartPayment({
          event_ids: payableItems.map((item) => item.id),
          confirmPayment: true,
        })
      }

      const inscriptionResult = await createBulkInscriptions(items.map((item) => item.id))
      const processedIds = [
        ...inscriptionResult.registered.map((item) => item.event_id),
        ...inscriptionResult.alreadyRegistered.map((item) => item.event_id),
      ]

      if (processedIds.length) {
        removeManyFromCart(processedIds)
      }

      if (!inscriptionResult.failed.length) {
        clearCart()
      }

      if (paymentResult.emailSent) {
        toast.success('Paiement du panier validé et email de confirmation envoyé.')
      } else if (inscriptionResult.registered.length > 0 || inscriptionResult.alreadyRegistered.length > 0) {
        toast.success('Panier validé et inscriptions finalisées.')
      }

      if (inscriptionResult.failed.length > 0) {
        const failedTitles = inscriptionResult.failed.map((item) => item.event_id).join(', ')
        toast.info(`Certains événements n'ont pas pu être finalisés: ${failedTitles}`)
      }

      navigate('/dashboard')
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.message || 'Erreur lors du paiement du panier.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6">Chargement...</div>

  if (!items.length) {
    return (
      <div className="max-w-3xl mx-auto surface-section p-4 sm:p-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold">Paiement du panier</h1>
        <p className="mt-4 text-slate-600">Votre panier est vide.</p>
        <Link to="/cart" className="mt-6 inline-flex rounded-lg bg-cyan-600 px-4 py-2 text-white hover:bg-cyan-700">
          Retour au panier
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto grid gap-4 sm:gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="surface-section p-4 sm:p-6">
        <Link to="/cart" className="text-sm text-slate-600 hover:text-slate-900">
          Retour au panier
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold mt-3">Paiement du panier</h1>
        <p className="mt-2 text-slate-600">Aucune donnée bancaire n'est stockée dans l'application. La validation ci-dessous confirme le paiement simulé du panier.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="rounded-xl bg-slate-100 p-4 text-sm text-slate-700">
            En confirmant, vous validez le règlement des événements payants du panier puis la création des inscriptions associées.
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting ? 'Validation en cours...' : totalDue > 0 ? `Confirmer le paiement de ${totalDue.toFixed(2)} €` : 'Finaliser les inscriptions'}
          </button>
        </form>
      </section>

      <aside className="surface-section p-4 sm:p-6">
        <h2 className="text-xl font-semibold">Récapitulatif du panier</h2>
        <div className="mt-4 space-y-4 text-sm text-slate-700">
          {items.map((item) => {
            const status = statuses[item.id]
            return (
              <div key={item.id} className="border-b border-slate-200 pb-3 last:border-b-0">
                <p className="font-semibold text-slate-900">{item.title}</p>
                <p>{Number(item.price || 0).toFixed(2)} €</p>
                <p className="text-xs text-slate-500">
                  {status?.isPaid ? 'Paiement déjà validé' : status?.requiresPayment ? 'Paiement requis' : 'Gratuit'}
                </p>
              </div>
            )
          })}
          <div className="pt-3 flex items-center justify-between">
            <span>Total à régler maintenant</span>
            <span className="text-lg font-bold">{totalDue.toFixed(2)} €</span>
          </div>
        </div>
      </aside>
    </div>
  )
}
