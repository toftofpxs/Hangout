import api from './api'

export const createBulkInscriptions = async (eventIds) => {
  const response = await api.post('/inscriptions/bulk', { event_ids: eventIds })
  return response.data
}
