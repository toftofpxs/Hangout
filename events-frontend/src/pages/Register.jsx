import React, { useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { register } = useContext(AuthContext)
  const toast = useToast()
  const nav = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    try {
      await register({ name, email, password })
      toast.success('Compte créé avec succès.')
      nav('/dashboard')
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err.message || 'Erreur inscription'
      toast.error(`Erreur inscription: ${msg}`)
      console.error('Register error:', err?.response?.data || err)
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Inscription</h2>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom"
          className="border p-2 rounded"
          required
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="border p-2 rounded"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe (min. 6 caractères)"
          className="border p-2 rounded"
          minLength={6}
          required
        />
        <button className="mt-2 bg-green-600 text-white px-4 py-2 rounded">S'inscrire</button>
      </form>
    </div>
  )
}
