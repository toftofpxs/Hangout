import { db } from "../db/index.js";
import { users, events, inscriptions, payments } from "../db/schema.js";
import { and, desc, eq, sql } from "drizzle-orm";
import { writeAuditLog } from "../services/auditLogService.js";
import { revokeAllUserSessions } from "../services/sessionService.js";
import { UserModel } from "../models/userModel.js";

const MANAGEABLE_ROLES_BY_ADMIN = ["participant", "organisateur", "admin"];
const ALL_ROLES = ["participant", "organisateur", "admin", "super_user"];

const isAdminLike = (role) => role === "admin" || role === "super_user";

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parsePhotos = (value) => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
    if (typeof parsed === "string") return [parsed];
  } catch {
    if (typeof value === "string") return [value];
  }

  return [];
};

const canBanTarget = (actor, target) => {
  if (actor.role === "super_user") return true;
  if (actor.role === "admin") {
    return target.role !== "admin" && target.role !== "super_user";
  }
  return false;
};

const canAssignRole = (actor, target, nextRole) => {
  if (actor.role === "super_user") return ALL_ROLES.includes(nextRole);
  if (actor.role !== "admin") return false;
  if (!MANAGEABLE_ROLES_BY_ADMIN.includes(nextRole)) return false;

  // Un admin basique ne peut pas rétrograder un autre admin / super_user
  if ((target.role === "admin" || target.role === "super_user") && nextRole !== target.role) {
    return false;
  }

  return true;
};

export const listEventsSummary = async (req, res, next) => {
  try {
    if (!req.user || !isAdminLike(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const rows = await db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        date: events.date,
        end_date: events.end_date,
        location: events.location,
        price: events.price,
        photos: events.photos,
        organizer_id: events.organizer_id,
        organizer_name: users.name,
        organizer_email: users.email,
        participantsCount: sql`count(${inscriptions.id})`.mapWith(Number),
      })
      .from(events)
      .leftJoin(users, eq(events.organizer_id, users.id))
      .leftJoin(inscriptions, eq(inscriptions.event_id, events.id))
      .groupBy(
        events.id,
        events.title,
        events.description,
        events.date,
        events.end_date,
        events.location,
        events.price,
        events.photos,
        events.organizer_id,
        users.id,
        users.name,
        users.email
      )
      .orderBy(events.date);

    res.json(
      rows.map((row) => ({
        ...row,
        photos: parsePhotos(row.photos),
      }))
    );

    await writeAuditLog({
      req,
      actorUserId: req.user?.id,
      actorRole: req.user?.role,
      action: 'admin.events.summary.read',
      targetType: 'event',
      targetId: '*',
      result: 'success',
    });
  } catch (err) {
    next(err);
  }
};

/* -------------------- UTILISATEURS ADMIN -------------------- */
export const listUsers = async (req, res, next) => {
  try {
    if (!req.user || !isAdminLike(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const rows = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role, created_at: users.created_at })
      .from(users)
      .orderBy(users.created_at);

    res.json(rows);

    await writeAuditLog({
      req,
      actorUserId: req.user?.id,
      actorRole: req.user?.role,
      action: 'admin.users.list',
      targetType: 'user',
      targetId: '*',
      result: 'success',
    });
  } catch (err) {
    next(err);
  }
};

