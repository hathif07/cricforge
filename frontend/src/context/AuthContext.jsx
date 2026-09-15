import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('cricforge_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  const persistSession = (userData, accessToken, refreshToken) => {
    localStorage.setItem('cricforge_access_token', accessToken);
    localStorage.setItem('cricforge_refresh_token', refreshToken);
    localStorage.setItem('cricforge_user', JSON.stringify(userData));
    setUser(userData);
  };

  const clearSession = () => {
    localStorage.removeItem('cricforge_access_token');
    localStorage.removeItem('cricforge_refresh_token');
    localStorage.removeItem('cricforge_user');
    setUser(null);
  };

  useEffect(() => {
    const verify = async () => {
      const token = localStorage.getItem('cricforge_access_token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get('/auth/me');
        setUser(data.data.user);
        localStorage.setItem('cricforge_user', JSON.stringify(data.data.user));
      } catch (err) {
        clearSession();
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    persistSession(data.data.user, data.data.accessToken, data.data.refreshToken);
    return data.data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    persistSession(data.data.user, data.data.accessToken, data.data.refreshToken);
    return data.data.user;
  };

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('cricforge_refresh_token');
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch (err) {
      // ignore network errors on logout
    }
    clearSession();
  }, []);

  const refreshUser = async () => {
    const { data } = await api.get('/auth/me');
    setUser(data.data.user);
    localStorage.setItem('cricforge_user', JSON.stringify(data.data.user));
  };

  const hasRole = (...roles) => {
    if (!user) return false;
    if (user.roles.includes('admin')) return true;
    return roles.some((r) => user.roles.includes(r));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
