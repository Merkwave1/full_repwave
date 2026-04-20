import React from 'react';
import { NavLink, Outlet, useOutletContext } from 'react-router-dom';
import { FileTextIcon, ArrowRightLeftIcon, PackageIcon} from 'lucide-react';
import {
  InboxArrowDownIcon,
  TruckIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

function InventoryManagementTab() {
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();

  const getSubTabNavLinkClasses = (isActive) =>
    `py-2 px-4 text-sm font-medium rounded-t-lg transition-colors duration-200 ml-2 rtl:mr-2 rtl:ml-0 flex items-center focus:outline-none ${
      isActive ? 'bg-[#8DD8F5] text-black shadow-md' : 'text-gray-700 hover:text-[#8DD8F5] hover:bg-gray-100'
    }`;

  return (
    <div className="p-4" dir="rtl">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">إدارة المخازن</h2>
      <div className="flex flex-nowrap border-b border-gray-200 mb-6 overflow-x-auto" dir="rtl">
        <NavLink
          to="warehouses" // Relative path: /dashboard/inventory-management/warehouses
          className={({ isActive }) => getSubTabNavLinkClasses(isActive)}
        >
          <PackageIcon className="w-4 h-4 ml-2" /> المخازن
        </NavLink>
        <NavLink
          to="inventory" // Relative path: /dashboard/inventory-management/inventory
          className={({ isActive }) => getSubTabNavLinkClasses(isActive)}
        >
          <FileTextIcon className="w-4 h-4 ml-2" /> المخزون
        </NavLink>
        <NavLink
          to="transfers" // Relative path: /dashboard/inventory-management/transfers
          className={({ isActive }) => getSubTabNavLinkClasses(isActive)}
        >
          <ArrowRightLeftIcon className="h-4 w-4 ml-2" /> التحويلات
        </NavLink>
        <NavLink
          to="loads" // Relative path: /dashboard/inventory-management/loads
          className={({ isActive }) => getSubTabNavLinkClasses(isActive)}
        >
          <TruckIcon className="h-4 w-4 ml-2" /> طلبات التحميل
        </NavLink>
        <NavLink
          to="receive-products" // Relative path: /dashboard/inventory-management/receive-products
          className={({ isActive }) => getSubTabNavLinkClasses(isActive)}
        >
          <InboxArrowDownIcon className="h-4 w-4 ml-2" /> استلام المنتجات
        </NavLink>
        <NavLink
          to="deliver-products" // Relative path: /dashboard/inventory-management/deliver-products
          className={({ isActive }) => getSubTabNavLinkClasses(isActive)}
        >
          <TruckIcon className="h-4 w-4 ml-2" /> تسليم المنتجات
        </NavLink>
        <NavLink
          to="receiving-records" // Relative path: /dashboard/inventory-management/receiving-records
          className={({ isActive }) => getSubTabNavLinkClasses(isActive)}
        >
          <DocumentTextIcon className="h-4 w-4 ml-2" /> سجلات الاستلام
        </NavLink>
        <NavLink
          to="delivery-records" // Relative path: /dashboard/inventory-management/delivery-records
          className={({ isActive }) => getSubTabNavLinkClasses(isActive)}
        >
          <TruckIcon className="h-4 w-4 ml-2" /> سجلات التسليم
        </NavLink>

      </div>
      <div className="mt-6">
        <Outlet context={{ setGlobalMessage, setChildRefreshHandler }} />
      </div>
    </div>
  );
}

export default InventoryManagementTab;
