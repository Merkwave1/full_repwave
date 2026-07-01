import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusCircleIcon,
  MinusCircleIcon,
  ExclamationTriangleIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";
import { getAppSettingsCategorized } from "../../../../apis/auth.js";
import NumberInput from "../../../common/NumberInput/NumberInput.jsx";
import AppModalShell, {
  modalPrimaryBtnClass,
  modalSecondaryBtnClass,
  modalSectionClass,
  modalSectionHeaderClass,
  modalInputClass,
} from "../../../common/AppModalShell.jsx";

function FormSection({ title, children }) {
  return (
    <div className={modalSectionClass}>
      <div className={modalSectionHeaderClass}>{title}</div>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
}

// Set default empty arrays for props to prevent .map() errors if data is not yet loaded.
function AddProductForm({
  onAdd,
  onCancel,
  categories = [],
  productAttributes = [],
  baseUnits = [],
  packagingTypes = [],
  suppliers = [],
  addFormError = null,
  setAddFormError = () => {},
}) {
  const [formData, setFormData] = useState({
    products_name: "",
    products_description: "",
    products_category_id: "",
    products_unit_of_measure_id: "",
    products_brand: "",
    products_image: null,
    products_image_url: "",
    products_weight: "",
    products_volume: "",
    products_is_active: 1,
    products_supplier_id: "",
    products_expiry_period_in_days: "",
    products_has_tax: 1,
    products_tax_rate: "",
    variants_data: [
      {
        variant_name: "",
        variant_sku: "",
        variant_barcode: "",
        variant_image: null,
        variant_image_url: "",
        variant_unit_price: "",
        variant_cost_price: "",
        variant_weight: "",
        variant_volume: "",
        variant_status: 1,
        variant_notes: "",
        variant_has_tax: 0,
        variant_tax_rate: "",
        attribute_value_ids: [],
      },
    ],
    preferred_packaging_ids: [],
  });

  const [mainImagePreview, setMainImagePreview] = useState(null);
  const [filteredPackagingTypes, setFilteredPackagingTypes] = useState([]);
  const [defaultTaxRate, setDefaultTaxRate] = useState("14.00");
  const [simpleVariantMode, setSimpleVariantMode] = useState(true); // Simplified row mode like sales order items
  const navigate = useNavigate();

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onCancel]);

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
    setFormData((prev) => ({ ...prev, preferred_packaging_ids: [] }));
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

  if (!categories || categories.length === 0) {
    return (
      <AppModalShell
        portal
        open
        onClose={onCancel}
        title="لا توجد أقسام"
        subtitle="أضف قسم منتجات أولاً"
        icon={ExclamationTriangleIcon}
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onCancel} className={modalSecondaryBtnClass}>
              إغلاق
            </button>
            <button
              type="button"
              onClick={() => navigate("/dashboard/product-management/categories")}
              className={modalPrimaryBtnClass}
            >
              الذهاب للأقسام
            </button>
          </div>
        }
      >
        <p className="text-sm text-gray-600 text-center py-2">
          يجب إضافة أقسام المنتجات قبل إنشاء منتج جديد.
        </p>
      </AppModalShell>
    );
  }

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
      if (addFormError && addFormError.field && addFormError.field === name) {
        try {
          setAddFormError && setAddFormError(null);
        } catch {
          /* ignore */
        }
      }
    }
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

  // Handle numeric fields for variants using NumberInput
  const handleVariantNumericChange = (index, field, value) => {
    const newVariants = [...formData.variants_data];
    newVariants[index] = { ...newVariants[index], [field]: value };
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
          variant_name: "",
          variant_sku: "",
          variant_barcode: "",
          variant_image: null,
          variant_image_url: "",
          variant_unit_price: "",
          variant_cost_price: "",
          variant_weight: "",
          variant_volume: "",
          variant_status: 1,
          variant_notes: "",
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

  const renderFormErrorAlert = () => {
    if (!addFormError) return null;
    return (
      <div className="mb-4">
        <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-md">
          <div className="font-medium">خطأ في إدخال البيانات</div>
          <div className="text-sm mt-1">
            {addFormError.message || "حدث خطأ أثناء إضافة المنتج."}
          </div>
        </div>
      </div>
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Clear any previous form errors
    setAddFormError && setAddFormError(null);

    // Ensure required fields: supplier and expiry period
    if (!formData.products_supplier_id) {
      setAddFormError &&
        setAddFormError({
          field: "products_supplier_id",
          message: "المورد مطلوب.",
        });
      return;
    }

    if (
      formData.products_expiry_period_in_days === "" ||
      formData.products_expiry_period_in_days === null
    ) {
      setAddFormError &&
        setAddFormError({
          field: "products_expiry_period_in_days",
          message: "فترة الصلاحية (بالأيام) مطلوبة.",
        });
      return;
    }

    // Ensure at least one variant exists
    if (formData.variants_data.length === 0) {
      alert("يجب إضافة خيار واحد على الأقل للمنتج");
      return;
    }

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
        variant_name: v.variant_name?.trim() || "",
        variant_sku: v.variant_sku || null,
        variant_barcode: v.variant_barcode || null,
        variant_image_url: v.variant_image_url || null,
        variant_unit_price: toFloat(v.variant_unit_price),
        variant_cost_price: toFloat(v.variant_cost_price),
        variant_weight: toFloat(v.variant_weight),
        variant_volume: toFloat(v.variant_volume),
        variant_status: typeof v.variant_status === "string" && v.variant_status
            ? v.variant_status
            : (Number(v.variant_status ?? 1) === 1 ? "active" : "inactive"),
        variant_notes: v.variant_notes || null,
        variant_has_tax: toBool(v.variant_has_tax),
        variant_tax_rate: toFloat(v.variant_tax_rate) ?? 0,
        attribute_value_ids: v.attribute_value_ids || [],
      })),
    };

    onAdd(payload);
  };

  return (
    <AppModalShell
      portal
      open
      onClose={onCancel}
      title="إضافة منتج جديد"
      subtitle="املأ التفاصيل الأساسية والخيارات والتعبئة المفضلة"
      icon={ShoppingBagIcon}
      size="3xl"
      bodyClassName="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 bg-[#FAFAFE] max-h-[78vh]"
      footer={
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className={modalSecondaryBtnClass}>
            إلغاء
          </button>
          <button type="submit" form="add-product-form" className={modalPrimaryBtnClass}>
            إضافة المنتج
          </button>
        </div>
      }
    >
      <form id="add-product-form" onSubmit={handleSubmit} className="space-y-5">
        {renderFormErrorAlert()}
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#8B5FD6] focus:border-[#8B5FD6] sm:text-sm"
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#8B5FD6] focus:border-[#8B5FD6] sm:text-sm"
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#8B5FD6] focus:border-[#8B5FD6] sm:text-sm"
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#8B5FD6] focus:border-[#8B5FD6] sm:text-sm"
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#8B5FD6] focus:border-[#8B5FD6] sm:text-sm"
              >
                <option value="">اختر المورد (اختياري)</option>
                {(suppliers || []).map((sup) => (
                  <option key={sup.supplier_id} value={sup.supplier_id}>
                    {sup.supplier_name}
                  </option>
                ))}
              </select>
              {addFormError &&
                addFormError.field === "products_supplier_id" && (
                  <p className="mt-1 text-sm text-red-600">
                    {addFormError.message}
                  </p>
                )}
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
                onChange={(val) => {
                  setFormData((prev) => ({
                    ...prev,
                    products_expiry_period_in_days: val,
                  }));
                  if (
                    addFormError &&
                    addFormError.field === "products_expiry_period_in_days"
                  ) {
                    setAddFormError && setAddFormError(null);
                  }
                }}
                placeholder="0"
                className="mt-1"
              />
              {addFormError &&
                addFormError.field === "products_expiry_period_in_days" && (
                  <p className="mt-1 text-sm text-red-600">
                    {addFormError.message}
                  </p>
                )}
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#8B5FD6] focus:border-[#8B5FD6] sm:text-sm"
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
                      checked={formData.preferred_packaging_ids.includes(
                        pkg.packaging_types_id,
                      )}
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
                  className="px-4 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
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
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              {simpleVariantMode
                ? "وضع مبسط لإدخال الخيارات في صفوف سريعة."
                : "الوضع المتقدم لعرض كل تفاصيل الخيار."}
            </p>
            <button
              type="button"
              onClick={() => setSimpleVariantMode((m) => !m)}
              className="px-3 py-1 text-xs rounded-md border border-gray-300 bg-white hover:bg-gray-50"
            >
              {simpleVariantMode ? "الوضع المتقدم" : "الوضع المبسط"}
            </button>
          </div>
          {formData.variants_data.length === 0 && (
            <div className="text-center text-red-600 py-3 bg-red-50 border border-red-200 rounded-md mb-4">
              <p className="font-medium">
                ⚠️ يجب إضافة خيار واحد على الأقل للمنتج
              </p>
            </div>
          )}
          {simpleVariantMode ? (
            <div className="space-y-3">
              {/* Desktop header (hidden on mobile) */}
              <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-semibold text-gray-700 bg-gray-100 rounded-md p-2 border">
                <div className="col-span-2">اسم الخيار</div>
                <div className="col-span-2">سعر البيع</div>
                <div className="col-span-2">سعر التكلفة</div>
                <div className="col-span-1">SKU</div>
                <div className="col-span-1">باركود</div>
                <div className="col-span-1 text-center">ضريبة؟</div>
                <div className="col-span-1">معدل الضريبة</div>
                <div className="col-span-2 text-center">حذف</div>
              </div>
              {formData.variants_data.map((variant, index) => (
                <React.Fragment key={index}>
                  {/* ── Mobile card (sm and below) ── */}
                  <div className="sm:hidden bg-white border border-gray-200 rounded-lg p-3 shadow-sm space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-600">
                        خيار #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeVariant(index)}
                        className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800"
                      >
                        <MinusCircleIcon className="h-4 w-4" />
                        حذف
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <div>
                        <label className="block text-[11px] text-gray-500 mb-0.5">
                          اسم الخيار
                        </label>
                        <input
                          type="text"
                          name="variant_name"
                          value={variant.variant_name}
                          onChange={(e) => handleVariantChange(index, e)}
                          required
                          placeholder="اسم"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-gray-500 mb-0.5">
                            سعر البيع
                          </label>
                          <NumberInput
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
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-500 mb-0.5">
                            سعر التكلفة
                          </label>
                          <NumberInput
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
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-gray-500 mb-0.5">
                            SKU
                          </label>
                          <input
                            type="text"
                            name="variant_sku"
                            value={variant.variant_sku}
                            onChange={(e) => handleVariantChange(index, e)}
                            placeholder="SKU"
                            maxLength={100}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-500 mb-0.5">
                            باركود
                          </label>
                          <input
                            type="text"
                            name="variant_barcode"
                            value={variant.variant_barcode}
                            onChange={(e) => handleVariantChange(index, e)}
                            placeholder="باركود"
                            maxLength={100}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          name="variant_has_tax"
                          id={`mob_tax_${index}`}
                          checked={!!variant.variant_has_tax}
                          onChange={(e) => handleVariantChange(index, e)}
                          className="h-4 w-4 text-[#8B5FD6] border-gray-300 rounded"
                        />
                        <label
                          htmlFor={`mob_tax_${index}`}
                          className="text-sm text-gray-700"
                        >
                          خاضع للضريبة
                        </label>
                        {variant.variant_has_tax && (
                          <div className="flex-1">
                            <NumberInput
                              name="variant_tax_rate"
                              value={variant.variant_tax_rate}
                              onChange={(val) =>
                                handleVariantNumericChange(
                                  index,
                                  "variant_tax_rate",
                                  val,
                                )
                              }
                              placeholder={defaultTaxRate}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    {productAttributes && productAttributes.length > 0 && (
                      <p className="text-[11px] text-gray-400">
                        لتعيين الخصائص استخدم الوضع المتقدم.
                      </p>
                    )}
                  </div>

                  {/* ── Desktop row (hidden on mobile) ── */}
                  <div className="hidden sm:grid grid-cols-12 gap-2 items-start bg-white p-2 rounded-md border border-gray-200 shadow-sm">
                    <div className="col-span-2">
                      <input
                        type="text"
                        name="variant_name"
                        value={variant.variant_name}
                        onChange={(e) => handleVariantChange(index, e)}
                        required
                        placeholder="اسم"
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <NumberInput
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
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-xs"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <NumberInput
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
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-xs"
                      />
                    </div>
                    <div className="col-span-1">
                      <input
                        type="text"
                        name="variant_sku"
                        value={variant.variant_sku}
                        onChange={(e) => handleVariantChange(index, e)}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-xs"
                        placeholder="SKU"
                        maxLength={100}
                      />
                    </div>
                    <div className="col-span-1">
                      <input
                        type="text"
                        name="variant_barcode"
                        value={variant.variant_barcode}
                        onChange={(e) => handleVariantChange(index, e)}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-xs"
                        placeholder="باركود"
                        maxLength={100}
                      />
                    </div>
                    <div className="col-span-1 flex items-center justify-center">
                      <input
                        type="checkbox"
                        name="variant_has_tax"
                        checked={!!variant.variant_has_tax}
                        onChange={(e) => handleVariantChange(index, e)}
                        className="h-4 w-4 text-[#8B5FD6] border-gray-300 rounded"
                      />
                    </div>
                    <div className="col-span-1">
                      {variant.variant_has_tax ? (
                        <NumberInput
                          name="variant_tax_rate"
                          value={variant.variant_tax_rate}
                          onChange={(val) =>
                            handleVariantNumericChange(
                              index,
                              "variant_tax_rate",
                              val,
                            )
                          }
                          placeholder={defaultTaxRate}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-xs"
                        />
                      ) : (
                        <input
                          type="number"
                          disabled
                          value=""
                          className="w-full px-2 py-1 border border-gray-200 bg-gray-100 rounded-md text-xs"
                        />
                      )}
                    </div>
                    <div className="col-span-2 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => removeVariant(index)}
                        className="inline-flex items-center px-2 py-1 text-xs text-red-600 hover:text-red-800"
                      >
                        <MinusCircleIcon className="h-5 w-5" />
                        <span className="ml-1">حذف</span>
                      </button>
                    </div>
                    {productAttributes && productAttributes.length > 0 && (
                      <div className="col-span-12 mt-2 text-[11px] text-gray-500">
                        <span>لتعيين الخصائص استخدم الوضع المتقدم.</span>
                      </div>
                    )}
                  </div>
                </React.Fragment>
              ))}
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={addVariant}
                  className="inline-flex items-center px-4 py-2 border border-dashed border-gray-400 text-xs font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                >
                  <PlusCircleIcon className="-mr-1 ml-2 h-5 w-5" />
                  إضافة خيار
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {formData.variants_data.map((variant, index) => (
                <div
                  key={index}
                  className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200 relative"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h5 className="text-lg font-semibold text-gray-700">
                      خيار #{index + 1}
                    </h5>
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
                        سعر البيع (للخيار)
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
                                      checked={variant.attribute_value_ids.includes(
                                        val.attribute_value_id,
                                      )}
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
                              navigate(
                                "/dashboard/product-management/attributes",
                              )
                            }
                            className="px-4 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
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
          )}
        </FormSection>
      </form>
    </AppModalShell>
  );
}

export default AddProductForm;
