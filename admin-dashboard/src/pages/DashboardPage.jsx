import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BuildingOffice2Icon,
  ClockIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import toast from 'react-hot-toast';
import { getStatsOverview, extendTrial, getAllTenantsUsage } from '../api/admin';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import GlobalUserSearch from '../components/GlobalUserSearch';
import AdminAuditFeed from '../components/AdminAuditFeed';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [usageRows, setUsageRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [overview, usage] = await Promise.all([
        getStatsOverview(),
        getAllTenantsUsage().catch(() => []),
      ]);
      setStats(overview);
      setUsageRows(usage || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleExtend = async (tenantId) => {
    try {
      await extendTrial(tenantId, 7);
      toast.success(`Extended ${tenantId} by 7 days`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500" />
      </div>
    );
  }

  if (!stats) return null;

  const chartData = (stats.signups_last30_days_chart || []).map((d) => ({
    date: d.date?.slice(5),
    count: d.count,
  }));

  const countryData = (stats.by_country || []).slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-800">Overview</h1>
        <p className="text-sm text-brand-500">Search any user, reset passwords, open ERP — all actions are audited below</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard title="Total tenants" value={stats.total_tenants} icon={BuildingOffice2Icon} />
        <StatCard title="Active trials" value={stats.trial_active} icon={ClockIcon} accent="from-emerald-400 to-emerald-600" />
        <StatCard title="Expiring soon" value={stats.expiring_soon?.length ?? 0} icon={ExclamationTriangleIcon} accent="from-amber-400 to-orange-500" />
        <StatCard title="Paid active" value={stats.paid_active} icon={CreditCardIcon} accent="from-violet-400 to-brand-500" />
        <StatCard title="Suspended" value={stats.suspended} icon={NoSymbolIcon} accent="from-red-400 to-red-600" />
        <StatCard title="Signups (30d)" value={stats.signups_last_30_days ?? stats.signups_last30_days} icon={UserGroupIcon} accent="from-indigo-400 to-brand-500" />
      </div>

      <GlobalUserSearch />

      <div className="rw-glass rounded-2xl p-5">
        <h2 className="mb-3 text-sm font-semibold text-brand-800">Recent admin actions</h2>
        <p className="mb-4 text-xs text-brand-500">Password resets, ERP impersonation, user enable/disable</p>
        <AdminAuditFeed limit={12} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rw-glass rounded-2xl p-5">
          <h2 className="mb-4 text-sm font-semibold text-brand-800">Signups — last 30 days</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5FD6" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#8B5FD6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#7A52C2' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#7A52C2' }} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#8B5FD6" fill="url(#signupGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rw-glass rounded-2xl p-5">
          <h2 className="mb-4 text-sm font-semibold text-brand-800">Tenants by country</h2>
          <div className="h-56">
            {countryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={countryData} layout="vertical" margin={{ left: 8 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#7A52C2' }} />
                  <YAxis type="category" dataKey="country" width={72} tick={{ fontSize: 11, fill: '#7A52C2' }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8B5FD6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-brand-500">No country data yet</p>
            )}
          </div>
        </div>
      </div>

      {(stats.paid_by_plan?.length > 0) && (
        <div className="rw-glass rounded-2xl p-5">
          <h2 className="mb-3 text-sm font-semibold text-brand-800">Paid tenants by plan</h2>
          <div className="flex flex-wrap gap-3">
            {stats.paid_by_plan.map((p) => (
              <div key={p.plan} className="rounded-xl bg-brand-50 px-4 py-2 text-sm">
                <span className="font-semibold capitalize text-brand-800">{p.plan}</span>
                <span className="ml-2 text-brand-500">{p.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rw-glass rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-brand-800">Expiring in next 3 days</h2>
          <Link to="/tenants?status=trial_active" className="text-xs font-medium text-brand-500 hover:text-brand-700">
            View all tenants →
          </Link>
        </div>
        {(stats.expiring_soon?.length ?? 0) === 0 ? (
          <p className="py-6 text-center text-sm text-brand-500">No tenants expiring soon</p>
        ) : (
          <div className="divide-y divide-brand-100">
            {stats.expiring_soon.map((t) => (
              <div key={t.tenant_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <Link to={`/tenants/${t.tenant_id}`} className="font-semibold text-brand-800 hover:text-brand-500">
                    {t.name}
                  </Link>
                  <p className="text-xs text-brand-500">
                    {t.tenant_id} · expires {formatDate(t.expiration_date)} ({t.days_until_expiry}d)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={t.status} />
                  <button type="button" className="rw-btn-secondary !py-1.5 !px-3 !text-xs" onClick={() => handleExtend(t.tenant_id)}>
                    +7 days
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {usageRows.length > 0 && (
        <div className="rw-glass overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-brand-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-brand-800">Tenant usage snapshot</h2>
            <Link to="/tenants" className="text-xs font-medium text-brand-500 hover:text-brand-700">Full list →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-brand-50/80 text-xs uppercase text-brand-500">
                <tr>
                  <th className="px-4 py-2 font-semibold">Tenant</th>
                  <th className="px-4 py-2 font-semibold">Plan</th>
                  <th className="px-4 py-2 font-semibold">Users</th>
                  <th className="px-4 py-2 font-semibold">Clients</th>
                  <th className="px-4 py-2 font-semibold">Products</th>
                  <th className="px-4 py-2 font-semibold">Orders</th>
                  <th className="px-4 py-2 font-semibold">Visits</th>
                  <th className="px-4 py-2 font-semibold">Logins 30d</th>
                  <th className="px-4 py-2 font-semibold">Last login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {[...usageRows]
                  .sort((a, b) => (b.usage?.users_total ?? 0) - (a.usage?.users_total ?? 0))
                  .map((row) => (
                  <tr key={row.tenant_id} className="hover:bg-brand-50/40">
                    <td className="px-4 py-2.5">
                      <Link to={`/tenants/${row.tenant_id}`} className="font-medium text-brand-800 hover:text-brand-500">
                        {row.name}
                      </Link>
                      <p className="font-mono text-[10px] text-brand-400">{row.tenant_id}</p>
                    </td>
                    <td className="px-4 py-2.5 capitalize text-brand-600">{row.plan || '—'}</td>
                    <td className="px-4 py-2.5 font-semibold text-brand-800">
                      {row.usage?.database_reachable === false ? '—' : `${row.usage?.users_total ?? 0} (${row.usage?.users_active ?? 0})`}
                    </td>
                    <td className="px-4 py-2.5 text-brand-600">{row.usage?.clients ?? '—'}</td>
                    <td className="px-4 py-2.5 text-brand-600">{row.usage?.products ?? '—'}</td>
                    <td className="px-4 py-2.5 text-brand-600">{row.usage?.sales_orders ?? '—'}</td>
                    <td className="px-4 py-2.5 text-brand-600">{row.usage?.visits ?? '—'}</td>
                    <td className="px-4 py-2.5 text-brand-600">{row.usage?.logins_last_30_days ?? row.usage?.logins_last30_days ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-brand-500">
                      {row.usage?.last_login_user || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
