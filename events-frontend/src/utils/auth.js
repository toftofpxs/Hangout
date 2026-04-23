// utils/auth.js
const TOKEN_KEY = 'token'
const REFRESH_TOKEN_KEY = 'refreshToken'
const USER_KEY = 'user'

export const saveToken = (token) => {
  if (!token) {
    sessionStorage.removeItem(TOKEN_KEY)
    return
  }

  sessionStorage.setItem(TOKEN_KEY, token)
}

export const getToken = () => {
  return sessionStorage.getItem(TOKEN_KEY)
}

export const removeToken = () => {
  sessionStorage.removeItem(TOKEN_KEY)
}

export const saveRefreshToken = (token) => {
  if (!token) {
    sessionStorage.removeItem(REFRESH_TOKEN_KEY)
    return
  }

  sessionStorage.setItem(REFRESH_TOKEN_KEY, token)
}

export const getRefreshToken = () => {
  return sessionStorage.getItem(REFRESH_TOKEN_KEY)
}

export const removeRefreshToken = () => {
  sessionStorage.removeItem(REFRESH_TOKEN_KEY)
}

export const saveSessionUser = (user) => {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user))
}

export const getSessionUser = () => {
  const raw = sessionStorage.getItem(USER_KEY)
  return raw ? JSON.parse(raw) : null
}

export const removeSessionUser = () => {
  sessionStorage.removeItem(USER_KEY)
}

export const saveAuthSession = ({ token, accessToken, refreshToken, user }) => {
  saveToken(accessToken || token || null)
  saveRefreshToken(refreshToken || null)
  if (user) {
    saveSessionUser(user)
  }
}

export const clearAuthSession = () => {
  removeToken()
  removeRefreshToken()
  removeSessionUser()
}

export const decodeToken = (token) => {
  try {
    const payload = token.split('.')[1]
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decodedPayload = atob(normalizedPayload)
    return JSON.parse(decodedPayload)
  } catch {
    return null
  }
}

export const isTokenExpired = (token) => {
  const decoded = decodeToken(token)
  if (!decoded || !decoded.exp) return true

  const currentTime = Date.now() / 1000
  return decoded.exp < currentTime
}