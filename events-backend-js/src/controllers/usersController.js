// src/controllers/usersController.js
import { UserModel } from '../models/userModel.js'

export const listUsers = async (req, res, next) => {
  try {
    const users = await UserModel.findAll()
    // ne renvoie pas le hash
    res.json(users.map(u => ({
      id: u.id, name: u.name, email: u.email, role: u.role, created_at: u.created_at
    })))
  } catch (err) { next(err) }
}

export const getMe = async (req, res, next) => {
  try {
    const user = await UserModel.findById(Number(req.user.id))
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, created_at: user.created_at })
  } catch (err) { next(err) }
}

export const getUserById = async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' })
    const user = await UserModel.findById(id)
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, created_at: user.created_at })
  } catch (err) { next(err) }
}
