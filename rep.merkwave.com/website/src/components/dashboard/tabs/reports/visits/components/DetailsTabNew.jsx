import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import ImagePreviewModal from '../../../../../common/ImagePreviewModal.jsx';
import { 
  MapPinIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  PlayCircleIcon,
  UserIcon,
  BuildingOfficeIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  DocumentIcon,
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  FunnelIcon,
  CalendarDaysIcon,
  XMarkIcon,
  EyeIcon,
  PencilSquareIcon,
  ArrowUturnLeftIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import Loader from '../../../../../common/Loader/Loader.jsx';
import Alert from '../../../../../common/Alert/Alert.jsx';
import SearchableSelect from '../../../../../common/SearchableSelect/SearchableSelect.jsx';
import PaginationHeaderFooter from '../../../../../common/PaginationHeaderFooter/PaginationHeaderFooter.jsx';
import GlobalTable from '../../../../../common/GlobalTable/GlobalTable.jsx';
import FilterBar from '../../../../../common/FilterBar/FilterBar.jsx';
import { getVisitsDetails, getVisitSummaryById } from '../../../../../../apis/visits.js';
import { getAppUsers, getAppClientAreaTags } from '../../../../../../apis/auth.js';
import useCurrency from '../../../../../../hooks/useCurrency';

// Date Range Picker Component (similar to ClientCashTab)
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

// Visits List Component (styled like ClientCashTab)
const VisitsListTable = ({ rows, loading, error, searchTerm, formatDate, onView, summaryTotalsByVisit }) => {
  if (loading) return <Loader className="mt-8" />;
  if (error) return <Alert message={error} type="error" className="mb-4" />;

  // status badge rendering inlined within GlobalTable columns

  const formatDuration = (minutes) => {
  if (minutes === null || minutes === undefined) return '1د';
  const num = Number(minutes);
  if (Number.isNaN(num) || num < 1) return '1د';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}س ${mins}د`;
    }
    return `${mins}د`;
  };

  return (
    <GlobalTable
      data={rows}
      loading={loading}
      error={error}
      columns={[
        { key: 'visits_id', title: 'id', align: 'center', headerAlign: 'center', render: (item) => <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-semibold">{item.visits_id}</span> },
        { key: 'visits_status', title: 'الحالة', align: 'center', render: (item) => {
          const statusConfig = { 'Started': { label: 'جارية', color: 'bg-yellow-100 text-yellow-800', icon: PlayCircleIcon }, 'Completed': { label: 'مكتملة', color: 'bg-green-100 text-green-800', icon: CheckCircleIcon }, 'Cancelled': { label: 'ملغاة', color: 'bg-red-100 text-red-800', icon: XCircleIcon } };
          const cfg = statusConfig[item.visits_status] || statusConfig['Started']; const Icon = cfg.icon; return (<span className={`px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${cfg.color}`}><Icon className="h-3 w-3" />{cfg.label}</span>);
        } },
        { key: 'clients_company_name', title: 'العميل', align: 'right', render: (item) => (<div className="flex items-center"><BuildingOfficeIcon className="h-4 w-4 text-gray-400 ml-2" /><div><div className="text-gray-900 font-medium">{item.clients_company_name || 'غير محدد'}</div>{item.client_area_tag_name && (<div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded mt-1 inline-block">{item.client_area_tag_name}</div>)}</div></div>) },
        { key: 'rep_name', title: 'المندوب', align: 'right', render: (item) => (<div className="flex items-center"><UserIcon className="h-4 w-4 text-gray-400 ml-2" />{item.rep_name || 'غير محدد'}</div>) },
        { key: 'times', title: 'وقت البداية والنهاية', align: 'right', render: (item) => (<div className="flex flex-col"><span>البداية: {formatDate(item.visits_start_time)}</span><span className="mt-0.5 text-gray-500">النهاية: {formatDate(item.visits_end_time)}</span></div>) },
        { key: 'duration', title: 'المدة', align: 'right', render: (item) => (<div className="flex items-center"><ClockIcon className="h-4 w-4 text-gray-400 ml-1" />{formatDuration(item.visit_duration_minutes)}</div>) },
        { key: 'activities', title: 'الأنشطة', align: 'right', render: (item) => (<div className="flex space-x-4 space-x-reverse text-sm"><span className="flex items-center"><ChatBubbleLeftRightIcon className="h-4 w-4 text-blue-500 ml-1" />{(() => { const cached = summaryTotalsByVisit[item.visits_id]; if (cached) return cached.total_activities; const s = item.summary_stats; const a = item.activities; return (s?.total_activities ?? (Array.isArray(a) ? a.length : undefined) ?? item.activities_count ?? 0); })()}</span><span className="flex items-center"><DocumentTextIcon className="h-4 w-4 text-green-500 ml-1" />{(() => { const cached = summaryTotalsByVisit[item.visits_id]; if (cached) return cached.total_sales_orders; const s = item.summary_stats; const list = item.orders || item.sales_orders; return (s?.total_sales_orders ?? (Array.isArray(list) ? list.length : undefined) ?? item.orders_count ?? 0); })()}</span><span className="flex items-center"><CurrencyDollarIcon className="h-4 w-4 text-yellow-500 ml-1" />{(() => { const cached = summaryTotalsByVisit[item.visits_id]; if (cached) return cached.total_payments; const s = item.summary_stats; const list = item.payments; return (s?.total_payments ?? (Array.isArray(list) ? list.length : undefined) ?? item.payments_count ?? 0); })()}</span><span className="flex items-center"><ArrowUturnLeftIcon className="h-4 w-4 text-red-500 ml-1" />{(() => { const cached = summaryTotalsByVisit[item.visits_id]; if (cached) return cached.total_returns; const s = item.summary_stats; const list = item.returns || item.sales_returns; return (s?.total_returns ?? (Array.isArray(list) ? list.length : undefined) ?? item.returns_count ?? 0); })()}</span></div>) },
        { key: 'actions', title: 'إجراءات', align: 'center', render: (item) => (<div className="flex items-center justify-center gap-2"><button title="عرض التفاصيل" onClick={() => onView(item)} className="p-2 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-gray-800"><EyeIcon className="h-5 w-5" /></button></div>) },
      ]}
      rowKey="visits_id"
      totalCount={rows.length}
      searchTerm={searchTerm}
    />
  );
};

const DetailsTab = ({ data }) => {
  const { symbol } = useCurrency();
  // Helper function for activity type names
  const getActivityTypeName = (activityType) => {
    const activityTypes = {
      'Client_Note_Added': 'إضافة ملاحظة',
      'Photo_After': 'صورة بعد',
      'Photo_Before': 'صورة قبل',
      'Return_Initiated': 'بدء مرتجع',
      'Payment_Collected': 'تحصيل دفعة',
      'SalesOrder_Created': 'إنشاء طلب',
      'Meeting': 'اجتماع',
      'Call': 'مكالمة',
      'Email': 'بريد إلكتروني',
      'Visit': 'زيارة',
      'Follow_Up': 'متابعة',
      'Presentation': 'عرض تقديمي',
      'Demo': 'عرض توضيحي',
      'Negotiation': 'تفاوض',
      'Order_Processing': 'معالجة الطلب',
      'Payment_Collection': 'تحصيل دفعة',
      'Document_Review': 'مراجعة مستندات',
      'Product_Training': 'تدريب على المنتج',
      'Site_Survey': 'مسح الموقع',
      'Installation': 'تركيب',
      'Support': 'دعم فني',
      'Complaint_Resolution': 'حل شكوى',
      'Contract_Signing': 'توقيع عقد',
      'Invoice_Discussion': 'مناقشة الفاتورة',
      'Delivery_Coordination': 'تنسيق التسليم',
      'Quality_Check': 'فحص الجودة',
      'Other': 'أخرى'
    };
    
    return activityTypes[activityType] || activityType || 'غير محدد';
  };

  // UI state
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [selectedVisitSummary, setSelectedVisitSummary] = useState(null);
  const [selectedVisitLoading, setSelectedVisitLoading] = useState(false);
  const [selectedVisitError, setSelectedVisitError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [repId, setRepId] = useState('');
  const [areaTagId, setAreaTagId] = useState('');
  const [clientId, setClientId] = useState('');
  const [imagePreview, setImagePreview] = useState({ open: false, src: null, title: '' });

  // Applied filters state
  const [appliedFilters, setAppliedFilters] = useState({
    searchTerm: '',
    statusFilter: 'all',
    dateFrom: '',
    dateTo: '',
    repId: '',
    areaTagId: '',
    clientId: ''
  });

  // pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // data loading
  const [rows, setRows] = useState(Array.isArray(data) ? data : []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // no async race protection needed with single-shot fetch

  // support provided data prop as initial fallback; fetch server-side when filters/page change
  // Guard useRef to avoid duplicate fetching in React StrictMode
  const lastFetchKeyRef = useRef(null);

  const fetchDetails = useCallback(async () => {
    const key = `${page}|${perPage}|${appliedSearchTerm}|${statusFilter}|${dateFrom}|${dateTo}|${repId}|${areaTagId}|${clientId}`;
    if (lastFetchKeyRef.current === key) return; // prevent duplicate calls
    lastFetchKeyRef.current = key;
    setLoading(true);
    setError(null);
    try {
      // Server-side pagination with filters
      const result = await getVisitsDetails({ 
        page, 
        perPage,
        searchTerm: appliedSearchTerm,
        status: statusFilter === 'all' ? '' : statusFilter,
        dateFrom,
        dateTo,
        repId,
        areaTagId,
        clientId
      });
      const items = result?.items ?? [];
      const totalCount = result?.pagination?.total ?? (Array.isArray(items) ? items.length : 0);
      const tp = result?.pagination?.total_pages ?? Math.max(1, Math.ceil(totalCount / perPage));
      setRows(items);
      setTotal(totalCount);
      setTotalPages(tp);
    } catch (err) {
      console.error('Failed to load visit details:', err);
      setError(err.message || 'فشل تحميل تفاصيل الزيارات');
    } finally {
      setLoading(false);
    }
  }, [page, perPage, appliedSearchTerm, statusFilter, dateFrom, dateTo, repId, areaTagId, clientId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // applySearch removed: FilterBar will call onSubmit/onChange handlers directly

  // Clear date range
  const clearDateRange = () => {
    setDateFrom('');
    setDateTo('');
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setAppliedSearchTerm('');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setRepId('');
    setAreaTagId('');
    setClientId('');
    setAppliedFilters({
      searchTerm: '',
      statusFilter: 'all',
      dateFrom: '',
      dateTo: '',
      repId: '',
      areaTagId: '',
      clientId: ''
    });
    setPage(1);
  };

  // Server returns exactly current page; just render rows
  const pagedRows = rows;

  // lookup lists
  const [representatives, setRepresentatives] = useState([]);
  const [areaTags, setAreaTags] = useState([]);
  const [clients, setClients] = useState([]);
  useEffect(() => {
    // Load representatives and area tags from localStorage first, fallback to cached APIs
    (async () => {
      try {
        // Representatives
        let reps = [];
        try {
          const cachedUsersRaw = localStorage.getItem('appUsers');
          if (cachedUsersRaw) reps = JSON.parse(cachedUsersRaw);
        } catch { /* ignore */ }
        if (!Array.isArray(reps) || reps.length === 0) {
          try { reps = await getAppUsers(false); } catch { reps = []; }
        }
        setRepresentatives(Array.isArray(reps) ? reps : []);

        // Area Tags
        let tags = [];
        try {
          const cachedTagsRaw = localStorage.getItem('appClientAreaTags');
          if (cachedTagsRaw) {
            const parsed = JSON.parse(cachedTagsRaw);
            tags = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.data) ? parsed.data : []);
          }
        } catch { /* ignore */ }
        if (!Array.isArray(tags) || tags.length === 0) {
          try { tags = await getAppClientAreaTags(false); } catch { tags = []; }
        }
        setAreaTags(Array.isArray(tags) ? tags : []);
      } catch {
        // ignore all
      }
    })();
  }, []);
  // Load clients from localStorage only (no network)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('appClients');
      if (raw) {
        const parsed = JSON.parse(raw);
        const list = Array.isArray(parsed) ? parsed : (parsed?.data || parsed?.clients || []);
        setClients(Array.isArray(list) ? list : []);
      } else {
        setClients([]);
      }
    } catch {
      setClients([]);
    }
  }, []);

  const repOptions = useMemo(() => representatives.map(r => ({ value: String(r.users_id || r.id), label: r.users_name || r.name || r.username })), [representatives]);
  const areaTagOptions = useMemo(() => areaTags.map(t => ({
    value: String(
      t.client_area_tag_id ||
      t.client_area_tags_id ||
      t.id
    ),
    label: (
      t.client_area_tag_name ||
      t.client_area_tags_name ||
      t.name
    )
  })), [areaTags]);
  const clientOptions = useMemo(() => (clients || [])
    .filter(c => (c.clients_id || c.client_id || c.id) && (c.clients_company_name || c.company_name || c.client_name || c.name))
    .map(c => ({ value: String(c.clients_id || c.client_id || c.id), label: c.clients_company_name || c.company_name || c.client_name || c.name })), [clients]);

  // Auto-apply non-search filters to appliedFilters and reset page
  useEffect(() => {
    setAppliedFilters(prev => ({
      ...prev,
      statusFilter,
      dateFrom,
      dateTo,
      repId,
      areaTagId,
      clientId,
    }));
    setPage(1);
  }, [statusFilter, dateFrom, dateTo, repId, areaTagId, clientId]);

  const formatDate = (dateString) => {
    if (!dateString) return 'غير محدد';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helpers for duration and map links
  const getVisitDuration = (start, end) => {
    if (!start || !end) return 'غير محددة';
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (Number.isNaN(s) || Number.isNaN(e) || e < s) return 'غير محددة';
    const ms = e - s;
    const minutes = Math.round(ms / 60000);
  if (minutes < 1) return '1د';
    if (minutes < 60) return `${minutes} دقيقة`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h} ساعة ${m} دقيقة` : `${h} ساعة`;
  };
  const formatLatLng = (lat, lng) => {
    if (!lat || !lng) return 'غير متوفر';
    const latF = parseFloat(lat); const lngF = parseFloat(lng);
    if (Number.isNaN(latF) || Number.isNaN(lngF)) return 'غير متوفر';
    return `${latF.toFixed(6)}, ${lngF.toFixed(6)}`;
  };
  const mapLink = (lat, lng) => (lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : '#');

  // Totals derived from summary for UI
  const returnsTotalAmount = React.useMemo(() => {
    const list = selectedVisitSummary?.returns || [];
    try {
      return list.reduce((sum, r) => sum + (parseFloat(r.returns_total_amount || r.sales_returns_total_amount || 0) || 0), 0);
    } catch { return 0; }
  }, [selectedVisitSummary]);

  // Cache of per-visit summary totals for list rows (kept for future but no auto-prefetch)
  const [summaryTotalsByVisit] = useState({}); // rely on backend summary_stats in list API

  // Derived flag removed; FilterBar shows active chips via activeChips

  // Construct chips for FilterBar to display active filters with remove handlers
  const activeChips = useMemo(() => {
    const chips = [];
    if (appliedFilters.searchTerm) {
      chips.push({
        key: 'search',
        label: 'بحث',
        value: appliedFilters.searchTerm,
        tone: 'indigo',
        onRemove: () => {
          setSearchTerm('');
          setAppliedSearchTerm('');
          setAppliedFilters(prev => ({ ...prev, searchTerm: '' }));
          setPage(1);
        }
      });
    }

    if (appliedFilters.statusFilter && appliedFilters.statusFilter !== 'all') {
      const statusLabel = appliedFilters.statusFilter === 'Started' ? 'جارية' : appliedFilters.statusFilter === 'Completed' ? 'مكتملة' : appliedFilters.statusFilter === 'Cancelled' ? 'ملغاة' : appliedFilters.statusFilter;
      chips.push({ key: 'status', label: 'الحالة', value: statusLabel, tone: 'yellow', onRemove: () => setStatusFilter('all') });
    }

    if (appliedFilters.dateFrom || appliedFilters.dateTo) {
      const val = `${appliedFilters.dateFrom || ''}${appliedFilters.dateFrom && appliedFilters.dateTo ? ' - ' : ''}${appliedFilters.dateTo || ''}`;
      chips.push({ key: 'date', label: 'التاريخ', value: val, tone: 'blue', onRemove: () => { setDateFrom(''); setDateTo(''); } });
    }

    if (appliedFilters.repId) {
      const label = repOptions.find(o => String(o.value) === String(appliedFilters.repId))?.label || appliedFilters.repId;
      chips.push({ key: 'rep', label: 'المندوب', value: label, tone: 'green', onRemove: () => setRepId('') });
    }

    if (appliedFilters.areaTagId) {
      const label = areaTagOptions.find(o => String(o.value) === String(appliedFilters.areaTagId))?.label || appliedFilters.areaTagId;
      chips.push({ key: 'area', label: 'المنطقة', value: label, tone: 'teal', onRemove: () => setAreaTagId('') });
    }

    if (appliedFilters.clientId) {
      const label = clientOptions.find(o => String(o.value) === String(appliedFilters.clientId))?.label || appliedFilters.clientId;
      chips.push({ key: 'client', label: 'العميل', value: label, tone: 'purple', onRemove: () => setClientId('') });
    }

    return chips;
  }, [appliedFilters, repOptions, areaTagOptions, clientOptions]);

  return (
    <div className="p-6 space-y-6">
      {/* Filters Section - replaced by shared FilterBar component */}
      <FilterBar
        title="خيارات التصفية"
        searchConfig={{
          value: searchTerm,
          placeholder: 'البحث في الزيارات...',
          isDirty: Boolean(searchTerm && searchTerm !== appliedSearchTerm),
          showApplyButton: true,
          searchWhileTyping: false,
          onChange: (val) => setSearchTerm(val),
          onSubmit: (val) => { setAppliedSearchTerm(val); setAppliedFilters(prev => ({ ...prev, searchTerm: val })); setPage(1); },
          onClear: () => { setSearchTerm(''); setAppliedSearchTerm(''); setAppliedFilters(prev => ({ ...prev, searchTerm: '' })); setPage(1); },
          applyLabel: 'تطبيق'
        }}
        dateRangeConfig={{
          from: dateFrom,
          to: dateTo,
          placeholder: 'اختر فترة التاريخ',
          onChange: (from, to) => { setDateFrom(from); setDateTo(to); },
          onClear: () => clearDateRange()
        }}
        selectFilters={[
          { key: 'status', label: 'الحالة', value: statusFilter, options: [
            { value: 'all', label: 'جميع الحالات' },
            { value: 'Started', label: 'جارية' },
            { value: 'Completed', label: 'مكتملة' },
            { value: 'Cancelled', label: 'ملغاة' }
          ], onChange: (v) => setStatusFilter(v) },
          { key: 'rep', label: 'المندوب', value: repId, options: repOptions, onChange: (v) => setRepId(v) },
          { key: 'area', label: 'المنطقة', value: areaTagId, options: areaTagOptions, onChange: (v) => setAreaTagId(v) },
          { key: 'client', label: 'العميل', value: clientId, options: clientOptions, onChange: (v) => setClientId(v) }
        ]}
        activeChips={activeChips}
        onClearAll={() => clearAllFilters()}
        clearAllLabel="مسح جميع الفلاتر"
        className=""
      />

      {/* Pagination header (top) using shared component */}
      <PaginationHeaderFooter
        total={total}
        currentPage={page}
        totalPages={totalPages}
        itemsPerPage={perPage}
        onItemsPerPageChange={(n) => setPerPage(n)}
        onFirst={() => setPage(1)}
        onPrev={() => setPage(p => Math.max(1, p - 1))}
        onNext={() => setPage(p => Math.min(totalPages, p + 1))}
        onLast={() => setPage(totalPages)}
        loading={loading}
      />

      {/* Visits Table */}
      <VisitsListTable 
        rows={pagedRows} 
        loading={loading} 
        error={error} 
  searchTerm={appliedSearchTerm} 
        formatDate={formatDate} 
  summaryTotalsByVisit={summaryTotalsByVisit}
        onView={async (row) => {
          setSelectedVisit(row);
          setSelectedVisitLoading(true);
          setSelectedVisitError(null);
          setSelectedVisitSummary(null);
          try {
            const summary = await getVisitSummaryById(row.visits_id);
            setSelectedVisitSummary(summary);
          } catch (e) {
            console.error('Failed to load visit summary:', e);
            setSelectedVisitError(e.message || 'فشل تحميل تفاصيل الزيارة');
          } finally {
            setSelectedVisitLoading(false);
          }
        }}
        appliedFilters={appliedFilters}
        clearAllFilters={clearAllFilters}
      />

      {/* Pagination footer (bottom) using shared component */}
      <PaginationHeaderFooter
        total={total}
        currentPage={page}
        totalPages={totalPages}
        itemsPerPage={perPage}
        onItemsPerPageChange={(n) => setPerPage(n)}
        onFirst={() => setPage(1)}
        onPrev={() => setPage(p => Math.max(1, p - 1))}
        onNext={() => setPage(p => Math.min(totalPages, p + 1))}
        onLast={() => setPage(totalPages)}
        loading={loading}
      />

      {/* Visit Details Modal - Minimal Clean Design */}
      {selectedVisit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-6xl bg-white rounded-xl shadow-xl border border-gray-200 max-h-[95vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapPinIcon className="h-6 w-6 text-gray-700" />
                  <h2 className="text-xl font-bold text-gray-900">تفاصيل الزيارة</h2>
                </div>
                <button onClick={() => setSelectedVisit(null)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Key Info Row */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">رقم الزيارة:</span>
                  <span className="font-semibold text-gray-900">#{selectedVisit.visits_id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-500">المندوب:</span>
                  <span className="font-medium text-gray-900">{selectedVisit.rep_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BuildingOfficeIcon className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-500">العميل:</span>
                  <span className="font-medium text-gray-900">{selectedVisit.clients_company_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ClockIcon className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-500">مدة الزيارة:</span>
                  <span className="font-medium text-gray-900">{getVisitDuration(selectedVisit.visits_start_time, selectedVisit.visits_end_time)}</span>
                </div>
              </div>

              {/* Times and Locations */}
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                  <div className="flex items-center gap-2 text-gray-700 mb-2">
                    <ClockIcon className="h-4 w-4" />
                    <span className="font-semibold">الوقت</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">البداية:</span>
                      <span className="text-gray-900">{formatDate(selectedVisit.visits_start_time)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">النهاية:</span>
                      <span className="text-gray-900">{formatDate(selectedVisit.visits_end_time)}</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                  <div className="flex items-center gap-2 text-gray-700 mb-2">
                    <MapPinIcon className="h-4 w-4" />
                    <span className="font-semibold">الموقع</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">نقطة البداية:</span>
                      <a
                        href={mapLink(selectedVisit.visits_start_latitude, selectedVisit.visits_start_longitude)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-700 hover:underline"
                        title="فتح في خرائط جوجل"
                      >
                        {formatLatLng(selectedVisit.visits_start_latitude, selectedVisit.visits_start_longitude)}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">نقطة النهاية:</span>
                      <a
                        href={mapLink(selectedVisit.visits_end_latitude, selectedVisit.visits_end_longitude)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-700 hover:underline"
                        title="فتح في خرائط جوجل"
                      >
                        {formatLatLng(selectedVisit.visits_end_latitude, selectedVisit.visits_end_longitude)}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto max-h-[calc(95vh-200px)] p-6">
              {selectedVisitLoading && (
                <div className="py-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-400 border-t-transparent"></div>
                  <p className="text-gray-600 mt-3">جاري تحميل تفاصيل الزيارة...</p>
                </div>
              )}

              {selectedVisitError && (
                <Alert message={selectedVisitError} type="error" />
              )}

              {!selectedVisitLoading && !selectedVisitError && (
                <div className="space-y-6">
                  {/* Notes */}
                  {(selectedVisit.visits_notes || selectedVisit.visits_purpose || selectedVisit.visits_outcome) && (
                    <div className="rounded-lg border border-gray-200 bg-white">
                      <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2 text-gray-800">
                        <DocumentTextIcon className="h-5 w-5 text-gray-600" />
                        <h3 className="font-semibold">ملخص الزيارة</h3>
                      </div>
                      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        {selectedVisit.visits_purpose && (
                          <div>
                            <div className="text-gray-500 mb-1">الهدف</div>
                            <div className="text-gray-900">{selectedVisit.visits_purpose}</div>
                          </div>
                        )}
                        {selectedVisit.visits_outcome && (
                          <div>
                            <div className="text-gray-500 mb-1">النتيجة</div>
                            <div className="text-gray-900">{selectedVisit.visits_outcome}</div>
                          </div>
                        )}
                        {selectedVisit.visits_notes && (
                          <div className="md:col-span-3">
                            <div className="text-gray-500 mb-1">ملاحظات</div>
                            <div className="text-gray-900 leading-relaxed">{selectedVisit.visits_notes}</div>
                          </div>
                        )}
                      </div>
                      {/* Operations Summary */}
                      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 text-sm">
                        <div className="text-gray-800 font-semibold mb-3">ملخص العمليات</div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <div className="text-gray-500 mb-1">أوامر الشراء</div>
                            <div className="text-gray-900">
                              عدد: <span className="font-semibold">{selectedVisitSummary?.summary_stats?.total_sales_orders ?? (selectedVisitSummary?.sales_orders?.length || 0)}</span>
                              <span className="mx-2 text-gray-400">•</span>
                              الإجمالي: <span className="font-semibold">{parseFloat(selectedVisitSummary?.summary_stats?.total_sales_amount ?? 0).toLocaleString('en-US')} {symbol}</span>
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500 mb-1">المدفوعات</div>
                            <div className="text-gray-900">
                              عدد: <span className="font-semibold">{selectedVisitSummary?.summary_stats?.total_payments ?? (selectedVisitSummary?.payments?.length || 0)}</span>
                              <span className="mx-2 text-gray-400">•</span>
                              الإجمالي: <span className="font-semibold">{parseFloat(selectedVisitSummary?.summary_stats?.total_payments_amount ?? 0).toLocaleString('en-US')} {symbol}</span>
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500 mb-1">المرتجعات</div>
                            <div className="text-gray-900">
                              عدد: <span className="font-semibold">{selectedVisitSummary?.summary_stats?.total_returns ?? (selectedVisitSummary?.returns?.length || 0)}</span>
                              <span className="mx-2 text-gray-400">•</span>
                              الإجمالي: <span className="font-semibold">{parseFloat(returnsTotalAmount || 0).toLocaleString('en-US')} {symbol}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sales Orders */}
                  <div className="rounded-lg border border-gray-200 bg-white">
                    <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2 text-gray-800">
                      <DocumentTextIcon className="h-5 w-5 text-gray-600" />
                      <h3 className="font-semibold">طلبات البيع ({selectedVisitSummary?.sales_orders?.length || 0})</h3>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {selectedVisitSummary?.sales_orders?.length > 0 ? (
                        selectedVisitSummary.sales_orders.map((so) => (
                          <div key={so.sales_orders_id} className="p-4 flex items-start justify-between">
                            <div>
                              <div className="text-sm font-semibold text-gray-900">طلب #{so.sales_orders_id}</div>
                              <div className="text-sm text-gray-700 mt-1">
                                الإجمالي: <span className="font-bold">{parseFloat(so.sales_orders_total_amount || 0).toLocaleString('en-US')} {symbol}</span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">تاريخ الإنشاء: {new Date(so.sales_orders_created_at).toLocaleString('en-US')}</div>
                            </div>
                            <span className="ml-4 px-2 py-1 rounded border border-gray-300 text-xs text-gray-700">{so.sales_orders_status || 'Draft'}</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-gray-500">لا توجد طلبات</div>
                      )}
                    </div>
                  </div>

                  {/* Payments */}
                  <div className="rounded-lg border border-gray-200 bg-white">
                    <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2 text-gray-800">
                      <CurrencyDollarIcon className="h-5 w-5 text-gray-600" />
                      <h3 className="font-semibold">المدفوعات ({selectedVisitSummary?.payments?.length || 0})</h3>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {selectedVisitSummary?.payments?.length > 0 ? (
                        selectedVisitSummary.payments.map((p) => (
                          <div key={p.payments_id} className="p-4 flex items-start justify-between">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{p.payment_methods_name || 'نقدي'}</div>
                              <div className="text-sm text-gray-700 mt-1">المبلغ: <span className="font-bold">{parseFloat(p.payments_amount || 0).toLocaleString('en-US')} {symbol}</span></div>
                              <div className="text-xs text-gray-500 mt-1">التاريخ: {new Date(p.payments_date).toLocaleString('en-US')}</div>
                            </div>
                            <div className="text-xs text-gray-500 ml-4">#{p.payments_id}</div>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-gray-500">لا توجد مدفوعات</div>
                      )}
                    </div>
                  </div>

                  {/* Documents */}
                  <div className="rounded-lg border border-gray-200 bg-white">
                    <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2 text-gray-800">
                      <DocumentIcon className="h-5 w-5 text-gray-600" />
                      <h3 className="font-semibold">المستندات ({selectedVisitSummary?.documents?.length || 0})</h3>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {selectedVisitSummary?.documents?.length > 0 ? (
                        selectedVisitSummary.documents.map((d) => (
                          <div key={d.client_document_id || d.client_documents_id} className="p-4 flex items-start justify-between">
                            <div className="pr-1">
                              <div className="text-sm font-medium text-gray-900">{d.document_type_name || 'مستند'}</div>
                              <div className="text-sm text-gray-700 mt-1">{d.client_document_title || 'بدون عنوان'}</div>
                              <div className="text-xs text-gray-500 mt-1">رفعه: {d.uploaded_by_name}</div>
                              {d.client_document_file_path && (
                                <button
                                  onClick={() => {
                                    const path = d.client_document_file_path;
                                    const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(path.split('?')[0]);
                                    if (isImage) {
                                      setImagePreview({ open: true, src: path, title: d.client_document_title || d.document_type_name || 'صورة' });
                                    } else {
                                      window.open(path, '_blank');
                                    }
                                  }}
                                  className="mt-2 inline-flex items-center gap-1 px-2 py-1 border border-gray-300 text-xs text-gray-700 rounded hover:bg-gray-50"
                                >
                                  <EyeIcon className="h-4 w-4" />
                                  فتح
                                </button>
                              )}
                            </div>
                            <div className="text-left text-xs text-gray-500 whitespace-nowrap ml-4">
                              {new Date(d.client_document_created_at).toLocaleString('en-US')}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-gray-500">لا توجد مستندات</div>
                      )}
                      {imagePreview?.open && (
                        <ImagePreviewModal
                          open={imagePreview.open}
                          src={imagePreview.src}
                          title={imagePreview.title}
                          downloadName={imagePreview.title}
                          onClose={() => setImagePreview({ open: false, src: null, title: '' })}
                        />
                      )}
                    </div>
                  </div>

                  {/* Returns */}
                  <div className="rounded-lg border border-gray-200 bg-white">
                    <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2 text-gray-800">
                      <ArrowUturnLeftIcon className="h-5 w-5 text-gray-600" />
                      <h3 className="font-semibold">المرتجعات ({selectedVisitSummary?.returns?.length || 0})</h3>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {selectedVisitSummary?.returns?.length > 0 ? (
                        selectedVisitSummary.returns.map((r) => (
                          <div key={r.returns_id} className="p-4 flex items-start justify-between">
                            <div>
                              <div className="text-sm font-semibold text-gray-900">مرتجع #{r.returns_id}</div>
                              <div className="text-sm text-gray-700 mt-1">الإجمالي: <span className="font-bold">{parseFloat(r.returns_total_amount || r.sales_returns_total_amount || 0).toLocaleString('en-US')} {symbol}</span></div>
                              {r.returns_reason && <div className="text-xs text-gray-500 mt-1">السبب: {r.returns_reason}</div>}
                              <div className="text-xs text-gray-500 mt-1">التاريخ: {new Date(r.returns_created_at || r.sales_returns_created_at).toLocaleString('en-US')}</div>
                            </div>
                            <span className="ml-4 px-2 py-1 rounded border border-gray-300 text-xs text-gray-700">{r.returns_status || 'Draft'}</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-gray-500">لا توجد مرتجعات</div>
                      )}
                    </div>
                  </div>

                  {/* Activities - moved to bottom */}
                  <div className="rounded-lg border border-gray-200 bg-white">
                    <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2 text-gray-800">
                      <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-600" />
                      <h3 className="font-semibold">الأنشطة ({selectedVisitSummary?.activities?.length || 0})</h3>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {selectedVisitSummary?.activities?.length > 0 ? (
                        selectedVisitSummary.activities.map((a) => (
                          <div key={a.activity_id} className="p-4 flex items-start justify-between">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{getActivityTypeName(a.activity_type)}</div>
                              <div className="text-sm text-gray-600 mt-1">{a.activity_description}</div>
                              <div className="text-xs text-gray-500 mt-1">بواسطة: {a.user_name}</div>
                            </div>
                            <div className="text-left text-xs text-gray-500 whitespace-nowrap ml-4">
                              {new Date(a.activity_timestamp).toLocaleString('en-US')}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-gray-500">لا توجد أنشطة</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-200 bg-white flex justify-between items-center text-sm text-gray-600">
              <div>آخر تحديث: {new Date(selectedVisit.visits_updated_at).toLocaleString('en-US')}</div>
              <button onClick={() => setSelectedVisit(null)} className="px-4 py-1.5 rounded border border-gray-300 hover:bg-gray-50 text-gray-800">إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailsTab;
