import { api } from '../utils/axiosInstance.js';

export const getUserSafes = (userId) =>
  api.get('/user-safes', userId ? { userId } : undefined);

export const assignUserToSafe = (data) =>
  api.post('/user-safes', {
    user_id: data.user_id ?? data.userId,
    safe_id: data.safe_id ?? data.safeId,
  });

export const unassignUserFromSafe = (userId, safeId) =>
  api.delete(`/user-safes?userId=${userId}&safeId=${safeId}`);

function extractSafeIds(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r) => Number(r.safe_id ?? r.SafeId ?? r.safeId))
    .filter((id) => Number.isFinite(id) && id > 0);
}

/** Sync safe assignments: add new, remove deselected. */
export async function updateUserSafes(userId, safeIds) {
  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) {
    throw new Error('معرّف المستخدم غير صالح');
  }

  const desired = (Array.isArray(safeIds) ? safeIds : [])
    .map(Number)
    .filter((id) => Number.isFinite(id) && id > 0);

  const current = extractSafeIds(await getUserSafes(uid));

  const toRemove = current.filter((id) => !desired.includes(id));
  const toAdd = desired.filter((id) => !current.includes(id));

  for (const safeId of toRemove) {
    await unassignUserFromSafe(uid, safeId);
  }
  for (const safeId of toAdd) {
    await assignUserToSafe({ user_id: uid, safe_id: safeId });
  }
}
