// src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import UsersTab from '../components/dashboard/tabs/users/UsersTab.jsx'; // Import the new UsersTab
import ReportsTab from '../components/dashboard/tabs/reports/ReportsTab.jsx';
import SettingsTab from '../components/dashboard/tabs/settings/SettingsTab.jsx';
import ProductManagementTab from '../components/dashboard/tabs/ProductManagementTab.jsx';
import AuthTestButton from '../components/common/AuthTestButton.jsx';
import ComprehensiveDashboard from '../components/dashboard/ComprehensiveDashboard.jsx'; // NEW
// Removed VersionSyncStatus
// Build dashboard home from existing tab APIs
import { getAllSalesOrders } from '../apis/sales_orders.js';
import { getPendingSalesOrders } from '../apis/sales_deliveries.js';
import { getAllSalesReturns } from '../apis/sales_returns.js';
import { formatCurrency } from '../utils/currency.js';
import {
  UserGroupIcon,
  CubeIcon,
  BuildingStorefrontIcon,
  ShoppingCartIcon,
  BanknotesIcon,
  MapPinIcon,
  ClipboardDocumentListIcon,
  CogIcon
} from '@heroicons/react/24/outline';

function HomeTabContent() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    invoices_30d_total: 0, // currency
    pending_deliveries: 0,
    returns_30d: 0,
    active_clients_30d: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [pendingDeliveries, setPendingDeliveries] = useState([]);
  const [recentReturns, setRecentReturns] = useState([]);
  const [topClients, setTopClients] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setLoading(true);
        // Fetch in parallel
        const [ordersData, pendingDeliveriesData, returnsData] = await Promise.all([
          getAllSalesOrders().catch(() => []),
          getPendingSalesOrders(true).catch(() => []),
          // last 30 days returns, limit 5 for list too
          getAllSalesReturns({ date_from: new Date(Date.now() - 30*24*60*60*1000).toISOString().slice(0,10), date_to: new Date().toISOString().slice(0,10), limit: 5 }).catch(() => ({ data: [] })),
        ]);

        if (!isMounted) return;

        // Normalize orders array
        let orders = [];
        if (Array.isArray(ordersData)) orders = ordersData;
        else if (ordersData && Array.isArray(ordersData.data)) orders = ordersData.data;
        else if (ordersData && Array.isArray(ordersData.orders)) orders = ordersData.orders;

        // KPIs (new)
        const d30 = Date.now() - 30*24*60*60*1000;
        const activeClientsSet = new Set();
        for (const o of orders) {
          const dStr = o.sales_orders_order_date || o.order_date;
          const d = dStr ? new Date(dStr) : null;
          if (d && !isNaN(d) && d.getTime() >= d30) {
            activeClientsSet.add(o.clients_company_name || o.client_name || o.client_id || o.clients_id || 'unknown');
          }
        }
        // Total invoiced sales last 30 days
        const invoices30dTotal = orders
          .filter(o => {
            const status = (o.sales_orders_status || o.status || '').toString();
            const dStr = o.sales_orders_order_date || o.order_date;
            const d = dStr ? new Date(dStr) : null;
            return status === 'Invoiced' && d && !isNaN(d) && d.getTime() >= d30;
          })
          .reduce((sum, o) => sum + (Number(o.sales_orders_total_amount || o.total_amount || 0) || 0), 0);

        // Pending deliveries from API (broaden shape handling)
        let pendingDelArr = [];
        if (Array.isArray(pendingDeliveriesData)) pendingDelArr = pendingDeliveriesData;
        else if (Array.isArray(pendingDeliveriesData?.pending_sales_orders)) pendingDelArr = pendingDeliveriesData.pending_sales_orders;
        else if (Array.isArray(pendingDeliveriesData?.data?.pending_sales_orders)) pendingDelArr = pendingDeliveriesData.data.pending_sales_orders;
        else if (Array.isArray(pendingDeliveriesData?.data)) pendingDelArr = pendingDeliveriesData.data;

        // Fallback: derive pending deliveries from orders if API returned none
        if (!pendingDelArr.length && orders.length) {
          const deliverableStatuses = ['Confirmed', 'Invoiced', 'Approved'];
          const isDelivered = (v) => {
            if (!v) return false;
            return v === 'Delivered' || v === 'تم التسليم';
          };
          pendingDelArr = orders.filter(o => {
            const ds = o.sales_orders_delivery_status || o.delivery_status;
            const st = o.sales_orders_status || o.status;
            return deliverableStatuses.includes(st) && !isDelivered(ds);
          }).slice(0, 20);
        }
        const returnsArrData = returnsData?.data || returnsData?.returns || returnsData || [];
        const returnsArr = Array.isArray(returnsArrData) ? returnsArrData : (Array.isArray(returnsArrData?.data) ? returnsArrData.data : []);

        setKpis({
          pending_deliveries: pendingDelArr.length || 0,
          returns_30d: returnsArr.length || 0,
          active_clients_30d: activeClientsSet.size,
          invoices_30d_total: invoices30dTotal,
        });

        // Recent Orders list (latest 8)
        const sortedOrders = [...orders].sort((a, b) => new Date(b.sales_orders_order_date || b.order_date || 0) - new Date(a.sales_orders_order_date || a.order_date || 0));
        setRecentOrders(sortedOrders.slice(0, 8));

        // Pending deliveries (top 5)
        setPendingDeliveries(pendingDelArr.slice(0, 5));

        // Recent returns (already limited to 5)
        const normalizedReturns = Array.isArray(returnsArr) ? returnsArr : [];
        setRecentReturns(normalizedReturns.slice(0, 5));

        // Top clients by sales value (top 5)
        const clientMap = new Map();
        for (const o of orders) {
          const key = o.clients_company_name || o.client_name || 'غير معروف';
          const amt = Number(o.sales_orders_total_amount || o.total_amount || 0) || 0;
          clientMap.set(key, (clientMap.get(key) || 0) + amt);
        }
        const top = Array.from(clientMap.entries())
          .map(([client, total]) => ({ client, total }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);
        setTopClients(top);
      } catch (e) {
        console.error('Failed to load dashboard home:', e);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return (
      <div dir="rtl" className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-extrabold text-gray-900">لوحة التحكم الرئيسية</h1>
        {/* VersionSyncStatus removed */}
      </div>

      {/* KPI Row - New Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white shadow-sm rounded-xl p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">إجمالي فواتير المبيعات (30 يوم)</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(kpis.invoices_30d_total)}</div>
            </div>
            <div className="text-3xl">💵</div>
          </div>
        </div>
        <div className="bg-white shadow-sm rounded-xl p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">التسليمات المعلقة</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{kpis.pending_deliveries}</div>
            </div>
            <div className="text-3xl">🚚</div>
          </div>
        </div>
        <div className="bg-white shadow-sm rounded-xl p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">مرتجعات (30 يوم)</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{kpis.returns_30d}</div>
            </div>
            <div className="text-3xl">↩️</div>
          </div>
        </div>
        <div className="bg-white shadow-sm rounded-xl p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">العملاء النشطون (30 يوم)</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{kpis.active_clients_30d}</div>
            </div>
            <div className="text-3xl">👥</div>
          </div>
        </div>
      </div>

      {/* Content Grid - New Sections */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Orders (wide) */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">أحدث أوامر البيع</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">رقم</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">العميل</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">المندوب</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">الإجمالي</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {recentOrders.length ? recentOrders.map((o) => (
                  <tr key={o.sales_orders_id || o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">#{o.sales_orders_id || o.id}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{o.clients_company_name || o.client_name || '—'}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{o.representative_name || '—'}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{(o.sales_orders_order_date || o.order_date) ? new Date(o.sales_orders_order_date || o.order_date).toLocaleDateString('en-GB') : '—'}</td>
                    <td className="px-4 py-2 text-sm font-semibold text-gray-900">{formatCurrency(Number(o.sales_orders_total_amount || o.total_amount || 0))}</td>
                    <td className="px-4 py-2 text-sm"><span className="inline-flex px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">{o.sales_orders_status || o.status || '—'}</span></td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="px-4 py-6 text-center text-gray-500">لا توجد أوامر حديثة</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column: Pending deliveries and recent returns */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">التسليمات المعلقة</h3>
              <span className="text-xs text-gray-500">{kpis.pending_deliveries}</span>
            </div>
            <div className="p-4 space-y-2">
              {pendingDeliveries.length ? pendingDeliveries.map((d, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div>
                    <div className="text-sm font-medium text-gray-900">أمر #{d.sales_orders_id || d.order_id || d.id}</div>
                    <div className="text-xs text-gray-600">{d.client_name || d.clients_company_name || '—'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">{formatCurrency(Number(d.total_amount || d.sales_orders_total_amount || 0))}</div>
                    <div className="text-xs text-gray-500">{d.order_date ? new Date(d.order_date).toLocaleDateString('en-GB') : ''}</div>
                  </div>
                </div>
              )) : (
                <div className="text-center text-gray-500 py-6">لا توجد تسليمات معلقة</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">المرتجعات الأخيرة</h3>
            </div>
            <div className="p-4 space-y-2">
              {recentReturns.length ? recentReturns.map((r, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div>
                    <div className="text-sm font-medium text-gray-900">مرتجع #{r.returns_id || r.sales_returns_id || r.id}</div>
                    <div className="text-xs text-gray-600">{r.client_name || r.clients_company_name || '—'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">{formatCurrency(Number(r.returns_total_amount || r.total_amount || 0))}</div>
                    <div className="text-xs text-gray-500">{r.returns_date ? new Date(r.returns_date).toLocaleDateString('en-GB') : ''}</div>
                  </div>
                </div>
              )) : (
                <div className="text-center text-gray-500 py-6">لا توجد مرتجعات حديثة</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Top clients */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">أفضل العملاء حسب قيمة المبيعات</h3>
        </div>
        <div className="p-4">
          {topClients.length ? (
            <div className="space-y-2">
              {topClients.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="text-sm text-gray-700">{c.client}</div>
                  <div className="text-sm font-semibold text-gray-900">{formatCurrency(Number(c.total))}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-6">لا توجد بيانات كافية</div>
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardPage() {
  const navLinkClasses = ({ isActive }) => `py-2 px-4 text-sm font-medium border-b-2 focus:outline-none transition-colors duration-200 ${isActive ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`;

  return (
    <div className="p-4" dir="rtl">
      <div className="flex flex-wrap border-b border-gray-200 mb-6 items-center" dir="rtl">
        <div className="flex-1 flex flex-wrap">
          <NavLink to="/dashboard" end className={navLinkClasses}>الرئيسية</NavLink>
          <NavLink to="/dashboard/users" className={navLinkClasses}>المستخدمون</NavLink>
          <NavLink to="/dashboard/product-management" className={navLinkClasses}>إدارة المنتجات</NavLink>
          <NavLink to="/dashboard/inventory-management" className={navLinkClasses}>إدارة المخازن</NavLink>
          <NavLink to="/dashboard/reports" className={navLinkClasses}>التقارير</NavLink>
          <NavLink to="/dashboard/settings" className={navLinkClasses}>الإعدادات</NavLink>
        </div>
        <div className="ml-4">
          <AuthTestButton />
        </div>
      </div>
      <Outlet />
    </div>
  );
}

DashboardPage.HomeTab = HomeTabContent;
export default DashboardPage;
