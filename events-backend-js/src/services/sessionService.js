import { randomUUID } from 'crypto'
import { and, eq, isNull, gt } from 'drizzle-orm'
import { db } from '../db/index.js'
import { authSessions } from '../db/schema.js'
import { hashToken } from './tokenService.js'

const now = () => new Date()

const normalizeDate = (value) => {
  if (value instanceof Date) return value
  return new Date(value)
}

export const createSession = async ({ userId, refreshToken, expiresAt, userAgent = null, ipAddress = null, sessionFamily = null, sessionId = null }) => {
  const id = sessionId || randomUUID()
  const familyId = sessionFamily || id
  const session = {
    id,
    session_family: familyId,
    user_id: Number(userId),
    refresh_token_hash: hashToken(refreshToken),
    user_agent: userAgent ? String(userAgent).slice(0, 255) : null,
    ip_address: ipAddress ? String(ipAddress).slice(0, 64) : null,
    expires_at: normalizeDate(expiresAt),
  }

  await db.insert(authSessions).values(session)
  return findSessionById(id)
}

export const findSessionById = async (sessionId) => {
  const rows = await db.select().from(authSessions).where(eq(authSessions.id, String(sessionId))).limit(1)
  return rows[0] || null
}

export const findActiveSessionById = async (sessionId) => {
  const rows = await db.select().from(authSessions).where(and(
    eq(authSessions.id, String(sessionId)),
    isNull(authSessions.revoked_at),
    gt(authSessions.expires_at, now()),
  )).limit(1)

  return rows[0] || null
}

export const touchSession = async (sessionId) => {
  await db.update(authSessions)
    .set({ last_seen_at: now() })
    .where(eq(authSessions.id, String(sessionId)))
}

export const revokeSessionById = async (sessionId, reason = 'revoked') => {
  await db.update(authSessions)
    .set({ revoked_at: now(), revoke_reason: reason })
    .where(and(eq(authSessions.id, String(sessionId)), isNull(authSessions.revoked_at)))
}

export const revokeAllUserSessions = async (userId, reason = 'revoked') => {
  await db.update(authSessions)
    .set({ revoked_at: now(), revoke_reason: reason })
    .where(and(eq(authSessions.user_id, Number(userId)), isNull(authSessions.revoked_at)))
}

export const revokeSessionFamily = async (familyId, reason = 'family_revoked') => {
  await db.update(authSessions)
    .set({ revoked_at: now(), revoke_reason: reason })
    .where(and(eq(authSessions.session_family, String(familyId)), isNull(authSessions.revoked_at)))
}

export const rotateSession = async ({
  session,
  refreshToken,
  expiresAt,
  userAgent = null,
  ipAddress = null,
  keepSessionFamily = false,
  revokeReason = 'refresh_rotated',
}) => {
  if (session?.id) {
    await revokeSessionById(session.id, revokeReason)
  }

  return createSession({
    userId: session.user_id,
    refreshToken,
    expiresAt,
    userAgent,
    ipAddress,
    sessionFamily: keepSessionFamily ? session.session_family : null,
  })
}

export const verifyRefreshTokenAgainstSession = async ({ session, refreshToken }) => {
  if (!session) {
    return { valid: false, reason: 'session_not_found' }
  }

  if (session.revoked_at) {
    return { valid: false, reason: 'session_revoked' }
  }

  if (normalizeDate(session.expires_at).getTime() <= Date.now()) {
    return { valid: false, reason: 'session_expired' }
  }

  if (session.refresh_token_hash !== hashToken(refreshToken)) {
    return { valid: false, reason: 'refresh_token_mismatch' }
  }

  return { valid: true }
}

export const listActiveSessionsForUser = async (userId) => db.select().from(authSessions).where(and(
  eq(authSessions.user_id, Number(userId)),
  isNull(authSessions.revoked_at),
  gt(authSessions.expires_at, now()),
))