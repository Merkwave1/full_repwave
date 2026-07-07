import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getTenant,
  updateTenant,
  closeSubscription,
  openSubscription,
  extendTrial,
  convertTrial,
  getTenantHealth,
  seedTenantSample,
  impersonateTenant,
} from '../api/admin';
import StatusBadge from '../components/StatusBadge';
import TenantSupportPanel from '../components/TenantSupportPanel';
import TenantUsagePanel from '../components/TenantUsagePanel';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB');
}

export default function TenantDetailPage() {
  const { tenantId } = useParams();
  const [tenant, setTenant] = useState(null);
  const [health, setHealth] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [healthLoading, setHealthLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [resetResult, setResetResult] = useState(null);

  const load = async () => {
    setLoading(true);
    setHealthLoading(true);
    try {
      const t = await getTenant(tenantId);
      setTenant(t);
      setForm({
        name: t.name || '',
        plan: t.plan || '',
        contact_email: t.contact_email || '',
        contact_phone: t.contact_phone || '',
        contact_country: t.contact_country || '',
        notes: t.notes || '',
        expiration_date: t.expiration_date ? t.expiration_date.slice(0, 10) : '',
      });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
    try {
      setHealth(await getTenantHealth(tenantId));
    } catch (err) {
      toast.error(`Usage: ${err.message}`);
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tenantId]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateTenant(tenantId, {
        name: form.name,
        plan: form.plan,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone,
        contact_country: form.contact_country,
        notes: form.notes,
        expiration_date: form.expiration_date ? new Date(form.expiration_date).toISOString() : null,
      });
      setTenant(updated);
      toast.success('Tenant updated');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const refreshHealth = async () => {
    setHealthLoading(true);
    try {
      setHealth(await getTenantHealth(tenantId));
    } catch (err) {
      toast.error(`Usage: ${err.message}`);
    } finally {
      setHealthLoading(false);
    }
  };

  const run = async (fn, msg) => {
    try {
      const updated = await fn();
      setTenant(updated);
      setForm((f) => ({
        ...f,
        plan: updated.plan ?? f.plan,
        expiration_date: updated.expiration_date ? updated.expiration_date.slice(0, 10) : f.expiration_date,
      }));
      toast.success(msg);
      await refreshHealth();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedTenantSample(tenantId);
      toast.success('Sample data seeded');
      await refreshHealth();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSeeding(false);
    }
  };

  const handleOpenErpAdmin = async () => {
    if (!window.confirm(`Open ERP for ${tenant.name}? This is logged in the audit trail.`)) return;
    try {
      const res = await impersonateTenant(tenantId);
      window.open(res.handoff_url, '_blank', 'noopener,noreferrer');
      toast.success(`Opening as ${res.user_name}`);
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

  if (!tenant) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/tenants" className="text-sm text-brand-500 hover:text-brand-700">← Tenants</Link>
          <h1 className="mt-1 text-2xl font-bold text-brand-800">{tenant.name}</h1>
          <p className="font-mono text-sm text-brand-500">{tenant.tenant_id}</p>
        </div>
        <StatusBadge status={tenant.status} />
      </div>

      <TenantSupportPanel
        tenantId={tenantId}
        tenantName={tenant.name}
        users={health?.users || []}
        loading={healthLoading}
        onImpersonateAdmin={handleOpenErpAdmin}
        resetResult={resetResult}
        onResetResult={setResetResult}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4 rw-glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-brand-800">Company details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-brand-500">Company name</span>
              <input className="rw-input" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-brand-500">Plan</span>
              <select className="rw-input" value={form.plan} onChange={(e) => set('plan', e.target.value)}>
                <option value="trial">Trial</option>
                <option value="starter">Starter</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-brand-500">Expiration date</span>
              <input type="date" className="rw-input" value={form.expiration_date} onChange={(e) => set('expiration_date', e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-brand-500">Contact email</span>
              <input type="email" className="rw-input" value={form.contact_email} onChange={(e) => set('contact_email', e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-brand-500">Phone</span>
              <input className="rw-input" value={form.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-brand-500">Country</span>
              <input className="rw-input" value={form.contact_country} onChange={(e) => set('contact_country', e.target.value)} />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-brand-500">Internal notes</span>
              <textarea className="rw-input min-h-[88px]" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </label>
          </div>
          <button type="button" className="rw-btn-primary" disabled={saving} onClick={handleSave}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>

        <div className="space-y-4">
          <div className="rw-glass rounded-2xl p-5">
            <h2 className="mb-3 text-sm font-semibold text-brand-800">Subscription</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-brand-500">Account active</dt><dd>{tenant.is_active ? 'Yes' : 'No'}</dd></div>
              <div className="flex justify-between"><dt className="text-brand-500">Subscribed from</dt><dd>{formatDate(tenant.subscribed_from)}</dd></div>
              <div className="flex justify-between"><dt className="text-brand-500">Renewals</dt><dd>{tenant.renewal_count ?? 0}</dd></div>
              <div className="flex justify-between"><dt className="text-brand-500">Last renewed</dt><dd>{formatDate(tenant.last_renewed_at)}</dd></div>
              <div className="flex justify-between"><dt className="text-brand-500">Expires</dt><dd>{formatDate(tenant.expiration_date)}</dd></div>
              <div className="flex justify-between"><dt className="text-brand-500">Days left</dt><dd>{tenant.days_until_expiry ?? '∞'}</dd></div>
              <div className="flex justify-between"><dt className="text-brand-500">Registered</dt><dd>{formatDate(tenant.created_at)}</dd></div>
            </dl>

            <div className="mt-4 flex flex-col gap-2">
              {tenant.is_active ? (
                <button type="button" className="rw-btn-secondary w-full border-red-200 text-red-700 hover:bg-red-50" onClick={() => run(() => closeSubscription(tenantId), 'Subscription closed')}>
                  Close subscription
                </button>
              ) : (
                <button type="button" className="rw-btn-primary w-full" onClick={() => run(() => openSubscription(tenantId, { plan: form.plan, expiration_date: form.expiration_date ? new Date(form.expiration_date).toISOString() : null }), 'Subscription opened')}>
                  Open subscription
                </button>
              )}
              <button type="button" className="rw-btn-secondary w-full" onClick={() => run(() => extendTrial(tenantId, 7), 'Trial extended +7 days')}>
                Extend trial +7 days
              </button>
              <button type="button" className="rw-btn-secondary w-full" onClick={() => run(() => convertTrial(tenantId, 'professional'), 'Converted to professional')}>
                Convert to Professional
              </button>
              <button
                type="button"
                className="rw-btn-secondary w-full border-dashed"
                disabled={seeding}
                onClick={handleSeed}
              >
                {seeding ? 'Seeding…' : 'Seed sample data'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <TenantUsagePanel health={health} loading={healthLoading} metricsOnly />
    </div>
  );
}
