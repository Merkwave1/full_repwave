import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { MagnifyingGlassIcon, XMarkIcon, FunnelIcon, PlusIcon, EyeIcon, PrinterIcon } from '@heroicons/react/24/outline';

import Loader from '../../../../common/Loader/Loader';
import Alert from '../../../../common/Alert/Alert';
import DeleteConfirmationModal from '../../../../common/DeleteConfirmationModal';
import { getSupplierPayments, deleteSupplierPayment, getSupplierPaymentDetails } from '../../../../../apis/supplier_payments';
// context lists will be read from localStorage to avoid extra fetches
import AddSupplierPaymentForm from './AddSupplierPaymentForm';
import UpdateSupplierPaymentForm from './UpdateSupplierPaymentForm';
import SupplierPaymentDetailsModal from './SupplierPaymentDetailsModal';
import CustomPageHeader from '../../../../common/CustomPageHeader/CustomPageHeader';
import FilterBar from '../../../../common/FilterBar/FilterBar';
import PaginationHeaderFooter from '../../../../common/PaginationHeaderFooter/PaginationHeaderFooter';
import GlobalTable from '../../../../common/GlobalTable/GlobalTable';
import useCurrency from '../../../../../hooks/useCurrency';
import { formatLocalDateTime } from '../../../../../utils/dateUtils';
import { isOdooIntegrationEnabled } from '../../../../../utils/odooIntegration';


export default function SupplierPaymentsTab() {
const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();
const { formatCurrency: formatMoney } = useCurrency();
const [odooEnabled] = useState(() => isOdooIntegrationEnabled());

const [supplierPayments, setSupplierPayments] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
const [searchTerm, setSearchTerm] = useState('');
// pendingSearch used so search only triggers on Apply
const [pendingSearch, setPendingSearch] = useState('');
const [dateFromFilter, setDateFromFilter] = useState('');
const [dateToFilter, setDateToFilter] = useState('');
const [selectedSupplierFilter, setSelectedSupplierFilter] = useState('');
const [selectedSafeFilter, setSelectedSafeFilter] = useState('');
// Pagination state
const [currentPage, setCurrentPage] = useState(1);
const [itemsPerPage, setItemsPerPage] = useState(10);
const [totalCount, setTotalCount] = useState(0);
const [currentView, setCurrentView] = useState('list');
const [selectedPayment, setSelectedPayment] = useState(null);
const [deleteModalOpen, setDeleteModalOpen] = useState(false);
const [paymentToDelete, setPaymentToDelete] = useState(null);

// Context data for forms
const [paymentMethods, setPaymentMethods] = useState([]);
const [safes, setSafes] = useState([]);
const [suppliers, setSuppliers] = useState([]);
const [purchaseOrders, setPurchaseOrders] = useState([]);

const loadSupplierPayments = useCallback(async () => {
setLoading(true);
setError(null);
try {
const offset = (currentPage - 1) * itemsPerPage;
const response = await getSupplierPayments({
supplier_id: selectedSupplierFilter || undefined,
        safe_id: selectedSafeFilter || undefined,
        search: searchTerm || undefined,
start_date: dateFromFilter || undefined,
end_date: dateToFilter || undefined,
limit: itemsPerPage,
offset,
});
setSupplierPayments(response.supplier_payments || []);
setTotalCount(Number(response.total_count || 0));
} catch (e) {
setError(e.message || 'Error loading supplier payments');
setGlobalMessage({ type: 'error', message: 'فشل في تحميل مدفوعات الموردين.' });
} finally {
setLoading(false);
}
}, [setGlobalMessage, currentPage, itemsPerPage, selectedSupplierFilter, selectedSafeFilter, searchTerm, dateFromFilter, dateToFilter]);

const lastFetchKeyRef = useRef(null);

const loadContextData = useCallback(() => {
  const parseList = (raw) => {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      // If it's an array, return it
      if (Array.isArray(parsed)) return parsed;
      // common wrappers: { suppliers: [...] } or { data: [...] } or { items: [...] }
      if (parsed.suppliers && Array.isArray(parsed.suppliers)) return parsed.suppliers;
      if (parsed.safes && Array.isArray(parsed.safes)) return parsed.safes;
      if (parsed.payment_methods && Array.isArray(parsed.payment_methods)) return parsed.payment_methods;
      if (parsed.paymentMethods && Array.isArray(parsed.paymentMethods)) return parsed.paymentMethods;
      if (parsed.payment_methods_list && Array.isArray(parsed.payment_methods_list)) return parsed.payment_methods_list;
      if (parsed.data && Array.isArray(parsed.data)) return parsed.data;
      if (parsed.items && Array.isArray(parsed.items)) return parsed.items;
      // last resort: find first array property
      for (const k of Object.keys(parsed)) {
        if (Array.isArray(parsed[k])) return parsed[k];
      }
      return [];
    } catch (e) {
      console.warn('Failed parsing localStorage entry', e);
      return [];
    }
  };

  try {
    const pmRaw = localStorage.getItem('appPaymentMethods') || localStorage.getItem('app_payment_methods');
    const parsedPM = parseList(pmRaw);
    if (parsedPM.length) setPaymentMethods(parsedPM);

    const safesRaw = localStorage.getItem('appSafes') || localStorage.getItem('app_safes');
    const parsedSafes = parseList(safesRaw);
    if (parsedSafes.length) setSafes(parsedSafes);

    const suppliersRaw = localStorage.getItem('appSuppliers') || localStorage.getItem('app_suppliers') || localStorage.getItem('suppliers');
    const parsedSuppliers = parseList(suppliersRaw);
    if (parsedSuppliers.length) setSuppliers(parsedSuppliers);

    const posRaw = localStorage.getItem('appPurchaseOrders') || localStorage.getItem('app_purchase_orders') || localStorage.getItem('purchase_orders');
    const parsedPOs = parseList(posRaw);
    if (parsedPOs.length) setPurchaseOrders(parsedPOs);
  } catch (error) {
    console.error('Error loading context data from localStorage:', error);
  }
}, []);

