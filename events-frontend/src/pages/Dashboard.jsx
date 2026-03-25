import React, { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import api from '../services/api'
import { requestRefund } from '../services/paymentsService'
import EventForm from '../components/EventForm'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'

function PasswordField({ value, onChange, placeholder, minLength }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        className="border p-2 pr-24 rounded w-full"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        minLength={minLength}
        required
      />
      <button
        type="button"
        onClick={() => setVisible((state) => !state)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-blue-700 hover:text-blue-900"
      >
        {visible ? 'Masquer' : 'Afficher'}
      </button>
    </div>
  )
}

export default function Dashboard() {
  const { user, updateProfile } = useContext(AuthContext)
  const toast = useToast()
  const confirm = useConfirm()

  const [inscriptions, setInscriptions] = useState({ enCours: [], passes: [] })
  const [myEvents, setMyEvents] = useState([])
  const [loading, setLoading] = useState(true)

  const [displayName, setDisplayName] = useState(user?.name || '')
  const [savingName, setSavingName] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)

  const [editingEventId, setEditingEventId] = useState(null)
  const [creating, setCreating] = useState(false)
  const [savingEventId, setSavingEventId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    setDisplayName(user?.name || '')
  }, [user?.name])

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
  const handleCancelInscription = async (inscription) => {
    const eventPrice = Number(inscription.event?.price || 0)
    const ok = await confirm({
      title: 'Confirmer la désinscription',
      message: eventPrice > 0
        ? `Voulez-vous vraiment annuler cette inscription ? Un remboursement de ${eventPrice.toFixed(2)} € sera traité sous 48h.`
        : 'Voulez-vous vraiment annuler cette inscription ?',
      confirmText: 'Se désinscrire',
      danger: true,
    })
    if (!ok) return
    try {
      let refundResult = null
      if (eventPrice > 0 && inscription.event?.id) {
        refundResult = await requestRefund(inscription.event.id)
      }
      await api.delete(`/inscriptions/${inscription.id}`)
      await refreshInscriptions()
      if (refundResult?.refundRequested) {
        toast.success(`Désinscription effectuée. Remboursement de ${Number(refundResult.amount).toFixed(2)} € en cours sous 48h.`)
      } else {
        toast.success('Désinscription effectuée.')
      }
    } catch (err) {
      console.error(err)
      toast.error("Erreur lors de la désinscription.")
    }
  }

  const handleSaveName = async (e) => {
    e.preventDefault()
    try {
      setSavingName(true)
      const res = await api.put('/users/me', { name: displayName })
      updateProfile?.({ name: res.data?.name ?? displayName })
      toast.success('Nom mis à jour.')
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.message || 'Erreur lors de la mise a jour du nom.')
    } finally {
      setSavingName(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()

    if (newPassword !== confirmNewPassword) {
      toast.error('La confirmation du nouveau mot de passe ne correspond pas.')
      return
    }

    try {
      setSavingPassword(true)
      const res = await api.put('/users/me/password', {
        currentPassword,
        newPassword,
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
      setShowPasswordForm(false)
      toast.success(res.data?.message || 'Mot de passe mis a jour.')
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.message || 'Erreur lors du changement de mot de passe.')
    } finally {
      setSavingPassword(false)
    }
  }

  // Création d’un événement
  const handleCreateEvent = async (formData) => {
    try {
      setCreating(true)
      await api.post('/events', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
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

  // Edition d’un événement créé
  const handleUpdateEvent = async (eventId, formData) => {
    try {
      setSavingEventId(eventId)
      await api.put(`/events/${eventId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      await refreshMyEvents()
      setEditingEventId(null)
      toast.success('Événement modifié.')
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.message || 'Erreur lors de la modification de l’événement.')
    } finally {
      setSavingEventId(null)
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
    <div className="max-w-5xl mx-auto mt-4 sm:mt-8 px-0 sm:px-4 space-y-8 sm:space-y-10">
      <h1 className="text-2xl font-bold">Bonjour, {user?.name}</h1>

      <section className="surface-section p-4">
        <h2 className="text-xl font-semibold mb-3">Mon profil</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={handleSaveName} className="flex flex-col gap-3">
            <input
              className="border p-2 rounded w-full"
              placeholder="Mon nom"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={savingName}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60 w-full sm:w-fit"
            >
              {savingName ? 'Enregistrement…' : 'Changer mon nom'}
            </button>
          </form>

          <div className="flex flex-col gap-3">
            {!showPasswordForm ? (
              <button
                type="button"
                onClick={() => setShowPasswordForm(true)}
                className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 w-full sm:w-fit"
              >
                Changer mon mot de passe
              </button>
            ) : (
              <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
                <PasswordField
                  placeholder="Mot de passe actuel"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  minLength={1}
                />
                <PasswordField
                  placeholder="Nouveau mot de passe"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                />
                <PasswordField
                  placeholder="Confirmer le nouveau mot de passe"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  minLength={6}
                />
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 disabled:opacity-60 w-full sm:w-fit"
                  >
                    {savingPassword ? 'Mise a jour…' : 'Valider le nouveau mot de passe'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordForm(false)
                      setCurrentPassword('')
                      setNewPassword('')
                      setConfirmNewPassword('')
                    }}
                    className="border border-slate-300 px-4 py-2 rounded hover:bg-slate-50 w-full sm:w-fit"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ——— Mes inscriptions ——— */}
      <section className="surface-section p-4">
        <h2 className="text-xl font-semibold mb-3">Mes inscriptions en cours</h2>
        {inscriptions.enCours?.length ? (
          <ul className="space-y-2">
            {inscriptions.enCours.map((i) => (
              <li key={i.id || i._id} className="surface-card p-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <div>
                  <strong>{i.event?.title}</strong>{' '}
                  <span className="text-sm text-gray-600">— {new Date(i.event?.date).toLocaleDateString('fr-FR')}</span>
                </div>
                <button
                  onClick={() => handleCancelInscription(i)}
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
              <li key={i.id || i._id} className="surface-card p-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-gray-700">
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
        <section className="surface-section p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <h2 className="text-xl font-semibold">Mes événements</h2>
            <button
              onClick={() => setShowCreate((s) => !s)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full sm:w-auto"
            >
              {showCreate ? 'Fermer' : 'Créer un événement'}
            </button>
          </div>

          {/* Formulaire repliable */}
          {showCreate && (
            <div className="mb-6">
              <EventForm
                onSubmit={handleCreateEvent}
                initial={{}}
                isLoading={creating}
              />
            </div>
          )}

          {/* Liste de MES événements */}
          {myEvents.length === 0 ? (
            <p>Tu n’as pas encore créé d’événement.</p>
          ) : (
            <ul className="space-y-2">
              {myEvents.map((ev) => {
                const isEditing = editingEventId === ev.id
                return (
                  <li key={ev.id} className="surface-card p-3">
                    {!isEditing ? (
                      <div className="flex flex-wrap md:flex-nowrap md:items-center justify-between gap-2">
                        <div>
                          <strong>{ev.title}</strong>{' '}
                          <span className="text-sm text-gray-600">
                            — {ev.location} — {formatDateRange(ev.date, ev.end_date)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingEventId(ev.id)}
                            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(ev.id)}
                            disabled={deletingId === ev.id}
                            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 disabled:opacity-60"
                          >
                            {deletingId === ev.id ? 'Suppression…' : 'Supprimer'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <EventForm
                          onSubmit={(formData) => handleUpdateEvent(ev.id, formData)}
                          initial={ev}
                          isLoading={savingEventId === ev.id}
                        />
                        <button
                          type="button"
                          onClick={() => setEditingEventId(null)}
                          className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                        >
                          Annuler
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}

function formatDateRange(start, end) {
  try {
    const startDate = new Date(start)
    if (Number.isNaN(startDate.getTime())) return ''
    const endDate = new Date(end || start)

    const startText = startDate.toLocaleString('fr-FR')
    const endText = Number.isNaN(endDate.getTime()) ? startText : endDate.toLocaleString('fr-FR')
    return startText === endText ? startText : `${startText} -> ${endText}`
  } catch {
    return ''
  }
}
