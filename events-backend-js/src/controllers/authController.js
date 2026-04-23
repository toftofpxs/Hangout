import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import dotenv from "dotenv";
import { UserModel } from "../models/userModel.js";
import { issueAccessToken, issueRefreshToken, verifyRefreshToken, getRefreshTokenExpiresAt, getAccessTokenExpiresIn } from "../services/tokenService.js";
import {
  createSession,
  revokeAllUserSessions,
  revokeSessionById,
  revokeSessionFamily,
  rotateSession,
  findSessionById,
  listActiveSessionsForUser,
  verifyRefreshTokenAgainstSession,
} from "../services/sessionService.js";
import { writeAuditLog } from "../services/auditLogService.js";

dotenv.config();

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

const sanitizeName = (value) => String(value || "").trim().replace(/\s+/g, ' ');
const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const buildUserResponse = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  created_at: user.created_at,
});

const getClientIp = (req) => req.clientIp || req.ip || null;

const buildAuthResponse = async (user, req, sessionFamily = null) => {
  const sessionId = randomUUID()
  const refreshToken = issueRefreshToken(user, { sessionId })
  const session = await createSession({
    sessionId,
    userId: Number(user.id),
    refreshToken,
    expiresAt: getRefreshTokenExpiresAt(),
    userAgent: req.get('user-agent'),
    ipAddress: getClientIp(req),
    sessionFamily,
  })

  const accessToken = issueAccessToken(user, { sessionId: session.id })

  return {
    token: accessToken,
    accessToken,
    refreshToken,
    expiresIn: getAccessTokenExpiresIn(),
    session: {
      id: session.id,
      created_at: session.created_at,
      last_seen_at: session.last_seen_at,
      expires_at: session.expires_at,
    },
    user: buildUserResponse(user),
  }
}

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const normalizedName = sanitizeName(name);
    const normalizedEmail = normalizeEmail(email);
    const normalizedPassword = typeof password === "string" ? password.trim() : password;

    if (!normalizedName || !normalizedEmail || !normalizedPassword) {
      return res.status(400).json({ message: "Missing fields" });
    }

    if (normalizedName.length < 2 || normalizedName.length > 80) {
      return res.status(400).json({ message: "Invalid name" });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Invalid email" });
    }

    const existing = await UserModel.findByEmail(normalizedEmail);
    if (existing) {
      return res.status(400).json({ message: "Email already used" });
    }

    const password_hash = await bcrypt.hash(normalizedPassword, 10);
    const user = await UserModel.create({ name: normalizedName, email: normalizedEmail, password_hash, role: "participant" });
    const authResponse = await buildAuthResponse(user, req);

    await writeAuditLog({
      req,
      actorUserId: user.id,
      actorRole: user.role,
      action: 'auth.register',
      targetType: 'user',
      targetId: String(user.id),
      result: 'success',
    })

    res.status(201).json(authResponse);
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const normalizedPassword = typeof password === "string" ? password.trim() : password;

    if (!normalizedEmail || !normalizedPassword) {
      return res.status(400).json({ message: "Missing fields" });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Invalid email" });
    }

    const user = await UserModel.findByEmail(normalizedEmail);
    if (!user) {
      await writeAuditLog({
        req,
        action: 'auth.login',
        targetType: 'user',
        targetId: normalizedEmail,
        result: 'failure',
        metadata: { reason: 'user_not_found' },
      })
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const match = await bcrypt.compare(normalizedPassword, user.password_hash);
    if (!match) {
      await writeAuditLog({
        req,
        actorUserId: user.id,
        actorRole: user.role,
        action: 'auth.login',
        targetType: 'user',
        targetId: String(user.id),
        result: 'failure',
        metadata: { reason: 'invalid_password' },
      })
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const authResponse = await buildAuthResponse(user, req);

    await writeAuditLog({
      req,
      actorUserId: user.id,
      actorRole: user.role,
      action: 'auth.login',
      targetType: 'user',
      targetId: String(user.id),
      result: 'success',
    })

    res.json(authResponse);
  } catch (err) {
    next(err);
  }
};

