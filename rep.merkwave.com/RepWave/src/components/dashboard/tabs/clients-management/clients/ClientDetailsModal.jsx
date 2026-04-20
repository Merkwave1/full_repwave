// src/components/dashboard/tabs/clients-management/clients/ClientDetailsModal.jsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
// Removed: import Modal from '../../../../common/Modal/Modal';
import MapPicker from "../../../../common/MapPicker/MapPicker"; // Assuming this path is correct
import {
  BuildingOffice2Icon,
  EnvelopeIcon,
  GlobeAltIcon,
  PhoneIcon,
  UserCircleIcon,
  MapPinIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  InformationCircleIcon,
  TagIcon,
  BriefcaseIcon,
  ReceiptPercentIcon,
  LinkIcon,
  ChatBubbleBottomCenterTextIcon,
  StarIcon,
  CurrencyDollarIcon,
  HashtagIcon,
  UserIcon,
  XMarkIcon, // Import XMarkIcon for the close button
  Bars3BottomLeftIcon, // For modal header icon
  CubeIcon,
  PlusCircleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import useCurrency from "../../../../../hooks/useCurrency";
import { formatLocalDateTime } from "../../../../../utils/dateUtils";
import { isOdooIntegrationEnabled } from "../../../../../utils/odooIntegration";
import {
  getClientStatusBadgeClass,
  getClientStatusLabel,
} from "../../../../../constants/clientStatus";
import {
  getClientInterestedProducts,
  addClientInterestedProduct,
  removeClientInterestedProduct,
} from "../../../../../apis/clientInterestedProducts";
import { getAppProducts } from "../../../../../apis/products";

// Reusable DetailItem component (re-defined for clarity, assuming it's not globally available)
const DetailItem = ({
  icon,
  label,
  value,
  valueClassName = "text-slate-800",
  children,
}) => (
  <div className="flex items-start text-sm md:text-base justify-between gap-2 py-2 px-3 bg-white rounded-lg border border-gray-200">
    <div className="flex items-start gap-1.5 min-w-0 shrink max-w-[52%]">
      <span className="shrink-0 mt-0.5">
        {React.cloneElement(icon, {
          className: "h-4 w-4 md:h-5 md:w-5 text-blue-500",
        })}
      </span>
      <span className="font-medium text-gray-700 break-words leading-snug">
        {label}:
      </span>
    </div>
    {children || (
      <span
        className={`font-semibold break-all text-right min-w-0 max-w-[48%] ${valueClassName}`}
      >
        {value ?? "غير متوفر"}
      </span>
    )}
  </div>
);

// Assuming Modal component is defined elsewhere or will be defined here
const Modal = ({
  isOpen,
  onClose,
  dir = "rtl",
  modalWidthClass = "max-w-2xl",
  children,
}) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 backdrop-blur-sm bg-black/40 flex justify-center items-center p-2 sm:p-4 z-50"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        className={`bg-white rounded-xl shadow-2xl p-2 sm:p-6 ${modalWidthClass} w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col`}
        dir={dir}
      >
        {children}
      </div>
    </div>
  );
};

