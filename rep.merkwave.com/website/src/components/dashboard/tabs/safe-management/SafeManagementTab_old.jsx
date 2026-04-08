// src/components/dashboard/tabs/safe-management/SafeManagementTab.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  EyeIcon, 
  PencilIcon, 
  TrashIcon, 
  MagnifyingGlassIcon, 
  XMarkIcon, 
  FunnelIcon, 
  PlusIcon,
  ArchiveBoxIcon,
  BanknotesIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';

import Loader from '../../../common/Loader/Loader';
import Alert from '../../../common/Alert/Alert';
import DeleteConfirmationModal from '../../../common/DeleteConfirmationModal';
import { getSafes, deleteSafe } from '../../../../apis/safes';
import { PAYMENT_METHOD_ICONS, PAYMENT_METHOD_COLORS } from '../../../../constants/paymentMethods';
import AddSafeForm from './AddSafeForm';
import UpdateSafeForm from './UpdateSafeForm';
import SafeDetailsModal from './SafeDetailsModal';
import SafeTransactionsModal from './SafeTransactionsModal';
import AddSafeTransactionForm from './AddSafeTransactionForm';
import useCurrency from '../../../../hooks/useCurrency';

// Safe List View Component
const SafeListView = ({ 
  safes, 
  loading, 
  error, 
  searchTerm, 
  onEdit, 
  onDelete, 
  onViewDetails, 
  onViewTransactions,
  formatCurrency,
  symbol 
}) => {
  const filtered = safes.filter(safe =>
    safe.safes_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    safe.safes_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    safe.rep_user_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <Loader className="mt-8" />;
  if (error) return <Alert message={error} type="error" className="mb-4" />;

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200" dir="rtl">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                نوع الخزنة
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                اسم الخزنة
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                الوصف
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                الرصيد الحالي
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                مندوب المبيعات
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                طريقة الدفع
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                الحالة
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                تاريخ الإنشاء
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                الإجراءات
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filtered.map((safe) => (
              <tr key={safe.safes_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-900 font-medium border-r border-gray-200">
                  <div className="flex items-center gap-2">
                    {safe.safes_type === 'company' ? (
                      <div className="flex items-center gap-2">
                        <ArchiveBoxIcon className="h-5 w-5 text-purple-600" />
                        <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full">
                          خزنة الشركة
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <ArchiveBoxIcon className="h-5 w-5 text-blue-600" />
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                          خزنة مندوب
                        </span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-900 font-medium border-r border-gray-200">
                  <div className="flex items-center gap-2">
                    <ArchiveBoxIcon className="h-5 w-5 text-blue-600" />
                    {safe.safes_name}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 border-r border-gray-200">
                  {safe.safes_description || 'لا يوجد وصف'}
                </td>
                <td className="px-4 py-3 border-r border-gray-200">
                  <div className="flex items-center gap-2">
                    <BanknotesIcon className="h-4 w-4 text-green-600" />
                    <span className={`font-bold ${
                      parseFloat(safe.safes_balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(safe.safes_balance || 0)} {symbol}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 border-r border-gray-200">
                  {safe.rep_name || (safe.safes_type === 'company' ? 'الشركة الرئيسية' : 'غير محدد')}
                </td>
                <td className="px-4 py-3 border-r border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {PAYMENT_METHOD_ICONS[safe.payment_method_type] || '💳'}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      PAYMENT_METHOD_COLORS[safe.payment_method_type] || 'text-gray-600 bg-gray-100'
                    }`}>
                      {safe.payment_method_name || 'غير محدد'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 border-r border-gray-200">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    safe.safes_is_active === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {safe.safes_is_active === 1 ? 'نشط' : 'غير نشط'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 border-r border-gray-200">
                  {new Date(safe.safes_created_at).toLocaleDateString('en-GB')}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button 
                      onClick={() => onViewDetails(safe)} 
                      className="group p-1.5 text-blue-600 hover:text-white hover:bg-blue-600 rounded-full transition-all" 
                      title="عرض التفاصيل"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => onViewTransactions(safe)} 
                      className="group p-1.5 text-purple-600 hover:text-white hover:bg-purple-600 rounded-full transition-all" 
                      title="عرض المعاملات"
                    >
                      <ArrowRightIcon className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => onEdit(safe)} 
                      className="group p-1.5 text-green-600 hover:text-white hover:bg-green-600 rounded-full transition-all" 
                      title="تعديل"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => onDelete(safe)} 
                      className="group p-1.5 text-red-600 hover:text-white hover:bg-red-600 rounded-full transition-all" 
                      title="حذف"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            لا توجد خزائن
          </div>
        )}
      </div>
    </div>
  );
};

export default function SafeManagementTab() {
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();
  const { symbol } = useCurrency();
  const [safes, setSafes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  const [currentView, setCurrentView] = useState('list');
  const [selectedSafe, setSelectedSafe] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [safeToDelete, setSafeToDelete] = useState(null);

  const loadSafes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getSafes();
      setSafes(response.safes || []);
    } catch (e) {
      setError(e.message || 'Error loading safes');
      setGlobalMessage({ type: 'error', message: 'فشل في تحميل بيانات الخزائن.' });
    } finally {
      setLoading(false);
    }
  }, [setGlobalMessage]);

  useEffect(() => {
    loadSafes();
  }, [loadSafes]);

  useEffect(() => {
    setChildRefreshHandler(() => loadSafes);
    return () => setChildRefreshHandler(null);
  }, [setChildRefreshHandler, loadSafes]);

  const handleAddSafe = () => {
    setCurrentView('add');
  };

  const handleEditSafe = (safe) => {
    setSelectedSafe(safe);
    setCurrentView('edit');
  };

  const handleViewSafe = (safe) => {
    setSelectedSafe(safe);
    setCurrentView('details');
  };

  const handleViewTransactions = (safe) => {
    setSelectedSafe(safe);
    setCurrentView('transactions');
  };

  const handleDeleteSafe = (safe) => {
    setSafeToDelete(safe);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteSafe(safeToDelete.safes_id);
      setGlobalMessage({ type: 'success', message: 'تم حذف الخزنة بنجاح.' });
      await loadSafes();
    } catch {
      setGlobalMessage({ type: 'error', message: 'فشل في حذف الخزنة.' });
    } finally {
      setDeleteModalOpen(false);
      setSafeToDelete(null);
    }
  };

  const handleFormSubmit = async () => {
    setGlobalMessage({ type: 'success', message: 'تم حفظ بيانات الخزنة بنجاح.' });
    await loadSafes();
    setCurrentView('list');
    setSelectedSafe(null);
  };

  const handleCloseModal = () => {
    setCurrentView('list');
    setSelectedSafe(null);
  };

  const filteredSafes = useMemo(() => {
    let currentFiltered = safes;
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      currentFiltered = currentFiltered.filter(safe =>
        safe.safes_name?.toLowerCase().includes(term) ||
        safe.safes_description?.toLowerCase().includes(term) ||
        safe.rep_user_name?.toLowerCase().includes(term)
      );
    }
    if (selectedStatusFilter) {
      const isActive = selectedStatusFilter === 'active' ? 1 : 0;
      currentFiltered = currentFiltered.filter(safe => safe.safes_is_active === isActive);
    }
    return currentFiltered;
  }, [safes, searchTerm, selectedStatusFilter]);

  const formatCurrency = (amount) => {
    if (!amount) return '0.00';
    return parseFloat(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const calculateTotalBalance = () => {
    return filteredSafes.reduce((total, safe) => total + parseFloat(safe.safes_balance || 0), 0);
  };

  const renderContent = () => {
    if (currentView === 'add') {
      return (
        <AddSafeForm
          onClose={handleCloseModal}
          onSubmit={handleFormSubmit}
        />
      );
    }

    if (currentView === 'edit' && selectedSafe) {
      return (
        <UpdateSafeForm
          safe={selectedSafe}
          onClose={handleCloseModal}
          onSubmit={handleFormSubmit}
        />
      );
    }

    if (currentView === 'details' && selectedSafe) {
      return (
        <SafeDetailsModal
          safeId={selectedSafe.safes_id}
          onClose={handleCloseModal}
        />
      );
    }

    if (currentView === 'transactions' && selectedSafe) {
      return (
        <SafeTransactionsModal
          safeId={selectedSafe.safes_id}
          safeName={selectedSafe.safes_name}
          onClose={handleCloseModal}
        />
      );
    }

    return (
      <>
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
          <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ArchiveBoxIcon className="h-8 w-8 text-blue-600" />
            إدارة الخزائن
          </h3>
          <div className="relative flex-grow mx-4">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="ابحث عن خزنة..."
              className="w-full pl-4 pr-10 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              dir="rtl"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>
          <div className="flex-none">
            <button 
              onClick={handleAddSafe} 
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow-md flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              إضافة خزنة
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-r from-blue-100 to-blue-50 p-6 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">إجمالي الخزائن</p>
                <p className="text-2xl font-bold text-blue-800">{filteredSafes.length}</p>
              </div>
              <ArchiveBoxIcon className="h-12 w-12 text-blue-600" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-100 to-green-50 p-6 rounded-xl border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">الخزائن النشطة</p>
                <p className="text-2xl font-bold text-green-800">
                  {filteredSafes.filter(safe => safe.safes_is_active === 1).length}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">✓</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-100 to-orange-50 p-6 rounded-xl border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 text-sm font-medium">إجمالي الأرصدة</p>
                <p className="text-2xl font-bold text-orange-800">
                  {formatCurrency(calculateTotalBalance())} {symbol}
                </p>
              </div>
              <BanknotesIcon className="h-12 w-12 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
            <FunnelIcon className="h-5 w-5 text-blue-600" />
            خيارات التصفية
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">
                حالة الخزنة
              </label>
              <select
                id="statusFilter"
                value={selectedStatusFilter}
                onChange={e => setSelectedStatusFilter(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                dir="rtl"
              >
                <option value="">كل الحالات</option>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>
            </div>
          </div>
        </div>

        {/* Safes List */}
        {!loading && !error && (
          <SafeListView
            safes={filteredSafes}
            loading={loading}
            error={error}
            searchTerm={searchTerm}
            onEdit={handleEditSafe}
            onDelete={handleDeleteSafe}
            onViewDetails={handleViewSafe}
            onViewTransactions={handleViewTransactions}
            formatCurrency={formatCurrency}
            symbol={symbol}
          />
        )}

        {loading && <Loader className="mt-8" />}
        {error && <Alert message={error} type="error" className="mb-4" />}

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && (
          <DeleteConfirmationModal
            isOpen={deleteModalOpen}
            onClose={() => setDeleteModalOpen(false)}
            onConfirm={confirmDelete}
            title="حذف الخزنة"
            message={`هل أنت متأكد من حذف خزنة "${safeToDelete?.safes_name}"؟ سيتم حذف جميع المعاملات المرتبطة بها.`}
          />
        )}
      </>
    );
  };

  return (
    <div className="p-6" dir="rtl">
      {renderContent()}
    </div>
  );
}
