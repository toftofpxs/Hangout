import React, { useContext, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { requestRefund } from '../services/paymentsService'
import { AuthContext } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'

export default function EventCard({ event, isInscrit, onChanged }) {
  const { user } = useContext(AuthContext)
  const toast = useToast()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const { addToCart, isInCart } = useCart()
  const [busy, setBusy] = useState(false)

  const expired = useMemo(() => {
    try {
      return new Date(event.end_date || event.date) < new Date()
    } catch {
      return false
    }
  }, [event.date, event.end_date])

  const inCart = isInCart(event.id)

  const dateLabel = useMemo(() => {
    const start = new Date(event.date)
    if (Number.isNaN(start.getTime())) return ''
    const end = new Date(event.end_date || event.date)
    const startLabel = start.toLocaleDateString('fr-FR')
    const endLabel = Number.isNaN(end.getTime()) ? startLabel : end.toLocaleDateString('fr-FR')
    return startLabel === endLabel ? startLabel : `${startLabel} -> ${endLabel}`
  }, [event.date, event.end_date])

  const handleInscription = async () => {
    if (!user) {
      toast.info("Connecte-toi pour t’inscrire")
      return
    }
    if (expired) return

    const eventPrice = Number(event.price || 0)
    if (Number.isFinite(eventPrice) && eventPrice > 0) {
      navigate(`/payments/event/${event.id}`)
      return
    }

    try {
      setBusy(true)
      // backend: POST /inscriptions  body: { event_id }
      await api.post('/inscriptions', { event_id: event.id })
      onChanged?.()
      toast.success('Inscription réussie.')
    } catch (err) {
      console.error(err)
      if (err.response?.status === 402) {
        toast.error('Paiement requis avant inscription.')
      } else {
        toast.error("Erreur lors de l’inscription.")
      }
    } finally {
      setBusy(false)
    }
  }

  const handleDesinscription = async () => {
    const eventPrice = Number(event.price || 0)
    const ok = await confirm({
      title: 'Confirmer la désinscription',
      message: eventPrice > 0
        ? `Voulez-vous vraiment vous désinscrire de cet événement ? Un remboursement de ${eventPrice.toFixed(2)} € sera lancé et traité sous 48h.`
        : 'Voulez-vous vraiment vous désinscrire de cet événement ?',
      confirmText: 'Se désinscrire',
      danger: true,
    })
    if (!ok) return
    try {
      setBusy(true)
      let refundResult = null
      if (eventPrice > 0) {
        refundResult = await requestRefund(event.id)
      }
      // Variante simple (recommandée): endpoint by-event
      // DELETE /inscriptions/by-event/:eventId
      await api.delete(`/inscriptions/by-event/${event.id}`)
      onChanged?.()
      if (refundResult?.refundRequested) {
        toast.success(`Désinscription effectuée. Remboursement de ${Number(refundResult.amount).toFixed(2)} € en cours sous 48h.`)
      } else {
        toast.success('Désinscription effectuée.')
      }
    } catch (err) {
      console.error(err)
      toast.error("Erreur lors de la désinscription.")
    } finally {
      setBusy(false)
    }
  }

  const handleAddToCart = () => {
    const added = addToCart(event)
    if (added) {
      toast.success('Événement ajouté au panier.')
    } else {
      toast.info('Cet événement est déjà dans votre panier.')
    }
  }

  return (
    <div
      className={`p-5 surface-card transition ${
        expired ? 'bg-gray-200/85 text-gray-500' : 'hover:shadow-xl'
      }`}
    >
      <h2 className="text-xl font-semibold mb-2">{event.title}</h2>
      {event.description && (
        <p className="mb-1 text-gray-700 line-clamp-3">{event.description}</p>
      )}
      <p className="text-sm text-gray-600">
        {event.location} — {dateLabel}
      </p>
      <p className="text-sm text-gray-600 mb-3">
         {event.price ? `${event.price} €` : 'Gratuit'}
      </p>

      <div className="mb-3">
        <Link
          to={`/events/${event.id}`}
          className="inline-flex w-full sm:w-auto justify-center bg-gray-900 text-white px-4 py-2 rounded hover:bg-black"
        >
          Voir l'événement
        </Link>
      </div>

      {!expired && !isInscrit && (
        <div className="mb-3">
          <button
            type="button"
            onClick={handleAddToCart}
            className={`w-full sm:w-auto px-4 py-2 rounded border ${inCart ? 'border-emerald-600 text-emerald-700 bg-emerald-50' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}
          >
            {inCart ? 'Déjà dans le panier' : 'Ajouter au panier'}
          </button>
        </div>
      )}

      {!expired ? (
        user ? (
          isInscrit ? (
            <button
              onClick={handleDesinscription}
              disabled={busy}
              className="w-full sm:w-auto bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-60"
            >
              Se désinscrire
            </button>
          ) : (
            <button
              onClick={handleInscription}
              disabled={busy}
              className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60"
            >
              S’inscrire
            </button>
          )
        ) : (
          <p className="text-sm italic text-gray-600">Connecte-toi pour t’inscrire.</p>
        )
      ) : (
        <p className="italic text-gray-500 mt-2">⏰ Événement terminé</p>
      )}
    </div>
  )
}
