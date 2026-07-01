import React from "react";
import { Outlet, NavLink, useOutletContext } from "react-router-dom";
import {
  ArchiveBoxIcon,
  CreditCardIcon,
  ArrowsRightLeftIcon,
  ArchiveBoxArrowDownIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { getSafeSubTabClasses } from "./safeManagementUi";

const tabs = [
  {
    key: "safes",
    label: "الخزائن",
    icon: ArchiveBoxIcon,
    to: "safes",
    description: "إدارة الخزائن والأرصدة",
  },
  {
    key: "accounts",
    label: "إدارة الحسابات",
    icon: ChartBarIcon,
    to: "accounts",
    description: "إدارة الحسابات المالية للنظام",
  },
  {
    key: "safe-transactions",
    label: "المعاملات المالية",
    icon: CreditCardIcon,
    to: "safe-transactions",
    description: "عرض وإدارة جميع المعاملات المالية",
  },
  {
    key: "safe-transfers",
    label: "تحويلات الخزائن",
    icon: ArrowsRightLeftIcon,
    to: "safe-transfers",
    description: "تحويل الأموال بين الخزائن المختلفة",
  },
];

const SafeManagementTab = () => {
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();

  return (
    <div
      className="min-h-full w-full bg-[#FAFAFE] sm:-mx-2 md:-mx-4"
      dir="rtl"
    >
      {/* Hero header */}
      <div className="bg-gradient-to-l from-[#8B5FD6] via-[#7A52C2] to-[#6B45B0] px-4 sm:px-6 py-6 sm:py-8 shadow-md w-full">
        <div className="flex items-center gap-4 w-full">
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 sm:p-3.5 shrink-0 ring-1 ring-white/30">
            <ArchiveBoxArrowDownIcon className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              إدارة الخزائن
            </h1>
            <p className="text-sm sm:text-base text-white/85 mt-1">
              إدارة شاملة للخزائن والمعاملات والتحويلات المالية
            </p>
          </div>
        </div>
      </div>

      {/* Tab bar — full width, original pill design */}
      <div className="-mt-4 relative z-10 w-full px-0">
        <nav
          className="flex w-full gap-2 sm:gap-3 p-2 sm:p-2.5 bg-white/95 backdrop-blur-sm rounded-none sm:rounded-none border-y border-[#EDE7FF] shadow-lg shadow-[#8B5FD6]/10"
          aria-label="أقسام إدارة الخزائن"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.key}
                to={tab.to}
                title={tab.description}
                className={({ isActive }) =>
                  `${getSafeSubTabClasses(isActive)} ${
                    isActive
                      ? "[&_svg]:text-white"
                      : "[&_svg]:text-[#8B5FD6] hover:[&_svg]:text-[#7A52C2]"
                  }`
                }
              >
                <Icon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                <span className="truncate text-center leading-tight">
                  {tab.label}
                </span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div className="px-0 py-4 sm:py-6 w-full">
        <Outlet context={{ setGlobalMessage, setChildRefreshHandler }} />
      </div>
    </div>
  );
};

export default SafeManagementTab;
