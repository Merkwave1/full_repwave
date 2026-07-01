/**
 * fix_demo_client_names.js — restores Arabic client names corrupted to "????"
 * Run: node scripts/test-data/fix_demo_client_names.js
 */

const http = require('http');

const HOST = 'localhost';
const PORT = 5050;
const TENANT = 'demo';

const FIXES = {
  1: {
    clients_company_name: 'سوبر ماركت النور',
    clients_contact_name: 'سيد النور',
    clients_email: 'nour@market.com',
    clients_address: 'شارع التحرير - القاهرة',
    clients_city: 'القاهرة',
    clients_contact_phone1: '01011110001',
  },
  2: {
    clients_company_name: 'بقالة الأمانة',
    clients_contact_name: 'حسام الأمانة',
    clients_email: 'amana@store.com',
    clients_address: 'شارع فيصل - الجيزة',
    clients_city: 'الجيزة',
    clients_contact_phone1: '01011110002',
    clients_contact_job_title: 'مدير',
  },
  6: {
    clients_company_name: 'ميني ماركت الشروق',
    clients_contact_name: 'كريم الشروق',
    clients_email: 'shorouk@store.com',
    clients_contact_phone1: '01099998888',
    clients_city: 'القاهرة',
  },
  7: {
    clients_company_name: 'شركة دلتا للمواد الغذائية',
    clients_contact_name: 'محمد دلتا',
    clients_email: 'delta@trade.com',
    clients_address: 'مدينة العبور - القاهرة',
    clients_city: 'القاهرة',
    clients_contact_phone1: '01099887766',
  },
};

function apireq(path, method, tok, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json; charset=utf-8' };
    if (tok) headers.Authorization = 'Bearer ' + tok;
    if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr, 'utf8');
    const r = http.request({ hostname: HOST, port: PORT, path, method, headers }, (res) => {
      let b = '';
      res.on('data', (d) => (b += d));
      res.on('end', () => {
        try {
          resolve(JSON.parse(b));
        } catch {
          resolve({ raw: b.slice(0, 300) });
        }
      });
    });
    r.on('error', reject);
    if (bodyStr) r.write(bodyStr, 'utf8');
    r.end();
  });
}

function needsFix(name) {
  if (!name) return true;
  return name.includes('?') || name === 'Test Updated' || name === 'New Test Co';
}

async function main() {
  const auth = await apireq('/api/auth/login', 'POST', null, {
    email: 'admin@demo.com',
    password: 'Admin123!',
    tenant_id: TENANT,
    login_type: 'admin',
  });
  const tok = auth.data?.token;
  if (!tok) {
    console.error('Auth failed', auth);
    process.exit(1);
  }

  let fixed = 0;
  for (const [idStr, patch] of Object.entries(FIXES)) {
    const id = Number(idStr);
    const current = await apireq(`/api/clients/${id}`, 'GET', tok);
    const c = current.data;
    if (!c) {
      console.log(`  Skip #${id}: not found`);
      continue;
    }
    if (!needsFix(c.clients_company_name)) {
      console.log(`  OK #${id}: ${c.clients_company_name}`);
      continue;
    }

    const body = {
      clients_company_name: patch.clients_company_name,
      clients_email: patch.clients_email ?? c.clients_email,
      clients_contact_name: patch.clients_contact_name ?? c.clients_contact_name,
      clients_contact_phone1: patch.clients_contact_phone1 ?? c.clients_contact_phone1,
      clients_contact_phone2: c.clients_contact_phone2,
      clients_contact_job_title: patch.clients_contact_job_title ?? c.clients_contact_job_title,
      clients_address: patch.clients_address ?? c.clients_address,
      clients_street2: c.clients_street2,
      clients_building_number: c.clients_building_number,
      clients_city: patch.clients_city ?? c.clients_city,
      clients_zip: c.clients_zip,
      clients_country_id: c.clients_country_id ?? 1,
      clients_governorate_id: c.clients_governorate_id,
      clients_area_tag_id: c.clients_area_tag_id,
      clients_client_type_id: c.clients_client_type_id,
      clients_industry_id: c.clients_industry_id,
      clients_rep_user_id: c.clients_rep_user_id,
      clients_credit_limit: c.clients_credit_limit ?? 0,
      clients_status: c.clients_status ?? 'active',
      clients_vat_number: c.clients_vat_number,
      clients_website: c.clients_website,
      clients_description: c.clients_description,
      clients_source: c.clients_source,
      clients_payment_terms: c.clients_payment_terms,
      clients_reference_note: c.clients_reference_note,
      clients_latitude: c.clients_latitude,
      clients_longitude: c.clients_longitude,
      clients_image: c.clients_image,
    };

    const res = await apireq(`/api/clients/${id}`, 'PUT', tok, body);
    if (res?.status === 'success') {
      console.log(`  Fixed #${id}: ${patch.clients_company_name}`);
      fixed++;
    } else {
      console.log(`  Failed #${id}:`, res?.message || JSON.stringify(res).slice(0, 120));
    }
  }

  const stats = await apireq('/api/dashboard/stats', 'GET', tok);
  const latest = stats.data?.recent_visits?.[0];
  console.log(`\nDone (${fixed} fixed). Latest visit client: ${latest?.client_company_name ?? 'n/a'}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
