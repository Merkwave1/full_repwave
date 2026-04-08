// src/services/versionSync.js
// Version sync has been removed. Keep no-op exports to avoid breaking imports.

export async function syncVersions() {
  return { isFirstTime: false, updatedEntities: [], totalEntities: 0 };
}

export function getEntityData(entityName) {
  try {
    const raw = localStorage.getItem(`entity_${entityName}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearAllEntityData() {
  // no-op
}
