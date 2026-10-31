import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('brightloop_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('brightloop_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuthChange = () => {
      const savedUser = localStorage.getItem('brightloop_user');
      const savedToken = localStorage.getItem('brightloop_token');
      setUser(savedUser ? JSON.parse(savedUser) : null);
      setToken(savedToken || null);
    };

    window.addEventListener('auth_state_change', handleAuthChange);
    return () => window.removeEventListener('auth_state_change', handleAuthChange);
  }, []);

  useEffect(() => {
    if (token) {
      api.get('/auth/me')
        .then((res) => {
          setUser(res.data);
          localStorage.setItem('brightloop_user', JSON.stringify(res.data));
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { access_token, user: userData } = res.data;
    localStorage.setItem('brightloop_token', access_token);
    localStorage.setItem('brightloop_user', JSON.stringify(userData));
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const signup = async (formData) => {
    const res = await api.post('/auth/register', formData);
    const { access_token, user: userData } = res.data;
    localStorage.setItem('brightloop_token', access_token);
    localStorage.setItem('brightloop_user', JSON.stringify(userData));
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('brightloop_token');
    localStorage.removeItem('brightloop_user');
    setToken(null);
    setUser(null);
  };

  const switchDemoRole = async (roleKey) => {
    const credentials = {
      admin: { email: 'admin@brightloop.com', password: 'Brightloop@2026' },
      staff: { email: 'sarah.rep@brightloop.com', password: 'Brightloop@2026' },
      customer: { email: 'shop@cornerstore.com', password: 'Brightloop@2026' },
      enterprise: { email: 'billing@acmecorp.com', password: 'Brightloop@2026' },
    };

    const target = credentials[roleKey];
    if (target) {
      return await login(target.email, target.password);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        signup,
        logout,
        switchDemoRole,
        isAdmin: user?.role === 'admin',
        isStaff: user?.role === 'staff',
        isCustomer: user?.role === 'customer',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
