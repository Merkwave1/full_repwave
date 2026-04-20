// src/components/dashboard/tabs/clients-management/SuppliersTab.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import {
  TruckIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";

import {
  getAllSuppliers,
  addSupplier,
  updateSupplier,
  deleteSupplier,
} from "../../../../apis/suppliers";

import Loader from "../../../common/Loader/Loader";
import Alert from "../../../common/Alert/Alert";
import DeleteConfirmationModal from "../../../common/DeleteConfirmationModal";
import FilterBar from "../../../common/FilterBar/FilterBar";
import CustomPageHeader from "../../../common/CustomPageHeader/CustomPageHeader";
import GlobalTable from "../../../common/GlobalTable/GlobalTable";

// Sub-components for Suppliers
import AddSupplierForm from "./suppliers/AddSupplierForm";
import UpdateSupplierForm from "./suppliers/UpdateSupplierForm";
import useCurrency from "../../../../hooks/useCurrency";
import SupplierDetailsModal from "./suppliers/SupplierDetailsModal";
import SupplierAccountStatementModal from "./suppliers/SupplierAccountStatementModal.jsx";
import { isOdooIntegrationEnabled } from "../../../../utils/odooIntegration";

export default function SuppliersTab() {
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();
  const { symbol } = useCurrency();
  const [odooEnabled] = useState(() => isOdooIntegrationEnabled());
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  // Future ready filters (mirroring client style). Currently supplier API has limited fields.
  const [contactPersonFilter, setContactPersonFilter] = useState("");
  // Removed phone & email specific filters per request
  const [currentView, setCurrentView] = useState("list"); // 'list', 'add', 'edit', 'details', 'deleteConfirm'
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "supplier_id",
    direction: "desc",
  });
  const [showAccountStatement, setShowAccountStatement] = useState(false);

  // Load Suppliers data
  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllSuppliers();
      setSuppliers(data);
    } catch (e) {
      setError(e.message || "خطأ في تحميل الموردين");
      setGlobalMessage({
        type: "error",
        message: "فشل في تحميل بيانات الموردين.",
      });
    } finally {
      setLoading(false);
    }
  }, [setGlobalMessage]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  useEffect(() => {
    setChildRefreshHandler(() => loadSuppliers());
    return () => setChildRefreshHandler(null);
  }, [setChildRefreshHandler, loadSuppliers]);

  const handleAdd = async (formData) => {
    setLoading(true);
    try {
      await addSupplier(formData);
      setGlobalMessage({ type: "success", message: "تمت إضافة المورد بنجاح!" });
      setCurrentView("list");
      await loadSuppliers(); // refresh
    } catch (e) {
      setGlobalMessage({
        type: "error",
        message: e.message || "فشل في إضافة المورد.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (formData) => {
    setLoading(true);
    try {
      await updateSupplier(selectedSupplier.supplier_id, formData);
      setGlobalMessage({ type: "success", message: "تم تحديث المورد بنجاح!" });
      setCurrentView("list");
      await loadSuppliers(); // refresh
    } catch (e) {
      setGlobalMessage({
        type: "error",
        message: e.message || "فشل في تحديث المورد.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSupplier) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      await deleteSupplier(selectedSupplier.supplier_id);
      // Close dialog immediately like users deletion UX
      setCurrentView("list");
      const name = selectedSupplier.supplier_name;
      setSelectedSupplier(null);
      setGlobalMessage({
        type: "success",
        message: `تم حذف المورد ${name} بنجاح`,
      });
      await loadSuppliers();
    } catch (e) {
      const raw = e.message || "Failed to delete supplier.";
      let arabic = raw;
      const lower = raw.toLowerCase();
      if (lower.includes("related records exist"))
        arabic =
          "لا يمكن حذف المورد: توجد سجلات مرتبطة (أوامر شراء / فواتير / حركات). احذف أو عدل السجلات المرتبطة أولاً.";
      else if (lower.includes("failed to delete supplier"))
        arabic = "فشل حذف المورد";
      else if (lower.includes("valid supplier id"))
        arabic = "معرّف المورد غير صالح";
      setDeleteError(arabic);
      setGlobalMessage({ type: "error", message: arabic });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Client-side filtering based on search term + individual field filters
  const filteredSuppliers = useMemo(() => {
    let data = [...suppliers];
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      data = data.filter(
        (supplier) =>
          supplier.supplier_name?.toLowerCase().includes(term) ||
          supplier.supplier_contact_person?.toLowerCase().includes(term) ||
          supplier.supplier_phone?.toLowerCase().includes(term) ||
          supplier.supplier_email?.toLowerCase().includes(term) ||
          supplier.supplier_address?.toLowerCase().includes(term),
      );
    }
    if (contactPersonFilter) {
      const cp = contactPersonFilter.toLowerCase().trim();
      data = data.filter(
        (s) => (s.supplier_contact_person || "").toLowerCase().trim() === cp,
      );
    }
    // phone & email filters removed per request
    return data;
  }, [suppliers, searchTerm, contactPersonFilter]);

  // Sorting logic
  const sortedSuppliers = useMemo(() => {
    if (!sortConfig.key) return filteredSuppliers;
    return [...filteredSuppliers].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (aValue === null || aValue === undefined) aValue = "";
      if (bValue === null || bValue === undefined) bValue = "";

      // Special handling for numeric fields like balance
      if (sortConfig.key === "supplier_balance") {
        const aNum = parseFloat(aValue) || 0;
        const bNum = parseFloat(bValue) || 0;
        return sortConfig.direction === "asc" ? aNum - bNum : bNum - aNum;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortConfig.direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredSuppliers, sortConfig]);

  // Handle sorting
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Sortable header component
  const SortableHeader = ({ title, sortKey, className = "" }) => (
    <th
      className={`px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors ${className}`}
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center justify-between">
        <span className="select-none">{title}</span>
        <div className="flex flex-col items-center ml-1">
          {sortConfig.key === sortKey ? (
            sortConfig.direction === "asc" ? (
              <ChevronUpIcon className="h-5 w-5 text-indigo-600 font-bold" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-indigo-600 font-bold" />
            )
          ) : (
            <div className="flex flex-col">
              <ChevronUpIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              <ChevronDownIcon className="h-4 w-4 text-gray-400 hover:text-gray-600 -mt-1" />
            </div>
          )}
        </div>
      </div>
    </th>
  );

  const renderContent = () => {
    switch (currentView) {
      case "add":
        return (
          <AddSupplierForm
            onAdd={handleAdd}
            onCancel={() => setCurrentView("list")}
          />
        );
      case "edit":
        return (
          <UpdateSupplierForm
            supplier={selectedSupplier}
            onUpdate={handleUpdate}
            onCancel={() => setCurrentView("list")}
          />
        );
      case "details":
        return (
          <SupplierDetailsModal
            isOpen
            supplier={selectedSupplier}
            onClose={() => setCurrentView("list")}
          />
        );
      case "deleteConfirm":
        return (
          <DeleteConfirmationModal
            isOpen={true}
            onClose={() => {
              setCurrentView("list");
              setSelectedSupplier(null);
              setDeleteError("");
            }}
            onConfirm={handleDelete}
            message={`هل أنت متأكد أنك تريد حذف المورد "${selectedSupplier?.supplier_name}"؟`}
            itemName={selectedSupplier?.supplier_name}
            deleteLoading={deleteLoading}
            errorMessage={deleteError}
          />
        );
      case "list":
      default:
        return (
          <div className="space-y-6" dir="rtl">
            {/* Header */}
            <div className="mb-6">
              <CustomPageHeader
                title="إدارة الموردين"
                subtitle="إدارة وتنظيم قاعدة بيانات الموردين"
                icon={<TruckIcon className="h-8 w-8 text-white" />}
                statValue={suppliers.length}
                statLabel="إجمالي الموردين"
                actionButton={
                  <button
                    onClick={() => setCurrentView("add")}
                    className="bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg font-bold text-lg"
                  >
                    <PlusIcon className="h-5 w-5" />
                    إضافة مورد جديد
                  </button>
                }
              />
            </div>

            {/* Filters */}
            <FilterBar
              title="البحث والفلاتر"
              searchConfig={{
                value: searchTerm,
                onChange: setSearchTerm,
                placeholder: "بحث (الاسم، الهاتف، البريد، العنوان)",
                searchWhileTyping: true,
              }}
              selectFilters={[
                {
                  key: "contactPerson",
                  value: contactPersonFilter,
                  onChange: setContactPersonFilter,
                  placeholder: "جميع المسؤولين",
                  options: [
                    { value: "", label: "جميع المسؤولين" },
                    ...Array.from(
                      new Set(
                        suppliers
                          .map((s) => s.supplier_contact_person)
                          .filter(Boolean),
                      ),
                    ).map((v) => ({ value: v, label: v })),
                  ],
                },
              ]}
              activeChips={[
                searchTerm
                  ? {
                      key: "search",
                      label: "بحث",
                      value: `"${searchTerm}"`,
                      tone: "blue",
                      onRemove: () => setSearchTerm(""),
                    }
                  : null,
                contactPersonFilter
                  ? {
                      key: "contactPerson",
                      label: "مسؤول",
                      value: contactPersonFilter,
                      tone: "green",
                      onRemove: () => setContactPersonFilter(""),
                    }
                  : null,
              ].filter(Boolean)}
              onClearAll={() => {
                setSearchTerm("");
                setContactPersonFilter("");
              }}
            />

            {loading && <Loader className="mt-8" />}
            {error && <Alert message={error} type="error" className="mb-4" />}

            {/* Suppliers Table */}
            {!loading && !error && sortedSuppliers.length === 0 && (
              <div className="bg-white rounded-xl shadow border border-gray-200 p-12 text-center animate-fadeIn">
                <div className="text-4xl mb-4 text-blue-300">🚚</div>
                <p className="text-gray-700 text-lg font-semibold">
                  لا توجد موردين لعرضهم
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  جرب البحث بكلمات مختلفة أو أضف مورد جديد
                </p>
              </div>
            )}

            {!loading && !error && sortedSuppliers.length > 0 && (
              <GlobalTable
                data={sortedSuppliers}
                loading={loading}
                error={error}
                rowKey="supplier_id"
                searchTerm={searchTerm}
                totalCount={sortedSuppliers.length}
                initialSort={
                  sortConfig.key
                    ? { key: sortConfig.key, direction: sortConfig.direction }
                    : null
                }
                onSort={(key, direction) => setSortConfig({ key, direction })}
                columns={[
                  {
                    key: "supplier_id",
                    title: "ID",
                    sortable: true,
                    headerAlign: "center",
                    align: "center",
                    className: "w-16",
                  },
                  ...(odooEnabled
                    ? [
                        {
                          key: "supplier_odoo_partner_id",
                          title: "ODOO",
                          sortable: true,
                          headerAlign: "center",
                          align: "center",
                          className: "w-16",
                          render: (s) =>
                            s.supplier_odoo_partner_id ? (
                              <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-semibold">
                                {s.supplier_odoo_partner_id}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            ),
                        },
                      ]
                    : []),
                  {
                    key: "supplier_name",
                    title: "اسم المورد",
                    sortable: true,
                    render: (s) => (
                      <div
                        className="line-clamp-2"
                        style={{
                          display: "-webkit-box",
                          WebkitBoxOrient: "vertical",
                          WebkitLineClamp: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          wordBreak: "break-word",
                        }}
                      >
                        {s.supplier_name}
                      </div>
                    ),
                    headerClassName: "min-w-[150px]",
                  },
                  {
                    key: "supplier_contact_person",
                    title: "الشخص المسؤول",
                    sortable: true,
                    render: (s) => s.supplier_contact_person || "–",
                    headerClassName: "min-w-[150px]",
                  },
                  {
                    key: "supplier_phone",
                    title: "الهاتف",
                    sortable: true,
                    render: (s) => s.supplier_phone || "–",
                    headerClassName: "min-w-[120px]",
                  },
                  {
                    key: "supplier_email",
                    title: "البريد الإلكتروني",
                    sortable: true,
                    render: (s) => s.supplier_email || "–",
                    headerClassName: "min-w-[200px]",
                  },
                  {
                    key: "supplier_balance",
                    title: "الرصيد",
                    sortable: true,
                    render: (s) => (
                      <div
                        className={`text-sm ${parseFloat(s.supplier_balance || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {parseFloat(s.supplier_balance || 0).toLocaleString(
                          "en-US",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          },
                        )}{" "}
                        {symbol}
                      </div>
                    ),
                    headerClassName: "min-w-[120px]",
                  },
                  {
                    key: "supplier_address",
                    title: "العنوان",
                    sortable: false,
                    render: (s) => (
                      <div
                        className="line-clamp-2"
                        style={{
                          display: "-webkit-box",
                          WebkitBoxOrient: "vertical",
                          WebkitLineClamp: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          wordBreak: "break-word",
                        }}
                      >
                        {s.supplier_address || "–"}
                      </div>
                    ),
                    headerClassName: "min-w-[250px]",
                  },
                  {
                    key: "actions",
                    title: "إجراءات",
                    sortable: false,
                    align: "center",
                    render: (s) => (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSupplier(s);
                            setCurrentView("details");
                          }}
                          className="group p-1.5 text-blue-600 hover:text-white hover:bg-blue-600 rounded-full transition-all"
                          title="عرض"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSupplier(s);
                            setShowAccountStatement(true);
                          }}
                          className="group p-1.5 text-amber-600 hover:text-white hover:bg-amber-600 rounded-full transition-all"
                          title="كشف حساب"
                        >
                          كشف
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSupplier(s);
                            setCurrentView("edit");
                          }}
                          className="group p-1.5 text-green-600 hover:text-white hover:bg-green-600 rounded-full transition-all"
                          title="تعديل"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSupplier(s);
                            setCurrentView("deleteConfirm");
                          }}
                          className="group p-1.5 text-red-600 hover:text-white hover:bg-red-600 rounded-full transition-all"
                          title="حذف"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ),
                    className: "w-32",
                  },
                ]}
              />
            )}
          </div>
        );
    }
  };

  return (
    <div className="p-4" dir="rtl">
      {renderContent()}
      {showAccountStatement && selectedSupplier && (
        <SupplierAccountStatementModal
          open={showAccountStatement}
          supplier={selectedSupplier}
          onClose={() => setShowAccountStatement(false)}
        />
      )}
    </div>
  );
}
