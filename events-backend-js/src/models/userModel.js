// src/models/userModel.js
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { eq } from 'drizzle-orm'

export const UserModel = {
  async create({ name, email, password_hash, role = 'participant' }) {
    const res = await db.insert(users).values({ name, email, password_hash, role })
    if (res.insertId) {
      const [row] = await db.select().from(users).where(eq(users.id, res.insertId))
      return row
    }
    const [last] = await db.select().from(users).where(eq(users.email, email))
    return last
  },

  async findByEmail(email) {
    const rows = await db.select().from(users).where(eq(users.email, email))
    return rows[0] || null
  },

  async findById(id) {
    const rows = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      created_at: users.created_at,
      // pas de password_hash ici
    }).from(users).where(eq(users.id, Number(id)))
    return rows[0] || null
  },

  async findAll() {
    return db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      created_at: users.created_at,
    }).from(users)
  },
}
