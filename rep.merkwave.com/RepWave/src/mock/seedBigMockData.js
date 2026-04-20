export function seedBigMockData() {
  if (localStorage.getItem("bigMockSeeded")) return;

  // -------- Clients --------
  const clients = Array.from({ length: 40 }, (_, i) => ({
    id: i + 1,
    name: `Client ${i + 1}`,
    phone: `01000${1000 + i}`,
    city: ["Cairo", "Giza", "Alex"][i % 3],
    balance: Math.floor(Math.random() * 5000)
  }));

  // -------- Products --------
  const products = Array.from({ length: 150 }, (_, i) => ({
    id: i + 1,
    name: `Product ${i + 1}`,
    price: 20 + Math.floor(Math.random() * 200),
    sku: `SKU-${1000 + i}`,
    category: ["Chemicals", "Packaging", "Raw Material"][i % 3]
  }));

  // -------- Warehouses --------
  const warehouses = [
    { id: 1, name: "Main Warehouse" },
    { id: 2, name: "Branch Warehouse" }
  ];

  // -------- Inventory --------
  const inventory = products.map(p => ({
    productId: p.id,
    product: p.name,
    qty: Math.floor(Math.random() * 500)
  }));

  // -------- Sales Orders --------
  const salesOrders = Array.from({ length: 60 }, (_, i) => ({
    id: i + 1,
    client: clients[i % clients.length].name,
    total: Math.floor(Math.random() * 8000),
    status: ["pending", "delivered", "cancelled"][i % 3],
    date: new Date(Date.now() - i * 86400000).toLocaleDateString()
  }));

  // -------- Purchase Orders --------
  const purchaseOrders = Array.from({ length: 40 }, (_, i) => ({
    id: i + 1,
    supplier: `Supplier ${i + 1}`,
    total: Math.floor(Math.random() * 10000),
    status: ["received", "pending"][i % 2]
  }));

  // -------- Notifications --------
  const notifications = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    text: `Notification ${i + 1}`,
    seen: i % 2 === 0
  }));

  localStorage.setItem("appClients", JSON.stringify(clients));
  localStorage.setItem("appProducts", JSON.stringify({ data: products }));
  localStorage.setItem("appWarehouses", JSON.stringify({ data: warehouses }));
  localStorage.setItem("appInventory", JSON.stringify(inventory));
  localStorage.setItem("appSalesOrders", JSON.stringify(salesOrders));
  localStorage.setItem("appPurchaseOrders", JSON.stringify(purchaseOrders));
  localStorage.setItem("appNotifications", JSON.stringify(notifications));

  localStorage.setItem("bigMockSeeded", "true");
}
