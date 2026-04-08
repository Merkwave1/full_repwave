import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  UserGroupIcon, 
  CubeIcon,
  ChartBarIcon,
  DocumentChartBarIcon,
  MapPinIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { isOdooIntegrationEnabled } from '../../../../utils/odooIntegration';

const ReportsTab = () => {
  const location = useLocation();
  const [odooEnabled, setOdooEnabled] = useState(false);
  
  useEffect(() => {
    setOdooEnabled(isOdooIntegrationEnabled());
  }, []);
  
  // Get the current active tab from the URL path
  const getCurrentTab = () => {
    const path = location.pathname;
    if (path.includes('/reports/clients')) return 'clients';
    if (path.includes('/reports/products')) return 'products';
    if (path.includes('/reports/visits')) return 'visits';
    if (path.includes('/reports/representatives')) return 'representatives';
    if (path.includes('/reports/integration')) return 'integration';
    return 'clients'; // default
  };

  const currentTab = getCurrentTab();

  const allTabs = [
    {
      key: 'clients',
      label: 'تقارير العملاء',
      icon: UserGroupIcon,
      path: '/dashboard/reports/clients',
      description: 'تقارير شاملة عن العملاء والزيارات والمبيعات'
    },
    {
      key: 'products',
      label: 'تقارير المنتجات',
      icon: CubeIcon,
      path: '/dashboard/reports/products',
      description: 'تقارير المخزون والمنتجات والفئات'
    },
    {
      key: 'visits',
      label: 'تقارير الزيارات',
      icon: MapPinIcon,
      path: '/dashboard/reports/visits',
      description: 'تقارير شاملة لزيارات المندوبين والأنشطة'
    },
    {
      key: 'representatives',
      label: 'تقارير المستخدمين',
      icon: UserGroupIcon,
      path: '/dashboard/reports/representatives',
      description: 'حضور المستخدمين وتتبع مواقعهم'
    },
    {
      key: 'integration',
      label: 'تقارير التكامل',
      icon: ArrowPathIcon,
      path: '/dashboard/reports/integration',
      description: 'سجلات مزامنة Odoo والتكامل',
      requiresOdoo: true
    }
  ];

  // Filter tabs based on Odoo integration status
  const tabs = allTabs.filter(tab => !tab.requiresOdoo || odooEnabled);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <DocumentChartBarIcon className="h-8 w-8 text-blue-600 ml-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">التقارير</h1>
              <p className="text-sm text-gray-600">تقارير شاملة لجميع جوانب النظام</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 space-x-reverse">
            <ChartBarIcon className="h-6 w-6 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <nav className="flex px-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.key;
            
            return (
              <Link
                key={tab.key}
                to={tab.path}
                className={`
                  flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-200
                  ${isActive
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                <Icon className="h-5 w-5 ml-2" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 bg-gray-50">
        <Outlet />
      </div>
    </div>
  );
};

export default ReportsTab;
