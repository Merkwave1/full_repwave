/**
 * Seed purchase orders for receive-products testing.
 * Creates diverse POs: Ordered, Partially Received, Shipped — with product names & packaging.
 *
 * Usage: node scripts/test-data/seed_receive_products.js
 */
const http = require('http');

const HOST = 'localhost';
const PORT = 5050;

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

async function loadProducts(tok) {
  const res = await get(tok, '/api/products?page=1&pageSize=100');
  const list = res.data?.data || res.data || [];
  return Array.isArray(list) ? list : [];
}

function pickVariant(products, productId, preferWarehouse) {
  const product = products.find((p) => p.products_id === productId);
  if (!product?.variants?.length) return null;
  const variant = product.variants[0];
  return {
    variant_id: variant.variant_id,
    packaging_type_id: 1,
    products_name: product.products_name,
    variant_name: variant.variant_name,
  };
}

async function createPO(tok, { supplier_id, warehouse_id, notes, order_date, items }) {
  const body = {
    supplier_id,
    warehouse_id,
    order_date: order_date || new Date().toISOString(),
    notes,
    status: 'Ordered',
    items: items.map((i) => ({
      variant_id: i.variant_id,
      packaging_type_id: i.packaging_type_id ?? 1,
      quantity_ordered: i.quantity_ordered,
      unit_cost: i.unit_cost,
    })),
  };
  const r = await post(tok, '/api/purchase-orders', body);
  const id = r.data?.purchase_orders_id;
  if (!id) {
    console.warn('  Failed:', r.message || JSON.stringify(r).slice(0, 120));
    return null;
  }
  await patch(tok, `/api/purchase-orders/${id}/status`, { status: 'Ordered' });
  return id;
}

async function main() {
  const auth = await post(null, '/api/auth/login', {
    email: 'admin@demo.com',
    password: 'Admin123!',
    tenant_id: 'demo',
    login_type: 'admin',
  });
  const tok = auth.data?.token;
  if (!tok) {
    console.error('Login failed', auth);
    process.exit(1);
  }
  console.log('Auth OK');

  const products = await loadProducts(tok);
  console.log(`Loaded ${products.length} products`);

  const v = (pid) => pickVariant(products, pid, 1);
  const v1 = v(1);
  const v2 = v(2);
  const v3 = v(3);
  const v4 = v(4);
  const v5 = v(5);

  const orders = [
    {
      supplier_id: 1,
      warehouse_id: 1,
      notes: 'توريد مياه ومشروبات — مستودع القاهرة (جديد)',
      order_date: '2026-06-20T09:00:00Z',
      items: [
        { ...v1, quantity_ordered: 120, unit_cost: 2.5 },
        { ...v2, quantity_ordered: 60, unit_cost: 8.0 },
      ],
    },
    {
      supplier_id: 2,
      warehouse_id: 1,
      notes: 'توريد ألبان ووجبات — مستودع القاهرة (جديد)',
      order_date: '2026-06-21T10:30:00Z',
      items: [
        { ...v3, quantity_ordered: 80, unit_cost: 12.0 },
        { ...v5, quantity_ordered: 200, unit_cost: 5.5 },
      ],
    },
    {
      supplier_id: 3,
      warehouse_id: 2,
      notes: 'منظفات ومستلزمات — مستودع الإسكندرية (جديد)',
      order_date: '2026-06-22T11:00:00Z',
      items: [
        { ...v4, quantity_ordered: 90, unit_cost: 15.0 },
        { ...v1, quantity_ordered: 250, unit_cost: 2.4 },
      ],
    },
    {
      supplier_id: 1,
      warehouse_id: 2,
      notes: 'طلب مشروبات لفرع الإسكندرية (جديد)',
      order_date: '2026-06-23T08:00:00Z',
      items: [
        { ...v1, quantity_ordered: 400, unit_cost: 2.3 },
        { ...v2, quantity_ordered: 150, unit_cost: 7.8 },
        { ...v5, quantity_ordered: 100, unit_cost: 5.0 },
      ],
    },
    {
      supplier_id: 2,
      warehouse_id: 1,
      notes: 'طلب كبير متنوع — للاختبار (جديد)',
      order_date: '2026-06-24T07:00:00Z',
      items: [
        { ...v1, quantity_ordered: 300, unit_cost: 2.5 },
        { ...v2, quantity_ordered: 100, unit_cost: 8.5 },
        { ...v3, quantity_ordered: 70, unit_cost: 11.0 },
        { ...v4, quantity_ordered: 50, unit_cost: 14.5 },
      ],
    },
    {
      supplier_id: 3,
      warehouse_id: 1,
      notes: 'توريد منظفات للمستودع الرئيسي (جديد)',
      order_date: '2026-06-24T14:00:00Z',
      items: [{ ...v4, quantity_ordered: 180, unit_cost: 13.5 }],
    },
    {
      supplier_id: 1,
      warehouse_id: 1,
      notes: 'طلب Shipped — في الطريق (جديد)',
      order_date: '2026-06-18T12:00:00Z',
      items: [
        { ...v3, quantity_ordered: 40, unit_cost: 12.5 },
        { ...v5, quantity_ordered: 120, unit_cost: 5.2 },
      ],
      status: 'Shipped',
    },
  ];

  console.log('\n--- Creating purchase orders ---');
  const createdIds = [];
  for (const po of orders) {
    const items = po.items.filter((i) => i.variant_id);
    if (!items.length) continue;
    const id = await createPO(tok, po);
    if (!id) continue;
    createdIds.push({ id, status: po.status || 'Ordered' });
    console.log(
      `  PO #${id}: wh=${po.warehouse_id} supplier=${po.supplier_id} items=${items.length} — ${po.notes}`,
    );
    if (po.status === 'Shipped') {
      await patch(tok, `/api/purchase-orders/${id}/status`, { status: 'Shipped' });
    }
  }

  // Mark first two created as Partially Received via status (items still fully pending — UI test)
  if (createdIds.length >= 2) {
    await patch(tok, `/api/purchase-orders/${createdIds[1].id}/status`, {
      status: 'Partially Received',
    });
    console.log(`  PO #${createdIds[1].id} -> Partially Received`);
  }

  const pending = await get(tok, '/api/purchase-orders/pending-for-receive');
  const list = pending.data || [];
  console.log('\n--- Pending for receive ---');
  console.log(`Total orders: ${list.length}`);
  list.slice(0, 8).forEach((o) => {
    const names = (o.items || [])
      .slice(0, 2)
      .map((i) => i.products_name || i.variant_name || '?')
      .join(', ');
    console.log(
      `  PO#${o.purchase_orders_id} [${o.purchase_orders_status}] wh=${o.warehouse_name} items=${o.items?.length} — ${names}`,
    );
  });
  console.log('\nDone. Refresh /dashboard/inventory-management/receive-products');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
