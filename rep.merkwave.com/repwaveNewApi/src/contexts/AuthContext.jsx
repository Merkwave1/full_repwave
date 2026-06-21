// src/contexts/AuthContext.jsx
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useEffect } from 'react';
import { getStoredUser, clearAuth } from '../utils/axiosInstance.js';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isReloginModalOpen, setIsReloginModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const user = getStoredUser();
      setIsAuthenticated(!!(user?.token));
    };

    checkAuth();
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  const showReloginModal = () => setIsReloginModalOpen(true);
  const hideReloginModal = () => setIsReloginModalOpen(false);

  const handleRelogin = () => {
    clearAuth();
    setIsAuthenticated(false);
    window.location.href = '/login';
  };

  const value = {
    isAuthenticated,
    setIsAuthenticated,
    isReloginModalOpen,
    showReloginModal,
    hideReloginModal,
    handleRelogin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
