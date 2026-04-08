import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  UserGroupIcon,
  CubeIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { getOdooSyncLogs, getProductSyncLogs } from '../../../../../../apis/odoo.js';

const StatCard = ({ title, value, icon: Icon, color, subtext }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
        {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-full ${color.replace('text-', 'bg-').replace('-600', '-100')}`}>
        <Icon className={`h-8 w-8 ${color}`} />
      </div>
    </div>
  </div>
);

const MiniStatCard = ({ label, success, failed, total }) => (
  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
    <div className="text-xs text-gray-500 mb-1">{label}</div>
    <div className="flex items-center gap-3">
      <span className="text-lg font-bold text-gray-900">{total}</span>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-green-600">✓ {success}</span>
        <span className="text-red-600">✗ {failed}</span>
      </div>
    </div>
  </div>
);

const OverviewTab = ({ contactsStats: parentContactsStats, productsStats: parentProductsStats, onContactsStatsUpdate, onProductsStatsUpdate }) => {
  const [loading, setLoading] = useState(true);
  const [contactsStats, setContactsStats] = useState(parentContactsStats);
  const [productsStats, setProductsStats] = useState(parentProductsStats);

  useEffect(() => {
    fetchAllStats();
  }, []);

  const fetchAllStats = async () => {
    setLoading(true);
    try {
      // Fetch both stats in parallel
      const [contactsResult, productsResult] = await Promise.all([
        getOdooSyncLogs({ page: 1, perPage: 1 }),
        getProductSyncLogs({ page: 1, perPage: 1 })
      ]);

      const cStats = contactsResult.stats || {};
      const pStats = productsResult.stats || {};

      setContactsStats(cStats);
      setProductsStats(pStats);

      // Update parent state
      if (onContactsStatsUpdate) onContactsStatsUpdate(cStats);
      if (onProductsStatsUpdate) onProductsStatsUpdate(pStats);
    } catch (error) {
      console.error('Error fetching overview stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const totalOperations = (contactsStats?.total || 0) + (productsStats?.total_syncs || 0);
  const totalSuccess = (contactsStats?.successful || 0) + (productsStats?.successful_syncs || 0);
  const totalFailed = (contactsStats?.failed || 0) + (productsStats?.failed_syncs || 0);
  const overallSuccessRate = totalOperations > 0 
    ? ((totalSuccess / totalOperations) * 100).toFixed(1) 
    : 0;

  // Today's stats
  const todayContactsTotal = contactsStats?.today?.total || 0;
  const todayContactsSuccess = contactsStats?.today?.successful || 0;
  const todayContactsFailed = contactsStats?.today?.failed || 0;
  const todayProductsTotal = productsStats?.today?.total || 0;
  const todayProductsSuccess = productsStats?.today?.successful || 0;
  const todayProductsFailed = productsStats?.today?.failed || 0;
  const todayTotal = todayContactsTotal + todayProductsTotal;
  const todaySuccess = todayContactsSuccess + todayProductsSuccess;
  const todayFailed = todayContactsFailed + todayProductsFailed;

  // This month's stats
  const monthContactsTotal = contactsStats?.this_month?.total || 0;
  const monthContactsSuccess = contactsStats?.this_month?.successful || 0;
  const monthContactsFailed = contactsStats?.this_month?.failed || 0;
  const monthProductsTotal = productsStats?.this_month?.total || 0;
  const monthProductsSuccess = productsStats?.this_month?.successful || 0;
  const monthProductsFailed = productsStats?.this_month?.failed || 0;
  const monthTotal = monthContactsTotal + monthProductsTotal;
  const monthSuccess = monthContactsSuccess + monthProductsSuccess;
  const monthFailed = monthContactsFailed + monthProductsFailed;

  return (
    <div className="space-y-6">
      {/* Today & This Month Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CalendarIcon className="h-5 w-5 text-orange-500" />
            <h3 className="font-semibold text-gray-900">اليوم</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{todayTotal}</div>
              <div className="text-xs text-gray-500">إجمالي</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{todaySuccess}</div>
              <div className="text-xs text-gray-500">ناجح</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{todayFailed}</div>
              <div className="text-xs text-gray-500">فاشل</div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <MiniStatCard label="جهات الاتصال" total={todayContactsTotal} success={todayContactsSuccess} failed={todayContactsFailed} />
            <MiniStatCard label="المنتجات" total={todayProductsTotal} success={todayProductsSuccess} failed={todayProductsFailed} />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDaysIcon className="h-5 w-5 text-purple-500" />
            <h3 className="font-semibold text-gray-900">هذا الشهر</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{monthTotal}</div>
              <div className="text-xs text-gray-500">إجمالي</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{monthSuccess}</div>
              <div className="text-xs text-gray-500">ناجح</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{monthFailed}</div>
              <div className="text-xs text-gray-500">فاشل</div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <MiniStatCard label="جهات الاتصال" total={monthContactsTotal} success={monthContactsSuccess} failed={monthContactsFailed} />
            <MiniStatCard label="المنتجات" total={monthProductsTotal} success={monthProductsSuccess} failed={monthProductsFailed} />
          </div>
        </div>
      </div>

      {/* Overall Stats */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <ChartBarIcon className="h-5 w-5 text-blue-600" />
          إحصائيات عامة (الكل)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="إجمالي العمليات"
            value={totalOperations.toLocaleString()}
            icon={ArrowPathIcon}
            color="text-blue-600"
          />
          <StatCard
            title="العمليات الناجحة"
            value={totalSuccess.toLocaleString()}
            icon={CheckCircleIcon}
            color="text-green-600"
          />
          <StatCard
            title="العمليات الفاشلة"
            value={totalFailed.toLocaleString()}
            icon={XCircleIcon}
            color="text-red-600"
          />
          <StatCard
            title="معدل النجاح"
            value={`${overallSuccessRate}%`}
            icon={ArrowTrendingUpIcon}
            color="text-purple-600"
          />
        </div>
      </div>

      {/* Contacts Stats */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <UserGroupIcon className="h-5 w-5 text-indigo-600" />
          مزامنة جهات الاتصال (Contacts)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="إجمالي المزامنات"
            value={(contactsStats?.total || 0).toLocaleString()}
            icon={UserGroupIcon}
            color="text-indigo-600"
          />
          <StatCard
            title="ناجحة"
            value={(contactsStats?.successful || 0).toLocaleString()}
            icon={CheckCircleIcon}
            color="text-green-600"
          />
          <StatCard
            title="فاشلة"
            value={(contactsStats?.failed || 0).toLocaleString()}
            icon={XCircleIcon}
            color="text-red-600"
          />
          <StatCard
            title="معدل النجاح"
            value={`${contactsStats?.success_rate || 0}%`}
            icon={ArrowTrendingUpIcon}
            color="text-blue-600"
            subtext={contactsStats?.last_sync ? `آخر مزامنة: ${new Date(contactsStats.last_sync).toLocaleDateString('ar-EG')}` : null}
          />
        </div>
        
        {/* Contacts sync status summary */}
        {contactsStats && (contactsStats.synced_clients > 0 || contactsStats.unsynced_clients > 0) && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  عملاء مزامنين: {contactsStats.synced_clients || 0}
                </span>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <ClockIcon className="h-5 w-5 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">
                  في انتظار المزامنة: {contactsStats.unsynced_clients || 0}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Products Stats */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CubeIcon className="h-5 w-5 text-teal-600" />
          مزامنة المنتجات (Products)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="إجمالي المزامنات"
            value={(productsStats?.total_syncs || 0).toLocaleString()}
            icon={CubeIcon}
            color="text-teal-600"
          />
          <StatCard
            title="ناجحة"
            value={(productsStats?.successful_syncs || 0).toLocaleString()}
            icon={CheckCircleIcon}
            color="text-green-600"
          />
          <StatCard
            title="فاشلة"
            value={(productsStats?.failed_syncs || 0).toLocaleString()}
            icon={XCircleIcon}
            color="text-red-600"
          />
          <StatCard
            title="معدل النجاح"
            value={`${productsStats?.success_rate || 0}%`}
            icon={ArrowTrendingUpIcon}
            color="text-blue-600"
            subtext={productsStats?.last_sync ? `آخر مزامنة: ${new Date(productsStats.last_sync).toLocaleDateString('ar-EG')}` : null}
          />
        </div>
        
        {/* Products sync status summary */}
        {productsStats && (productsStats.synced_variants > 0 || productsStats.unsynced_variants > 0) && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  منتجات مزامنة: {productsStats.synced_variants || 0}
                </span>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <ClockIcon className="h-5 w-5 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">
                  في انتظار المزامنة: {productsStats.unsynced_variants || 0}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <ClockIcon className="h-5 w-5 text-gray-600" />
          ملخص النشاط
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">جهات الاتصال</h4>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">آخر مزامنة:</span>
              <span className="font-medium text-gray-900">
                {contactsStats?.last_sync 
                  ? new Date(contactsStats.last_sync).toLocaleString('ar-EG')
                  : 'لا توجد بيانات'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${contactsStats?.success_rate || 0}%` }}
              ></div>
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">المنتجات</h4>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">آخر مزامنة:</span>
              <span className="font-medium text-gray-900">
                {productsStats?.last_sync 
                  ? new Date(productsStats.last_sync).toLocaleString('ar-EG')
                  : 'لا توجد بيانات'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${productsStats?.success_rate || 0}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
