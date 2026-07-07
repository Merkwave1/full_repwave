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
import { BRAND } from "../../../../../constants/brandColors.js";

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
      <div className="h-2.5 bg-[#EDE7FF] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${danger ? "bg-red-500" : warn ? "bg-amber-400" : "bg-gradient-to-r from-[#8B5FD6] to-[#6B45B0]"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Status badge (high-contrast, for profile header) ────────────────────────
function StatusBadge({ status }) {
  const key = String(status ?? "").toLowerCase().trim();
  const label = getClientStatusLabel(status);
  const styles = {
    active: "bg-emerald-50 text-emerald-800 border-emerald-200",
    inactive: "bg-red-50 text-red-800 border-red-200",
    prospect: "bg-amber-50 text-amber-800 border-amber-200",
    archived: "bg-slate-100 text-slate-600 border-slate-200",
  };
  const dots = {
    active: "bg-emerald-500",
    inactive: "bg-red-500",
    prospect: "bg-amber-500",
    archived: "bg-slate-400",
  };
  const cls = styles[key] ?? "bg-[#EDE7FF] text-[#2D1B69] border-[#C4A8F0]";
  const dot = dots[key] ?? "bg-[#8B5FD6]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cls}`}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
      {label}
    </span>
  );
}

// ── Compact stat (scannable, not heavy gradient) ────────────────────────────
function StatCard({ icon, label, value, onClick, alert }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`flex-1 min-w-[130px] text-right px-4 py-3.5 rounded-2xl border transition-all duration-200
        ${alert
          ? "bg-red-50 border-red-200 hover:border-red-300"
          : "bg-[#FAFAFE] border-[#EDE7FF] hover:border-[#C4A8F0] hover:bg-white hover:shadow-sm hover:shadow-[#8B5FD6]/10"
        }
        ${onClick ? "cursor-pointer active:scale-[0.98]" : "cursor-default"}`}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${alert ? "bg-red-100 text-red-600" : "bg-[#EDE7FF] text-[#8B5FD6]"}`}>
          {icon}
        </span>
        <span className={`text-xl sm:text-2xl font-extrabold leading-none ${alert ? "text-red-700" : "text-[#2D1B69]"}`}>
          {value}
        </span>
      </div>
      <span className="text-[10px] font-bold text-[#8B5FD6] uppercase tracking-wide">
        {label}
      </span>
    </button>
  );
}

// ── Quick link pill ───────────────────────────────────────────────────────────
function QuickLink({ icon, label, onClick, primary = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 transition-all active:scale-95
        ${primary
          ? "bg-[#8B5FD6] text-white shadow-md shadow-[#8B5FD6]/25 hover:bg-[#7A52C2]"
          : "bg-white text-[#2D1B69] border border-[#EDE7FF] hover:border-[#C4A8F0] hover:bg-[#FAFAFE]"
        }`}
    >
      <span className={primary ? "text-white" : "text-[#8B5FD6]"}>{icon}</span>
      {label}
    </button>
  );
}

