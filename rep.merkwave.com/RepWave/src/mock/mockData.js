export function seedMockData() {
  if (localStorage.getItem("mockSeeded")) return;

  localStorage.setItem("appUsers", JSON.stringify([
    { id: 1, name: "Admin", role: "admin" },
    { id: 2, name: "Sales User", role: "user" }
  ]));

  localStorage.setItem("appCategories", JSON.stringify([
    { id: 1, name: "Chemicals" },
    { id: 2, name: "Packaging" }
  ]));

  localStorage.setItem("appClients", JSON.stringify([
    { id: 1, name: "Client A", phone: "0100000000" },
    { id: 2, name: "Client B", phone: "0111111111" }
  ]));

  localStorage.setItem("appProducts", JSON.stringify({
    data: [
      { id: 1, name: "Product One", price: 50 },
      { id: 2, name: "Product Two", price: 80 }
    ]
  }));

  localStorage.setItem("appWarehouses", JSON.stringify({
    data: [{ id: 1, name: "Main Warehouse" }]
  }));

  localStorage.setItem("appInventory", JSON.stringify([
    { id: 1, product: "Product One", qty: 100 },
    { id: 2, product: "Product Two", qty: 200 }
  ]));

  localStorage.setItem("appSalesOrders", JSON.stringify([]));
  localStorage.setItem("appPurchaseOrders", JSON.stringify([]));
  localStorage.setItem("appNotifications", JSON.stringify([]));

  localStorage.setItem("mockSeeded", "true");
}
