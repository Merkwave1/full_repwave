// src/components/dashboard/tabs/reports/integration/components/TransactionsTab.jsx
// Unified component for displaying all financial transaction sync logs
// Combines payments (customer payments) and safe transfers (internal transfers)
// All synced to Odoo as journal entries (account.move/account.payment)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CheckCircleIcon, XCircleIcon, BanknotesIcon, ArrowsRightLeftIcon, ReceiptRefundIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { getTransactionSyncLogs } from '../../../../../../apis/odoo';
import FilterBar from '../../../../../common/FilterBar/FilterBar.jsx';
import GlobalTable from '../../../../../common/GlobalTable/GlobalTable.jsx';
import PaginationHeaderFooter from '../../../../../common/PaginationHeaderFooter/PaginationHeaderFooter.jsx';
import { formatCurrency } from '../../../../../../utils/currency';

function TransactionsTab() {
  // Data state
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [perPage, setPerPage] = useState(10);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getTransactionSyncLogs({
        page: currentPage,
        perPage,
        status: statusFilter,
        type: typeFilter,
        searchTerm,
        dateFrom: dateRange.from,
        dateTo: dateRange.to
      });

      setLogs(result.logs || []);
      setTotalPages(result.pagination?.total_pages || 1);
      setTotalItems(result.pagination?.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to fetch transaction sync logs');
    } finally {
      setLoading(false);
    }
  }, [currentPage, perPage, statusFilter, typeFilter, searchTerm, dateRange]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // FilterBar configuration
  const searchConfig = useMemo(() => ({
    value: searchTerm,
    onChange: setSearchTerm,
    placeholder: 'بحث بالمعرف أو الاسم...'
  }), [searchTerm]);

  const selectFilters = useMemo(() => [
    {
      value: typeFilter,
      onChange: setTypeFilter,
      placeholder: 'جميع الأنواع',
      options: [
        { value: 'all', label: 'جميع الأنواع' },
        { value: 'payment', label: 'تحصيلات' },
        { value: 'refund', label: 'مرتجعات' },
        { value: 'expense', label: 'مصروفات' },
        { value: 'transfer', label: 'تحويلات الخزنة' }
      ]
    },
    {
      value: statusFilter,
      onChange: setStatusFilter,
      placeholder: 'جميع الحالات',
      options: [
        { value: 'all', label: 'جميع الحالات' },
        { value: 'success', label: 'نجح' },
        { value: 'failed', label: 'فشل' }
      ]
    }
  ], [typeFilter, statusFilter]);

  const dateRangeConfig = useMemo(() => ({
    value: dateRange,
    onChange: setDateRange,
    fromPlaceholder: 'من تاريخ',
    toPlaceholder: 'إلى تاريخ'
  }), [dateRange]);

  // Table columns - using 'title' property for GlobalTable compatibility
  const columns = useMemo(() => [
    {
      key: 'row_num',
      title: '#',
      render: (row, index) => (currentPage - 1) * perPage + index + 1
    },
    {
      key: 'transaction_type',
      title: 'النوع',
      render: (row) => {
        const typeConfig = {
          payment: { bg: 'bg-green-100', text: 'text-green-800', icon: BanknotesIcon, label: 'تحصيل' },
          refund: { bg: 'bg-red-100', text: 'text-red-800', icon: ReceiptRefundIcon, label: 'مرتجع' },
          expense: { bg: 'bg-orange-100', text: 'text-orange-800', icon: CurrencyDollarIcon, label: 'مصروف' },
          transfer: { bg: 'bg-blue-100', text: 'text-blue-800', icon: ArrowsRightLeftIcon, label: 'تحويل' }
        };
        const config = typeConfig[row.transaction_type] || typeConfig.payment;
        const Icon = config.icon;
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
            <Icon className="w-3.5 h-3.5" />
            {config.label}
          </span>
        );
      }
    },
    {
      key: 'php_id',
      title: 'معرف المعاملة',
      render: (row) => (
        <span className="font-mono text-gray-900">{row.php_id || '-'}</span>
      )
    },
    {
      key: 'odoo_id',
      title: 'Odoo ID',
      render: (row) => (
        <span className="font-mono text-purple-600 font-semibold">
          {row.odoo_id || '-'}
        </span>
      )
    },
    {
      key: 'entity_name',
      title: 'الطرف / الخزنة',
      render: (row) => (
        <span className="text-gray-900 text-sm">{row.entity_name || '-'}</span>
      )
    },
    {
      key: 'amount',
      title: 'المبلغ',
      render: (row) => (
        <span className="font-mono text-emerald-600 font-semibold">
          {row.amount ? formatCurrency(row.amount) : '-'}
        </span>
      )
    },
    {
      key: 'sync_action',
      title: 'الإجراء',
      render: (row) => (
        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
          row.sync_action === 'create' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {row.sync_action === 'create' ? 'إنشاء' : 'تحديث'}
        </span>
      )
    },
    {
      key: 'sync_status',
      title: 'الحالة',
      render: (row) => (
        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
          row.sync_status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {row.sync_status === 'success' ? (
            <><CheckCircleIcon className="w-3 h-3" /> نجح</>
          ) : (
            <><XCircleIcon className="w-3 h-3" /> فشل</>
          )}
        </span>
      )
    },
    {
      key: 'synced_at',
      title: 'تاريخ المزامنة',
      render: (row) => row.synced_at ? new Date(row.synced_at).toLocaleString('en-GB') : '-'
    },
    {
      key: 'error_message',
      title: 'الخطأ',
      render: (row) => (
        <span className="text-red-600 max-w-xs truncate block text-sm" title={row.error_message}>
          {row.error_message || '-'}
        </span>
      )
    }
  ], [currentPage, perPage]);

  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePerPageChange = (newPerPage) => {
    setPerPage(newPerPage);
    setCurrentPage(1);
  };

  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        <XCircleIcon className="w-8 h-8 mx-auto mb-2" />
        <p>{error}</p>
        <button
          onClick={fetchLogs}
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <FilterBar
        searchConfig={searchConfig}
        selectFilters={selectFilters}
        dateRangeConfig={dateRangeConfig}
      />

      {/* Pagination Header */}
      <PaginationHeaderFooter
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        perPage={perPage}
        onPageChange={handlePageChange}
        onPerPageChange={handlePerPageChange}
        position="header"
      />

      {/* Table */}
      <GlobalTable
        columns={columns}
        data={logs}
        loading={loading}
        emptyState={{
          icon: '💳',
          title: 'لا توجد سجلات مزامنة',
          description: 'لم يتم العثور على سجلات مزامنة المعاملات المالية مع Odoo'
        }}
      />

      {/* Pagination Footer */}
      <PaginationHeaderFooter
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        perPage={perPage}
        onPageChange={handlePageChange}
        onPerPageChange={handlePerPageChange}
        position="footer"
      />
    </div>
  );
}

export default TransactionsTab;
