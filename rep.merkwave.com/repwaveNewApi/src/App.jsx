// src/App.jsx
import React, { useState, useEffect } from "react";
import { Toaster } from "react-hot-toast";

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

// Layouts and Pages
import AuthLayout from "./layouts/AuthLayout.jsx";
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import LoginPage from "./pages/Login.jsx";
import TryNowPage from "./pages/TryNow.jsx";
import AuthHandoffPage from "./pages/AuthHandoff.jsx";
import HomePage from "./pages/Home.jsx";
import DashboardPage from "./pages/DashboardNew.jsx"; // NEW: Use the comprehensive dashboard
import NotFoundPage from "./pages/NotFound.jsx";

// Common Components
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import GlobalMessage from "./components/common/GlobalMessage";
import ReloginModal from "./components/common/ReloginModal.jsx";

// Contexts
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { NotificationProvider } from "./contexts/NotificationContext.jsx";
import { useAuth } from "./hooks/useAuth.js";

// Main Tab Components
import UsersTab from "./components/dashboard/tabs/users/UsersTab.jsx";
import ReportsTab from "./components/dashboard/tabs/reports/ReportsTab.jsx";
import SettingsTab from "./components/dashboard/tabs/settings/SettingsTab.jsx";
import InventoryManagementTab from "./components/dashboard/tabs/InventoryManagementTab.jsx";
import ProductManagementTab from "./components/dashboard/tabs/ProductManagementTab.jsx";
import PurchasesManagementTab from "./components/dashboard/tabs/purchases-management/PurchasesManagementTab.jsx";
import SalesManagementTab from "./components/dashboard/tabs/sales-management/SalesManagementTab.jsx";
import VisitPlansManagementTab from "./components/dashboard/tabs/VisitPlansManagementTab.jsx";

// Safe Management Components
import SafeManagementTab from "./components/dashboard/tabs/safe-management/SafeManagementTab.jsx";
import SafesTab from "./components/dashboard/tabs/safe-management/safes/SafesTab.jsx";
import SafeTransactionsTab from "./components/dashboard/tabs/safe-management/safe-transactions/SafeTransactionsTab.jsx";
import SafeTransfersTab from "./components/dashboard/tabs/safe-management/safe-transfers/SafeTransfersTab.jsx";
import SafeReportsTab from "./components/dashboard/tabs/safe-management/safe-reports/SafeReportsTab.jsx";
import AccountsTab from "./components/dashboard/tabs/accounts/AccountsTab.jsx";

// User Management Sub-components
import UsersList from "./components/dashboard/tabs/users/list/UsersList.jsx";
import DeleteUserConfirmation from "./components/dashboard/tabs/users/delete/DeleteUserConfirmation.jsx";

// Client Management Sub-components
import ClientsTab from "./components/dashboard/tabs/clients-management/ClientsTab.jsx";
import ClientDetailPage from "./components/dashboard/tabs/clients-management/clients/ClientDetailPage.jsx";
import SuppliersTab from "./components/dashboard/tabs/clients-management/SuppliersTab.jsx";

// Inventory Management Sub-components
import WarehousesTab from "./components/dashboard/tabs/inventory-management/Warehouses/WarehousesTab.jsx";
import InventoryTab from "./components/dashboard/tabs/inventory-management/Inventory/InventoryTab.jsx";
import TransfersTab from "./components/dashboard/tabs/inventory-management/Transfers/TransfersTab.jsx";
import LoadsTab from "./components/dashboard/tabs/inventory-management/loads/LoadsTab.jsx";
import ReceiveProductsTab from "./components/dashboard/tabs/inventory-management/receive-products/ReceiveProductsTab.jsx";
// Import the deliver products component for inventory
import InventoryDeliverProductsTab from "./components/dashboard/tabs/inventory-management/deliver-products/InventoryDeliverProductsTab.jsx";
// Import the records components
import WarehouseRecordsTabWrapper from "./components/dashboard/tabs/inventory-management/WarehouseRecordsTabWrapper.jsx";
import SalesDeliveryRecordsWrapper from "./components/dashboard/tabs/inventory-management/records/SalesDeliveryRecordsWrapper.jsx";
// NEW: Import the new components for Load/Unload Requests
import LoadRequestsTab from "./components/dashboard/tabs/inventory-management/load-requests/LoadRequestsTab.jsx";
import UnloadRequestsTab from "./components/dashboard/tabs/inventory-management/unload-requests/UnloadRequestsTab.jsx";

