import React, { createContext, useState, useEffect } from 'react'
import {
  clearAuthSession,
  decodeToken,
  getSessionUser,
  getRefreshToken,
  getToken,
  isTokenExpired,
  saveAuthSession,
  saveSessionUser,
} from '../utils/auth'
import api, { setAuthSessionHandlers } from '../services/api'

export const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function hydrate() {
      try {
        const token = getToken()
        const refreshToken = getRefreshToken()
        const savedUser = getSessionUser()

        if (!token && !refreshToken) {
          clearAuthSession()
          setUser(null)
          return
        }

        if (!token || isTokenExpired(token)) {
          if (!refreshToken) {
            clearAuthSession()
            setUser(null)
            return
          }

          const refreshResponse = await api.post('/auth/refresh', { refreshToken })
          saveAuthSession(refreshResponse.data)
          const refreshedUser = refreshResponse.data.user || savedUser
          if (refreshedUser) {
            setUser({ ...refreshedUser, token: refreshResponse.data.accessToken || refreshResponse.data.token })
            return
          }
        }

        if (savedUser) {
          setUser({ ...savedUser, token: getToken() })
          return
        }

        const decoded = decodeToken(getToken())
        if (!decoded?.id) {
          clearAuthSession()
          return
        }

        const res = await api.get('/users/me')
        saveSessionUser(res.data)
        setUser({ ...res.data, token: getToken() })
      } catch {
        clearAuthSession()
        setUser(null)
      }
    }

    setAuthSessionHandlers({
      handleAuthFailure: async () => {
        clearAuthSession()
        setUser(null)
      },
      handleAuthRefresh: (session) => {
        if (!session?.user) return
        setUser({ ...session.user, token: session.accessToken || session.token })
      },
    })

    hydrate().finally(() => setLoading(false))

    return () => {
      setAuthSessionHandlers({})
    }
  }, [])

  const login = async (credentials) => {
    try {
      const res = await api.post('/auth/login', credentials)
      const { token, accessToken, user } = res.data
      saveAuthSession(res.data)
      setUser({ ...user, token: accessToken || token })
      return user
    } catch (err) {
      throw err
    }
  }

  const register = async (payload) => {
    try {
      const res = await api.post('/auth/register', payload)
      saveAuthSession(res.data)
      setUser({ ...res.data.user, token: res.data.accessToken || res.data.token })
      return res.data.user
    } catch (err) {
      throw err
    }
  }

  const logout = async () => {
    const token = getToken()
    try {
      if (token) {
        await api.post('/auth/logout')
      }
    } catch {
      // ignore logout failures, local clear still applies
    }

    clearAuthSession()
    setUser(null)
  }

  const updateProfile = (patch) => {
    setUser((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      saveSessionUser({
        id: next.id,
        name: next.name,
        email: next.email,
        role: next.role,
        created_at: next.created_at,
      })
      return next
    })
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
