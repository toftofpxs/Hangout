import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export function setOnTokenExpired(callback) {
  onTokenExpired = callback;
}

API.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
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
    const status = error?.response?.status;
    const message = error?.response?.data?.message;
    const shouldExpireSession =
      status === 401 || (status === 403 && String(message || '').toLowerCase() === 'invalid token');

    if (shouldExpireSession && typeof onTokenExpired === 'function') {
      await onTokenExpired();
    }
    return Promise.reject(error);
  }
);

export default API;
