// src/components/dashboard/ComprehensiveDashboard.jsx
import React, { useState, useEffect } from "react";
import { getComprehensiveDashboardData } from "../../apis/dashboard.js";
import { formatCurrency } from "../../utils/currency.js";

import {
  BanknotesIcon,
  ArrowPathIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  BuildingStorefrontIcon,
} from "@heroicons/react/24/outline";

import HoverDonut from "../graphs/HoverDonut.jsx";

import MetricBarChart from "../graphs/MetricBarChart.jsx";
import ProductRadarCard from "../graphs/ProductRadarCard";
import MonthlyComparisonBar from "../graphs/MonthlyComparisonBar.jsx";

const toNumber = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = parseFloat(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const toPositiveNumber = (value) => {
  const num = toNumber(value);
  return num < 0 ? Math.abs(num) : num;
};

const normalizeDashboardData = (raw) => {
  if (!raw) return null;

  // Backend now returns 'sales', 'purchases', 'returns' instead of 'sales_orders', 'purchase_orders', 'sales_returns'
  const salesOrders = raw.sales ?? raw.sales_orders ?? {};
  const purchaseOrders = raw.purchases ?? raw.purchase_orders ?? {};
  const financial = raw.financial ?? {};
  const salesReturns = raw.returns ?? raw.sales_returns ?? {};
  const clients = raw.clients ?? {};

  return {
    meta: {
      generatedAt: raw.meta?.generated_at ?? new Date().toISOString(),
    },
    sales: {
      invoiced30d: {
        count: toNumber(salesOrders.invoiced_30d_count),
        value: toNumber(salesOrders.invoiced_30d_value),
      },
      invoiced7d: {
        count: toNumber(salesOrders.invoiced_7d_count),
        value: toNumber(salesOrders.invoiced_7d_value),
      },
      invoicedToday: {
        count: toNumber(salesOrders.invoiced_today_count),
        value: toNumber(salesOrders.invoiced_today_value),
      },
      total30d: {
        count: toNumber(salesOrders.invoiced_30d_count),
        value: toNumber(salesOrders.invoiced_30d_value),
      },
    },
    purchases: {
      active30dCount: toNumber(purchaseOrders.active_30d_count),
      active30dValue: toNumber(purchaseOrders.active_30d_value),
      active7dCount: toNumber(purchaseOrders.active_7d_count),
      active7dValue: toNumber(purchaseOrders.active_7d_value),
      activeTodayCount: toNumber(purchaseOrders.active_today_count),
      activeTodayValue: toNumber(purchaseOrders.active_today_value),
    },
    financial: {
      income30d: toNumber(financial.income_30d),
      expenses30d: toPositiveNumber(financial.expenses_30d),
      income7d: toNumber(financial.income_7d),
      expenses7d: toPositiveNumber(financial.expenses_7d),
    },
    returns: {
      returns30d: {
        count: toNumber(salesReturns.returns_30d_count),
        value: toNumber(salesReturns.returns_30d_value),
      },
      returns7d: {
        count: toNumber(salesReturns.returns_7d_count),
        value: toNumber(salesReturns.returns_7d_value),
      },
      returnsToday: {
        count: toNumber(salesReturns.returns_today_count),
        value: toNumber(salesReturns.returns_today_value),
      },
    },
    clients: {
      new30d: toNumber(clients.new_clients_30d),
      new7d: toNumber(clients.new_clients_7d),
      totalActive: toNumber(clients.total_active_clients),
      totalBalance: toNumber(clients.total_clients_balance),
    },
    suppliers: {
      // try a few possible keys from backend: suppliers, suppliers_balance, total_suppliers_balance
      totalBalance: toNumber(
        raw.suppliers?.total_balance ??
          raw.suppliers_total_balance ??
          raw.total_suppliers_balance ??
          raw.suppliers_balance ??
          0,
      ),
    },
    topSellingProducts: (raw.top_selling_products ?? []).map((item, index) => ({
      id: item.sales_order_items_variant_id ?? index,
      variantName: item.variant_name ?? "غير معروف",
      productName: item.products_name ?? "",
      totalQuantity: toNumber(item.total_quantity),
      totalRevenue: toNumber(item.total_revenue),
      orderCount: toNumber(item.order_count),
    })),
    topReturnedProducts: (raw.top_returned_products ?? []).map(
      (item, index) => ({
        id: item.sales_order_items_variant_id ?? index,
        variantName: item.variant_name ?? "غير معروف",
        productName: item.products_name ?? "",
        totalReturnedQuantity: toNumber(item.total_returned_quantity),
        totalReturnedValue: toNumber(item.total_returned_value),
        returnCount: toNumber(item.return_count),
      }),
    ),
    lowStockProducts: (raw.low_stock_products ?? []).map((item, index) => ({
      id: item.variant_id ?? index,
      variantName: item.variant_name ?? "غير معروف",
      productName: item.products_name ?? "",
      totalStock: toNumber(item.total_stock),
      warehouse: item.warehouse_name ?? "غير محدد",
    })),
    recentVisits: (raw.recent_visits ?? []).map((visit) => ({
      visitsId: visit.visits_id,
      clientCompanyName: visit.client_company_name ?? "غير معروف",
      visitsStartTime: visit.visits_start_time,
      visitsStatus: visit.visits_status,
      visitsPurpose: visit.visits_purpose,
      representativeName: visit.representative_name ?? "غير معروف",
    })),
    monthlyComparison: {
      currentSales: toNumber(raw.monthly_comparison?.current_month_sales),
      currentOrders: toNumber(raw.monthly_comparison?.current_month_orders),
      previousSales: toNumber(raw.monthly_comparison?.previous_month_sales),
      previousOrders: toNumber(raw.monthly_comparison?.previous_month_orders),
    },
    userPerformance: (raw.user_performance ?? []).map((user) => ({
      usersId: user.users_id,
      usersName: user.users_name ?? "غير معروف",
      usersRole: user.users_role ?? "غير محدد",
      ordersHandled: toNumber(user.orders_handled),
      totalSalesValue: toNumber(user.total_sales_value),
      visitsConducted: toNumber(user.visits_conducted),
    })),
  };
};

const classNames = (...classes) => classes.filter(Boolean).join(" ");

const ComprehensiveDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("Loading comprehensive dashboard data...");
        const rawData = await getComprehensiveDashboardData();
        console.log("Dashboard data received:", rawData);
        setDashboardData(normalizeDashboardData(rawData));
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
        setError(
          `فشل في تحميل بيانات لوحة المعلومات: ${err.message || "خطأ غير معروف"}`,
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div dir="rtl" className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            جاري تحميل بيانات لوحة المعلومات...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div dir="rtl" className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  // Add safety check for data
  if (!dashboardData) {
    return (
      <div dir="rtl" className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-yellow-600">لا توجد بيانات متاحة</p>
        </div>
      </div>
    );
  }

  const data = dashboardData;
  const salesChartData = [
    {
      label: "آخر 30 يوم",
      count: data.sales.invoiced30d.count,
      value: data.sales.invoiced30d.value,
    },
    {
      label: "آخر 7 أيام",
      count: data.sales.invoiced7d.count,
      value: data.sales.invoiced7d.value,
    },
    {
      label: "اليوم",
      count: data.sales.invoicedToday.count,
      value: data.sales.invoicedToday.value,
    },
  ];

  const formatCount = (value) => toNumber(value).toLocaleString("ar-EG");
  const formatAmount = (value) => formatCurrency(toNumber(value));
  const formatDateTime = (value) =>
    value ? new Date(value).toLocaleString("ar-EG") : "غير متاح";

  const colorPalette = {
    blue: "#3b82f6",
    green: "#22c55e",
    orange: "#f97316",
    red: "#ef4444",
    purple: "#a855f7",
    indigo: "#6366f1",
    teal: "#14b8a6",
    cyan: "#06b6d4",
    yellow: "#eab308",
    pink: "#ec4899",
    emerald: "#10b981",
    rose: "#f43f5e",
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, color = "blue" }) => {
    const paletteColor = colorPalette[color] ?? colorPalette.blue;

    return (
      <div
        className="bg-white rounded-lg shadow-md p-6 border-r-4"
        style={{ borderRightColor: paletteColor }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>
          {Icon && <Icon className="h-8 w-8" style={{ color: paletteColor }} />}
        </div>
      </div>
    );
  };

  const StatCardwithGraph = ({
    title,
    value,
    subtitle,
    color = "blue",
    primaryValue,
    secondaryValue,
  }) => {
    const paletteColor = colorPalette[color] ?? colorPalette.blue;

    const colorSets = {
      emerald: ["#16a34a", "#4ade80"],
      rose: ["#dc2626", "#f87171"],
      yellow: ["#facc15", "#fde047"],
      blue: ["#3b82f6", "#93c5fd"],
    };

    const donutColors = colorSets[color] || colorSets.blue;

    return (
      <div
        className="bg-white rounded-lg shadow-md p-6 border-r-4"
        style={{ borderRightColor: paletteColor }}
      >
        <div className="flex justify-between items-center gap-4">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-500">{title}</h3>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>

          <HoverDonut
            data={[
              { name: "آخر 7 أيام", value: secondaryValue },
              { name: "ال24 يوم السابقين ", value: Math.max(0, primaryValue - secondaryValue) },
            ]}
            colors={donutColors}
          />
        </div>
      </div>
    );
  };

  const SectionCard = ({
    title,
    children,
    icon: Icon,
    iconElement,
    className,
    contentClassName,
  }) => (
    <div
      className={classNames(
        "bg-white rounded-lg shadow-md p-6 flex flex-col",
        className,
      )}
    >
      <div className="flex items-center mb-4">
        {/* JSX icon (priority) */}
        {iconElement && <div className="ml-2">{iconElement}</div>}

        {/* Component icon (fallback) */}
        {!iconElement && Icon && (
          <Icon className="h-6 w-6 text-blue-600 ml-2" />
        )}

        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      </div>

      <div className={classNames("flex-1 flex flex-col", contentClassName)}>
        {children}
      </div>
    </div>
  );

  // const CombinedStatCard = ({
  //   title,
  //   icon: Icon,
  //   color = "blue",
  //   entries = [],
  // }) => {
  //   const paletteColor = colorPalette[color] ?? colorPalette.blue;
  //   console.log(`Rendering CombinedStatCard: ${title} with entries:`, entries);

  //   return (
  //     <div
  //       className="bg-white rounded-lg shadow-md p-6 border-r-4"
  //       style={{ borderRightColor: paletteColor }}
  //     >
  //       <div className="flex items-center justify-between mb-4">
  //         <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
  //         {Icon && <Icon className="h-8 w-8" style={{ color: paletteColor }} />}
  //       </div>
  //       <div className="space-y-4">
  //         {entries.map(({ label, count, value }, idx) => {
  //           const hasValue = value !== undefined && value !== null;
  //           return (
  //             <div
  //               key={`${label}-${idx}`}
  //               className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0"
  //             >
  //               <span className="font-medium text-gray-700">{label}</span>
  //               <div className="flex flex-wrap gap-3 text-sm text-gray-600">
  //                 <span className="text-gray-600">
  //                   العدد:
  //                   <span className="font-semibold text-gray-900 mr-1">
  //                     {count}
  //                   </span>
  //                 </span>
  //                 {hasValue && (
  //                   <span className="text-gray-600">
  //                     القيمة:
  //                     <span className="font-semibold text-gray-900 mr-1">
  //                       {value}
  //                     </span>
  //                   </span>
  //                 )}
  //               </div>
  //             </div>
  //           );
  //         })}
  //       </div>
  //     </div>
  //   );
  // };

  const purchaseChartData = [
    {
      label: "آخر 30 يوم",
      count: data.purchases.active30dCount,
      value: data.purchases.active30dValue,
    },
    {
      label: "آخر 7 أيام",
      count: data.purchases.active7dCount,
      value: data.purchases.active7dValue,
    },
    {
      label: "اليوم",
      count: data.purchases.activeTodayCount,
      value: data.purchases.activeTodayValue,
    },
  ];

  const returnsChartData = [
    {
      label: "آخر 30 يوم",
      count: data.returns.returns30d.count,
      value: data.returns.returns30d.value,
    },
    {
      label: "آخر 7 أيام",
      count: data.returns.returns7d.count,
      value: data.returns.returns7d.value,
    },
    {
      label: "اليوم",
      count: data.returns.returnsToday.count,
      value: data.returns.returnsToday.value,
    },
  ];

  const topSellingProducts = (data?.topSellingProducts ?? []).slice(0, 20);
  const topReturnedProducts = (data?.topReturnedProducts ?? []).slice(0, 20);
  const productSectionLengths = [
    topSellingProducts.length,
    topReturnedProducts.length,
    data?.lowStockProducts?.length ?? 0,
  ];
  const shouldScrollProductSections = Math.max(...productSectionLengths) > 4;

  console.log("Top Returned Products:", topReturnedProducts);

  return (
    <div dir="rtl" className="space-y-6 p-2 md:p-4">
      <div className="mb-8">
        <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-2">
          لوحة المعلومات الشاملة
        </h1>
        <p className="text-gray-600 text-sm md:text-base">
          آخر تحديث: {formatDateTime(data?.meta?.generatedAt)}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-6 w-full">
        <MetricBarChart
          title="ملخص المبيعات"
          icon={BanknotesIcon}
          data={salesChartData}
          formatCount={formatCount}
          formatAmount={formatAmount}
          theme={{
            countColor: "#005A7D",
            valueColor: "#7dd3fc",
          }}
        />

        <MetricBarChart
          title="ملخص المشتريات"
          icon={BuildingStorefrontIcon}
          data={purchaseChartData}
          formatCount={formatCount}
          formatAmount={formatAmount}
          theme={{
            countColor: "#ca8a04", // amber-600
            valueColor: "#facc15", // yellow-400
          }}
        />

        <MetricBarChart
          title="ملخص المرتجعات"
          icon={ArrowPathIcon}
          data={returnsChartData}
          formatCount={formatCount}
          formatAmount={formatAmount}
          theme={{
            countColor: "#991b1b",
            valueColor: "#ef4444",
          }}
        />
      </div>

      <h3 className="text-xl font-semibold">المؤشرات الرئيسية</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="إجمالي الطلبات (30 يوم)"
          value={formatCount(data?.sales?.total30d?.count)}
          subtitle={formatAmount(data?.sales?.total30d?.value)}
          icon={ChartBarIcon}
          color="yellow"
        />
        <StatCard
          title="العملاء الجدد (30 يوم)"
          value={formatCount(data?.clients?.new30d)}
          subtitle={`آخر 7 أيام: ${formatCount(data?.clients?.new7d)}`}
          icon={UserGroupIcon}
          color="orange"
        />
        <StatCard
          title="إجمالي أرصدة العملاء"
          value={formatAmount(data?.clients?.totalBalance)}
          subtitle={`إجمالي العملاء النشطين: ${formatCount(data?.clients?.totalActive)}`}
          icon={BanknotesIcon}
          color={data?.clients?.totalBalance >= 0 ? "green" : "red"}
        />
        <StatCard
          title="إجمالي أرصدة الموردين"
          value={formatAmount(data?.suppliers?.totalBalance)}
          icon={BanknotesIcon}
          color={data?.suppliers?.totalBalance >= 0 ? "green" : "red"}
        />
      </div>

      <h3 className="text-xl font-semibold">الملخص المالي</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCardwithGraph
          title="إيرادات مالية (30 يوم)"
          value={formatAmount(data.financial.income30d)}
          subtitle={`آخر 7 أيام: ${formatAmount(data.financial.income7d)}`}
          color="emerald"
          primaryValue={data.financial.income30d}
          secondaryValue={data.financial.income7d}
        />

        <StatCardwithGraph
          title="مصروفات مالية (30 يوم)"
          value={formatAmount(data.financial.expenses30d)}
          subtitle={`آخر 7 أيام: ${formatAmount(data.financial.expenses7d)}`}
          color="rose"
          primaryValue={data.financial.expenses30d}
          secondaryValue={data.financial.expenses7d}
        />

        <StatCard
          title="آخر زيارة مضافة"
          value={data?.recentVisits?.[0]?.clientCompanyName ?? "غير متاح"}
          subtitle={formatDateTime(data?.recentVisits?.[0]?.visitsStartTime)}
          icon={CalendarDaysIcon}
          color="yellow"
        />
      </div>

      <h3 className="text-xl font-semibold">المنتجات</h3>

      {/* Product Insights */}
      <div className="flex flex-col md:grid md:grid-cols-2  gap-6 items-stretch">
        <SectionCard
          title="أكثر المنتجات مبيعاً"
          iconElement={<ChartBarIcon className="h-6 w-6 text-green-600" />}
          className="h-full "
          contentClassName={classNames(
            "space-y-3",
            shouldScrollProductSections && "max-h-96 overflow-y-auto pr-2",
          )}
        >
          {topSellingProducts.length > 0 ? (
            topSellingProducts.map((product) => (
              <ProductRadarCard
                title={product.variantName}
                subtitle={product.productName}
                color="#22c55e"
                metrics={[
                  { label: "الكمية", value: product.totalQuantity },
                  { label: "عدد الطلبات", value: product.orderCount },
                  { label: "الأرباح", value: product.totalRevenue },
                ]}
              />
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">
              لا توجد بيانات متاحة
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="أكثر المنتجات إرجاعاً"
          iconElement={<ArrowPathIcon className="h-6 w-6 text-red-600" />}
          className="h-full"
          contentClassName={classNames(
            "space-y-3",
            shouldScrollProductSections && "max-h-96 overflow-y-auto pr-2",
          )}
        >
          {topReturnedProducts.length > 0 ? (
            topReturnedProducts.map((product) => (
              <ProductRadarCard
                title={product.variantName}
                subtitle={product.productName}
                color="#ef4444"
                metrics={[
                  { label: "عدد المرتجعات", value: product.returnCount },
                  { label: "الكمية", value: product.totalReturnedQuantity },
                  { label: "مجموع الخسارة", value: product.totalReturnedValue },
                ]}
              />
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">
              لا توجد بيانات متاحة
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="تحذيرات المخزون المنخفض"
          iconElement={
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />
          }
          className="h-full col-span-2 bg-gradient-to-br from-yellow-50 to-white"
          contentClassName={classNames(
            "space-y-4",
            shouldScrollProductSections && "max-h-96 overflow-y-auto pr-2",
          )}
        >
          {data?.lowStockProducts?.length > 0 ? (
            data.lowStockProducts.map((item) => (
              <div
                key={item.id}
                className="p-3 sm:p-4 bg-white rounded-xl border border-yellow-200 shadow-sm
                   hover:shadow-md transition flex flex-col gap-1"
              >
                <div className="flex flex-wrap justify-between items-start gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 text-sm truncate">
                      {item.variantName}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {item.productName}
                    </div>
                  </div>

                  {/* Stock badge */}
                  <span className="shrink-0 px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 whitespace-nowrap">
                    {formatCount(item.totalStock)} متبقي
                  </span>
                </div>

                <div className="text-xs text-gray-600 mt-1">
                  📦 المخزن: {item.warehouse}
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-center py-6">
              لا توجد تحذيرات مخزون
            </p>
          )}
        </SectionCard>
      </div>

      {/* Performance & Visits */}
      <h3 className="text-xl font-semibold">المناديب</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard
          title="أداء المناديب"
          iconElement={<UserGroupIcon className="h-6 w-6 text-orange-600" />}
        >
          <div className="space-y-3">
            {data?.userPerformance?.length > 0 ? (
              data.userPerformance.map((user) => (
                <div
                  key={user.usersId}
                  className="bg-[#f2f2f2] rounded-xl px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  {/* Metrics pills */}
                  <div className="flex flex-wrap gap-2 text-xs font-medium">
                    <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-100 text-yellow-800">
                      🚗 زيارات: {formatCount(user.visitsConducted)}
                    </span>

                    <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-800">
                      💰 قيمة: {formatCurrency(user.totalSalesValue)}
                    </span>

                    <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-800">
                      📦 طلبات: {formatCount(user.ordersHandled)}
                    </span>
                  </div>

                  {/* Name & role */}
                  <div className="text-right">
                    <div className="font-semibold text-gray-900 text-sm">
                      {user.usersName}
                    </div>
                    <div className="text-xs text-gray-500">
                      الدور: {user.usersRole}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center py-6">
                لا توجد بيانات للأداء
              </p>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="الزيارات الأخيرة"
          iconElement={<CalendarDaysIcon className="h-6 w-6 text-purple-600" />}
        >
          <div className="space-y-3">
            {data?.recentVisits?.length > 0 ? (
              data.recentVisits.map((visit) => (
                <div
                  key={visit.visitsId}
                  className="bg-[#f2f2f2] rounded-xl px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2"
                >
                  {/* Left content */}
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm truncate">
                      {visit.clientCompanyName}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      {/* Status pill */}
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium whitespace-nowrap">
                        {visit.visitsStatus}
                      </span>

                      {/* Purpose pill */}
                      <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 font-medium whitespace-nowrap">
                        الغرض: {visit.visitsPurpose || "غير محدد"}
                      </span>
                    </div>

                    <div className="text-xs text-gray-500">
                      المندوب: {visit.representativeName}
                    </div>
                  </div>

                  {/* Time */}
                  <div className="text-xs text-gray-400 whitespace-nowrap sm:text-right">
                    {formatDateTime(visit.visitsStartTime)}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center py-6">
                لا توجد زيارات حديثة
              </p>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Monthly Comparison */}
      <h3 className="text-xl font-semibold">مقارنة الاداء</h3>

      <SectionCard>
        <MonthlyComparisonBar data={data.monthlyComparison} />
      </SectionCard>
    </div>
  );
};

export default ComprehensiveDashboard;
