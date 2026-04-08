// src/hooks/useVersionSync.js
import { useState, useEffect, useCallback } from 'react';
import { syncVersions } from '../services/versionSync.js';
import { useAuth } from './useAuth.js';

export const useVersionSync = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const { isAuthenticated } = useAuth();

  // Track if sync is already in progress to prevent multiple calls
  const [syncInProgress, setSyncInProgress] = useState(false);

  const performSync = useCallback(async (force = false) => {
    // Skip sync if not authenticated
    if (!isAuthenticated) {
      return { isFirstTime: false, updatedEntities: [], totalEntities: 0 };
    }

    // Check if company name exists in localStorage
    const companyName = localStorage.getItem('companyName');
    if (!companyName) {
      return { isFirstTime: false, updatedEntities: [], totalEntities: 0 };
    }

    // Avoid multiple simultaneous syncs unless forced
    if ((isLoading || syncInProgress) && !force) {
      return syncResult || { isFirstTime: false, updatedEntities: [], totalEntities: 0 };
    }

    setSyncInProgress(true);
    setIsLoading(true);
    setError(null);

    try {
      const result = await syncVersions();
      setSyncResult(result);
      setLastSyncTime(new Date());
      
      return result;
    } catch (err) {
      const errorMessage = err.message || 'Failed to sync versions';
      setError(errorMessage);
      console.error('Version sync failed:', err);
      throw err;
    } finally {
      setIsLoading(false);
      setSyncInProgress(false);
    }
  }, [isLoading, syncResult, isAuthenticated, syncInProgress]);

  // Auto-sync on mount and when authentication status changes
  useEffect(() => {
    performSync();
  }, [performSync, isAuthenticated]); // Added isAuthenticated as dependency

  return {
    isLoading,
    error,
    syncResult,
    lastSyncTime,
    performSync
  };
};