export const refreshSession = async (req, res, next) => {
  try {
    const refreshToken = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken.trim() : ''
    if (!refreshToken) {
      return res.status(400).json({ message: 'Missing refresh token' })
    }

    const payload = verifyRefreshToken(refreshToken)
    const session = await findSessionById(String(payload.sid))

    if (!session) {
      await writeAuditLog({
        req,
        action: 'auth.refresh',
        targetType: 'session',
        targetId: String(payload.sid),
        result: 'failure',
        metadata: { reason: 'session_not_found' },
      })
      return res.status(401).json({ message: 'Invalid refresh token' })
    }

    const user = await UserModel.findById(Number(payload.id))
    if (!user || Number(payload.ver) !== Number(user.token_version || 0)) {
      await revokeAllUserSessions(Number(payload.id), 'token_version_changed')
      await writeAuditLog({
        req,
        actorUserId: Number(payload.id),
        action: 'auth.refresh',
        targetType: 'user',
        targetId: String(payload.id),
        result: 'denied',
        metadata: { reason: 'token_version_mismatch' },
      })
      return res.status(401).json({ message: 'Invalid refresh token' })
    }

    const verification = await verifyRefreshTokenAgainstSession({ session, refreshToken })
    if (!verification.valid) {
      if (session.session_family) {
        await revokeSessionFamily(session.session_family, verification.reason || 'refresh_replay_detected')
      }

      await writeAuditLog({
        req,
        actorUserId: user.id,
        actorRole: user.role,
        action: 'auth.refresh',
        targetType: 'session',
        targetId: String(session.id),
        result: 'denied',
        metadata: { reason: verification.reason || 'invalid_refresh_token' },
      })
      return res.status(401).json({ message: 'Invalid refresh token' })
    }

    const nextRefreshToken = issueRefreshToken(user, { sessionId: session.id })
    const nextSession = await rotateSession({
      session,
      refreshToken: nextRefreshToken,
      expiresAt: getRefreshTokenExpiresAt(),
      userAgent: req.get('user-agent'),
      ipAddress: getClientIp(req),
      keepSessionFamily: true,
    })
    const accessToken = issueAccessToken(user, { sessionId: nextSession.id })

    await writeAuditLog({
      req,
      actorUserId: user.id,
      actorRole: user.role,
      action: 'auth.refresh',
      targetType: 'session',
      targetId: String(nextSession.id),
      result: 'success',
    })

    res.json({
      token: accessToken,
      accessToken,
      refreshToken: nextRefreshToken,
      expiresIn: getAccessTokenExpiresIn(),
      session: {
        id: nextSession.id,
        created_at: nextSession.created_at,
        last_seen_at: nextSession.last_seen_at,
        expires_at: nextSession.expires_at,
      },
      user: buildUserResponse(user),
    })
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid refresh token' })
    }
    next(err)
  }
}

export const logout = async (req, res, next) => {
  try {
    const sessionId = req.auth?.sid
    if (sessionId) {
      await revokeSessionById(String(sessionId), 'logout')
    }

    await writeAuditLog({
      req,
      actorUserId: req.user?.id,
      actorRole: req.user?.role,
      action: 'auth.logout',
      targetType: 'session',
      targetId: sessionId ? String(sessionId) : null,
      result: 'success',
    })

    res.json({ message: 'Logged out successfully' })
  } catch (err) {
    next(err)
  }
}

export const logoutAll = async (req, res, next) => {
  try {
    await revokeAllUserSessions(Number(req.user.id), 'logout_all')

    await writeAuditLog({
      req,
      actorUserId: req.user?.id,
      actorRole: req.user?.role,
      action: 'auth.logout_all',
      targetType: 'user',
      targetId: String(req.user.id),
      result: 'success',
    })

    res.json({ message: 'All sessions revoked successfully' })
  } catch (err) {
    next(err)
  }
}

export const listSessions = async (req, res, next) => {
  try {
    const sessions = await listActiveSessionsForUser(Number(req.user.id))
    res.json(sessions.map((session) => ({
      id: session.id,
      created_at: session.created_at,
      last_seen_at: session.last_seen_at,
      expires_at: session.expires_at,
      user_agent: session.user_agent,
      ip_address: session.ip_address,
      current: session.id === req.auth?.sid,
    })))
  } catch (err) {
    next(err)
  }
}

export const revokeSession = async (req, res, next) => {
  try {
    const targetSession = await findSessionById(String(req.params.id))
    if (!targetSession || Number(targetSession.user_id) !== Number(req.user.id)) {
      return res.status(404).json({ message: 'Session not found' })
    }

    await revokeSessionById(String(targetSession.id), 'user_revoked')
    await writeAuditLog({
      req,
      actorUserId: req.user?.id,
      actorRole: req.user?.role,
      action: 'auth.session.revoke',
      targetType: 'session',
      targetId: String(targetSession.id),
      result: 'success',
    })

    res.json({ message: 'Session revoked successfully' })
  } catch (err) {
    next(err)
  }
}
