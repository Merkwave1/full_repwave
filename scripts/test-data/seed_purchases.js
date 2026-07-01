/**
 * seed_purchases.js
 * Seeds purchase returns + extra supplier payments for demo tenant.
 * Run: node scripts/test-data/seed_purchases.js
 */

const http = require('http');

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
const patch = (tok, path, body) => apireq(path, 'PATCH', tok, body);

function ok(label, res) {
  const status = res?.status || res?.message || (res?.data ? 'OK' : JSON.stringify(res).slice(0, 160));
  console.log(`  ${label}: ${status}`);
  return res?.data ?? res;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function unwrapList(res) {
  const inner = res?.data;
  if (Array.isArray(inner)) return inner;
  if (Array.isArray(inner?.data)) return inner.data;
  return [];
}

async function main() {
  const auth = await post(null, '/api/auth/login', {
    email: 'admin@demo.com',
    password: 'Admin123!',
    tenant_id: TENANT,
    login_type: 'admin',
  });
  const tok = auth.data?.token;
  console.log('Auth:', tok ? 'OK' : 'FAIL');
  if (!tok) {
    console.log(JSON.stringify(auth));
    return;
  }

  const statuses = ['Ordered', 'Partially Received', 'Received', 'Shipped'];
  const poRes = await get(tok, `/api/purchase-orders?pageSize=50&status=${encodeURIComponent(statuses.join(','))}`);
  const purchaseOrders = unwrapList(poRes);
  console.log(`Purchase orders (invoice-eligible): ${purchaseOrders.length}`);

  const returnsRes = await get(tok, '/api/purchase-returns');
  const existingReturns = unwrapList(returnsRes);
  console.log(`Existing purchase returns: ${existingReturns.length}`);

  const suppliers = unwrapList(await get(tok, '/api/suppliers?pageSize=50'));
  const safes = unwrapList(await get(tok, '/api/safes'));
  const methods = unwrapList(await get(tok, '/api/lookups/payment-methods'));

  const safe1 = safes[0]?.safes_id || safes[0]?.safe_id || 1;
  const method1 = methods[0]?.payment_method_id || methods[0]?.payment_methods_id || 1;

  // ── Purchase Returns ─────────────────────────────────────────────────────
  console.log('\n════ Purchase Returns ════');

  if (existingReturns.length < 5) {
    const pendingRes = await get(tok, '/api/purchase-orders/pending-for-receive');
    const pendingOrders = unwrapList(pendingRes);
    const candidates =
      pendingOrders.length > 0
        ? pendingOrders
        : purchaseOrders.slice(0, 6).map((po) => ({ ...po, items: [] }));

    const reasons = [
      'بضاعة تالفة',
      'كمية زائدة',
      'خطأ في التوريد',
      'انتهاء صلاحية قريب',
      'تغليف مكسور',
      'منتج غير مطابق للمواصفات',
    ];

    let createdCount = 0;
    for (let i = 0; i < candidates.length && createdCount < 6; i++) {
      const po = candidates[i];
      const items = po.items || [];
      if (!items.length) {
        console.log(`  Skip PO #${po.purchase_orders_id} — no items in response`);
        continue;
      }

      const firstItem = items[0];
      const qty = Math.max(
        1,
        Math.min(
          5,
          Math.floor(
            (firstItem.purchase_order_items_quantity_ordered ||
              firstItem.quantity_pending ||
              10) / 4,
          ),
        ),
      );
      const unitCost = parseFloat(
        firstItem.purchase_order_items_unit_cost || 10,
      );

      const payload = {
        purchase_order_id: po.purchase_orders_id,
        supplier_id: po.purchase_orders_supplier_id,
        warehouse_id: po.purchase_orders_warehouse_id,
        date: new Date(Date.now() - i * 86400000).toISOString(),
        reason: reasons[i % reasons.length],
        notes: `مرتجع تجريبي لأمر شراء #${po.purchase_orders_id}`,
        items: [
          {
            purchase_order_item_id: firstItem.purchase_order_items_id,
            quantity: qty,
            unit_cost: unitCost,
            notes: 'بند مرتجع',
          },
        ],
      };

      const created = await post(tok, '/api/purchase-returns', payload);
      const row = ok(`Return for PO #${po.purchase_orders_id}`, created);
      if (row?.purchase_returns_id && i % 2 === 1) {
        await patch(tok, `/api/purchase-returns/${row.purchase_returns_id}/status`, {
          status: 'Approved',
        });
        ok(`  → Approved #${row.purchase_returns_id}`, { status: 'success' });
      }
      createdCount += 1;
      await sleep(80);
    }
  } else {
    console.log('  Skipped — enough returns already exist');
  }

  // ── Supplier Payments ────────────────────────────────────────────────────
  console.log('\n════ Supplier Payments ════');

  const spRes = await get(tok, '/api/supplier-payments?pageSize=50');
  const existingSp = unwrapList(spRes);
  console.log(`Existing supplier payments: ${existingSp.length}`);

  if (existingSp.length < 10) {
    const payments = [
      { supplier_id: suppliers[0]?.supplier_id || 1, amount: 2500, notes: 'دفعة مورد - فاتورة مايو', daysAgo: 3 },
      { supplier_id: suppliers[1]?.supplier_id || 2, amount: 4200, notes: 'سداد جزئي - أغذية', daysAgo: 7 },
      { supplier_id: suppliers[2]?.supplier_id || 3, amount: 1800, notes: 'دفعة منظفات', daysAgo: 10 },
      { supplier_id: suppliers[0]?.supplier_id || 1, amount: 3100, notes: 'دفعة ثانية - مياه', daysAgo: 14, purchase_order_id: purchaseOrders[0]?.purchase_orders_id },
      { supplier_id: suppliers[1]?.supplier_id || 2, amount: 5500, notes: 'تسوية رصيد مورد', daysAgo: 18 },
    ];

    for (const p of payments) {
      const d = new Date();
      d.setDate(d.getDate() - p.daysAgo);
      const body = {
        supplier_id: p.supplier_id,
        safe_id: safe1,
        payment_method_id: method1,
        amount: p.amount,
        payment_date: d.toISOString().slice(0, 10),
        notes: p.notes,
        purchase_order_id: p.purchase_order_id || null,
      };
      ok(`Payment ${p.amount} → supplier #${p.supplier_id}`, await post(tok, '/api/supplier-payments', body));
      await sleep(60);
    }
  } else {
    console.log('  Skipped — enough supplier payments exist');
  }

  // ── Verify ───────────────────────────────────────────────────────────────
  console.log('\n════ Final counts ════');
  const invRes = await get(
    tok,
    `/api/purchase-orders?pageSize=1&status=${encodeURIComponent(statuses.join(','))}`,
  );
  const finalReturns = unwrapList(await get(tok, '/api/purchase-returns'));
  const finalSp = unwrapList(await get(tok, '/api/supplier-payments?pageSize=50'));

  console.log('  Purchase invoices (eligible POs):', invRes?.data?.total_count ?? unwrapList(invRes).length);
  console.log('  Purchase returns:', finalReturns.length);
  console.log('  Supplier payments:', finalSp.length);
  console.log('\n✅ Done — refresh browser (clear localStorage cache if lists stay empty).');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
