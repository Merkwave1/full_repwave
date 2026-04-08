import React, { useState, useEffect } from 'react';
import { 
  MapPinIcon, 
  ClockIcon, 
  DevicePhoneMobileIcon, 
  BoltIcon,
  UserIcon,
  EyeIcon,
  MapIcon
} from '@heroicons/react/24/outline';
import CustomPageHeader from '../../../../../common/CustomPageHeader/CustomPageHeader.jsx';
import GlobalTable from '../../../../../common/GlobalTable/GlobalTable.jsx';
import LocationMapModal from '../../../../../common/LocationMapModal/LocationMapModal.jsx';
import MultiLocationMapModal from '../../../../../common/MultiLocationMapModal/MultiLocationMapModal.jsx';
import RouteMapModal from '../../../../../common/RouteMapModal/RouteMapModal.jsx';
import Loader from '../../../../../common/Loader/Loader.jsx';
import Modal from '../../../../../common/Modal/Modal.jsx';
import { 
  getRepresentativesLastLocation,
  getRepLocationHistory,
  getAllRepresentativesAttendance
} from '../../../../../../apis/representative_attendance.js';

const LocationTrackingTab = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [locationData, setLocationData] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showMultiMapModal, setShowMultiMapModal] = useState(false);
  const [showRouteMapModal, setShowRouteMapModal] = useState(false);
  
  // Details modal state
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRep, setSelectedRep] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Date range tab state
  const [selectedDateTab, setSelectedDateTab] = useState('24h'); // '24h', 'week', 'month', 'custom', 'workday'
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [showWorkdayModal, setShowWorkdayModal] = useState(false);
  const [workdayList, setWorkdayList] = useState([]);
  const [loadingWorkdays, setLoadingWorkdays] = useState(false);
  
  // Date range for history - removed old states
  const getDateRangeForTab = (tab) => {
    const now = new Date();
    let from, to;
    
    switch (tab) {
      case '24h':
        from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        to = now;
        break;
      case 'week':
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        to = now;
        break;
      case 'month':
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        to = now;
        break;
      case 'custom':
        return {
          from: customDateFrom || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          to: customDateTo || now.toISOString().split('T')[0]
        };
      default:
        from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        to = now;
    }
    
    // Return ISO string format for datetime comparison
    return {
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0]
    };
  };

  // Load last location data
  useEffect(() => {
    loadLocationData();
  }, []);

  const loadLocationData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await getRepresentativesLastLocation();
      setLocationData(response.items || []);
    } catch (err) {
      console.error('Error loading location data:', err);
      setError(err.message || 'حدث خطأ في تحميل بيانات المواقع');
    } finally {
      setLoading(false);
    }
  };

  const loadLocationHistory = async (userId, dateTab = '24h', workdayData = null) => {
    setHistoryLoading(true);
    
    try {
      let params = {
        userId,
        page: 1,
        limit: 100
      };
      
      // For workday tab, use start and end times from selected workday
      if (dateTab === 'workday' && workdayData) {
        params.startDate = workdayData.shift_start_time;
        params.endDate = workdayData.shift_end_time || new Date().toISOString();
      }
      // For preset tabs (24h, week, month), use time_range parameter
      // For custom tab, use date range
      else if (dateTab === 'custom') {
        const dateRange = getDateRangeForTab(dateTab);
        params.startDate = dateRange.from;
        params.endDate = dateRange.to;
      } else {
        // Use time_range parameter for API to handle datetime filtering
        params.timeRange = dateTab; // '24h', 'week', or 'month'
      }
      
      const response = await getRepLocationHistory(params);
      
      setLocationHistory(response.items || []);
    } catch (err) {
      console.error('Error loading location history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Load list of workdays for the selected representative
  const loadWorkdayList = async (userId) => {
    setLoadingWorkdays(true);
    try {
      const response = await getAllRepresentativesAttendance({
        userId,
        page: 1,
        limit: 30
      });
      setWorkdayList(response.items || []);
    } catch (err) {
      console.error('Error loading workday list:', err);
      setWorkdayList([]);
    } finally {
      setLoadingWorkdays(false);
    }
  };

  const handleWorkdaySelect = async (workday) => {
    setShowWorkdayModal(false);
    setSelectedDateTab('workday');
    if (selectedRep) {
      await loadLocationHistory(selectedRep.user_id, 'workday', workday);
    }
  };

  const handleShowLocation = (location) => {
    setSelectedLocation(location);
    setShowMapModal(true);
  };

  const handleShowDetails = async (rep) => {
    setSelectedRep(rep);
    setShowDetailsModal(true);
    setSelectedDateTab('24h'); // Reset to default
    await loadLocationHistory(rep.user_id, '24h');
  };

  const handleCloseDetails = () => {
    setShowDetailsModal(false);
    setSelectedRep(null);
    setLocationHistory([]);
    setSelectedDateTab('24h');
    setCustomDateFrom('');
    setCustomDateTo('');
  };

  const handleDateTabChange = async (tab) => {
    if (tab === 'workday') {
      // Load workdays and show modal
      if (selectedRep) {
        await loadWorkdayList(selectedRep.user_id);
        setShowWorkdayModal(true);
      }
    } else {
      setSelectedDateTab(tab);
      if (selectedRep) {
        loadLocationHistory(selectedRep.user_id, tab);
      }
    }
  };

  const handleCustomDateSearch = () => {
    if (selectedRep) {
      loadLocationHistory(selectedRep.user_id, 'custom');
    }
  };

  // Format date to Arabic
  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '-';
    const date = new Date(dateTimeStr);
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Calculate time ago in Arabic
  const getTimeAgo = (dateTimeStr) => {
    if (!dateTimeStr) return '-';
    
    const now = new Date();
    const past = new Date(dateTimeStr);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    return `منذ ${diffDays} يوم`;
  };

  // Get battery color
  const getBatteryColor = (level) => {
    if (!level) return 'text-gray-400';
    if (level >= 50) return 'text-green-600';
    if (level >= 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get clock icon color based on time difference
  const getClockColor = (dateTimeStr) => {
    if (!dateTimeStr) return 'text-gray-300';
    
    const now = new Date();
    const past = new Date(dateTimeStr);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    // More than 1 day: light gray
    if (diffDays >= 1) return 'text-gray-300';
    
    // 1 hour to 1 day (< 24 hours): red
    if (diffMins >= 60) return 'text-red-500';
    
    // 10 minutes to 1 hour: green gradient (light to dark)
    if (diffMins >= 10) {
      const ratio = (diffMins - 10) / 50; // 0 to 1 over 50 minutes
      if (ratio < 0.25) return 'text-green-300'; // light green
      if (ratio < 0.5) return 'text-green-400';
      if (ratio < 0.75) return 'text-green-500';
      return 'text-green-600'; // dark green
    }
    
    // 0-10 minutes: light green
    return 'text-green-300';
  };

  const columns = [
    {
      key: 'users_name',
      title: 'المستخدم',
      sortable: true,
      render: (row) => (
        <div className="flex items-center">
          <UserIcon className="h-5 w-5 text-blue-500 ml-2" />
          <div>
            <div className="font-medium text-gray-900">{row.users_name}</div>
            <div className="text-sm text-gray-500">{row.users_email}</div>
            {row.users_role === 'store_keeper' && (
              <div className="text-xs text-purple-600 font-medium mt-0.5">📦 أمين مخزن</div>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'tracking_time',
      title: 'آخر تحديث',
      sortable: true,
      render: (row) => (
        <div className="flex items-center">
          <ClockIcon className={`h-4 w-4 ml-2 ${getClockColor(row.tracking_time)}`} />
          <div>
            <div className="text-sm font-medium">{getTimeAgo(row.tracking_time)}</div>
            <div className="text-xs text-gray-500">{formatDateTime(row.tracking_time)}</div>
          </div>
        </div>
      )
    },
    {
      key: 'battery_level',
      title: 'البطارية',
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center">
          <BoltIcon className={`h-5 w-5 ml-1 ${getBatteryColor(row.battery_level)}`} />
          <span className={`font-medium ${getBatteryColor(row.battery_level)}`}>
            {row.battery_level ? `${row.battery_level}%` : '-'}
          </span>
        </div>
      )
    },
    {
      key: 'phone_info',
      title: 'الجهاز',
      render: (row) => (
        <div className="flex items-center">
          <DevicePhoneMobileIcon className="h-4 w-4 text-gray-400 ml-2" />
          <span className="text-sm text-gray-700">{row.phone_info || '-'}</span>
        </div>
      )
    },
    {
      key: 'actions',
      title: 'الإجراءات',
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => handleShowLocation({
              latitude: row.latitude,
              longitude: row.longitude,
              title: `موقع ${row.users_role === 'store_keeper' ? 'أمين المخزن' : 'المندوب'}: ${row.users_name}`,
              description: `آخر تحديث: ${getTimeAgo(row.tracking_time)}`
            })}
            className="flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
          >
            <MapPinIcon className="h-4 w-4 ml-1" />
            عرض الموقع
          </button>
          <button
            onClick={() => handleShowDetails(row)}
            className="flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
          >
            <EyeIcon className="h-4 w-4 ml-1" />
            التفاصيل
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <CustomPageHeader
        title="آخر موقع للمندوبين"
        subtitle="عرض آخر موقع مسجل لكل مندوب مع معلومات البطارية والجهاز"
        icon={<MapPinIcon className="h-8 w-8 text-white" />}
        statValue={locationData.length}
        statLabel="مندوب نشط"
      />

      {/* Map View Button */}
      {!loading && locationData.length > 0 && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowMultiMapModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md font-medium"
          >
            <MapIcon className="h-5 w-5" />
            عرض الخريطة
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center text-red-600">
          {error}
        </div>
      ) : (
        <GlobalTable
          data={locationData}
          columns={columns}
          emptyMessage="لا توجد بيانات موقع متاحة"
        />
      )}

      {/* Location Map Modal */}
      {showMapModal && selectedLocation && (
        <LocationMapModal
          isOpen={showMapModal}
          onClose={() => setShowMapModal(false)}
          latitude={selectedLocation.latitude}
          longitude={selectedLocation.longitude}
          title={selectedLocation.title}
          description={selectedLocation.description}
          readOnly
        />
      )}

      {/* Location History Details Modal */}
      {showDetailsModal && selectedRep && (
        <Modal
          isOpen={showDetailsModal}
          onClose={handleCloseDetails}
          title={`سجل مواقع ${selectedRep.users_name}`}
          size="xlarge"
          actions={
            <button
              onClick={() => setShowRouteMapModal(true)}
              disabled={locationHistory.length < 2}
              className="px-5 py-2.5 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed text-blue-600 disabled:text-gray-400 rounded-lg transition-colors font-bold flex items-center gap-2 shadow-sm border-2 border-white/20"
              title="عرض مسار الحركة على الخريطة"
            >
              <MapIcon className="h-5 w-5" />
              عرض المسار على الخريطة
            </button>
          }
        >
          <div className="space-y-4">
            {/* Rep Info - Enhanced */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <UserIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-blue-600 font-medium mb-1">المندوب</div>
                    <div className="font-bold text-gray-800 text-sm">{selectedRep.users_name}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <DevicePhoneMobileIcon className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-purple-600 font-medium mb-1">الجهاز</div>
                    <div className="font-bold text-gray-800 text-sm truncate">{selectedRep.phone_info || '-'}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <ClockIcon className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-green-600 font-medium mb-1">آخر تحديث</div>
                    <div className="font-bold text-gray-800 text-sm">{getTimeAgo(selectedRep.tracking_time)}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <BoltIcon className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-amber-600 font-medium mb-1">البطارية</div>
                    <div className={`font-bold text-sm ${getBatteryColor(selectedRep.battery_level)}`}>
                      {selectedRep.battery_level ? `${selectedRep.battery_level}%` : '-'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Date Range Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
              <button
                onClick={() => handleDateTabChange('24h')}
                className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                  selectedDateTab === '24h'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                آخر 24 ساعة
              </button>
              <button
                onClick={() => handleDateTabChange('week')}
                className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                  selectedDateTab === 'week'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                آخر أسبوع
              </button>
              <button
                onClick={() => handleDateTabChange('month')}
                className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                  selectedDateTab === 'month'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                آخر شهر
              </button>
              <button
                onClick={() => handleDateTabChange('custom')}
                className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                  selectedDateTab === 'custom'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                مدة محددة
              </button>
              <button
                onClick={() => handleDateTabChange('workday')}
                className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                  selectedDateTab === 'workday'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                سجلات يوم عمل محدد
              </button>
            </div>

            {/* Custom Date Range (shown only when custom tab is selected) */}
            {selectedDateTab === 'custom' && (
              <div className="flex gap-4 items-end bg-blue-50 p-4 rounded-lg">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    من تاريخ
                  </label>
                  <input
                    type="date"
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    إلى تاريخ
                  </label>
                  <input
                    type="date"
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleCustomDateSearch}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  بحث
                </button>
              </div>
            )}

            {/* Location History Table */}
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <Loader />
              </div>
            ) : locationHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                لا توجد سجلات مواقع في هذه الفترة
              </div>
            ) : (
              <div className="overflow-x-auto max-h-96 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        الوقت
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        البطارية
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        الموقع
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {locationHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          {formatDateTime(item.tracking_time)}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className={`font-medium ${getBatteryColor(item.battery_level)}`}>
                            {item.battery_level ? `${item.battery_level}%` : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleShowLocation({
                              latitude: item.latitude,
                              longitude: item.longitude,
                              title: `موقع في ${formatDateTime(item.tracking_time)}`,
                              description: `البطارية: ${item.battery_level || '-'}%`
                            })}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            <MapPinIcon className="h-4 w-4 inline ml-1" />
                            عرض
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="text-center py-2 text-xs text-gray-500 bg-gray-50 sticky bottom-0">
                  عرض {locationHistory.length} سجل (الحد الأقصى 100)
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Multi-Location Map Modal */}
      {showMultiMapModal && (
        <MultiLocationMapModal
          isOpen={showMultiMapModal}
          onClose={() => setShowMultiMapModal(false)}
          locations={locationData}
          title="خريطة مواقع جميع المستخدمين"
          onRefresh={loadLocationData}
        />
      )}

      {/* Route Map Modal */}
      {showRouteMapModal && selectedRep && (
        <RouteMapModal
          isOpen={showRouteMapModal}
          onClose={() => setShowRouteMapModal(false)}
          locations={locationHistory}
          repName={selectedRep.users_name}
          onRefresh={() => loadLocationHistory(selectedRep.user_id, selectedDateTab)}
        />
      )}

      {/* Workday Selection Modal */}
      {showWorkdayModal && selectedRep && (
        <Modal
          isOpen={showWorkdayModal}
          onClose={() => setShowWorkdayModal(false)}
          title="اختر يوم العمل"
        >
          <div className="p-4">
            {loadingWorkdays ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : workdayList.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                لا توجد أيام عمل مسجلة
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                {workdayList.map((workday) => {
                  // Parse the date correctly from attendance_date
                  const attendanceDate = workday.attendance_date || workday.date;
                  const formattedDate = attendanceDate ? 
                    new Date(attendanceDate + 'T00:00:00').toLocaleDateString('ar-EG', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : 'تاريخ غير متوفر';
                  
                  // Extract time from datetime strings
                  const startTime = workday.shift_start_time ? 
                    workday.shift_start_time.split(' ')[1]?.substring(0, 5) || workday.shift_start_time.substring(11, 16) : null;
                  const endTime = workday.shift_end_time ? 
                    workday.shift_end_time.split(' ')[1]?.substring(0, 5) || workday.shift_end_time.substring(11, 16) : null;
                  
                  return (
                    <button
                      key={workday.attendance_id || workday.id}
                      onClick={() => handleWorkdaySelect(workday)}
                      className="w-full p-3 text-right bg-white hover:bg-blue-50 border border-gray-200 rounded-lg transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {formattedDate}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {startTime && endTime ? (
                              <>
                                من {startTime} إلى {endTime}
                              </>
                            ) : startTime ? (
                              <>من {startTime}</>
                            ) : (
                              'لا توجد مواعيد محددة'
                            )}
                          </div>
                        </div>
                        <div className="mr-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            workday.attendance_status === 'ClockedOut' ? 'bg-blue-100 text-blue-800' :
                            workday.attendance_status === 'Paused' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {workday.attendance_status === 'ClockedOut' ? 'تسجيل خروج' :
                             workday.attendance_status === 'Paused' ? 'متوقف' :
                             'تسجيل دخول'}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default LocationTrackingTab;

