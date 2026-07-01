// src/components/dashboard/tabs/visit-plans-management/CalendarTab.jsx
import React, { useState, useEffect } from "react";
import { getAllVisitPlans } from "../../../../apis/visitPlans.js";
import { getAllUsers } from "../../../../apis/users.js";
import Loader from "../../../common/Loader/Loader.jsx";
import Alert from "../../../common/Alert/Alert.jsx";
import CustomPageHeader from "../../../common/CustomPageHeader/CustomPageHeader.jsx";
import FilterBar from "../../../common/FilterBar/FilterBar.jsx";
import {
  CalendarDaysIcon,
  UserIcon,
  UsersIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";
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
  subMonths,
} from "date-fns";
import arEG from "date-fns/locale/ar-EG";
import {
  visitPlanPageWrapperClass,
  visitPlanPageIconClass,
  visitPlanStatCardClass,
  visitPlanInputClass,
  visitPlanPrimaryBtnClass,
  getPlanStatusMeta,
  normalizePlanStatus,
} from "./visitPlansManagementUi.js";

const DATE_RANGE_OPTIONS = [
  { value: "current-month", label: "الشهر الحالي" },
  { value: "next-month", label: "الشهر القادم" },
  { value: "custom", label: "نطاق مخصص" },
];

function parsePlanDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getPlanClientCount(plan) {
  return plan.clients_count ?? plan.clients?.length ?? 0;
}

