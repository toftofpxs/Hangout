// src/controllers/inscriptionsController.js
import { InscriptionModel } from "../models/inscriptionModel.js";
import { EventModel } from "../models/eventModel.js";
import { PaymentModel } from "../models/paymentModel.js";

const prepareInscription = async (user_id, event_id) => {
  const numericEventId = Number(event_id);
  if (!numericEventId) {
    return { error: { status: 400, message: "event_id requis" } };
  }

  const event = await EventModel.findById(numericEventId);
  if (!event) {
    return { error: { status: 404, message: "Event not found" } };
  }

  const eventPrice = Number(event.price ?? 0);
  if (Number.isFinite(eventPrice) && eventPrice > 0) {
    const paid = await PaymentModel.findPaidByUserAndEvent(user_id, numericEventId);
    if (!paid) {
      return {
        error: {
          status: 402,
          message: "Paiement requis avant inscription",
          code: "PAYMENT_REQUIRED",
        },
      };
    }
  }

  const eventDate = new Date(event.date);
  if (isNaN(eventDate)) {
    return { error: { status: 400, message: "Event date invalid" } };
  }
  if (eventDate < new Date()) {
    return { error: { status: 400, message: "Event already finished" } };
  }

  const already = await InscriptionModel.findByUserAndEvent(user_id, numericEventId);
  if (already) {
    return { already, event, event_id: numericEventId };
  }

  return { event, event_id: numericEventId };
};

/**
 * POST /api/inscriptions
 * body: { event_id }
 * nécessite authenticateToken
 */
export const createInscription = async (req, res, next) => {
  try {
    const { event_id } = req.body;
    const user_id = req.user.id;

    const prepared = await prepareInscription(user_id, event_id);
    if (prepared.error) {
      return res.status(prepared.error.status).json({
        message: prepared.error.message,
        code: prepared.error.code,
      });
    }

    if (prepared.already) {
      return res.status(409).json({ message: "Already registered" });
    }

    const newInscription = await InscriptionModel.create({ user_id, event_id: prepared.event_id });
    res.json(newInscription);
  } catch (err) {
    next(err);
  }
};

export const createBulkInscriptions = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const rawEventIds = Array.isArray(req.body.event_ids) ? req.body.event_ids : [];
    const eventIds = [...new Set(rawEventIds.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0))];

    if (!eventIds.length) {
      return res.status(400).json({ message: "Aucun événement à inscrire" });
    }

    const registered = [];
    const alreadyRegistered = [];
    const failed = [];

    for (const eventId of eventIds) {
      const prepared = await prepareInscription(user_id, eventId);
      if (prepared.error) {
        failed.push({ event_id: eventId, message: prepared.error.message, code: prepared.error.code });
        continue;
      }

      if (prepared.already) {
        alreadyRegistered.push({ event_id: eventId, title: prepared.event?.title || null });
        continue;
      }

      const created = await InscriptionModel.create({ user_id, event_id: prepared.event_id });
      registered.push({ event_id: prepared.event_id, title: prepared.event.title, inscription_id: created.id });
    }

    res.json({ registered, alreadyRegistered, failed });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/inscriptions/me
 * retourne { enCours: [...], passes: [...] }
 * nécessite authenticateToken
 */
export const getUserInscriptions = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const inscriptions = await InscriptionModel.findByUser(user_id);

    const now = new Date();

    // enrichir chaque inscription avec l'event
    const enriched = await Promise.all(
      inscriptions.map(async (ins) => {
        const ev = await EventModel.findById(Number(ins.event_id));
        if (!ev) return null;
        const evDate = new Date(ev.date);
        const status = evDate >= now ? "à venir" : "passé";
        return {
          ...ins,
          event: ev,
          status,
        };
      })
    );

    const filtered = enriched.filter(Boolean);
    const enCours = filtered.filter((i) => i.status === "à venir");
    const passes = filtered.filter((i) => i.status === "passé");

    res.json({ enCours, passes });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/inscriptions/:id
 * supprime l'inscription par son id (appartenance vérifiée)
 * nécessite authenticateToken
 */
export const cancelInscription = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const user_id = req.user.id;

    if (!id) return res.status(400).json({ message: "Invalid inscription id" });

    const inscription = await InscriptionModel.findByIdAndUser(id, user_id);
    if (!inscription) return res.status(404).json({ message: "Inscription not found" });

    await InscriptionModel.delete(id);
    res.json({ message: "Désinscription effectuée" });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/inscriptions/by-event/:eventId
 * supprime l'inscription du user courant pour cet event
 * nécessite authenticateToken
 */
export const cancelByEvent = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const eventId = Number(req.params.eventId);
    if (!eventId) return res.status(400).json({ message: "Invalid event id" });

    const ins = await InscriptionModel.findByUserAndEvent(user_id, eventId);
    if (!ins) return res.status(404).json({ message: "Inscription not found" });

    await InscriptionModel.delete(ins.id);
    res.json({ message: "Désinscription effectuée" });
  } catch (err) {
    next(err);
  }
};