export const getUserStats = async (req, res, next) => {
  try {
    if (!req.user || !isAdminLike(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: "Invalid user id" });

    const target = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        created_at: users.created_at,
      })
      .from(users)
      .where(eq(users.id, id))
      .then((rows) => rows[0]);

    if (!target) return res.status(404).json({ message: "User not found" });

    const [organizedEventsStats] = await db
      .select({
        eventsCreated: sql`count(*)`.mapWith(Number),
        upcomingEvents: sql`sum(case when coalesce(${events.end_date}, ${events.date}) >= now() then 1 else 0 end)`.mapWith(Number),
        lastOrganizedEventDate: sql`max(${events.date})`,
      })
      .from(events)
      .where(eq(events.organizer_id, id));

    const [participantsOnEventsStats] = await db
      .select({
        participantsOnOrganizedEvents: sql`count(${inscriptions.id})`.mapWith(Number),
      })
      .from(inscriptions)
      .innerJoin(events, eq(inscriptions.event_id, events.id))
      .where(eq(events.organizer_id, id));

    const [revenueOnEventsStats] = await db
      .select({
        paidTransactionsOnOrganizedEvents: sql`count(${payments.id})`.mapWith(Number),
        revenueOnOrganizedEvents: sql`coalesce(sum(${payments.amount}), 0)`,
      })
      .from(payments)
      .innerJoin(events, eq(payments.event_id, events.id))
      .where(and(eq(events.organizer_id, id), eq(payments.status, "paid")));

    const [registrationStats] = await db
      .select({
        registrations: sql`count(${inscriptions.id})`.mapWith(Number),
        confirmedRegistrations: sql`sum(case when ${inscriptions.status} = 'confirmed' then 1 else 0 end)`.mapWith(Number),
        pendingRegistrations: sql`sum(case when ${inscriptions.status} = 'pending' then 1 else 0 end)`.mapWith(Number),
      })
      .from(inscriptions)
      .where(eq(inscriptions.user_id, id));

    const [paymentStats] = await db
      .select({
        payments: sql`count(${payments.id})`.mapWith(Number),
        paidPayments: sql`sum(case when ${payments.status} = 'paid' then 1 else 0 end)`.mapWith(Number),
        pendingPayments: sql`sum(case when ${payments.status} = 'pending' then 1 else 0 end)`.mapWith(Number),
        totalAmountPaid: sql`coalesce(sum(case when ${payments.status} = 'paid' then ${payments.amount} else 0 end), 0)`,
      })
      .from(payments)
      .where(eq(payments.user_id, id));

    const recentOrganizedEvents = await db
      .select({
        id: events.id,
        title: events.title,
        date: events.date,
        end_date: events.end_date,
        participantsCount: sql`count(${inscriptions.id})`.mapWith(Number),
      })
      .from(events)
      .leftJoin(inscriptions, eq(inscriptions.event_id, events.id))
      .where(eq(events.organizer_id, id))
      .groupBy(events.id, events.title, events.date, events.end_date)
      .orderBy(desc(events.date))
      .limit(5);

    res.json({
      user: target,
      stats: {
        eventsCreated: organizedEventsStats?.eventsCreated ?? 0,
        upcomingEvents: organizedEventsStats?.upcomingEvents ?? 0,
        lastOrganizedEventDate: organizedEventsStats?.lastOrganizedEventDate ?? null,
        participantsOnOrganizedEvents: participantsOnEventsStats?.participantsOnOrganizedEvents ?? 0,
        paidTransactionsOnOrganizedEvents: revenueOnEventsStats?.paidTransactionsOnOrganizedEvents ?? 0,
        revenueOnOrganizedEvents: toNumber(revenueOnEventsStats?.revenueOnOrganizedEvents),
        registrations: registrationStats?.registrations ?? 0,
        confirmedRegistrations: registrationStats?.confirmedRegistrations ?? 0,
        pendingRegistrations: registrationStats?.pendingRegistrations ?? 0,
        payments: paymentStats?.payments ?? 0,
        paidPayments: paymentStats?.paidPayments ?? 0,
        pendingPayments: paymentStats?.pendingPayments ?? 0,
        totalAmountPaid: toNumber(paymentStats?.totalAmountPaid),
      },
      recentOrganizedEvents,
    });

    await writeAuditLog({
      req,
      actorUserId: req.user?.id,
      actorRole: req.user?.role,
      action: 'admin.user.stats.read',
      targetType: 'user',
      targetId: String(id),
      result: 'success',
    });
  } catch (err) {
    next(err);
  }
};

export const promoteUser = async (req, res, next) => {
  try {
    if (!req.user || !isAdminLike(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid user id' });

    const target = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, id))
      .then((r) => r[0]);
    if (!target) return res.status(404).json({ message: 'User not found' });

    if (!canAssignRole(req.user, target, 'admin')) {
      return res.status(403).json({ message: 'Not allowed to promote this user to admin' });
    }

    await db.update(users).set({ role: 'admin' }).where(eq(users.id, id));
    await UserModel.incrementTokenVersion(id);
    await revokeAllUserSessions(id, 'role_changed_to_admin');
    const u = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role }).from(users).where(eq(users.id, id)).then(r=>r[0]);
    await writeAuditLog({
      req,
      actorUserId: req.user?.id,
      actorRole: req.user?.role,
      action: 'admin.user.promote',
      targetType: 'user',
      targetId: String(id),
      result: 'success',
      metadata: { newRole: 'admin' },
    });
    res.json(u);
  } catch (err) { next(err); }
};

