import React, { useEffect, useState, useContext } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import EventCard from '../components/EventCard'
import { AuthContext } from '../contexts/AuthContext'

export default function Home() {
  const { user } = useContext(AuthContext)
  const [events, setEvents] = useState([])
  const [userEventIds, setUserEventIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = async () => {
    try {
      setLoading(true)
      setError(null)

      // 1) Récupère les événements
      const resEv = await api.get('/events')
      const list = Array.isArray(resEv.data) ? resEv.data : []
      setEvents(list)

      // 2) Si user connecté, récupère ses inscriptions
      if (user) {
        const resIns = await api.get('/inscriptions/me')
        // backend renvoie { enCours: [], passes: [] }
        const all = [
          ...(resIns.data?.enCours ?? []),
          ...(resIns.data?.passes ?? []),
        ]
        // on récupère les ID d’événements inscrits
        const ids = new Set(all.map(i => i.event?.id ?? i.event_id))
        setUserEventIds(ids)
      } else {
        setUserEventIds(new Set())
      }
    } catch (err) {
      console.error('Erreur:', err)
      setError("Erreur lors du chargement des événements")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
    // recharger quand user change (login/logout)
  }, [user])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-lg">Chargement des événements...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="surface-section text-red-700 px-4 py-3">
        {error}
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-3xl font-bold text-center md:text-left">Événements à venir</h1>
        <div className="flex flex-col items-center md:items-end gap-1">
          <Link
            to={user ? '/organizer' : '/login?redirect=/organizer'}
            className="bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 shadow-sm"
          >
            Créer un événement
          </Link>
          {!user && (
            <p className="text-xs text-slate-600">Connecte-toi pour publier ton événement.</p>
          )}
        </div>
      </div>

      {events.length === 0 ? (
        <div className="surface-section text-center text-gray-500 py-8">
          Aucun événement disponible pour le moment
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map(event => (
            <EventCard
              key={event.id}               // ✅ Drizzle: id numérique
              event={event}
              isInscrit={userEventIds.has(event.id)}
              onChanged={fetchAll}         // ✅ pour rafraîchir après inscription/désinscription
            />
          ))}
        </div>
      )}
    </div>
  )
}
