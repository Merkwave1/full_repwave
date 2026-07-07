import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRightIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { getTenants } from '../api/admin';
import StatusBadge from '../components/StatusBadge';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TenantsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState({ data: [], total_count: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const status = searchParams.get('status') || '';
  const plan = searchParams.get('plan') || '';
  const page = Number(searchParams.get('page') || 1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTenants({ search, status, plan, page, page_size: 20, include_usage: true });
      setData({ data: res.data || [], total_count: res.total_count || 0 });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, status, plan, page]);

  useEffect(() => {
    load();
  }, [load]);

  const applyFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setSearchParams(next);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    applyFilter('search', search.trim());
  };

  const totalPages = Math.max(1, Math.ceil((data.total_count || 0) / 20));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-800">Tenants</h1>
        <p className="text-sm text-brand-500">{data.total_count} registered companies</p>
      </div>

      <div className="rw-glass flex flex-wrap items-center gap-3 rounded-2xl p-4">
        <form onSubmit={handleSearch} className="relative min-w-[200px] flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-400" />
          <input
            className="rw-input !pl-9"
            placeholder="Search company, email, slug…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
        <select className="rw-input !w-auto" value={status} onChange={(e) => applyFilter('status', e.target.value)}>
          <option value="">All statuses</option>
          <option value="trial_active">Trial active</option>
          <option value="trial_expired">Trial expired</option>
          <option value="paid_active">Paid active</option>
          <option value="paid_expired">Paid expired</option>
          <option value="suspended">Suspended</option>
        </select>
        <select className="rw-input !w-auto" value={plan} onChange={(e) => applyFilter('plan', e.target.value)}>
          <option value="">All plans</option>
          <option value="trial">Trial</option>
          <option value="starter">Starter</option>
          <option value="professional">Professional</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      <div className="rw-glass overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-brand-100 bg-brand-50/80 text-xs uppercase tracking-wide text-brand-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Company</th>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Users</th>
                <th className="px-4 py-3 font-semibold">Expires</th>
                <th className="px-4 py-3 font-semibold w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-brand-500">Loading…</td>
                </tr>
              ) : data.data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-brand-500">No tenants found</td>
                </tr>
              ) : (
                data.data.map((t) => (
                  <tr
                    key={t.tenant_id}
                    className="cursor-pointer transition-colors hover:bg-brand-50/80"
                    onClick={() => navigate(`/tenants/${encodeURIComponent(t.tenant_id)}`)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-brand-800">{t.name}</p>
                      <p className="font-mono text-xs text-brand-400">{t.tenant_id}</p>
                    </td>
                    <td className="px-4 py-3 capitalize text-brand-600">{t.plan || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-3 text-brand-800">
                      {t.usage?.database_reachable === false ? (
                        <span className="text-xs text-red-500">—</span>
                      ) : t.usage?.users_total != null ? (
                        <span title={`${t.usage.users_active} active`}>
                          {t.usage.users_total}
                          <span className="text-brand-400"> ({t.usage.users_active})</span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-brand-600">{formatDate(t.expiration_date)}</td>
                    <td className="px-4 py-3 text-brand-400">
                      <ChevronRightIcon className="h-4 w-4" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-brand-100 px-4 py-3">
            <button
              type="button"
              disabled={page <= 1}
              className="rw-btn-secondary !py-1.5 !text-xs disabled:opacity-40"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set('page', String(page - 1));
                setSearchParams(next);
              }}
            >
              Previous
            </button>
            <span className="text-xs text-brand-500">Page {page} of {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages}
              className="rw-btn-secondary !py-1.5 !text-xs disabled:opacity-40"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set('page', String(page + 1));
                setSearchParams(next);
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
