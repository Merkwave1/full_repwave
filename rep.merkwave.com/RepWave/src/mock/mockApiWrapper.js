// Mock API Wrapper - Intercepts API calls and returns mock data from localStorage
// This allows the entire app to work with mock data without changing existing code

const USE_MOCK_DATA = true; // Set to false to use real API

// Helper to get mock data from localStorage
const getMockData = (key, defaultValue = []) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.error(`Error parsing mock data for ${key}:`, error);
    return defaultValue;
  }
};

// Helper to set mock data to localStorage
const setMockData = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Error saving mock data for ${key}:`, error);
    return false;
  }
};

// Simulate async API delay
const delay = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));

// Generate auto-increment IDs
const getNextId = (items, idField = 'id') => {
  if (!items || items.length === 0) return 1;
  return Math.max(...items.map(item => item[idField] || 0)) + 1;
};

// Mock API functions for Users
export const mockUsersApi = {
  async getAllUsers() {
    await delay();
    return getMockData('appUsers', []);
  },

  async getUserById(userId) {
    await delay();
    const users = getMockData('appUsers', []);
    const user = users.find(u => u.users_id === parseInt(userId));
    if (!user) throw new Error(`User with ID ${userId} not found`);
    return user;
  },

  async addUser(userData) {
    await delay();
    const users = getMockData('appUsers', []);
    const newUser = {
      users_id: getNextId(users, 'users_id'),
      users_uuid: `uuid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...userData,
      users_created_at: new Date().toISOString().split('T')[0],
    };
    users.push(newUser);
    setMockData('appUsers', users);
    return 'تم إضافة المستخدم بنجاح';
  },

  async updateUser(userId, userData) {
    await delay();
    const users = getMockData('appUsers', []);
    const index = users.findIndex(u => u.users_id === parseInt(userId));
    if (index === -1) throw new Error(`User with ID ${userId} not found`);
    users[index] = { ...users[index], ...userData };
    setMockData('appUsers', users);
    return 'تم تحديث المستخدم بنجاح';
  },

  async deleteUser(userId) {
    await delay();
    const users = getMockData('appUsers', []);
    const filtered = users.filter(u => u.users_id !== parseInt(userId));
    if (filtered.length === users.length) throw new Error(`User with ID ${userId} not found`);
    setMockData('appUsers', filtered);
    return 'تم حذف المستخدم بنجاح';
  },
};

// Mock API functions for Categories
export const mockCategoriesApi = {
  async getAllCategories() {
    await delay();
    return getMockData('appCategories', []);
  },

  async addCategory(categoryData) {
    await delay();
    const categories = getMockData('appCategories', []);
    const newCategory = {
      categories_id: getNextId(categories, 'categories_id'),
      ...categoryData,
      categories_created_at: new Date().toISOString().split('T')[0],
    };
    categories.push(newCategory);
    setMockData('appCategories', categories);
    return 'تم إضافة الفئة بنجاح';
  },

  async updateCategory(categoryId, categoryData) {
    await delay();
    const categories = getMockData('appCategories', []);
    const index = categories.findIndex(c => c.categories_id === parseInt(categoryId));
    if (index === -1) throw new Error(`Category with ID ${categoryId} not found`);
    categories[index] = { ...categories[index], ...categoryData };
    setMockData('appCategories', categories);
    return 'تم تحديث الفئة بنجاح';
  },

  async deleteCategory(categoryId) {
    await delay();
    const categories = getMockData('appCategories', []);
    const filtered = categories.filter(c => c.categories_id !== parseInt(categoryId));
    if (filtered.length === categories.length) throw new Error(`Category with ID ${categoryId} not found`);
    setMockData('appCategories', filtered);
    return 'تم حذف الفئة بنجاح';
  },
};

