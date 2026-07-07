/**
 * Smoke test: admin password reset, impersonate, audit log.
 * Usage: node scripts/test-data/test_admin_actions.js
 */
const API = process.env.ADMIN_API || 'http://localhost:5050/api/admin';
const EMAIL = process.env.ADMIN_EMAIL || 'admin@repwave.io';
const PASSWORD = process.env.ADMIN_PASSWORD || 'RepWaveAdmin123!';

async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.status === 'failure') {
    throw new Error(json.message || `HTTP ${res.status} ${path}`);
  }
  return json.data;
}

async function main() {
  console.log('1. Admin login…');
  const login = await api('/auth/login', {
    method: 'POST',
    body: { email: EMAIL, password: PASSWORD },
  });
  const token = login.token;
  console.log('   OK');

  console.log('2. List users…');
  const users = await api('/users?page=1&page_size=5', { token });
  const target = users.data?.[0];
  if (!target) throw new Error('No users found');
  console.log(`   Target: ${target.email} @ ${target.tenant_id} (id ${target.user_id})`);

  console.log('3. Reset password…');
  const reset = await api(
    `/tenants/${encodeURIComponent(target.tenant_id)}/users/${target.user_id}/reset-password`,
    { method: 'POST', token },
  );
  if (!reset.temporary_password || reset.temporary_password.length < 8) {
    throw new Error('Invalid temp password returned');
  }
  console.log(`   Temp password length: ${reset.temporary_password.length}`);

  console.log('4. Verify login with temp password…');
  const tenantLogin = await fetch('http://localhost:5050/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: target.email,
      password: reset.temporary_password,
      tenant_id: target.tenant_id,
      login_type: 'admin',
    }),
  }).then((r) => r.json());
  if (tenantLogin.status !== 'success') {
    throw new Error(`Tenant login failed: ${tenantLogin.message}`);
  }
  console.log('   Tenant login OK');

  console.log('5. Impersonate tenant…');
  const imp = await api(
    `/tenants/${encodeURIComponent(target.tenant_id)}/impersonate`,
    { method: 'POST', body: { user_id: target.user_id }, token },
  );
  if (!imp.handoff_url?.includes('/auth/handoff?payload=')) {
    throw new Error(`Bad handoff URL: ${imp.handoff_url}`);
  }
  console.log(`   Handoff URL OK (${imp.user_name})`);

  console.log('6. Audit log…');
  const audit = await api('/audit-log?limit=10', { token });
  const actions = audit.map((a) => a.action);
  if (!actions.includes('password_reset') || !actions.includes('impersonate')) {
    throw new Error(`Audit missing entries. Got: ${actions.join(', ')}`);
  }
  console.log(`   Audit entries: ${actions.slice(0, 5).join(', ')}`);

  console.log('\nAll admin action tests passed.');
}

main().catch((err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
