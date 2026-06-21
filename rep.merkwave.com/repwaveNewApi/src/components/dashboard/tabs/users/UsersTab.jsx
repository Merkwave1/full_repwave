// src/components/dashboard/tabs/users/UsersTab.jsx
import React, { useEffect, useState, useCallback } from "react";
import {
  Outlet,
  NavLink,
  useOutletContext,
  useNavigate,
} from "react-router-dom";
import { getAppSettings } from "../../../../apis/auth.js";
import { getAllUsers, deleteUser } from "../../../../apis/users.js";
import Loader from "../../../common/Loader/Loader.jsx";
import Alert from "../../../common/Alert/Alert.jsx";
import Modal from "../../../common/Modal/Modal.jsx";
import Button from "../../../common/Button/Button.jsx";
import UserDetailsModal from "./UserDetailsModal.jsx";
import AddUserForm from "./add/AddUserForm.jsx";
import UpdateUserForm from "./update/UpdateUserForm.jsx";
import CustomPageHeader from "../../../common/CustomPageHeader/CustomPageHeader";
import {
  Bars3BottomLeftIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

function UsersTab() {
  const { setGlobalMessage } = useOutletContext();
  const navigate = useNavigate();
  const [userLimit, setUserLimit] = useState(null);
  const [currentUsers, setCurrentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [localMessage, setLocalMessage] = useState("");
  const [localMessageType, setLocalMessageType] = useState("info");

  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] =
    useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // New state for user details modal
  const [isUserDetailsModalOpen, setIsUserDetailsModalOpen] = useState(false);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState(null);

  // State for Add/Edit drawer modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editUserId, setEditUserId] = useState(null);

  // State for limit dialog
  const [showLimitDialog, setShowLimitDialog] = useState(false);

  // Always fetch fresh from API — localStorage cache caused stale IDs from old backend
  const loadUserData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      localStorage.removeItem("appUsers"); // Clear any stale cache
      const [settings, apiUsersData] = await Promise.all([
        getAppSettings(),
        getAllUsers(),
      ]);
      if (settings && Array.isArray(settings)) {
        const limitSetting = settings.find(
          (s) => s.settings_key === "users_limits",
        );
        setUserLimit(
          limitSetting ? parseInt(limitSetting.settings_value, 10) : null,
        );
      } else {
        setUserLimit(null);
      }
      setCurrentUsers(apiUsersData);
    } catch (e) {
      console.error("Failed to load user data:", e);
      setError("حدث خطأ أثناء تحميل بيانات المستخدمين: " + e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadUserData();
  }, [loadUserData]); // Initial load on mount

  const openConfirmDeleteModal = (user) => {
    setUserToDelete(user);
    setIsConfirmDeleteModalOpen(true);
    setLocalMessage("");
  };
  const closeConfirmDeleteModal = () => {
    setUserToDelete(null);
    setIsConfirmDeleteModalOpen(false);
    setLocalMessage("");
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    setLocalMessage("");
    try {
      const result = await deleteUser(userToDelete.users_id);
      const successMsg = result.message || "تم حذف المستخدم بنجاح!";
      // Refresh list first
      await loadUserData();
      // Close modal immediately (no delay)
      closeConfirmDeleteModal();
      // Surface success at top
      setLocalMessage(successMsg);
      setLocalMessageType("success");
    } catch (err) {
      console.error("Delete error:", err);
      setLocalMessage(err.message || "حدث خطأ أثناء حذف المستخدم.");
      setLocalMessageType("error");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handlers for user details modal
  const [userDetailsInEditMode, setUserDetailsInEditMode] = useState(false);

  const openUserDetailsModal = (user) => {
    setSelectedUserForDetails(user);
    setUserDetailsInEditMode(false);
    setIsUserDetailsModalOpen(true);
  };

  const openUserDetailsModalInEditMode = (user) => {
    setSelectedUserForDetails(user);
    setUserDetailsInEditMode(true);
    setIsUserDetailsModalOpen(true);
  };

  const closeUserDetailsModal = () => {
    setIsUserDetailsModalOpen(false);
    setSelectedUserForDetails(null);
    setUserDetailsInEditMode(false);
  };

  // The loading and error states for the entire UsersTab (parent)
  // These should ideally be handled within the components rendered by Outlet
  // if they are specific to the list/form.
  // For now, we remove the top-level conditional return to avoid duplication.

  const contextValue = {
    userLimit,
    currentUsers,
    loading, // Pass loading state to children
    error, // Pass error state to children
    loadUserData, // Always fetches fresh from API
    openConfirmDeleteModal,
    setGlobalMessage: (msg) => {
      // Wrapper to set global message from children
      setLocalMessage(msg.message);
      setLocalMessageType(msg.type);
    },
    openUserDetailsModal,
    openUserDetailsModalInEditMode,
  };

  return (
    <div className="p-4" dir="rtl">
      {localMessage && (
        <Alert
          message={localMessage}
          type={localMessageType}
          onClose={() => setLocalMessage("")}
          className="mb-4"
        />
      )}
      <div className="mb-6">
        <CustomPageHeader
          title="إدارة المستخدمين"
          subtitle="إدارة وتنظيم المستخدمين"
          icon={<UsersIcon className="h-8 w-8 text-black" />}
          statValue={currentUsers.length}
          statLabel="إجمالي المستخدمين"
          actionButton={
            <button
              onClick={() => {
                if (userLimit !== null && currentUsers.length >= userLimit) {
                  setShowLimitDialog(true);
                } else {
                  setAddModalOpen(true);
                }
              }}
              className="bg-white text-[#8B5FD6] hover:bg-[#f5f3ff] px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg font-bold text-lg"
            >
              <PlusIcon className="h-5 w-5" />
              إضافة مستخدم
            </button>
          }
        />
      </div>

      <Outlet context={contextValue} />

      {/* Delete Confirmation Modal (rendered by UsersTab) */}
      <Modal
        isOpen={isConfirmDeleteModalOpen}
        onClose={closeConfirmDeleteModal}
        title="تأكيد الحذف"
      >
        <div dir="rtl">
          <p className="mb-4 text-gray-700">
            هل أنت متأكد أنك تريد حذف المستخدم "{userToDelete?.users_name}" (ID:{" "}
            {userToDelete?.users_id})؟ لا يمكن التراجع عن هذا الإجراء.
          </p>
          {localMessage && localMessageType === "error" && (
            <div className="mb-3 p-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm whitespace-pre-line">
              {localMessage}
            </div>
          )}
          <div className="flex gap-3 justify-end mt-4">
            <button
              type="button"
              onClick={closeConfirmDeleteModal}
              disabled={deleteLoading}
              className="px-6 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm transition-colors"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={deleteLoading}
              className="px-6 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors shadow-md flex items-center gap-2 disabled:opacity-60"
            >
              {deleteLoading ? (
                <>
                  <span className="inline-block w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  جاري الحذف...
                </>
              ) : (
                <>
                  <TrashIcon className="w-4 h-4" />
                  حذف
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Limit Reached Dialog */}
      {showLimitDialog && (
        <Modal
          isOpen={showLimitDialog}
          onClose={() => setShowLimitDialog(false)}
          title="حد الاقصى للمستخدمين"
        >
          <div dir="rtl">
            <p className="mb-4 text-gray-700">
              لقد وصلت الحد الأقصى من المستخدمين {currentUsers.length} /{" "}
              {userLimit}.
            </p>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setShowLimitDialog(false)}>إغلاق</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* User Details Modal */}
      {isUserDetailsModalOpen && selectedUserForDetails && (
        <UserDetailsModal
          isOpen={isUserDetailsModalOpen}
          onClose={closeUserDetailsModal}
          user={selectedUserForDetails}
          onDelete={openConfirmDeleteModal}
          startInEditMode={userDetailsInEditMode}
          setGlobalMessage={(msg) => {
            setLocalMessage(msg.message);
            setLocalMessageType(msg.type);
          }}
          loadUserData={loadUserData}
        />
      )}

      {/* Add User Drawer */}
      <AddUserForm
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        setGlobalMessage={(msg) => {
          setLocalMessage(msg.message);
          setLocalMessageType(msg.type);
        }}
        loadUserData={loadUserData}
        userLimit={userLimit}
        currentUsers={currentUsers}
      />

      {/* Edit User Drawer */}
      <UpdateUserForm
        isOpen={editUserId !== null}
        onClose={() => setEditUserId(null)}
        userId={editUserId}
        setGlobalMessage={(msg) => {
          setLocalMessage(msg.message);
          setLocalMessageType(msg.type);
        }}
        loadUserData={loadUserData}
        currentUsers={currentUsers}
      />
    </div>
  );
}

export default UsersTab;
