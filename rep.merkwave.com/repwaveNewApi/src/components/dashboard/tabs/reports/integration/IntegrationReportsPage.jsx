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

  const SUB_TABS = [
    { key: 'overview', label: 'نظرة عامة', desc: 'ملخص التكامل', icon: ChartBarIcon, gradientFrom: '#8B5FD6', gradientTo: '#6B45B0', iconBg: '#EDE7FF', iconColor: '#8B5FD6' },
    { key: 'contacts', label: 'جهات الاتصال', desc: 'مزامنة جهات الاتصال', icon: UserGroupIcon, gradientFrom: '#10b981', gradientTo: '#059669', iconBg: '#ecfdf5', iconColor: '#10b981' },
    { key: 'products', label: 'المنتجات', desc: 'مزامنة المنتجات', icon: CubeIcon, gradientFrom: '#F97366', gradientTo: '#d45a4e', iconBg: '#FFF0EE', iconColor: '#F97366' },
    { key: 'sales-orders', label: 'أوامر البيع', desc: 'مزامنة أوامر البيع', icon: ShoppingCartIcon, gradientFrom: '#f59e0b', gradientTo: '#d97706', iconBg: '#fffbeb', iconColor: '#f59e0b' },
    { key: 'transactions', label: 'المعاملات المالية', desc: 'سجلات المعاملات', icon: BanknotesIcon, gradientFrom: '#64748b', gradientTo: '#475569', iconBg: '#f1f5f9', iconColor: '#64748b' },
    { key: 'inventory', label: 'عمليات المخزون', desc: 'مزامنة المخزون', icon: TruckIcon, gradientFrom: '#7A52C2', gradientTo: '#5A3AA0', iconBg: '#f3e8ff', iconColor: '#7A52C2' },
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
    <div className="h-full flex flex-col" dir="rtl">
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-52 flex-shrink-0 bg-white border-l border-gray-100 flex flex-col py-3 px-2 gap-1 overflow-y-auto">
          {SUB_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            const badge =
              tab.key === 'contacts' ? (contactsStats?.total || 0) :
              tab.key === 'products' ? (productsStats?.total_syncs || 0) :
              tab.key === 'sales-orders' ? (salesOrdersStats?.total || 0) : 0;
            return (
              <button
                key={tab.key}
                onClick={() => onChangeTab(tab.key)}
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
                <div className="min-w-0 text-right flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-sm font-semibold leading-tight truncate" style={{ color: isActive ? '#fff' : '#1f2937' }}>
                      {tab.label}
                    </p>
                    {badge > 0 && (
                      <span
                        className="text-xs rounded-full px-1.5 py-0.5 font-medium flex-shrink-0"
                        style={{
                          backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : '#EDE7FF',
                          color: isActive ? '#fff' : '#8B5FD6',
                        }}
                      >
                        {badge}
                      </span>
                    )}
                  </div>
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
}

export default IntegrationReportsPage;
