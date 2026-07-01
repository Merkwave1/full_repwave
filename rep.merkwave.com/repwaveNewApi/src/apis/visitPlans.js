import { api } from '../utils/axiosInstance.js';

function toDateOnly(value) {
  if (value == null || value === '') return null;
  const str = String(value);
  return str.length >= 10 ? str.slice(0, 10) : str;
}

function parseSelectedDays(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === '') return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapStatusToApi(status) {
  const raw = String(status ?? 'active');
  if (raw === 'Active') return 'active';
  if (raw === 'Paused') return 'paused';
  return raw.toLowerCase();
}

function mapStatusFromApi(status) {
  const raw = String(status ?? 'active').toLowerCase();
  if (raw === 'active') return 'Active';
  if (raw === 'paused') return 'Paused';
  return status;
}

function mapRecurrenceToApi(type) {
  const raw = String(type ?? 'weekly');
  if (raw === 'Weekly') return 'weekly';
  return raw.toLowerCase();
}

function mapRecurrenceFromApi(type) {
  const raw = String(type ?? 'weekly').toLowerCase();
  if (raw === 'weekly') return 'Weekly';
  return type;
}

/** Map form / legacy PHP fields → .NET UpsertVisitPlanRequest */
export function normalizeVisitPlanPayload(formData) {
  const selectedRaw =
    formData.visit_plan_selected_days ?? formData.selected_days;
  let selectedDays = selectedRaw;
  if (Array.isArray(selectedDays)) {
    selectedDays = JSON.stringify(selectedDays);
  } else if (selectedDays == null || selectedDays === '') {
    selectedDays = '[]';
  }

  return {
    name: String(formData.visit_plan_name ?? formData.name ?? '').trim(),
    description:
      formData.visit_plan_description ?? formData.description ?? null,
    user_id:
      formData.user_id != null && formData.user_id !== ''
        ? parseInt(formData.user_id, 10)
        : null,
    status: mapStatusToApi(formData.visit_plan_status ?? formData.status),
    start_date: toDateOnly(
      formData.visit_plan_start_date ?? formData.start_date,
    ),
    end_date: toDateOnly(formData.visit_plan_end_date ?? formData.end_date),
    recurrence_type: mapRecurrenceToApi(
      formData.visit_plan_recurrence_type ?? formData.recurrence_type,
    ),
    selected_days: selectedDays,
    repeat_every:
      parseInt(
        formData.visit_plan_repeat_every ?? formData.repeat_every ?? 1,
        10,
      ) || 1,
  };
}

/** Map .NET VisitPlanDto → legacy UI fields */
export function normalizeVisitPlanFromApi(row) {
  if (!row || typeof row !== 'object') return row;
  return {
    ...row,
    visit_plan_id: row.visit_plan_id ?? row.visitPlanId,
    visit_plan_name: row.visit_plan_name ?? row.visitPlanName ?? '',
    visit_plan_description:
      row.visit_plan_description ?? row.visitPlanDescription ?? '',
    user_id: row.user_id ?? row.userId ?? '',
    user_name: row.user_name ?? row.userName ?? '',
    visit_plan_status: mapStatusFromApi(
      row.visit_plan_status ?? row.visitPlanStatus,
    ),
    visit_plan_start_date:
      row.visit_plan_start_date ?? row.visitPlanStartDate ?? '',
    visit_plan_end_date: row.visit_plan_end_date ?? row.visitPlanEndDate ?? '',
    visit_plan_recurrence_type: mapRecurrenceFromApi(
      row.visit_plan_recurrence_type ?? row.visitPlanRecurrenceType,
    ),
    visit_plan_selected_days: parseSelectedDays(
      row.visit_plan_selected_days ?? row.visitPlanSelectedDays,
    ),
    visit_plan_repeat_every:
      row.visit_plan_repeat_every ?? row.visitPlanRepeatEvery ?? 1,
    visit_plan_created_at:
      row.visit_plan_created_at ?? row.visitPlanCreatedAt ?? null,
    clients: row.clients ?? [],
  };
}

export function normalizeVisitPlanList(payload) {
  const list = Array.isArray(payload)
    ? payload
    : payload?.data ?? payload?.visit_plans ?? [];
  if (!Array.isArray(list)) return [];
  return list.map(normalizeVisitPlanFromApi);
}

export async function getAllVisitPlans(params) {
  const result = await api.get('/visit-plans', params);
  return normalizeVisitPlanList(result);
}

export async function createVisitPlan(data) {
  return api.post('/visit-plans', normalizeVisitPlanPayload(data));
}

export async function updateVisitPlan(id, data) {
  return api.put(`/visit-plans/${id}`, normalizeVisitPlanPayload(data));
}

export const deleteVisitPlan = (id) => api.delete(`/visit-plans/${id}`);

export async function addClientToVisitPlan(planId, data) {
  return api.post(`/visit-plans/${planId}/clients`, data);
}

export const removeClientFromVisitPlan = (planId, clientId) =>
  api.delete(`/visit-plans/${planId}/clients/${clientId}`);

export async function getVisitPlanDetail(id) {
  const plans = await getAllVisitPlans();
  const found = plans.find(
    (p) => String(p.visit_plan_id) === String(id),
  );
  if (found) return found;
  return api.get('/visit-plans/' + id);
}

export const addVisitPlan = createVisitPlan;
export const getAvailableClients = (params) => api.get('/clients', params);

/** Replace all client assignments for a visit plan */
export async function assignClientsToVisitPlan(planId, clientIds) {
  const ids = (Array.isArray(clientIds) ? clientIds : [])
    .map((id) => parseInt(id, 10))
    .filter((id) => Number.isFinite(id) && id > 0);

  await api.put(`/visit-plans/${planId}/clients`, {
    client_ids: ids,
  });

  return 'تم حفظ التغييرات بنجاح!';
}

export async function getAllClientsWithAssignmentStatus(params = {}) {
  const visitPlanId = params.visitPlanId ?? params.visit_plan_id;
  const clientsResult = await api.get('/clients', params);
  const clientList = Array.isArray(clientsResult)
    ? clientsResult
    : clientsResult?.clients ?? clientsResult?.data ?? [];

  let assignedIds = new Set();
  if (visitPlanId) {
    const plans = await getAllVisitPlans();
    const plan = plans.find(
      (p) => String(p.visit_plan_id) === String(visitPlanId),
    );
    assignedIds = new Set(
      (plan?.clients ?? [])
        .map((c) => c.client_id ?? c.clientId)
        .filter((id) => id != null)
        .map((id) => Number(id)),
    );
  }

  return clientList.map((client) => {
    const clientId = Number(client.clients_id ?? client.client_id);
    return {
      ...client,
      is_assigned: assignedIds.has(clientId),
    };
  });
}
