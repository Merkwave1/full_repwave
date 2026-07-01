import { api } from '../utils/axiosInstance.js';
import { getAllClients } from './clients.js';
import { getAllUsers } from './users.js';
import { getAllClientAreaTags } from './client_area_tags.js';

export const getAllVisits = (params) => api.get('/visits', params);
export const getVisitById = (id) => api.get(`/visits/${id}`);
export const createVisit = (data) => api.post('/visits', data);
export const updateVisit = (id, data) => api.put(`/visits/${id}`, data);
export const deleteVisit = (id) => api.delete(`/visits/${id}`);

// ── Visit reports aggregator (.NET API) ───────────────────────────────────────

function normalizeStatus(status) {
  return String(status ?? '').toLowerCase();
}

function isCompleted(status) {
  const s = normalizeStatus(status);
  return s === 'completed' || s === 'complete';
}

function isStarted(status) {
  const s = normalizeStatus(status);
  return s === 'started' || s === 'in progress' || s === 'in_progress';
}

function isCancelled(status) {
  const s = normalizeStatus(status);
  return s === 'cancelled' || s === 'canceled';
}

function visitDurationMinutes(visit) {
  if (!visit?.visits_start_time || !visit?.visits_end_time) return null;
  const start = new Date(visit.visits_start_time);
  const end = new Date(visit.visits_end_time);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return Math.max(1, Math.round((end - start) / 60000));
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a, b) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function isInRange(date, from, to) {
  const t = new Date(date).getTime();
  return t >= from.getTime() && t <= to.getTime();
}

async function fetchAllVisits() {
  const pageSize = 200;
  let page = 1;
  const all = [];

  while (page <= 50) {
    const batch = await api.get('/visits', { page, pageSize });
    const items = Array.isArray(batch) ? batch : [];
    all.push(...items);
    if (items.length < pageSize) break;
    page += 1;
  }

  return all;
}

let reportCache = null;

async function loadReportContext() {
  if (reportCache) return reportCache;

  const [visits, clientsRaw, usersRaw, areaTagsRaw] = await Promise.all([
    fetchAllVisits(),
    getAllClients({ page: 1, pageSize: 500 }),
    getAllUsers(),
    getAllClientAreaTags().catch(() => []),
  ]);

  const clients = Array.isArray(clientsRaw) ? clientsRaw : [];
  const users = Array.isArray(usersRaw) ? usersRaw : [];
  const areaTags = Array.isArray(areaTagsRaw) ? areaTagsRaw : [];

  const clientMap = {};
  clients.forEach((c) => {
    const id = c.clients_id ?? c.client_id;
    if (id) clientMap[id] = c;
  });

  const userMap = {};
  users.forEach((u) => {
    userMap[u.users_id] = u;
  });

  const areaTagMap = {};
  areaTags.forEach((t) => {
    const id = t.client_area_tag_id ?? t.clientAreaTagId;
    const name = t.client_area_tag_name ?? t.clientAreaTagName;
    if (id) areaTagMap[id] = name || `منطقة ${id}`;
  });

  reportCache = { visits, clientMap, userMap, areaTagMap };
  return reportCache;
}

function buildOverview(visits) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(todayStart);
  monthStart.setMonth(monthStart.getMonth() - 1);

  const completed = visits.filter((v) => isCompleted(v.visits_status));
  const started = visits.filter((v) => isStarted(v.visits_status));
  const cancelled = visits.filter((v) => isCancelled(v.visits_status));

  const durations = completed
    .map(visitDurationMinutes)
    .filter((d) => d !== null);
  const avgDuration = durations.length
    ? durations.reduce((s, d) => s + d, 0) / durations.length
    : 0;

  const visitDate = (v) => new Date(v.visits_start_time || v.visits_created_at);

  return {
    total_visits: visits.length,
    completed_visits: completed.length,
    started_visits: started.length,
    cancelled_visits: cancelled.length,
    today_visits: visits.filter((v) => isSameDay(visitDate(v), now)).length,
    this_week_visits: visits.filter((v) => isInRange(visitDate(v), weekStart, now)).length,
    this_month_visits: visits.filter((v) => isInRange(visitDate(v), monthStart, now)).length,
    avg_visit_duration_minutes: avgDuration,
  };
}

