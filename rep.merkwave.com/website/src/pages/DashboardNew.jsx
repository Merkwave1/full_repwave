// src/pages/DashboardNew.jsx - New Dashboard with Comprehensive Data
import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import UsersTab from '../components/dashboard/tabs/users/UsersTab.jsx';
import ReportsTab from '../components/dashboard/tabs/reports/ReportsTab.jsx';
import SettingsTab from '../components/dashboard/tabs/settings/SettingsTab.jsx';
import ProductManagementTab from '../components/dashboard/tabs/ProductManagementTab.jsx';
import AuthTestButton from '../components/common/AuthTestButton.jsx';
import ComprehensiveDashboard from '../components/dashboard/ComprehensiveDashboard.jsx';

function HomeTabContent() {
  // Use the new comprehensive dashboard
  return <ComprehensiveDashboard />;
}

function DashboardPage() {
  const navLinkClasses = ({ isActive }) => `py-2 px-4 text-sm font-medium border-b-2 focus:outline-none transition-colors duration-200 ${isActive ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`;

  return (
    <div className="p-4" dir="rtl">
      <div className="flex flex-wrap border-b border-gray-200 mb-6 items-center" dir="rtl">
        <div className="flex-1 flex flex-wrap">
          <NavLink to="/dashboard" end className={navLinkClasses}>الرئيسية</NavLink>
          <NavLink to="/dashboard/users" className={navLinkClasses}>المستخدمون</NavLink>
          <NavLink to="/dashboard/product-management" className={navLinkClasses}>إدارة المنتجات</NavLink>
          <NavLink to="/dashboard/inventory-management" className={navLinkClasses}>إدارة المخازن</NavLink>
          <NavLink to="/dashboard/reports" className={navLinkClasses}>التقارير</NavLink>
          <NavLink to="/dashboard/settings" className={navLinkClasses}>الإعدادات</NavLink>
        </div>
        <div className="ml-4">
          <AuthTestButton />
        </div>
      </div>
      <Outlet />
    </div>
  );
}

DashboardPage.HomeTab = HomeTabContent;
export default DashboardPage;