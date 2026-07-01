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

  const SUB_TABS = [
    { key: 'overview', label: 'نظرة عامة', desc: 'الإحصائيات الكلية', icon: ChartBarIcon, gradientFrom: '#8B5FD6', gradientTo: '#6B45B0', iconBg: '#EDE7FF', iconColor: '#8B5FD6' },
    { key: 'inventory', label: 'المخزون', desc: 'كميات وحركة المخزون', icon: CubeIcon, gradientFrom: '#F97366', gradientTo: '#d45a4e', iconBg: '#FFF0EE', iconColor: '#F97366' },
    { key: 'categories', label: 'الفئات', desc: 'تصنيف المنتجات', icon: TagIcon, gradientFrom: '#10b981', gradientTo: '#059669', iconBg: '#ecfdf5', iconColor: '#10b981' },
    { key: 'suppliers', label: 'الموردين', desc: 'بيانات الموردين', icon: TruckIcon, gradientFrom: '#f59e0b', gradientTo: '#d97706', iconBg: '#fffbeb', iconColor: '#f59e0b' },
    { key: 'analytics', label: 'التحليلات', desc: 'تحليل المبيعات والأداء', icon: PresentationChartLineIcon, gradientFrom: '#64748b', gradientTo: '#475569', iconBg: '#f1f5f9', iconColor: '#64748b' },
    { key: 'interested_products', label: 'اهتمامات العملاء', desc: 'منتجات مطلوبة', icon: UserGroupIcon, gradientFrom: '#7A52C2', gradientTo: '#5A3AA0', iconBg: '#f3e8ff', iconColor: '#7A52C2' },
    { key: 'stock_levels', label: 'مستويات المخزون', desc: 'تنبيهات المخزون', icon: ExclamationTriangleIcon, gradientFrom: '#ef4444', gradientTo: '#dc2626', iconBg: '#fef2f2', iconColor: '#ef4444' },
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
    <div className="h-full flex flex-col" dir="rtl">
      {error && (
        <div className="flex-shrink-0 bg-red-50 border-b border-red-100 px-5 py-2">
          <p className="text-red-500 text-xs">⚠ {error}</p>
        </div>
      )}
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-52 flex-shrink-0 bg-white border-l border-gray-100 flex flex-col py-3 px-2 gap-1 overflow-y-auto">
          {SUB_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full text-right px-3 py-3 flex items-center gap-3 rounded-xl transition-all duration-200 ${
                  !isActive ? 'hover:bg-gray-50' : ''
                }`}
                style={
                  isActive
                    ? { background: `linear-gradient(135deg, ${tab.gradientFrom} 0%, ${tab.gradientTo} 100%)`, boxShadow: '0 4px 14px rgba(0,0,0,0.18)' }
                    : {}
                }
              >
                <div
                  className="p-1.5 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : tab.iconBg }}
                >
                  <Icon className="h-4 w-4" style={{ color: isActive ? '#fff' : tab.iconColor }} />
                </div>
                <div className="min-w-0 text-right">
                  <p className="text-sm font-semibold leading-tight" style={{ color: isActive ? '#fff' : '#1f2937' }}>
                    {tab.label}
                  </p>
                  <p className="text-xs leading-tight mt-0.5 truncate" style={{ color: isActive ? 'rgba(255,255,255,0.7)' : '#9ca3af' }}>
                    {tab.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </aside>
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-5">{renderTabContent()}</div>
        </main>
      </div>
    </div>
  );
};

export default ProductsReportsPage;
