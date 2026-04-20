# Mock Data Setup Guide

## 🎯 Quick Start (3 Steps)

### Step 1: Initialize Mock Data on App Startup

Add this to your `src/main.jsx`:

```javascript
import { initializeMockData } from "./mock";

// Initialize mock data before rendering
initializeMockData();

// Then render your app
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

### Step 2: Use Mock Data in Components

Replace your API imports with mock APIs:

**Before:**

```javascript
import { getAllClients } from "../apis/clients";
```

**After:**

```javascript
import { mockClientsApi } from "../mock";
const getAllClients = mockClientsApi.getAllClients;
```

Or use conditional imports:

```javascript
import { USE_MOCK_DATA, mockClientsApi } from "../mock";
import * as realClientsApi from "../apis/clients";

const clientsApi = USE_MOCK_DATA ? mockClientsApi : realClientsApi;
```

### Step 3: Access Data Directly from localStorage

For read-only access, you can also get data directly:

```javascript
// Get all clients
const clients = JSON.parse(localStorage.getItem("appClients") || "[]");

// Get all products
const products = JSON.parse(localStorage.getItem("appProducts") || "[]");

// Get sales orders
const orders = JSON.parse(localStorage.getItem("appSalesOrders") || "[]");
```

## 📋 Complete Integration Example

### main.jsx

```javascript
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { initializeMockData, getMockDataStats } from "./mock";

// Initialize mock data
initializeMockData();

// Optional: Log statistics
const stats = getMockDataStats();
console.log("📊 Mock Data Ready:", stats);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

### Using in a Dashboard Component

```javascript
import React, { useState, useEffect } from "react";

function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // Load dashboard statistics
    const dashboardStats = JSON.parse(
      localStorage.getItem("appDashboardStats") || "{}",
    );
    setStats(dashboardStats);
  }, []);

  if (!stats) return <div>Loading...</div>;

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Sales</h3>
          <p>{stats.total_sales?.toLocaleString()} EGP</p>
        </div>
        <div className="stat-card">
          <h3>Total Clients</h3>
          <p>{stats.total_clients}</p>
        </div>
        <div className="stat-card">
          <h3>Active Products</h3>
          <p>{stats.total_products}</p>
        </div>
        <div className="stat-card">
          <h3>Pending Orders</h3>
          <p>{stats.pending_orders}</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
```

### Using Mock APIs in Components

```javascript
import React, { useState, useEffect } from "react";
import { mockClientsApi, mockSalesOrdersApi } from "../mock";

function ClientOrders({ clientId }) {
  const [client, setClient] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Load client details
        const clientData = await mockClientsApi.getClientById(clientId);
        setClient(clientData);

        // Load client's orders
        const clientOrders = await mockSalesOrdersApi.getSalesOrdersByClient(
          clientId,
          10, // Last 10 orders
        );
        setOrders(clientOrders);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    }

    if (clientId) {
      loadData();
    }
  }, [clientId]);

  if (loading) return <div>Loading...</div>;
  if (!client) return <div>Client not found</div>;

  return (
    <div>
      <h2>{client.clients_name}</h2>
      <p>Phone: {client.clients_phone}</p>
      <p>Balance: {client.clients_current_balance} EGP</p>

      <h3>Recent Orders</h3>
      {orders.length === 0 ? (
        <p>No orders found</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Order #</th>
              <th>Date</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.sales_orders_id}>
                <td>{order.sales_orders_order_number}</td>
                <td>{order.sales_orders_order_date}</td>
                <td>{order.sales_orders_total_amount} EGP</td>
                <td>{order.sales_orders_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ClientOrders;
```

### Adding New Records

```javascript
import React, { useState } from "react";
import { mockClientsApi } from "../mock";

function AddClientForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    clients_name: "",
    clients_phone: "",
    clients_email: "",
    clients_address: "",
    clients_city: "القاهرة",
    clients_status: "نشط",
    clients_type_id: 1,
    clients_credit_limit: 10000,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const message = await mockClientsApi.addClient(formData);
      alert(message); // "تم إضافة العميل بنجاح"

      // Reset form
      setFormData({
        clients_name: "",
        clients_phone: "",
        clients_email: "",
        clients_address: "",
        clients_city: "القاهرة",
        clients_status: "نشط",
        clients_type_id: 1,
        clients_credit_limit: 10000,
      });

      // Notify parent component
      if (onSuccess) onSuccess();
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Client Name"
        value={formData.clients_name}
        onChange={(e) =>
          setFormData({ ...formData, clients_name: e.target.value })
        }
        required
      />
      <input
        type="tel"
        placeholder="Phone"
        value={formData.clients_phone}
        onChange={(e) =>
          setFormData({ ...formData, clients_phone: e.target.value })
        }
        required
      />
      <input
        type="email"
        placeholder="Email"
        value={formData.clients_email}
        onChange={(e) =>
          setFormData({ ...formData, clients_email: e.target.value })
        }
      />
      <button type="submit" disabled={loading}>
        {loading ? "Adding..." : "Add Client"}
      </button>
    </form>
  );
}

export default AddClientForm;
```

