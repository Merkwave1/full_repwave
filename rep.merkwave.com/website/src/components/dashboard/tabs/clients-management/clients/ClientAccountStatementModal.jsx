// Refactored summary-only ClientAccountStatementModal
import React, { useEffect, useState } from 'react';
// Use unified API for client account statement
import { getClientAccountStatement } from '../../../../../apis/client_account_statement.js';
// Import currency formatting utility
import { formatCurrency } from '../../../../../utils/currency.js';
// Keep detail endpoints for row drill-down (future)
import { getSalesOrderDetails } from '../../../../../apis/sales_orders.js';
import { getClientPaymentDetails } from '../../../../../apis/client_payments.js';
import { getClientRefundDetail } from '../../../../../apis/client_refunds.js';
import { getSalesReturnDetails } from '../../../../../apis/sales_returns.js';
import { getSalesDeliveryDetails } from '../../../../../apis/sales_deliveries.js';
// (Deliveries removed from unified view per requirement – no import needed)
// duplicate imports removed
// Detail modal components
import SalesOrderDetailsModal from '../../sales-management/sales-orders/SalesOrderDetailsModal.jsx';
import SalesReturnDetailsModal from '../../sales-management/sales-returns/SalesReturnDetailsModal.jsx';
import ClientPaymentDetailsModal from '../../sales-management/client-payments/ClientPaymentDetailsModal.jsx';
import ClientRefundDetailsModal from '../../sales-management/client-refunds/ClientRefundDetailsModal.jsx';
import SalesDeliveryDetailsModal from '../../shared/delivery/SalesDeliveryDetailsModal.jsx';
import ClientOrdersModal from './details/ClientOrdersModal.jsx';
import ClientReturnsModal from './details/ClientReturnsModal.jsx';
// Deliveries modal removed from account statement (not shown)
import ClientPaymentsModal from './details/ClientPaymentsModal.jsx';
import ClientRefundsModal from './details/ClientRefundsModal.jsx';

