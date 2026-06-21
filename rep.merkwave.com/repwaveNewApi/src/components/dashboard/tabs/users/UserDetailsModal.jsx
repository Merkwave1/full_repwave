// src/components/dashboard/tabs/users/UserDetailsModal.jsx
import React, { useEffect, useState, useCallback } from "react";
import {
  XMarkIcon,
  PencilSquareIcon,
  TrashIcon,
  PhoneIcon,
  EnvelopeIcon,
  IdentificationIcon,
  UserCircleIcon,
  HashtagIcon,
  CheckIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { updateUser } from "../../../../apis/users.js";
import Loader from "../../../common/Loader/Loader.jsx";

/* ── Role config ── */
const ROLE_CONFIG = {
  admin: { gradient: "from-purple-600 to-indigo-700", label: "مدير" },
  sales_rep: { gradient: "from-blue-500   to-cyan-600", label: "مسئول مبيعات" },
  rep: { gradient: "from-blue-500   to-cyan-600", label: "مسئول مبيعات" },
  store_keeper: {
    gradient: "from-amber-500  to-yellow-600",
    label: "أمين مخزن",
  },
  cash: { gradient: "from-emerald-500 to-green-600", label: "كاش" },
};
const DEFAULT_ROLE = { gradient: "from-gray-500 to-gray-600", label: "—" };

const INPUT =
  "w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-800 text-sm placeholder:text-gray-400 shadow-sm hover:border-gray-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200/50 outline-none transition-all duration-200";
const SELECT = INPUT + " appearance-none";

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      <span className="flex-shrink-0 w-8 h-8 bg-white rounded-full shadow-sm flex items-center justify-center">
        <Icon className="w-4 h-4 text-gray-400" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-400 leading-none mb-0.5">{label}</p>
        <p className="text-sm font-medium text-gray-800 truncate">{value}</p>
      </div>
    </div>
  );
}

