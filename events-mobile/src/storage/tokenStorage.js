import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'userToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'userData';

export const saveToken = async (token) => {
  try {
    if (!token) {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      return;
    }

    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  } catch (error) {
    console.error('Error saving token:', error);
  }
};

export const getToken = async () => {
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error('Error reading token:', error);
    return null;
  }
};

export const saveRefreshToken = async (token) => {
  try {
    if (!token) {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      return;
    }

    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  } catch (error) {
    console.error('Error saving refresh token:', error);
  }
};

export const getRefreshToken = async () => {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Error reading refresh token:', error);
    return null;
  }
};

export const removeToken = async () => {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ]);
  } catch (error) {
    console.error('Error removing auth data:', error);
  }
};

export const saveUser = async (user) => {
  try {
    if (!user) {
      await AsyncStorage.removeItem(USER_KEY);
      return;
    }

    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Error saving user:', error);
  }
};

export const getUser = async () => {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('Error reading user:', error);
    return null;
  }
};

export const saveAuthSession = async ({ token, accessToken, refreshToken, user }) => {
  await saveToken(accessToken || token || null);
  await saveRefreshToken(refreshToken || null);
  if (user) {
    await saveUser(user);
  }
};
