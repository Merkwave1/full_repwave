// src/components/dashboard/tabs/reports/integration/IntegrationReportsPage.jsx
// Component for displaying Odoo integration sync logs with tabs

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowPathIcon, 
  ChartBarIcon,
  UserGroupIcon,
  CubeIcon,
  ShoppingCartIcon,
  LinkIcon,
  BanknotesIcon,
  TruckIcon
} from '@heroicons/react/24/outline';

import OverviewTab from './components/OverviewTab.jsx';
import ContactsTab from './components/ContactsTab.jsx';
import ProductsTab from './components/ProductsTab.jsx';
import SalesOrdersTab from './components/SalesOrdersTab.jsx';
import TransactionsTab from './components/TransactionsTab.jsx';
import InventoryTab from './components/InventoryTab.jsx';

function IntegrationReportsPage() {
  const navigate = useNavigate();
  const { tab } = useParams();
  
  // Normalize tab parameter
  const normalizeTab = (t) => {
    const map = {
      overview: 'overview',
      contacts: 'contacts',
      products: 'products',
      'sales-orders': 'sales-orders',
      'transactions': 'transactions',
      'inventory': 'inventory',
      // Legacy routes redirect to transactions
      'payments': 'transactions',
      'safe-transfers': 'transactions',
    };
    return map[t] || 'overview';
  };
  
  const [activeTab, setActiveTab] = useState(normalizeTab(tab || 'overview'));
  const [contactsStats, setContactsStats] = useState(null);
  const [productsStats, setProductsStats] = useState(null);
  const [salesOrdersStats, setSalesOrdersStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const tabs = [
    { key: 'overview', label: 'نظرة عامة', icon: ChartBarIcon },
    { key: 'contacts', label: 'جهات الاتصال', icon: UserGroupIcon },
    { key: 'products', label: 'المنتجات', icon: CubeIcon },
    { key: 'sales-orders', label: 'أوامر البيع', icon: ShoppingCartIcon },
    { key: 'transactions', label: 'المعاملات المالية', icon: BanknotesIcon },
    { key: 'inventory', label: 'عمليات المخزون', icon: TruckIcon },
  ];

  // Sync state with URL param
  useEffect(() => {
    const key = normalizeTab(tab || 'overview');
    setActiveTab(key);
  }, [tab]);

  const handleContactsStatsUpdate = (stats) => {
    setContactsStats(stats);
  };

  const handleProductsStatsUpdate = (stats) => {
    setProductsStats(stats);
  };

  const handleSalesOrdersStatsUpdate = (stats) => {
    setSalesOrdersStats(stats);
  };

  const onChangeTab = (key) => {
    // Update URL to reflect tab
    navigate(`/dashboard/reports/integration/${key}`, { replace: false });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewTab 
            contactsStats={contactsStats} 
            productsStats={productsStats}
            salesOrdersStats={salesOrdersStats}
            onContactsStatsUpdate={handleContactsStatsUpdate}
            onProductsStatsUpdate={handleProductsStatsUpdate}
            onSalesOrdersStatsUpdate={handleSalesOrdersStatsUpdate}
          />
        );
      case 'contacts':
        return <ContactsTab onStatsUpdate={handleContactsStatsUpdate} />;
      case 'products':
        return <ProductsTab onStatsUpdate={handleProductsStatsUpdate} />;
      case 'sales-orders':
        return <SalesOrdersTab />;
      case 'transactions':
        return <TransactionsTab />;
      case 'inventory':
        return <InventoryTab />;
      default:
        return (
          <OverviewTab 
            contactsStats={contactsStats} 
            productsStats={productsStats}
            salesOrdersStats={salesOrdersStats}
            onContactsStatsUpdate={handleContactsStatsUpdate}
            onProductsStatsUpdate={handleProductsStatsUpdate}
            onSalesOrdersStatsUpdate={handleSalesOrdersStatsUpdate}
          />
        );
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50" dir="rtl">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-purple-500 text-white ml-3">
              <LinkIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">تقارير التكامل</h1>
              <p className="text-gray-600 mt-1">عرض سجلات مزامنة البيانات مع نظام Odoo</p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white border-b border-gray-200">
        <nav className="flex px-6 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tabItem) => {
            const IconComponent = tabItem.icon;
            const isActive = activeTab === tabItem.key;
            return (
              <button
                key={tabItem.key}
                onClick={() => onChangeTab(tabItem.key)}
                className={`${
                  isActive
                    ? 'border-purple-500 text-purple-600 bg-purple-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                } whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm flex items-center space-x-2 space-x-reverse transition-colors`}
              >
                <IconComponent className="w-5 h-5" />
                <span>{tabItem.label}</span>
                {/* Badge for stats */}
                {tabItem.key === 'contacts' && contactsStats?.total > 0 && (
                  <span className="bg-indigo-100 text-indigo-600 text-xs px-2 py-0.5 rounded-full mr-2">
                    {contactsStats.total}
                  </span>
                )}
                {tabItem.key === 'products' && productsStats?.total_syncs > 0 && (
                  <span className="bg-teal-100 text-teal-600 text-xs px-2 py-0.5 rounded-full mr-2">
                    {productsStats.total_syncs}
                  </span>
                )}
                {tabItem.key === 'sales-orders' && salesOrdersStats?.total > 0 && (
                  <span className="bg-orange-100 text-orange-600 text-xs px-2 py-0.5 rounded-full mr-2">
                    {salesOrdersStats.total}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 bg-gray-50 overflow-hidden">
        <div className="h-full overflow-y-auto px-6 py-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}

export default IntegrationReportsPage;
