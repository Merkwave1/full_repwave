import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { getGlobalUsers, impersonateTenant, resetUserPassword } from '../api/admin';

export default function GlobalUserSearch() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resetResult, setResetResult] = useState(null);

  const runSearch = async (e) => {
    e?.preventDefault();
    if (!search.trim()) return;
    setLoading(true);
    setResetResult(null);
    try {
      const res = await getGlobalUsers({ search: search.trim(), page_size: 10 });
      setResults(res.data || []);
      if (!res.data?.length) toast.error('No users found');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openErp = async (u) => {
    try {
      const res = await impersonateTenant(u.tenant_id, u.user_id);
      window.open(res.handoff_url, '_blank', 'noopener,noreferrer');
      toast.success(`Opened ERP as ${res.user_name}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const resetPwd = async (u) => {
    if (!window.confirm(`Reset password for ${u.email}?`)) return;
    try {
      setResetResult(await resetUserPassword(u.tenant_id, u.user_id));
      toast.success('Password reset — copy below');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="rw-glass rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-brand-800">Find any user (all tenants)</h2>
      <p className="mb-4 text-xs text-brand-500">Search by email or name → reset password or open their ERP</p>

      <form onSubmit={runSearch} className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-400" />
          <input
            className="rw-input !pl-9"
            placeholder="e.g. admin@demo.com"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="submit" className="rw-btn-primary shrink-0" disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {resetResult && (
        <div className="mb-4 rounded-xl border-2 border-amber-400 bg-amber-50 p-3">
          <p className="text-xs font-bold text-amber-900">Temp password for {resetResult.email}</p>
          <p className="select-all font-mono text-xl font-bold text-brand-900">{resetResult.temporary_password}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="divide-y divide-brand-50 rounded-xl border border-brand-100">
          {results.map((u) => (
            <div key={`${u.tenant_id}-${u.user_id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-medium text-brand-800">{u.name} <span className="text-brand-400">({u.email})</span></p>
                <Link to={`/tenants/${encodeURIComponent(u.tenant_id)}`} className="text-xs text-brand-500 hover:text-brand-700">
                  {u.tenant_name} · {u.tenant_id}
                </Link>
              </div>
              <div className="flex gap-2">
                <button type="button" className="rw-btn-primary !py-1.5 !text-xs" onClick={() => openErp(u)}>Open ERP</button>
                <button type="button" className="rw-btn-secondary !py-1.5 !text-xs" onClick={() => resetPwd(u)}>Reset pwd</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