// Product Management Sub-components
import ProductsTab from "./components/dashboard/tabs/product-management/ProductsTab.jsx";
import CategoriesTab from "./components/dashboard/tabs/product-management/CategoriesTab.jsx";
import AttributesTab from "./components/dashboard/tabs/product-management/AttributesTab.jsx";
import UnitsTab from "./components/dashboard/tabs/product-management/UnitsTab.jsx";
import PackagingTypesTab from "./components/dashboard/tabs/inventory-management/packaging_types/PackagingTypesTab.jsx";

// Purchases Management Sub-components
import PurchaseOrdersTab from "./components/dashboard/tabs/purchases-management/purchase-orders/PurchaseOrdersTab.jsx";
import PurchaseInvoicesTab from "./components/dashboard/tabs/purchases-management/purchase-invoices/PurchaseInvoicesTab.jsx";
import PurchaseReturnsTab from "./components/dashboard/tabs/purchases-management/purchase-returns/PurchaseReturnsTab.jsx";
import SupplierPaymentsTab from "./components/dashboard/tabs/purchases-management/supplier-payments/SupplierPaymentsTab.jsx";

// Sales Management Sub-components
import SalesOrdersTab from "./components/dashboard/tabs/sales-management/sales-orders/SalesOrdersTab.jsx";
// Removed DeliverProductsTab and DeliveryHistoryTab per request
import SalesReturnsTab from "./components/dashboard/tabs/sales-management/sales-returns/SalesReturnsTab.jsx";
import ClientCashTab from "./components/dashboard/tabs/sales-management/client-cash/ClientCashTab.jsx";
import SalesInvoicesTab from "./components/dashboard/tabs/sales-management/sales-invoices/SalesInvoicesTab.jsx";

// Visit Plans Management Sub-components
import VisitPlansTab from "./components/dashboard/tabs/visit-plans-management/VisitPlansTab.jsx";
import CalendarTab from "./components/dashboard/tabs/visit-plans-management/CalendarTab.jsx";
import ClientAssignmentsTab from "./components/dashboard/tabs/visit-plans-management/ClientAssignmentsTab.jsx";

// Reports Sub-components
import ClientsReportsPage from "./components/dashboard/tabs/reports/clients/ClientsReportsPage.jsx";
import ProductsReportsPage from "./components/dashboard/tabs/reports/products/ProductsReportsPage.jsx";
import VisitsReportsPage from "./components/dashboard/tabs/reports/visits/VisitsReportsPage.jsx";
import RepresentativesReportsPage from "./components/dashboard/tabs/reports/representatives/RepresentativesReportsPage.jsx";
import IntegrationReportsPage from "./components/dashboard/tabs/reports/integration/IntegrationReportsPage.jsx";

