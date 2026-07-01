/**
 * seed_inventory.js
 * Seeds: ProductAttributes, AttributeValues, TransferRequests, Transfers,
 *        GoodsReceipts, SalesDeliveries (+ updates SOs to Invoiced first)
 *
 * Prerequisites: run scripts/test-data/seed_data.js first (products/variants/POs/SOs must exist)
 * Run: node scripts/test-data/seed_inventory.js
 */

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
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { resolve({ raw: b.slice(0, 400) }); } });
    });
    r.on('error', reject);
    if (bodyStr) r.write(bodyStr);
    r.end();
  });
}

const get  = (tok, path)       => apireq(path, 'GET',   tok, null);
const post = (tok, path, body) => apireq(path, 'POST',  tok, body);
const patch= (tok, path, body) => apireq(path, 'PATCH', tok, body);

// ─────────────────────────────────────────────────────────────────────────────
async function main() {

  // ── Auth ──────────────────────────────────────────────────────────────────
  const auth = await post(null, '/api/auth/login', {
    email: 'nassarkhaledd@gmail.com',
    password: 'nassar1234',
    tenant_id: 'nassar',
    login_type: 'admin',
  });
  const tok = auth.data?.token;
  console.log('Auth:', tok ? 'OK' : 'FAIL');
  if (!tok) { console.log(JSON.stringify(auth)); return; }

  // ── 1. Product Attributes ─────────────────────────────────────────────────
  console.log('\n════ 1. إنشاء خصائص المنتجات ════');

  // Skip if already exist
  const existingAttrs = (await get(tok, '/api/product-attributes')).data || [];
  if (existingAttrs.length > 0) {
    console.log(`  موجود بالفعل: ${existingAttrs.length} خاصية – يتم تخطي الإنشاء`);
  }

  const attrDefs = [
    { name: 'الحجم',        desc: 'حجم المنتج (مل أو جرام)' },
    { name: 'اللون',        desc: 'لون المنتج أو التغليف' },
    { name: 'النكهة',       desc: 'نكهة المنتج' },
    { name: 'الوزن',        desc: 'وزن المنتج بالجرام أو الكيلوجرام' },
    { name: 'نوع التعبئة',  desc: 'شكل التعبئة والتغليف' },
  ];

  const attrIds = {};

  // Collect existing first
  for (const ea of existingAttrs) {
    attrIds[ea.attribute_name] = ea.attribute_id;
  }

  for (const a of attrDefs) {
    if (attrIds[a.name]) {
      console.log(`  [موجود] "${a.name}" → id=${attrIds[a.name]}`);
      continue;
    }
    const r = await post(tok, '/api/product-attributes', {
      attribute_name: a.name,
      attribute_description: a.desc,
    });
    const id = r.data?.attribute_id;
    if (id) {
      attrIds[a.name] = id;
      console.log(`  [أُنشئ] "${a.name}" → id=${id}`);
    } else {
      console.log(`  [خطأ] "${a.name}": ${JSON.stringify(r).slice(0, 150)}`);
    }
  }

  // ── 2. Attribute Values ───────────────────────────────────────────────────
  console.log('\n════ 2. إنشاء قيم الخصائص ════');

  const valueDefs = {
    'الحجم':       ['250 مل', '500 مل', '750 مل', '1 لتر', '1.5 لتر', '100 جرام', '200 جرام', '1 كجم'],
    'اللون':       ['شفاف', 'أبيض', 'أخضر', 'أحمر', 'أزرق', 'ذهبي'],
    'النكهة':      ['طبيعي', 'بالمانجو', 'بالتوت', 'بالنعناع', 'بالليمون', 'مخلوط فواكه'],
    'الوزن':       ['50 جرام', '100 جرام', '200 جرام', '500 جرام', '1 كجم', '2 كجم'],
    'نوع التعبئة': ['زجاجة', 'علبة بلاستيك', 'كيس', 'كرتون', 'برطمان زجاجي'],
  };

  for (const [attrName, values] of Object.entries(valueDefs)) {
    const attrId = attrIds[attrName];
    if (!attrId) { console.log(`  [تخطي] قيم "${attrName}" – لا يوجد id للخاصية`); continue; }

    // Check existing values
    const existingVals = (await get(tok, `/api/product-attributes/${attrId}/values`)).data || [];
    const existingNames = new Set(existingVals.map(v => v.value_text));

    let created = 0;
    for (const val of values) {
      if (existingNames.has(val)) continue;
      const r = await post(tok, '/api/attribute-values', {
        attribute_value_attribute_id: attrId,
        attribute_value_value: val,
      });
      if (r.data?.attribute_value_id) created++;
      else console.log(`  [خطأ] قيمة "${val}": ${JSON.stringify(r).slice(0, 120)}`);
    }
    console.log(`  "${attrName}": ${existingVals.length} موجود، ${created} أُضيف`);
  }

  // ── 3. Transfer Requests ──────────────────────────────────────────────────
  console.log('\n════ 3. إنشاء طلبات التحويل ════');

  const existingTrReqs = (await get(tok, '/api/transfer-requests')).data || [];
  console.log(`  طلبات التحويل الحالية: ${existingTrReqs.length}`);

  if (existingTrReqs.length === 0) {
    const trReqDefs = [
      { date: '2026-05-02T09:00:00Z', notes: 'طلب تحويل بضاعة من المستودع الرئيسي إلى الجيزة' },
      { date: '2026-05-05T10:00:00Z', notes: 'طلب تحويل مخزون زيادة من فرع الجيزة' },
      { date: '2026-05-08T11:00:00Z', notes: 'تحويل عاجل – منتجات مطلوبة بشكل فوري' },
      { date: '2026-05-10T08:30:00Z', notes: 'طلب تحويل دوري شهري للمخزون' },
      { date: '2026-05-14T14:00:00Z', notes: 'تحويل مواد تغليف ومنتجات إضافية' },
    ];
    const trReqIds = [];
    for (const req of trReqDefs) {
      const r = await post(tok, '/api/transfer-requests', { date: req.date, notes: req.notes });
      const id = r.data?.request_id;
      if (id) {
        trReqIds.push(id);
        console.log(`  [أُنشئ] طلب#${id}: ${req.notes.slice(0, 35)}`);
      } else {
        console.log(`  [خطأ] ${JSON.stringify(r).slice(0, 150)}`);
        trReqIds.push(null);
      }
    }

    // Update statuses
    const statusUpdates = [
      { idx: 1, status: 'Approved'  },
      { idx: 2, status: 'Completed' },
      { idx: 3, status: 'Rejected'  },
    ];
    for (const su of statusUpdates) {
      const id = trReqIds[su.idx];
      if (id) {
        await patch(tok, `/api/transfer-requests/${id}/status`, { status: su.status });
        console.log(`  طلب#${id} → ${su.status}`);
      }
    }
  } else {
    console.log('  تم تخطي الإنشاء (موجودة بالفعل)');
  }

  // ── 4. Transfers ──────────────────────────────────────────────────────────
  console.log('\n════ 4. إنشاء التحويلات ════');

  const existingTransfers = (await get(tok, '/api/transfers')).data || [];
  console.log(`  التحويلات الحالية: ${existingTransfers.length}`);

  if (existingTransfers.length === 0) {
    const transferDefs = [
      {
        from_warehouse_id: 1, to_warehouse_id: 2,
        date: '2026-05-03T10:00:00Z', status: 'Completed',
        notes: 'تحويل مياه ناصر وعصير مانجو للفرع – الجيزة',
        items: [
          { variant_id: 1, packaging_type_id: 1, quantity: 50 },
          { variant_id: 3, packaging_type_id: 1, quantity: 30 },
        ],
      },
      {
        from_warehouse_id: 2, to_warehouse_id: 1,
        date: '2026-05-06T09:00:00Z', status: 'Completed',
        notes: 'تحويل أرز بسمتي وزيت زيتون من الجيزة للمستودع الرئيسي',
        items: [
          { variant_id: 5, packaging_type_id: 1, quantity: 40 },
          { variant_id: 7, packaging_type_id: 1, quantity: 20 },
        ],
      },
      {
        from_warehouse_id: 1, to_warehouse_id: 2,
        date: '2026-05-09T11:00:00Z', status: 'Pending',
        notes: 'تحويل منتجات العناية الشخصية (شامبو وصابون)',
        items: [
          { variant_id: 9,  packaging_type_id: 1, quantity: 25 },
          { variant_id: 10, packaging_type_id: 1, quantity: 15 },
        ],
      },
      {
        from_warehouse_id: 2, to_warehouse_id: 1,
        date: '2026-05-12T14:00:00Z', status: 'Pending',
        notes: 'تحويل جبن وشيبس لتعديل توازن المخزون',
        items: [
          { variant_id: 8,  packaging_type_id: 1, quantity: 10 },
          { variant_id: 12, packaging_type_id: 1, quantity: 35 },
        ],
      },
      {
        from_warehouse_id: 1, to_warehouse_id: 2,
        date: '2026-05-15T08:00:00Z', status: 'Cancelled',
        notes: 'تحويل ملغي – توقف الشحنة بسبب خلل في المركبة',
        items: [
          { variant_id: 6, packaging_type_id: 1, quantity: 60 },
        ],
      },
    ];

    for (const tr of transferDefs) {
      const r = await post(tok, '/api/transfers', {
        from_warehouse_id: tr.from_warehouse_id,
        to_warehouse_id:   tr.to_warehouse_id,
        date:              tr.date,
        notes:             tr.notes,
        status:            tr.status,
        items:             tr.items,
      });
      const id = r.data?.transfer_id;
      if (id) {
        console.log(`  [أُنشئ] تحويل#${id}: مخزن${tr.from_warehouse_id}→${tr.to_warehouse_id} (${tr.status}) عناصر=${tr.items.length}`);
      } else {
        console.log(`  [خطأ] ${JSON.stringify(r).slice(0, 200)}`);
      }
    }
  } else {
    console.log('  تم تخطي الإنشاء (موجودة بالفعل)');
  }

  // ── 5. Goods Receipts (استلام بضاعة) ─────────────────────────────────────
  console.log('\n════ 5. إنشاء سجلات استلام البضاعة ════');

  const existingGR = (await get(tok, '/api/goods-receipts')).data?.data || [];
  console.log(`  سجلات الاستلام الحالية: ${existingGR.length}`);

  if (existingGR.length === 0) {
    const grDefs = [
      {
        warehouse_id: 1, purchase_order_id: 1,
        date: '2026-05-02T08:00:00Z',
        notes: 'استلام شحنة أولى من شركة النهر للتوزيع – مياه وعصير',
        items: [
          { variant_id: 1, packaging_type_id: 1, quantity_received: 300, production_date: '2026-04-01' },
          { variant_id: 2, packaging_type_id: 1, quantity_received: 150, production_date: '2026-04-01' },
        ],
      },
      {
        warehouse_id: 1, purchase_order_id: 2,
        date: '2026-05-04T09:00:00Z',
        notes: 'استلام منتجات مصنع الفجر الجديد – أرز وزيت زيتون',
        items: [
          { variant_id: 5, packaging_type_id: 1, quantity_received: 200, production_date: '2026-03-15' },
          { variant_id: 7, packaging_type_id: 1, quantity_received: 80,  production_date: '2025-12-01' },
        ],
      },
      {
        warehouse_id: 2, purchase_order_id: 3,
        date: '2026-05-07T10:00:00Z',
        notes: 'استلام جزئي من المورد – فرع الجيزة (عصير وشامبو)',
        items: [
          { variant_id: 3, packaging_type_id: 1, quantity_received: 120, production_date: '2026-04-10' },
          { variant_id: 9, packaging_type_id: 1, quantity_received: 60,  production_date: '2026-02-01' },
        ],
      },
      {
        warehouse_id: 1, purchase_order_id: 4,
        date: '2026-05-11T08:30:00Z',
        notes: 'استلام شحنة شركة الدلتا – صابون وشيبس',
        items: [
          { variant_id: 10, packaging_type_id: 1, quantity_received: 100, production_date: '2026-04-20' },
          { variant_id: 12, packaging_type_id: 1, quantity_received: 75,  production_date: '2026-04-15' },
        ],
      },
      {
        warehouse_id: 2, purchase_order_id: null,
        date: '2026-05-13T11:00:00Z',
        notes: 'استلام طارئ بدون أمر شراء – جبن وعصير إضافي',
        items: [
          { variant_id: 8, packaging_type_id: 1, quantity_received: 40, production_date: '2026-04-25' },
          { variant_id: 4, packaging_type_id: 1, quantity_received: 90, production_date: '2026-04-10' },
        ],
      },
    ];

    for (const gr of grDefs) {
      const r = await post(tok, '/api/goods-receipts', {
        warehouse_id:        gr.warehouse_id,
        purchase_order_id:   gr.purchase_order_id,
        date:                gr.date,
        notes:               gr.notes,
        items: gr.items.map(i => ({
          variant_id:        i.variant_id,
          packaging_type_id: i.packaging_type_id,
          quantity_received: i.quantity_received,
          production_date:   i.production_date,
        })),
      });
      const id = r.data?.goods_receipt_id;
      if (id) {
        console.log(`  [أُنشئ] استلام#${id}: مخزن=${gr.warehouse_id} أمرشراء=${gr.purchase_order_id ?? 'لا يوجد'} عناصر=${gr.items.length}`);
      } else {
        console.log(`  [خطأ] مخزن=${gr.warehouse_id}: ${JSON.stringify(r).slice(0, 200)}`);
      }
    }
  } else {
    console.log('  تم تخطي الإنشاء (موجودة بالفعل)');
  }

  // ── 6. Update SOs to "Invoiced" before creating deliveries ───────────────
  console.log('\n════ 6. تحديث حالة أوامر البيع إلى "مفوتر" ════');
  // SO1, SO2, SO3, SO5 (confirmed → Invoiced)
  for (const soId of [1, 2, 3, 5]) {
    const r = await patch(tok, `/api/sales-orders/${soId}/status`, { status: 'Invoiced' });
    console.log(`  SO#${soId} → Invoiced: ${r.status ?? r.message ?? JSON.stringify(r).slice(0, 60)}`);
  }

  // ── 7. Sales Deliveries (تسليم بضاعة للعملاء) ────────────────────────────
  console.log('\n════ 7. إنشاء سجلات تسليم البضاعة ════');

  const existingSD = (await get(tok, '/api/sales-deliveries')).data || [];
  console.log(`  سجلات التسليم الحالية: ${existingSD.length}`);

  if (existingSD.length === 0) {
    // SO Items reference (from DB snapshot):
    // SO1 items: id=1(v2,qty6), id=2(v3,qty10), id=3(v10,qty9), id=4(v12,qty1)
    // SO2 items: id=5(v5,qty5)
    // SO3 items: id=6(v7,qty6), id=7(v9,qty3)
    // SO5 items: id=10(v1,qty20), id=11(v12,qty5)
    const sdDefs = [
      {
        sales_order_id:   1,
        delivery_status:  'Delivered',
        delivery_date:    '2026-05-04T09:00:00Z',
        notes:            'تسليم كامل لسوبر ماركت الوطن – القاهرة',
        items: [
          { sales_order_item_id: 1, quantity_delivered: 6  },
          { sales_order_item_id: 2, quantity_delivered: 10 },
          { sales_order_item_id: 3, quantity_delivered: 9  },
          { sales_order_item_id: 4, quantity_delivered: 1  },
        ],
      },
      {
        sales_order_id:   2,
        delivery_status:  'Delivered',
        delivery_date:    '2026-05-06T10:00:00Z',
        notes:            'تسليم كامل لبقالة الأمل – شحنة أرز بسمتي',
        items: [
          { sales_order_item_id: 5, quantity_delivered: 5 },
        ],
      },
      {
        sales_order_id:   3,
        delivery_status:  'Partial',
        delivery_date:    '2026-05-09T11:30:00Z',
        notes:            'تسليم جزئي لصيدلية الشفاء الجديدة – بانتظار باقي الكمية',
        items: [
          { sales_order_item_id: 6, quantity_delivered: 4 },
          { sales_order_item_id: 7, quantity_delivered: 2 },
        ],
      },
      {
        sales_order_id:   5,
        delivery_status:  'Delivered',
        delivery_date:    '2026-05-13T08:00:00Z',
        notes:            'تسليم كامل لمطعم البيت – مياه وشيبس',
        items: [
          { sales_order_item_id: 10, quantity_delivered: 20 },
          { sales_order_item_id: 11, quantity_delivered: 5  },
        ],
      },
    ];

    for (const sd of sdDefs) {
      const r = await post(tok, '/api/sales-deliveries', {
        sales_order_id:  sd.sales_order_id,
        delivery_status: sd.delivery_status,
        delivery_date:   sd.delivery_date,
        notes:           sd.notes,
        items: sd.items.map(i => ({
          sales_order_item_id: i.sales_order_item_id,
          quantity_delivered:  i.quantity_delivered,
        })),
      });
      const id = r.data?.sales_deliveries_id;
      if (id) {
        console.log(`  [أُنشئ] تسليم#${id}: SO=${sd.sales_order_id} حالة=${sd.delivery_status} عناصر=${sd.items.length}`);
      } else {
        console.log(`  [خطأ] SO#${sd.sales_order_id}: ${JSON.stringify(r).slice(0, 200)}`);
      }
    }
  } else {
    console.log('  تم تخطي الإنشاء (موجودة بالفعل)');
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n════ ملخص نهائي ════');
  const finalAttrs   = (await get(tok, '/api/product-attributes')).data || [];
  const finalTrReqs  = (await get(tok, '/api/transfer-requests')).data || [];
  const finalTrans   = (await get(tok, '/api/transfers')).data || [];
  const finalGR      = (await get(tok, '/api/goods-receipts')).data?.data || [];
  const finalSD      = (await get(tok, '/api/sales-deliveries')).data || [];

  console.log(`  خصائص المنتجات : ${finalAttrs.length}`);
  console.log(`  طلبات التحويل  : ${finalTrReqs.length}`);
  console.log(`  التحويلات      : ${finalTrans.length}`);
  console.log(`  استلام بضاعة   : ${finalGR.length}`);
  console.log(`  تسليم بضاعة    : ${finalSD.length}`);
  console.log('\n✓ اكتمل البذر بنجاح!');
}

main().catch(console.error);
