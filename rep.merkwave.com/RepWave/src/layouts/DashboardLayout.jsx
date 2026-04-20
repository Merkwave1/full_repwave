// src/layouts/DashboardLayout.jsx
import React, { useState, useCallback, useRef, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import NotificationBell from "../components/common/NotificationBell";
import ConfirmationDialog from "../components/common/ConfirmationDialog/ConfirmationDialog.jsx";
import { logout, getAppSettings, isAdmin, isAuthenticated } from "../apis/auth";
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
  const [initialNotificationsRequested, setInitialNotificationsRequested] =
    useState(false);
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
    const settings = await getAppSettings();

    if (settings && Array.isArray(settings)) {
      const companyNameSetting = settings.find(
        (s) => s.settings_key === "company_name",
      );
      setCompanyName(companyNameSetting?.settings_value || "غير متوفر");
    } else {
      setCompanyName("غير متوفر");
    }

    // Check if Odoo integration is enabled
    setOdooEnabled(isOdooIntegrationEnabled());

    const userDataString = localStorage.getItem("userData");
    if (userDataString) {
      try {
        const userData = JSON.parse(userDataString);
        setUserName(userData.users_name || "غير متوفر");
        setUserRole(userData.users_role || "غير متوفر");
        setExpirationDate(
          userData.trial_expires_at || userData.users_expires_at || "غير متوفر",
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
    if (initialNotificationsRequested) return;
    if (!isAuthenticated()) return;

    const hasPendingData =
      pendingOperations && Object.keys(pendingOperations).length > 0;
    if (hasPendingData) {
      setInitialNotificationsRequested(true);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await fetchNotifications({ page: 1, is_read: 0 });
      } catch (err) {
        console.error(
          "Failed to prefetch notifications on dashboard mount:",
          err,
        );
      } finally {
        if (!cancelled) {
          setInitialNotificationsRequested(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialNotificationsRequested, pendingOperations, fetchNotifications]);

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
        className={`bg-[#1F2937] text-white flex-shrink-0 transition-all duration-300 ease-in-out flex flex-col justify-between h-full
          fixed lg:relative inset-y-0 right-0 z-40
          ${sidebarOpen ? "w-64 translate-x-0" : "w-64 translate-x-full lg:translate-x-0 lg:w-20"}
        `}
      >
        <div
          className={`p-4 flex items-center justify-between ${sidebarOpen ? "flex-row" : "flex-col-reverse gap-4"} h-18 border-b border-gray-700`}
        >
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="RepWave Logo"
                className="w-14 h-14 object-contain bg-white rounded-md p-1 drop-shadow-md"
              />
              <div className="flex flex-col pt-4">
                <h1 className="text-lg font-bold">REPWAVE</h1>
                <p className="text-gray-300 text-sm">نظام تخطيط موارد اساسية</p>
              </div>
            </div>
          ) : (
            <img
              src="/logo.png"
              alt="RepWave Logo"
              className="w-10 h-10 object-contain bg-white rounded-md p-1 drop-shadow-md"
            />
          )}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="text-[#8DD8F5] bg-[#02415A] rounded-lg p-1 transition-colors duration-200"
            title={sidebarOpen ? "طي القائمة الجانبية" : "فتح القائمة الجانبية"}
          >
            {sidebarOpen ? (
              <XMarkIcon className="h-8 w-8" />
            ) : (
              <Bars3Icon className="h-8 w-8" />
            )}
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto text-l font-medium leading-relaxed sidebar-scrollbar">
          <ul className="h-full flex flex-col justify-evenly py-4">
            <li>
              <NavLink
                to="/dashboard"
                end
                className={({ isActive }) =>
                  `flex items-center py-2 ${!sidebarOpen ? "px-0 justify-center" : "px-4"} rounded-r-full text-[#8DD8F5] hover:bg-gray-700 hover:text-white transition-colors duration-200 ${
                    isActive
                      ? "bg-[#02415A] border-r-4 border-r-[#8DD8F5] text-white"
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
                  `flex items-center py-2 ${!sidebarOpen ? "px-0 justify-center" : "px-4"} rounded-r-full text-[#8DD8F5] hover:bg-gray-700 hover:text-white transition-colors duration-200 ${
                    isActive
                      ? "bg-[#02415A] border-r-4 border-r-[#8DD8F5] text-white"
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
                  `flex items-center py-2 ${!sidebarOpen ? "px-0 justify-center" : "px-4"} rounded-r-full text-[#8DD8F5] hover:bg-gray-700 hover:text-white transition-colors duration-200 ${
                    isActive
                      ? "bg-[#02415A] border-r-4 border-r-[#8DD8F5] text-white"
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
                  `flex items-center py-2 ${!sidebarOpen ? "px-0 justify-center" : "px-4"} rounded-r-full text-[#8DD8F5] hover:bg-gray-700 hover:text-white transition-colors duration-200 ${
                    isActive
                      ? "bg-[#02415A] border-r-4 border-r-[#8DD8F5] text-white"
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
                className={`flex items-center py-2 ${!sidebarOpen ? "px-0 justify-center" : "px-4 gap-2"} rounded-r-full text-[#8DD8F5] hover:bg-gray-700 hover:text-white transition-colors duration-200 cursor-pointer ${
                  location.pathname.startsWith(
                    "/dashboard/inventory-management",
                  )
                    ? "bg-[#02415A] border-r-4 border-r-[#17BDFF] text-white"
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
                <ul className="pr-4 mt-1 space-y-1 border-r mr-6 border-[#8DD8F5] ">
                  <li>
                    <NavLink
                      to="/dashboard/inventory-management/warehouses"
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-r-full text-[#8DD8F5] hover:bg-gray-700 hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#02415A] border-r-4 border-r-[#8DD8F5] text-white"
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
                        `flex items-center py-2 px-4 rounded-r-full text-[#8DD8F5] hover:bg-gray-700 hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#02415A] border-r-4 border-r-[#8DD8F5] text-white"
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
                        `flex items-center py-2 px-4 rounded-r-full text-[#8DD8F5] hover:bg-gray-700 hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#02415A] border-r-4 border-r-[#8DD8F5] text-white"
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
                        `flex items-center py-2 px-4 rounded-r-full text-[#8DD8F5] hover:bg-gray-700 hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#02415A] border-r-4 border-r-[#8DD8F5] text-white"
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
                        `flex items-center py-2 px-4 rounded-r-full text-[#8DD8F5] hover:bg-gray-600 hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#02415A] border-r-4 border-r-[#8DD8F5] text-white"
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
                        `flex items-center py-2 px-4 rounded-r-full text-[#8DD8F5] hover:bg-gray-600 hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#02415A] border-r-4 border-r-[#8DD8F5] text-white"
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
                        `flex items-center py-2 px-4 rounded-r-full text-[#8DD8F5] hover:bg-gray-600 hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#02415A] border-r-4 border-r-[#8DD8F5] text-white"
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
                        `flex items-center py-2 px-4 rounded-r-full text-[#8DD8F5] hover:bg-gray-600 hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#02415A] border-r-4 border-r-[#8DD8F5] text-white"
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
                className={`flex items-center py-2 ${!sidebarOpen ? "px-0 justify-center" : "px-4"} rounded-r-full text-[#8DD8F5] hover:bg-gray-700 hover:text-white transition-colors duration-200 cursor-pointer ${
                  location.pathname.startsWith("/dashboard/product-management")
                    ? "bg-[#02415A] border-r-4 border-r-[#17BDFF] text-white"
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
                <ul className="pr-4 mt-1 space-y-1 border-r mr-6 border-[#8DD8F5] ">
                  <li>
                    <NavLink
                      to="/dashboard/product-management/products"
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-r-full text-[#8DD8F5] hover:bg-gray-600 hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#02415A] border-r-4 border-r-[#8DD8F5] text-white"
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
                        `flex items-center py-2 px-4 rounded-r-full text-[#8DD8F5] hover:bg-gray-600 hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#02415A] border-r-4 border-r-[#8DD8F5] text-white"
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
                        `flex items-center py-2 px-4 rounded-r-full text-[#8DD8F5] hover:bg-gray-600 hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#02415A] border-r-4 border-r-[#8DD8F5] text-white"
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
                        `flex items-center py-2 px-4 rounded-r-full text-[#8DD8F5] hover:bg-gray-600 hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#02415A] border-r-4 border-r-[#8DD8F5] text-white"
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
                        `flex items-center py-2 px-4 gap-2 rounded-r-full text-[#8DD8F5] hover:bg-gray-600 hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#02415A] border-r-4 border-r-[#8DD8F5] text-white"
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
                className={`flex items-center py-2 ${!sidebarOpen ? "px-0 justify-center" : "px-4 gap-2"} rounded-r-full text-[#8DD8F5] hover:bg-gray-700 hover:text-white transition-colors duration-200 cursor-pointer ${
                  location.pathname.startsWith(
                    "/dashboard/purchases-management",
                  )
                    ? "bg-[#02415A] border-r-4 border-r-[#17BDFF] text-white"
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
                <ul className="pr-4 mt-1 space-y-1 border-r mr-6 border-[#8DD8F5]">
                  <li>
                    <NavLink
                      to="/dashboard/purchases-management/purchase-orders"
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-r-full  text-[#8DD8F5] hover:bg-gray-600 hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#02415A] border-r-4 border-r-[#8DD8F5] text-white"
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
                        `flex items-center py-2 px-4 rounded-r-full text-[#8DD8F5] hover:bg-gray-600 hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#02415A] border-r-4 border-r-[#8DD8F5] text-white"
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
                        `flex items-center py-2 px-4 rounded-r-full text-[#8DD8F5] hover:bg-gray-600 hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#02415A] border-r-4 border-r-[#8DD8F5] text-white"
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
                        `flex items-center py-2 px-4 rounded-r-full text-[#8DD8F5] hover:bg-gray-600 hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#02415A] border-r-4 border-r-[#8DD8F5] text-white"
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
                className={`flex items-center py-2 ${!sidebarOpen ? "px-0 justify-center" : "px-4 gap-2"} rounded-r-full text-[#8DD8F5] hover:bg-gray-700 hover:text-white transition-colors duration-200 cursor-pointer ${
                  location.pathname.startsWith("/dashboard/sales-management")
                    ? "bg-[#02415A] border-r-4 border-r-[#17BDFF] text-white"
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
                <ul className="pr-4 mt-1 space-y-1 border-r mr-6 border-[#8DD8F5] ">
                  <li>
                    <NavLink
                      to="/dashboard/sales-management/sales-orders"
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-r-full text-[#8DD8F5] hover:bg-gray-600 hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#02415A] border-r-4 border-r-[#8DD8F5] text-white"
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
                        `flex items-center py-2 px-4 rounded-r-full text-[#8DD8F5] hover:bg-gray-600 hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#02415A] border-r-4 border-r-[#8DD8F5] text-white"
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
                        `flex items-center py-2 px-4 rounded-r-full text-[#8DD8F5] hover:bg-gray-600 hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#02415A] border-r-4 border-r-[#8DD8F5] text-white"
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
                        `flex items-center py-2 px-4 rounded-r-full text-[#8DD8F5] hover:bg-gray-600 hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#02415A] border-r-4 border-r-[#8DD8F5] text-white"
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
                className={`flex items-center py-2 ${!sidebarOpen ? "px-0 justify-center" : "px-4 gap-2"} rounded-r-full text-[#8DD8F5] hover:bg-gray-700 hover:text-white transition-colors duration-200 cursor-pointer ${
                  location.pathname.startsWith("/dashboard/safe-management")
                    ? "bg-[#02415A] border-r-4 border-r-[#17BDFF] text-white"
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
                <ul className="pr-4 mt-1 space-y-1 border-r mr-6 border-[#8DD8F5] ">
                  <li>
                    <NavLink
                      to="/dashboard/safe-management"
                      end
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-r-full text-[#8DD8F5] hover:bg-gray-600 hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#02415A] border-r-4 border-r-[#8DD8F5] text-white"
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
                        `flex items-center py-2 px-4 rounded-r-full text-[#8DD8F5] hover:bg-gray-600 hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#02415A] border-r-4 border-r-[#8DD8F5] text-white"
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
                        `flex items-center py-2 px-4 rounded-r-full text-[#8DD8F5] hover:bg-gray-600 hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#02415A] border-r-4 border-r-[#8DD8F5] text-white"
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
                className={`flex items-center py-2 ${!sidebarOpen ? "px-0 justify-center" : "px-4"} rounded-r-full text-[#8DD8F5] hover:bg-gray-700 hover:text-white transition-colors duration-200 cursor-pointer ${
                  location.pathname.startsWith(
                    "/dashboard/visit-plans-management",
                  )
                    ? "bg-[#02415A] border-r-4 border-r-[#17BDFF] text-white"
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
                <ul className="pr-4 mt-1 space-y-1 border-r mr-6 border-[#8DD8F5] ">
                  <li>
                    <NavLink
                      to="/dashboard/visit-plans-management/plans"
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-r-full text-[#8DD8F5] hover:bg-gray-600 hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#02415A] border-r-4 border-r-[#8DD8F5] text-white"
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
                        `flex items-center py-2 px-4 rounded-r-full text-[#8DD8F5] hover:bg-gray-600 hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#02415A] border-r-4 border-r-[#8DD8F5] text-white"
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
                        `flex items-center py-2 px-4 rounded-r-full text-[#8DD8F5] hover:bg-gray-600 hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#02415A] border-r-4 border-r-[#8DD8F5] text-white"
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
                className={`flex items-center py-2 ${!sidebarOpen ? "px-0 justify-center" : "px-4"} rounded-r-full text-[#8DD8F5] hover:bg-gray-700 hover:text-white transition-colors duration-200 cursor-pointer ${
                  location.pathname.startsWith("/dashboard/reports")
                    ? "bg-[#02415A] border-r-4 border-r-[#17BDFF] text-white"
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
                <ul className="pr-4 mt-1 space-y-1 border-r mr-6 border-[#8DD8F5] ">
                  <li>
                    <NavLink
                      to="/dashboard/reports/clients"
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-r-full text-[#8DD8F5] hover:bg-gray-600 hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#02415A] border-r-4 border-r-[#8DD8F5] text-white"
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
                        `flex items-center py-2 px-4 rounded-r-full text-[#8DD8F5] hover:bg-gray-600 hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#02415A] border-r-4 border-r-[#8DD8F5] text-white"
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
                        `flex items-center py-2 px-4 rounded-r-full text-[#8DD8F5] hover:bg-gray-600 hover:text-white transition-colors duration-200 ${
                          isActive
                            ? "bg-[#02415A] border-r-4 border-r-[#8DD8F5] text-white"
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
                          `flex items-center py-2 px-4 rounded-r-full text-[#8DD8F5] hover:bg-gray-600 hover:text-white transition-colors duration-200 ${
                            isActive
                              ? "bg-[#02415A] border-r-4 border-r-[#8DD8F5] text-white"
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
                  `flex items-center py-2 ${!sidebarOpen ? "px-0 justify-center" : "px-4"} rounded-r-full text-[#8DD8F5] hover:bg-gray-700 hover:text-white transition-colors duration-200 ${
                    isActive
                      ? "bg-[#02415A] border-r-4 border-r-[#8DD8F5] text-white"
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
          className="flex-shrink-0 h-16 bg-white shadow p-4 flex justify-between items-center"
          dir="rtl"
        >
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
              title="فتح القائمة"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            <h1 className="hidden md:block text-2xl font-bold text-blue-700">
              {companyName || "لوحة التحكم"}
            </h1>
          </div>
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <div className="flex items-center justify-center p-4 rounded-lg w-8 h-8 md:w-12 md:h-12 bg-[#1F2937]  ">
              <NotificationBell />
            </div>
            {userName && (
              <span className="hidden sm:inline text-gray-700 text-sm">
                المستخدم:{" "}
                <span className="font-semibold text-gray-800">{userName}</span>{" "}
                (
                <span className="font-semibold text-purple-700">
                  {userRole}
                </span>
                )
              </span>
            )}
            {expirationDate && (
              <span className="hidden md:block  text-gray-700 text-sm">
                تاريخ الانتهاء:{" "}
                <span className="font-semibold text-red-600">
                  {expirationDate}
                </span>
              </span>
            )}
            {/* Refresh icon button removed */}
            <button
              onClick={handleLogout}
              className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition duration-150 ease-in-out"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
            </button>
            <ConfirmationDialog
              isOpen={showLogoutConfirm}
              title="تأكيد تسجيل الخروج"
              message={
                <div>
                  هل أنت متأكد أنك تريد تسجيل الخروج؟ سيتم إنهاء الجلسة الحالية.
                </div>
              }
              confirmText="تسجيل الخروج"
              cancelText="إلغاء"
              danger={true}
              onCancel={() => setShowLogoutConfirm(false)}
              onConfirm={performLogout}
            />
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
    </div>
  );
}
export default DashboardLayout;
