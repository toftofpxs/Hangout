import API from '../api/axios';

export async function createBulkInscriptions(eventIds) {
  const response = await API.post('/inscriptions/bulk', { event_ids: eventIds });
  return response.data;
}
