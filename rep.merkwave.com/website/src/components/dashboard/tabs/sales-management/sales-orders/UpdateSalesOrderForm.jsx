import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeftIcon, PlusCircleIcon, TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import SearchableSelect from '../../../../common/SearchableSelect/SearchableSelect';
import NumberInput from '../../../../common/NumberInput/NumberInput';
import ConfirmationDialog from '../../../../common/ConfirmationDialog/ConfirmationDialog';
import { getAllInventory } from '../../../../../apis/inventory';
import { formatCurrency } from '../../../../../utils/currency';
import { formatDateTimeForApi } from '../../../../../utils/dateUtils';

// Utility function to get unique packaging types from inventory
const getUniquePackagingTypes = (packagingInventory) => {
  if (!packagingInventory || !Array.isArray(packagingInventory)) {
    return [];
  }
  
  return packagingInventory.reduce((acc, pkg) => {
    if (!acc.find(p => p.packaging_type_id === pkg.packaging_type_id)) {
      acc.push(pkg);
    }
    return acc;
  }, []);
};

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

const numbersAreEqual = (a, b) => {
  const numA = Number.isFinite(a) ? a : parseFloat(a ?? 0) || 0;
  const numB = Number.isFinite(b) ? b : parseFloat(b ?? 0) || 0;
  return Math.abs(numA - numB) < 1e-6;
};

const normalizePackagingEntry = (entry) => {
  const packagingId = normalizePackagingTypeId(
    entry?.packaging_type_id ??
    entry?.packaging_types_id ??
    entry?.id ??
    entry
  );

  return {
    id: packagingId,
    available_quantity: parseFloat(entry?.available_quantity ?? entry?.inventory_quantity ?? 0) || 0,
    unit_price: entry?.unit_price ?? null,
    isAvailable: Boolean(entry?.isAvailable && (parseFloat(entry?.available_quantity ?? 0) || 0) > 0),
    packaging_conversion_factor: entry?.packaging_conversion_factor ?? entry?.conversion_factor ?? entry?.packaging_default_conversion_factor ?? 1,
    isPreferred: Boolean(entry?.isPreferred),
    preferred_order: entry?.preferred_order ?? null,
    name: entry?.packaging_type_name ?? entry?.packaging_types_name ?? null
  };
};

