import API from '../api/axios';

export async function getAdminUserStats(userId) {
  const response = await API.get(`/admin/users/${Number(userId)}/stats`);
  return response.data;
}
