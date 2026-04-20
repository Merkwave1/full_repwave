// src/contexts/AuthContext.jsx
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useEffect } from 'react';
// Version sync removed; no clearing via service

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isReloginModalOpen, setIsReloginModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status on mount and when localStorage changes
  useEffect(() => {
    const checkAuth = () => {
      const userData = localStorage.getItem('userData');
      // For admin system, we only need userData with valid user info
      let isAuth = false;
      
      if (userData) {
        try {
          const parsedUserData = JSON.parse(userData);
          // Check if we have valid user data with required fields
          isAuth = !!(parsedUserData && parsedUserData.users_id && parsedUserData.users_uuid);
        } catch (e) {
          console.error('Failed to parse userData:', e);
          isAuth = false;
        }
      }
      
      setIsAuthenticated(isAuth);
    };

    checkAuth();

    // Listen for storage changes (e.g., login/logout in another tab)
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  const showReloginModal = () => {
    setIsReloginModalOpen(true);
  };

  const hideReloginModal = () => {
    setIsReloginModalOpen(false);
  };

  const handleRelogin = () => {
    // Clear any stored auth data
    localStorage.removeItem('userData');
    localStorage.removeItem('companyName'); // Also clear company name if it exists
  // Legacy cleanup: leave appVersions if present (no longer used)
    
    setIsAuthenticated(false);
    
    // Redirect to login page
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
