import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getToken, getUser, removeToken, saveToken, saveUser } from '../storage/tokenStorage';
import API, { setOnTokenExpired } from '../api/axios';

const AuthContext = createContext(null);

function sanitizeUser(user) {
  if (!user || typeof user !== 'object') return null;
  const { id, name, email, role, created_at } = user;
  return { id, name, email, role, created_at };
}

export function AuthProvider({ children }) {
  const [userToken, setUserToken] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const updateUserData = useCallback(async (user) => {
    const normalizedUser = sanitizeUser(user);
    await saveUser(normalizedUser);
    setUserData(normalizedUser);
  }, []);

  const logout = useCallback(async () => {
    await removeToken();
    setUserToken(null);
    setUserData(null);
  }, []);

  const login = useCallback(async (token, user) => {
    await saveToken(token);
    setUserToken(token);

    const fallbackUser = sanitizeUser(user);

    try {
      const response = await API.get('/users/me');
      const hydratedUser = sanitizeUser(response.data) || fallbackUser;
      await updateUserData(hydratedUser);
    } catch {
      await updateUserData(fallbackUser);
    }
  }, [updateUserData]);

  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await getToken();
        const user = await getUser();

        if (token) {
          setUserToken(token);
          setUserData(user);
        }
      } finally {
        setIsLoading(false);
      }
    };

    setOnTokenExpired(logout);
    checkToken();

    return () => {
      setOnTokenExpired(null);
    };
  }, [logout]);

  const value = useMemo(
    () => ({
      userToken,
      userData,
      isLoading,
      login,
      updateUserData,
      logout,
    }),
    [userToken, userData, isLoading, login, updateUserData, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
