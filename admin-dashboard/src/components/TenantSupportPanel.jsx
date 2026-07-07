import { useEffect, useState } from 'react';
import {
  ArrowTopRightOnSquareIcon,
  KeyIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { getAuditLog, impersonateTenant, resetUserPassword, setUserStatus } from '../api/admin';

function formatWhen(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const actionLabels = {
  password_reset: 'Password reset',
  impersonate: 'Opened ERP',
  user_enable: 'User enabled',
  user_disable: 'User disabled',
};

export default function TenantSupportPanel({
  tenantId,
  tenantName,
  users = [],
  loading,
  onImpersonateAdmin,
  resetResult,
  onResetResult,
}) {
  const [audit, setAudit] = useState([]);
  const [auditLoading, setAuditLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setAuditLoading(true);
      try {
        setAudit(await getAuditLog({ limit: 20, tenant_id: tenantId }));
      } catch {
        setAudit([]);
      } finally {
        setAuditLoading(false);
      }
    })();
  }, [tenantId, resetResult]);

  const openAsUser = async (userId, name) => {
    if (!window.confirm(`Open ERP as ${name}? Logged in audit trail.`)) return;
    try {
      const res = await impersonateTenant(tenantId, userId);
      window.open(res.handoff_url, '_blank', 'noopener,noreferrer');
      toast.success(`Opened ERP as ${res.user_name}`);
      setAudit(await getAuditLog({ limit: 20, tenant_id: tenantId }));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const resetPwd = async (userId, email) => {
    if (!window.confirm(`Generate new temporary password for ${email}?`)) return;
    try {
      const res = await resetUserPassword(tenantId, userId);
      onResetResult(res);
      toast.success(res.message || 'Copy the password below — shown once');
      setAudit(await getAuditLog({ limit: 20, tenant_id: tenantId }));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const toggleActive = async (u) => {
    try {
      await setUserStatus(tenantId, u.user_id, !u.is_active);
      toast.success(u.is_active ? 'User disabled' : 'User enabled');
      setAudit(await getAuditLog({ limit: 20, tenant_id: tenantId }));
      window.location.reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 p-5 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5" />
              <h2 className="text-lg font-bold">Support & control</h2>
            </div>
            <p className="mt-1 text-sm text-brand-100">
              Admin-only: open their ERP, reset passwords, disable users. Every action is audited.
            </p>
          </div>
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-brand-700 shadow hover:bg-brand-50"
            onClick={onImpersonateAdmin}
          >
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            Open ERP as admin
          </button>
        </div>
      </div>

      {resetResult && (
        <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900">Temporary password — copy now (shown once)</p>
          <p className="text-sm text-amber-800">{resetResult.email}</p>
          <p className="mt-2 select-all font-mono text-2xl font-bold text-brand-900">{resetResult.temporary_password}</p>
          <button type="button" className="rw-btn-secondary mt-3 !text-xs" onClick={() => onResetResult(null)}>Dismiss</button>
        </div>
      )}

      <div className="rw-glass overflow-hidden rounded-2xl">
        <div className="border-b border-brand-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-brand-800">Users in this tenant</h3>
          <p className="text-xs text-brand-400">Reset password or log in as any user for support</p>
        </div>
        {loading ? (
          <p className="px-5 py-10 text-center text-sm text-brand-500">Loading users…</p>
        ) : users.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-brand-500">No users in database</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-brand-50/80 text-xs uppercase text-brand-500">
                <tr>
                  <th className="px-4 py-2 font-semibold">User</th>
                  <th className="px-4 py-2 font-semibold">Role</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                  <th className="px-4 py-2 font-semibold">Logins 30d</th>
                  <th className="px-4 py-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {users.map((u) => (
                  <tr key={u.user_id} className="hover:bg-brand-50/40">
                    <td className="px-4 py-3">
                      <p className="font-medium text-brand-800">{u.name}</p>
                      <p className="text-xs text-brand-400">{u.email}</p>
                    </td>
                    <td className="px-4 py-3 capitalize text-brand-600">{u.role}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {u.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-brand-600">{u.login_count_30d ?? u.login_count30d ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button type="button" className="rw-btn-primary !py-1.5 !px-3 !text-xs" onClick={() => openAsUser(u.user_id, u.name)}>
                          Open ERP
                        </button>
                        <button type="button" className="rw-btn-secondary !py-1.5 !px-3 !text-xs" onClick={() => resetPwd(u.user_id, u.email)}>
                          <KeyIcon className="mr-1 inline h-3.5 w-3.5" />
                          Reset pwd
                        </button>
                        <button type="button" className="rw-btn-secondary !py-1.5 !px-3 !text-xs" onClick={() => toggleActive(u)}>
                          {u.is_active ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rw-glass rounded-2xl p-5">
        <h3 className="mb-3 text-sm font-semibold text-brand-800">Audit trail — {tenantName}</h3>
        {auditLoading ? (
          <p className="text-sm text-brand-500">Loading…</p>
        ) : audit.length === 0 ? (
          <p className="text-sm text-brand-500">No admin actions on this tenant yet</p>
        ) : (
          <ul className="divide-y divide-brand-50">
            {audit.map((log) => (
              <li key={log.id} className="flex flex-wrap justify-between gap-2 py-2.5 text-sm">
                <div>
                  <span className="font-semibold text-brand-800">{actionLabels[log.action] || log.action}</span>
                  {log.target_user_email && <span className="ml-2 text-brand-500">{log.target_user_email}</span>}
                  {log.details && <p className="text-xs text-brand-400">{log.details}</p>}
                </div>
                <div className="text-right text-xs text-brand-400">
                  <p>{log.admin_email}</p>
                  <p>{formatWhen(log.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