// Mock API functions for Clients
export const mockClientsApi = {
  async getAllClients() {
    await delay();
    return getMockData('appClients', []);
  },

  async getClientDetails(clientId) {
    await delay();
    const clients = getMockData('appClients', []);
    const client = clients.find(c => c.clients_id === parseInt(clientId));
    if (!client) throw new Error(`Client with ID ${clientId} not found`);
    return client;
  },

  async getClientById(clientId) {
    await delay();
    const clients = getMockData('appClients', []);
    const client = clients.find(c => c.clients_id === parseInt(clientId));
    if (!client) throw new Error(`Client with ID ${clientId} not found`);
    return client;
  },

  async addClient(clientData) {
    await delay();
    const clients = getMockData('appClients', []);
    const newClient = {
      clients_id: getNextId(clients, 'clients_id'),
      ...clientData,
      clients_created_at: new Date().toISOString().split('T')[0],
      clients_current_balance: 0,
    };
    clients.push(newClient);
    setMockData('appClients', clients);
    return 'تم إضافة العميل بنجاح';
  },

  async updateClient(clientId, clientData) {
    await delay();
    const clients = getMockData('appClients', []);
    const index = clients.findIndex(c => c.clients_id === parseInt(clientId));
    if (index === -1) throw new Error(`Client with ID ${clientId} not found`);
    clients[index] = { ...clients[index], ...clientData };
    setMockData('appClients', clients);
    return 'تم تحديث العميل بنجاح';
  },

  async deleteClient(clientId) {
    await delay();
    const clients = getMockData('appClients', []);
    const filtered = clients.filter(c => c.clients_id !== parseInt(clientId));
    if (filtered.length === clients.length) throw new Error(`Client with ID ${clientId} not found`);
    setMockData('appClients', filtered);
    return 'تم حذف العميل بنجاح';
  },

  async getClientReports(reportType = 'overview') {
    await delay();
    // Mock comprehensive reports data based on report type
    const clients = getMockData('appClients', []);
    return {
      overview: { total_clients: clients.length, report_type: reportType },
      details: clients,
    };
  },
};

// Mock API functions for Products
// Helper to get the products array from { data: [...] } storage
const getProductsArray = () => {
  const raw = getMockData('appProducts', { data: [] });
  return Array.isArray(raw) ? raw : (raw.data || []);
};
const saveProductsArray = (arr) => setMockData('appProducts', { data: arr });

export const mockProductsApi = {
  async getAllProducts() {
    await delay();
    const products = getProductsArray();
    return { products };
  },

  async addProduct(productData) {
    await delay();
    const products = getProductsArray();
    const newProduct = {
      products_id: getNextId(products, 'products_id'),
      ...productData,
      products_is_active: 1,
      products_created_at: new Date().toISOString().split('T')[0],
      variants: [],
    };
    products.push(newProduct);
    saveProductsArray(products);
    return 'تم إضافة المنتج بنجاح';
  },

  async updateProduct(productId, productData) {
    await delay();
    const products = getProductsArray();
    const index = products.findIndex(p => p.products_id === parseInt(productId));
    if (index === -1) throw new Error(`Product with ID ${productId} not found`);
    products[index] = { ...products[index], ...productData };
    saveProductsArray(products);
    return 'تم تحديث المنتج بنجاح';
  },

  async deleteProduct(productId) {
    await delay();
    const products = getProductsArray();
    const filtered = products.filter(p => p.products_id !== parseInt(productId));
    if (filtered.length === products.length) throw new Error(`Product with ID ${productId} not found`);
    saveProductsArray(filtered);
    return 'تم حذف المنتج بنجاح';
  },

  async getProductReports(reportType = 'overview') {
    await delay();
    const products = getProductsArray();
    return {
      overview: { total_products: products.length, report_type: reportType },
    };
  },

  async getInterestedProductClients(productId) {
    await delay();
    // Return empty array for now - could be enhanced to return mock interested clients
    console.log('Getting interested clients for product:', productId);
    return [];
  },
};

