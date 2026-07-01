import { api } from '../utils/axiosInstance.js';
export const getAllProducts = (params) => api.get('/products', params);
export const getProductById = (id) => api.get(`/products/${id}`);
export const createProduct = (data) => api.post('/products', data);
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);
export const deleteProduct = (id) => api.delete(`/products/${id}`);

// PHP-compatible aliases
export const addProduct = createProduct;
export const getAppProducts = (params) => api.get('/products', params);
export const getInterestedProductClients = (productId) => api.get('/clients', { productId });

// ── Product Reports Aggregator ────────────────────────────────────────────────
// Fetches real data from existing endpoints and builds per-tab report shapes.

function getInvQty(item) {
  return Number(item?.inventory_quantity ?? item?.quantity ?? 0) || 0;
}

function getStockLevel(qty) {
  if (qty > 10) return 'In Stock';
  if (qty > 0) return 'Low Stock';
  return 'Out of Stock';
}

export async function getProductReports(tab) {
  const [products, inventory, suppliers, warehouses] = await Promise.all([
    api.get('/products', { page: 1, pageSize: 200 }),
    api.get('/inventory', { page: 1, pageSize: 200 }),
    api.get('/suppliers', { page: 1, pageSize: 100 }),
    api.get('/warehouses'),
  ]);

  const prods   = Array.isArray(products)   ? products   : [];
  const inv     = Array.isArray(inventory)  ? inventory  : [];
  const sups    = Array.isArray(suppliers)  ? suppliers  : [];
  const whs     = Array.isArray(warehouses) ? warehouses : [];

  const activeProds = prods.filter(p => p.products_is_active);

  // Build category name map from products themselves (fallback to id)
  const catNameMap = {};
  prods.forEach(p => {
    if (p.products_category_id && !catNameMap[p.products_category_id]) {
      catNameMap[p.products_category_id] = `فئة ${p.products_category_id}`;
    }
  });
  // Overwrite with known Arabic names for demo data
  Object.assign(catNameMap, { 1: 'مياه ومشروبات', 2: 'زيوت طهي', 3: 'ألبان وأجبان', 4: 'منظفات', 5: 'حلويات وبسكويت' });

  const prodNameMap = {};
  prods.forEach((p) => {
    prodNameMap[p.products_id] = p.products_name;
  });

  const whNameMap = {};
  whs.forEach((w) => {
    whNameMap[w.warehouse_id] = w.warehouse_name;
  });

  if (tab === 'overview') {
    const productsWithStock = new Set(inv.filter(i => getInvQty(i) > 0).map(i => i.products_id)).size;
    return {
      total_products: prods.length,
      active_products: activeProds.length,
      products_in_stock: productsWithStock,
      growth_rate: 0,
      active_percentage: prods.length ? Math.round((activeProds.length / prods.length) * 100) : 0,
      stock_percentage: prods.length ? Math.round((productsWithStock / prods.length) * 100) : 0,
      new_this_month: prods.length,
      new_last_month: 0,
      total_categories: new Set(prods.map(p => p.products_category_id)).size,
      total_brands: new Set(prods.map(p => p.products_brand).filter(Boolean)).size,
    };
  }

  if (tab === 'inventory') {
    const whMap = {};
    whs.forEach(w => { whMap[w.warehouse_id] = w.warehouse_name; });

    const whStats = {};
    inv.forEach(item => {
      const wid = item.warehouse_id;
      if (!whStats[wid]) {
        whStats[wid] = {
          warehouse_id: wid,
          warehouse_name: whMap[wid] || `مستودع ${wid}`,
          _uniqueProds: new Set(),
          total_quantity: 0,
          in_stock_count: 0,
          low_stock_count: 0,
          out_of_stock_count: 0,
        };
      }
      const qty = getInvQty(item);
      whStats[wid]._uniqueProds.add(item.products_id);
      whStats[wid].total_quantity += qty;
      if (qty > 10) whStats[wid].in_stock_count++;
      else if (qty > 0) whStats[wid].low_stock_count++;
      else whStats[wid].out_of_stock_count++;
    });

    const warehousesArr = Object.values(whStats).map(({ _uniqueProds, ...w }) => ({
      ...w,
      unique_products: _uniqueProds.size,
    }));

    return {
      warehouses: warehousesArr,
      status_summary: {
        'In Stock':      { count: inv.filter(i => getInvQty(i) > 10).length,                       quantity: inv.filter(i => getInvQty(i) > 10).reduce((s, i) => s + getInvQty(i), 0) },
        'Low Stock':     { count: inv.filter(i => { const q = getInvQty(i); return q > 0 && q <= 10; }).length,    quantity: inv.filter(i => { const q = getInvQty(i); return q > 0 && q <= 10; }).reduce((s, i) => s + getInvQty(i), 0) },
        'Out of Stock':  { count: inv.filter(i => getInvQty(i) === 0).length,                      quantity: 0 },
      },
      total_items: inv.length,
    };
  }

  if (tab === 'categories') {
    const catMap = {};
    prods.forEach(p => {
      const cid = p.products_category_id;
      if (!catMap[cid]) catMap[cid] = { category_id: cid, category_name: catNameMap[cid] || `فئة ${cid}`, _prods: [] };
      catMap[cid]._prods.push(p);
    });

    const productCatMap = {};
    prods.forEach(p => { productCatMap[p.products_id] = p.products_category_id; });

    const catInv = {};
    inv.forEach(i => {
      const cid = productCatMap[i.products_id];
      if (cid) catInv[cid] = (catInv[cid] || 0) + getInvQty(i);
    });

    const categories = Object.values(catMap).map(({ _prods, ...c }) => ({
      ...c,
      product_count: _prods.length,
      active_count: _prods.filter(p => p.products_is_active).length,
      total_inventory: catInv[c.category_id] || 0,
    }));

    return { total_categories: categories.length, categories };
  }

  if (tab === 'suppliers') {
    return {
      total_suppliers: sups.length,
      suppliers: sups.map(s => ({
        supplier_id: s.supplier_id,
        supplier_name: s.supplier_name,
        supplier_contact_person: s.supplier_contact_person,
        supplier_phone: s.supplier_phone,
        supplier_email: s.supplier_email,
        product_count: prods.length,
        active_products: activeProds.length,
        total_orders: 0,
        total_amount: s.supplier_balance || 0,
      })),
    };
  }

  if (tab === 'analytics') {
    const totalQty = inv.reduce((s, i) => s + getInvQty(i), 0);
    return {
      total_products: prods.length,
      status_analysis: {
        active: activeProds.length,
        inactive: prods.length - activeProds.length,
        active_percentage: prods.length ? Math.round((activeProds.length / prods.length) * 100) : 0,
        inactive_percentage: prods.length ? Math.round(((prods.length - activeProds.length) / prods.length) * 100) : 0,
      },
      inventory_analysis: {
        total_variants: inv.length,
        total_quantity: totalQty,
        avg_quantity_per_variant: inv.length ? Math.round(totalQty / inv.length) : 0,
      },
    };
  }

  if (tab === 'stock_levels') {
    const stockSummary = {
      'In Stock': inv.filter((i) => getInvQty(i) > 10).length,
      'Low Stock': inv.filter((i) => {
        const q = getInvQty(i);
        return q > 0 && q <= 10;
      }).length,
      'Out of Stock': inv.filter((i) => getInvQty(i) === 0).length,
    };

    const lowStockItems = inv
      .map((i) => {
        const qty = getInvQty(i);
        const inventoryStatus = getStockLevel(qty);
        return {
          products_name:
            i.product_name ||
            i.products_name ||
            prodNameMap[i.products_id] ||
            `منتج ${i.products_id}`,
          variant_name: i.variant_name || null,
          warehouse_name:
            i.warehouse_name ||
            whNameMap[i.warehouse_id] ||
            `مستودع ${i.warehouse_id}`,
          inventory_quantity: qty,
          inventory_status: inventoryStatus,
          inventory_last_movement_at:
            i.inventory_last_movement_at || i.updated_at || null,
        };
      })
      .filter(
        (item) =>
          item.inventory_status === 'Low Stock' ||
          item.inventory_status === 'Out of Stock',
      );

    return {
      stock_summary: stockSummary,
      low_stock_items: lowStockItems,
      total_low_stock: lowStockItems.length,
    };
  }

  if (tab === 'interested_products') {
    const prodsWithInterest = prods.map(p => ({
      products_id: p.products_id,
      product_name: p.products_name,
      products_category: catNameMap[p.products_category_id] || `فئة ${p.products_category_id}`,
      products_brand: p.products_brand,
      interest_count: 0,
      clients: [],
    }));
    return {
      summary: {
        unique_clients: 0,
        total_interests: 0,
        total_products: prods.length,
        top_product: prods[0]?.products_name || '',
      },
      products: prodsWithInterest,
      categories: Object.values(catNameMap),
    };
  }

  return {};
}