function CalendarTab() {
  const [visitPlans, setVisitPlans] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());

  const [selectedRepresentative, setSelectedRepresentative] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [showOnlyActivePlans, setShowOnlyActivePlans] = useState(true);
  const [dateRangeFilter, setDateRangeFilter] = useState("current-month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [plansData, usersData] = await Promise.all([
        getAllVisitPlans(),
        getAllUsers(),
      ]);
      setVisitPlans(plansData || []);
      setUsers(usersData || []);
    } catch (err) {
      setError(err.message || "فشل في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const getUserName = (userId) => {
    const user = users.find((u) => u.users_id === userId);
    return user ? user.users_name : "غير محدد";
  };

  const convertJSDateToSchemaDay = (jsDay) => {
    const mapping = {
      0: 2,
      1: 3,
      2: 4,
      3: 5,
      4: 6,
      5: 7,
      6: 1,
    };
    return mapping[jsDay];
  };

  const getFilteredPlans = () => {
    return visitPlans.filter((plan) => {
      const planStatus = normalizePlanStatus(plan.visit_plan_status);

      if (showOnlyActivePlans && planStatus !== "active") return false;
      if (
        selectedStatus &&
        planStatus !== normalizePlanStatus(selectedStatus)
      ) {
        return false;
      }

      if (
        selectedRepresentative &&
        plan.user_id.toString() !== selectedRepresentative
      ) {
        return false;
      }

      const planStartDate = parsePlanDate(plan.visit_plan_start_date);
      const planEndDate = parsePlanDate(plan.visit_plan_end_date);
      if (!planStartDate || !planEndDate) return false;

      if (dateRangeFilter === "current-month") {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        if (planEndDate < monthStart || planStartDate > monthEnd) return false;
      } else if (dateRangeFilter === "next-month") {
        const nextMonth = addMonths(currentDate, 1);
        const monthStart = startOfMonth(nextMonth);
        const monthEnd = endOfMonth(nextMonth);
        if (planEndDate < monthStart || planStartDate > monthEnd) return false;
      } else if (
        dateRangeFilter === "custom" &&
        customStartDate &&
        customEndDate
      ) {
        const filterStart = parsePlanDate(customStartDate);
        const filterEnd = parsePlanDate(customEndDate);
        if (!filterStart || !filterEnd) return false;
        if (planEndDate < filterStart || planStartDate > filterEnd) return false;
      }

      return true;
    });
  };

  const getPlansForDate = (date) => {
    const jsDay = date.getDay();
    const schemaDay = convertJSDateToSchemaDay(jsDay);

    return getFilteredPlans().filter((plan) => {
      const normalizeDate = (d) => {
        const normalized = new Date(d);
        normalized.setHours(0, 0, 0, 0);
        return normalized;
      };

      const startDate = parsePlanDate(plan.visit_plan_start_date);
      const endDate = parsePlanDate(plan.visit_plan_end_date);
      if (!startDate || !endDate) return false;

      const normalizedStart = normalizeDate(startDate);
      const normalizedEnd = normalizeDate(endDate);
      const currentDay = normalizeDate(date);

      if (currentDay < normalizedStart || currentDay > normalizedEnd) {
        return false;
      }

      let selectedDays = plan.visit_plan_selected_days;
      if (typeof selectedDays === "string") {
        try {
          selectedDays = JSON.parse(selectedDays);
        } catch {
          return false;
        }
      }

      if (
        !selectedDays ||
        !Array.isArray(selectedDays) ||
        !selectedDays.includes(schemaDay)
      ) {
        return false;
      }

      const repeatEvery = parseInt(plan.visit_plan_repeat_every, 10) || 1;
      let firstOccurrence = new Date(normalizedStart);
      const targetJsDay = jsDay;
      const startJsDay = normalizedStart.getDay();
      const daysUntilFirst = (targetJsDay - startJsDay + 7) % 7;
      firstOccurrence.setDate(firstOccurrence.getDate() + daysUntilFirst);
      firstOccurrence = normalizeDate(firstOccurrence);

      if (currentDay < firstOccurrence) return false;

      const daysDiff = Math.floor(
        (currentDay - firstOccurrence) / (1000 * 60 * 60 * 24),
      );
      const weeksDiff = Math.floor(daysDiff / 7);

      return weeksDiff % repeatEvery === 0;
    });
  };

  const clearFilters = () => {
    setSelectedRepresentative("");
    setSelectedStatus("");
    setShowOnlyActivePlans(true);
    setDateRangeFilter("current-month");
    setCustomStartDate("");
    setCustomEndDate("");
  };

  const goToPreviousMonth = () => setCurrentDate((prev) => subMonths(prev, 1));
  const goToNextMonth = () => setCurrentDate((prev) => addMonths(prev, 1));
  const goToToday = () => setCurrentDate(new Date());

  const generateCalendarDays = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 6 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 6 });

    const days = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  };

  if (loading) return <Loader />;
  if (error) return <Alert type="error" message={error} />;

  const calendarDays = generateCalendarDays();
  const filteredPlans = getFilteredPlans();
  const totalClients = filteredPlans.reduce(
    (total, plan) => total + getPlanClientCount(plan),
    0,
  );

  const hasActiveFilters =
    selectedRepresentative ||
    selectedStatus ||
    !showOnlyActivePlans ||
    dateRangeFilter !== "current-month" ||
    customStartDate ||
    customEndDate;

  const activeFilterChips = [];
  if (selectedRepresentative) {
    activeFilterChips.push({
      key: "representative",
      label: "المندوب",
      value:
        users.find((u) => u.users_id.toString() === selectedRepresentative)
          ?.users_name || selectedRepresentative,
      tone: "blue",
      onRemove: () => setSelectedRepresentative(""),
    });
  }
  if (selectedStatus) {
    activeFilterChips.push({
      key: "status",
      label: "الحالة",
      value: getPlanStatusMeta(selectedStatus).label,
      tone: "green",
      onRemove: () => setSelectedStatus(""),
    });
  }
  if (dateRangeFilter === "next-month") {
    activeFilterChips.push({
      key: "dateRange",
      label: "نطاق التاريخ",
      value: "الشهر القادم",
      tone: "yellow",
      onRemove: () => setDateRangeFilter("current-month"),
    });
  }
  if (dateRangeFilter === "custom" && customStartDate && customEndDate) {
    activeFilterChips.push({
      key: "customDate",
      label: "نطاق التاريخ",
      value: `${format(new Date(customStartDate), "dd/MM/yyyy")} - ${format(new Date(customEndDate), "dd/MM/yyyy")}`,
      tone: "pink",
      onRemove: () => {
        setDateRangeFilter("current-month");
        setCustomStartDate("");
        setCustomEndDate("");
      },
    });
  }
  if (!showOnlyActivePlans) {
    activeFilterChips.push({
      key: "showAll",
      label: "عرض الكل",
      value: "جميع الحالات",
      tone: "gray",
      onRemove: () => setShowOnlyActivePlans(true),
    });
  }

  return (
    <div className={visitPlanPageWrapperClass} dir="rtl">
      <CustomPageHeader
        color="purple"
        title="تقويم الزيارات"
        subtitle="عرض خطط الزيارات حسب الأيام والمندوبين"
        icon={<CalendarDaysIcon className={visitPlanPageIconClass} />}
        statValue={filteredPlans.length}
        statLabel="خطة زيارة"
      />

      {/* Month navigation toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl border border-[#EDE7FF] p-3 sm:p-4 shadow-sm">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={goToPreviousMonth}
            className="p-2 rounded-xl border border-[#EDE7FF] text-[#8B5FD6] hover:bg-[#F8F5FF] transition-colors"
            aria-label="الشهر السابق"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
          <h2 className="text-base sm:text-xl font-bold text-[#2D1B69] min-w-[140px] sm:min-w-[220px] text-center px-2">
            {format(currentDate, "MMMM yyyy", { locale: arEG })}
          </h2>
          <button
            type="button"
            onClick={goToNextMonth}
            className="p-2 rounded-xl border border-[#EDE7FF] text-[#8B5FD6] hover:bg-[#F8F5FF] transition-colors"
            aria-label="الشهر التالي"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
        </div>
        <button type="button" onClick={goToToday} className={visitPlanPrimaryBtnClass}>
          <CalendarDaysIcon className="w-4 h-4" />
          اليوم
        </button>
      </div>

      <FilterBar
        title="فلاتر العرض"
        selectFilters={[
          {
            key: "representative",
            value: selectedRepresentative,
            onChange: setSelectedRepresentative,
            options: [
              { value: "", label: "جميع المندوبين" },
              ...users.map((user) => ({
                value: user.users_id.toString(),
                label: user.users_name,
              })),
            ],
            placeholder: "جميع المندوبين",
          },
          {
            key: "status",
            value: selectedStatus,
            onChange: setSelectedStatus,
            options: [
              { value: "", label: "جميع الحالات" },
              { value: "active", label: "نشطة" },
              { value: "draft", label: "مسودة" },
              { value: "completed", label: "مكتملة" },
              { value: "paused", label: "متوقفة" },
            ],
            placeholder: "جميع الحالات",
          },
        ]}
        activeChips={activeFilterChips}
        onClearAll={hasActiveFilters ? clearFilters : null}
      >
        <div className="mt-4 pt-4 border-t border-[#EDE7FF] space-y-4">
          <div>
            <p className="text-sm font-semibold text-[#2D1B69] mb-2">
              نطاق العرض
            </p>
            <div className="flex flex-wrap gap-2">
              {DATE_RANGE_OPTIONS.map((option) => {
                const isActive = dateRangeFilter === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDateRangeFilter(option.value)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-gradient-to-l from-[#8B5FD6] to-[#6B45B0] text-white shadow-md"
                        : "bg-white border border-[#EDE7FF] text-gray-600 hover:border-[#C4A8F0] hover:text-[#8B5FD6]"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {dateRangeFilter === "custom" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تاريخ البداية
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className={visitPlanInputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تاريخ النهاية
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className={visitPlanInputClass}
                />
              </div>
            </div>
          )}

          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showOnlyActivePlans}
              onChange={(e) => setShowOnlyActivePlans(e.target.checked)}
              className="w-4 h-4 rounded border-[#C4A8F0] text-[#8B5FD6] focus:ring-[#8B5FD6]"
            />
            <span className="text-sm text-gray-700">عرض الخطط النشطة فقط</span>
          </label>
        </div>
      </FilterBar>

      {/* Calendar grid */}
      <div className="overflow-x-auto rounded-2xl shadow-sm border border-[#EDE7FF]">
        <div className="min-w-[560px] bg-white rounded-2xl overflow-hidden">
          <div className="grid grid-cols-7 bg-gradient-to-l from-[#F8F5FF] to-[#EDE7FF] border-b border-[#EDE7FF]">
            {[
              ["السبت", "س"],
              ["الأحد", "ح"],
              ["الاثنين", "ن"],
              ["الثلاثاء", "ث"],
              ["الأربعاء", "ر"],
              ["الخميس", "خ"],
              ["الجمعة", "ج"],
            ].map(([full, short]) => (
              <div
                key={full}
                className="p-2 sm:p-3 text-center text-xs sm:text-sm font-bold text-[#2D1B69] border-l border-[#EDE7FF] last:border-l-0"
              >
                <span className="hidden sm:inline">{full}</span>
                <span className="sm:hidden">{short}</span>
              </div>
            ))}
          </div>

          {filteredPlans.length === 0 && (
            <div className="p-8 sm:p-12 text-center border-b border-[#EDE7FF] bg-[#FAFAFE]">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-[#EDE7FF] flex items-center justify-center mb-3">
                <CalendarDaysIcon className="h-7 w-7 text-[#8B5FD6]" />
              </div>
              <h3 className="text-lg font-bold text-[#2D1B69]">
                لا توجد خطط زيارة لعرضها
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {hasActiveFilters
                  ? "لا توجد خطط تطابق الفلاتر المحددة"
                  : "لا توجد خطط زيارة متاحة"}
              </p>
            </div>
          )}

          <div className="grid grid-cols-7">
            {calendarDays.map((day) => {
              const plansForDay = getPlansForDate(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[88px] sm:min-h-[128px] p-1.5 sm:p-2 border-b border-l border-[#EDE7FF] last:border-l-0 transition-colors ${
                    !isCurrentMonth
                      ? "bg-[#FAFAFE] text-gray-400"
                      : "bg-white hover:bg-[#FDFCFF]"
                  } ${isToday ? "bg-[#F8F5FF] ring-1 ring-inset ring-[#8B5FD6]/40" : ""}`}
                >
                  <div className="text-right mb-1">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 text-xs sm:text-sm font-semibold rounded-full ${
                        isToday
                          ? "bg-gradient-to-l from-[#8B5FD6] to-[#6B45B0] text-white shadow-sm"
                          : isCurrentMonth
                            ? "text-[#2D1B69]"
                            : "text-gray-400"
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {plansForDay.map((plan) => {
                      const statusMeta = getPlanStatusMeta(plan.visit_plan_status);
                      return (
                        <div
                          key={plan.visit_plan_id}
                          className={`border rounded-xl p-1.5 sm:p-2 text-xs shadow-sm hover:shadow-md transition-all ${statusMeta.card}`}
                        >
                          <div
                            className="font-bold mb-1 truncate"
                            title={plan.visit_plan_name}
                          >
                            {plan.visit_plan_name}
                          </div>

                          <div className="hidden sm:flex items-center gap-1 opacity-80 mb-1">
                            <UserIcon className="w-3 h-3 shrink-0" />
                            <span className="truncate" title={getUserName(plan.user_id)}>
                              {getUserName(plan.user_id)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1 opacity-80">
                              <UsersIcon className="w-3 h-3 shrink-0" />
                              <span>{getPlanClientCount(plan)}</span>
                            </div>
                            <span
                              className={`hidden sm:inline text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusMeta.badge}`}
                            >
                              {statusMeta.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            icon: CalendarDaysIcon,
            iconBg: "bg-[#EDE7FF]",
            iconColor: "text-[#8B5FD6]",
            label: "خطط الزيارة المعروضة",
            value: filteredPlans.length,
          },
          {
            icon: UsersIcon,
            iconBg: "bg-green-100",
            iconColor: "text-green-600",
            label: "إجمالي العملاء المخصصين",
            value: totalClients,
          },
          {
            icon: UserIcon,
            iconBg: "bg-purple-100",
            iconColor: "text-purple-600",
            label: "المندوبين النشطين",
            value: new Set(filteredPlans.map((plan) => plan.user_id)).size,
          },
          {
            icon: AdjustmentsHorizontalIcon,
            iconBg: "bg-orange-100",
            iconColor: "text-orange-600",
            label: "متوسط العملاء لكل خطة",
            value:
              filteredPlans.length > 0
                ? Math.round(totalClients / filteredPlans.length)
                : 0,
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={visitPlanStatCardClass}>
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 ${stat.iconBg} rounded-xl flex items-center justify-center shrink-0`}
                >
                  <Icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm text-gray-600 truncate">
                    {stat.label}
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-[#2D1B69]">
                    {stat.value}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="bg-white rounded-2xl border border-[#EDE7FF] p-4 sm:p-5 shadow-sm">
        <h4 className="font-bold text-[#2D1B69] mb-3">دليل الألوان والحالات</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h5 className="text-sm font-semibold text-gray-700">حالات الأيام</h5>
            <div className="flex flex-wrap gap-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gradient-to-l from-[#8B5FD6] to-[#6B45B0]" />
                <span>اليوم الحالي</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[#FAFAFE] border border-[#EDE7FF]" />
                <span>أيام خارج الشهر</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h5 className="text-sm font-semibold text-gray-700">حالات الخطط</h5>
            <div className="flex flex-wrap gap-3 text-sm text-gray-600">
              {["active", "draft", "completed", "paused"].map((status) => {
                const meta = getPlanStatusMeta(status);
                return (
                  <div key={status} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded border ${meta.card}`} />
                    <span>{meta.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CalendarTab;
