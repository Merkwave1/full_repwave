// src/components/dashboard/tabs/users/update/UpdateUserForm.jsx
import React, { useState, useEffect, useCallback } from "react"; // Added useCallback
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { getUserById, updateUser } from "../../../../../apis/users.js";
import Loader from "../../../../common/Loader/Loader.jsx";
import Alert from "../../../../common/Alert/Alert.jsx";
import Button from "../../../../common/Button/Button.jsx";

function UpdateUserForm() {
  const { userId } = useParams();
  const navigate = useNavigate();
  // Call useOutletContext at the top level of the functional component
  const {
    setGlobalMessage,
    loadUserData,
    currentUsers: usersFromContext,
  } = useOutletContext(); // Destructure currentUsers as usersFromContext

  const [formData, setFormData] = useState({
    users_id: "",
    users_name: "",
    users_email: "",
    users_password: "", // Password might be optional for update
    users_role: "rep", // default to rep (only admin/rep allowed now)
    users_phone: "",
    users_national_id: "",
    users_status: 1, // Default to active
    users_image: "", // To display current image
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Memoize fetchUserData to prevent unnecessary re-creations
  const fetchUserData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // First, try to find the user in the already loaded `currentUsers` from context
      const userFromContext = usersFromContext.find(
        (u) => u.users_id.toString() === userId,
      );

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
          users_id: user.users_id || "",
          users_name: user.users_name || "",
          users_email: user.users_email || "",
          users_password: "", // Never pre-fill password for security
          users_role:
            user.users_role === "sales_rep" ? "rep" : user.users_role || "rep",
          users_phone: user.users_phone || "",
          users_national_id: user.users_national_id || "",
          users_status: user.users_status ?? 1,
          users_image: user.users_image || "",
        });
      } else {
        setError("المستخدم غير موجود.");
      }
    } catch (err) {
      console.error("Failed to fetch user data:", err);
      setError(
        "فشل في تحميل بيانات المستخدم: " + (err.message || "خطأ غير معروف"),
      );
    } finally {
      setLoading(false);
    }
  }, [userId, usersFromContext]); // Depend on userId and usersFromContext

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]); // Depend on the memoized fetchUserData function

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;

    if (type === "file" && files && files[0]) {
      const file = files[0];

      setFormData((prev) => ({
        ...prev,
        [name]: file,
      }));

      // Live preview
      const previewUrl = URL.createObjectURL(file);
      setPreviewImage(previewUrl);
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const normalized = {
        ...formData,
        users_role:
          formData.users_role === "sales_rep" ? "rep" : formData.users_role,
      };
      const result = await updateUser(normalized); // Pass normalized data
      setGlobalMessage({
        type: "success",
        message: result.message || "تم تحديث المستخدم بنجاح!",
      });
      await loadUserData(); // Refresh user list in parent
      navigate("/dashboard/users"); // Redirect back to user list
    } catch (err) {
      console.error("Update user error:", err);
      setGlobalMessage({
        type: "error",
        message: err.message || "فشل في تحديث المستخدم.",
      });
      setError(err.message || "فشل في تحديث المستخدم.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center" dir="rtl">
        <Loader className="mt-8" />
        <p className="text-gray-600 mt-4">جاري تحميل بيانات المستخدم...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4 text-center" dir="rtl">
        <Alert message={error} type="error" />
      </div>
    );
  }

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
      <div
        className="
  px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-7
  border-b border-gray-200
  bg-gradient-to-r from-[#5BC7F2]/10 via-white to-white
  flex items-center justify-between
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
    "
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 11c1.657 0 3-1.343 3-3S13.657 5 12 5 9 6.343 9 8s1.343 3 3 3z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2"
              />
            </svg>
          </div>

          <div>
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
              تعديل المستخدم
            </h3>
            <p className="text-xs sm:text-sm text-gray-500">
              تحديث بيانات الحساب والمعلومات الأساسية
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleFormSubmit}
        className="p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6"
      >
        {/* INPUT STYLE WRAPPER */}
        {/** reusable input style */}
        {/*
        inputStyle used inline to keep file simple
      */}

        {/* Name + Email row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-sm font-medium text-gray-600">
              اسم المستخدم
            </label>
            <input
              type="text"
              name="users_name"
              value={formData.users_name}
              onChange={handleChange}
              required
              maxLength={100}
              className={premiumInput}
            />
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-sm font-medium text-gray-600">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              name="users_email"
              value={formData.users_email}
              onChange={handleChange}
              required
              className={premiumInput}
            />
          </div>
        </div>

        {/* Password + Role row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-sm font-medium text-gray-600">
              كلمة المرور (اترك فارغاً لعدم التغيير)
            </label>
            <input
              type="password"
              name="users_password"
              value={formData.users_password}
              onChange={handleChange}
              className={premiumInput}
            />
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-sm font-medium text-gray-600">الدور</label>

            <div className="relative">
              <select
                name="users_role"
                value={formData.users_role}
                onChange={handleChange}
                className="
        w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl
        bg-white
        border border-gray-200
        text-gray-800 text-sm sm:text-base
        shadow-sm
        hover:border-gray-300
        focus:border-[#5BC7F2]
        focus:ring-4 focus:ring-[#5BC7F2]/25
        focus:shadow-md
        outline-none
        transition-all duration-200
        appearance-none
        pr-10
      "
              >
                <option value="admin">مدير</option>
                <option value="rep">مسئول مبيعات</option>
                <option value="store_keeper">أمين مخزن</option>
                <option value="cash">كاش</option>
              </select>

              {/* Premium arrow */}
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

        {/* PHONE + NATIONAL ID GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-sm font-medium text-gray-600">
              رقم الهاتف
            </label>

            <input
              type="text"
              name="users_phone"
              value={formData.users_phone}
              onChange={handleChange}
              className={premiumInput}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600">
              الرقم القومي
            </label>

            <input
              type="text"
              name="users_national_id"
              value={formData.users_national_id}
              onChange={handleChange}
              className={premiumInput}
            />
          </div>
        </div>

        {/* STATUS */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-600">الحالة</label>

          <div className="relative">
            <select
              name="users_status"
              value={formData.users_status}
              onChange={handleChange}
              className="
        w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl
        bg-white
        border border-gray-200
        text-gray-800 text-sm sm:text-base
        shadow-sm
        hover:border-gray-300
        focus:border-[#5BC7F2]
        focus:ring-4 focus:ring-[#5BC7F2]/25
        focus:shadow-md
        outline-none
        transition-all duration-200
        appearance-none
        pr-10
      "
            >
              <option value={1}>نشط</option>
              <option value={0}>غير نشط</option>
            </select>

            {/* Premium arrow */}
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

        {/* IMAGE */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-600">
            صورة المستخدم
          </label>

          {/* IMAGE PREVIEW */}
          {(previewImage || formData.users_image) && (
            <div className="flex items-center gap-4">
              <img
                src={
                  previewImage
                    ? previewImage
                    : typeof formData.users_image === "string"
                      ? formData.users_image
                      : ""
                }
                alt="preview"
                className="
                h-24 w-24
                rounded-full
                object-cover
                ring-4 ring-[#8DD8F5]/30
                shadow-md
                transition-all
                hover:scale-105
              "
              />
              <span className="text-sm text-gray-500">
                {previewImage ? "معاينة الصورة الجديدة" : "الصورة الحالية"}
              </span>
            </div>
          )}

          <input
            type="file"
            name="users_image"
            accept="image/*"
            onChange={handleChange}
            className="
            block w-full text-sm text-gray-500
            file:ml-4
            file:px-5 file:py-2
            file:rounded-full
            file:border-0
            file:bg-[#8DD8F5]/20
            file:text-[#1F2937]
            hover:file:bg-[#8DD8F5]/30
          "
          />
        </div>

        {/* ACTIONS */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 sm:pt-6 border-t border-gray-100">
          <Button
            type="button"
            onClick={() => navigate("/dashboard/users")}
            className="bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            إلغاء
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="
            bg-[#8DD8F5]
            text-[#1F2937]
            hover:bg-[#74cbea]
            shadow-sm
          "
          >
            {isSubmitting ? "جاري التحديث..." : "تحديث المستخدم"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default UpdateUserForm;