// Mock API functions for Warehouses
export const mockWarehousesApi = {
  async getAllWarehouses(includeAllWarehouses = false) {
    await delay();
    const data = getMockData('appWarehouses', { data: [] });
    const warehouses = Array.isArray(data) ? data : data.data || [];
    // If includeAllWarehouses is false, could filter by user access (not implemented in mock)
    return includeAllWarehouses ? warehouses : warehouses;
  },

  async addWarehouse(warehouseData) {
    await delay();
    const warehouses = getMockData('appWarehouses', { data: [] });
    const data = Array.isArray(warehouses) ? warehouses : warehouses.data || [];
    const newWarehouse = {
      warehouse_id: getNextId(data, 'warehouse_id'),
      warehouse_code: `WH-${1000 + data.length + 1}`,
      ...warehouseData,
      warehouse_created_at: new Date().toISOString().split('T')[0],
      warehouse_status: 'active',
    };
    data.push(newWarehouse);
    setMockData('appWarehouses', { data });
    return newWarehouse;
  },

  async updateWarehouse(warehouseId, warehouseData) {
    await delay();
    const warehouses = getMockData('appWarehouses', { data: [] });
    const data = Array.isArray(warehouses) ? warehouses : warehouses.data || [];
    const index = data.findIndex(w => w.warehouse_id === parseInt(warehouseId));
    if (index === -1) throw new Error(`Warehouse with ID ${warehouseId} not found`);
    data[index] = { ...data[index], ...warehouseData };
    setMockData('appWarehouses', { data });
    return 'تم تحديث المخزن بنجاح';
  },

  async deleteWarehouse(warehouseId) {
    await delay();
    const warehouses = getMockData('appWarehouses', { data: [] });
    const data = Array.isArray(warehouses) ? warehouses : warehouses.data || [];
    const filtered = data.filter(w => w.warehouse_id !== parseInt(warehouseId));
    if (filtered.length === data.length) throw new Error(`Warehouse with ID ${warehouseId} not found`);
    setMockData('appWarehouses', { data: filtered });
    return 'تم حذف المخزن بنجاح';
  },
};

// Mock API functions for Inventory
export const mockInventoryApi = {
  async getAllInventory(filters = {}) {
    await delay();
    let inventory = getMockData('appInventory', []);
    
    // Apply filters
    if (filters.warehouse_id) {
      inventory = inventory.filter(i => i.inventory_warehouse_id === parseInt(filters.warehouse_id));
    }
    if (filters.variant_id) {
      inventory = inventory.filter(i => i.inventory_variant_id === parseInt(filters.variant_id));
    }
    
    return {
      data: inventory,
      success: true,
    };
  },

  async addInventory(inventoryData) {
    await delay();
    const inventory = getMockData('appInventory', []);
    const newItem = {
      inventory_id: getNextId(inventory, 'inventory_id'),
      ...inventoryData,
    };
    inventory.push(newItem);
    setMockData('appInventory', inventory);
    return 'تم إضافة عنصر المخزون بنجاح';
  },

  async updateInventory(inventoryId, inventoryData) {
    await delay();
    const inventory = getMockData('appInventory', []);
    const index = inventory.findIndex(i => i.inventory_id === parseInt(inventoryId));
    if (index === -1) throw new Error(`Inventory item with ID ${inventoryId} not found`);
    inventory[index] = { ...inventory[index], ...inventoryData };
    setMockData('appInventory', inventory);
    return 'تم تحديث عنصر المخزون بنجاح';
  },

  async deleteInventory(inventoryId) {
    await delay();
    const inventory = getMockData('appInventory', []);
    const filtered = inventory.filter(i => i.inventory_id !== parseInt(inventoryId));
    if (filtered.length === inventory.length) throw new Error(`Inventory item with ID ${inventoryId} not found`);
    setMockData('appInventory', filtered);
    return 'تم حذف عنصر المخزون بنجاح';
  },

  async markInventoryRemoved(inventoryId) {
    await delay();
    const inventory = getMockData('appInventory', []);
    const index = inventory.findIndex(i => i.inventory_id === parseInt(inventoryId));
    if (index === -1) throw new Error(`Inventory item with ID ${inventoryId} not found`);
    inventory[index].inventory_status = 'Removed';
    inventory[index].inventory_production_date = '0000-00-00';
    setMockData('appInventory', inventory);
    return 'تم وضع علامة على العنصر كمحذوف';
  },

  async repackInventory(repackData) {
    await delay();
    console.log('Repack inventory:', repackData);
    // In a real implementation, this would update inventory quantities
    return 'تم إعادة التعبئة بنجاح';
  },
};

