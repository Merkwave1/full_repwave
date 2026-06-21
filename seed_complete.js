/**
 * seed_complete.js
 * Seeds all missing demo data:
 *   - Payments (client cash) → FinancialTransactions
 *   - Safe transactions (safe management)
 *   - Safe transfers
 *   - More sales returns linked to real sales orders
 *   - Supplier payments
 *
 * Prerequisites: seed_data.js already run (products, variants, clients, sales orders, safes exist)
 * Run: node seed_complete.js
 */

const http = require('http');

const HOST = 'localhost';
const PORT = 5050;
const TENANT = 'demo';

function apireq(path, method, tok, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json',
      'X-Tenant-Id': TENANT,
    };
    if (tok) headers['Authorization'] = 'Bearer ' + tok;
    if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr);
    const r = http.request({ hostname: HOST, port: PORT, path, method, headers }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => {
        try { resolve(JSON.parse(b)); }
        catch (e) { resolve({ raw: b.slice(0, 400) }); }
      });
    });
    r.on('error', reject);
    if (bodyStr) r.write(bodyStr);
    r.end();
  });
}

const get   = (tok, path)        => apireq(path, 'GET',   tok, null);
const post  = (tok, path, body)  => apireq(path, 'POST',  tok, body);
const patch = (tok, path, body)  => apireq(path, 'PATCH', tok, body);

