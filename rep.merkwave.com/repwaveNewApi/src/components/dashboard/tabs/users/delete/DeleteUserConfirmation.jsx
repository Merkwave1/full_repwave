// src/components/dashboard/tabs/users/delete/DeleteUserConfirmation.js
// This component provides a confirmation modal for deleting a user.
// It should be saved as DeleteUserConfirmation.jsx in your local project.

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Modal from '../../../../common/Modal/Modal.jsx';
import Button from '../../../../common/Button/Button.jsx';
import Loader from '../../../../common/Loader/Loader.jsx';
import Alert from '../../../../common/Alert/Alert.jsx';
import { deleteUser } from '../../../../../apis/users.js'; // Corrected import path
import { getAppUsers } from '../../../../../apis/auth.js'; // Corrected import path

function DeleteUserConfirmation({ onUserDeleted }) {
  const { userId: routeUserId } = useParams(); // Get user ID from URL
  const navigate = useNavigate();

  const [userToDelete, setUserToDelete] = useState(null);
  const [loading, setLoading] = useState(true); // Loading for initial data fetch
  const [error, setError] = useState(''); // Error for initial data fetch
  const [formLoading, setFormLoading] = useState(false); // Loading for delete operation
  const [formMessage, setFormMessage] = useState('');
  const [formMessageType, setFormMessageType] = useState('info');

  useEffect(() => {
    // Load user data from localStorage based on routeUserId
    const loadUser = () => {
      setLoading(true);
      setError('');
      const users = getAppUsers(); // Get all users from localStorage
      const foundUser = users ? users.find(u => String(u.users_id) === routeUserId) : null;

      if (foundUser) {
        setUserToDelete(foundUser);
        setLoading(false);
      } else {
        setError("المستخدم غير موجود للحذف.");
        setLoading(false);
      }
    };

    loadUser();
  }, [routeUserId]); // Re-run if userId in URL changes

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;

    setFormLoading(true); setFormMessage('');
    try {
      const result = await deleteUser(userToDelete.users_id);
      setFormMessage(result.message || "تم حذف المستخدم بنجاح!");
      setFormMessageType('success');
      onUserDeleted(); // Callback to refresh list in parent
      setTimeout(() => navigate('/dashboard/users'), 1500); // Redirect back to list
    } catch (err) {
      console.error("Delete error:", err);
      setFormMessage(err.message || "حدث خطأ أثناء حذف المستخدم.");
      setFormMessageType('error');
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) return (<div className="p-4 text-center" dir="rtl"><Loader className="mt-8" /><p className="text-gray-600 mt-4">جاري تحميل بيانات المستخدم...</p></div>);
  if (error) return (<div className="p-4 text-center text-red-600" dir="rtl"><Alert message={error} type="error" /></div>);
  if (!userToDelete) return null;

  return (
    <div className="p-4" dir="rtl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">تأكيد حذف المستخدم</h2>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <p className="mb-4 text-gray-700">
          هل أنت متأكد أنك تريد حذف المستخدم "{userToDelete.users_name}" (ID: {userToDelete.users_id})؟
          لا يمكن التراجع عن هذا الإجراء.
        </p>
        {formMessage && (<Alert message={formMessage} type={formMessageType} onClose={() => setFormMessage('')} className="mb-4" />)}
        <div className="flex justify-end space-x-2 rtl:space-x-reverse">
          <Button type="button" onClick={() => navigate('/dashboard/users')} className="bg-gray-500 hover:bg-gray-600" disabled={formLoading}>إلغاء</Button>
          <Button type="button" onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700 flex items-center" disabled={formLoading}>
            {formLoading ? (<><Loader className="w-4 h-4 ml-2 rtl:mr-2 rtl:ml-0" /> جاري الحذف...</>) : 'حذف'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DeleteUserConfirmation;
