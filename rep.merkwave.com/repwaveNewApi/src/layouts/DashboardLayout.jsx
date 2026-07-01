// src/layouts/DashboardLayout.jsx
import React, { useState, useCallback, useRef, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import NotificationBell from "../components/common/NotificationBell";
import ConfirmationDialog from "../components/common/ConfirmationDialog/ConfirmationDialog.jsx";
import RepWaveLogo from "../components/common/RepWaveLogo/RepWaveLogo.jsx";
import { BRAND } from "../constants/brandColors.js";
import {
  logout,
  getAppSettings,
  isAdmin,
  isAuthenticated,
  getAppCountriesWithGovernorates,
} from "../apis/auth";
import { isOdooIntegrationEnabled } from "../utils/odooIntegration";
import { useNotifications } from "../hooks/useNotifications.js";
import {
  HomeIcon,
  UsersIcon,
  CogIcon,
  DocumentTextIcon,
  CubeIcon,
  ShoppingBagIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowsRightLeftIcon,
  BriefcaseIcon,
  TagIcon,
  ScaleIcon,
  PuzzlePieceIcon,
  TruckIcon,
  ArchiveBoxIcon,
  CreditCardIcon,
  ShoppingCartIcon,
  ArrowUturnLeftIcon,
  BanknotesIcon,
  InboxArrowDownIcon,
  ChartBarIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  ClockIcon,
  ClipboardDocumentListIcon,
  BuildingStorefrontIcon,
  MapPinIcon,
  ArrowPathIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

const ROLE_LABELS = {
  admin: "مدير",
  rep: "مندوب",
  store_keeper: "أمين مخزن",
  cash: "محاسب",
};

function getUserInitials(name) {
  if (!name || name === "غير متوفر" || name === "خطأ") return "؟";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function DashboardLayout({ setGlobalMessage }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated() || !isAdmin()) {
      logout();
      navigate("/login");
    }
  }, [navigate]);

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const storedSidebarState = localStorage.getItem("sidebarOpen");
    return storedSidebarState ? JSON.parse(storedSidebarState) : true;
  });
  const [companyName, setCompanyName] = useState("");
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { pendingOperations, fetchNotifications } = useNotifications();
  const [openSubMenu, setOpenSubMenu] = useState(null);
  const initialNotificationsRequested = useRef(false);
  const [odooEnabled, setOdooEnabled] = useState(false);
  // Removed manual refresh state/button
  // (versions logic removed)

  // State to hold refresh handlers for different tabs
  const tabRefreshHandlers = useRef({});

  // Function to register a tab's refresh handler
  const registerTabRefreshHandler = useCallback((tabName, handler) => {
    tabRefreshHandlers.current[tabName] = handler;
  }, []);

  // Function to unregister a tab's refresh handler
  const unregisterTabRefreshHandler = useCallback((tabName) => {
    delete tabRefreshHandlers.current[tabName];
  }, []);

  // Function to trigger refresh for a specific tab
  const triggerTabRefresh = useCallback(
    async (tabName, forceApiRefresh = true) => {
      const handler = tabRefreshHandlers.current[tabName];
      if (handler) {
        await handler(forceApiRefresh);
      }
    },
    [],
  );

  // Legacy compatibility: map legacy setter to new register/unregister logic
  const setChildRefreshHandler = useCallback(
    (handler) => {
      const pathSeg = window.location.pathname.split("/")[2];
      if (!pathSeg) return;
      if (typeof handler === "function") {
        registerTabRefreshHandler(pathSeg, handler);
      } else {
        unregisterTabRefreshHandler(pathSeg);
      }
    },
    [registerTabRefreshHandler, unregisterTabRefreshHandler],
  );

  const getPendingCount = useCallback(
    (key) => {
      if (!key) return 0;
      const raw = pendingOperations?.[key]?.count ?? 0;
      if (typeof raw === "number") return raw;
      const parsed = parseInt(raw, 10);
      return Number.isFinite(parsed) ? parsed : 0;
    },
    [pendingOperations],
  );

  const renderIconWithBadge = useCallback(
    (IconComponent, key, className) => (
      <span className="relative inline-flex">
        <IconComponent className={className} />
        {!sidebarOpen && key && getPendingCount(key) > 0 && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        )}
      </span>
    ),
    [getPendingCount, sidebarOpen],
  );

  const renderMenuLabel = useCallback(
    (label, key) => {
      const count = getPendingCount(key);
      return (
        <span className="flex items-center justify-between flex-1">
          <span>{label}</span>
          {count > 0 && (
            <span className="ml-2 inline-flex items-center justify-center min-w-[1.75rem] px-2 py-0.5 text-xs font-semibold rounded-full bg-red-500 text-white">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </span>
      );
    },
    [getPendingCount],
  );

  const getSectionPendingCount = useCallback(
    (keys) => {
      if (!keys) return 0;
      const list = Array.isArray(keys) ? keys : [keys];
      return list.reduce((total, key) => total + getPendingCount(key), 0);
    },
    [getPendingCount],
  );

  const renderSectionLabel = useCallback(
    (label, keys) => {
      const total = getSectionPendingCount(keys);
      return (
        <span className="flex items-center justify-between flex-1">
          <span>{label}</span>
          {total > 0 && (
            <span className="ml-2 inline-flex items-center justify-center min-w-[1.75rem] px-2 py-0.5 text-xs font-semibold rounded-full bg-red-500 text-white">
              {total > 99 ? "99+" : total}
            </span>
          )}
        </span>
      );
    },
    [getSectionPendingCount],
  );

  const renderSectionIcon = useCallback(
    (IconComponent, keys, className) => {
      const total = getSectionPendingCount(keys);
      return (
        <span className="relative inline-flex">
          <IconComponent className={className} />
          {!sidebarOpen && total > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </span>
      );
    },
    [getSectionPendingCount, sidebarOpen],
  );
  useEffect(() => {
    const onAppNavigate = (e) => {
      const detail = e?.detail || {};
      const path = detail.path;
      const refreshTab = detail.refreshTab;
      if (path) navigate(path);
      if (refreshTab) triggerTabRefresh(refreshTab, true).catch(() => {});
    };

    window.addEventListener("app:navigate", onAppNavigate);
    return () => window.removeEventListener("app:navigate", onAppNavigate);
  }, [navigate, triggerTabRefresh]);

  const loadHeaderDataFromStorage = useCallback(async () => {
    try {
      const settings = await getAppSettings();
      if (settings && Array.isArray(settings)) {
        const companyNameSetting = settings.find(
          (s) => s.settings_key === "company_name",
        );
        setCompanyName(companyNameSetting?.settings_value || "غير متوفر");
      } else {
        setCompanyName("غير متوفر");
      }
    } catch {
      setCompanyName("غير متوفر");
    }

    // Check if Odoo integration is enabled
    setOdooEnabled(isOdooIntegrationEnabled());

    const userDataString = localStorage.getItem("userData");
    if (userDataString) {
      try {
        const userData = JSON.parse(userDataString);
        setUserName(userData.name || "غير متوفر");
        setUserRole(userData.role || "غير متوفر");
        setExpirationDate(
          userData.days_remaining != null
            ? `${userData.days_remaining} يوم متبقي`
            : null,
        );
      } catch (e) {
        console.error("Failed to parse userData from localStorage:", e);
        setUserName("خطأ");
        setUserRole("خطأ");
      }
    } else {
      setUserName("غير متوفر");
      setUserRole("غير متوفر");
    }
  }, []);

  useEffect(() => {
    loadHeaderDataFromStorage();
  }, [loadHeaderDataFromStorage]);

  // Silently refresh countries+governorates cache from API on every dashboard mount
  useEffect(() => {
    getAppCountriesWithGovernorates()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        localStorage.setItem(
          "appCountriesWithGovernorates",
          JSON.stringify(list),
        );
        window.dispatchEvent(
          new CustomEvent("appCountriesWithGovernoratesUpdated"),
        );
      })
      .catch(() => {
        /* ignore; stale cache is fine */
      });
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Listen for settings updates to refresh Odoo enabled status
  useEffect(() => {
    const handleSettingsUpdated = () => {
      setOdooEnabled(isOdooIntegrationEnabled());
    };
    window.addEventListener("settings-updated", handleSettingsUpdated);
    return () =>
      window.removeEventListener("settings-updated", handleSettingsUpdated);
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebarOpen", JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  useEffect(() => {
    if (initialNotificationsRequested.current) return;
    if (!isAuthenticated()) return;
    initialNotificationsRequested.current = true;
    fetchNotifications({ page: 1, is_read: 0 }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open the confirmation dialog for logout
  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const performLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate("/login");
  };

  // Removed manual refresh handler

  // Removed: do not auto-force refetch on clients navigation; rely on versions events instead

  // (versions sync removed)

  const handleMenuItemClick = (menuName, defaultPath = null) => {
    if (sidebarOpen) {
      if (openSubMenu === menuName) {
        setOpenSubMenu(null);
      } else {
        setOpenSubMenu(menuName);
      }
      if (defaultPath) {
        navigate(defaultPath);
      }
    } else {
      if (defaultPath) {
        navigate(defaultPath);
      }
      setOpenSubMenu(null);
    }
  };

  // Close sidebar on mobile when navigating
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden" dir="rtl">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`bg-[#1A0F35] text-white flex-shrink-0 transition-all duration-300 ease-in-out flex flex-col justify-between h-full
          fixed lg:relative inset-y-0 right-0 z-40
          ${sidebarOpen ? "w-64 translate-x-0" : "w-64 translate-x-full lg:translate-x-0 lg:w-20"}
        `}
      >
        {/* YouTube-style: [toggle] [wordmark] — same px-4 as nav items */}
        <div
          className={`flex items-center shrink-0 border-b border-gray-700/80 ${
            sidebarOpen
              ? "gap-3 px-4 py-3 h-14"
              : "flex-col justify-center gap-3 py-4 min-h-[4.5rem]"
          }`}
          dir="ltr"
        >
          {sidebarOpen ? (
            <>
              <button
                onClick={() => setSidebarOpen(false)}
                className="shrink-0 p-1.5 rounded-full text-[#C4A8F0] hover:bg-[#2D1B69] transition-colors"
                title="طي القائمة"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
              <div className="flex-1 min-w-0 flex items-center justify-center overflow-hidden py-0.5">
                <RepWaveLogo variant="wordmark" size={34} className="w-full max-w-[200px]" />
              </div>
            </>
          ) : (
            <>
              <RepWaveLogo variant="icon" size={32} />
              <button
                onClick={() => setSidebarOpen(true)}
                className="shrink-0 p-1.5 rounded-full text-[#C4A8F0] hover:bg-[#2D1B69] transition-colors"
                title="فتح القائمة"
              >
                <Bars3Icon className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto text-l font-medium leading-relaxed sidebar-scrollbar">
          <ul className="h-full flex flex-col justify-evenly py-4">
            <li>
              <NavLink
                to="/dashboard"
                end
                className={({ isActive }) =>
                  `flex items-center py-2 ${!sidebarOpen ? "px-0 justify-center" : "px-4"} rounded-r-full text-[#C4A8F0] hover:bg-[#2D1B69] hover:text-white transition-colors duration-200 ${
                    isActive
                      ? "bg-[#2D1B69] border-r-4 border-r-[#C4A8F0] text-white"
                      : ""
                  }`
                }
                onClick={() => setOpenSubMenu(null)}
              >
                <HomeIcon
                  className={`h-5 w-5 flex-shrink-0 ${sidebarOpen ? "ml-3" : ""}`}
                />
                {sidebarOpen && "الرئيسية"}
              </NavLink>
            </li>
            {/* Users Management - direct link */}
            <li>
              <NavLink
                to="/dashboard/users"
                className={({ isActive }) =>
                  `flex items-center py-2 ${!sidebarOpen ? "px-0 justify-center" : "px-4"} rounded-r-full text-[#C4A8F0] hover:bg-[#2D1B69] hover:text-white transition-colors duration-200 ${
                    isActive
                      ? "bg-[#2D1B69] border-r-4 border-r-[#C4A8F0] text-white"
                      : ""
                  }`
                }
                onClick={() => setOpenSubMenu(null)}
              >
                <UsersIcon
                  className={`h-5 w-5 flex-shrink-0 ${sidebarOpen ? "ml-3" : ""}`}
                />
                {sidebarOpen && "ادارة المستخدمون"}
              </NavLink>
            </li>
            {/* Clients Management */}
            <li>
              <NavLink
                to="/dashboard/clients"
                className={({ isActive }) =>
                  `flex items-center py-2 ${!sidebarOpen ? "px-0 justify-center" : "px-4"} rounded-r-full text-[#C4A8F0] hover:bg-[#2D1B69] hover:text-white transition-colors duration-200 ${
                    isActive
                      ? "bg-[#2D1B69] border-r-4 border-r-[#C4A8F0] text-white"
                      : ""
                  }`
                }
              >
                <UsersIcon
                  className={`h-5 w-5 flex-shrink-0 ${sidebarOpen ? "ml-3" : ""}`}
                />
                {sidebarOpen && "ادارة العملاء"}
              </NavLink>
            </li>

            {/* Suppliers Management */}
            <li>
              <NavLink
                to="/dashboard/suppliers"
                className={({ isActive }) =>
                  `flex items-center py-2 ${!sidebarOpen ? "px-0 justify-center" : "px-4"} rounded-r-full text-[#C4A8F0] hover:bg-[#2D1B69] hover:text-white transition-colors duration-200 ${
                    isActive
                      ? "bg-[#2D1B69] border-r-4 border-r-[#C4A8F0] text-white"
                      : ""
                  }`
                }
              >
                <TruckIcon
                  className={`h-5 w-5 flex-shrink-0 ${sidebarOpen ? "ml-3" : ""}`}
                />
                {sidebarOpen && "ادارة الموردين"}
              </NavLink>
            </li>
            {/* Inventory Management */}
            <li>
              <div
                onClick={() =>
                  handleMenuItemClick(
                    "inventory-management",
                    "/dashboard/inventory-management/warehouses",
                  )
                }
                className={`flex items-center py-2 ${!sidebarOpen ? "px-0 justify-center" : "px-4 gap-2"} rounded-r-full text-[#C4A8F0] hover:bg-[#2D1B69] hover:text-white transition-colors duration-200 cursor-pointer ${
                  location.pathname.startsWith(
                    "/dashboard/inventory-management",
                  )
                    ? "bg-[#2D1B69] border-r-4 border-r-[#F97366] text-white"
                    : ""
                }`}
              >
                {renderSectionIcon(
                  CubeIcon,
                  ["inventory_transfers", "inventory_deliveries"],
                  "h-5 w-5 flex-shrink-0",
                )}
                {sidebarOpen && (
                  <span className="flex-1 ml-3">
                    {renderSectionLabel("إدارة المخازن", [
                      "inventory_transfers",
                      "inventory_deliveries",
                    ])}
                  </span>
                )}
                {sidebarOpen && (
                  <svg
                    className={`h-5 w-5 mr-auto transform ${
                      openSubMenu === "inventory-management" ? "rotate-90" : ""
                    } transition-transform duration-200`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 19l-7-7 7-7"
                    ></path>
                  </svg>
                )}
              </div>
              {openSubMenu === "inventory-management" && sidebarOpen && (
                <ul className="pr-4 mt-1 space-y-1 border-r mr-6 border-[#C4A8F0] ">
                  <li>
                    <NavLink
                      to="/dashboard/inventory-management/warehouses"
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-r-full text-[#C4A8F0] hover:bg-[#2D1B69] hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#2D1B69] border-r-4 border-r-[#C4A8F0] text-white"
                            : ""
                        }`
                      }
                    >
                      <CubeIcon className="h-5 w-5 ml-2" />
                      المخازن
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/dashboard/inventory-management/inventory"
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-r-full text-[#C4A8F0] hover:bg-[#2D1B69] hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#2D1B69] border-r-4 border-r-[#C4A8F0] text-white"
                            : ""
                        }`
                      }
                    >
                      <DocumentTextIcon className="h-5 w-5 ml-2" />
                      المخزون
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/dashboard/inventory-management/transfers"
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-r-full text-[#C4A8F0] hover:bg-[#2D1B69] hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#2D1B69] border-r-4 border-r-[#C4A8F0] text-white"
                            : ""
                        }`
                      }
                    >
                      {renderIconWithBadge(
                        ArrowsRightLeftIcon,
                        "inventory_transfers",
                        "h-5 w-5 ml-2",
                      )}
                      {renderMenuLabel("التحويلات", "inventory_transfers")}
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/dashboard/inventory-management/loads"
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-r-full text-[#C4A8F0] hover:bg-[#2D1B69] hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#2D1B69] border-r-4 border-r-[#C4A8F0] text-white"
                            : ""
                        }`
                      }
                    >
                      <TruckIcon className="h-5 w-5 ml-2" />
                      طلبات التحميل
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/dashboard/inventory-management/receive-products"
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-r-full text-[#C4A8F0] hover:bg-[#332080] hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#2D1B69] border-r-4 border-r-[#C4A8F0] text-white"
                            : ""
                        }`
                      }
                    >
                      <InboxArrowDownIcon className="h-5 w-5 ml-2" /> استلام
                      البضائع
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/dashboard/inventory-management/deliver-products"
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-r-full text-[#C4A8F0] hover:bg-[#332080] hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#2D1B69] border-r-4 border-r-[#C4A8F0] text-white"
                            : ""
                        }`
                      }
                    >
                      {renderIconWithBadge(
                        TruckIcon,
                        "inventory_deliveries",
                        "h-5 w-5 ml-2",
                      )}
                      {renderMenuLabel(
                        "تسليم البضائع (مخزن)",
                        "inventory_deliveries",
                      )}
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/dashboard/inventory-management/receiving-records"
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-r-full text-[#C4A8F0] hover:bg-[#332080] hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#2D1B69] border-r-4 border-r-[#C4A8F0] text-white"
                            : ""
                        }`
                      }
                    >
                      <ClipboardDocumentListIcon className="h-5 w-5 ml-2" />{" "}
                      سجلات الاستلام
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/dashboard/inventory-management/delivery-records"
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-r-full text-[#C4A8F0] hover:bg-[#332080] hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#2D1B69] border-r-4 border-r-[#C4A8F0] text-white"
                            : ""
                        }`
                      }
                    >
                      <ClipboardDocumentListIcon className="h-5 w-5 ml-2" />{" "}
                      سجلات التسليم
                    </NavLink>
                  </li>
                </ul>
              )}
            </li>
            {/* Product Management */}
            <li>
              <div
                onClick={() =>
                  handleMenuItemClick(
                    "product-management",
                    "/dashboard/product-management/products",
                  )
                }
                className={`flex items-center py-2 ${!sidebarOpen ? "px-0 justify-center" : "px-4"} rounded-r-full text-[#C4A8F0] hover:bg-[#2D1B69] hover:text-white transition-colors duration-200 cursor-pointer ${
                  location.pathname.startsWith("/dashboard/product-management")
                    ? "bg-[#2D1B69] border-r-4 border-r-[#F97366] text-white"
                    : ""
                }`}
              >
                <ShoppingBagIcon
                  className={`h-5 w-5 flex-shrink-0 ${sidebarOpen ? "ml-3" : ""}`}
                />
                {sidebarOpen && "إدارة المنتجات"}
                {sidebarOpen && (
                  <svg
                    className={`h-5 w-5 mr-auto transform ${
                      openSubMenu === "product-management" ? "rotate-90" : ""
                    } transition-transform duration-200`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 19l-7-7 7-7"
                    ></path>
                  </svg>
                )}
              </div>
              {openSubMenu === "product-management" && sidebarOpen && (
                <ul className="pr-4 mt-1 space-y-1 border-r mr-6 border-[#C4A8F0] ">
                  <li>
                    <NavLink
                      to="/dashboard/product-management/products"
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-r-full text-[#C4A8F0] hover:bg-[#332080] hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#2D1B69] border-r-4 border-r-[#C4A8F0] text-white"
                            : ""
                        }`
                      }
                    >
                      <ShoppingBagIcon className="h-5 w-5 ml-2" />
                      المنتجات
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/dashboard/product-management/categories"
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-r-full text-[#C4A8F0] hover:bg-[#332080] hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#2D1B69] border-r-4 border-r-[#C4A8F0] text-white"
                            : ""
                        }`
                      }
                    >
                      <TagIcon className="h-5 w-5 ml-2" />
                      الأقسام
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/dashboard/product-management/attributes"
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-r-full text-[#C4A8F0] hover:bg-[#332080] hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#2D1B69] border-r-4 border-r-[#C4A8F0] text-white"
                            : ""
                        }`
                      }
                    >
                      <PuzzlePieceIcon className="h-5 w-5 ml-2" />
                      الخصائص
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/dashboard/product-management/units"
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-r-full text-[#C4A8F0] hover:bg-[#332080] hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#2D1B69] border-r-4 border-r-[#C4A8F0] text-white"
                            : ""
                        }`
                      }
                    >
                      <ScaleIcon className="h-5 w-5 ml-2" />
                      الوحدات
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/dashboard/product-management/packaging-types"
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 gap-2 rounded-r-full text-[#C4A8F0] hover:bg-[#332080] hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#2D1B69] border-r-4 border-r-[#C4A8F0] text-white"
                            : ""
                        }`
                      }
                    >
                      <ArchiveBoxIcon className="h-5 w-5 ml-2" />
                      أنواع التعبئة
                    </NavLink>
                  </li>
                </ul>
              )}
            </li>
            {/* Purchases Management */}
            <li>
              <div
                onClick={() =>
                  handleMenuItemClick(
                    "purchases-management",
                    "/dashboard/purchases-management/purchase-orders",
                  )
                }
                className={`flex items-center py-2 ${!sidebarOpen ? "px-0 justify-center" : "px-4 gap-2"} rounded-r-full text-[#C4A8F0] hover:bg-[#2D1B69] hover:text-white transition-colors duration-200 cursor-pointer ${
                  location.pathname.startsWith(
                    "/dashboard/purchases-management",
                  )
                    ? "bg-[#2D1B69] border-r-4 border-r-[#F97366] text-white"
                    : ""
                }`}
              >
                {renderSectionIcon(
                  ShoppingCartIcon,
                  ["purchase_orders", "purchase_returns"],
                  "h-5 w-5 flex-shrink-0",
                )}
                {sidebarOpen && (
                  <span className="flex-1 ml-3">
                    {renderSectionLabel("إدارة المشتريات", [
                      "purchase_orders",
                      "purchase_returns",
                    ])}
                  </span>
                )}
                {sidebarOpen && (
                  <svg
                    className={`h-5 w-5 mr-auto transform ${
                      openSubMenu === "purchases-management" ? "rotate-90" : ""
                    } transition-transform duration-200`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 19l-7-7 7-7"
                    ></path>
                  </svg>
                )}
              </div>
              {openSubMenu === "purchases-management" && sidebarOpen && (
                <ul className="pr-4 mt-1 space-y-1 border-r mr-6 border-[#C4A8F0]">
                  <li>
                    <NavLink
                      to="/dashboard/purchases-management/purchase-orders"
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-r-full  text-[#C4A8F0] hover:bg-[#332080] hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#2D1B69] border-r-4 border-r-[#C4A8F0] text-white"
                            : ""
                        }`
                      }
                    >
                      {renderIconWithBadge(
                        ShoppingCartIcon,
                        "purchase_orders",
                        "h-5 w-5 ml-2",
                      )}
                      {renderMenuLabel("أوامر الشراء", "purchase_orders")}
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/dashboard/purchases-management/purchase-invoices"
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-r-full text-[#C4A8F0] hover:bg-[#332080] hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#2D1B69] border-r-4 border-r-[#C4A8F0] text-white"
                            : ""
                        }`
                      }
                    >
                      <ClipboardDocumentListIcon className="h-5 w-5 ml-2" />{" "}
                      فواتير الشراء
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/dashboard/purchases-management/purchase-returns"
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-r-full text-[#C4A8F0] hover:bg-[#332080] hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#2D1B69] border-r-4 border-r-[#C4A8F0] text-white"
                            : ""
                        }`
                      }
                    >
                      {renderIconWithBadge(
                        ArrowUturnLeftIcon,
                        "purchase_returns",
                        "h-5 w-5 ml-2",
                      )}
                      {renderMenuLabel("مرتجعات الشراء", "purchase_returns")}
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/dashboard/purchases-management/supplier-payments"
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-r-full text-[#C4A8F0] hover:bg-[#332080] hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#2D1B69] border-r-4 border-r-[#C4A8F0] text-white"
                            : ""
                        }`
                      }
                    >
                      <BanknotesIcon className="h-5 w-5 ml-2" /> مدفوعات
                      الموردين
                    </NavLink>
                  </li>
                </ul>
              )}
            </li>

            {/* Sales Management */}
            <li>
              <div
                onClick={() =>
                  handleMenuItemClick(
                    "sales-management",
                    "/dashboard/sales-management/sales-orders",
                  )
                }
                className={`flex items-center py-2 ${!sidebarOpen ? "px-0 justify-center" : "px-4 gap-2"} rounded-r-full text-[#C4A8F0] hover:bg-[#2D1B69] hover:text-white transition-colors duration-200 cursor-pointer ${
                  location.pathname.startsWith("/dashboard/sales-management")
                    ? "bg-[#2D1B69] border-r-4 border-r-[#F97366] text-white"
                    : ""
                }`}
              >
                {renderSectionIcon(
                  ShoppingBagIcon,
                  ["sales_orders", "sales_returns"],
                  "h-5 w-5 flex-shrink-0",
                )}
                {sidebarOpen && (
                  <span className="flex-1 ml-3">
                    {renderSectionLabel("إدارة المبيعات", [
                      "sales_orders",
                      "sales_returns",
                    ])}
                  </span>
                )}
                {sidebarOpen && (
                  <svg
                    className={`h-5 w-5 mr-auto transform ${
                      openSubMenu === "sales-management" ? "rotate-90" : ""
                    } transition-transform duration-200`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 19l-7-7 7-7"
                    ></path>
                  </svg>
                )}
              </div>
              {openSubMenu === "sales-management" && sidebarOpen && (
                <ul className="pr-4 mt-1 space-y-1 border-r mr-6 border-[#C4A8F0] ">
                  <li>
                    <NavLink
                      to="/dashboard/sales-management/sales-orders"
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-r-full text-[#C4A8F0] hover:bg-[#332080] hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#2D1B69] border-r-4 border-r-[#C4A8F0] text-white"
                            : ""
                        }`
                      }
                    >
                      {renderIconWithBadge(
                        ShoppingBagIcon,
                        "sales_orders",
                        "h-5 w-5 ml-2",
                      )}
                      {renderMenuLabel("أوامر البيع", "sales_orders")}
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/dashboard/sales-management/sales-invoices"
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-r-full text-[#C4A8F0] hover:bg-[#332080] hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#2D1B69] border-r-4 border-r-[#C4A8F0] text-white"
                            : ""
                        }`
                      }
                    >
                      <ClipboardDocumentListIcon className="h-5 w-5 ml-2" />{" "}
                      فواتير المبيعات
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/dashboard/sales-management/sales-returns"
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-r-full text-[#C4A8F0] hover:bg-[#332080] hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#2D1B69] border-r-4 border-r-[#C4A8F0] text-white"
                            : ""
                        }`
                      }
                    >
                      {renderIconWithBadge(
                        ArrowUturnLeftIcon,
                        "sales_returns",
                        "h-5 w-5 ml-2",
                      )}
                      {renderMenuLabel("مرتجعات البيع", "sales_returns")}
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/dashboard/sales-management/client-cash"
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-r-full text-[#C4A8F0] hover:bg-[#332080] hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#2D1B69] border-r-4 border-r-[#C4A8F0] text-white"
                            : ""
                        }`
                      }
                    >
                      <CreditCardIcon className="h-5 w-5 ml-2" /> مدفوعات
                      العملاء
                    </NavLink>
                  </li>
                </ul>
              )}
            </li>

            {/* Safe Management */}
            <li>
              <div
                onClick={() =>
                  handleMenuItemClick(
                    "safe-management",
                    "/dashboard/safe-management",
                  )
                }
                className={`flex items-center py-2 ${!sidebarOpen ? "px-0 justify-center" : "px-4 gap-2"} rounded-r-full text-[#C4A8F0] hover:bg-[#2D1B69] hover:text-white transition-colors duration-200 cursor-pointer ${
                  location.pathname.startsWith("/dashboard/safe-management")
                    ? "bg-[#2D1B69] border-r-4 border-r-[#F97366] text-white"
                    : ""
                }`}
              >
                {renderSectionIcon(
                  ArchiveBoxIcon,
                  ["safe_transactions", "safe_transfers"],
                  "h-5 w-5 flex-shrink-0",
                )}
                {sidebarOpen && (
                  <span className="flex-1 ml-3">
                    {renderSectionLabel("إدارة الخزائن", [
                      "safe_transactions",
                      "safe_transfers",
                    ])}
                  </span>
                )}
                {sidebarOpen && (
                  <svg
                    className={`h-5 w-5 mr-auto transform ${
                      openSubMenu === "safe-management" ? "rotate-90" : ""
                    } transition-transform duration-200`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 19l-7-7 7-7"
                    ></path>
                  </svg>
                )}
              </div>
              {openSubMenu === "safe-management" && sidebarOpen && (
                <ul className="pr-4 mt-1 space-y-1 border-r mr-6 border-[#C4A8F0] ">
                  <li>
                    <NavLink
                      to="/dashboard/safe-management"
                      end
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-r-full text-[#C4A8F0] hover:bg-[#332080] hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#2D1B69] border-r-4 border-r-[#C4A8F0] text-white"
                            : ""
                        }`
                      }
                    >
                      <ArchiveBoxIcon className="h-5 w-5 ml-2" /> الخزائن
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/dashboard/safe-management/safe-transactions"
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-r-full text-[#C4A8F0] hover:bg-[#332080] hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#2D1B69] border-r-4 border-r-[#C4A8F0] text-white"
                            : ""
                        }`
                      }
                    >
                      {renderIconWithBadge(
                        BanknotesIcon,
                        "safe_transactions",
                        "h-5 w-5 ml-2",
                      )}
                      {renderMenuLabel(
                        "المعاملات المالية",
                        "safe_transactions",
                      )}
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/dashboard/safe-management/safe-transfers"
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-r-full text-[#C4A8F0] hover:bg-[#332080] hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#2D1B69] border-r-4 border-r-[#C4A8F0] text-white"
                            : ""
                        }`
                      }
                    >
                      {renderIconWithBadge(
                        ArrowsRightLeftIcon,
                        "safe_transfers",
                        "h-5 w-5 ml-2",
                      )}
                      {renderMenuLabel("تحويلات الخزائن", "safe_transfers")}
                    </NavLink>
                  </li>
                </ul>
              )}
            </li>

            {/* Visit Plans Management */}
            <li>
              <div
                onClick={() =>
                  handleMenuItemClick(
                    "visit-plans-management",
                    "/dashboard/visit-plans-management/plans",
                  )
                }
                className={`flex items-center py-2 ${!sidebarOpen ? "px-0 justify-center" : "px-4"} rounded-r-full text-[#C4A8F0] hover:bg-[#2D1B69] hover:text-white transition-colors duration-200 cursor-pointer ${
                  location.pathname.startsWith(
                    "/dashboard/visit-plans-management",
                  )
                    ? "bg-[#2D1B69] border-r-4 border-r-[#F97366] text-white"
                    : ""
                }`}
              >
                <CalendarDaysIcon
                  className={`h-5 w-5 flex-shrink-0 ${sidebarOpen ? "ml-3" : ""}`}
                />
                {sidebarOpen && "خطط الزيارات"}
                {sidebarOpen && (
                  <svg
                    className={`h-5 w-5 mr-auto transform ${
                      openSubMenu === "visit-plans-management"
                        ? "rotate-90"
                        : ""
                    } transition-transform duration-200`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 19l-7-7 7-7"
                    ></path>
                  </svg>
                )}
              </div>
              {openSubMenu === "visit-plans-management" && sidebarOpen && (
                <ul className="pr-4 mt-1 space-y-1 border-r mr-6 border-[#C4A8F0] ">
                  <li>
                    <NavLink
                      to="/dashboard/visit-plans-management/plans"
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-r-full text-[#C4A8F0] hover:bg-[#332080] hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#2D1B69] border-r-4 border-r-[#C4A8F0] text-white"
                            : ""
                        }`
                      }
                    >
                      <ClipboardDocumentListIcon className="h-5 w-5 ml-2" /> خطط
                      الزيارات
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/dashboard/visit-plans-management/assignments"
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-r-full text-[#C4A8F0] hover:bg-[#332080] hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#2D1B69] border-r-4 border-r-[#C4A8F0] text-white"
                            : ""
                        }`
                      }
                    >
                      <UserGroupIcon className="h-5 w-5 ml-2" /> تخصيص العملاء
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/dashboard/visit-plans-management/visits-calendar"
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-r-full text-[#C4A8F0] hover:bg-[#332080] hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#2D1B69] border-r-4 border-r-[#C4A8F0] text-white"
                            : ""
                        }`
                      }
                    >
                      <CalendarDaysIcon className="h-5 w-5 ml-2" /> تقويم
                      الزيارات
                    </NavLink>
                  </li>
                </ul>
              )}
            </li>

            {/* Reports */}
            <li>
              <div
                onClick={() =>
                  handleMenuItemClick("reports", "/dashboard/reports")
                }
                className={`flex items-center py-2 ${!sidebarOpen ? "px-0 justify-center" : "px-4"} rounded-r-full text-[#C4A8F0] hover:bg-[#2D1B69] hover:text-white transition-colors duration-200 cursor-pointer ${
                  location.pathname.startsWith("/dashboard/reports")
                    ? "bg-[#2D1B69] border-r-4 border-r-[#F97366] text-white"
                    : ""
                }`}
              >
                <DocumentTextIcon
                  className={`h-5 w-5 flex-shrink-0 ${sidebarOpen ? "ml-3" : ""}`}
                />
                {sidebarOpen && "التقارير"}
                {sidebarOpen && (
                  <svg
                    className={`h-5 w-5 mr-auto transform ${
                      openSubMenu === "reports" ? "rotate-90" : ""
                    } transition-transform duration-200`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 19l-7-7 7-7"
                    ></path>
                  </svg>
                )}
              </div>
              {openSubMenu === "reports" && sidebarOpen && (
                <ul className="pr-4 mt-1 space-y-1 border-r mr-6 border-[#C4A8F0] ">
                  <li>
                    <NavLink
                      to="/dashboard/reports/clients"
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-r-full text-[#C4A8F0] hover:bg-[#332080] hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#2D1B69] border-r-4 border-r-[#C4A8F0] text-white"
                            : ""
                        }`
                      }
                    >
                      <UserGroupIcon className="h-5 w-5 ml-2" /> العملاء
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/dashboard/reports/products"
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-r-full text-[#C4A8F0] hover:bg-[#332080] hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#2D1B69] border-r-4 border-r-[#C4A8F0] text-white"
                            : ""
                        }`
                      }
                    >
                      <CubeIcon className="h-5 w-5 ml-2" /> المنتجات والمخزون
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/dashboard/reports/visits"
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-r-full text-[#C4A8F0] hover:bg-[#332080] hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#2D1B69] border-r-4 border-r-[#C4A8F0] text-white"
                            : ""
                        }`
                      }
                    >
                      <MapPinIcon className="h-5 w-5 ml-2" /> الزيارات
                    </NavLink>
                  </li>
                  {odooEnabled && (
                    <li>
                      <NavLink
                        to="/dashboard/reports/integration"
                        className={({ isActive }) =>
                          `flex items-center py-2 px-4 rounded-r-full text-[#C4A8F0] hover:bg-[#332080] hover:text-white transition-colors duration-200 ${
                            isActive
                              ? "bg-[#2D1B69] border-r-4 border-r-[#C4A8F0] text-white"
                              : ""
                          }`
                        }
                      >
                        <ArrowPathIcon className="h-5 w-5 ml-2" /> التكامل
                      </NavLink>
                    </li>
                  )}
                </ul>
              )}
            </li>

            <li>
              <NavLink
                to="/dashboard/settings"
                className={({ isActive }) =>
                  `flex items-center py-2 ${!sidebarOpen ? "px-0 justify-center" : "px-4"} rounded-r-full text-[#C4A8F0] hover:bg-[#2D1B69] hover:text-white transition-colors duration-200 ${
                    isActive
                      ? "bg-[#2D1B69] border-r-4 border-r-[#C4A8F0] text-white"
                      : ""
                  }`
                }
                onClick={() => setOpenSubMenu(null)}
              >
                <CogIcon
                  className={`h-5 w-5 flex-shrink-0 ${sidebarOpen ? "ml-3" : ""}`}
                />
                {sidebarOpen && "الإعدادات"}
              </NavLink>
            </li>
          </ul>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden bg">
        <header
          className="flex-shrink-0 relative z-20 border-b border-[#EDE7FF]/80 bg-[#FAFAFE]/90 backdrop-blur-xl shadow-[0_8px_32px_-12px_rgba(139,95,214,0.22)]"
          dir="rtl"
        >
          {/* subtle brand gradient line */}
          <div
            className="absolute inset-x-0 top-0 h-[3px]"
            style={{
              background: `linear-gradient(90deg, ${BRAND.primaryDeep} 0%, ${BRAND.primary} 35%, ${BRAND.lavender} 65%, #F97366 100%)`,
            }}
          />

          <div className="h-[4rem] px-3 sm:px-5 flex justify-between items-center gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1" dir="ltr">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden shrink-0 p-2 rounded-xl text-[#6B45B0] bg-[#EDE7FF]/50 hover:bg-[#EDE7FF] border border-[#C4A8F0]/30 transition-colors"
                title="فتح القائمة"
              >
                <Bars3Icon className="h-5 w-5" />
              </button>
              <RepWaveLogo variant="wordmark" size={28} className="hidden sm:block max-w-[140px] shrink-0" />
              <RepWaveLogo variant="icon" size={32} className="sm:hidden shrink-0" />
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-lg font-bold text-[#2D1B69] truncate leading-tight text-right">
                  {companyName || "لوحة التحكم"}
                </h1>
                <p className="text-[11px] sm:text-xs text-[#8B5FD6]/80 font-medium truncate text-right hidden sm:block">
                  RepWave · إدارة المبيعات والمخزون
                </p>
              </div>
            </div>

            {/* Right: actions toolbar */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <NotificationBell />

              {userName && (
                <div
                  className="hidden sm:flex items-center gap-2.5 pl-1 pr-3 py-1.5 rounded-2xl bg-white/80 border border-[#EDE7FF] shadow-sm hover:shadow-md hover:border-[#C4A8F0]/50 transition-all max-w-[220px] lg:max-w-[280px]"
                  title={`${userName} · ${ROLE_LABELS[userRole?.toLowerCase()] || userRole}`}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-sm"
                    style={{
                      background: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryHover} 100%)`,
                    }}
                  >
                    {getUserInitials(userName)}
                  </div>
                  <div className="min-w-0 text-right leading-tight">
                    <p className="text-sm font-semibold text-[#2D1B69] truncate">
                      {userName}
                    </p>
                    <span className="inline-flex mt-0.5 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#EDE7FF] text-[#6B45B0]">
                      {ROLE_LABELS[userRole?.toLowerCase()] || userRole}
                    </span>
                  </div>
                </div>
              )}

              {expirationDate && (
                <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-800">
                  <ClockIcon className="h-4 w-4 shrink-0 text-amber-600" />
                  <span className="font-medium">{expirationDate}</span>
                </div>
              )}

              <button
                onClick={handleLogout}
                className="group flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-[#6B45B0] bg-[#EDE7FF]/40 hover:bg-[#EDE7FF] border border-[#C4A8F0]/30 hover:border-[#8B5FD6]/40 transition-all"
                title="تسجيل الخروج"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5 group-hover:scale-105 transition-transform" />
                <span className="hidden lg:inline text-xs font-semibold">
                  خروج
                </span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-0 sm:p-2 md:p-4 bg-gray-100">
          <Outlet
            context={{
              setGlobalMessage,
              setChildRefreshHandler, // legacy API used by many existing tabs
              registerTabRefreshHandler,
              unregisterTabRefreshHandler,
              triggerTabRefresh,
            }}
          />
        </main>
      </div>

      <ConfirmationDialog
        isOpen={showLogoutConfirm}
        title="تأكيد تسجيل الخروج"
        message="هل أنت متأكد أنك تريد تسجيل الخروج؟ سيتم إنهاء الجلسة الحالية."
        confirmText="تسجيل الخروج"
        cancelText="إلغاء"
        danger
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={performLogout}
      />
    </div>
  );
}
export default DashboardLayout;
