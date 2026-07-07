import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAuditLog } from '../api/admin';

const actionLabels = {
  password_reset: 'Password reset',
  impersonate: 'Opened ERP',
  user_enable: 'User enabled',
  user_disable: 'User disabled',
};

function formatWhen(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function AdminAuditFeed({ limit = 15, tenantId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        setLogs(await getAuditLog({ limit, tenant_id: tenantId }));
      } catch {
        setLogs([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [limit, tenantId]);

  if (loading) return <p className="text-sm text-brand-500">Loading audit log…</p>;

  if (logs.length === 0) {
    return <p className="text-sm text-brand-500">No admin actions recorded yet</p>;
  }

  return (
    <ul className="divide-y divide-brand-50">
      {logs.map((log) => (
        <li key={log.id} className="flex flex-wrap items-start justify-between gap-2 py-2.5 text-sm">
          <div>
            <span className="rounded bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
              {actionLabels[log.action] || log.action}
            </span>
            {log.tenant_id && (
              <Link to={`/tenants/${encodeURIComponent(log.tenant_id)}`} className="ml-2 font-medium text-brand-600 hover:text-brand-800">
                {log.tenant_id}
              </Link>
            )}
            {log.target_user_email && <span className="ml-1 text-brand-500">{log.target_user_email}</span>}
          </div>
          <span className="text-xs text-brand-400">{formatWhen(log.created_at)}</span>
        </li>
      ))}
    </ul>
  );
}