// Mock API functions for Sales Orders
export const mockSalesOrdersApi = {
  async getAllSalesOrders(options = {}) {
    await delay();
    let orders = getMockData('appSalesOrders', []);
    
    // Apply filters
    if (options.status) {
      orders = orders.filter(o => o.sales_orders_status === options.status);
    }
    if (options.client_id) {
      orders = orders.filter(o => o.sales_orders_client_id === parseInt(options.client_id));
    }
    if (options.delivery_status) {
      orders = orders.filter(o => o.sales_orders_delivery_status === options.delivery_status);
    }
    
    // Pagination
    const page = options.page || 1;
    const limit = options.limit || 50;
    const offset = options.offset || ((page - 1) * limit);
    const paginatedOrders = orders.slice(offset, offset + limit);
    
    return {
      data: paginatedOrders,
      pagination: {
        current_page: page,
        limit,
        total_items: orders.length,
        total_pages: Math.ceil(orders.length / limit),
      },
    };
  },

  async getSalesOrderDetails(id) {
    await delay();
    const orders = getMockData('appSalesOrders', []);
    const order = orders.find(o => o.sales_orders_id === parseInt(id));
    if (!order) throw new Error(`Sales order with ID ${id} not found`);
    
    // Get order items
    const items = getMockData('appSalesOrderItems', []).filter(
      i => i.sales_order_items_sales_order_id === parseInt(id)
    );
    
    return { ...order, items };
  },

  async addSalesOrder(orderData) {
    await delay();
    const orders = getMockData('appSalesOrders', []);
    const newOrder = {
      sales_orders_id: getNextId(orders, 'sales_orders_id'),
      sales_orders_order_number: `SO-${2024}${String(orders.length + 1).padStart(5, '0')}`,
      ...orderData,
      sales_orders_created_at: new Date().toISOString().split('T')[0],
    };
    orders.push(newOrder);
    setMockData('appSalesOrders', orders);
    
    // Save items
    if (orderData.items && orderData.items.length > 0) {
      const items = getMockData('appSalesOrderItems', []);
      orderData.items.forEach(item => {
        items.push({
          sales_order_items_id: getNextId(items, 'sales_order_items_id'),
          sales_order_items_sales_order_id: newOrder.sales_orders_id,
          ...item,
        });
      });
      setMockData('appSalesOrderItems', items);
    }
    
    return { status: 'success', message: 'تم إضافة الطلب بنجاح', data: newOrder };
  },

  async updateSalesOrder(orderData) {
    await delay();
    const orders = getMockData('appSalesOrders', []);
    const index = orders.findIndex(o => o.sales_orders_id === parseInt(orderData.sales_orders_id));
    if (index === -1) throw new Error(`Sales order with ID ${orderData.sales_orders_id} not found`);
    orders[index] = { ...orders[index], ...orderData };
    setMockData('appSalesOrders', orders);
    
    // Update items
    if (orderData.items) {
      const items = getMockData('appSalesOrderItems', []);
      const filtered = items.filter(i => i.sales_order_items_sales_order_id !== parseInt(orderData.sales_orders_id));
      orderData.items.forEach(item => {
        filtered.push({
          sales_order_items_id: item.sales_order_items_id || getNextId(items, 'sales_order_items_id'),
          sales_order_items_sales_order_id: orderData.sales_orders_id,
          ...item,
        });
      });
      setMockData('appSalesOrderItems', filtered);
    }
    
    return { status: 'success', message: 'تم تحديث الطلب بنجاح' };
  },

  async deleteSalesOrder(id) {
    await delay();
    const orders = getMockData('appSalesOrders', []);
    const filtered = orders.filter(o => o.sales_orders_id !== parseInt(id));
    if (filtered.length === orders.length) throw new Error(`Sales order with ID ${id} not found`);
    setMockData('appSalesOrders', filtered);
    
    // Delete items
    const items = getMockData('appSalesOrderItems', []);
    const filteredItems = items.filter(i => i.sales_order_items_sales_order_id !== parseInt(id));
    setMockData('appSalesOrderItems', filteredItems);
    
    return { status: 'success', message: 'تم حذف الطلب بنجاح' };
  },

  async updateSalesOrderDeliveryStatus(salesOrderId, deliveryStatus, notes = '') {
    await delay();
    const orders = getMockData('appSalesOrders', []);
    const index = orders.findIndex(o => o.sales_orders_id === parseInt(salesOrderId));
    if (index === -1) throw new Error(`Sales order with ID ${salesOrderId} not found`);
    orders[index].sales_orders_delivery_status = deliveryStatus;
    if (notes) orders[index].sales_orders_notes = notes;
    setMockData('appSalesOrders', orders);
    return { status: 'success', message: 'تم تحديث حالة التسليم بنجاح' };
  },

  async getSalesOrdersByClient(clientId, lastN = null) {
    await delay();
    let orders = getMockData('appSalesOrders', []).filter(
      o => o.sales_orders_client_id === parseInt(clientId)
    );
    if (lastN && !isNaN(lastN)) {
      orders = orders.slice(-lastN);
    }
    return orders;
  },

  async getDeliverableSalesOrders(options = {}) {
    await delay();
    let orders = getMockData('appSalesOrders', []).filter(o => 
      (o.sales_orders_status === 'مؤكد' || o.sales_orders_status === 'تم الفوترة') &&
      o.sales_orders_delivery_status !== 'تم التسليم'
    );
    
    if (options.client_id) {
      orders = orders.filter(o => o.sales_orders_client_id === parseInt(options.client_id));
    }
    
    return { data: orders };
  },
};