const arePackagingInventoriesEqual = (listA, listB) => {
  const arrA = Array.isArray(listA) ? listA : [];
  const arrB = Array.isArray(listB) ? listB : [];
  if (arrA.length !== arrB.length) {
    return false;
  }

  const sortFn = (a, b) => {
    const keyA = String(a.id ?? '');
    const keyB = String(b.id ?? '');
    if (keyA === keyB) {
      return 0;
    }
    return keyA.localeCompare(keyB, 'ar');
  };

  const normalizedA = arrA.map(normalizePackagingEntry).sort(sortFn);
  const normalizedB = arrB.map(normalizePackagingEntry).sort(sortFn);

  for (let i = 0; i < normalizedA.length; i += 1) {
    const a = normalizedA[i];
    const b = normalizedB[i];
    if (a.id !== b.id) {
      return false;
    }
    if (!numbersAreEqual(a.available_quantity, b.available_quantity)) {
      return false;
    }
    if (!numbersAreEqual(a.packaging_conversion_factor, b.packaging_conversion_factor)) {
      return false;
    }
    if ((a.unit_price ?? null) !== (b.unit_price ?? null)) {
      return false;
    }
    if (Boolean(a.isAvailable) !== Boolean(b.isAvailable)) {
      return false;
    }
    if (Boolean(a.isPreferred) !== Boolean(b.isPreferred)) {
      return false;
    }
    if ((a.preferred_order ?? null) !== (b.preferred_order ?? null)) {
      return false;
    }
    if ((a.name ?? null) !== (b.name ?? null)) {
      return false;
    }
  }

  return true;
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

  const flattened = preferredSources.flat().filter(Boolean);

  return flattened.map(entry => {
    const packagingTypeId = normalizePackagingTypeId(
      entry?.packaging_type_id ??
      entry?.packaging_types_id ??
      entry?.id ??
      entry?.value ??
      entry
    );

    if (packagingTypeId === null || packagingTypeId === undefined) {
      return null;
    }

    const packagingMeta = allPackagingTypes.find(pt => normalizePackagingTypeId(pt.packaging_types_id) === packagingTypeId);

    return {
      ...entry,
      packaging_type_id: packagingTypeId,
      packaging_type_name: entry?.packaging_type_name || entry?.packaging_types_name || packagingMeta?.packaging_types_name,
      unit_price: entry?.unit_price ?? packagingMeta?.unit_price ?? null,
      preferred_order: entry?.preferred_order ?? entry?.order ?? entry?.priority ?? null,
      isPreferred: true,
    };
  }).filter(Boolean);
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

export default function UpdateSalesOrderForm({ 
  order,
  onSubmit, 
  onCancel, 
  clients, 
  warehouses 
}) {
  const initialRepId = order?.sales_orders_representative_id || order?.representative_id || order?.representatives_id || '';
  const normalizedRepId = initialRepId === '' || initialRepId === null || initialRepId === undefined ? '' : Number(initialRepId);
  const initialOrderDateRaw = order?.sales_orders_order_date || order?.sales_order_date || order?.order_date;
  const normalizedOrderDate = toLocalDateTimeInputValue(initialOrderDateRaw) || toLocalDateTimeInputValue();

  const resolveOrderDateForSubmission = (value) => {
    const formatted = toISOStringWithTime(value);
    return formatted || toISOStringWithTime(new Date());
  };

  const [formData, setFormData] = useState({
    sales_orders_client_id: order?.sales_orders_client_id || order?.client_id || '',
    sales_orders_warehouse_id: order?.sales_orders_warehouse_id || order?.warehouse_id || '',
    sales_orders_representative_id: normalizedRepId,
    sales_order_date: normalizedOrderDate,
    sales_orders_status: order?.sales_orders_status || order?.status || 'Draft',
    sales_orders_delivery_status: order?.sales_orders_delivery_status || order?.delivery_status || 'Not_Delivered',
    sales_orders_notes: order?.sales_orders_notes || order?.notes || '',
    sales_orders_expected_delivery_date: order?.sales_orders_expected_delivery_date || order?.expected_delivery_date ? (order.sales_orders_expected_delivery_date || order.expected_delivery_date).split('T')[0] : '',
    sales_orders_discount_amount: parseFloat(order?.sales_orders_discount_amount || order?.discount_amount || 0),
    sales_orders_tax_amount: parseFloat(order?.sales_orders_tax_amount || order?.tax_amount || 0),
    sales_order_items: order?.items || order?.sales_order_items || [],
  });

  const lastItemRef = useRef(null);
  const [loading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [availableInventory, setAvailableInventory] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [appProductsData, setAppProductsData] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, action: null }); // For approve/reject confirmation

  // Representative field is hidden in the form (automatically set to current user on creation)
  // No need to display or edit representative during order update

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

  // Load order data when order prop changes
  useEffect(() => {
    if (order) {
      // Debug what fields are available
      
      const orderItems = order.items || order.sales_order_items || [];
      
      // Transform order items to match form structure
      const transformedItems = orderItems.map(item => ({
        variant_id: item.sales_order_items_variant_id || item.variant_id || '',
        products_id: item.sales_order_items_product_id || item.products_id || item.product_id || '',
        packaging_type_id: item.sales_order_items_packaging_type_id || item.packaging_type_id || '',
        quantity_ordered: item.sales_order_items_quantity || item.quantity_ordered || item.quantity || '',
        unit_cost: item.sales_order_items_unit_price || item.unit_cost || item.unit_price || '',
        discount_amount: item.sales_order_items_discount_amount || item.discount_amount || 0,
        tax_amount: item.sales_order_items_tax_amount || item.tax_amount || 0,
        tax_rate: item.sales_order_items_tax_rate || item.tax_rate || 0,
        has_tax: item.sales_order_items_has_tax || item.has_tax || false,
        item_notes: item.sales_order_items_notes || item.item_notes || item.notes || '',
        products_unit_of_measure_id: item.products_unit_of_measure_id || null,
        available_quantity: 0, // Will be populated when inventory loads
        packaging_inventory: [], // Will be populated when inventory loads
    packaging_conversion_factor: item.packaging_conversion_factor || 1,
    isPackagingAvailable: item.isPackagingAvailable,
    base_unit_price: item.base_unit_price || item.sales_order_items_unit_price || null,
    variant_unit_price: item.variant_unit_price || null,
  original_unit_price: item.original_unit_price || item.sales_order_items_original_unit_price || item.sales_order_items_unit_price || null,
  original_tax_rate: item.original_tax_rate || item.sales_order_items_original_tax_rate || item.sales_order_items_tax_rate || null,
      }));
      
      setFormData({
        sales_orders_client_id: order.sales_orders_client_id || order.client_id || '',
        sales_orders_warehouse_id: order.sales_orders_warehouse_id || order.warehouse_id || '',
        sales_orders_representative_id: (order.sales_orders_representative_id || order.representative_id || order.representatives_id || '') === '' ? '' : Number(order.sales_orders_representative_id || order.representative_id || order.representatives_id),
  sales_order_date: toLocalDateTimeInputValue(order.sales_orders_order_date || order.sales_order_date || order.order_date) || toLocalDateTimeInputValue(),
        sales_orders_status: order.sales_orders_status || order.status || 'Draft',
        sales_orders_delivery_status: order.sales_orders_delivery_status || order.delivery_status || 'Not_Delivered',
        sales_orders_notes: order.sales_orders_notes || order.notes || '',
        sales_orders_expected_delivery_date: order.sales_orders_expected_delivery_date || order.expected_delivery_date ? (order.sales_orders_expected_delivery_date || order.expected_delivery_date).split('T')[0] : '',
        sales_orders_discount_amount: parseFloat(order.sales_orders_discount_amount || order.discount_amount || 0),
        sales_orders_tax_amount: parseFloat(order.sales_orders_tax_amount || order.tax_amount || 0),
        sales_order_items: transformedItems,
      });
      
    }
  }, [order]);

  // Create available products including unavailable variants for selected warehouse
  const availableProducts = useMemo(() => {
    const productMap = new Map();

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
    const safeInventory = Array.isArray(availableInventory) ? availableInventory : [];
    const inventoryByVariant = new Map();

    safeInventory.forEach(inv => {
      const variantId = normalizePackagingTypeId(inv.variant_id || inv.product_variant_id);
      if (!variantId) {
        return;
      }
      if (!inventoryByVariant.has(variantId)) {
        inventoryByVariant.set(variantId, []);
      }
      inventoryByVariant.get(variantId).push(inv);
    });

    const buildPackagingInventory = (variant = {}, product = {}) => {
      const variantId = normalizePackagingTypeId(variant.variant_id);
      const packagingMap = new Map();
      const variantInventory = variantId ? (inventoryByVariant.get(variantId) || []) : [];

      variantInventory.forEach(inv => {
        const packagingKey = toPackagingKey(inv.packaging_type_id);
        if (!packagingKey) {
          return;
        }

        let packagingName = inv.packaging_type_name ||
          inv.packaging_types_name ||
          inv.packaging_name ||
          inv.package_name ||
          inv.package_type_name;

        const packagingMeta = allPackagingTypes.find(pt => normalizePackagingTypeId(pt.packaging_types_id) === normalizePackagingTypeId(inv.packaging_type_id));
        if (!packagingName && packagingMeta) {
          packagingName = packagingMeta.packaging_types_name;
        }

        const quantity = parseFloat(inv.inventory_quantity || inv.available_quantity || 0) || 0;
        const conversionFactor = extractConversionFactor({ ...inv, ...packagingMeta });
        const unitPriceCandidate = inv.unit_price ?? packagingMeta?.unit_price ?? variant.variant_unit_price ?? variant.variant_cost_price ?? null;

        if (packagingMap.has(packagingKey)) {
          const existing = packagingMap.get(packagingKey);
          existing.available_quantity += quantity;
          existing.isAvailable = existing.isAvailable || quantity > 0;
          if (!existing.unit_price && unitPriceCandidate) {
            existing.unit_price = parseFloat(unitPriceCandidate);
          }
          if ((!existing.packaging_conversion_factor || existing.packaging_conversion_factor === 1) && conversionFactor) {
            existing.packaging_conversion_factor = conversionFactor;
          }
        } else {
          packagingMap.set(packagingKey, {
            packaging_type_id: normalizePackagingTypeId(inv.packaging_type_id),
            packaging_type_name: packagingName || `نوع تعبئة ${inv.packaging_type_id}`,
            available_quantity: quantity,
            unit_price: unitPriceCandidate ? parseFloat(unitPriceCandidate) : null,
            packaging_conversion_factor: conversionFactor,
            isAvailable: quantity > 0,
            isPreferred: false,
            preferred_order: null
          });
        }
      });

      if (product.packaging_variant_map) {
        product.packaging_variant_map
          .filter(pvm => normalizePackagingTypeId(pvm.variant_id) === normalizePackagingTypeId(variant.variant_id))
          .forEach(pvm => {
            const packagingKey = toPackagingKey(pvm.packaging_type_id);
            if (!packagingKey) {
              return;
            }

            const packagingMeta = allPackagingTypes.find(pt => normalizePackagingTypeId(pt.packaging_types_id) === normalizePackagingTypeId(pvm.packaging_type_id));
            const conversionFactor = extractConversionFactor({ ...pvm, ...packagingMeta });

            if (packagingMap.has(packagingKey)) {
              const existing = packagingMap.get(packagingKey);
              packagingMap.set(packagingKey, {
                ...existing,
                isPreferred: existing.isPreferred || Boolean(pvm?.is_preferred || pvm?.preferred || pvm?.is_default || pvm?.is_primary),
                preferred_order: existing.preferred_order ?? pvm?.preferred_order ?? pvm?.order ?? pvm?.priority ?? null,
                unit_price: existing.unit_price ?? packagingMeta?.unit_price ?? variant.variant_unit_price ?? null,
                packaging_conversion_factor: existing.packaging_conversion_factor || conversionFactor
              });
            } else {
              packagingMap.set(packagingKey, {
                packaging_type_id: normalizePackagingTypeId(pvm.packaging_type_id),
                packaging_type_name: packagingMeta?.packaging_types_name || `نوع تعبئة ${pvm.packaging_type_id}`,
                available_quantity: 0,
                unit_price: packagingMeta?.unit_price ?? variant.variant_unit_price ?? null,
                packaging_conversion_factor: conversionFactor,
                isAvailable: false,
                isPreferred: Boolean(pvm?.is_preferred || pvm?.preferred || pvm?.is_default || pvm?.is_primary),
                preferred_order: pvm?.preferred_order ?? pvm?.order ?? pvm?.priority ?? null
              });
            }
          });
      }

      const preferredPackaging = collectPreferredPackagingTypes(product, variant, allPackagingTypes);
      preferredPackaging.forEach(pref => {
        const packagingKey = toPackagingKey(pref.packaging_type_id);
        if (!packagingKey) {
          return;
        }

        const normalizedId = normalizePackagingTypeId(pref.packaging_type_id);
        const packagingName = pref.packaging_type_name || pref.packaging_types_name || `نوع تعبئة ${normalizedId}`;
        const conversionFactor = extractConversionFactor(pref);
        const availableQuantity = parseFloat(pref.available_quantity || 0) || 0;
        const isAvailable = availableQuantity > 0 || Boolean(pref.isAvailable);

        if (packagingMap.has(packagingKey)) {
          const existing = packagingMap.get(packagingKey);
          packagingMap.set(packagingKey, {
            ...existing,
            packaging_type_id: existing.packaging_type_id ?? normalizedId,
            packaging_type_name: existing.packaging_type_name || packagingName,
            packaging_conversion_factor: existing.packaging_conversion_factor || conversionFactor,
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
            packaging_conversion_factor: conversionFactor,
            isAvailable,
            isPreferred: true,
            preferred_order: pref.preferred_order ?? null
          });
        }
      });

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
            packaging_conversion_factor: extractConversionFactor(pt),
            isAvailable: false,
            isPreferred: false,
            preferred_order: null
          });
        });
      }

      return Array.from(packagingMap.values()).map(pkg => ({
        ...pkg,
        available_quantity: parseFloat(pkg.available_quantity || 0) || 0,
        isAvailable: Boolean(pkg.isAvailable && parseFloat(pkg.available_quantity || 0) > 0)
      })).sort((a, b) => {
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
    };

    if (appProductsData?.data) {
      appProductsData.data.forEach(product => {
        if (!Array.isArray(product.variants)) {
          return;
        }

        product.variants.forEach(variant => {
          const variantId = normalizePackagingTypeId(variant.variant_id);
          if (!variantId) {
            return;
          }

          const packagingInventory = buildPackagingInventory(variant, product);
          const isInStock = packagingInventory.some(pkg => pkg.isAvailable);
          const baseName = variant.variant_name || product.products_name || 'منتج غير محدد';

          productMap.set(variantId, {
            value: variantId,
            label: baseName,
            products_id: product.products_id,
            variant_id: variantId,
            products_unit_of_measure_id: product.products_unit_of_measure_id,
            packaging_inventory: packagingInventory,
            variant_unit_price: variant.variant_unit_price || null,
            variant_cost_price: variant.variant_cost_price || null,
            isInStock,
            availableInWarehouse: isInStock
          });
        });
      });
    }

    safeInventory.forEach(inv => {
      const variantId = normalizePackagingTypeId(inv.variant_id);
      if (!variantId || productMap.has(variantId)) {
        return;
      }

      const fallbackVariant = {
        variant_id: variantId,
        variant_name: inv.variant_name || inv.product_variant_name || inv.product_name,
        variant_unit_price: inv.unit_price || null,
        variant_cost_price: inv.cost_price || null
      };

      const fallbackProduct = {
        products_id: inv.product_id || inv.products_id,
        products_name: inv.product_name || inv.products_name || 'منتج غير محدد'
      };

      const packagingInventory = buildPackagingInventory(fallbackVariant, fallbackProduct);
      const isInStock = packagingInventory.some(pkg => pkg.isAvailable);
      const baseName = fallbackVariant.variant_name || fallbackProduct.products_name || 'منتج غير محدد';

      productMap.set(variantId, {
        value: variantId,
        label: baseName,
        products_id: fallbackProduct.products_id,
        variant_id: variantId,
        products_unit_of_measure_id: inv.products_unit_of_measure_id,
        packaging_inventory: packagingInventory,
        variant_unit_price: fallbackVariant.variant_unit_price,
        variant_cost_price: fallbackVariant.variant_cost_price,
        isInStock,
        availableInWarehouse: isInStock
      });
    });

    (formData.sales_order_items || []).forEach(item => {
      const variantId = normalizePackagingTypeId(item.variant_id);
      if (!variantId) {
        return;
      }

      if (!productMap.has(variantId)) {
        productMap.set(variantId, {
          value: variantId,
          label: item.variant_name || 'منتج غير محدد',
          products_id: item.products_id || null,
          variant_id: variantId,
          products_unit_of_measure_id: item.products_unit_of_measure_id || null,
          packaging_inventory: Array.isArray(item.packaging_inventory) ? item.packaging_inventory : [],
          variant_unit_price: item.unit_cost || null,
          variant_cost_price: null,
          isInStock: Boolean(item.available_quantity && item.available_quantity > 0),
          availableInWarehouse: Boolean(item.available_quantity && item.available_quantity > 0)
        });
      } else if (Array.isArray(item.packaging_inventory) && item.packaging_inventory.length > 0) {
        const entry = productMap.get(variantId);
        const existingIds = new Set(entry.packaging_inventory.map(pkg => pkg.packaging_type_id));
        item.packaging_inventory.forEach(pkg => {
          if (!existingIds.has(pkg.packaging_type_id)) {
            entry.packaging_inventory.push({
              ...pkg,
              isAvailable: Boolean(pkg.isAvailable && parseFloat(pkg.available_quantity || 0) > 0)
            });
          }
        });
        entry.packaging_inventory = entry.packaging_inventory.sort((a, b) => {
          const availabilityDiff = Number(Boolean(b.isAvailable)) - Number(Boolean(a.isAvailable));
          if (availabilityDiff !== 0) {
            return availabilityDiff;
          }
          const preferredDiff = Number(Boolean(b.isPreferred)) - Number(Boolean(a.isPreferred));
          if (preferredDiff !== 0) {
            return preferredDiff;
          }
          return (a.packaging_type_name || '').localeCompare(b.packaging_type_name || '', 'ar');
        });
      }
    });

    const sortedProducts = Array.from(productMap.values()).sort((a, b) => {
      if (a.isInStock !== b.isInStock) {
        return Number(Boolean(b.isInStock)) - Number(Boolean(a.isInStock));
      }
      return a.label.localeCompare(b.label, 'ar');
    });

    return sortedProducts;
  }, [availableInventory, appProductsData, formData.sales_order_items]);

  // Load inventory when warehouse is selected - use localStorage cache to prevent continuous fetching
  useEffect(() => {
    const loadInventory = async () => {
      if (!formData.sales_orders_warehouse_id) {
        setAvailableInventory([]);
        return;
      }

      // Try to get cached inventory from localStorage first
      const cacheKey = `inventory_${formData.sales_orders_warehouse_id}`;
      const cachedData = localStorage.getItem(cacheKey);
      
      if (cachedData) {
        try {
          const parsedInventory = JSON.parse(cachedData);
          setAvailableInventory(parsedInventory);
          return; // Use cached data, don't fetch from API
        } catch {
          console.warn('Failed to parse cached inventory, will fetch fresh data');
        }
      }

      // Only fetch from API if no cache exists
      setInventoryLoading(true);
      try {
        const inventoryResponse = await getAllInventory(formData.sales_orders_warehouse_id);
        // Extract the data array from the API response
        const inventory = inventoryResponse?.data || [];
        setAvailableInventory(inventory);
        
        // Cache the inventory in localStorage
        localStorage.setItem(cacheKey, JSON.stringify(inventory));
      } catch (error) {
        console.error('Error loading inventory:', error);
        setAvailableInventory([]);
      } finally {
        setInventoryLoading(false);
      }
    };

    loadInventory();
  }, [formData.sales_orders_warehouse_id]);

  // Update existing items with packaging inventory when available products change
  useEffect(() => {
    if (!availableProducts.length || !formData.sales_order_items.length) {
      return;
    }

    setFormData((prevData) => {
      let didChange = false;

      const nextItems = prevData.sales_order_items.map((item) => {
        if (!item?.variant_id) {
          return item;
        }

        const productData = availableProducts.find((p) => p.value === item.variant_id);
        if (!productData) {
          return item;
        }

        const newPackagingInventory = Array.isArray(productData.packaging_inventory)
          ? productData.packaging_inventory
          : [];

        const packagingChanged = !arePackagingInventoriesEqual(
          item.packaging_inventory,
          newPackagingInventory
        );

        const needsProductMetaUpdate = (
          item.products_id !== productData.products_id ||
          item.products_unit_of_measure_id !== productData.products_unit_of_measure_id
        );

        let shouldUpdateAvailableQuantity = false;
        let nextAvailableQuantity = item.available_quantity;
        let shouldUpdateAvailabilityFlag = false;
        let nextIsPackagingAvailable = item.isPackagingAvailable;
        let shouldUpdateConversion = false;
        let nextPackagingConversion = item.packaging_conversion_factor;
        let shouldUpdateUnitCost = false;
        let nextUnitCost = item.unit_cost;

        const normalizedPackagingId = normalizePackagingTypeId(item.packaging_type_id);
        if (normalizedPackagingId !== null && newPackagingInventory.length) {
          const selectedPackaging = newPackagingInventory.find(
            (pkg) => normalizePackagingTypeId(pkg.packaging_type_id) === normalizedPackagingId
          );

          if (selectedPackaging) {
            const parsedAvailable = parseFloat(selectedPackaging.available_quantity ?? 0) || 0;
            if (!numbersAreEqual(parsedAvailable, item.available_quantity ?? 0)) {
              shouldUpdateAvailableQuantity = true;
              nextAvailableQuantity = parsedAvailable;
            }

            const derivedAvailability = Boolean(
              selectedPackaging.isAvailable && (parseFloat(selectedPackaging.available_quantity ?? 0) || 0) > 0
            );
            if (Boolean(item.isPackagingAvailable) !== derivedAvailability) {
              shouldUpdateAvailabilityFlag = true;
              nextIsPackagingAvailable = derivedAvailability;
            }

            const derivedConversion = selectedPackaging.packaging_conversion_factor ??
              item.packaging_conversion_factor ??
              1;
            if (!numbersAreEqual(derivedConversion, item.packaging_conversion_factor ?? 1)) {
              shouldUpdateConversion = true;
              nextPackagingConversion = derivedConversion;
            }

            if (
              (item.unit_cost === '' || item.unit_cost === null || item.unit_cost === undefined) &&
              selectedPackaging.unit_price !== undefined &&
              selectedPackaging.unit_price !== null
            ) {
              const parsedUnitPrice = parseFloat(selectedPackaging.unit_price);
              if (!Number.isNaN(parsedUnitPrice)) {
                const formattedUnitPrice = parsedUnitPrice.toFixed(2);
                if (formattedUnitPrice !== item.unit_cost) {
                  shouldUpdateUnitCost = true;
                  nextUnitCost = formattedUnitPrice;
                }
              }
            }
          }
        }

        const requiresUpdate =
          packagingChanged ||
          needsProductMetaUpdate ||
          shouldUpdateAvailableQuantity ||
          shouldUpdateAvailabilityFlag ||
          shouldUpdateConversion ||
          shouldUpdateUnitCost;

        if (!requiresUpdate) {
          return item;
        }

        didChange = true;
        const updatedItem = { ...item };

        if (needsProductMetaUpdate) {
          updatedItem.products_id = productData.products_id;
          updatedItem.products_unit_of_measure_id = productData.products_unit_of_measure_id;
        }

        if (packagingChanged) {
          updatedItem.packaging_inventory = newPackagingInventory;
        }

        if (shouldUpdateAvailableQuantity) {
          updatedItem.available_quantity = nextAvailableQuantity;
        }

        if (shouldUpdateAvailabilityFlag) {
          updatedItem.isPackagingAvailable = nextIsPackagingAvailable;
        }

        if (shouldUpdateConversion) {
          updatedItem.packaging_conversion_factor = nextPackagingConversion ?? 1;
        }

        if (shouldUpdateUnitCost) {
          updatedItem.unit_cost = nextUnitCost;
        }

        return updatedItem;
      });

      if (!didChange) {
        return prevData;
      }

      return {
        ...prevData,
        sales_order_items: nextItems,
      };
    });
  }, [availableProducts, formData.sales_order_items.length]);

  // Safe array processing - using correct field names from backend
  const safeClients = Array.isArray(clients) ? clients.filter(client => 
    client && (client.clients_id) && (client.clients_company_name)
  ) : [];
  const safeWarehouses = Array.isArray(warehouses) ? warehouses.filter(warehouse => 
    warehouse && (warehouse.warehouse_id) && (warehouse.warehouse_name)
  ) : [];

  const displayClients = safeClients;
  const displayWarehouses = safeWarehouses;

  // Create options for SearchableSelect components
  const clientOptions = safeClients.map(client => ({
    value: client.clients_id,
    label: client.clients_company_name
  }));

  const warehouseOptions = safeWarehouses.map(warehouse => ({
    value: warehouse.warehouse_id,
    label: warehouse.warehouse_name
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
    const quantity = parseFloat(item.quantity_ordered || item.sales_order_items_quantity) || 0;
    const unitCost = parseFloat(item.unit_cost || item.sales_order_items_unit_price) || 0;
    const discountAmount = parseFloat(item.discount_amount || item.sales_order_items_discount_amount) || 0;
    const taxRate = parseFloat(item.tax_rate || item.sales_order_items_tax_rate) || 0;
    
    const subtotal = quantity * unitCost;
    // If discountAmount is entered per-unit, compute total discount for the line
    const totalDiscount = discountAmount * quantity;

    // Calculate tax on amount after discount.
    // Allow manual tax: if user entered a taxRate > 0 we treat it as applicable even when product default has_tax is false.
    const afterDiscount = subtotal - totalDiscount;
    const taxApplies = Boolean(item.has_tax || item.sales_order_items_has_tax) || taxRate > 0;
    const taxAmount = taxApplies ? (afterDiscount * taxRate / 100) : 0;

    const total = afterDiscount + taxAmount;
    
    return {
      subtotal: subtotal.toFixed(2),
      tax_amount: taxAmount.toFixed(2),
      discount_amount: totalDiscount.toFixed(2),
      total: total.toFixed(2)
    };
  };

  const handleItemFieldChange = (index, e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;
    
    setFormData((prevData) => {
      const newItems = [...prevData.sales_order_items];
      newItems[index] = { ...newItems[index], [name]: fieldValue };
      
      // Update availability metadata when packaging type changes
      if (name === 'packaging_type_id') {
        if (fieldValue && newItems[index].packaging_inventory) {
          const normalizedId = normalizePackagingTypeId(fieldValue);
          const selectedPackaging = newItems[index].packaging_inventory.find(
            pkg => normalizePackagingTypeId(pkg.packaging_type_id) === normalizedId
          );

          if (selectedPackaging) {
            newItems[index].available_quantity = selectedPackaging.available_quantity;
            newItems[index].isPackagingAvailable = selectedPackaging.isAvailable;
            newItems[index].packaging_conversion_factor = selectedPackaging.packaging_conversion_factor || 1;

            if ((newItems[index].unit_cost === '' || newItems[index].unit_cost === null || newItems[index].unit_cost === undefined) && selectedPackaging.unit_price) {
              newItems[index].unit_cost = parseFloat(selectedPackaging.unit_price).toFixed(2);
            }
          } else {
            newItems[index].available_quantity = 0;
            newItems[index].isPackagingAvailable = false;
            newItems[index].packaging_conversion_factor = 1;
          }
        } else {
          newItems[index].available_quantity = 0;
          newItems[index].isPackagingAvailable = undefined;
          newItems[index].packaging_conversion_factor = 1;
        }
      }
      
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
        const currentItem = newItems[index] || {};
        const newPackagingInventory = Array.isArray(selectedVariantData.packaging_inventory)
          ? selectedVariantData.packaging_inventory
          : [];

        const currentPackagingId = currentItem.packaging_type_id;
        const hasExistingPackaging = currentPackagingId && newPackagingInventory.some(pkg =>
          normalizePackagingTypeId(pkg.packaging_type_id) === normalizePackagingTypeId(currentPackagingId)
        );

        const effectivePackagingId = hasExistingPackaging ? currentPackagingId : '';
        const selectedPackaging = hasExistingPackaging
          ? newPackagingInventory.find(pkg => normalizePackagingTypeId(pkg.packaging_type_id) === normalizePackagingTypeId(effectivePackagingId))
          : null;

        newItems[index] = {
          ...currentItem,
          variant_id: selectedVariantData.value,
          products_id: selectedVariantData.products_id,
          products_unit_of_measure_id: selectedVariantData.products_unit_of_measure_id,
          packaging_inventory: newPackagingInventory,
          packaging_type_id: effectivePackagingId,
          available_quantity: selectedPackaging ? selectedPackaging.available_quantity : 0,
          isPackagingAvailable: selectedPackaging ? selectedPackaging.isAvailable : undefined,
          packaging_conversion_factor: selectedPackaging ? selectedPackaging.packaging_conversion_factor || 1 : 1,
          quantity_ordered: currentItem.quantity_ordered ?? '',
          base_unit_price: currentItem.base_unit_price ?? selectedVariantData.variant_unit_price ?? null,
          variant_unit_price: selectedVariantData.variant_unit_price ?? null,
          // Auto-populate unit cost from variant data if not already set
          unit_cost: currentItem.unit_cost ?? selectedPackaging?.unit_price ?? selectedVariantData.variant_unit_price ?? '',
          // Auto-populate tax information if not already set
          has_tax: currentItem.has_tax !== undefined ? currentItem.has_tax : taxInfo.has_tax,
          tax_rate: currentItem.tax_rate ?? taxInfo.tax_rate,
          tax_amount: currentItem.tax_amount ?? 0,
          discount_amount: currentItem.discount_amount ?? 0,
          item_notes: currentItem.item_notes ?? '',
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
          packaging_type_id: '',
          products_unit_of_measure_id: null,
          available_quantity: 0,
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

  const handleSubmit = (e) => {
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
    
    const itemsToSubmit = formData.sales_order_items.map((item) => ({
      sales_order_items_variant_id: item.variant_id,
      sales_order_items_packaging_type_id: item.packaging_type_id,
      sales_order_items_quantity: item.quantity_ordered || item.sales_order_items_quantity,
      sales_order_items_unit_price: item.unit_cost || item.sales_order_items_unit_price,
  sales_order_items_subtotal: (parseFloat(item.quantity_ordered || item.sales_order_items_quantity || 0) * parseFloat(item.unit_cost || item.sales_order_items_unit_price || 0)).toFixed(2),
  // Treat discount_amount as per-unit in the UI, so submit total line discount = discount * quantity
  sales_order_items_discount_amount: ((parseFloat(item.discount_amount || item.sales_order_items_discount_amount || 0) || 0) * (parseFloat(item.quantity_ordered || item.sales_order_items_quantity || 0) || 0)).toFixed(2),
  // Use calculated tax amount for submission (respect manual tax rate even if has_tax is false)
  sales_order_items_tax_amount: Number(calculateItemTotals(item).tax_amount || 0).toFixed(2),
      sales_order_items_tax_rate: item.tax_rate || item.sales_order_items_tax_rate || 0,
      sales_order_items_has_tax: item.has_tax || item.sales_order_items_has_tax || false,
      sales_order_items_total_price: calculateItemTotals(item).total,
      sales_order_items_notes: item.item_notes || item.sales_order_items_notes || null,
  original_unit_price: item.original_unit_price || null,
  original_tax_rate: item.original_tax_rate || null,
    }));
    
    // Transform data to match API expectations
    const transformedData = {
      sales_orders_id: order?.sales_orders_id || order?.id,
      sales_orders_client_id: formData.sales_orders_client_id,
      sales_orders_order_date: resolveOrderDateForSubmission(formData.sales_order_date),
      sales_orders_status: formData.sales_orders_status,
      sales_orders_delivery_status: formData.sales_orders_delivery_status,
      sales_orders_notes: formData.sales_orders_notes,
      sales_orders_warehouse_id: formData.sales_orders_warehouse_id,
      sales_orders_representative_id: formData.sales_orders_representative_id,
  // Provide legacy representative_id field for any backend expecting it
  representative_id: formData.sales_orders_representative_id,
      sales_orders_expected_delivery_date: formData.sales_orders_expected_delivery_date || null,
      sales_orders_subtotal: orderTotals.subtotal,
      sales_orders_discount_amount: formData.sales_orders_discount_amount,
      sales_orders_tax_amount: orderTotals.tax, // Use calculated tax from orderTotals
      sales_orders_total_amount: orderTotals.total,
      items: itemsToSubmit
    };
    
    
    onSubmit(transformedData);
  };

  // Calculate order totals
  const orderTotals = useMemo(() => {
    const subtotal = formData.sales_order_items.reduce((total, item) => {
      const quantity = parseFloat(item.quantity_ordered || item.sales_order_items_quantity) || 0;
      const unitCost = parseFloat(item.unit_cost || item.sales_order_items_unit_price) || 0;
      return total + (quantity * unitCost);
    }, 0);

    // Calculate total item-level discounts
    const itemsDiscountTotal = formData.sales_order_items.reduce((total, item) => {
      return total + (parseFloat(item.discount_amount || item.sales_order_items_discount_amount) || 0);
    }, 0);

    const orderDiscount = parseFloat(formData.sales_orders_discount_amount) || 0;
    const totalDiscount = itemsDiscountTotal + orderDiscount;
    const afterDiscount = Math.max(0, subtotal - totalDiscount);
    
    const itemsTaxTotal = formData.sales_order_items.reduce((total, item) => {
      return total + (parseFloat(item.tax_amount || item.sales_order_items_tax_amount) || 0);
    }, 0);
    
    // Tax is already calculated in items, no need to add order-level tax
    const totalTax = itemsTaxTotal;
    
    const grandTotal = afterDiscount + totalTax;

    return {
      subtotal: subtotal.toFixed(2),
      discount: totalDiscount.toFixed(2),
      tax: totalTax.toFixed(2),
      total: grandTotal.toFixed(2)
    };
  }, [formData.sales_order_items, formData.sales_orders_discount_amount]);

  // Debug logging 

  // Debug log for form data

  // Conditional rendering based on warehouses availability
  if (!Array.isArray(warehouses) || warehouses.length === 0 || displayWarehouses.length === 0) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-md max-w-xl mx-auto text-center" dir="rtl">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-500" />
        <h3 className="mt-4 text-2xl font-bold text-gray-800">لا توجد مخازن متاحة</h3>
        <p className="mt-2 text-gray-600">يجب عليك أولاً إضافة مخزن قبل تعديل أمر البيع.</p>
        <div className="mt-6 flex justify-center gap-4">
           <button type="button" onClick={onCancel} className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">رجوع</button>
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
      <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">تعديل أمر البيع</h3>
      
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Warehouse */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              المستودع <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={warehouseOptions}
              value={formData.sales_orders_warehouse_id}
              onChange={(value) => {
                // Find the selected warehouse
                const selectedWarehouse = safeWarehouses.find(w => w.warehouse_id === value);
                
                // Auto-set representative if warehouse has one assigned, otherwise clear it
                let newRepresentativeId = '';
                if (selectedWarehouse && selectedWarehouse.warehouse_representative_user_id) {
                  newRepresentativeId = selectedWarehouse.warehouse_representative_user_id;
                }
                
                setFormData({ 
                  ...formData, 
                  sales_orders_warehouse_id: value,
                  sales_orders_representative_id: newRepresentativeId,
                  // Don't clear items when editing - just warning user about inventory changes
                });
              }}
              placeholder="اختر المستودع"
              className="mt-1"
              disabled
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
              disabled
            />
          </div>

          {/* Order Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              تاريخ الأمر <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              required
              value={formData.sales_order_date}
              onChange={(e) => setFormData({ ...formData, sales_order_date: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-600 cursor-not-allowed"
              disabled
              readOnly
            />
          </div>

          {/* Representative - Hidden (cannot be changed during update) */}
        </div>

        {/* Items Section */}
        {formData.sales_orders_warehouse_id && (
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">عناصر الأمر</h4>

          {inventoryLoading && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-700">جاري تحميل المنتجات المتاحة...</p>
            </div>
          )}

          {!inventoryLoading && availableProducts.length === 0 && formData.sales_orders_warehouse_id && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-700">
                لا توجد منتجات متاحة في المستودع المحدد. تأكد من وجود مخزون في المستودع.
              </p>
            </div>
          )}

          {formData.sales_order_items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>لا توجد عناصر في الأمر</p>
              <p className="text-sm mt-1">انقر على "إضافة عنصر" لإضافة منتج</p>
            </div>
          ) : (
            <div className="space-y-4">
              {formData.sales_order_items.map((item, index) => {
                // Debug logging for each item
                
                return (
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
                          {getUniquePackagingTypes(item.packaging_inventory).map(pkg => (
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
                          max={item.available_quantity || undefined}
                        />
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
                        {(item.original_unit_price || item.original_unit_price === 0) && (
                          <p className="mt-0.5 text-[10px] text-gray-500">السعر الأصلي: {formatCurrency(Number(item.original_unit_price))}</p>
                        )}
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
                        {(item.original_tax_rate || item.original_tax_rate === 0) && (
                          <p className="mt-0.5 text-[10px] text-gray-500">الضريبة الأصلية: {parseFloat(item.original_tax_rate).toFixed(2)}%</p>
                        )}
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
                          {formatCurrency(Number(calculateItemTotals(item).total || 0))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Additional info row - displayed below the main row */}
                    {(item.variant_id || item.packaging_type_id || parseFloat(item.quantity_ordered || 0) > parseFloat(item.available_quantity || 0)) && (
                      <div className="grid grid-cols-7 gap-2 mt-2 text-xs">
                        <div className="col-span-2">
                          {item.variant_id && item.packaging_inventory && item.packaging_inventory.length > 0 && (
                            <p className="text-blue-600">
                              أنواع التعبئة: {item.packaging_inventory.filter(p => p.isAvailable).length} متاح / {item.packaging_inventory.length} إجمالي
                            </p>
                          )}
                          {item.variant_id && (!item.packaging_inventory || item.packaging_inventory.length === 0) && (
                            <p className="text-red-500">لا توجد أنواع تعبئة لهذا المنتج</p>
                          )}
                        </div>
                        <div>
                          {item.packaging_type_id && item.isPackagingAvailable === false && (
                            <p className="text-orange-500">نوع التعبئة غير متاح في المخزن</p>
                          )}
                          {item.packaging_type_id && item.isPackagingAvailable === true && (
                            <p className="text-green-600">نوع التعبئة متاح في المخزن</p>
                          )}
                        </div>
                        <div>
                          {item.packaging_type_id && item.available_quantity > 0 && (
                            <p className="text-green-600">متاح: {item.available_quantity}</p>
                          )}
                          {item.packaging_type_id && (!item.available_quantity || item.available_quantity === 0) && item.isPackagingAvailable !== true && (
                            <p className="text-red-500">لا توجد كمية متاحة</p>
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
                );
              })}

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
            </div>
          )}
        </div>
        )}

        {/* Notes and Order Discount */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700">
              ملاحظات الأمر
            </label>
            <textarea
              rows={3}
              value={formData.sales_orders_notes}
              onChange={(e) => setFormData({ ...formData, sales_orders_notes: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="ملاحظات إضافية..."
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="sales_orders_discount_amount" className="block text-sm font-medium text-gray-700">
              خصم اجمالى على الطلب
            </label>
            <NumberInput
              value={String(formData.sales_orders_discount_amount ?? '')}
              onChange={(v) => setFormData({ ...formData, sales_orders_discount_amount: parseFloat(v || '0') || 0 })}
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Order Total Display */}
        {formData.sales_order_items.length > 0 && (
          <div className="mt-6 p-4 bg-gray-100 rounded-md shadow-inner">
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
          
          {/* Show approve/reject buttons if status is Pending */}
          {formData.sales_orders_status === 'Pending' ? (
            <>
              <button
                type="button"
                onClick={() => setConfirmDialog({ isOpen: true, action: 'reject' })}
                disabled={loading || formData.sales_order_items.length === 0}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {loading ? 'جاري المعالجة...' : 'رفض'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDialog({ isOpen: true, action: 'approve' })}
                disabled={loading || formData.sales_order_items.length === 0}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {loading ? 'جاري المعالجة...' : 'موافقة'}
              </button>
            </>
          ) : formData.sales_orders_status === 'Draft' ? (
            /* Show cancel/create invoice buttons if status is Draft */
            <>
              <button
                type="button"
                onClick={() => setConfirmDialog({ isOpen: true, action: 'cancel' })}
                disabled={loading || formData.sales_order_items.length === 0}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {loading ? 'جاري المعالجة...' : 'إلغاء الأمر'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDialog({ isOpen: true, action: 'create_invoice' })}
                disabled={loading || formData.sales_order_items.length === 0}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {loading ? 'جاري المعالجة...' : 'إنشاء فاتورة'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || formData.sales_order_items.length === 0}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'جاري التحديث...' : 'تحديث الأمر'}
            </button>
          )}
        </div>
      </form>

      {/* Confirmation Dialog for Approve/Reject/Cancel/Create Invoice */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        title={
          confirmDialog.action === 'approve' ? 'تأكيد الموافقة' :
          confirmDialog.action === 'reject' ? 'تأكيد الرفض' :
          confirmDialog.action === 'cancel' ? 'تأكيد إلغاء الأمر' :
          confirmDialog.action === 'create_invoice' ? 'تأكيد إنشاء الفاتورة' :
          'تأكيد'
        }
        message={
          confirmDialog.action === 'approve' 
            ? 'هل أنت متأكد من الموافقة على أمر البيع؟ سيتم تحديث حالة الأمر إلى "مُعتمد".' 
            : confirmDialog.action === 'reject'
            ? 'هل أنت متأكد من رفض أمر البيع؟ سيتم تحديث حالة الأمر إلى "ملغي".'
            : confirmDialog.action === 'cancel'
            ? 'هل أنت متأكد من إلغاء أمر البيع؟ سيتم تحديث حالة الأمر إلى "ملغي".'
            : confirmDialog.action === 'create_invoice'
            ? 'هل أنت متأكد من إنشاء فاتورة لهذا الأمر؟ سيتم تحديث حالة الأمر إلى "تم إصدار الفاتورة".'
            : ''
        }
        confirmText={
          confirmDialog.action === 'approve' ? 'موافقة' :
          confirmDialog.action === 'reject' ? 'رفض' :
          confirmDialog.action === 'cancel' ? 'إلغاء الأمر' :
          confirmDialog.action === 'create_invoice' ? 'إنشاء فاتورة' :
          'تأكيد'
        }
        cancelText="إلغاء"
        danger={confirmDialog.action === 'reject' || confirmDialog.action === 'cancel'}
        onConfirm={() => {
          const newStatus = 
            confirmDialog.action === 'approve' ? 'Approved' :
            confirmDialog.action === 'reject' ? 'Cancelled' :
            confirmDialog.action === 'cancel' ? 'Cancelled' :
            confirmDialog.action === 'create_invoice' ? 'Invoiced' :
            formData.sales_orders_status;
          
          // Update the form data with new status
          const updatedFormData = { ...formData, sales_orders_status: newStatus };
          setFormData(updatedFormData);
          setConfirmDialog({ isOpen: false, action: null });
          
          // Submit with the updated status
          setTimeout(() => {
            // Validate that we have items
            if (updatedFormData.sales_order_items.length === 0) {
              alert('يجب إضافة عنصر واحد على الأقل للطلب');
              return;
            }
            
            // Check for empty items
            const emptyItems = updatedFormData.sales_order_items.filter(item => !item.variant_id || !item.packaging_type_id);
            if (emptyItems.length > 0) {
              alert(`يوجد ${emptyItems.length} منتج فارغ لم يتم اختياره.\n\nيرجى إما:\n• اختيار المنتج والتعبئة لكل عنصر\n• أو حذف العناصر الفارغة قبل الحفظ`);
              return;
            }
            
            const itemsToSubmit = updatedFormData.sales_order_items.map((item) => ({
              sales_order_items_variant_id: item.variant_id,
              sales_order_items_packaging_type_id: item.packaging_type_id,
              sales_order_items_quantity: item.quantity_ordered || item.sales_order_items_quantity,
              sales_order_items_unit_price: item.unit_cost || item.sales_order_items_unit_price,
              sales_order_items_subtotal: (parseFloat(item.quantity_ordered || item.sales_order_items_quantity || 0) * parseFloat(item.unit_cost || item.sales_order_items_unit_price || 0)).toFixed(2),
              sales_order_items_discount_amount: ((parseFloat(item.discount_amount || item.sales_order_items_discount_amount || 0) || 0) * (parseFloat(item.quantity_ordered || item.sales_order_items_quantity || 0) || 0)).toFixed(2),
              sales_order_items_tax_amount: Number(calculateItemTotals(item).tax_amount || 0).toFixed(2),
              sales_order_items_tax_rate: item.tax_rate || item.sales_order_items_tax_rate || 0,
              sales_order_items_has_tax: item.has_tax || item.sales_order_items_has_tax || false,
              sales_order_items_total_price: calculateItemTotals(item).total,
              sales_order_items_notes: item.item_notes || item.sales_order_items_notes || null,
              original_unit_price: item.original_unit_price || null,
              original_tax_rate: item.original_tax_rate || null,
            }));
            
            // Calculate totals
            const subtotal = updatedFormData.sales_order_items.reduce((total, item) => {
              const quantity = parseFloat(item.quantity_ordered || item.sales_order_items_quantity) || 0;
              const unitCost = parseFloat(item.unit_cost || item.sales_order_items_unit_price) || 0;
              return total + (quantity * unitCost);
            }, 0);

            const itemsDiscountTotal = updatedFormData.sales_order_items.reduce((total, item) => {
              return total + (parseFloat(item.discount_amount || item.sales_order_items_discount_amount) || 0);
            }, 0);

            const orderDiscount = parseFloat(updatedFormData.sales_orders_discount_amount) || 0;
            const totalDiscount = itemsDiscountTotal + orderDiscount;
            const afterDiscount = Math.max(0, subtotal - totalDiscount);
            
            const itemsTaxTotal = updatedFormData.sales_order_items.reduce((total, item) => {
              return total + (parseFloat(item.tax_amount || item.sales_order_items_tax_amount) || 0);
            }, 0);
            
            // Tax is already calculated in items, no need to add order-level tax
            const totalTax = itemsTaxTotal;
            const grandTotal = afterDiscount + totalTax;
            
            // Transform data to match API expectations
            const transformedData = {
              sales_orders_id: order?.sales_orders_id || order?.id,
              sales_orders_client_id: updatedFormData.sales_orders_client_id,
              sales_orders_order_date: resolveOrderDateForSubmission(updatedFormData.sales_order_date),
              sales_orders_status: newStatus,
              sales_orders_delivery_status: updatedFormData.sales_orders_delivery_status,
              sales_orders_notes: updatedFormData.sales_orders_notes,
              sales_orders_warehouse_id: updatedFormData.sales_orders_warehouse_id,
              sales_orders_representative_id: updatedFormData.sales_orders_representative_id,
              representative_id: updatedFormData.sales_orders_representative_id,
              sales_orders_expected_delivery_date: updatedFormData.sales_orders_expected_delivery_date || null,
              sales_orders_subtotal: subtotal.toFixed(2),
              sales_orders_discount_amount: updatedFormData.sales_orders_discount_amount,
              sales_orders_tax_amount: totalTax.toFixed(2), // Use calculated tax, not old formData value
              sales_orders_total_amount: grandTotal.toFixed(2),
              items: itemsToSubmit
            };
            
            onSubmit(transformedData);
          }, 0);
        }}
        onCancel={() => setConfirmDialog({ isOpen: false, action: null })}
      />
    </div>
  );
}
