/**
 * seed_dashboard.js — fills dashboard stats gaps for demo tenant:
 *   - Visits (recent_visits, last visit card, rep performance)
 *   - Sales returns with linked order items (top_returned_products)
 *   - Visit plans (visit management tabs)
 *   - Notifications (bell icon)
 *   - Attendance records (reports tab)
 *   - Goods receipts (inventory receive tab)
 *
 * Run: node scripts/test-data/seed_dashboard.js
 * Prerequisites: seed_data.js + seed_complete.js
 */

const http = require('http');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const HOST = 'localhost';
const PORT = 5050;
const TENANT = 'demo';

function apireq(path, method, tok, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (tok) headers.Authorization = 'Bearer ' + tok;
    if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr);
    const r = http.request({ hostname: HOST, port: PORT, path, method, headers }, (res) => {
      let b = '';
      res.on('data', (d) => (b += d));
      res.on('end', () => {
        try {
          resolve(JSON.parse(b));
        } catch {
          resolve({ raw: b.slice(0, 400) });
        }
      });
    });
    r.on('error', reject);
    if (bodyStr) r.write(bodyStr);
    r.end();
  });
}

const get = (tok, path) => apireq(path, 'GET', tok, null);
const post = (tok, path, body) => apireq(path, 'POST', tok, body);
const put = (tok, path, body) => apireq(path, 'PUT', tok, body);

