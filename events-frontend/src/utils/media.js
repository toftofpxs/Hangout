const FALLBACK_API_URL = 'http://localhost:4000/api'

function normalizeBaseUrl(value) {
  if (!value || typeof value !== 'string') return ''
  return value.trim().replace(/\\+/g, '/').replace(/\/+$/, '')
}

function upgradeToHttpsWhenNeeded(urlValue) {
  if (!urlValue || typeof window === 'undefined') return urlValue
  if (window.location.protocol !== 'https:') return urlValue
  if (!/^http:\/\//i.test(urlValue)) return urlValue

  try {
    const parsed = new URL(urlValue)
    const isLocalHost = /^(localhost|127\.0\.0\.1)$/i.test(parsed.hostname)
    if (isLocalHost) return urlValue
    parsed.protocol = 'https:'
    return parsed.toString()
  } catch {
    return urlValue
  }
}

function normalizeMediaPath(mediaPath) {
  if (!mediaPath || typeof mediaPath !== 'string') return ''
  const trimmed = mediaPath.trim().replace(/\\+/g, '/')

  // Compatibilité anciens chemins rencontrés en base.
  if (/^\/?upload\/event\//i.test(trimmed)) {
    return trimmed.replace(/^\/?upload\/event\//i, '/uploads/events/')
  }

  if (/^\/?uploads\/event\//i.test(trimmed)) {
    return trimmed.replace(/^\/?uploads\/event\//i, '/uploads/events/')
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

function resolveApiUrl() {
  const raw = import.meta.env.VITE_API_URL || FALLBACK_API_URL

  try {
    const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
    const parsed = new URL(raw, baseOrigin)
    const resolved = normalizeBaseUrl(`${parsed.origin}${parsed.pathname}`)
    return normalizeBaseUrl(upgradeToHttpsWhenNeeded(resolved))
  } catch {
    return normalizeBaseUrl(upgradeToHttpsWhenNeeded(raw))
  }
}

export function getUploadsBaseUrl() {
  const explicitUploadsBase = normalizeBaseUrl(import.meta.env.VITE_UPLOADS_BASE_URL)
  if (explicitUploadsBase) return normalizeBaseUrl(upgradeToHttpsWhenNeeded(explicitUploadsBase))

  const apiUrl = resolveApiUrl()
  return normalizeBaseUrl(upgradeToHttpsWhenNeeded(apiUrl.replace(/\/api\/?$/, '')))
}

export function toAbsoluteMediaUrl(mediaPath) {
  if (!mediaPath || typeof mediaPath !== 'string') return null
  if (/^https?:\/\//i.test(mediaPath)) return upgradeToHttpsWhenNeeded(mediaPath)

  const baseUrl = getUploadsBaseUrl()
  const normalizedPath = normalizeMediaPath(mediaPath)

  return `${baseUrl}${normalizedPath}`
}