## 🔧 Configuration

### Toggle Mock Data On/Off

In `src/mock/mockApiWrapper.js`, line 1:

```javascript
const USE_MOCK_DATA = true; // Set to false to use real API
```

Then export and use conditionally:

```javascript
import { USE_MOCK_DATA, mockClientsApi } from "./mock";
import * as realClientsApi from "./apis/clients";

export const clientsApi = USE_MOCK_DATA ? mockClientsApi : realClientsApi;
```

## 🎨 Available Mock Data Keys

All data is stored in localStorage with these keys:

| Key                            | Type   | Description                       |
| ------------------------------ | ------ | --------------------------------- |
| `appUsers`                     | Array  | Users (25 users)                  |
| `appCategories`                | Array  | Product categories (9 categories) |
| `appClients`                   | Array  | Clients (80 clients)              |
| `appSuppliers`                 | Object | Suppliers ({ data: [...] })       |
| `appProducts`                  | Array  | Products (200 products)           |
| `appProductVariants`           | Array  | Product variants (300+ variants)  |
| `appWarehouses`                | Object | Warehouses ({ data: [...] })      |
| `appInventory`                 | Array  | Inventory items (1000+ items)     |
| `appSalesOrders`               | Array  | Sales orders (150 orders)         |
| `appSalesOrderItems`           | Array  | Sales order items                 |
| `appPurchaseOrders`            | Array  | Purchase orders (100 orders)      |
| `appPurchaseOrderItems`        | Array  | Purchase order items              |
| `appNotifications`             | Array  | Notifications (50 items)          |
| `appSettings`                  | Array  | System settings                   |
| `appClientIndustries`          | Array  | Client industries                 |
| `appClientTypes`               | Array  | Client types                      |
| `appClientAreaTags`            | Array  | Client area tags                  |
| `appCountriesWithGovernorates` | Array  | Countries with governorates       |
| `appBaseUnits`                 | Object | Base units ({ data: [...] })      |
| `appPackagingTypes`            | Object | Packaging types ({ data: [...] }) |
| `appProductAttributes`         | Array  | Product attributes                |
| `appPaymentMethods`            | Array  | Payment methods                   |
| `appSafes`                     | Array  | Safes                             |
| `appClientPayments`            | Array  | Client payments (200 payments)    |
| `appSupplierPayments`          | Array  | Supplier payments (150 payments)  |
| `appVisitPlans`                | Array  | Visit plans (40 plans)            |
| `appVisits`                    | Array  | Actual visits (60 visits)         |
| `appSalesReturns`              | Array  | Sales returns (30 returns)        |
| `appPurchaseReturns`           | Array  | Purchase returns (20 returns)     |
| `appGoodsReceipts`             | Object | Goods receipts ({ data: [...] })  |
| `appSalesDeliveries`           | Array  | Sales deliveries (100 deliveries) |
| `appDashboardStats`            | Object | Dashboard statistics              |

## 🐛 Troubleshooting

### Mock data not appearing

```javascript
// Check if initialized
import { isMockDataAvailable } from "./mock";
console.log("Mock data available:", isMockDataAvailable());

// Force re-initialize
import { resetMockData } from "./mock";
resetMockData();
```

### Clear and start fresh

```javascript
import { clearMockData, seedComprehensiveMockData } from "./mock";

// Clear everything
clearMockData();

// Seed fresh data
seedComprehensiveMockData();
```

### View current statistics

```javascript
import { getMockDataStats } from "./mock";

const stats = getMockDataStats();
console.log("Mock Data Statistics:", stats);
```

## 📚 Reference Files

- **Full Documentation**: `README.md`
- **Usage Examples**: `EXAMPLE_USAGE.jsx`
- **Mock Data Generator**: `comprehensiveMockData.js`
- **Mock API Functions**: `mockApiWrapper.js`
- **Main Entry Point**: `index.js`

## ✅ Benefits

1. **No Backend Required** - Develop and test without a server
2. **Realistic Data** - 80+ clients, 200+ products, 150+ orders
3. **Full CRUD Support** - Add, update, delete operations work
4. **Instant Testing** - Test features immediately with rich data
5. **Easy Toggle** - Switch between mock and real APIs easily
6. **Persistent** - Data persists in localStorage across sessions

---

**You're all set! 🚀 Start building with confidence using comprehensive mock data.**
