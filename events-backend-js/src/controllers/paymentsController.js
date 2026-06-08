import { PaymentModel } from "../models/paymentModel.js";
import { EventModel } from "../models/eventModel.js";
import { UserModel } from "../models/userModel.js";
import { InscriptionModel } from "../models/inscriptionModel.js";
import {
  ensureStripeConfigured,
  getStripeClient,
  toStripeAmountCents,
} from "../services/stripeService.js";
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
    ensureStripeConfigured();
    const stripe = getStripeClient();

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

    const existingPayment = await PaymentModel.findPaidByUserAndEvent(user_id, event_id);
    if (existingPayment) {
      return res.json({
        requiresPayment: true,
        isFree: false,
        isPaid: true,
        payment: existingPayment,
      });
    }

    const requestOrigin = typeof req.headers.origin === "string" ? req.headers.origin : "";
    const frontendUrl = requestOrigin || process.env.FRONTEND_URL || "http://localhost:5173";
    const eventAmountCents = toStripeAmountCents(price);
    const user = await UserModel.findById(user_id);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${frontendUrl}/success?session_id={CHECKOUT_SESSION_ID}&event_id=${event.id}`,
      cancel_url: `${frontendUrl}/cancel?event_id=${event.id}`,
      metadata: {
        user_id: String(user_id),
        event_id: String(event.id),
      },
      client_reference_id: String(user_id),
      customer_email: user?.email || undefined,
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: eventAmountCents,
            product_data: {
              name: event.title || `Event #${event.id}`,
              description: event.description || undefined,
            },
          },
        },
      ],
    });

    return res.json({
      requiresPayment: true,
      isFree: false,
      isPaid: false,
      checkoutUrl: session.url,
      sessionId: session.id,
      expiresAt: session.expires_at,
    });
  } catch (err) {
    if (err?.message === "Stripe is not configured. Missing STRIPE_SECRET_KEY.") {
      return res.status(503).json({ message: "Stripe n'est pas configure. Ajoute STRIPE_SECRET_KEY dans le .env backend." });
    }
    if (err?.type?.startsWith?.("Stripe")) {
      return res.status(502).json({ message: "Erreur Stripe lors de la creation de session" });
    }
    next(err);
  }
};

export const confirmStripeCheckoutSession = async (req, res, next) => {
  try {
    ensureStripeConfigured();
    const stripe = getStripeClient();

    const user_id = Number(req.user.id);
    const sessionId = String(req.body?.session_id || "").trim();
    const requestedEventId = Number(req.body?.event_id);

    if (!sessionId) {
      return res.status(400).json({ message: "session_id requis" });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session || session.mode !== "payment") {
      return res.status(404).json({ message: "Session Stripe introuvable" });
    }

    const metadataUserId = Number(session?.metadata?.user_id);
    const metadataEventId = Number(session?.metadata?.event_id);

    if (metadataUserId && metadataUserId !== user_id) {
      return res.status(403).json({ message: "Session Stripe non autorisee" });
    }

    const event_id = requestedEventId || metadataEventId;
    if (!event_id) {
      return res.status(400).json({ message: "event_id manquant dans la session" });
    }

    if (requestedEventId && metadataEventId && requestedEventId !== metadataEventId) {
      return res.status(400).json({ message: "event_id incoherent avec la session Stripe" });
    }

    if (session.payment_status !== "paid") {
      return res.status(409).json({
        message: "Paiement non confirme par Stripe",
        confirmed: false,
        paymentStatus: session.payment_status,
      });
    }

    const foundEvent = await EventModel.findById(event_id);
    if (!foundEvent) {
      return res.status(404).json({ message: "Event not found" });
    }

    const amountFromSession = Number(session?.amount_total ?? 0) / 100;
    const fallbackAmount = Number(foundEvent.price ?? 0);
    const amountToStore = Number.isFinite(amountFromSession) && amountFromSession > 0
      ? amountFromSession
      : fallbackAmount;

    const existingPayment = await PaymentModel.findPaidByUserAndEvent(user_id, event_id);
    const payment = existingPayment || await PaymentModel.markPaid({
      user_id,
      event_id,
      amount: String(amountToStore),
    });

    const inscription = await InscriptionModel.create({ user_id, event_id });

    if (!existingPayment) {
      const user = await UserModel.findById(user_id);
      if (user?.email) {
        await sendPaymentConfirmationEmail({
          to: user.email,
          userName: user.name,
          eventTitle: foundEvent.title,
          amount: String(payment.amount ?? amountToStore),
          paymentDate: payment.payment_date || new Date(),
        });
      }
    }

    return res.json({
      confirmed: true,
      isPaid: true,
      payment,
      inscription,
      event_id,
    });
  } catch (err) {
    if (err?.type?.startsWith?.("Stripe")) {
      return res.status(502).json({ message: "Erreur Stripe lors de la verification de session" });
    }
    next(err);
  }
};

export const handleStripeWebhook = async (req, res) => {
  try {
    ensureStripeConfigured();
    const stripe = getStripeClient();

    const signature = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      return res.status(400).json({ message: "Webhook signature or secret is missing" });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    } catch {
      return res.status(400).json({ message: "Invalid webhook signature" });
    }

    if (event.type !== "checkout.session.completed") {
      return res.json({ received: true, ignored: true });
    }

    const session = event.data.object;
    const user_id = Number(session?.metadata?.user_id);
    const event_id = Number(session?.metadata?.event_id);

    if (!user_id || !event_id) {
      return res.status(400).json({ message: "Missing metadata in checkout session" });
    }

    const foundEvent = await EventModel.findById(event_id);
    if (!foundEvent) {
      return res.status(404).json({ message: "Event not found for webhook session" });
    }

    const amountFromSession = Number(session?.amount_total ?? 0) / 100;
    const fallbackAmount = Number(foundEvent.price ?? 0);
    const amountToStore = Number.isFinite(amountFromSession) && amountFromSession > 0
      ? amountFromSession
      : fallbackAmount;

    const existingPayment = await PaymentModel.findPaidByUserAndEvent(user_id, event_id);
    const payment = existingPayment || await PaymentModel.markPaid({
      user_id,
      event_id,
      amount: String(amountToStore),
    });

    await InscriptionModel.create({ user_id, event_id });

    if (!existingPayment) {
      const user = await UserModel.findById(user_id);
      if (user?.email) {
        await sendPaymentConfirmationEmail({
          to: user.email,
          userName: user.name,
          eventTitle: foundEvent.title,
          amount: String(payment.amount ?? amountToStore),
          paymentDate: payment.payment_date || new Date(),
        });
      }
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("Stripe webhook processing error:", err);
    return res.status(500).json({ message: "Webhook processing failed" });
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
