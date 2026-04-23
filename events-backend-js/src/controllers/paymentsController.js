import { PaymentModel } from "../models/paymentModel.js";
import { EventModel } from "../models/eventModel.js";
import { UserModel } from "../models/userModel.js";
import {
  sendCartPaymentConfirmationEmail,
  sendPaymentConfirmationEmail,
  sendRefundConfirmationEmail,
} from "../services/mailService.js";

const ensureConfirmedPaymentIntent = (value) => value === true;

export const createPayment = async (req, res, next) => {
  try {
    const { event_id, amount } = req.body;
    const user_id = req.user.id;

    const event = await EventModel.findById(event_id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const payment = await PaymentModel.create({ user_id, event_id, amount });
    res.json(payment);
  } catch (err) {
    next(err);
  }
};

export const getPaymentStatus = async (req, res, next) => {
  try {
    const user_id = Number(req.user.id);
    const event_id = Number(req.params.eventId);
    if (!event_id) return res.status(400).json({ message: "Invalid event id" });

    const event = await EventModel.findById(event_id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const price = Number(event.price ?? 0);
    if (Number.isFinite(price) && price <= 0) {
      return res.json({ requiresPayment: false, isPaid: true, isFree: true, amount: "0" });
    }

    const paid = await PaymentModel.findPaidByUserAndEvent(user_id, event_id);
    return res.json({
      requiresPayment: true,
      isPaid: !!paid,
      isFree: false,
      amount: paid?.amount ?? String(price),
    });
  } catch (err) {
    next(err);
  }
};

export const createSimpleCheckout = async (req, res, next) => {
  try {
    const user_id = Number(req.user.id);
    const event_id = Number(req.body.event_id);
    if (!event_id) {
      return res.status(400).json({ message: "event_id requis" });
    }

    const event = await EventModel.findById(event_id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const price = Number(event.price ?? 0);
    if (!Number.isFinite(price) || price <= 0) {
      return res.json({ requiresPayment: false, isFree: true, isPaid: true });
    }

    if (!ensureConfirmedPaymentIntent(req.body.confirmPayment)) {
      return res.status(400).json({ message: "Payment confirmation is required" });
    }

    const payment = await PaymentModel.markPaid({
      user_id,
      event_id,
      amount: String(price),
    });

    const user = await UserModel.findById(user_id);
    const emailResult = user?.email
      ? await sendPaymentConfirmationEmail({
          to: user.email,
          userName: user.name,
          eventTitle: event.title,
          amount: String(price),
          paymentDate: payment.payment_date || new Date(),
        })
      : { sent: false, skipped: true };

    return res.json({
      requiresPayment: true,
      isFree: false,
      isPaid: true,
      payment,
      emailSent: !!emailResult.sent,
      emailSkipped: !!emailResult.skipped,
    });
  } catch (err) {
    next(err);
  }
};

export const createCartCheckout = async (req, res, next) => {
  try {
    const user_id = Number(req.user.id);
    const rawEventIds = Array.isArray(req.body.event_ids) ? req.body.event_ids : [];
    const eventIds = [...new Set(rawEventIds.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0))];

    if (!eventIds.length) {
      return res.status(400).json({ message: "Aucun événement à payer" });
    }

    const events = await Promise.all(eventIds.map((eventId) => EventModel.findById(eventId)));
    if (events.some((event) => !event)) {
      return res.status(404).json({ message: "Un ou plusieurs événements sont introuvables" });
    }

    const payableEvents = [];
    for (const event of events) {
      const price = Number(event.price ?? 0);
      if (!Number.isFinite(price) || price <= 0) continue;

      const existing = await PaymentModel.findPaidByUserAndEvent(user_id, event.id);
      if (existing) continue;

      payableEvents.push(event);
    }

    if (payableEvents.length > 0 && !ensureConfirmedPaymentIntent(req.body.confirmPayment)) {
      return res.status(400).json({ message: "Payment confirmation is required" });
    }

    const paidEvents = [];

    for (const event of payableEvents) {
      const price = Number(event.price ?? 0);

      const payment = await PaymentModel.markPaid({
        user_id,
        event_id: event.id,
        amount: String(price),
      });

      paidEvents.push({
        event_id: event.id,
        title: event.title,
        amount: String(payment.amount ?? price),
        payment_date: payment.payment_date || new Date(),
      });
    }

    const totalPaid = paidEvents.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const user = await UserModel.findById(user_id);

    const emailResult = user?.email && paidEvents.length > 0
      ? await sendCartPaymentConfirmationEmail({
          to: user.email,
          userName: user.name,
          items: paidEvents,
          totalAmount: totalPaid.toFixed(2),
          paymentDate: new Date(),
        })
      : { sent: false, skipped: true };

    return res.json({
      paidEvents,
      totalPaid: totalPaid.toFixed(2),
      emailSent: !!emailResult.sent,
      emailSkipped: !!emailResult.skipped,
    });
  } catch (err) {
    next(err);
  }
};

export const createRefundRequest = async (req, res, next) => {
  try {
    const user_id = Number(req.user.id);
    const event_id = Number(req.body.event_id);
    if (!event_id) {
      return res.status(400).json({ message: "event_id requis" });
    }

    const event = await EventModel.findById(event_id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const price = Number(event.price ?? 0);
    if (!Number.isFinite(price) || price <= 0) {
      return res.json({ refundRequested: false, amount: "0", isFree: true });
    }

    const paid = await PaymentModel.findPaidByUserAndEvent(user_id, event_id);
    if (!paid) {
      return res.status(404).json({ message: "Aucun paiement trouvé pour cet événement" });
    }

    const user = await UserModel.findById(user_id);
    const emailResult = user?.email
      ? await sendRefundConfirmationEmail({
          to: user.email,
          userName: user.name,
          eventTitle: event.title,
          amount: paid.amount ?? String(price),
        })
      : { sent: false, skipped: true };

    return res.json({
      refundRequested: true,
      amount: paid.amount ?? String(price),
      refundDelayHours: 48,
      emailSent: !!emailResult.sent,
      emailSkipped: !!emailResult.skipped,
    });
  } catch (err) {
    next(err);
  }
};
