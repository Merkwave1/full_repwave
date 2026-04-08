// src/components/dashboard/tabs/safe-management/safe-transactions/SafeTransactionsModal.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  XMarkIcon,
  ArrowRightIcon,
  BanknotesIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import Loader from '../../../../common/Loader/Loader';
import FilterBar from '../../../../common/FilterBar/FilterBar';
import GlobalTable from '../../../../common/GlobalTable/GlobalTable';
import PaginationHeaderFooter from '../../../../common/PaginationHeaderFooter/PaginationHeaderFooter';
import useCurrency from '../../../../../hooks/useCurrency';
import { formatLocalDate, formatLocalDateTime } from '../../../../../utils/dateUtils';
import { getSafeTransactionsPaginated } from '../../../../../apis/safe_transactions';
import { getPaymentMethodIcon, getPaymentMethodColor } from '../../../../../constants/paymentMethods';
import TransactionDetailsModal from './TransactionDetailsModal';

const SafeTransactionsModal = ({ safeId, safeName, onClose }) => {
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [serverPagination, setServerPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedTransactionId, setSelectedTransactionId] = useState(null);
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
  const { formatCurrency: formatMoney } = useCurrency();

  useEffect(() => {
    if (safeId) {
      fetchTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeId, page, limit]);

  // Reset to first page when switching safes
  useEffect(() => {
    setPage(1);
  }, [safeId]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, pagination } = await getSafeTransactionsPaginated({ safeId, page, limit });
      setTransactions(data || []);
      setServerPagination(pagination || null);
    } catch (error) {
      console.error('Error fetching safe transactions:', error);
      setError(error.message || 'حدث خطأ أثناء جلب معاملات الخزنة');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (transactionId) => {
    setSelectedTransactionId(transactionId);
    setShowTransactionDetails(true);
  };

  const getTransactionTypeDisplay = (type) => {
    const types = {
      'deposit': 'إيداع',
      'withdrawal': 'سحب',
      'transfer_in': 'تحويل وارد',
      'transfer_out': 'تحويل صادر',
      'payment': 'دفعة',
      'receipt': 'إيصال',
      'supplier_payment': 'دفعة مورد',
      'purchase': 'مشتريات',
      'sale': 'مبيعات',
      'expense': 'مصروف',
      'other': 'أخرى'
    };
    return types[type] || type;
  };

  const getTransactionIcon = (type, amount) => {
    const isOutgoing = isOutgoingTransaction(type, amount);
    if (isOutgoing) {
      return <ArrowUpIcon className="h-4 w-4 text-red-600" />;
    } else {
      return <ArrowDownIcon className="h-4 w-4 text-green-600" />;
    }
  };

  const isOutgoingTransaction = (type, amount) => {
    // Treat payments as outgoing as well so a "payment" subtracts from the safe balance
    const outgoingTypes = ['expense', 'withdrawal', 'transfer_out', 'supplier_payment', 'payment'];
    return outgoingTypes.includes(type) || parseFloat(amount) < 0;
  };

  const formatTransactionAmount = (transaction) => {
    const amount = parseFloat(transaction.safe_transactions_amount);
    const type = transaction.safe_transactions_type;
    const isOutgoing = isOutgoingTransaction(type, amount);
    
    if (isOutgoing) {
      return {
        color: 'text-red-600',
        sign: '-',
        value: Math.abs(amount)
      };
    } else {
      return {
        color: 'text-green-600', 
        sign: '+',
        value: Math.abs(amount)
      };
    }
  };

  const formatTransactionDate = (value) => {
    const formatted = formatLocalDateTime(value);
    return formatted === '-' ? '—' : formatted;
  };

  const statusDisplayMap = {
    approved: {
      label: 'موافق عليه',
      className: 'bg-green-100 text-green-800',
    },
    pending: {
      label: 'قيد المراجعة',
      className: 'bg-yellow-100 text-yellow-800',
    },
    rejected: {
      label: 'مرفوضة',
      className: 'bg-red-100 text-red-800',
    },
    default: {
      label: 'غير معروف',
      className: 'bg-gray-100 text-gray-700',
    },
  };

  const getStatusDisplay = (status) => statusDisplayMap[status] || statusDisplayMap.default;

  const filteredTransactions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const hasSearch = Boolean(normalizedSearch);

    return (transactions || []).filter((transaction) => {
      const fieldsForSearch = [
        transaction.safe_transactions_description,
        transaction.safe_transactions_reference,
        getTransactionTypeDisplay(transaction.safe_transactions_type),
        transaction.safe_transactions_id,
      ].filter(Boolean);

      const matchesSearch = !hasSearch
        || fieldsForSearch.some((field) => field.toString().toLowerCase().includes(normalizedSearch));

      const isOutgoing = isOutgoingTransaction(
        transaction.safe_transactions_type,
        transaction.safe_transactions_amount,
      );

      let matchesType = true;
      if (typeFilter === '__incoming__') {
        matchesType = !isOutgoing;
      } else if (typeFilter === '__outgoing__') {
        matchesType = isOutgoing;
      } else if (typeFilter) {
        matchesType = transaction.safe_transactions_type === typeFilter;
      }

      const matchesStatus = !statusFilter
        || (transaction.safe_transactions_status || 'approved') === statusFilter;

      let matchesDate = true;
      if ((dateFrom || dateTo) && transaction.safe_transactions_date) {
        const transactionDate = new Date(transaction.safe_transactions_date);
        const transactionTimestamp = transactionDate.getTime();

        if (!Number.isNaN(transactionTimestamp)) {
          if (dateFrom) {
            const fromTs = new Date(`${dateFrom}T00:00:00`).getTime();
            if (!Number.isNaN(fromTs) && transactionTimestamp < fromTs) {
              matchesDate = false;
            }
          }
          if (matchesDate && dateTo) {
            const toTs = new Date(`${dateTo}T23:59:59`).getTime();
            if (!Number.isNaN(toTs) && transactionTimestamp > toTs) {
              matchesDate = false;
            }
          }
        }
      }

      return matchesSearch && matchesType && matchesStatus && matchesDate;
    });
  }, [transactions, searchTerm, typeFilter, statusFilter, dateFrom, dateTo]);

  const summary = useMemo(() => {
    const totals = filteredTransactions.reduce((acc, transaction) => {
      const amount = Number.parseFloat(transaction.safe_transactions_amount || 0) || 0;
      const type = transaction.safe_transactions_type;
      const status = transaction.safe_transactions_status || 'approved';
      const outgoing = isOutgoingTransaction(type, amount);

      if (status === 'pending') {
        if (outgoing) {
          acc.pendingOut += Math.abs(amount);
        } else {
          acc.pendingIn += Math.abs(amount);
        }
      } else {
        if (outgoing) {
          acc.totalOut += Math.abs(amount);
        } else {
          acc.totalIn += Math.abs(amount);
        }
      }

      return acc;
    }, {
      totalIn: 0,
      totalOut: 0,
      pendingIn: 0,
      pendingOut: 0,
    });

    return {
      ...totals,
      netChange: totals.totalIn - totals.totalOut,
      pendingNetChange: totals.pendingIn - totals.pendingOut,
    };
  }, [filteredTransactions]);

  const currentPage = Number(serverPagination?.page ?? page);
  const itemsPerPage = Number(serverPagination?.per_page ?? limit) || 10;
  const totalItems = Number(serverPagination?.total ?? transactions.length);
  const totalPages = Math.max(1, Number(serverPagination?.total_pages ?? (itemsPerPage ? Math.ceil(totalItems / itemsPerPage) : 1)));
  const baseIndex = (currentPage - 1) * itemsPerPage;

  const transactionTypeOptions = useMemo(() => ([
    { value: '', label: 'كل الأنواع' },
    { value: '__incoming__', label: 'كل المعاملات الواردة' },
    { value: '__outgoing__', label: 'كل المعاملات الصادرة' },
    { value: 'deposit', label: 'إيداع' },
    { value: 'withdrawal', label: 'سحب' },
    { value: 'expense', label: 'مصروف' },
    { value: 'transfer_in', label: 'تحويل وارد' },
    { value: 'transfer_out', label: 'تحويل صادر' },
    { value: 'supplier_payment', label: 'دفعة مورد' },
    { value: 'payment', label: 'دفعة' },
    { value: 'receipt', label: 'إيصال' },
    { value: 'other', label: 'أخرى' },
  ]), []);

  const statusOptions = useMemo(() => ([
    { value: '', label: 'كل الحالات' },
    { value: 'approved', label: 'موافق عليه' },
    { value: 'pending', label: 'قيد المراجعة' },
    { value: 'rejected', label: 'مرفوضة' },
  ]), []);

  const typeLabelMap = useMemo(() => transactionTypeOptions.reduce((acc, option) => {
    if (option.value) {
      acc[option.value] = option.label;
    }
    return acc;
  }, {}), [transactionTypeOptions]);

  const statusLabelMap = useMemo(() => statusOptions.reduce((acc, option) => {
    if (option.value) {
      acc[option.value] = option.label;
    }
    return acc;
  }, {}), [statusOptions]);

  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
    setPage(1);
  }, []);

  const handleTypeFilterChange = useCallback((value) => {
    setTypeFilter(value || '');
    setPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((value) => {
    setStatusFilter(value || '');
    setPage(1);
  }, []);

  const handleDateRangeChange = useCallback((from, to) => {
    setDateFrom(from || '');
    setDateTo(to || '');
    setPage(1);
  }, []);

  const clearDateRange = useCallback(() => {
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearchTerm('');
    setTypeFilter('');
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }, []);

  const handleItemsPerPageChange = useCallback((value) => {
    setLimit(value);
    setPage(1);
  }, []);

  const handleNavigateStart = useCallback(() => {
    setLoading(true);
  }, []);

  const handleFirstPage = useCallback(() => {
    setPage(1);
  }, []);

  const handlePrevPage = useCallback(() => {
    setPage((prev) => Math.max(1, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setPage((prev) => Math.min(totalPages, prev + 1));
  }, [totalPages]);

  const handleLastPage = useCallback(() => {
    setPage(totalPages);
  }, [totalPages]);

  const activeFilterChips = useMemo(() => {
    const chips = [];

    if (searchTerm.trim()) {
      chips.push({
        key: 'search',
        label: 'بحث',
        value: searchTerm.trim(),
        tone: 'blue',
        onRemove: () => {
          setSearchTerm('');
          setPage(1);
        },
      });
    }

    if (typeFilter) {
      chips.push({
        key: 'type',
        label: 'نوع المعاملة',
        value: typeLabelMap[typeFilter] || typeFilter,
        tone: 'purple',
        onRemove: () => {
          setTypeFilter('');
          setPage(1);
        },
      });
    }

    if (statusFilter) {
      chips.push({
        key: 'status',
        label: 'حالة المعاملة',
        value: statusLabelMap[statusFilter] || statusFilter,
        tone: 'indigo',
        onRemove: () => {
          setStatusFilter('');
          setPage(1);
        },
      });
    }

    if (dateFrom || dateTo) {
      const fromLabel = dateFrom ? formatLocalDate(dateFrom) : 'من البداية';
      const toLabel = dateTo ? formatLocalDate(dateTo) : 'حتى الآن';
      chips.push({
        key: 'date',
        label: 'النطاق الزمني',
        value: `${fromLabel} - ${toLabel}`,
        tone: 'orange',
        onRemove: clearDateRange,
      });
    }

    return chips;
  }, [searchTerm, typeFilter, statusFilter, dateFrom, dateTo, typeLabelMap, statusLabelMap, clearDateRange]);

  const hasActiveFilters = activeFilterChips.length > 0;

  const columns = [
    {
      key: 'sequence',
      title: '#',
      align: 'center',
      headerAlign: 'center',
      className: 'w-8 text-center',
      render: (_row, index) => (
        <span className="text-sm font-semibold text-gray-700">{baseIndex + index + 1}</span>
      ),
    },
    {
      key: 'date',
      title: 'التاريخ',
      sortable: true,
      sortAccessor: (row) => {
        const timestamp = new Date(row.safe_transactions_date).getTime();
        return Number.isNaN(timestamp) ? 0 : timestamp;
      },
      className: 'z',
      render: (row) => (
        <div className="flex items-center gap-2 text-gray-700">
          <div className="flex items-center justify-center h-9 w-9 rounded-full bg-gray-100">
            <CalendarIcon className="h-4 w-4 text-gray-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">{formatTransactionDate(row.safe_transactions_date)}</span>
           
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      title: 'نوع المعاملة',
      sortable: true,
      sortAccessor: (row) => getTransactionTypeDisplay(row.safe_transactions_type),
      className: 'z',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-full bg-gray-100">
            {getTransactionIcon(row.safe_transactions_type, row.safe_transactions_amount)}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900">
              {getTransactionTypeDisplay(row.safe_transactions_type)}
            </span>
            <span className="text-xs text-gray-400">#{row.safe_transactions_id}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'الحالة',
      align: 'center',
      headerAlign: 'center',
      className: 'w-36',
      sortable: true,
      sortAccessor: (row) => row.safe_transactions_status || 'approved',
      render: (row) => {
        const { label, className } = getStatusDisplay(row.safe_transactions_status);
        return (
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${className}`}>
            {label}
          </span>
        );
      },
    },
    {
      key: 'payment_method',
      title: 'طريقة الدفع',
      className: 'z',
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className={`text-lg p-1 rounded ${getPaymentMethodColor(row.payment_method_type || 'cash')}`}>
            {getPaymentMethodIcon(row.payment_method_type || 'cash')}
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900">
              {row.payment_method_name || 'نقدي'}
            </span>
            {row.payment_method_reference && (
              <span className="text-xs text-gray-500">{row.payment_method_reference}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'amount',
      title: 'المبلغ',
      align: 'center',
      headerAlign: 'center',
      className: 'w-32',
      sortable: true,
      sortAccessor: (row) => Number(row.safe_transactions_amount) || 0,
      render: (row) => {
        const amountData = formatTransactionAmount(row);
        return (
          <span className={`text-sm font-semibold ${amountData.color}`}>
            {amountData.sign}{formatMoney(amountData.value)}
          </span>
        );
      },
    },
    {
      key: 'balance_after',
      title: 'الرصيد بعد المعاملة',
      align: 'center',
      headerAlign: 'center',
      className: 'w-40',
      sortable: true,
      sortAccessor: (row) => Number(row.safe_transactions_balance_after) || 0,
      render: (row) => (
        <span className="text-sm font-semibold text-gray-900">
          {formatMoney(row.safe_transactions_balance_after)}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'الإجراءات',
      align: 'center',
      headerAlign: 'center',
      className: 'w-32',
      render: (row) => (
        <button
          type="button"
          onClick={() => handleViewDetails(row.safe_transactions_id)}
          className="text-indigo-600 hover:text-indigo-900 text-sm font-semibold"
        >
          عرض التفاصيل
        </button>
      ),
    },
  ];

  const modalContent = (() => {
    if (loading) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-xl shadow-xl p-6">
            <Loader />
            <p className="text-center mt-4 text-gray-600">جاري تحميل معاملات الخزنة...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" onClick={onClose}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <XMarkIcon className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">خطأ في تحميل البيانات</h3>
                <p className="text-sm text-gray-500 mb-4">{error}</p>
                <button
                  onClick={onClose}
                  className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden mx-4" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-100 to-indigo-100 px-6 py-4 border-b border-gray-300">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <ArrowRightIcon className="h-6 w-6 text-purple-600" />
              معاملات خزنة: {safeName}
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-all"
            >
              <XMarkIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]" dir="rtl">
          <div className="p-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-r from-green-100 to-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-600 text-sm font-medium">إجمالي الوارد</p>
                    <p className="text-xl font-bold text-green-800">+{formatMoney(summary.totalIn)}</p>
                    {summary.pendingIn > 0 && (
                      <p className="text-xs text-green-600 mt-1">معلق: +{formatMoney(summary.pendingIn)}</p>
                    )}
                  </div>
                  <ArrowDownIcon className="h-8 w-8 text-green-600" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-red-100 to-red-50 p-4 rounded-lg border border-red-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-600 text-sm font-medium">إجمالي الصادر</p>
                    <p className="text-xl font-bold text-red-800">-{formatMoney(summary.totalOut)}</p>
                    {summary.pendingOut > 0 && (
                      <p className="text-xs text-red-600 mt-1">معلق: -{formatMoney(summary.pendingOut)}</p>
                    )}
                  </div>
                  <ArrowUpIcon className="h-8 w-8 text-red-600" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-100 to-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-600 text-sm font-medium">صافي التغيير</p>
                    <p className={`text-xl font-bold ${summary.netChange >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                      {formatMoney(Math.abs(summary.netChange))}
                    </p>
                    {(summary.pendingIn > 0 || summary.pendingOut > 0) && (
                      <p className="text-xs text-blue-600 mt-1">
                        معلق: {formatMoney(Math.abs(summary.pendingNetChange))}
                      </p>
                    )}
                  </div>
                  <BanknotesIcon className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </div>

            <FilterBar
              title="البحث والفلاتر"
              searchConfig={{
                value: searchTerm,
                onChange: handleSearchChange,
                onClear: () => handleSearchChange(''),
                placeholder: 'ابحث بالوصف أو المرجع أو نوع المعاملة',
                searchWhileTyping: true,
              }}
              dateRangeConfig={{
                from: dateFrom,
                to: dateTo,
                onChange: handleDateRangeChange,
                onClear: clearDateRange,
                placeholder: 'حدد نطاق التاريخ',
              }}
              selectFilters={[
                {
                  key: 'type',
                  value: typeFilter,
                  onChange: handleTypeFilterChange,
                  options: transactionTypeOptions,
                  placeholder: 'نوع المعاملة',
                },
                {
                  key: 'status',
                  value: statusFilter,
                  onChange: handleStatusFilterChange,
                  options: statusOptions,
                  placeholder: 'حالة المعاملة',
                },
              ]}
              activeChips={activeFilterChips}
              onClearAll={hasActiveFilters ? clearAllFilters : null}
            />

            <PaginationHeaderFooter
              total={totalItems}
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={handleItemsPerPageChange}
              onFirst={handleFirstPage}
              onPrev={handlePrevPage}
              onNext={handleNextPage}
              onLast={handleLastPage}
              loading={loading}
              onNavigateStart={handleNavigateStart}
              transparent
            />

            <GlobalTable
              data={filteredTransactions}
              columns={columns}
              rowKey="safe_transactions_id"
              loading={loading}
              searchTerm={searchTerm}
              totalCount={filteredTransactions.length}
              initialSort={{ key: 'date', direction: 'desc' }}
              emptyState={{
                icon: '💸',
                title: 'لا توجد معاملات مطابقة',
                description: 'جرب تعديل الفلاتر لعرض نتائج أخرى.',
              }}
            />

            <PaginationHeaderFooter
              total={totalItems}
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={handleItemsPerPageChange}
              onFirst={handleFirstPage}
              onPrev={handlePrevPage}
              onNext={handleNextPage}
              onLast={handleLastPage}
              loading={loading}
              onNavigateStart={handleNavigateStart}
            />

            <div className="bg-gray-50 p-4 rounded-lg text-center text-sm text-gray-600">
              عرض {filteredTransactions.length} من أصل {totalItems} معاملة في هذه الصفحة
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {showTransactionDetails && selectedTransactionId && (
        <TransactionDetailsModal
          transactionId={selectedTransactionId}
          onClose={() => {
            setShowTransactionDetails(false);
            setSelectedTransactionId(null);
          }}
          onStatusUpdate={fetchTransactions}
        />
      )}
    </div>
    );
  })();

  return createPortal(modalContent, document.body);
};

export default SafeTransactionsModal;