// Inner App component that uses auth context
function AppContent() {
  const [globalMessage, setGlobalMessage] = useState(null);

  // Prevent mouse wheel from changing number inputs globally
  useEffect(() => {
    const onWheel = (e) => {
      const el = document.activeElement;
      if (el && el.tagName === "INPUT" && el.type === "number") {
        e.preventDefault();
      }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <Router>
      {/* Toast notifications with RTL support */}
      <Toaster
        position="top-center"
        reverseOrder={false}
        gutter={8}
        toastOptions={{
          // Default options
          duration: 4000,
          style: {
            direction: "rtl",
            textAlign: "right",
            fontFamily: "Cairo, sans-serif",
          },
          // Success toast style
          success: {
            duration: 3000,
            iconTheme: {
              primary: "#10B981",
              secondary: "#fff",
            },
          },
          // Error toast style
          error: {
            duration: 5000,
            iconTheme: {
              primary: "#EF4444",
              secondary: "#fff",
            },
          },
        }}
      />
      <GlobalMessage
        message={globalMessage}
        onClear={() => setGlobalMessage(null)}
      />
      <ReloginModal />
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <AuthLayout>
              <LoginPage />
            </AuthLayout>
          }
        />
        <Route path="/try-now" element={<TryNowPage />} />
        <Route path="/auth/handoff" element={<AuthHandoffPage />} />
        <Route path="/" element={<HomePage />} />

        {/* Protected Dashboard Routes */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/dashboard"
            element={<DashboardLayout setGlobalMessage={setGlobalMessage} />}
          >
            <Route index element={<DashboardPage.HomeTab />} />

            {/* Users Management */}
            <Route path="users" element={<UsersTab />}>
              <Route index element={<UsersList />} />
              <Route
                path="delete-user/:userId"
                element={<DeleteUserConfirmation />}
              />
            </Route>

            {/* Clients Management */}
            <Route path="clients" element={<ClientsTab />} />
            <Route path="clients/:clientId" element={<ClientDetailPage />} />

            {/* Suppliers Management */}
            <Route path="suppliers" element={<SuppliersTab />} />

            {/* Inventory Management */}
            <Route
              path="inventory-management"
              element={<InventoryManagementTab />}
            >
              <Route index element={<Navigate to="warehouses" replace />} />
              <Route path="warehouses" element={<WarehousesTab />} />
              <Route path="inventory" element={<InventoryTab />} />
              <Route path="transfers" element={<TransfersTab />} />
              <Route path="loads" element={<LoadsTab />} />
              <Route path="receive-products" element={<ReceiveProductsTab />} />
              <Route
                path="deliver-products"
                element={<InventoryDeliverProductsTab />}
              />
              <Route
                path="receiving-records"
                element={<WarehouseRecordsTabWrapper />}
              />
              <Route
                path="delivery-records"
                element={<SalesDeliveryRecordsWrapper />}
              />
              {/* NEW: Routes for Load/Unload Requests */}
              <Route path="load-requests" element={<LoadRequestsTab />} />
              <Route path="unload-requests" element={<UnloadRequestsTab />} />
            </Route>

            {/* Product Management */}
            <Route path="product-management" element={<ProductManagementTab />}>
              <Route index element={<Navigate to="products" replace />} />
              <Route path="products" element={<ProductsTab />} />
              <Route path="categories" element={<CategoriesTab />} />
              <Route path="attributes" element={<AttributesTab />} />
              <Route path="units" element={<UnitsTab />} />
              <Route path="packaging-types" element={<PackagingTypesTab />} />
            </Route>

            {/* Purchases Management */}
            <Route
              path="purchases-management"
              element={<PurchasesManagementTab />}
            >
              <Route
                index
                element={<Navigate to="purchase-orders" replace />}
              />
              <Route path="purchase-orders" element={<PurchaseOrdersTab />} />
              <Route
                path="purchase-invoices"
                element={<PurchaseInvoicesTab />}
              />
              <Route path="purchase-returns" element={<PurchaseReturnsTab />} />
              <Route
                path="supplier-payments"
                element={<SupplierPaymentsTab />}
              />
            </Route>

            {/* Sales Management */}
            <Route path="sales-management" element={<SalesManagementTab />}>
              <Route index element={<Navigate to="sales-orders" replace />} />
              <Route path="sales-orders" element={<SalesOrdersTab />} />
              <Route path="sales-invoices" element={<SalesInvoicesTab />} />
              {/** removed deliver-products and delivery-history */}
              <Route path="sales-returns" element={<SalesReturnsTab />} />
              <Route path="client-cash" element={<ClientCashTab />} />
            </Route>

            {/* Safe Management */}
            <Route path="safe-management" element={<SafeManagementTab />}>
              <Route index element={<Navigate to="safes" replace />} />
              <Route path="safes" element={<SafesTab />} />
              <Route path="accounts" element={<AccountsTab />} />
              <Route
                path="safe-transactions"
                element={<SafeTransactionsTab />}
              />
              <Route path="safe-transfers" element={<SafeTransfersTab />} />
              <Route path="safe-reports" element={<SafeReportsTab />} />
            </Route>

            {/* Visit Plans Management */}
            <Route
              path="visit-plans-management"
              element={<VisitPlansManagementTab />}
            >
              <Route index element={<Navigate to="plans" replace />} />
              <Route path="plans" element={<VisitPlansTab />} />
              <Route path="visits-calendar" element={<CalendarTab />} />
              <Route path="assignments" element={<ClientAssignmentsTab />} />
              <Route
                path="assignments/:planId"
                element={<ClientAssignmentsTab />}
              />
            </Route>

            {/* Standalone Tabs */}
            <Route path="reports" element={<ReportsTab />}>
              <Route index element={<Navigate to="clients" replace />} />
              <Route path="clients" element={<ClientsReportsPage />} />
              <Route path="products" element={<ProductsReportsPage />} />
              {/* Visits reports with nested tab routes */}
              <Route path="visits">
                <Route index element={<Navigate to="overview" replace />} />
                <Route path=":tab" element={<VisitsReportsPage />} />
              </Route>
              {/* Representatives reports with nested tab routes */}
              <Route path="representatives">
                <Route index element={<Navigate to="overview" replace />} />
                <Route path=":tab" element={<RepresentativesReportsPage />} />
              </Route>
              {/* Integration reports with nested tab routes */}
              <Route path="integration">
                <Route index element={<Navigate to="overview" replace />} />
                <Route path=":tab" element={<IntegrationReportsPage />} />
              </Route>
            </Route>
            <Route path="settings" element={<SettingsTab />} />
          </Route>
        </Route>

        {/* Not Found Page */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

// Main App component with AuthProvider wrapper
function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
