// services/api.js
import axios from 'axios'
import { clearAuthSession, getRefreshToken, getToken, saveAuthSession } from '../utils/auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

let refreshPromise = null
let onAuthFailure = null
let onAuthRefresh = null

export const setAuthSessionHandlers = ({ handleAuthFailure, handleAuthRefresh } = {}) => {
  onAuthFailure = handleAuthFailure || null
  onAuthRefresh = handleAuthRefresh || null
}

const refreshAccessToken = async () => {
  if (refreshPromise) {
    return refreshPromise
  }

  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    throw new Error('Missing refresh token')
  }

  refreshPromise = axios.post(`${API_URL}/auth/refresh`, { refreshToken }, {
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .then((response) => {
      saveAuthSession(response.data)
      if (typeof onAuthRefresh === 'function') {
        onAuthRefresh(response.data)
      }
      return response.data
    })
    .catch(async (error) => {
      clearAuthSession()
      if (typeof onAuthFailure === 'function') {
        await onAuthFailure(error)
      }
      throw error
    })
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {}
    const isRefreshRequest = /\/auth\/refresh$/i.test(String(originalRequest.url || ''))

    if (error.response?.status === 401 && !originalRequest._retry && !isRefreshRequest) {
      originalRequest._retry = true

      try {
        const refreshedSession = await refreshAccessToken()
        originalRequest.headers = originalRequest.headers || {}
        originalRequest.headers.Authorization = `Bearer ${refreshedSession.accessToken || refreshedSession.token}`
        return api(originalRequest)
      } catch {
        clearAuthSession()
        window.location.href = '/login'
      }
    }

    if (error.response?.status === 401 && isRefreshRequest) {
      clearAuthSession()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
