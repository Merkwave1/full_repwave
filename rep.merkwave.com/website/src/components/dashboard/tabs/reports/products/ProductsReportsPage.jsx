import React, { useState, useEffect } from 'react';
import {
  CubeIcon,
  ChartBarIcon,
  BuildingStorefrontIcon,
  TagIcon,
  TruckIcon,
  PresentationChartLineIcon,
  ExclamationTriangleIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

import { getProductReports } from '../../../../../apis/products.js';

import OverviewTab from './components/OverviewTab.jsx';
import InventoryTab from './components/InventoryTab.jsx';
import CategoriesTab from './components/CategoriesTab.jsx';
import SuppliersTab from './components/SuppliersTab.jsx';
import AnalyticsTab from './components/AnalyticsTab.jsx';
import StockLevelsTab from './components/StockLevelsTab.jsx';
import InterestedProductsTab from './components/InterestedProductsTab.jsx';

const ProductsReportsPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const tabs = [
    { key: 'overview', label: 'نظرة عامة', icon: ChartBarIcon },
    { key: 'inventory', label: 'المخزون', icon: CubeIcon },
    { key: 'categories', label: 'الفئات', icon: TagIcon },
    { key: 'suppliers', label: 'الموردين', icon: TruckIcon },
    { key: 'analytics', label: 'التحليلات', icon: PresentationChartLineIcon },
    { key: 'interested_products', label: 'اهتمامات العملاء', icon: UserGroupIcon },
    { key: 'stock_levels', label: 'مستويات المخزون', icon: ExclamationTriangleIcon },
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
      const reportData = await getProductReports(activeTab);
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
      case 'inventory':
        return <InventoryTab data={data.inventory} loading={loading && !data.inventory} />;
      case 'categories':
        return <CategoriesTab data={data.categories} loading={loading && !data.categories} />;
      case 'suppliers':
        return <SuppliersTab data={data.suppliers} loading={loading && !data.suppliers} />;
      case 'analytics':
        return <AnalyticsTab data={data.analytics} loading={loading && !data.analytics} />;
      case 'interested_products':
        return <InterestedProductsTab data={data.interested_products} loading={loading && !data.interested_products} />;
      case 'stock_levels':
        return <StockLevelsTab data={data.stock_levels} loading={loading && !data.stock_levels} />;
      default:
        return <OverviewTab data={data.overview} loading={loading && !data.overview} />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50" dir="rtl">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center">
          <div className="p-2 rounded-lg bg-green-500 text-white ml-3">
            <CubeIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">تقارير المنتجات والمخزون</h1>
            <p className="text-gray-600 mt-1">تقارير شاملة ومفصلة لجميع المنتجات والمخزون والموردين</p>
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
                    ? 'border-green-500 text-green-600 bg-green-50'
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

export default ProductsReportsPage;