const ok = (label, res) => {
  const status = res?.status || res?.message || 'ERR';
  console.log(`  ${label}: ${status}`);
  return res?.status === 'success' ? res.data : null;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const REP_ACCOUNTS = [
  { email: 'ahmed@demo.com', id: 2 },
  { email: 'mohamed@demo.com', id: 3 },
  { email: 'sara@demo.com', id: 6 },
];

async function loginRep(email) {
  const auth = await post(null, '/api/auth/login', {
    email,
    password: 'Admin123!',
    tenant_id: TENANT,
    login_type: 'rep',
  });
  return auth.data?.token || null;
}

function seedAttendanceSql() {
  const sqlPath = path.join(__dirname, '_seed_attendance.sql');
  const sql = `
INSERT INTO "RepresentativeAttendances"
  ("UserId", "AttendanceDate", "CheckInTime", "CheckOutTime",
   "CheckInLatitude", "CheckInLongitude", "CheckOutLatitude", "CheckOutLongitude",
   "Status", "Notes", "CreatedAt")
SELECT rep_id,
       (CURRENT_DATE - day_offset)::date,
       TIME '08:30:00' + (day_offset % 3) * INTERVAL '15 minutes',
       TIME '16:30:00' + (day_offset % 4) * INTERVAL '10 minutes',
       30.0444, 31.2357, 30.0450, 31.2360,
       CASE WHEN day_offset % 7 = 0 THEN 'Late' ELSE 'Present' END,
       'سجل حضور تجريبي',
       NOW()
FROM (
  SELECT unnest(ARRAY[2, 3, 6]) AS rep_id,
         generate_series(1, 21) AS day_offset
) AS src
WHERE NOT EXISTS (
  SELECT 1 FROM "RepresentativeAttendances" ra
  WHERE ra."UserId" = src.rep_id
    AND ra."AttendanceDate" = (CURRENT_DATE - src.day_offset)::date
);
`;
  fs.writeFileSync(sqlPath, sql.trim());
  try {
    execSync(
      `docker exec -i repwave_postgres psql -U repwave_user -d repwave_demo -f - < "${sqlPath}"`,
      { stdio: 'pipe', shell: true },
    );
    console.log('  Attendance SQL applied');
  } catch (err) {
    console.log('  Attendance SQL skipped:', (err.stderr || err.message || '').toString().slice(0, 120));
  } finally {
    try {
      fs.unlinkSync(sqlPath);
    } catch {
      /* ignore */
    }
  }
}

function daysAgo(n, hour = 10) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

async function main() {
  const auth = await post(null, '/api/auth/login', {
    email: 'admin@demo.com',
    password: 'Admin123!',
    tenant_id: TENANT,
    login_type: 'admin',
  });
  const tok = auth.data?.token;
  const userId = auth.data?.user_id || 1;
  console.log('Auth:', tok ? 'OK' : 'FAIL');
  if (!tok) {
    console.log(JSON.stringify(auth));
    process.exit(1);
  }

  // ── 0. Fix corrupted Arabic client names (????) ───────────────────────────
  console.log('\n════ 0. Client name encoding ════');
  try {
    require('child_process').execSync('node scripts/test-data/fix_demo_client_names.js', {
      cwd: path.join(__dirname, '..', '..'),
      stdio: 'inherit',
      encoding: 'utf8',
    });
  } catch {
    console.log('  (fix script skipped or partial)');
  }

  // ── 1. Visits ─────────────────────────────────────────────────────────────
  console.log('\n════ 1. Visits ════');
  const visitsRes = await get(tok, '/api/visits?page=1&page_size=1');
  const visitCount = visitsRes?.data?.total_count ?? 0;
  console.log(`  Existing visits: ${visitCount}`);

  if (visitCount < 8) {
    const clientsRes = await get(tok, '/api/clients?page=1&page_size=20');
    const clients = clientsRes?.data?.data || [];
    const purposes = [
      'متابعة مبيعات',
      'تحصيل مستحقات',
      'عرض منتجات جديدة',
      'زيارة دورية',
      'متابعة طلب',
    ];

    let created = 0;
    for (let i = 0; i < Math.min(clients.length, 10); i++) {
      const client = clients[i];
      if (!client?.clients_id) continue;
      const startTime = daysAgo(i % 14, 9 + (i % 5));
      const started = ok(
        `Visit client #${client.clients_id}`,
        await post(tok, '/api/visits', {
          client_id: client.clients_id,
          start_time: startTime,
          start_latitude: 30.0444 + i * 0.002,
          start_longitude: 31.2357 + i * 0.002,
          purpose: purposes[i % purposes.length],
        }),
      );
      if (started?.visits_id) {
        const endTime = new Date(started.visits_start_time || startTime);
        endTime.setUTCHours(endTime.getUTCHours() + 1);
        await put(tok, `/api/visits/${started.visits_id}/end`, {
          end_time: endTime.toISOString(),
          end_latitude: 30.0444 + i * 0.002,
          end_longitude: 31.2357 + i * 0.002,
          outcome: 'Completed successfully',
          notes: 'زيارة تجريبية',
        });
        created++;
      }
      await sleep(40);
    }
    console.log(`  Created ${created} visits`);
  } else {
    console.log('  Visits already sufficient');
  }

  // ── 2. Sales returns with linked items (top_returned_products) ───────────
  console.log('\n════ 2. Linked sales returns ════');
  const statsBefore = await get(tok, '/api/dashboard/stats');
  const topReturnedBefore = statsBefore?.data?.top_returned_products?.length ?? 0;
  console.log(`  top_returned_products before: ${topReturnedBefore}`);

  const ordersRes = await get(tok, '/api/sales-orders?page=1&page_size=30&status=Invoiced');
  const orders = ordersRes?.data?.data || [];

  let returnsCreated = 0;
  for (const order of orders.slice(0, 8)) {
    const detail = await get(tok, `/api/sales-orders/${order.sales_orders_id}`);
    const items = detail?.data?.items || [];
    const returnable = items.filter((it) => (it.quantity_returnable ?? it.sales_order_items_quantity) > 0);
    if (returnable.length === 0) continue;

    const pick = returnable[0];
    const qty = Math.min(
      5,
      Math.max(1, Math.floor((pick.quantity_returnable ?? pick.sales_order_items_quantity) / 4)),
    );

    const res = await post(tok, '/api/sales-returns', {
      client_id: order.sales_orders_client_id,
      sales_order_id: order.sales_orders_id,
      reason: 'عينة للعرض — بيانات تجريبية',
      notes: `مرتجع مرتبط ببند #${pick.sales_order_items_id}`,
      created_by_user_id: userId,
      items: [
        {
          sales_order_item_id: pick.sales_order_items_id,
          quantity: qty,
          unit_price: pick.sales_order_items_unit_price,
          notes: 'مرتجع جزئي',
        },
      ],
    });

    if (res?.status === 'success') {
      returnsCreated++;
      console.log(`  Return SO#${order.sales_orders_id} item#${pick.sales_order_items_id} qty=${qty}: OK`);
    } else {
      console.log(
        `  Skip SO#${order.sales_orders_id}: ${res?.message || JSON.stringify(res).slice(0, 80)}`,
      );
    }
    await sleep(50);
    if (returnsCreated >= 6) break;
  }
  console.log(`  Linked returns created: ${returnsCreated}`);

  // ── 3. Visit plans ────────────────────────────────────────────────────────
  console.log('\n════ 3. Visit plans ════');
  const plansRes = await get(tok, '/api/visit-plans');
  const plans = plansRes?.data || [];
  console.log(`  Existing visit plans: ${plans.length}`);

  if (plans.length < 2) {
    const clientsRes = await get(tok, '/api/clients?page=1&page_size=10');
    const clientIds = (clientsRes?.data?.data || [])
      .map((c) => c.clients_id)
      .filter(Boolean)
      .slice(0, 5);

    const today = new Date();
    const start = today.toISOString().slice(0, 10);
    const endDate = new Date(today);
    endDate.setUTCDate(endDate.getUTCDate() + 30);
    const end = endDate.toISOString().slice(0, 10);

    const plan = ok(
      'Create visit plan',
      await post(tok, '/api/visit-plans', {
        name: 'خطة زيارات أسبوعية — تجريبية',
        description: 'خطة زيارات للعملاء الرئيسيين',
        user_id: userId,
        status: 'active',
        start_date: start,
        end_date: end,
        recurrence_type: 'weekly',
        selected_days: '0,2,4',
        repeat_every: 1,
      }),
    );

    if (plan?.visit_plan_id && clientIds.length) {
      ok(
        'Sync plan clients',
        await post(tok, `/api/visit-plans/${plan.visit_plan_id}/clients/sync`, {
          client_ids: clientIds,
        }),
      );
    }
  } else {
    console.log('  Visit plans already sufficient');
  }

  // ── 4. Rep visits (rep performance chart) ─────────────────────────────────
  console.log('\n════ 4. Rep visits ════');
  const clientsRes2 = await get(tok, '/api/clients?page=1&page_size=15');
  const clientPool = clientsRes2?.data?.data || [];
  let repVisits = 0;
  for (const rep of REP_ACCOUNTS) {
    const repTok = await loginRep(rep.email);
    if (!repTok) {
      console.log(`  Skip rep ${rep.email}: login failed`);
      continue;
    }
    for (let i = 0; i < 3; i++) {
      const client = clientPool[(rep.id + i) % clientPool.length];
      if (!client?.clients_id) continue;
      const startTime = daysAgo(3 + rep.id + i, 10 + i);
      const started = await post(repTok, '/api/visits', {
        client_id: client.clients_id,
        start_time: startTime,
        start_latitude: 30.04 + rep.id * 0.001,
        start_longitude: 31.23 + rep.id * 0.001,
        purpose: 'زيارة ميدانية — تجريبية',
      });
      if (started?.status === 'success' && started.data?.visits_id) {
        const endTime = new Date(started.data.visits_start_time || startTime);
        endTime.setUTCHours(endTime.getUTCHours() + 1);
        await put(repTok, `/api/visits/${started.data.visits_id}/end`, {
          end_time: endTime.toISOString(),
          end_latitude: 30.04 + rep.id * 0.001,
          end_longitude: 31.23 + rep.id * 0.001,
          outcome: 'Completed',
          notes: 'زيارة مندوب',
        });
        repVisits++;
      }
      await sleep(40);
    }
  }
  console.log(`  Rep visits created: ${repVisits}`);

  // ── 5. Notifications ────────────────────────────────────────────────────
  console.log('\n════ 5. Notifications ════');
  const notifRes = await get(tok, '/api/notifications?page=1&page_size=1');
  const notifCount = notifRes?.data?.total_count ?? 0;
  console.log(`  Existing notifications: ${notifCount}`);
  if (notifCount < 5) {
    const samples = [
      { title: 'طلب بيع جديد', body: 'تم إنشاء طلب بيع #SO-27 للعميل سوبر ماركت النيل', channel: 'sales', priority: 'normal' },
      { title: 'مخزون منخفض', body: 'مياه معدنية 1.5 لتر — الكمية المتبقية أقل من 20', channel: 'inventory', priority: 'high' },
      { title: 'مرتجع مبيعات', body: 'تم تسجيل مرتجع جزئي من عميل بقالة الأمانة', channel: 'returns', priority: 'normal' },
      { title: 'تحصيل نقدي', body: 'تم استلام دفعة نقدية 5,000 ج.م من العميل', channel: 'payments', priority: 'normal' },
      { title: 'زيارة مكتملة', body: 'أحمد السيد أنهى زيارة عميل هايبر وان', channel: 'visits', priority: 'low' },
      { title: 'طلب شراء', body: 'طلب شراء #PO-12 بانتظار الاستلام', channel: 'purchases', priority: 'normal' },
    ];
    for (const n of samples) {
      await post(tok, '/api/notifications', n);
      await sleep(30);
    }
    console.log(`  Created ${samples.length} notifications`);
  }

  // ── 6. Attendance (reports) ─────────────────────────────────────────────
  console.log('\n════ 6. Attendance ════');
  const attBefore = await get(tok, '/api/attendance?page=1&page_size=1');
  console.log(`  Existing attendance: ${attBefore?.data?.total_count ?? 0}`);
  if ((attBefore?.data?.total_count ?? 0) < 10) {
    seedAttendanceSql();
  }

  // ── 7. Goods receipts ───────────────────────────────────────────────────
  console.log('\n════ 7. Goods receipts ════');
  const grRes = await get(tok, '/api/goods-receipts?page=1&page_size=1');
  const grCount = grRes?.data?.total_count ?? 0;
  console.log(`  Existing goods receipts: ${grCount}`);
  if (grCount < 3) {
    const posRes = await get(tok, '/api/purchase-orders?page=1&page_size=10&status=Ordered');
    const pos = posRes?.data?.data || [];
    let grCreated = 0;
    for (const po of pos.slice(0, 4)) {
      const detail = await get(tok, `/api/purchase-orders/${po.purchase_orders_id}`);
      const items = detail?.data?.items || [];
      if (!items.length || !po.purchase_orders_warehouse_id) continue;
      const receiptItems = items.slice(0, 2).map((it) => ({
        variant_id: it.purchase_order_items_variant_id,
        packaging_type_id: it.purchase_order_items_packaging_type_id || 1,
        quantity_received: Math.min(10, Math.max(1, Math.floor((it.purchase_order_items_quantity_ordered || 10) / 2))),
      }));
      const res = await post(tok, '/api/goods-receipts', {
        warehouse_id: po.purchase_orders_warehouse_id,
        purchase_order_id: po.purchase_orders_id,
        received_by_user_id: userId,
        notes: 'استلام تجريبي — بيانات العرض',
        items: receiptItems,
      });
      if (res?.status === 'success') {
        grCreated++;
        console.log(`  GR for PO#${po.purchase_orders_id}: OK`);
      }
      await sleep(50);
      if (grCreated >= 3) break;
    }
    console.log(`  Goods receipts created: ${grCreated}`);
  }

  // ── Verify dashboard ───────────────────────────────────────────────────────
  console.log('\n════ Dashboard stats after seed ════');
  const stats = await get(tok, '/api/dashboard/stats');
  const d = stats?.data || {};
  console.log('  recent_visits:', d.recent_visits?.length ?? 0);
  console.log('  top_returned_products:', d.top_returned_products?.length ?? 0);
  console.log('  top_selling_products:', d.top_selling_products?.length ?? 0);
  console.log('  low_stock_products:', d.low_stock_products?.length ?? 0);
  console.log('  returns (90d):', d.returns?.returns_30d_count ?? 0);
  console.log('  user_performance visits:', d.user_performance?.[0]?.visits_conducted ?? 'n/a');

  const attAfter = await get(tok, '/api/attendance?page=1&page_size=1');
  const notifAfter = await get(tok, '/api/notifications?page=1&page_size=1');
  const grAfter = await get(tok, '/api/goods-receipts?page=1&page_size=1');
  console.log('  attendance total:', attAfter?.data?.total_count ?? 0);
  console.log('  notifications total:', notifAfter?.data?.total_count ?? 0);
  console.log('  goods_receipts total:', grAfter?.data?.total_count ?? 0);

  console.log('\n✅ Dashboard seed complete. Refresh the ERP dashboard.');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
