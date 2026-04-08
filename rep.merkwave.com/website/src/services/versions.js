// src/services/versions.js
import { apiClient } from '../utils/apiClient';

// New canonical key requested by user; keep legacy for backward compatibility
const LS_KEY = 'Versions';
// Legacy key retained only for one-time migration cleanup; no longer written
const LS_KEY_LEGACY = 'dataVersions';
const LS_LAST_FETCH = 'Versions_lastFetched';


export function getLocalVersions() {
  try {
    const raw = localStorage.getItem(LS_KEY) || localStorage.getItem(LS_KEY_LEGACY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

export function setLocalVersions(versions) {
  try {
    const payload = JSON.stringify(versions || {});
    localStorage.setItem(LS_KEY, payload);
  // Remove legacy duplicate if it exists (we've migrated away from it)
  try { localStorage.removeItem(LS_KEY_LEGACY); } catch { /* noop */ }
  } catch {
    // ignore
  }
}

export async function fetchRemoteVersions() {
  const res = await apiClient.get('versions/get_all.php');
  // backend returns { status: 'success', message: { entity: {version, updated_at}, ... } }
  let payload = null;
  if (res && res.status === 'success') {
    payload = res.message ?? res.data ?? res.result ?? null;
  } else {
    payload = res;
  }
  // Normalize to object map { entity: {version, updated_at} }
  if (Array.isArray(payload)) {
    const map = {};
    for (const item of payload) {
      const key = item?.entity || item?.name || item?.key;
      if (!key) continue;
      map[key] = { version: Number(item?.version ?? item?.value ?? 0), updated_at: item?.updated_at || item?.updatedAt || null };
    }
    return map;
  }
  if (payload && typeof payload === 'object') return payload;
  return {};
}

export function diffVersions(localV = {}, remoteV = {}) {
  // Accept array or object; convert arrays to map first
  const toMap = (v) => {
    if (!v) return {};
    if (Array.isArray(v)) {
      const m = {};
      for (const item of v) {
        const key = item?.entity || item?.name || item?.key;
        if (!key) continue;
        m[key] = { version: Number(item?.version ?? item?.value ?? 0), updated_at: item?.updated_at || item?.updatedAt || null };
      }
      return m;
    }
    return v;
  };
  const localMap = toMap(localV);
  const remoteMap = toMap(remoteV);
  const changed = [];
  const allKeys = new Set([...Object.keys(remoteMap), ...Object.keys(localMap)]);
  for (const k of allKeys) {
    const lv = localMap[k]?.version ?? localMap[k];
    const rv = remoteMap[k]?.version ?? remoteMap[k];
    if (typeof rv === 'number' && lv !== rv) changed.push(k);
  }
  return changed;
}

// Throttled refresh function: force to bypass throttle
export async function refreshVersions(force = false, minIntervalMs = 60_000) {
  try {
    if (!force) {
      const last = Number(localStorage.getItem(LS_LAST_FETCH) || 0);
      if (last && Date.now() - last < minIntervalMs) {
        // Skip frequent calls
        const current = getLocalVersions();
        return { versions: current, changed: [] };
      }
    }

    // Ensure we have a company name; without it apiClient builds base auth URL only
    const companyName = localStorage.getItem('companyName');
    if (!companyName) return { versions: getLocalVersions(), changed: [] };

    const previous = getLocalVersions();
    const remote = await fetchRemoteVersions();
    const changed = diffVersions(previous, remote);
  setLocalVersions(remote);
  try { localStorage.setItem(LS_LAST_FETCH, String(Date.now())); } catch { /* noop */ }
  // Ensure legacy key gone after refresh
  try { localStorage.removeItem(LS_KEY_LEGACY); } catch { /* noop */ }
    // Emit event for listeners
    try {
      const evt = new CustomEvent('versions:updated', { detail: { changed, previous, current: remote } });
      window.dispatchEvent(evt);
    } catch { /* noop */ }
    return { versions: remote, changed };
  } catch {
    const fallback = getLocalVersions();
    return { versions: fallback, changed: [] };
  }
}
