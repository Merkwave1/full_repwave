import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { MagnifyingGlassIcon, XMarkIcon, FunnelIcon, CubeIcon } from '@heroicons/react/24/outline';

import { addInventory, updateInventory, repackInventory, markInventoryRemoved } from '../../../../../apis/inventory'; // Import repackInventory and markInventoryRemoved
// Import the getApp* functions from auth.js
import { getAppProducts, getAppWarehouses, getAppPackagingTypes, getAppBaseUnits, getAppInventory, invalidateInventoryCache } from '../../../../../apis/auth';

import AddInventoryForm from './AddInventoryForm';
import UpdateInventoryForm from './UpdateInventoryForm';
import InventoryDetailsModal from './InventoryDetailsModal';
import DeleteConfirmationModal from '../../../../common/DeleteConfirmationModal';
import Loader from '../../../../common/Loader/Loader';
import Alert from '../../../../common/Alert/Alert';
import CustomPageHeader from '../../../../common/CustomPageHeader/CustomPageHeader';
import ProductInventorySummary from './ProductInventorySummary.jsx';
import ProductInventoryDetailsModal from './ProductInventoryDetailsModal.jsx';
import PackagingTypesTab from '../packaging_types/PackagingTypesTab';
import RepackModal from './RepackModal'; // NEW: Import RepackModal
import FilterBar from '../../../../common/FilterBar/FilterBar';

