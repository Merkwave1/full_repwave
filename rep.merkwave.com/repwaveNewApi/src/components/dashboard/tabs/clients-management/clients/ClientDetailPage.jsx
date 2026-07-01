// src/components/dashboard/tabs/clients-management/clients/ClientDetailPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import {
  ArrowRightIcon,
  PencilSquareIcon,
  TrashIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
  ChartBarIcon,
  UserIcon,
  GlobeAltIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  FolderOpenIcon,
  InformationCircleIcon,
  BuildingOffice2Icon,
  TruckIcon,
  ArrowUturnLeftIcon,
  ReceiptRefundIcon,
  BriefcaseIcon,
  HashtagIcon,
  TagIcon,
  IdentificationIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";
import {
  getClientDetails,
  updateClient,
  deleteClient,
} from "../../../../../apis/clients";
import {
  getAppUsers,
  getAppClientAreaTags,
  getAppClientIndustries,
} from "../../../../../apis/auth";
import { getAllCountriesWithGovernorates } from "../../../../../apis/countries";
import {
  getClientStatusBadgeClass,
  getClientStatusLabel,
} from "../../../../../constants/clientStatus";
import { formatCurrency } from "../../../../../utils/currency";
import { formatLocalDateTime } from "../../../../../utils/dateUtils";
import { buildGoogleMapsLink } from "../../../../../utils/googleMapsLink.js";
import useCurrency from "../../../../../hooks/useCurrency";
import Loader from "../../../../common/Loader/Loader";
import Alert from "../../../../common/Alert/Alert";
import DeleteConfirmationModal from "../../../../common/DeleteConfirmationModal";
import UpdateClientForm from "./UpdateClientForm";
import ClientAccountStatementModal from "./ClientAccountStatementModal";
import ClientDocumentsModal from "./details/ClientDocumentsModal";
import ClientOrdersModal from "./details/ClientOrdersModal";
import ClientPaymentsModal from "./details/ClientPaymentsModal";
import ClientReturnsModal from "./details/ClientReturnsModal";
import ClientDeliveriesModal from "./details/ClientDeliveriesModal";
import ClientRefundsModal from "./details/ClientRefundsModal";

const safeDate = (v) => {
  try {
    return v ? formatLocalDateTime(v) : null;
  } catch {
    return null;
  }
};

// ── Credit bar ──────────────────────────────────────────────────────────────
function CreditBar({ balance, limit }) {
  const bal = parseFloat(balance ?? 0);
  const lim = parseFloat(limit ?? 0);
  if (lim <= 0) return null;
  const pct = Math.min(100, Math.max(0, (bal / lim) * 100));
  const danger = pct >= 90;
  const warn = pct >= 70;
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-gray-500 mb-1 font-medium">
        <span>{"الرصيد المستخدم"}</span>
        <span
          className={
            danger
              ? "text-red-600 font-bold"
              : warn
                ? "text-amber-600 font-bold"
                : "text-[#8B5FD6] font-bold"
          }
        >
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${danger ? "bg-red-500" : warn ? "bg-amber-400" : "bg-emerald-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── KPI card ────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, color, onClick }) {
  const palette = {
    cyan: "from-[#8B5FD6]   to-[#7A52C2]   shadow-[#8B5FD6]/25",
    green: "from-emerald-400 to-emerald-600 shadow-emerald-200/60",
    blue: "from-[#8B5FD6] to-[#7A52C2] shadow-[#8B5FD6]/20",
    indigo: "from-[#8B5FD6] to-[#7A52C2] shadow-[#8B5FD6]/20",
    amber: "from-amber-400  to-amber-600  shadow-amber-200/60",
    red: "from-red-400    to-red-600    shadow-red-200/60",
    purple: "from-purple-400 to-purple-700 shadow-purple-200/60",
  };
  const cls = palette[color] ?? palette.blue;
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`relative rounded-2xl p-5 flex flex-col gap-2 text-right bg-gradient-to-br ${cls} text-white shadow-lg overflow-hidden w-full
        ${onClick ? "hover:shadow-xl hover:-translate-y-1 cursor-pointer active:scale-95" : "cursor-default"} transition-all duration-200`}
    >
      <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
      <div className="flex items-start justify-between relative z-10">
        <div className="bg-white/20 p-2 rounded-xl">{icon}</div>
        <span className="text-2xl font-extrabold leading-tight">{value}</span>
      </div>
      <span className="text-xs font-semibold opacity-80 relative z-10">
        {label}
      </span>
    </button>
  );
}

// ── Action button ───────────────────────────────────────────────────────────
function ActionBtn({ icon, label, color, onClick }) {
  const cols = {
    blue: "from-[#8B5FD6] to-[#7A52C2] shadow-[#8B5FD6]/25",
    emerald: "from-[#8B5FD6] to-[#7A52C2] shadow-[#8B5FD6]/25",
    amber: "from-amber-400  to-amber-600  shadow-amber-200/70",
    indigo: "from-[#8B5FD6] to-[#7A52C2] shadow-[#8B5FD6]/25",
    teal: "from-[#8B5FD6] to-[#7A52C2] shadow-[#8B5FD6]/20",
    rose: "from-rose-500   to-rose-700   shadow-rose-200/70",
    purple: "from-purple-500 to-purple-700 shadow-purple-200/70",
    cyan: "from-[#8B5FD6] to-[#6B45B0] shadow-[#8B5FD6]/25",
  };
  return (
    <button
      onClick={onClick}
      className={`bg-gradient-to-br ${cols[color] ?? cols.blue} text-white rounded-2xl px-2 py-4 flex flex-col items-center justify-center gap-2 text-xs font-bold shadow-md transition-all duration-200 active:scale-95 hover:-translate-y-1 hover:shadow-lg`}
    >
      <span className="w-6 h-6">{icon}</span>
      {label}
    </button>
  );
}

