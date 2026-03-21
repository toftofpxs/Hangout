import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import api from '../services/api'
import EventForm from '../components/EventForm'
import { AuthContext } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'

const USER_ROLE_OPTIONS = [
  { value: 'all', label: 'Tous les rôles' },
  { value: 'participant', label: 'Participant' },
  { value: 'organisateur', label: 'Organisateur' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_user', label: 'Super utilisateur' },
]

const EVENT_FILTER_OPTIONS = [
  { value: 'all', label: 'Tous' },
  { value: 'upcoming', label: 'À venir' },
  { value: 'free', label: 'Gratuits' },
  { value: 'paid', label: 'Payants' },
  { value: 'busy', label: 'Avec participants' },
]

const ROLE_SEARCH_TERMS = {
  participant: ['participant', 'participants'],
  organisateur: ['organisateur', 'organisateurs'],
  admin: ['admin', 'admins', 'administrateur', 'administrateurs'],
  super_user: ['super_user', 'super user', 'super users', 'super utilisateur', 'super utilisateurs'],
}

export default function Admin() {
  const { user } = useContext(AuthContext)
  const toast = useToast()
  const confirm = useConfirm()
  const [users, setUsers] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [editingUserId, setEditingUserId] = useState(null)
  const [userForm, setUserForm] = useState({ name: '', role: 'participant' })
  const [savingUserId, setSavingUserId] = useState(null)
  const [deletingUserId, setDeletingUserId] = useState(null)
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('all')
  const [activeSuggestions, setActiveSuggestions] = useState(null)

  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [eventSearch, setEventSearch] = useState('')
  const [eventFilter, setEventFilter] = useState('all')

  const userSearchRef = useRef(null)
  const eventSearchRef = useRef(null)

  const canAssignSuperUser = user?.role === 'super_user'

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const [resUsers, resEvents] = await Promise.all([
          api.get('/admin/users'),
          api.get('/admin/events-summary'),
        ])
        setUsers(resUsers.data || [])
        setEvents(resEvents.data || [])
      } catch (e) {
        console.error(e)
        setError("Impossible de charger les données admin.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (
        userSearchRef.current?.contains(event.target) ||
        eventSearchRef.current?.contains(event.target)
      ) {
        return
      }

      setActiveSuggestions(null)
    }

    document.addEventListener('mousedown', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [])

  const refreshEvents = async () => {
    const res = await api.get('/admin/events-summary')
    setEvents(res.data || [])
  }

  const refreshUsers = async () => {
    const res = await api.get('/admin/users')
    setUsers(res.data || [])
  }

  const getUserId = (target) => target?.id ?? target?._id

  const startEditUser = (target) => {
    setEditingUserId(getUserId(target))
    setUserForm({
      name: target.name || '',
      role: target.role || 'participant',
    })
  }

  const cancelEditUser = () => {
    setEditingUserId(null)
    setUserForm({ name: '', role: 'participant' })
  }

  const saveUser = async (targetId) => {
    try {
      setSavingUserId(targetId)
      const payload = {
        name: userForm.name,
        role: userForm.role,
      }
      const res = await api.put(`/admin/users/${targetId}`, payload)

      setUsers((list) => list.map((u) => (getUserId(u) === targetId ? res.data : u)))
      cancelEditUser()
      toast.success('Utilisateur mis à jour.')

      // Si je me modifie moi-même, on garde le localStorage synchronisé
      if (user?.id === targetId) {
        localStorage.setItem('user', JSON.stringify(res.data))
      }
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.message || 'Erreur lors de la mise à jour utilisateur.')
    } finally {
      setSavingUserId(null)
    }
  }

  const banUser = async (target) => {
    const targetId = getUserId(target)
    const ok = await confirm({
      title: 'Bannir un utilisateur',
      message: `Bannir/supprimer l'utilisateur ${target.name} ?`,
      confirmText: 'Bannir',
      danger: true,
    })
    if (!ok) return
    try {
      setDeletingUserId(targetId)
      await api.delete(`/admin/users/${targetId}`)
      setUsers((list) => list.filter((u) => getUserId(u) !== targetId))
      toast.success('Utilisateur banni/supprimé.')
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.message || 'Impossible de bannir cet utilisateur.')
    } finally {
      setDeletingUserId(null)
    }
  }

  const availableRoles = canAssignSuperUser
    ? ['participant', 'organisateur', 'admin', 'super_user']
    : ['participant', 'organisateur', 'admin']

  const filteredUsers = useMemo(() => {
    const needle = normalizeSearchText(userSearch)

    return users.filter((target) => {
      const searchTerms = [
        target.name,
        target.email,
        target.role,
        roleLabel(target.role),
        ...(ROLE_SEARCH_TERMS[target.role] || []),
      ]

      const matchesSearch = !needle || searchTerms.some((value) => (
        normalizeSearchText(value).includes(needle)
      ))

      const matchesRole = userRoleFilter === 'all' || target.role === userRoleFilter

      return matchesSearch && matchesRole
    })
  }, [userRoleFilter, userSearch, users])

  const userSuggestions = useMemo(() => (
    getSearchSuggestions(
      users.flatMap((target) => [
        { value: target.email, kind: 'Email' },
        { value: target.name, kind: 'Nom' },
        { value: roleLabel(target.role), kind: 'Role' },
        ...(ROLE_SEARCH_TERMS[target.role] || []).map((term) => ({ value: term, kind: 'Role' })),
      ]),
      userSearch
    )
  ), [userSearch, users])

  const filteredEvents = useMemo(() => {
    const needle = normalizeSearchText(eventSearch)
    const now = new Date()

    return events.filter((event) => {
      const matchesSearch = !needle || [
        event.title,
        event.location,
        event.organizer_name,
        event.organizer_email,
      ].some((value) => normalizeSearchText(value).includes(needle))

      const endDate = new Date(event.end_date || event.date)
      const isUpcoming = !Number.isNaN(endDate.getTime()) && endDate >= now
      const price = Number(event.price || 0)
      const participantCount = Number(event.participantsCount || 0)

      const matchesFilter =
        eventFilter === 'all' ||
        (eventFilter === 'upcoming' && isUpcoming) ||
        (eventFilter === 'free' && price === 0) ||
        (eventFilter === 'paid' && price > 0) ||
        (eventFilter === 'busy' && participantCount > 0)

      return matchesSearch && matchesFilter
    })
  }, [eventFilter, eventSearch, events])

  const eventSuggestions = useMemo(() => (
    getSearchSuggestions(
      events.flatMap((event) => [
        { value: event.title, kind: 'Titre' },
        { value: event.location, kind: 'Lieu' },
        { value: event.organizer_name, kind: 'Organisateur' },
        { value: event.organizer_email, kind: 'Email organisateur' },
      ]),
      eventSearch
    )
  ), [eventSearch, events])

  const startEdit = (ev) => {
    setEditingId(ev.id ?? ev._id)
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const submitEdit = async (formData) => {
    try {
      setSaving(true)
      const id = editingId
      await api.put(`/events/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      await refreshEvents()
      cancelEdit()
      toast.success('Événement mis à jour.')
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.message || "Erreur lors de la mise à jour.")
    } finally {
      setSaving(false)
    }
  }

  const deleteEvent = async (id) => {
    const ok = await confirm({
      title: 'Supprimer l’événement',
      message: 'Cette action est définitive. Continuer ?',
      confirmText: 'Supprimer',
      danger: true,
    })
    if (!ok) return
    try {
      setDeletingId(id)
      await api.delete(`/events/${id}`)
      setEvents((list) => list.filter((e) => (e.id ?? e._id) !== id))
      toast.success('Événement supprimé.')
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.message || "Suppression impossible.")
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return <div className="p-6">Chargement…</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      <h1 className="text-2xl font-bold">Espace admin</h1>

      {/* Utilisateurs */}
      <section className="surface-section p-4">
        <div className="flex items-center justify-between mb-3 gap-2">
          <h2 className="text-xl font-semibold">Utilisateurs</h2>
          <button
            onClick={refreshUsers}
            className="px-3 py-1 rounded bg-gray-800 text-white hover:bg-black"
          >
            Rafraîchir
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Règle: seul le super_user peut bannir un admin/super_user.
        </p>

        <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <div ref={userSearchRef} className="relative">
            <input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              onFocus={() => setActiveSuggestions('users')}
              className="border p-2 rounded w-full"
              placeholder="Rechercher par nom, email ou rôle"
            />
            {userSearch.trim() && userSuggestions.length > 0 && activeSuggestions === 'users' && (
              <div className="absolute z-10 mt-2 w-full overflow-hidden rounded border bg-white shadow-lg">
                {userSuggestions.map((item) => (
                  <button
                    key={`${item.kind}-${item.value}`}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setUserSearch(item.value)
                      setActiveSuggestions(null)
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50"
                  >
                    <span>{renderHighlightedSuggestion(item.value, userSearch)}</span>
                    <span className="text-xs text-gray-500">{item.kind}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <select
            value={userRoleFilter}
            onChange={(e) => setUserRoleFilter(e.target.value)}
            className="border p-2 rounded"
          >
            {USER_ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <p className="text-sm text-gray-500 mb-2">
          {filteredUsers.length} utilisateur(s) affiché(s) sur {users.length}
        </p>

        <ul className="divide-y">
          {filteredUsers.map((u) => (
            <li key={u.id ?? u._id} className="py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              {editingUserId === getUserId(u) ? (
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input
                    value={userForm.name}
                    onChange={(e) => setUserForm((s) => ({ ...s, name: e.target.value }))}
                    className="border p-2 rounded"
                    placeholder="Nom"
                  />
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm((s) => ({ ...s, role: e.target.value }))}
                    className="border p-2 rounded"
                  >
                    {availableRoles.map((roleValue) => (
                      <option key={roleValue} value={roleValue}>{roleLabel(roleValue)}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveUser(getUserId(u))}
                      disabled={savingUserId === getUserId(u)}
                      className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                    >
                      {savingUserId === getUserId(u) ? 'Enregistrement…' : 'Valider'}
                    </button>
                    <button
                      onClick={cancelEditUser}
                      className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <span className="font-medium">{u.name}</span>{' '}
                    <span className="text-gray-600">— {u.email}</span>{' '}
                    <span className="text-xs px-2 py-1 rounded bg-gray-200">{roleLabel(u.role)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEditUser(u)}
                      className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => banUser(u)}
                      disabled={deletingUserId === getUserId(u)}
                      className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {deletingUserId === getUserId(u) ? 'Bannissement…' : 'Bannir'}
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>

        {filteredUsers.length === 0 && (
          <p className="text-sm text-gray-500 pt-4">Aucun utilisateur ne correspond aux filtres.</p>
        )}
      </section>

      {/* Événements */}
      <section className="surface-section p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Tous les événements</h2>
          <button
            onClick={refreshEvents}
            className="px-3 py-1 rounded bg-gray-800 text-white hover:bg-black"
          >
            Rafraîchir
          </button>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <div ref={eventSearchRef} className="relative">
            <input
              value={eventSearch}
              onChange={(e) => setEventSearch(e.target.value)}
              onFocus={() => setActiveSuggestions('events')}
              className="border p-2 rounded w-full"
              placeholder="Rechercher par titre, lieu ou organisateur"
            />
            {eventSearch.trim() && eventSuggestions.length > 0 && activeSuggestions === 'events' && (
              <div className="absolute z-10 mt-2 w-full overflow-hidden rounded border bg-white shadow-lg">
                {eventSuggestions.map((item) => (
                  <button
                    key={`${item.kind}-${item.value}`}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setEventSearch(item.value)
                      setActiveSuggestions(null)
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50"
                  >
                    <span>{renderHighlightedSuggestion(item.value, eventSearch)}</span>
                    <span className="text-xs text-gray-500">{item.kind}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="border p-2 rounded"
          >
            {EVENT_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <p className="text-sm text-gray-500 mb-3">
          {filteredEvents.length} événement(s) affiché(s) sur {events.length}
        </p>

        {filteredEvents.length === 0 ? (
          <p>Aucun événement.</p>
        ) : (
          <ul className="space-y-3">
            {filteredEvents.map((ev, idx) => {
              const id = ev.id ?? ev._id ?? idx
              const isEditing = editingId === id

              return (
                <li key={id} className="surface-card p-3">
                  {!isEditing ? (
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <div className="font-semibold">{ev.title}</div>
                        <div className="text-sm text-gray-600">
                          {ev.location} — {formatDateRange(ev.date, ev.end_date)}
                        </div>
                        <div className="text-sm text-gray-700">
                          Organisateur : {ev.organizer_name || 'Compte supprimé'}
                          {ev.organizer_email ? ` (${ev.organizer_email})` : ''}
                        </div>
                        <div className="text-sm text-gray-700">
                          Participants : {Number(ev.participantsCount || 0)}
                        </div>
                        {ev.price != null && (
                          <div className="text-sm text-gray-700">Prix : {Number(ev.price)} €</div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(ev)}
                          className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => deleteEvent(id)}
                          disabled={deletingId === id}
                          className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                        >
                          {deletingId === id ? 'Suppression…' : 'Supprimer'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <EventForm
                        onSubmit={submitEdit}
                        initial={ev}
                        isLoading={saving}
                      />
                      <button
                        type="button"
                        onClick={cancelEdit}
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
    </div>
  )
}

/* ---------- Helpers ---------- */

function roleLabel(role) {
  switch (role) {
    case 'super_user':
      return 'Super utilisateur'
    case 'admin':
      return 'Admin'
    case 'organisateur':
      return 'Organisateur'
    case 'participant':
      return 'Participant'
    default:
      return 'Compte'
  }
}

function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getSearchSuggestions(items, searchValue) {
  const needle = normalizeSearchText(searchValue)
  if (!needle) return []

  const uniqueItems = new Map()

  items.forEach((item) => {
    const rawValue = String(item?.value || '').trim()
    const normalized = normalizeSearchText(rawValue)

    if (!rawValue || !normalized || uniqueItems.has(normalized) || !normalized.includes(needle)) {
      return
    }

    uniqueItems.set(normalized, { ...item, value: rawValue, normalized })
  })

  return Array.from(uniqueItems.values())
    .sort((left, right) => {
      const scoreDiff = suggestionScore(left.normalized, needle) - suggestionScore(right.normalized, needle)
      if (scoreDiff !== 0) return scoreDiff
      return left.value.localeCompare(right.value, 'fr', { sensitivity: 'base' })
    })
    .slice(0, 6)
}

function suggestionScore(value, needle) {
  if (value === needle) return 0
  if (value.startsWith(needle)) return 1
  if (value.includes(` ${needle}`)) return 2
  return 3
}

function renderHighlightedSuggestion(value, searchValue) {
  const segments = splitHighlightedText(value, searchValue)

  return segments.map((segment, index) => (
    <span key={`${segment.text}-${index}`} className={segment.match ? 'font-semibold text-cyan-700' : undefined}>
      {segment.text}
    </span>
  ))
}

function splitHighlightedText(value, searchValue) {
  const rawValue = String(value || '')
  const range = getHighlightedRange(rawValue, searchValue)

  if (!range) {
    return [{ text: rawValue, match: false }]
  }

  const segments = []
  if (range.start > 0) {
    segments.push({ text: rawValue.slice(0, range.start), match: false })
  }

  segments.push({ text: rawValue.slice(range.start, range.end), match: true })

  if (range.end < rawValue.length) {
    segments.push({ text: rawValue.slice(range.end), match: false })
  }

  return segments.filter((segment) => segment.text)
}

function getHighlightedRange(value, searchValue) {
  const needle = normalizeSearchText(searchValue)
  if (!needle) return null

  const characters = Array.from(String(value || ''))
  let normalizedValue = ''
  const indexMap = []

  characters.forEach((character, index) => {
    const normalizedCharacter = normalizeSearchTextForHighlight(character)

    Array.from(normalizedCharacter).forEach((mappedCharacter) => {
      normalizedValue += mappedCharacter
      indexMap.push(index)
    })
  })

  const matchIndex = normalizedValue.indexOf(needle)
  if (matchIndex === -1) return null

  const start = indexMap[matchIndex]
  const end = indexMap[matchIndex + needle.length - 1] + 1
  return { start, end }
}

function normalizeSearchTextForHighlight(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
}

// format pour affichage (fr-FR)
function formatDateTime(value) {
  try {
    const d = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleString('fr-FR')
  } catch {
    return ''
  }
}

function formatDateRange(startValue, endValue) {
  const start = formatDateTime(startValue)
  const end = formatDateTime(endValue || startValue)
  if (!start) return ''
  if (!end || start === end) return start
  return `${start} -> ${end}`
}