function ok(label, res) {
  const status = res?.status || res?.message || (res?.data ? 'OK' : JSON.stringify(res).slice(0, 120));
  console.log(`  ${label}: ${status}`);
  return res?.data || res;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─────────────────────────────────────────────────────────────────────────────
async function main() {

  // ── Auth ──────────────────────────────────────────────────────────────────
  const auth = await post(null, '/api/auth/login', {
    email: 'admin@demo.com',
    password: 'Admin123!',
    tenant_id: TENANT,
    login_type: 'admin',
  });
  const tok = auth.data?.token;
  console.log('Auth:', tok ? 'OK' : 'FAIL');
  if (!tok) { console.log(JSON.stringify(auth)); return; }

  const userId = auth.data?.user?.users_id || auth.data?.users_id || 1;
  console.log('User ID:', userId);

  // ── Fetch existing reference data ─────────────────────────────────────────
  console.log('\n════ Loading existing data ════');

  const clientsRes = await get(tok, '/api/clients?page_size=50');
  const clients = clientsRes?.data?.data || clientsRes?.data || [];
  console.log(`  Clients: ${clients.length}`);

  const safesRes = await get(tok, '/api/safes');
  const safes = safesRes?.data || [];
  console.log(`  Safes: ${safes.length}`);
  safes.forEach(s => console.log(`    Safe #${s.safes_id}: ${s.safes_name} (balance: ${s.safes_balance})`));

  const paymentMethodsRes = await get(tok, '/api/lookups/payment-methods');
  const paymentMethods = paymentMethodsRes?.data || [];
  console.log(`  Payment Methods: ${paymentMethods.length}`);
  paymentMethods.forEach(m => console.log(`    Method #${m.payment_method_id}: ${m.payment_method_name}`));

  const soRes = await get(tok, '/api/sales-orders?page_size=50');
  const salesOrders = soRes?.data?.data || soRes?.data || [];
  console.log(`  Sales Orders: ${salesOrders.length}`);

  const suppliersRes = await get(tok, '/api/suppliers?page_size=50');
  const suppliers = suppliersRes?.data?.data || suppliersRes?.data || [];
  console.log(`  Suppliers: ${suppliers.length}`);

  // ── Use safe 1 and safe 2 as cash safes ──────────────────────────────────
  const safe1 = safes[0] || { safes_id: 1 };
  const safe2 = safes[1] || { safes_id: 2 };
  const safe3 = safes[2] || { safes_id: 3 };
  const method1 = paymentMethods[0]?.payment_method_id || 1;
  const method2 = paymentMethods[1]?.payment_method_id || 2;

  const client1 = clients[0] || { clients_id: 1 };
  const client2 = clients[1] || { clients_id: 2 };
  const client3 = clients[2] || { clients_id: 3 };
  const client4 = clients[3] || { clients_id: 4 };
  const client5 = clients[4] || { clients_id: 5 };

  // ── 1. Client Payments (→ Payments table + SafeTransactions) ─────────────
  console.log('\n════ 1. إضافة مدفوعات العملاء (client payments) ════');

  const clientPayments = [
    { client_id: client1.clients_id, method_id: method1, amount: 1500.00, date: '2026-05-02', safe_id: safe1.safes_id, notes: 'دفعة جزئية - مايو' },
    { client_id: client2.clients_id, method_id: method1, amount: 2200.00, date: '2026-05-05', safe_id: safe1.safes_id, notes: 'سداد فاتورة أبريل' },
    { client_id: client3.clients_id, method_id: method2, amount: 850.50,  date: '2026-05-08', safe_id: safe2.safes_id, notes: 'تحويل بنكي' },
    { client_id: client1.clients_id, method_id: method1, amount: 3000.00, date: '2026-05-10', safe_id: safe1.safes_id, notes: 'دفعة مقدمة لأمر شراء' },
    { client_id: client4.clients_id, method_id: method1, amount: 750.00,  date: '2026-05-12', safe_id: safe1.safes_id, notes: 'سداد جزئي' },
    { client_id: client2.clients_id, method_id: method2, amount: 1100.00, date: '2026-05-14', safe_id: safe2.safes_id, notes: 'شيك بنكي' },
    { client_id: client5.clients_id, method_id: method1, amount: 2500.00, date: '2026-05-16', safe_id: safe1.safes_id, notes: 'دفعة مايو الأولى' },
    { client_id: client3.clients_id, method_id: method1, amount: 400.00,  date: '2026-05-18', safe_id: safe1.safes_id, notes: 'تسوية حساب' },
    { client_id: client4.clients_id, method_id: method2, amount: 1800.00, date: '2026-05-20', safe_id: safe2.safes_id, notes: 'تحويل إلكتروني' },
    { client_id: client1.clients_id, method_id: method1, amount: 950.00,  date: '2026-05-22', safe_id: safe1.safes_id, notes: 'دفعة مايو الثانية' },
    { client_id: client5.clients_id, method_id: method1, amount: 1350.00, date: '2026-05-24', safe_id: safe1.safes_id, notes: 'سداد رصيد مستحق' },
    { client_id: client2.clients_id, method_id: method1, amount: 600.00,  date: '2026-05-26', safe_id: safe1.safes_id, notes: 'دفعة نقدية' },
    { client_id: client3.clients_id, method_id: method2, amount: 2100.00, date: '2026-05-28', safe_id: safe2.safes_id, notes: 'تسوية نهاية الشهر' },
  ];

  for (const p of clientPayments) {
    const r = await post(tok, '/api/payments', p);
    ok(`دفعة عميل #${p.client_id} (${p.amount} ج.م)`, r);
    await sleep(50);
  }

  // ── 2. Financial Transactions (client cash movements) ────────────────────
  console.log('\n════ 2. إضافة حركات مالية (financial transactions) ════');

  const financialTxns = [
    { type: 'payment', amount: 1500.00, date: '2026-05-02T10:30:00Z', notes: 'استلام دفعة - عباسية كويك مارت', safe_id: safe1.safes_id, user_id: userId, reference: 'PMT-001' },
    { type: 'payment', amount: 2200.00, date: '2026-05-05T11:00:00Z', notes: 'سداد فاتورة - النصر للتجارة', safe_id: safe1.safes_id, user_id: userId, reference: 'PMT-002' },
    { type: 'refund',  amount: 320.00,  date: '2026-05-06T09:00:00Z', notes: 'رد مبلغ - بضاعة مرتجعة', safe_id: safe1.safes_id, user_id: userId, reference: 'REF-001' },
    { type: 'payment', amount: 850.50,  date: '2026-05-08T14:00:00Z', notes: 'تحويل بنكي - الهرم ستور', safe_id: safe2.safes_id, user_id: userId, reference: 'PMT-003' },
    { type: 'payment', amount: 3000.00, date: '2026-05-10T10:00:00Z', notes: 'دفعة مقدمة - عباسية كويك مارت', safe_id: safe1.safes_id, user_id: userId, reference: 'PMT-004' },
    { type: 'refund',  amount: 150.00,  date: '2026-05-11T16:00:00Z', notes: 'استرداد - منتج تالف', safe_id: safe1.safes_id, user_id: userId, reference: 'REF-002' },
    { type: 'payment', amount: 750.00,  date: '2026-05-12T09:30:00Z', notes: 'سداد جزئي - الدلتا للتوزيع', safe_id: safe1.safes_id, user_id: userId, reference: 'PMT-005' },
    { type: 'payment', amount: 1100.00, date: '2026-05-14T13:00:00Z', notes: 'شيك بنكي - النصر للتجارة', safe_id: safe2.safes_id, user_id: userId, reference: 'PMT-006' },
    { type: 'payment', amount: 2500.00, date: '2026-05-16T11:30:00Z', notes: 'دفعة مايو - سوبر ماركت حسن', safe_id: safe1.safes_id, user_id: userId, reference: 'PMT-007' },
    { type: 'refund',  amount: 480.00,  date: '2026-05-17T10:00:00Z', notes: 'رد مبلغ - إلغاء طلب', safe_id: safe1.safes_id, user_id: userId, reference: 'REF-003' },
    { type: 'payment', amount: 400.00,  date: '2026-05-18T15:00:00Z', notes: 'تسوية حساب - الهرم ستور', safe_id: safe1.safes_id, user_id: userId, reference: 'PMT-008' },
    { type: 'payment', amount: 1800.00, date: '2026-05-20T09:00:00Z', notes: 'تحويل إلكتروني - الدلتا للتوزيع', safe_id: safe2.safes_id, user_id: userId, reference: 'PMT-009' },
    { type: 'payment', amount: 950.00,  date: '2026-05-22T12:00:00Z', notes: 'دفعة نقدية - عباسية كويك مارت', safe_id: safe1.safes_id, user_id: userId, reference: 'PMT-010' },
    { type: 'refund',  amount: 200.00,  date: '2026-05-23T14:30:00Z', notes: 'خصم خاص - رأي العميل', safe_id: safe1.safes_id, user_id: userId, reference: 'REF-004' },
    { type: 'payment', amount: 1350.00, date: '2026-05-24T10:30:00Z', notes: 'سداد رصيد مستحق - سوبر ماركت حسن', safe_id: safe1.safes_id, user_id: userId, reference: 'PMT-011' },
    { type: 'payment', amount: 600.00,  date: '2026-05-26T11:00:00Z', notes: 'دفعة نقدية - النصر للتجارة', safe_id: safe1.safes_id, user_id: userId, reference: 'PMT-012' },
    { type: 'payment', amount: 2100.00, date: '2026-05-28T09:30:00Z', notes: 'تسوية نهاية الشهر - الهرم ستور', safe_id: safe2.safes_id, user_id: userId, reference: 'PMT-013' },
    { type: 'refund',  amount: 350.00,  date: '2026-05-29T15:00:00Z', notes: 'رد مبلغ - بضاعة مرتجعة', safe_id: safe1.safes_id, user_id: userId, reference: 'REF-005' },
  ];

  for (const t of financialTxns) {
    const r = await post(tok, '/api/financial-transactions', t);
    ok(`${t.type === 'payment' ? 'دفع' : 'رد'} ${t.amount} ج.م (${t.reference})`, r);
    await sleep(50);
  }

  // ── 3. Safe Transactions ──────────────────────────────────────────────────
  console.log('\n════ 3. إضافة حركات الخزينة (safe transactions) ════');

  const safeTxns = [
    // Opening balances / cash-in
    { safe_id: safe1.safes_id, type: 'deposit', amount: 10000.00, description: 'رصيد افتتاحي - خزينة القاهرة', reference: 'OPEN-001', date: '2026-04-30T08:00:00Z', related_table: 'opening_balance' },
    { safe_id: safe2.safes_id, type: 'deposit', amount: 5000.00,  description: 'رصيد افتتاحي - خزينة الإسكندرية', reference: 'OPEN-002', date: '2026-04-30T08:00:00Z', related_table: 'opening_balance' },
    { safe_id: safe3.safes_id, type: 'deposit', amount: 3000.00,  description: 'رصيد افتتاحي - خزينة المندوبين', reference: 'OPEN-003', date: '2026-04-30T08:00:00Z', related_table: 'opening_balance' },
    // Receipts from clients
    { safe_id: safe1.safes_id, type: 'receipt', amount: 1500.00, description: 'استلام دفعة عميل - عباسية كويك مارت', reference: 'PMT-001', date: '2026-05-02T10:30:00Z', related_table: 'payments' },
    { safe_id: safe1.safes_id, type: 'receipt', amount: 2200.00, description: 'استلام دفعة عميل - النصر للتجارة', reference: 'PMT-002', date: '2026-05-05T11:00:00Z', related_table: 'payments' },
    { safe_id: safe2.safes_id, type: 'receipt', amount: 850.50,  description: 'استلام تحويل بنكي - الهرم ستور', reference: 'PMT-003', date: '2026-05-08T14:00:00Z', related_table: 'payments' },
    { safe_id: safe1.safes_id, type: 'receipt', amount: 3000.00, description: 'استلام دفعة مقدمة - عباسية', reference: 'PMT-004', date: '2026-05-10T10:00:00Z', related_table: 'payments' },
    { safe_id: safe1.safes_id, type: 'receipt', amount: 750.00,  description: 'استلام جزئي - الدلتا', reference: 'PMT-005', date: '2026-05-12T09:30:00Z', related_table: 'payments' },
    { safe_id: safe2.safes_id, type: 'receipt', amount: 1100.00, description: 'استلام شيك بنكي - النصر', reference: 'PMT-006', date: '2026-05-14T13:00:00Z', related_table: 'payments' },
    { safe_id: safe1.safes_id, type: 'receipt', amount: 2500.00, description: 'استلام دفعة مايو - سوبر ماركت حسن', reference: 'PMT-007', date: '2026-05-16T11:30:00Z', related_table: 'payments' },
    // Refunds (withdrawals)
    { safe_id: safe1.safes_id, type: 'withdrawal', amount: 320.00, description: 'رد مبلغ - بضاعة مرتجعة', reference: 'REF-001', date: '2026-05-06T09:00:00Z', related_table: 'refunds' },
    { safe_id: safe1.safes_id, type: 'withdrawal', amount: 150.00, description: 'استرداد - منتج تالف', reference: 'REF-002', date: '2026-05-11T16:00:00Z', related_table: 'refunds' },
    { safe_id: safe1.safes_id, type: 'withdrawal', amount: 480.00, description: 'رد مبلغ - إلغاء طلب', reference: 'REF-003', date: '2026-05-17T10:00:00Z', related_table: 'refunds' },
    // Expenses
    { safe_id: safe1.safes_id, type: 'expense', amount: 500.00, description: 'مصروف إيجار مخزن - مايو', reference: 'EXP-001', date: '2026-05-01T09:00:00Z', related_table: 'expenses' },
    { safe_id: safe3.safes_id, type: 'expense', amount: 200.00, description: 'مصروف انتقال مندوبين', reference: 'EXP-002', date: '2026-05-03T09:00:00Z', related_table: 'expenses' },
    { safe_id: safe1.safes_id, type: 'expense', amount: 350.00, description: 'مصروف صيانة', reference: 'EXP-003', date: '2026-05-15T09:00:00Z', related_table: 'expenses' },
  ];

  for (const t of safeTxns) {
    const body = {
      safe_id: t.safe_id,
      type: t.type,
      amount: t.amount,
      description: t.description,
      reference: t.reference,
      date: t.date,
      related_table: t.related_table,
    };
    const r = await post(tok, '/api/safes/transactions', body);
    ok(`${t.type} ${t.amount} ج.م (${t.reference})`, r);
    await sleep(50);
  }

  // ── 4. Safe Transfers ─────────────────────────────────────────────────────
  console.log('\n════ 4. إضافة تحويلات الخزائن (safe transfers) ════');

  const safeTransfers = [
    { from_safe_id: safe1.safes_id, to_safe_id: safe2.safes_id, amount: 2000.00, notes: 'تحويل لدعم خزينة الإسكندرية', transfer_date: '2026-05-07T10:00:00Z' },
    { from_safe_id: safe1.safes_id, to_safe_id: safe3.safes_id, amount: 1500.00, notes: 'صرف رواتب مندوبين', transfer_date: '2026-05-15T09:00:00Z' },
    { from_safe_id: safe2.safes_id, to_safe_id: safe1.safes_id, amount: 500.00,  notes: 'رد فائض خزينة إسكندرية', transfer_date: '2026-05-25T14:00:00Z' },
  ];

  for (const t of safeTransfers) {
    const r = await post(tok, '/api/safes/transfers', t);
    ok(`تحويل ${t.amount} ج.م: خزينة ${t.from_safe_id} → ${t.to_safe_id}`, r);
    await sleep(50);
  }

  // ── 5. Supplier Payments ──────────────────────────────────────────────────
  console.log('\n════ 5. إضافة مدفوعات الموردين (supplier payments) ════');

  const existingSpRes = await get(tok, '/api/supplier-payments?page_size=50');
  const existingSp = existingSpRes?.data?.data || [];
  console.log(`  Existing supplier payments: ${existingSp.length}`);

  if (existingSp.length < 3) {
    const sup1 = suppliers[0]?.supplier_id || 1;
    const sup2 = suppliers[1]?.supplier_id || 2;
    const sup3 = suppliers[2]?.supplier_id || 3;

    const supplierPayments = [
      { supplier_id: sup1, safe_id: safe1.safes_id, payment_method_id: method1, amount: 5000.00, payment_date: '2026-05-05', notes: 'دفعة مورد مياه - مايو' },
      { supplier_id: sup2, safe_id: safe1.safes_id, payment_method_id: method1, amount: 8500.00, payment_date: '2026-05-10', notes: 'سداد جزئي - مورد أغذية' },
      { supplier_id: sup3, safe_id: safe2.safes_id, payment_method_id: method2, amount: 3200.00, payment_date: '2026-05-15', notes: 'دفعة مورد منظفات' },
      { supplier_id: sup1, safe_id: safe1.safes_id, payment_method_id: method1, amount: 4500.00, payment_date: '2026-05-20', notes: 'دفعة ثانية - مورد مياه' },
      { supplier_id: sup2, safe_id: safe1.safes_id, payment_method_id: method1, amount: 6000.00, payment_date: '2026-05-25', notes: 'سداد رصيد - مورد أغذية' },
    ];

    for (const sp of supplierPayments) {
      const r = await post(tok, '/api/supplier-payments', sp);
      ok(`دفعة مورد #${sp.supplier_id} (${sp.amount} ج.م)`, r);
      await sleep(50);
    }
  } else {
    console.log('  [تخطي] مدفوعات الموردين موجودة بالفعل');
  }

  // ── 6. More Sales Returns ─────────────────────────────────────────────────
  console.log('\n════ 6. التحقق من مرتجعات المبيعات ════');

  const srRes = await get(tok, '/api/sales-returns?page_size=50');
  const existingSR = srRes?.data?.data || srRes?.data || [];
  console.log(`  Current sales returns: ${existingSR.length}`);

  if (existingSR.length < 5 && salesOrders.length > 0) {
    console.log('  إضافة مرتجعات مبيعات...');

    const so1 = salesOrders[0];
    const so2 = salesOrders[1];

    const salesReturns = [
      {
        client_id: so1?.sales_orders_client_id || client1.clients_id,
        sales_order_id: so1?.sales_orders_id,
        reason: 'منتج تالف',
        notes: 'استلام بضاعة مرتجعة - منتجات تالفة',
        created_by_user_id: userId,
        items: [
          { sales_order_item_id: null, quantity: 5, unit_price: 12.50, notes: 'وحدات تالفة' },
        ],
      },
      {
        client_id: so2?.sales_orders_client_id || client2.clients_id,
        sales_order_id: so2?.sales_orders_id,
        reason: 'خطأ في الطلب',
        notes: 'إرجاع بضاعة خاطئة بسبب خطأ في الطلب',
        created_by_user_id: userId,
        items: [
          { sales_order_item_id: null, quantity: 10, unit_price: 8.00, notes: 'منتجات خاطئة' },
        ],
      },
    ];

    for (const sr of salesReturns) {
      const r = await post(tok, '/api/sales-returns', sr);
      ok(`مرتجع مبيعات - عميل #${sr.client_id}`, r);
      await sleep(50);
    }
  } else {
    console.log(`  مرتجعات مبيعات كافية: ${existingSR.length} سجل`);
  }

  // ── 7. Verify final counts ────────────────────────────────────────────────
  console.log('\n════ التحقق من الأرقام النهائية ════');

  const finalPay   = await get(tok, '/api/payments?page_size=1');
  const finalFT    = await get(tok, '/api/financial-transactions?page_size=1');
  const finalST    = await get(tok, '/api/safes/transactions?page_size=1');
  const finalTrans = await get(tok, '/api/safes/transfers?page_size=1');
  const finalSP    = await get(tok, '/api/supplier-payments?page_size=1');
  const finalSR    = await get(tok, '/api/sales-returns?page_size=1');

  const count = (r) => r?.data?.total_count ?? r?.data?.data?.length ?? r?.data?.length ?? '?';
  console.log('  مدفوعات العملاء (Payments):         ', count(finalPay));
  console.log('  الحركات المالية (FinancialTxns):    ', count(finalFT));
  console.log('  حركات الخزائن (SafeTransactions):  ', count(finalST));
  console.log('  تحويلات الخزائن (SafeTransfers):   ', count(finalTrans));
  console.log('  مدفوعات الموردين (SupplierPay):    ', count(finalSP));
  console.log('  مرتجعات المبيعات (SalesReturns):   ', count(finalSR));

  console.log('\n✅ انتهت عملية البذر بنجاح!');
  console.log('امسح localStorage في المتصفح ثم أعد تحميل الصفحة.');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
