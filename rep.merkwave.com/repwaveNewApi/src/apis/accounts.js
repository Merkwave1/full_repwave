import { api } from '../utils/axiosInstance.js';

// ── Chart of Accounts (COA) ────────────────────────────────────────────────
export const getAllAccounts = () => api.get('/accounts');
export const getAccountById = (id) => api.get('/accounts/' + id);
export const createAccount = (data) => api.post('/accounts', data);
export const updateAccount = (id, data) => api.put('/accounts/' + id, data);
export const deleteAccount = (id) => api.delete('/accounts/' + id);

// ── Invoice named exports (used by client statement) ───────────────────────
export const getAllInvoices = (params) => api.get('/invoices', params);
export const getInvoiceById = (id) => api.get('/invoices/' + id);
export const createInvoice = (data) => api.post('/invoices', data);
export const updateInvoiceStatus = (id, status) => api.patch('/invoices/' + id + '/status', { status });
export const deleteInvoice = (id) => api.delete('/invoices/' + id);
export const getClientAccountStatement = (clientId, params) => api.get('/invoices', { clientId, ...params });

// ── Map .NET camelCase -> component snake_case ─────────────────────────────
function mapAccount(a) {
  return {
    accounts_id: a.accountsId ?? a.accounts_id,
    code: a.code,
    name: a.name,
    type: a.type,
    sortid: a.sortId ?? a.sortid ?? 0,
  };
}

// ── Default export for components using accountsApi.getAll/add/update/delete ─
const accountsApi = {
  getAll: () =>
    api.get('/accounts')
      .then(data => ({ status: 'success', data: (Array.isArray(data) ? data : []).map(mapAccount) }))
      .catch(() => ({ status: 'error', data: [] })),

  add: (formData) =>
    api.full('post', '/accounts', {
      code: formData.code,
      name: formData.name,
      type: formData.type,
      sort_id: parseInt(formData.sortid) || 0,
    }),

  update: (formData) =>
    api.full('put', '/accounts/' + formData.accounts_id, {
      code: formData.code,
      name: formData.name,
      type: formData.type,
      sort_id: parseInt(formData.sortid) || 0,
    }),

  delete: (id) =>
    api.full('delete', '/accounts/' + id),
};

export default accountsApi;