function ClientDetailsModal({
  isOpen,
  onClose,
  client,
  allUsers,
  clientAreaTags,
  clientIndustries,
  countries,
  onNotify,
}) {
  // Added clientAreaTags, clientIndustries, countries props
  const [activeTab, setActiveTab] = useState("general"); // 'general', 'contact', 'address', 'other'
  const [odooEnabled] = useState(() => isOdooIntegrationEnabled());
  const statusBadgeClass = useMemo(
    () => getClientStatusBadgeClass(client?.clients_status),
    [client?.clients_status],
  );
  const statusLabel = useMemo(
    () => getClientStatusLabel(client?.clients_status),
    [client?.clients_status],
  );
  const { formatCurrency: formatMoney } = useCurrency();
  const numberFormatter = useMemo(() => new Intl.NumberFormat("en-US"), []);
  const formatCount = (value) => {
    if (value == null || value === "") return "0";
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numberFormatter.format(numeric) : value;
  };
  const formatDate = (value) =>
    value ? formatLocalDateTime(value) : "غير متوفر";

  const notify = typeof onNotify === "function" ? onNotify : null;
  const clientId = client?.clients_id;

  const [interestedProducts, setInterestedProducts] = useState([]);
  const [interestedLoading, setInterestedLoading] = useState(false);
  const [interestsFeedback, setInterestsFeedback] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [removingProductIds, setRemovingProductIds] = useState([]);

  // Find the sales rep's name
  const salesRep = Array.isArray(allUsers)
    ? allUsers.find((user) => user.users_id === client.clients_rep_user_id)
    : null;
  const salesRepName = salesRep ? salesRep.users_name : "غير متوفر";

  // Helper to get area tag name by ID
  const getAreaTagName = (tagId) => {
    if (!Array.isArray(clientAreaTags)) return "غير متوفر";
    const tag = clientAreaTags.find((t) => t.client_area_tag_id === tagId);
    return tag ? tag.client_area_tag_name : "غير متوفر";
  };

  // Helper to get industry name by ID
  const getIndustryName = (industryId) => {
    if (!Array.isArray(clientIndustries)) return "غير متوفر";
    const industry = clientIndustries.find(
      (i) => i.client_industries_id === industryId,
    );
    return industry ? industry.client_industries_name : "غير متوفر";
  };

  // Helper to get country name from ID
  const getCountryName = (countryId) => {
    if (!countryId) return "غير متوفر";
    const country = Array.isArray(countries)
      ? countries.find(
          (c) => String(c.id || c.countries_id) === String(countryId),
        )
      : null;
    return country
      ? country.name_ar ||
          country.countries_name_ar ||
          country.name_en ||
          country.countries_name_en ||
          "غير متوفر"
      : countryId;
  };

  // Helper to get governorate name from ID
  const getGovernorateName = (countryId, governorateId) => {
    if (!countryId || !governorateId) return "غير متوفر";
    const country = Array.isArray(countries)
      ? countries.find(
          (c) => String(c.id || c.countries_id) === String(countryId),
        )
      : null;
    if (!country || !Array.isArray(country.governorates)) return governorateId;
    const gov = country.governorates.find(
      (g) => String(g.id || g.governorates_id) === String(governorateId),
    );
    return gov
      ? gov.name_ar ||
          gov.governorates_name_ar ||
          gov.name_en ||
          gov.governorates_name_en ||
          "غير متوفر"
      : governorateId;
  };

  useEffect(() => {
    if (!isOpen) {
      setActiveTab("general");
      setSelectedProductId("");
      setInterestsFeedback(null);
      setInterestedProducts([]);
      setRemovingProductIds([]);
      return;
    }

    setActiveTab("general");
    setSelectedProductId("");
    setInterestsFeedback(null);
  }, [isOpen, clientId]);

  const normalizeProductsCollection = useCallback((rawProducts) => {
    if (!rawProducts) return [];
    if (Array.isArray(rawProducts)) return rawProducts;
    if (Array.isArray(rawProducts?.data)) return rawProducts.data;
    if (Array.isArray(rawProducts?.products)) return rawProducts.products;
    return [];
  }, []);

  const refreshInterestedProducts = useCallback(
    async ({ cancelRef, silent = false } = {}) => {
      if (!clientId) return;
      if (!silent) setInterestedLoading(true);
      try {
        const data = await getClientInterestedProducts(clientId);
        if (!cancelRef?.current) {
          setInterestedProducts(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        const message = err?.message || "فشل في تحميل المنتجات المهتم بها.";
        if (!cancelRef?.current) {
          setInterestsFeedback({ type: "error", text: message });
          notify?.({ type: "error", message });
        }
      } finally {
        if (!cancelRef?.current && !silent) {
          setInterestedLoading(false);
        }
      }
    },
    [clientId, notify],
  );

  const loadAllProducts = useCallback(
    async ({ cancelRef } = {}) => {
      if (allProducts.length > 0) return;
      setProductsLoading(true);
      try {
        const products = await getAppProducts(false);
        if (!cancelRef?.current) {
          setAllProducts(normalizeProductsCollection(products));
        }
      } catch (err) {
        const message = err?.message || "فشل في تحميل قائمة المنتجات.";
        if (!cancelRef?.current) {
          setInterestsFeedback({ type: "error", text: message });
          notify?.({ type: "error", message });
          try {
            const cachedRaw = localStorage.getItem("appProducts");
            if (cachedRaw) {
              const parsed = JSON.parse(cachedRaw);
              const normalized = normalizeProductsCollection(parsed);
              if (normalized.length > 0) {
                setAllProducts(normalized);
              }
            }
          } catch {
            // ignore JSON parse issues
          }
        }
      } finally {
        if (!cancelRef?.current) {
          setProductsLoading(false);
        }
      }
    },
    [allProducts.length, notify, normalizeProductsCollection],
  );

  useEffect(() => {
    if (!isOpen || activeTab !== "interests" || !clientId) return;
    const cancelRef = { current: false };
    setInterestsFeedback(null);
    refreshInterestedProducts({ cancelRef });
    if (allProducts.length === 0) {
      loadAllProducts({ cancelRef });
    }
    return () => {
      cancelRef.current = true;
    };
  }, [
    isOpen,
    activeTab,
    clientId,
    allProducts.length,
    refreshInterestedProducts,
    loadAllProducts,
  ]);

  const productSelectMeta = useMemo(() => {
    if (!Array.isArray(allProducts)) {
      return { options: [], availableCount: 0 };
    }

    const linkedIds = new Set(
      Array.isArray(interestedProducts)
        ? interestedProducts.map((item) => String(item.products_id))
        : [],
    );

    const collator = new Intl.Collator("ar", { sensitivity: "base" });

    const options = allProducts
      .filter((product) => product?.products_id != null)
      .sort((a, b) => {
        const nameA = (a.products_name || "").toString();
        const nameB = (b.products_name || "").toString();
        return collator.compare(nameA, nameB);
      })
      .map((product) => ({
        value: String(product.products_id),
        label: product.products_name || `منتج #${product.products_id}`,
        brand: product.products_brand || "",
        isLinked: linkedIds.has(String(product.products_id)),
        category: product.products_category || "",
      }));

    const availableCount = options.filter((option) => !option.isLinked).length;

    return { options, availableCount };
  }, [allProducts, interestedProducts]);

  const availableProductOptions = productSelectMeta.options;
  const availableProductCount = productSelectMeta.availableCount;

  const handleAddInterested = async () => {
    if (!clientId) return;
    if (!selectedProductId) {
      setInterestsFeedback({
        type: "error",
        text: "يرجى اختيار منتج لإضافته.",
      });
      return;
    }
    setAddLoading(true);
    setInterestsFeedback(null);
    try {
      const message = await addClientInterestedProduct(
        clientId,
        selectedProductId,
      );
      notify?.({ type: "success", message });
      setInterestsFeedback({ type: "success", text: message });
      setSelectedProductId("");
      await refreshInterestedProducts();
    } catch (err) {
      const message = err?.message || "فشل في إضافة المنتج إلى قائمة الاهتمام.";
      setInterestsFeedback({ type: "error", text: message });
      notify?.({ type: "error", message });
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemoveInterested = async (productId) => {
    if (!clientId) return;
    const productKey = String(productId);
    setRemovingProductIds((prev) =>
      prev.includes(productKey) ? prev : [...prev, productKey],
    );
    setInterestsFeedback(null);
    try {
      const message = await removeClientInterestedProduct(clientId, productId);
      notify?.({ type: "success", message });
      setInterestsFeedback({ type: "success", text: message });
      await refreshInterestedProducts();
    } catch (err) {
      const message = err?.message || "فشل في إزالة المنتج من قائمة الاهتمام.";
      setInterestsFeedback({ type: "error", text: message });
      notify?.({ type: "error", message });
    } finally {
      setRemovingProductIds((prev) => prev.filter((id) => id !== productKey));
    }
  };

  const renderFeedback = () => {
    if (!interestsFeedback) return null;
    const isError = interestsFeedback.type === "error";
    return (
      <div
        className={`rounded-lg border px-4 py-3 text-sm ${isError ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"}`}
      >
        {interestsFeedback.text}
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "general":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DetailItem
              icon={<BuildingOffice2Icon />}
              label="اسم الشركة"
              value={client.clients_company_name}
            />
            {odooEnabled && (
              <DetailItem
                icon={<HashtagIcon />}
                label="معرف Odoo"
                value={client.clients_odoo_partner_id}
              />
            )}
            <DetailItem
              icon={<EnvelopeIcon />}
              label="البريد الإلكتروني"
              value={client.clients_email}
            />
            <DetailItem
              icon={<TagIcon />}
              label="نوع العميل"
              value={client.clients_type}
            />
            <DetailItem icon={<GlobeAltIcon />} label="الموقع الإلكتروني">
              {client.clients_website ? (
                <a
                  href={client.clients_website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {client.clients_website}
                </a>
              ) : (
                "غير متوفر"
              )}
            </DetailItem>
            <DetailItem
              icon={<ReceiptPercentIcon />}
              label="رقم ضريبة القيمة المضافة"
              value={client.clients_vat_number}
            />
            <DetailItem icon={<InformationCircleIcon />} label="الحالة">
              <span
                className={`font-semibold px-3 py-1 rounded-full text-sm ${statusBadgeClass}`}
              >
                {statusLabel}
              </span>
            </DetailItem>
            <DetailItem
              icon={<UserIcon />}
              label="المندوب المسئول"
              value={salesRepName}
            />
            <DetailItem
              icon={<CreditCardIcon />}
              label="حد الائتمان"
              value={formatMoney(client.clients_credit_limit ?? 0)}
            />
            <DetailItem
              icon={<CurrencyDollarIcon />}
              label="الرصيد"
              value={formatMoney(client.clients_credit_balance ?? 0)}
            />
            <div className="col-span-full">
              <DetailItem
                icon={<ChatBubbleBottomCenterTextIcon />}
                label="الوصف"
                value={client.clients_description}
              />
            </div>
          </div>
        );
      case "contact":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DetailItem
              icon={<UserCircleIcon />}
              label="اسم جهة الاتصال"
              value={client.clients_contact_name}
            />
            <DetailItem
              icon={<BriefcaseIcon />}
              label="المسمى الوظيفي"
              value={client.clients_contact_job_title}
            />
            <DetailItem
              icon={<PhoneIcon />}
              label="هاتف 1"
              value={client.clients_contact_phone_1}
            />
            <DetailItem
              icon={<PhoneIcon />}
              label="هاتف 2"
              value={client.clients_contact_phone_2}
            />
          </div>
        );
      case "address":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailItem
                icon={<MapPinIcon />}
                label="العنوان"
                value={client.clients_address}
              />
              <DetailItem
                icon={<BuildingOffice2Icon />}
                label="المدينة"
                value={client.clients_city}
              />
              <DetailItem
                icon={<GlobeAltIcon />}
                label="الدولة"
                value={getCountryName(
                  client.clients_country_id || client.clients_country,
                )}
              />
              <DetailItem
                icon={<MapPinIcon />}
                label="المحافظة"
                value={getGovernorateName(
                  client.clients_country_id || client.clients_country,
                  client.clients_governorate_id || client.clients_state,
                )}
              />
              {/* Use getAreaTagName to display the area name */}
              <DetailItem
                icon={<MapPinIcon />}
                label="المنطقة"
                value={getAreaTagName(client.clients_area_tag_id)}
              />
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الموقع على الخريطة:
              </label>
              {client.clients_latitude && client.clients_longitude ? (
                <div className="h-56 rounded-lg overflow-hidden border border-gray-300 shadow-sm">
                  <MapPicker
                    initialLatitude={parseFloat(client.clients_latitude)}
                    initialLongitude={parseFloat(client.clients_longitude)}
                    onLocationChange={() => {}} // Read-only map
                  />
                </div>
              ) : (
                <div className="h-56 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 border border-gray-300 shadow-sm">
                  <p>لا توجد إحداثيات متاحة لعرضها على الخريطة.</p>
                </div>
              )}
            </div>
          </div>
        );
      case "other":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Use getIndustryName to display the industry name */}
            <DetailItem
              icon={<BriefcaseIcon />}
              label="الصناعة"
              value={getIndustryName(client.clients_industry_id)}
            />
            <DetailItem
              icon={<CreditCardIcon />}
              label="شروط الدفع (أيام)"
              value={client.clients_payment_terms}
            />
            <DetailItem
              icon={<LinkIcon />}
              label="مصدر العميل"
              value={client.clients_source}
            />
            <DetailItem
              icon={<StarIcon />}
              label="ملاحظة مرجعية"
              value={client.clients_reference_note}
            />
            <DetailItem
              icon={<CalendarDaysIcon />}
              label="تاريخ الإنشاء"
              value={formatDate(client.clients_created_at)}
            />
            <DetailItem
              icon={<CalendarDaysIcon />}
              label="آخر زيارة"
              value={formatDate(client.clients_last_visit)}
            />
            <DetailItem
              icon={<CalendarDaysIcon />}
              label="تاريخ آخر طلب"
              value={formatDate(client.clients_last_order_date)}
            />
            <DetailItem
              icon={<HashtagIcon />}
              label="إجمالي الطلبات"
              value={formatCount(client.clients_total_orders)}
            />
            <DetailItem
              icon={<CurrencyDollarIcon />}
              label="إجمالي الإيرادات"
              value={formatMoney(client.clients_total_revenue ?? 0)}
            />
          </div>
        );
      case "interests":
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white border border-blue-100 rounded-xl shadow-sm p-3 sm:p-5 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-base sm:text-lg md:text-xl font-bold text-blue-800 flex items-center gap-2">
                    <PlusCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
                    إضافة منتج مهتم به
                  </h4>
                  <p className="text-xs sm:text-sm text-blue-600 mt-1">
                    اختر منتجًا لإضافته إلى اهتمامات هذا العميل وتشجيع فريق
                    المبيعات على التركيز عليه.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <select
                  className="flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedProductId}
                  onChange={(event) => setSelectedProductId(event.target.value)}
                  disabled={
                    productsLoading || addLoading || availableProductCount === 0
                  }
                >
                  <option value="">
                    {productsLoading
                      ? "جارٍ تحميل قائمة المنتجات..."
                      : "اختر منتجًا"}
                  </option>
                  {availableProductOptions.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      disabled={option.isLinked}
                    >
                      {option.label}
                      {option.brand ? ` — ${option.brand}` : ""}
                      {option.isLinked ? " (مرتبط بالفعل)" : ""}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddInterested}
                  disabled={addLoading || !selectedProductId}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    addLoading || !selectedProductId
                      ? "bg-blue-200 text-white cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {addLoading ? (
                    <span className="inline-block h-4 w-4 rounded-full border-2 border-white/70 border-t-transparent animate-spin" />
                  ) : (
                    <PlusCircleIcon className="h-5 w-5" />
                  )}
                  <span>{addLoading ? "جارٍ الإضافة..." : "إضافة المنتج"}</span>
                </button>
              </div>
              {!productsLoading && availableProductCount === 0 && (
                <p className="mt-3 text-sm text-blue-700">
                  لا توجد منتجات متاحة للإضافة، أو تم ربط جميع المنتجات بالفعل
                  بهذا العميل.
                </p>
              )}
            </div>

            {renderFeedback()}

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="px-3 sm:px-5 md:px-6 py-2.5 sm:py-4 border-b border-gray-100 flex items-center justify-between">
                <h4 className="text-sm sm:text-base md:text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <CubeIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 shrink-0" />
                  المنتجات المهتم بها
                </h4>
                <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  {interestedProducts.length}
                </span>
              </div>
              <div className="p-3 sm:p-5 md:p-6">
                {interestedLoading ? (
                  <div className="py-6 sm:py-8 flex items-center justify-center text-gray-500 gap-3 text-sm">
                    <span className="inline-block h-5 w-5 rounded-full border-2 border-blue-300 border-t-transparent animate-spin" />
                    جاري تحميل المنتجات المرتبطة...
                  </div>
                ) : interestedProducts.length === 0 ? (
                  <div className="py-10 text-center text-gray-500">
                    <div className="text-4xl mb-3">🛒</div>
                    <p className="font-semibold">
                      لم يتم إضافة أي منتجات مهتم بها بعد.
                    </p>
                    <p className="text-sm mt-1">
                      يمكنك إضافة المنتجات من القسم أعلاه.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-4">
                    {interestedProducts.map((product) => {
                      const productIdStr = String(product.products_id);
                      const isRemoving =
                        removingProductIds.includes(productIdStr);
                      return (
                        <li
                          key={productIdStr}
                          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-lg border border-gray-100 bg-gray-50 p-4"
                        >
                          <div className="flex items-start gap-2.5 sm:gap-4">
                            {product.products_image_url ? (
                              <img
                                src={product.products_image_url}
                                alt={product.products_name || "Product Image"}
                                className="h-12 w-12 sm:h-16 sm:w-16 rounded-lg border border-gray-200 object-cover shrink-0"
                                onError={(event) => {
                                  event.currentTarget.src =
                                    "https://placehold.co/64x64/E2E8F0/64748B?text=No+Image";
                                  event.currentTarget.onerror = null;
                                }}
                              />
                            ) : (
                              <div className="h-12 w-12 sm:h-16 sm:w-16 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 shrink-0">
                                <CubeIcon className="h-6 w-6 sm:h-8 sm:w-8" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <h5 className="text-sm sm:text-base md:text-lg font-bold text-gray-800 break-words">
                                {product.products_name ||
                                  `منتج #${product.products_id}`}
                              </h5>
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                                {product.products_brand && (
                                  <span className="bg-white border border-gray-200 px-2 py-1 rounded-full">
                                    العلامة: {product.products_brand}
                                  </span>
                                )}
                                {product.products_category && (
                                  <span className="bg-white border border-gray-200 px-2 py-1 rounded-full">
                                    الفئة: {product.products_category}
                                  </span>
                                )}
                                <span
                                  className={`px-2 py-1 rounded-full font-semibold ${Number(product.products_is_active) === 1 ? "bg-green-100 text-green-700 border border-green-200" : "bg-red-100 text-red-700 border border-red-200"}`}
                                >
                                  {Number(product.products_is_active) === 1
                                    ? "نشط"
                                    : "غير نشط"}
                                </span>
                              </div>
                              {product.products_description && (
                                <p
                                  className="mt-2 text-sm text-gray-600"
                                  style={{
                                    display: "-webkit-box",
                                    WebkitBoxOrient: "vertical",
                                    WebkitLineClamp: 2,
                                    overflow: "hidden",
                                  }}
                                >
                                  {product.products_description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveInterested(product.products_id)
                              }
                              disabled={isRemoving}
                              className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                                isRemoving
                                  ? "border-red-200 bg-red-200 text-red-600 cursor-wait"
                                  : "border-red-200 text-red-600 hover:bg-red-600 hover:text-white"
                              }`}
                            >
                              {isRemoving ? (
                                <span className="inline-block h-4 w-4 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
                              ) : (
                                <TrashIcon className="h-4 w-4" />
                              )}
                              <span>
                                {isRemoving ? "جارٍ الإزالة..." : "إزالة"}
                              </span>
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (!isOpen || !client) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      dir="rtl"
      modalWidthClass="max-w-4xl"
    >
      {" "}
      {/* Adjusted modalWidthClass */}
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 bg-white rounded-t-xl sticky top-0 z-10">
        <h3 className="text-base sm:text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-1.5 sm:gap-2">
          <Bars3BottomLeftIcon className="h-5 w-5 sm:h-7 sm:w-7 text-blue-600 shrink-0" />
          تفاصيل العميل
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 sm:p-2 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors"
        >
          <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      </div>
      {/* Body */}
      <div className="p-3 sm:p-6 flex-grow overflow-y-auto bg-gray-50">
        {/* Top section - Client Header */}
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-6 mb-3 sm:mb-6 flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-5 md:gap-6">
          <div className="flex-shrink-0">
            {client.clients_image ? (
              <img
                src={client.clients_image}
                alt={client.clients_company_name || "Client Image"}
                className="w-20 h-20 sm:w-32 sm:h-32 md:w-44 md:h-44 object-cover rounded-lg shadow-inner border border-gray-200"
                onError={(e) => {
                  e.currentTarget.src =
                    "https://placehold.co/192x192/E2E8F0/64748B?text=No+Image";
                  e.currentTarget.onerror = null;
                }}
              />
            ) : (
              <div className="w-20 h-20 sm:w-32 sm:h-32 md:w-44 md:h-44 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500 border border-gray-200 shadow-inner">
                <BuildingOffice2Icon className="w-10 h-10 sm:w-16 sm:h-16" />
              </div>
            )}
          </div>
          <div className="flex-grow text-center sm:text-right min-w-0">
            <h4 className="text-lg sm:text-2xl md:text-3xl font-extrabold text-gray-900 mb-1 sm:mb-2 break-words">
              {client.clients_company_name}
            </h4>
            <p className="text-gray-600 text-xs sm:text-sm md:text-base leading-relaxed line-clamp-3 sm:line-clamp-none">
              {client.clients_description || "لا يوجد وصف مفصل لهذا العميل."}
            </p>
            <div className="mt-2 sm:mt-4 flex flex-wrap justify-center sm:justify-end gap-1.5 sm:gap-3">
              <span
                className={`text-xs sm:text-sm font-semibold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full ${statusBadgeClass}`}
              >
                الحالة: {statusLabel}
              </span>
              <span className="bg-green-100 text-green-800 text-xs sm:text-sm font-semibold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full">
                الرصيد: {formatMoney(client.clients_credit_balance ?? 0)}
              </span>
              <span className="bg-blue-100 text-blue-800 text-xs sm:text-sm font-semibold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full">
                الحد: {formatMoney(client.clients_credit_limit ?? 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="border-b border-gray-200 mb-3 sm:mb-4 bg-white rounded-lg shadow-sm">
          <nav
            className="-mb-px flex space-x-1 sm:space-x-4 space-x-reverse overflow-x-auto px-1 sm:px-4 scrollbar-hide"
            aria-label="Tabs"
          >
            <button
              type="button"
              onClick={() => setActiveTab("general")}
              className={`whitespace-nowrap py-2 px-2 sm:py-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm rounded-t-lg transition-colors duration-200 ease-in-out ${
                activeTab === "general"
                  ? "border-blue-600 text-blue-600 bg-blue-50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              معلومات عامة
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("contact")}
              className={`whitespace-nowrap py-2 px-2 sm:py-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm rounded-t-lg transition-colors duration-200 ease-in-out ${
                activeTab === "contact"
                  ? "border-blue-600 text-blue-600 bg-blue-50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              معلومات الاتصال
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("address")}
              className={`whitespace-nowrap py-2 px-2 sm:py-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm rounded-t-lg transition-colors duration-200 ease-in-out ${
                activeTab === "address"
                  ? "border-blue-600 text-blue-600 bg-blue-50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              العنوان والخريطة
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("other")}
              className={`whitespace-nowrap py-2 px-2 sm:py-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm rounded-t-lg transition-colors duration-200 ease-in-out ${
                activeTab === "other"
                  ? "border-blue-600 text-blue-600 bg-blue-50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              تفاصيل أخرى
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("interests")}
              className={`whitespace-nowrap py-2 px-2 sm:py-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm rounded-t-lg transition-colors duration-200 ease-in-out ${
                activeTab === "interests"
                  ? "border-blue-600 text-blue-600 bg-blue-50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              اهتمامات المنتجات
            </button>
          </nav>
        </div>

        {/* Content Area for Tabs */}
        <div className="mt-3 sm:mt-4 bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow-md">
          {renderTabContent()}
        </div>
      </div>
      {/* Footer */}
      <div className="p-4 bg-gray-100 border-t border-gray-200 rounded-b-xl sticky bottom-0">
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-3 sm:px-6 sm:py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out shadow-md text-base sm:text-sm"
          >
            إغلاق
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ClientDetailsModal;
