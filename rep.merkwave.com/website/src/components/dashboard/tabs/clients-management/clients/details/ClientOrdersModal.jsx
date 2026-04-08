import React, { useEffect, useState, useMemo } from 'react';
import SharedDetailModalBase from './SharedDetailModalBase.jsx';
import { getSalesOrdersByClient, getSalesOrderDetails } from '../../../../../../apis/sales_orders.js';
import SalesOrderDetailsModal from '../../../sales-management/sales-orders/SalesOrderDetailsModal.jsx';

export default function ClientOrdersModal({ client, open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState([]);
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', status: '', search: '' });
  const [selected, setSelected] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const handleShowDetails = (order) => {
    setSelected(order);
    setLoadingDetails(true);
    fetchOrderDetails(order).then(d => { setSelectedDetails(d); setLoadingDetails(false); });
  };

  useEffect(() => {
    if (!open || !client) return;
    let cancelled = false;
    (async ()=>{
      setLoading(true); setError('');
      try {
        const resp = await getSalesOrdersByClient(client.clients_id);
        if (!cancelled) setOrders(Array.isArray(resp)? resp: (resp?.data?.data|| resp?.data|| []));
      } catch(e){
        if(!cancelled){ setError(e.message||'فشل تحميل الأوامر'); setOrders([]);} }
      finally { if(!cancelled) setLoading(false); }
    })();
    return ()=>{ cancelled = true; };
  }, [open, client]);

  const applyFilters = (arr)=> arr.filter(o=>{
    const {dateFrom,dateTo,status,search}=filters;
    const dateVal = o.sales_orders_date || o.sales_orders_order_date || o.sales_orders_created_at;
    if(dateFrom && dateVal && new Date(dateVal) < new Date(dateFrom)) return false;
    if(dateTo && dateVal && new Date(dateVal) > new Date(dateTo)) return false;
    if(status){ const st=(o.sales_orders_status||'').toLowerCase(); if(!st.includes(status.toLowerCase())) return false; }
    if(search){ const txt=JSON.stringify(o).toLowerCase(); if(!txt.includes(search.toLowerCase())) return false; }
    return true;
  });
  const filtered = useMemo(()=>applyFilters(orders),[orders,filters]);
  const total = filtered.reduce((s,o)=> s + (parseFloat(o.sales_orders_total_amount||o.sales_orders_total||0)||0),0);

  return (
    <>
    <SharedDetailModalBase title="تفاصيل الأوامر" client={client} open={open} onClose={onClose}>
      <Filters filters={filters} setFilters={setFilters} />
      {loading && <div className="text-indigo-600 font-semibold">تحميل...</div>}
      {error && <div className="text-red-600 font-semibold">{error}</div>}
      {!loading && !error && (
        <>
          <div className="p-2 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold flex justify-between"><span>عدد:</span><span>{filtered.length}</span><span>الإجمالي:</span><span>{total.toFixed(2)}</span></div>
          {filtered.length===0 ? <Empty /> : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full text-[11px]">
                <thead className="bg-gray-100">
                  <tr>
                    <Th>رقم</Th><Th>التاريخ</Th><Th>الحالة</Th><Th>الإجمالي</Th><Th className="no-print">عرض</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(o=> (
                    <tr key={o.sales_orders_id} className="hover:bg-gray-50">
                      <Td>{o.sales_orders_id}</Td>
                      <Td>{o.sales_orders_date || o.sales_orders_order_date || o.sales_orders_created_at || '—'}</Td>
                      <Td>{o.sales_orders_status || '—'}</Td>
                      <Td className="font-semibold">{o.sales_orders_total_amount || o.sales_orders_total || '0'}</Td>
                      <Td><button onClick={()=>handleShowDetails(o)} className="no-print text-indigo-600 hover:underline text-[10px] font-semibold">تفاصيل</button></Td>
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
      <SalesOrderDetailsModal 
        order={selectedDetails || selected}
        onClose={() => { setSelected(null); setSelectedDetails(null); }}
      />
    )}
    {selected && loadingDetails && !selectedDetails && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none">
        <div className="bg-white/80 backdrop-blur px-4 py-2 rounded text-xs font-semibold text-indigo-700 shadow">جاري تحميل تفاصيل الأمر...</div>
      </div>
    )}
  </>
  );
}

function Filters({filters,setFilters}){
  return (
    <div className="flex flex-wrap gap-2 text-[11px] items-end">
      <div className="flex flex-col"><label className="mb-0.5">من</label><input type="date" value={filters.dateFrom} onChange={e=>setFilters(f=>({...f,dateFrom:e.target.value}))} className="border rounded px-2 py-1"/></div>
      <div className="flex flex-col"><label className="mb-0.5">إلى</label><input type="date" value={filters.dateTo} onChange={e=>setFilters(f=>({...f,dateTo:e.target.value}))} className="border rounded px-2 py-1"/></div>
      <div className="flex flex-col"><label className="mb-0.5">حالة</label><input placeholder="بحث جزئي" value={filters.status} onChange={e=>setFilters(f=>({...f,status:e.target.value}))} className="border rounded px-2 py-1"/></div>
      <div className="flex flex-col flex-1 min-w-[160px]"><label className="mb-0.5">بحث</label><input placeholder="بحث عام" value={filters.search} onChange={e=>setFilters(f=>({...f,search:e.target.value}))} className="border rounded px-2 py-1"/></div>
      {(filters.dateFrom||filters.dateTo||filters.status||filters.search) && <button onClick={()=>setFilters({dateFrom:'',dateTo:'',status:'',search:''})} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded">مسح</button>}
    </div>
  );
}

const Th = ({children})=> <th className="px-2 py-1 text-right font-bold text-gray-700">{children}</th>;
const Td = ({children})=> <td className="px-2 py-1">{children}</td>;
const Empty = ()=> <div className="text-gray-500 italic">لا توجد بيانات</div>;

async function fetchOrderDetails(order){
  try {
    const details = await getSalesOrderDetails(order.sales_orders_id || order.id);
    return details;
  } catch(e){
    console.error('Failed to fetch order details', e);
    return null;
  }
}

// handleShowDetails moved inside component to access state setters
