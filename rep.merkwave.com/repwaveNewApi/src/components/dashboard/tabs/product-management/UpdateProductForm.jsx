import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusCircleIcon,
  MinusCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { getAppSettingsCategorized } from "../../../../apis/auth.js";
import NumberInput from "../../../common/NumberInput/NumberInput.jsx";
import { isOdooIntegrationEnabled } from "../../../../utils/odooIntegration";

// A reusable component for form sections to keep the design consistent.
function FormSection({ title, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-8">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function UpdateProductForm({
  product,
  onUpdate,
  onCancel,
  categories = [],
  productAttributes = [],
  baseUnits = [],
  packagingTypes = [],
  suppliers = [],
}) {
  const [odooEnabled] = useState(() => isOdooIntegrationEnabled());
  const [formData, setFormData] = useState({
    products_name: "",
    products_description: "",
    products_category_id: "",
    products_unit_of_measure_id: "",
    products_brand: "",
    products_image: null,
    products_image_url: "",
    products_is_active: 1,
    products_supplier_id: "",
    products_expiry_period_in_days: "",
    products_has_tax: 1,
    products_tax_rate: "",
    variants_data: [],
    preferred_packaging_ids: [],
  });

  const [mainImagePreview, setMainImagePreview] = useState(null);
  const [filteredPackagingTypes, setFilteredPackagingTypes] = useState([]);
  const [defaultTaxRate, setDefaultTaxRate] = useState("14.00");
  const navigate = useNavigate();

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onCancel]);

  // Effect to populate the form when the product prop is available
  useEffect(() => {
    if (product) {
      setFormData({
        products_name: product.products_name || "",
        products_description: product.products_description || "",
        products_category_id: product.products_category_id || "",
        products_unit_of_measure_id: product.products_unit_of_measure_id || "",
        products_brand: product.products_brand || "",
        products_image: null,
        products_image_url: product.products_image_url || "",
        products_is_active: product.products_is_active ?? 1,
        products_supplier_id: product.products_supplier_id || "",
        products_expiry_period_in_days:
          product.products_expiry_period_in_days || "",
        products_has_tax: product.products_has_tax ?? 1,
        products_tax_rate: product.products_tax_rate || "",
        variants_data: (product.variants || []).map((v) => ({
          ...v,
          variant_has_tax: v.variant_has_tax ?? 0,
          variant_tax_rate: v.variant_tax_rate || "",
          attribute_value_ids: Array.isArray(v.attribute_value_ids)
            ? v.attribute_value_ids
            : (v.attributes ? v.attributes.map((attr) => attr.attribute_value_id) : []),
        })),
        preferred_packaging_ids: (product.preferred_packaging || []).map(
          (p) => p.packaging_types_id,
        ),
      });
      setMainImagePreview(product.products_image_url || null);
    }
  }, [product]);

  // Effect to filter packaging types based on the selected unit of measure
  useEffect(() => {
    if (formData.products_unit_of_measure_id && Array.isArray(packagingTypes)) {
      const filtered = packagingTypes.filter(
        (pkg) =>
          pkg.packaging_types_compatible_base_unit_id ==
          formData.products_unit_of_measure_id,
      );
      setFilteredPackagingTypes(filtered);
    } else {
      setFilteredPackagingTypes([]);
    }
  }, [formData.products_unit_of_measure_id, packagingTypes]);

  // Fetch default tax rate from settings
  useEffect(() => {
    const fetchDefaultTaxRate = async () => {
      try {
        const settings = await getAppSettingsCategorized();
        const financialSettings = settings.financial || [];
        const taxRateSetting = financialSettings.find(
          (setting) => setting.settings_key === "tax_rate",
        );
        if (taxRateSetting && taxRateSetting.settings_value) {
          setDefaultTaxRate(taxRateSetting.settings_value);
        }
      } catch (error) {
        console.error("Error fetching tax rate setting:", error);
      }
    };
    fetchDefaultTaxRate();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (name === "products_image" && files && files[0]) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        setFormData((prevData) => ({
          ...prevData,
          products_image: file,
          products_image_url: dataUrl,
        }));
        setMainImagePreview(dataUrl);
      };
      reader.readAsDataURL(file);
    } else {
      setFormData((prevData) => ({
        ...prevData,
        [name]: type === "checkbox" ? (checked ? 1 : 0) : value,
      }));
    }
  };

  // Handle numeric fields for variants using NumberInput
  const handleVariantNumericChange = (index, field, value) => {
    const newVariants = [...formData.variants_data];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setFormData((prevData) => ({ ...prevData, variants_data: newVariants }));
  };

  const handlePackagingCheckboxChange = (pkgId) => {
    setFormData((prevData) => {
      const newIds = [...prevData.preferred_packaging_ids];
      const idAsNumber = Number(pkgId);
      if (newIds.includes(idAsNumber)) {
        return {
          ...prevData,
          preferred_packaging_ids: newIds.filter((id) => id !== idAsNumber),
        };
      } else {
        return {
          ...prevData,
          preferred_packaging_ids: [...newIds, idAsNumber],
        };
      }
    });
  };

  const handleVariantChange = (index, e) => {
    const { name, value, type, checked, files } = e.target;
    const newVariants = [...formData.variants_data];
    if (name === "variant_image" && files && files[0]) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        newVariants[index] = {
          ...newVariants[index],
          variant_image: file,
          variant_image_url: ev.target.result,
        };
        setFormData((prevData) => ({ ...prevData, variants_data: newVariants }));
      };
      reader.readAsDataURL(file);
      return;
    } else if (name === "variant_has_tax") {
      // Handle tax checkbox - set default tax rate when enabled
      newVariants[index] = {
        ...newVariants[index],
        variant_has_tax: checked ? 1 : 0,
        variant_tax_rate: checked
          ? newVariants[index].variant_tax_rate || defaultTaxRate
          : "0.00",
      };
    } else {
      newVariants[index] = {
        ...newVariants[index],
        [name]: type === "checkbox" ? (checked ? 1 : 0) : value,
      };
    }
    setFormData((prevData) => ({ ...prevData, variants_data: newVariants }));
  };

  const handleAttributeValueChange = (variantIndex, valueId) => {
    const newVariants = [...formData.variants_data];
    const variant = newVariants[variantIndex];
    if (!variant.attribute_value_ids) {
      variant.attribute_value_ids = [];
    }
    if (variant.attribute_value_ids.includes(valueId)) {
      variant.attribute_value_ids = variant.attribute_value_ids.filter(
        (id) => id !== valueId,
      );
    } else {
      variant.attribute_value_ids.push(valueId);
    }
    setFormData((prevData) => ({ ...prevData, variants_data: newVariants }));
  };

  const addVariant = () => {
    setFormData((prevData) => ({
      ...prevData,
      variants_data: [
        ...prevData.variants_data,
        {
          variant_id: null,
          variant_name: "",
          variant_sku: "",
          variant_barcode: "",
          variant_image: null,
          variant_image_url: "",
          variant_unit_price: "",
          variant_cost_price: "",
          variant_status: 1,
          variant_has_tax: 0,
          variant_tax_rate: "",
          attribute_value_ids: [],
        },
      ],
    }));
  };

  const removeVariant = (index) => {
    setFormData((prevData) => ({
      ...prevData,
      variants_data: prevData.variants_data.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const toInt = (v) => (v !== "" && v != null ? parseInt(v, 10) : null);
    const toFloat = (v) => (v !== "" && v != null ? parseFloat(v) : null);
    const toBool = (v) => Number(v) === 1 || v === true;

    const payload = {
      products_name: formData.products_name?.trim() || "",
      products_description: formData.products_description || null,
      products_category_id: toInt(formData.products_category_id),
      products_unit_of_measure_id: toInt(formData.products_unit_of_measure_id),
      products_brand: formData.products_brand || null,
      products_image_url: formData.products_image_url || null,
      products_weight: toFloat(formData.products_weight),
      products_volume: toFloat(formData.products_volume),
      products_is_active: toBool(formData.products_is_active),
      products_supplier_id: toInt(formData.products_supplier_id),
      products_expiry_period_in_days: toInt(
        formData.products_expiry_period_in_days,
      ),
      products_has_tax: toBool(formData.products_has_tax),
      products_tax_rate: toFloat(formData.products_tax_rate) ?? 0,
      preferred_packaging_ids: formData.preferred_packaging_ids || [],
      variants_data: formData.variants_data.map((v) => ({
        variant_id: v.variant_id || null,
        variant_name: v.variant_name?.trim() || "",
        variant_sku: v.variant_sku || null,
        variant_barcode: v.variant_barcode || null,
        variant_image_url: v.variant_image_url || null,
        variant_unit_price: toFloat(v.variant_unit_price),
        variant_cost_price: toFloat(v.variant_cost_price),
        variant_status: typeof v.variant_status === "string" && v.variant_status
            ? v.variant_status
            : (Number(v.variant_status ?? 1) === 1 ? "active" : "inactive"),
        variant_has_tax: toBool(v.variant_has_tax),
        variant_tax_rate: toFloat(v.variant_tax_rate) ?? 0,
        attribute_value_ids: v.attribute_value_ids || [],
        ...(v.variant_odoo_product_id !== undefined && { variant_odoo_product_id: toInt(v.variant_odoo_product_id) }),
      })),
    };

    onUpdate(product.products_id, payload);
  };

  return (
    <div
      className="bg-gray-50 p-4 sm:p-6 rounded-lg max-w-4xl mx-auto"
      dir="rtl"
    >
      <div className="relative text-center mb-8">
        <button
          type="button"
          onClick={onCancel}
          className="absolute left-0 top-0 p-1 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors"
          aria-label="إغلاق"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
        <h2 className="text-3xl font-extrabold text-gray-900">تعديل المنتج</h2>
        <p className="mt-2 text-sm text-gray-600">قم بتحديث الحقول أدناه.</p>
      </div>
      <form onSubmit={handleSubmit}>
        <FormSection title="تفاصيل المنتج الأساسية">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="products_name"
                className="block text-sm font-medium text-gray-700"
              >
                اسم المنتج
              </label>
              <input
                type="text"
                id="products_name"
                name="products_name"
                value={formData.products_name}
                onChange={handleChange}
                required
                maxLength={255}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              />
            </div>
            <div>
              <label
                htmlFor="products_category_id"
                className="block text-sm font-medium text-gray-700"
              >
                الفئة
              </label>
              <select
                id="products_category_id"
                name="products_category_id"
                value={formData.products_category_id}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              >
                <option value="">اختر فئة</option>
                {(categories || []).map((cat) => (
                  <option key={cat.categories_id} value={cat.categories_id}>
                    {cat.categories_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="products_unit_of_measure_id"
                className="block text-sm font-medium text-gray-700"
              >
                وحدة القياس الأساسية
              </label>
              <select
                id="products_unit_of_measure_id"
                name="products_unit_of_measure_id"
                value={formData.products_unit_of_measure_id}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              >
                <option value="">اختر وحدة</option>
                {(baseUnits || []).map((unit) => (
                  <option key={unit.base_units_id} value={unit.base_units_id}>
                    {unit.base_units_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="products_brand"
                className="block text-sm font-medium text-gray-700"
              >
                العلامة التجارية
              </label>
              <input
                type="text"
                id="products_brand"
                name="products_brand"
                value={formData.products_brand}
                onChange={handleChange}
                maxLength={100}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              />
            </div>
            <div>
              <label
                htmlFor="products_supplier_id"
                className="block text-sm font-medium text-gray-700"
              >
                المورد
              </label>
              <select
                id="products_supplier_id"
                name="products_supplier_id"
                value={formData.products_supplier_id}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              >
                <option value="">اختر المورد (اختياري)</option>
                {(suppliers || []).map((sup) => (
                  <option key={sup.supplier_id} value={sup.supplier_id}>
                    {sup.supplier_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="products_expiry_period_in_days"
                className="block text-sm font-medium text-gray-700"
              >
                فترة الصلاحية (بالأيام)
              </label>
              <NumberInput
                id="products_expiry_period_in_days"
                name="products_expiry_period_in_days"
                value={formData.products_expiry_period_in_days}
                onChange={(val) =>
                  setFormData((prev) => ({
                    ...prev,
                    products_expiry_period_in_days: val,
                  }))
                }
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div className="md:col-span-2">
              <label
                htmlFor="products_description"
                className="block text-sm font-medium text-gray-700"
              >
                الوصف
              </label>
              <textarea
                id="products_description"
                name="products_description"
                value={formData.products_description}
                onChange={handleChange}
                rows="3"
                maxLength={500}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              ></textarea>
            </div>
            <div className="md:col-span-2">
              <label
                htmlFor="products_image"
                className="block text-sm font-medium text-gray-700"
              >
                صورة المنتج الرئيسية
              </label>
              <input
                type="file"
                id="products_image"
                name="products_image"
                accept="image/*"
                onChange={handleChange}
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#f5f3ff] file:text-[#7A52C2] hover:file:bg-[#EDE7FF]"
              />
              {mainImagePreview && (
                <div className="mt-2">
                  <img
                    src={mainImagePreview}
                    alt="معاينة المنتج الرئيسي"
                    className="h-24 w-24 object-cover rounded-md shadow-sm"
                  />
                </div>
              )}
            </div>
            <div className="md:col-span-2 flex items-center">
              <input
                type="checkbox"
                id="products_is_active"
                name="products_is_active"
                checked={formData.products_is_active === 1}
                onChange={handleChange}
                className="h-4 w-4 text-[#8B5FD6] focus:ring-[#8B5FD6] border-gray-300 rounded"
              />
              <label
                htmlFor="products_is_active"
                className="mr-2 block text-sm font-medium text-gray-700"
              >
                نشط
              </label>
            </div>
          </div>
        </FormSection>

        <FormSection title="أنواع التعبئة المفضلة">
          {formData.products_unit_of_measure_id ? (
            filteredPackagingTypes.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
                {filteredPackagingTypes.map((pkg) => (
                  <div
                    key={pkg.packaging_types_id}
                    className="flex items-center"
                  >
                    <input
                      type="checkbox"
                      id={`pkg_${pkg.packaging_types_id}`}
                      name="preferred_packaging_ids"
                      value={pkg.packaging_types_id}
                      checked={(
                        formData.preferred_packaging_ids || []
                      ).includes(pkg.packaging_types_id)}
                      onChange={() =>
                        handlePackagingCheckboxChange(pkg.packaging_types_id)
                      }
                      className="h-4 w-4 text-[#8B5FD6] focus:ring-[#8B5FD6] border-gray-300 rounded"
                    />
                    <label
                      htmlFor={`pkg_${pkg.packaging_types_id}`}
                      className="mr-2 text-sm text-gray-700"
                    >
                      {pkg.packaging_types_name}
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-4 bg-yellow-50 border border-yellow-300 text-yellow-800 rounded-md">
                <p className="mb-3">
                  لا توجد أنواع تعبئة متاحة لوحدة القياس المحددة.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    navigate("/dashboard/product-management/packaging-types")
                  }
                  className="px-4 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
                >
                  إضافة أنواع تعبئة
                </button>
              </div>
            )
          ) : (
            <p className="text-sm text-gray-500 text-center">
              الرجاء اختيار وحدة قياس أولاً لعرض خيارات التعبئة المتاحة.
            </p>
          )}
        </FormSection>

        <FormSection title="خيارات المنتج (Variants)">
          <div className="space-y-6">
            {formData.variants_data.map((variant, index) => (
              <div
                key={variant.variant_id || `new-${index}`}
                className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200 relative"
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <h5 className="text-lg font-semibold text-gray-700">
                      خيار #{index + 1}
                    </h5>
                    {odooEnabled && (
                      <div className="flex items-center gap-2">
                        <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-r-full">
                          Odoo ID:
                        </span>
                        <input
                          type="number"
                          name="variant_odoo_product_id"
                          value={variant.variant_odoo_product_id || ""}
                          onChange={(e) => handleVariantChange(index, e)}
                          placeholder="—"
                          className="w-24 text-xs px-2 py-1 border border-purple-300 rounded-l-full bg-white text-purple-700 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeVariant(index)}
                    className="text-red-600 hover:text-red-800 focus:outline-none"
                    title="حذف هذا الخيار"
                  >
                    <MinusCircleIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor={`variant_name_${index}`}
                      className="block text-sm font-medium text-gray-700"
                    >
                      اسم الخيار
                    </label>
                    <input
                      type="text"
                      id={`variant_name_${index}`}
                      name="variant_name"
                      value={variant.variant_name}
                      onChange={(e) => handleVariantChange(index, e)}
                      required
                      maxLength={255}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`variant_unit_price_${index}`}
                      className="block text-sm font-medium text-gray-700"
                    >
                      سعر الوحدة (للخيار)
                    </label>
                    <NumberInput
                      id={`variant_unit_price_${index}`}
                      name="variant_unit_price"
                      value={variant.variant_unit_price}
                      onChange={(val) =>
                        handleVariantNumericChange(
                          index,
                          "variant_unit_price",
                          val,
                        )
                      }
                      placeholder="0.00"
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`variant_cost_price_${index}`}
                      className="block text-sm font-medium text-gray-700"
                    >
                      سعر التكلفة (للخيار)
                    </label>
                    <NumberInput
                      id={`variant_cost_price_${index}`}
                      name="variant_cost_price"
                      value={variant.variant_cost_price}
                      onChange={(val) =>
                        handleVariantNumericChange(
                          index,
                          "variant_cost_price",
                          val,
                        )
                      }
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`variant_sku_${index}`}
                      className="block text-sm font-medium text-gray-700"
                    >
                      رمز SKU
                    </label>
                    <input
                      type="text"
                      id={`variant_sku_${index}`}
                      name="variant_sku"
                      value={variant.variant_sku}
                      onChange={(e) => handleVariantChange(index, e)}
                      maxLength={100}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                  </div>

                  {/* Variant Tax Configuration */}
                  <div className="md:col-span-2 bg-[#f5f3ff] p-4 rounded-lg border border-[#C4A8F0]">
                    <h6 className="text-sm font-semibold text-[#2D1B69] mb-3">
                      إعدادات الضريبة للخيار #{index + 1}
                    </h6>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`variant_has_tax_${index}`}
                          name="variant_has_tax"
                          checked={variant.variant_has_tax}
                          onChange={(e) => handleVariantChange(index, e)}
                          className="h-4 w-4 text-[#8B5FD6] focus:ring-[#8B5FD6] border-gray-300 rounded"
                        />
                        <label
                          htmlFor={`variant_has_tax_${index}`}
                          className="mr-2 text-sm font-medium text-gray-700"
                        >
                          خاضع للضريبة
                        </label>
                      </div>
                      {variant.variant_has_tax && (
                        <div>
                          <label
                            htmlFor={`variant_tax_rate_${index}`}
                            className="block text-sm font-medium text-gray-700"
                          >
                            معدل الضريبة (%)
                          </label>
                          <NumberInput
                            id={`variant_tax_rate_${index}`}
                            name="variant_tax_rate"
                            value={variant.variant_tax_rate}
                            onChange={(val) =>
                              handleVariantNumericChange(
                                index,
                                "variant_tax_rate",
                                val,
                              )
                            }
                            className="mt-1"
                            placeholder={`القيمة الافتراضية: ${defaultTaxRate}%`}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor={`variant_barcode_${index}`}
                      className="block text-sm font-medium text-gray-700"
                    >
                      الباركود
                    </label>
                    <input
                      type="text"
                      id={`variant_barcode_${index}`}
                      name="variant_barcode"
                      value={variant.variant_barcode}
                      onChange={(e) => handleVariantChange(index, e)}
                      maxLength={100}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label
                      htmlFor={`variant_image_${index}`}
                      className="block text-sm font-medium text-gray-700"
                    >
                      صورة الخيار
                    </label>
                    <input
                      type="file"
                      id={`variant_image_${index}`}
                      name="variant_image"
                      accept="image/*"
                      onChange={(e) => handleVariantChange(index, e)}
                      className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#f5f3ff] file:text-[#7A52C2] hover:file:bg-[#EDE7FF]"
                    />
                    {variant.variant_image_url && (
                      <div className="mt-2">
                        <img
                          src={variant.variant_image_url}
                          alt={`معاينة خيار ${index + 1}`}
                          className="h-24 w-24 object-cover rounded-md shadow-sm"
                        />
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الخصائص
                    </label>
                    {(productAttributes || []).length > 0 ? (
                      (productAttributes || []).map((attr) => (
                        <div
                          key={attr.attribute_id}
                          className="mb-3 p-3 border border-gray-200 rounded-md bg-white"
                        >
                          <p className="font-semibold text-gray-800 mb-2">
                            {attr.attribute_name}
                          </p>
                          <div className="flex flex-wrap gap-x-4 gap-y-2">
                            {Array.isArray(attr.values) &&
                              attr.values.map((val) => (
                                <div
                                  key={val.attribute_value_id}
                                  className="flex items-center"
                                >
                                  <input
                                    type="checkbox"
                                    id={`variant_${index}_attr_${val.attribute_value_id}`}
                                    name={`attribute_value_${val.attribute_value_id}`}
                                    checked={(
                                      variant.attribute_value_ids || []
                                    ).includes(val.attribute_value_id)}
                                    onChange={() =>
                                      handleAttributeValueChange(
                                        index,
                                        val.attribute_value_id,
                                      )
                                    }
                                    className="h-4 w-4 text-[#8B5FD6] focus:ring-[#8B5FD6] border-gray-300 rounded"
                                  />
                                  <label
                                    htmlFor={`variant_${index}_attr_${val.attribute_value_id}`}
                                    className="mr-2 text-sm text-gray-700"
                                  >
                                    {val.attribute_value_value}
                                  </label>
                                </div>
                              ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center p-4 bg-yellow-50 border border-yellow-300 text-yellow-800 rounded-md">
                        <p className="mb-3">
                          لا توجد خصائص متاحة. يرجى إضافة خصائص أولاً.
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            navigate("/dashboard/product-management/attributes")
                          }
                          className="px-4 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
                        >
                          الذهاب لصفحة الخصائص
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={addVariant}
                className="w-full md:w-auto inline-flex items-center justify-center px-6 py-2 border border-dashed border-gray-400 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
              >
                <PlusCircleIcon
                  className="-mr-1 ml-2 h-5 w-5"
                  aria-hidden="true"
                />
                إضافة خيار
              </button>
            </div>
          </div>
        </FormSection>

        <div className="flex flex-col-reverse sm:flex-row justify-end space-y-reverse space-y-3 sm:space-y-0 sm:space-x-4 sm:space-x-reverse mt-6 sm:mt-8 pt-4 sm:pt-5 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-6 py-2.5 sm:py-2 border border-gray-300 rounded-md shadow-sm text-base sm:text-sm"
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 sm:py-2 border border-transparent rounded-md shadow-sm text-white bg-[#8B5FD6] hover:bg-[#7A52C2] text-base sm:text-sm"
          >
            تحديث المنتج
          </button>
        </div>
      </form>
    </div>
  );
}

export default UpdateProductForm;
