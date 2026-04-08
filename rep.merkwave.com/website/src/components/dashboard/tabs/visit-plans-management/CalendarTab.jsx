// src/components/dashboard/tabs/visit-plans-management/CalendarTab.jsx
import React, { useState, useEffect } from 'react';
import { getAllVisitPlans } from '../../../../apis/visitPlans.js';
import { getAllUsers } from '../../../../apis/users.js';
import Loader from '../../../common/Loader/Loader.jsx';
import Alert from '../../../common/Alert/Alert.jsx';
import Button from '../../../common/Button/Button.jsx';
import NumberInput from '../../../common/NumberInput/NumberInput.jsx';
import SearchableSelect from '../../../common/SearchableSelect/SearchableSelect.jsx';
import CustomPageHeader from '../../../common/CustomPageHeader/CustomPageHeader.jsx';
import FilterBar from '../../../common/FilterBar/FilterBar.jsx';
import { 
  CalendarDaysIcon, 
  UserIcon, 
  UsersIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths 
} from 'date-fns';
import arEG from 'date-fns/locale/ar-EG';

function CalendarTab() {
  const [visitPlans, setVisitPlans] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Filter states
  const [selectedRepresentative, setSelectedRepresentative] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showOnlyActivePlans, setShowOnlyActivePlans] = useState(true);
  const [dateRangeFilter, setDateRangeFilter] = useState('current-month'); // current-month, next-month, custom
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [plansData, usersData] = await Promise.all([
        getAllVisitPlans(),
        getAllUsers()
      ]);
      setVisitPlans(plansData || []);
      setUsers(usersData || []);
    } catch (err) {
      setError(err.message || 'فشل في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  // Helper: Get user name by ID
  const getUserName = (userId) => {
    const user = users.find(u => u.users_id === userId);
    return user ? user.users_name : 'غير محدد';
  };

  // Helper: Convert JavaScript day (0-6) to schema day (1-7)
  // JavaScript: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
  // Schema: 1=Saturday, 2=Sunday, 3=Monday, 4=Tuesday, 5=Wednesday, 6=Thursday, 7=Friday
  const convertJSDateToSchemaDay = (jsDay) => {
    const mapping = {
      0: 2, // Sunday -> 2
      1: 3, // Monday -> 3
      2: 4, // Tuesday -> 4
      3: 5, // Wednesday -> 5
      4: 6, // Thursday -> 6
      5: 7, // Friday -> 7
      6: 1  // Saturday -> 1
    };
    return mapping[jsDay];
  };

  // Helper: Get plans for a specific date with filters applied
  const getPlansForDate = (date) => {
    const jsDay = date.getDay(); // JavaScript day (0-6)
    const schemaDay = convertJSDateToSchemaDay(jsDay); // Convert to schema day (1-7)
    
    return getFilteredPlans().filter(plan => {
      // Normalize dates to remove time components for accurate comparison
      const normalizeDate = (d) => {
        const normalized = new Date(d);
        normalized.setHours(0, 0, 0, 0);
        return normalized;
      };
      
      // Check if the date is within the plan's date range
      const startDate = normalizeDate(plan.visit_plan_start_date);
      const endDate = normalizeDate(plan.visit_plan_end_date);
      const currentDate = normalizeDate(date);
      
      if (currentDate < startDate || currentDate > endDate) return false;
      
      // Check if this day is included in the plan's selected days
      let selectedDays = plan.visit_plan_selected_days;
      
      // If it's a string, parse it as JSON
      if (typeof selectedDays === 'string') {
        try {
          selectedDays = JSON.parse(selectedDays);
        } catch (error) {
          console.error('Error parsing selected days:', error, selectedDays);
          return false;
        }
      }
      
      // Check if selectedDays is an array and includes the schema day
      if (!selectedDays || !Array.isArray(selectedDays) || !selectedDays.includes(schemaDay)) {
        return false;
      }
      
      // Check weekly recurrence interval (visit_plan_repeat_every)
      const repeatEvery = parseInt(plan.visit_plan_repeat_every) || 1;
      
      // Find the first occurrence of this day of week after (or on) the start date
      let firstOccurrence = new Date(startDate);
      const targetJsDay = jsDay;
      const startJsDay = startDate.getDay();
      
      // Calculate days until first occurrence
      let daysUntilFirst = (targetJsDay - startJsDay + 7) % 7;
      firstOccurrence.setDate(firstOccurrence.getDate() + daysUntilFirst);
      
      // Normalize first occurrence date
      firstOccurrence = normalizeDate(firstOccurrence);
      
      // If current date is before the first occurrence, don't show it
      if (currentDate < firstOccurrence) {
        return false;
      }
      
      // Calculate number of weeks between first occurrence and current date
      const daysDiff = Math.floor((currentDate - firstOccurrence) / (1000 * 60 * 60 * 24));
      const weeksDiff = Math.floor(daysDiff / 7);
      
      // Check if this week should have a visit based on the repeat interval
      // If repeatEvery = 1, visit every week (weeksDiff % 1 = 0 always)
      // If repeatEvery = 2, visit every 2 weeks (weeksDiff % 2 = 0, 2, 4, ...)
      // If repeatEvery = 3, visit every 3 weeks (weeksDiff % 3 = 0, 3, 6, ...)
      if (weeksDiff % repeatEvery !== 0) {
        return false;
      }
      
      return true;
    });
  };

  // Apply filters to visit plans
  const getFilteredPlans = () => {
    return visitPlans.filter(plan => {
      // Status filter
      if (showOnlyActivePlans && plan.visit_plan_status !== 'Active') return false;
      if (selectedStatus && plan.visit_plan_status !== selectedStatus) return false;
      
      // Representative filter
      if (selectedRepresentative && plan.user_id.toString() !== selectedRepresentative) return false;
      
      // Date range filter
      const planStartDate = new Date(plan.visit_plan_start_date);
      const planEndDate = new Date(plan.visit_plan_end_date);
      
      if (dateRangeFilter === 'current-month') {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        // Plan should overlap with current month
        if (planEndDate < monthStart || planStartDate > monthEnd) return false;
      } else if (dateRangeFilter === 'next-month') {
        const nextMonth = addMonths(currentDate, 1);
        const monthStart = startOfMonth(nextMonth);
        const monthEnd = endOfMonth(nextMonth);
        if (planEndDate < monthStart || planStartDate > monthEnd) return false;
      } else if (dateRangeFilter === 'custom' && customStartDate && customEndDate) {
        const filterStart = new Date(customStartDate);
        const filterEnd = new Date(customEndDate);
        if (planEndDate < filterStart || planStartDate > filterEnd) return false;
      }
      
      return true;
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedRepresentative('');
    setSelectedStatus('');
    setShowOnlyActivePlans(true);
    setDateRangeFilter('current-month');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 6 }); // Saturday
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 6 });

    const days = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  };  if (loading) return <Loader />;
  if (error) return <Alert type="error" message={error} />;

  const calendarDays = generateCalendarDays();
  const filteredPlans = getFilteredPlans();

  const hasActiveFilters = selectedRepresentative || selectedStatus || !showOnlyActivePlans || 
    dateRangeFilter !== 'current-month' || customStartDate || customEndDate;

  const activeFilterChips = [];
  if (selectedRepresentative) {
    activeFilterChips.push({
      key: 'representative',
      label: 'المندوب',
      value: users.find(u => u.users_id.toString() === selectedRepresentative)?.users_name || selectedRepresentative,
      tone: 'blue',
      onRemove: () => setSelectedRepresentative(''),
    });
  }
  if (selectedStatus) {
    activeFilterChips.push({
      key: 'status',
      label: 'الحالة',
      value: selectedStatus === 'Active' ? 'نشطة' : selectedStatus === 'Draft' ? 'مسودة' : 
             selectedStatus === 'Completed' ? 'مكتملة' : 'متوقفة',
      tone: 'green',
      onRemove: () => setSelectedStatus(''),
    });
  }
  if (dateRangeFilter === 'next-month') {
    activeFilterChips.push({
      key: 'dateRange',
      label: 'نطاق التاريخ',
      value: 'الشهر القادم',
      tone: 'yellow',
      onRemove: () => setDateRangeFilter('current-month'),
    });
  }
  if (dateRangeFilter === 'custom' && customStartDate && customEndDate) {
    activeFilterChips.push({
      key: 'customDate',
      label: 'نطاق التاريخ',
      value: `${format(new Date(customStartDate), 'dd/MM/yyyy')} - ${format(new Date(customEndDate), 'dd/MM/yyyy')}`,
      tone: 'pink',
      onRemove: () => {
        setDateRangeFilter('current-month');
        setCustomStartDate('');
        setCustomEndDate('');
      },
    });
  }
  if (!showOnlyActivePlans) {
    activeFilterChips.push({
      key: 'showAll',
      label: 'عرض الكل',
      value: 'جميع الحالات',
      tone: 'gray',
      onRemove: () => setShowOnlyActivePlans(true),
    });
  }

  return (
    <div className="space-y-6" dir="rtl">
      <CustomPageHeader
        title="تقويم الزيارات"
        subtitle="عرض وإدارة خطط الزيارات حسب التواريخ"
        icon={<CalendarDaysIcon className="w-7 h-7 text-white" />}
        statValue={filteredPlans.length}
        statLabel="خطة زيارة"
        actionButton={[
          <button
            key="today"
            type="button"
            onClick={goToToday}
            className="bg-white text-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors font-bold"
          >
            اليوم
          </button>,
          <div key="navigation" className="flex items-center gap-2">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors text-white"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
            <h4 className="text-xl font-bold text-white min-w-[200px] text-center">
              {format(currentDate, 'MMMM yyyy', { locale: arEG })}
            </h4>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors text-white"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
          </div>
        ]}
      />

      {/* Filters Section */}
      <FilterBar
        title="فلاتر العرض"
        selectFilters={[
          {
            key: 'representative',
            value: selectedRepresentative,
            onChange: setSelectedRepresentative,
            options: [
              { value: '', label: 'جميع المندوبين' },
              ...users.map(user => ({ value: user.users_id.toString(), label: user.users_name }))
            ],
            placeholder: 'جميع المندوبين',
          },
          {
            key: 'status',
            value: selectedStatus,
            onChange: setSelectedStatus,
            options: [
              { value: '', label: 'جميع الحالات' },
              { value: 'Active', label: 'نشطة' },
              { value: 'Draft', label: 'مسودة' },
              { value: 'Completed', label: 'مكتملة' },
              { value: 'Paused', label: 'متوقفة' },
            ],
            placeholder: 'جميع الحالات',
          },

        ]}
        activeChips={activeFilterChips}
        onClearAll={hasActiveFilters ? clearFilters : null}
      >
        {/* Custom Date Range */}
        {dateRangeFilter === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ البداية</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ النهاية</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Filter Actions */}
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="showOnlyActive"
                checked={showOnlyActivePlans}
                onChange={(e) => setShowOnlyActivePlans(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="showOnlyActive" className="mr-2 text-sm text-gray-700">
                عرض الخطط النشطة فقط
              </label>
            </div>
          </div>
        </div>
      </FilterBar>

      {/* Calendar */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200">
        {/* Calendar Header */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'].map((day) => (
            <div key={day} className="p-4 text-center font-semibold text-gray-700 border-l border-gray-200 last:border-l-0">
              {day}
            </div>
          ))}
        </div>

        {/* No Plans Message */}
        {filteredPlans.length === 0 && (
          <div className="p-12 text-center border-b border-gray-200">
            <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-semibold text-gray-700">لا توجد خطط زيارة لعرضها</h3>
            <p className="mt-1 text-sm text-gray-500">
              {(selectedRepresentative || selectedStatus || dateRangeFilter !== 'current-month')
                ? 'لا توجد خطط تطابق الفلاتر المحددة'
                : 'لا توجد خطط زيارة متاحة'}
            </p>
          </div>
        )}

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 overflow-hidden">
          {calendarDays.map((day) => {
            const plansForDay = getPlansForDate(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());
            
            return (
              <div
                key={day.toISOString()}
                className={`min-h-[120px] p-2 border-b border-l border-gray-200 last:border-l-0 ${
                  !isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'
                } ${isToday ? 'bg-blue-50 ring-2 ring-blue-400' : ''}`}
              >
                {/* Day Number */}
                <div className={`text-right mb-2 ${isToday ? 'font-bold text-blue-600' : ''}`}>
                  <span className={`inline-block w-8 h-8 text-center leading-8 rounded-full ${
                    isToday ? 'bg-blue-600 text-white' : ''
                  }`}>
                    {format(day, 'd')}
                  </span>
                </div>

                {/* Visit Plans for this day */}
                <div className="space-y-1">
                  {plansForDay.map((plan) => (
                    <div
                      key={plan.visit_plan_id}
                      className={`border rounded-lg p-2 text-xs shadow-sm hover:shadow-md transition-shadow ${
                        plan.visit_plan_status === 'Active' 
                          ? 'bg-gradient-to-r from-blue-100 to-indigo-100 border-blue-200'
                          : plan.visit_plan_status === 'Draft'
                          ? 'bg-gradient-to-r from-yellow-100 to-orange-100 border-yellow-200'
                          : plan.visit_plan_status === 'Completed'
                          ? 'bg-gradient-to-r from-green-100 to-emerald-100 border-green-200'
                          : 'bg-gradient-to-r from-gray-100 to-slate-100 border-gray-200'
                      }`}
                    >
                      <div className={`font-semibold mb-1 truncate ${
                        plan.visit_plan_status === 'Active' ? 'text-blue-800' :
                        plan.visit_plan_status === 'Draft' ? 'text-yellow-800' :
                        plan.visit_plan_status === 'Completed' ? 'text-green-800' : 'text-gray-800'
                      }`} title={plan.visit_plan_name}>
                        {plan.visit_plan_name}
                      </div>
                      
                      <div className="flex items-center gap-1 text-gray-600 mb-1">
                        <UserIcon className="w-3 h-3" />
                        <span className="truncate" title={getUserName(plan.user_id)}>
                          {getUserName(plan.user_id)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-gray-600">
                          <UsersIcon className="w-3 h-3" />
                          <span>
                            {plan.clients_count || 0}
                          </span>
                        </div>
                        <div className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          plan.visit_plan_status === 'Active' ? 'bg-green-100 text-green-700' :
                          plan.visit_plan_status === 'Draft' ? 'bg-yellow-100 text-yellow-700' :
                          plan.visit_plan_status === 'Completed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {plan.visit_plan_status === 'Active' ? 'نشطة' :
                           plan.visit_plan_status === 'Draft' ? 'مسودة' :
                           plan.visit_plan_status === 'Completed' ? 'مكتملة' : 'متوقفة'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-3">دليل الألوان والحالات:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-gray-700">حالات الأيام:</h5>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-50 border-2 border-blue-400 rounded"></div>
                <span>اليوم الحالي</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded"></div>
                <span>أيام الشهر السابق/التالي</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-gray-700">حالات الخطط:</h5>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-200 rounded"></div>
                <span>نشطة</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gradient-to-r from-yellow-100 to-orange-100 border border-yellow-200 rounded"></div>
                <span>مسودة</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gradient-to-r from-green-100 to-emerald-100 border border-green-200 rounded"></div>
                <span>مكتملة</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gradient-to-r from-gray-100 to-slate-100 border border-gray-200 rounded"></div>
                <span>متوقفة</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <CalendarDaysIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">خطط الزيارة المعروضة</div>
              <div className="text-2xl font-bold text-gray-800">
                {filteredPlans.length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <UsersIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">إجمالي العملاء المخصصين</div>
              <div className="text-2xl font-bold text-gray-800">
                {filteredPlans.reduce((total, plan) => total + (plan.clients_count || 0), 0)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">المندوبين النشطين</div>
              <div className="text-2xl font-bold text-gray-800">
                {new Set(filteredPlans.map(plan => plan.user_id)).size}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <AdjustmentsHorizontalIcon className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">متوسط العملاء لكل خطة</div>
              <div className="text-2xl font-bold text-gray-800">
                {filteredPlans.length > 0 ? 
                  Math.round(filteredPlans.reduce((total, plan) => total + (plan.clients_count || 0), 0) / filteredPlans.length) 
                  : 0}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CalendarTab;
