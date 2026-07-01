import React, { useState, useEffect, useMemo } from "react";
import {
  UserGroupIcon,
  DocumentTextIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  FolderOpenIcon,
  PresentationChartLineIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@heroicons/react/24/outline";

import { getAllClients } from "../../../../../apis/clients.js";

import OverviewTab from "./components/OverviewTab.jsx";
import DetailsTab from "./components/DetailsTab.jsx";
import DocumentsTab from "./components/DocumentsTab.jsx";
import AreasTab from "./components/AreasTab.jsx";
import IndustriesTab from "./components/IndustriesTab.jsx";
import AnalyticsTab from "./components/AnalyticsTab.jsx";

/* ── helpers ─────────────────────────────────────────────── */
const countBy = (arr, fn) =>
  arr.reduce((acc, x) => {
    const k = fn(x);
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

const pct = (n, total) => (total > 0 ? Math.round((n / total) * 100) : 0);

function computeReportData(clients) {
  const total = clients.length;
  if (total === 0) return null;

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const lastYear = thisMonth === 0 ? thisYear - 1 : thisYear;

  const isThisMonth = (d) => {
    const dt = new Date(d);
    return dt.getMonth() === thisMonth && dt.getFullYear() === thisYear;
  };
  const isLastMonth = (d) => {
    const dt = new Date(d);
    return dt.getMonth() === lastMonth && dt.getFullYear() === lastYear;
  };

  const active = clients.filter(
    (c) => c.clients_status === "active" || c.clients_status === 1,
  ).length;
  const prospect = clients.filter(
    (c) => c.clients_status === "prospect",
  ).length;
  const inactive = clients.filter(
    (c) => c.clients_status === "inactive" || c.clients_status === 0,
  ).length;

  const newThisMonth = clients.filter(
    (c) => c.clients_created_at && isThisMonth(c.clients_created_at),
  ).length;
  const newLastMonth = clients.filter(
    (c) => c.clients_created_at && isLastMonth(c.clients_created_at),
  ).length;
  const growthRate =
    newLastMonth > 0
      ? Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100)
      : 0;

  // type_analysis from clients_type or clients_client_type_id
  const typeCounts = countBy(clients, (c) => c.clients_type || "غير محدد");
  const type_analysis = Object.entries(typeCounts).map(([type, count]) => ({
    type,
    count,
    percentage: pct(count, total),
  }));

  // status analysis
  const status_analysis = {
    active,
    active_percentage: pct(active, total),
    prospect,
    prospect_percentage: pct(prospect, total),
    inactive,
    inactive_percentage: pct(inactive, total),
  };

  // contact details
  const phone_count = clients.filter(
    (c) => c.clients_contact_phone1 || c.clients_phone,
  ).length;
  const email_count = clients.filter((c) => c.clients_email).length;
  const address_count = clients.filter(
    (c) => c.clients_address || c.clients_city,
  ).length;
  const vat_count = clients.filter((c) => c.clients_vat_number).length;

  // areas
  const cities = [
    ...new Set(clients.map((c) => c.clients_city).filter(Boolean)),
  ];
  const states = [
    ...new Set(clients.map((c) => c.clients_state).filter(Boolean)),
  ];
  const cityCounts = countBy(
    clients.filter((c) => c.clients_city),
    (c) => c.clients_city,
  );
  const city_distribution = Object.entries(cityCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([city, count]) => ({
      city_name: city,
      client_count: count,
      percentage: pct(count, total),
    }));

  // industries (by clients_industry_id if available; else empty)
  const industryCounts = countBy(
    clients.filter((c) => c.clients_industry_id),
    (c) => String(c.clients_industry_id),
  );
  const industry_distribution = Object.entries(industryCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([id, count]) => ({
      industry_name: `صناعة ${id}`,
      client_count: count,
      percentage: pct(count, total),
    }));

  // documents (no related data available — show 0s)
  const documents = {
    total_documents: 0,
    clients_with_documents: 0,
    clients_without_documents: total,
    document_types: [],
    upload_timeline: [],
  };

  return {
    overview: {
      total_clients: total,
      active_clients: active,
      active_percentage: pct(active, total),
      new_this_month: newThisMonth,
      new_clients_last_month: newLastMonth,
      growth_rate: growthRate,
      type_analysis,
    },
    details: {
      total_clients: total,
      phone_count,
      email_count,
      address_count,
      vat_count,
      clients_with_website: clients.filter((c) => c.clients_website).length,
    },
    documents,
    areas: {
      total_cities: cities.length,
      total_areas: states.length,
      total_tags: 0,
      clients_with_location: clients.filter(
        (c) => c.clients_latitude && c.clients_longitude,
      ).length,
      city_distribution,
      top_areas: city_distribution.slice(0, 5),
    },
    industries: {
      total_industries: Object.keys(industryCounts).length,
      clients_with_industries: clients.filter((c) => c.clients_industry_id)
        .length,
      avg_clients_per_industry:
        Object.keys(industryCounts).length > 0
          ? +(
              clients.filter((c) => c.clients_industry_id).length /
              Object.keys(industryCounts).length
            ).toFixed(1)
          : 0,
      industry_distribution,
    },
    analytics: {
      total_clients: total,
      status_analysis,
      type_analysis,
      growth_rate: growthRate,
      new_this_month: newThisMonth,
    },
  };
}

const ClientsReportsPage = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const SUB_TABS = [
    {
      key: "overview",
      label: "نظرة عامة",
      desc: "الإحصائيات الكلية",
      icon: ChartBarIcon,
      gradientFrom: "#8B5FD6",
      gradientTo: "#6B45B0",
      iconBg: "#EDE7FF",
      iconColor: "#8B5FD6",
    },
    {
      key: "analytics",
      label: "التحليلات",
      desc: "تحليل مفصل للبيانات",
      icon: PresentationChartLineIcon,
      gradientFrom: "#F97366",
      gradientTo: "#d45a4e",
      iconBg: "#FFF0EE",
      iconColor: "#F97366",
    },
    {
      key: "details",
      label: "التفاصيل",
      desc: "بيانات الاتصال والملفات",
      icon: DocumentTextIcon,
      gradientFrom: "#10b981",
      gradientTo: "#059669",
      iconBg: "#ecfdf5",
      iconColor: "#10b981",
    },
    {
      key: "areas",
      label: "المناطق",
      desc: "التوزيع الجغرافي",
      icon: MapPinIcon,
      gradientFrom: "#f59e0b",
      gradientTo: "#d97706",
      iconBg: "#fffbeb",
      iconColor: "#f59e0b",
    },
    {
      key: "industries",
      label: "الصناعات",
      desc: "تصنيف حسب القطاع",
      icon: BuildingOfficeIcon,
      gradientFrom: "#64748b",
      gradientTo: "#475569",
      iconBg: "#f1f5f9",
      iconColor: "#64748b",
    },
    {
      key: "documents",
      label: "الوثائق",
      desc: "ملفات ووثائق العملاء",
      icon: FolderOpenIcon,
      gradientFrom: "#7A52C2",
      gradientTo: "#5A3AA0",
      iconBg: "#f3e8ff",
      iconColor: "#7A52C2",
    },
  ];

  useEffect(() => {
    setLoading(true);
    setError(null);
    getAllClients()
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.data ?? []);
        setClients(list);
      })
      .catch((err) => {
        setError(err.message || "فشل تحميل بيانات العملاء");
      })
      .finally(() => setLoading(false));
  }, []);

  const reportData = useMemo(() => computeReportData(clients), [clients]);

  const kpis = reportData
    ? [
        {
          label: "إجمالي العملاء",
          value: reportData.overview.total_clients,
          sub: null,
          from: "#8B5FD6",
          to: "#6B45B0",
          icon: UserGroupIcon,
        },
        {
          label: "العملاء النشطون",
          value: reportData.overview.active_clients,
          sub: `${reportData.overview.active_percentage}%`,
          from: "#10b981",
          to: "#059669",
          icon: UserGroupIcon,
        },
        {
          label: "جدد هذا الشهر",
          value: reportData.overview.new_this_month,
          sub: null,
          from: "#F97366",
          to: "#d45a4e",
          icon: ChartBarIcon,
        },
        {
          label: "معدل النمو",
          value: `${reportData.overview.growth_rate > 0 ? "+" : ""}${reportData.overview.growth_rate}%`,
          sub: null,
          from: reportData.overview.growth_rate >= 0 ? "#10b981" : "#ef4444",
          to: reportData.overview.growth_rate >= 0 ? "#059669" : "#dc2626",
          icon: reportData.overview.growth_rate >= 0 ? ArrowUpIcon : ArrowDownIcon,
        },
      ]
    : [];

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#EDE7FF] border-t-[#8B5FD6]"></div>
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="text-center p-6 rounded-2xl bg-red-50 border border-red-100">
            <p className="text-red-600 font-semibold mb-1">خطأ في تحميل البيانات</p>
            <p className="text-gray-500 text-sm">{error}</p>
          </div>
        </div>
      );
    }
    if (!reportData) {
      return (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-400">لا توجد بيانات عملاء لعرضها</p>
        </div>
      );
    }
    switch (activeTab) {
      case "overview":
        return <OverviewTab data={reportData.overview} loading={false} />;
      case "details":
        return <DetailsTab data={reportData.details} loading={false} />;
      case "documents":
        return <DocumentsTab data={reportData.documents} loading={false} />;
      case "areas":
        return <AreasTab data={reportData.areas} loading={false} />;
      case "industries":
        return <IndustriesTab data={reportData.industries} loading={false} />;
      case "analytics":
        return <AnalyticsTab data={reportData.analytics} loading={false} />;
      default:
        return <OverviewTab data={reportData.overview} loading={false} />;
    }
  };

  return (
    <div className="h-full flex flex-col" dir="rtl">
      {/* KPI Summary Strip */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100 px-5 py-4">
        {loading ? (
          <div className="flex gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-1 h-20 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : kpis.length > 0 ? (
          <div className="flex gap-3">
            {kpis.map((kpi, i) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-2xl p-4 text-white min-w-0"
                  style={{
                    background: `linear-gradient(135deg, ${kpi.from} 0%, ${kpi.to} 100%)`,
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Icon className="h-4 w-4 opacity-80" />
                    {kpi.sub && (
                      <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">
                        {kpi.sub}
                      </span>
                    )}
                  </div>
                  <p className="text-xl font-bold mt-1 leading-tight">
                    {typeof kpi.value === "number"
                      ? kpi.value.toLocaleString()
                      : kpi.value}
                  </p>
                  <p className="text-xs opacity-75 mt-0.5">{kpi.label}</p>
                </div>
              );
            })}
          </div>
        ) : null}
        {error && <p className="text-red-500 text-xs mt-2">⚠ {error}</p>}
      </div>

      {/* Body: vertical sidebar + content panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Vertical tab sidebar */}
        <aside className="w-52 flex-shrink-0 bg-white border-l border-gray-100 flex flex-col py-3 px-2 gap-1 overflow-y-auto">
          {SUB_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full text-right px-3 py-3 flex items-center gap-3 rounded-xl transition-all duration-200 ${
                  !isActive ? "hover:bg-gray-50" : ""
                }`}
                style={
                  isActive
                    ? {
                        background: `linear-gradient(135deg, ${tab.gradientFrom} 0%, ${tab.gradientTo} 100%)`,
                        boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
                      }
                    : {}
                }
              >
                <div
                  className="p-1.5 rounded-lg flex-shrink-0"
                  style={{
                    backgroundColor: isActive
                      ? "rgba(255,255,255,0.2)"
                      : tab.iconBg,
                  }}
                >
                  <Icon
                    className="h-4 w-4"
                    style={{ color: isActive ? "#fff" : tab.iconColor }}
                  />
                </div>
                <div className="min-w-0 text-right">
                  <p
                    className="text-sm font-semibold leading-tight"
                    style={{ color: isActive ? "#fff" : "#1f2937" }}
                  >
                    {tab.label}
                  </p>
                  <p
                    className="text-xs leading-tight mt-0.5 truncate"
                    style={{
                      color: isActive ? "rgba(255,255,255,0.7)" : "#9ca3af",
                    }}
                  >
                    {tab.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </aside>

        {/* Content panel */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-5">{renderTabContent()}</div>
        </main>
      </div>
    </div>
  );
};

export default ClientsReportsPage;
