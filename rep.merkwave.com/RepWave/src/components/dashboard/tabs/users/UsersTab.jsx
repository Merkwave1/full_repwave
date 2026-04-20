// src/components/dashboard/tabs/users/UsersTab.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { Outlet, NavLink, useOutletContext, useNavigate } from 'react-router-dom';
import { getAppSettings } from '../../../../apis/auth.js';
import { getAllUsers, deleteUser } from '../../../../apis/users.js';
import Loader from '../../../common/Loader/Loader.jsx';
import Alert from '../../../common/Alert/Alert.jsx';
import Modal from '../../../common/Modal/Modal.jsx';
import Button from '../../../common/Button/Button.jsx';
import UserDetailsModal from './UserDetailsModal.jsx';
import CustomPageHeader from '../../../common/CustomPageHeader/CustomPageHeader';
import { Bars3BottomLeftIcon, PlusIcon, EyeIcon, PencilIcon, TrashIcon, UsersIcon } from '@heroicons/react/24/outline';

function UsersTab() {
  const { setGlobalMessage } = useOutletContext();
  const navigate = useNavigate();
  const [userLimit, setUserLimit] = useState(null);
  const [currentUsers, setCurrentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [localMessage, setLocalMessage] = useState('');
  const [localMessageType, setLocalMessageType] = useState('info');

  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // New state for user details modal
  const [isUserDetailsModalOpen, setIsUserDetailsModalOpen] = useState(false);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState(null);

  // State for limit dialog
  const [showLimitDialog, setShowLimitDialog] = useState(false);


  // Function to load data from localStorage and refresh from API if necessary
  const loadUserData = useCallback(async (forceApiRefresh = false) => {
    setLoading(true); setError(''); setGlobalMessage('');
    try {




      // Load settings (always from localStorage, as it's fetched on login)
      // const settings = getAppSettings();
      // if (settings) {
      //   const limitSetting = settings.find(s => s.settings_key === 'users_limits');
      //   setUserLimit(limitSetting ? parseInt(limitSetting.settings_value, 10) : null);


      const settings = await getAppSettings(); 
      if (settings && Array.isArray(settings)) { // Ensure settings is an array
        const limitSetting = settings.find(s => s.settings_key === 'users_limits');
        setUserLimit(limitSetting ? parseInt(limitSetting.settings_value, 10) : null);
      } else { 
        setUserLimit(null); 
      }



      // Try to load users from localStorage first
      const cachedUsersString = localStorage.getItem('appUsers');
      let usersData = null;

      if (cachedUsersString && !forceApiRefresh) {
        try {
          usersData = JSON.parse(cachedUsersString);
          setCurrentUsers(usersData); // Display cached data immediately
          setLoading(false); // Stop loading quickly if cached data is available
        } catch (e) {
          console.error("Failed to parse cached users data:", e);
          // If parsing fails, treat as no cached data and proceed to API fetch
          usersData = null;
        }
      }

      // If no cached data or forceApiRefresh is true, fetch from API
      if (!usersData || forceApiRefresh) {
        setLoading(true); // Re-show loading if API fetch is happening
        const apiUsersData = await getAllUsers();
        setCurrentUsers(apiUsersData);
        localStorage.setItem('appUsers', JSON.stringify(apiUsersData)); // Update localStorage with fresh data
        setLoading(false);
      }

    } catch (e) {
      console.error("Failed to load or refresh user data:", e);
      setError("حدث خطأ أثناء تحميل بيانات المستخدمين: " + e.message);
      setLoading(false);
    }
  }, [setGlobalMessage]);
  useEffect(() => { loadUserData(); }, [loadUserData]); // Initial load on mount

  const openConfirmDeleteModal = (user) => { setUserToDelete(user); setIsConfirmDeleteModalOpen(true); setLocalMessage(''); };
  const closeConfirmDeleteModal = () => { setUserToDelete(null); setIsConfirmDeleteModalOpen(false); setLocalMessage(''); };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true); setLocalMessage('');
    try {
      const result = await deleteUser(userToDelete.users_id);
  const successMsg = result.message || "تم حذف المستخدم بنجاح!";
  // Refresh list first
  await loadUserData(true);
  // Close modal immediately (no delay)
  closeConfirmDeleteModal();
  // Surface success at top
  setLocalMessage(successMsg);
  setLocalMessageType('success');
    } catch (err) {
      console.error("Delete error:", err);
      setLocalMessage(err.message || "حدث خطأ أثناء حذف المستخدم.");
      setLocalMessageType('error');
    } finally { setDeleteLoading(false); }
  };

  // Handlers for user details modal
  const openUserDetailsModal = (user) => {
    setSelectedUserForDetails(user);
    setIsUserDetailsModalOpen(true);
  };

  const closeUserDetailsModal = () => {
    setIsUserDetailsModalOpen(false);
    setSelectedUserForDetails(null);
  };

  // The loading and error states for the entire UsersTab (parent)
  // These should ideally be handled within the components rendered by Outlet
  // if they are specific to the list/form.
  // For now, we remove the top-level conditional return to avoid duplication.

  const contextValue = {
    userLimit,
    currentUsers,
    loading, // Pass loading state to children
    error,   // Pass error state to children
    loadUserData: () => loadUserData(true), // Always force API refresh when children call loadUserData
    openConfirmDeleteModal,
    setGlobalMessage: (msg) => { // Wrapper to set global message from children
      setLocalMessage(msg.message);
      setLocalMessageType(msg.type);
    },
    openUserDetailsModal, // Pass the details modal opener
  };

  return (
    <div className="p-4" dir="rtl">
      {localMessage && (<Alert message={localMessage} type={localMessageType} onClose={() => setLocalMessage('')} className="mb-4" />)}
      <div className="mb-6">
        <CustomPageHeader
          title="إدارة المستخدمين"
          subtitle="إدارة وتنظيم المستخدمين"
          icon={<UsersIcon className="h-8 w-8 text-white" />}
          statValue={currentUsers.length}
          statLabel="إجمالي المستخدمين"
          actionButton={
            <button
              onClick={() => {
                if (userLimit !== null && currentUsers.length >= userLimit) {
                  setShowLimitDialog(true);
                } else {
                  navigate('/dashboard/users/add-user');
                }
              }}
              className="bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg font-bold text-lg"
            >
              <PlusIcon className="h-5 w-5" />
              إضافة مستخدم
            </button>
          }
        />
      </div>

      <Outlet context={contextValue} />

      {/* Delete Confirmation Modal (rendered by UsersTab) */}
      <Modal isOpen={isConfirmDeleteModalOpen} onClose={closeConfirmDeleteModal} title="تأكيد الحذف">
        <div dir="rtl">
          <p className="mb-4 text-gray-700">هل أنت متأكد أنك تريد حذف المستخدم "{userToDelete?.users_name}" (ID: {userToDelete?.users_id})؟ لا يمكن التراجع عن هذا الإجراء.</p>
          {localMessage && localMessageType === 'error' && (
            <div className="mb-3 p-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm whitespace-pre-line">
              {localMessage}
            </div>
          )}
          <div className="flex justify-end space-x-2 rtl:space-x-reverse">
            <Button type="button" onClick={closeConfirmDeleteModal} className="bg-gray-500 hover:bg-gray-600" disabled={deleteLoading}>إلغاء</Button>
            <Button type="button" onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700 flex items-center" disabled={deleteLoading}>
              {deleteLoading ? (<><Loader className="w-4 h-4 ml-2 rtl:mr-2 rtl:ml-0" /> جاري الحذف...</>) : 'حذف'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Limit Reached Dialog */}
      {showLimitDialog && (
        <Modal isOpen={showLimitDialog} onClose={() => setShowLimitDialog(false)} title="حد الاقصى للمستخدمين">
          <div dir="rtl">
            <p className="mb-4 text-gray-700">لقد وصلت الحد الأقصى من المستخدمين {currentUsers.length} / {userLimit}.</p>
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
        />
      )}
    </div>
  );
}

export default UsersTab;
