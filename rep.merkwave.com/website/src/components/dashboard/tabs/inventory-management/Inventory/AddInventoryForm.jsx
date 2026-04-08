// src/components/dashboard/tabs/inventory-management/Inventory/AddInventoryForm.jsx
import React, { useState, useEffect, useMemo } from 'react';
import NumberInput from '../../../../common/NumberInput/NumberInput.jsx';

function AddInventoryForm({ onAdd, onCancel, products, warehouses, packagingTypes }) {
  const [formData, setFormData] = useState({
    warehouse_id: '',
    products_id: '', // Used to select product first
    variant_id: '', // Then select variant based on product
    packaging_type_id: '',
    inventory_quantity: '',
    inventory_status: 'In Stock', // Default status
  });

  const [selectedProductVariants, setSelectedProductVariants] = useState([]);

  // Effect to update variants and auto-select first variant when a product is selected
  useEffect(() => {
    const selectedProduct = products.find(p => p.products_id === parseInt(formData.products_id));
    if (selectedProduct && Array.isArray(selectedProduct.variants)) {
      setSelectedProductVariants(selectedProduct.variants);
      // Auto-select the first variant if available
      if (selectedProduct.variants.length > 0) {
        setFormData(prev => ({ ...prev, variant_id: selectedProduct.variants[0].variant_id.toString() }));
      } else {
        setFormData(prev => ({ ...prev, variant_id: '' })); // No variants, clear variant_id
      }
    } else {
      setSelectedProductVariants([]);
      setFormData(prev => ({ ...prev, variant_id: '' })); // No product selected or no variants
    }
  }, [formData.products_id, products]);


  // Determine the base unit ID of the currently selected product
  const selectedProductBaseUnitId = useMemo(() => {
    const selectedProduct = products.find(p => p.products_id === parseInt(formData.products_id));
    return selectedProduct ? selectedProduct.products_unit_of_measure_id : null;
  }, [formData.products_id, products]);

  // Filter packaging types based on the selected product's base unit ID
  const filteredPackagingTypes = useMemo(() => {
    if (!selectedProductBaseUnitId) {
      return []; // No product selected, no compatible packaging types
    }
    return packagingTypes.filter(pt =>
      pt.packaging_types_compatible_base_unit_id === selectedProductBaseUnitId
    );
  }, [packagingTypes, selectedProductBaseUnitId]);

  // Effect to auto-select first compatible packaging type
  useEffect(() => {
    if (selectedProductBaseUnitId && filteredPackagingTypes.length > 0) {
      // Auto-select the first compatible packaging type
      setFormData(prev => ({ ...prev, packaging_type_id: filteredPackagingTypes[0].packaging_types_id.toString() }));
    } else {
      // If no compatible types or no product selected, clear packaging_type_id
      setFormData(prev => ({ ...prev, packaging_type_id: '' }));
    }
  }, [filteredPackagingTypes, selectedProductBaseUnitId]);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd(formData);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-xl mx-auto" dir="rtl">
      <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">إضافة عنصر مخزون جديد</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Warehouse Selection */}
        <div>
          <label htmlFor="warehouse_id" className="block text-sm font-medium text-gray-700">
            المخزن
          </label>
          <select
            id="warehouse_id"
            name="warehouse_id"
            value={formData.warehouse_id}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">اختر مخزن</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                {warehouse.warehouse_name} ({warehouse.warehouse_code})
              </option>
            ))}
          </select>
        </div>

        {/* Product Selection */}
        <div>
          <label htmlFor="products_id" className="block text-sm font-medium text-gray-700">
            المنتج
          </label>
          <select
            id="products_id"
            name="products_id"
            value={formData.products_id}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">اختر منتج</option>
            {products.map((product) => (
              <option key={product.products_id} value={product.products_id}>
                {product.products_name}
              </option>
            ))}
          </select>
        </div>

        {/* Variant Selection (conditionally rendered) */}
        {formData.products_id && selectedProductVariants.length > 0 && (
          <div>
            <label htmlFor="variant_id" className="block text-sm font-medium text-gray-700">
              الخيار (Variant)
            </label>
            <select
              id="variant_id"
              name="variant_id"
              value={formData.variant_id}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              {/* Added a default empty option for variants */}
              <option value="">اختر خيار</option>
              {selectedProductVariants.map((variant) => (
                <option key={variant.variant_id} value={variant.variant_id}>
                  {variant.variant_name || `خيار #${variant.variant_id}`}
                </option>
              ))}
            </select>
          </div>
        )}
        {formData.products_id && selectedProductVariants.length === 0 && (
          <p className="text-sm text-gray-500 text-center">لا توجد خيارات لهذا المنتج. سيتم استخدام المنتج الرئيسي.</p>
        )}


        {/* Packaging Type Selection */}
        <div>
          <label htmlFor="packaging_type_id" className="block text-sm font-medium text-gray-700">
            نوع التعبئة
          </label>
          <select
            id="packaging_type_id"
            name="packaging_type_id"
            value={formData.packaging_type_id}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">اختر نوع تعبئة</option>
            {filteredPackagingTypes.map((type) => (
              <option key={type.packaging_types_id} value={type.packaging_types_id}>
                {type.packaging_types_name}
              </option>
            ))}
          </select>
          {selectedProductBaseUnitId && filteredPackagingTypes.length === 0 && (
            <p className="text-sm text-red-500 mt-1">لا توجد أنواع تعبئة متوافقة مع وحدة قياس هذا المنتج.</p>
          )}
        </div>

        {/* Quantity */}
        <div>
          <label htmlFor="inventory_quantity" className="block text-sm font-medium text-gray-700">
            الكمية
          </label>
          <NumberInput
            id="inventory_quantity"
            name="inventory_quantity"
            value={formData.inventory_quantity}
            onChange={(val)=> setFormData(prev=>({ ...prev, inventory_quantity: val }))}
            placeholder="0"
            className="mt-1"
            required
          />
        </div>

        {/* Status */}
        <div>
          <label htmlFor="inventory_status" className="block text-sm font-medium text-gray-700">
            الحالة
          </label>
          <select
            id="inventory_status"
            name="inventory_status"
            value={formData.inventory_status}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="In Stock">In Stock</option>
            <option value="Out of Stock">Out of Stock</option>
            <option value="Low Stock">Low Stock</option>
          </select>
        </div>

        <div className="flex justify-end space-x-4 space-x-reverse mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
          >
            إضافة عنصر مخزون
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddInventoryForm;
