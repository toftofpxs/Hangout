import React, { createContext, useState, useEffect } from 'react'
import { getToken, saveToken, removeToken, decodeToken, isTokenExpired } from '../utils/auth'
import api from '../services/api'

export const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    const savedUser = localStorage.getItem('user')

    async function hydrate() {
      try {
        if (!token || isTokenExpired(token)) {
          removeToken()
          localStorage.removeItem('user')
          setUser(null)
          return
        }

        // 1) Priorité à l'user complet stocké
        if (savedUser) {
          setUser({ ...JSON.parse(savedUser), token })
          return
        }

        // 2) Sinon, demander le profil complet
        const decoded = decodeToken(token)
        if (!decoded?.id) {
          removeToken()
          return
        }

        const res = await api.get('/users/me')
        localStorage.setItem('user', JSON.stringify(res.data))
        setUser({ ...res.data, token })
      } catch (e) {
        console.error('hydrate user error', e)
        removeToken()
        localStorage.removeItem('user')
        setUser(null)
      }
    }

    hydrate().finally(() => setLoading(false))
  }, [])

  const login = async (credentials) => {
    try {
      const res = await api.post('/auth/login', credentials)
      const { token, user } = res.data
      saveToken(token)
      localStorage.setItem('user', JSON.stringify(user))
      setUser({ ...user, token })
      return user
    } catch (err) {
      // propager l'erreur au composant (pour afficher le vrai message)
      throw err
    }
  }

  // ✅ ajoute register : inscription + auto-connexion
  const register = async (payload) => {
    try {
      const res = await api.post('/auth/register', payload)
      return res.data
    } catch (err) {
      throw err
    }
  }

  const logout = () => {
    removeToken()
    localStorage.removeItem('user')
    setUser(null)
  }

  const updateProfile = (patch) => {
    setUser((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      localStorage.setItem('user', JSON.stringify({
        id: next.id,
        name: next.name,
        email: next.email,
        role: next.role,
        created_at: next.created_at,
      }))
      return next
    })
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
