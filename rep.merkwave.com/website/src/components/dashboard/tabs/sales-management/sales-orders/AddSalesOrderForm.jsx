// src/components/dashboard/tabs/sales-management/sales-orders/AddSalesOrderForm.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, PlusCircleIcon, TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import SearchableSelect from '../../../../common/SearchableSelect/SearchableSelect';
import NumberInput from '../../../../common/NumberInput/NumberInput';
import { formatCurrency } from '../../../../../utils/currency';
import { formatDateTimeForApi } from '../../../../../utils/dateUtils';
import useCurrency from '../../../../../hooks/useCurrency';
import { getUserData } from '../../../../../apis/auth';

// Utility function to get unique packaging types from inventory
// Removed - packaging_inventory is already unique

const extractConversionFactor = (source = {}) => {
  const potentialKeys = [
    'packaging_types_default_conversion_factor',
    'packaging_default_conversion_factor',
    'packaging_default_conversion_rate',
    'packaging_conversion_factor',
    'conversion_factor',
    'default_conversion_factor'
  ];

  for (const key of potentialKeys) {
    if (source[key] !== undefined && source[key] !== null && source[key] !== '') {
      const parsed = parseFloat(source[key]);
      if (!Number.isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }

  return 1;
};

const normalizePackagingTypeId = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
    return trimmed;
  }

  if (typeof value === 'object') {
    if ('packaging_type_id' in value) {
      return normalizePackagingTypeId(value.packaging_type_id);
    }
    if ('packaging_types_id' in value) {
      return normalizePackagingTypeId(value.packaging_types_id);
    }
    if ('id' in value) {
      return normalizePackagingTypeId(value.id);
    }
    if ('value' in value) {
      return normalizePackagingTypeId(value.value);
    }
  }

  return value;
};

const toPackagingKey = (value) => {
  const normalized = normalizePackagingTypeId(value);
  if (normalized === null || normalized === undefined) {
    return null;
  }
  return String(normalized);
};

const collectPreferredPackagingTypes = (product, variant, allPackagingTypes = []) => {
  const preferredSources = [];

  if (variant && Array.isArray(variant.preferred_packaging_types)) {
    preferredSources.push(variant.preferred_packaging_types);
  }

  if (variant && Array.isArray(variant.preferred_packaging)) {
    preferredSources.push(variant.preferred_packaging);
  }

  if (variant && Array.isArray(variant.packaging_preferences)) {
    preferredSources.push(variant.packaging_preferences);
  }

  if (product && Array.isArray(product.preferred_packaging_types)) {
    preferredSources.push(product.preferred_packaging_types);
  }

  if (product && Array.isArray(product.preferred_packaging)) {
    preferredSources.push(product.preferred_packaging);
  }

  if (product && Array.isArray(product.packaging_preferences)) {
    preferredSources.push(product.packaging_preferences);
  }

  if (product && Array.isArray(product.packaging_types)) {
    preferredSources.push(product.packaging_types);
  }

  if (product && Array.isArray(product.products_packaging)) {
    preferredSources.push(product.products_packaging);
  }

  if (product && Array.isArray(product.product_packaging)) {
    preferredSources.push(product.product_packaging);
  }

  if (product && product.packaging_variant_map && Array.isArray(product.packaging_variant_map)) {
    const specific = product.packaging_variant_map.filter(entry => {
      const variantId = normalizePackagingTypeId(entry.variant_id ?? entry.variants_id);
      if (variant?.variant_id === undefined || variant?.variant_id === null) {
        return false;
      }
      const normalizedVariantId = normalizePackagingTypeId(variant.variant_id);
      return normalizedVariantId !== null && normalizedVariantId === variantId;
    });
    if (specific.length > 0) {
      preferredSources.push(specific);
    }
  }

  const preferredMap = new Map();

  preferredSources.forEach(source => {
    if (!Array.isArray(source)) {
      return;
    }

    source.forEach(entry => {
      const packagingId = toPackagingKey(
        entry?.packaging_type_id ??
        entry?.packaging_types_id ??
        entry?.id ??
        entry?.value ??
        entry
      );

      if (!packagingId) {
        return;
      }

      if (!preferredMap.has(packagingId)) {
        const packagingRecord = allPackagingTypes.find(pt => toPackagingKey(pt) === packagingId) || entry;

        preferredMap.set(packagingId, {
          packaging_type_id: normalizePackagingTypeId(entry?.packaging_type_id ?? entry?.packaging_types_id ?? entry?.id ?? entry?.value ?? entry),
          packaging_type_name: packagingRecord?.packaging_type_name || packagingRecord?.packaging_types_name || packagingRecord?.label || packagingRecord?.name || `نوع تعبئة ${packagingId}`,
          isPreferred: true,
          preferred_order: entry?.preferred_order ?? entry?.order ?? entry?.priority ?? null,
          conversion_factor: extractConversionFactor({ ...packagingRecord, ...entry }),
          available_quantity: parseFloat(entry?.available_quantity ?? 0) || 0,
          unit_price: entry?.unit_price ?? null
        });
      }
    });
  });

  return Array.from(preferredMap.values());
};

