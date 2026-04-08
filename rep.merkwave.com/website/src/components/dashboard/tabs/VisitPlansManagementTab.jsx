// src/components/dashboard/tabs/VisitPlansManagementTab.jsx
import React from 'react';
import { NavLink, Outlet, useOutletContext } from 'react-router-dom';
import { ClipboardDocumentListIcon, CalendarDaysIcon, UserGroupIcon } from '@heroicons/react/24/outline';

function VisitPlansManagementTab() {
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();

  const getSubTabNavLinkClasses = (isActive) =>
    `py-2 px-4 text-sm font-medium rounded-t-lg transition-colors duration-200 ml-2 rtl:mr-2 rtl:ml-0 flex items-center focus:outline-none ${
      isActive ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'
    }`;

  return (
    <div className="p-4" dir="rtl">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">إدارة خطط الزيارات</h2>
      <div className="flex flex-nowrap border-b border-gray-200 mb-6 overflow-x-auto" dir="rtl">
        <NavLink
          to="plans"
          className={({ isActive }) => getSubTabNavLinkClasses(isActive)}
        >
          <ClipboardDocumentListIcon className="w-4 h-4 ml-2" /> خطط الزيارات
        </NavLink>
        <NavLink
          to="assignments"
          className={({ isActive }) => getSubTabNavLinkClasses(isActive)}
        >
          <UserGroupIcon className="w-4 h-4 ml-2" /> تخصيص العملاء
        </NavLink>
        <NavLink
          to="visits-calendar"
          className={({ isActive }) => getSubTabNavLinkClasses(isActive)}
        >
          <CalendarDaysIcon className="w-4 h-4 ml-2" /> تقويم الزيارات
        </NavLink>
      </div>
      <div className="mt-6">
        <Outlet context={{ setGlobalMessage, setChildRefreshHandler }} />
      </div>
    </div>
  );
}

export default VisitPlansManagementTab;
