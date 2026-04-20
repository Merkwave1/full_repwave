# Mock Data System for RepWave

This directory contains a comprehensive mock data system that allows the entire RepWave application to run with realistic test data without needing a backend server.

## 📁 Files

- **`comprehensiveMockData.js`** - Generates realistic mock data for all entities
- **`mockApiWrapper.js`** - Mock API functions that mimic real API behavior
- **`index.js`** - Main entry point for easy imports
- **`mockData.js`** - Legacy small mock data (kept for compatibility)
- **`seedBigMockData.js`** - Legacy big mock data (kept for compatibility)

## 🚀 Quick Start

### 1. Initialize Mock Data

Add this to your `main.jsx` or app entry point:

```javascript
import { initializeMockData } from "./mock";

// Initialize mock data when app starts
initializeMockData();
```

This will automatically seed the localStorage with comprehensive mock data on first run.

### 2. Use Mock Data in Your Components

The mock data is stored in localStorage with these keys:

```javascript
// Users
const users = JSON.parse(localStorage.getItem("appUsers") || "[]");

// Categories
const categories = JSON.parse(localStorage.getItem("appCategories") || "[]");

// Clients
const clients = JSON.parse(localStorage.getItem("appClients") || "[]");

// Products
const products = JSON.parse(localStorage.getItem("appProducts") || "[]");

// Warehouses
const warehouses = JSON.parse(
  localStorage.getItem("appWarehouses") || '{"data":[]}',
);

// Inventory
const inventory = JSON.parse(localStorage.getItem("appInventory") || "[]");

// Sales Orders
const salesOrders = JSON.parse(localStorage.getItem("appSalesOrders") || "[]");

// Purchase Orders
const purchaseOrders = JSON.parse(
  localStorage.getItem("appPurchaseOrders") || "[]",
);

// And many more...
```

### 3. Use Mock API Functions

Instead of calling real APIs, use the mock API wrapper:

```javascript
import { mockClientsApi, mockProductsApi, mockSalesOrdersApi } from "./mock";

// Get all clients
const clients = await mockClientsApi.getAllClients();

// Add a new client
await mockClientsApi.addClient({
  clients_name: "عميل جديد",
  clients_phone: "01012345678",
  clients_email: "client@example.com",
  // ... other fields
});

// Get all products
const { products } = await mockProductsApi.getAllProducts();

// Add a sales order
const result = await mockSalesOrdersApi.addSalesOrder({
  sales_orders_client_id: 1,
  sales_orders_warehouse_id: 1,
  sales_orders_order_date: "2024-02-19",
  sales_orders_status: "معلق",
  items: [
    {
      sales_order_items_variant_id: 1,
      sales_order_items_quantity: 10,
      sales_order_items_unit_price: 100,
    },
  ],
});
```

## 📊 Available Mock Data

The system generates realistic data for:

### Core Entities

- ✅ **Users** (25 users with different roles)
- ✅ **Categories** (9 product categories)
- ✅ **Clients** (80 clients with full details)
- ✅ **Suppliers** (30 suppliers)
- ✅ **Products** (200 products)
- ✅ **Product Variants** (300+ variants)
- ✅ **Warehouses** (8 warehouses)
- ✅ **Inventory** (1000+ inventory items)

### Transactions

- ✅ **Sales Orders** (150 orders with items)
- ✅ **Purchase Orders** (100 orders with items)
- ✅ **Client Payments** (200 payments)
- ✅ **Supplier Payments** (150 payments)
- ✅ **Sales Returns** (30 returns)
- ✅ **Purchase Returns** (20 returns)
- ✅ **Goods Receipts** (80 receipts)
- ✅ **Sales Deliveries** (100 deliveries)

### Reference Data

- ✅ **Client Industries** (10 industries)
- ✅ **Client Types** (6 types)
- ✅ **Client Area Tags** (6 areas)
- ✅ **Countries & Governorates** (Egypt with 20 governorates)
- ✅ **Base Units** (10 units)
- ✅ **Packaging Types** (8 types)
- ✅ **Product Attributes** (4 attributes)
- ✅ **Payment Methods** (5 methods)
- ✅ **Safes** (3 safes)

### Other

- ✅ **Notifications** (50 notifications)
- ✅ **Settings** (8 system settings)
- ✅ **Visit Plans** (40 planned visits)
- ✅ **Visits** (60 actual visits)
- ✅ **Dashboard Statistics**

## 🛠️ Utility Functions

### Initialize Mock Data

```javascript
import { initializeMockData } from "./mock";

// Seeds data if not already seeded
initializeMockData();
```

### Reset All Mock Data

```javascript
import { resetMockData } from "./mock";

// Clears and regenerates all mock data
resetMockData();
```

### Clear Mock Data

```javascript
import { clearMockData } from "./mock";

// Removes all mock data from localStorage
clearMockData();
```

### Check if Mock Data Exists

```javascript
import { isMockDataAvailable } from "./mock";

if (isMockDataAvailable()) {
  console.log("Mock data is ready!");
}
```

