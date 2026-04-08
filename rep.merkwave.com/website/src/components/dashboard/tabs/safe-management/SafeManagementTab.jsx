import React from 'react';
import { Outlet, Link, useLocation, Navigate, useOutletContext } from 'react-router-dom';
import { 
  ArchiveBoxIcon, 
  CreditCardIcon,
  ArrowsRightLeftIcon,
  ArchiveBoxArrowDownIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

const SafeManagementTab = () => {
  const location = useLocation();
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();
  
  // Get the current active tab from the URL path
  const getCurrentTab = () => {
    const path = location.pathname;
    if (path.includes('/safe-management/safes')) return 'safes';
    if (path.includes('/safe-management/accounts')) return 'accounts';
    if (path.includes('/safe-management/safe-transactions')) return 'safe-transactions';
    if (path.includes('/safe-management/safe-transfers')) return 'safe-transfers';
    if (path.includes('/safe-management/safe-reports')) return 'safe-reports';
    return 'safes'; // default
  };

  const currentTab = getCurrentTab();

  const tabs = [
    {
      key: 'safes',
      label: 'الخزائن',
      icon: ArchiveBoxIcon,
      path: '/dashboard/safe-management/safes',
      description: 'إدارة الخزائن وطرق الدفع والأرصدة'
    },
    {
      key: 'accounts',
      label: 'إدارة الحسابات',
      icon: ChartBarIcon,
      path: '/dashboard/safe-management/accounts',
      description: 'إدارة الحسابات المالية للنظام'
    },
    {
      key: 'safe-transactions',
      label: 'المعاملات المالية',
      icon: CreditCardIcon,
      path: '/dashboard/safe-management/safe-transactions',
      description: 'عرض وإدارة جميع المعاملات المالية'
    },
    {
      key: 'safe-transfers',
      label: 'تحويلات الخزائن',
      icon: ArrowsRightLeftIcon,
      path: '/dashboard/safe-management/safe-transfers',
      description: 'تحويل الأموال بين الخزائن المختلفة'
    },
    // {
    //   key: 'safe-reports',
    //   label: 'تقارير الخزائن',
    //   icon: ChartBarIcon,
    //   path: '/dashboard/safe-management/safe-reports',
    //   description: 'تقارير وتحليلات الخزائن'
    // }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <ArchiveBoxArrowDownIcon className="h-8 w-8 text-blue-600 ml-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">إدارة الخزائن</h1>
              <p className="text-sm text-gray-600">إدارة شاملة للخزائن والمعاملات المالية</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 space-x-reverse">
            <ArchiveBoxIcon className="h-6 w-6 text-gray-400" />
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
        <Outlet context={{ setGlobalMessage, setChildRefreshHandler }} />
      </div>
    </div>
  );
};

export default SafeManagementTab;
