// src/hooks/useVersionSyncContext.js
import { useContext } from 'react';
import { VersionSyncContext } from '../contexts/VersionSyncContext.jsx';

export const useVersionSyncContext = () => {
  const context = useContext(VersionSyncContext);
  if (!context) {
    throw new Error('useVersionSyncContext must be used within a VersionSyncProvider');
  }
  return context;
};