const parseDateValue = (value) => {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return new Date(NaN);
    }

    const pattern = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
    if (pattern) {
      const [, dd, mm, yyyy, hh = '00', min = '00', ss = '00'] = pattern;
      return new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}`);
    }

    const normalized = trimmed.includes(' ') && !trimmed.includes('T')
      ? trimmed.replace(' ', 'T')
      : trimmed;

    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date(value);
};

const toLocalDateTimeInputValue = (value = new Date()) => {
  const date = parseDateValue(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const offsetMinutes = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offsetMinutes * 60000);
  return localDate.toISOString().slice(0, 16);
};

const toISOStringWithTime = (value) => {
  if (!value) return null;
  const date = parseDateValue(value);
  if (Number.isNaN(date.getTime())) {
    return formatDateTimeForApi(new Date());
  }
  return formatDateTimeForApi(date);
};

const loadCachedUsers = () => {
  try {
    const cachedUsers = localStorage.getItem('appUsers');
    if (!cachedUsers) {
      return [];
    }
    const parsed = JSON.parse(cachedUsers);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (Array.isArray(parsed?.data)) {
      return parsed.data;
    }
    return [];
  } catch (error) {
    console.error('Error parsing appUsers from localStorage:', error);
    return [];
  }
};

const loadInventoryFromCache = (warehouseId) => {
  if (!warehouseId) {
    return [];
  }

  const normalizeId = (value) => {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    return String(value);
  };

  try {
    const cachedInventory = localStorage.getItem('appInventory');
    if (!cachedInventory) {
      return [];
    }

    const parsedInventory = JSON.parse(cachedInventory);
    if (!Array.isArray(parsedInventory)) {
      return [];
    }

    const targetId = normalizeId(warehouseId);

    return parsedInventory.filter((item) => {
      const candidateIds = [
        item.warehouse_id,
        item.inventory_warehouse_id,
        item.inventory_warehouses_id,
        item.warehouses_id,
        item.inventory_warehouse?.warehouse_id,
        item.warehouse?.warehouse_id
      ].map(normalizeId);

      return candidateIds.some((candidateId) => candidateId && candidateId === targetId);
    });
  } catch (error) {
    console.error('Error parsing appInventory from localStorage:', error);
    return [];
  }
};

export default function AddSalesOrderForm({ 
  onSubmit, 
  onCancel, 
  clients, 
  warehouses 
}) {
  const navigate = useNavigate();
  const { symbol } = useCurrency();
  
  // Get current user's ID to set as default representative
  const currentUser = getUserData();
  const currentUserId = currentUser?.users_id || '';
  
  // Debug: Log current user ID
  console.log('🔵 AddSalesOrderForm - Current User ID:', currentUserId, 'Full User:', currentUser);
  
  const [formData, setFormData] = useState({
  sales_orders_client_id: '',
  sales_orders_warehouse_id: '',
  sales_orders_representative_id: currentUserId, // Auto-set current user ID
  sales_order_date: toLocalDateTimeInputValue(),
    sales_orders_status: 'Draft',
    sales_orders_delivery_status: 'Not_Delivered', // Add delivery status
    sales_orders_notes: '',
    sales_orders_expected_delivery_date: '',
    sales_orders_discount_amount: 0,
    sales_orders_tax_amount: 0,
    sales_order_items: [],
  });

  const lastItemRef = useRef(null);
  const [loading, _setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [availableInventory, setAvailableInventory] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [isConfirmOrderModalOpen, setIsConfirmOrderModalOpen] = useState(false);
  const [representatives, setRepresentatives] = useState([]);
  const [appProductsData, setAppProductsData] = useState(null);

  // Cleanup debounced timeout on unmount
  useEffect(() => {
    return () => {
      // No cleanup needed for instant updates
    };
  }, []);

  // Load appProducts from localStorage
  useEffect(() => {
    const storedProducts = localStorage.getItem('appProducts');
    if (storedProducts) {
      try {
        const parsedProducts = JSON.parse(storedProducts);
        setAppProductsData(parsedProducts);
      } catch (error) {
        console.error('Error parsing appProducts from localStorage:', error);
      }
    }
  }, []);

  // Create available products - includes ALL products from localStorage with availability status
  const availableProducts = useMemo(() => {
    if (!appProductsData?.data) {
      return [];
    }

    const productMap = new Map();

    // Helper function to get packaging types from localStorage
    const getPackagingTypesFromStorage = () => {
      try {
        const storedPackagingTypes = localStorage.getItem('appPackagingTypes');
        if (storedPackagingTypes) {
          const parsed = JSON.parse(storedPackagingTypes);
          return Array.isArray(parsed) ? parsed : (parsed.data || []);
        }
      } catch (error) {
        console.error('Error parsing appPackagingTypes:', error);
      }
      return [];
    };

    const allPackagingTypes = getPackagingTypesFromStorage();

    // First, add all products from appProductsData (all available products)
    appProductsData.data.forEach(product => {
      if (product.variants) {
        product.variants.forEach(variant => {
          const key = variant.variant_id;
          
          // Get inventory data for this variant in selected warehouse
          // Use String() conversion to avoid type mismatch (number vs string after JSON parsing)
          const variantInventory = formData.sales_orders_warehouse_id 
            ? availableInventory.filter(inv => String(inv.variant_id) === String(variant.variant_id))
            : [];

          // Debug logging for variant 689
          if (String(variant.variant_id) === '689') {
            console.log('🔴 DEBUG variant 689:', {
              variant_id: variant.variant_id,
              variant_name: variant.variant_name,
              warehouse_id: formData.sales_orders_warehouse_id,
              availableInventory_count: availableInventory.length,
              availableInventory_sample: availableInventory.slice(0, 3),
              variantInventory_count: variantInventory.length,
              variantInventory: variantInventory
            });
          }

          // Create packaging inventory with availability status
          const packagingMap = new Map();
          
          // Add packaging types that have inventory
          variantInventory.forEach(inv => {
            if (parseFloat(inv.inventory_quantity || 0) > 0) {
              let packagingName = inv.packaging_type_name || 
                                inv.packaging_types_name || 
                                inv.packaging_name || 
                                inv.package_name || 
                                inv.package_type_name;
              
              if (!packagingName) {
                const foundPackaging = allPackagingTypes.find(pt => 
                  pt.packaging_types_id === inv.packaging_type_id || 
                  pt.packaging_types_id === parseInt(inv.packaging_type_id)
                );
                if (foundPackaging) {
                  packagingName = foundPackaging.packaging_types_name;
                }
              }

              const packagingKey = toPackagingKey(inv.packaging_type_id);
              if (!packagingKey) {
                return;
              }
              const quantity = parseFloat(inv.inventory_quantity || 0);
              const conversionFactor = extractConversionFactor({
                ...inv,
                ...allPackagingTypes.find(pt => pt.packaging_types_id === parseInt(packagingKey))
              });
              
              if (packagingMap.has(packagingKey)) {
                const existing = packagingMap.get(packagingKey);
                existing.available_quantity += quantity;
                if (!existing.conversion_factor || existing.conversion_factor === 1) {
                  existing.conversion_factor = conversionFactor;
                }
                existing.isAvailable = true;
              } else {
                packagingMap.set(packagingKey, {
                  packaging_type_id: normalizePackagingTypeId(inv.packaging_type_id),
                  packaging_type_name: packagingName || `نوع تعبئة ${inv.packaging_type_id}`,
                  available_quantity: quantity,
                  unit_price: inv.unit_price || variant.variant_unit_price || null,
                  conversion_factor: conversionFactor,
                  isAvailable: true,
                  isPreferred: false,
                  preferred_order: null
                });
              }
            }
          });

          // Add all packaging types from product variants (even if not in inventory)
          if (product.packaging_variant_map) {
            product.packaging_variant_map
              .filter(pvm => String(pvm.variant_id) === String(variant.variant_id))
              .forEach(pvm => {
                const packagingKey = toPackagingKey(pvm.packaging_type_id);
                
                if (!packagingMap.has(packagingKey)) {
                  if (!packagingKey) {
                    return;
                  }
                  // Find packaging type name
                  const foundPackaging = allPackagingTypes.find(pt => 
                    pt.packaging_types_id === pvm.packaging_type_id
                  );

                  const conversionFactor = extractConversionFactor({
                    ...pvm,
                    ...foundPackaging
                  });
                  
                  packagingMap.set(packagingKey, {
                    packaging_type_id: normalizePackagingTypeId(pvm.packaging_type_id),
                    packaging_type_name: foundPackaging?.packaging_types_name || `نوع تعبئة ${pvm.packaging_type_id}`,
                    available_quantity: 0,
                    unit_price: variant.variant_unit_price || null,
                    conversion_factor: conversionFactor,
                    isAvailable: false,
                    isPreferred: Boolean(pvm?.is_preferred || pvm?.preferred || pvm?.is_default || pvm?.is_primary),
                    preferred_order: pvm?.preferred_order ?? pvm?.order ?? pvm?.priority ?? null
                  });
                } else {
                  const existing = packagingMap.get(packagingKey);
                  packagingMap.set(packagingKey, {
                    ...existing,
                    isPreferred: existing.isPreferred || Boolean(pvm?.is_preferred || pvm?.preferred || pvm?.is_default || pvm?.is_primary),
                    preferred_order: existing.preferred_order ?? pvm?.preferred_order ?? pvm?.order ?? pvm?.priority ?? null,
                    conversion_factor: existing.conversion_factor || extractConversionFactor({ ...pvm })
                  });
                }
              });
          }

          // Merge any preferred packaging definitions from product or variant metadata
          const preferredPackaging = collectPreferredPackagingTypes(product, variant, allPackagingTypes);
          preferredPackaging.forEach(pref => {
            const packagingKey = toPackagingKey(pref.packaging_type_id);
            if (!packagingKey) {
              return;
            }

            const normalizedId = normalizePackagingTypeId(pref.packaging_type_id);
            const packagingName = pref.packaging_type_name || `نوع تعبئة ${packagingKey}`;
            const conversionFactor = extractConversionFactor(pref);
            const availableQuantity = parseFloat(pref.available_quantity || 0) || 0;
            const isAvailable = availableQuantity > 0 || Boolean(pref.isAvailable);

            if (packagingMap.has(packagingKey)) {
              const existing = packagingMap.get(packagingKey);
              packagingMap.set(packagingKey, {
                ...existing,
                packaging_type_id: existing.packaging_type_id ?? normalizedId,
                packaging_type_name: existing.packaging_type_name || packagingName,
                conversion_factor: existing.conversion_factor || conversionFactor,
                unit_price: existing.unit_price ?? pref.unit_price ?? variant.variant_unit_price ?? null,
                available_quantity: Math.max(existing.available_quantity ?? 0, availableQuantity),
                isAvailable: existing.isAvailable || isAvailable,
                isPreferred: true,
                preferred_order: existing.preferred_order ?? pref.preferred_order ?? null
              });
            } else {
              packagingMap.set(packagingKey, {
                packaging_type_id: normalizedId,
                packaging_type_name: packagingName,
                available_quantity: availableQuantity,
                unit_price: pref.unit_price ?? variant.variant_unit_price ?? null,
                conversion_factor: conversionFactor,
                isAvailable: isAvailable,
                isPreferred: true,
                preferred_order: pref.preferred_order ?? null
              });
            }
          });

          // If no packaging types found, add default packaging types
          if (packagingMap.size === 0) {
            allPackagingTypes.forEach(pt => {
              const packagingKey = toPackagingKey(pt.packaging_types_id);
              if (!packagingKey) {
                return;
              }
              packagingMap.set(packagingKey, {
                packaging_type_id: normalizePackagingTypeId(pt.packaging_types_id),
                packaging_type_name: pt.packaging_types_name,
                available_quantity: 0,
                unit_price: variant.variant_unit_price || null,
                conversion_factor: extractConversionFactor(pt),
                isAvailable: false,
                isPreferred: false,
                preferred_order: null
              });
            });
          }

          const packagingInventory = Array.from(packagingMap.values()).sort((a, b) => {
            const availabilityDiff = Number(Boolean(b.isAvailable)) - Number(Boolean(a.isAvailable));
            if (availabilityDiff !== 0) {
              return availabilityDiff;
            }

            const preferredDiff = Number(Boolean(b.isPreferred)) - Number(Boolean(a.isPreferred));
            if (preferredDiff !== 0) {
              return preferredDiff;
            }

            if (a.preferred_order !== null && b.preferred_order !== null) {
              return a.preferred_order - b.preferred_order;
            }

            if (a.preferred_order !== null) {
              return -1;
            }

            if (b.preferred_order !== null) {
              return 1;
            }

            return (a.packaging_type_name || '').localeCompare(b.packaging_type_name || '', 'ar');
          });
          const isInStock = packagingInventory.some(pkg => pkg.isAvailable);
          
          // Create display label with availability status
          const baseName = variant.variant_name || product.products_name || 'منتج غير محدد';
          
          productMap.set(key, {
            value: variant.variant_id,
            label: baseName,
            products_id: product.products_id,
            variant_id: variant.variant_id,
            products_unit_of_measure_id: product.products_unit_of_measure_id,
            packaging_inventory: packagingInventory,
            variant_unit_price: variant.variant_unit_price || null,
            variant_cost_price: variant.variant_cost_price || null,
            isInStock,
            availableInWarehouse: isInStock
          });
        });
      }
    });

    return Array.from(productMap.values()).sort((a, b) => {
      // Sort by availability first (available items first), then by name
      if (a.isInStock !== b.isInStock) {
        return b.isInStock - a.isInStock;
      }
      return a.label.localeCompare(b.label, 'ar');
    });
  }, [availableInventory, formData.sales_orders_warehouse_id, appProductsData]);

  // Check inventory availability for all items in the order
  const inventoryValidation = useMemo(() => {
    const issues = [];
    let hasInventoryIssues = false;

    formData.sales_order_items.forEach((item, index) => {
      if (!item.variant_id || !item.packaging_type_id || !item.quantity_ordered) {
        return; // Skip incomplete items
      }

      const requestedQuantity = parseFloat(item.quantity_ordered || 0);
      const availableQuantity = parseFloat(item.available_quantity || 0);

      if (availableQuantity === 0 || item.isPackagingAvailable === false) {
        // Item not available in warehouse
        issues.push({
          index,
          type: 'not_available',
          message: `المنتج غير متوفر في المخزن`,
          itemIndex: index
        });
        hasInventoryIssues = true;
      } else if (requestedQuantity > availableQuantity) {
        // Requested quantity exceeds available quantity
        issues.push({
          index,
          type: 'insufficient_quantity',
          message: `الكمية المطلوبة (${requestedQuantity}) تتجاوز المتوفر (${availableQuantity})`,
          itemIndex: index,
          available: availableQuantity,
          requested: requestedQuantity
        });
        hasInventoryIssues = true;
      }
    });

    return {
      issues,
      hasInventoryIssues,
      canSetDeliveryStatus: !hasInventoryIssues
    };
  }, [formData.sales_order_items]);

  // Auto-reset delivery status when inventory issues are detected
  useEffect(() => {
    if (inventoryValidation.hasInventoryIssues && formData.sales_orders_delivery_status !== 'Not_Delivered') {
      setFormData(prevData => ({
        ...prevData,
        sales_orders_delivery_status: 'Not_Delivered'
      }));
    }
  }, [inventoryValidation.hasInventoryIssues, formData.sales_orders_delivery_status]);

  // Create enhanced availableProducts that includes out-of-stock items
  const _allAvailableProducts = useMemo(() => {
    if (!appProductsData?.data) {
      return availableProducts; // Fallback to inventory-only products
    }

    const productMap = new Map();
    
    // First, add all products from inventory (in-stock items)
    availableProducts.forEach(product => {
      productMap.set(product.value, {
        ...product,
        inStock: true,
        availableInWarehouse: true
      });
    });

    // Then, add all products from appProductsData (including out-of-stock)
    appProductsData.data.forEach(product => {
      if (product.variants) {
        product.variants.forEach(variant => {
          const key = variant.variant_id;
          
          if (!productMap.has(key)) {
            // This variant is not in current warehouse inventory
            productMap.set(key, {
              value: variant.variant_id,
              label: `${variant.variant_name || product.products_name} (غير متوفر في المخزن)`,
              products_id: product.products_id,
              variant_id: variant.variant_id,
              products_unit_of_measure_id: product.products_unit_of_measure_id,
              packaging_inventory: [], // No packaging available
              variant_unit_price: variant.variant_unit_price || null,
              variant_cost_price: variant.variant_cost_price || null,
              inStock: false,
              availableInWarehouse: false
            });
          }
        });
      }
    });

    return Array.from(productMap.values());
  }, [availableProducts, appProductsData]);

  // Load inventory when warehouse is selected
  useEffect(() => {
    if (!formData.sales_orders_warehouse_id) {
      setAvailableInventory([]);
      setInventoryLoading(false);
      return;
    }

    const cachedInventory = loadInventoryFromCache(formData.sales_orders_warehouse_id);
    setAvailableInventory(cachedInventory);
    setInventoryLoading(false);
  }, [formData.sales_orders_warehouse_id]);

  // Load representatives on component mount
  useEffect(() => {
    const reps = loadCachedUsers();
    setRepresentatives(Array.isArray(reps) ? reps : []);
  }, []);

  // Debug logging 

  // Add a function to clear warehouses cache for testing
  const clearWarehousesCache = () => {
    localStorage.removeItem('appWarehouses');
  };

  // You can call this in the browser console: clearWarehousesCache()
  window.clearWarehousesCache = clearWarehousesCache;

  // Safe array processing - using correct field names from backend
  const safeClients = Array.isArray(clients) ? clients.filter(client => 
    client && (client.clients_id) && (client.clients_company_name)
  ) : [];
  const safeWarehouses = useMemo(() => Array.isArray(warehouses) ? warehouses.filter(warehouse => 
    warehouse && (warehouse.warehouse_id) && (warehouse.warehouse_name)
  ) : [], [warehouses]);

  const displayClients = safeClients;
  const displayWarehouses = safeWarehouses;

  const resolveOrderDateForSubmission = (value) => {
    const formatted = toISOStringWithTime(value);
    return formatted || toISOStringWithTime(new Date());
  };

  // Create options for SearchableSelect components
  const clientOptions = safeClients.map(client => ({
    value: client.clients_id,
    label: client.clients_company_name
  }));

  const warehouseOptions = safeWarehouses.map(warehouse => ({
    value: warehouse.warehouse_id,
    label: warehouse.warehouse_name
  }));

  // Filter representatives based on selected warehouse
  const filteredRepresentativeOptions = useMemo(() => {
    if (!formData.sales_orders_warehouse_id) {
      // If no warehouse is selected, show all representatives
      return representatives.map(rep => ({
        value: rep.users_id,
        label: rep.users_full_name || rep.users_name || `${rep.users_first_name} ${rep.users_last_name}`.trim() || rep.users_email
      }));
    }

    // Find the selected warehouse
    const selectedWarehouse = safeWarehouses.find(w => w.warehouse_id === formData.sales_orders_warehouse_id);
    
    if (!selectedWarehouse || !selectedWarehouse.warehouse_representative_user_id) {
      // If warehouse has no assigned representative, return empty array (no choices)
      return [];
    }

    // If warehouse has a representative, show only that representative
    const warehouseRep = representatives.find(rep => rep.users_id === selectedWarehouse.warehouse_representative_user_id);
    if (warehouseRep) {
      return [{
        value: warehouseRep.users_id,
        label: warehouseRep.users_full_name || warehouseRep.users_name || `${warehouseRep.users_first_name} ${warehouseRep.users_last_name}`.trim() || warehouseRep.users_email
      }];
    }

    return [];
  }, [formData.sales_orders_warehouse_id, safeWarehouses, representatives]);

  const _representativeOptions = representatives.map(rep => ({
    value: rep.users_id,
    label: rep.users_full_name || rep.users_name || `${rep.users_first_name} ${rep.users_last_name}`.trim() || rep.users_email
  }));

  // Effect to mark data as loaded
  useEffect(() => {
    if (Array.isArray(clients) && clients.length > 0 && 
        Array.isArray(warehouses) && warehouses.length > 0) {
      setDataLoaded(true);
    }
  }, [clients, warehouses]);

  // Item management functions
  const calculateItemTotals = (item) => {
    const quantity = parseFloat(item.quantity_ordered) || 0;
    const unitCost = parseFloat(item.unit_cost) || 0;
    const discountAmount = parseFloat(item.discount_amount) || 0;
    const taxRate = parseFloat(item.tax_rate) || 0;
    
    const subtotal = quantity * unitCost;
    // Treat discountAmount as per-unit value entered in the UI, compute total line discount
    const totalDiscount = discountAmount * quantity;

    // Calculate tax on original subtotal before discount.
    // Allow manual tax: if user entered a taxRate > 0 we treat it as applicable even when product default has no tax.
    const taxApplies = Boolean(item.has_tax) || taxRate > 0;
    const taxAmount = taxApplies ? (subtotal * taxRate / 100) : 0;

    const afterDiscount = subtotal - totalDiscount;
    const total = afterDiscount + taxAmount;
    
    return {
      subtotal: subtotal.toFixed(2),
      tax_amount: taxAmount.toFixed(2),
      discount_amount: totalDiscount.toFixed(2),
      total: total.toFixed(2)
    };
  };

  // Instant packaging change handler for immediate UI updates
  const handlePackagingChange = useCallback((index, packagingTypeId) => {
    setFormData((prevData) => {
      const newItems = [...prevData.sales_order_items];
      const item = newItems[index];

      if (!item || !packagingTypeId) return prevData;

      // Update packaging type
      newItems[index] = { ...item, packaging_type_id: packagingTypeId };

      // Update available quantity when packaging type changes
      if (packagingTypeId && item.packaging_inventory) {
        const selectedPackaging = item.packaging_inventory.find(
          pkg => pkg.packaging_type_id === parseInt(packagingTypeId)
        );
        if (selectedPackaging) {
          newItems[index] = {
            ...newItems[index],
            available_quantity: selectedPackaging.available_quantity,
            isPackagingAvailable: selectedPackaging.isAvailable,
            packaging_conversion_factor: extractConversionFactor(selectedPackaging),
            unit_cost: (() => {
              const baseUnitPrice = parseFloat(item.base_unit_price || item.variant_unit_price || 0);
              const conversionFactor = extractConversionFactor(selectedPackaging);
              let calculatedUnitCost = baseUnitPrice;

              if (baseUnitPrice && conversionFactor > 1) {
                calculatedUnitCost = baseUnitPrice * conversionFactor;
              } else if (!baseUnitPrice && selectedPackaging.unit_price) {
                calculatedUnitCost = parseFloat(selectedPackaging.unit_price) || 0;
              }

              return calculatedUnitCost ? calculatedUnitCost.toFixed(2) : item.unit_cost;
            })()
          };
        } else {
          newItems[index] = {
            ...newItems[index],
            available_quantity: 0,
            isPackagingAvailable: false,
            packaging_conversion_factor: 1
          };
        }
      }

      // Recalculate tax amount
      const calculated = calculateItemTotals(newItems[index]);
      newItems[index] = {
        ...newItems[index],
        tax_amount: parseFloat(calculated.tax_amount)
      };

      return { ...prevData, sales_order_items: newItems };
    });
  }, []);

  const handleItemFieldChange = (index, e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;
    
    // Handle packaging change with debouncing
    if (name === 'packaging_type_id') {
      handlePackagingChange(index, fieldValue);
      return;
    }
    
    setFormData((prevData) => {
      const newItems = [...prevData.sales_order_items];
      newItems[index] = { ...newItems[index], [name]: fieldValue };
      
      // Recalculate tax amount when relevant fields change
      if (['quantity_ordered', 'unit_cost', 'discount_amount', 'tax_rate', 'has_tax'].includes(name)) {
        const calculated = calculateItemTotals(newItems[index]);
        newItems[index].tax_amount = parseFloat(calculated.tax_amount);
      }
      
      return { ...prevData, sales_order_items: newItems };
    });
  };

  const handleItemVariantSelect = (index, selectedVariantValue) => {
    const selectedVariantData = availableProducts.find(v => v.value === selectedVariantValue);
    
    if (selectedVariantData) {
      // Get variant tax info from appProductsData
      const getVariantTaxInfo = (variantId) => {
        if (!appProductsData?.data) return { has_tax: false, tax_rate: 0 };
        
        for (const product of appProductsData.data) {
          if (product.variants) {
            const variant = product.variants.find(v => v.variant_id === parseInt(variantId));
            if (variant) {
              return {
                has_tax: variant.variant_has_tax === 1,
                tax_rate: parseFloat(variant.variant_tax_rate || 0)
              };
            }
          }
        }
        return { has_tax: false, tax_rate: 0 };
      };

      const taxInfo = getVariantTaxInfo(selectedVariantData.value);

      setFormData((prevData) => {
        const newItems = [...prevData.sales_order_items];
        const baseUnitPrice = parseFloat(selectedVariantData.variant_unit_price || 0) || 0;
        newItems[index] = {
          ...newItems[index],
          variant_id: selectedVariantData.value,
          products_id: selectedVariantData.products_id,
          products_unit_of_measure_id: selectedVariantData.products_unit_of_measure_id,
          packaging_inventory: selectedVariantData.packaging_inventory, // Store available packaging inventory
          packaging_type_id: '', // Reset packaging type when variant changes
          available_quantity: 0, // Will be updated when packaging type is selected
          quantity_ordered: '',
          // Auto-populate unit cost from variant data if available
          unit_cost: baseUnitPrice ? baseUnitPrice.toFixed(2) : '',
          base_unit_price: baseUnitPrice,
          packaging_conversion_factor: 1,
          // Auto-populate tax information
          has_tax: taxInfo.has_tax,
          tax_rate: taxInfo.tax_rate,
          tax_amount: 0, // Will be calculated when quantity and unit cost are entered
          discount_amount: 0,
          item_notes: '',
        };
        return { ...prevData, sales_order_items: newItems };
      });
    }
  };

  const handleAddItem = () => {
    setFormData((prevData) => ({
      ...prevData,
      sales_order_items: [
        ...prevData.sales_order_items,
        {
          products_id: '',
          variant_id: '',
          quantity_ordered: '',
          unit_cost: '',
          base_unit_price: 0,
          packaging_type_id: '',
          products_unit_of_measure_id: null,
          available_quantity: 0,
          isPackagingAvailable: undefined,
          packaging_conversion_factor: 1,
          discount_amount: 0,
          tax_rate: 0,
          has_tax: false,
          tax_amount: 0,
          item_notes: '',
        },
      ],
    }));
    setTimeout(() => {
      if (lastItemRef.current) {
        lastItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  };

  const handleRemoveItem = (index) => {
    setFormData((prevData) => ({
      ...prevData,
      sales_order_items: prevData.sales_order_items.filter((_, i) => i !== index),
    }));
  };

  const handleSaveAsDraft = (e) => {
    e.preventDefault();
    
    // Validate that we have items
    if (formData.sales_order_items.length === 0) {
      alert('يجب إضافة عنصر واحد على الأقل للطلب');
      return;
    }
    
    // Check for empty items (items without variant or packaging type selected)
    const emptyItems = formData.sales_order_items.filter(item => !item.variant_id || !item.packaging_type_id);
    if (emptyItems.length > 0) {
      alert(`يوجد ${emptyItems.length} منتج فارغ لم يتم اختياره.\n\nيرجى إما:\n• اختيار المنتج والتعبئة لكل عنصر\n• أو حذف العناصر الفارغة قبل الحفظ`);
      return;
    }
    
    // Get current user from localStorage if no representative is selected
    const getCurrentUserId = () => {
      try {
        const userData = localStorage.getItem('userData');
        if (userData) {
          const parsedData = JSON.parse(userData);
          return parsedData.users_id;
        }
      } catch (error) {
        console.error('Error parsing userData from localStorage:', error);
      }
      return null;
    };

    const representativeId = formData.sales_orders_representative_id || getCurrentUserId();
    
    // Debug: Log representative ID before submission
    console.log('🔵 handleSaveAsDraft - Representative ID:', representativeId);
    console.log('🔵 handleSaveAsDraft - formData.sales_orders_representative_id:', formData.sales_orders_representative_id);
    console.log('🔵 handleSaveAsDraft - Full formData:', formData);
    
    const itemsToSubmit = formData.sales_order_items.map((item) => ({
      sales_order_items_variant_id: item.variant_id,
      sales_order_items_packaging_type_id: item.packaging_type_id,
      sales_order_items_quantity: item.quantity_ordered,
      sales_order_items_unit_price: item.unit_cost,
  sales_order_items_subtotal: (parseFloat(item.quantity_ordered || 0) * parseFloat(item.unit_cost || 0)).toFixed(2),
  // Discount entered in the UI is per-unit; submit total line discount
  sales_order_items_discount_amount: ((parseFloat(item.discount_amount || 0) || 0) * (parseFloat(item.quantity_ordered || 0) || 0)).toFixed(2),
  // Submit calculated tax amount (respect manual tax rate even if has_tax is false)
  sales_order_items_tax_amount: Number(calculateItemTotals(item).tax_amount || 0).toFixed(2),
      sales_order_items_tax_rate: item.tax_rate || 0,
      sales_order_items_has_tax: item.has_tax || false,
      sales_order_items_total_price: calculateItemTotals(item).total,
      sales_order_items_notes: item.item_notes || null,
    }));
    
    // Transform data to match API expectations
    const transformedData = {
      sales_orders_client_id: formData.sales_orders_client_id,
      sales_orders_order_date: resolveOrderDateForSubmission(formData.sales_order_date),
      sales_orders_status: 'Draft',
      sales_orders_delivery_status: formData.sales_orders_delivery_status,
      sales_orders_notes: formData.sales_orders_notes,
      sales_orders_warehouse_id: formData.sales_orders_warehouse_id,
      sales_orders_representative_id: representativeId,
      sales_orders_expected_delivery_date: formData.sales_orders_expected_delivery_date || null,
      sales_orders_subtotal: orderTotals.subtotal,
      sales_orders_discount_amount: formData.sales_orders_discount_amount,
      sales_orders_tax_amount: formData.sales_orders_tax_amount,
      sales_orders_total_amount: orderTotals.total,
      items: itemsToSubmit
    };
    
    
    onSubmit(transformedData);
  };

  const handleConfirmOrder = (e) => {
    e.preventDefault();
    setIsConfirmOrderModalOpen(true);
  };

  const handleFinalConfirmOrder = () => {
    // Validate that we have items
    if (formData.sales_order_items.length === 0) {
      alert('يجب إضافة عنصر واحد على الأقل للطلب');
      return;
    }
    
    // Check for empty items (items without variant or packaging type selected)
    const emptyItems = formData.sales_order_items.filter(item => !item.variant_id || !item.packaging_type_id);
    if (emptyItems.length > 0) {
      alert(`يوجد ${emptyItems.length} منتج فارغ لم يتم اختياره.\n\nيرجى إما:\n• اختيار المنتج والتعبئة لكل عنصر\n• أو حذف العناصر الفارغة قبل التأكيد`);
      setIsConfirmOrderModalOpen(false);
      return;
    }
    
    // Get current user from localStorage if no representative is selected
    const getCurrentUserId = () => {
      try {
        const userData = localStorage.getItem('userData');
        if (userData) {
          const parsedData = JSON.parse(userData);
          return parsedData.users_id;
        }
      } catch (error) {
        console.error('Error parsing userData from localStorage:', error);
      }
      return null;
    };

    const representativeId = formData.sales_orders_representative_id || getCurrentUserId();
    
    // Debug: Log representative ID before submission
    console.log('🟢 handleFinalConfirmOrder - Representative ID:', representativeId);
    console.log('🟢 handleFinalConfirmOrder - formData.sales_orders_representative_id:', formData.sales_orders_representative_id);
    console.log('🟢 handleFinalConfirmOrder - Full formData:', formData);
    
    const itemsToSubmit = formData.sales_order_items.map((item) => ({
      sales_order_items_variant_id: item.variant_id,
      sales_order_items_packaging_type_id: item.packaging_type_id,
      sales_order_items_quantity: item.quantity_ordered,
      sales_order_items_unit_price: item.unit_cost,
  sales_order_items_subtotal: (parseFloat(item.quantity_ordered || 0) * parseFloat(item.unit_cost || 0)).toFixed(2),
  // Discount entered in the UI is per-unit; submit total line discount
  sales_order_items_discount_amount: ((parseFloat(item.discount_amount || 0) || 0) * (parseFloat(item.quantity_ordered || 0) || 0)).toFixed(2),
  // Submit calculated tax amount (respect manual tax rate even if has_tax is false)
  sales_order_items_tax_amount: Number(calculateItemTotals(item).tax_amount || 0).toFixed(2),
      sales_order_items_tax_rate: item.tax_rate || 0,
      sales_order_items_has_tax: item.has_tax || false,
      sales_order_items_total_price: calculateItemTotals(item).total,
      sales_order_items_notes: item.item_notes || null,
    }));
    
    // Transform data to match API expectations
    const transformedData = {
      sales_orders_client_id: formData.sales_orders_client_id,
      sales_orders_order_date: resolveOrderDateForSubmission(formData.sales_order_date),
      sales_orders_status: 'Invoiced',
      sales_orders_delivery_status: formData.sales_orders_delivery_status,
      sales_orders_notes: formData.sales_orders_notes,
      sales_orders_warehouse_id: formData.sales_orders_warehouse_id,
      sales_orders_representative_id: representativeId,
      sales_orders_expected_delivery_date: formData.sales_orders_expected_delivery_date || null,
      sales_orders_subtotal: orderTotals.subtotal,
      sales_orders_discount_amount: formData.sales_orders_discount_amount,
      sales_orders_tax_amount: formData.sales_orders_tax_amount,
      sales_orders_total_amount: orderTotals.total,
      items: itemsToSubmit
    };
    
    
    onSubmit(transformedData);
    setIsConfirmOrderModalOpen(false);
  };

  // Calculate order totals
  const orderTotals = useMemo(() => {
    const subtotal = formData.sales_order_items.reduce((total, item) => {
      const quantity = parseFloat(item.quantity_ordered) || 0;
      const unitCost = parseFloat(item.unit_cost) || 0;
      return total + (quantity * unitCost);
    }, 0);

    // Calculate total item-level discounts (discount entered is per-unit, so multiply by quantity)
    const itemsDiscountTotal = formData.sales_order_items.reduce((total, item) => {
      const qty = parseFloat(item.quantity_ordered) || 0;
      const perUnitDiscount = parseFloat(item.discount_amount) || 0;
      return total + (perUnitDiscount * qty);
    }, 0);

    const orderDiscount = parseFloat(formData.sales_orders_discount_amount) || 0;
    const totalDiscount = itemsDiscountTotal + orderDiscount;
    const afterDiscount = Math.max(0, subtotal - totalDiscount);
    
    const itemsTaxTotal = formData.sales_order_items.reduce((total, item) => {
      return total + (parseFloat(item.tax_amount) || 0);
    }, 0);
    
    const orderTaxAmount = parseFloat(formData.sales_orders_tax_amount) || 0;
    const totalTax = itemsTaxTotal + orderTaxAmount;
    
    const grandTotal = afterDiscount + totalTax;

    return {
      subtotal: subtotal.toFixed(2),
      discount: totalDiscount.toFixed(2),
      tax: totalTax.toFixed(2),
      total: grandTotal.toFixed(2)
    };
  }, [formData.sales_order_items, formData.sales_orders_discount_amount, formData.sales_orders_tax_amount]);

  // Legacy orderTotal for backward compatibility
  const orderTotal = orderTotals.total;

  // Conditional rendering based on warehouses availability
  if (!Array.isArray(warehouses) || warehouses.length === 0 || displayWarehouses.length === 0) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-md max-w-xl mx-auto text-center" dir="rtl">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-500" />
        <h3 className="mt-4 text-2xl font-bold text-gray-800">لا توجد مخازن متاحة</h3>
        <p className="mt-2 text-gray-600">يجب عليك أولاً إضافة مخزن قبل إضافة أمر بيع جديد.</p>
        <div className="mt-6 flex justify-center gap-4">
           <button type="button" onClick={onCancel} className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">رجوع</button>
          <button type="button" onClick={() => navigate('/dashboard/inventory-management/warehouses')} className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">الذهاب لصفحة المخازن</button>
        </div>
      </div>
    );
  }

  // Show loading state if clients are not loaded yet
  if (!Array.isArray(clients) || clients.length === 0 || displayClients.length === 0) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-md max-w-xl mx-auto text-center" dir="rtl">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <h3 className="mt-4 text-2xl font-bold text-gray-800">جاري تحميل البيانات...</h3>
        <p className="mt-2 text-gray-600">يرجى الانتظار بينما نقوم بتحميل قائمة العملاء.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-6xl mx-auto" dir="rtl">
      <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">إضافة أمر بيع جديد</h3>
      
      {!dataLoaded && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 ml-2" />
            <p className="text-sm text-yellow-700">
              جاري تحميل البيانات... قد تظهر بيانات تجريبية حتى يتم تحميل البيانات الفعلية.
            </p>
          </div>
        </div>
      )}
      
      <form className="space-y-6">
        {/* Order Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Warehouse */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              المستودع <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={warehouseOptions}
              value={formData.sales_orders_warehouse_id}
              onChange={(value) => {
                // Keep the current user as representative (don't change it based on warehouse)
                // The representative is always the user who creates the order
                setFormData({ 
                  ...formData, 
                  sales_orders_warehouse_id: value,
                  // sales_orders_representative_id stays as current user (set in initial state)
                  sales_order_items: [] // Clear items when warehouse changes
                });
              }}
              placeholder="اختر المستودع"
              className="mt-1"
            />
          </div>

          {/* Client */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              العميل <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={clientOptions}
              value={formData.sales_orders_client_id}
              onChange={(value) => setFormData({ ...formData, sales_orders_client_id: value })}
              placeholder="اختر العميل"
              className="mt-1"
            />
          </div>

          {/* Representative - Hidden field (auto-set to current user) */}
          {/* The representative field is automatically set to the current logged-in user */}

          {/* Order Date */}
          <div>
            <label htmlFor="sales_order_date" className="block text-sm font-medium text-gray-700">
              تاريخ الأمر <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              id="sales_order_date"
              name="sales_order_date"
              value={formData.sales_order_date}
              onChange={(e) => setFormData({ ...formData, sales_order_date: e.target.value })}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>

        {/* Items Section */}
        {(formData.sales_orders_warehouse_id || appProductsData?.data) && (
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">عناصر الأمر</h4>
            
            {inventoryLoading && formData.sales_orders_warehouse_id && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-700">جاري تحميل حالة توفر المنتجات في المخزن...</p>
              </div>
            )}

            {!formData.sales_orders_warehouse_id && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-sm text-amber-700">
                  اختر مستودعاً لرؤية حالة توفر المنتجات. يمكنك إضافة أي منتج حتى لو لم يكن متوفراً في المخزن.
                </p>
              </div>
            )}

            {!inventoryLoading && availableProducts.length === 0 && !appProductsData?.data && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-700">
                  لا توجد منتجات متاحة. تأكد من تحميل البيانات في النظام.
                </p>
              </div>
            )}

            {formData.sales_order_items.map((item, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 mb-4 relative" ref={index === formData.sales_order_items.length - 1 ? lastItemRef : null}>
                <div className="absolute top-2 left-2">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="حذف العنصر"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-8 gap-2 items-end">
                  {/* Product/Variant */}
                  <div className="col-span-2">
                    <label htmlFor={`item_variant_${index}`} className="block text-xs font-medium text-gray-700 mb-1">
                      المنتج
                    </label>
                    <div className="text-sm">
                      <SearchableSelect
                        options={availableProducts}
                        value={item.variant_id}
                        onChange={(selectedVariantValue) => handleItemVariantSelect(index, selectedVariantValue)}
                        placeholder="اختر المنتج"
                        disabled={inventoryLoading || availableProducts.length === 0}
                        renderOption={(option) => (
                          <div className="flex items-center justify-between">
                            <span>{option.label}</span>
                            {formData.sales_orders_warehouse_id && (
                              option.isInStock ? (
                                <svg className="h-5 w-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <svg className="h-5 w-5 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              )
                            )}
                          </div>
                        )}
                      />
                    </div>
                  </div>

                  {/* Packaging Type */}
                  <div>
                    <label htmlFor={`item_packaging_type_id_${index}`} className="block text-xs font-medium text-gray-700 mb-1">
                      التعبئة
                    </label>
                    <select
                      id={`item_packaging_type_id_${index}`}
                      name="packaging_type_id"
                      value={item.packaging_type_id}
                      onChange={(e) => handleItemFieldChange(index, e)}
                      required
                      className="block w-full px-1 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs"
                      dir="rtl"
                    >
                      <option value="">اختر تعبئة</option>
                      {(item.packaging_inventory || []).map(pkg => (
                        <option key={pkg.packaging_type_id} value={pkg.packaging_type_id}>
                          {pkg.packaging_type_name}
                          {pkg.isPreferred ? ' ★' : ''}
                          {pkg.isAvailable ? ' ✓ متاح' : ' ⚠ غير متاح'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity Ordered */}
                  <div>
                    <label htmlFor={`item_quantity_ordered_${index}`} className="block text-xs font-medium text-gray-700 mb-1">
                      الكمية
                    </label>
                    <NumberInput
                      value={String(item.quantity_ordered ?? '')}
                      onChange={(v) => handleItemFieldChange(index, { target: { name: 'quantity_ordered', value: v } })}
                      className="block w-full px-1 py-1.5 text-xs"
                      placeholder="0"
                      disabled={!item.packaging_type_id}
                      max={item.isPackagingAvailable && item.available_quantity > 0 ? item.available_quantity : undefined}
                    />
                    {item.packaging_type_id && item.isPackagingAvailable === false && (
                      <p className="text-xs text-orange-500 mt-1">يمكن الطلب رغم عدم التوفر</p>
                    )}
                  </div>

                  {/* Unit Cost */}
                  <div>
                    <label htmlFor={`item_unit_cost_${index}`} className="block text-xs font-medium text-gray-700 mb-1">
                      السعر
                    </label>
                    <NumberInput
                      value={String(item.unit_cost ?? '')}
                      onChange={(v) => handleItemFieldChange(index, { target: { name: 'unit_cost', value: v } })}
                      className="block w-full px-1 py-1.5 text-xs"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Tax Rate */}
                  <div>
                    <label htmlFor={`item_tax_rate_${index}`} className="block text-xs font-medium text-gray-700 mb-1">
                      الضريبة (%)
                    </label>
                    <NumberInput
                      value={String(item.tax_rate ?? '')}
                      onChange={(v) => handleItemFieldChange(index, { target: { name: 'tax_rate', value: v } })}
                      className="block w-full px-1 py-1.5 text-xs"
                      placeholder="0"
                      max={100}
                    />
                  </div>

                  {/* Discount */}
                  <div>
                    <label htmlFor={`item_discount_${index}`} className="block text-xs font-medium text-gray-700 mb-1">
                      الخصم
                    </label>
                    <NumberInput
                      value={String(item.discount_amount ?? '')}
                      onChange={(v) => handleItemFieldChange(index, { target: { name: 'discount_amount', value: v } })}
                      className="block w-full px-1 py-1.5 text-xs"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Item Total */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      المجموع
                    </label>
                    <div className="block w-full px-1 py-1.5 bg-gray-100 border border-gray-300 rounded-md text-xs font-semibold text-gray-900 text-center">
                      {formatCurrency(calculateItemTotals(item).total)}
                    </div>
                  </div>
                </div>
                
                {/* Additional info row - displayed below the main row */}
                {(item.variant_id || item.packaging_type_id || parseFloat(item.quantity_ordered || 0) > parseFloat(item.available_quantity || 0)) && (
                  <div className="grid grid-cols-8 gap-2 mt-2 text-xs">
                    <div className="col-span-2">
                      {item.variant_id && item.packaging_inventory && item.packaging_inventory.length > 0 && (
                        <p className="text-blue-600">
                          أنواع التعبئة: {item.packaging_inventory.filter(p => p.isAvailable).length} متاح / {item.packaging_inventory.length} إجمالي
                        </p>
                      )}
                      {item.variant_id && (!item.packaging_inventory || item.packaging_inventory.length === 0) && (
                        <p className="text-red-500">لا توجد أنواع تعبئة</p>
                      )}
                    </div>
                    <div>
                      {item.packaging_type_id && item.isPackagingAvailable === false && (
                        <p className="text-orange-500">نوع التعبئة غير متاح</p>
                      )}
                      {item.packaging_type_id && item.isPackagingAvailable === true && (
                        <p className="text-green-600">نوع التعبئة متاح</p>
                      )}
                    </div>
                    <div>
                      {item.packaging_type_id && item.available_quantity > 0 && (
                        <p className="text-green-600">متاح: {item.available_quantity}</p>
                      )}
                      {item.packaging_type_id && item.available_quantity === 0 && item.isPackagingAvailable === false && (
                        <p className="text-orange-500">غير متاح في المخزن</p>
                      )}
                      {item.packaging_type_id && item.available_quantity === 0 && item.isPackagingAvailable !== false && (
                        <p className="text-red-500">نفد المخزون</p>
                      )}
                      {parseFloat(item.quantity_ordered || 0) > parseFloat(item.available_quantity || 0) && item.available_quantity > 0 && (
                        <p className="text-red-500">الكمية تتجاوز المتاح!</p>
                      )}
                    </div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div>
                      {Number(calculateItemTotals(item).discount_amount || 0) > 0 && (
                        <p className="text-gray-500">خصم: {formatCurrency(Number(calculateItemTotals(item).discount_amount || 0))}</p>
                      )}
                      {Number(calculateItemTotals(item).tax_amount || 0) > 0 && (
                        <p className="text-gray-500">ضريبة: {formatCurrency(Number(calculateItemTotals(item).tax_amount || 0))}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Add Item Button */}
            {!inventoryLoading && availableProducts.length > 0 && (
              <div className="flex justify-center mt-4">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <PlusCircleIcon className="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
                  إضافة عنصر
                </button>
              </div>
            )}
            
            {availableProducts.length === 0 && appProductsData?.data && (
              <div className="flex justify-center mt-4">
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">لا توجد منتجات متاحة للإضافة</p>
                  <p className="text-xs text-gray-400">تأكد من وجود منتجات في النظام</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Order Total Display */}
        {formData.sales_order_items.length > 0 && (
          <div className="mt-6 space-y-4">
            {/* Financial Summary */}
            <div className="p-4 bg-gray-100 rounded-md shadow-inner">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">المجموع الفرعي:</span>
                  <span className="text-sm font-semibold text-gray-800">{formatCurrency(orderTotals.subtotal)}</span>
                </div>
                
                {parseFloat(orderTotals.discount) > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-red-600">الخصم:</span>
                    <span className="text-sm font-semibold text-red-600">-{formatCurrency(orderTotals.discount)}</span>
                  </div>
                )}
                
                {parseFloat(orderTotals.tax) > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-600">إجمالي الضريبة:</span>
                    <span className="text-sm font-semibold text-blue-600">{formatCurrency(orderTotals.tax)}</span>
                  </div>
                )}
                
                <div className="border-t border-gray-300 pt-2 flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-800">إجمالي الطلب:</span>
                  <span className="text-xl font-extrabold text-green-700">{formatCurrency(orderTotals.total)}</span>
                </div>
              </div>
            </div>

            {/* Order Level Discount and Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Order Discount */}
              <div>
                <label htmlFor="sales_orders_discount_amount" className="block text-sm font-medium text-gray-700">
                  خصم على الطلب
                </label>
                <NumberInput
                  value={String(formData.sales_orders_discount_amount ?? '')}
                  onChange={(v) => setFormData({ ...formData, sales_orders_discount_amount: parseFloat(v || '0') || 0 })}
                  placeholder="0.00"
                />
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="sales_orders_notes" className="block text-sm font-medium text-gray-700">
                  ملاحظات
                </label>
                <textarea
                  id="sales_orders_notes"
                  name="sales_orders_notes"
                  rows={2}
                  value={formData.sales_orders_notes}
                  onChange={(e) => setFormData({ ...formData, sales_orders_notes: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="ملاحظات إضافية..."
                  dir="rtl"
                />
              </div>
            </div>
          </div>
        )}

        {/* Validation warning */}
        {(!formData.sales_orders_client_id || !formData.sales_orders_warehouse_id) && (
          <div className="w-full mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">
              يرجى تحديد العميل والمستودع قبل حفظ أو تأكيد الأمر.
              {filteredRepresentativeOptions.length > 0 && !formData.sales_orders_representative_id && (
                <span className="block mt-1 text-blue-600">
                  ملاحظة: لم يتم تحديد مندوب - سيتم استخدام المستخدم الحالي كمندوب.
                </span>
              )}
            </p>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-reverse space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSaveAsDraft}
            disabled={loading || formData.sales_order_items.length === 0 || !formData.sales_orders_client_id || !formData.sales_orders_warehouse_id}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-yellow-50 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
          >
            {loading ? 'جاري الحفظ...' : 'حفظ كمسودة'}
          </button>
          <button
            type="button"
            onClick={handleConfirmOrder}
            disabled={loading || formData.sales_order_items.length === 0 || !formData.sales_orders_client_id || !formData.sales_orders_warehouse_id}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'جاري التأكيد...' : 'تأكيد الأمر'}
          </button>
        </div>
      </form>

      {/* Confirmation Modal */}
      {isConfirmOrderModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-right overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full" dir="rtl">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                    <ExclamationTriangleIcon className="h-6 w-6 text-green-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:mr-4 sm:text-right">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      تأكيد الأمر
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        هل أنت متأكد من تأكيد هذا الأمر؟ بعد التأكيد لن يمكن تعديل الأمر.
                      </p>
                      <div className="mt-3 bg-gray-50 p-3 rounded-md">
                        <p className="text-sm font-medium text-gray-700">
                          إجمالي الأمر: <span className="text-green-600">{formatCurrency(orderTotal, { withSymbol: false })} {symbol}</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          عدد العناصر: {formData.sales_order_items.length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleFinalConfirmOrder}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:mr-3 sm:w-auto sm:text-sm"
                >
                  تأكيد الأمر
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmOrderModalOpen(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:mr-3 sm:w-auto sm:text-sm"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
