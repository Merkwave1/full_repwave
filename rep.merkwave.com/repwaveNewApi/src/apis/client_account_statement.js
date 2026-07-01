// Unified client account statement — aggregates sales orders, returns, payments, refunds
import axiosInstance from '../utils/axiosInstance.js';
import { getSalesOrdersByClient } from './sales_orders.js';
import { getClientPayments } from './client_payments.js';
import { getClientRefunds } from './client_refunds.js';

const LARGE_PAGE = 1000;

function pick(obj, ...keys) {
  for (const key of keys) {
    const val = obj?.[key];
    if (val !== undefined && val !== null && val !== '') return val;
  }
  return null;
}

function parseAmount(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function inDateRange(dateStr, dateFrom, dateTo) {
  if (!dateStr) return true;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return true;
  if (dateFrom) {
    const from = new Date(dateFrom);
    if (!Number.isNaN(from.getTime()) && d < from) return false;
  }
  if (dateTo) {
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);
    if (!Number.isNaN(to.getTime()) && d > to) return false;
  }
  return true;
}

async function getSalesReturnsByClient(clientId) {
  const res = await axiosInstance.get('/sales-returns', {
    params: { clientId, page: 1, pageSize: LARGE_PAGE },
  });
  const paged = res.data?.data;
  if (Array.isArray(paged?.data)) return paged.data;
  if (Array.isArray(paged)) return paged;
  return [];
}

export async function getClientAccountStatement({ client_id, client_name, date_from, date_to }) {
  if (!client_id) throw new Error('client_id is required');

  const [ordersRaw, returnsRaw, paymentsRaw, refundsRaw] = await Promise.all([
    getSalesOrdersByClient(client_id, { page: 1, pageSize: LARGE_PAGE }).catch(() => []),
    getSalesReturnsByClient(client_id).catch(() => []),
    getClientPayments(client_id, { page: 1, pageSize: LARGE_PAGE }).catch(() => []),
    getClientRefunds({ clientId: client_id, page: 1, pageSize: LARGE_PAGE }).catch(() => []),
  ]);

  const orders = Array.isArray(ordersRaw) ? ordersRaw : [];
  const returns = Array.isArray(returnsRaw) ? returnsRaw : [];
  const payments = Array.isArray(paymentsRaw) ? paymentsRaw : [];
  const refunds = Array.isArray(refundsRaw) ? refundsRaw : [];

  const entries = [];
  let totalDebit = 0;
  let totalCredit = 0;

  orders
    .filter((o) => (pick(o, 'sales_orders_status', 'status') || '').toLowerCase() === 'invoiced')
    .forEach((o) => {
      const date = pick(o, 'sales_orders_order_date', 'order_date', 'sales_orders_created_at', 'created_at');
      if (!inDateRange(date, date_from, date_to)) return;
      const amount = parseAmount(pick(o, 'sales_orders_total_amount', 'total_amount'));
      const id = pick(o, 'sales_orders_id', 'id');
      entries.push({
        type: 'order',
        id,
        client_id,
        client_name,
        date,
        status: pick(o, 'sales_orders_status', 'status'),
        reference: String(id),
        debit: amount,
        credit: 0,
        amount_signed: amount,
      });
      totalDebit += amount;
    });

  returns
    .filter((r) => (pick(r, 'returns_status', 'status') || '').toLowerCase() === 'processed')
    .forEach((r) => {
      const date = pick(r, 'returns_date', 'date', 'returns_created_at', 'created_at');
      if (!inDateRange(date, date_from, date_to)) return;
      const amount = parseAmount(pick(r, 'returns_total_amount', 'total_amount'));
      const id = pick(r, 'returns_id', 'id');
      entries.push({
        type: 'return',
        id,
        client_id,
        client_name,
        date,
        status: pick(r, 'returns_status', 'status'),
        reference: String(id),
        debit: 0,
        credit: amount,
        amount_signed: -amount,
      });
      totalCredit += amount;
    });

  payments.forEach((p) => {
    const date = pick(p, 'payments_date', 'payment_date', 'date', 'payments_created_at', 'created_at');
    if (!inDateRange(date, date_from, date_to)) return;
    const amount = parseAmount(pick(p, 'payments_amount', 'amount'));
    const id = pick(p, 'payments_id', 'id');
    entries.push({
      type: 'payment',
      id,
      client_id,
      client_name,
      date,
      status: null,
      reference: String(id),
      debit: 0,
      credit: amount,
      amount_signed: amount,
    });
    totalCredit += amount;
  });

  refunds.forEach((r) => {
    const date = pick(r, 'refunds_date', 'date', 'refunds_created_at', 'created_at');
    if (!inDateRange(date, date_from, date_to)) return;
    const amount = parseAmount(pick(r, 'refunds_amount', 'amount'));
    const id = pick(r, 'refunds_id', 'id');
    entries.push({
      type: 'refund',
      id,
      client_id,
      client_name,
      date,
      status: null,
      reference: String(id),
      debit: amount,
      credit: 0,
      amount_signed: -amount,
    });
    totalCredit += amount;
  });

  entries.sort((a, b) => {
    const dateA = new Date(a.date || 0).getTime();
    const dateB = new Date(b.date || 0).getTime();
    if (dateA === dateB) return (b.id || 0) - (a.id || 0);
    return dateB - dateA;
  });

  return {
    client_id,
    client_name,
    entries,
    totals: {
      debit_total: Math.round(totalDebit * 100) / 100,
      credit_total: Math.round(totalCredit * 100) / 100,
      net_total: Math.round((totalDebit - totalCredit) * 100) / 100,
    },
    net_total: Math.round((totalDebit - totalCredit) * 100) / 100,
    filters: { date_from: date_from || null, date_to: date_to || null },
  };
}
