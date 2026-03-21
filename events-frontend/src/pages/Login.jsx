import React, { useState, useContext } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AuthContext } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

export default function Login(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login } = useContext(AuthContext)
  const toast = useToast()
  const location = useLocation()
  const nav = useNavigate()

  const redirectTo = new URLSearchParams(location.search).get('redirect') || '/dashboard'

  const submit = async (e)=>{
    e.preventDefault()
    try{
      await login({ email, password })
      toast.success('Connexion réussie.')
      nav(redirectTo)
    }catch(err){
      const msg = err?.response?.data?.message || 'Erreur connexion'
      toast.error(msg)
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Connexion</h2>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="border p-2 rounded" />
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mot de passe" className="border p-2 rounded" />
        <button className="mt-2 bg-blue-600 text-white px-4 py-2 rounded">Se connecter</button>
      </form>
    </div>
  )
}
