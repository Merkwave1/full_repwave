// src/components/dashboard/tabs/ProductManagementTab.jsx
import React from 'react';
import { NavLink, Outlet, useOutletContext } from 'react-router-dom';
import { ShoppingBagIcon, TagIcon, ScaleIcon } from 'lucide-react';
import {
 
  ArchiveBoxIcon, // Using for Packaging Types
  PuzzlePieceIcon
} from '@heroicons/react/24/outline';

function ProductManagementTab() {
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();

  const getSubTabNavLinkClasses = (isActive) =>
    `py-2 px-4 text-sm font-medium rounded-t-lg transition-colors duration-200 ml-2 rtl:mr-2 rtl:ml-0 flex items-center focus:outline-none ${
      isActive ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'
    }`;

  return (
    <div className="p-4" dir="rtl">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">إدارة المنتجات</h2>
      <div className="flex flex-nowrap border-b border-gray-200 mb-6 overflow-x-auto" dir="rtl">
        <NavLink
          to="products"
          className={({ isActive }) => getSubTabNavLinkClasses(isActive)}
        >
          <ShoppingBagIcon className="w-4 h-4 ml-2" /> المنتجات
        </NavLink>
        <NavLink
          to="categories"
          className={({ isActive }) => getSubTabNavLinkClasses(isActive)}
        >
          <TagIcon className="w-4 h-4 ml-2" /> الأقسام
        </NavLink>
        <NavLink
          to="attributes"
          className={({ isActive }) => getSubTabNavLinkClasses(isActive)}
        >
          <PuzzlePieceIcon className="w-4 h-4 ml-2" /> الخصائص
        </NavLink>
        <NavLink
          to="units"
          className={({ isActive }) => getSubTabNavLinkClasses(isActive)}
        >
          <ScaleIcon className="w-4 h-4 ml-2" /> الوحدات
        </NavLink>
        {/* UPDATED: Add the new sub-tab link */}
        <NavLink
          to="packaging-types"
          className={({ isActive }) => getSubTabNavLinkClasses(isActive)}
        >
          <ArchiveBoxIcon className="w-4 h-4 ml-2" /> أنواع التعبئة
        </NavLink>
      </div>
      <div className="mt-6">
        <Outlet context={{ setGlobalMessage, setChildRefreshHandler }} />
      </div>
    </div>
  );
}

export default ProductManagementTab;
