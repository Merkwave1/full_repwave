// src/contexts/VersionSyncContext.jsx
/* eslint-disable react-refresh/only-export-components */
import React, { createContext } from 'react';
import { useVersionSync } from '../hooks/useVersionSync.js';

export const VersionSyncContext = createContext(null);

export const VersionSyncProvider = ({ children }) => {
  const versionSync = useVersionSync();

  return (
    <VersionSyncContext.Provider value={versionSync}>
      {children}
    </VersionSyncContext.Provider>
  );
};
