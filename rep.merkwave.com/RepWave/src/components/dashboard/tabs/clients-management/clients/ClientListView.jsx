// src/components/dashboard/tabs/clients-management/clients/ClientListView.jsx
import React, { useState, useCallback } from "react";
import {
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
// Using lucide-react for a clearer file-text icon (some users reported not seeing DocumentTextIcon)
import { FileText, FolderOpen } from "lucide-react";
// NOTE: File is at src/components/dashboard/tabs/clients-management/clients/ClientListView.jsx
// Need to go up 5 levels to reach src/apis (../../../../../)
import Loader from "../../../../common/Loader/Loader";
import Alert from "../../../../common/Alert/Alert";
import { formatCurrency } from "../../../../../utils/currency.js";
import {
  getClientStatusBadgeClass,
  getClientStatusLabel,
} from "../../../../../constants/clientStatus";

export default function ClientListView({
  clients, // This will be the already filtered clients from ClientsTab
  loading,
  error,
  searchTerm = "", // Passed from ClientsTab for display
  onEdit,
  onDelete,
  onViewDetails,
  onOpenStatement, // Added missing prop
  onOpenDocuments, // NEW: For opening documents modal
  allUsers, // Passed to resolve sales rep name
  clientAreaTags, // Passed to resolve area tag name
  clientIndustries, // Passed to resolve industry name
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  // Statement now handled by parent component via onOpenStatement prop

  // Helper to get user name by ID
  const getUserName = useCallback(
    (userId) => {
      if (!Array.isArray(allUsers)) return "–";
      const user = allUsers.find((u) => u.users_id === userId);
      return user ? user.users_name : "–";
    },
    [allUsers],
  );

  // Helper to get area tag name by ID
  const getAreaTagName = useCallback(
    (tagId) => {
      if (!Array.isArray(clientAreaTags)) return "–";
      const tag = clientAreaTags.find((t) => t.client_area_tag_id === tagId);
      return tag ? tag.client_area_tag_name : "–";
    },
    [clientAreaTags],
  );

  // Helper to get industry name by ID
  const getIndustryName = useCallback(
    (industryId) => {
      if (!Array.isArray(clientIndustries)) return "–";
      const industry = clientIndustries.find(
        (i) => i.client_industries_id === industryId,
      );
      return industry ? industry.client_industries_name : "–";
    },
    [clientIndustries],
  );

  const sortedClients = React.useMemo(() => {
    if (!sortConfig.key) return clients;
    return [...clients].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Special handling for nested data sorting
      if (sortConfig.key === "clients_rep_user_id") {
        aValue = getUserName(a.clients_rep_user_id);
        bValue = getUserName(b.clients_rep_user_id);
      } else if (sortConfig.key === "clients_area_tag_id") {
        aValue = getAreaTagName(a.clients_area_tag_id);
        bValue = getAreaTagName(b.clients_area_tag_id);
      } else if (sortConfig.key === "clients_industry_id") {
        aValue = getIndustryName(a.clients_industry_id);
        bValue = getIndustryName(b.clients_industry_id);
      }

      if (aValue === null || aValue === undefined) aValue = "";
      if (bValue === null || bValue === undefined) bValue = "";

      // Special handling for numeric fields
      if (sortConfig.key === "clients_credit_balance") {
        const numA = parseFloat(aValue) || 0;
        const numB = parseFloat(bValue) || 0;
        return sortConfig.direction === "asc" ? numA - numB : numB - numA;
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
  }, [clients, sortConfig, getUserName, getAreaTagName, getIndustryName]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const SortableHeader = ({ title, sortKey, className = "" }) => (
    <th
      className={`px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors ${className}`}
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center justify-between">
        <span>{title}</span>
        {sortConfig.key === sortKey &&
          (sortConfig.direction === "asc" ? (
            <ChevronUpIcon className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 text-gray-500" />
          ))}
      </div>
    </th>
  );

  if (loading) return <Loader className="mt-8" />;
  if (error) return <Alert message={error} type="error" className="mb-4" />;

  return (
    <>
      {!loading && !error && clients.length === 0 && (
        <div className="bg-white rounded-xl shadow border border-gray-200 p-12 text-center animate-fadeIn">
          <div className="text-4xl mb-4 text-blue-300">📂</div>
          <p className="text-gray-700 text-lg font-semibold">
            لا توجد عملاء لعرضهم
          </p>
          <p className="text-gray-500 text-sm mt-2">
            جرب البحث بكلمات مختلفة أو أضف عميلًا جديدًا
          </p>
        </div>
      )}

      {!loading && !error && clients.length > 0 && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden animate-fadeIn">
          <div className="bg-gradient-to-r from-blue-100 to-indigo-100 px-6 py-4 border-b border-gray-300">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-800">
                إجمالي العملاء:
                <span className="font-bold text-indigo-600 ml-1">
                  {clients.length}
                </span>
              </div>
              {searchTerm && (
                <div className="text-sm text-gray-500">
                  نتائج البحث عن: "
                  <span className="font-medium">{searchTerm}</span>"
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-16 px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase border-r border-gray-200">
                    #
                  </th>
                  <SortableHeader
                    title="الشركة"
                    sortKey="clients_company_name"
                    className="min-w-[160px] border-r border-gray-200"
                  />
                  <SortableHeader
                    title="المندوب المسئول"
                    sortKey="clients_rep_user_id"
                    className="min-w-[120px] border-r border-gray-200"
                  />
                  <SortableHeader
                    title="المنطقة"
                    sortKey="clients_area_tag_id"
                    className="min-w-[100px] border-r border-gray-200"
                  />
                  <SortableHeader
                    title="الصناعة"
                    sortKey="clients_industry_id"
                    className="min-w-[100px] border-r border-gray-200"
                  />
                  <SortableHeader
                    title="الرصيد"
                    sortKey="clients_credit_balance"
                    className="min-w-[80px] border-r border-gray-200"
                  />
                  <SortableHeader
                    title="الحالة"
                    sortKey="clients_status"
                    className="min-w-[70px] border-r border-gray-200"
                  />
                  <th className="w-56 px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {sortedClients.map((client, idx) => (
                  <tr
                    key={client.clients_id}
                    className="hover:bg-gray-50 transition-all duration-150"
                  >
                    <td className="text-center px-4 py-3 border-r border-gray-200">
                      <span className="bg-blue-100 text-[#1F2937] text-xs px-2 py-1 rounded-full font-semibold">
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium border-r border-gray-200">
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
                        {client.clients_company_name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 border-r border-gray-200">
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
                        {getUserName(client.clients_rep_user_id)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 border-r border-gray-200">
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
                        {getAreaTagName(client.clients_area_tag_id)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 border-r border-gray-200">
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
                        {getIndustryName(client.clients_industry_id)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 border-r border-gray-200">
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
                        {formatCurrency(client.clients_credit_balance || 0)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center border-r border-gray-200">
                      <span
                        className={`font-semibold text-xs px-2 py-1 rounded-full ${getClientStatusBadgeClass(client.clients_status)}`}
                      >
                        {getClientStatusLabel(client.clients_status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 text-center">
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <button
                          onClick={() => onViewDetails(client)}
                          className="group p-1.5 text-blue-600 hover:text-white hover:bg-blue-600 rounded-full transition-all"
                          title="عرض"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onEdit(client)}
                          className="group p-1.5 text-green-600 hover:text-white hover:bg-green-600 rounded-full transition-all"
                          title="تعديل"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDelete(client)}
                          className="group p-1.5 text-red-600 hover:text-white hover:bg-red-600 rounded-full transition-all"
                          title="حذف"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() =>
                            onOpenStatement && onOpenStatement(client)
                          }
                          className="group px-2.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-full text-xs font-semibold flex items-center gap-1 shadow-sm border border-indigo-200 transition-all"
                          title="كشف حساب"
                        >
                          <FileText
                            size={14}
                            className="group-hover:scale-110 transition-transform"
                          />
                          <span>كشف</span>
                        </button>
                        <button
                          onClick={() =>
                            onOpenDocuments && onOpenDocuments(client)
                          }
                          className="group px-2.5 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white rounded-full text-xs font-semibold flex items-center gap-1 shadow-sm border border-purple-200 transition-all"
                          title="تصفح مستندات العميل"
                        >
                          <FolderOpen
                            size={14}
                            className="group-hover:scale-110 transition-transform"
                          />
                          <span>مستندات</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
