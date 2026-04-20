import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { MagnifyingGlassIcon, XMarkIcon, FunnelIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';

// APIs
import { getAllProducts, addProduct, updateProduct, deleteProduct } from '../../../../apis/products';
// Note: Using localStorage for supporting data instead of API calls

// View components
import ProductsListView from './ProductsListView';
import CustomPageHeader from '../../../common/CustomPageHeader/CustomPageHeader';
import FilterBar from '../../../common/FilterBar/FilterBar';
import AddProductForm from './AddProductForm';
import UpdateProductForm from './UpdateProductForm';
import DeleteConfirmationModal from '../../../common/DeleteConfirmationModal';
import ProductDetailsModal from './ProductDetailsModal';
import Loader from '../../../common/Loader/Loader';
import Alert from '../../../common/Alert/Alert';

function ProductsTab() {
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [productAttributes, setProductAttributes] = useState([]);
  const [baseUnits, setBaseUnits] = useState([]);
  const [packagingTypes, setPackagingTypes] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addFormError, setAddFormError] = useState(null);

  // Helper function to load data from localStorage
  const loadDataFromStorage = useCallback(() => {
    try {
      const storedCategories = localStorage.getItem('appCategories');
      const storedProductAttributes = localStorage.getItem('appProductAttributes');
      const storedBaseUnits = localStorage.getItem('appBaseUnits');
      const storedPackagingTypes = localStorage.getItem('appPackagingTypes');
      const storedSuppliers = localStorage.getItem('appSuppliers');

      if (storedCategories) {
        const categoriesData = JSON.parse(storedCategories);
        if (Array.isArray(categoriesData)) {
          setCategories(categoriesData);
        } else {
          setCategories(categoriesData?.categories || categoriesData?.data || []);
        }
      }

      if (storedProductAttributes) {
        const attributesData = JSON.parse(storedProductAttributes);
        if (Array.isArray(attributesData)) {
          setProductAttributes(attributesData);
        } else {
          setProductAttributes(attributesData?.product_attributes || attributesData?.data || []);
        }
      }

      if (storedBaseUnits) {
        const baseUnitsData = JSON.parse(storedBaseUnits);
        if (Array.isArray(baseUnitsData)) {
          setBaseUnits(baseUnitsData);
        } else {
          setBaseUnits(baseUnitsData?.base_units || baseUnitsData?.data || []);
        }
      }

      if (storedPackagingTypes) {
        const packagingData = JSON.parse(storedPackagingTypes);
        if (Array.isArray(packagingData)) {
          setPackagingTypes(packagingData);
        } else {
          setPackagingTypes(packagingData?.packaging_types || packagingData?.data || []);
        }
      }

      if (storedSuppliers) {
        const suppliersData = JSON.parse(storedSuppliers);
        if (Array.isArray(suppliersData)) {
          setSuppliers(suppliersData);
        } else {
          setSuppliers(suppliersData?.suppliers || suppliersData?.data || []);
        }
      }
    } catch (error) {
      console.error('Error loading data from localStorage:', error);
    }
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState('');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState('');

  const [currentView, setCurrentView] = useState('list-products');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const loadSupportData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Load supporting data from localStorage first
      loadDataFromStorage();
      
      // Only fetch products from API
      const productsResponse = await getAllProducts();
      setProducts(productsResponse.products || []);
    } catch (e) {
      setError('فشل في تحميل البيانات المساندة للمنتجات');
      setGlobalMessage({ type: 'error', message: e.message || e });
    } finally {
      setLoading(false);
    }
  }, [setGlobalMessage, loadDataFromStorage]);

  useEffect(() => {
    loadSupportData();
  }, [loadSupportData]);

  useEffect(() => {
    setChildRefreshHandler(() => loadSupportData());
    return () => setChildRefreshHandler(null);
  }, [setChildRefreshHandler, loadSupportData]);

  const handleAddProduct = async (data) => {
    setLoading(true);
    // Clear previous form-level errors
    setAddFormError(null);
    try {
      await addProduct(data);
      setGlobalMessage({ type: 'success', message: 'تم إضافة المنتج بنجاح!' });
      setCurrentView('list-products');
      await loadSupportData(); // Reload all data
    } catch (e) {
      // Try to detect SQL/null/validation errors and surface them as field-level errors
      const msg = e && e.message ? String(e.message) : 'فشل في إضافة المنتج.';
      // Example SQL message: "Column 'products_expiry_period_in_days' cannot be null at line 215"
      const colMatch = msg.match(/Column '\s*([^']+?)\s*' cannot be null/i) || msg.match(/Column\s+`([^`]+)`\s+cannot be null/i);
      if (colMatch && colMatch[1]) {
        const column = colMatch[1].trim();
        // Map DB column to form field (most fields use same names)
        const field = column; // default to same name
        // Friendly message overrides
        const friendlyMap = {
          products_expiry_period_in_days: 'فترة الصلاحية (بالأيام)'
        };
        const friendly = friendlyMap[field] || field;
        setAddFormError({ field, message: `${friendly} مطلوب ولا يمكن أن يكون فارغاً.` });
      } else {
        // If backend returned a JSON validation object, try to parse it
        try {
          const parsed = JSON.parse(msg);
          // If parsed is an object with errors, pick first
          if (parsed && typeof parsed === 'object' && (parsed.errors || parsed.validation)) {
            const errorsObj = parsed.errors || parsed.validation;
            const firstKey = Object.keys(errorsObj)[0];
            setAddFormError({ field: firstKey, message: errorsObj[firstKey] || msg });
          }
        } catch {
          // fallback to global message
          setGlobalMessage({ type: 'error', message: msg });
        }
      }
      setGlobalMessage({ type: 'error', message: msg });
      setLoading(false);
    }
  };

  const handleUpdateProduct = async (productId, data) => {
    setLoading(true);
    try {
      await updateProduct(productId, data);
      setGlobalMessage({ type: 'success', message: 'تم تحديث المنتج بنجاح!' });
      setCurrentView('list-products');
      await loadSupportData(); // Reload all data
    } catch (e) {
      setGlobalMessage({ type: 'error', message: e.message || 'فشل في تحديث المنتج.' });
      setLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;
    setLoading(true);
    try {
      await deleteProduct(selectedProduct.products_id);
      setGlobalMessage({ type: 'success', message: 'تم حذف المنتج بنجاح!' });
      setCurrentView('list-products');
      setSelectedProduct(null);
      await loadSupportData(); // Reload all data
    } catch (e) {
      setGlobalMessage({ type: 'error', message: e.message || 'فشل في حذف المنتج.' });
      setLoading(false);
    }
  };

  const uniqueBrands = useMemo(() => {
    const brands = new Set(products.map(p => p.products_brand).filter(Boolean));
    return ['', ...Array.from(brands)];
  }, [products]);

  const totalVariants = useMemo(() => {
    return products.reduce((acc, p) => acc + (Array.isArray(p.variants) ? p.variants.length : 0), 0);
  }, [products]);

  const uniqueSuppliersForFilter = useMemo(() => {
    // Ensure suppliers is always an array
    const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];
    const supplierMap = new Map(safeSuppliers.map(s => [s.supplier_id || s.id, s.supplier_name || s.name]));
    const productSupplierIds = new Set(products.map(p => p.products_supplier_id).filter(Boolean));
    const result = Array.from(productSupplierIds).map(id => ({
        id: id,
        name: supplierMap.get(id) || `المورد #${id}`
    }));
    return [{id: '', name: 'كل الموردين'}, ...result];
  }, [products, suppliers]);

  const filteredProducts = useMemo(() => {
    let currentFiltered = [...products];
    const term = searchTerm.trim().toLowerCase();

    if (term) {
      const getCategoryName = (id) => categories.find(c => c.categories_id == id)?.categories_name || '';
      const getSupplierName = (id) => suppliers.find(s => s.supplier_id == id)?.supplier_name || '';
      currentFiltered = currentFiltered.filter(p => 
        p.products_name?.toLowerCase().includes(term) ||
        p.products_sku?.toLowerCase().includes(term) ||
        p.products_barcode?.toLowerCase().includes(term) ||
        p.products_brand?.toLowerCase().includes(term) ||
        getCategoryName(p.products_category_id)?.toLowerCase().includes(term) ||
        getSupplierName(p.products_supplier_id)?.toLowerCase().includes(term) ||
        p.variants?.some(v => v.variant_name?.toLowerCase().includes(term) || v.variant_sku?.toLowerCase().includes(term))
      );
    }
    if (selectedCategoryFilter) currentFiltered = currentFiltered.filter(p => p.products_category_id == selectedCategoryFilter);
    if (selectedStatusFilter !== '') currentFiltered = currentFiltered.filter(p => p.products_is_active == selectedStatusFilter);
    if (selectedBrandFilter) currentFiltered = currentFiltered.filter(p => p.products_brand === selectedBrandFilter);
    if (selectedSupplierFilter) currentFiltered = currentFiltered.filter(p => p.products_supplier_id == selectedSupplierFilter);

    return currentFiltered;
  }, [products, searchTerm, selectedCategoryFilter, selectedStatusFilter, selectedBrandFilter, selectedSupplierFilter, categories, suppliers]);
  const handleClearAllFilters = useCallback(() => {
    setSelectedCategoryFilter('');
    setSelectedStatusFilter('');
    setSelectedBrandFilter('');
    setSelectedSupplierFilter('');
    setSearchTerm('');
  }, []);

  function renderContent() {
    switch (currentView) {
      case 'add-product':
        if ((!(categories && categories.length > 0)) && loading) return <Loader className="mt-8" />;
        return (
          <AddProductForm
            onAdd={handleAddProduct}
            onCancel={() => setCurrentView('list-products')}
            categories={categories}
            productAttributes={productAttributes}
            baseUnits={baseUnits}
            packagingTypes={packagingTypes}
            suppliers={suppliers}
            addFormError={addFormError}
            setAddFormError={setAddFormError}
          />
        );
      case 'edit-product':
        if ((!(categories && categories.length > 0)) && loading) return <Loader className="mt-8" />;
        return (
          <UpdateProductForm
            product={selectedProduct}
            onUpdate={handleUpdateProduct}
            onCancel={() => setCurrentView('list-products')}
            categories={categories}
            productAttributes={productAttributes}
            baseUnits={baseUnits}
            packagingTypes={packagingTypes}
            suppliers={suppliers}
          />
        );
      case 'deleteConfirm-product':
        return (
          <DeleteConfirmationModal
            isOpen
            onClose={() => setCurrentView('list-products')}
            onConfirm={handleDeleteProduct}
            message={`هل أنت متأكد أنك تريد حذف المنتج "${selectedProduct?.products_name}"؟`}
            deleteLoading={loading}
          />
        );
      case 'view-product':
        return (
          <ProductDetailsModal
            isOpen
            onClose={() => setCurrentView('list-products')}
            product={selectedProduct}
            categories={categories}
            suppliers={suppliers}
          />
        );
      default: { // 'list-products'
        if (loading) return <Loader className="mt-8" />;
        if (error) return <Alert message={error} type="error" className="mb-4" />;
        const selectFilters = [
          {
            key: 'category',
            options: [{ value: '', label: 'كل الفئات' }, ...(categories || []).map(c => ({ value: c.categories_id, label: c.categories_name }))],
            value: selectedCategoryFilter,
            onChange: (v) => setSelectedCategoryFilter(v),
            placeholder: 'الفئة',
            wrapperClassName: 'md:col-span-1',
          },
          {
            key: 'status',
            options: [{ value: '', label: 'كل الحالات' }, { value: '1', label: 'نشط' }, { value: '0', label: 'غير نشط' }],
            value: selectedStatusFilter,
            onChange: (v) => setSelectedStatusFilter(v),
            placeholder: 'الحالة',
          },
          {
            key: 'brand',
            options: [{ value: '', label: 'كل العلامات' }, ...uniqueBrands.filter(b => b !== '').map(b => ({ value: b, label: b }))],
            value: selectedBrandFilter,
            onChange: (v) => setSelectedBrandFilter(v),
            placeholder: 'العلامة التجارية',
          },
          {
            key: 'supplier',
            options: (uniqueSuppliersForFilter || []).map(s => ({ value: s.id, label: s.name })),
            value: selectedSupplierFilter,
            onChange: (v) => setSelectedSupplierFilter(v),
            placeholder: 'المورد',
          }
        ];

  const activeChips = [];
        if (searchTerm) activeChips.push({ key: 'search', label: 'بحث', value: searchTerm, tone: 'indigo', onRemove: () => setSearchTerm('') });
        if (selectedCategoryFilter) activeChips.push({ key: 'category', label: 'الفئة', value: categories.find(c => String(c.categories_id) === String(selectedCategoryFilter))?.categories_name || selectedCategoryFilter, tone: 'blue', onRemove: () => setSelectedCategoryFilter('') });
        if (selectedStatusFilter !== '') activeChips.push({ key: 'status', label: 'الحالة', value: selectedStatusFilter === '1' ? 'نشط' : 'غير نشط', tone: 'green', onRemove: () => setSelectedStatusFilter('') });
        if (selectedBrandFilter) activeChips.push({ key: 'brand', label: 'العلامة', value: selectedBrandFilter, tone: 'purple', onRemove: () => setSelectedBrandFilter('') });
        if (selectedSupplierFilter) activeChips.push({ key: 'supplier', label: 'المورد', value: uniqueSuppliersForFilter.find(s => String(s.id) === String(selectedSupplierFilter))?.name || selectedSupplierFilter, tone: 'teal', onRemove: () => setSelectedSupplierFilter('') });

        return (
          <>
            <CustomPageHeader
              title="إدارة المنتجات"
              subtitle="قائمة المنتجات وإدارتها"
              icon={<ShoppingBagIcon className="h-6 w-6 text-white" />}
              statSecondaryValue={totalVariants}
              statSecondaryLabel="الخيارات"
              statValue={products.length}
              statLabel="المنتجات"
              actionButton={(
                <button onClick={() => setCurrentView('add-product')} className="px-3 py-2 bg-white text-blue-600 rounded-md font-semibold">إضافة منتج</button>
              )}
            />

            <FilterBar
              title="خيارات التصفية"
              searchConfig={{
                value: searchTerm,
                onChange: (v) => setSearchTerm(v),
                searchWhileTyping: true,
                placeholder: 'ابحث عن منتج...'
              }}
              selectFilters={selectFilters}
              activeChips={activeChips}
              onClearAll={handleClearAllFilters}
            />

            <ProductsListView
              products={filteredProducts}
              onEdit={p => { setSelectedProduct(p); setCurrentView('edit-product'); }}
              onDelete={p => { setSelectedProduct(p); setCurrentView('deleteConfirm-product'); }}
              onViewDetails={p => { setSelectedProduct(p); setCurrentView('view-product'); }}
              categories={categories}
              suppliers={suppliers}
              searchTerm={searchTerm}
            />
          </>
        );
      }
    }
  }

  return (
    <div className="p-4" dir="rtl">
      {renderContent()}
    </div>
  );
}

export default ProductsTab;
