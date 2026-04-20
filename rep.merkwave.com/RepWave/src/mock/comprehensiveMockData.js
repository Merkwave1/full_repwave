// Comprehensive mock data generator for the entire application
// This generates realistic data for all entities in the system

// Helper functions for generating realistic data
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max, decimals = 2) => parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
const randomChoice = (arr) => arr[randomInt(0, arr.length - 1)];
const randomDate = (start, end) => {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
};
const randomBoolean = () => Math.random() > 0.5;

// Generate UUID-like strings
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Arabic names and data
const firstNames = ['محمد', 'أحمد', 'علي', 'حسن', 'عمر', 'خالد', 'يوسف', 'عبدالله', 'إبراهim', 'مصطفى', 'محمود', 'سعيد', 'طارق', 'وليد', 'كريم', 'ياسر', 'رامي', 'هشام', 'فاروق', 'جمال'];
const lastNames = ['أحمد', 'محمد', 'علي', 'حسن', 'السيد', 'عبدالرحمن', 'إبراهيم', 'عثمان', 'المصري', 'الشريف', 'القاضي', 'النجار', 'الحداد', 'الطيب', 'السعيد', 'الكريم', 'الرحيم', 'العزيز', 'الحكيم', 'الصادق'];
const companyNames = ['شركة النور', 'المصرية للتجارة', 'الأمل التجارية', 'النجاح للمواد', 'الفجر للكيماويات', 'الرواد للتوريدات', 'القمة للصناعات', 'الأفق التجاري', 'الازدهار للمنتجات', 'التميز للتوزيع', 'الريادة التجارية', 'الابتكار للمواد', 'النهضة للكيماويات', 'التقدم للتوريدات', 'الإبداع التجاري'];
const cities = ['القاهرة', 'الجيزة', 'الإسكندرية', 'الشرقية', 'الدقهلية', 'البحيرة', 'المنوفية', 'القليوبية', 'الغربية', 'كفر الشيخ', 'دمياط', 'بورسعيد', 'الإسماعيلية', 'السويس', 'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'الأقصر', 'أسوان'];
const areas = ['المعادي', 'مدينة نصر', 'الهرم', 'فيصل', 'الدقي', 'المهندسين', 'العجوزة', 'الزمالك', 'وسط البلد', 'مصر الجديدة', 'النزهة', 'مدينتي', 'الرحاب', 'التجمع الخامس', 'الشروق', '6 أكتوبر', 'الشيخ زايد', 'العبور', 'بدر', 'القاهرة الجديدة'];
const streets = ['شارع الجمهورية', 'شارع النيل', 'طريق مصر اسكندرية', 'شارع الهرم', 'شارع فيصل', 'شارع جامعة الدول', 'شارع المعز', 'شارع محمد علي', 'شارع رمسيس', 'شارع الثورة', 'شارع السلام', 'شارع التحرير', 'شارع النصر', 'شارع العروبة', 'شارع الشهداء'];

// Product categories and types
const productCategories = ['كيماويات', 'مواد تعبئة', 'مواد خام', 'منتجات نهائية', 'أدوات', 'معدات', 'مستلزمات', 'قطع غيار', 'مواد استهلاكية'];
const baseUnits = ['كيلوجرام', 'لتر', 'متر', 'قطعة', 'طن', 'علبة', 'كرتونة', 'شيكارة', 'برميل', 'جركن'];
const packagingTypes = ['كيس 25 كجم', 'علبة 1 كجم', 'برميل 200 لتر', 'جركن 25 لتر', 'كرتونة 10 قطعة', 'شيكارة 50 كجم', 'علبة 500 جرام', 'زجاجة 1 لتر'];

// Status options
const salesOrderStatuses = ['Pending', 'Approved', 'Invoiced', 'Cancelled', 'Pending'];
const deliveryStatuses   = ['Not_Delivered', 'Partially_Delivered', 'Delivered', 'Not_Delivered', 'Not_Delivered'];
const purchaseOrderStatuses = ['Pending', 'Received', 'Partial Receipt', 'Cancelled'];
const paymentMethods = ['نقدي', 'شيك', 'تحويل بنكي', 'بطاقة ائتمان', 'آجل'];
const inventoryStatuses = ['متاح', 'محجوز', 'تالف', 'منتهي'];
const userRoles = ['admin', 'sales_manager', 'sales_representative', 'warehouse_manager', 'accountant'];

// Generate mock data
export function generateComprehensiveMockData() {
  const data = {};

  // 1. Users
  data.users = Array.from({ length: 25 }, (_, i) => ({
    users_id: i + 1,
    users_uuid: generateUUID(),
    users_name: `${randomChoice(firstNames)} ${randomChoice(lastNames)}`,
    users_username: `user${i + 1}`,
    users_email: `user${i + 1}@repwave.com`,
    users_phone: `010${randomInt(10000000, 99999999)}`,
    users_role: i === 0 ? 'admin' : randomChoice(userRoles),
    users_status: randomChoice(['active', 'inactive']),
    users_created_at: randomDate(new Date(2023, 0, 1), new Date()),
    users_profile_image: null,
    users_address: `${randomChoice(streets)}، ${randomChoice(areas)}، ${randomChoice(cities)}`,
    users_national_id: `${randomInt(20000000000000, 29999999999999)}`,
    users_hire_date: randomDate(new Date(2020, 0, 1), new Date()),
    users_salary: randomFloat(5000, 15000, 2),
    users_commission_rate: randomFloat(0, 10, 2),
  }));

  // 2. Categories
  data.categories = productCategories.map((name, i) => ({
    categories_id: i + 1,
    categories_name: name,
    categories_description: `وصف ${name}`,
    categories_sort_order: i + 1,
    categories_created_at: randomDate(new Date(2023, 0, 1), new Date()),
  }));

  // 3. Client Industries
  data.clientIndustries = [
    'صناعة المواد الغذائية',
    'صناعة الأدوية',
    'صناعة الكيماويات',
    'صناعة البلاستيك',
    'صناعة المنظفات',
    'صناعة النسيج',
    'صناعة الورق',
    'صناعة الأسمدة',
    'تجارة الجملة',
    'تجارة التجزئة',
  ].map((name, i) => ({
    client_industries_id: i + 1,
    client_industries_name: name,
    client_industries_sort_order: i + 1,
  }));

  // 4. Client Types
  data.clientTypes = [
    'عميل جملة',
    'عميل تجزئة',
    'موزع',
    'وكيل',
    'مصنع',
    'مؤسسة حكومية',
  ].map((name, i) => ({
    client_types_id: i + 1,
    client_types_name: name,
    client_types_sort_order: i + 1,
  }));

  // 5. Client Area Tags
  data.clientAreaTags = [
    'القاهرة الكبرى',
    'الدلتا',
    'الصعيد',
    'الإسكندرية والساحل الشمالي',
    'قناة السويس',
    'البحر الأحمر',
  ].map((name, i) => ({
    client_area_tag_id: i + 1,
    client_area_tag_name: name,
    client_area_tag_sort_order: i + 1,
  }));

  // 6. Countries and Governorates
  data.countries = [
    {
      countries_id: 1,
      countries_name: 'مصر',
      countries_code: 'EG',
      governorates: cities.map((city, i) => ({
        governorates_id: i + 1,
        governorates_name: city,
        countries_id: 1,
      })),
    },
  ];

  // 7. Clients
  data.clients = Array.from({ length: 80 }, (_, i) => ({
    clients_id: i + 1,
    clients_company_name: i % 3 === 0 ? randomChoice(companyNames) : `${randomChoice(firstNames)} ${randomChoice(lastNames)}`,
    clients_contact_name: `${randomChoice(firstNames)} ${randomChoice(lastNames)}`,
    clients_contact_phone_1: `010${randomInt(10000000, 99999999)}`,
    clients_contact_phone_2: i % 3 === 0 ? `011${randomInt(10000000, 99999999)}` : '',
    clients_email: `client${i + 1}@example.com`,
    clients_address: `${randomChoice(streets)}، ${randomChoice(areas)}`,
    clients_city: randomChoice(cities),
    clients_governorate_id: randomInt(1, cities.length),
    clients_country_id: 1,
    clients_status: randomChoice(['active', 'pending', 'inactive']),
    clients_type: randomChoice(['store', 'importer', 'distributor']),
    clients_industry_id: randomInt(1, 10),
    clients_area_tag_id: randomInt(1, 6),
    clients_credit_limit: randomFloat(10000, 100000, 2),
    clients_credit_balance: randomFloat(-50000, 50000, 2),
    clients_vat_number: `${randomInt(100000000, 999999999)}`,
    clients_commercial_registration: `${randomInt(10000, 99999)}`,
    clients_description: i % 5 === 0 ? `ملاحظات عن العميل ${i + 1}` : '',
    clients_source: randomChoice(['مباشر', 'إحالة', 'إنترنت', 'معرض', '']),
    clients_created_at: randomDate(new Date(2022, 0, 1), new Date()),
    clients_rep_user_id: randomInt(1, 25),
    clients_latitude: randomFloat(29.0, 31.5, 6),
    clients_longitude: randomFloat(30.0, 32.5, 6),
    clients_odoo_partner_id: null,
  }));

  // 8. Suppliers
  data.suppliers = Array.from({ length: 30 }, (_, i) => ({
    supplier_id: i + 1,
    supplier_name: `${randomChoice(companyNames)} للتوريد`,
    supplier_contact_person: `${randomChoice(firstNames)} ${randomChoice(lastNames)}`,
    supplier_phone: `010${randomInt(10000000, 99999999)}`,
    supplier_email: `supplier${i + 1}@example.com`,
    supplier_address: `${randomChoice(streets)}، ${randomChoice(areas)}، ${randomChoice(cities)}`,
    supplier_tax_number: `${randomInt(100000000, 999999999)}`,
    supplier_notes: i % 4 === 0 ? `ملاحظات عن المورد ${i + 1}` : '',
    supplier_status: randomChoice(['active', 'inactive']),
    supplier_balance: (Math.random() * 100000 - 20000).toFixed(2),
    supplier_created_at: randomDate(new Date(2022, 0, 1), new Date()),
  }));

  // 9. Base Units
  data.baseUnits = baseUnits.map((name, i) => ({
    base_units_id: i + 1,
    base_units_name: name,
    base_units_symbol: name.substring(0, 3),
    base_units_sort_order: i + 1,
  }));

  // 10. Packaging Types
  data.packagingTypes = packagingTypes.map((name, i) => ({
    packaging_types_id: i + 1,
    packaging_types_name: name,
    packaging_types_description: `وصف نوع التعبئة: ${name}`,
    packaging_types_compatible_base_unit_id: randomInt(1, baseUnits.length),
    packaging_types_default_conversion_factor: randomChoice([1, 5, 10, 25, 50, 100, 200]),
    packaging_types_sort_order: i + 1,
  }));

  // 11. Product Attributes
  let attrValueId = 1;
  data.productAttributes = [
    { name: 'اللون', values: ['أبيض', 'أسود', 'أحمر', 'أزرق', 'أخضر', 'أصفر'] },
    { name: 'الحجم', values: ['صغير', 'متوسط', 'كبير', 'كبير جداً'] },
    { name: 'النوع', values: ['نوع أ', 'نوع ب', 'نوع ج'] },
    { name: 'التركيز', values: ['10%', '20%', '30%', '50%', '100%'] },
  ].map((attr, i) => ({
    attribute_id: i + 1,
    attribute_name: attr.name,
    values: attr.values.map(v => ({ attribute_value_id: attrValueId++, attribute_value_value: v })),
  }));

  // 12. Products with Variants
  const products = [];
  const productVariants = [];
  let variantId = 1;

  for (let i = 0; i < 200; i++) {
    const productId = i + 1;
    const categoryId = randomInt(1, data.categories.length);
    const basePrice = randomFloat(10, 5000, 2);
    
    const product = {
      products_id: productId,
      products_name: `منتج ${productId}`,
      products_sku: `SKU-${1000 + productId}`,
      products_barcode: `${randomInt(1000000000000, 9999999999999)}`,
      products_category_id: categoryId,
      products_base_unit_id: randomInt(1, data.baseUnits.length),
      products_description: `وصف تفصيلي للمنتج ${productId}`,
      products_notes: i % 5 === 0 ? `ملاحظات المنتج ${productId}` : '',
      products_status: randomChoice(['active', 'inactive']),
      products_is_active: randomChoice([0, 1]),
      products_tax_rate: randomChoice([0, 5, 10, 14]),
      products_created_at: randomDate(new Date(2022, 0, 1), new Date()),
      products_supplier_id: randomInt(1, 30),
    };
    products.push(product);

    // Create 1-3 variants per product
    const variantCount = randomInt(1, 3);
    for (let v = 0; v < variantCount; v++) {
      productVariants.push({
        product_variants_id: variantId++,
        product_variants_product_id: productId,
        product_variants_sku: `${product.products_sku}-V${v + 1}`,
        product_variants_barcode: `${randomInt(1000000000000, 9999999999999)}`,
        product_variants_name: variantCount > 1 ? `${product.products_name} - نوع ${v + 1}` : product.products_name,
        product_variants_purchase_price: basePrice * randomFloat(0.5, 0.8, 2),
        product_variants_sale_price: basePrice * randomFloat(1, 1.5, 2),
        product_variants_min_sale_price: basePrice * randomFloat(0.8, 1, 2),
        product_variants_status: 'active',
        product_variants_attributes: v > 0 ? JSON.stringify({ color: randomChoice(['أبيض', 'أسود', 'أحمر']) }) : '{}',
      });
    }
  }
  data.products = products;
  data.productVariants = productVariants;

  // 13. Warehouses (last 3 are Van/representative-car warehouses)
  data.warehouses = Array.from({ length: 8 }, (_, i) => ({
    warehouse_id: i + 1,
    warehouse_name: i === 0 ? 'المخزن الرئيسي' : i < 5 ? `مخزن ${randomChoice(cities)}` : `سيارة المندوب ${i - 4}`,
    warehouse_code: `WH-${1000 + i}`,
    warehouse_type: i < 5 ? 'Main' : 'Van',
    warehouse_address: `${randomChoice(streets)}، ${randomChoice(areas)}، ${randomChoice(cities)}`,
    warehouse_phone: `010${randomInt(10000000, 99999999)}`,
    warehouse_manager_id: randomInt(1, 25),
    warehouse_capacity: randomFloat(1000, 10000, 2),
    warehouse_status: 'active',
    warehouse_created_at: randomDate(new Date(2022, 0, 1), new Date()),
  }));

  // 14. Inventory
  const inventory = [];
  let inventoryId = 1;
  productVariants.forEach(variant => {
    const warehouseCount = randomInt(1, 4);
    const selectedWarehouses = [];
    for (let i = 0; i < warehouseCount; i++) {
      let whId = randomInt(1, data.warehouses.length);
      while (selectedWarehouses.includes(whId)) {
        whId = randomInt(1, data.warehouses.length);
      }
      selectedWarehouses.push(whId);

      // Create 1-2 inventory entries per warehouse (different batches/packaging)
      const batchCount = randomInt(1, 2);
      for (let b = 0; b < batchCount; b++) {
        inventory.push({
          inventory_id: inventoryId++,
          inventory_variant_id: variant.product_variants_id,
          inventory_warehouse_id: whId,
          inventory_packaging_type_id: randomInt(1, data.packagingTypes.length),
          inventory_quantity: randomFloat(0, 500, 2),
          inventory_production_date: randomDate(new Date(2023, 0, 1), new Date()),
          inventory_expiry_date: randomDate(new Date(), new Date(2026, 11, 31)),
          inventory_status: randomChoice(inventoryStatuses),
          inventory_batch_number: `BATCH-${randomInt(1000, 9999)}`,
        });
      }
    }
  });
  data.inventory = inventory;

  // 15. Sales Orders
  const salesOrders = [];
  const salesOrderItems = [];
  let salesOrderId = 1;
  let salesOrderItemId = 1;

  for (let i = 0; i < 150; i++) {
    const clientId = randomInt(1, data.clients.length);
    const warehouseId = randomInt(1, data.warehouses.length);
    const representativeId = randomInt(1, 25);
    const orderDate = randomDate(new Date(2023, 0, 1), new Date());
    const status = randomChoice(salesOrderStatuses);
    const deliveryStatus = randomChoice(deliveryStatuses);
    
    const order = {
      sales_orders_id: salesOrderId,
      sales_orders_order_number: `SO-${2024}${String(salesOrderId).padStart(5, '0')}`,
      sales_orders_client_id: clientId,
      sales_orders_warehouse_id: warehouseId,
      sales_orders_representative_id: representativeId,
      sales_orders_order_date: orderDate,
      sales_orders_expected_delivery_date: randomDate(new Date(orderDate), new Date()),
      sales_orders_status: status,
      sales_orders_delivery_status: deliveryStatus,
      sales_orders_subtotal: 0,
      sales_orders_discount_amount: randomFloat(0, 500, 2),
      sales_orders_tax_amount: 0,
      sales_orders_total_amount: 0,
      sales_orders_notes: i % 6 === 0 ? `ملاحظات طلب ${salesOrderId}` : '',
      sales_orders_created_at: orderDate,
    };

    // Add 2-8 items to this order
    const itemCount = randomInt(2, 8);
    let subtotal = 0;
    for (let j = 0; j < itemCount; j++) {
      const variant = randomChoice(productVariants);
      const quantity = randomInt(1, 50);
      const unitPrice = variant.product_variants_sale_price;
      const discount = randomFloat(0, unitPrice * 0.1, 2);
      const lineTotal = (unitPrice - discount) * quantity;
      
      salesOrderItems.push({
        sales_order_items_id: salesOrderItemId++,
        sales_order_items_sales_order_id: salesOrderId,
        sales_order_items_variant_id: variant.product_variants_id,
        sales_order_items_packaging_type_id: randomInt(1, data.packagingTypes.length),
        sales_order_items_quantity: quantity,
        sales_order_items_unit_price: unitPrice,
        sales_order_items_discount: discount,
        sales_order_items_tax_rate: randomChoice([0, 14]),
        sales_order_items_total: lineTotal,
      });
      subtotal += lineTotal;
    }

    const taxAmount = subtotal * 0.14;
    order.sales_orders_subtotal = subtotal;
    order.sales_orders_tax_amount = taxAmount;
    order.sales_orders_total_amount = subtotal + taxAmount - order.sales_orders_discount_amount;
    
    salesOrders.push(order);
    salesOrderId++;
  }
  data.salesOrders = salesOrders;
  data.salesOrderItems = salesOrderItems;

  // 16. Purchase Orders
  const purchaseOrders = [];
  const purchaseOrderItems = [];
  let purchaseOrderId = 1;
  let purchaseOrderItemId = 1;

  for (let i = 0; i < 100; i++) {
    const supplierId = randomInt(1, data.suppliers.length);
    const warehouseId = randomInt(1, data.warehouses.length);
    const orderDate = randomDate(new Date(2023, 0, 1), new Date());
    const status = randomChoice(purchaseOrderStatuses);
    
    const order = {
      purchase_orders_id: purchaseOrderId,
      purchase_orders_order_number: `PO-${2024}${String(purchaseOrderId).padStart(5, '0')}`,
      purchase_orders_supplier_id: supplierId,
      purchase_orders_warehouse_id: warehouseId,
      purchase_orders_order_date: orderDate,
      purchase_orders_expected_delivery_date: randomDate(new Date(orderDate), new Date()),
      purchase_orders_status: status,
      purchase_orders_subtotal: 0,
      purchase_orders_order_discount: randomFloat(0, 1000, 2),
      purchase_orders_tax_amount: 0,
      purchase_orders_total_amount: 0,
      purchase_orders_notes: i % 6 === 0 ? `ملاحظات أمر شراء ${purchaseOrderId}` : '',
      purchase_orders_created_at: orderDate,
    };

    // Add 2-10 items to this order
    const itemCount = randomInt(2, 10);
    let subtotal = 0;
    for (let j = 0; j < itemCount; j++) {
      const variant = randomChoice(productVariants);
      const quantity = randomInt(10, 200);
      const unitPrice = variant.product_variants_purchase_price;
      const discount = randomFloat(0, unitPrice * 0.05, 2);
      const lineTotal = (unitPrice - discount) * quantity;
      
      const poiTaxRate = randomChoice([0, 14]);
      purchaseOrderItems.push({
        purchase_order_items_id: purchaseOrderItemId++,
        purchase_order_items_purchase_order_id: purchaseOrderId,
        purchase_order_items_variant_id: variant.product_variants_id,
        purchase_order_items_packaging_type_id: randomInt(1, data.packagingTypes.length),
        purchase_order_items_quantity: quantity,
        purchase_order_items_quantity_ordered: quantity,   // alias for detail modal
        purchase_order_items_unit_price: unitPrice,
        purchase_order_items_unit_cost: unitPrice,         // alias for detail modal
        purchase_order_items_discount: discount,
        purchase_order_items_discount_amount: discount,    // alias for detail modal
        purchase_order_items_tax_rate: poiTaxRate,
        purchase_order_items_has_tax: poiTaxRate > 0 ? 1 : 0,
        purchase_order_items_total: lineTotal,
        purchase_order_items_total_cost: lineTotal,        // alias for detail modal
      });
      subtotal += lineTotal;
    }

    const taxAmount = subtotal * 0.14;
    order.purchase_orders_subtotal = subtotal;
    order.purchase_orders_tax_amount = taxAmount;
    order.purchase_orders_total_amount = subtotal + taxAmount - order.purchase_orders_order_discount;
    
    purchaseOrders.push(order);
    purchaseOrderId++;
  }
  data.purchaseOrders = purchaseOrders;
  data.purchaseOrderItems = purchaseOrderItems;

  // 17. Payment Methods Data
  data.paymentMethods = paymentMethods.map((name, i) => ({
    payment_methods_id: i + 1,
    payment_methods_name: name,
    payment_methods_requires_reference: i > 0, // All except cash require reference
    payment_methods_status: 'active',
  }));

  // 18. Safes
  const repUsers = data.users.filter(u => u.users_role === 'sales_rep' || u.users_role === 'representative').slice(0, 4);
  const pmCash  = data.paymentMethods.find(pm => pm.payment_methods_name === 'كاش') || data.paymentMethods[0];
  const pmBank  = data.paymentMethods.find(pm => pm.payment_methods_name === 'تحويل بنكي') || data.paymentMethods[1] || data.paymentMethods[0];
  const pmVodaf = data.paymentMethods.find(pm => pm.payment_methods_name === 'فودافون كاش') || data.paymentMethods[2] || data.paymentMethods[0];
  data.safes = [
    { safes_id: 1, safes_name: 'الخزينة الرئيسية', safes_type: 'company', safes_is_active: 1, safes_balance: randomFloat(80000, 200000, 2), safes_currency: 'EGP', safes_status: 'active', safes_description: 'الخزينة الرئيسية للشركة', payment_method_id: pmCash?.payment_methods_id || 1, payment_method_name: pmCash?.payment_methods_name || 'كاش', payment_method_type: 'cash', pending_transactions_count: randomInt(0, 5) },
    { safes_id: 2, safes_name: 'خزينة الفرع', safes_type: 'company', safes_is_active: 1, safes_balance: randomFloat(20000, 80000, 2), safes_currency: 'EGP', safes_status: 'active', safes_description: 'خزينة الفرع الرئيسي', payment_method_id: pmBank?.payment_methods_id || 2, payment_method_name: pmBank?.payment_methods_name || 'تحويل بنكي', payment_method_type: 'bank_transfer', pending_transactions_count: randomInt(0, 3) },
    { safes_id: 3, safes_name: 'خزينة البنك', safes_type: 'company', safes_is_active: 1, safes_balance: randomFloat(150000, 500000, 2), safes_currency: 'EGP', safes_status: 'active', safes_description: 'حساب البنك التجاري', payment_method_id: pmBank?.payment_methods_id || 2, payment_method_name: pmBank?.payment_methods_name || 'تحويل بنكي', payment_method_type: 'bank_transfer', pending_transactions_count: randomInt(0, 2) },
    { safes_id: 4, safes_name: `خزينة ${repUsers[0]?.users_name || 'مندوب أحمد'}`, safes_type: 'rep', safes_is_active: 1, safes_balance: randomFloat(5000, 30000, 2), safes_currency: 'EGP', safes_status: 'active', safes_description: 'خزينة مندوب المبيعات', rep_user_id: repUsers[0]?.users_id || 2, safes_rep_user_id: repUsers[0]?.users_id || 2, rep_name: repUsers[0]?.users_name || 'أحمد محمد', payment_method_id: pmCash?.payment_methods_id || 1, payment_method_name: pmCash?.payment_methods_name || 'كاش', payment_method_type: 'cash', pending_transactions_count: randomInt(0, 8) },
    { safes_id: 5, safes_name: `خزينة ${repUsers[1]?.users_name || 'مندوب محمد'}`, safes_type: 'rep', safes_is_active: 1, safes_balance: randomFloat(3000, 20000, 2), safes_currency: 'EGP', safes_status: 'active', safes_description: 'خزينة مندوب المبيعات', rep_user_id: repUsers[1]?.users_id || 3, safes_rep_user_id: repUsers[1]?.users_id || 3, rep_name: repUsers[1]?.users_name || 'محمد علي', payment_method_id: pmVodaf?.payment_methods_id || 3, payment_method_name: pmVodaf?.payment_methods_name || 'فودافون كاش', payment_method_type: 'vodafone_cash', pending_transactions_count: randomInt(0, 6) },
    { safes_id: 6, safes_name: 'خزينة أمين المخزن', safes_type: 'store_keeper', safes_is_active: 1, safes_balance: randomFloat(2000, 15000, 2), safes_currency: 'EGP', safes_status: 'active', safes_description: 'خزينة أمين المخزن الرئيسي', payment_method_id: pmCash?.payment_methods_id || 1, payment_method_name: pmCash?.payment_methods_name || 'كاش', payment_method_type: 'cash', pending_transactions_count: randomInt(0, 3) },
    { safes_id: 7, safes_name: 'خزينة فودافون', safes_type: 'company', safes_is_active: 0, safes_balance: randomFloat(1000, 8000, 2), safes_currency: 'EGP', safes_status: 'inactive', safes_description: 'خزينة محفظة فودافون كاش', payment_method_id: pmVodaf?.payment_methods_id || 3, payment_method_name: pmVodaf?.payment_methods_name || 'فودافون كاش', payment_method_type: 'vodafone_cash', pending_transactions_count: 0 },
  ];

  // 18b. Safe Transactions
  const txnTypes = ['deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'expense', 'supplier_payment', 'sale', 'receipt'];
  const txnDescriptions = {
    deposit: ['إيداع نقدي', 'إيداع من العميل', 'إيداع رصيد', 'تحصيل مبيعات'],
    withdrawal: ['سحب نقدي', 'صرف مصروفات', 'سحب للإدارة'],
    transfer_in: ['تحويل وارد من خزينة رئيسية', 'استلام تحويل'],
    transfer_out: ['تحويل صادر', 'تحويل لخزينة أخرى'],
    expense: ['مصروفات إدارية', 'مصروفات تشغيلية', 'شراء مستلزمات'],
    supplier_payment: ['دفعة للمورد', 'سداد فاتورة مورد'],
    sale: ['إيرادات مبيعات', 'تحصيل أوردر مبيعات'],
    receipt: ['إيصال دفعة عميل', 'استلام دفعة'],
  };
  const txnStatuses = ['approved', 'approved', 'approved', 'pending', 'approved', 'approved'];
  const safeTransactions = [];
  let txnId = 1;
  const txnBase = new Date('2025-09-01');
  data.safes.forEach(safe => {
    const count = safe.safes_type === 'company' ? 30 : safe.safes_type === 'rep' ? 22 : 15;
    for (let i = 0; i < count; i++) {
      const type = randomChoice(txnTypes);
      const date = new Date(txnBase);
      date.setDate(date.getDate() + randomInt(0, 170));
      const user = randomChoice(data.users);
      const amount = randomFloat(500, 25000, 2);
      const status = randomChoice(txnStatuses);
      safeTransactions.push({
        safe_transactions_id: txnId++,
        safe_transactions_safe_id: safe.safes_id,
        safe_transactions_type: type,
        safe_transactions_amount: amount,
        safe_transactions_date: date.toISOString().slice(0, 19).replace('T', ' '),
        safe_transactions_description: randomChoice(txnDescriptions[type] || ['معاملة']),
        safe_transactions_reference: `TXN-${String(txnId).padStart(5, '0')}`,
        safe_transactions_user_id: user.users_id,
        user_name: user.users_name,
        safe_transactions_status: status,
        safe_name: safe.safes_name,
        payment_method_id: safe.payment_method_id,
        payment_method_name: safe.payment_method_name,
      });
    }
  });
  data.safeTransactions = safeTransactions;

  // 18c. Safe Transfers
  const safeTransferStatuses = ['approved', 'approved', 'pending', 'approved', 'approved', 'rejected', 'approved'];
  const safeTransfers = [];
  let tfrId = 1;
  const allActiveSafes = data.safes.filter(s => s.safes_is_active === 1);
  for (let i = 0; i < 60; i++) {
    const srcSafe  = randomChoice(allActiveSafes);
    const dstCandidates = allActiveSafes.filter(s => s.safes_id !== srcSafe.safes_id);
    const dstSafe  = randomChoice(dstCandidates);
    const date     = new Date(txnBase);
    date.setDate(date.getDate() + randomInt(0, 170));
    const user     = randomChoice(data.users);
    const amount   = randomFloat(1000, 30000, 2);
    const outStatus = randomChoice(safeTransferStatuses);
    const inStatus  = outStatus === 'rejected' ? 'rejected' : outStatus;
    const approver  = outStatus === 'approved' ? randomChoice(data.users) : null;
    const approvedDate = outStatus === 'approved' ? date.toISOString().slice(0, 19).replace('T', ' ') : null;
    const ref = `TRF-${String(tfrId).padStart(5, '0')}`;
    const dateStr = date.toISOString().slice(0, 19).replace('T', ' ');
    safeTransfers.push({
      safe_transactions_id: txnId,
      transfer_out_id: txnId++,
      transfer_in_id: txnId++,
      affected_safe_id:   srcSafe.safes_id,
      affected_safe_name: srcSafe.safes_name,
      affected_safe_type: srcSafe.safes_type,
      safe_transactions_counterpart_safe_id: dstSafe.safes_id,
      counterpart_safe_name: dstSafe.safes_name,
      counterpart_safe_type: dstSafe.safes_type,
      safe_transactions_amount: amount,
      safe_transactions_reference: ref,
      safe_transactions_date: dateStr,
      safe_transactions_user_id: user.users_id,
      user_name: user.users_name,
      safe_transactions_status: outStatus,
      transfer_out_status: outStatus,
      transfer_in_status: inStatus,
      transfer_out_approved_by_name: approver?.users_name || null,
      transfer_in_approved_by_name: approver?.users_name || null,
      transfer_out_approved_date: approvedDate,
      transfer_in_approved_date: approvedDate,
      safe_transactions_notes: `تحويل من ${srcSafe.safes_name} إلى ${dstSafe.safes_name}`,
      transfer_id: tfrId,
    });
    tfrId++;
  }
  data.safeTransfers = safeTransfers;

  // 19. Client Payments
  const clientPayments = [];
  for (let i = 0; i < 200; i++) {
    clientPayments.push({
      client_payments_id: i + 1,
      client_payments_client_id: randomInt(1, data.clients.length),
      client_payments_amount: randomFloat(500, 50000, 2),
      client_payments_payment_date: randomDate(new Date(2023, 0, 1), new Date()),
      client_payments_payment_method_id: randomInt(1, data.paymentMethods.length),
      client_payments_reference_number: i % 2 === 0 ? `REF-${randomInt(10000, 99999)}` : null,
      client_payments_safe_id: randomInt(1, 3),
      client_payments_notes: i % 7 === 0 ? `ملاحظات دفعة ${i + 1}` : '',
      client_payments_created_by: randomInt(1, 25),
      client_payments_created_at: randomDate(new Date(2023, 0, 1), new Date()),
    });
  }
  data.clientPayments = clientPayments;

  // 20. Supplier Payments
  const supplierPayments = [];
  for (let i = 0; i < 150; i++) {
    const spSupplierId = randomInt(1, data.suppliers.length);
    const spSupplier   = data.suppliers.find(s => s.supplier_id === spSupplierId);
    const spSafeId     = randomInt(1, 3);
    const spSafe       = data.safes.find(s => s.safes_id === spSafeId);
    const spMethodId   = randomInt(1, data.paymentMethods.length);
    const spMethod     = data.paymentMethods.find(m => m.payment_methods_id === spMethodId);
    const spDate       = randomDate(new Date(2023, 0, 1), new Date());
    supplierPayments.push({
      supplier_payments_id: i + 1,
      supplier_payments_supplier_id: spSupplierId,
      supplier_name: spSupplier ? spSupplier.supplier_name : `مورد #${spSupplierId}`,
      supplier_payments_amount: randomFloat(1000, 100000, 2),
      supplier_payments_payment_date: spDate,
      supplier_payments_date: spDate,           // alias used by SupplierPaymentsTab
      supplier_payments_method_id: spMethodId,
      supplier_payments_payment_method_id: spMethodId,
      payment_method_name: spMethod ? spMethod.payment_methods_name : '',
      supplier_payments_reference_number: i % 2 === 0 ? `SREF-${randomInt(10000, 99999)}` : null,
      supplier_payments_safe_id: spSafeId,
      safe_name: spSafe ? spSafe.safes_name : `خزينة #${spSafeId}`,
      supplier_payments_notes: i % 6 === 0 ? `ملاحظات دفعة ${i + 1}` : '',
      supplier_payments_status: randomChoice(['مؤكد', 'معلق', 'ملغي']),
      supplier_payments_type: randomChoice(['دفعة', 'دفعة جزئية']),
      supplier_payments_created_by: randomInt(1, 25),
      supplier_payments_created_at: randomDate(new Date(2023, 0, 1), new Date()),
    });
  }
  data.supplierPayments = supplierPayments;

  // 21. Notifications
  const notifications = [];
  const notificationTypes = ['معلومة', 'تحذير', 'خطأ', 'نجاح'];
  const notificationMessages = [
    'تم إضافة طلب جديد',
    'تم تحديث حالة الطلب',
    'مخزون منخفض للمنتج',
    'تم استلام بضاعة جديدة',
    'تم إلغاء طلب',
    'دفعة جديدة من العميل',
    'انتهاء صلاحية منتج قريباً',
    'تم تسليم طلب',
  ];

  for (let i = 0; i < 50; i++) {
    notifications.push({
      notifications_id: i + 1,
      notifications_user_id: randomInt(1, 25),
      notifications_type: randomChoice(notificationTypes),
      notifications_message: randomChoice(notificationMessages),
      notifications_is_read: randomBoolean(),
      notifications_created_at: randomDate(new Date(2024, 0, 1), new Date()),
      notifications_link: i % 3 === 0 ? `/orders/${randomInt(1, 100)}` : null,
    });
  }
  data.notifications = notifications;

  // 22. Settings
  data.settings = [
    // ── Company Tab ──────────────────────────────────────────────────────────
    { settings_id: 1,  settings_key: 'company_name',               settings_value: 'شركة RepWave للتوزيع', settings_category: 'company', settings_type: 'string',   settings_description: 'الاسم التجاري الكامل المعروض في الفواتير' },
    { settings_id: 2,  settings_key: 'company_description',        settings_value: 'شركة متخصصة في توزيع المنتجات الغذائية والاستهلاكية على مستوى الجمهورية', settings_category: 'company', settings_type: 'string',   settings_description: 'وصف مختصر عن نشاط الشركة' },
    { settings_id: 3,  settings_key: 'company_address',            settings_value: 'القاهرة، مصر - مدينة نصر، 8 ش الثورة', settings_category: 'company', settings_type: 'string',   settings_description: 'العنوان البريدي الرئيسي' },
    { settings_id: 4,  settings_key: 'company_phone',              settings_value: '01000000000', settings_category: 'company', settings_type: 'string',   settings_description: 'رقم الهاتف الرئيسي' },
    { settings_id: 5,  settings_key: 'company_email',              settings_value: 'info@repwave.com', settings_category: 'company', settings_type: 'string',   settings_description: 'البريد الإلكتروني الرسمي' },
    { settings_id: 6,  settings_key: 'company_website',            settings_value: 'https://www.repwave.com', settings_category: 'company', settings_type: 'string',   settings_description: 'رابط الموقع الإلكتروني' },
    { settings_id: 7,  settings_key: 'company_vat_number',         settings_value: '300000000000003', settings_category: 'company', settings_type: 'string',   settings_description: 'رقم ضريبة القيمة المضافة' },
    { settings_id: 8,  settings_key: 'company_commercial_register',settings_value: '123456789', settings_category: 'company', settings_type: 'string',   settings_description: 'رقم السجل التجاري' },
    { settings_id: 9,  settings_key: 'company_country',            settings_value: 'EG', settings_category: 'company', settings_type: 'string',   settings_description: 'البلد الافتراضي' },
    { settings_id: 10, settings_key: 'company_currency',           settings_value: 'EGP', settings_category: 'company', settings_type: 'string',   settings_description: 'العملة الافتراضية للشركة' },
    { settings_id: 11, settings_key: 'company_lat',                settings_value: '30.0444', settings_category: 'company', settings_type: 'string',   settings_description: 'خط عرض موقع الشركة' },
    { settings_id: 12, settings_key: 'company_lng',                settings_value: '31.2357', settings_category: 'company', settings_type: 'string',   settings_description: 'خط طول موقع الشركة' },
    { settings_id: 13, settings_key: 'company_logo',               settings_value: '', settings_category: 'company', settings_type: 'string',   settings_description: 'شعار الشركة' },

    // ── Financial Tab ─────────────────────────────────────────────────────────
    { settings_id: 20, settings_key: 'tax_rate',                   settings_value: '14', settings_category: 'financial', settings_type: 'decimal',  settings_description: 'نسبة ضريبة المبيعات الافتراضية (%)' },
    { settings_id: 21, settings_key: 'default_currency',           settings_value: 'جنيه مصري', settings_category: 'financial', settings_type: 'string',   settings_description: 'العملة الافتراضية للعرض' },
    { settings_id: 22, settings_key: 'currency_symbol',            settings_value: 'ج.م', settings_category: 'financial', settings_type: 'string',   settings_description: 'رمز العملة' },
    { settings_id: 23, settings_key: 'decimal_places',             settings_value: '2', settings_category: 'financial', settings_type: 'integer',  settings_description: 'عدد الخانات العشرية في القيم المالية' },
    { settings_id: 24, settings_key: 'defult_client_credit_limit', settings_value: '50000', settings_category: 'financial', settings_type: 'integer',  settings_description: 'الحد الائتماني الافتراضي للعميل الجديد' },
    { settings_id: 25, settings_key: 'payment_terms_days',         settings_value: '30', settings_category: 'financial', settings_type: 'integer',  settings_description: 'شروط الدفع الافتراضية (أيام)' },
    { settings_id: 26, settings_key: 'invoice_prefix',             settings_value: 'INV-', settings_category: 'financial', settings_type: 'string',   settings_description: 'بادئة رقم الفاتورة' },
    { settings_id: 27, settings_key: 'order_prefix',               settings_value: 'ORD-', settings_category: 'financial', settings_type: 'string',   settings_description: 'بادئة رقم الطلب' },
    { settings_id: 28, settings_key: 'purchase_order_prefix',      settings_value: 'PO-', settings_category: 'financial', settings_type: 'string',   settings_description: 'بادئة أمر الشراء' },
    { settings_id: 29, settings_key: 'return_prefix',              settings_value: 'RET-', settings_category: 'financial', settings_type: 'string',   settings_description: 'بادئة رقم المرتجع' },
    { settings_id: 30, settings_key: 'max_discount_percentage',    settings_value: '25', settings_category: 'financial', settings_type: 'decimal',  settings_description: 'أقصى نسبة خصم مسموحة للمندوب (%)' },
    { settings_id: 31, settings_key: 'auto_approve_orders',        settings_value: 'false', settings_category: 'financial', settings_type: 'boolean',  settings_description: 'الموافقة التلقائية على الطلبات' },
    { settings_id: 32, settings_key: 'auto_approve_threshold',     settings_value: '5000', settings_category: 'financial', settings_type: 'integer',  settings_description: 'حد الموافقة التلقائية (جنيه)' },
    { settings_id: 33, settings_key: 'return_approval_required',   settings_value: 'true', settings_category: 'financial', settings_type: 'boolean',  settings_description: 'إلزام موافقة المشرف على المرتجعات' },
    { settings_id: 34, settings_key: 'credit_limit_check',         settings_value: 'true', settings_category: 'financial', settings_type: 'boolean',  settings_description: 'فحص حد الائتمان عند إنشاء الطلب' },
    { settings_id: 35, settings_key: 'fiscal_year_start',          settings_value: '01-01', settings_category: 'financial', settings_type: 'string',   settings_description: 'بداية السنة المالية (شهر-يوم)' },
    { settings_id: 36, settings_key: 'sales_report_auto_email',    settings_value: 'false', settings_category: 'financial', settings_type: 'boolean',  settings_description: 'إرسال تقارير المبيعات تلقائياً بالبريد' },
    { settings_id: 37, settings_key: 'safe_balance_alert_threshold', settings_value: '1000', settings_category: 'financial', settings_type: 'integer',  settings_description: 'الحد الأدنى لتنبيه رصيد الخزينة' },
    { settings_id: 38, settings_key: 'expense_approval_threshold', settings_value: '2000', settings_category: 'financial', settings_type: 'integer',  settings_description: 'حد قيمة المصروف الذي يحتاج موافقة' },

    // ── Inventory Tab ─────────────────────────────────────────────────────────
    { settings_id: 50, settings_key: 'low_stock_threshold',        settings_value: '10', settings_category: 'inventory', settings_type: 'integer',  settings_description: 'الكمية التي عندها يظهر تنبيه المخزون المنخفض' },
    { settings_id: 51, settings_key: 'out_of_stock_threshold',     settings_value: '0', settings_category: 'inventory', settings_type: 'integer',  settings_description: 'الكمية التي تعتبر عندها البضاعة منتهية' },
    { settings_id: 52, settings_key: 'allow_negative_inventory',   settings_value: 'false', settings_category: 'inventory', settings_type: 'boolean',  settings_description: 'السماح بالبيع عند نفاد المخزون' },
    { settings_id: 53, settings_key: 'require_batch_tracking',     settings_value: 'true', settings_category: 'inventory', settings_type: 'boolean',  settings_description: 'إلزام تتبع الدفعات والمجموعات' },
    { settings_id: 54, settings_key: 'auto_reorder_enabled',       settings_value: 'false', settings_category: 'inventory', settings_type: 'boolean',  settings_description: 'تفعيل إعادة الطلب التلقائي عند نفاد المخزون' },
    { settings_id: 55, settings_key: 'reorder_point_default',      settings_value: '20', settings_category: 'inventory', settings_type: 'integer',  settings_description: 'نقطة إعادة الطلب الافتراضية (وحدة)' },
    { settings_id: 56, settings_key: 'max_expiry_days_threshold',  settings_value: '30', settings_category: 'inventory', settings_type: 'integer',  settings_description: 'عدد أيام الإنذار المبكر لانتهاء الصلاحية' },
    { settings_id: 57, settings_key: 'transfer_approval_required', settings_value: 'true', settings_category: 'inventory', settings_type: 'boolean',  settings_description: 'إلزام موافقة تحويلات المخزون بين المستودعات' },
    { settings_id: 58, settings_key: 'goods_receipt_approval',     settings_value: 'true', settings_category: 'inventory', settings_type: 'boolean',  settings_description: 'إلزام موافقة استلام البضائع' },
    { settings_id: 59, settings_key: 'inter_warehouse_transfer_enabled', settings_value: 'true', settings_category: 'inventory', settings_type: 'boolean',  settings_description: 'تفعيل التحويل بين المستودعات' },
    { settings_id: 60, settings_key: 'gps_tracking_enabled',       settings_value: 'true', settings_category: 'inventory', settings_type: 'boolean',  settings_description: 'تفعيل تتبع موقع المندوب في التطبيق' },
    { settings_id: 61, settings_key: 'visit_radius_meters',        settings_value: '200', settings_category: 'inventory', settings_type: 'integer',  settings_description: 'نطاق القرب اللازم للتحقق من الزيارة (متر)' },
    { settings_id: 62, settings_key: 'require_check_in_photo',     settings_value: 'true', settings_category: 'inventory', settings_type: 'boolean',  settings_description: 'إلزام التقاط صورة عند بدء الزيارة' },
    { settings_id: 63, settings_key: 'require_check_out_photo',    settings_value: 'false', settings_category: 'inventory', settings_type: 'boolean',  settings_description: 'إلزام التقاط صورة عند انهاء الزيارة' },
    { settings_id: 64, settings_key: 'visit_duration_limit_hours', settings_value: '4', settings_category: 'inventory', settings_type: 'integer',  settings_description: 'الحد الأقصى لمدة الزيارة الواحدة (ساعات)' },
    { settings_id: 65, settings_key: 'daily_visit_limit',          settings_value: '15', settings_category: 'inventory', settings_type: 'integer',  settings_description: 'الحد الأقصى لعدد الزيارات اليومية للمندوب' },
    { settings_id: 66, settings_key: 'visit_notes_required',       settings_value: 'false', settings_category: 'inventory', settings_type: 'boolean',  settings_description: 'إلزام إدخال ملاحظات الزيارة' },
    { settings_id: 67, settings_key: 'offline_sync_interval',      settings_value: '5', settings_category: 'inventory', settings_type: 'integer',  settings_description: 'الفاصل الزمني للمزامنة في وضع عدم الاتصال (دقائق)' },
    { settings_id: 68, settings_key: 'email_notifications',        settings_value: 'true', settings_category: 'inventory', settings_type: 'boolean',  settings_description: 'إرسال الإشعارات عبر البريد الإلكتروني' },
    { settings_id: 69, settings_key: 'push_notifications',         settings_value: 'true', settings_category: 'inventory', settings_type: 'boolean',  settings_description: 'إرسال الإشعارات الفورية' },
    { settings_id: 70, settings_key: 'notification_low_stock',     settings_value: 'true', settings_category: 'inventory', settings_type: 'boolean',  settings_description: 'إشعار تنبيه المخزون المنخفض' },
    { settings_id: 71, settings_key: 'notification_overdue_payments', settings_value: 'true', settings_category: 'inventory', settings_type: 'boolean',  settings_description: 'إشعار المدفوعات المتأخرة' },
    { settings_id: 72, settings_key: 'session_timeout_minutes',    settings_value: '60', settings_category: 'inventory', settings_type: 'integer',  settings_description: 'مدة الجلسة قبل انتهاء الصلاحية (دقائق)' },
    { settings_id: 73, settings_key: 'items_per_page',             settings_value: '25', settings_category: 'inventory', settings_type: 'integer',  settings_description: 'عدد العناصر الافتراضي في صفحات القوائم' },
    { settings_id: 74, settings_key: 'auto_backup_enabled',        settings_value: 'true', settings_category: 'inventory', settings_type: 'boolean',  settings_description: 'تفعيل النسخ الاحتياطي التلقائي' },
    { settings_id: 75, settings_key: 'backup_frequency_days',      settings_value: '7', settings_category: 'inventory', settings_type: 'integer',  settings_description: 'دورية النسخ الاحتياطي (أيام)' },
  ];

  // 23. Visit Plans
  const visitPlans = [];
  for (let i = 0; i < 40; i++) {
    visitPlans.push({
      visit_plans_id: i + 1,
      visit_plans_representative_id: randomInt(1, 25),
      visit_plans_client_id: randomInt(1, data.clients.length),
      visit_plans_planned_date: randomDate(new Date(), new Date(2025, 11, 31)),
      visit_plans_status: randomChoice(['مخطط', 'منفذ', 'ملغي']),
      visit_plans_notes: i % 5 === 0 ? `ملاحظات زيارة ${i + 1}` : '',
      visit_plans_created_at: randomDate(new Date(2024, 0, 1), new Date()),
    });
  }
  data.visitPlans = visitPlans;

  // 24. Visits (Actual Visits)
  const visitStatuses = ['Completed', 'Completed', 'Completed', 'Completed', 'Started', 'Started', 'Cancelled'];
  const visits = [];
  for (let i = 0; i < 200; i++) {
    const checkInHour  = randomInt(8, 16);
    const checkInMin   = randomInt(0, 59);
    const durationMins = randomInt(15, 90);
    const checkOutHour = Math.floor((checkInHour * 60 + checkInMin + durationMins) / 60);
    const checkOutMin  = (checkInHour * 60 + checkInMin + durationMins) % 60;
    const visitDate    = randomDate(new Date(2024, 0, 1), new Date());
    const status       = randomChoice(visitStatuses);
    const checkInStr   = `${String(checkInHour).padStart(2, '0')}:${String(checkInMin).padStart(2, '0')}:00`;
    const checkOutStr  = `${String(Math.min(checkOutHour, 22)).padStart(2, '0')}:${String(checkOutMin).padStart(2, '0')}:00`;
    visits.push({
      visits_id: i + 1,
      visits_representative_id: randomInt(1, 25),
      visits_client_id: randomInt(1, data.clients.length),
      visits_visit_date: visitDate,
      visits_status: status,
      visits_check_in_time: checkInStr,
      visits_check_out_time: status === 'Completed' ? checkOutStr : null,
      visits_start_time: `${visitDate} ${checkInStr}`,
      visits_end_time: status === 'Completed' ? `${visitDate} ${checkOutStr}` : null,
      visit_duration_minutes: status === 'Completed' ? durationMins : null,
      visits_notes: i % 4 === 0 ? `ملاحظات الزيارة ${i + 1}` : '',
      visits_latitude: randomFloat(29.0, 31.5, 6),
      visits_longitude: randomFloat(30.0, 32.5, 6),
      visits_created_at: visitDate,
    });
  }
  data.visits = visits;

  // 25. Sales Returns
  const salesReturns = [];
  const salesReturnItems = [];
  let salesReturnId = 1;
  let salesReturnItemId = 1;

  for (let i = 0; i < 30; i++) {
    const salesOrder = randomChoice(salesOrders);
    const returnDate = randomDate(new Date(salesOrder.sales_orders_order_date), new Date());
    
    const returnObj = {
      sales_returns_id: salesReturnId,
      sales_returns_sales_order_id: salesOrder.sales_orders_id,
      sales_returns_return_date: returnDate,
      sales_returns_total_amount: 0,
      sales_returns_reason: randomChoice(['تالف', 'خطأ في الطلب', 'منتج غير مطابق', 'طلب العميل']),
      sales_returns_notes: i % 4 === 0 ? `ملاحظات مرتجع ${salesReturnId}` : '',
      sales_returns_created_at: returnDate,
    };

    // Return 1-3 items
    const returnItemCount = randomInt(1, 3);
    let totalAmount = 0;
    for (let j = 0; j < returnItemCount; j++) {
      const variant = randomChoice(productVariants);
      const quantity = randomInt(1, 10);
      const unitPrice = variant.product_variants_sale_price;
      const itemTotal = unitPrice * quantity;
      
      salesReturnItems.push({
        sales_return_items_id: salesReturnItemId++,
        sales_return_items_sales_return_id: salesReturnId,
        sales_return_items_variant_id: variant.product_variants_id,
        sales_return_items_packaging_type_id: randomInt(1, data.packagingTypes.length),
        sales_return_items_quantity: quantity,
        sales_return_items_unit_price: unitPrice,
        sales_return_items_total: itemTotal,
      });
      totalAmount += itemTotal;
    }

    returnObj.sales_returns_total_amount = totalAmount;
    salesReturns.push(returnObj);
    salesReturnId++;
  }
  data.salesReturns = salesReturns;
  data.salesReturnItems = salesReturnItems;

  // 26. Purchase Returns
  const purchaseReturns = [];
  const purchaseReturnItems = [];
  let purchaseReturnId = 1;
  let purchaseReturnItemId = 1;

  for (let i = 0; i < 20; i++) {
    const purchaseOrder = randomChoice(purchaseOrders);
    const returnDate = randomDate(new Date(purchaseOrder.purchase_orders_order_date), new Date());
    const prSupplier  = data.suppliers.find(s => s.supplier_id === purchaseOrder.purchase_orders_supplier_id);
    
    const returnObj = {
      purchase_returns_id: purchaseReturnId,
      purchase_returns_purchase_order_id: purchaseOrder.purchase_orders_id,
      purchase_returns_supplier_id: purchaseOrder.purchase_orders_supplier_id,
      supplier_name: prSupplier ? prSupplier.supplier_name : `مورد #${purchaseOrder.purchase_orders_supplier_id}`,
      purchase_returns_return_date: returnDate,
      purchase_returns_date: returnDate,        // alias used by PurchaseReturnListView
      purchase_returns_total_amount: 0,
      purchase_returns_status: randomChoice(['معالج', 'مكتمل', 'ملغي']),
      purchase_returns_reason: randomChoice(['تالف', 'خطأ في الشحن', 'منتج غير مطابق', 'جودة رديئة']),
      purchase_returns_notes: i % 4 === 0 ? `ملاحظات مرتجع ${purchaseReturnId}` : '',
      purchase_returns_created_at: returnDate,
    };

    // Return 1-3 items
    const returnItemCount = randomInt(1, 3);
    let totalAmount = 0;
    for (let j = 0; j < returnItemCount; j++) {
      const variant = randomChoice(productVariants);
      const quantity = randomInt(5, 50);
      const unitPrice = variant.product_variants_purchase_price;
      const itemTotal = unitPrice * quantity;
      
      purchaseReturnItems.push({
        purchase_return_items_id: purchaseReturnItemId++,
        purchase_return_items_purchase_return_id: purchaseReturnId,
        purchase_return_items_variant_id: variant.product_variants_id,
        purchase_return_items_packaging_type_id: randomInt(1, data.packagingTypes.length),
        purchase_return_items_quantity: quantity,
        purchase_return_items_unit_price: unitPrice,
        purchase_return_items_total: itemTotal,
      });
      totalAmount += itemTotal;
    }

    returnObj.purchase_returns_total_amount = totalAmount;
    purchaseReturns.push(returnObj);
    purchaseReturnId++;
  }
  data.purchaseReturns = purchaseReturns;
  data.purchaseReturnItems = purchaseReturnItems;

  // 27. Goods Receipts
  const goodsReceipts = [];
  for (let i = 0; i < 80; i++) {
    const purchaseOrder = randomChoice(purchaseOrders.filter(po => po.purchase_orders_status === 'Received' || po.purchase_orders_status === 'Partial Receipt'));
    goodsReceipts.push({
      goods_receipts_id: i + 1,
      goods_receipts_purchase_order_id: purchaseOrder.purchase_orders_id,
      goods_receipts_receipt_number: `GR-${2024}${String(i + 1).padStart(5, '0')}`,
      goods_receipts_receipt_date: randomDate(new Date(purchaseOrder.purchase_orders_order_date), new Date()),
      goods_receipts_warehouse_id: purchaseOrder.purchase_orders_warehouse_id,
      goods_receipts_notes: i % 5 === 0 ? `ملاحظات إيصال ${i + 1}` : '',
      goods_receipts_created_by: randomInt(1, 25),
      goods_receipts_created_at: randomDate(new Date(2023, 0, 1), new Date()),
    });
  }
  data.goodsReceipts = goodsReceipts;

  // 28. Sales Deliveries
  const salesDeliveries = [];
  for (let i = 0; i < 100; i++) {
    const salesOrder = randomChoice(salesOrders.filter(so => so.sales_orders_delivery_status === 'Delivered' || so.sales_orders_delivery_status === 'Partially_Delivered'));
    salesDeliveries.push({
      sales_deliveries_id: i + 1,
      sales_deliveries_sales_order_id: salesOrder.sales_orders_id,
      sales_deliveries_delivery_number: `SD-${2024}${String(i + 1).padStart(5, '0')}`,
      sales_deliveries_delivery_date: randomDate(new Date(salesOrder.sales_orders_order_date), new Date()),
      sales_deliveries_driver_name: `${randomChoice(firstNames)} ${randomChoice(lastNames)}`,
      sales_deliveries_vehicle_number: `${randomChoice(['أ', 'ب', 'ج'])} ${randomInt(1000, 9999)}`,
      sales_deliveries_notes: i % 6 === 0 ? `ملاحظات تسليم ${i + 1}` : '',
      sales_deliveries_created_by: randomInt(1, 25),
      sales_deliveries_created_at: randomDate(new Date(2023, 0, 1), new Date()),
    });
  }
  data.salesDeliveries = salesDeliveries;

  // 29. Transfers (warehouse-to-warehouse inventory transfers)
  const transferStatuses = ['Pending', 'In Transit', 'Completed', 'Cancelled'];
  const mainWarehouses = data.warehouses.filter(w => w.warehouse_type === 'Main');
  const vanWarehouses = data.warehouses.filter(w => w.warehouse_type === 'Van');
  const transfers = [];
  for (let i = 0; i < 40; i++) {
    const srcWh = randomChoice(mainWarehouses);
    let dstWh = randomChoice(data.warehouses);
    while (dstWh.warehouse_id === srcWh.warehouse_id) {
      dstWh = randomChoice(data.warehouses);
    }
    const tDate = randomDate(new Date(2023, 6, 1), new Date());
    const itemCount = randomInt(1, 5);
    const tItems = [];
    for (let j = 0; j < itemCount; j++) {
      const variant = randomChoice(productVariants);
      tItems.push({
        transfer_item_id: i * 10 + j + 1,
        variant_id: variant.product_variants_id,
        packaging_type_id: randomInt(1, data.packagingTypes.length),
        quantity: randomFloat(5, 100, 2),
        variant_name: variant.product_variants_name,
      });
    }
    transfers.push({
      transfer_id: i + 1,
      display_id: `TRF-${2024}${String(i + 1).padStart(4, '0')}`,
      transfer_source_warehouse_id: srcWh.warehouse_id,
      transfer_destination_warehouse_id: dstWh.warehouse_id,
      status: randomChoice(transferStatuses),
      notes: i % 5 === 0 ? `ملاحظات التحويل رقم ${i + 1}` : '',
      created_at: tDate + 'T' + `${String(randomInt(8, 17)).padStart(2, '0')}:00:00`,
      items: tItems,
    });
  }
  data.transfers = transfers;

  // 30. Transfer Requests (from representatives – Load and Unload)
  const requestStatuses = ['Pending', 'Approved', 'Rejected'];
  const transferRequests = [];
  for (let i = 0; i < 30; i++) {
    const reqType = i % 3 === 0 ? 'Unload' : 'Load';
    const srcWh = reqType === 'Load' ? randomChoice(mainWarehouses) : randomChoice(vanWarehouses);
    const dstWhPool = reqType === 'Load' ? vanWarehouses : mainWarehouses;
    const dstWh = randomChoice(dstWhPool);
    const user = randomChoice(data.users);
    const reqDate = randomDate(new Date(2024, 0, 1), new Date());
    const itemCount = randomInt(1, 4);
    const reqItems = [];
    for (let j = 0; j < itemCount; j++) {
      const variant = randomChoice(productVariants);
      reqItems.push({
        request_item_id: i * 10 + j + 1,
        variant_id: variant.product_variants_id,
        packaging_type_id: randomInt(1, data.packagingTypes.length),
        requested_quantity: randomFloat(5, 80, 2),
        variant_name: variant.product_variants_name,
      });
    }
    transferRequests.push({
      request_id: i + 1,
      request_source_warehouse_id: srcWh.warehouse_id,
      request_destination_warehouse_id: dstWh.warehouse_id,
      request_status: randomChoice(requestStatuses),
      request_type: reqType,
      request_notes: i % 4 === 0 ? `ملاحظات الطلب رقم ${i + 1}` : '',
      created_by_name: user.users_name,
      created_by_id: user.users_id,
      created_at: reqDate,
      items: reqItems,
    });
  }
  data.transferRequests = transferRequests;

  // 31. Deliverable Sales Orders (confirmed orders not yet fully delivered, with enriched items)
  const confirmedOrders = salesOrders.filter(o =>
    o.sales_orders_status === 'Approved' && o.sales_orders_delivery_status !== 'Delivered'
  ).slice(0, 25);
  data.deliverableSalesOrders = confirmedOrders.map(order => {
    const client = data.clients.find(c => c.clients_id === order.sales_orders_client_id);
    const warehouse = data.warehouses.find(w => w.warehouse_id === order.sales_orders_warehouse_id);
    const orderItems = salesOrderItems
      .filter(it => it.sales_order_items_sales_order_id === order.sales_orders_id)
      .map(item => {
        const variant = productVariants.find(v => v.product_variants_id === item.sales_order_items_variant_id);
        const product = variant ? products.find(p => p.products_id === variant.product_variants_product_id) : null;
        const pkgType = data.packagingTypes.find(pt => pt.packaging_types_id === item.sales_order_items_packaging_type_id);
        return {
          ...item,
          variant_name: variant?.product_variants_name || 'منتج غير محدد',
          products_name: product?.products_name || 'منتج غير محدد',
          variant_sku: variant?.product_variants_sku || '',
          packaging_types_name: pkgType?.packaging_types_name || '',
          delivered_quantity: 0,
          returned_quantity: 0,
        };
      });
    return {
      ...order,
      client_name: client?.clients_company_name || client?.clients_contact_name || 'عميل غير محدد',
      warehouse_name: warehouse?.warehouse_name || 'مخزن غير محدد',
      items: orderItems,
    };
  });

  // 32. Pending Purchase Orders for Receive (enriched with items)
  const pendingPOs = purchaseOrders.filter(o => o.purchase_orders_status === 'Pending').slice(0, 20);
  data.pendingPurchaseOrders = pendingPOs.map(order => {
    const supplier = data.suppliers.find(s => s.supplier_id === order.purchase_orders_supplier_id);
    const warehouse = data.warehouses.find(w => w.warehouse_id === order.purchase_orders_warehouse_id);
    const orderItems = purchaseOrderItems
      .filter(it => it.purchase_order_items_purchase_order_id === order.purchase_orders_id)
      .slice(0, 5)
      .map(item => {
        const variant = productVariants.find(v => v.product_variants_id === item.purchase_order_items_variant_id);
        const product = variant ? products.find(p => p.products_id === variant.product_variants_product_id) : null;
        const pkgType = data.packagingTypes.find(pt => pt.packaging_types_id === item.purchase_order_items_packaging_type_id);
        const remainingQty = item.purchase_order_items_quantity;
        return {
          ...item,
          variant_name: variant?.product_variants_name || 'منتج غير محدد',
          products_name: product?.products_name || 'منتج غير محدد',
          packaging_types_name: pkgType?.packaging_types_name || '',
          quantity_pending: remainingQty,
          quantity_received: 0,
        };
      });
    return {
      ...order,
      supplier_name: supplier?.supplier_name || 'مورد غير محدد',
      warehouse_name: warehouse?.warehouse_name || 'مخزن غير محدد',
      items: orderItems,
    };
  });

  // 33. Dashboard Statistics
  data.dashboardStats = {
    total_sales: salesOrders.reduce((sum, order) => sum + order.sales_orders_total_amount, 0),
    total_purchases: purchaseOrders.reduce((sum, order) => sum + order.purchase_orders_total_amount, 0),
    total_clients: data.clients.length,
    active_clients: data.clients.filter(c => c.clients_status === 'نشط').length,
    total_products: data.products.length,
    total_inventory_value: inventory.reduce((sum, inv) => {
      const variant = productVariants.find(v => v.product_variants_id === inv.inventory_variant_id);
      return sum + (variant ? variant.product_variants_purchase_price * inv.inventory_quantity : 0);
    }, 0),
    pending_orders: salesOrders.filter(o => o.sales_orders_status === 'Pending').length,
    confirmed_orders: salesOrders.filter(o => o.sales_orders_status === 'Approved').length,
    low_stock_items: inventory.filter(i => i.inventory_quantity < 10).length,
    recent_notifications: notifications.filter(n => !n.notifications_is_read).length,
  };

  // Chart of Accounts
  data.accounts = [
    // إيرادات (Revenue)
    { id: 1,  code: '4000', name: 'إيرادات المبيعات',          type: 'إيرادات', sortid: 1 },
    { id: 2,  code: '4010', name: 'إيرادات الخدمات',          type: 'إيرادات', sortid: 2 },
    { id: 3,  code: '4020', name: 'إيرادات أخرى',             type: 'إيرادات', sortid: 3 },
    { id: 4,  code: '4030', name: 'إيرادات العمولات',         type: 'إيرادات', sortid: 4 },
    // مصروفات (Expenses)
    { id: 5,  code: '5000', name: 'تكلفة البضائع المبيعة',      type: 'مصروفات', sortid: 5 },
    { id: 6,  code: '5010', name: 'مصروفات النقل والتوزيع',   type: 'مصروفات', sortid: 6 },
    { id: 7,  code: '5020', name: 'مصروفات التغليف والتعبئة', type: 'مصروفات', sortid: 7 },
    { id: 8,  code: '5030', name: 'مصروفات مرتجعات المبيعات', type: 'مصروفات', sortid: 8 },
    { id: 9,  code: '5040', name: 'مصروفات التخزين والمخازن', type: 'مصروفات', sortid: 9 },
    { id: 10, code: '5050', name: 'مصروفات الدعاية والتسويق', type: 'مصروفات', sortid: 10 },
    // مصروفات ادارية (Admin Expenses)
    { id: 11, code: '6000', name: 'رواتب الموظفين',          type: 'مصروفات ادارية', sortid: 11 },
    { id: 12, code: '6010', name: 'إيجارات ومصاريف مكتب',    type: 'مصروفات ادارية', sortid: 12 },
    { id: 13, code: '6020', name: 'فواتير الكهرباء والمياه',  type: 'مصروفات ادارية', sortid: 13 },
    { id: 14, code: '6030', name: 'مصروفات الاتصالات والإنترنت', type: 'مصروفات ادارية', sortid: 14 },
    { id: 15, code: '6040', name: 'صيانة وإصلاحات',        type: 'مصروفات ادارية', sortid: 15 },
    { id: 16, code: '6050', name: 'مستلزمات وأدوات مكتب',      type: 'مصروفات ادارية', sortid: 16 },
    { id: 17, code: '6060', name: 'مصروفات السيارات والمواصلات', type: 'مصروفات ادارية', sortid: 17 },
    { id: 18, code: '6070', name: 'تأمينات وتراخيص',        type: 'مصروفات ادارية', sortid: 18 },
    { id: 19, code: '6080', name: 'رسوم قانونية ومحاسبية',   type: 'مصروفات ادارية', sortid: 19 },
    { id: 20, code: '6090', name: 'مصروفات إدارية أخرى',     type: 'مصروفات ادارية', sortid: 20 },
  ];

  return data;
}

// Seed the comprehensive mock data to localStorage
export function seedComprehensiveMockData() {
  if (localStorage.getItem('comprehensiveMockSeeded_v14')) {
    console.log('Comprehensive mock data already seeded');
    return;
  }

  console.log('Generating comprehensive mock data...');
  const data = generateComprehensiveMockData();

  // Store each data type in localStorage
  localStorage.setItem('appUsers', JSON.stringify(data.users));
  localStorage.setItem('appCategories', JSON.stringify(data.categories));
  localStorage.setItem('appClients', JSON.stringify(data.clients));
  localStorage.setItem('appSuppliers', JSON.stringify({ data: data.suppliers }));
  // Embed variants into each product so InventoryTab enrichment can find product.variants
  const productsWithVariants = data.products.map(product => ({
    ...product,
    variants: data.productVariants
      .filter(v => v.product_variants_product_id === product.products_id)
      .map(v => ({
        variant_id: v.product_variants_id,
        variant_name: v.product_variants_name,
        variant_sku: v.product_variants_sku,
        variant_barcode: v.product_variants_barcode,
        variant_sale_price: v.product_variants_sale_price,
        variant_purchase_price: v.product_variants_purchase_price,
        variant_min_sale_price: v.product_variants_min_sale_price,
        variant_status: v.product_variants_status,
        variant_products_id: product.products_id,
      })),
  }));
  localStorage.setItem('appProducts', JSON.stringify({ data: productsWithVariants }));
  localStorage.setItem('appProductVariants', JSON.stringify(data.productVariants));
  localStorage.setItem('appWarehouses', JSON.stringify({ data: data.warehouses }));
  localStorage.setItem('appInventory', JSON.stringify(data.inventory));
  localStorage.setItem('appSalesOrders', JSON.stringify(data.salesOrders));
  localStorage.setItem('appSalesOrderItems', JSON.stringify(data.salesOrderItems));
  localStorage.setItem('appPurchaseOrders', JSON.stringify(data.purchaseOrders));
  localStorage.setItem('appPurchaseOrderItems', JSON.stringify(data.purchaseOrderItems));
  localStorage.setItem('appNotifications', JSON.stringify(data.notifications));
  localStorage.setItem('appSettings', JSON.stringify(data.settings));
  localStorage.setItem('appClientIndustries', JSON.stringify(data.clientIndustries));
  localStorage.setItem('appClientTypes', JSON.stringify(data.clientTypes));
  localStorage.setItem('appClientAreaTags', JSON.stringify(data.clientAreaTags));
  localStorage.setItem('appCountriesWithGovernorates', JSON.stringify(data.countries));
  localStorage.setItem('appBaseUnits', JSON.stringify({ data: data.baseUnits }));
  localStorage.setItem('appPackagingTypes', JSON.stringify({ data: data.packagingTypes }));
  localStorage.setItem('appProductAttributes', JSON.stringify(data.productAttributes));
  localStorage.setItem('appPaymentMethods', JSON.stringify(data.paymentMethods));
  localStorage.setItem('appSafes', JSON.stringify(data.safes));
  localStorage.setItem('appClientPayments', JSON.stringify(data.clientPayments));
  localStorage.setItem('appSupplierPayments', JSON.stringify(data.supplierPayments));
  localStorage.setItem('appVisitPlans', JSON.stringify(data.visitPlans));
  localStorage.setItem('appVisits', JSON.stringify(data.visits));
  localStorage.setItem('appSalesReturns', JSON.stringify(data.salesReturns));
  localStorage.setItem('appSalesReturnItems', JSON.stringify(data.salesReturnItems));
  localStorage.setItem('appPurchaseReturns', JSON.stringify(data.purchaseReturns));
  localStorage.setItem('appPurchaseReturnItems', JSON.stringify(data.purchaseReturnItems));
  localStorage.setItem('appGoodsReceipts', JSON.stringify({ data: data.goodsReceipts }));
  localStorage.setItem('appSalesDeliveries', JSON.stringify(data.salesDeliveries));
  localStorage.setItem('appDashboardStats', JSON.stringify(data.dashboardStats));

  localStorage.setItem('appTransfers', JSON.stringify(data.transfers));
  localStorage.setItem('appTransferRequests', JSON.stringify(data.transferRequests));
  localStorage.setItem('appDeliverableSalesOrders', JSON.stringify(data.deliverableSalesOrders));
  localStorage.setItem('appPendingPurchaseOrdersForReceive', JSON.stringify(data.pendingPurchaseOrders));

  // Extra keys used by apiClient URL map
  localStorage.setItem('appSafeTransfers', JSON.stringify(data.safeTransfers || []));
  localStorage.setItem('appSafeTransactions', JSON.stringify(data.safeTransactions || []));
  // appTransfers and appTransferRequests seeded above with real data
  localStorage.setItem('appRepresentativeAttendance', JSON.stringify([]));
  localStorage.setItem('appRepresentativeSettings', JSON.stringify([]));
  localStorage.setItem('appFinancialTransactions', JSON.stringify([]));
  localStorage.setItem('appAccounts', JSON.stringify(data.accounts || []));
  localStorage.setItem('appUserSafes', JSON.stringify([]));
  localStorage.setItem('appUserWarehouses', JSON.stringify([]));
  localStorage.setItem('appClientDocuments', JSON.stringify([]));
  localStorage.setItem('appClientPayments', JSON.stringify(data.clientPayments || []));


  localStorage.setItem('comprehensiveMockSeeded_v14', 'true');
  // Remove old seed flags if present
  localStorage.removeItem('comprehensiveMockSeeded');
  localStorage.removeItem('comprehensiveMockSeeded_v2');
  localStorage.removeItem('comprehensiveMockSeeded_v3');
  localStorage.removeItem('comprehensiveMockSeeded_v4');
  localStorage.removeItem('comprehensiveMockSeeded_v5');
  localStorage.removeItem('comprehensiveMockSeeded_v6');
  localStorage.removeItem('comprehensiveMockSeeded_v7');
  localStorage.removeItem('comprehensiveMockSeeded_v8');
  localStorage.removeItem('comprehensiveMockSeeded_v9');
  localStorage.removeItem('comprehensiveMockSeeded_v12');
  console.log('Comprehensive mock data seeded successfully!');
}

// Clear all mock data
export function clearMockData() {
  const keys = [
    'appUsers', 'appCategories', 'appClients', 'appSuppliers', 'appProducts', 
    'appProductVariants', 'appWarehouses', 'appInventory', 'appSalesOrders', 
    'appSalesOrderItems', 'appPurchaseOrders', 'appPurchaseOrderItems', 
    'appNotifications', 'appSettings', 'appClientIndustries', 'appClientTypes',
    'appClientAreaTags', 'appCountriesWithGovernorates', 'appBaseUnits',
    'appPackagingTypes', 'appProductAttributes', 'appPaymentMethods', 'appSafes',
    'appClientPayments', 'appSupplierPayments', 'appVisitPlans', 'appVisits',
    'appSalesReturns', 'appSalesReturnItems', 'appPurchaseReturns',
    'appPurchaseReturnItems', 'appGoodsReceipts', 'appSalesDeliveries',
    'appDashboardStats', 'appDeliverableSalesOrders', 'appSafeTransfers',
    'appSafeTransactions', 'appTransfers', 'appTransferRequests',
    'appRepresentativeAttendance', 'appRepresentativeSettings',
    'appFinancialTransactions', 'appAccounts', 'appUserSafes', 'appUserWarehouses',
    'appClientDocuments',
    'comprehensiveMockSeeded', 'comprehensiveMockSeeded_v2', 'comprehensiveMockSeeded_v3', 'comprehensiveMockSeeded_v4', 'comprehensiveMockSeeded_v5', 'comprehensiveMockSeeded_v6', 'comprehensiveMockSeeded_v7', 'comprehensiveMockSeeded_v8', 'comprehensiveMockSeeded_v9', 'comprehensiveMockSeeded_v10',
    'mockSeeded', 'bigMockSeeded'
  ];
  
  keys.forEach(key => localStorage.removeItem(key));
  console.log('All mock data cleared!');
}

export default {
  generateComprehensiveMockData,
  seedComprehensiveMockData,
  clearMockData,
};
