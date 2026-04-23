import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()

const JWT_ISSUER = process.env.JWT_ISSUER || 'hangout-api'
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'hangout-clients'
const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h'
const REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d'
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET

const ensureSecret = (secret, label) => {
  if (!secret) {
    throw new Error(`${label} is not configured`)
  }

  return secret
}

const parseDurationToMs = (value) => {
  if (typeof value === 'number') return value * 1000
  const raw = String(value || '').trim()
  const matched = raw.match(/^(\d+)([smhd])$/i)
  if (!matched) {
    return 12 * 60 * 60 * 1000
  }

  const amount = Number(matched[1])
  const unit = matched[2].toLowerCase()
  const factors = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  }

  return amount * factors[unit]
}

export const getAccessTokenExpiresIn = () => ACCESS_TOKEN_EXPIRES_IN
export const getRefreshTokenExpiresIn = () => REFRESH_TOKEN_EXPIRES_IN
export const getRefreshTokenExpiresAt = () => new Date(Date.now() + parseDurationToMs(REFRESH_TOKEN_EXPIRES_IN))

export const hashToken = (value) => crypto.createHash('sha256').update(String(value || '')).digest('hex')

export const issueAccessToken = (user, { sessionId }) => jwt.sign(
  {
    id: Number(user.id),
    role: user.role,
    sid: String(sessionId),
    ver: Number(user.token_version || 0),
    typ: 'access',
  },
  ensureSecret(process.env.JWT_SECRET, 'JWT secret'),
  {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  }
)

export const issueRefreshToken = (user, { sessionId }) => jwt.sign(
  {
    id: Number(user.id),
    sid: sessionId ? String(sessionId) : 'bootstrap',
    ver: Number(user.token_version || 0),
    typ: 'refresh',
    jti: crypto.randomUUID(),
  },
  ensureSecret(REFRESH_TOKEN_SECRET, 'JWT refresh secret'),
  {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  }
)

export const verifyRefreshToken = (token) => {
  const payload = jwt.verify(token, ensureSecret(REFRESH_TOKEN_SECRET, 'JWT refresh secret'), {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  })

  if (payload.typ !== 'refresh' || !payload.sid) {
    throw new jwt.JsonWebTokenError('Invalid refresh token')
  }

  return payload
}