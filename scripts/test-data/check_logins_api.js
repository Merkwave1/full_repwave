/** Quick check: tenant health logins_last_30_days */
const API = process.env.ADMIN_API || 'http://localhost:5050/api/admin';
const EMAIL = process.env.ADMIN_EMAIL || 'admin@repwave.io';
const PASSWORD = process.env.ADMIN_PASSWORD || 'RepWaveAdmin123!';

async function main() {
  const login = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  }).then((r) => r.json());
  if (login.status !== 'success') throw new Error(login.message || 'login failed');
  const token = login.data.token;

  for (const tenantId of ['alsd-1', 'demo']) {
    const health = await fetch(`${API}/tenants/${encodeURIComponent(tenantId)}/health`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json());
    const s = health.data?.summary;
    console.log(`\n${tenantId}:`);
    console.log('  summary keys:', s ? Object.keys(s) : 'no summary');
    console.log('  logins_last_30_days:', s?.logins_last_30_days);
    console.log('  users[0] login_count_30d:', health.data?.users?.[0]?.login_count_30d);
  }

  const usage = await fetch(`${API}/usage/summary`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  const row = usage.data?.find((x) => x.tenant_id === 'alsd-1');
  console.log('\nusage/summary alsd-1:', row?.usage?.logins_last_30_days);
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