useEffect(() => {
    // This effect ensures we only fetch data when dependencies change, preventing redundant calls.
const key = `${currentPage}|${itemsPerPage}|${selectedSupplierFilter||''}|${selectedSafeFilter||''}|${dateFromFilter||''}|${dateToFilter||''}|${searchTerm}`;
if (lastFetchKeyRef.current === key) return;
lastFetchKeyRef.current = key;
loadSupplierPayments();
}, [loadSupplierPayments, currentPage, itemsPerPage, selectedSupplierFilter, selectedSafeFilter, dateFromFilter, dateToFilter, searchTerm]);
  
  useEffect(() => {
    // Load context data only once on component mount
    loadContextData();
  }, [loadContextData]);

useEffect(() => {
setChildRefreshHandler(() => loadSupplierPayments);
return () => setChildRefreshHandler(null);
}, [setChildRefreshHandler, loadSupplierPayments]);

// keep pendingSearch in sync with committed searchTerm
useEffect(() => {
setPendingSearch(searchTerm || '');
}, [searchTerm]);

const handleAddPayment = () => {
setCurrentView('add');
};

const handleViewDetails = (payment) => {
setSelectedPayment(payment);
setCurrentView('details');
};

const handlePrint = useCallback(async (payment) => {
try {
setGlobalMessage({ type: 'info', message: 'جاري تحضير الطباعة...' });
      const payload = await getSupplierPaymentDetails(payment.supplier_payments_id);
      const details = payload?.payment_details || payload;

const supplierName = details.supplier_name || 'غير محدد';
const safeName = details.safe_name || 'غير محدد';
const methodName = details.payment_method_name || 'غير محدد';
const amount = parseFloat(details.supplier_payments_amount || 0);
const status = details.supplier_payments_status || '-';
const type = details.supplier_payments_type || '-';
const transId = details.supplier_payments_transaction_id || '';
const date = details.supplier_payments_date ? formatLocalDateTime(details.supplier_payments_date) : '-';
const notes = details.supplier_payments_notes || '';
const poId = details.purchase_order_id;
const createdAt = details.supplier_payments_created_at ? formatLocalDateTime(details.supplier_payments_created_at) : '';
const createdBy = details.rep_user_name || '';
const updatedAt = details.supplier_payments_updated_at ? formatLocalDateTime(details.supplier_payments_updated_at) : '';
const updatedBy = details.updated_by_user_name || '';

const currentDate = new Date();

const printContent = `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>دفعة مورد رقم #${details.supplier_payments_id}</title><style>
* { box-sizing:border-box; }
body { font-family:Arial,sans-serif; margin:0; padding:20px; background:#fff; color:#000; direction:rtl; }
.order-container { max-width:210mm; margin:0 auto; background:#fff; }
.header { text-align:center; margin-bottom:30px; border-bottom:3px solid #000; padding-bottom:15px; }
.header h1 { margin:0; font-size:24px; font-weight:bold; }
.order-info { display:grid; grid-template-columns:1fr 1fr; gap:30px; margin-bottom:30px; }
.info-section { border:2px solid #000; padding:15px; }
.info-section h3 { margin-top:0; font-size:16px; margin-bottom:12px; }
.info-row { display:flex; font-size:13px; margin-bottom:6px; }
.info-label { font-weight:bold; min-width:140px; }
.totals-section { border:2px solid #000; padding:15px; margin-top:10px; background:#f8f9fa; }
.footer { margin-top:40px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:30px; text-align:center; }
.signature-box { border:1px solid #000; padding:15px; height:60px; }
.signature-label { font-weight:bold; margin-bottom:10px; }
.print-date { text-align:center; margin-top:20px; font-size:12px; color:#555; }
@media print { body { margin:0; padding:10px; } .order-container { border:none; box-shadow:none; margin:0; padding:0; } }
</style></head><body>
<div class="order-container">
<div class="header"><h1>دفعة مورد رقم #${details.supplier_payments_id}</h1></div>
<div class="order-info">
<div class="info-section">
<h3>معلومات الدفعة</h3>
<div class="info-row"><span class="info-label">رقم الدفعة:</span><span>#${details.supplier_payments_id}</span></div>
<div class="info-row"><span class="info-label">التاريخ:</span><span>${date}</span></div>
<div class="info-row"><span class="info-label">الحالة:</span><span>${status}</span></div>
<div class="info-row"><span class="info-label">النوع:</span><span>${type}</span></div>
${transId ? `<div class="info-row"><span class="info-label">رقم المعاملة:</span><span>${transId}</span></div>` : ''}
${poId ? `<div class="info-row"><span class="info-label">أمر الشراء المرتبط:</span><span>#${poId}</span></div>` : ''}
</div>
<div class="info-section">
<h3>معلومات الطرفين</h3>
<div class="info-row"><span class="info-label">المورد:</span><span>${supplierName}</span></div>
<div class="info-row"><span class="info-label">طريقة الدفع:</span><span>${methodName}</span></div>
<div class="info-row"><span class="info-label">الخزنة:</span><span>${safeName}</span></div>
<div class="info-row"><span class="info-label">المبلغ:</span><span>${formatMoney(amount)}</span></div>
</div>
</div>
${notes ? `<div class="totals-section"><h3 style="margin-top:0;">الملاحظات</h3><div>${notes}</div></div>` : ''}
<div class="totals-section">
<h3 style="margin-top:0;">معلومات النظام</h3>
<div class="info-row"><span class="info-label">تاريخ الإنشاء:</span><span>${createdAt}</span></div>
${createdBy ? `<div class="info-row"><span class="info-label">أنشأ بواسطة:</span><span>${createdBy}</span></div>` : ''}
${updatedAt ? `<div class="info-row"><span class="info-label">آخر تحديث:</span><span>${updatedAt}</span></div>` : ''}
${updatedBy ? `<div class="info-row"><span class="info-label">محدث بواسطة:</span><span>${updatedBy}</span></div>` : ''}
</div>
<div class="footer"><div class="signature-box"><div class="signature-label">توقيع المورد</div></div><div class="signature-box"><div class="signature-label">توقيع المحاسب</div></div><div class="signature-box"><div class="signature-label">ختم الشركة</div></div></div>
<div class="print-date">تم إنشاء هذا المستند بتاريخ: ${formatLocalDateTime(currentDate)}</div>
</div>
</body></html>`;

const { printHtml } = await import('../../../../../utils/printUtils.js');
await printHtml(printContent, { title: 'تفاصيل دفعة مورد', closeAfter: 700 });
setGlobalMessage({ type: 'success', message: 'تم تحضير الطباعة بنجاح!' });
} catch (error) {
console.error('Print failed', error);
setGlobalMessage({ type: 'error', message: `فشل في طباعة الدفعة: ${error.message}` });
}
}, [setGlobalMessage, formatMoney]);

const confirmDelete = async () => {
try {
await deleteSupplierPayment(paymentToDelete.supplier_payments_id);
setGlobalMessage({ type: 'success', message: 'تم حذف الدفعة بنجاح.' });
await loadSupplierPayments();
} catch {
setGlobalMessage({ type: 'error', message: 'فشل في حذف الدفعة.' });
} finally {
setDeleteModalOpen(false);
setPaymentToDelete(null);
}
};

const handleFormSubmit = async () => {
setGlobalMessage({ type: 'success', message: 'تم حفظ الدفعة بنجاح.' });
await loadSupplierPayments();
await loadContextData(); // Refresh safes and other context data
setCurrentView('list');
setSelectedPayment(null);
};

const handleCloseModal = () => {
setCurrentView('list');
setSelectedPayment(null);
};

// Client-side filtering is no longer needed as the backend handles it.
  // We pass the raw data to the table.
const filteredPayments = supplierPayments;

// active chips for FilterBar
const activeChips = useMemo(() => {
const chips = [];
if (dateFromFilter || dateToFilter) {
chips.push({ key: 'date', label: 'التاريخ', value: `${dateFromFilter||''}${dateFromFilter && dateToFilter ? ' - ' : ''}${dateToFilter||''}`, tone: 'red', onRemove: () => { setDateFromFilter(''); setDateToFilter(''); setCurrentPage(1); } });
}
if (selectedSupplierFilter) {
const found = suppliers.find(s => String(s.supplier_id) === String(selectedSupplierFilter));
chips.push({ key: 'supplier', label: 'المورد', value: found ? found.supplier_name : selectedSupplierFilter, tone: 'indigo', onRemove: () => { setSelectedSupplierFilter(''); setCurrentPage(1); } });
}
if (selectedSafeFilter) {
const found = safes.find(s => String(s.safes_id) === String(selectedSafeFilter));
chips.push({ key: 'safe', label: 'الخزنة', value: found ? found.safes_name : selectedSafeFilter, tone: 'blue', onRemove: () => { setSelectedSafeFilter(''); setCurrentPage(1); } });
}
if (searchTerm && searchTerm.trim() !== '') {
chips.push({ key: 'search', label: 'بحث', value: searchTerm, tone: 'green', onRemove: () => { setSearchTerm(''); setPendingSearch(''); setCurrentPage(1); } });
}
return chips;
}, [dateFromFilter, dateToFilter, selectedSupplierFilter, selectedSafeFilter, searchTerm, suppliers, safes]);

const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    return formatLocalDateTime(dateString);
  } catch {
    return String(dateString);
  }
};

const tableColumns = [
{ key: 'supplier_payments_id', title: 'رقم الدفعة', headerAlign: 'center', align: 'center', headerClassName: 'w-24', render: (r) => (<span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-semibold">#{r.supplier_payments_id}</span>) },
...(odooEnabled ? [{ key: 'supplier_payments_odoo_id', title: 'ODOO', headerAlign: 'center', align: 'center', headerClassName: 'w-20', render: (r) => r.supplier_payments_odoo_id ? (<span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-semibold">{r.supplier_payments_odoo_id}</span>) : (<span className="text-gray-400">—</span>) }] : []),
{ key: 'supplier_name', title: 'المورد', sortable: true, headerClassName: 'min-w-[150px]', render: (r) => r.supplier_name },
{ key: 'safe_name', title: 'الخزنة', sortable: true, headerClassName: 'min-w-[120px]', render: (r) => r.safe_name || 'غير محدد' },
{ key: 'supplier_payments_date', title: 'التاريخ', sortable: true, headerClassName: 'min-w-[120px]', render: (r) => formatDate(r.supplier_payments_date) },
{ key: 'supplier_payments_amount', title: 'المبلغ', sortable: true, headerClassName: 'min-w-[120px]', align: 'right', render: (r) => (<span className="font-semibold">{formatMoney(r.supplier_payments_amount)}</span>) },
{ key: 'supplier_payments_notes', title: 'الملاحظات', headerClassName: 'min-w-[200px]', render: (r) => (<div className="line-clamp-2">{r.supplier_payments_notes || 'لا توجد ملاحظات'}</div>) },
{ key: 'actions', title: 'إجراءات', headerAlign: 'center', align: 'center', className: 'w-32', render: (r) => (
<div className="flex items-center justify-center gap-2">
<button onClick={(e) => { e.stopPropagation(); handleViewDetails(r); }} className="group p-1.5 text-blue-600 hover:text-white hover:bg-blue-600 rounded-full transition-all" title="عرض التفاصيل"><EyeIcon className="h-4 w-4" /></button>
<button onClick={(e) => { e.stopPropagation(); handlePrint(r); }} className="group p-1.5 text-green-600 hover:text-white hover:bg-green-600 rounded-full transition-all" title="طباعة"><PrinterIcon className="h-4 w-4" /></button>
</div>
) },
];

const clearAllFilters = () => {
setSearchTerm('');
    setPendingSearch('');
setDateFromFilter('');
setDateToFilter('');
setSelectedSupplierFilter('');
setSelectedSafeFilter('');
    setCurrentPage(1);
};

const renderContent = () => {
if (currentView === 'add') {
return (
<AddSupplierPaymentForm
onClose={handleCloseModal}
onSubmit={handleFormSubmit}
paymentMethods={paymentMethods}
safes={safes}
          suppliers={suppliers}
purchaseOrders={purchaseOrders}
/>
);
}

if (currentView === 'edit' && selectedPayment) {
return (
<UpdateSupplierPaymentForm
payment={selectedPayment}
onClose={handleCloseModal}
onSubmit={handleFormSubmit}
paymentMethods={paymentMethods}
safes={safes}
          suppliers={suppliers}
purchaseOrders={purchaseOrders}
/>
);
}

if (currentView === 'details' && selectedPayment) {
return (
<SupplierPaymentDetailsModal
paymentId={selectedPayment.supplier_payments_id}
onClose={handleCloseModal}
onPrint={handlePrint}
/>
);
}

// Default list view
return (
<>
<CustomPageHeader
title="مدفوعات الموردين"
subtitle="قائمة دفعات الموردين وإدارتها"
statValue={totalCount}
statLabel="إجمالي المدفوعات"
actionButton={<button onClick={handleAddPayment} className="bg-white text-blue-600 font-bold py-2 px-4 rounded-md shadow-sm border border-gray-200 hover:bg-gray-50 flex items-center gap-2"><PlusIcon className="h-5 w-5" /> إضافة دفعة</button>}
/>

<FilterBar
title="بحث وفلاتر دفعات الموردين"
searchConfig={{
placeholder: 'ابحث عن دفعة...',
value: pendingSearch,
onChange: (v) => setPendingSearch(v),
onClear: () => { setPendingSearch(''); setSearchTerm(''); setCurrentPage(1); },
searchWhileTyping: false,
onSubmit: (v) => { setSearchTerm(v); setCurrentPage(1); },
showApplyButton: true,
applyLabel: 'تطبيق'
}}
dateRangeConfig={{
from: dateFromFilter,
to: dateToFilter,
onChange: (from, to) => { setDateFromFilter(from); setDateToFilter(to); setCurrentPage(1); },
onClear: () => { setDateFromFilter(''); setDateToFilter(''); setCurrentPage(1); }
}}
          selectFilters={[
            { key: 'supplier', label: 'المورد', value: selectedSupplierFilter, onChange: (v) => { setSelectedSupplierFilter(v); setCurrentPage(1); }, options: (Array.isArray(suppliers) ? [{ value: '', label: 'كل الموردين' }, ...suppliers.map(s => ({ value: String(s.supplier_id ?? s.id ?? s.supplierId ?? ''), label: s.supplier_name ?? s.name ?? s.supplierName ?? String(s.supplier_id ?? s.id ?? '') }))] : [{ value: '', label: 'كل الموردين' }]) },
            { key: 'safe', label: 'الخزنة', value: selectedSafeFilter, onChange: (v) => { setSelectedSafeFilter(v); setCurrentPage(1); }, options: (Array.isArray(safes) ? [{ value: '', label: 'كل الخزائن' }, ...safes.map(s => ({ value: String(s.safes_id ?? s.id ?? s.safeId ?? ''), label: s.safes_name ?? s.name ?? s.safeName ?? String(s.safes_id ?? s.id ?? '') }))] : [{ value: '', label: 'كل الخزائن' }]) }
          ]}
activeChips={activeChips}
onClearAll={clearAllFilters}
/>
        
        <div className="mt-4">
          <PaginationHeaderFooter
            total={totalCount}
            currentPage={currentPage}
            totalPages={Math.max(1, Math.ceil(totalCount / itemsPerPage))}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={(n) => { setCurrentPage(1); setItemsPerPage(n); }}
            onFirst={() => setCurrentPage(1)}
            onPrev={() => setCurrentPage(p => Math.max(1, p - 1))}
            onNext={() => setCurrentPage(p => Math.min(Math.max(1, Math.ceil(totalCount / itemsPerPage)), p + 1))}
            onLast={() => setCurrentPage(Math.max(1, Math.ceil(totalCount / itemsPerPage)))}
            loading={loading}
            onNavigateStart={() => setLoading(true)}
          />

          {loading && <Loader className="mt-8" />}
          {error && <Alert message={error} type="error" className="mb-4" />}

          {!loading && !error && (
            <>
              <GlobalTable
                data={filteredPayments}
                columns={tableColumns}
                rowKey="supplier_payments_id"
                totalCount={totalCount}
                searchTerm={searchTerm}
                initialSort={{ key: 'supplier_payments_date', direction: 'desc' }}
                tableClassName="text-sm"
              />

              <PaginationHeaderFooter
                total={totalCount}
                currentPage={currentPage}
                totalPages={Math.max(1, Math.ceil(totalCount / itemsPerPage))}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={(n) => { setCurrentPage(1); setItemsPerPage(n); }}
                onFirst={() => setCurrentPage(1)}
                onPrev={() => setCurrentPage(p => Math.max(1, p - 1))}
                onNext={() => setCurrentPage(p => Math.min(Math.max(1, Math.ceil(totalCount / itemsPerPage)), p + 1))}
                onLast={() => setCurrentPage(Math.max(1, Math.ceil(totalCount / itemsPerPage)))}
                loading={loading}
                onNavigateStart={() => setLoading(true)}
              />
            </>
          )}
        </div>
</>
);
};

return (
<div className="p-4 md:p-6 lg:p-8 bg-gray-50 min-h-screen animate-fadeIn">
{renderContent()}
{deleteModalOpen && (
<DeleteConfirmationModal
itemType="الدفعة"
itemName={`#${paymentToDelete?.supplier_payments_id}`}
onConfirm={confirmDelete}
onCancel={() => setDeleteModalOpen(false)}
/>
)}
</div>
);
}