function initStatsBucket() {
  return {
    total_visits: 0,
    completed_visits: 0,
    cancelled_visits: 0,
    ongoing_visits: 0,
    unique_clients_visited: new Set(),
    duration_sum: 0,
    duration_count: 0,
    today_visits: 0,
    orders_from_visits: 0,
    total_sales_from_visits: 0,
    last_visit: null,
    total_orders: 0,
    total_revenue: 0,
  };
}

function accumulateVisit(bucket, visit, now) {
  bucket.total_visits += 1;
  if (isCompleted(visit.visits_status)) bucket.completed_visits += 1;
  else if (isCancelled(visit.visits_status)) bucket.cancelled_visits += 1;
  else if (isStarted(visit.visits_status)) bucket.ongoing_visits += 1;

  bucket.unique_clients_visited.add(visit.visits_client_id);

  const duration = visitDurationMinutes(visit);
  if (duration !== null) {
    bucket.duration_sum += duration;
    bucket.duration_count += 1;
  }

  const visitTime = visit.visits_start_time || visit.visits_created_at;
  if (visitTime && isSameDay(new Date(visitTime), now)) {
    bucket.today_visits += 1;
  }
  if (visitTime && (!bucket.last_visit || new Date(visitTime) > new Date(bucket.last_visit))) {
    bucket.last_visit = visitTime;
  }
}

function finalizeStats(bucket) {
  const avg = bucket.duration_count
    ? bucket.duration_sum / bucket.duration_count
    : 0;
  return {
    total_visits: bucket.total_visits,
    completed_visits: bucket.completed_visits,
    cancelled_visits: bucket.cancelled_visits,
    ongoing_visits: bucket.ongoing_visits,
    unique_clients_visited: bucket.unique_clients_visited.size,
    avg_visit_duration: avg,
    today_visits: bucket.today_visits,
    orders_from_visits: bucket.orders_from_visits,
    total_sales_from_visits: bucket.total_sales_from_visits,
    total_orders: bucket.total_orders,
    total_revenue: bucket.total_revenue,
    last_visit: bucket.last_visit,
  };
}

function buildAreas(visits, clientMap, areaTagMap) {
  const buckets = {};
  const now = new Date();

  visits.forEach((visit) => {
    const client = clientMap[visit.visits_client_id];
    const areaId = client?.clients_area_tag_id ?? 0;
    const key = areaId || 'unknown';

    if (!buckets[key]) {
      buckets[key] = {
        ...initStatsBucket(),
        client_area_tag_id: areaId || null,
        client_area_tag_name: areaTagMap[areaId] || 'منطقة غير محددة',
      };
    }
    accumulateVisit(buckets[key], visit, now);
  });

  return Object.values(buckets).map(finalizeStats);
}

function buildRepresentatives(visits, userMap) {
  const buckets = {};
  const now = new Date();

  visits.forEach((visit) => {
    const repId = visit.visits_rep_user_id;
    if (!buckets[repId]) {
      const user = userMap[repId];
      buckets[repId] = {
        ...initStatsBucket(),
        users_id: repId,
        users_name: user?.users_name || `مندوب ${repId}`,
        users_email: user?.users_email || '',
      };
    }
    accumulateVisit(buckets[repId], visit, now);
  });

  return Object.values(buckets).map(finalizeStats);
}

function buildTopClients(visits, clientMap) {
  const buckets = {};
  const now = new Date();

  visits.forEach((visit) => {
    const clientId = visit.visits_client_id;
    if (!buckets[clientId]) {
      const client = clientMap[clientId];
      buckets[clientId] = {
        ...initStatsBucket(),
        clients_id: clientId,
        clients_company_name: client?.clients_company_name || `عميل ${clientId}`,
        clients_contact_name: client?.clients_contact_name || '',
        clients_city: client?.clients_city || '',
      };
    }
    accumulateVisit(buckets[clientId], visit, now);
  });

  return Object.values(buckets).map(finalizeStats);
}

