function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function Metric({ label, value, sub }) {
  return (
    <div className="rounded-xl bg-brand-50/80 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-500">{label}</p>
      <p className="text-lg font-bold text-brand-800">{value ?? '—'}</p>
      {sub && <p className="text-[10px] text-brand-400">{sub}</p>}
    </div>
  );
}

export default function TenantUsagePanel({ health, loading, onImpersonate, onResetPassword, metricsOnly }) {
  if (loading) {
    return (
      <div className="rw-glass flex h-48 items-center justify-center rounded-2xl">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500" />
      </div>
    );
  }

  if (!health) return null;

  const s = health.summary || {};
  const hasCounts = s.users_total != null || s.clients != null;

  if (!s.database_reachable && !hasCounts) {
    return (
      <div className="rw-glass rounded-2xl border border-red-100 bg-red-50/50 p-5">
        <h2 className="text-sm font-semibold text-red-800">Usage unavailable</h2>
        <p className="mt-1 text-sm text-red-600">{s.error || 'Could not connect to tenant database.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!s.database_reachable && s.error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Some usage details could not be loaded: {s.error}
        </div>
      )}
      <div className="rw-glass rounded-2xl p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-brand-800">Usage & activity</h2>
          <span className="text-xs text-brand-400">Queried {formatDate(health.queried_at)}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Metric label="Users" value={s.users_total} sub={`${s.users_active} active`} />
          <Metric label="Clients" value={s.clients} />
          <Metric label="Products" value={s.products} />
          <Metric label="Sales orders" value={s.sales_orders} />
          <Metric label="Visits" value={s.visits} />
          <Metric label="Suppliers" value={s.suppliers} />
          <Metric label="Purchases" value={s.purchase_orders} />
          <Metric label="Warehouses" value={s.warehouses} />
          <Metric label="Logins (30d)" value={s.logins_last_30_days ?? s.logins_last30_days} />
          <Metric label="Last login" value={s.last_login_user || '—'} sub={formatDate(s.last_login_at)} />
        </div>

        {health.settings && Object.keys(health.settings).length > 0 && (
          <div className="mt-4 rounded-xl border border-brand-100 bg-white/60 p-3">
            <p className="mb-2 text-xs font-semibold text-brand-600">Tenant settings snapshot</p>
            <dl className="grid gap-1 text-sm sm:grid-cols-3">
              {Object.entries(health.settings).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <dt className="text-brand-400">{k}:</dt>
                  <dd className="font-medium text-brand-800">{v || '—'}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>

      {(health.users_by_role?.length > 0) && (
        <div className="rw-glass rounded-2xl p-5">
          <h3 className="mb-3 text-sm font-semibold text-brand-800">Users by role</h3>
          <div className="flex flex-wrap gap-2">
            {health.users_by_role.map((r) => (
              <span key={r.role} className="rounded-lg bg-brand-100 px-3 py-1.5 text-sm">
                <span className="font-semibold capitalize text-brand-800">{r.role}</span>
                <span className="ml-2 text-brand-500">{r.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {!metricsOnly && (health.users?.length > 0) && (
        <div className="rw-glass overflow-hidden rounded-2xl">
          <div className="border-b border-brand-100 px-5 py-3">
            <h3 className="text-sm font-semibold text-brand-800">All users ({health.users.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-brand-50/80 text-xs uppercase text-brand-500">
                <tr>
                  <th className="px-4 py-2 font-semibold">Name</th>
                  <th className="px-4 py-2 font-semibold">Email</th>
                  <th className="px-4 py-2 font-semibold">Role</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                  <th className="px-4 py-2 font-semibold">Last login</th>
                  <th className="px-4 py-2 font-semibold">Logins 30d</th>
                  {(onImpersonate || onResetPassword) && <th className="px-4 py-2 font-semibold text-right">Admin</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {health.users.map((u) => (
                  <tr key={u.user_id} className="hover:bg-brand-50/40">
                    <td className="px-4 py-2.5 font-medium text-brand-800">{u.name}</td>
                    <td className="px-4 py-2.5 text-brand-600">{u.email}</td>
                    <td className="px-4 py-2.5 capitalize text-brand-600">{u.role}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block h-2 w-2 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                    </td>
                    <td className="px-4 py-2.5 text-xs text-brand-500">{formatDate(u.last_login_at)}</td>
                    <td className="px-4 py-2.5 text-brand-600">{u.login_count_30d ?? u.login_count30d ?? 0}</td>
                    {(onImpersonate || onResetPassword) && (
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex justify-end gap-2">
                          {onImpersonate && (
                            <button type="button" className="text-xs font-semibold text-brand-500 hover:text-brand-700" onClick={() => onImpersonate(u.user_id)}>
                              ERP
                            </button>
                          )}
                          {onResetPassword && (
                            <button type="button" className="text-xs font-semibold text-amber-600 hover:text-amber-800" onClick={() => onResetPassword(u.user_id, u.email)}>
                              Reset
                            </button>
                          )}
                        </div>
                      </td>
                    )}
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
