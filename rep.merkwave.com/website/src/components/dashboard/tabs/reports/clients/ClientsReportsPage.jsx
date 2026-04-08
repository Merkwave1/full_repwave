import React, { useState, useEffect } from 'react';
import {
  UserGroupIcon,
  DocumentTextIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  FolderOpenIcon,
  PresentationChartLineIcon
} from '@heroicons/react/24/outline';

import { getClientReports } from '../../../../../apis/clients.js';

import OverviewTab from './components/OverviewTab.jsx';
import DetailsTab from './components/DetailsTab.jsx';
import DocumentsTab from './components/DocumentsTab.jsx';
import AreasTab from './components/AreasTab.jsx';
import IndustriesTab from './components/IndustriesTab.jsx';
import AnalyticsTab from './components/AnalyticsTab.jsx';

const ClientsReportsPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const tabs = [
    { key: 'overview', label: 'نظرة عامة', icon: ChartBarIcon },
    { key: 'details', label: 'التفاصيل', icon: DocumentTextIcon },
    { key: 'documents', label: 'الوثائق', icon: FolderOpenIcon },
    { key: 'areas', label: 'المناطق', icon: MapPinIcon },
    { key: 'industries', label: 'الصناعات', icon: BuildingOfficeIcon },
    { key: 'analytics', label: 'التحليلات', icon: PresentationChartLineIcon },
  ];

  useEffect(() => {
    loadTabData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadTabData = async () => {
    if (data[activeTab]) return;

    setLoading(true);
    setError(null);

    try {
      const reportData = await getClientReports(activeTab);
      setData((prev) => ({ ...prev, [activeTab]: reportData }));
    } catch (err) {
      console.error(`❌ Error loading data for tab ${activeTab}:`, err);
      setError(err.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab data={data.overview} loading={loading && !data.overview} />;
      case 'details':
        return <DetailsTab data={data.details} loading={loading && !data.details} />;
      case 'documents':
        return <DocumentsTab data={data.documents} loading={loading && !data.documents} />;
      case 'areas':
        return <AreasTab data={data.areas} loading={loading && !data.areas} />;
      case 'industries':
        return <IndustriesTab data={data.industries} loading={loading && !data.industries} />;
      case 'analytics':
        return <AnalyticsTab data={data.analytics} loading={loading && !data.analytics} />;
      default:
        return <OverviewTab data={data.overview} loading={loading && !data.overview} />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50" dir="rtl">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center">
          <div className="p-2 rounded-lg bg-blue-500 text-white ml-3">
            <UserGroupIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">تقارير العملاء</h1>
            <p className="text-gray-600 mt-1">تقارير شاملة ومفصلة لجميع بيانات العملاء وتحليلاتهم</p>
            {error && <p className="text-red-600 text-sm mt-1">تحذير: {error}</p>}
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
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
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
