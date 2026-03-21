// src/scripts/makeAdmin.js
import 'dotenv/config'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { eq } from 'drizzle-orm'

async function main() {
  const arg = process.argv.find(a => a.startsWith('--email='))
  if (!arg) {
    console.error('❌ Merci de fournir --email=<adresse>')
    process.exit(1)
  }

  const email = arg.split('=')[1]
  console.log(`🔍 Recherche de l'utilisateur : ${email}`)

  const [u] = await db.select().from(users).where(eq(users.email, email))
  if (!u) {
    console.error(`❌ Utilisateur introuvable : ${email}`)
    process.exit(1)
  }

  if (u.role === 'admin') {
    console.log(`ℹ️ ${email} est déjà admin.`)
    process.exit(0)
  }

  await db.update(users).set({ role: 'admin' }).where(eq(users.id, u.id))
  console.log(`✅ ${email} promu en admin.`)
  console.log('⚠️ Déconnecte/reconnecte ce compte pour actualiser le JWT.')
  process.exit(0)
}

main().catch(err => {
  console.error('❌ Erreur makeAdmin :', err)
  process.exit(1)
})
