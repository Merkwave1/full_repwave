// src/components/dashboard/tabs/clients-management/ClientsManagementTab.jsx
import React from 'react';
import { NavLink, Outlet, useOutletContext } from 'react-router-dom';
import { UsersIcon, TruckIcon } from '@heroicons/react/24/outline'; // Using UsersIcon for Clients, TruckIcon for Suppliers

function ClientsManagementTab() {
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();

  const getSubTabNavLinkClasses = (isActive) =>
    `py-3 px-6 text-sm font-semibold rounded-xl transition-all duration-300 ml-2 rtl:mr-2 rtl:ml-0 flex items-center focus:outline-none shadow-sm ${
      isActive 
        ? 'bg-indigo-600 text-white shadow-lg transform scale-105' 
        : 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 hover:shadow-md bg-white border border-gray-200'
    }`;

  return (
    <div className="p-6" dir="rtl">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">إدارة العملاء والموردين</h2>
        <p className="text-gray-600">إدارة شاملة لقاعدة بيانات العملاء والموردين</p>
      </div>
      
      <div className="flex flex-nowrap gap-4 mb-8 p-2 bg-gray-50 rounded-2xl border border-gray-200 overflow-x-auto" dir="rtl">
        <NavLink
          to="clients" // Relative path: /dashboard/clients/clients
          className={({ isActive }) => getSubTabNavLinkClasses(isActive)}
        >
          <UsersIcon className="h-5 w-5 ml-2" /> العملاء
        </NavLink>
        <NavLink
          to="suppliers" // Relative path: /dashboard/clients/suppliers
          className={({ isActive }) => getSubTabNavLinkClasses(isActive)}
        >
          <TruckIcon className="h-5 w-5 ml-2" /> الموردين
        </NavLink>
      </div>
      
      <div className="bg-gray-50 rounded-2xl p-1">
        {/* The Outlet renders the matched child route component (e.g., ClientsTab, SuppliersTab) */}
        <Outlet context={{ setGlobalMessage, setChildRefreshHandler }} />
      </div>
    </div>
  );
}

export default ClientsManagementTab;
