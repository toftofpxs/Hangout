import API from '../api/axios';

export async function checkoutEventPayment(payload) {
  const response = await API.post('/payments/checkout', payload);
  return response.data;
}

export async function createStripeCheckoutSession({ eventId, successUrl, cancelUrl }) {
  const response = await API.post('/payments/checkout', {
    event_id: Number(eventId),
    confirmPayment: true,
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
  return response.data;
}

export async function confirmStripeCheckout({ sessionId, eventId }) {
  const response = await API.post('/payments/confirm-checkout', {
    session_id: sessionId,
    event_id: Number(eventId),
  });
  return response.data;
}

export async function checkoutCartPayment(payload) {
  const response = await API.post('/payments/cart-checkout', payload);
  return response.data;
}

export async function createStripeCartCheckoutSession({ eventIds, successUrl, cancelUrl }) {
  const response = await API.post('/payments/cart-checkout/session', {
    event_ids: eventIds,
    confirmPayment: true,
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
  return response.data;
}

export async function confirmStripeCartCheckout({ sessionId, eventIds }) {
  const response = await API.post('/payments/cart-checkout/confirm', {
    session_id: sessionId,
    event_ids: eventIds,
  });
  return response.data;
}

export async function getPaymentStatus(eventId) {
  const response = await API.get(`/payments/status/${eventId}`);
  return response.data;
}

export async function requestRefund(eventId) {
  const response = await API.post('/payments/refund', { event_id: Number(eventId) });
  return response.data;
}
