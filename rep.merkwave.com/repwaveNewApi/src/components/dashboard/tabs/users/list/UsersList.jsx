// src/components/dashboard/tabs/users/list/UsersList.jsx
import React, { useMemo, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import GlobalTable from "../../../../common/GlobalTable/GlobalTable.jsx";
import FilterBar from "../../../../common/FilterBar/FilterBar.jsx";
import {
  EyeIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import RepresentativeSettingsModal from "../modals/RepresentativeSettingsModal.jsx";

function UsersList() {
  const {
    currentUsers,
    loading,
    error,
    openConfirmDeleteModal,
    openUserDetailsModal,
    openUserDetailsModalInEditMode,
  } = useOutletContext();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedRole, setSelectedRole] = useState("all");
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const openSettingsModal = useCallback((user) => {
    setSelectedUser(user);
    setSettingsModalOpen(true);
  }, []);

  const closeSettingsModal = useCallback(() => {
    setSettingsModalOpen(false);
    setSelectedUser(null);
  }, []);

  const availableRoles = useMemo(() => {
    const roles = [...new Set(currentUsers.map((user) => user.users_role))];
    return roles.filter((role) => role);
  }, [currentUsers]);

  const filteredUsers = useMemo(() => {
    return currentUsers.filter((user) => {
      const matchesSearch =
        !searchTerm ||
        user.users_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.users_phone?.includes(searchTerm) ||
        user.users_role?.toLowerCase().includes(searchTerm.toLowerCase());

      const isActive = [1, true, "1"].includes(user.users_status);
      const matchesStatus =
        selectedStatus === "all" ||
        (selectedStatus === "active" && isActive) ||
        (selectedStatus === "inactive" && !isActive);

      const matchesRole =
        selectedRole === "all" || user.users_role === selectedRole;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [currentUsers, searchTerm, selectedStatus, selectedRole]);

  const columns = useMemo(
    () => [
      {
        key: "users_id",
        title: "#",
        sortable: true,
        align: "center",
        headerClassName: "w-16 text-center",
        cellClassName: "w-16 text-center",
        sortAccessor: (user) => Number(user.users_id) || 0,
        render: (user) => (
          <span className="inline-flex items-center justify-center bg-indigo-100 text-[#7A52C2] text-xs px-2 py-1 rounded-full font-semibold">
            {user.users_id}
          </span>
        ),
      },
      {
        key: "users_name",
        title: "المستخدم",
        sortable: true,
        headerClassName: "min-w-[200px]",
        cellClassName: "min-w-[200px]",
        render: (user) => (
          <div className="flex items-center">
            {user.users_image ? (
              <img
                src={user.users_image}
                alt={user.users_name}
                className="h-10 w-10 rounded-full object-cover ml-3"
                onError={(e) => {
                  e.currentTarget.src =
                    "https://placehold.co/40x40/cccccc/ffffff?text=No+Img";
                }}
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 ml-3">
                <UserIcon className="h-6 w-6" />
              </div>
            )}
            <div>
              <div
                className="text-sm font-bold text-[#1A0F35] line-clamp-2 group-hover:text-[#8B5FD6] transition-colors"
                style={{
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  wordBreak: "break-word",
                }}
              >
                {user.users_name || "غير محدد"}
              </div>
              <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                <span>انقر لعرض الملف الشخصي</span>
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "users_role",
        title: "الدور",
        sortable: true,
        align: "center",
        headerClassName: "min-w-[120px] text-center",
        cellClassName: "text-center",
        sortAccessor: (user) => {
          if (user.users_role === "sales_rep") return "rep";
          return user.users_role || "";
        },
        render: (user) => {
          const role =
            user.users_role === "sales_rep" ? "rep" : user.users_role;
          const badgeClass =
            role === "admin"
              ? "bg-purple-100 text-purple-800"
              : role === "rep"
                ? "bg-[#EDE7FF] text-[#2D1B69]"
                : role === "store_keeper"
                  ? "bg-yellow-100 text-yellow-800"
                  : role === "cash"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800";
          const arabic =
            role === "admin"
              ? "مدير"
              : role === "rep"
                ? "مسئول مبيعات"
                : role === "store_keeper"
                  ? "أمين مخزن"
                  : role === "cash"
                    ? "كاش"
                    : role || "—";
          return (
            <span
              className={`font-semibold text-xs px-2 py-1 rounded-full ${badgeClass}`}
            >
              {arabic}
            </span>
          );
        },
      },
      {
        key: "users_phone",
        title: "الهاتف",
        sortable: true,
        headerClassName: "min-w-[140px]",
        render: (user) => (
          <div
            className="line-clamp-2 text-gray-600"
            style={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              wordBreak: "break-word",
            }}
          >
            {user.users_phone || "غير محدد"}
          </div>
        ),
      },
      {
        key: "users_status",
        title: "الحالة",
        sortable: true,
        align: "center",
        headerClassName: "min-w-[100px] text-center",
        cellClassName: "text-center",
        sortAccessor: (user) => Number(user.users_status ?? 0),
        render: (user) => (
          <span
            className={`font-semibold text-xs px-2 py-1 rounded-full ${
              [1, true, "1"].includes(user.users_status)
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {[1, true, "1"].includes(user.users_status) ? "نشط" : "غير نشط"}
          </span>
        ),
      },
      {
        key: "actions",
        title: "الإجراءات",
        sortable: false,
        align: "center",
        headerClassName: "w-40 text-center",
        cellClassName: "text-center",
        render: (user) => (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                openUserDetailsModal(user);
              }}
              className="p-1.5 rounded-full 
                   text-sky-700 bg-sky-100
                   hover:bg-sky-500 hover:text-white
                   hover:shadow-[0_0_12px_rgba(56,189,248,0.45)]
                   transition-all duration-200 hover:scale-110"
              title="عرض الملف الشخصي"
            >
              <EyeIcon className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                openUserDetailsModalInEditMode(user);
              }}
              className="p-1.5 rounded-full 
                   text-emerald-700 bg-emerald-100
                   hover:bg-emerald-500 hover:text-white
                   hover:shadow-[0_0_12px_rgba(16,185,129,0.45)]
                   transition-all duration-200 hover:scale-110"
              title="تعديل"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            {user.users_role !== "admin" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openSettingsModal(user);
                }}
                className="p-1.5 rounded-full
             text-[#C4A8F0] bg-[#1A0F35]
             hover:bg-[#C4A8F0] hover:text-white
             hover:shadow-[0_0_12px_rgba(139,92,246,0.45)]
             transition-all duration-200 hover:scale-110"
                title="الإعدادات"
              >
                <Cog6ToothIcon className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                openConfirmDeleteModal(user);
              }}
              className="p-1.5 rounded-full 
                   text-red-700 bg-red-100
                   hover:bg-red-500 hover:text-white
                   hover:shadow-[0_0_12px_rgba(239,68,68,0.45)]
                   transition-all duration-200 hover:scale-110"
              title="حذف"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [
      openConfirmDeleteModal,
      openUserDetailsModal,
      openUserDetailsModalInEditMode,
      openSettingsModal,
    ],
  );

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedStatus("all");
    setSelectedRole("all");
  };

  return (
    <div
      className="
      space-y-6
      px-2 md:px-4
      pb-4
    "
      dir="rtl"
    >
      {/* ===== Filters Section ===== */}
      <div
        className="
        rounded-2xl
        bg-gradient-to-b from-white to-gray-50/60
        border border-gray-100
        shadow-[0_10px_30px_rgba(0,0,0,0.05)]
        p-3 md:p-4
      "
      >
        <FilterBar
          title="البحث والفلاتر"
          searchConfig={{
            value: searchTerm,
            onChange: setSearchTerm,
            placeholder: "البحث ب(الاسم، الهاتف)",
            searchWhileTyping: true,
          }}
          selectFilters={[
            {
              key: "status",
              value: selectedStatus,
              onChange: setSelectedStatus,
              placeholder: "جميع الحالات",
              options: [
                { value: "all", label: "جميع الحالات" },
                { value: "active", label: "نشط" },
                { value: "inactive", label: "غير نشط" },
              ],
            },
            {
              key: "role",
              value: selectedRole,
              onChange: setSelectedRole,
              placeholder: "جميع الأدوار",
              options: [
                { value: "all", label: "جميع الأدوار" },
                ...availableRoles.map((role) => ({
                  value: role,
                  label:
                    role === "admin"
                      ? "مدير"
                      : role === "rep"
                        ? "مندوب"
                        : role === "store_keeper"
                          ? "أمين مخزن"
                          : role === "cash"
                            ? "كاش"
                            : role,
                })),
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
            selectedStatus !== "all"
              ? {
                  key: "status",
                  label: "حالة",
                  value: selectedStatus === "active" ? "نشط" : "غير نشط",
                  tone: "green",
                  onRemove: () => setSelectedStatus("all"),
                }
              : null,
            selectedRole !== "all"
              ? {
                  key: "role",
                  label: "دور",
                  value:
                    selectedRole === "admin"
                      ? "مدير"
                      : selectedRole === "rep"
                        ? "مندوب"
                        : selectedRole === "store_keeper"
                          ? "أمين مخزن"
                          : selectedRole === "cash"
                            ? "كاش"
                            : selectedRole,
                  tone: "purple",
                  onRemove: () => setSelectedRole("all"),
                }
              : null,
          ].filter(Boolean)}
          onClearAll={clearFilters}
        />
      </div>

      {/* ===== Table Section ===== */}
      <div
        className="
        rounded-2xl
        bg-white
        border border-gray-100
        shadow-[0_12px_32px_rgba(0,0,0,0.06)]
        overflow-hidden
      "
      >
        <GlobalTable
          data={filteredUsers}
          loading={loading}
          error={error}
          columns={columns}
          rowKey="users_id"
          onRowClick={openUserDetailsModal}
          totalCount={currentUsers.length}
          searchTerm={searchTerm}
          emptyState={{
            icon: "👥",
            title: "لا توجد مستخدمون لعرضهم",
            description: "جرب البحث بكلمات مختلفة أو أضف مستخدم جديد",
          }}
          initialSort={{ key: "users_id", direction: "asc" }}
          showSummary={false}
        />
      </div>

      {/* ===== Representative Settings Modal ===== */}
      <RepresentativeSettingsModal
        isOpen={settingsModalOpen}
        onClose={closeSettingsModal}
        user={selectedUser}
      />
    </div>
  );
}

export default UsersList;
