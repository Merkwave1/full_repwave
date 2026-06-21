import React, { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import GlobalTable from '../../../../../common/GlobalTable/GlobalTable.jsx';
import FilterBar from '../../../../../common/FilterBar/FilterBar.jsx';
import PaginationHeaderFooter from '../../../../../common/PaginationHeaderFooter/PaginationHeaderFooter.jsx';
import { getOdooSyncLogs } from '../../../../../../apis/odoo.js';

const ContactsTab = ({ onStatsUpdate }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  const [stats, setStats] = useState({
    total: 0,
    successful: 0,
    failed: 0,
    success_rate: 0
  });

  useEffect(() => {
    fetchLogs();
  }, [page, perPage, status, searchTerm, dateFrom, dateTo]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      const result = await getOdooSyncLogs({
        page,
        perPage,
        status,
        searchTerm,
        dateFrom,
        dateTo
      });
      
      setLogs(result.logs || []);
      const fetchedStats = result.stats || { total: 0, successful: 0, failed: 0, success_rate: 0 };
      setStats(fetchedStats);
      setTotalCount(result.pagination?.total_count || 0);
      setTotalPages(result.pagination?.total_pages || 1);
      
      // Update parent stats
      if (onStatsUpdate) {
        onStatsUpdate(fetchedStats);
      }
    } catch (error) {
      console.error('Error fetching contact sync logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setStatus('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('ar-EG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Active filter chips
  const activeChips = [];
  if (status !== 'all') {
    activeChips.push({
      key: 'status',
      label: 'الحالة',
      value: status === 'success' ? 'ناجح' : 'فاشل',
      tone: status === 'success' ? 'green' : 'red',
      onRemove: () => setStatus('all')
    });
  }
  if (searchTerm) {
    activeChips.push({
      key: 'search',
      label: 'بحث',
      value: searchTerm,
      tone: 'blue',
      onRemove: () => setSearchTerm('')
    });
  }
  if (dateFrom || dateTo) {
    const dateLabel = dateFrom && dateTo 
      ? `${dateFrom} - ${dateTo}` 
      : dateFrom 
        ? `من ${dateFrom}` 
        : `إلى ${dateTo}`;
    activeChips.push({
      key: 'date',
      label: 'التاريخ',
      value: dateLabel,
      tone: 'purple',
      onRemove: () => {
        setDateFrom('');
        setDateTo('');
      }
    });
  }

  // Table columns
  const columns = [
    {
      key: 'log_id',
      title: '#',
      sortable: true,
      align: 'center',
      render: (item) => <span className="font-mono text-gray-600 text-sm">{item.log_id}</span>
    },
    {
      key: 'php_client_id',
      title: 'معرف العميل',
      sortable: true,
      align: 'center',
      render: (item) => <span className="font-semibold text-[#8B5FD6]">{item.php_client_id}</span>
    },
    {
      key: 'odoo_partner_id',
      title: 'Odoo Partner ID',
      sortable: true,
      align: 'center',
      render: (item) => item.odoo_partner_id ? (
        <span className="font-mono bg-purple-100 text-purple-700 px-2 py-1 rounded text-sm">{item.odoo_partner_id}</span>
      ) : (
        <span className="text-gray-400">-</span>
      )
    },
    {
      key: 'sync_status',
      title: 'الحالة',
      sortable: true,
      align: 'center',
      render: (item) => item.sync_status === 'success' ? (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircleIcon className="h-4 w-4" />
          ناجح
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircleIcon className="h-4 w-4" />
          فاشل
        </span>
      )
    },
    {
      key: 'error_message',
      title: 'رسالة الخطأ',
      align: 'right',
      render: (item) => item.error_message ? (
        <span className="text-sm text-red-600" title={item.error_message}>
          {item.error_message.length > 40 
            ? item.error_message.substring(0, 40) + '...' 
            : item.error_message}
        </span>
      ) : (
        <span className="text-gray-400 text-sm">-</span>
      )
    },
    {
      key: 'synced_at',
      title: 'وقت المزامنة',
      sortable: true,
      align: 'center',
      render: (item) => (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
          <ClockIcon className="h-4 w-4 text-gray-400" />
          {formatDate(item.synced_at)}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <FilterBar
        searchConfig={{
          value: searchTerm,
          onChange: setSearchTerm,
          placeholder: 'ابحث عن معرف العميل أو معرف Odoo...',
          searchWhileTyping: false
        }}
        selectFilters={[
          {
            key: 'status',
            label: 'الحالة',
            value: status,
            onChange: setStatus,
            options: [
              { value: 'all', label: 'الكل' },
              { value: 'success', label: 'ناجح' },
              { value: 'failed', label: 'فاشل' }
            ]
          }
        ]}
        dateRangeConfig={{
          from: dateFrom,
          to: dateTo,
          onChange: (from, to) => {
            setDateFrom(from);
            setDateTo(to);
          }
        }}
        activeChips={activeChips}
        onClearAll={handleClearAllFilters}
      />

      {/* Table with Pagination */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <PaginationHeaderFooter
          total={totalCount}
          currentPage={page}
          totalPages={totalPages}
          itemsPerPage={perPage}
          onFirst={() => setPage(1)}
          onPrev={() => setPage(p => Math.max(1, p - 1))}
          onNext={() => setPage(p => Math.min(totalPages, p + 1))}
          onLast={() => setPage(totalPages)}
          onItemsPerPageChange={(value) => {
            setPerPage(value);
            setPage(1);
          }}
          loading={loading}
        />

        <GlobalTable
          columns={columns}
          data={logs}
          loading={loading}
          emptyState={{
            icon: '👥',
            title: 'لا توجد سجلات',
            description: 'لم يتم العثور على سجلات مزامنة لجهات الاتصال'
          }}
        />

        <PaginationHeaderFooter
          total={totalCount}
          currentPage={page}
          totalPages={totalPages}
          itemsPerPage={perPage}
          onFirst={() => setPage(1)}
          onPrev={() => setPage(p => Math.max(1, p - 1))}
          onNext={() => setPage(p => Math.min(totalPages, p + 1))}
          onLast={() => setPage(totalPages)}
          onItemsPerPageChange={(value) => {
            setPerPage(value);
            setPage(1);
          }}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default ContactsTab;