export const demoteUser = async (req, res, next) => {
  try {
    if (!req.user || !isAdminLike(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid user id' });

    const target = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, id))
      .then((r) => r[0]);
    if (!target) return res.status(404).json({ message: 'User not found' });

    if (!canAssignRole(req.user, target, 'participant')) {
      return res.status(403).json({ message: 'Not allowed to demote this user' });
    }

    // demote to participant
    await db.update(users).set({ role: 'participant' }).where(eq(users.id, id));
    await UserModel.incrementTokenVersion(id);
    await revokeAllUserSessions(id, 'role_changed_to_participant');
    const u = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role }).from(users).where(eq(users.id, id)).then(r=>r[0]);
    await writeAuditLog({
      req,
      actorUserId: req.user?.id,
      actorRole: req.user?.role,
      action: 'admin.user.demote',
      targetType: 'user',
      targetId: String(id),
      result: 'success',
      metadata: { newRole: 'participant' },
    });
    res.json(u);
  } catch (err) { next(err); }
};

export const updateUser = async (req, res, next) => {
  try {
    if (!req.user || !isAdminLike(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid user id' });

    const target = await db
      .select({ id: users.id, name: users.name, role: users.role })
      .from(users)
      .where(eq(users.id, id))
      .then((r) => r[0]);
    if (!target) return res.status(404).json({ message: 'User not found' });

    const patch = {};

    if (typeof req.body.name === 'string') {
      const trimmed = req.body.name.trim();
      if (!trimmed) return res.status(400).json({ message: 'Name cannot be empty' });
      patch.name = trimmed;
    }

    if (req.body.role != null) {
      const role = String(req.body.role);
      if (!ALL_ROLES.includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }

      if (!canAssignRole(req.user, target, role)) {
        return res.status(403).json({ message: 'Not allowed to assign this role' });
      }

      patch.role = role;
    }

    if (!Object.keys(patch).length) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    await db.update(users).set(patch).where(eq(users.id, id));
    if (patch.role) {
      await UserModel.incrementTokenVersion(id);
      await revokeAllUserSessions(id, `role_changed_to_${patch.role}`);
    }
    const u = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role, created_at: users.created_at })
      .from(users)
      .where(eq(users.id, id))
      .then((r) => r[0]);

    await writeAuditLog({
      req,
      actorUserId: req.user?.id,
      actorRole: req.user?.role,
      action: 'admin.user.update',
      targetType: 'user',
      targetId: String(id),
      result: 'success',
      metadata: { fields: Object.keys(patch) },
    });

    res.json(u);
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    if (!req.user || !isAdminLike(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid user id' });

    const target = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, id)).then(r=>r[0]);
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (!canBanTarget(req.user, target)) {
      return res.status(403).json({ message: 'Only super_user can ban admin accounts' });
    }

    await revokeAllUserSessions(id, 'user_deleted_by_admin');

    // delete user's inscriptions & payments
    await db.delete(inscriptions).where(eq(inscriptions.user_id, id));
    await db.delete(payments).where(eq(payments.user_id, id));

    // delete events organized by user (and related inscriptions/payments)
    const organized = await db.select({ id: events.id }).from(events).where(eq(events.organizer_id, id));
    for (const ev of organized) {
      await db.delete(inscriptions).where(eq(inscriptions.event_id, ev.id));
      await db.delete(payments).where(eq(payments.event_id, ev.id));
    }
    await db.delete(events).where(eq(events.organizer_id, id));

    // finally delete user
    await db.delete(users).where(eq(users.id, id));

    await writeAuditLog({
      req,
      actorUserId: req.user?.id,
      actorRole: req.user?.role,
      action: 'admin.user.delete',
      targetType: 'user',
      targetId: String(id),
      result: 'success',
    });

    res.status(204).end();
  } catch (err) { next(err); }
};
