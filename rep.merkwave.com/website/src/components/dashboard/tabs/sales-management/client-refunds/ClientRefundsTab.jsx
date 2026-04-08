// src/components/dashboard/tabs/sales-management/client-refunds/ClientRefundsTab.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { MagnifyingGlassIcon, XMarkIcon, FunnelIcon, PlusIcon, CalendarDaysIcon, EyeIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';

import Loader from '../../../../common/Loader/Loader';
import Alert from '../../../../common/Alert/Alert';
import DeleteConfirmationModal from '../../../../common/DeleteConfirmationModal';
import SearchableSelect from '../../../../common/SearchableSelect/SearchableSelect';

// TODO: wire real APIs when backend ready
import { getClientRefunds, deleteClientRefund } from '../../../../../apis/client_refunds';
import AddClientRefundForm from './AddClientRefundForm';
import UpdateClientRefundForm from './UpdateClientRefundForm';
import ClientRefundDetailsModal from './ClientRefundDetailsModal';

// Date Range Picker (inline component)
const DateRangePicker = ({ dateFrom, dateTo, onChange, onClear }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '');
  const label = !dateFrom && !dateTo ? 'اختر فترة التاريخ' : dateFrom && dateTo ? `${fmt(dateFrom)} - ${fmt(dateTo)}` : (dateFrom ? `من ${fmt(dateFrom)}` : `إلى ${fmt(dateTo)}`);

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm cursor-pointer bg-white hover:border-gray-400 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
        <div className="flex items-center justify-between">
          <span className={`text-sm ${(!dateFrom && !dateTo) ? 'text-gray-500' : 'text-gray-900'}`}>{label}</span>
          <div className="flex items-center gap-2">
            {(dateFrom || dateTo) && (
              <button type="button" onClick={(e) => { e.stopPropagation(); onClear(); }} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
            <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
          </div>
        </div>
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50">
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ</label>
              <input type="date" value={dateFrom} onChange={(e) => onChange(e.target.value, dateTo)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label>
              <input type="date" value={dateTo} onChange={(e) => onChange(dateFrom, e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm" />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setIsOpen(false)} className="flex-1 px-3 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">تطبيق</button>
              <button type="button" onClick={() => { onClear(); setIsOpen(false); }} className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500">مسح</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// List View
const ClientRefundListView = ({ refunds, loading, error, searchTerm, formatDate, formatCurrency, onEdit, onView, onDelete }) => {
  if (loading) return <Loader className="mt-8" />;
  if (error) return <Alert message={error} type="error" className="mb-4" />;

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden animate-fadeIn">
      <div className="bg-gradient-to-r from-indigo-100 to-blue-100 px-6 py-4 border-b border-gray-300 flex items-center justify-between">
        <div className="text-sm text-gray-800">
          إجمالي مرتجعات العملاء: <span className="font-bold text-indigo-700 ml-1">{refunds.length}</span>
        </div>
        {searchTerm && (
          <div className="text-sm text-gray-500">نتائج البحث عن: "<span className="font-medium">{searchTerm}</span>"</div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-16 px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase border-r border-gray-200">#</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase border-r border-gray-200">العميل</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase border-r border-gray-200">الخزنة</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase border-r border-gray-200">الطريقة</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase border-r border-gray-200">التاريخ</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase border-r border-gray-200">المبلغ</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase border-r border-gray-200">الملاحظات</th>
              <th className="w-40 px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">إجراءات</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {refunds.map((item, idx) => (
              <tr key={item.client_refunds_id || item.id || idx} className="hover:bg-gray-50 transition-all duration-150">
                <td className="text-center px-4 py-3 border-r border-gray-200">
                  <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-semibold">{idx + 1}</span>
                </td>
                <td className="px-4 py-3 text-gray-900 font-medium border-r border-gray-200">{item.client_name || item.clients_company_name || '-'}</td>
                <td className="px-4 py-3 text-gray-600 border-r border-gray-200">{item.safe_name || 'غير محدد'}</td>
                <td className="px-4 py-3 text-gray-600 border-r border-gray-200">{item.payment_method_name || item.method_name || '-'}</td>
                <td className="px-4 py-3 text-gray-600 border-r border-gray-200">{formatDate(item.client_refunds_date || item.refund_date)}</td>
                <td className="px-4 py-3 text-gray-600 border-r border-gray-200 font-semibold">{formatCurrency(item.client_refunds_amount || item.amount)}</td>
                <td className="px-4 py-3 text-gray-600 text-sm border-r border-gray-200">{item.client_refunds_notes || item.notes || 'لا توجد ملاحظات'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button title="عرض" onClick={() => onView(item)} className="p-2 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-gray-800"><EyeIcon className="h-5 w-5" /></button>
                    <button title="تعديل" onClick={() => onEdit(item)} className="p-2 rounded-md border border-gray-200 hover:bg-gray-50 text-indigo-600 hover:text-indigo-800"><PencilSquareIcon className="h-5 w-5" /></button>
                    <button title="حذف" onClick={() => onDelete(item)} className="p-2 rounded-md border border-gray-200 hover:bg-red-50 text-red-600 hover:text-red-800"><TrashIcon className="h-5 w-5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {refunds.length === 0 && <div className="text-center py-8 text-gray-500">لا توجد مرتجعات عملاء</div>}
      </div>
    </div>
  );
};

export default function ClientRefundsTab() {
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();

  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedSafe, setSelectedSafe] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');

  const [currentView, setCurrentView] = useState('list');
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [refundToDelete, setRefundToDelete] = useState(null);

  // Context data for forms/filters
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [safes, setSafes] = useState([]);
  const [clients, setClients] = useState([]);

  const loadRefunds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getClientRefunds({
        client_id: selectedClient || undefined,
        payment_method_id: selectedMethod || undefined,
        safe_id: selectedSafe || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      const list = res.client_refunds || res.data?.client_refunds || res.data || res || [];
      setRefunds(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e.message || 'Error loading client refunds');
      setGlobalMessage({ type: 'error', message: 'فشل في تحميل مرتجعات العملاء.' });
    } finally {
      setLoading(false);
    }
  }, [setGlobalMessage, selectedClient, selectedMethod, selectedSafe, dateFrom, dateTo]);

  const loadContext = useCallback(async () => {
    try {
      // Reuse existing apis to fetch options
      const { getPaymentMethods } = await import('../../../../../apis/payment_methods');
      const { getSafes } = await import('../../../../../apis/safes');
      const { getAllClients } = await import('../../../../../apis/clients');
      const [methodsRes, safesRes, clientsRes] = await Promise.allSettled([
        getPaymentMethods(),
        getSafes(),
        getAllClients(),
      ]);
      if (methodsRes.status === 'fulfilled') {
        setPaymentMethods(methodsRes.value.payment_methods || methodsRes.value || []);
      }
      if (safesRes.status === 'fulfilled') {
        setSafes(safesRes.value.safes || safesRes.value || []);
      }
      if (clientsRes.status === 'fulfilled') {
        setClients(clientsRes.value || []);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadRefunds();
    loadContext();
  }, [loadRefunds, loadContext]);

  useEffect(() => {
    setChildRefreshHandler(() => loadRefunds);
    return () => setChildRefreshHandler(null);
  }, [setChildRefreshHandler, loadRefunds]);

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return dateString || '-';
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '0.00';
    return parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const filtered = useMemo(() => {
    let list = refunds;
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter((i) =>
        (i.client_name || i.clients_company_name || '').toLowerCase().includes(term) ||
        (i.client_refunds_notes || i.notes || '').toLowerCase().includes(term) ||
        (i.payment_method_name || i.method_name || '').toLowerCase().includes(term)
      );
    }
    return list;
  }, [refunds, searchTerm]);

  const clearAll = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setSelectedClient('');
    setSelectedSafe('');
    setSelectedMethod('');
  };

  // Options
  const clientOptions = useMemo(() => (clients || []).map(c => ({ value: c.clients_id || c.id, label: c.clients_company_name || c.company_name || c.name })), [clients]);
  const safeOptions = useMemo(() => (safes || []).map(s => ({ value: s.safes_id, label: `${s.safes_name}` })), [safes]);
  const methodOptions = useMemo(() => (paymentMethods || []).map(m => ({ value: m.payment_methods_id || m.id, label: m.payment_methods_name || m.name })), [paymentMethods]);

  const handleAdd = () => setCurrentView('add');
  const handleEdit = (refund) => { setSelectedRefund(refund); setCurrentView('edit'); };
  const handleView = (refund) => { setSelectedRefund(refund); setCurrentView('details'); };
  const handleDelete = (refund) => { setRefundToDelete(refund); setDeleteModalOpen(true); };

  const confirmDelete = async () => {
    try {
      await deleteClientRefund(refundToDelete.client_refunds_id || refundToDelete.id);
      setGlobalMessage({ type: 'success', message: 'تم حذف المرتجع بنجاح.' });
      await loadRefunds();
    } catch {
      setGlobalMessage({ type: 'error', message: 'فشل في حذف المرتجع.' });
    } finally {
      setDeleteModalOpen(false);
      setRefundToDelete(null);
    }
  };

  const handleFormSubmit = async () => {
    setGlobalMessage({ type: 'success', message: 'تم حفظ المرتجع بنجاح.' });
    await loadRefunds();
    setCurrentView('list');
    setSelectedRefund(null);
  };

  const handleCloseModal = () => { setCurrentView('list'); setSelectedRefund(null); };

  const renderContent = () => {
    if (currentView === 'add') {
      return (
        <AddClientRefundForm onClose={handleCloseModal} onSubmit={handleFormSubmit} safes={safes} clients={clients} paymentMethods={paymentMethods} />
      );
    }
    if (currentView === 'edit') {
      return (
        <UpdateClientRefundForm onClose={handleCloseModal} onSubmit={handleFormSubmit} safes={safes} clients={clients} paymentMethods={paymentMethods} refund={selectedRefund} />
      );
    }
    if (currentView === 'details') {
      return (
        <ClientRefundDetailsModal onClose={handleCloseModal} refund={selectedRefund} clients={clients} safes={safes} paymentMethods={paymentMethods} />
      );
    }

    return (
      <>
        {/* Header Row */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
          <h3 className="text-2xl font-bold text-gray-800 flex-none">مرتجعات للعملاء (Refunds)</h3>
          <div className="relative flex-grow mx-4">
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="ابحث عن مرتجعات العملاء..." className="w-full pl-4 pr-10 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" dir="rtl" />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>
          <div className="flex-none">
            <button onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md shadow-md flex items-center gap-2">
              <PlusIcon className="h-5 w-5" />
              إضافة مرتجع عميل
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
            <FunnelIcon className="h-5 w-5 text-indigo-600" />
            خيارات التصفية
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Client Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">العميل</label>
              <SearchableSelect options={clientOptions} value={selectedClient} onChange={setSelectedClient} placeholder="جميع العملاء" className="w-full" />
            </div>

            {/* Safe Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الخزنة</label>
              <SearchableSelect options={safeOptions} value={selectedSafe} onChange={setSelectedSafe} placeholder="جميع الخزن" className="w-full" />
            </div>

            {/* Method Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">طريقة الدفع</label>
              <SearchableSelect options={methodOptions} value={selectedMethod} onChange={setSelectedMethod} placeholder="جميع الطرق" className="w-full" />
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الفترة</label>
              <DateRangePicker
                dateFrom={dateFrom}
                dateTo={dateTo}
                onChange={(from, to) => { setDateFrom(from); setDateTo(to); }}
                onClear={() => { setDateFrom(''); setDateTo(''); }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button onClick={loadRefunds} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700">تطبيق التصفية</button>
            <button onClick={clearAll} className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300">مسح الكل</button>
          </div>
        </div>

        <ClientRefundListView refunds={filtered} loading={loading} error={error} searchTerm={searchTerm} formatDate={formatDate} formatCurrency={formatCurrency} onEdit={handleEdit} onView={handleView} onDelete={handleDelete} />

        {/* Delete modal */}
        {deleteModalOpen && (
          <DeleteConfirmationModal
            isOpen={true}
            onClose={() => { setDeleteModalOpen(false); setRefundToDelete(null); }}
            onConfirm={confirmDelete}
            message={`هل أنت متأكد أنك تريد حذف هذا المرتجع؟`}
            itemName={`مرتجع عميل #${refundToDelete?.client_refunds_id || refundToDelete?.id || ''}`}
            deleteLoading={false}
          />
        )}
      </>
    );
  };

  return (
    <div className="p-4" dir="rtl">{renderContent()}</div>
  );
}