// ── Info row ────────────────────────────────────────────────────────────────
function InfoRow({ label, value, children, icon }) {
  const content = children ?? (value != null ? String(value) : null);
  if (!content) return null;
  return (
    <div className="rounded-xl border border-[#EDE7FF] bg-gradient-to-br from-white to-[#FAFAFE] px-4 py-3.5 hover:border-[#C4A8F0]/70 hover:shadow-sm hover:shadow-[#8B5FD6]/5 transition-all">
      <span className="text-[10px] font-extrabold text-[#8B5FD6] uppercase tracking-widest flex items-center gap-1.5 mb-1">
        {icon && (
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#EDE7FF] text-[#7A52C2]">
            {React.cloneElement(icon, { className: "h-3 w-3" })}
          </span>
        )}
        {label}
      </span>
      <span className="text-sm text-[#1A0F35] font-semibold break-words leading-relaxed">
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
      setClient({
        ...clientData,
        clients_total_orders:
          clientData.clients_total_orders ?? clientData.ClientsTotalOrders ?? 0,
        clients_total_revenue:
          clientData.clients_total_revenue ?? clientData.ClientsTotalRevenue ?? 0,
        clients_last_order_date:
          clientData.clients_last_order_date ?? clientData.ClientsLastOrderDate ?? null,
        clients_type: clientData.clients_type ?? clientData.ClientsType ?? null,
      });
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
    allUsers.find((u) => (u.users_id ?? u.UsersId) === id)?.users_name
    ?? allUsers.find((u) => (u.users_id ?? u.UsersId) === id)?.UsersName
    ?? "\u2014";
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
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-[#f5f3ff] via-white to-[#EDE7FF]/50"
        dir="rtl"
      >
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#8B5FD6] to-[#6D28D9] flex items-center justify-center shadow-lg shadow-[#8B5FD6]/30 animate-pulse">
          <BuildingOffice2Icon className="h-7 w-7 text-white" />
        </div>
        <Loader />
        <p className="text-sm font-semibold text-[#7A52C2]">
          {"جاري تحميل بيانات العميل..."}
        </p>
      </div>
    );
  if (error)
    return (
      <div
        className="min-h-screen p-6 bg-gradient-to-br from-[#f5f3ff] via-white to-[#EDE7FF]/40"
        dir="rtl"
      >
        <div className="max-w-lg mx-auto mt-16 bg-white rounded-3xl border border-[#EDE7FF] shadow-lg shadow-[#8B5FD6]/10 p-6">
          <Alert message={error} type="error" />
          <button
            onClick={() => navigate("/dashboard/clients")}
            className="mt-4 w-full px-4 py-2.5 bg-gradient-to-r from-[#8B5FD6] to-[#7A52C2] hover:from-[#7A52C2] hover:to-[#6D28D9] text-white rounded-xl font-semibold shadow-md shadow-[#8B5FD6]/25 transition-all"
          >
            {"العودة للعملاء"}
          </button>
        </div>
      </div>
    );
  if (!client) return null;

  const fmt = (v) => formatCurrency(v ?? 0);
  const bal = parseFloat(client.clients_credit_balance ?? 0);
  const lim = parseFloat(client.clients_credit_limit ?? 0);
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
      className="min-h-screen bg-gradient-to-br from-[#f5f3ff] via-white to-[#EDE7FF]/40 relative overflow-hidden"
      dir="rtl"
    >
      {/* Ambient purple blobs */}
      <div
        className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full opacity-40 blur-3xl"
        style={{ background: `radial-gradient(circle, ${BRAND.lavender} 0%, transparent 70%)` }}
      />
      <div
        className="pointer-events-none absolute top-1/3 -left-24 h-72 w-72 rounded-full opacity-30 blur-3xl"
        style={{ background: `radial-gradient(circle, ${BRAND.primary} 0%, transparent 70%)` }}
      />

      {/* Sticky top bar */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-[#EDE7FF] shadow-[0_4px_24px_-4px_rgba(139,95,214,0.12)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate("/dashboard/clients")}
            className="flex items-center gap-2 text-[#7A52C2] hover:text-[#8B5FD6] transition-colors text-sm font-semibold bg-[#EDE7FF]/60 hover:bg-[#EDE7FF] px-3 py-1.5 rounded-xl border border-[#C4A8F0]/30"
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

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* Profile card — clean CRM layout, no tall cover */}
        <div className="bg-white rounded-3xl border border-[#EDE7FF] shadow-[0_8px_40px_-12px_rgba(139,95,214,0.18)] overflow-hidden">
          {/* Slim brand band */}
          <div
            className="h-24 sm:h-28 relative"
            style={{
              background: `linear-gradient(135deg, ${BRAND.primaryDark} 0%, ${BRAND.primary} 55%, ${BRAND.lavender} 100%)`,
            }}
          >
            <div className="absolute inset-0 opacity-30" style={{
              backgroundImage: "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.25) 0%, transparent 50%)",
            }} />
          </div>

          <div className="px-5 sm:px-6 pb-5">
            {/* Identity row */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 -mt-14 sm:-mt-16">
              <div className="flex-shrink-0 mx-auto sm:mx-0">
                {hasImage ? (
                  <img
                    src={client.clients_image}
                    alt={client.clients_company_name}
                    onError={() => setImgError(true)}
                    className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover border-4 border-white shadow-xl ring-2 ring-[#EDE7FF]"
                  />
                ) : (
                  <div
                    className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border-4 border-white shadow-xl ring-2 ring-[#EDE7FF] flex items-center justify-center text-white text-3xl font-extrabold"
                    style={{
                      background: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 100%)`,
                    }}
                  >
                    {initials}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 text-center sm:text-right pt-1 sm:pt-14">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2D1B69] leading-tight">
                    {client.clients_company_name || "عميل غير محدد"}
                  </h1>
                  <StatusBadge status={client.clients_status} />
                  <span className="text-xs font-mono font-bold text-[#7A52C2] bg-[#EDE7FF] px-2 py-0.5 rounded-md border border-[#C4A8F0]/40">
                    #{client.clients_id}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 text-sm text-[#5B4B8A]">
                  {client.clients_contact_name && (
                    <span className="inline-flex items-center gap-1">
                      <UserIcon className="h-3.5 w-3.5 text-[#8B5FD6]" />
                      {client.clients_contact_name}
                      {client.clients_contact_job_title && (
                        <span className="text-[#9B8BB8] text-xs">· {client.clients_contact_job_title}</span>
                      )}
                    </span>
                  )}
                  {client.clients_city && (
                    <span className="inline-flex items-center gap-1">
                      <MapPinIcon className="h-3.5 w-3.5 text-[#8B5FD6]" />
                      {[client.clients_city, getCountryName(client.clients_country_id)].filter(Boolean).join("، ")}
                    </span>
                  )}
                  {client.clients_industry_id && (
                    <span className="inline-flex items-center gap-1">
                      <BriefcaseIcon className="h-3.5 w-3.5 text-[#8B5FD6]" />
                      {getIndustryName(client.clients_industry_id)}
                    </span>
                  )}
                </div>

                {/* Primary contact — always visible, easy tap */}
                <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-2">
                  {client.clients_contact_phone1 && (
                    <a
                      href={`tel:${client.clients_contact_phone1}`}
                      className="inline-flex items-center gap-2 bg-[#8B5FD6] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#7A52C2] shadow-sm shadow-[#8B5FD6]/30 transition-colors"
                    >
                      <PhoneIcon className="h-4 w-4" />
                      {client.clients_contact_phone1}
                    </a>
                  )}
                  {client.clients_email && (
                    <a
                      href={`mailto:${client.clients_email}`}
                      className="inline-flex items-center gap-2 bg-white text-[#2D1B69] border border-[#EDE7FF] px-4 py-2 rounded-xl text-sm font-semibold hover:border-[#C4A8F0] hover:bg-[#FAFAFE] transition-colors"
                    >
                      <EnvelopeIcon className="h-4 w-4 text-[#8B5FD6]" />
                      <span className="max-w-[200px] truncate">{client.clients_email}</span>
                    </a>
                  )}
                  {client.clients_website && (
                    <a
                      href={client.clients_website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-white text-[#2D1B69] border border-[#EDE7FF] px-4 py-2 rounded-xl text-sm font-semibold hover:border-[#C4A8F0] transition-colors"
                    >
                      <GlobeAltIcon className="h-4 w-4 text-[#8B5FD6]" />
                      الموقع
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Stats strip — scannable at a glance */}
            <div className="mt-5 flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
              <StatCard
                icon={<CurrencyDollarIcon className="h-4 w-4" />}
                label="الرصيد الحالي"
                value={fmt(bal)}
                alert={bal < 0 || (bal >= lim && lim > 0)}
              />
              <StatCard
                icon={<CreditCardIcon className="h-4 w-4" />}
                label="حد الائتمان"
                value={fmt(lim)}
              />
              <StatCard
                icon={<ShoppingCartIcon className="h-4 w-4" />}
                label="إجمالي الطلبات"
                value={client.clients_total_orders ?? 0}
                onClick={() => setOrdersOpen(true)}
              />
              <StatCard
                icon={<ArrowTrendingUpIcon className="h-4 w-4" />}
                label="إجمالي الإيرادات"
                value={fmt(client.clients_total_revenue)}
              />
            </div>

            {/* Credit usage */}
            {lim > 0 && (
              <div className="mt-4 rounded-2xl bg-[#FAFAFE] border border-[#EDE7FF] px-4 py-3">
                <div className="flex items-center justify-between text-xs font-bold text-[#7A52C2] mb-0.5">
                  <span>الرصيد مقابل حد الائتمان</span>
                  <span>
                    <span className={bal >= lim ? "text-red-600" : "text-[#8B5FD6]"}>{fmt(bal)}</span>
                    <span className="text-[#C4A8F0] mx-1">/</span>
                    <span className="text-[#2D1B69]">{fmt(lim)}</span>
                  </span>
                </div>
                <CreditBar balance={bal} limit={lim} />
              </div>
            )}
          </div>
        </div>

        {/* Quick actions — horizontal scroll, easy to reach */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-[#EDE7FF] p-3">
          <p className="text-[10px] font-extrabold text-[#8B5FD6] uppercase tracking-widest mb-2.5 px-1">
            إجراءات سريعة
          </p>
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-thin">
            <QuickLink icon={<ShoppingCartIcon className="h-4 w-4" />} label="الطلبات" onClick={() => setOrdersOpen(true)} primary />
            <QuickLink icon={<ChartBarIcon className="h-4 w-4" />} label="كشف حساب" onClick={() => setStatementOpen(true)} />
            <QuickLink icon={<CurrencyDollarIcon className="h-4 w-4" />} label="المدفوعات" onClick={() => setPaymentsOpen(true)} />
            <QuickLink icon={<TruckIcon className="h-4 w-4" />} label="التسليمات" onClick={() => setDeliveriesOpen(true)} />
            <QuickLink icon={<ArrowUturnLeftIcon className="h-4 w-4" />} label="المرتجعات" onClick={() => setReturnsOpen(true)} />
            <QuickLink icon={<ReceiptRefundIcon className="h-4 w-4" />} label="الاستردادات" onClick={() => setRefundsOpen(true)} />
            <QuickLink icon={<FolderOpenIcon className="h-4 w-4" />} label="المستندات" onClick={() => setDocumentsOpen(true)} />
            <QuickLink icon={<PencilSquareIcon className="h-4 w-4" />} label="تعديل" onClick={() => setEditOpen(true)} />
          </div>
        </div>

        {/* Tabbed detail sections */}
        <div className="bg-white rounded-3xl border border-[#EDE7FF] shadow-sm overflow-hidden">
          {/* Tab bar */}
          <div className="flex gap-0 border-b border-[#EDE7FF] overflow-x-auto bg-[#FAFAFE]">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-5 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors -mb-px
                  ${
                    activeTab === tab.key
                      ? "border-[#8B5FD6] text-[#8B5FD6] bg-white"
                      : "border-transparent text-[#7A52C2]/70 hover:text-[#8B5FD6] hover:bg-white/60"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
                  <div className="bg-[#f5f3ff] border border-[#C4A8F0] rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#8B5FD6] rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                      <GlobeAltIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#8B5FD6] uppercase tracking-wide">
                        {
                          "\u0627\u0644\u0645\u0648\u0642\u0639 \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a"
                        }
                      </p>
                      <a
                        href={client.clients_website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-gray-800 hover:text-[#7A52C2] transition-colors"
                      >
                        {client.clients_website}
                      </a>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
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
                    <div className="w-12 h-12 bg-[#8B5FD6] rounded-2xl flex items-center justify-center shadow-md flex-shrink-0 group-hover:bg-[#7A52C2] transition-colors">
                      <MapPinIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-[#2D1B69]">
                        عرض على خرائط Google
                      </p>
                      <p className="text-xs text-[#7A52C2] mt-0.5 truncate max-w-[280px]" dir="ltr">
                        {buildGoogleMapsLink(
                          client.clients_latitude,
                          client.clients_longitude,
                        )}
                      </p>
                    </div>
                    <div className="mr-auto text-[#8B5FD6] text-xs font-bold">
                      افتح ←
                    </div>
                  </a>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-[#EDE7FF] bg-[#FAFAFE] p-5 text-center">
                    <p className="text-[10px] font-bold text-[#8B5FD6] uppercase tracking-widest mb-1">
                      {"الرصيد الحالي"}
                    </p>
                    <p className={`text-2xl font-extrabold ${bal < 0 ? "text-red-600" : "text-[#2D1B69]"}`}>
                      {fmt(bal)}
                    </p>
                    <p className="text-[11px] text-[#9B8BB8] mt-1">{symbol}</p>
                  </div>
                  <div className="rounded-2xl border border-[#EDE7FF] bg-[#FAFAFE] p-5 text-center">
                    <p className="text-[10px] font-bold text-[#8B5FD6] uppercase tracking-widest mb-1">
                      {"حد الائتمان"}
                    </p>
                    <p className="text-2xl font-extrabold text-[#2D1B69]">{fmt(lim)}</p>
                    <p className="text-[11px] text-[#9B8BB8] mt-1">{symbol}</p>
                  </div>
                  <div className="rounded-2xl border border-[#EDE7FF] bg-[#FAFAFE] p-5 text-center">
                    <p className="text-[10px] font-bold text-[#8B5FD6] uppercase tracking-widest mb-1">
                      {"إجمالي الإيرادات"}
                    </p>
                    <p className="text-2xl font-extrabold text-[#2D1B69]">
                      {fmt(client.clients_total_revenue)}
                    </p>
                    <p className="text-[11px] text-[#9B8BB8] mt-1">{symbol}</p>
                  </div>
                </div>

                {lim > 0 && (
                  <div className="bg-gradient-to-br from-[#f5f3ff] to-white border border-[#EDE7FF] rounded-2xl p-5 shadow-inner">
                    <p className="text-xs font-bold text-[#8B5FD6] uppercase tracking-widest mb-3">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <div className="bg-gradient-to-br from-white to-[#FAFAFE] border border-[#EDE7FF] rounded-2xl p-5 hover:border-[#C4A8F0]/60 transition-colors">
                    <p className="text-xs font-bold text-[#8B5FD6] uppercase tracking-widest mb-2">
                      {"\u0627\u0644\u0648\u0635\u0641"}
                    </p>
                    <p className="text-sm text-[#1A0F35] leading-relaxed whitespace-pre-wrap">
                      {client.clients_description}
                    </p>
                  </div>
                )}
                {client.clients_reference_note && (
                  <div className="bg-gradient-to-br from-[#EDE7FF]/40 to-[#f5f3ff] border border-[#C4A8F0]/50 rounded-2xl p-5">
                    <p className="text-xs font-bold text-[#7A52C2] uppercase tracking-widest mb-2">
                      {
                        "\u0645\u0644\u0627\u062d\u0638\u0629 \u0645\u0631\u062c\u0639\u064a\u0629"
                      }
                    </p>
                    <p className="text-sm text-[#2D1B69] leading-relaxed">
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
                  <div className="bg-gradient-to-br from-[#f5f3ff] to-white border border-[#EDE7FF] rounded-2xl p-4 flex items-center gap-3">
                    <HashtagIcon className="h-5 w-5 text-[#8B5FD6] flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-[#8B5FD6] uppercase tracking-wide">
                        {
                          "\u0631\u0642\u0645 \u0636\u0631\u064a\u0628\u0629 \u0627\u0644\u0642\u064a\u0645\u0629 \u0627\u0644\u0645\u0636\u0627\u0641\u0629"
                        }
                      </p>
                      <p className="text-sm font-semibold text-[#2D1B69] font-mono">
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
