import { db } from "../db/index.js";
import { payments } from "../db/schema.js";
import { and, desc, eq } from "drizzle-orm";

export const PaymentModel = {
  async create({ user_id, event_id, amount }) {
    const paymentDate = new Date();
    const result = await db.insert(payments).values({
      user_id,
      event_id,
      amount: amount || 0,
      status: "paid",
      payment_date: paymentDate
    });
    return { id: result.insertId, user_id, event_id, amount: amount || 0, status: "paid", payment_date: paymentDate };
  },

  async findPaidByUserAndEvent(user_id, event_id) {
    const rows = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.user_id, Number(user_id)),
          eq(payments.event_id, Number(event_id)),
          eq(payments.status, "paid")
        )
      )
      .orderBy(desc(payments.id))
      .limit(1);

    return rows[0] || null;
  },

  async markPaid({ user_id, event_id, amount }) {
    const existing = await this.findPaidByUserAndEvent(user_id, event_id);
    if (existing) return existing;
    const normalizedAmount = amount == null ? "0" : String(amount);
    return this.create({ user_id, event_id, amount: normalizedAmount });
  }
};
