import api from './api'

export const checkoutEventPayment = async (payload) => {
  const response = await api.post('/payments/checkout', payload)
  return response.data
}

export const createStripeCheckoutSession = async (eventId) => {
  const response = await api.post('/payments/checkout', {
    event_id: Number(eventId),
    confirmPayment: true,
  })
  return response.data
}

export const confirmStripeCheckout = async ({ sessionId, eventId }) => {
  const response = await api.post('/payments/confirm-checkout', {
    session_id: sessionId,
    event_id: Number(eventId),
  })
  return response.data
}

export const checkoutCartPayment = async (payload) => {
  const response = await api.post('/payments/cart-checkout', payload)
  return response.data
}

export const getPaymentStatus = async (eventId) => {
  const response = await api.get(`/payments/status/${eventId}`)
  return response.data
}

export const requestRefund = async (eventId) => {
  const response = await api.post('/payments/refund', { event_id: eventId })
  return response.data
}
