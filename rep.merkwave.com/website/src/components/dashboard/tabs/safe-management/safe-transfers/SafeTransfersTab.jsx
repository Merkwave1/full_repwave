// src/components/dashboard/tabs/safe-management/safe-transfers/SafeTransfersTab.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  ArrowsRightLeftIcon,
  PlusIcon,
  EyeIcon,
  BanknotesIcon,
  ArchiveBoxIcon,
  UserCircleIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

import CustomPageHeader from '../../../../common/CustomPageHeader/CustomPageHeader';
import FilterBar from '../../../../common/FilterBar/FilterBar';
import GlobalTable from '../../../../common/GlobalTable/GlobalTable';
import PaginationHeaderFooter from '../../../../common/PaginationHeaderFooter/PaginationHeaderFooter';
import { getSafeTransfersPaginated } from '../../../../../apis/safe_transfers';
import { getSafes } from '../../../../../apis/safes';
import { getAppUsers } from '../../../../../apis/auth';
import AddSafeTransferForm from './AddSafeTransferForm';
import SafeTransferDetailsModal from './SafeTransferDetailsModal';
import useCurrency from '../../../../../hooks/useCurrency';
import { formatLocalDate, formatLocalDateTime } from '../../../../../utils/dateUtils';
import { isOdooIntegrationEnabled } from '../../../../../utils/odooIntegration';

const formatDateParts = (dateString) => {
  const formatted = formatLocalDateTime(dateString);
  if (!dateString || formatted === '-') {
    return { date: '—', time: '' };
  }

  const [datePart, timePart] = formatted.split(',');
  return {
    date: (datePart || formatted).trim(),
    time: (timePart || '').trim(),
  };
};

const safeTypeLabel = (type) => {
  if (!type) return '—';
  if (type === 'company') return 'خزنة الشركة';
  if (type === 'rep') return 'خزنة مندوب';
  return type;
};

