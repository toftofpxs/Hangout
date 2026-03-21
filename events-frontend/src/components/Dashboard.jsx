import React, { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import api from '../services/api'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'

export default function Dashboard() {
  const { user } = useContext(AuthContext)
  const toast = useToast()
  const confirm = useConfirm()

  const [inscriptions, setInscriptions] = useState({ enCours: [], passes: [] })
  const [myEvents, setMyEvents] = useState([])
  const [loading, setLoading] = useState(true)

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    location: '',
    date: '',   // "YYYY-MM-DDTHH:mm" (datetime-local)
    price: '',
  })
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  // Charge inscriptions + mes événements (pour TOUT user connecté)
  useEffect(() => {
    if (!user) return;
    let mounted = true;

    (async () => {
      try {
        setLoading(true);

        // Inscriptions de l'utilisateur
        const resIns = await api.get('/inscriptions/me');
        if (mounted) setInscriptions(resIns.data);

        // Mes événements (toujours, peu importe le rôle)
        const resMine = await api.get('/events/mine');
        if (mounted) setMyEvents(resMine.data || []);
      } catch (err) {
        console.error(err);
        if (mounted) setMyEvents([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [user]);

  const refreshMyEvents = async () => {
    if (!user) return;
    const resMine = await api.get('/events/mine');
    setMyEvents(resMine.data || []);
  };

  const refreshInscriptions = async () => {
    const resIns = await api.get('/inscriptions/me')
    setInscriptions(resIns.data)
  }

  // Désinscription à partir de l’ID d’inscription
  const handleCancelInscription = async (inscriptionId) => {
    const ok = await confirm({
      title: 'Confirmer la désinscription',
      message: 'Voulez-vous vraiment annuler cette inscription ?',
      confirmText: 'Se désinscrire',
      danger: true,
    })
    if (!ok) return
    try {
      await api.delete(`/inscriptions/${inscriptionId}`)
      await refreshInscriptions()
      toast.success('Désinscription effectuée.')
    } catch (err) {
      console.error(err)
      toast.error("Erreur lors de la désinscription.")
    }
  }

  // Création d’un événement (backend convertira la date en Date JS)
  const handleCreateEvent = async (e) => {
    e.preventDefault()
    try {
      setCreating(true)
      await api.post('/events', {
        title: newEvent.title,
        description: newEvent.description,
        location: newEvent.location,
        date: newEvent.date,  // "YYYY-MM-DD" ou "YYYY-MM-DDTHH:mm"
        price: newEvent.price || '0',
      })
      setNewEvent({ title: '', description: '', location: '', date: '', price: '' })
      await refreshMyEvents()
      setShowCreate(false) // refermer le formulaire
      toast.success('Événement créé.')
    } catch (err) {
      console.error(err)
      toast.error("Erreur lors de la création de l’événement.")
    } finally {
      setCreating(false)
    }
  }

  // Suppression d’un événement créé
  const handleDeleteEvent = async (eventId) => {
    const ok = await confirm({
      title: 'Supprimer l’événement',
      message: 'Cette action est définitive. Continuer ?',
      confirmText: 'Supprimer',
      danger: true,
    })
    if (!ok) return
    try {
      setDeletingId(eventId)
      await api.delete(`/events/${eventId}`)
      await refreshMyEvents()
      toast.success('Événement supprimé.')
    } catch (err) {
      console.error(err)
      toast.error("Erreur lors de la suppression.")
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return <p className="p-6">Chargement…</p>

  return (
    <div className="max-w-5xl mx-auto mt-8 px-4 space-y-10">
      <h1 className="text-2xl font-bold">Bonjour, {user?.name}</h1>

      {/* ——— Mes inscriptions ——— */}
      <section className="bg-gray-50 rounded-lg p-4 shadow">
        <h2 className="text-xl font-semibold mb-3">Mes inscriptions en cours</h2>
        {inscriptions.enCours?.length ? (
          <ul className="space-y-2">
            {inscriptions.enCours.map((i) => (
              <li key={i.id || i._id} className="bg-white p-3 rounded shadow flex justify-between items-center">
                <div>
                  <strong>{i.event?.title}</strong>{' '}
                  <span className="text-sm text-gray-600">— {new Date(i.event?.date).toLocaleDateString('fr-FR')}</span>
                </div>
                <button
                  onClick={() => handleCancelInscription(i.id)}
                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                >
                  Se désinscrire
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>Aucune inscription en cours.</p>
        )}

        <h3 className="text-lg font-semibold mt-6 mb-2">Événements passés</h3>
        {inscriptions.passes?.length ? (
          <ul className="space-y-2">
            {inscriptions.passes.map((i) => (
              <li key={i.id || i._id} className="bg-gray-200 p-3 rounded flex justify-between items-center text-gray-700">
                <div>
                  <strong>{i.event?.title}</strong>{' '}
                  <span className="text-sm text-gray-600">— {new Date(i.event?.date).toLocaleDateString('fr-FR')}</span>
                </div>
                <span className="italic text-sm">(terminé)</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>Aucun événement passé.</p>
        )}
      </section>

      {/* ——— Mes événements (désormais pour TOUT user connecté) ——— */}
      {user && (
        <section className="bg-gray-50 rounded-lg p-4 shadow">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold">Mes événements</h2>
            <button
              onClick={() => setShowCreate((s) => !s)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              {showCreate ? 'Fermer' : 'Créer un événement'}
            </button>
          </div>

          {/* Formulaire repliable */}
          {showCreate && (
            <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              <input
                className="border p-2 rounded"
                placeholder="Titre"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                required
              />
              <input
                className="border p-2 rounded"
                placeholder="Lieu"
                value={newEvent.location}
                onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                required
              />
              <input
                type="datetime-local"
                className="border p-2 rounded"
                value={newEvent.date}
                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                required
              />
              <input
                type="number"
                className="border p-2 rounded"
                placeholder="Prix (€)"
                value={newEvent.price}
                onChange={(e) => setNewEvent({ ...newEvent, price: e.target.value })}
                min="0"
                step="0.01"
              />
              <textarea
                className="border p-2 rounded md:col-span-2"
                placeholder="Description"
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                required
              />
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-60"
                >
                  {creating ? 'Création…' : 'Publier'}
                </button>
              </div>
            </form>
          )}

          {/* Liste de MES événements */}
          {myEvents.length === 0 ? (
            <p>Tu n’as pas encore créé d’événement.</p>
          ) : (
            <ul className="space-y-2">
              {myEvents.map((ev) => (
                <li key={ev.id} className="bg-white p-3 rounded shadow flex flex-wrap md:flex-nowrap md:items-center justify-between gap-2">
                  <div>
                    <strong>{ev.title}</strong>{' '}
                    <span className="text-sm text-gray-600">
                      — {ev.location} — {new Date(ev.date).toLocaleString('fr-FR')}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDeleteEvent(ev.id)}
                      disabled={deletingId === ev.id}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 disabled:opacity-60"
                    >
                      {deletingId === ev.id ? 'Suppression…' : 'Supprimer'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
