import React, { useEffect, useState, useMemo } from 'react';
import SharedDetailModalBase from './SharedDetailModalBase.jsx';
import { getAllSalesReturns, getSalesReturnDetails } from '../../../../../../apis/sales_returns.js';
import SalesReturnDetailsModal from '../../../sales-management/sales-returns/SalesReturnDetailsModal.jsx';

export default function ClientReturnsModal({ client, open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', status: '', search: '' });
  const [selected, setSelected] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const handleShowDetails = (ret) => {
    setSelected(ret);
    setLoadingDetails(true);
    fetchReturnDetails(ret).then(d => { setSelectedDetails(d); setLoadingDetails(false); });
  };

  useEffect(()=>{
    if(!open || !client) return; let cancelled=false;
    (async()=>{ setLoading(true); setError('');
      try{ const resp = await getAllSalesReturns({ client_id: client.clients_id });
        const arr = Array.isArray(resp?.data)? resp.data : Array.isArray(resp)? resp: (resp?.data?.data||resp?.returns||[]);
        if(!cancelled) setRows(arr);
      }catch(e){ if(!cancelled){ setError(e.message||'فشل تحميل المرتجعات'); setRows([]);} }
      finally { if(!cancelled) setLoading(false); }
    })();
    return ()=>{cancelled=true};
  },[open,client]);

  const applyFilters = (arr)=> arr.filter(r=>{
    const {dateFrom,dateTo,status,search}=filters;
    const dateVal = r.returns_date || r.sales_returns_date || r.created_at;
    if(dateFrom && dateVal && new Date(dateVal) < new Date(dateFrom)) return false;
    if(dateTo && dateVal && new Date(dateVal) > new Date(dateTo)) return false;
    if(status){ const st=(r.returns_status||'').toLowerCase(); if(!st.includes(status.toLowerCase())) return false; }
    if(search){ const txt=JSON.stringify(r).toLowerCase(); if(!txt.includes(search.toLowerCase())) return false; }
    return true;
  });
  const filtered = useMemo(()=>applyFilters(rows),[rows,filters]);
  const total = filtered.reduce((s,r)=> s + (parseFloat(r.returns_total_amount||r.returns_total||r.total_amount||0)||0),0);

  return (
    <>
    <SharedDetailModalBase title="تفاصيل المرتجعات" client={client} open={open} onClose={onClose}>
      <Filters filters={filters} setFilters={setFilters} />
      {loading && <div className="text-indigo-600 font-semibold">تحميل...</div>}
      {error && <div className="text-red-600 font-semibold">{error}</div>}
      {!loading && !error && (
        <>
          <div className="p-2 rounded-md bg-orange-50 text-orange-700 text-xs font-bold flex justify-between"><span>عدد:</span><span>{filtered.length}</span><span>الإجمالي:</span><span>{total.toFixed(2)}</span></div>
          {filtered.length===0 ? <Empty /> : (
      <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full text-[11px]">
        <thead className="bg-gray-100"><tr><Th>رقم</Th><Th>التاريخ</Th><Th>الحالة</Th><Th>الإجمالي</Th><Th className="no-print">عرض</Th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(r=> (
                    <tr key={r.returns_id || r.sales_returns_id} className="hover:bg-gray-50">
                      <Td>{r.returns_id || r.sales_returns_id}</Td>
                      <Td>{r.returns_date || r.sales_returns_date || r.created_at || '—'}</Td>
                      <Td>{r.returns_status || r.sales_returns_status || '—'}</Td>
            <Td className="font-semibold">{r.returns_total_amount || r.returns_total || r.total_amount || '0'}</Td>
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
      <SalesReturnDetailsModal 
        returnItem={selectedDetails || selected}
        onClose={() => { setSelected(null); setSelectedDetails(null); }}
      />
    )}
    {selected && loadingDetails && !selectedDetails && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none">
        <div className="bg-white/80 backdrop-blur px-4 py-2 rounded text-xs font-semibold text-indigo-700 shadow">جاري تحميل تفاصيل المرتجع...</div>
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

async function fetchReturnDetails(ret){
  try {
    const details = await getSalesReturnDetails(ret.returns_id || ret.sales_returns_id || ret.id);
    return details;
  } catch(e){
    console.error('Failed to fetch return details', e);
    return null;
  }
}
