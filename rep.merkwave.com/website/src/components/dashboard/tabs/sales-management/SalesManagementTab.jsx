// src/components/dashboard/tabs/sales-management/SalesManagementTab.jsx
import React from 'react';
import { NavLink, Outlet, useOutletContext } from 'react-router-dom';
import { ShoppingBagIcon, ArrowUturnLeftIcon, CreditCardIcon, ClipboardDocumentListIcon, BanknotesIcon } from '@heroicons/react/24/outline';

function SalesManagementTab() {
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();

  const getSubTabNavLinkClasses = (isActive) =>
    `py-2 px-4 text-sm font-medium rounded-t-lg transition-colors duration-200 ml-2 rtl:mr-2 rtl:ml-0 flex items-center focus:outline-none ${
      isActive ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'
    }`;

  return (
    <div className="p-4" dir="rtl">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">إدارة المبيعات</h2>
      <div className="flex flex-nowrap border-b border-gray-200 mb-6 overflow-x-auto" dir="rtl">
        <NavLink
          to="sales-orders" // Relative path: /dashboard/sales-management/sales-orders
          className={({ isActive }) => getSubTabNavLinkClasses(isActive)}
        >
          <ShoppingBagIcon className="h-4 w-4 ml-2" /> أوامر البيع
        </NavLink>
        <NavLink
          to="sales-invoices" // Relative path: /dashboard/sales-management/sales-invoices
          className={({ isActive }) => getSubTabNavLinkClasses(isActive)}
        >
          <ClipboardDocumentListIcon className="h-4 w-4 ml-2" /> فواتير المبيعات
        </NavLink>
  {/** Removed deliver-products and delivery-history per request */}
        <NavLink
          to="sales-returns" // Relative path: /dashboard/sales-management/sales-returns
          className={({ isActive }) => getSubTabNavLinkClasses(isActive)}
        >
          <ArrowUturnLeftIcon className="h-4 w-4 ml-2" /> مرتجعات البيع
        </NavLink>
        <NavLink
          to="client-cash" // Combined tab: payments + refunds
          className={({ isActive }) => getSubTabNavLinkClasses(isActive)}
        >
          <BanknotesIcon className="h-4 w-4 ml-2" /> مدفوعات العملاء
        </NavLink>
      </div>
      <div className="mt-6">
        {/* The Outlet renders the matched child route component */}
        <Outlet context={{ setGlobalMessage, setChildRefreshHandler }} />
      </div>
    </div>
  );
}

export default SalesManagementTab;
