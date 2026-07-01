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
import { BRAND, MODAL_GRADIENTS, DASHBOARD } from "../../constants/brandColors.js";

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
        const rawData = await getComprehensiveDashboardData();
        if (!rawData) {
          throw new Error('لم يتم استلام بيانات من الخادم');
        }
        setDashboardData(normalizeDashboardData(rawData));
      } catch (err) {
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B5FD6] mx-auto"></div>
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
      label: "آخر 90 يوم",
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
    purple: BRAND.primary,
    violet: BRAND.violet,
    indigo: BRAND.indigo,
    lavender: BRAND.lavender,
    deep: BRAND.primaryDark,
    hover: BRAND.primaryHover,
    plum: DASHBOARD.plum,
    grape: DASHBOARD.grape,
    orchid: DASHBOARD.orchid,
    fuchsia: DASHBOARD.fuchsia,
    periwinkle: DASHBOARD.periwinkle,
    mauve: DASHBOARD.mauve,
  };

  const statCardThemes = {
    purple: {
      accent: BRAND.primary,
      border: "border-[#8B5FD6]/25",
      bg: "bg-gradient-to-br from-[#8B5FD6]/10 via-white to-white",
      iconBg: "bg-[#8B5FD6]/15",
    },
    violet: {
      accent: DASHBOARD.plum,
      border: "border-[#9333EA]/25",
      bg: "bg-gradient-to-br from-[#9333EA]/10 via-white to-white",
      iconBg: "bg-[#9333EA]/15",
    },
    indigo: {
      accent: BRAND.indigo,
      border: "border-[#6366F1]/25",
      bg: "bg-gradient-to-br from-[#6366F1]/10 via-white to-white",
      iconBg: "bg-[#6366F1]/15",
    },
    lavender: {
      accent: DASHBOARD.grape,
      border: "border-[#6D28D9]/25",
      bg: "bg-gradient-to-br from-[#6D28D9]/10 via-white to-white",
      iconBg: "bg-[#6D28D9]/15",
    },
    deep: {
      accent: BRAND.primaryDark,
      border: "border-[#2D1B69]/20",
      bg: "bg-gradient-to-br from-[#2D1B69]/8 via-white to-white",
      iconBg: "bg-[#2D1B69]/10",
    },
    hover: {
      accent: DASHBOARD.orchid,
      border: "border-[#D946EF]/25",
      bg: "bg-gradient-to-br from-[#D946EF]/10 via-white to-white",
      iconBg: "bg-[#D946EF]/15",
    },
    fuchsia: {
      accent: DASHBOARD.fuchsia,
      border: "border-[#C026D3]/25",
      bg: "bg-gradient-to-br from-[#C026D3]/10 via-white to-white",
      iconBg: "bg-[#C026D3]/15",
    },
    periwinkle: {
      accent: DASHBOARD.periwinkle,
      border: "border-[#818CF8]/30",
      bg: "bg-gradient-to-br from-[#818CF8]/12 via-white to-white",
      iconBg: "bg-[#818CF8]/18",
    },
  };

  const SectionHeading = ({ children }) => (
    <div className="flex items-center gap-3">
      <span className="h-8 w-1.5 rounded-full bg-gradient-to-b from-[#8B5FD6] via-[#9333EA] to-[#6366F1]" />
      <h3 className="text-base md:text-lg font-bold text-[#2D1B69]">{children}</h3>
    </div>
  );

  const StatCard = ({ title, value, subtitle, icon: Icon, color = "purple" }) => {
    const theme = statCardThemes[color] ?? statCardThemes.purple;
    const paletteColor = colorPalette[color] ?? colorPalette.purple;

    return (
      <div
        className={`rounded-2xl shadow-sm border p-5 hover:shadow-[0_8px_24px_-8px_rgba(139,95,214,0.3)] transition-all duration-200 ${theme.border} ${theme.bg}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p
              className="text-xs font-semibold uppercase tracking-wide mb-1.5"
              style={{ color: theme.accent }}
            >
              {title}
            </p>
            <p className="text-2xl font-extrabold text-[#2D1B69] truncate">
              {value}
            </p>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1 truncate">{subtitle}</p>
            )}
          </div>
          {Icon && (
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${theme.iconBg}`}
            >
              <Icon className="h-5 w-5" style={{ color: paletteColor }} />
            </div>
          )}
        </div>
        <div
          className="mt-4 h-1 rounded-full w-14"
          style={{
            background: `linear-gradient(90deg, ${paletteColor}, ${BRAND.lavender})`,
          }}
        />
      </div>
    );
  };

  const StatCardwithGraph = ({
    title,
    value,
    subtitle,
    color = "purple",
    primaryValue,
    secondaryValue,
  }) => {
    const theme = statCardThemes[color] ?? statCardThemes.purple;
    const paletteColor = colorPalette[color] ?? colorPalette.purple;

    const colorSets = {
      purple: [BRAND.primary, BRAND.lavender],
      violet: [DASHBOARD.plum, BRAND.violet],
      deep: [BRAND.primaryDark, DASHBOARD.grape],
      indigo: [BRAND.indigo, DASHBOARD.periwinkle],
      fuchsia: [DASHBOARD.fuchsia, DASHBOARD.mauve],
      periwinkle: [DASHBOARD.periwinkle, BRAND.lavender],
    };

    const donutColors = colorSets[color] || colorSets.purple;

    return (
      <div
        className={`rounded-2xl shadow-sm border p-5 hover:shadow-[0_8px_24px_-8px_rgba(139,95,214,0.3)] transition-all duration-200 ${theme.border} ${theme.bg}`}
      >
        <div className="flex justify-between items-center gap-4">
          <div className="flex-1 min-w-0">
            <p
              className="text-xs font-semibold uppercase tracking-wide mb-1.5"
              style={{ color: theme.accent }}
            >
              {title}
            </p>
            <p className="text-2xl font-extrabold text-[#2D1B69] truncate">
              {value}
            </p>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1 truncate">{subtitle}</p>
            )}
          </div>

          <HoverDonut
            data={[
              { name: "آخر 7 أيام", value: secondaryValue },
              {
                name: "ال24 يوم السابقين",
                value: Math.max(0, primaryValue - secondaryValue),
              },
            ]}
            colors={donutColors}
          />
        </div>
        <div
          className="mt-4 h-1 rounded-full w-14"
          style={{
            background: `linear-gradient(90deg, ${paletteColor}, ${BRAND.lavender})`,
          }}
        />
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
    accent = BRAND.primary,
    headerBg = "bg-[#FAFAFE]",
  }) => (
    <div
      className={classNames(
        "relative bg-white rounded-2xl shadow-sm border border-[#EDE7FF] p-5 flex flex-col overflow-hidden",
        className,
      )}
    >
      <div
        className={`relative flex items-center gap-2 mb-4 -mx-5 -mt-5 px-5 py-3 border-b border-[#EDE7FF] ${headerBg}`}
      >
        <span
          className="absolute top-0 left-0 right-0 h-[3px]"
          style={{ background: `linear-gradient(90deg, ${accent}, ${BRAND.lavender})` }}
        />
        {iconElement && <div className="relative">{iconElement}</div>}
        {!iconElement && Icon && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${accent}18` }}
          >
            <Icon className="h-4 w-4" style={{ color: accent }} />
          </div>
        )}
        <h2 className="text-base font-bold text-[#2D1B69]">{title}</h2>
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
      label: "آخر 90 يوم",
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
      label: "آخر 90 يوم",
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
  return (
    <div dir="rtl" className="space-y-6 bg-gradient-to-b from-[#FAFAFE] via-white to-[#EDE7FF]/25 -m-4 sm:-m-6 p-4 sm:p-6 min-h-full">
      {/* Page header */}
      <div
        className="rounded-2xl px-6 py-5 flex items-center justify-between shadow-[0_8px_32px_-8px_rgba(139,95,214,0.4)] relative overflow-hidden"
        style={{ background: MODAL_GRADIENTS.purple }}
      >
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 85% 20%, #D946EF 0%, transparent 45%), radial-gradient(circle at 10% 80%, #6366F1 0%, transparent 40%)",
          }}
        />
        <div className="relative z-10">
          <h1 className="text-xl md:text-2xl font-extrabold text-white">
            لوحة المعلومات
          </h1>
          <p className="text-white/70 text-xs mt-0.5">
            آخر تحديث: {formatDateTime(data?.meta?.generatedAt)}
          </p>
        </div>
        <ChartBarIcon className="h-10 w-10 text-white/40 relative z-10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-6 w-full">
        <MetricBarChart
          title="ملخص المبيعات"
          icon={BanknotesIcon}
          data={salesChartData}
          formatCount={formatCount}
          formatAmount={formatAmount}
          theme={{
            countColor: BRAND.primary,
            valueColor: BRAND.lavender,
            cardBg: "bg-gradient-to-br from-[#8B5FD6]/8 via-white to-white border border-[#8B5FD6]/20",
            titleColor: "text-[#2D1B69]",
          }}
        />

        <MetricBarChart
          title="ملخص المشتريات"
          icon={BuildingStorefrontIcon}
          data={purchaseChartData}
          formatCount={formatCount}
          formatAmount={formatAmount}
          theme={{
            countColor: DASHBOARD.plum,
            valueColor: DASHBOARD.mauve,
            cardBg: "bg-gradient-to-br from-[#9333EA]/8 via-white to-white border border-[#9333EA]/20",
            titleColor: "text-[#2D1B69]",
          }}
        />

        <MetricBarChart
          title="ملخص المرتجعات"
          icon={ArrowPathIcon}
          data={returnsChartData}
          formatCount={formatCount}
          formatAmount={formatAmount}
          theme={{
            countColor: BRAND.indigo,
            valueColor: DASHBOARD.periwinkle,
            cardBg: "bg-gradient-to-br from-[#6366F1]/8 via-white to-white border border-[#6366F1]/20",
            titleColor: "text-[#2D1B69]",
          }}
        />
      </div>

      <SectionHeading>المؤشرات الرئيسية</SectionHeading>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="إجمالي الطلبات (90 يوم)"
          value={formatCount(data?.sales?.total30d?.count)}
          subtitle={formatAmount(data?.sales?.total30d?.value)}
          icon={ChartBarIcon}
          color="purple"
        />
        <StatCard
          title="العملاء الجدد (90 يوم)"
          value={formatCount(data?.clients?.new30d)}
          subtitle={`آخر 7 أيام: ${formatCount(data?.clients?.new7d)}`}
          icon={UserGroupIcon}
          color="violet"
        />
        <StatCard
          title="إجمالي أرصدة العملاء"
          value={formatAmount(data?.clients?.totalBalance)}
          subtitle={`إجمالي العملاء النشطين: ${formatCount(data?.clients?.totalActive)}`}
          icon={BanknotesIcon}
          color="indigo"
        />
        <StatCard
          title="إجمالي أرصدة الموردين"
          value={formatAmount(data?.suppliers?.totalBalance)}
          icon={BanknotesIcon}
          color="fuchsia"
        />
      </div>

      <SectionHeading>الملخص المالي</SectionHeading>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCardwithGraph
          title="إيرادات مالية (90 يوم)"
          value={formatAmount(data.financial.income30d)}
          subtitle={`آخر 7 أيام: ${formatAmount(data.financial.income7d)}`}
          color="purple"
          primaryValue={data.financial.income30d}
          secondaryValue={data.financial.income7d}
        />

        <StatCardwithGraph
          title="مصروفات مالية (90 يوم)"
          value={formatAmount(data.financial.expenses30d)}
          subtitle={`آخر 7 أيام: ${formatAmount(data.financial.expenses7d)}`}
          color="indigo"
          primaryValue={data.financial.expenses30d}
          secondaryValue={data.financial.expenses7d}
        />

        <StatCard
          title="آخر زيارة مضافة"
          value={data?.recentVisits?.[0]?.clientCompanyName ?? "غير متاح"}
          subtitle={formatDateTime(data?.recentVisits?.[0]?.visitsStartTime)}
          icon={CalendarDaysIcon}
          color="periwinkle"
        />
      </div>

      <SectionHeading>المنتجات</SectionHeading>

      {/* Product Insights */}
      <div className="flex flex-col md:grid md:grid-cols-2  gap-6 items-stretch">
        <SectionCard
          title="أكثر المنتجات مبيعاً"
          accent={BRAND.primary}
          headerBg="bg-gradient-to-l from-[#8B5FD6]/8 to-[#FAFAFE]"
          iconElement={<ChartBarIcon className="h-6 w-6" style={{ color: BRAND.primary }} />}
          className="h-full "
          contentClassName={classNames(
            "space-y-3",
            shouldScrollProductSections && "max-h-96 overflow-y-auto pr-2",
          )}
        >
          {topSellingProducts.length > 0 ? (
            topSellingProducts.map((product, index) => (
              <ProductRadarCard
                key={product.id}
                title={product.variantName}
                subtitle={product.productName}
                color={DASHBOARD.accents[index % DASHBOARD.accents.length]}
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
          accent={DASHBOARD.plum}
          headerBg="bg-gradient-to-l from-[#9333EA]/8 to-[#FAFAFE]"
          iconElement={<ArrowPathIcon className="h-6 w-6" style={{ color: DASHBOARD.plum }} />}
          className="h-full"
          contentClassName={classNames(
            "space-y-3",
            shouldScrollProductSections && "max-h-96 overflow-y-auto pr-2",
          )}
        >
          {topReturnedProducts.length > 0 ? (
            topReturnedProducts.map((product, index) => (
              <ProductRadarCard
                key={product.id}
                title={product.variantName}
                subtitle={product.productName}
                color={DASHBOARD.accents[(index + 3) % DASHBOARD.accents.length]}
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
          accent={DASHBOARD.orchid}
          headerBg="bg-gradient-to-l from-[#D946EF]/8 to-[#EDE7FF]/40"
          iconElement={
            <ExclamationTriangleIcon className="h-6 w-6" style={{ color: DASHBOARD.orchid }} />
          }
          className="h-full col-span-2 bg-gradient-to-br from-[#EDE7FF]/60 via-white to-[#FAFAFE]"
          contentClassName={classNames(
            "space-y-4",
            shouldScrollProductSections && "max-h-96 overflow-y-auto pr-2",
          )}
        >
          {data?.lowStockProducts?.length > 0 ? (
            data.lowStockProducts.map((item, index) => {
              const accent = DASHBOARD.accents[(index + 5) % DASHBOARD.accents.length];
              return (
              <div
                key={item.id}
                className="p-3 sm:p-4 bg-white rounded-xl border shadow-sm
                   hover:shadow-[0_4px_16px_-4px_rgba(139,95,214,0.2)] transition flex flex-col gap-1"
                style={{ borderColor: `${accent}35` }}
              >
                <div className="flex flex-wrap justify-between items-start gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-[#2D1B69] text-sm truncate">
                      {item.variantName}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {item.productName}
                    </div>
                  </div>

                  <span
                    className="shrink-0 px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap"
                    style={{ backgroundColor: `${accent}18`, color: accent }}
                  >
                    {formatCount(item.totalStock)} متبقي
                  </span>
                </div>

                <div className="text-xs text-gray-600 mt-1">
                  📦 المخزن: {item.warehouse}
                </div>
              </div>
            );})
          ) : (
            <p className="text-gray-400 text-center py-6">
              لا توجد تحذيرات مخزون
            </p>
          )}
        </SectionCard>
      </div>

      {/* Performance & Visits */}
      <SectionHeading>المناديب</SectionHeading>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard
          title="أداء المناديب"
          accent={BRAND.indigo}
          headerBg="bg-gradient-to-l from-[#6366F1]/8 to-[#FAFAFE]"
          iconElement={<UserGroupIcon className="h-6 w-6" style={{ color: BRAND.indigo }} />}
        >
          <div className="space-y-3">
            {data?.userPerformance?.length > 0 ? (
              data.userPerformance.map((user, index) => {
                const accent = DASHBOARD.accents[index % DASHBOARD.accents.length];
                const pillSets = [
                  { bg: "bg-[#EDE7FF]", text: "text-[#7A52C2]" },
                  { bg: "bg-[#9333EA]/12", text: "text-[#9333EA]" },
                  { bg: "bg-[#6366F1]/12", text: "text-[#6366F1]" },
                ];
                return (
                <div
                  key={user.usersId}
                  className="bg-[#FAFAFE] rounded-xl px-4 py-3 border border-[#EDE7FF] flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                  style={{ borderRightWidth: 4, borderRightColor: accent }}
                >
                  <div className="flex flex-wrap gap-2 text-xs font-medium">
                    <span className={`flex items-center gap-1 px-3 py-1 rounded-full ${pillSets[0].bg} ${pillSets[0].text}`}>
                      🚗 زيارات: {formatCount(user.visitsConducted)}
                    </span>

                    <span className={`flex items-center gap-1 px-3 py-1 rounded-full ${pillSets[1].bg} ${pillSets[1].text}`}>
                      💰 قيمة: {formatCurrency(user.totalSalesValue)}
                    </span>

                    <span className={`flex items-center gap-1 px-3 py-1 rounded-full ${pillSets[2].bg} ${pillSets[2].text}`}>
                      📦 طلبات: {formatCount(user.ordersHandled)}
                    </span>
                  </div>

                  <div className="text-right">
                    <div className="font-semibold text-[#2D1B69] text-sm">
                      {user.usersName}
                    </div>
                    <div className="text-xs" style={{ color: accent }}>
                      الدور: {user.usersRole}
                    </div>
                  </div>
                </div>
              );})
            ) : (
              <p className="text-gray-400 text-center py-6">
                لا توجد بيانات للأداء
              </p>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="الزيارات الأخيرة"
          accent={DASHBOARD.fuchsia}
          headerBg="bg-gradient-to-l from-[#C026D3]/8 to-[#FAFAFE]"
          iconElement={<CalendarDaysIcon className="h-6 w-6" style={{ color: DASHBOARD.fuchsia }} />}
        >
          <div className="space-y-3">
            {data?.recentVisits?.length > 0 ? (
              data.recentVisits.map((visit, index) => {
                const accent = DASHBOARD.accents[(index + 2) % DASHBOARD.accents.length];
                return (
                <div
                  key={visit.visitsId}
                  className="bg-[#FAFAFE] rounded-xl px-3 sm:px-4 py-3 border border-[#EDE7FF] flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2"
                  style={{ borderRightWidth: 3, borderRightColor: accent }}
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="font-semibold text-[#2D1B69] text-sm truncate">
                      {visit.clientCompanyName}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span
                        className="px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                        style={{ backgroundColor: `${accent}18`, color: accent }}
                      >
                        {visit.visitsStatus}
                      </span>

                      <span className="px-2 py-0.5 rounded-full bg-[#C4A8F0]/40 text-[#2D1B69] font-medium whitespace-nowrap">
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
              );})
            ) : (
              <p className="text-gray-400 text-center py-6">
                لا توجد زيارات حديثة
              </p>
            )}
          </div>
        </SectionCard>
      </div>

      <SectionHeading>مقارنة الاداء</SectionHeading>

      <SectionCard
        title="مقارنة شهرية"
        accent={DASHBOARD.grape}
        headerBg="bg-gradient-to-l from-[#6D28D9]/8 to-[#FAFAFE]"
      >
        <MonthlyComparisonBar data={data.monthlyComparison} />
      </SectionCard>
    </div>
  );
};

export default ComprehensiveDashboard;