function InventoryTab() {
  // Global toggle to allow/disallow direct inventory mutations from this UI (per new requirement to remove add/edit capability)
  const ALLOW_INVENTORY_MUTATIONS = false;
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();
  const [allInventoryItems, setAllInventoryItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [baseUnits, setBaseUnits] = useState([]);
  const [packagingTypes, setPackagingTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState('list');
  const [selectedInventory, setSelectedInventory] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isInventoryDetailsModalOpen, setIsInventoryDetailsModalOpen] = useState(false);
  const [isRepackModalOpen, setIsRepackModalOpen] = useState(false); // NEW: State for Repack Modal
  const [selectedItemForRepack, setSelectedItemForRepack] = useState(null); // NEW: State for item to repack
  // Always use product summary view; toggle removed
  const [productDetailsModalOpen, setProductDetailsModalOpen] = useState(false);
  const [selectedProductForDetails, setSelectedProductForDetails] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState('');
  const [selectedVariantFilter, setSelectedVariantFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  // Removed cache info; we will fetch fresh on entry

  const loadSupportingData = useCallback(async (forceApiRefresh = false) => {
    try {
      // Use getApp* functions from auth.js for consistent caching and fetching logic
      const [productsData, warehousesData, unitsData, packagingTypesData] = await Promise.all([
        getAppProducts(forceApiRefresh), // Use getAppProducts
        getAppWarehouses(forceApiRefresh), // Use getAppWarehouses
        getAppBaseUnits(forceApiRefresh), // Use getAppBaseUnits
        getAppPackagingTypes(forceApiRefresh), // Use getAppPackagingTypes
      ]);
      setProducts(productsData?.data || []);
      setWarehouses(warehousesData?.data || []);
      setBaseUnits(unitsData?.data || []);
      setPackagingTypes(packagingTypesData?.data || []);
    } catch (err) {
      console.error("Failed to load supporting data:", err);
      setError('فشل في تحميل البيانات الأساسية: ' + (err.message || 'خطأ غير معروف'));
    }
  }, []);

  // Always fetch inventory via API when requested; keep it simple
  const loadInventoryData = useCallback(async (force = false) => {
    setError(null);
    try {
      if (force) setLoading(true);
      const inventoryArray = await getAppInventory(force);
      setAllInventoryItems(Array.isArray(inventoryArray) ? inventoryArray : []);
    } catch (err) {
      console.error("Failed to load inventory data:", err);
      setError('فشل في تحميل بيانات المخزون: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Removed manual refresh handler/button

  // Initial load: supporting data + inventory (force fresh on entry)
  useEffect(() => {
    let isMounted = true;
    const initialLoad = async () => {
      setLoading(true);
      await loadSupportingData(false); // cached unless needed
      await loadInventoryData(true); // force fresh fetch on entry
      if (isMounted) {
        setLoading(false);
      }
    };
    initialLoad();
    return () => { isMounted = false; };
  }, [loadSupportingData, loadInventoryData]);

  useEffect(() => {
    const refreshThisTab = async () => {
      await loadSupportingData(true);
      await loadInventoryData(true); // force
    };
    setChildRefreshHandler(() => refreshThisTab);
    return () => {
      setChildRefreshHandler(null);
    };
  }, [setChildRefreshHandler, loadSupportingData, loadInventoryData]);

  const enrichedInventory = useMemo(() => {
    // Add console logs here to see the state of these arrays

    // IMPORTANT: If any of these core data sets are empty, the enrichment cannot happen correctly.
    // We should not proceed with enrichment if essential data is missing.
    if (!allInventoryItems.length) {
        return [];
    }
    if (!products.length) {
        // Optionally, return a partial enrichment or an empty array
        return []; 
    }
    if (!warehouses.length) {
        return [];
    }
    if (!packagingTypes.length) {
        return [];
    }

    // Ensure allInventoryItems is an array before using .map()
    if (!Array.isArray(allInventoryItems)) {
        return [];
    }

  return allInventoryItems.map(item => {
        const product = products.find(p => p.products_id === item.products_id);
        // Ensure that product?.variants is an array before calling find
        const variant = product?.variants && Array.isArray(product.variants) 
                                ? product.variants.find(v => v.variant_id === item.variant_id) 
                                : undefined;
        
    // Build variant_display_name using only the variant name (hide product name)
    let variantDisplayName;
    if (product && variant) {
      variantDisplayName = variant.variant_name; // only variant name
    } else if (product) {
      variantDisplayName = product.products_name; // fallback when no variant exists
    } else {
      variantDisplayName = 'Unknown Product/Variant';
    }
        
        // FIX: Explicitly define foundWarehouse and its derived properties
        const foundWarehouse = Array.isArray(warehouses) ? warehouses.find(w => w.warehouse_id === item.warehouse_id) : undefined;
        const warehouseName = foundWarehouse?.warehouse_name || 'Unknown Warehouse';
        const warehouseCode = foundWarehouse?.warehouse_code || '';

  const packagingType = packagingTypes.find(pt => pt.packaging_types_id === item.packaging_type_id);
  const resolvedProductId = item.products_id || variant?.variant_products_id;
  const resolvedProduct = resolvedProductId ? products.find(p => p.products_id === resolvedProductId) : product;
        
        return {
            ...item,
            products_name: (resolvedProduct || product)?.products_name,
            products_id: resolvedProductId || item.products_id,
            warehouse_name: warehouseName, // Use the safely derived name
            warehouse_code: warehouseCode, // Use the safely derived code
            variant_display_name: variantDisplayName, // Now consistently formatted
            packaging_type_name: packagingType?.packaging_types_name || 'Unknown Packaging',
            packaging_quantity: packagingType?.packaging_types_default_conversion_factor || 1,
            // Add products_unit_of_measure_id to the item for RepackModal to use
            products_unit_of_measure_id: product?.products_unit_of_measure_id,
        };
    });
  }, [allInventoryItems, products, warehouses, packagingTypes]);
  
  const filteredInventoryItems = useMemo(() => {
    let currentFiltered = enrichedInventory;

    if (selectedWarehouseFilter) {
  currentFiltered = currentFiltered.filter(item => String(item.warehouse_id ?? '') === String(selectedWarehouseFilter));
    }
    
    // This comparison now works correctly as variant_display_name is consistently formatted
    if (selectedVariantFilter) {
      currentFiltered = currentFiltered.filter(item => item.variant_display_name === selectedVariantFilter);
    }

    if (selectedStatusFilter) {
      // Compare against derived status computed from thresholds
      let lowThreshold; let outThreshold = 0;
      try {
        const cached = localStorage.getItem('appSettingsCategorized');
        if (cached) {
          const categorized = JSON.parse(cached);
          const inv = categorized?.inventory || [];
          const low = inv.find(s => s.settings_key === 'low_stock_threshold');
          const out = inv.find(s => s.settings_key === 'out_of_stock_threshold');
          if (low && low.settings_value !== undefined) lowThreshold = parseFloat(low.settings_value);
          if (out && out.settings_value !== undefined) outThreshold = parseFloat(out.settings_value);
        }
      } catch { /* noop */ }
      currentFiltered = currentFiltered.filter(item => {
        const packaging = packagingTypes.find(pt => pt.packaging_types_id === item.packaging_type_id);
        const factor = parseFloat(packaging?.packaging_types_default_conversion_factor) || 1;
        const qty = parseFloat(item.inventory_quantity) || 0;
        const totalBase = qty * factor;
        const outT = outThreshold ?? 0;
        const lowT = lowThreshold;
        let derived = 'In Stock';
        if (totalBase <= outT) derived = 'Out of Stock';
        else if (lowT !== undefined && lowT !== null && totalBase <= lowT) derived = 'Low Stock';
        return String(derived).toLowerCase() === String(selectedStatusFilter).toLowerCase();
      });
    }

    const term = searchTerm.trim().toLowerCase();
    if (term) {
      currentFiltered = currentFiltered.filter(item =>
        item.variant_display_name?.toLowerCase().includes(term) ||
        item.warehouse_name?.toLowerCase().includes(term) ||
        item.warehouse_code?.toLowerCase().includes(term) ||
        item.inventory_status?.toLowerCase().includes(term)
      );
    }

    return currentFiltered;
  }, [enrichedInventory, searchTerm, selectedWarehouseFilter, selectedVariantFilter, selectedStatusFilter, packagingTypes]);

  // (previously: productRowsCount) - removed because header now shows totalVariantsCount

  // (previously: totalOptionsCount) — removed because header now shows total entries instead

  // Total number of inventory entries after current filters
  const totalEntriesCount = useMemo(() => {
    if (!Array.isArray(filteredInventoryItems) || filteredInventoryItems.length === 0) return 0;
    return filteredInventoryItems.length;
  }, [filteredInventoryItems]);

  // Total number of distinct variants/options after current filters
  const totalVariantsCount = useMemo(() => {
    if (!Array.isArray(filteredInventoryItems) || filteredInventoryItems.length === 0) return 0;
    const set = new Set();
    for (const item of filteredInventoryItems) {
      // prefer variant_id when available, otherwise use variant_display_name
      const key = item.variant_id ? `v:${item.variant_id}` : `vd:${item.variant_display_name || item.products_id}`;
      if (key) set.add(key);
    }
    return set.size;
  }, [filteredInventoryItems]);

  const handleAddInventory = async (newItemData) => {
    setLoading(true);
    try {
      await addInventory(newItemData);
      setGlobalMessage({ type: 'success', message: 'تم إضافة عنصر المخزون بنجاح!' });
      setCurrentView('list');
      await loadInventoryData(); // Fetch fresh data after adding
    } catch (err) {
      setGlobalMessage({ type: 'error', message: err.message || 'فشل في إضافة عنصر المخزون.' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateInventory = async (updatedItemData) => {
    setLoading(true);
    try {
      await updateInventory(updatedItemData.inventory_id, updatedItemData);
      setGlobalMessage({ type: 'success', message: 'تم تحديث عنصر المخزون بنجاح!' });
      setCurrentView('list');
      await loadInventoryData(); // Fetch fresh data after updating
    } catch (err) {
      setGlobalMessage({ type: 'error', message: err.message || 'فشل في تحديث عنصر المخزون.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInventory = async () => {
    if (!selectedInventory) return;
    setDeleteLoading(true);
    try {
      // Instead of deleting, mark the inventory row as Removed and set production date to 0000-00-00
      await markInventoryRemoved(selectedInventory.inventory_id);
      setGlobalMessage({ type: 'success', message: 'تم تحديث حالة عنصر المخزون إلى "Removed" بنجاح!' });
      setCurrentView('list');
      setSelectedInventory(null);
      await loadInventoryData(); // Fetch fresh data after deleting
    } catch (err) {
      setGlobalMessage({ type: 'error', message: err.message || 'فشل في حذف عنصر المخزون.' });
    } finally {
      setDeleteLoading(false);
    }
  };

  // New: delete by ID for inline deletion from product details modal
  const handleDeleteInventoryById = async (inventoryId) => {
    if (!inventoryId) return;
    try {
      await markInventoryRemoved(inventoryId);
      setGlobalMessage({ type: 'success', message: 'تم تحديث حالة عنصر المخزون إلى "Removed" بنجاح!' });
      try { invalidateInventoryCache && invalidateInventoryCache(); } catch { /* noop */ }
      await loadInventoryData(true);
    } catch (err) {
      setGlobalMessage({ type: 'error', message: err.message || 'فشل في حذف عنصر المخزون.' });
    }
  };

  // Note: repack modal is opened via ProductInventoryDetailsModal callbacks

  const handleRepackConfirm = async (repackData) => { // NEW: Handler for confirming repack
    setLoading(true); // Show loader for repack operation
    try {
      const message = await repackInventory(repackData);
      setGlobalMessage({ type: 'success', message: message || 'تم التحويل بنجاح!' });
      setIsRepackModalOpen(false); // Close modal
      setSelectedItemForRepack(null); // Clear selected item
  // Ensure UI reflects latest quantities: invalidate cache and force a fresh load
  try { invalidateInventoryCache && invalidateInventoryCache(); } catch { /* noop */ }
  await loadInventoryData(true); // force
    } catch (err) {
      setGlobalMessage({ type: 'error', message: err.message || 'فشل في التحويل.' });
    } finally {
      setLoading(false);
    }
  };

  // openInventoryDetailsModal is not used in current flow

  const closeInventoryDetailsModal = () => {
    setIsInventoryDetailsModalOpen(false);
    setSelectedInventory(null);
  };

  const warehouseOptions = useMemo(() => [
    { value: '', label: 'كل المخازن' },
    ...warehouses.map(w => ({ value: String(w.warehouse_id), label: `${w.warehouse_name} (${w.warehouse_code})` }))
  ], [warehouses]);

  const variantOptions = useMemo(() => {
    const variants = new Map();
    products.forEach(product => {
      if (Array.isArray(product.variants) && product.variants.length > 0) {
        product.variants.forEach(variant => {
          // Construct the display name for the variant
          const label = `${variant.variant_name}`; // only variant name
          // Set the value to the display name string for direct comparison
          variants.set(label, { value: label, label: label });
        });
      } else {
        // If product has no variants, include the product itself as an option
        const label = product.products_name;
        // Set the value to the product name string for direct comparison
        variants.set(label, { value: label, label: label });
      }
    });
    return [{ value: '', label: 'كل الخيارات' }, ...Array.from(variants.values())];
  }, [products]); // Dependency on products

  const statusOptions = useMemo(() => {
    // Derive statuses using thresholds and packaging conversion
    let lowThreshold; let outThreshold = 0;
    try {
      const cached = localStorage.getItem('appSettingsCategorized');
      if (cached) {
        const categorized = JSON.parse(cached);
        const inv = categorized?.inventory || [];
        const low = inv.find(s => s.settings_key === 'low_stock_threshold');
        const out = inv.find(s => s.settings_key === 'out_of_stock_threshold');
        if (low && low.settings_value !== undefined) lowThreshold = parseFloat(low.settings_value);
        if (out && out.settings_value !== undefined) outThreshold = parseFloat(out.settings_value);
      }
    } catch { /* noop */ }

    if (!Array.isArray(allInventoryItems) || allInventoryItems.length === 0) {
      return [{ value: '', label: 'كل الحالات' }];
    }

    const statuses = new Set();
    for (const item of allInventoryItems) {
      const packaging = packagingTypes.find(pt => pt.packaging_types_id === item.packaging_type_id);
      const factor = parseFloat(packaging?.packaging_types_default_conversion_factor) || 1;
      const qty = parseFloat(item.inventory_quantity) || 0;
      const totalBase = qty * factor;
      const outT = outThreshold ?? 0;
      const lowT = lowThreshold;
      if (totalBase <= outT) statuses.add('Out of Stock');
      else if (lowT !== undefined && lowT !== null && totalBase <= lowT) statuses.add('Low Stock');
      else statuses.add('In Stock');
    }

    return [{ value: '', label: 'كل الحالات' }, ...Array.from(statuses).map(s => ({ value: s, label: s }))];
  }, [allInventoryItems, packagingTypes]);

  const selectFilters = useMemo(() => [
    {
      key: 'warehouse',
      options: warehouseOptions,
      value: selectedWarehouseFilter,
      onChange: setSelectedWarehouseFilter,
      placeholder: 'اختر مخزن...'
    },
    {
      key: 'variant',
      options: variantOptions,
      value: selectedVariantFilter,
      onChange: setSelectedVariantFilter,
      placeholder: 'اختر منتج...'
    },
    {
      key: 'status',
      options: statusOptions,
      value: selectedStatusFilter,
      onChange: setSelectedStatusFilter,
      placeholder: 'اختر حالة...'
    }
  ], [warehouseOptions, variantOptions, statusOptions, selectedWarehouseFilter, selectedVariantFilter, selectedStatusFilter]);

  const activeChips = useMemo(() => {
    const chips = [];
    if (selectedWarehouseFilter) {
      const option = warehouseOptions.find(o => o.value === selectedWarehouseFilter);
      if (option) chips.push({ key: 'warehouse', label: 'المخزن', value: option.label, onRemove: () => setSelectedWarehouseFilter('') });
    }
    if (selectedVariantFilter) {
      const option = variantOptions.find(o => o.value === selectedVariantFilter);
      if (option) chips.push({ key: 'variant', label: 'الخيار', value: option.label, onRemove: () => setSelectedVariantFilter('') });
    }
    if (selectedStatusFilter) {
      const option = statusOptions.find(o => o.value === selectedStatusFilter);
      if (option) chips.push({ key: 'status', label: 'الحالة', value: option.label, onRemove: () => setSelectedStatusFilter('') });
    }
    return chips;
  }, [selectedWarehouseFilter, selectedVariantFilter, selectedStatusFilter, warehouseOptions, variantOptions, statusOptions]);

  const handleClearAll = () => {
    setSearchTerm('');
    setSelectedWarehouseFilter('');
    setSelectedVariantFilter('');
    setSelectedStatusFilter('');
  };

  const renderContent = () => {
    // Check if essential supporting data is loaded and available
    const isSupportingDataReady = products.length > 0 && warehouses.length > 0 && packagingTypes.length > 0;

    switch (currentView) {
      case 'add': 
        if (!isSupportingDataReady) {
          return (
            <div className="text-center text-gray-600 mt-8">
              <p>جاري تحميل البيانات الأساسية لإضافة عنصر مخزون...</p>
              <Loader className="mt-4" />
              {/* Provide more specific alerts if data is empty after loading */}
              {products.length === 0 && <Alert type="warning" message="لا توجد منتجات متاحة. يرجى إضافة منتجات أولاً." className="mt-4" />}
              {warehouses.length === 0 && <Alert type="warning" message="لا توجد مخازن متاحة. يرجى إضافة مخازن أولاً." className="mt-4" />}
              {packagingTypes.length === 0 && <Alert type="warning" message="لا توجد أنواع تعبئة متاحة. يرجى إضافة أنواع تعبئة أولاً." className="mt-4" />}
            </div>
          );
        }
        return <AddInventoryForm onAdd={handleAddInventory} onCancel={() => setCurrentView('list')} products={products} warehouses={warehouses} packagingTypes={packagingTypes} />;
      case 'edit': 
        if (!isSupportingDataReady || !selectedInventory) {
          return (
            <div className="text-center text-gray-600 mt-8">
              <p>جاري تحميل البيانات الأساسية لتعديل عنصر المخزون...</p>
              <Loader className="mt-4" />
            </div>
          );
        }
        return <UpdateInventoryForm inventory={selectedInventory} onUpdate={handleUpdateInventory} onCancel={() => setCurrentView('list')} products={products} warehouses={warehouses} packagingTypes={packagingTypes} />;
      case 'deleteConfirm': return (
        <DeleteConfirmationModal
          isOpen={true}
          onClose={() => { setCurrentView('list'); setSelectedInventory(null); }}
          onConfirm={handleDeleteInventory}
          message={`هل أنت متأكد أنك تريد حذف عنصر المخزون للمنتج "${selectedInventory?.variant_display_name}" في المخزن "${selectedInventory?.warehouse_name}"؟`}
          itemName={`${selectedInventory?.variant_display_name} (${selectedInventory?.warehouse_name})`}
          deleteLoading={deleteLoading}
        />
      );
      case 'details': return (
        <InventoryDetailsModal
          isOpen={isInventoryDetailsModalOpen}
          onClose={closeInventoryDetailsModal}
          inventory={selectedInventory}
        />
      );
      case 'managePackagingTypes':
        return <PackagingTypesTab />;
      case 'list':
      default: return (
        <>
          <CustomPageHeader
            title="إدارة المخزون"
            subtitle="إدارة مخزون المنتجات في المخازن"
            icon={<CubeIcon className="h-8 w-8 text-white" />}
            statValue={totalVariantsCount}
            statLabel="المنتجات"
            statSecondaryValue={totalEntriesCount}
            statSecondaryLabel="الخيارات"
          />
          <FilterBar
            searchConfig={{ value: searchTerm, onChange: setSearchTerm, placeholder: 'ابحث عن عنصر مخزون...', searchWhileTyping: true }}
            selectFilters={selectFilters}
            activeChips={activeChips}
            onClearAll={handleClearAll}
            className="mb-6"
          />
          {ALLOW_INVENTORY_MUTATIONS && (
            <div className="flex justify-end mb-6">
              <button onClick={() => setCurrentView('add')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow-md">
                إضافة عنصر مخزون
              </button>
            </div>
          )}
          {loading && <Loader className="mt-8" />}
          {error && <Alert message={error} type="error" className="mb-4" />}
          {!loading && !error && (
            <ProductInventorySummary
              inventoryItems={filteredInventoryItems}
              enrichedInventory={enrichedInventory}
              products={products}
              packagingTypes={packagingTypes}
              baseUnits={baseUnits}
              searchTerm={searchTerm}
              onShowDetails={(payload)=> {
                // payload: { product, variantId }
                setSelectedProductForDetails(payload?.product || null);
                // store variant id in selectedInventory to pass to details modal via filters
                setProductDetailsModalOpen(true);
                // we can pass the variant id through selectedProductForDetails or via a dedicated state;
                // reuse selectedProductForDetails and pass filters when opening the modal below
                // store the variant id in temporary state on the product object
                if (payload?.variantId) {
                  // attach a temp property for the modal to read
                  const augmented = { ...(payload.product || {}), __selectedVariantId: payload.variantId };
                  setSelectedProductForDetails(augmented);
                }
              } }
            />
          )}
  {/* Detailed list view removed; always show product summary */}
        </>
      );
    }
  };

  return (
    <div className="p-4" dir="rtl">
      {renderContent()}
      {/* NEW: Repack Modal */}
      {isRepackModalOpen && selectedItemForRepack && (
        <RepackModal
          isOpen={isRepackModalOpen}
          onClose={() => setIsRepackModalOpen(false)}
          onRepackConfirm={handleRepackConfirm}
          inventoryItem={selectedItemForRepack}
          packagingTypes={packagingTypes}
          baseUnits={baseUnits}
        />
      )}
      {isInventoryDetailsModalOpen && selectedInventory && (
        <InventoryDetailsModal
          isOpen={isInventoryDetailsModalOpen}
          onClose={closeInventoryDetailsModal}
          inventory={selectedInventory}
        />
      )}
    {productDetailsModalOpen && selectedProductForDetails && (
        <ProductInventoryDetailsModal
          isOpen={productDetailsModalOpen}
          onClose={()=> { setProductDetailsModalOpen(false); setSelectedProductForDetails(null); }}
          product={selectedProductForDetails}
          inventoryItems={filteredInventoryItems}
          packagingTypes={packagingTypes}
          warehouses={warehouses}
          baseUnits={baseUnits}
          filters={{
            warehouse: selectedWarehouseFilter ? warehouses.find(w=> String(w.warehouse_id) === String(selectedWarehouseFilter))?.warehouse_name : null,
            variant: selectedVariantFilter || null,
            status: selectedStatusFilter || null,
            search: searchTerm || null
          }}
          onRepack={handleRepackConfirm}
          onDeleteInventory={handleDeleteInventoryById}
        />
      )}
    </div>
  );
}

export default InventoryTab;
