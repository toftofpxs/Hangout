import api from './api'

export const createEvent = async (formData) => {
  const response = await api.post('/events', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return response.data
}

export const updateEvent = async (eventId, formData) => {
  const response = await api.put(`/events/${eventId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return response.data
}

export const getEventById = async (eventId) => {
  const response = await api.get(`/events/${eventId}`)
  return response.data
}

export const getAllEvents = async () => {
  const response = await api.get('/events')
  return response.data
}

export const getMyEvents = async () => {
  const response = await api.get('/events/mine')
  return response.data
}

export const deleteEvent = async (eventId) => {
  const response = await api.delete(`/events/${eventId}`)
  return response.data
}
