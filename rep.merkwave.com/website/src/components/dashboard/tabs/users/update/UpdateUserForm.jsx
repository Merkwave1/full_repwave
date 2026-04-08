// src/components/dashboard/tabs/users/update/UpdateUserForm.jsx
import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { getUserById, updateUser } from '../../../../../apis/users.js';
import Loader from '../../../../common/Loader/Loader.jsx';
import Alert from '../../../../common/Alert/Alert.jsx';
import Button from '../../../../common/Button/Button.jsx';

function UpdateUserForm() {
  const { userId } = useParams();
  const navigate = useNavigate();
  // Call useOutletContext at the top level of the functional component
  const { setGlobalMessage, loadUserData, currentUsers: usersFromContext } = useOutletContext(); // Destructure currentUsers as usersFromContext

  const [formData, setFormData] = useState({
    users_id: '',
    users_name: '',
    users_email: '',
    users_password: '', // Password might be optional for update
  users_role: 'rep', // default to rep (only admin/rep allowed now)
    users_phone: '',
    users_national_id: '',
    users_status: 1, // Default to active
    users_image: '', // To display current image
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Memoize fetchUserData to prevent unnecessary re-creations
  const fetchUserData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // First, try to find the user in the already loaded `currentUsers` from context
      const userFromContext = usersFromContext.find(u => u.users_id.toString() === userId);

      let user;
      if (userFromContext) {
        user = userFromContext;
      } else {
        // If not found in context (e.g., direct URL access, or context not fully loaded),
        // then fetch from API.
        user = await getUserById(userId);
      }

      if (user) {
        setFormData({
          users_id: user.users_id || '',
          users_name: user.users_name || '',
          users_email: user.users_email || '',
          users_password: '', // Never pre-fill password for security
          users_role: (user.users_role === 'sales_rep') ? 'rep' : (user.users_role || 'rep'),
          users_phone: user.users_phone || '',
          users_national_id: user.users_national_id || '',
          users_status: user.users_status ?? 1,
          users_image: user.users_image || '',
        });
      } else {
        setError('المستخدم غير موجود.');
      }
    } catch (err) {
      console.error("Failed to fetch user data:", err);
      setError('فشل في تحميل بيانات المستخدم: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setLoading(false);
    }
  }, [userId, usersFromContext]); // Depend on userId and usersFromContext

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]); // Depend on the memoized fetchUserData function

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: type === 'file' ? files[0] : value,
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
  const normalized = { ...formData, users_role: formData.users_role === 'sales_rep' ? 'rep' : formData.users_role };
  const result = await updateUser(normalized); // Pass normalized data
      setGlobalMessage({ type: 'success', message: result.message || 'تم تحديث المستخدم بنجاح!' });
      await loadUserData(); // Refresh user list in parent
      navigate('/dashboard/users'); // Redirect back to user list
    } catch (err) {
      console.error("Update user error:", err);
      setGlobalMessage({ type: 'error', message: err.message || 'فشل في تحديث المستخدم.' });
      setError(err.message || 'فشل في تحديث المستخدم.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (<div className="p-4 text-center" dir="rtl"><Loader className="mt-8" /><p className="text-gray-600 mt-4">جاري تحميل بيانات المستخدم...</p></div>);
  }
  if (error) {
    return (<div className="p-4 text-center" dir="rtl"><Alert message={error} type="error" /></div>);
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl mx-auto" dir="rtl">
      <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">تعديل المستخدم</h3>
      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div>
          <label htmlFor="users_name" className="block text-sm font-medium text-gray-700">
            اسم المستخدم
          </label>
          <input
            type="text"
            id="users_name"
            name="users_name"
            value={formData.users_name}
            onChange={handleChange}
            required
            maxLength={100}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="users_email" className="block text-sm font-medium text-gray-700">
            البريد الإلكتروني
          </label>
          <input
            type="email"
            id="users_email"
            name="users_email"
            value={formData.users_email}
            onChange={handleChange}
            required
            maxLength={100}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="users_password" className="block text-sm font-medium text-gray-700">
            كلمة المرور (اترك فارغاً لعدم التغيير)
          </label>
          <input
            type="password"
            id="users_password"
            name="users_password"
            value={formData.users_password}
            onChange={handleChange}
            maxLength={50}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="users_role" className="block text-sm font-medium text-gray-700">
            الدور
          </label>
          <select
            id="users_role"
            name="users_role"
            value={formData.users_role}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="admin">مدير</option>
            <option value="rep">مسئول مبيعات</option>
            <option value="store_keeper">أمين مخزن</option>
            <option value="cash">كاش</option>
          </select>
        </div>

        <div>
          <label htmlFor="users_phone" className="block text-sm font-medium text-gray-700">
            رقم الهاتف
          </label>
          <input
            type="text"
            id="users_phone"
            name="users_phone"
            value={formData.users_phone}
            onChange={handleChange}
            maxLength={20}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="users_national_id" className="block text-sm font-medium text-gray-700">
            الرقم القومي
          </label>
          <input
            type="text"
            id="users_national_id"
            name="users_national_id"
            value={formData.users_national_id}
            onChange={handleChange}
            maxLength={20}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="users_status" className="block text-sm font-medium text-gray-700">
            الحالة
          </label>
          <select
            id="users_status"
            name="users_status"
            value={formData.users_status}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value={1}>نشط</option>
            <option value={0}>غير نشط</option>
          </select>
        </div>

        <div>
          <label htmlFor="users_image" className="block text-sm font-medium text-gray-700">
            صورة المستخدم
          </label>
          {formData.users_image && (
            <div className="mb-2">
              <img src={formData.users_image} alt="Current User" className="h-20 w-20 rounded-full object-cover" onError={(e) => e.target.src = 'https://placehold.co/80x80/cccccc/ffffff?text=No+Img'} />
              <p className="text-xs text-gray-500 mt-1">الصورة الحالية</p>
            </div>
          )}
          <input
            type="file"
            id="users_image"
            name="users_image"
            accept="image/*"
            onChange={handleChange}
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="text-xs text-gray-500 mt-1">اترك فارغًا للاحتفاظ بالصورة الحالية.</p>
        </div>

        <div className="flex justify-end space-x-4 space-x-reverse mt-6">
          <Button type="button" onClick={() => navigate('/dashboard/users')} className="bg-gray-500 hover:bg-gray-600" disabled={isSubmitting}>
            إلغاء
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
            {isSubmitting ? 'جاري التحديث...' : 'تحديث المستخدم'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default UpdateUserForm;