function buildAnalytics(visits) {
  const now = new Date();
  const dailyMap = {};
  const hourlyMap = {};

  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyMap[key] = {
      date: key,
      total_visits: 0,
      completed_visits: 0,
      cancelled_visits: 0,
    };
  }

  for (let h = 0; h < 24; h += 1) {
    hourlyMap[h] = {
      hour: h,
      total_visits: 0,
      completed_visits: 0,
      cancelled_visits: 0,
    };
  }

  visits.forEach((visit) => {
    const when = visit.visits_start_time || visit.visits_created_at;
    if (!when) return;
    const date = new Date(when);
    const dayKey = date.toISOString().slice(0, 10);
    const hour = date.getHours();

    if (dailyMap[dayKey]) {
      dailyMap[dayKey].total_visits += 1;
      if (isCompleted(visit.visits_status)) dailyMap[dayKey].completed_visits += 1;
      if (isCancelled(visit.visits_status)) dailyMap[dayKey].cancelled_visits += 1;
    }

    if (hourlyMap[hour]) {
      hourlyMap[hour].total_visits += 1;
      if (isCompleted(visit.visits_status)) hourlyMap[hour].completed_visits += 1;
      if (isCancelled(visit.visits_status)) hourlyMap[hour].cancelled_visits += 1;
    }
  });

  return {
    daily_analytics: Object.values(dailyMap),
    hourly_analytics: Object.values(hourlyMap),
  };
}

function buildPerformance(overview) {
  const total = overview.total_visits || 0;
  const completed = overview.completed_visits || 0;
  const cancelled = overview.cancelled_visits || 0;

  return {
    ...overview,
    completion_rate: total ? Math.round((completed / total) * 1000) / 10 : 0,
    cancellation_rate: total ? Math.round((cancelled / total) * 1000) / 10 : 0,
    total_orders_from_visits: 0,
    total_revenue_from_visits: 0,
    total_payments_from_visits: 0,
    total_payment_amount_from_visits: 0,
  };
}

export async function getVisitsReports(params) {
  const ctx = await loadReportContext();
  return {
    overview: buildOverview(ctx.visits),
    areas: buildAreas(ctx.visits, ctx.clientMap, ctx.areaTagMap),
    representatives: buildRepresentatives(ctx.visits, ctx.userMap),
    ...buildAnalytics(ctx.visits),
    performance: buildPerformance(buildOverview(ctx.visits)),
    top_clients: buildTopClients(ctx.visits, ctx.clientMap),
  };
}

export async function getVisitsOverview(params) {
  const ctx = await loadReportContext();
  return buildOverview(ctx.visits);
}

export async function getVisitsActivities(params) {
  const ctx = await loadReportContext();
  return { items: ctx.visits, pagination: { total: ctx.visits.length } };
}

export async function getVisitsAreas(params) {
  const ctx = await loadReportContext();
  const items = buildAreas(ctx.visits, ctx.clientMap, ctx.areaTagMap);
  return { items, pagination: { total: items.length } };
}

export async function getVisitsRepresentatives(params) {
  const ctx = await loadReportContext();
  const items = buildRepresentatives(ctx.visits, ctx.userMap);
  return { items, pagination: { total: items.length } };
}

export async function getVisitsAnalytics(params) {
  const ctx = await loadReportContext();
  return buildAnalytics(ctx.visits);
}

export async function getVisitsPerformance(params) {
  const ctx = await loadReportContext();
  return buildPerformance(buildOverview(ctx.visits));
}

export async function getVisitsTopClients(params) {
  const ctx = await loadReportContext();
  const items = buildTopClients(ctx.visits, ctx.clientMap);
  return { items, pagination: { total: items.length } };
}

export async function getVisitsDetails(params = {}) {
  const page = params.page ?? 1;
  const perPage = params.perPage ?? params.limit ?? 10;
  const ctx = await loadReportContext();
  let items = [...ctx.visits];

  if (params.status) {
    items = items.filter(
      (v) => normalizeStatus(v.visits_status) === normalizeStatus(params.status),
    );
  }

  const total = items.length;
  const start = (page - 1) * perPage;
  const paged = items.slice(start, start + perPage);

  return {
    items: paged,
    pagination: { page, limit: perPage, total },
  };
}

export async function getVisitsDetailsUnpaginated(params) {
  const ctx = await loadReportContext();
  return ctx.visits;
}

export const getVisitDetailsById = getVisitById;
export const getVisitSummaryById = getVisitById;

export function clearVisitsReportCache() {
  reportCache = null;
}
