import api from './api'

export const checkoutEventPayment = async (payload) => {
  const response = await api.post('/payments/checkout', payload)
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
