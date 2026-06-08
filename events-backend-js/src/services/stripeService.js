import Stripe from "stripe";

let stripeClient = null;
let stripeClientKey = null;

export const getStripeClient = () => {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    const error = new Error("Stripe is not configured. Missing STRIPE_SECRET_KEY.");
    error.status = 500;
    throw error;
  }

  if (!stripeClient || stripeClientKey !== stripeSecretKey) {
    stripeClient = new Stripe(stripeSecretKey, {
      apiVersion: "2025-05-28.basil",
    });
    stripeClientKey = stripeSecretKey;
  }

  return stripeClient;
};

export const ensureStripeConfigured = () => {
  getStripeClient();
};

export const toStripeAmountCents = (amount) => {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("Invalid amount for Stripe checkout");
  }
  return Math.round(numericAmount * 100);
};
