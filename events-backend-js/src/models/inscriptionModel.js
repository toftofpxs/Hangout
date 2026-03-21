// models/InscriptionModel.js
import { db } from "../db/index.js";
import { inscriptions } from "../db/schema.js";
import { and, eq } from "drizzle-orm";

export const InscriptionModel = {
  async create({ user_id, event_id }) {
    // La contrainte unique protège déjà, mais on pré-check
    const exist = await db
      .select()
      .from(inscriptions)
      .where(and(eq(inscriptions.user_id, user_id), eq(inscriptions.event_id, event_id)));
    if (exist.length) return exist[0];

    await db.insert(inscriptions).values({ user_id, event_id, status: "confirmed" });

    const [row] = await db
      .select()
      .from(inscriptions)
      .where(and(eq(inscriptions.user_id, user_id), eq(inscriptions.event_id, event_id)));
    return row;
  },

  async findByUser(user_id) {
    return db.select().from(inscriptions).where(eq(inscriptions.user_id, user_id));
  },

  async findByIdAndUser(id, user_id) {
    const rows = await db
      .select()
      .from(inscriptions)
      .where(and(eq(inscriptions.id, id), eq(inscriptions.user_id, user_id)));
    return rows[0] || null;
  },

  async findByUserAndEvent(user_id, event_id) {
    const rows = await db
      .select()
      .from(inscriptions)
      .where(and(eq(inscriptions.user_id, user_id), eq(inscriptions.event_id, event_id)));
    return rows[0] || null;
  },

  async delete(id) {
    await db.delete(inscriptions).where(eq(inscriptions.id, id));
    return true;
  },
};
