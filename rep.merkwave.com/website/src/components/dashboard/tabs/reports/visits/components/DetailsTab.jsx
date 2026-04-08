import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 
  MapPinIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  PlayCircleIcon,
  UserIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from '@heroicons/react/24/outline';
import Loader from '../../../../../common/Loader/Loader.jsx';
import Alert from '../../../../../common/Alert/Alert.jsx';
import SearchableSelect from '../../../../../common/SearchableSelect/SearchableSelect.jsx';
import { getVisitsDetails } from '../../../../../../apis/visits.js';
import { getRepresentatives } from '../../../../../../apis/users.js';
import { getAllClientAreaTags } from '../../../../../../apis/client_area_tags.js';

const DetailsTab = ({ data }) => {
  // UI state
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [repId, setRepId] = useState('');
  const [areaTagId, setAreaTagId] = useState('');

  // pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  // data loading
  const [rows, setRows] = useState(Array.isArray(data) ? data : []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // refs to avoid race conditions
  const lastQueryRef = useRef('');

  // support provided data prop as initial fallback; fetch server-side when filters/page change
  const fetchDetails = async () => {
    setLoading(true);
    setError(null);
    const queryKey = JSON.stringify({ page, perPage, searchTerm, statusFilter, dateFrom, dateTo, repId, areaTagId });
    lastQueryRef.current = queryKey;
    try {
      const result = await getVisitsDetails({
        page,
        perPage,
        search: searchTerm,
        status: statusFilter,
        dateFrom,
        dateTo,
        repId,
        areaTagId,
      });
      // Expect either { items:[], total } or { details:[], total } or array
      const items = result?.items ?? result?.details ?? (Array.isArray(result) ? result : []);
      const totalCount = result?.total ?? result?.count ?? (Array.isArray(items) ? items.length : 0);
      // Apply only if still latest
      if (lastQueryRef.current === queryKey) {
        setRows(items);
        setTotal(totalCount);
      }
    } catch (err) {
      console.error('Failed to load visit details:', err);
      setError(err.message || 'فشل تحميل تفاصيل الزيارات');
      // fallback to provided data if available
      if (Array.isArray(data) && data.length && page === 1) {
        setRows(data);
        setTotal(data.length);
      }
    } finally {
      if (lastQueryRef.current === queryKey) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage]);

  // apply filters triggers page reset then fetch
  const applyFilters = () => {
    setPage(1);
    fetchDetails();
  };

  // local computed when backend doesn't paginate
  const pagedRows = useMemo(() => {
    if (!Array.isArray(rows)) return [];
    // If backend returned total > items length and perPage exists, trust server-side
    if (total > rows.length || rows.length <= perPage) return rows;
    const start = (page - 1) * perPage;
    return rows.slice(start, start + perPage);
  }, [rows, page, perPage, total]);

  const totalPages = useMemo(() => {
    if (total > 0) return Math.max(1, Math.ceil(total / perPage));
    const count = Array.isArray(rows) ? rows.length : 0;
    return Math.max(1, Math.ceil(count / perPage));
  }, [total, rows, perPage]);

  // lookup lists
  const [representatives, setRepresentatives] = useState([]);
  const [areaTags, setAreaTags] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const [reps, tags] = await Promise.all([
          getRepresentatives().catch(() => []),
          getAllClientAreaTags().catch(() => []),
        ]);
        setRepresentatives(Array.isArray(reps) ? reps : []);
        setAreaTags(Array.isArray(tags) ? tags : []);
      } catch {
        // ignore
      }
    })();
  }, []);

  const repOptions = useMemo(() => representatives.map(r => ({ value: String(r.users_id || r.id), label: r.users_name || r.name || r.username })), [representatives]);
  const areaTagOptions = useMemo(() => areaTags.map(t => ({ value: String(t.client_area_tags_id || t.id), label: t.client_area_tags_name || t.name })), [areaTags]);

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Started': { label: 'جارية', color: 'bg-yellow-100 text-yellow-800', icon: PlayCircleIcon },
      'Completed': { label: 'مكتملة', color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
      'Cancelled': { label: 'ملغاة', color: 'bg-red-100 text-red-800', icon: XCircleIcon }
    };
    
    const config = statusConfig[status] || statusConfig['Started'];
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3 ml-1" />
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'غير محدد';
    return new Date(dateString).toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (minutes) => {
  if (minutes === null || minutes === undefined) return '1د';
  const num = Number(minutes);
  if (Number.isNaN(num) || num < 1) return '1د';
    const hours = Math.floor(num / 60);
    const mins = num % 60;
    if (hours > 0) return `${hours}س ${mins}د`;
    return `${mins}د`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <h2 className="text-xl font-semibold text-gray-900">تفاصيل الزيارات</h2>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="البحث في الزيارات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="all">جميع الحالات</option>
            <option value="Started">جارية</option>
            <option value="Completed">مكتملة</option>
            <option value="Cancelled">ملغاة</option>
          </select>

          {/* Representative */}
          <div className="w-full sm:w-64">
            <SearchableSelect options={repOptions} value={repId} onChange={setRepId} placeholder="اختر مندوب" />
          </div>
          {/* Area Tag */}
          <div className="w-full sm:w-64">
            <SearchableSelect options={areaTagOptions} value={areaTagId} onChange={setAreaTagId} placeholder="اختر منطقة" />
          </div>
          {/* Date from/to */}
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg" />
          <button onClick={applyFilters} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">تطبيق</button>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-600">
        عرض {Array.isArray(rows) ? rows.length : 0} من أصل {total || (Array.isArray(rows) ? rows.length : 0)} زيارة
      </div>

      {/* Visits List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading && <Loader className="mt-6" />}
        {error && <Alert type="error" message={error} className="m-4" />}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  العميل
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المندوب
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  وقت البداية
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  وقت النهاية
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  المدة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الأنشطة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  العمليات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pagedRows.map((visit) => (
                <tr key={visit.visits_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <BuildingOfficeIcon className="h-5 w-5 text-gray-400 ml-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {visit.clients_company_name || 'غير محدد'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {visit.clients_contact_name || 'لا يوجد اسم اتصال'}
                        </div>
                        {visit.client_area_tag_name && (
                          <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded mt-1 inline-block">
                            {visit.client_area_tag_name}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <UserIcon className="h-5 w-5 text-gray-400 ml-3" />
                      <div className="text-sm text-gray-900">{visit.rep_name || 'غير محدد'}</div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(visit.visits_start_time)}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(visit.visits_end_time)}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <ClockIcon className="h-4 w-4 text-gray-400 ml-2" />
                      <span className="text-sm text-gray-900">
                        {formatDuration(visit.visit_duration_minutes)}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(visit.visits_status)}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex space-x-4 space-x-reverse">
                      <span className="flex items-center">
                        <ChatBubbleLeftRightIcon className="h-4 w-4 text-blue-500 ml-1" />
                        {visit.activities_count || 0}
                      </span>
                      <span className="flex items-center">
                        <DocumentTextIcon className="h-4 w-4 text-green-500 ml-1" />
                        {visit.orders_count || 0}
                      </span>
                      <span className="flex items-center">
                        <CurrencyDollarIcon className="h-4 w-4 text-yellow-500 ml-1" />
                        {visit.payments_count || 0}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setSelectedVisit(visit)}
                      className="text-green-600 hover:text-green-900 transition-colors"
                    >
                      عرض التفاصيل
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {(pagedRows.length === 0 && !loading) && (
          <div className="text-center py-12 text-gray-500">
            لا توجد زيارات تطابق المعايير المحددة
          </div>
        )}
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-gray-600">صفحة {page} من {totalPages}</div>
        <div className="flex items-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(1)} className="p-2 border rounded disabled:opacity-50"><ChevronDoubleRightIcon className="h-4 w-4" /></button>
          <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="p-2 border rounded disabled:opacity-50"><ChevronRightIcon className="h-4 w-4" /></button>
          <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} className="px-2 py-1 border rounded">
            {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n} / الصفحة</option>)}
          </select>
          <button disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="p-2 border rounded disabled:opacity-50"><ChevronLeftIcon className="h-4 w-4" /></button>
          <button disabled={page === totalPages} onClick={() => setPage(totalPages)} className="p-2 border rounded disabled:opacity-50"><ChevronDoubleLeftIcon className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Visit Details Modal */}
      {selectedVisit && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">تفاصيل الزيارة</h3>
                <button
                  onClick={() => setSelectedVisit(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">العميل</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedVisit.clients_company_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">المندوب</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedVisit.rep_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">الحالة</label>
                    <div className="mt-1">{getStatusBadge(selectedVisit.visits_status)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">المدة</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDuration(selectedVisit.visit_duration_minutes)}</p>
                  </div>
                </div>
                
                {selectedVisit.visits_purpose && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">الهدف من الزيارة</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedVisit.visits_purpose}</p>
                  </div>
                )}
                
                {selectedVisit.visits_outcome && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">نتيجة الزيارة</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedVisit.visits_outcome}</p>
                  </div>
                )}
                
                {selectedVisit.visits_notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ملاحظات</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedVisit.visits_notes}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{selectedVisit.activities_count || 0}</div>
                    <div className="text-xs text-gray-500">أنشطة</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{selectedVisit.orders_count || 0}</div>
                    <div className="text-xs text-gray-500">طلبات</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{selectedVisit.payments_count || 0}</div>
                    <div className="text-xs text-gray-500">مدفوعات</div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setSelectedVisit(null)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailsTab;
