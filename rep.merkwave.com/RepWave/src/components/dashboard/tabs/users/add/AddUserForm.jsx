// src/components/dashboard/tabs/users/add/AddUserForm.js
// This component provides the form for adding a new user.
// It should be saved as AddUserForm.jsx in your local project.

import React, { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import Button from "../../../../common/Button/Button.jsx";
import Loader from "../../../../common/Loader/Loader.jsx";
import Alert from "../../../../common/Alert/Alert.jsx";
import { addUser } from "../../../../../apis/users.js";

function AddUserForm() {
  const navigate = useNavigate();
  const { setGlobalMessage, loadUserData, userLimit, currentUsers } =
    useOutletContext();

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState("rep");
  const [userPhone, setUserPhone] = useState("");
  const [userNationalId, setUserNationalId] = useState("");
  const [userStatus, setUserStatus] = useState("1");
  const [userImage, setUserImage] = useState(null);
  const [userImagePreview, setUserImagePreview] = useState("");

  const [formLoading, setFormLoading] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [formMessageType, setFormMessageType] = useState("info");

  const isUserLimitReached =
    userLimit !== null && currentUsers.length >= userLimit;

  const premiumInput = `
    w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl
    bg-white
    border border-gray-200
    text-gray-800 text-sm sm:text-base
    placeholder:text-gray-400
    shadow-sm
    hover:border-gray-300
    focus:border-[#5BC7F2]
    focus:ring-4 focus:ring-[#5BC7F2]/25
    focus:shadow-md
    outline-none
    transition-all duration-200
  `;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUserImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setUserImagePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setUserImage(null);
      setUserImagePreview("");
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (isUserLimitReached) {
      setFormMessage(
        "لقد وصلت إلى الحد الأقصى للمستخدمين. لا يمكن إضافة مستخدم جديد.",
      );
      setFormMessageType("error");
      return;
    }

    setFormLoading(true);
    setFormMessage("");

    const normalizedRole = userRole === "sales_rep" ? "rep" : userRole;
    const userData = {
      users_name: userName,
      users_email: userEmail,
      users_password: userPassword,
      users_role: normalizedRole,
      users_phone: userPhone,
      users_national_id: userNationalId,
      users_status: parseInt(userStatus, 10),
      users_image: userImage,
    };

    try {
      const result = await addUser(userData);
      setFormMessage(result.message || "تم إضافة المستخدم بنجاح!");
      setFormMessageType("success");
      setGlobalMessage({
        message: result.message || "تم إضافة المستخدم بنجاح!",
        type: "success",
      });
      loadUserData();
      setTimeout(() => navigate("/dashboard/users"), 1500);
    } catch (err) {
      console.error("Form submission error:", err);
      setFormMessage(err.message || "حدث خطأ أثناء إضافة المستخدم.");
      setFormMessageType("error");
      setGlobalMessage({
        message: err.message || "حدث خطأ أثناء إضافة المستخدم.",
        type: "error",
      });
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div
      className="
        bg-white
        rounded-2xl
        border border-gray-200/60
        shadow-sm
        max-w-5xl
        mx-auto
        overflow-hidden
      "
      dir="rtl"
    >
      {/* Premium Header */}
      <div
        className="
          px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6
          border-b border-gray-200
          bg-gradient-to-r from-[#5BC7F2]/10 via-white to-white
          flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3
        "
      >
        <div className="flex items-center gap-3">
          <div
            className="
              w-10 h-10 sm:w-12 sm:h-12
              rounded-xl
              bg-[#5BC7F2]/20
              flex items-center justify-center
              text-[#5BC7F2]
              shrink-0
            "
          >
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900">
              إضافة مستخدم جديد
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              إنشاء حساب مستخدم جديد وتعيين الصلاحيات
            </p>
          </div>
        </div>
      </div>

      {/* User Limit Warning */}
      {isUserLimitReached && (
        <div className="mx-3 sm:mx-5 md:mx-7 mt-4 sm:mt-5">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-medium text-red-800">
                  تم الوصول إلى الحد الأقصى للمستخدمين
                </h3>
                <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-red-700">
                  عدد المستخدمين الحالي: {currentUsers.length} / {userLimit}
                  <br />
                  لا يمكن إضافة مستخدمين جدد حتى يتم حذف مستخدمين موجودين أو
                  ترقية خطتك.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={handleFormSubmit}
        className="p-3 sm:p-5 md:p-7 space-y-4 sm:space-y-5"
      >
        {formMessage && (
          <Alert
            message={formMessage}
            type={formMessageType}
            onClose={() => setFormMessage("")}
          />
        )}

        {/* Name + Email row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-sm font-medium text-gray-600">
              اسم المستخدم
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="أدخل اسم المستخدم"
              required
              disabled={formLoading}
              className={premiumInput}
            />
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-sm font-medium text-gray-600">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="أدخل البريد الإلكتروني"
              required
              disabled={formLoading}
              className={premiumInput}
            />
          </div>
        </div>

        {/* Password + Role row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-sm font-medium text-gray-600">
              كلمة المرور
            </label>
            <input
              type="password"
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
              placeholder="أدخل كلمة المرور"
              required
              disabled={formLoading}
              className={premiumInput}
            />
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-sm font-medium text-gray-600">الدور</label>
            <div className="relative">
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                required
                disabled={formLoading}
                className="
                  w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl
                  bg-white border border-gray-200
                  text-gray-800 text-sm sm:text-base
                  shadow-sm hover:border-gray-300
                  focus:border-[#5BC7F2] focus:ring-4 focus:ring-[#5BC7F2]/25
                  focus:shadow-md outline-none
                  transition-all duration-200
                  appearance-none pr-10
                "
              >
                <option value="admin">مدير</option>
                <option value="rep">مسئول مبيعات</option>
                <option value="store_keeper">أمين مخزن</option>
                <option value="cash">كاش</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Phone + National ID row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-sm font-medium text-gray-600">الهاتف</label>
            <input
              type="tel"
              value={userPhone}
              onChange={(e) => setUserPhone(e.target.value)}
              placeholder="أدخل رقم الهاتف"
              disabled={formLoading}
              className={premiumInput}
            />
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-sm font-medium text-gray-600">
              الرقم القومي
            </label>
            <input
              type="text"
              value={userNationalId}
              onChange={(e) => setUserNationalId(e.target.value)}
              placeholder="أدخل الرقم القومي"
              disabled={formLoading}
              className={premiumInput}
            />
          </div>
        </div>

        {/* Status */}
        <div className="space-y-1.5 sm:space-y-2">
          <label className="text-sm font-medium text-gray-600">الحالة</label>
          <div className="relative">
            <select
              value={userStatus}
              onChange={(e) => setUserStatus(e.target.value)}
              required
              disabled={formLoading}
              className="
                w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl
                bg-white border border-gray-200
                text-gray-800 text-sm sm:text-base
                shadow-sm hover:border-gray-300
                focus:border-[#5BC7F2] focus:ring-4 focus:ring-[#5BC7F2]/25
                focus:shadow-md outline-none
                transition-all duration-200
                appearance-none pr-10
              "
            >
              <option value="1">نشط</option>
              <option value="0">غير نشط</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Image Upload */}
        <div className="space-y-2 sm:space-y-3">
          <label className="text-sm font-medium text-gray-600">
            صورة المستخدم
          </label>

          {userImagePreview && (
            <div className="flex items-center gap-3 sm:gap-4">
              <img
                src={userImagePreview}
                alt="معاينة الصورة"
                className="
                  h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24
                  rounded-full object-cover
                  ring-4 ring-[#8DD8F5]/30
                  shadow-md
                  transition-all hover:scale-105
                "
              />
              <span className="text-xs sm:text-sm text-gray-500">
                معاينة الصورة
              </span>
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            disabled={formLoading}
            className="
              block w-full text-xs sm:text-sm text-gray-500
              file:ml-3 sm:file:ml-4
              file:px-3 sm:file:px-5 file:py-1.5 sm:file:py-2
              file:rounded-full
              file:border-0
              file:text-xs sm:file:text-sm
              file:font-semibold
              file:bg-[#8DD8F5]/20
              file:text-[#1F2937]
              hover:file:bg-[#8DD8F5]/30
              transition-all
            "
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 sm:pt-6 border-t border-gray-100">
          <Button
            type="button"
            onClick={() => navigate("/dashboard/users")}
            className="bg-gray-100 text-gray-700 hover:bg-gray-200 w-full sm:w-auto"
            disabled={formLoading}
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            className={`
              bg-[#8DD8F5] text-[#1F2937] hover:bg-[#74cbea]
              shadow-sm flex items-center justify-center
              w-full sm:w-auto
              ${isUserLimitReached ? "opacity-50 cursor-not-allowed" : ""}
            `}
            disabled={formLoading || isUserLimitReached}
            title={
              isUserLimitReached ? "لقد وصلت إلى الحد الأقصى للمستخدمين" : ""
            }
          >
            {formLoading ? (
              <>
                <Loader className="w-4 h-4 ml-2 rtl:mr-2 rtl:ml-0" /> جاري
                الحفظ...
              </>
            ) : (
              "إضافة مستخدم"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default AddUserForm;
