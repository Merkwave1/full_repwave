import { api } from '../utils/axiosInstance.js';

/** Resolve primary key from API / cache / legacy mock shapes. */
export function resolveClientId(client) {
  if (!client || typeof client !== 'object') return null;
  const raw =
    client.clients_id ??
    client.client_id ??
    client.clientsId ??
    client.id;
  if (raw === undefined || raw === null || raw === '') return null;
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function resolveClientName(client) {
  if (!client) return '';
  return (
    client.clients_company_name ??
    client.company_name ??
    client.clientsCompanyName ??
    client.name ??
    ''
  );
}

/** Normalize one client row so UI always has clients_id + clients_company_name. */
export function normalizeClientRecord(client) {
  if (!client || typeof client !== 'object') return null;
  const id = resolveClientId(client);
  const name = resolveClientName(client);
  if (!id || !name) return null;
  return {
    ...client,
    clients_id: id,
    clients_company_name: name,
  };
}

export function normalizeClientList(raw) {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
      ? raw.data
      : [];
  return list.map(normalizeClientRecord).filter(Boolean);
}

export function cacheClientsDropdown(clients) {
  const slim = normalizeClientList(clients).map(
    ({ clients_id, clients_company_name }) => ({
      clients_id,
      clients_company_name,
    }),
  );
  try {
    localStorage.setItem('appClients', JSON.stringify(slim));
  } catch {
    // Quota full — drop cache; live API is the source of truth
    try {
      localStorage.removeItem('appClients');
    } catch {
      /* ignore */
    }
  }
}

export async function getAllClients(params = {}) {
  const raw = await api.get('/clients', { page: 1, pageSize: 500, ...params });
  return normalizeClientList(raw);
}

export const getClientDetails = (id) => api.get(`/clients/${id}`);
export const createClient = (data) => api.post('/clients', data);
export const updateClient = (id, data) => api.put(`/clients/${id}`, data);
export const deleteClient = (id) => api.delete(`/clients/${id}`);

// PHP-compatible aliases
export const addClient = createClient;
export const getClientById = getClientDetails;
export const getClientReports = (params) => getAllClients(params);
