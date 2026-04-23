import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getRefreshToken, getToken, getUser, removeToken, saveAuthSession, saveUser } from '../storage/tokenStorage';
import API, { setOnAuthRefreshed, setOnTokenExpired } from '../api/axios';

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

  const login = useCallback(async (sessionOrToken, maybeUser) => {
    const token = typeof sessionOrToken === 'string' ? sessionOrToken : (sessionOrToken?.accessToken || sessionOrToken?.token || null);
    const refreshToken = typeof sessionOrToken === 'string' ? null : (sessionOrToken?.refreshToken || null);
    const fallbackUser = sanitizeUser(typeof sessionOrToken === 'string' ? maybeUser : sessionOrToken?.user);

    await saveAuthSession({ token, accessToken: token, refreshToken, user: fallbackUser });
    setUserToken(token);

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
        const refreshToken = await getRefreshToken();
        const user = await getUser();

          if (token || refreshToken) {
          setUserToken(token);
          setUserData(user);

            if (!user && token) {
              try {
                const response = await API.get('/users/me');
                const hydratedUser = sanitizeUser(response.data);
                await updateUserData(hydratedUser);
              } catch {
                // interceptor may refresh or logout
              }
            }
        }
      } finally {
        setIsLoading(false);
      }
    };

    setOnTokenExpired(logout);
    setOnAuthRefreshed(async (session) => {
      setUserToken(session?.accessToken || session?.token || null);
      if (session?.user) {
        await updateUserData(session.user);
      }
    });
    checkToken();

    return () => {
      setOnTokenExpired(null);
      setOnAuthRefreshed(null);
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
