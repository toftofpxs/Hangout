import express from 'express'
import bcrypt from 'bcryptjs'
import { authenticateToken } from '../middleware/auth.js'
import { requireRole } from '../middleware/roles.js'
import { MIN_PASSWORD_LENGTH, validatePasswordStrength } from '../middleware/passwordValidator.js'
import { UserModel } from '../models/userModel.js'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { revokeAllUserSessions } from '../services/sessionService.js'
import { writeAuditLog } from '../services/auditLogService.js'

const router = express.Router()

// ----- routes fixes d'abord -----
// Mon profil
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const u = await UserModel.findById(Number(req.user.id))
    if (!u) return res.status(404).json({ message: 'User not found' })
    const { id, name, email, role, created_at } = u
    res.json({ id, name, email, role, created_at })
  } catch (e) { next(e) }
})

router.put('/me/password', authenticateToken, async (req, res, next) => {
  try {
    const id = Number(req.user.id)
    if (Number.isNaN(id)) return res.status(401).json({ message: 'Not authenticated' })

    const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword.trim() : ''
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword.trim() : ''

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' })
    }

    const passwordValidationMessage = validatePasswordStrength(newPassword)
    if (passwordValidationMessage) {
      return res.status(400).json({ message: passwordValidationMessage })
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'Le nouveau mot de passe doit être différent de l\'ancien mot de passe' })
    }

    const user = await UserModel.findByIdWithPassword(id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    const matches = await bcrypt.compare(currentPassword, user.password_hash)
    if (!matches) {
      return res.status(400).json({ message: 'Current password is incorrect' })
    }

    const password_hash = await bcrypt.hash(newPassword, 10)
    await UserModel.updatePassword(id, password_hash)
    await UserModel.incrementTokenVersion(id)
    await revokeAllUserSessions(id, 'password_changed')
    await writeAuditLog({
      req,
      actorUserId: id,
      actorRole: req.user?.role,
      action: 'user.password.change',
      targetType: 'user',
      targetId: String(id),
      result: 'success',
    })

    return res.json({ message: 'Password updated successfully' })
  } catch (e) { next(e) }
})

// Liste de tous les utilisateurs (ADMIN uniquement)
router.get('/', authenticateToken, requireRole('admin', 'super_user'), async (req, res, next) => {
  try {
    const rows = await UserModel.findAll()
    // on ne renvoie pas password_hash
    const safe = rows.map(u => ({
      id: u.id, name: u.name, email: u.email, role: u.role, created_at: u.created_at
    }))
    res.json(safe)
  } catch (e) { next(e) }
})

// ----- routes paramétrées ensuite -----
// Détail d’un user (ADMIN)
router.get('/:id', authenticateToken, requireRole('admin', 'super_user'), async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid user id' })
    const u = await UserModel.findById(id)
    if (!u) return res.status(404).json({ message: 'User not found' })
    const { name, email, role, created_at } = u
    res.json({ id, name, email, role, created_at })
  } catch (e) { next(e) }
})

export default router

// Mettre à jour mon profil (changer le pseudo)
router.put('/me', authenticateToken, async (req, res, next) => {
  try {
    const id = Number(req.user.id)
    if (Number.isNaN(id)) return res.status(401).json({ message: 'Not authenticated' })

    const { name } = req.body
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ message: 'Name is required' })
    }

    if (name.trim().length < 2 || name.trim().length > 80) {
      return res.status(400).json({ message: 'Name must contain between 2 and 80 characters' })
    }

    await db.update(users).set({ name: name.trim() }).where(eq(users.id, id))
    const updated = await UserModel.findById(id)
    res.json(updated)
  } catch (e) { next(e) }
})
