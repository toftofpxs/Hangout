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
  role: mysqlEnum("role", ["super_user", "admin", "organisateur", "participant"]).default("participant"),
  token_version: int("token_version").notNull().default(0),
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

/* ---------------- Auth Sessions ---------------- */
export const authSessions = mysqlTable(
  "auth_sessions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    session_family: varchar("session_family", { length: 36 }).notNull(),
    user_id: int("user_id").notNull().references(() => users.id),
    refresh_token_hash: varchar("refresh_token_hash", { length: 128 }).notNull(),
    user_agent: varchar("user_agent", { length: 255 }),
    ip_address: varchar("ip_address", { length: 64 }),
    created_at: timestamp("created_at").defaultNow(),
    last_seen_at: timestamp("last_seen_at").defaultNow(),
    expires_at: timestamp("expires_at").notNull(),
    revoked_at: timestamp("revoked_at"),
    revoke_reason: varchar("revoke_reason", { length: 120 }),
  },
  (table) => ({
    idxUser: index("auth_sessions_user_idx").on(table.user_id),
    idxFamily: index("auth_sessions_family_idx").on(table.session_family),
    uniqRefreshHash: uniqueIndex("auth_sessions_refresh_hash_unique").on(table.refresh_token_hash),
  })
);

/* ---------------- Audit Logs ---------------- */
export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    actor_user_id: int("actor_user_id").references(() => users.id),
    actor_role: varchar("actor_role", { length: 32 }),
    action: varchar("action", { length: 120 }).notNull(),
    target_type: varchar("target_type", { length: 80 }),
    target_id: varchar("target_id", { length: 120 }),
    result: mysqlEnum("result", ["success", "failure", "denied"]).notNull().default("success"),
    ip_address: varchar("ip_address", { length: 64 }),
    user_agent: varchar("user_agent", { length: 255 }),
    request_id: varchar("request_id", { length: 64 }),
    metadata_json: text("metadata_json"),
    occurred_at: timestamp("occurred_at").defaultNow(),
  },
  (table) => ({
    idxActor: index("audit_logs_actor_idx").on(table.actor_user_id),
    idxAction: index("audit_logs_action_idx").on(table.action),
    idxOccurred: index("audit_logs_occurred_idx").on(table.occurred_at),
  })
);

/* ---------------- Relations ---------------- */
export const usersRelations = relations(users, ({ many }) => ({
  events: many(events),          // un user peut organiser plusieurs events
  inscriptions: many(inscriptions),
  payments: many(payments),
  authSessions: many(authSessions),
  auditLogs: many(auditLogs),
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

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(users, {
    fields: [authSessions.user_id],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.actor_user_id],
    references: [users.id],
  }),
}));
