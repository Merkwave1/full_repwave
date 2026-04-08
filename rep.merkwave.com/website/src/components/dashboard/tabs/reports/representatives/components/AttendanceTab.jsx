import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CalendarDaysIcon,
  ClockIcon,
  MapPinIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  PrinterIcon,
  XMarkIcon,
  PlayCircleIcon,
  PauseCircleIcon
} from '@heroicons/react/24/outline';
import CustomPageHeader from '../../../../../common/CustomPageHeader/CustomPageHeader.jsx';
import FilterBar from '../../../../../common/FilterBar/FilterBar.jsx';
import GlobalTable from '../../../../../common/GlobalTable/GlobalTable.jsx';
import Modal from '../../../../../common/Modal/Modal.jsx';
import PaginationHeaderFooter from '../../../../../common/PaginationHeaderFooter/PaginationHeaderFooter.jsx';
import { getCachedEntityData } from '../../../../../../utils/entityCache.js';
import { getAllRepresentativesAttendance, getBreakLogs } from '../../../../../../apis/representative_attendance';
import PrintableTable from '../../../../../common/PrintableTable/PrintableTable';

// Date Range Picker Component (similar to SalesOrdersTab)
const DateRangePicker = ({ dateFrom, dateTo, onChange, onClear }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const getDisplayText = () => {
    if (!dateFrom && !dateTo) return 'اختر فترة التاريخ';
    if (dateFrom && dateTo) return `${formatDateForDisplay(dateFrom)} - ${formatDateForDisplay(dateTo)}`;
    if (dateFrom) return `من ${formatDateForDisplay(dateFrom)}`;
    if (dateTo) return `إلى ${formatDateForDisplay(dateTo)}`;
    return 'اختر فترة التاريخ';
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm cursor-pointer bg-white hover:border-gray-400 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
      >
        <div className="flex items-center justify-between">
          <span className={`text-sm ${(!dateFrom && !dateTo) ? 'text-gray-500' : 'text-gray-900'}`}>{getDisplayText()}</span>
          <div className="flex items-center gap-2">
            {(dateFrom || dateTo) && (
              <button type="button" onClick={(e)=>{ e.stopPropagation(); onClear(); }} className="text-gray-400 hover:text-gray-600">
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
              <input type="date" value={dateFrom} onChange={(e)=>onChange(e.target.value, dateTo)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label>
              <input type="date" value={dateTo} onChange={(e)=>onChange(dateFrom, e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setIsOpen(false)} className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">تطبيق</button>
              <button type="button" onClick={() => { onClear(); setIsOpen(false); }} className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500">مسح</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function AttendanceTab({ representatives = [] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [breakLogs, setBreakLogs] = useState([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filter states
  const [selectedRep, setSelectedRep] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  // Get users from localStorage
  const getUsers = useCallback(() => {
    try {
      const cachedUsers = getCachedEntityData('users');
      if (cachedUsers && Array.isArray(cachedUsers)) {
        return cachedUsers.filter(u => u.users_role === 'rep' && u.users_status === 1);
      }
    } catch (error) {
      console.error('Error getting users from cache:', error);
    }
    return representatives || [];
  }, [representatives]);

  // Load attendance data with pagination
  useEffect(() => {
    loadAttendanceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRep, dateFrom, dateTo, selectedStatus, currentPage, itemsPerPage]);

  const loadAttendanceData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await getAllRepresentativesAttendance({
        userId: selectedRep || undefined,
        status: selectedStatus || undefined,
        startDate: dateFrom || undefined,
        endDate: dateTo || undefined,
        page: currentPage,
        limit: itemsPerPage
      });
      
      const items = response.items || [];
      
      setAttendanceData(items);
      
      // Update pagination info
      if (response.pagination) {
        setTotalRecords(response.pagination.total || 0);
        setTotalPages(response.pagination.total_pages || 1);
      } else {
        setTotalRecords(items.length);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Error loading attendance data:', err);
      setError(err.message || 'حدث خطأ في تحميل بيانات الحضور');
    } finally {
      setLoading(false);
    }
  };

  const handleShowDetails = async (attendance) => {
    setSelectedAttendance(attendance);
    
    // Load break logs
    if (attendance.attendance_id) {
      try {
        const logs = await getBreakLogs({ attendanceId: attendance.attendance_id });
        setBreakLogs(logs || []);
      } catch (err) {
        console.error('Error loading break logs:', err);
        setBreakLogs([]);
      }
    }
    
    setShowDetailsModal(true);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0 دقيقة';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours} ساعة ${minutes} دقيقة`;
    }
    return `${minutes} دقيقة`;
  };

  // Handler functions with useCallback
  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
  }, []);

  const handleRepChange = useCallback((value) => {
    setSelectedRep(value || '');
    setCurrentPage(1);
  }, []);

  const handleStatusChange = useCallback((value) => {
    setSelectedStatus(value || '');
    setCurrentPage(1);
  }, []);

  const handleDateRangeChange = useCallback((fromValue, toValue) => {
    setDateFrom(fromValue);
    setDateTo(toValue);
    setCurrentPage(1);
  }, []);

  const handleDateRangeClear = useCallback(() => {
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  }, []);

  // Options for dropdowns
  const representativeOptions = useMemo(() => {
    const users = getUsers();
    return [
      { value: '', label: 'جميع المندوبين' },
      ...users.map(rep => ({
        value: String(rep.users_id),
        label: rep.users_name
      }))
    ];
  }, [getUsers]);

  const statusOptions = useMemo(() => ([
    { value: '', label: 'جميع الحالات' },
    { value: 'ClockedIn', label: 'تسجيل دخول' },
    { value: 'Paused', label: 'متوقف' },
    { value: 'ClockedOut', label: 'تسجيل خروج' }
  ]), []);

  // Active filter chips
  const activeFilterChips = useMemo(() => {
    const chips = [];

    if (searchTerm) {
      chips.push({
        key: 'search',
        label: 'البحث',
        value: searchTerm,
        tone: 'blue',
        onRemove: () => handleSearchChange(''),
      });
    }

    if (selectedRep) {
      const user = getUsers().find(u => String(u.users_id) === String(selectedRep));
      chips.push({
        key: 'representative',
        label: 'المندوب',
        value: user?.users_name || selectedRep,
        tone: 'purple',
        onRemove: () => handleRepChange(''),
      });
    }

    if (selectedStatus) {
      const statusLabel = statusOptions.find(opt => opt.value === selectedStatus)?.label || selectedStatus;
      chips.push({
        key: 'status',
        label: 'الحالة',
        value: statusLabel,
        tone: 'green',
        onRemove: () => handleStatusChange(''),
      });
    }

    if (dateFrom || dateTo) {
      const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' });
      };
      
      let dateLabel = 'فترة التاريخ';
      let dateValue = '';
      if (dateFrom && dateTo) {
        dateValue = `${formatDate(dateFrom)} - ${formatDate(dateTo)}`;
      } else if (dateFrom) {
        dateValue = `من ${formatDate(dateFrom)}`;
      } else if (dateTo) {
        dateValue = `إلى ${formatDate(dateTo)}`;
      }
      
      chips.push({
        key: 'dateRange',
        label: dateLabel,
        value: dateValue,
        tone: 'orange',
        onRemove: handleDateRangeClear,
      });
    }

    return chips;
  }, [searchTerm, selectedRep, selectedStatus, dateFrom, dateTo, statusOptions, handleSearchChange, handleRepChange, handleStatusChange, handleDateRangeClear, getUsers]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSelectedRep('');
    setSelectedStatus('');
    setDateFrom(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setDateTo(new Date().toISOString().split('T')[0]);
    setSearchTerm('');
    setCurrentPage(1);
  }, []);

  const columns = [
    {
      key: 'attendance_date',
      title: 'التاريخ',
      sortable: true,
      render: (row) => (
        <div className="flex items-center">
          <CalendarDaysIcon className="h-4 w-4 text-gray-400 ml-2" />
          <span className="font-medium">{row.attendance_date || '-'}</span>
        </div>
      ),
      renderPrint: (row) => row.attendance_date || '-'
    },
    {
      key: 'user',
      title: 'المندوب',
      sortable: true,
      render: (row) => (
        <div className="flex items-center">
          <UserIcon className="h-4 w-4 text-blue-500 ml-2" />
          <span>{row.users_name || '-'}</span>
        </div>
      ),
      renderPrint: (row) => row.users_name || '-'
    },
    {
      key: 'shift_start_time',
      title: 'وقت البدء',
      render: (row) => (
        <div className="flex items-center">
          <PlayCircleIcon className="h-4 w-4 text-green-500 ml-2" />
          <span>{row.shift_start_time || '-'}</span>
        </div>
      ),
      renderPrint: (row) => row.shift_start_time || '-'
    },
    {
      key: 'shift_end_time',
      title: 'وقت الانتهاء',
      render: (row) => (
        <div className="flex items-center">
          <PauseCircleIcon className="h-4 w-4 text-red-500 ml-2" />
          <span>{row.shift_end_time || 'لم ينتهي بعد'}</span>
        </div>
      ),
      renderPrint: (row) => row.shift_end_time || 'لم ينتهي بعد'
    },
    {
      key: 'total_work_duration_sec',
      title: 'مدة العمل',
      render: (row) => (
        <span className="font-medium text-blue-600">
          {formatDuration(row.total_work_duration_sec)}
        </span>
      ),
      renderPrint: (row) => formatDuration(row.total_work_duration_sec)
    },
    {
      key: 'attendance_status',
      title: 'الحالة',
      render: (row) => {
        const statusMap = {
          ClockedIn: { label: 'تسجيل دخول', color: 'bg-green-100 text-green-800' },
          Paused: { label: 'متوقف', color: 'bg-yellow-100 text-yellow-800' },
          ClockedOut: { label: 'تسجيل خروج', color: 'bg-blue-100 text-blue-800' }
        };
        const status = statusMap[row.attendance_status] || { label: row.attendance_status, color: 'bg-gray-100 text-gray-800' };
        
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
            {status.label}
          </span>
        );
      },
      renderPrint: (row) => {
        const statusMap = {
          ClockedIn: 'تسجيل دخول',
          Paused: 'متوقف',
          ClockedOut: 'تسجيل خروج'
        };
        return statusMap[row.attendance_status] || row.attendance_status;
      }
    },
    {
      key: 'actions',
      title: 'الإجراءات',
      align: 'center',
      render: (row) => (
        <button
          onClick={() => handleShowDetails(row)}
          className="flex items-center justify-center px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
        >
          <ClockIcon className="h-4 w-4 ml-1" />
          التفاصيل
        </button>
      )
    }
  ];

  // Filter data by search term (client-side search)
  const filteredData = attendanceData.filter(item => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      (item.users_name?.toLowerCase().includes(search)) ||
      (item.attendance_date?.toLowerCase().includes(search))
    );
  });

  // Prepare metadata for print
  const getPrintMetadata = () => {
    const metadata = {};
    
    if (selectedRep) {
      const user = getUsers().find(u => String(u.users_id) === String(selectedRep));
      if (user) metadata['المندوب'] = user.users_name;
    }
    
    if (selectedStatus) {
      const statusMap = {
        ClockedIn: 'تسجيل دخول',
        Paused: 'متوقف',
        ClockedOut: 'تسجيل خروج'
      };
      metadata['الحالة'] = statusMap[selectedStatus] || selectedStatus;
    }
    
    if (dateFrom && dateTo) {
      metadata['من تاريخ'] = dateFrom;
      metadata['إلى تاريخ'] = dateTo;
    }
    
    return metadata;
  };

  return (
    <div className="p-6">
      {/* Header with Print Button */}
      <CustomPageHeader
        title="الحضور والانصراف"
        subtitle="سجلات حضور وانصراف المندوبين مع التفاصيل الكاملة"
        icon={<ClockIcon className="h-8 w-8 text-white" />}
        statValue={totalRecords}
        statLabel="سجل حضور"
        actionButton={(
          <PrintableTable
            data={filteredData}
            columns={columns.filter(col => col.key !== 'actions')}
            title="تقرير الحضور والانصراف"
            subtitle={`سجلات حضور وانصراف المندوبين من ${dateFrom} إلى ${dateTo}`}
            metadata={getPrintMetadata()}
            printButtonClassName="bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg font-bold"
          />
        )}
      />

      {/* Filter Bar */}
      <FilterBar
        title="أدوات البحث والفلاتر"
        searchConfig={{
          value: searchTerm,
          onChange: handleSearchChange,
          onClear: () => handleSearchChange(''),
          placeholder: 'ابحث عن مندوب أو تاريخ...',
          searchWhileTyping: true,
        }}
        selectFilters={[
          {
            key: 'representative',
            value: selectedRep,
            onChange: handleRepChange,
            options: representativeOptions,
            placeholder: 'المندوب',
          },
          {
            key: 'status',
            value: selectedStatus,
            onChange: handleStatusChange,
            options: statusOptions,
            placeholder: 'الحالة',
          },
        ]}
        dateRangeConfig={{
          from: dateFrom,
          to: dateTo,
          onChange: handleDateRangeChange,
          onClear: handleDateRangeClear
        }}
        activeChips={activeFilterChips}
        onClearAll={activeFilterChips.length ? clearFilters : null}
      />

      {/* Pagination Header */}
      <PaginationHeaderFooter
        total={totalRecords}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        loading={loading}
        onItemsPerPageChange={(newLimit) => {
          setItemsPerPage(newLimit);
          setCurrentPage(1);
        }}
        onFirst={() => setCurrentPage(1)}
        onPrev={() => setCurrentPage(prev => Math.max(1, prev - 1))}
        onNext={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
        onLast={() => setCurrentPage(totalPages)}
      />

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <GlobalTable
          data={filteredData}
          columns={columns}
          loading={loading}
          error={error}
          rowKey="attendance_id"
          searchTerm={searchTerm}
          emptyState={{
            icon: <ClockIcon className="h-12 w-12 text-gray-400" />,
            title: 'لا توجد سجلات حضور',
            description: 'لا توجد سجلات حضور متاحة للفترة المحددة'
          }}
          highlightOnHover={true}
        />
      </div>

      {/* Pagination Footer */}
      <PaginationHeaderFooter
        total={totalRecords}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        loading={loading}
        onItemsPerPageChange={(newLimit) => {
          setItemsPerPage(newLimit);
          setCurrentPage(1);
        }}
        onFirst={() => setCurrentPage(1)}
        onPrev={() => setCurrentPage(prev => Math.max(1, prev - 1))}
        onNext={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
        onLast={() => setCurrentPage(totalPages)}
      />

      {/* Details Modal */}
      {showDetailsModal && selectedAttendance && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedAttendance(null);
            setBreakLogs([]);
          }}
          title="تفاصيل الحضور"
          size="large"
        >
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المندوب</label>
                <p className="text-gray-900">{selectedAttendance.users_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
                <p className="text-gray-900">{selectedAttendance.attendance_date}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">وقت البدء</label>
                <p className="text-gray-900">{selectedAttendance.shift_start_time || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">وقت الانتهاء</label>
                <p className="text-gray-900">{selectedAttendance.shift_end_time || 'لم ينتهي بعد'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">مدة العمل الإجمالية</label>
                <p className="font-semibold text-blue-600">
                  {formatDuration(selectedAttendance.total_work_duration_sec)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                <p className="text-gray-900">{selectedAttendance.attendance_status}</p>
              </div>
            </div>

            {/* Location Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">معلومات الموقع</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">موقع البدء</label>
                  <p className="text-gray-900 text-sm">
                    {selectedAttendance.start_latitude && selectedAttendance.start_longitude
                      ? `${selectedAttendance.start_latitude}, ${selectedAttendance.start_longitude}`
                      : 'غير متوفر'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">موقع الانتهاء</label>
                  <p className="text-gray-900 text-sm">
                    {selectedAttendance.end_latitude && selectedAttendance.end_longitude
                      ? `${selectedAttendance.end_latitude}, ${selectedAttendance.end_longitude}`
                      : 'غير متوفر'}
                  </p>
                </div>
              </div>
            </div>

            {/* Break Logs */}
            {breakLogs.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">سجل فترات الاستراحة</h3>
                <div className="space-y-2">
                  {breakLogs.map((log, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 space-x-reverse">
                          <PauseCircleIcon className="h-5 w-5 text-yellow-500" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {log.break_start_time} - {log.break_end_time || 'مستمرة'}
                            </p>
                            {log.break_duration_sec && (
                              <p className="text-xs text-gray-600">
                                المدة: {formatDuration(log.break_duration_sec)}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          log.break_end_time 
                            ? 'bg-gray-100 text-gray-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {log.break_end_time ? 'منتهية' : 'مستمرة'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
