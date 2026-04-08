// src/components/dashboard/tabs/users/add/AddUserForm.js
// This component provides the form for adding a new user.
// It should be saved as AddUserForm.jsx in your local project.

import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import TextField from '../../../../common/TextField/TextField.jsx';
import Button from '../../../../common/Button/Button.jsx';
import Loader from '../../../../common/Loader/Loader.jsx';
import Alert from '../../../../common/Alert/Alert.jsx';
import { addUser } from '../../../../../apis/users.js';
// Removed: import { User as UserIcon } from 'lucide-react'; // Not used in this component

function AddUserForm() {
  const navigate = useNavigate();
  // Consume functions from context
  const { setGlobalMessage, loadUserData, userLimit, currentUsers } = useOutletContext(); // Added userLimit and currentUsers

  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  // Only two roles allowed per new requirement: مدير (admin) / مسئول مبيعات (rep)
  const [userRole, setUserRole] = useState('rep');
  const [userPhone, setUserPhone] = useState('');
  const [userNationalId, setUserNationalId] = useState('');
  const [userStatus, setUserStatus] = useState('1');
  const [userImage, setUserImage] = useState(null);
  const [userImagePreview, setUserImagePreview] = useState('');

  const [formLoading, setFormLoading] = useState(false);
  const [formMessage, setFormMessage] = useState('');
  const [formMessageType, setFormMessageType] = useState('info');

  // Check if user limit is reached
  const isUserLimitReached = userLimit !== null && currentUsers.length >= userLimit;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) { setUserImage(file); const reader = new FileReader(); reader.onloadend = () => setUserImagePreview(reader.result); reader.readAsDataURL(file); }
    else { setUserImage(null); setUserImagePreview(''); }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent submission if user limit is reached
    if (isUserLimitReached) {
      setFormMessage('لقد وصلت إلى الحد الأقصى للمستخدمين. لا يمكن إضافة مستخدم جديد.');
      setFormMessageType('error');
      return;
    }
    
    setFormLoading(true); setFormMessage('');

    // Normalize role (legacy value safeguard)
    const normalizedRole = userRole === 'sales_rep' ? 'rep' : userRole;
    const userData = {
      users_name: userName,
      users_email: userEmail,
      users_password: userPassword,
      users_role: normalizedRole,
      users_phone: userPhone,
      users_national_id: userNationalId,
      users_status: parseInt(userStatus, 10),
      users_image: userImage
    };

    try {
      const result = await addUser(userData);
      setFormMessage(result.message || "تم إضافة المستخدم بنجاح!");
      setFormMessageType('success');
      // Use the single setGlobalMessage function from context
      setGlobalMessage({ message: result.message || "تم إضافة المستخدم بنجاح!", type: 'success' });
      loadUserData(); // Refresh list in parent via context
      setTimeout(() => navigate('/dashboard/users'), 1500); // Redirect back to list
    } catch (err) {
      console.error("Form submission error:", err);
      setFormMessage(err.message || "حدث خطأ أثناء إضافة المستخدم.");
      setFormMessageType('error');
      // Use the single setGlobalMessage function from context for error
      setGlobalMessage({ message: err.message || "حدث خطأ أثناء إضافة المستخدم.", type: 'error' });
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="p-4" dir="rtl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">إضافة مستخدم جديد</h2>
      
      {/* User Limit Warning */}
      {isUserLimitReached && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="mr-3">
              <h3 className="text-sm font-medium text-red-800">
                تم الوصول إلى الحد الأقصى للمستخدمين
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  عدد المستخدمين الحالي: {currentUsers.length} / {userLimit}
                  <br />
                  لا يمكن إضافة مستخدمين جدد حتى يتم حذف مستخدمين موجودين أو ترقية خطتك.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md">
        <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {formMessage && (<div className="md:col-span-2"><Alert message={formMessage} type={formMessageType} onClose={() => setFormMessage('')} /></div>)}
          <TextField label="اسم المستخدم" type="text" id="userName" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="أدخل اسم المستخدم" required disabled={formLoading} />
          <TextField label="البريد الإلكتروني" type="email" id="userEmail" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="أدخل البريد الإلكتروني" required disabled={formLoading} />
          <TextField label="كلمة المرور" type="password" id="userPassword" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} placeholder="أدخل كلمة المرور" required disabled={formLoading} />

          <div className="mb-4" dir="rtl">
            <label htmlFor="userRole" className="block text-gray-700 text-sm font-bold mb-2 text-right">الدور</label>
            <select
              id="userRole"
              value={userRole}
              onChange={(e) => setUserRole(e.target.value)}
              className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right bg-white"
              required
              disabled={formLoading}
              dir="rtl"
            >
              <option value="admin">مدير</option>
                <option value="rep">مسئول مبيعات</option>
                <option value="store_keeper">أمين مخزن</option>
                <option value="cash">كاش</option>
            </select>
          </div>
          <TextField label="الهاتف" type="tel" id="userPhone" value={userPhone} onChange={(e) => setUserPhone(e.target.value)} placeholder="أدخل رقم الهاتف" disabled={formLoading} />
          <TextField label="الرقم القومي" type="text" id="userNationalId" value={userNationalId} onChange={(e) => setUserNationalId(e.target.value)} placeholder="أدخل الرقم القومي" disabled={formLoading} />

          <div className="mb-4" dir="rtl">
            <label htmlFor="userStatus" className="block text-gray-700 text-sm font-bold mb-2 text-right">الحالة</label>
            <select id="userStatus" value={userStatus} onChange={(e) => setUserStatus(e.target.value)} className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right bg-white" required disabled={formLoading} dir="rtl">
              <option value="1">نشط</option><option value="0">غير نشط</option>
            </select>
          </div>

          <div className="mb-4" dir="rtl">
            <label htmlFor="userImage" className="block text-gray-700 text-sm font-bold mb-2 text-right">الصورة</label>
            <input type="file" id="userImage" accept="image/*" onChange={handleImageChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" disabled={formLoading} dir="rtl" />
            {userImagePreview && (<div className="mt-2 text-right"><img src={userImagePreview} alt="معاينة الصورة" className="h-20 w-20 object-cover rounded-full inline-block border border-gray-200" /></div>)}
          </div>

          <div className="flex justify-end space-x-2 rtl:space-x-reverse md:col-span-2">
            <Button type="button" onClick={() => navigate('/dashboard/users')} className="bg-gray-500 hover:bg-gray-600" disabled={formLoading}>إلغاء</Button>
            <Button 
              type="submit" 
              className={`flex items-center ${isUserLimitReached ? 'opacity-50 cursor-not-allowed' : ''}`} 
              disabled={formLoading || isUserLimitReached}
              title={isUserLimitReached ? 'لقد وصلت إلى الحد الأقصى للمستخدمين' : ''}
            >
              {formLoading ? (<><Loader className="w-4 h-4 ml-2 rtl:mr-2 rtl:ml-0" /> جاري الحفظ...</>) : 'إضافة'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddUserForm;
