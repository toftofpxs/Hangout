// src/db/schema.js
import {
  mysqlTable,
  int,
  varchar,
  text,
  decimal,
  timestamp,
  mysqlEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/* ---------------- Users ---------------- */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password_hash: varchar("password_hash", { length: 255 }).notNull(),
  email_verified: int("email_verified").notNull().default(0),
  email_verification_token: varchar("email_verification_token", { length: 255 }),
  email_verification_expires_at: timestamp("email_verification_expires_at"),
  role: mysqlEnum("role", ["super_user", "admin", "organisateur", "participant"]).default("participant"),
  created_at: timestamp("created_at").defaultNow(),
});

/* ---------------- Events ---------------- */
export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  location: varchar("location", { length: 255 }),
  // IMPORTANT : Drizzle attend un objet Date côté JS
  date: timestamp("date").notNull(),
  end_date: timestamp("end_date"),
  // decimal: passez des strings au modèle pour éviter les soucis de flot
  price: decimal("price", { precision: 10, scale: 2 }).default("0"),
  organizer_id: int("organizer_id").notNull().references(() => users.id),
  created_at: timestamp("created_at").defaultNow(),
  photos: text("photos"),
});

/* ---------------- Inscriptions ---------------- */
export const inscriptions = mysqlTable(
  "inscriptions",
  {
    id: int("id").autoincrement().primaryKey(),
    user_id: int("user_id").notNull().references(() => users.id),
    event_id: int("event_id").notNull().references(() => events.id),
    date_registered: timestamp("date_registered").defaultNow(),
    status: mysqlEnum("status", ["confirmed", "pending"]).default("pending"),
  },
  (table) => ({
    idxUser: index("inscriptions_user_idx").on(table.user_id),
    idxEvent: index("inscriptions_event_idx").on(table.event_id),
    // empêche les doublons user/event
    uniqUserEvent: uniqueIndex("inscriptions_user_event_unique").on(
      table.user_id,
      table.event_id
    ),
  })
);

/* ---------------- Payments ---------------- */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  user_id: int("user_id").notNull().references(() => users.id),
  event_id: int("event_id").notNull().references(() => events.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).default("0"),
  status: mysqlEnum("status", ["paid", "pending"]).default("pending"),
  payment_date: timestamp("payment_date"),
});

/* ---------------- Relations ---------------- */
export const usersRelations = relations(users, ({ many }) => ({
  events: many(events),          // un user peut organiser plusieurs events
  inscriptions: many(inscriptions),
  payments: many(payments),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  organizer: one(users, {
    fields: [events.organizer_id],
    references: [users.id],
  }),
  inscriptions: many(inscriptions),
  payments: many(payments),
}));

export const inscriptionsRelations = relations(inscriptions, ({ one }) => ({
  user: one(users, {
    fields: [inscriptions.user_id],
    references: [users.id],
  }),
  event: one(events, {
    fields: [inscriptions.event_id],
    references: [events.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.user_id],
    references: [users.id],
  }),
  event: one(events, {
    fields: [payments.event_id],
    references: [events.id],
  }),
}));
