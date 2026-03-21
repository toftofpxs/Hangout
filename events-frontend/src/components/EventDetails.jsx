import React, { useEffect, useState, useContext } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'
import { requestRefund } from '../services/paymentsService'
import { AuthContext } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'

export default function EventDetails() {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [inscrit, setInscrit] = useState(false)
  const [busy, setBusy] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const { user } = useContext(AuthContext)
  const toast = useToast()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const { addToCart, isInCart } = useCart()

  const uploadsBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '')

  const toAbsoluteImageUrl = (imgPath) => {
    if (!imgPath || typeof imgPath !== 'string') return null
    if (/^https?:\/\//i.test(imgPath)) return imgPath
    return `${uploadsBaseUrl}${imgPath.startsWith('/') ? '' : '/'}${imgPath}`
  }

  const eventImages = Array.isArray(event?.photos)
    ? event.photos.map(toAbsoluteImageUrl).filter(Boolean)
    : []

  // 🔹 Charger les infos de l'événement
  useEffect(() => {
    fetchEvent()
  }, [id])

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedImage(null)
    }

    if (selectedImage) {
      window.addEventListener('keydown', onKeyDown)
      return () => window.removeEventListener('keydown', onKeyDown)
    }

    return undefined
  }, [selectedImage])

  const fetchEvent = async () => {
    try {
      const res = await api.get(`/events/${id}`)
      setEvent(res.data)

      // Vérifie si l'utilisateur est déjà inscrit
      if (user && res.data.inscriptions) {
        const isIn = res.data.inscriptions.some(i => i.user_id === user.id)
        setInscrit(isIn)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // 🔹 Vérifie si l’événement est expiré
  const isExpired = (date, endDate) => new Date(endDate || date) < new Date()

  const formatDateRange = (start, end) => {
    const startDate = new Date(start)
    if (Number.isNaN(startDate.getTime())) return ''
    const endDate = new Date(end || start)
    const startText = startDate.toLocaleString('fr-FR')
    const endText = Number.isNaN(endDate.getTime()) ? startText : endDate.toLocaleString('fr-FR')
    return startText === endText ? startText : `${startText} -> ${endText}`
  }

  // 🔹 Inscription
  const handleInscription = async () => {
    if (!user) {
      toast.info('Connectez-vous pour vous inscrire.')
      return
    }

    const eventPrice = Number(event?.price || 0)
    if (Number.isFinite(eventPrice) && eventPrice > 0) {
      navigate(`/payments/event/${id}`)
      return
    }

    try {
      setBusy(true)
      await api.post('/inscriptions', { event_id: id })
      toast.success('Inscription réussie.')
      setInscrit(true)
    } catch (err) {
      console.error(err)
      if (err.response?.status === 402) {
        toast.error('Paiement requis avant inscription.')
      } else {
        toast.error('Erreur lors de l’inscription.')
      }
    } finally {
      setBusy(false)
    }
  }

  // 🔹 Désinscription
  const handleDesinscription = async () => {
    const eventPrice = Number(event?.price || 0)
    const ok = await confirm({
      title: 'Confirmer la désinscription',
      message: eventPrice > 0
        ? `Voulez-vous vraiment annuler votre inscription à cet événement ? Un remboursement de ${eventPrice.toFixed(2)} € sera traité sous 48h.`
        : 'Voulez-vous vraiment annuler votre inscription à cet événement ?',
      confirmText: 'Se désinscrire',
      danger: true,
    })
    if (!ok) return
    try {
      setBusy(true)
      let refundResult = null
      if (eventPrice > 0) {
        refundResult = await requestRefund(id)
      }
      await api.delete(`/inscriptions/by-event/${id}`)
      if (refundResult?.refundRequested) {
        toast.success(`Désinscription effectuée. Remboursement de ${Number(refundResult.amount).toFixed(2)} € en cours sous 48h.`)
      } else {
        toast.success('Désinscription effectuée.')
      }
      setInscrit(false)
    } catch (err) {
      console.error(err)
      toast.error('Erreur lors de la désinscription.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div>Chargement...</div>
  if (!event) return <div>Événement introuvable.</div>

  const expired = isExpired(event.date, event.end_date)
  const inCart = isInCart(event.id)

  const handleAddToCart = () => {
    const added = addToCart(event)
    if (added) {
      toast.success('Événement ajouté au panier.')
    } else {
      toast.info('Cet événement est déjà dans votre panier.')
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 surface-section mt-6">
      <div className="mb-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 text-slate-800 hover:bg-slate-200"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          <span>Retour a l'accueil</span>
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
      <p className="text-sm text-gray-600">
        📍 {event.location} — 📅 {formatDateRange(event.date, event.end_date)}
      </p>

      {eventImages.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-semibold text-gray-700 mb-2">Images de l'événement</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {eventImages.map((imgSrc, index) => (
              <button
                key={`${imgSrc}-${index}`}
                type="button"
                onClick={() => setSelectedImage(imgSrc)}
                className="block overflow-hidden rounded-lg border border-gray-200 hover:opacity-90"
              >
                <img
                  src={imgSrc}
                  alt={`Photo ${index + 1} de ${event.title}`}
                  className="w-full h-32 object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 text-gray-700">{event.description}</p>

      {event.price > 0 && (
        <p className="mt-2 text-gray-800 font-semibold">
          💰 {event.price} €
        </p>
      )}

      <div className="mt-6">
        {!expired && !inscrit && (
          <button
            type="button"
            onClick={handleAddToCart}
            className={`mr-3 px-4 py-2 rounded border ${inCart ? 'border-emerald-600 text-emerald-700 bg-emerald-50' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}
          >
            {inCart ? 'Déjà dans le panier' : 'Ajouter au panier'}
          </button>
        )}

        {expired ? (
          <p className="italic text-gray-500">⏰ Cet événement est terminé.</p>
        ) : user ? (
          inscrit ? (
            <button
              onClick={handleDesinscription}
              disabled={busy}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Se désinscrire
            </button>
          ) : (
            <button
              onClick={handleInscription}
              disabled={busy}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              S’inscrire
            </button>
          )
        ) : (
          <p className="text-sm text-gray-600 italic mt-2">
            Connectez-vous pour vous inscrire à cet événement.
          </p>
        )}
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 left-4 text-white text-3xl leading-none"
            aria-label="Fermer la vue image"
          >
            ×
          </button>
          <img
            src={selectedImage}
            alt="Agrandissement de la photo"
            className="max-w-[95vw] max-h-[90vh] object-contain rounded"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