### Get Mock Data Statistics

```javascript
import { getMockDataStats } from "./mock";

const stats = getMockDataStats();
console.log("Users:", stats.users);
console.log("Products:", stats.products);
console.log("Sales Orders:", stats.salesOrders);
```

## 🎯 Mock API Reference

All mock APIs follow the same patterns as real APIs and return Promises.

### Users API

```javascript
import { mockUsersApi } from "./mock";

await mockUsersApi.getAllUsers();
await mockUsersApi.getUserById(userId);
await mockUsersApi.addUser(userData);
await mockUsersApi.updateUser(userId, userData);
await mockUsersApi.deleteUser(userId);
```

### Categories API

```javascript
import { mockCategoriesApi } from "./mock";

await mockCategoriesApi.getAllCategories();
await mockCategoriesApi.addCategory(categoryData);
await mockCategoriesApi.updateCategory(categoryId, categoryData);
await mockCategoriesApi.deleteCategory(categoryId);
```

### Clients API

```javascript
import { mockClientsApi } from "./mock";

await mockClientsApi.getAllClients();
await mockClientsApi.getClientById(clientId);
await mockClientsApi.getClientDetails(clientId);
await mockClientsApi.addClient(clientData);
await mockClientsApi.updateClient(clientId, clientData);
await mockClientsApi.deleteClient(clientId);
await mockClientsApi.getClientReports(reportType);
```

### Products API

```javascript
import { mockProductsApi } from "./mock";

await mockProductsApi.getAllProducts(); // Returns { products: [] }
await mockProductsApi.addProduct(productData);
await mockProductsApi.updateProduct(productId, productData);
await mockProductsApi.deleteProduct(productId);
await mockProductsApi.getProductReports(reportType);
```

### Warehouses API

```javascript
import { mockWarehousesApi } from "./mock";

await mockWarehousesApi.getAllWarehouses(includeAll);
await mockWarehousesApi.addWarehouse(warehouseData);
await mockWarehousesApi.updateWarehouse(warehouseId, warehouseData);
await mockWarehousesApi.deleteWarehouse(warehouseId);
```

### Inventory API

```javascript
import { mockInventoryApi } from "./mock";

await mockInventoryApi.getAllInventory(filters);
await mockInventoryApi.addInventory(inventoryData);
await mockInventoryApi.updateInventory(inventoryId, inventoryData);
await mockInventoryApi.deleteInventory(inventoryId);
await mockInventoryApi.markInventoryRemoved(inventoryId);
await mockInventoryApi.repackInventory(repackData);
```

### Sales Orders API

```javascript
import { mockSalesOrdersApi } from "./mock";

await mockSalesOrdersApi.getAllSalesOrders(options);
await mockSalesOrdersApi.getSalesOrderDetails(id);
await mockSalesOrdersApi.addSalesOrder(orderData);
await mockSalesOrdersApi.updateSalesOrder(orderData);
await mockSalesOrdersApi.deleteSalesOrder(id);
await mockSalesOrdersApi.updateSalesOrderDeliveryStatus(id, status, notes);
await mockSalesOrdersApi.getSalesOrdersByClient(clientId, lastN);
await mockSalesOrdersApi.getDeliverableSalesOrders(options);
```

### Purchase Orders API

```javascript
import { mockPurchaseOrdersApi } from "./mock";

await mockPurchaseOrdersApi.getAllPurchaseOrders();
await mockPurchaseOrdersApi.getPurchaseOrderDetails(orderId);
await mockPurchaseOrdersApi.addPurchaseOrder(orderData);
await mockPurchaseOrdersApi.updatePurchaseOrder(orderId, orderData);
await mockPurchaseOrdersApi.deletePurchaseOrder(orderId);
await mockPurchaseOrdersApi.getPurchaseOrdersPaginated(params);
await mockPurchaseOrdersApi.getPendingPurchaseOrdersForReceive();
await mockPurchaseOrdersApi.getPurchaseOrdersBySupplier(
  supplierId,
  statuses,
  limit,
);
```

### Other APIs

```javascript
import { mockOtherApis } from "./mock";

await mockOtherApis.getSuppliers();
await mockOtherApis.getClientIndustries();
await mockOtherApis.getClientTypes();
await mockOtherApis.getClientAreaTags();
await mockOtherApis.getCountriesWithGovernorates();
await mockOtherApis.getBaseUnits();
await mockOtherApis.getPackagingTypes();
await mockOtherApis.getProductAttributes();
await mockOtherApis.getPaymentMethods();
await mockOtherApis.getSafes();
await mockOtherApis.getNotifications();
await mockOtherApis.getSettings();
await mockOtherApis.getSettingsCategorized();
await mockOtherApis.getVisitPlans();
await mockOtherApis.getVisits();
await mockOtherApis.getSalesReturns();
await mockOtherApis.getPurchaseReturns();
await mockOtherApis.getGoodsReceipts();
await mockOtherApis.getDeliverableSalesOrders();
```

## 💡 Integration Examples

### Example 1: Using in a Component