// Mock API functions for Purchase Orders
export const mockPurchaseOrdersApi = {
  async getAllPurchaseOrders() {
    await delay();
    return getMockData('appPurchaseOrders', []);
  },

  async getPurchaseOrderDetails(orderId) {
    await delay();
    const orders = getMockData('appPurchaseOrders', []);
    const order = orders.find(o => o.purchase_orders_id === parseInt(orderId));
    if (!order) throw new Error(`Purchase order with ID ${orderId} not found`);
    
    const items = getMockData('appPurchaseOrderItems', []).filter(
      i => i.purchase_order_items_purchase_order_id === parseInt(orderId)
    );
    
    return { ...order, items };
  },

  async addPurchaseOrder(orderData) {
    await delay();
    const orders = getMockData('appPurchaseOrders', []);
    const newOrder = {
      purchase_orders_id: getNextId(orders, 'purchase_orders_id'),
      purchase_orders_order_number: `PO-${2024}${String(orders.length + 1).padStart(5, '0')}`,
      ...orderData,
      purchase_orders_created_at: new Date().toISOString().split('T')[0],
    };
    orders.push(newOrder);
    setMockData('appPurchaseOrders', orders);
    
    // Save items
    if (orderData.purchase_order_items && orderData.purchase_order_items.length > 0) {
      const items = getMockData('appPurchaseOrderItems', []);
      orderData.purchase_order_items.forEach(item => {
        items.push({
          purchase_order_items_id: getNextId(items, 'purchase_order_items_id'),
          purchase_order_items_purchase_order_id: newOrder.purchase_orders_id,
          ...item,
        });
      });
      setMockData('appPurchaseOrderItems', items);
    }
    
    return 'تم إضافة أمر الشراء بنجاح';
  },

  async updatePurchaseOrder(orderId, orderData) {
    await delay();
    const orders = getMockData('appPurchaseOrders', []);
    const index = orders.findIndex(o => o.purchase_orders_id === parseInt(orderId));
    if (index === -1) throw new Error(`Purchase order with ID ${orderId} not found`);
    orders[index] = { ...orders[index], ...orderData };
    setMockData('appPurchaseOrders', orders);
    
    // Update items
    if (orderData.purchase_order_items) {
      const items = getMockData('appPurchaseOrderItems', []);
      const filtered = items.filter(i => i.purchase_order_items_purchase_order_id !== parseInt(orderId));
      orderData.purchase_order_items.forEach(item => {
        filtered.push({
          purchase_order_items_id: item.purchase_order_items_id || getNextId(items, 'purchase_order_items_id'),
          purchase_order_items_purchase_order_id: orderId,
          ...item,
        });
      });
      setMockData('appPurchaseOrderItems', filtered);
    }
    
    return 'تم تحديث أمر الشراء بنجاح';
  },

  async deletePurchaseOrder(orderId) {
    await delay();
    const orders = getMockData('appPurchaseOrders', []);
    const filtered = orders.filter(o => o.purchase_orders_id !== parseInt(orderId));
    if (filtered.length === orders.length) throw new Error(`Purchase order with ID ${orderId} not found`);
    setMockData('appPurchaseOrders', filtered);
    
    // Delete items
    const items = getMockData('appPurchaseOrderItems', []);
    const filteredItems = items.filter(i => i.purchase_order_items_purchase_order_id !== parseInt(orderId));
    setMockData('appPurchaseOrderItems', filteredItems);
    
    return 'تم حذف أمر الشراء بنجاح';
  },

  async getPurchaseOrdersPaginated(params = {}) {
    await delay();
    let orders = getMockData('appPurchaseOrders', []);
    
    // Apply filters
    if (params.status) {
      const statuses = params.status.split(',').map(s => s.trim());
      orders = orders.filter(o => statuses.includes(o.purchase_orders_status));
    }
    if (params.supplier_id) {
      orders = orders.filter(o => o.purchase_orders_supplier_id === parseInt(params.supplier_id));
    }
    
    // Pagination
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;
    const paginatedOrders = orders.slice(offset, offset + limit);
    
    return {
      data: paginatedOrders,
      pagination: {
        current_page: page,
        limit,
        total_items: orders.length,
        total_pages: Math.ceil(orders.length / limit),
      },
    };
  },

  async getPendingPurchaseOrdersForReceive() {
    await delay();
    return getMockData('appPurchaseOrders', []).filter(o => 
      o.purchase_orders_status === 'مطلوب' || o.purchase_orders_status === 'استلام جزئي'
    );
  },

  async getPurchaseOrdersBySupplier(supplierId, statuses = null, limit = null) {
    await delay();
    let orders = getMockData('appPurchaseOrders', []).filter(
      o => o.purchase_orders_supplier_id === parseInt(supplierId)
    );
    
    if (statuses) {
      const statusArray = statuses.split(',').map(s => s.trim());
      orders = orders.filter(o => statusArray.includes(o.purchase_orders_status));
    }
    
    if (limit) {
      orders = orders.slice(0, limit);
    }
    
    return orders;
  },

  async getReturnableQuantities(purchaseOrderId) {
    await delay();
    console.log('Getting returnable quantities for PO:', purchaseOrderId);
    return { data: [] };
  },

  async getAvailableBatches(variantId, warehouseId, packagingTypeId = null) {
    await delay();
    let batches = getMockData('appInventory', []).filter(
      i => i.inventory_variant_id === parseInt(variantId) && 
           i.inventory_warehouse_id === parseInt(warehouseId)
    );
    
    if (packagingTypeId) {
      batches = batches.filter(i => i.inventory_packaging_type_id === parseInt(packagingTypeId));
    }
    
    return { data: batches };
  },

  async getPurchaseOrderItemReturnInfo(itemId) {
    await delay();
    console.log('Getting return info for item:', itemId);
    return { data: {} };
  },
};

