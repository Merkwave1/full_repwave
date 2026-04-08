import React, { useEffect, useState, useMemo } from 'react';
import SharedDetailModalBase from './SharedDetailModalBase.jsx';
import { getClientPayments, getClientPaymentDetails } from '../../../../../../apis/client_payments.js';
import ClientPaymentDetailsModal from '../../../sales-management/client-payments/ClientPaymentDetailsModal.jsx';

export default function ClientPaymentsModal({ client, open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', method: '', search: '' });
  const [selected, setSelected] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const handleShowDetails = (payment) => {
    setSelected(payment);
    setLoadingDetails(true);
    fetchPaymentDetails(payment).then(d => { setSelectedDetails(d?.data || d); setLoadingDetails(false); });
  };

  useEffect(()=>{ if(!open || !client) return; let cancelled=false;
    (async()=>{ setLoading(true); setError('');
      try{ const resp = await getClientPayments({ client_id: client.clients_id });
        const arr = Array.isArray(resp)? resp : (resp?.data?.client_payments || resp?.client_payments || []);
        if(!cancelled) setRows(arr);
      }catch(e){ if(!cancelled){ setError(e.message||'فشل تحميل المدفوعات'); setRows([]);} }
      finally { if(!cancelled) setLoading(false); }
    })();
    return ()=>{ cancelled=true };
  },[open,client]);

  const applyFilters = (arr)=> arr.filter(r=>{
    const {dateFrom,dateTo,method,search}=filters;
    const dateVal = r.client_payments_date || r.client_payments_created_at;
    if(dateFrom && dateVal && new Date(dateVal) < new Date(dateFrom)) return false;
    if(dateTo && dateVal && new Date(dateVal) > new Date(dateTo)) return false;
    if(method){ const mth=(r.payment_method_name || r.client_payments_method_id || '').toString().toLowerCase(); if(!mth.includes(method.toLowerCase())) return false; }
    if(search){ const txt=JSON.stringify(r).toLowerCase(); if(!txt.includes(search.toLowerCase())) return false; }
    return true;
  });
  const filtered = useMemo(()=>applyFilters(rows),[rows,filters]);
  const total = filtered.reduce((s,r)=> s + (parseFloat(r.client_payments_amount)||0),0);

  return (
    <>
    <SharedDetailModalBase title="تفاصيل المدفوعات" client={client} open={open} onClose={onClose}>
      <Filters filters={filters} setFilters={setFilters} />
      {loading && <div className="text-indigo-600 font-semibold">تحميل...</div>}
      {error && <div className="text-red-600 font-semibold">{error}</div>}
      {!loading && !error && (
        <>
          <div className="p-2 rounded-md bg-green-50 text-green-700 text-xs font-bold flex justify-between"><span>عدد:</span><span>{filtered.length}</span><span>الإجمالي:</span><span>{total.toFixed(2)}</span></div>
          {filtered.length===0 ? <Empty /> : (
      <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full text-[11px]">
        <thead className="bg-gray-100"><tr><Th>#</Th><Th>التاريخ</Th><Th>المبلغ</Th><Th>طريقة</Th><Th className="no-print">عرض</Th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(r=> (
                    <tr key={r.client_payments_id} className="hover:bg-gray-50">
                      <Td>{r.client_payments_id}</Td>
                      <Td>{r.client_payments_date || r.client_payments_created_at || '—'}</Td>
                      <Td className="font-semibold text-green-600">{r.client_payments_amount}</Td>
            <Td>{r.payment_method_name || r.client_payments_method_id || '—'}</Td>
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
      <ClientPaymentDetailsModal 
        payment={selectedDetails || selected}
        onClose={() => { setSelected(null); setSelectedDetails(null); }}
      />
    )}
    {selected && loadingDetails && !selectedDetails && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none">
        <div className="bg-white/80 backdrop-blur px-4 py-2 rounded text-xs font-semibold text-indigo-700 shadow">جاري تحميل تفاصيل الدفع...</div>
      </div>
    )}
    </>
  );
}

function Filters({filters,setFilters}){ return (
  <div className="flex flex-wrap gap-2 text-[11px] items-end">
    <div className="flex flex-col"><label className="mb-0.5">من</label><input type="date" value={filters.dateFrom} onChange={e=>setFilters(f=>({...f,dateFrom:e.target.value}))} className="border rounded px-2 py-1"/></div>
    <div className="flex flex-col"><label className="mb-0.5">إلى</label><input type="date" value={filters.dateTo} onChange={e=>setFilters(f=>({...f,dateTo:e.target.value}))} className="border rounded px-2 py-1"/></div>
    <div className="flex flex-col"><label className="mb-0.5">طريقة</label><input placeholder="بحث جزئي" value={filters.method} onChange={e=>setFilters(f=>({...f,method:e.target.value}))} className="border rounded px-2 py-1"/></div>
    <div className="flex flex-col flex-1 min-w-[160px]"><label className="mb-0.5">بحث</label><input placeholder="بحث عام" value={filters.search} onChange={e=>setFilters(f=>({...f,search:e.target.value}))} className="border rounded px-2 py-1"/></div>
    {(filters.dateFrom||filters.dateTo||filters.method||filters.search) && <button onClick={()=>setFilters({dateFrom:'',dateTo:'',method:'',search:''})} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded">مسح</button>}
  </div>
); }
const Th = ({children})=> <th className="px-2 py-1 text-right font-bold text-gray-700">{children}</th>;
const Td = ({children})=> <td className="px-2 py-1">{children}</td>;
const Empty = ()=> <div className="text-gray-500 italic">لا توجد بيانات</div>;

async function fetchPaymentDetails(payment){
  try {
    const details = await getClientPaymentDetails(payment.client_payments_id || payment.id);
    return details;
  } catch(e){
    console.error('Failed to fetch payment details', e);
    return null;
  }
}