export default function SafeTransfersTab() {
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();
  const { formatCurrency: formatMoney } = useCurrency();

  const [rawTransfers, setRawTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [odooEnabled, setOdooEnabled] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [pendingSearch, setPendingSearch] = useState('');
  const [explicitTransferId, setExplicitTransferId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [outDestSafeId, setOutDestSafeId] = useState('');
  const [inDestSafeId, setInDestSafeId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [allSafes, setAllSafes] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [serverPagination, setServerPagination] = useState(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTransferId, setSelectedTransferId] = useState(null);

  useEffect(() => {
    let mounted = true;
    setOdooEnabled(isOdooIntegrationEnabled());
    (async () => {
      try {
        const [safesResponse, usersResponse] = await Promise.all([
          getSafes().catch(() => null),
          getAppUsers(false).catch(() => []),
        ]);

        if (!mounted) return;

        setAllSafes(safesResponse?.safes || []);
        setAllUsers(Array.isArray(usersResponse) ? usersResponse : []);
      } catch (err) {
        console.warn('Failed to preload safes/users for filters', err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const loadTransfers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const pageToUse = page;
      const limitToUse = limit;
      const dateRange = dateFrom || dateTo ? `${dateFrom || ''},${dateTo || ''}` : undefined;
      const normalizedOutDest = outDestSafeId ? String(outDestSafeId).trim() : '';
      const normalizedInDest = inDestSafeId ? String(inDestSafeId).trim() : '';
      const normalizedUserId = selectedUserId ? String(selectedUserId).trim() : '';
      const normalizedStatus = statusFilter ? String(statusFilter).trim().toLowerCase() : '';
      const normalizedSearch = searchTerm ? searchTerm.trim() : '';
      const normalizedTransferId = explicitTransferId != null && String(explicitTransferId).trim() !== ''
        ? Number(explicitTransferId)
        : undefined;

      const response = await getSafeTransfersPaginated({
        page: pageToUse,
        limit: limitToUse,
        dateRange,
        outDestSafeId: normalizedOutDest || undefined,
        inDestSafeId: normalizedInDest || undefined,
        userId: normalizedUserId || undefined,
        status: normalizedStatus || undefined,
        transferId: Number.isFinite(normalizedTransferId) ? normalizedTransferId : undefined,
        search: normalizedSearch || undefined,
      });

      setRawTransfers(response.data || []);

  const incoming = response.pagination;
      if (incoming && typeof incoming === 'object') {
        const total = Number(incoming.total ?? incoming.total_items ?? incoming.count ?? 0);
        const perPage = Number(incoming.per_page ?? incoming.limit ?? incoming.perPage ?? limit);
        const currentPage = Number(incoming.page ?? incoming.current_page ?? incoming.page_number ?? page);
        const totalPagesCandidate = Number(incoming.total_pages ?? incoming.pages ?? incoming.page_count ?? 0);
        const totalPages = Number.isFinite(totalPagesCandidate) && totalPagesCandidate > 0
          ? totalPagesCandidate
          : (perPage ? Math.max(1, Math.ceil(total / perPage)) : 1);

        setServerPagination({
          total: Number.isFinite(total) ? total : 0,
          per_page: Number.isFinite(perPage) && perPage > 0 ? perPage : limit,
          page: Number.isFinite(currentPage) && currentPage > 0 ? currentPage : page,
          total_pages: totalPages,
        });
      } else {
        setServerPagination(null);
      }
    } catch (err) {
      console.error('Error loading safe transfers', err);
      setError(err.message || 'فشل في تحميل بيانات التحويلات.');
      setGlobalMessage({ type: 'error', message: 'فشل في تحميل بيانات التحويلات.' });
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, page, limit, outDestSafeId, inDestSafeId, selectedUserId, statusFilter, explicitTransferId, searchTerm, setGlobalMessage]);

  useEffect(() => {
    loadTransfers();
  }, [loadTransfers]);

  useEffect(() => {
    if (!setChildRefreshHandler) return undefined;

    setChildRefreshHandler(() => loadTransfers);
    return () => setChildRefreshHandler(null);
  }, [loadTransfers, setChildRefreshHandler]);

  const normalizedTransfers = useMemo(() => {
    const items = Array.isArray(rawTransfers) ? rawTransfers : [];
    return items.map((item) => {
      const source = item.affected_safe_id != null
        ? {
            id: item.affected_safe_id,
            name: item.affected_safe_name,
            type: item.affected_safe_type,
          }
        : null;

      const destination = item.safe_transactions_counterpart_safe_id != null
        ? {
            id: item.safe_transactions_counterpart_safe_id,
            name: item.counterpart_safe_name,
            type: item.counterpart_safe_type,
          }
        : null;

      const amountRaw = Number.parseFloat(
        item.safe_transactions_amount ?? item.transfer_amount ?? 0,
      ) || 0;
      const amount = Math.abs(amountRaw);
      const reference = item.safe_transactions_reference ?? item.transfer_out_reference ?? null;
      const date = item.safe_transactions_date ?? item.transfer_out_date ?? null;
      const userName = item.user_name || item.transfer_in_user_name || null;
      const userId = item.safe_transactions_user_id
        ?? item.safe_transactions_created_by
        ?? item.transfer_out_created_by
        ?? item.transfer_in_created_by
        ?? item.safe_transactions_user
        ?? item.user_id
        ?? null;

      const recordId = item.transfer_out_id ?? item.safe_transactions_id;
      const transferInId = item.transfer_in_id ?? null;

      const transferOutStatus = (item.transfer_out_status || item.safe_transactions_status || '').toLowerCase();
      const transferInStatus = (item.transfer_in_status || '').toLowerCase();
      let status = transferOutStatus || transferInStatus || '';
      if (transferOutStatus === 'rejected' || transferInStatus === 'rejected') {
        status = 'rejected';
      } else if (transferOutStatus === 'pending' || transferInStatus === 'pending') {
        status = 'pending';
      } else if (!status) {
        status = 'approved';
      }

      const approvedByName = item.transfer_out_approved_by_name
        || item.transfer_in_approved_by_name
        || null;
      const approvedDate = item.transfer_out_approved_date
        || item.transfer_in_approved_date
        || null;

      return {
        id: recordId,
        transactionId: recordId,
        reference,
        amount,
        signedAmount: amount,
        date,
        user_name: userName,
        user_id: userId,
        source,
        destination,
        direction: 'transfer',
        rowKey: `transfer-${recordId}`,
        transfer_in_id: transferInId,
        transferOutId: recordId,
        transferInId,
        status,
        transferOutStatus,
        transferInStatus,
        approvedByName,
        approvedDate,
        isPending: status === 'pending',
        transfer_out_odoo_id: item.transfer_out_odoo_id || null,
        transfer_in_odoo_id: item.transfer_in_odoo_id || null,
      };
    });
  }, [rawTransfers]);

  const filteredTransfers = useMemo(() => {
    let rows = normalizedTransfers;

    if (searchTerm) {
      const term = searchTerm.trim().toLowerCase();
      const numericCandidate = term.startsWith('#') ? term.slice(1) : term;
      const normalizedNumeric = /^\d+$/.test(numericCandidate) ? numericCandidate : null;

      rows = rows.filter((row) => {
        const transactionId = String(row.transactionId ?? '');
        const transferOutId = String(row.transferOutId ?? '');
        const transferInId = String(row.transferInId ?? '');

        const matchesNumeric = normalizedNumeric
          ? (
            transactionId.includes(normalizedNumeric)
            || transferOutId.includes(normalizedNumeric)
            || transferInId.includes(normalizedNumeric)
          )
          : false;

        return (
          (row.user_name || '').toLowerCase().includes(term)
          || (row.source?.name || '').toLowerCase().includes(term)
          || (row.destination?.name || '').toLowerCase().includes(term)
          || row.amount.toString().toLowerCase().includes(term)
          || (row.reference || '').toLowerCase().includes(term)
          || matchesNumeric
        );
      });
    }

    if (explicitTransferId) {
      const normalizedId = String(explicitTransferId).trim();
      rows = rows.filter((row) => (
        String(row.transactionId ?? '') === normalizedId
        || String(row.transferOutId ?? '') === normalizedId
        || String(row.transferInId ?? '') === normalizedId
      ));
    }

    // Date filtering is handled server-side via dateRange parameter
    // No client-side date filtering needed since we're using server pagination

    // Filter by the destination safe for outbound transfers (صادر إلى)
    if (outDestSafeId) {
      rows = rows.filter((row) => String(row.destination?.id ?? '') === String(outDestSafeId));
    }

    // Filter by the source safe (الخزنة المحولة منها / مصدر)
    if (inDestSafeId) {
      rows = rows.filter((row) => String(row.source?.id ?? '') === String(inDestSafeId));
    }

    if (selectedUserId) {
      rows = rows.filter((row) => String(row.user_id ?? '') === String(selectedUserId));
    }

    if (statusFilter) {
      rows = rows.filter((row) => (row.status || '') === statusFilter);
    }

    return rows;
  }, [normalizedTransfers, searchTerm, explicitTransferId, outDestSafeId, inDestSafeId, selectedUserId, statusFilter]);

  const paginationMeta = useMemo(() => {
    if (serverPagination) return serverPagination;

    const perPage = limit || 10;
    const total = filteredTransfers.length;
    const totalPages = perPage ? Math.max(1, Math.ceil(total / perPage)) : 1;

    return {
      total,
      per_page: perPage,
      page,
      total_pages: totalPages,
    };
  }, [serverPagination, limit, filteredTransfers.length, page]);

  const currentPage = paginationMeta.page ?? page;
  const perPage = paginationMeta.per_page ?? limit;
  const totalPages = paginationMeta.total_pages ?? Math.max(1, Math.ceil((paginationMeta.total ?? filteredTransfers.length) / (perPage || 1)));
  const totalItems = paginationMeta.total ?? filteredTransfers.length;

  const tableData = filteredTransfers;

  const totalAmount = useMemo(() => {
    const items = Array.isArray(rawTransfers) ? rawTransfers : [];
    return items.reduce((sum, item) => {
      const amount = Number.parseFloat(item.safe_transactions_amount ?? item.transfer_amount ?? 0) || 0;
      return sum + Math.abs(amount);
    }, 0);
  }, [rawTransfers]);

  const handleItemsPerPageChange = useCallback((value) => {
    setLimit(value);
    setPage(1);
  }, []);

  const handleNavigateStart = useCallback(() => {
    setLoading(true);
  }, []);

  const goFirst = useCallback(() => setPage(1), []);
  const goPrev = useCallback(() => setPage((prev) => Math.max(1, prev - 1)), []);
  const goNext = useCallback(() => setPage((prev) => Math.min(totalPages, prev + 1)), [totalPages]);
  const goLast = useCallback(() => setPage(totalPages), [totalPages]);

  const handleAddTransfer = useCallback(() => {
    setShowAddForm(true);
  }, []);

  const handleTransferAdded = useCallback(() => {
    loadTransfers();
    setShowAddForm(false);
    setGlobalMessage({ type: 'success', message: 'تم إرسال طلب التحويل وبانتظار موافقة المسؤول.' });
  }, [loadTransfers, setGlobalMessage]);

  const handleViewDetails = useCallback((transferId) => {
    setSelectedTransferId(transferId);
    setShowDetailsModal(true);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedTransferId(null);
    setShowDetailsModal(false);
  }, []);

  const handleActionComplete = useCallback((newStatus) => {
    loadTransfers();
    setShowDetailsModal(false);
    setSelectedTransferId(null);

    if (!newStatus) {
      return;
    }

    const statusLower = String(newStatus).toLowerCase();
    if (statusLower === 'approved') {
      setGlobalMessage({ type: 'success', message: 'تمت الموافقة على التحويل بنجاح.' });
    } else if (statusLower === 'rejected') {
      setGlobalMessage({ type: 'warning', message: 'تم رفض طلب التحويل.' });
    } else {
      setGlobalMessage({ type: 'info', message: 'تم تحديث حالة التحويل.' });
    }
  }, [loadTransfers, setGlobalMessage]);

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

  const updateOutDest = useCallback((value) => {
    setOutDestSafeId(value || '');
    setPage(1);
  }, []);

  const updateInDest = useCallback((value) => {
    setInDestSafeId(value || '');
    setPage(1);
  }, []);

  const updateUserFilter = useCallback((value) => {
    setSelectedUserId(value || '');
    setPage(1);
  }, []);

  const updateStatusFilter = useCallback((value) => {
    setStatusFilter(value || '');
    setPage(1);
  }, []);

  const clearAllFilters = useCallback(() => {
    let didChange = false;

    if (searchTerm !== '') {
      setSearchTerm('');
      didChange = true;
    }
    if (pendingSearch !== '') {
      setPendingSearch('');
    }
    if (explicitTransferId !== '') {
      setExplicitTransferId('');
      didChange = true;
    }
    if (dateFrom !== '') {
      setDateFrom('');
      didChange = true;
    }
    if (dateTo !== '') {
      setDateTo('');
      didChange = true;
    }
    if (outDestSafeId !== '') {
      setOutDestSafeId('');
      didChange = true;
    }
    if (inDestSafeId !== '') {
      setInDestSafeId('');
      didChange = true;
    }
    if (selectedUserId !== '') {
      setSelectedUserId('');
      didChange = true;
    }
    if (statusFilter !== '') {
      setStatusFilter('');
      didChange = true;
    }
    if (page !== 1) {
      setPage(1);
      didChange = true;
    }

    if (!didChange) {
      loadTransfers();
    }
  }, [dateFrom, dateTo, explicitTransferId, inDestSafeId, loadTransfers, outDestSafeId, page, pendingSearch, searchTerm, selectedUserId, statusFilter]);

  const statusMeta = useMemo(() => ({
    pending: {
      label: 'في انتظار الموافقة',
      className: 'bg-amber-100 text-amber-700 border border-amber-200',
      chipTone: 'amber',
    },
    approved: {
      label: 'تمت الموافقة',
      className: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
      chipTone: 'green',
    },
    rejected: {
      label: 'تم رفضها',
      className: 'bg-rose-100 text-rose-700 border border-rose-200',
      chipTone: 'red',
    },
  }), []);

  const activeFilterChips = useMemo(() => {
    const chips = [];

    if (searchTerm.trim()) {
      chips.push({
        key: 'search',
        label: 'بحث',
        value: `"${searchTerm.trim()}"`,
        tone: 'blue',
        onRemove: () => {
          setSearchTerm('');
          setPendingSearch('');
          setPage(1);
        },
      });
    }

    if (explicitTransferId) {
      chips.push({
        key: 'transferId',
        label: 'معرف التحويل',
        value: `#${explicitTransferId}`,
        tone: 'indigo',
        onRemove: () => {
          setExplicitTransferId('');
          setPendingSearch('');
          setPage(1);
        },
      });
    }

    if (dateFrom || dateTo) {
      chips.push({
        key: 'date',
        label: 'التاريخ',
  value: `${dateFrom ? formatLocalDate(dateFrom) : 'من البداية'} - ${dateTo ? formatLocalDate(dateTo) : 'حتى النهاية'}`,
        tone: 'green',
        onRemove: clearDateRange,
      });
    }

    if (outDestSafeId) {
      const safeName = allSafes.find((safe) => String(safe.safes_id) === String(outDestSafeId))?.safes_name;
      chips.push({
        key: 'outDest',
        label: 'صادر إلى',
        value: safeName || outDestSafeId,
        tone: 'red',
        onRemove: () => updateOutDest(''),
      });
    }

    if (inDestSafeId) {
      const safeName = allSafes.find((safe) => String(safe.safes_id) === String(inDestSafeId))?.safes_name;
      chips.push({
        key: 'inDest',
        label: 'من خزنة',
        value: safeName || inDestSafeId,
        tone: 'teal',
        onRemove: () => updateInDest(''),
      });
    }

    if (selectedUserId) {
      const userName = allUsers.find((user) => String(user.users_id) === String(selectedUserId))?.users_name;
      chips.push({
        key: 'user',
        label: 'المستخدم',
        value: userName || selectedUserId,
        tone: 'purple',
        onRemove: () => updateUserFilter(''),
      });
    }

    if (statusFilter) {
      const meta = statusMeta[statusFilter] || {};
      chips.push({
        key: 'status',
        label: 'الحالة',
        value: meta.label || statusFilter,
        tone: meta.chipTone || 'gray',
        onRemove: () => updateStatusFilter(''),
      });
    }

    return chips;
  }, [searchTerm, explicitTransferId, dateFrom, dateTo, outDestSafeId, inDestSafeId, selectedUserId, statusFilter, allSafes, allUsers, clearDateRange, updateOutDest, updateInDest, updateUserFilter, updateStatusFilter, statusMeta]);

  const safeOptions = useMemo(() => (
    allSafes.map((safe) => ({
      value: String(safe.safes_id),
      label: safe.safes_name,
    }))
  ), [allSafes]);

  const userOptions = useMemo(() => (
    allUsers.map((user) => ({
      value: String(user.users_id),
      label: user.users_name,
    }))
  ), [allUsers]);

  const statusOptions = useMemo(() => ([
    { value: 'pending', label: 'في انتظار الموافقة' },
    { value: 'approved', label: 'تمت الموافقة' },
    { value: 'rejected', label: 'تم رفضها' },
  ]), []);

  const columns = useMemo(() => ([
    {
      key: 'transactionId',
      title: '#',
      align: 'center',
      headerAlign: 'center',
      className: 'w-24',
      sortable: true,
      sortAccessor: (row) => Number(row.transactionId ?? row.transferOutId ?? row.transferInId) || 0,
      render: (row) => {
        const id = row.transactionId ?? row.transferOutId ?? row.transferInId;
        return (
          <span className="inline-flex items-center justify-center bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
            #{id ?? '—'}
          </span>
        );
      },
    },
    ...(odooEnabled ? [{
      key: 'odoo_id',
      title: 'Odoo ID',
      align: 'center',
      headerAlign: 'center',
      className: 'w-20',
      sortable: true,
      sortAccessor: (row) => Number(row.transfer_out_odoo_id) || 0,
      render: (row) => (
        <span className="font-mono text-xs text-purple-600">
          {row.transfer_out_odoo_id || '-'}
        </span>
      ),
    }] : []),
    {
      key: 'ids',
      title: 'معرفات التحويل',
      sortable: false,
      className: 'min-w-[190px]',
      render: (row) => {
        const idBadges = [
          row.transferOutId ? {
            key: 'out',
            label: 'صادر',
            value: row.transferOutId,
            tone: 'bg-rose-100 text-rose-700',
          } : null,
          row.transferInId ? {
            key: 'in',
            label: 'وارد',
            value: row.transferInId,
            tone: 'bg-emerald-100 text-emerald-700',
          } : null,
        ].filter(Boolean);

        if (!idBadges.length) {
          return <span className="text-xs text-gray-400">—</span>;
        }

        return (
          <div className="flex flex-wrap items-center gap-1" dir="ltr">
            {idBadges.map((badge) => (
              <span
                key={badge.key}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge.tone}`}
              >
                <span>{badge.label}</span>
                <span className="bg-white/70 text-gray-800 px-1.5 py-0.5 rounded">#{badge.value}</span>
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'direction',
      title: 'نوع الحركة',
      align: 'center',
      headerAlign: 'center',
      className: 'w-32',
      sortable: false,
      render: () => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
          <ArrowsRightLeftIcon className="h-4 w-4" />
          تحويل
        </span>
      ),
    },
    {
      key: 'date',
      title: 'التاريخ',
      sortable: true,
      sortAccessor: (row) => new Date(row.date).getTime() || 0,
      className: 'min-w-[130px] max-w-[150px]',
      render: (row) => {
        const { date, time } = formatDateParts(row.date);
        return (
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <CalendarDaysIcon className="h-4 w-4 text-indigo-500" />
            <div className="flex flex-col leading-tight text-xs">
              <span>{date}</span>
              <span className="text-gray-400">{time || '—'}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'source',
      title: 'من',
      sortable: true,
      sortAccessor: (row) => (row.source?.name || '').toLowerCase(),
      className: '',
      render: (row) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
            <ArchiveBoxIcon className="h-4 w-4" />
            <span>{row.source?.name || '—'}</span>
          </div>
          {row.source?.type && (
            <span className="text-xs text-gray-500">{safeTypeLabel(row.source.type)}</span>
          )}
        </div>
      ),
    },
    {
      key: 'destination',
      title: 'إلى',
      sortable: true,
      sortAccessor: (row) => (row.destination?.name || '').toLowerCase(),
      className: '',
      render: (row) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <ArchiveBoxIcon className="h-4 w-4" />
            <span>{row.destination?.name || '—'}</span>
          </div>
          {row.destination?.type && (
            <span className="text-xs text-gray-500">{safeTypeLabel(row.destination.type)}</span>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      title: 'المبلغ',
      align: 'center',
      headerAlign: 'center',
      sortable: true,
      sortAccessor: (row) => Number(row.amount) || 0,
      className: '',
      render: (row) => (
        <div className="flex items-center justify-center gap-2 text-base font-bold text-emerald-700">
          <BanknotesIcon className="h-5 w-5" />
          <span>{formatMoney(row.amount)}</span>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'الحالة',
      align: 'center',
      headerAlign: 'center',
      sortable: true,
      sortAccessor: (row) => row.status || '',
      className: 'w-36',
      render: (row) => {
        const meta = statusMeta[row.status] || statusMeta.approved;
        return (
          <div className="flex flex-col items-center gap-1 text-xs">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-semibold ${meta.className}`}>
              {meta.label}
            </span>
            {row.status !== 'pending' && row.approvedByName && (
              <span className="text-[10px] text-gray-400">بواسطة {row.approvedByName}</span>
            )}
            {row.status !== 'pending' && row.approvedDate && (
              <span className="text-[10px] text-gray-300">
                {formatDateParts(row.approvedDate).date}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'user_name',
      title: 'المستخدم',
      sortable: true,
      sortAccessor: (row) => (row.user_name || '').toLowerCase(),
      className: '',
      render: (row) => (
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <UserCircleIcon className="h-5 w-5 text-indigo-500" />
          <span>{row.user_name || '—'}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'الإجراءات',
      align: 'center',
      headerAlign: 'center',
      className: 'w-32',
      sortable: false,
      render: (row) => (
        <button
          type="button"
          title="عرض التفاصيل"
          onClick={() => handleViewDetails(row.transactionId)}
          className="group p-1.5 text-blue-600 hover:text-white hover:bg-blue-600 rounded-full transition"
        >
          <EyeIcon className="h-4 w-4" />
        </button>
      ),
    },
  ]), [handleViewDetails, formatMoney, statusMeta, odooEnabled]);

  if (loading && !rawTransfers.length) {
    return (
      <div className="p-10 flex items-center justify-center" dir="rtl">
        <span className="text-gray-600">جار تحميل التحويلات...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <CustomPageHeader
        title="تحويلات الخزائن"
        subtitle="إدارة وتتبع تحويلات الأموال بين الخزائن"
    icon={<ArrowsRightLeftIcon className="h-8 w-8 text-white" />}
    statValue={formatMoney(totalAmount)}
        statLabel="إجمالي قيمة التحويلات"
        statSecondaryValue={totalItems}
        statSecondaryLabel="عدد التحويلات"
        actionButton={(
          <button
            type="button"
            onClick={handleAddTransfer}
            className="bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg font-bold"
            disabled={loading}
          >
            <PlusIcon className="h-5 w-5" />
            تحويل جديد
          </button>
        )}
      />

      <FilterBar
        title="بحث وفلاتر التحويلات"
        searchConfig={{
          value: pendingSearch,
          onChange: (v) => setPendingSearch(v),
          onSubmit: (val) => {
            const trimmed = String(val || '').trim();
            const matchHash = trimmed.match(/^#(\d+)$/);
            const matchId = trimmed.match(/^id\s*[:=]\s*(\d+)$/i);
            if (matchHash) {
              let didChange = false;
              if (explicitTransferId !== matchHash[1]) {
                setExplicitTransferId(matchHash[1]);
                didChange = true;
              }
              if (searchTerm !== '') {
                setSearchTerm('');
                didChange = true;
              }
              if (pendingSearch !== trimmed) {
                setPendingSearch(trimmed);
              }
              if (page !== 1) {
                setPage(1);
                didChange = true;
              }
              if (!didChange) {
                loadTransfers();
              }
              return;
            }

            if (matchId) {
              let didChange = false;
              if (explicitTransferId !== matchId[1]) {
                setExplicitTransferId(matchId[1]);
                didChange = true;
              }
              if (searchTerm !== '') {
                setSearchTerm('');
                didChange = true;
              }
              if (pendingSearch !== trimmed) {
                setPendingSearch(trimmed);
              }
              if (page !== 1) {
                setPage(1);
                didChange = true;
              }
              if (!didChange) {
                loadTransfers();
              }
              return;
            }

            let didChange = false;
            if (explicitTransferId !== '') {
              setExplicitTransferId('');
              didChange = true;
            }
            if (searchTerm !== trimmed) {
              setSearchTerm(trimmed);
              didChange = true;
            }
            if (pendingSearch !== trimmed) {
              setPendingSearch(trimmed);
            }
            if (page !== 1) {
              setPage(1);
              didChange = true;
            }
            if (!didChange) {
              loadTransfers();
            }
          },
          onClear: () => {
            let didChange = false;
            if (searchTerm !== '') {
              setSearchTerm('');
              didChange = true;
            }
            if (pendingSearch !== '') {
              setPendingSearch('');
            }
            if (explicitTransferId !== '') {
              setExplicitTransferId('');
              didChange = true;
            }
            if (page !== 1) {
              setPage(1);
              didChange = true;
            }
            if (!didChange) {
              loadTransfers();
            }
          },
          placeholder: 'ابحث في التحويلات حسب المستخدم أو الخزائن أو المبلغ',
          searchWhileTyping: false,
          showApplyButton: true,
        }}
        dateRangeConfig={{
          from: dateFrom,
          to: dateTo,
          onChange: handleDateRangeChange,
          onClear: clearDateRange,
          placeholder: 'تصفية حسب التاريخ',
        }}
        selectFilters={[
          {
            key: 'in-dest',
            value: inDestSafeId,
            onChange: updateInDest,
            options: safeOptions,
            placeholder: 'الخزنة المحول منها',
          },
          {
            key: 'out-dest',
            value: outDestSafeId,
            onChange: updateOutDest,
            options: safeOptions,
            placeholder: 'الخزنة المحول اليها',
          },
          {
            key: 'user',
            value: selectedUserId,
            onChange: updateUserFilter,
            options: userOptions,
            placeholder: 'المستخدم المنفذ',
          },
          {
            key: 'status',
            value: statusFilter,
            onChange: updateStatusFilter,
            options: statusOptions,
            placeholder: 'حالة الطلب',
          },
        ]}
        activeChips={activeFilterChips}
        onClearAll={activeFilterChips.length ? clearAllFilters : null}
      />

      <PaginationHeaderFooter
        total={totalItems}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={perPage}
        onItemsPerPageChange={handleItemsPerPageChange}
        onFirst={goFirst}
        onPrev={goPrev}
        onNext={goNext}
        onLast={goLast}
        loading={loading}
        onNavigateStart={handleNavigateStart}
        transparent
      />

      <GlobalTable
        data={tableData}
        loading={loading}
        error={error}
        columns={columns}
        rowKey="rowKey"
        totalCount={totalItems}
        searchTerm={searchTerm}
        emptyState={{
          icon: '💰',
          title: 'لا توجد تحويلات لعرضها',
          description: 'جرّب تعديل الفلاتر أو إضافة تحويل جديد.',
        }}
        initialSort={{ key: 'date', direction: 'desc' }}
        showSummary
      />

      <PaginationHeaderFooter
        total={totalItems}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={perPage}
        onItemsPerPageChange={handleItemsPerPageChange}
        onFirst={goFirst}
        onPrev={goPrev}
        onNext={goNext}
        onLast={goLast}
        loading={loading}
        onNavigateStart={handleNavigateStart}
      />

      {showAddForm && (
        <AddSafeTransferForm
          onClose={() => setShowAddForm(false)}
          onSubmit={handleTransferAdded}
        />
      )}

      {showDetailsModal && selectedTransferId && (
        <SafeTransferDetailsModal
          transferId={selectedTransferId}
          onClose={handleCloseDetails}
          onActionComplete={handleActionComplete}
        />
      )}
    </div>
  );
}
