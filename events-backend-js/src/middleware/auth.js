import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { UserModel } from '../models/userModel.js';
import { findActiveSessionById, touchSession } from '../services/sessionService.js';
dotenv.config();

const JWT_ISSUER = process.env.JWT_ISSUER || 'hangout-api';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'hangout-clients';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const hasBearerToken = typeof authHeader === 'string' && authHeader.startsWith('Bearer ');
  const token = hasBearerToken ? authHeader.slice(7).trim() : null;
  if (!token) return res.status(401).json({ message: 'Missing token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    if (payload.typ !== 'access' || !payload.sid) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const user = await UserModel.findById(Number(payload.id));
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    if (Number(payload.ver) !== Number(user.token_version || 0)) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const session = await findActiveSessionById(String(payload.sid));
    if (!session || Number(session.user_id) !== Number(user.id)) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.auth = payload;
    req.user = {
      id: Number(user.id),
      role: user.role,
      email: user.email,
      name: user.name,
    };
    req.session = session;

    await touchSession(String(payload.sid));
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
