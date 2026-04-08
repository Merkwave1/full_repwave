// src/components/dashboard/tabs/purchases-management/PurchasesManagementTab.jsx
import React from 'react';
import { NavLink, Outlet, useOutletContext } from 'react-router-dom';
import { ShoppingCartIcon, ArrowUturnLeftIcon, BanknotesIcon, ReceiptPercentIcon } from '@heroicons/react/24/outline'; // Added icon for purchase invoices

function PurchasesManagementTab() {
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();

  const getSubTabNavLinkClasses = (isActive) =>
    `py-2 px-4 text-sm font-medium rounded-t-lg transition-colors duration-200 ml-2 rtl:mr-2 rtl:ml-0 flex items-center focus:outline-none ${
      isActive ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'
    }`;

  return (
    <div className="p-4" dir="rtl">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">إدارة المشتريات</h2>
      <div className="flex flex-nowrap border-b border-gray-200 mb-6 overflow-x-auto" dir="rtl">
        <NavLink
          to="purchase-orders" // Relative path: /dashboard/purchases-management/purchase-orders
          className={({ isActive }) => getSubTabNavLinkClasses(isActive)}
        >
          <ShoppingCartIcon className="h-4 w-4 ml-2" /> أوامر الشراء
        </NavLink>
        <NavLink
          to="purchase-invoices" // New tab for purchase invoices
          className={({ isActive }) => getSubTabNavLinkClasses(isActive)}
        >
          <ReceiptPercentIcon className="h-4 w-4 ml-2" /> فواتير الشراء
        </NavLink>
        <NavLink
          to="purchase-returns" // Relative path: /dashboard/purchases-management/purchase-returns
          className={({ isActive }) => getSubTabNavLinkClasses(isActive)}
        >
          <ArrowUturnLeftIcon className="h-4 w-4 ml-2" /> مرتجعات الشراء
        </NavLink>
        <NavLink
          to="supplier-payments" // Relative path: /dashboard/purchases-management/supplier-payments
          className={({ isActive }) => getSubTabNavLinkClasses(isActive)}
        >
          <BanknotesIcon className="h-4 w-4 ml-2" /> مدفوعات الموردين
        </NavLink>
      </div>
      <div className="mt-6">
        {/* The Outlet renders the matched child route component */}
        <Outlet context={{ setGlobalMessage, setChildRefreshHandler }} />
      </div>
    </div>
  );
}

export default PurchasesManagementTab;
