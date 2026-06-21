import React, { useState, useEffect, useMemo } from "react";
import {
  UserGroupIcon,
  DocumentTextIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  FolderOpenIcon,
  PresentationChartLineIcon,
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

  const tabs = [
    { key: "overview", label: "نظرة عامة", icon: ChartBarIcon },
    { key: "details", label: "التفاصيل", icon: DocumentTextIcon },
    { key: "documents", label: "الوثائق", icon: FolderOpenIcon },
    { key: "areas", label: "المناطق", icon: MapPinIcon },
    { key: "industries", label: "الصناعات", icon: BuildingOfficeIcon },
    { key: "analytics", label: "التحليلات", icon: PresentationChartLineIcon },
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
        console.error("❌ Error loading clients for reports:", err);
        setError(err.message || "فشل تحميل بيانات العملاء");
      })
      .finally(() => setLoading(false));
  }, []);

  const reportData = useMemo(() => computeReportData(clients), [clients]);

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#C4A8F0]"></div>
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <p className="text-red-600 font-semibold mb-2">
              خطأ في تحميل البيانات
            </p>
            <p className="text-gray-500 text-sm">{error}</p>
          </div>
        </div>
      );
    }
    if (!reportData) {
      return (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">لا توجد بيانات عملاء لعرضها</p>
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
    <div className="h-full flex flex-col bg-gray-50" dir="rtl">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center">
          <div className="p-2 rounded-lg bg-[#C4A8F0] text-[#1A0F35] ml-3">
            <UserGroupIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">تقارير العملاء</h1>
            <p className="text-gray-600 mt-1">
              تقارير شاملة ومفصلة لجميع بيانات العملاء وتحليلاتهم
            </p>
            {error && (
              <p className="text-red-600 text-sm mt-1">تحذير: {error}</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200">
        <nav className="flex px-6 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`${
                  isActive
                    ? "border-[#C4A8F0] text-[#1A0F35] bg-[#E0F7FF]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                } whitespace-nowrap py-4 px-3 border-b-2 font-medium text-sm flex items-center space-x-2 space-x-reverse transition-colors`}
              >
                <IconComponent className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex-1 bg-gray-50 overflow-hidden">
        <div className="h-full overflow-y-auto px-6 py-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default ClientsReportsPage;
