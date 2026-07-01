import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  UserGroupIcon,
  CubeIcon,
  DocumentChartBarIcon,
  MapPinIcon,
  ArrowPathIcon,
  IdentificationIcon,
} from '@heroicons/react/24/outline';
import { isOdooIntegrationEnabled } from '../../../../utils/odooIntegration';

const SECTION_TABS = [
  {
    key: 'clients',
    label: 'العملاء',
    icon: UserGroupIcon,
    path: '/dashboard/reports/clients',
    accent: '#8B5FD6',
  },
  {
    key: 'products',
    label: 'المنتجات',
    icon: CubeIcon,
    path: '/dashboard/reports/products',
    accent: '#F97366',
  },
  {
    key: 'visits',
    label: 'الزيارات',
    icon: MapPinIcon,
    path: '/dashboard/reports/visits',
    accent: '#10b981',
  },
  {
    key: 'representatives',
    label: 'المستخدمون',
    icon: IdentificationIcon,
    path: '/dashboard/reports/representatives',
    accent: '#f59e0b',
  },
  {
    key: 'integration',
    label: 'التكامل',
    icon: ArrowPathIcon,
    path: '/dashboard/reports/integration',
    accent: '#64748b',
    requiresOdoo: true,
  },
];

const ReportsTab = () => {
  const location = useLocation();
  const [odooEnabled, setOdooEnabled] = useState(false);

  useEffect(() => {
    setOdooEnabled(isOdooIntegrationEnabled());
  }, []);

  const getCurrentTab = () => {
    const path = location.pathname;
    if (path.includes('/reports/clients')) return 'clients';
    if (path.includes('/reports/products')) return 'products';
    if (path.includes('/reports/visits')) return 'visits';
    if (path.includes('/reports/representatives')) return 'representatives';
    if (path.includes('/reports/integration')) return 'integration';
    return 'clients';
  };

  const currentTab = getCurrentTab();
  const tabs = SECTION_TABS.filter((t) => !t.requiresOdoo || odooEnabled);

  return (
    <div className="h-full flex flex-col" dir="rtl">
      {/* Gradient header + rising tab strip */}
      <div
        className="flex-shrink-0"
        style={{
          background: 'linear-gradient(135deg, #1A0F35 0%, #2D1B69 55%, #8B5FD6 100%)',
        }}
      >
        {/* Title row */}
        <div className="flex items-center gap-3 px-6 pt-5 pb-4">
          <div className="p-2.5 rounded-xl bg-white/15 flex-shrink-0">
            <DocumentChartBarIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">
              التقارير والتحليلات
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(196,168,240,0.8)' }}>
              رؤية شاملة لأداء جميع جوانب النظام
            </p>
          </div>
        </div>

        {/* Tab pills — rise from gradient surface */}
        <div
          className="flex px-4 gap-1 overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.key;
            return (
              <Link
                key={tab.key}
                to={tab.path}
                className={`
                  flex items-center gap-2 px-5 py-2.5 text-sm font-semibold
                  whitespace-nowrap flex-shrink-0 transition-all duration-200
                  rounded-t-2xl
                  ${isActive
                    ? 'bg-gray-50 text-[#1A0F35]'
                    : 'text-[#C4A8F0] hover:text-white hover:bg-white/10'
                  }
                `}
              >
                <Icon
                  className="h-4 w-4 flex-shrink-0"
                  style={isActive ? { color: tab.accent } : { opacity: 0.8 }}
                />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-hidden bg-gray-50">
        <Outlet />
      </div>
    </div>
  );
};

export default ReportsTab;