// Mock API for Base Units
export const mockBaseUnitsApi = {
  _getArr() { const r = getMockData('appBaseUnits', { data: [] }); return Array.isArray(r) ? r : (r.data || []); },
  _save(arr) { setMockData('appBaseUnits', { data: arr }); },

  async getAllBaseUnits() {
    await delay();
    return this._getArr();
  },
  async addBaseUnit(name) {
    await delay();
    const units = this._getArr();
    units.push({ base_units_id: getNextId(units, 'base_units_id'), base_units_name: name, base_units_symbol: name.substring(0, 3), base_units_sort_order: units.length + 1 });
    this._save(units);
    return 'تم إضافة الوحدة بنجاح';
  },
  async updateBaseUnit(unitId, name) {
    await delay();
    const units = this._getArr();
    const i = units.findIndex(u => u.base_units_id === parseInt(unitId));
    if (i === -1) throw new Error(`Unit ${unitId} not found`);
    units[i] = { ...units[i], base_units_name: name };
    this._save(units);
    return 'تم تحديث الوحدة بنجاح';
  },
  async deleteBaseUnit(unitId) {
    await delay();
    const units = this._getArr();
    const filtered = units.filter(u => u.base_units_id !== parseInt(unitId));
    if (filtered.length === units.length) throw new Error(`Unit ${unitId} not found`);
    this._save(filtered);
    return 'تم حذف الوحدة بنجاح';
  },
};