function UserDetailsModal({
  isOpen,
  onClose,
  user,
  onDelete,
  setGlobalMessage,
  loadUserData,
  startInEditMode,
}) {
  const [mode, setMode] = useState("view"); // "view" | "edit"
  const [formData, setFormData] = useState({});
  const [previewImage, setPreviewImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  /* Reset mode when modal opens or user changes */
  useEffect(() => {
    if (isOpen && user) {
      setEditError("");
      setPreviewImage(null);
      if (startInEditMode) {
        setFormData({
          users_id: user.users_id,
          users_name: user.users_name || "",
          users_email: user.users_email || "",
          users_password: "",
          users_role:
            user.users_role === "sales_rep" ? "rep" : user.users_role || "rep",
          users_phone: user.users_phone || "",
          users_national_id: user.users_national_id || "",
          users_status: [true, 1, "1"].includes(user.users_status) ? 1 : 0,
          users_image: user.users_image || "",
        });
        setMode("edit");
      } else {
        setMode("view");
      }
    }
  }, [isOpen, user?.users_id, startInEditMode]);

  /* Populate form when entering edit mode from view mode */
  const enterEditMode = useCallback(() => {
    if (!user) return;
    setFormData({
      users_id: user.users_id,
      users_name: user.users_name || "",
      users_email: user.users_email || "",
      users_password: "",
      users_role:
        user.users_role === "sales_rep" ? "rep" : user.users_role || "rep",
      users_phone: user.users_phone || "",
      users_national_id: user.users_national_id || "",
      users_status: [true, 1, "1"].includes(user.users_status) ? 1 : 0,
      users_image: user.users_image || "",
    });
    setPreviewImage(null);
    setEditError("");
    setMode("edit");
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === "file" && files?.[0]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
        setFormData((p) => ({ ...p, [name]: reader.result }));
      };
      reader.readAsDataURL(files[0]);
    } else {
      setFormData((p) => ({ ...p, [name]: value }));
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setEditError("");
    try {
      const payload = {
        users_name: formData.users_name,
        users_email: formData.users_email,
        users_role:
          formData.users_role === "sales_rep" ? "rep" : formData.users_role,
        users_phone: formData.users_phone,
        users_national_id: formData.users_national_id,
        users_status:
          formData.users_status === 1 ||
          formData.users_status === "1" ||
          formData.users_status === true,
      };
      if (formData.users_password)
        payload.users_password = formData.users_password;
      if (typeof formData.users_image === "string" && formData.users_image) {
        payload.users_image = formData.users_image;
      }
      const result = await updateUser(formData.users_id, payload);
      setGlobalMessage?.({
        type: "success",
        message: result.message || "تم تحديث المستخدم بنجاح!",
      });
      await loadUserData?.();
      onClose();
    } catch (err) {
      setEditError(err.message || "فشل في حفظ التعديلات.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* Close on Escape — in edit mode go back to view first */
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === "Escape") {
        if (mode === "edit") setMode("view");
        else onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, mode, onClose]);

  if (!isOpen || !user) return null;

  const cfg = ROLE_CONFIG[user.users_role] ?? DEFAULT_ROLE;
  const isActive = [1, true, "1"].includes(user.users_status);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      dir="rtl"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-[6px]"
        onClick={mode === "view" ? onClose : undefined}
      />

      {/* Centered modal panel */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-[0_25px_60px_-10px_rgba(0,0,0,0.35)] flex flex-col max-h-[90vh] overflow-hidden animate-modal-in">
        {/* ── Header ── */}
        <div
          className={`relative bg-gradient-to-l ${cfg.gradient} px-6 pt-5 pb-8 rounded-t-2xl`}
        >
          <div className="absolute top-4 left-4 flex items-center gap-2">
            {mode === "edit" && (
              <button
                onClick={() => setMode("view")}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white text-xs font-medium transition-colors"
              >
                <ArrowRightIcon className="w-3.5 h-3.5" />
                رجوع
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
              aria-label="إغلاق"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col items-center text-center pt-4">
            {previewImage || user.users_image ? (
              <img
                src={previewImage || user.users_image}
                alt={user.users_name}
                className="w-24 h-24 rounded-full object-cover ring-4 ring-white/40 shadow-lg mb-3"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-white/25 ring-4 ring-white/40 shadow-lg mb-3 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">
                  {getInitials(user.users_name)}
                </span>
              </div>
            )}
            <h2 className="text-xl font-bold text-white leading-tight">
              {mode === "edit"
                ? formData.users_name || user.users_name
                : user.users_name || "—"}
            </h2>
            {user.users_email && (
              <p className="text-white/70 text-sm mt-0.5 truncate max-w-[260px]">
                {user.users_email}
              </p>
            )}
            <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
              <span className="text-xs px-2.5 py-1 rounded-full bg-white/20 text-white font-medium">
                {cfg.label}
              </span>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${isActive ? "bg-green-400/30 text-green-100" : "bg-red-400/30 text-red-200"}`}
              >
                {isActive ? "● نشط" : "○ غير نشط"}
              </span>
              {mode === "edit" && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-white/30 text-white font-semibold border border-white/40">
                  ✎ وضع التعديل
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          {mode === "view" ? (
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  بيانات التواصل
                </p>
                <InfoRow
                  icon={PhoneIcon}
                  label="رقم الهاتف"
                  value={user.users_phone}
                />
                <InfoRow
                  icon={EnvelopeIcon}
                  label="البريد الإلكتروني"
                  value={user.users_email}
                />
              </div>
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  بيانات الحساب
                </p>
                <InfoRow
                  icon={IdentificationIcon}
                  label="الرقم القومي"
                  value={user.users_national_id}
                />
                <InfoRow
                  icon={UserCircleIcon}
                  label="الدور"
                  value={cfg.label}
                />
                <InfoRow
                  icon={HashtagIcon}
                  label="معرف المستخدم"
                  value={String(user.users_id)}
                />
              </div>
            </div>
          ) : (
            <div className="p-5 space-y-3">
              {editError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  {editError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">
                    الاسم <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="users_name"
                    value={formData.users_name}
                    onChange={handleChange}
                    required
                    className={INPUT}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">
                    البريد الإلكتروني <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    name="users_email"
                    value={formData.users_email}
                    onChange={handleChange}
                    required
                    className={INPUT}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">
                    كلمة المرور{" "}
                    <span className="text-[10px] text-gray-400 font-normal">
                      (فارغة = بدون تغيير)
                    </span>
                  </label>
                  <input
                    type="password"
                    name="users_password"
                    value={formData.users_password}
                    onChange={handleChange}
                    className={INPUT}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">
                    الدور
                  </label>
                  <select
                    name="users_role"
                    value={formData.users_role}
                    onChange={handleChange}
                    className={SELECT}
                  >
                    <option value="admin">مدير</option>
                    <option value="rep">مسئول مبيعات</option>
                    <option value="store_keeper">أمين مخزن</option>
                    <option value="cash">كاش</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">
                    رقم الهاتف
                  </label>
                  <input
                    type="text"
                    name="users_phone"
                    value={formData.users_phone}
                    onChange={handleChange}
                    className={INPUT}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">
                    الرقم القومي
                  </label>
                  <input
                    type="text"
                    name="users_national_id"
                    value={formData.users_national_id}
                    onChange={handleChange}
                    className={INPUT}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500">
                  الحالة
                </label>
                <select
                  name="users_status"
                  value={formData.users_status}
                  onChange={handleChange}
                  className={SELECT}
                >
                  <option value={1}>نشط</option>
                  <option value={0}>غير نشط</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500">
                  صورة المستخدم
                </label>
                {previewImage && (
                  <div className="flex items-center gap-3 mb-1">
                    <img
                      src={previewImage}
                      alt="معاينة"
                      className="h-14 w-14 rounded-full object-cover ring-4 ring-indigo-100 shadow"
                    />
                    <span className="text-xs text-gray-500">
                      معاينة الصورة الجديدة
                    </span>
                  </div>
                )}
                <input
                  type="file"
                  name="users_image"
                  accept="image/*"
                  onChange={handleChange}
                  className="block w-full text-sm text-gray-500 file:ml-3 file:px-4 file:py-1.5 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-[#7A52C2] hover:file:bg-indigo-100"
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="p-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
          {mode === "view" ? (
            <>
              <button
                onClick={enterEditMode}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#8B5FD6] hover:bg-[#7A52C2] text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
              >
                <PencilSquareIcon className="w-4 h-4" />
                تعديل البيانات
              </button>
              {onDelete && user.users_role !== "admin" && (
                <button
                  onClick={() => {
                    onClose();
                    onDelete(user);
                  }}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-semibold transition-colors border border-red-200"
                  title="حذف المستخدم"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setMode("view")}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#8B5FD6] hover:bg-[#7A52C2] text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="w-4 h-4" /> جاري الحفظ...
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-4 h-4" /> حفظ التعديلات
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserDetailsModal;
