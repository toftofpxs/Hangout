import API from '../api/axios';

export async function checkoutEventPayment(payload) {
  const response = await API.post('/payments/checkout', payload);
  return response.data;
}

export async function checkoutCartPayment(payload) {
  const response = await API.post('/payments/cart-checkout', payload);
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