// Mock API for Packaging Types
export const mockPackagingTypesApi = {
  _getArr() { const r = getMockData('appPackagingTypes', { data: [] }); return Array.isArray(r) ? r : (r.data || []); },
  _save(arr) { setMockData('appPackagingTypes', { data: arr }); },

  async getAllPackagingTypes() {
    await delay();
    return this._getArr();
  },
  async addPackagingType(data) {
    await delay();
    const types = this._getArr();
    types.push({ packaging_types_id: getNextId(types, 'packaging_types_id'), ...data, packaging_types_sort_order: types.length + 1 });
    this._save(types);
    return 'تم إضافة نوع التعبئة بنجاح';
  },
  async updatePackagingType(typeId, data) {
    await delay();
    const types = this._getArr();
    const i = types.findIndex(t => t.packaging_types_id === parseInt(typeId));
    if (i === -1) throw new Error(`Packaging type ${typeId} not found`);
    types[i] = { ...types[i], ...data };
    this._save(types);
    return 'تم تحديث نوع التعبئة بنجاح';
  },
  async deletePackagingType(typeId) {
    await delay();
    const types = this._getArr();
    const filtered = types.filter(t => t.packaging_types_id !== parseInt(typeId));
    if (filtered.length === types.length) throw new Error(`Packaging type ${typeId} not found`);
    this._save(filtered);
    return 'تم حذف نوع التعبئة بنجاح';
  },
};

// Mock API for Product Attributes
export const mockAttributesApi = {
  async getAllAttributes() {
    await delay();
    return getMockData('appProductAttributes', []);
  },
  async addAttribute(name, values) {
    await delay();
    const attrs = getMockData('appProductAttributes', []);
    let nextVid = attrs.reduce((m, a) => Math.max(m, ...((a.values || []).map(v => v.attribute_value_id || 0)), 0), 0) + 1;
    attrs.push({
      attribute_id: getNextId(attrs, 'attribute_id'),
      attribute_name: name,
      values: (Array.isArray(values) ? values : []).map(v => ({ attribute_value_id: nextVid++, attribute_value_value: typeof v === 'string' ? v : (v.value || v.attribute_value_value || '') })),
    });
    setMockData('appProductAttributes', attrs);
    return 'تم إضافة الخاصية بنجاح';
  },
  async updateAttribute(attributeId, name, values) {
    await delay();
    const attrs = getMockData('appProductAttributes', []);
    const i = attrs.findIndex(a => a.attribute_id === parseInt(attributeId));
    if (i === -1) throw new Error(`Attribute ${attributeId} not found`);
    let nextVid = attrs.reduce((m, a) => Math.max(m, ...((a.values || []).map(v => v.attribute_value_id || 0)), 0), 0) + 1;
    attrs[i] = {
      ...attrs[i],
      attribute_name: name,
      values: (Array.isArray(values) ? values : []).map(v => ({
        attribute_value_id: v.attribute_value_id || (nextVid++),
        attribute_value_value: typeof v === 'string' ? v : (v.value || v.attribute_value_value || ''),
      })),
    };
    setMockData('appProductAttributes', attrs);
    return 'تم تحديث الخاصية بنجاح';
  },
  async deleteAttribute(attributeId) {
    await delay();
    const attrs = getMockData('appProductAttributes', []);
    const filtered = attrs.filter(a => a.attribute_id !== parseInt(attributeId));
    if (filtered.length === attrs.length) throw new Error(`Attribute ${attributeId} not found`);
    setMockData('appProductAttributes', filtered);
    return 'تم حذف الخاصية بنجاح';
  },
};

