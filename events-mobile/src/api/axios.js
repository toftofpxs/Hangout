import axios from 'axios';
import { getRefreshToken, getToken, removeToken, saveAuthSession } from '../storage/tokenStorage';

const DEFAULT_SERVER_URL = 'http://192.168.1.42:4000';

function normalizeApiBaseUrl(url) {
  const trimmed = String(url || '').trim().replace(/\/+$/, '');
  if (!trimmed) return `${DEFAULT_SERVER_URL}/api`;
  return /\/api$/i.test(trimmed) ? trimmed : `${trimmed}/api`;
}

export const API_BASE_URL = normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_URL || `${DEFAULT_SERVER_URL}/api`);
export const SERVER_BASE_URL = API_BASE_URL.replace(/\/?api\/?$/, '');
const IS_LOCALTUNNEL = /https?:\/\/[^/]*\.loca\.lt/i.test(API_BASE_URL);

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
    ...(IS_LOCALTUNNEL ? { 'bypass-tunnel-reminder': 'true' } : {}),
  },
});

let onTokenExpired = null;
let onAuthRefreshed = null;
let refreshPromise = null;

export function setOnTokenExpired(callback) {
  onTokenExpired = callback;
}

export function setOnAuthRefreshed(callback) {
  onAuthRefreshed = callback;
}

async function refreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    throw new Error('Missing refresh token');
  }

  refreshPromise = axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken }, {
    timeout: 20000,
    headers: {
      'Content-Type': 'application/json',
      ...(IS_LOCALTUNNEL ? { 'bypass-tunnel-reminder': 'true' } : {}),
    },
  })
    .then(async (response) => {
      await saveAuthSession(response.data);
      if (typeof onAuthRefreshed === 'function') {
        await onAuthRefreshed(response.data);
      }
      return response.data;
    })
    .catch(async (error) => {
      await removeToken();
      if (typeof onTokenExpired === 'function') {
        await onTokenExpired(error);
      }
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

API.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config || {};
    const status = error?.response?.status;
    const message = error?.response?.data?.message;
    const shouldExpireSession =
      status === 401 || (status === 403 && String(message || '').toLowerCase() === 'invalid token');

    const isRefreshRequest = /\/auth\/refresh$/i.test(String(originalRequest.url || ''));

    if (shouldExpireSession && !originalRequest._retry && !isRefreshRequest) {
      originalRequest._retry = true;

      try {
        const session = await refreshAccessToken();
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${session.accessToken || session.token}`;
        return API(originalRequest);
      } catch {
        // handled below by expiration callback
      }
    }

    if (shouldExpireSession && typeof onTokenExpired === 'function') {
      await onTokenExpired();
    }
    return Promise.reject(error);
  }
);

export default API;
