import { api } from '../utils/axiosInstance.js';

export const getUserWarehouses = (userId) =>
  api.get('/user-warehouses', userId ? { userId } : undefined);

export const assignUserToWarehouse = (data) =>
  api.post('/user-warehouses', {
    user_id: data.user_id ?? data.userId,
    warehouse_id: data.warehouse_id ?? data.warehouseId,
  });

export const unassignUserFromWarehouse = (userId, warehouseId) =>
  api.delete(`/user-warehouses?userId=${userId}&warehouseId=${warehouseId}`);

function extractWarehouseIds(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r) => Number(r.warehouse_id ?? r.WarehouseId ?? r.warehouseId))
    .filter((id) => Number.isFinite(id) && id > 0);
}

/** Sync warehouse assignments: add new, remove deselected. */
export async function updateUserWarehouses(userId, warehouseIds) {
  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) {
    throw new Error('معرّف المستخدم غير صالح');
  }

  const desired = (Array.isArray(warehouseIds) ? warehouseIds : [])
    .map(Number)
    .filter((id) => Number.isFinite(id) && id > 0);

  const current = extractWarehouseIds(await getUserWarehouses(uid));

  const toRemove = current.filter((id) => !desired.includes(id));
  const toAdd = desired.filter((id) => !current.includes(id));

  for (const warehouseId of toRemove) {
    await unassignUserFromWarehouse(uid, warehouseId);
  }
  for (const warehouseId of toAdd) {
    await assignUserToWarehouse({ user_id: uid, warehouse_id: warehouseId });
  }
}
