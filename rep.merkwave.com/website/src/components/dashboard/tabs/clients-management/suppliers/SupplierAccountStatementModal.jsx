import React, { useEffect, useState, useMemo } from 'react';
import { getAllPurchaseOrders } from '../../../../../apis/purchase_orders.js';
import { getPurchaseReturns } from '../../../../../apis/purchase_returns.js';
import { getSupplierPayments } from '../../../../../apis/supplier_payments.js';
import useCurrency from '../../../../../hooks/useCurrency.js';

// Supplier account statement similar to client statement (debit/credit style)
export default function SupplierAccountStatementModal({ supplier, open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState({ orders: [], returns: [], payments: [] });
  const [typeFilter, setTypeFilter] = useState(null); // order | return | payment | null
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const { formatCurrency } = useCurrency();

  const parseInputDate = (input, { endOfDay = false } = {}) => {
    if (!input || typeof input !== 'string') return null;
    const [year, month, day] = input.split('-').map((part) => parseInt(part, 10));
    if (!year || !month || !day) return null;
    const date = new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const normalizeRecordDate = (value) => {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;
      const normalized = trimmed.includes('T') || trimmed.includes('Z') ? trimmed : trimmed.replace(' ', 'T');
      let date = new Date(normalized);
      if (!Number.isNaN(date.getTime())) return date;
  const parts = trimmed.split(/[/-]/).map((part) => parseInt(part, 10));
      if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
        // Support both dd/mm/yyyy and yyyy/mm/dd by checking value ranges
        let year, month, day;
        if (parts[0] > 31) {
          // yyyy-mm-dd
          [year, month, day] = parts;
        } else if (parts[2] > 31) {
          // dd/mm/yyyy
          [day, month, year] = parts;
        } else {
          [year, month, day] = parts;
        }
        date = new Date(year, (month || 1) - 1, day || 1);
        if (!Number.isNaN(date.getTime())) return date;
      }
    }
    return null;
  };

  const fromDateObj = useMemo(() => parseInputDate(dateFrom, { endOfDay: false }), [dateFrom]);
  const toDateObj = useMemo(() => parseInputDate(dateTo, { endOfDay: true }), [dateTo]);

  useEffect(() => {
    if (!open || !supplier) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true); setError('');
      try {
        const [ordersAll, returnsAll, paymentsAll] = await Promise.all([
          getAllPurchaseOrders().catch(()=>[]),
          getPurchaseReturns().catch(()=>[]),
          getSupplierPayments({ supplier_id: supplier.supplier_id }).catch(()=>[])
        ]);
        const orders = Array.isArray(ordersAll) ? ordersAll.filter(o => (o.purchase_orders_supplier_id || o.supplier_id) == supplier.supplier_id) : [];
        const returns = Array.isArray(returnsAll) ? returnsAll.filter(r => (r.purchase_returns_supplier_id || r.supplier_id) == supplier.supplier_id) : [];
        // المدفوعات قد تعود ككائن فيه supplier_payments
        let paymentsRaw = [];
        if (Array.isArray(paymentsAll)) {
          paymentsRaw = paymentsAll;
        } else if (paymentsAll && Array.isArray(paymentsAll.supplier_payments)) {
          paymentsRaw = paymentsAll.supplier_payments;
        }
        const payments = paymentsRaw.filter(p => (p.supplier_payments_supplier_id || p.supplier_id) == supplier.supplier_id);
        if (!cancelled) setData({ orders, returns, payments });
      } catch (e) {
        if (!cancelled) { setError(e.message || 'فشل تحميل كشف حساب المورد'); setData({ orders: [], returns: [], payments: [] }); }
      } finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [open, supplier]);

  const unified = useMemo(() => {
    const list = [];
    // أوامر الشراء: نحتسب فقط (Received / Partially Received) في صافي الحساب، ونظهر الباقي دون احتساب
    data.orders.forEach(o => {
      const status = (o.purchase_orders_status || o.status || '').trim();
      const amountVal = parseFloat(o.purchase_orders_total_amount || o.total_amount || 0) || 0;
      const statusLower = status.toLowerCase();
      list.push({
        _type: 'order',
        id: o.purchase_orders_id || o.id,
        date: o.purchase_orders_order_date || o.order_date || o.created_at,
        status,
        amount: amountVal, // دائن (مستحق للمورد)
        _amountForCalc: ['received','partially received'].includes(statusLower) ? amountVal : 0,
        ref: o
      });
    });
    // مرتجعات الشراء: تقلل الالتزام (مدين)
    data.returns.forEach(r => {
      const raw = parseFloat(r.purchase_returns_total_amount || r.purchase_returns_total || r.total_amount || 0) || 0;
      const val = -raw; // مدين
      list.push({
        _type: 'return',
        id: r.purchase_returns_id || r.id,
        date: r.purchase_returns_date || r.date || r.created_at,
        status: r.purchase_returns_status || r.status,
        amount: val,
        _amountForCalc: val, // يدخل في الحساب
        ref: r
      });
    });
    // مدفوعات المورد: مدين (تسديد ما علينا)
    data.payments.forEach(p => {
      const val = -(parseFloat(p.supplier_payments_amount || p.amount || 0) || 0);
      list.push({
        _type: 'payment',
        id: p.supplier_payments_id || p.id,
        date: p.supplier_payments_date || p.date || p.created_at,
        status: p.supplier_payments_status || p.status || 'دفعة',
        amount: val,
        _amountForCalc: val,
        ref: p
      });
    });
    // استبعاد فقط المسودات (Draft) وترك Approved ظاهر (عكس المشكلة السابقة)
    return list.filter(r => (r.status || '').toLowerCase() !== 'draft');
  }, [data]);

  const filtered = unified.filter(r => {
    const recordDate = normalizeRecordDate(r.date);
    if (fromDateObj && recordDate && recordDate < fromDateObj) return false;
    if (toDateObj && recordDate && recordDate > toDateObj) return false;
    if (typeFilter && r._type !== typeFilter) return false;
    if (search) {
      const txt = (r.id + ' ' + r.status + ' ' + r._type + ' ' + r.amount + ' ' + (r.date||'')).toString().toLowerCase();
      if (!txt.includes(search.toLowerCase())) return false;
    }
    return true;
  }).sort((a,b)=> new Date(a.date||0) - new Date(b.date||0));

  // إجماليات حسب النوع (قبل اتجاه الإشارة)
  const ordersTotal = filtered.filter(r=> r._type==='order').reduce((s,r)=> s + r.amount, 0);
  const returnsTotal = filtered.filter(r=> r._type==='return').reduce((s,r)=> s + Math.abs(r.amount), 0);
  const paymentsTotal = filtered.filter(r=> r._type==='payment').reduce((s,r)=> s + Math.abs(r.amount), 0);
  const debitTotal = filtered.filter(r=> r.amount > 0).reduce((s,r)=> s + r.amount, 0); // دائن إجمالي
  const creditTotal = filtered.filter(r=> r.amount < 0).reduce((s,r)=> s + Math.abs(r.amount), 0); // مدين إجمالي
  // Use signed amount for net so it reflects all operations (orders, returns, payments)
  const net = filtered.reduce((s,r)=> s + (typeof r.amount === 'number' ? r.amount : 0), 0);

  if (!open || !supplier) return null;
  const printableDate = new Date().toLocaleString('en-US');

  // show date and time without seconds in format: DD/MM/YYYY HH:MM
  const formatDateTime = (d) => {
    try {
      const dt = normalizeRecordDate(d);
      if (!dt) return '—';
      const datePart = dt.toLocaleDateString('en-GB'); // DD/MM/YYYY
      const hh = String(dt.getHours()).padStart(2, '0');
      const mm = String(dt.getMinutes()).padStart(2, '0');
      const timePart = `${hh}:${mm}`; // no seconds
      // show date then time so time appears to the right of date in layout
      return `${datePart} ${timePart}`;
    } catch { return d || '—'; }
  };

  const handlePrint = () => {
    try {
      const rowsHtml = displayRows.map((r, idx) => {
        const credit = r.amount > 0 ? formatCurrency(r.amount, { withSymbol: true }) : '';
        const debit = r.amount < 0 ? formatCurrency(Math.abs(r.amount), { withSymbol: true }) : '';
        const balance = formatCurrency(r.runningBalance || 0, { withSymbol: true });
        const statusText = (() => {
          const status = (r.status || '').trim();
          if (!status) return '—';
          const lower = status.toLowerCase();
          if (lower === 'approved' || lower === 'draft') return '—';
          return status;
        })();
        return `
          <tr>
            <td class="number">${idx + 1}</td>
            <td>${typeLabel(r._type)}</td>
            <td>#${r.id}</td>
            <td>${formatDateTime(r.date)}</td>
            <td>${statusText}</td>
            <td class="credit">${credit || ''}</td>
            <td class="debit">${debit || ''}</td>
            <td class="balance">${balance}</td>
          </tr>
        `;
      }).join('');

      const statementTypeText = typeFilter === 'order'
        ? 'كشف حساب خاص بفواتير الشراء فقط'
        : typeFilter === 'return'
        ? 'كشف حساب خاص بمرتجعات الشراء فقط'
        : typeFilter === 'payment'
        ? 'كشف حساب خاص بمدفوعات المورد فقط'
        : 'كشف حساب كامل للمورد (جميع العمليات)';

      const dateRangeText = (() => {
        const intl = new Intl.DateTimeFormat('ar-EG');
        const fromText = fromDateObj ? intl.format(fromDateObj) : '—';
        const toText = toDateObj ? intl.format(toDateObj) : '—';
        if (!fromDateObj && !toDateObj) return 'لم يتم تطبيق تصفية تاريخ';
        return `الفترة: من ${fromText} إلى ${toText}`;
      })();

      const printContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8" />
          <title>كشف حساب المورد - ${supplier?.supplier_name || ''}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
              background: #ffffff;
              color: #1f2937;
              direction: rtl;
              padding: 24px;
              line-height: 1.6;
              font-size: 12px;
            }
            header {
              border-bottom: 2px solid #f59e0b;
              padding-bottom: 12px;
              margin-bottom: 16px;
            }
            header h1 {
              font-size: 20px;
              color: #f97316;
              margin-bottom: 4px;
            }
            header .meta { font-size: 11px; color: #6b7280; }
            .summary {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
              gap: 12px;
              margin-bottom: 18px;
            }
            .summary-card {
              padding: 12px;
              border: 1px solid #fcd34d;
              border-radius: 8px;
              background: #fff7ed;
            }
            .summary-card h3 { font-size: 13px; margin-bottom: 6px; color: #b45309; }
            .summary-card .value { font-size: 12px; font-weight: 700; }
            .filters {
              margin-bottom: 16px;
              padding: 12px;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              background: #f9fafb;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 18px;
              font-size: 11px;
            }
            thead { background: #f3f4f6; }
            th, td {
              border: 1px solid #d1d5db;
              padding: 8px 6px;
              text-align: right;
            }
            th { font-weight: 700; }
            tbody tr:nth-child(even) { background: #fafafa; }
            .number { text-align: center; }
            .credit { color: #0f766e; font-weight: 600; }
            .debit { color: #dc2626; font-weight: 600; }
            .balance { font-weight: 700; }
            tfoot td {
              font-weight: 700;
              background: #fffbeb;
            }
            @media print {
              body { padding: 12px; }
              header { margin-bottom: 12px; }
            }
          </style>
        </head>
        <body>
          <header>
            <h1>كشف حساب المورد</h1>
            <div class="meta">اسم المورد: ${supplier?.supplier_name || '—'}</div>
            <div class="meta">تاريخ الطباعة: ${new Date().toLocaleString('ar-EG')}</div>
          </header>
          <section class="summary">
            <div class="summary-card">
              <h3>فواتير الشراء (${data.orders.length})</h3>
              <div class="value">${formatCurrency(ordersTotal)}</div>
            </div>
            <div class="summary-card">
              <h3>مرتجعات الشراء (${data.returns.length})</h3>
              <div class="value">${formatCurrency(returnsTotal)}</div>
            </div>
            <div class="summary-card">
              <h3>مدفوعات للمورد (${data.payments.length})</h3>
              <div class="value">${formatCurrency(paymentsTotal)}</div>
            </div>
            <div class="summary-card">
              <h3>الصافي</h3>
              <div class="value">${formatCurrency(net)}</div>
            </div>
          </section>
          <section class="filters">
            <div>${statementTypeText}</div>
            <div>${dateRangeText}</div>
            <div>إجمالي دائن: ${formatCurrency(debitTotal)}</div>
            <div>إجمالي مدين: ${formatCurrency(creditTotal)}</div>
            <div>عدد العمليات بعد التصفية: ${filtered.length}</div>
          </section>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>النوع</th>
                <th>المرجع</th>
                <th>التاريخ</th>
                <th>الحالة</th>
                <th>دائن</th>
                <th>مدين</th>
                <th>الرصيد</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="8" style="text-align:center; padding:16px;">لا توجد عمليات</td></tr>'}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="5" style="text-align:right;">الإجماليات</td>
                <td>${formatCurrency(debitTotal)}</td>
                <td>${formatCurrency(creditTotal)}</td>
                <td>${formatCurrency(net)}</td>
              </tr>
            </tfoot>
          </table>
        </body>
        </html>
      `;

      const printWindow = window.open('', '_blank', 'width=1024,height=768');
      if (!printWindow) {
        throw new Error('تعذر فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة مؤقتًا والمحاولة مرة أخرى.');
      }

      printWindow.document.write(printContent);
      printWindow.document.close();

      const handlePrintWindow = () => {
        try {
          printWindow.focus();
          printWindow.print();
          printWindow.onafterprint = () => {
            try { printWindow.close(); } catch { /* ignore */ }
          };
        } catch (err) {
          console.error('Supplier print failed', err);
          alert('حدث خطأ أثناء الطباعة.');
        }
      };

      if (printWindow.document.readyState === 'complete') {
        setTimeout(handlePrintWindow, 300);
      } else {
        printWindow.onload = () => setTimeout(handlePrintWindow, 300);
      }

    } catch (e) {
      console.error('Print failed', e);
      alert('فشل في الطباعة. يرجى المحاولة مرة أخرى.');
    }
  };

  const typeLabel = t => ({ order:'فاتورة شراء', return:'مرتجع شراء', payment:'دفعة مورد' }[t] || t);
  const amountClass = a => a>0 ? 'text-green-600' : a<0 ? 'text-red-600' : 'text-gray-600';

  // Calculate running balance (chronological) using _amountForCalc when available
  const chronological = [...filtered].sort((a,b)=> new Date(a.date||0) - new Date(b.date||0));
  let runningBalanceAcc = 0;
  // Running balance: accumulate signed amount so balance reflects all rows consistently
  const withBalance = chronological.map(r => {
    const delta = (typeof r.amount === 'number' ? r.amount : 0);
    runningBalanceAcc += delta;
    return { ...r, runningBalance: runningBalanceAcc };
  });
  // show oldest first (old -> new) — user requested oldest at top
  const displayRows = withBalance.sort((a,b)=> new Date(a.date||0) - new Date(b.date||0));
  // Match client statement coloring: positive balance (customer/supplier owes) shown in red, negative in green
  const balanceClass = b => b > 0 ? 'text-red-600 font-bold' : b < 0 ? 'text-green-600 font-bold' : 'text-gray-600';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" dir="rtl">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col" id="supplier-account-statement">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #supplier-account-statement, #supplier-account-statement * { visibility: visible; }
            #supplier-account-statement { position: absolute; inset:0; height:auto; overflow:visible; }
            #supplier-account-statement thead { display: table-header-group; }
            #supplier-account-statement tfoot { display: table-footer-group; }
            #supplier-account-statement tr, #supplier-account-statement td, #supplier-account-statement th { page-break-inside: avoid; }
            .no-print { display:none!important; }
            .print-scroll-reset { overflow: visible!important; max-height: none!important; }
          }
        `}</style>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-xl">
          <div>
            <h3 className="text-lg font-bold text-gray-800">كشف حساب المورد: <span className="text-orange-600">{supplier.supplier_name}</span></h3>
            <p className="text-xs text-gray-500 mt-1">تاريخ الطباعة: {printableDate}</p>
          </div>
          <div className="flex gap-2 no-print">
            <button onClick={handlePrint} className="px-3 py-1.5 text-xs font-semibold rounded-md bg-orange-600 hover:bg-orange-700 text-white">طباعة</button>
            <button onClick={onClose} className="px-3 py-1.5 text-xs font-semibold rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700">إغلاق ✕</button>
          </div>
        </div>
  <div className="p-6 overflow-y-auto text-sm space-y-6 print-scroll-reset">
          {loading && <div className="text-center py-10 text-orange-600 font-semibold">جاري التحميل...</div>}
          {error && <div className="text-center py-4 text-red-600 font-semibold">{error}</div>}
          {!loading && !error && (
            <>
              <section className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs no-print">
                <SummaryCard title="فواتير الشراء" amount={ordersTotal} count={data.orders.length} color="orange" onShow={()=> setTypeFilter(typeFilter==='order'?null:'order')} active={typeFilter==='order'} formatCurrency={formatCurrency} />
                <SummaryCard title="مرتجعات الشراء" amount={returnsTotal} count={data.returns.length} color="red" onShow={()=> setTypeFilter(typeFilter==='return'?null:'return')} active={typeFilter==='return'} formatCurrency={formatCurrency} />
                <SummaryCard title="مدفوعات للمورد" amount={paymentsTotal} count={data.payments.length} color="green" onShow={()=> setTypeFilter(typeFilter==='payment'?null:'payment')} active={typeFilter==='payment'} formatCurrency={formatCurrency} />
                <div className="p-3 rounded-lg border border-gray-200 bg-gray-50 flex flex-col gap-1">
                  <span className="font-bold text-[13px]">دائن</span>
                  <div className="text-[11px] font-semibold">{formatCurrency(debitTotal)}</div>
                  {typeFilter && <button onClick={()=>setTypeFilter(null)} className="mt-1 text-[10px] font-semibold underline">إزالة التصفية</button>}
                </div>
                <div className="p-3 rounded-lg border border-gray-200 bg-gray-50 flex flex-col gap-1">
                  <span className="font-bold text-[13px]"> صافي</span>
                  <div className="text-[11px] font-semibold">{formatCurrency(net)}</div>
                  <span className="text-[10px] text-gray-500">(صافي بعد الاستلام والمرتجعات والمدفوعات)</span>
                </div>
              </section>

              {/* Print-only filter description */}
              <div className="hidden print:block bg-gray-50 border rounded-lg p-4 mb-4">
                <h4 className="font-bold text-sm mb-2">نوع الكشف:</h4>
                <p className="text-sm text-gray-700">
                  {typeFilter === 'order' && 'كشف حساب خاص بفواتير الشراء فقط'}
                  {typeFilter === 'return' && 'كشف حساب خاص بمرتجعات الشراء فقط'}
                  {typeFilter === 'payment' && 'كشف حساب خاص بمدفوعات المورد فقط'}
                  {!typeFilter && 'كشف حساب كامل للمورد (جميع العمليات)'}
                </p>
                {/* Print-only totals */}
                <div className="mt-3">
                  <div className="text-sm font-semibold">إجماليات (طباعة)</div>
                  <div className="text-sm mt-1">إجمالي دائن: {formatCurrency(debitTotal)}</div>
                  <div className="text-sm mt-1">إجمالي مدين: {formatCurrency(creditTotal)}</div>
                  <div className="text-sm mt-1 font-bold">الصافي: {formatCurrency(net)}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 items-end text-[11px] mb-3 mt-4 no-print">
                <div className="flex flex-col"><label className="mb-0.5">من</label><input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="border rounded px-2 py-1" /></div>
                <div className="flex flex-col"><label className="mb-0.5">إلى</label><input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="border rounded px-2 py-1" /></div>
                <div className="flex flex-col flex-1 min-w-[160px]"><label className="mb-0.5">بحث</label><input placeholder="بحث" value={search} onChange={e=>setSearch(e.target.value)} className="border rounded px-2 py-1" /></div>
                {(dateFrom || dateTo || search) && <button onClick={()=>{setDateFrom('');setDateTo('');setSearch('');}} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded">مسح</button>}
                <div className="ml-auto text-xs font-bold bg-orange-50 text-orange-700 px-3 py-1 rounded">عدد: {filtered.length}</div>
                <div className="text-xs font-bold bg-gray-100 px-3 py-1 rounded">إجمالي دائن: {formatCurrency(debitTotal)}</div>
                <div className="text-xs font-bold bg-gray-100 px-3 py-1 rounded">إجمالي مدين: {formatCurrency(creditTotal)}</div>
              </div>
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full text-[11px]">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-2 py-2 text-right font-semibold">#</th>
                      <th className="px-2 py-2 text-right font-semibold">النوع</th>
                      <th className="px-2 py-2 text-right font-semibold">المرجع</th>
                      <th className="px-2 py-2 text-right font-semibold">التاريخ</th>
                      <th className="px-2 py-2 text-right font-semibold">الحالة</th>
                      <th className="px-2 py-2 text-right font-semibold">دائن</th>
                      <th className="px-2 py-2 text-right font-semibold">مدين</th>
                      <th className="px-2 py-2 text-right font-semibold">الرصيد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-500 italic">لا توجد عمليات</td></tr>
                    )}
                    {displayRows.map((r,idx)=> (
                      <tr key={r._type + '_' + r.id} className="hover:bg-gray-50">
                        <td className="px-2 py-1">{idx+1}</td>
                        <td className="px-2 py-1 font-semibold">{typeLabel(r._type)}</td>
                        <td className="px-2 py-1">#{r.id}</td>
                        <td className="px-2 py-1 print:text-sm">{formatDateTime(r.date)}</td>
                        <td className="px-2 py-1">{(() => { const s=(r.status||'').toLowerCase(); return (s==='approved'||s==='draft')?'':(r.status||'—'); })()}</td>
                        <td className={`px-2 py-1 font-semibold ${r.amount>0?amountClass(r.amount):''}`}>{r.amount>0? formatCurrency(r.amount, { withSymbol: true }):''}</td>
                        <td className={`px-2 py-1 font-semibold ${r.amount<0?amountClass(r.amount):''}`}>{r.amount<0? formatCurrency(Math.abs(r.amount), { withSymbol: true }):''}</td>
                        <td className={`px-2 py-1 ${balanceClass(r.runningBalance)}`}>{formatCurrency((r.runningBalance || 0), { withSymbol: true })}</td>
                        {/* per-row action removed */}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-orange-50 font-bold">
                      <td colSpan={5} className="px-2 py-2 text-right">الإجماليات</td>
                      <td className="px-2 py-2 text-green-700">{formatCurrency(debitTotal, { withSymbol: true })}</td>
                      <td className="px-2 py-2 text-red-700">{formatCurrency(creditTotal, { withSymbol: true })}</td>
                      <td className={`px-2 py-2 ${balanceClass(net)}`}>{formatCurrency(net, { withSymbol: true })}</td>
                      {/* details column removed */}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
        <div className="px-6 py-3 border-t border-gray-200 flex justify-end bg-gray-50 rounded-b-xl no-print">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700">إغلاق</button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, amount, count, color, onShow, active, formatCurrency }) {
  const colorMap = { orange:'bg-orange-50 text-orange-700', red:'bg-red-50 text-red-700', green:'bg-green-50 text-green-700', indigo:'bg-indigo-50 text-indigo-700' };
  return (
    <div className={`p-3 rounded-lg border ${active? 'border-orange-400 ring-2 ring-orange-300':'border-gray-200'} flex flex-col gap-1 ${colorMap[color]||'bg-gray-50 text-gray-700'}`}> 
      <div className="flex items-center justify-between">
        <span className="font-bold text-[13px]">{title}</span>
        <span className="text-[10px] bg-white/60 px-2 py-0.5 rounded-full border border-white/40 font-semibold">{count}</span>
      </div>
      <div className="text-[11px] font-semibold">الإجمالي: {formatCurrency(amount || 0)}</div>
      <button onClick={onShow} className="mt-1 text-[10px] font-semibold underline decoration-dotted">{active?'إلغاء':'تصفية'}</button>
    </div>
  );
}
