import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  HashtagIcon,
  IdentificationIcon,
  TagIcon,
  ArrowsUpDownIcon,
} from '@heroicons/react/24/outline';

import Loader from '../../../common/Loader/Loader';
import DeleteConfirmationModal from '../../../common/DeleteConfirmationModal';
import CustomPageHeader from '../../../common/CustomPageHeader/CustomPageHeader';
import GlobalTable from '../../../common/GlobalTable/GlobalTable';
import FilterBar from '../../../common/FilterBar/FilterBar';
import accountsApi from '../../../../apis/accounts.js';
import AddAccountForm from './AddAccountForm';
import UpdateAccountForm from './UpdateAccountForm';

export default function AccountsTab() {
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState('list');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await accountsApi.getAll();
      if (response.status === 'success') {
        // The backend returns the array in response.data
        setAccounts(response.data || []);
      } else {
        throw new Error(response.message || 'فشل في تحميل الحسابات');
      }
    } catch (e) {
      setError(e.message || 'Error loading accounts');
      setGlobalMessage({ type: 'error', message: e.message || 'فشل في تحميل بيانات الحسابات.' });
    } finally {
      setLoading(false);
    }
  }, [setGlobalMessage]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    setChildRefreshHandler(() => loadAccounts);
    return () => setChildRefreshHandler(null);
  }, [setChildRefreshHandler, loadAccounts]);

  const handleAddAccount = useCallback(() => {
    setCurrentView('add');
  }, []);

  const handleEditAccount = useCallback((account) => {
    setSelectedAccount(account);
    setCurrentView('edit');
  }, []);

  const handleDeleteAccount = useCallback((account) => {
    setAccountToDelete(account);
    setDeleteModalOpen(true);
  }, []);

  const confirmDelete = async () => {
    try {
      await accountsApi.delete(accountToDelete.id);
      setGlobalMessage({ type: 'success', message: 'تم حذف الحساب بنجاح.' });
      await loadAccounts();
    } catch {
      setGlobalMessage({ type: 'error', message: 'فشل في حذف الحساب.' });
    } finally {
      setDeleteModalOpen(false);
      setAccountToDelete(null);
    }
  };

  const handleFormSubmit = async () => {
    await loadAccounts();
    setCurrentView('list');
    setSelectedAccount(null);
  };

  const handleCloseModal = () => {
    setCurrentView('list');
    setSelectedAccount(null);
  };

  const applySearch = useCallback((value) => {
    const normalized = (value ?? searchInput ?? '').trim();
    setSearchTerm(normalized);
    setSearchInput(value ?? '');
  }, [searchInput]);

  const clearSearch = useCallback(() => {
    setSearchInput('');
    setSearchTerm('');
  }, []);

  const typeOptions = useMemo(() => ([
    { value: 'all', label: 'كل الأنواع' },
    { value: 'مصروفات', label: 'مصروفات' },
    { value: 'مصروفات ادارية', label: 'مصروفات ادارية' },
    { value: 'إيرادات', label: 'إيرادات' },
  ]), []);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      const matchesSearch = searchTerm
        ? [
            account.name,
            account.code,
            account.type,
          ]
            .filter(Boolean)
            .some((field) => field.toString().toLowerCase().includes(searchTerm.toLowerCase()))
        : true;

      const matchesType = typeFilter === 'all' ? true : account.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [accounts, searchTerm, typeFilter]);

  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (searchTerm) {
      chips.push({ key: 'search', label: 'البحث', value: searchTerm, tone: 'blue', onRemove: clearSearch });
    }
    if (typeFilter !== 'all') {
      chips.push({
        key: 'type',
        label: 'النوع',
        value: typeOptions.find((opt) => opt.value === typeFilter)?.label ?? typeFilter,
        tone: 'purple',
        onRemove: () => setTypeFilter('all'),
      });
    }
    return chips;
  }, [searchTerm, typeFilter, typeOptions, clearSearch]);

  const columns = useMemo(() => [
    {
      key: 'code',
      title: 'الكود',
      sortable: true,
      render: (account) => (
        <div className="flex items-center gap-2">
          <HashtagIcon className="w-4 h-4 text-gray-400" />
          <span className="font-mono font-medium text-gray-900">{account.code}</span>
        </div>
      ),
    },
    {
      key: 'name',
      title: 'اسم الحساب',
      sortable: true,
      render: (account) => (
        <div className="flex items-center gap-2">
          <IdentificationIcon className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-gray-900">{account.name}</span>
        </div>
      ),
    },
    {
      key: 'type',
      title: 'النوع',
      sortable: true,
      render: (account) => (
        <div className="flex items-center gap-2">
          <TagIcon className="w-4 h-4 text-gray-400" />
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
            {account.type}
          </span>
        </div>
      ),
    },
    {
      key: 'sortid',
      title: 'الترتيب',
      sortable: true,
      render: (account) => (
        <div className="flex items-center gap-2">
          <ArrowsUpDownIcon className="w-4 h-4 text-gray-400" />
          <span>{account.sortid}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'الإجراءات',
      align: 'center',
      render: (account) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => handleEditAccount(account)}
            className="p-1.5 text-blue-600 transition-colors rounded-full hover:bg-blue-50"
            title="تعديل"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleDeleteAccount(account)}
            className="p-1.5 text-red-600 transition-colors rounded-full hover:bg-red-50"
            title="حذف"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      ),
    },
  ], [handleEditAccount, handleDeleteAccount]);

  if (loading && accounts.length === 0) return <Loader />;

  return (
    <div className="p-6" dir="rtl">
      <CustomPageHeader
        title="إدارة الحسابات"
        subtitle="إضافة وتعديل الحسابات المالية للنظام"
        icon={<IdentificationIcon className="w-8 h-8 text-white" />}
        statValue={accounts.length}
        statLabel="إجمالي الحسابات"
        actionButton={(
          <button
            onClick={handleAddAccount}
            className="flex items-center px-4 py-2 text-sm font-bold text-blue-600 bg-white rounded-lg shadow-sm hover:bg-blue-50 transition-colors"
          >
            <PlusIcon className="w-5 h-5 ml-2" />
            إضافة حساب جديد
          </button>
        )}
      />

      <FilterBar
        title="بحث وفلاتر الحسابات"
        searchConfig={{
          placeholder: 'ابحث عن حساب... ',
          value: searchInput,
          onChange: (value) => { setSearchInput(value); applySearch(value); },
          onClear: clearSearch,
          searchWhileTyping: true,
          showApplyButton: false,
        }}
        selectFilters={[
          { key: 'type', label: 'النوع', value: typeFilter, onChange: setTypeFilter, options: typeOptions },
        ]}
        activeChips={activeFilterChips}
        onClearAll={() => {
          clearSearch();
          setTypeFilter('all');
        }}
      />

      {error ? (
        <div className="p-4 text-red-700 bg-red-100 border border-red-200 rounded-lg">
          {error}
        </div>
      ) : (
        <GlobalTable
          data={filteredAccounts}
          rowKey="id"
          columns={columns}
          loading={loading}
          totalCount={filteredAccounts.length}
          searchTerm={searchTerm}
          emptyState={{
            title: 'لا توجد حسابات مطابقة للبحث',
            description: 'جرب تغيير الفلاتر أو أعد المحاولة لاحقًا'
          }}
        />
      )}

      {currentView === 'add' && (
        <AddAccountForm
          onClose={handleCloseModal}
          onSubmit={handleFormSubmit}
        />
      )}

      {currentView === 'edit' && selectedAccount && (
        <UpdateAccountForm
          account={selectedAccount}
          onClose={handleCloseModal}
          onSubmit={handleFormSubmit}
        />
      )}

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="حذف الحساب"
        message={`هل أنت متأكد من حذف الحساب "${accountToDelete?.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
      />
    </div>
  );
}
