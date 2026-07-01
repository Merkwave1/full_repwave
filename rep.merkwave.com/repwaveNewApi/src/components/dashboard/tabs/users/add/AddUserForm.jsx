import React, { useState, useEffect } from 'react';
import { UserPlusIcon } from '@heroicons/react/24/outline';
import Loader from '../../../../common/Loader/Loader.jsx';
import Alert from '../../../../common/Alert/Alert.jsx';
import AppModalShell, {
  modalPrimaryBtnClass,
  modalSecondaryBtnClass,
  modalInputClass,
  modalSectionClass,
} from '../../../../common/AppModalShell.jsx';
import { addUser } from '../../../../../apis/users.js';

const labelClass = 'block text-sm font-semibold text-gray-700 mb-1.5';

function AddUserForm({
  isOpen,
  onClose,
  setGlobalMessage,
  loadUserData,
  userLimit,
  currentUsers,
}) {
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState('rep');
  const [userPhone, setUserPhone] = useState('');
  const [userNationalId, setUserNationalId] = useState('');
  const [userStatus, setUserStatus] = useState('1');
  const [userImagePreview, setUserImagePreview] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formMessage, setFormMessage] = useState('');
  const [formMessageType, setFormMessageType] = useState('info');

  const isUserLimitReached =
    userLimit !== null && (currentUsers?.length ?? 0) >= userLimit;

  useEffect(() => {
    if (isOpen) {
      setUserName('');
      setUserEmail('');
      setUserPassword('');
      setUserRole('rep');
      setUserPhone('');
      setUserNationalId('');
      setUserStatus('1');
      setUserImagePreview('');
      setFormMessage('');
    }
  }, [isOpen]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setUserImagePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setUserImagePreview('');
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (isUserLimitReached) {
      setFormMessage('لقد وصلت إلى الحد الأقصى للمستخدمين.');
      setFormMessageType('error');
      return;
    }
    setFormLoading(true);
    setFormMessage('');
    try {
      const payload = {
        users_name: userName,
        users_email: userEmail,
        users_password: userPassword,
        users_role: userRole === 'sales_rep' ? 'rep' : userRole,
        users_phone: userPhone,
        users_national_id: userNationalId,
        users_status: userStatus === '1' || userStatus === 1,
      };
      if (userImagePreview) payload.users_image = userImagePreview;
      const result = await addUser(payload);
      const msg =
        (typeof result === 'string' ? result : result?.message) ||
        'تم إضافة المستخدم بنجاح!';
      setFormMessage(msg);
      setFormMessageType('success');
      setGlobalMessage({ message: msg, type: 'success' });
      loadUserData();
      setTimeout(onClose, 1200);
    } catch (err) {
      setFormMessage(err.message || 'حدث خطأ أثناء إضافة المستخدم.');
      setFormMessageType('error');
    } finally {
      setFormLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AppModalShell
      open={isOpen}
      onClose={onClose}
      title="إضافة مستخدم جديد"
      subtitle="إنشاء حساب وتعيين الصلاحيات"
      icon={UserPlusIcon}
      size="lg"
      portal
      closeOnBackdrop={!formLoading}
      bodyClassName="p-4 sm:p-6 overflow-y-auto overflow-x-hidden flex-1 min-h-0 bg-[#FAFAFE] max-h-[70vh]"
      footer={
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={formLoading}
            className={modalSecondaryBtnClass}
          >
            إلغاء
          </button>
          <button
            type="submit"
            form="add-user-form"
            disabled={formLoading || isUserLimitReached}
            className={`${modalPrimaryBtnClass} inline-flex items-center justify-center gap-2`}
          >
            {formLoading ? (
              <>
                <Loader className="w-4 h-4" />
                جاري الحفظ...
              </>
            ) : (
              'إضافة المستخدم'
            )}
          </button>
        </div>
      }
    >
      {isUserLimitReached && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          لقد وصلت الحد الأقصى من المستخدمين ({currentUsers?.length} / {userLimit}).
        </div>
      )}
      {formMessage && (
        <Alert
          message={formMessage}
          type={formMessageType}
          onClose={() => setFormMessage('')}
          className="mb-4"
        />
      )}

      <form id="add-user-form" onSubmit={handleFormSubmit}>
        <div className={`${modalSectionClass} p-4 sm:p-5 space-y-4`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                اسم المستخدم <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="أدخل الاسم"
                required
                disabled={formLoading}
                className={modalInputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                البريد الإلكتروني <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="example@domain.com"
                required
                disabled={formLoading}
                className={modalInputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                كلمة المرور <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={formLoading}
                className={modalInputClass}
              />
            </div>
            <div>
              <label className={labelClass}>الدور</label>
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                required
                disabled={formLoading}
                className={modalInputClass}
              >
                <option value="admin">مدير</option>
                <option value="rep">مسؤول مبيعات</option>
                <option value="store_keeper">أمين مخزن</option>
                <option value="cash">كاش</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>الهاتف</label>
              <input
                type="tel"
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
                placeholder="01X XXXX XXXX"
                disabled={formLoading}
                className={modalInputClass}
              />
            </div>
            <div>
              <label className={labelClass}>الرقم القومي</label>
              <input
                type="text"
                value={userNationalId}
                onChange={(e) => setUserNationalId(e.target.value)}
                placeholder="30XXXXXXXXXXXXXX"
                disabled={formLoading}
                className={modalInputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>الحالة</label>
            <select
              value={userStatus}
              onChange={(e) => setUserStatus(e.target.value)}
              required
              disabled={formLoading}
              className={modalInputClass}
            >
              <option value="1">نشط</option>
              <option value="0">غير نشط</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>صورة المستخدم</label>
            {userImagePreview && (
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={userImagePreview}
                  alt="معاينة"
                  className="h-16 w-16 rounded-full object-cover ring-4 ring-[#EDE7FF] shadow"
                />
                <span className="text-xs text-gray-500">معاينة الصورة</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              disabled={formLoading}
              className="block w-full text-sm text-gray-500 file:ml-3 file:px-4 file:py-1.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#EDE7FF] file:text-[#2D1B69] hover:file:bg-[#C4A8F0]/40"
            />
          </div>
        </div>
      </form>
    </AppModalShell>
  );
}

export default AddUserForm;
