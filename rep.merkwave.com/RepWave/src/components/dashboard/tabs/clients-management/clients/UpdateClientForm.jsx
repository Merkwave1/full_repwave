// src/components/dashboard/tabs/clients/UpdateClientForm.js
import React, { useState, useEffect } from "react";
import Alert from "../../../../common/Alert/Alert";
import MapPicker from "../../../../common/MapPicker/MapPicker";
import {
  countries,
  getCitiesByCountryCode,
} from "../../../../../data/countries.js";
import { getAppClientTypes } from "../../../../../apis/auth.js";
import NumberInput from "../../../../common/NumberInput/NumberInput.jsx";
import { CLIENT_STATUS_OPTIONS } from "../../../../../constants/clientStatus";
import { isOdooIntegrationEnabled } from "../../../../../utils/odooIntegration";
import SearchableSelect from "../../../../common/SearchableSelect/SearchableSelect";

function UpdateClientForm({
  client,
  onUpdate,
  onCancel,
  clientAreaTags,
  clientIndustries,
  allUsers,
}) {
  // Added allUsers prop
  const [odooEnabled] = useState(() => isOdooIntegrationEnabled());
  const [formData, setFormData] = useState({
    clients_id: "",
    clients_odoo_partner_id: "",
    clients_company_name: "",
    clients_email: "",
    clients_address: "",
    clients_street2: "",
    clients_building_number: "",
    clients_city: "",
    clients_state: "",
    clients_zip: "",
    clients_country: "EG",
    clients_latitude: "",
    clients_longitude: "",
    clients_area_tag_id: "",
    clients_industry_id: "",
    clients_contact_name: "",
    clients_contact_job_title: "",
    clients_contact_phone_1: "",
    clients_contact_phone_2: "",
    clients_type: "", // legacy
    clients_client_type_id: "", // new FK
    clients_website: "",
    clients_vat_number: "",
    clients_description: "",
    clients_image: null, // For new file input
    clients_image_url: "", // To display current image
    clients_credit_limit: "",
    clients_payment_terms: "",
    clients_source: "",
    clients_reference_note: "",
    clients_status: "",
    clients_rep_user_id: "", // New field for sales rep
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [formError, setFormError] = useState("");
  const [activeTab, setActiveTab] = useState("general"); // 'general', 'contact', 'address', 'other'
  const [clientTypes, setClientTypes] = useState([]);
  const [cachedCountries, setCachedCountries] = useState([]);

  // Populate form data when the client prop changes
  useEffect(() => {
    // Load client types dynamically
    (async () => {
      try {
        const types = await getAppClientTypes(false);
        const arr = Array.isArray(types) ? types : [];
        setClientTypes(arr);
        // If FK not set from prop, default to first available
        setFormData((prev) => {
          if (prev.clients_client_type_id) return prev;
          return arr.length > 0
            ? { ...prev, clients_client_type_id: String(arr[0].client_type_id) }
            : prev;
        });
      } catch {
        setClientTypes([]);
      }
    })();

    if (client) {
      setFormData({
        clients_id: client.clients_id || "",
        clients_odoo_partner_id: client.clients_odoo_partner_id || "",
        clients_company_name: client.clients_company_name || "",
        clients_email: client.clients_email || "",
        clients_address: client.clients_address || "",
        clients_street2: client.clients_street2 || "",
        clients_building_number: client.clients_building_number || "",
        clients_city: client.clients_city || "",
        clients_state: client.clients_governorate_id
          ? String(client.clients_governorate_id)
          : client.clients_state || "",
        clients_zip: client.clients_zip || "",
        clients_country: client.clients_country_id
          ? String(client.clients_country_id)
          : client.clients_country || "",
        clients_latitude: client.clients_latitude || "",
        clients_longitude: client.clients_longitude || "",
        clients_area_tag_id: client.clients_area_tag_id
          ? client.clients_area_tag_id.toString()
          : "",
        clients_industry_id: client.clients_industry_id
          ? client.clients_industry_id.toString()
          : "",
        clients_contact_name: client.clients_contact_name || "",
        clients_contact_job_title: client.clients_contact_job_title || "",
        clients_contact_phone_1: client.clients_contact_phone_1 || "",
        clients_contact_phone_2: client.clients_contact_phone_2 || "",
        clients_type: client.clients_type || "store",
        clients_client_type_id: client.clients_client_type_id
          ? String(client.clients_client_type_id)
          : "",
        clients_website: client.clients_website || "",
        clients_vat_number: client.clients_vat_number || "",
        clients_description: client.clients_description || "",
        clients_image: null, // Always null for initial load
        clients_image_url: client.clients_image || "", // Use 'clients_image' for URL from detailed response
        clients_credit_limit:
          client.clients_credit_limit !== undefined &&
          client.clients_credit_limit !== null
            ? String(client.clients_credit_limit)
            : "",
        clients_payment_terms: client.clients_payment_terms || "",
        clients_source: client.clients_source || "",
        clients_reference_note: client.clients_reference_note || "",
        clients_status: client.clients_status || "active",
        clients_rep_user_id: client.clients_rep_user_id
          ? client.clients_rep_user_id.toString()
          : "",
      });
    } else {
      setFormError("معرف العميل غير متوفر للتعديل.");
    }
  }, [client]); // Depend on client prop

  // Load countries+governorates from localStorage if available
  useEffect(() => {
    try {
      const raw = localStorage.getItem("appCountriesWithGovernorates");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const normalized = parsed.map((c) => ({
            id: String(c.countries_id ?? c.id ?? c.countriesId ?? ""),
            name_ar: c.countries_name_ar ?? c.name_ar ?? c.name ?? "",
            name_en: c.countries_name_en ?? c.name_en ?? "",
            governorates: Array.isArray(c.governorates)
              ? c.governorates.map((g) => ({
                  id: String(g.governorates_id ?? g.id ?? ""),
                  name_ar: g.governorates_name_ar ?? g.name_ar ?? g.name ?? "",
                  name_en: g.governorates_name_en ?? g.name_en ?? "",
                }))
              : [],
          }));
          setCachedCountries(normalized.filter((c) => c.id));
        }
      }
    } catch (e) {
      console.warn(
        "[UpdateClientForm] failed to read appCountriesWithGovernorates from localStorage",
        e,
      );
    }
  }, []);

  // Cleanup effect for image preview URL
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === "file" && name === "clients_image") {
      const file = files[0];
      if (file) {
        // Create preview URL for the selected image
        const previewUrl = URL.createObjectURL(file);
        setImagePreview(previewUrl);
        setFormData((prevData) => ({
          ...prevData,
          [name]: file,
        }));
      } else {
        // Clear preview if no file selected
        setImagePreview(null);
        setFormData((prevData) => ({
          ...prevData,
          [name]: null,
        }));
      }
    } else {
      setFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }
  };

  const handleMapChange = (lat, lng) => {
    setFormData((prev) => ({
      ...prev,
      clients_latitude: lat ? lat.toString() : "",
      clients_longitude: lng ? lng.toString() : "",
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError("");

    // VAT validation: must be 15 digits, start with 3, end with 3
    if (
      formData.clients_vat_number &&
      formData.clients_vat_number.trim() !== ""
    ) {
      const vat = formData.clients_vat_number.trim();
      if (!/^\d{15}$/.test(vat)) {
        setFormError("رقم ضريبة القيمة المضافة يجب أن يكون 15 رقماً");
        setActiveTab("general");
        return;
      }
      if (!vat.startsWith("3") || !vat.endsWith("3")) {
        setFormError("رقم ضريبة القيمة المضافة يجب أن يبدأ بـ 3 وينتهي بـ 3");
        setActiveTab("general");
        return;
      }

      // If VAT is provided, address fields become required
      const isAddressFieldsMissing =
        !formData.clients_address ||
        !formData.clients_street2 ||
        !formData.clients_city ||
        !formData.clients_state ||
        !formData.clients_country ||
        !formData.clients_zip ||
        !formData.clients_building_number;
      if (isAddressFieldsMissing) {
        setFormError(
          "عند إدخال رقم ضريبة القيمة المضافة، يجب ملء جميع حقول العنوان: العنوان، العنوان 2، المدينة، المنطقة/المحافظة، الدولة، الرمز البريدي، ورقم المبنى",
        );
        setActiveTab("address");
        return;
      }
    }

    if (
      !formData.clients_company_name ||
      !formData.clients_email ||
      !formData.clients_contact_name ||
      !formData.clients_contact_phone_1
    ) {
      setFormError(
        "يرجى ملء الحقول الإلزامية: اسم الشركة، البريد الإلكتروني، اسم جهة الاتصال، الهاتف 1.",
      );
      setActiveTab("general");
      return;
    }

    onUpdate({
      ...formData,
      clients_area_tag_id: formData.clients_area_tag_id
        ? parseInt(formData.clients_area_tag_id, 10)
        : null,
      clients_industry_id: formData.clients_industry_id
        ? parseInt(formData.clients_industry_id, 10)
        : null,
      clients_client_type_id: formData.clients_client_type_id
        ? parseInt(formData.clients_client_type_id, 10)
        : null,
      clients_status: formData.clients_status,
      clients_image: formData.clients_image || formData.clients_image_url,
      clients_rep_user_id: formData.clients_rep_user_id
        ? parseInt(formData.clients_rep_user_id, 10)
        : null,
      clients_street2: formData.clients_street2 || null,
      clients_building_number: formData.clients_building_number || null,
      clients_state: formData.clients_state || null,
      clients_zip: formData.clients_zip || null,
    });
  };

  const premiumInput =
    "block w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md focus:outline-none focus:border-[#8DD8F5] focus:ring-4 focus:ring-[#8DD8F5]/30 transition-all duration-300";

  const premiumInputSmall =
    "block w-full px-3 py-2 rounded-xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md focus:outline-none focus:border-[#8DD8F5] focus:ring-4 focus:ring-[#8DD8F5]/30 transition-all duration-300 text-sm";

  const premiumLabel =
    "block text-sm font-semibold text-[#1F2937] mb-1 tracking-wide";

  const premiumCard =
    "relative rounded-2xl bg-white/70 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(31,41,55,0.35)] border border-white/40 p-6";

  const renderTabContent = () => {
    switch (activeTab) {
      case "general": {
        const previewUrl = imagePreview || formData.clients_image_url;
        return (
          <div className={premiumCard}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Image Upload Section */}
              <div className="md:col-span-2 flex flex-col items-center gap-3 py-4">
                <label
                  htmlFor="clients_image"
                  className="group relative block cursor-pointer"
                >
                  <div className="w-40 h-40 rounded-full overflow-hidden bg-gradient-to-br from-[#8DD8F5]/40 to-white border border-white/60 shadow-[0_12px_40px_-10px_rgba(141,216,245,0.9)] hover:shadow-[0_18px_60px_-10px_rgba(141,216,245,1)] transition-all duration-500 flex items-center justify-center group-hover:scale-105">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="صورة العميل"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://placehold.co/144x144/e5e7eb/6b7280?text=صورة";
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <svg
                          className="w-12 h-12 mb-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="text-sm font-medium">
                          لا توجد صورة
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/50 to-transparent text-white text-center text-sm font-semibold flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <span className="drop-shadow-lg">تغيير الصورة</span>
                    </div>
                  </div>
                </label>
                <input
                  type="file"
                  id="clients_image"
                  name="clients_image"
                  accept="image/*"
                  onChange={handleChange}
                  className="hidden"
                />
                <p className="text-xs text-gray-500 text-center max-w-xs">
                  اضغط على الصورة لتحديث صورة العميل (اختياري)
                </p>
              </div>

              {/* Basic Information */}
              <div>
                <label htmlFor="clients_company_name" className={premiumLabel}>
                  اسم الشركة <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="clients_company_name"
                  name="clients_company_name"
                  value={formData.clients_company_name}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  className={premiumInput}
                  placeholder="أدخل اسم الشركة"
                />
              </div>

              {odooEnabled && (
                <div>
                  <label
                    htmlFor="clients_odoo_partner_id"
                    className={premiumLabel}
                  >
                    معرف Odoo (Partner ID)
                  </label>
                  <input
                    type="text"
                    id="clients_odoo_partner_id"
                    name="clients_odoo_partner_id"
                    value={formData.clients_odoo_partner_id}
                    onChange={handleChange}
                    maxLength={50}
                    className={premiumInput + " font-mono"}
                    placeholder="مثال: 123"
                  />
                </div>
              )}

              <div>
                <label htmlFor="clients_email" className={premiumLabel}>
                  البريد الإلكتروني <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="clients_email"
                  name="clients_email"
                  value={formData.clients_email}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  className={premiumInput}
                  placeholder="example@company.com"
                />
              </div>

              <div>
                <label
                  htmlFor="clients_client_type_id"
                  className={premiumLabel}
                >
                  نوع العميل
                </label>

                <div className="relative">
                  <select
                    id="clients_client_type_id"
                    name="clients_client_type_id"
                    value={formData.clients_client_type_id}
                    onChange={handleChange}
                    className="appearance-none block w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl shadow-sm bg-white
      focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
      transition-all duration-200 hover:border-gray-400"
                    style={{ WebkitAppearance: "none", MozAppearance: "none" }}
                  >
                    <option value="" disabled>
                      اختر نوع العميل
                    </option>
                    {clientTypes.map((t) => (
                      <option key={t.client_type_id} value={t.client_type_id}>
                        {t.client_type_name}
                      </option>
                    ))}
                  </select>

                  {/* Custom Arrow RTL */}
                  <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-gray-500">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>

                {clientTypes.length === 0 && (
                  <p className="mt-2 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-start gap-2">
                    <svg
                      className="w-4 h-4 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>
                      لا توجد أنواع عملاء متاحة. يمكنك إضافتها من الإعدادات
                    </span>
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="clients_industry_id"
                  className="block text-sm font-semibold text-gray-700 mb-1"
                >
                  صناعة العميل <span className="text-red-500">*</span>
                </label>

                <div className="relative">
                  <select
                    id="clients_industry_id"
                    name="clients_industry_id"
                    value={formData.clients_industry_id}
                    onChange={handleChange}
                    required
                    className="block w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg shadow-sm 
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 
              transition-all duration-200 hover:border-gray-400 bg-white appearance-none"
                  >
                    <option value="" disabled>
                      اختر صناعة العميل
                    </option>
                    {clientIndustries.map((industry) => (
                      <option
                        key={industry.client_industries_id}
                        value={industry.client_industries_id}
                      >
                        {industry.client_industries_name}
                      </option>
                    ))}
                  </select>

                  <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-gray-500">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="clients_credit_limit" className={premiumLabel}>
                  الحد الائتماني
                </label>
                <NumberInput
                  id="clients_credit_limit"
                  name="clients_credit_limit"
                  value={formData.clients_credit_limit}
                  onChange={(val) =>
                    setFormData((prev) => ({
                      ...prev,
                      clients_credit_limit: val,
                    }))
                  }
                  placeholder="0.00"
                  className={"mt-1 " + premiumInput}
                />
              </div>

              <div>
  <label htmlFor="clients_status" className={premiumLabel}>
    الحالة
  </label>

  <div className="relative">
    <select
      id="clients_status"
      name="clients_status"
      value={formData.clients_status}
      onChange={handleChange}
      className="appearance-none block w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl shadow-sm bg-white
      focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
      transition-all duration-200 hover:border-gray-400"
      style={{ WebkitAppearance: "none", MozAppearance: "none" }}
    >
      {CLIENT_STATUS_OPTIONS.map((statusOption) => (
        <option key={statusOption.value} value={statusOption.value}>
          {statusOption.label}
        </option>
      ))}
    </select>

    {/* Custom Arrow RTL */}
    <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-gray-500">
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </div>
  </div>
</div>

              <div>
                <label htmlFor="clients_website" className={premiumLabel}>
                  الموقع الإلكتروني
                </label>
                <input
                  type="url"
                  id="clients_website"
                  name="clients_website"
                  value={formData.clients_website}
                  onChange={handleChange}
                  maxLength={255}
                  className={premiumInput}
                  placeholder="https://www.example.com"
                />
              </div>

              <div>
                <label htmlFor="clients_vat_number" className={premiumLabel}>
                  رقم ضريبة القيمة المضافة
                </label>
                <input
                  type="text"
                  id="clients_vat_number"
                  name="clients_vat_number"
                  value={formData.clients_vat_number}
                  onChange={handleChange}
                  maxLength={15}
                  pattern="^3\d{13}3$"
                  className={premiumInput}
                  placeholder="310175397400003"
                />
                <p className="mt-1 text-xs text-gray-500">
                  يجب أن يكون 15 رقماً، يبدأ بـ 3 وينتهي بـ 3
                </p>
                {formData.clients_vat_number && (
                  <p className="mt-1 text-xs text-amber-600">
                    ⚠️ عند إدخال رقم الضريبة، يجب ملء جميع حقول العنوان
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="clients_description" className={premiumLabel}>
                  الوصف
                </label>
                <textarea
                  id="clients_description"
                  name="clients_description"
                  value={formData.clients_description}
                  onChange={handleChange}
                  rows="4"
                  maxLength={500}
                  className={premiumInput + " resize-none"}
                  placeholder="أضف وصفاً للعميل أو ملاحظات إضافية..."
                ></textarea>
              </div>
            </div>
          </div>
        );
      }
      case "contact":
        return (
          <div className={premiumCard}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="clients_contact_name" className={premiumLabel}>
                  اسم جهة الاتصال <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="clients_contact_name"
                  name="clients_contact_name"
                  value={formData.clients_contact_name}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  className={premiumInput}
                  placeholder="أدخل اسم جهة الاتصال"
                />
              </div>

              <div>
                <label
                  htmlFor="clients_contact_job_title"
                  className={premiumLabel}
                >
                  المسمى الوظيفي
                </label>
                <input
                  type="text"
                  id="clients_contact_job_title"
                  name="clients_contact_job_title"
                  value={formData.clients_contact_job_title}
                  onChange={handleChange}
                  maxLength={100}
                  className={premiumInput}
                  placeholder="مثال: مدير المشتريات"
                />
              </div>

              <div>
                <label
                  htmlFor="clients_contact_phone_1"
                  className={premiumLabel}
                >
                  رقم الهاتف 1 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="clients_contact_phone_1"
                  name="clients_contact_phone_1"
                  value={formData.clients_contact_phone_1}
                  onChange={handleChange}
                  required
                  maxLength={20}
                  className={premiumInput}
                  placeholder="+20 123 456 7890"
                />
              </div>

              <div>
                <label
                  htmlFor="clients_contact_phone_2"
                  className={premiumLabel}
                >
                  رقم الهاتف 2
                </label>
                <input
                  type="tel"
                  id="clients_contact_phone_2"
                  name="clients_contact_phone_2"
                  value={formData.clients_contact_phone_2}
                  onChange={handleChange}
                  maxLength={20}
                  className={premiumInput}
                  placeholder="+20 123 456 7890"
                />
              </div>
            </div>
          </div>
        );
      case "address":
        return (
          <div className={premiumCard}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label htmlFor="clients_address" className={premiumLabel}>
                  العنوان{" "}
                  {formData.clients_vat_number && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <input
                  type="text"
                  id="clients_address"
                  name="clients_address"
                  value={formData.clients_address}
                  onChange={handleChange}
                  maxLength={255}
                  className={premiumInput}
                  placeholder="أدخل العنوان التفصيلي (الشارع الرئيسي)"
                />
              </div>

              <div>
                <label htmlFor="clients_street2" className={premiumLabel}>
                  العنوان 2{" "}
                  {formData.clients_vat_number && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <input
                  type="text"
                  id="clients_street2"
                  name="clients_street2"
                  value={formData.clients_street2}
                  onChange={handleChange}
                  maxLength={255}
                  className={premiumInput}
                  placeholder="عنوان إضافي (اختياري)"
                />
              </div>

              <div>
                <label
                  htmlFor="clients_building_number"
                  className={premiumLabel}
                >
                  رقم المبنى{" "}
                  {formData.clients_vat_number && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <input
                  type="text"
                  id="clients_building_number"
                  name="clients_building_number"
                  value={formData.clients_building_number}
                  onChange={handleChange}
                  maxLength={50}
                  className={premiumInput}
                  placeholder="رقم المبنى"
                />
              </div>

              <div>
                <label htmlFor="clients_country" className={premiumLabel}>
                  الدولة{" "}
                  {formData.clients_vat_number && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <SearchableSelect
                  options={
                    cachedCountries.length > 0
                      ? cachedCountries.map((c) => ({
                          value: c.id,
                          label: c.name_ar || c.name_en,
                        }))
                      : countries.map((c) => ({ value: c.code, label: c.name }))
                  }
                  value={formData.clients_country}
                  onChange={(val) =>
                    setFormData((prev) => ({
                      ...prev,
                      clients_country: val,
                      clients_state: "",
                    }))
                  }
                  placeholder="اختر الدولة"
                  className="bg-white"
                />
              </div>

              <div>
                <label htmlFor="clients_state" className={premiumLabel}>
                  المنطقة / المحافظة{" "}
                  {formData.clients_vat_number && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <SearchableSelect
                  options={
                    cachedCountries.length > 0
                      ? (
                          cachedCountries.find(
                            (c) =>
                              String(c.id) === String(formData.clients_country),
                          )?.governorates || []
                        ).map((g) => ({
                          value: g.id,
                          label: g.name_ar || g.name_en,
                        }))
                      : getCitiesByCountryCode(formData.clients_country).map(
                          (city) => ({ value: city, label: city }),
                        )
                  }
                  value={formData.clients_state}
                  onChange={(val) =>
                    setFormData((prev) => ({ ...prev, clients_state: val }))
                  }
                  disabled={!formData.clients_country}
                  placeholder="اختر المنطقة / المحافظة"
                  className="bg-white"
                />
              </div>

              <div>
                <label htmlFor="clients_city" className={premiumLabel}>
                  المدينة{" "}
                  {formData.clients_vat_number && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <input
                  type="text"
                  id="clients_city"
                  name="clients_city"
                  value={formData.clients_city}
                  onChange={handleChange}
                  maxLength={100}
                  className={premiumInput}
                  placeholder="أدخل اسم المدينة"
                />
              </div>

              <div>
                <label htmlFor="clients_zip" className={premiumLabel}>
                  الرمز البريدي{" "}
                  {formData.clients_vat_number && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <input
                  type="text"
                  id="clients_zip"
                  name="clients_zip"
                  value={formData.clients_zip}
                  onChange={handleChange}
                  maxLength={20}
                  className={premiumInput}
                  placeholder="الرمز البريدي"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="clients_area_tag_id" className={premiumLabel}>
                  منطقة العميل <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={clientAreaTags.map((tag) => ({
                    value: String(tag.client_area_tag_id),
                    label: tag.client_area_tag_name,
                  }))}
                  value={formData.clients_area_tag_id}
                  onChange={(val) =>
                    setFormData((prev) => ({
                      ...prev,
                      clients_area_tag_id: val,
                    }))
                  }
                  placeholder="اختر منطقة"
                  className="bg-white"
                />
                {clientAreaTags.length === 0 && (
                  <p className="mt-2 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-start gap-2">
                    <svg
                      className="w-4 h-4 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>
                      لا توجد مناطق عملاء متاحة. يمكنك إضافتها من الإعدادات
                    </span>
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  تحديد الموقع على الخريطة
                </label>
                <div className="rounded-lg overflow-hidden shadow-md border border-gray-200">
                  <MapPicker
                    initialLatitude={parseFloat(formData.clients_latitude)}
                    initialLongitude={parseFloat(formData.clients_longitude)}
                    onLocationChange={handleMapChange}
                  />
                </div>
                <div className="flex gap-4 mt-4">
                  <div className="flex-1">
                    <label
                      htmlFor="clients_latitude"
                      className="block text-xs font-medium text-gray-600 mb-1"
                    >
                      خط العرض
                    </label>
                    <input
                      type="text"
                      id="clients_latitude"
                      name="clients_latitude"
                      value={formData.clients_latitude}
                      onChange={handleChange}
                      maxLength={20}
                      className={premiumInputSmall}
                      placeholder="30.0444"
                    />
                  </div>
                  <div className="flex-1">
                    <label
                      htmlFor="clients_longitude"
                      className="block text-xs font-medium text-gray-600 mb-1"
                    >
                      خط الطول
                    </label>
                    <input
                      type="text"
                      id="clients_longitude"
                      name="clients_longitude"
                      value={formData.clients_longitude}
                      onChange={handleChange}
                      maxLength={20}
                      className={premiumInputSmall}
                      placeholder="31.2357"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case "other":
        return (
          <div className={premiumCard}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="clients_source" className={premiumLabel}>
                  مصدر العميل
                </label>
                <input
                  type="text"
                  id="clients_source"
                  name="clients_source"
                  value={formData.clients_source}
                  onChange={handleChange}
                  maxLength={100}
                  className={premiumInput}
                  placeholder="مثال: إعلانات، توصية، معرض..."
                />
              </div>

              <div>
  <label htmlFor="clients_rep_user_id" className={premiumLabel}>
    المندوب المسئول
  </label>

  <div className="relative">
    <select
      id="clients_rep_user_id"
      name="clients_rep_user_id"
      value={formData.clients_rep_user_id}
      onChange={handleChange}
      required
      className="appearance-none block w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl shadow-sm bg-white
      focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
      transition-all duration-200 hover:border-gray-400"
      style={{ WebkitAppearance: "none", MozAppearance: "none" }}
    >
      <option value="">اختر مندوب</option>
      {allUsers.map((user) => (
        <option key={user.users_id} value={user.users_id}>
          {user.users_name}
        </option>
      ))}
    </select>

    {/* Custom Arrow RTL */}
    <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-gray-500">
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </div>
  </div>
</div>

              <div className="md:col-span-2">
                <label
                  htmlFor="clients_reference_note"
                  className={premiumLabel}
                >
                  ملاحظة مرجعية
                </label>
                <textarea
                  id="clients_reference_note"
                  name="clients_reference_note"
                  value={formData.clients_reference_note}
                  onChange={handleChange}
                  rows="4"
                  maxLength={500}
                  className={premiumInput + " resize-none"}
                  placeholder="أضف أي ملاحظات مرجعية أو تفاصيل إضافية..."
                ></textarea>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="
      bg-white/90 backdrop-blur-md
      p-4 sm:p-6 lg:p-8
      rounded-2xl
      shadow-[0_15px_40px_rgba(0,0,0,0.08)]
      max-w-5xl mx-auto
      border border-[#8DD8F5]/10
    "
      dir="rtl"
    >
      {/* Top accent */}
      <div
        className="h-1.5 w-full rounded-t-2xl mb-4"
        style={{ background: "#8DD8F5" }}
      />

      {/* Strong Title with Icon */}
      <div className="relative mb-8 text-center">
        <div className="flex flex-row-reverse md:flex items-center  justify-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            aria-label="إغلاق"
            className="
      md:absolute top-0 right-0
      p-2
      rounded-lg
      text-[#1F2937]/70
      hover:bg-[#8DD8F5]/20
      transition
    "
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <div
            className="
      w-12 h-12
      rounded-xl
      bg-[#8DD8F5]/20
      flex items-center justify-center
      text-[#8DD8F5]
      shadow-sm
    "
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 11c1.657 0 3-1.343 3-3S13.657 5 12 5 9 6.343 9 8s1.343 3 3 3z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2"
              />
            </svg>
          </div>

          <h3
            className="
        text-2xl sm:text-3xl lg:text-4xl
        font-black
        text-[#1F2937]
        tracking-tight
      "
          >
            تعديل العميل
          </h3>
        </div>

        {/* bottom glow line */}
        <div className="mt-3 flex justify-center">
          <span className="w-24 h-1 rounded-full bg-[#8DD8F5]/70" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
        {formError && (
          <Alert
            message={formError}
            type="error"
            className="mb-4"
            onClose={() => setFormError("")}
          />
        )}

        {/* Tabs */}
        <div className="border-b border-gray-100 overflow-x-auto">
          <nav className="flex min-w-max gap-2 sm:gap-4 pb-1" aria-label="Tabs">
            {[
              { key: "general", label: "المعلومات الأساسية" },
              { key: "contact", label: "معلومات الاتصال" },
              { key: "address", label: "العنوان والخريطة" },
              { key: "other", label: "تفاصيل أخرى" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`
                whitespace-nowrap
                px-4 sm:px-5 py-2.5
                rounded-t-xl
                text-xs sm:text-sm font-semibold
                border-b-2
                transition-all duration-200
                ${
                  activeTab === tab.key
                    ? "border-[#8DD8F5] text-[#1F2937] bg-[#8DD8F5]/10 shadow-sm"
                    : "border-transparent text-[#1F2937]/60 hover:text-[#1F2937] hover:bg-gray-50"
                }
              `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="mt-4 sm:mt-6">{renderTabContent()}</div>

        {/* Actions */}
        <div
          className="
        flex flex-col sm:flex-row
        gap-3 sm:gap-4
        justify-end
        mt-8 pt-6
        border-t border-gray-100
      "
        >
          <button
            type="button"
            onClick={onCancel}
            className="
            px-6 py-2.5
            rounded-xl
            border border-gray-200
            text-sm font-semibold
            text-[#1F2937]
            bg-white
            hover:bg-gray-50
            focus:outline-none
            focus:ring-2 focus:ring-[#8DD8F5]/30
            transition
          "
          >
            إلغاء
          </button>

          <button
            type="submit"
            className="
            px-6 py-2.5
            rounded-xl
            text-sm font-semibold
            text-[#1F2937]
            bg-[#8DD8F5]
            hover:bg-[#7ccfee]
            focus:outline-none
            focus:ring-2 focus:ring-[#8DD8F5]/40
            shadow-lg
            transition
            transform hover:scale-[1.02]
          "
          >
            تحديث عميل
          </button>
        </div>
      </form>
    </div>
  );
}

export default UpdateClientForm;