export default function ClientAccountStatementModal({ client, open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [server, setServer] = useState({ entries: [], totals: { debit_total: 0, credit_total: 0, net_total: 0 }, net_total: 0 });
  // Detail modal states
  // Deprecated separate list modals; we'll filter the unified table instead
  const [showOrders, setShowOrders] = useState(false); // kept for backward compatibility (unused)
  const [showReturns, setShowReturns] = useState(false);
  const [showPayments, setShowPayments] = useState(false);
  const [showRefunds, setShowRefunds] = useState(false);
  const [typeFilter, setTypeFilter] = useState(null); // 'order' | 'return' | 'payment' | 'refund' | null
  // Unified inline detail modal state
  const [detailType, setDetailType] = useState(null); // 'order' | 'return' | 'delivery' | 'payment' | 'refund'
  const [detailBase, setDetailBase] = useState(null); // selected row object
  const [detailData, setDetailData] = useState(null); // fetched details
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = async (type, row) => {
    setDetailType(type); setDetailBase(row); setDetailData(null); setDetailLoading(true);
    try {
      let data = null;
      if (type === 'order') data = await getSalesOrderDetails(row.sales_orders_id || row.sales_order_id || row.id);
      else if (type === 'return') data = await getSalesReturnDetails(row.returns_id || row.sales_returns_id || row.id);
      else if (type === 'delivery') data = await getSalesDeliveryDetails(row.sales_deliveries_id || row.delivery_id || row.id);
      else if (type === 'payment') data = await getClientPaymentDetails(row.client_payments_id || row.payment_id || row.id);
      else if (type === 'refund') data = await getClientRefundDetail(row.client_refunds_id || row.refund_id || row.id);
      setDetailData(data);
    } catch (e) {
      console.error('Failed to load detail', type, e);
    } finally { setDetailLoading(false); }
  };
  const closeDetail = () => { setDetailType(null); setDetailBase(null); setDetailData(null); setDetailLoading(false); };

  useEffect(() => {
    if (!open || !client) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true); setError('');
      try {
        const resp = await getClientAccountStatement({ client_id: client.clients_id });
        if (!cancelled) setServer(resp || { entries: [], totals: { debit_total: 0, credit_total: 0, net_total: 0 }, net_total: 0 });
      } catch (e) {
        console.error('Account statement load error', e);
        if (!cancelled) {
          setError(e.message || 'فشل تحميل كشف الحساب');
          setServer({ entries: [], totals: { debit_total: 0, credit_total: 0, net_total: 0 }, net_total: 0 });
        }
      } finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [open, client]);

  const isVisible = !!open && !!client;
  const entries = Array.isArray(server.entries) ? server.entries : [];
  const printableDate = new Date().toLocaleString('ar-EG');

  // Print the account statement in new tab (prevents page repetition)
  const handleDownloadPdf = () => {
    try {
      const entriesArr = entries || [];
      const normalized = entriesArr.map(e=>({
        _type: e.type, id: e.id, date: e.date, status: e.status,
        debit: e.debit || 0,
        credit: e.credit || 0,
        // Calculate proper amount for balance calculations
        amount: (() => {
          // If API provides debit/credit directly, use them
          if (e.debit > 0) return -e.debit; // Debit reduces balance (negative)
          if (e.credit > 0) return e.credit; // Credit increases balance (positive)
          
          // Otherwise, calculate based on transaction type and amount_signed  
          const absAmount = Math.abs(e.amount_signed || 0);
          switch (e.type) {
            case 'payment':
              // Payment increases client balance (positive)
              return absAmount;
            case 'refund':
              // Refund decreases client balance (negative)
              return -absAmount;
            case 'order':
              // Order decreases client balance (negative)
              return -absAmount;
            case 'return':
              // Return increases client balance (positive)
              return absAmount;
            default:
              return e.amount_signed || 0;
          }
        })(),
      }));
      
      // Calculate running balance for print (chronological order)
      const chronological = [...normalized].sort((a,b)=> new Date(a.date||0) - new Date(b.date||0));
      let runningBalance = 0;
      const withBalance = chronological.map(r => {
        runningBalance += r.amount;
        return { ...r, runningBalance };
      });
      
      // Keep chronological order (oldest first) for display in print
      const printRows = withBalance.sort((a,b)=> new Date(a.date||0) - new Date(b.date||0));
      
      const debitTotal = normalized.reduce((s,r)=> s + (r.debit || 0), 0);
      const creditTotal = normalized.reduce((s,r)=> s + (r.credit || 0), 0);
      const net = normalized.reduce((s,r)=> s + r.amount, 0);
      
      const typeLabel = t => ({ order:'فاتورة بيع', return:'مرتجع', payment:'دفعة (تحصيل)', refund:'استرداد (refund)' }[t] || t);

      // Create print content
      const printContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>كشف حساب - ${client?.clients_company_name || ''}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              direction: rtl; 
              background: white; 
              color: #333;
              line-height: 1.4;
              padding: 15px;
              font-size: 12px;
            }
            .header { 
              text-align: right; 
              margin-bottom: 20px; 
              border-bottom: 2px solid #4f46e5;
              padding-bottom: 10px;
            }
            .header h1 { 
              font-size: 20px; 
              font-weight: bold; 
              color: #4f46e5; 
              margin-bottom: 5px;
            }
            .header .company { 
              font-size: 16px; 
              font-weight: bold; 
              color: #333; 
              margin-bottom: 3px;
            }
            .header .date { 
              font-size: 11px; 
              color: #666; 
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 15px 0;
              font-size: 10px;
              border: 1px solid #333;
            }
            th { 
              background: #f3f4f6; 
              border: 1px solid #333; 
              padding: 8px 4px; 
              font-weight: bold;
              text-align: right;
              font-size: 10px;
            }
            td { 
              border: 1px solid #333; 
              padding: 6px 4px; 
              text-align: right;
              font-size: 10px;
            }
            .number { text-align: center; }
            .totals {
              margin-top: 20px;
              padding: 15px;
              background: #f8fafc;
              border: 1px solid #333;
              page-break-inside: avoid;
            }
            .totals h3 {
              margin-bottom: 10px;
              font-size: 14px;
              color: #333;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
              font-size: 12px;
              font-weight: bold;
            }
            .final-total {
              border-top: 1px solid #333;
              padding-top: 8px;
              margin-top: 10px;
              font-size: 14px;
            }
            .debit { color: #dc2626; }
            .credit { color: #059669; }
            .net { color: #4f46e5; }
            
            @media print {
              body { 
                padding: 10mm; 
                margin: 0; 
                font-size: 10px;
              }
              .header { 
                margin-bottom: 15px; 
                page-break-after: avoid;
              }
              .header h1 { font-size: 18px; }
              .header .company { font-size: 14px; }
              table { 
                font-size: 9px; 
                margin: 10px 0;
                page-break-inside: auto;
              }
              th { font-size: 9px; padding: 6px 3px; }
              td { font-size: 9px; padding: 4px 3px; }
              .totals { 
                margin-top: 15px; 
                page-break-inside: avoid;
              }
              @page { 
                margin: 8mm; 
                size: A4; 
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>كشف حساب</h1>
            <div class="company">${client?.clients_company_name || ''}</div>
            <div class="date">تاريخ الطباعة: ${printableDate}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th class="number" style="width: 40px;">#</th>
                <th style="width: 80px;">النوع</th>
                <th class="number" style="width: 60px;">المرجع</th>
                <th style="width: 100px;">التاريخ</th>
                <th style="width: 80px;">الحالة</th>
                <th style="width: 60px;">دائن</th>
                <th style="width: 60px;">مدين</th>
                <th style="width: 70px;">الرصيد</th>
              </tr>
            </thead>
            <tbody>
              ${printRows.length === 0 ? 
                '<tr><td colspan="8" style="text-align: center; padding: 15px; color: #666;">لا توجد عمليات</td></tr>' :
                printRows.map((r, idx) => {
                  const debit = r.debit > 0 ? formatCurrency(r.debit) : '';
                  const credit = r.credit > 0 ? formatCurrency(r.credit) : '';
                  const balance = formatCurrency(r.runningBalance || 0);
                  const balanceClass = r.runningBalance > 0 ? 'color: #dc2626; font-weight: bold;' : 
                                    r.runningBalance < 0 ? 'color: #16a34a; font-weight: bold;' : 'color: #666;';
                  return `
                    <tr>
                      <td class="number">${idx + 1}</td>
                      <td>${typeLabel(r._type)}</td>
                      <td class="number">#${r.id}</td>
                      <td>${r.date || '—'}</td>
                      <td>${r.status || '—'}</td>
                      <td class="credit" style="color: #16a34a; font-weight: bold;">${credit}</td>
                      <td class="debit" style="color: #dc2626; font-weight: bold;">${debit}</td>
                      <td class="balance" style="${balanceClass}">${balance}</td>
                    </tr>
                  `;
                }).join('')
              }
            </tbody>
          </table>

          <div class="totals">
            <h3>الإجماليات</h3>
            <div class="total-row">
              <span>إجمالي دائن:</span>
              <span class="credit" style="color: #16a34a; font-weight: bold;">${formatCurrency(creditTotal)}</span>
            </div>
            <div class="total-row">
              <span>إجمالي مدين:</span>
              <span class="debit" style="color: #dc2626; font-weight: bold;">${formatCurrency(debitTotal)}</span>
            </div>
            <div class="total-row final-total">
              <span>الصافي:</span>
              <span class="net">${formatCurrency(net)}</span>
            </div>
          </div>
        </body>
        </html>
      `;

      // Open print window
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Wait for content to load then print
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        
        // Close after printing (optional - user can close manually)
        printWindow.onafterprint = () => {
          printWindow.close();
        };
      }, 500);

    } catch (e) {
      console.error('Print failed:', e);
      alert('فشل في الطباعة. يرجى المحاولة مرة أخرى.');
    }
  };


  if (!isVisible) return null;
  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fadeIn">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col print:max-h-none print:shadow-none print:rounded-none" id="account-statement-modal">
          <style>{`@media print { body * { visibility: hidden; } #account-statement-modal, #account-statement-modal * { visibility: visible; } #account-statement-modal { position: absolute; inset: 0; height: auto; overflow: visible; } .no-print { display: none !important; } }`}</style>
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-t-xl print:bg-white print:border-b print:rounded-none">
            <div>
              <h3 className="text-lg font-bold text-gray-800">كشف حساب: <span className="text-indigo-600">{client.clients_company_name}</span></h3>
              <p className="text-xs text-gray-500 mt-1">تاريخ الطباعة: {printableDate}</p>
            </div>
            <div className="flex gap-2 no-print">
              <button onClick={handleDownloadPdf} className="px-3 py-1.5 text-xs font-semibold rounded-md bg-indigo-600 hover:bg-indigo-700 text-white">طباعة</button>
              <button onClick={onClose} className="px-3 py-1.5 text-xs font-semibold rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700 transition">إغلاق ✕</button>
            </div>
          </div>
          <div className="overflow-y-auto p-6 space-y-6 text-sm">
            {loading && <div className="text-center py-10 text-indigo-600 font-semibold">جاري التحميل...</div>}
            {error && <div className="text-center py-4 text-red-600 font-semibold">{error}</div>}
            {!loading && !error && (
              <>
                {/* Summary cards removed as requested */}
                
                {/* Print-only filter description */}
                <div className="hidden print:block bg-gray-50 border rounded-lg p-4 mb-4">
                  <h4 className="font-bold text-sm mb-2">نوع الكشف:</h4>
                  <p className="text-sm text-gray-700">
                    {typeFilter === 'order' && 'كشف حساب خاص بفواتير البيع فقط'}
                    {typeFilter === 'return' && 'كشف حساب خاص بالمرتجعات فقط'}
                    {typeFilter === 'payment' && 'كشف حساب خاص بالمدفوعات فقط'}
                    {typeFilter === 'refund' && 'كشف حساب خاص بالاستردادات فقط'}
                    {!typeFilter && 'كشف حساب كامل للعميل (جميع العمليات)'}
                  </p>
                </div>
                <UnifiedOperationsServer
                  entries={entries}
                  onDetail={openDetail}
                  typeFilter={typeFilter}
                  clearTypeFilter={()=>setTypeFilter(null)}
                />
              </>
            )}
          </div>
          <div className="px-6 py-3 border-t border-gray-200 flex justify-end bg-gray-50 rounded-b-xl no-print">
            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700 transition">إغلاق</button>
          </div>
        </div>
      </div>
      {showOrders && <ClientOrdersModal open={showOrders} onClose={() => setShowOrders(false)} client={client} />}
      {showReturns && <ClientReturnsModal open={showReturns} onClose={() => setShowReturns(false)} client={client} />}
  {/* Deliveries modal intentionally removed */}
      {showPayments && <ClientPaymentsModal open={showPayments} onClose={() => setShowPayments(false)} client={client} />}
      {showRefunds && <ClientRefundsModal open={showRefunds} onClose={() => setShowRefunds(false)} client={client} />}
      {/* Inline Detail Modals */}
      {detailType === 'order' && detailBase && (
        <SalesOrderDetailsModal open delivery={detailBase} selectedOrder={detailBase} onClose={closeDetail} details={detailData} loading={detailLoading} />
      )}
      {detailType === 'return' && detailBase && (
        <SalesReturnDetailsModal open onClose={closeDetail} returnData={detailBase} details={detailData} loading={detailLoading} />
      )}
  {/* Delivery detail omitted per requirement */}
      {detailType === 'payment' && detailBase && (
        <ClientPaymentDetailsModal open payment={detailBase} details={detailData} loading={detailLoading} onClose={closeDetail} />
      )}
      {detailType === 'refund' && detailBase && (
        <ClientRefundDetailsModal open refund={detailBase} details={detailData} loading={detailLoading} onClose={closeDetail} />
      )}
    </>
  );
}

function SummaryCard({ title, amount, count, color, onShow, active }) {
  const colorMap = { indigo: 'bg-indigo-50 text-indigo-700', green: 'bg-green-50 text-green-700', red: 'bg-red-50 text-red-700', orange: 'bg-orange-50 text-orange-700', blue: 'bg-blue-50 text-blue-700' };
  return (
    <div className={`p-3 rounded-lg border ${active ? 'border-indigo-400 ring-2 ring-indigo-300' : 'border-gray-200'} flex flex-col gap-1 ${colorMap[color] || 'bg-gray-50 text-gray-700'}`}>      
      <div className="flex items-center justify-between">
        <span className="font-bold text-[13px]">{title}</span>
        <span className="text-[10px] bg-white/60 px-2 py-0.5 rounded-full border border-white/40 font-semibold">{count}</span>
      </div>
      <div className="text-[11px] font-semibold">الإجمالي: {formatCurrency(Number(amount || 0))}</div>
      <button onClick={onShow} className="mt-1 text-[10px] font-semibold underline decoration-dotted">{active ? 'إلغاء التصفية' : 'تصفية'}</button>
    </div>
  );
}

function OperationsTable({ title, color, rows, columns, emptyLabel }) {
  const colorMap = { indigo: 'border-indigo-200', orange: 'border-orange-200', blue: 'border-blue-200', green: 'border-green-200', red: 'border-red-200' };
  return (
    <div className={`rounded-lg border ${colorMap[color] || 'border-gray-200'} overflow-hidden`}>
      <div className="px-3 py-2 bg-gray-50 text-[12px] font-bold flex items-center justify-between">
        <span>{title}</span>
        <span className="text-xs font-normal text-gray-500">عدد: {rows.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-[11px]">
          <thead className="bg-gray-100">
            <tr>
              {columns.map(col => <th key={col.key} className="px-2 py-1 text-right font-semibold text-gray-700 whitespace-nowrap">{col.label}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 && (
              <tr><td colSpan={columns.length} className="px-3 py-4 text-center text-gray-500 italic">{emptyLabel}</td></tr>
            )}
            {rows.map(r => (
              <tr key={(r.id || r._id || r.sales_orders_id || r.sales_deliveries_id || r.client_payments_id || r.client_refunds_id || r.returns_id)} className="hover:bg-gray-50">
                {columns.map(col => (
                  <td key={col.key} className={`px-2 py-1 align-top ${col.truncate ? 'max-w-[160px] truncate' : ''}`} title={col.truncate ? col.get(r) : undefined}>
                    {col.get(r)}
                  </td>
                ))}
                {/* details column removed */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Unified operations (merged list) component
function UnifiedOperationsServer({ entries, typeFilter, clearTypeFilter }) {
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [search, setSearch] = React.useState('');

  const normalized = React.useMemo(()=>{
    return (entries||[]).map(e=>({
      _type: e.type,
      id: e.id,
      date: e.date,
      status: e.status,
      debit: e.debit || 0,
      credit: e.credit || 0,
      // Calculate amount for running balance: debit adds, credit subtracts
      amount: (e.debit || 0) - (e.credit || 0),
    }));
  }, [entries]);

  const filtered = normalized.filter(r => {
    if (typeFilter && r._type !== typeFilter) return false;
    if (dateFrom && r.date && new Date(r.date) < new Date(dateFrom)) return false;
    if (dateTo && r.date && new Date(r.date) > new Date(dateTo)) return false;
    if (search) {
      const txt = (r.id + ' ' + r.status + ' ' + r._type + ' ' + r.amount + ' ' + (r.date || '')).toString().toLowerCase();
      if (!txt.includes(search.toLowerCase())) return false;
    }
    return true;
  }).sort((a,b)=> new Date(a.date||0) - new Date(b.date||0)); // ترتيب من الأقدم للأحدث

  // Totals: use explicit debit/credit fields from API
  const debitTotal = filtered.reduce((s,r)=> s + (r.debit > 0 ? r.debit : 0), 0);
  const creditTotal = filtered.reduce((s,r)=> s + (r.credit > 0 ? r.credit : 0), 0);
  const total = debitTotal - creditTotal; // Net balance = Debit - Credit

  // Calculate running balance for each row (chronological order)
  const chronological = [...filtered].sort((a,b)=> new Date(a.date||0) - new Date(b.date||0));
  let runningBalance = 0;
  const withBalance = chronological.map(r => {
    runningBalance += r.amount;
    return { ...r, runningBalance };
  });
  
  // Keep chronological order (oldest first) for display
  const displayRows = withBalance.sort((a,b)=> new Date(a.date||0) - new Date(b.date||0));

  const typeLabel = t => ({ order:'فاتورة بيع', return:'مرتجع', payment:'دفعة (تحصيل)', refund:'استرداد (refund)' }[t] || t);
  const balanceClass = b => b > 0 ? 'text-red-600 font-bold' : b < 0 ? 'text-green-600 font-bold' : 'text-gray-600';

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-3 items-end text-[11px] mb-3">
        <div className="flex flex-col"><label className="mb-0.5">من</label><input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="border rounded px-2 py-1" /></div>
        <div className="flex flex-col"><label className="mb-0.5">إلى</label><input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="border rounded px-2 py-1" /></div>
        <div className="flex flex-col flex-1 min-w-[160px]"><label className="mb-0.5">بحث</label><input placeholder="بحث برقم الفاتورة" value={search} onChange={e=>setSearch(e.target.value)} className="border rounded px-2 py-1" /></div>
        {(dateFrom || dateTo || search) && <button onClick={()=>{setDateFrom('');setDateTo('');setSearch('');}} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded">مسح</button>}
        {typeFilter && <button onClick={clearTypeFilter} className="px-3 py-1 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded">إزالة تصفية النوع</button>}
        <div className="ml-auto text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded">عدد: {filtered.length}</div>
        <div className="text-xs font-bold bg-gray-100 px-3 py-1 rounded text-green-600">إجمالي دائن: {formatCurrency(creditTotal)}</div>
        <div className="text-xs font-bold bg-gray-100 px-3 py-1 rounded text-red-600">إجمالي مدين: {formatCurrency(debitTotal)}</div>
        <div className="text-xs font-bold bg-gray-200 px-3 py-1 rounded">صافي: {formatCurrency(total)}</div>
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
            {displayRows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-500 italic">لا توجد عمليات</td></tr>
            )}
            {displayRows.map((r,idx)=>(
              <tr key={r._type + '_' + r.id} className="hover:bg-gray-50">
                <td className="px-2 py-1">{idx+1}</td>
                <td className="px-2 py-1 font-semibold">{typeLabel(r._type)}</td>
                <td className="px-2 py-1">#{r.id}</td>
                <td className="px-2 py-1">{r.date || '—'}</td>
                <td className="px-2 py-1">{r.status || '—'}</td>
                <td className={`px-2 py-1 font-semibold ${r.credit > 0 ? 'text-green-600' : ''}`}>
                  {r.credit > 0 ? formatCurrency(r.credit) : ''}
                </td>
                <td className={`px-2 py-1 font-semibold ${r.debit > 0 ? 'text-red-600' : ''}`}>
                  {r.debit > 0 ? formatCurrency(r.debit) : ''}
                </td>
                <td className={`px-2 py-1 ${balanceClass(r.runningBalance)}`}>{formatCurrency(r.runningBalance)}</td>
                {/* details column removed */}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-indigo-50 font-bold">
              <td colSpan={5} className="px-2 py-2 text-right">الإجماليات</td>
              <td className="px-2 py-2 text-green-600">{formatCurrency(creditTotal)}</td>
              <td className="px-2 py-2 text-red-600">{formatCurrency(debitTotal)}</td>
              <td className={`px-2 py-2 ${balanceClass(total)}`}>{formatCurrency(total)}</td>
              {/* details column removed */}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