// ── Info row ────────────────────────────────────────────────────────────────
function InfoRow({ label, value, children, icon }) {
  const content = children ?? (value != null ? String(value) : null);
  if (!content) return null;
  return (
    <div className="flex flex-col gap-0.5 py-1.5">
      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
        {icon && <span className="w-3 h-3 opacity-60">{icon}</span>}
        {label}
      </span>
      <span className="text-sm text-gray-800 font-medium break-words">
        {content}
      </span>
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────
export default function ClientDetailPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const outletCtx = useOutletContext();
  const setGlobalMessage = outletCtx?.setGlobalMessage;
  const { symbol } = useCurrency();

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const [allUsers, setAllUsers] = useState([]);
  const [clientAreaTags, setClientAreaTags] = useState([]);
  const [clientIndustries, setClientIndustries] = useState([]);
  const [countries, setCountries] = useState([]);

  // Modals
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [returnsOpen, setReturnsOpen] = useState(false);
  const [deliveriesOpen, setDeliveriesOpen] = useState(false);
  const [refundsOpen, setRefundsOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [imgError, setImgError] = useState(false);

  const loadClient = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [clientData, usersData, tagsData, industriesData, countriesData] =
        await Promise.all([
          getClientDetails(clientId),
          getAppUsers(),
          getAppClientAreaTags(),
          getAppClientIndustries(),
          getAllCountriesWithGovernorates(),
        ]);
      setClient(clientData);
      setAllUsers(Array.isArray(usersData) ? usersData : []);
      setClientAreaTags(Array.isArray(tagsData) ? tagsData : []);
      setClientIndustries(Array.isArray(industriesData) ? industriesData : []);
      setCountries(Array.isArray(countriesData) ? countriesData : []);
    } catch (e) {
      setError(
        "\u0641\u0634\u0644 \u0641\u064a \u062a\u062d\u0645\u064a\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0639\u0645\u064a\u0644: " +
          (e.message ||
            "\u062e\u0637\u0623 \u063a\u064a\u0631 \u0645\u0639\u0631\u0648\u0641"),
      );
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  const getRepName = (id) =>
    allUsers.find((u) => u.users_id === id)?.users_name ?? "\u2014";
  const getAreaName = (id) =>
    clientAreaTags.find((t) => t.client_area_tag_id === id)
      ?.client_area_tag_name ?? "\u2014";
  const getIndustryName = (id) =>
    clientIndustries.find((i) => i.client_industries_id === id)
      ?.client_industries_name ?? "\u2014";
  const getCountryName = (id) => {
    if (!id) return "\u2014";
    const c = countries.find(
      (c) => String(c.id ?? c.countries_id) === String(id),
    );
    return c?.name_ar ?? c?.countries_name_ar ?? c?.name_en ?? String(id);
  };
  const getGovName = (cId, gId) => {
    if (!cId || !gId) return "\u2014";
    const country = countries.find(
      (c) => String(c.id ?? c.countries_id) === String(cId),
    );
    const gov = country?.governorates?.find(
      (g) => String(g.id ?? g.governorates_id) === String(gId),
    );
    return (
      gov?.name_ar ?? gov?.governorates_name_ar ?? gov?.name_en ?? String(gId)
    );
  };

  const handleUpdate = async (formData) => {
    setEditLoading(true);
    try {
      const toInt = (v) => {
        const n = parseInt(v, 10);
        return isNaN(n) ? null : n;
      };
      const toDecimal = (v) => {
        if (v === null || v === undefined || v === "") return 0;
        const n = parseFloat(v);
        return isNaN(n) ? 0 : n;
      };
      const toNullableDecimal = (v) => {
        if (v === null || v === undefined || v === "") return null;
        const n = parseFloat(v);
        return isNaN(n) ? null : n;
      };
      const payload = {
        clients_company_name: formData.clients_company_name || "",
        clients_email: formData.clients_email || null,
        clients_contact_name: formData.clients_contact_name || null,
        clients_contact_phone1: formData.clients_contact_phone1 || null,
        clients_contact_phone2: formData.clients_contact_phone2 || null,
        clients_contact_job_title: formData.clients_contact_job_title || null,
        clients_address: formData.clients_address || null,
        clients_street2: formData.clients_street2 || null,
        clients_building_number: formData.clients_building_number || null,
        clients_city: formData.clients_city || null,
        clients_zip: formData.clients_zip || null,
        clients_country_id: toInt(
          formData.clients_country ?? formData.clients_country_id,
        ),
        clients_governorate_id: toInt(
          formData.clients_state ?? formData.clients_governorate_id,
        ),
        clients_area_tag_id: toInt(formData.clients_area_tag_id),
        clients_client_type_id: toInt(formData.clients_client_type_id),
        clients_industry_id: toInt(formData.clients_industry_id),
        clients_rep_user_id: toInt(formData.clients_rep_user_id),
        clients_credit_limit: toDecimal(formData.clients_credit_limit),
        clients_status: formData.clients_status || "active",
        clients_vat_number: formData.clients_vat_number || null,
        clients_website: formData.clients_website || null,
        clients_description: formData.clients_description || null,
        clients_source: formData.clients_source || null,
        clients_payment_terms: formData.clients_payment_terms || null,
        clients_reference_note: formData.clients_reference_note || null,
        clients_latitude: toNullableDecimal(formData.clients_latitude),
        clients_longitude: toNullableDecimal(formData.clients_longitude),
        clients_image: formData.clients_image || null,
      };
      await updateClient(client.clients_id, payload);
      setEditOpen(false);
      setGlobalMessage?.({
        type: "success",
        message:
          "\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0639\u0645\u064a\u0644 \u0628\u0646\u062c\u0627\u062d!",
      });
      setImgError(false);
      await loadClient();
    } catch (e) {
      setGlobalMessage?.({
        type: "error",
        message:
          e.message ||
          "\u0641\u0634\u0644 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0639\u0645\u064a\u0644.",
      });
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteClient(client.clients_id);
      setGlobalMessage?.({
        type: "success",
        message: `\u062a\u0645 \u062d\u0630\u0641 \u0627\u0644\u0639\u0645\u064a\u0644 "${client.clients_company_name}" \u0628\u0646\u062c\u0627\u062d.`,
      });
      navigate("/dashboard/clients");
    } catch (e) {
      const errMsg =
        e.response?.data?.message ||
        e.response?.data?.error ||
        e.message ||
        "\u0641\u0634\u0644 \u062d\u0630\u0641 \u0627\u0644\u0639\u0645\u064a\u0644.";
      setDeleteOpen(false);
      setGlobalMessage?.({
        type: "error",
        message: errMsg,
      });
      setDeleteLoading(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <Loader />
      </div>
    );
  if (error)
    return (
      <div className="p-6" dir="rtl">
        <Alert message={error} type="error" />
        <button
          onClick={() => navigate("/dashboard/clients")}
          className="mt-4 px-4 py-2 bg-[#8B5FD6] text-white rounded-lg"
        >
          {
            "\u0627\u0644\u0639\u0648\u062f\u0629 \u0644\u0644\u0639\u0645\u0644\u0627\u0621"
          }
        </button>
      </div>
    );
  if (!client) return null;

  const fmt = (v) => formatCurrency(v ?? 0);
  const bal = parseFloat(client.clients_credit_balance ?? 0);
  const lim = parseFloat(client.clients_credit_limit ?? 0);
  const statusLabel = getClientStatusLabel(client.clients_status);
  const initials = (client.clients_company_name || "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const hasImage = client.clients_image && !imgError;

  const tabs = [
    {
      key: "overview",
      label: "\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629",
      icon: <InformationCircleIcon className="h-4 w-4" />,
    },
    {
      key: "contact",
      label: "\u0627\u0644\u062a\u0648\u0627\u0635\u0644",
      icon: <PhoneIcon className="h-4 w-4" />,
    },
    {
      key: "address",
      label:
        "\u0627\u0644\u0645\u0648\u0642\u0639 \u0648\u0627\u0644\u0639\u0646\u0648\u0627\u0646",
      icon: <MapPinIcon className="h-4 w-4" />,
    },
    {
      key: "financial",
      label: "\u0627\u0644\u0645\u0627\u0644\u064a\u0629",
      icon: <CurrencyDollarIcon className="h-4 w-4" />,
    },
    {
      key: "notes",
      label: "\u0645\u0644\u0627\u062d\u0638\u0627\u062a",
      icon: <DocumentTextIcon className="h-4 w-4" />,
    },
  ];

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-[#f5f3ff]/30"
      dir="rtl"
    >
      {/* Sticky top bar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate("/dashboard/clients")}
            className="flex items-center gap-2 text-gray-500 hover:text-[#8B5FD6] transition-colors text-sm font-semibold bg-gray-100 hover:bg-[#f5f3ff] px-3 py-1.5 rounded-xl"
          >
            <ArrowRightIcon className="h-4 w-4" />
            <span className="hidden sm:inline">
              {
                "\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621"
              }
            </span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setStatementOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-[#f5f3ff] text-[#7A52C2] hover:bg-[#EDE7FF] text-sm font-semibold flex items-center gap-1.5 border border-[#C4A8F0]/50 transition-colors"
            >
              <ChartBarIcon className="h-4 w-4" />
              <span className="hidden sm:inline">
                {"\u0643\u0634\u0641 \u062d\u0633\u0627\u0628"}
              </span>
            </button>
            <button
              onClick={() => setEditOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#8B5FD6] to-[#7A52C2] hover:from-[#7A52C2] hover:to-[#6B45B0] text-white text-sm font-semibold flex items-center gap-1.5 shadow-sm shadow-[#C4A8F0]/40 transition-all"
            >
              <PencilSquareIcon className="h-4 w-4" />
              {"\u062a\u0639\u062f\u064a\u0644"}
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              className="p-1.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 border border-red-200 transition-colors"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Hero card */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Cover */}
          <div
            className="h-56 relative overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, #02415A 0%, #0369a1 50%, #8DD8F5 100%)",
            }}
          >
            {hasImage && (
              <img
                src={client.clients_image}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-25 blur-sm scale-110"
              />
            )}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 15% 60%, rgba(255,255,255,0.18) 0%, transparent 45%), radial-gradient(circle at 85% 15%, rgba(255,255,255,0.12) 0%, transparent 40%), radial-gradient(circle at 50% 90%, rgba(0,0,0,0.2) 0%, transparent 60%)",
              }}
            />
            {/* Decorative circles */}
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/5" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5" />
            <div className="absolute bottom-4 left-5 flex items-center gap-2">
              <span
                className={`text-xs font-bold px-3 py-1.5 rounded-full border-2 border-white/50 text-white backdrop-blur-sm ${getClientStatusBadgeClass?.(client.clients_status) ?? "bg-white/20"}`}
              >
                {statusLabel}
              </span>
              <span className="text-white/80 text-xs font-mono bg-white/15 backdrop-blur-sm px-2.5 py-1.5 rounded-full border border-white/20">
                #{client.clients_id}
              </span>
            </div>
          </div>

          <div className="px-6 pb-6">
            <div className="relative z-10 flex flex-col sm:flex-row gap-5 -mt-16">
              {/* Avatar / Image */}
              <div className="flex-shrink-0">
                {hasImage ? (
                  <img
                    src={client.clients_image}
                    alt={client.clients_company_name}
                    onError={() => setImgError(true)}
                    className="w-36 h-36 rounded-3xl object-cover border-4 border-white shadow-2xl ring-4 ring-[#C4A8F0]/30"
                  />
                ) : (
                  <div className="w-36 h-36 rounded-3xl bg-gradient-to-br from-[#8B5FD6] via-[#8B5FD6] to-[#2D1B69] border-4 border-white shadow-2xl ring-4 ring-[#C4A8F0]/30 flex items-center justify-center text-white text-4xl font-extrabold select-none">
                    {initials}
                  </div>
                )}
              </div>

              {/* Name + contact pills */}
              <div className="flex-1 pt-2 sm:pt-16 min-w-0">
                <h1 className="text-3xl font-extrabold text-gray-900 leading-tight truncate">
                  {client.clients_company_name ||
                    "\u0639\u0645\u064a\u0644 \u063a\u064a\u0631 \u0645\u062d\u062f\u062f"}
                </h1>
                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                  {client.clients_contact_name && (
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <UserIcon className="h-3.5 w-3.5 text-gray-400" />
                      {client.clients_contact_name}
                      {client.clients_contact_job_title && (
                        <span className="text-gray-400 text-xs">
                          {"\u00b7 "}
                          {client.clients_contact_job_title}
                        </span>
                      )}
                    </span>
                  )}
                  {client.clients_city && (
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <MapPinIcon className="h-3.5 w-3.5 text-gray-400" />
                      {[
                        client.clients_city,
                        getCountryName(client.clients_country_id),
                      ]
                        .filter(Boolean)
                        .join("، ")}
                    </span>
                  )}
                  {client.clients_industry_id && (
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <BriefcaseIcon className="h-3.5 w-3.5 text-gray-400" />
                      {getIndustryName(client.clients_industry_id)}
                    </span>
                  )}
                </div>

                {/* Contact pills */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {client.clients_contact_phone1 && (
                    <a
                      href={`tel:${client.clients_contact_phone1}`}
                      className="flex items-center gap-1.5 bg-[#f5f3ff] border border-[#C4A8F0]/50 text-[#2D1B69] px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-[#EDE7FF] transition-colors"
                    >
                      <PhoneIcon className="h-3.5 w-3.5" />
                      {client.clients_contact_phone1}
                    </a>
                  )}
                  {client.clients_contact_phone2 && (
                    <a
                      href={`tel:${client.clients_contact_phone2}`}
                      className="flex items-center gap-1.5 bg-[#f5f3ff] border border-[#C4A8F0]/50 text-[#2D1B69] px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-[#EDE7FF] transition-colors"
                    >
                      <PhoneIcon className="h-3.5 w-3.5" />
                      {client.clients_contact_phone2}
                    </a>
                  )}
                  {client.clients_email && (
                    <a
                      href={`mailto:${client.clients_email}`}
                      className="flex items-center gap-1.5 bg-[#f5f3ff] border border-[#C4A8F0] text-[#2D1B69] px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-[#EDE7FF] transition-colors"
                    >
                      <EnvelopeIcon className="h-3.5 w-3.5" />
                      {client.clients_email}
                    </a>
                  )}
                  {client.clients_website && (
                    <a
                      href={client.clients_website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-800 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-purple-100 transition-colors"
                    >
                      <GlobeAltIcon className="h-3.5 w-3.5" />
                      {"\u0627\u0644\u0645\u0648\u0642\u0639"}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Credit bar */}
            {lim > 0 && (
              <div className="mt-5 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    {
                      "\u0627\u0644\u0631\u0635\u064a\u062f \u0645\u0642\u0627\u0628\u0644 \u0627\u0644\u062d\u062f \u0627\u0644\u0627\u0626\u062a\u0645\u0627\u0646\u064a"
                    }
                  </span>
                  <div className="flex items-center gap-3 text-sm font-bold">
                    <span
                      className={bal >= lim ? "text-red-600" : "text-[#8B5FD6]"}
                    >
                      {fmt(bal)}
                    </span>
                    <span className="text-gray-300">/</span>
                    <span className="text-gray-600">{fmt(lim)}</span>
                  </div>
                </div>
                <CreditBar balance={bal} limit={lim} />
              </div>
            )}
          </div>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard
            icon={<CurrencyDollarIcon className="h-6 w-6" />}
            label={
              "\u0627\u0644\u0631\u0635\u064a\u062f \u0627\u0644\u062d\u0627\u0644\u064a"
            }
            value={fmt(bal)}
            color={bal < 0 ? "red" : bal >= lim && lim > 0 ? "amber" : "green"}
          />
          <KpiCard
            icon={<CreditCardIcon className="h-6 w-6" />}
            label={
              "\u062d\u062f \u0627\u0644\u0627\u0626\u062a\u0645\u0627\u0646"
            }
            value={fmt(lim)}
            color="blue"
          />
          <KpiCard
            icon={<ShoppingCartIcon className="h-6 w-6" />}
            label={
              "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0637\u0644\u0628\u0627\u062a"
            }
            value={client.clients_total_orders ?? 0}
            color="indigo"
            onClick={() => setOrdersOpen(true)}
          />
          <KpiCard
            icon={<ArrowTrendingUpIcon className="h-6 w-6" />}
            label={
              "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0625\u064a\u0631\u0627\u062f\u0627\u062a"
            }
            value={fmt(client.clients_total_revenue)}
            color="amber"
          />
        </div>

        {/* Action grid */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
          <ActionBtn
            icon={<ShoppingCartIcon className="w-5 h-5" />}
            label={"\u0627\u0644\u0637\u0644\u0628\u0627\u062a"}
            color="blue"
            onClick={() => setOrdersOpen(true)}
          />
          <ActionBtn
            icon={<CurrencyDollarIcon className="w-5 h-5" />}
            label={"\u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0627\u062a"}
            color="emerald"
            onClick={() => setPaymentsOpen(true)}
          />
          <ActionBtn
            icon={<TruckIcon className="w-5 h-5" />}
            label={"\u0627\u0644\u062a\u0633\u0644\u064a\u0645\u0627\u062a"}
            color="teal"
            onClick={() => setDeliveriesOpen(true)}
          />
          <ActionBtn
            icon={<ArrowUturnLeftIcon className="w-5 h-5" />}
            label={"\u0627\u0644\u0645\u0631\u062a\u062c\u0639\u0627\u062a"}
            color="amber"
            onClick={() => setReturnsOpen(true)}
          />
          <ActionBtn
            icon={<ReceiptRefundIcon className="w-5 h-5" />}
            label={
              "\u0627\u0644\u0627\u0633\u062a\u0631\u062f\u0627\u062f\u0627\u062a"
            }
            color="rose"
            onClick={() => setRefundsOpen(true)}
          />
          <ActionBtn
            icon={<ChartBarIcon className="w-5 h-5" />}
            label={"\u0643\u0634\u0641 \u062d\u0633\u0627\u0628"}
            color="indigo"
            onClick={() => setStatementOpen(true)}
          />
          <ActionBtn
            icon={<FolderOpenIcon className="w-5 h-5" />}
            label={"\u0627\u0644\u0645\u0633\u062a\u0646\u062f\u0627\u062a"}
            color="purple"
            onClick={() => setDocumentsOpen(true)}
          />
          <ActionBtn
            icon={<PencilSquareIcon className="w-5 h-5" />}
            label={"\u062a\u0639\u062f\u064a\u0644"}
            color="cyan"
            onClick={() => setEditOpen(true)}
          />
        </div>

        {/* Tabbed detail sections */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Tab bar */}
          <div className="flex gap-1 p-2 bg-gray-50/80 border-b border-gray-100 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold whitespace-nowrap rounded-xl transition-all
                  ${
                    activeTab === tab.key
                      ? "bg-white text-[#8B5FD6] shadow-sm border border-gray-200"
                      : "text-gray-500 hover:text-gray-700 hover:bg-white/60"
                  }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-5 sm:p-7">
            {/* Overview tab */}
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 divide-y divide-gray-50">
                <InfoRow
                  label={
                    "\u0627\u0633\u0645 \u0627\u0644\u0634\u0631\u0643\u0629"
                  }
                  value={client.clients_company_name}
                  icon={<BuildingOffice2Icon />}
                />
                <InfoRow
                  label={
                    "\u0646\u0648\u0639 \u0627\u0644\u0639\u0645\u064a\u0644"
                  }
                  value={client.clients_type}
                  icon={<TagIcon />}
                />
                <InfoRow
                  label={
                    "\u0627\u0644\u0645\u0646\u062f\u0648\u0628 \u0627\u0644\u0645\u0633\u0624\u0648\u0644"
                  }
                  value={getRepName(client.clients_rep_user_id)}
                  icon={<UserIcon />}
                />
                <InfoRow
                  label={"\u0627\u0644\u0635\u0646\u0627\u0639\u0629"}
                  value={getIndustryName(client.clients_industry_id)}
                  icon={<BriefcaseIcon />}
                />
                <InfoRow
                  label={"\u0627\u0644\u0645\u0646\u0637\u0642\u0629"}
                  value={getAreaName(client.clients_area_tag_id)}
                  icon={<TagIcon />}
                />
                <InfoRow
                  label={
                    "\u0645\u0635\u062f\u0631 \u0627\u0644\u0639\u0645\u064a\u0644"
                  }
                  value={client.clients_source}
                  icon={<IdentificationIcon />}
                />
                <InfoRow
                  label={
                    "\u0634\u0631\u0648\u0637 \u0627\u0644\u062f\u0641\u0639 (\u0623\u064a\u0627\u0645)"
                  }
                  value={
                    client.clients_payment_terms
                      ? String(client.clients_payment_terms)
                      : null
                  }
                  icon={<ClockIcon />}
                />
                <InfoRow
                  label={
                    "\u0631\u0642\u0645 \u0636\u0631\u064a\u0628\u0629 \u0627\u0644\u0642\u064a\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629"
                  }
                  value={client.clients_vat_number}
                  icon={<HashtagIcon />}
                />
                <InfoRow
                  label={
                    "\u0645\u0644\u0627\u062d\u0638\u0629 \u0645\u0631\u062c\u0639\u064a\u0629"
                  }
                  value={client.clients_reference_note}
                  icon={<DocumentTextIcon />}
                />
                <InfoRow
                  label={
                    "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0625\u0646\u0634\u0627\u0621"
                  }
                  icon={<CalendarDaysIcon />}
                >
                  {safeDate(client.clients_created_at) ?? "\u2014"}
                </InfoRow>
                <InfoRow
                  label={"\u0622\u062e\u0631 \u062a\u062d\u062f\u064a\u062b"}
                  icon={<ClockIcon />}
                >
                  {safeDate(client.clients_updated_at) ?? "\u2014"}
                </InfoRow>
                <InfoRow
                  label={"\u0622\u062e\u0631 \u0632\u064a\u0627\u0631\u0629"}
                  icon={<CalendarDaysIcon />}
                >
                  {safeDate(client.clients_last_visit) ??
                    "\u0644\u0627 \u062a\u0648\u062c\u062f \u0632\u064a\u0627\u0631\u0629 \u0645\u0633\u062c\u0644\u0629"}
                </InfoRow>
              </div>
            )}

            {/* Contact tab */}
            {activeTab === "contact" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-[#f5f3ff] to-[#EDE7FF] border border-[#C4A8F0]/50 rounded-2xl p-5 flex flex-col gap-3">
                    <span className="text-xs font-extrabold text-[#8B5FD6] uppercase tracking-widest">
                      {
                        "\u0647\u0627\u062a\u0641 \u0631\u0626\u064a\u0633\u064a"
                      }
                    </span>
                    {client.clients_contact_phone1 ? (
                      <a
                        href={`tel:${client.clients_contact_phone1}`}
                        className="text-xl font-extrabold text-gray-900 hover:text-[#7A52C2] flex items-center gap-2 transition-colors"
                      >
                        <div className="w-9 h-9 bg-[#8B5FD6] rounded-xl flex items-center justify-center shadow-sm">
                          <PhoneIcon className="h-5 w-5 text-white" />
                        </div>
                        {client.clients_contact_phone1}
                      </a>
                    ) : (
                      <span className="text-gray-400 text-sm italic flex items-center gap-2">
                        <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
                          <PhoneIcon className="h-5 w-5 text-gray-300" />
                        </div>
                        {
                          "\u0644\u0645 \u064a\u064f\u0636\u0641 \u0628\u0639\u062f"
                        }
                      </span>
                    )}
                  </div>
                  <div className="bg-gradient-to-br from-[#f5f3ff] to-[#EDE7FF] border border-[#C4A8F0] rounded-2xl p-5 flex flex-col gap-3">
                    <span className="text-xs font-extrabold text-[#8B5FD6] uppercase tracking-widest">
                      {
                        "\u0647\u0627\u062a\u0641 \u062b\u0627\u0646\u0648\u064a"
                      }
                    </span>
                    {client.clients_contact_phone2 ? (
                      <a
                        href={`tel:${client.clients_contact_phone2}`}
                        className="text-xl font-extrabold text-gray-900 hover:text-[#7A52C2] flex items-center gap-2 transition-colors"
                      >
                        <div className="w-9 h-9 bg-[#8B5FD6] rounded-xl flex items-center justify-center shadow-sm">
                          <PhoneIcon className="h-5 w-5 text-white" />
                        </div>
                        {client.clients_contact_phone2}
                      </a>
                    ) : (
                      <span className="text-gray-400 text-sm italic flex items-center gap-2">
                        <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
                          <PhoneIcon className="h-5 w-5 text-gray-300" />
                        </div>
                        {
                          "\u0644\u0645 \u064a\u064f\u0636\u0641 \u0628\u0639\u062f"
                        }
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#f5f3ff] to-[#EDE7FF]/60 border border-[#C4A8F0] rounded-2xl p-5 flex flex-col gap-3">
                  <span className="text-xs font-extrabold text-[#8B5FD6] uppercase tracking-widest">
                    {
                      "\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a"
                    }
                  </span>
                  {client.clients_email ? (
                    <a
                      href={`mailto:${client.clients_email}`}
                      className="text-lg font-bold text-gray-900 hover:text-[#7A52C2] flex items-center gap-2 transition-colors break-all"
                    >
                      <div className="w-9 h-9 bg-[#8B5FD6] rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                        <EnvelopeIcon className="h-5 w-5 text-white" />
                      </div>
                      {client.clients_email}
                    </a>
                  ) : (
                    <span className="text-gray-400 text-sm italic flex items-center gap-2">
                      <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
                        <EnvelopeIcon className="h-5 w-5 text-gray-300" />
                      </div>
                      {
                        "\u0644\u0645 \u064a\u064f\u0636\u0641 \u0628\u0639\u062f"
                      }
                    </span>
                  )}
                </div>

                {client.clients_website && (
                  <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-9 h-9 bg-purple-500 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                      <GlobeAltIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-purple-600 uppercase tracking-wide">
                        {
                          "\u0627\u0644\u0645\u0648\u0642\u0639 \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a"
                        }
                      </p>
                      <a
                        href={client.clients_website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-gray-800 hover:text-purple-700 transition-colors"
                      >
                        {client.clients_website}
                      </a>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 divide-y divide-gray-50 pt-2">
                  <InfoRow
                    label={
                      "\u0627\u0633\u0645 \u062c\u0647\u0629 \u0627\u0644\u0627\u062a\u0635\u0627\u0644"
                    }
                    value={client.clients_contact_name}
                    icon={<UserIcon />}
                  />
                  <InfoRow
                    label={
                      "\u0627\u0644\u0645\u0633\u0645\u0649 \u0627\u0644\u0648\u0638\u064a\u0641\u064a"
                    }
                    value={client.clients_contact_job_title}
                    icon={<BriefcaseIcon />}
                  />
                </div>
              </div>
            )}

            {/* Address tab */}
            {activeTab === "address" && (
              <div className="space-y-4">
                {client.clients_latitude && client.clients_longitude && (
                  <a
                    href={buildGoogleMapsLink(
                      client.clients_latitude,
                      client.clients_longitude,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 bg-gradient-to-l from-[#f5f3ff] to-[#EDE7FF] border border-[#C4A8F0] rounded-2xl p-5 hover:shadow-md transition-shadow group"
                  >
                    <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0 group-hover:bg-green-600 transition-colors">
                      <MapPinIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-green-700">
                        عرض على خرائط Google
                      </p>
                      <p className="text-xs text-green-600 mt-0.5 truncate max-w-[280px]" dir="ltr">
                        {buildGoogleMapsLink(
                          client.clients_latitude,
                          client.clients_longitude,
                        )}
                      </p>
                    </div>
                    <div className="mr-auto text-green-400 text-xs font-bold">
                      افتح ←
                    </div>
                  </a>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 divide-y divide-gray-50">
                  <InfoRow
                    label={"\u0627\u0644\u0639\u0646\u0648\u0627\u0646"}
                    value={client.clients_address}
                    icon={<MapPinIcon />}
                  />
                  <InfoRow
                    label={"\u0627\u0644\u0634\u0627\u0631\u0639 2"}
                    value={client.clients_street2}
                    icon={<MapPinIcon />}
                  />
                  <InfoRow
                    label={
                      "\u0631\u0642\u0645 \u0627\u0644\u0645\u0628\u0646\u0649"
                    }
                    value={client.clients_building_number}
                    icon={<BuildingOffice2Icon />}
                  />
                  <InfoRow
                    label={"\u0627\u0644\u0645\u062f\u064a\u0646\u0629"}
                    value={client.clients_city}
                    icon={<MapPinIcon />}
                  />
                  <InfoRow
                    label={
                      "\u0627\u0644\u0631\u0645\u0632 \u0627\u0644\u0628\u0631\u064a\u062f\u064a"
                    }
                    value={client.clients_zip}
                    icon={<HashtagIcon />}
                  />
                  <InfoRow
                    label={"\u0627\u0644\u062f\u0648\u0644\u0629"}
                    value={getCountryName(
                      client.clients_country_id ?? client.clients_country,
                    )}
                    icon={<GlobeAltIcon />}
                  />
                  <InfoRow
                    label={
                      "\u0627\u0644\u0645\u062d\u0627\u0641\u0638\u0629 / \u0627\u0644\u0645\u0646\u0637\u0642\u0629"
                    }
                    value={getGovName(
                      client.clients_country_id ?? client.clients_country,
                      client.clients_governorate_id ?? client.clients_state,
                    )}
                    icon={<MapPinIcon />}
                  />
                  <InfoRow
                    label={
                      "\u0627\u0644\u0645\u0646\u0637\u0642\u0629 (\u062a\u0635\u0646\u064a\u0641)"
                    }
                    value={getAreaName(client.clients_area_tag_id)}
                    icon={<TagIcon />}
                  />
                </div>
              </div>
            )}

            {/* Financial tab */}
            {activeTab === "financial" && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
                    <p className="text-xs font-bold text-[#8B5FD6] uppercase tracking-widest mb-1">
                      {
                        "\u0627\u0644\u0631\u0635\u064a\u062f \u0627\u0644\u062d\u0627\u0644\u064a"
                      }
                    </p>
                    <p
                      className={`text-2xl font-extrabold ${bal < 0 ? "text-red-600" : "text-emerald-700"}`}
                    >
                      {fmt(bal)}
                    </p>
                    <p className="text-[11px] text-emerald-500 mt-1">
                      {symbol}
                    </p>
                  </div>
                  <div className="bg-[#f5f3ff] border border-[#C4A8F0] rounded-2xl p-5 text-center">
                    <p className="text-xs font-bold text-[#8B5FD6] uppercase tracking-widest mb-1">
                      {
                        "\u062d\u062f \u0627\u0644\u0627\u0626\u062a\u0645\u0627\u0646"
                      }
                    </p>
                    <p className="text-2xl font-extrabold text-[#7A52C2]">
                      {fmt(lim)}
                    </p>
                    <p className="text-[11px] text-[#8B5FD6] mt-1">{symbol}</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
                    <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-1">
                      {
                        "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0625\u064a\u0631\u0627\u062f\u0627\u062a"
                      }
                    </p>
                    <p className="text-2xl font-extrabold text-amber-700">
                      {fmt(client.clients_total_revenue)}
                    </p>
                    <p className="text-[11px] text-amber-500 mt-1">{symbol}</p>
                  </div>
                </div>

                {lim > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                      {
                        "\u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u062d\u062f \u0627\u0644\u0627\u0626\u062a\u0645\u0627\u0646"
                      }
                    </p>
                    <CreditBar balance={bal} limit={lim} />
                    <div className="flex justify-between mt-2 text-xs text-gray-500">
                      <span>
                        {"\u0627\u0644\u0645\u062a\u0628\u0642\u064a: "}
                        <strong className="text-gray-700">
                          {fmt(Math.max(0, lim - bal))}
                        </strong>
                      </span>
                      <span>
                        {"\u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645: "}
                        <strong className="text-gray-700">{fmt(bal)}</strong>
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 divide-y divide-gray-50">
                  <InfoRow
                    label={
                      "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0637\u0644\u0628\u0627\u062a"
                    }
                    value={String(client.clients_total_orders ?? 0)}
                    icon={<ShoppingCartIcon />}
                  />
                  <InfoRow
                    label={
                      "\u0634\u0631\u0648\u0637 \u0627\u0644\u062f\u0641\u0639 (\u0623\u064a\u0627\u0645)"
                    }
                    value={
                      client.clients_payment_terms
                        ? String(client.clients_payment_terms)
                        : null
                    }
                    icon={<ClockIcon />}
                  />
                  <InfoRow
                    label={"\u0622\u062e\u0631 \u0632\u064a\u0627\u0631\u0629"}
                    icon={<CalendarDaysIcon />}
                  >
                    {safeDate(client.clients_last_visit) ??
                      "\u0644\u0627 \u062a\u0648\u062c\u062f \u0632\u064a\u0627\u0631\u0629 \u0645\u0633\u062c\u0644\u0629"}
                  </InfoRow>
                  <InfoRow
                    label={
                      "\u062a\u0627\u0631\u064a\u062e \u0622\u062e\u0631 \u0637\u0644\u0628"
                    }
                    icon={<CalendarDaysIcon />}
                  >
                    {safeDate(client.clients_last_order_date) ??
                      "\u0644\u0627 \u064a\u0648\u062c\u062f \u0637\u0644\u0628 \u0645\u0633\u062c\u0644"}
                  </InfoRow>
                </div>
              </div>
            )}

            {/* Notes tab */}
            {activeTab === "notes" && (
              <div className="space-y-4">
                {client.clients_description && (
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                      {"\u0627\u0644\u0648\u0635\u0641"}
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {client.clients_description}
                    </p>
                  </div>
                )}
                {client.clients_reference_note && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                    <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-2">
                      {
                        "\u0645\u0644\u0627\u062d\u0638\u0629 \u0645\u0631\u062c\u0639\u064a\u0629"
                      }
                    </p>
                    <p className="text-sm text-amber-800 leading-relaxed">
                      {client.clients_reference_note}
                    </p>
                  </div>
                )}
                {client.clients_source && (
                  <div className="bg-[#f5f3ff] border border-[#C4A8F0]/50 rounded-2xl p-4 flex items-center gap-3">
                    <IdentificationIcon className="h-5 w-5 text-[#C4A8F0] flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-[#8B5FD6] uppercase tracking-wide">
                        {
                          "\u0645\u0635\u062f\u0631 \u0627\u0644\u0639\u0645\u064a\u0644"
                        }
                      </p>
                      <p className="text-sm font-semibold text-[#2D1B69]">
                        {client.clients_source}
                      </p>
                    </div>
                  </div>
                )}
                {client.clients_vat_number && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
                    <HashtagIcon className="h-5 w-5 text-slate-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                        {
                          "\u0631\u0642\u0645 \u0636\u0631\u064a\u0628\u0629 \u0627\u0644\u0642\u064a\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629"
                        }
                      </p>
                      <p className="text-sm font-semibold text-slate-800 font-mono">
                        {client.clients_vat_number}
                      </p>
                    </div>
                  </div>
                )}
                {!client.clients_description &&
                  !client.clients_reference_note &&
                  !client.clients_source &&
                  !client.clients_vat_number && (
                    <div className="text-center py-12 text-gray-400">
                      <DocumentTextIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">
                        {
                          "\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0644\u0627\u062d\u0638\u0627\u062a \u0645\u0636\u0627\u0641\u0629"
                        }
                      </p>
                      <button
                        onClick={() => setEditOpen(true)}
                        className="mt-3 text-[#8B5FD6] text-sm font-semibold hover:underline"
                      >
                        {
                          "\u0623\u0636\u0641 \u0645\u0644\u0627\u062d\u0638\u0627\u062a \u2190"
                        }
                      </button>
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}

      {editOpen && (
          <UpdateClientForm
            client={client}
            onUpdate={handleUpdate}
            onCancel={() => setEditOpen(false)}
            clientAreaTags={clientAreaTags}
            clientIndustries={clientIndustries}
            allUsers={allUsers}
          />
      )}

      <DeleteConfirmationModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        message={`\u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f \u0645\u0646 \u062d\u0630\u0641 \u0627\u0644\u0639\u0645\u064a\u0644 "${client.clients_company_name}"\u061f \u0644\u0627 \u064a\u0645\u0643\u0646 \u0627\u0644\u062a\u0631\u0627\u062c\u0639 \u0639\u0646 \u0647\u0630\u0627 \u0627\u0644\u0625\u062c\u0631\u0627\u0621.`}
        itemName={client.clients_company_name}
        deleteLoading={deleteLoading}
      />

      {statementOpen && (
        <ClientAccountStatementModal
          client={client}
          open={statementOpen}
          onClose={() => setStatementOpen(false)}
        />
      )}
      {documentsOpen && (
        <ClientDocumentsModal
          client={client}
          open={documentsOpen}
          onClose={() => setDocumentsOpen(false)}
        />
      )}
      {ordersOpen && (
        <ClientOrdersModal
          client={client}
          open={ordersOpen}
          onClose={() => setOrdersOpen(false)}
        />
      )}
      {paymentsOpen && (
        <ClientPaymentsModal
          client={client}
          open={paymentsOpen}
          onClose={() => setPaymentsOpen(false)}
        />
      )}
      {returnsOpen && (
        <ClientReturnsModal
          client={client}
          open={returnsOpen}
          onClose={() => setReturnsOpen(false)}
        />
      )}
      {deliveriesOpen && (
        <ClientDeliveriesModal
          client={client}
          open={deliveriesOpen}
          onClose={() => setDeliveriesOpen(false)}
        />
      )}
      {refundsOpen && (
        <ClientRefundsModal
          client={client}
          open={refundsOpen}
          onClose={() => setRefundsOpen(false)}
        />
      )}
    </div>
  );
}
