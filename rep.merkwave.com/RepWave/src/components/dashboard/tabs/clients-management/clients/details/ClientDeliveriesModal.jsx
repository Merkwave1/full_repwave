import React, { useEffect, useState, useMemo } from 'react';
import SharedDetailModalBase from './SharedDetailModalBase.jsx';
import { getAppSalesDeliveries, getSalesDeliveryDetails } from '../../../../../../apis/sales_deliveries.js';
import { XMarkIcon, PrinterIcon } from '@heroicons/react/24/outline';
// Adjusted relative path to shared delivery details modal
import SalesDeliveryDetailsModal from '../../../shared/delivery/SalesDeliveryDetailsModal.jsx';

export default function ClientDeliveriesModal({ client, open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', status: '', search: '' });
  const [selected, setSelected] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Unified print (same template style as sales-management/delivery-history)
  const handlePrintUnified = async (deliveryArg) => {
    const delivery = deliveryArg || selected;
    if(!delivery) return;
    const details = selectedDetails; // already fetched
    
    const dateVal = delivery.sales_deliveries_delivery_date || delivery.delivery_date || delivery.created_at;
    const date = dateVal ? new Date(dateVal) : null;
    const formatDate = d => d ? d.toLocaleDateString('en-GB') : '-';
    const formatTime = d => d ? d.toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'}) : '-';
    const warehouseName = delivery.warehouse_name || 'غير محدد';
    const clientName = delivery.clients_company_name || delivery.client_name || 'غير محدد';
    const items = (details && details.items) ? details.items : (delivery.items || []);
    const status = delivery.sales_deliveries_delivery_status || delivery.delivery_status || delivery.sales_deliveries_status || '';
    const statusArabic = status === 'Delivered' ? 'تم التسليم' : status === 'Preparing' ? 'قيد التحضير' : (status || 'غير محدد');

  const html = `
      <html dir="rtl">
        <head>
          <title>إيصال تسليم بضائع</title>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; direction: rtl; margin:0; padding:20px; font-size:14px; }
            h1,h2,h3 { margin:0; }
            .header { text-align:center; margin-bottom:20px; }
            .sub { font-size:12px; color:#555; margin-top:4px; }
            .meta-grid { display:flex; flex-wrap:wrap; gap:12px; margin:20px 0; }
            .box { flex:1 1 240px; border:2px solid #000; padding:12px; min-width:220px; }
            .box h3 { font-size:16px; margin-bottom:10px; text-align:center; }
            .row { display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px dotted #ccc; }
            .row:last-child { border-bottom:none; }
            .lbl { font-weight:bold; }
            table { width:100%; border-collapse:collapse; margin-top:25px; }
            th,td { border:1px solid #000; padding:6px 8px; font-size:12px; }
            th { background:#f2f2f2; }
            .footer { margin-top:30px; display:flex; justify-content:space-between; font-size:12px; }
            .status-badge { display:inline-block; padding:4px 10px; border:1px solid #000; font-size:12px; margin-top:8px; }
            @media print { body { padding:10px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>إيصال تسليم بضائع</h1>
            <div class="sub">رقم التسليم: #${delivery.sales_deliveries_id || delivery.delivery_id || ''}</div>
            <div class="sub">تاريخ الطباعة: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB')}</div>
            <div class="status-badge">الحالة: ${statusArabic}</div>
          </div>
          <div class="meta-grid">
            <div class="box">
              <h3>معلومات الطلب</h3>
              <div class="row"><span class="lbl">رقم الطلب:</span><span>#${delivery.sales_deliveries_sales_order_id || delivery.sales_order_id || '-'}</span></div>
              <div class="row"><span class="lbl">تاريخ التسليم:</span><span>${formatDate(date)} ${formatTime(date)}</span></div>
            </div>
            <div class="box">
              <h3>معلومات العميل</h3>
              <div class="row"><span class="lbl">العميل:</span><span>${clientName}</span></div>
              <div class="row"><span class="lbl">المستودع:</span><span>${warehouseName}</span></div>
            </div>
            <div class="box">
              <h3>ملاحظات</h3>
              <div>${(delivery.sales_deliveries_delivery_notes || delivery.delivery_notes || delivery.sales_deliveries_notes || 'لا توجد ملاحظات')}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>اسم الصنف</th>
                <th>كود الصنف</th>
                <th>نوع العبوة</th>
                <th>الكمية المُسلَّمة</th>
                <th>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              ${items && items.length ? items.map((it,i)=>`<tr>
                <td>${i+1}</td>
                <td>${(it.variant_name || it.products_name || 'غير محدد')}</td>
                <td>${(it.variant_sku || it.sales_order_items_variant_id || '-')}</td>
                <td>${(it.packaging_types_name || 'غير محدد')}</td>
                <td>${parseFloat(it.sales_delivery_items_quantity_delivered || 0).toFixed(2)}</td>
                <td>${it.sales_delivery_items_notes || '-'}</td>
              </tr>`).join('') : `<tr><td colspan="6" style="text-align:center;">لا توجد عناصر</td></tr>`}
            </tbody>
          </table>
          <div class="footer">
            <div>المستلم: ____________</div>
            <div>التوقيع: ____________</div>
          </div>
        </body>
      </html>`;
    try {
  const { printHtml } = await import('../../../../../utils/printUtils.js');
      await printHtml(html, { title: 'إيصال تسليم بضائع', closeAfter: 700 });
    } catch (err) {
      console.error('Print failed:', err);
    }
  };

  const handleShowDetails = (delivery) => {
    setSelected(delivery);
    setLoadingDetails(true);
    fetchDeliveryDetails(delivery).then(d => { setSelectedDetails(d); setLoadingDetails(false); });
  };

  useEffect(()=>{
    if(!open || !client) return; let cancelled=false;
    (async()=>{ setLoading(true); setError('');
      try{ const resp = await getAppSalesDeliveries();
        const arr = Array.isArray(resp?.sales_deliveries)? resp.sales_deliveries : Array.isArray(resp)? resp: (resp?.data?.sales_deliveries||resp?.data||[]);
        const filtered = Array.isArray(arr)? arr.filter(d => (d.delivery_client_id || d.sales_deliveries_client_id || d.clients_id || d.client_id || d.sales_orders_client_id) == client.clients_id): [];
        if(!cancelled) setRows(filtered);
      }catch(e){ if(!cancelled){ setError(e.message||'فشل تحميل التسليمات'); setRows([]);} }
      finally { if(!cancelled) setLoading(false); }
    })();
    return ()=>{cancelled=true};
  },[open,client]);

  const applyFilters = (arr)=> arr.filter(r=>{
    const {dateFrom,dateTo,status,search}=filters;
    // Support actual backend field: sales_deliveries_delivery_date
    const dateVal = r.delivery_date || r.sales_deliveries_delivery_date || r.sales_deliveries_date || r.created_at;
    if(dateFrom && dateVal && new Date(dateVal) < new Date(dateFrom)) return false;
    if(dateTo && dateVal && new Date(dateVal) > new Date(dateTo)) return false;
    if(status){ const st=(r.delivery_status|| r.sales_deliveries_delivery_status || r.sales_deliveries_status || '').toLowerCase(); if(!st.includes(status.toLowerCase())) return false; }
    if(search){ const txt=JSON.stringify(r).toLowerCase(); if(!txt.includes(search.toLowerCase())) return false; }
    return true;
  });
  const filtered = useMemo(()=>applyFilters(rows),[rows,filters]);

  return (
    <>
    <SharedDetailModalBase title="تفاصيل التسليمات" client={client} open={open} onClose={onClose}>
      <Filters filters={filters} setFilters={setFilters} />
      {loading && <div className="text-indigo-600 font-semibold">تحميل...</div>}
      {error && <div className="text-red-600 font-semibold">{error}</div>}
      {!loading && !error && (
        <>
          <div className="p-2 rounded-md bg-blue-50 text-blue-700 text-xs font-bold flex justify-between"><span>عدد:</span><span>{filtered.length}</span></div>
          {filtered.length===0 ? <Empty /> : (
      <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full text-[11px]">
        <thead className="bg-gray-100"><tr><Th>رقم</Th><Th>التاريخ</Th><Th>الحالة</Th><Th>ملاحظات</Th><Th className="no-print">عرض</Th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(r=> (
                    <tr key={r.delivery_id || r.sales_deliveries_id} className="hover:bg-gray-50">
                      <Td>{r.delivery_id || r.sales_deliveries_id}</Td>
                      <Td>{r.delivery_date || r.sales_deliveries_delivery_date || r.sales_deliveries_date || r.created_at || '—'}</Td>
                      <Td>{r.delivery_status || r.sales_deliveries_delivery_status || r.sales_deliveries_status || '—'}</Td>
            <Td className="max-w-[160px] truncate" title={r.delivery_notes || r.sales_deliveries_delivery_notes || r.sales_deliveries_notes}>{r.delivery_notes || r.sales_deliveries_delivery_notes || r.sales_deliveries_notes || '—'}</Td>
            <Td><button onClick={()=>handleShowDetails(r)} className="no-print text-indigo-600 hover:underline text-[10px] font-semibold">تفاصيل</button></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </SharedDetailModalBase>
  {selected && (
    <SalesDeliveryDetailsModal
      open={!!selected}
      delivery={selected}
      details={selectedDetails}
      loading={loadingDetails && !selectedDetails}
      onClose={()=>{ setSelected(null); setSelectedDetails(null); }}
      onPrint={()=>handlePrintUnified(selected)}
    />
  )}
    {selected && loadingDetails && !selectedDetails && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none">
        <div className="bg-white/80 backdrop-blur px-4 py-2 rounded text-xs font-semibold text-indigo-700 shadow">جاري تحميل تفاصيل التسليم...</div>
      </div>
    )}
    </>
  );
}

function Filters({filters,setFilters}){ return (
  <div className="flex flex-wrap gap-2 text-[11px] items-end">
    <div className="flex flex-col"><label className="mb-0.5">من</label><input type="date" value={filters.dateFrom} onChange={e=>setFilters(f=>({...f,dateFrom:e.target.value}))} className="border rounded px-2 py-1"/></div>
    <div className="flex flex-col"><label className="mb-0.5">إلى</label><input type="date" value={filters.dateTo} onChange={e=>setFilters(f=>({...f,dateTo:e.target.value}))} className="border rounded px-2 py-1"/></div>
    <div className="flex flex-col"><label className="mb-0.5">حالة</label><input placeholder="بحث جزئي" value={filters.status} onChange={e=>setFilters(f=>({...f,status:e.target.value}))} className="border rounded px-2 py-1"/></div>
    <div className="flex flex-col flex-1 min-w-[160px]"><label className="mb-0.5">بحث</label><input placeholder="بحث عام" value={filters.search} onChange={e=>setFilters(f=>({...f,search:e.target.value}))} className="border rounded px-2 py-1"/></div>
    {(filters.dateFrom||filters.dateTo||filters.status||filters.search) && <button onClick={()=>setFilters({dateFrom:'',dateTo:'',status:'',search:''})} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded">مسح</button>}
  </div>
); }
const Th = ({children})=> <th className="px-2 py-1 text-right font-bold text-gray-700">{children}</th>;
const Td = ({children})=> <td className="px-2 py-1">{children}</td>;
const Empty = ()=> <div className="text-gray-500 italic">لا توجد بيانات</div>;


async function fetchDeliveryDetails(delivery){
  try {
    const details = await getSalesDeliveryDetails(delivery.delivery_id || delivery.sales_deliveries_id || delivery.id);
    return details;
  } catch(e){
    console.error('Failed to fetch delivery details', e);
    return null;
  }
}