// Mock API for other entities
export const mockOtherApis = {
  async getSuppliers() {
    await delay();
    const data = getMockData('appSuppliers', { data: [] });
    return Array.isArray(data) ? { data } : data;
  },

  async getClientIndustries() {
    await delay();
    return getMockData('appClientIndustries', []);
  },

  async getClientTypes() {
    await delay();
    return getMockData('appClientTypes', []);
  },

  async getClientAreaTags() {
    await delay();
    return getMockData('appClientAreaTags', []);
  },

  async getCountriesWithGovernorates() {
    await delay();
    return getMockData('appCountriesWithGovernorates', []);
  },

  async getBaseUnits() {
    await delay();
    const data = getMockData('appBaseUnits', { data: [] });
    return Array.isArray(data) ? { data } : data;
  },

  async getPackagingTypes() {
    await delay();
    const data = getMockData('appPackagingTypes', { data: [] });
    return Array.isArray(data) ? { data } : data;
  },

  async getProductAttributes() {
    await delay();
    return getMockData('appProductAttributes', []);
  },

  async getPaymentMethods() {
    await delay();
    return getMockData('appPaymentMethods', []);
  },

  async getSafes() {
    await delay();
    return getMockData('appSafes', []);
  },

  async getNotifications() {
    await delay();
    return getMockData('appNotifications', []);
  },

  async getSettings() {
    await delay();
    return getMockData('appSettings', []);
  },

  async getSettingsCategorized() {
    await delay();
    const settings = getMockData('appSettings', []);
    const categorized = {};
    settings.forEach(s => {
      if (!categorized[s.settings_category]) {
        categorized[s.settings_category] = [];
      }
      categorized[s.settings_category].push(s);
    });
    return categorized;
  },

  async getVisitPlans() {
    await delay();
    return getMockData('appVisitPlans', []);
  },

  async getVisits() {
    await delay();
    return getMockData('appVisits', []);
  },

  async getSalesReturns() {
    await delay();
    return getMockData('appSalesReturns', []);
  },

  async getPurchaseReturns() {
    await delay();
    return getMockData('appPurchaseReturns', []);
  },

  async getGoodsReceipts() {
    await delay();
    const data = getMockData('appGoodsReceipts', { data: [] });
    return Array.isArray(data) ? { data } : data;
  },
  
  async getDeliverableSalesOrders() {
    await delay();
    return getMockData('appDeliverableSalesOrders', []);
  },
};

// Export flag
export { USE_MOCK_DATA };

// Export all mock APIs
export default {
  users: mockUsersApi,
  categories: mockCategoriesApi,
  clients: mockClientsApi,
  products: mockProductsApi,
  warehouses: mockWarehousesApi,
  inventory: mockInventoryApi,
  salesOrders: mockSalesOrdersApi,
  purchaseOrders: mockPurchaseOrdersApi,
  other: mockOtherApis,
  baseUnits: mockBaseUnitsApi,
  packagingTypes: mockPackagingTypesApi,
  attributes: mockAttributesApi,
};
