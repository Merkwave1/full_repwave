// src/components/dashboard/tabs/users/update/UpdateUserForm.jsx
import React, { useState, useEffect, useCallback } from "react";
import { getUserById, updateUser } from "../../../../../apis/users.js";
import Loader from "../../../../common/Loader/Loader.jsx";
import Alert from "../../../../common/Alert/Alert.jsx";
import { XMarkIcon, PencilSquareIcon } from "@heroicons/react/24/outline";

const INPUT =
  "w-full px-3 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-800 text-sm placeholder:text-gray-400 shadow-sm hover:border-[#C4A8F0] focus:border-[#8B5FD6] focus:ring-4 focus:ring-[#C4A8F0]/30 outline-none transition-all duration-200";
const SELECT = INPUT + " appearance-none pr-10";
const ChevronDown = () => (
  <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  </div>
);

function UpdateUserForm({
  isOpen,
  onClose,
  userId,
  setGlobalMessage,
  loadUserData,
  currentUsers,
}) {
  const [formData, setFormData] = useState({
    users_id: "",
    users_name: "",
    users_email: "",
    users_password: "",
    users_role: "rep",
    users_phone: "",
    users_national_id: "",
    users_status: 1,
    users_image: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [formMessage, setFormMessage] = useState("");
  const [formMessageType, setFormMessageType] = useState("info");

  const fetchUserData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError("");
    setFormMessage("");
    try {
      const userFromContext = currentUsers?.find(
        (u) => String(u.users_id) === String(userId),
      );
      const user = userFromContext ?? (await getUserById(userId));
      if (user) {
        setFormData({
          users_id: user.users_id || "",
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
      } else {
        setError(
          "\u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f.",
        );
      }
    } catch (err) {
      setError(
        "\u0641\u0634\u0644 \u062a\u062d\u0645\u064a\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645: " +
          (err.message || "\u062e\u0637\u0623"),
      );
    } finally {
      setLoading(false);
    }
  }, [userId, currentUsers]);

  useEffect(() => {
    if (isOpen && userId) fetchUserData();
  }, [isOpen, userId, fetchUserData]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === "file" && files?.[0]) {
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
        setFormData((prev) => ({ ...prev, [name]: reader.result }));
      };
      reader.readAsDataURL(file);
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormMessage("");
    setError("");
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
      const msg =
        (typeof result === "string" ? result : result?.message) ||
        "\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0628\u0646\u062c\u0627\u062d!";
      setFormMessage(msg);
      setFormMessageType("success");
      setGlobalMessage({ type: "success", message: msg });
      await loadUserData();
      setTimeout(onClose, 1200);
    } catch (err) {
      setFormMessage(
        err.message ||
          "\u0641\u0634\u0644 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645.",
      );
      setFormMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      dir="rtl"
    >
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-[6px]"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-[0_25px_60px_-10px_rgba(0,0,0,0.35)] flex flex-col max-h-[90vh] overflow-hidden animate-modal-in">
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0 rounded-t-2xl" style={{ background: "linear-gradient(135deg, #8B5FD6 0%, #7A52C2 100%)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <PencilSquareIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {
                  "\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645"
                }
              </h2>
              <p className="text-xs text-white/70">
                {formData.users_name ||
                  "\u062a\u062d\u062f\u064a\u062b \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062d\u0633\u0627\u0628"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
            aria-label="\u0625\u063a\u0644\u0627\u0642"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader />
              <p className="text-gray-500 text-sm">
                {
                  "\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a..."
                }
              </p>
            </div>
          ) : error && !formData.users_name ? (
            <div className="p-4">
              <Alert message={error} type="error" />
            </div>
          ) : (
            <form
              onSubmit={handleFormSubmit}
              id="update-user-form"
              className="space-y-4"
            >
              {formMessage && (
                <Alert
                  message={formMessage}
                  type={formMessageType}
                  onClose={() => setFormMessage("")}
                />
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-600">
                    {
                      "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645"
                    }{" "}
                    <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="users_name"
                    value={formData.users_name}
                    onChange={handleChange}
                    required
                    maxLength={100}
                    className={INPUT}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-600">
                    {
                      "\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a"
                    }{" "}
                    <span className="text-red-400">*</span>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-600">
                    {
                      "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631"
                    }{" "}
                    <span className="text-xs text-gray-400 font-normal">
                      (
                      {
                        "\u0641\u0627\u0631\u063a\u0629 = \u0628\u062f\u0648\u0646 \u062a\u063a\u064a\u064a\u0631"
                      }
                      )
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
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-600">
                    {"\u0627\u0644\u062f\u0648\u0631"}
                  </label>
                  <div className="relative">
                    <select
                      name="users_role"
                      value={formData.users_role}
                      onChange={handleChange}
                      className={SELECT}
                    >
                      <option value="admin">
                        {"\u0645\u062f\u064a\u0631"}
                      </option>
                      <option value="rep">
                        {
                          "\u0645\u0633\u0626\u0648\u0644 \u0645\u0628\u064a\u0639\u0627\u062a"
                        }
                      </option>
                      <option value="store_keeper">
                        {"\u0623\u0645\u064a\u0646 \u0645\u062e\u0632\u0646"}
                      </option>
                      <option value="cash">{"\u0643\u0627\u0634"}</option>
                    </select>
                    <ChevronDown />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-600">
                    {"\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062a\u0641"}
                  </label>
                  <input
                    type="text"
                    name="users_phone"
                    value={formData.users_phone}
                    onChange={handleChange}
                    className={INPUT}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-600">
                    {
                      "\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0642\u0648\u0645\u064a"
                    }
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

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-600">
                  {"\u0627\u0644\u062d\u0627\u0644\u0629"}
                </label>
                <div className="relative">
                  <select
                    name="users_status"
                    value={formData.users_status}
                    onChange={handleChange}
                    className={SELECT}
                  >
                    <option value={1}>{"\u0646\u0634\u0637"}</option>
                    <option value={0}>
                      {"\u063a\u064a\u0631 \u0646\u0634\u0637"}
                    </option>
                  </select>
                  <ChevronDown />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-600">
                  {
                    "\u0635\u0648\u0631\u0629 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645"
                  }
                </label>
                {(previewImage ||
                  (typeof formData.users_image === "string" &&
                    formData.users_image)) && (
                  <div className="flex items-center gap-3">
                    <img
                      src={previewImage || formData.users_image}
                      alt="preview"
                      className="h-16 w-16 rounded-full object-cover ring-4 ring-[#C4A8F0]/30 shadow"
                    />
                    <span className="text-xs text-gray-500">
                      {previewImage
                        ? "\u0645\u0639\u0627\u064a\u0646\u0629 \u0627\u0644\u0635\u0648\u0631\u0629 \u0627\u0644\u062c\u062f\u064a\u062f\u0629"
                        : "\u0627\u0644\u0635\u0648\u0631\u0629 \u0627\u0644\u062d\u0627\u0644\u064a\u0629"}
                    </span>
                  </div>
                )}
                <input
                  type="file"
                  name="users_image"
                  accept="image/*"
                  onChange={handleChange}
                  className="block w-full text-sm text-gray-500 file:ml-3 file:px-4 file:py-1.5 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#C4A8F0]/20 file:text-[#1A0F35] hover:file:bg-[#C4A8F0]/30"
                />
              </div>
            </form>
          )}
        </div>

        {!loading && (
          <div className="p-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {"\u0625\u0644\u063a\u0627\u0621"}
            </button>
            <button
              type="submit"
              form="update-user-form"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-[#8B5FD6] hover:bg-[#7A52C2] text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader className="w-4 h-4" />{" "}
                  {
                    "\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u062f\u064a\u062b..."
                  }
                </>
              ) : (
                "\u062d\u0641\u0638 \u0627\u0644\u062a\u0639\u062f\u064a\u0644\u0627\u062a"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default UpdateUserForm;
