const http = require('http');

const HOST = 'localhost';
const PORT = 5050;

function apireq(path, method, tok, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (tok) headers['Authorization'] = 'Bearer ' + tok;
    if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr);
    const r = http.request({ hostname: HOST, port: PORT, path, method, headers }, res => {
      let b = ''; res.on('data', d => b += d);
      res.on('end', () => { try { resolve(JSON.parse(b)); } catch(e) { resolve({ raw: b.slice(0, 300) }); } });
    });
    r.on('error', reject);
    if (bodyStr) r.write(bodyStr);
    r.end();
  });
}

const get = (tok, path) => apireq(path, 'GET', tok, null);
const post = (tok, path, body) => apireq(path, 'POST', tok, body);
const patch = (tok, path, body) => apireq(path, 'PATCH', tok, body);

async function main() {
  const auth = await post(null, '/api/auth/login', { email: 'admin@demo.com', password: 'Admin123!', tenant_id: 'demo', login_type: 'admin' });
  const tok = auth.data?.token;
  console.log('Auth:', tok ? 'OK' : 'FAIL');
  if (!tok) { console.log(JSON.stringify(auth)); return; }

  // --- Get variant IDs from inventory ---
  const inv = await get(tok, '/api/inventory?page=1&pageSize=50');
  const invData = inv.data?.data || [];
  // Map: products_id -> first variant_id for that product in wh1 and wh2
  const varByProduct = {};
  invData.forEach(i => {
    if (!varByProduct[i.products_id]) varByProduct[i.products_id] = {};
    if (!varByProduct[i.products_id][i.warehouse_id]) {
      varByProduct[i.products_id][i.warehouse_id] = { variant_id: i.variant_id, packaging_type_id: i.packaging_type_id };
    }
  });
  console.log('Variants per product:', JSON.stringify(Object.keys(varByProduct).map(pid => ({ pid, v: Object.values(varByProduct[pid])[0]?.variant_id }))));

  // Helper to get variant for product in warehouse
  const getVariant = (productId, warehouseId) => {
    return varByProduct[productId]?.[warehouseId] || varByProduct[productId]?.[1] || varByProduct[productId]?.[2] || null;
  };

  // --- Fix existing purchase orders status to "Ordered" ---
  console.log('\n--- Fixing purchase order statuses ---');
  const poRes = await get(tok, '/api/purchase-orders?page=1&pageSize=20');
  const poList = poRes.data?.data || [];
  for (const po of poList) {
    if (po.purchase_orders_status !== 'Ordered') {
      const r = await patch(tok, `/api/purchase-orders/${po.purchase_orders_id}/status`, { status: 'Ordered' });
      console.log(`PO #${po.purchase_orders_id} status -> Ordered:`, r.status || r.message || JSON.stringify(r).slice(0, 80));
    }
  }

  // --- Create new purchase orders (5 more) ---
  console.log('\n--- Creating purchase orders ---');
  const purchaseOrders = [
    {
      supplier_id: 1, warehouse_id: 1, order_date: '2026-05-01T10:00:00Z', notes: 'طلب شهر مايو - المستودع الرئيسي',
      items: [
        { variant_id: getVariant(1, 1)?.variant_id, packaging_type_id: getVariant(1, 1)?.packaging_type_id, quantity_ordered: 200, unit_cost: 2.5 },
        { variant_id: getVariant(2, 1)?.variant_id, packaging_type_id: getVariant(2, 1)?.packaging_type_id, quantity_ordered: 100, unit_cost: 8.0 },
      ]
    },
    {
      supplier_id: 2, warehouse_id: 1, order_date: '2026-05-03T10:00:00Z', notes: 'توريد أغذية - المستودع الرئيسي',
      items: [
        { variant_id: getVariant(3, 1)?.variant_id, packaging_type_id: getVariant(3, 1)?.packaging_type_id, quantity_ordered: 150, unit_cost: 12.0 },
        { variant_id: getVariant(5, 1)?.variant_id, packaging_type_id: getVariant(5, 1)?.packaging_type_id, quantity_ordered: 100, unit_cost: 5.5 },
      ]
    },
    {
      supplier_id: 3, warehouse_id: 2, order_date: '2026-05-05T10:00:00Z', notes: 'توريد منتجات تنظيف - الإسكندرية',
      items: [
        { variant_id: getVariant(4, 2)?.variant_id, packaging_type_id: getVariant(4, 2)?.packaging_type_id, quantity_ordered: 80, unit_cost: 15.0 },
        { variant_id: getVariant(1, 2)?.variant_id, packaging_type_id: getVariant(1, 2)?.packaging_type_id, quantity_ordered: 300, unit_cost: 2.5 },
      ]
    },
    {
      supplier_id: 1, warehouse_id: 2, order_date: '2026-05-08T10:00:00Z', notes: 'توريد مياه ومشروبات - الإسكندرية',
      items: [
        { variant_id: getVariant(1, 2)?.variant_id, packaging_type_id: getVariant(1, 2)?.packaging_type_id, quantity_ordered: 500, unit_cost: 2.2 },
        { variant_id: getVariant(2, 2)?.variant_id, packaging_type_id: getVariant(2, 2)?.packaging_type_id, quantity_ordered: 200, unit_cost: 7.5 },
      ]
    },
    {
      supplier_id: 2, warehouse_id: 1, order_date: '2026-05-10T10:00:00Z', notes: 'طلب إضافي - منتجات متنوعة',
      items: [
        { variant_id: getVariant(3, 1)?.variant_id, packaging_type_id: getVariant(3, 1)?.packaging_type_id, quantity_ordered: 200, unit_cost: 11.5 },
        { variant_id: getVariant(4, 1)?.variant_id, packaging_type_id: getVariant(4, 1)?.packaging_type_id, quantity_ordered: 120, unit_cost: 14.0 },
        { variant_id: getVariant(5, 1)?.variant_id, packaging_type_id: getVariant(5, 1)?.packaging_type_id, quantity_ordered: 150, unit_cost: 5.0 },
      ]
    },
  ];

  for (const po of purchaseOrders) {
    const items = po.items.filter(i => i.variant_id);
    if (!items.length) { console.log('Skipping PO - no valid variants'); continue; }
    const body = {
      supplier_id: po.supplier_id,
      warehouse_id: po.warehouse_id,
      order_date: po.order_date,
      notes: po.notes,
      items: items.map(i => ({ variant_id: i.variant_id, packaging_type_id: i.packaging_type_id, quantity_ordered: i.quantity_ordered, unit_cost: i.unit_cost }))
    };
    const r = await post(tok, '/api/purchase-orders', body);
    const id = r.data?.purchase_orders_id;
    console.log(`Created PO #${id}: supplier=${po.supplier_id}, items=${items.length}, total=${r.data?.purchase_orders_total_amount}`);
    // Update status to Ordered
    if (id) {
      const s = await patch(tok, `/api/purchase-orders/${id}/status`, { status: 'Ordered' });
      console.log(`  Status -> Ordered:`, s.status || s.message);
    }
  }

  // --- Fix existing sales orders - update to have correct status and add items if missing ---
  console.log('\n--- Checking/fixing sales orders ---');
  const soRes = await get(tok, '/api/sales-orders?page=1&pageSize=20');
  const soList = soRes.data?.data || [];
  soList.forEach(o => console.log(`SO #${o.sales_orders_id}: status=${o.sales_orders_status}, items=${o.items_count}, client=${o.clients_company_name}, rep=${o.representative_name}, wh=${o.warehouse_name}`));

  // --- Create new complete sales orders ---
  console.log('\n--- Creating new sales orders ---');
  const salesOrdersToCreate = [
    {
      client_id: 1, rep_id: 2, warehouse_id: 1, date: '2026-05-02T10:00:00Z', notes: 'طلب عميل مياه ومواد غذائية',
      items: [
        { variant_id: getVariant(1, 1)?.variant_id, packaging_type_id: getVariant(1, 1)?.packaging_type_id, qty: 50, price: 3.5 },
        { variant_id: getVariant(2, 1)?.variant_id, packaging_type_id: getVariant(2, 1)?.packaging_type_id, qty: 20, price: 12.0 },
      ]
    },
    {
      client_id: 2, rep_id: 3, warehouse_id: 2, date: '2026-05-04T10:00:00Z', notes: 'بقالة الأمانة - طلب أسبوعي',
      items: [
        { variant_id: getVariant(3, 2)?.variant_id, packaging_type_id: getVariant(3, 2)?.packaging_type_id, qty: 30, price: 18.0 },
        { variant_id: getVariant(4, 2)?.variant_id, packaging_type_id: getVariant(4, 2)?.packaging_type_id, qty: 25, price: 22.0 },
        { variant_id: getVariant(5, 2)?.variant_id, packaging_type_id: getVariant(5, 2)?.packaging_type_id, qty: 40, price: 8.0 },
      ]
    },
    {
      client_id: 3, rep_id: 6, warehouse_id: 1, date: '2026-05-06T10:00:00Z', notes: 'سوبر ماركت - طلب شهري',
      items: [
        { variant_id: getVariant(1, 1)?.variant_id, packaging_type_id: getVariant(1, 1)?.packaging_type_id, qty: 100, price: 3.2 },
        { variant_id: getVariant(5, 1)?.variant_id, packaging_type_id: getVariant(5, 1)?.packaging_type_id, qty: 60, price: 7.5 },
      ]
    },
    {
      client_id: 4, rep_id: 2, warehouse_id: 1, date: '2026-05-09T10:00:00Z', notes: 'هايبر ون - طلب كبير',
      items: [
        { variant_id: getVariant(1, 1)?.variant_id, packaging_type_id: getVariant(1, 1)?.packaging_type_id, qty: 200, price: 3.0 },
        { variant_id: getVariant(2, 1)?.variant_id, packaging_type_id: getVariant(2, 1)?.packaging_type_id, qty: 80, price: 11.5 },
        { variant_id: getVariant(3, 1)?.variant_id, packaging_type_id: getVariant(3, 1)?.packaging_type_id, qty: 50, price: 17.0 },
      ]
    },
    {
      client_id: 5, rep_id: 3, warehouse_id: 2, date: '2026-05-11T10:00:00Z', notes: 'متجر التقوى - توريد إسكندرية',
      items: [
        { variant_id: getVariant(4, 2)?.variant_id, packaging_type_id: getVariant(4, 2)?.packaging_type_id, qty: 35, price: 20.0 },
        { variant_id: getVariant(5, 2)?.variant_id, packaging_type_id: getVariant(5, 2)?.packaging_type_id, qty: 80, price: 7.0 },
      ]
    },
  ];

  for (const so of salesOrdersToCreate) {
    const items = so.items.filter(i => i.variant_id);
    if (!items.length) { console.log('Skipping SO - no valid variants'); continue; }
    const body = {
      client_id: so.client_id,
      warehouse_id: so.warehouse_id,
      order_date: so.date,
      notes: so.notes,
      items: items.map(i => ({ variant_id: i.variant_id, packaging_type_id: i.packaging_type_id, quantity: i.qty, unit_price: i.price, discount_amount: 0 }))
    };
    const r = await post(tok, `/api/sales-orders?rep_id=${so.rep_id}`, body);
    const id = r.data?.sales_orders_id;
    console.log(`Created SO #${id}: client=${so.client_id}, rep=${so.rep_id}, items=${items.length}, total=${r.data?.sales_orders_total_amount}`);
    // Update status to Invoiced
    if (id) {
      const s = await patch(tok, `/api/sales-orders/${id}/status`, { status: 'Invoiced' });
      console.log(`  Status -> Invoiced:`, s.status || s.message);
    }
  }

  // --- Verify final counts ---
  console.log('\n--- Final state ---');
  const finalPO = await get(tok, '/api/purchase-orders?page=1&pageSize=30');
  const finalSO = await get(tok, '/api/sales-orders?page=1&pageSize=30');
  const poCounted = finalPO.data?.data || [];
  const soCounted = finalSO.data?.data || [];
  console.log('Total POs:', poCounted.length, 'statuses:', [...new Set(poCounted.map(p => p.purchase_orders_status))].join(', '));
  console.log('Total SOs:', soCounted.length, 'invoiced:', soCounted.filter(o => o.sales_orders_status === 'Invoiced').length);
  poCounted.forEach(p => console.log(`  PO#${p.purchase_orders_id}: ${p.purchase_orders_status} | supplier=${p.supplier_name} | wh=${p.warehouse_name} | items=${p.items_count} | total=${p.purchase_orders_total_amount}`));
}

main().catch(console.error);
