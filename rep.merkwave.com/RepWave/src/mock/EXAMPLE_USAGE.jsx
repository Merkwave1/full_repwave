// Example: How to integrate mock data into your RepWave app
// Add this to your main.jsx or App.jsx

import React, { useEffect } from "react";
import { initializeMockData, getMockDataStats } from "./mock";

// Option 1: Initialize on app startup (recommended)
function App() {
  useEffect(() => {
    // Initialize mock data when app starts
    initializeMockData();

    // Optional: Log statistics
    const stats = getMockDataStats();
    console.log("📊 Mock Data Statistics:", stats);
  }, []);

  return <div>{/* Your app components */}</div>;
}

// Option 2: Manual initialization with UI controls
function MockDataControls() {
  const [stats, setStats] = React.useState(null);

  const handleInitialize = () => {
    initializeMockData();
    setStats(getMockDataStats());
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all mock data?")) {
      resetMockData();
      setStats(getMockDataStats());
    }
  };

  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear all mock data?")) {
      clearMockData();
      setStats(null);
    }
  };

  return (
    <div style={{ padding: "20px", border: "1px solid #ccc", margin: "10px" }}>
      <h3>🎭 Mock Data Controls</h3>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button onClick={handleInitialize}>Initialize Mock Data</button>
        <button onClick={handleReset}>Reset Mock Data</button>
        <button onClick={handleClear}>Clear Mock Data</button>
      </div>

      {stats && (
        <div>
          <h4>Statistics:</h4>
          <ul>
            <li>Users: {stats.users}</li>
            <li>Clients: {stats.clients}</li>
            <li>Products: {stats.products}</li>
            <li>Warehouses: {stats.warehouses}</li>
            <li>Inventory Items: {stats.inventory}</li>
            <li>Sales Orders: {stats.salesOrders}</li>
            <li>Purchase Orders: {stats.purchaseOrders}</li>
            <li>Suppliers: {stats.suppliers}</li>
          </ul>
        </div>
      )}
    </div>
  );
}

// Option 3: Use mock APIs in your components
import { mockClientsApi, mockSalesOrdersApi } from "./mock";

function ClientOrders({ clientId }) {
  const [orders, setOrders] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    async function loadOrders() {
      try {
        // Use mock API instead of real API
        const clientOrders =
          await mockSalesOrdersApi.getSalesOrdersByClient(clientId);
        setOrders(clientOrders);
      } catch (error) {
        console.error("Error loading orders:", error);
      } finally {
        setLoading(false);
      }
    }

    if (clientId) {
      loadOrders();
    }
  }, [clientId]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h3>Client Orders</h3>
      {orders.length === 0 ? (
        <p>No orders found</p>
      ) : (
        <ul>
          {orders.map((order) => (
            <li key={order.sales_orders_id}>
              Order #{order.sales_orders_order_number} -
              {order.sales_orders_total_amount} EGP - Status:{" "}
              {order.sales_orders_status}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Option 4: Create a wrapper to switch between mock and real APIs
import { USE_MOCK_DATA, mockClientsApi } from "./mock";
import * as realClientsApi from "./apis/clients";

export const clientsApi = USE_MOCK_DATA ? mockClientsApi : realClientsApi;

// Then use it anywhere:
function ClientsList() {
  const [clients, setClients] = React.useState([]);

  useEffect(() => {
    async function loadClients() {
      // This will automatically use mock or real API based on USE_MOCK_DATA flag
      const data = await clientsApi.getAllClients();
      setClients(data);
    }
    loadClients();
  }, []);

  return (
    <div>
      <h3>Clients ({clients.length})</h3>
      <ul>
        {clients.map((client) => (
          <li key={client.clients_id}>
            {client.clients_name} - {client.clients_phone}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Option 5: Use in Dashboard
import { mockOtherApis } from "./mock";

function Dashboard() {
  const [stats, setStats] = React.useState(null);

  useEffect(() => {
    // Get dashboard stats from mock data
    const dashboardStats = JSON.parse(
      localStorage.getItem("appDashboardStats") || "{}",
    );
    setStats(dashboardStats);
  }, []);

  if (!stats) return <div>Loading...</div>;

  return (
    <div className="dashboard">
      <h2>Dashboard</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Sales</h3>
          <p>{stats.total_sales?.toLocaleString("ar-EG")} EGP</p>
        </div>
        <div className="stat-card">
          <h3>Total Purchases</h3>
          <p>{stats.total_purchases?.toLocaleString("ar-EG")} EGP</p>
        </div>
        <div className="stat-card">
          <h3>Total Clients</h3>
          <p>{stats.total_clients}</p>
        </div>
        <div className="stat-card">
          <h3>Active Clients</h3>
          <p>{stats.active_clients}</p>
        </div>
        <div className="stat-card">
          <h3>Total Products</h3>
          <p>{stats.total_products}</p>
        </div>
        <div className="stat-card">
          <h3>Inventory Value</h3>
          <p>{stats.total_inventory_value?.toLocaleString("ar-EG")} EGP</p>
        </div>
        <div className="stat-card">
          <h3>Pending Orders</h3>
          <p>{stats.pending_orders}</p>
        </div>
        <div className="stat-card">
          <h3>Low Stock Items</h3>
          <p>{stats.low_stock_items}</p>
        </div>
      </div>
    </div>
  );
}

// Option 6: Test adding/updating data
async function testMockDataOperations() {
  // Add a new client
  const newClientMessage = await mockClientsApi.addClient({
    clients_name: "شركة اختبار",
    clients_phone: "01099887766",
    clients_email: "test@example.com",
    clients_address: "عنوان تجريبي",
    clients_city: "القاهرة",
    clients_status: "نشط",
    clients_type_id: 1,
    clients_credit_limit: 25000,
  });
  console.log(newClientMessage); // "تم إضافة العميل بنجاح"

  // Get all clients
  const clients = await mockClientsApi.getAllClients();
  console.log("Total clients:", clients.length);

  // Update a client
  const updateMessage = await mockClientsApi.updateClient(1, {
    clients_phone: "01000000000",
  });
  console.log(updateMessage); // "تم تحديث العميل بنجاح"

  // Add a sales order
  const orderResult = await mockSalesOrdersApi.addSalesOrder({
    sales_orders_client_id: 1,
    sales_orders_warehouse_id: 1,
    sales_orders_representative_id: 1,
    sales_orders_order_date: "2024-02-19",
    sales_orders_status: "معلق",
    sales_orders_delivery_status: "لم يتم التسليم",
    sales_orders_subtotal: 5000,
    sales_orders_discount_amount: 0,
    sales_orders_tax_amount: 700,
    sales_orders_total_amount: 5700,
    items: [
      {
        sales_order_items_variant_id: 1,
        sales_order_items_packaging_type_id: 1,
        sales_order_items_quantity: 10,
        sales_order_items_unit_price: 500,
        sales_order_items_discount: 0,
        sales_order_items_tax_rate: 14,
        sales_order_items_total: 5000,
      },
    ],
  });
  console.log("New order:", orderResult);
}

export default App;
