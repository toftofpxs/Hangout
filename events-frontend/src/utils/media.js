const FALLBACK_API_URL = 'http://localhost:4000/api'

function normalizeBaseUrl(value) {
  if (!value || typeof value !== 'string') return ''
  return value.trim().replace(/\/+$/, '')
}

function resolveApiUrl() {
  const raw = import.meta.env.VITE_API_URL || FALLBACK_API_URL

  try {
    const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
    const parsed = new URL(raw, baseOrigin)
    return normalizeBaseUrl(`${parsed.origin}${parsed.pathname}`)
  } catch {
    return normalizeBaseUrl(raw)
  }
}

export function getUploadsBaseUrl() {
  const explicitUploadsBase = normalizeBaseUrl(import.meta.env.VITE_UPLOADS_BASE_URL)
  if (explicitUploadsBase) return explicitUploadsBase

  const apiUrl = resolveApiUrl()
  return apiUrl.replace(/\/api\/?$/, '')
}

export function toAbsoluteMediaUrl(mediaPath) {
  if (!mediaPath || typeof mediaPath !== 'string') return null
  if (/^https?:\/\//i.test(mediaPath)) return mediaPath

  const baseUrl = getUploadsBaseUrl()
  const normalizedPath = mediaPath.startsWith('/') ? mediaPath : `/${mediaPath}`

  return `${baseUrl}${normalizedPath}`
}