```javascript
import React, { useState, useEffect } from "react";
import { mockClientsApi } from "../mock";

function ClientsList() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadClients() {
      try {
        const data = await mockClientsApi.getAllClients();
        setClients(data);
      } catch (error) {
        console.error("Error loading clients:", error);
      } finally {
        setLoading(false);
      }
    }
    loadClients();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Clients ({clients.length})</h2>
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
```

### Example 2: Adding a New Record

```javascript
import { mockProductsApi } from "../mock";

async function handleAddProduct(formData) {
  try {
    const message = await mockProductsApi.addProduct({
      products_name: formData.name,
      products_sku: formData.sku,
      products_category_id: formData.categoryId,
      products_base_unit_id: formData.baseUnitId,
      products_status: "active",
    });

    console.log(message); // "تم إضافة المنتج بنجاح"

    // Refresh the products list
    const { products } = await mockProductsApi.getAllProducts();
    setProducts(products);
  } catch (error) {
    console.error("Error adding product:", error);
  }
}
```

### Example 3: Filtering Data

```javascript
import { mockSalesOrdersApi } from "../mock";

async function loadPendingOrders() {
  const result = await mockSalesOrdersApi.getAllSalesOrders({
    status: "معلق",
    page: 1,
    limit: 20,
  });

  console.log("Orders:", result.data);
  console.log("Total:", result.pagination.total_items);
  console.log("Pages:", result.pagination.total_pages);
}
```

## 🔧 Configuration

### Toggle Mock Data Mode

In `mockApiWrapper.js`, you can toggle mock data mode:

```javascript
const USE_MOCK_DATA = true; // Set to false to use real API
```

You can use this flag to conditionally use mock or real APIs:

```javascript
import { USE_MOCK_DATA, mockClientsApi } from "./mock";
import { getAllClients as getRealClients } from "../apis/clients";

async function getClients() {
  if (USE_MOCK_DATA) {
    return await mockClientsApi.getAllClients();
  } else {
    return await getRealClients();
  }
}
```

## 📝 Data Structure

### Sample Client Object

```javascript
{
  clients_id: 1,
  clients_name: "شركة النور",
  clients_phone: "01012345678",
  clients_email: "client1@example.com",
  clients_address: "شارع الجمهورية، المعادي",
  clients_city: "القاهرة",
  clients_governorate_id: 1,
  clients_country_id: 1,
  clients_status: "نشط",
  clients_type_id: 1,
  clients_industry_id: 1,
  clients_area_tag_id: 1,
  clients_credit_limit: 50000.00,
  clients_current_balance: 12500.50,
  clients_tax_number: "123456789",
  clients_commercial_registration: "12345",
  clients_notes: "",
  clients_created_at: "2024-01-15",
  clients_representative_id: 5,
  clients_latitude: 30.123456,
  clients_longitude: 31.234567
}
```

### Sample Sales Order Object

```javascript
{
  sales_orders_id: 1,
  sales_orders_order_number: "SO-202400001",
  sales_orders_client_id: 15,
  sales_orders_warehouse_id: 1,
  sales_orders_representative_id: 5,
  sales_orders_order_date: "2024-02-15",
  sales_orders_expected_delivery_date: "2024-02-20",
  sales_orders_status: "مؤكد",
  sales_orders_delivery_status: "لم يتم التسليم",
  sales_orders_subtotal: 15000.00,
  sales_orders_discount_amount: 500.00,
  sales_orders_tax_amount: 2030.00,
  sales_orders_total_amount: 16530.00,
  sales_orders_notes: "",
  sales_orders_created_at: "2024-02-15"
}
```

## 🎨 Customization

To add more mock data or customize existing data, edit `comprehensiveMockData.js`:

```javascript
// Add more clients
data.clients = Array.from({ length: 100 }, (_, i) => ({
  // ... your custom client data
}));

// Add custom product categories
const productCategories = ["Category 1", "Category 2" /* ... */];

// Customize data ranges
const randomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
```

## 🐛 Troubleshooting

### Mock data not loading

```javascript
// Check if data is seeded
import { isMockDataAvailable } from "./mock";
console.log("Mock data available:", isMockDataAvailable());

// Force reset
import { resetMockData } from "./mock";
resetMockData();
```

### Data seems outdated

```javascript
// Clear and regenerate
import { clearMockData, seedComprehensiveMockData } from "./mock";
clearMockData();
seedComprehensiveMockData();
```

### localStorage quota exceeded

The mock data is quite large. If you hit localStorage limits:

1. Use a smaller subset of data
2. Store in memory instead of localStorage
3. Use IndexedDB for larger datasets

## 📚 Additional Resources

- See `auth.js` for how the real app uses `getApp*` functions
- Mock APIs mirror the structure in `src/apis/` folder
- All mock functions return Promises for consistency

## 🤝 Contributing

To add new mock data:

1. Add the data structure in `comprehensiveMockData.js`
2. Add corresponding API functions in `mockApiWrapper.js`
3. Export from `index.js`
4. Update this README

---

**Happy Testing! 🎉**
