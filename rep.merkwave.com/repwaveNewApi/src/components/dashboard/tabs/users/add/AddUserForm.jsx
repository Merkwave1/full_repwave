// src/components/dashboard/tabs/users/add/AddUserForm.jsx
import React, { useState, useEffect } from "react";
import Loader from "../../../../common/Loader/Loader.jsx";
import Alert from "../../../../common/Alert/Alert.jsx";
import { addUser } from "../../../../../apis/users.js";
import { XMarkIcon, UserPlusIcon } from "@heroicons/react/24/outline";

const INPUT =
  "w-full px-3 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-800 text-sm placeholder:text-gray-400 shadow-sm hover:border-gray-300 focus:border-[#5BC7F2] focus:ring-4 focus:ring-[#5BC7F2]/25 outline-none transition-all duration-200";
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

function AddUserForm({
  isOpen,
  onClose,
  setGlobalMessage,
  loadUserData,
  userLimit,
  currentUsers,
}) {
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState("rep");
  const [userPhone, setUserPhone] = useState("");
  const [userNationalId, setUserNationalId] = useState("");
  const [userStatus, setUserStatus] = useState("1");
  const [userImagePreview, setUserImagePreview] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [formMessageType, setFormMessageType] = useState("info");

  const isUserLimitReached =
    userLimit !== null && (currentUsers?.length ?? 0) >= userLimit;

  useEffect(() => {
    if (isOpen) {
      setUserName("");
      setUserEmail("");
      setUserPassword("");
      setUserRole("rep");
      setUserPhone("");
      setUserNationalId("");
      setUserStatus("1");
      setUserImagePreview("");
      setFormMessage("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setUserImagePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setUserImagePreview("");
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (isUserLimitReached) {
      setFormMessage(
        "\u0644\u0642\u062f \u0648\u0635\u0644\u062a \u0625\u0644\u0649 \u0627\u0644\u062d\u062f \u0627\u0644\u0623\u0642\u0635\u0649 \u0644\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u064a\u0646.",
      );
      setFormMessageType("error");
      return;
    }
    setFormLoading(true);
    setFormMessage("");
    try {
      const payload = {
        users_name: userName,
        users_email: userEmail,
        users_password: userPassword,
        users_role: userRole === "sales_rep" ? "rep" : userRole,
        users_phone: userPhone,
        users_national_id: userNationalId,
        users_status: userStatus === "1" || userStatus === 1,
      };
      if (userImagePreview) payload.users_image = userImagePreview;
      const result = await addUser(payload);
      const msg =
        (typeof result === "string" ? result : result?.message) ||
        "\u062a\u0645 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0628\u0646\u062c\u0627\u062d!";
      setFormMessage(msg);
      setFormMessageType("success");
      setGlobalMessage({ message: msg, type: "success" });
      loadUserData();
      setTimeout(onClose, 1200);
    } catch (err) {
      setFormMessage(
        err.message ||
          "\u062d\u062f\u062b \u062e\u0637\u0623 \u0623\u062b\u0646\u0627\u0621 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645.",
      );
      setFormMessageType("error");
    } finally {
      setFormLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" dir="rtl">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-l from-[#8B5FD6] to-[#F97366] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <UserPlusIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {
                  "\u0625\u0636\u0627\u0641\u0629 \u0645\u0633\u062a\u062e\u062f\u0645 \u062c\u062f\u064a\u062f"
                }
              </h2>
              <p className="text-xs text-white/70">
                {
                  "\u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628 \u0648\u062a\u0639\u064a\u064a\u0646 \u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0627\u062a"
                }
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
            aria-label={"\u0625\u063a\u0644\u0627\u0642"}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isUserLimitReached && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {
                "\u0644\u0642\u062f \u0648\u0635\u0644\u062a \u0627\u0644\u062d\u062f \u0627\u0644\u0623\u0642\u0635\u0649 \u0645\u0646 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u064a\u0646"
              }{" "}
              ({currentUsers?.length} / {userLimit}).
            </div>
          )}
          {formMessage && (
            <Alert
              message={formMessage}
              type={formMessageType}
              onClose={() => setFormMessage("")}
            />
          )}

          <form
            onSubmit={handleFormSubmit}
            id="add-user-form"
            className="space-y-4"
          >
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
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder={
                    "\u0623\u062f\u062e\u0644 \u0627\u0644\u0627\u0633\u0645"
                  }
                  required
                  disabled={formLoading}
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
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="example@domain.com"
                  required
                  disabled={formLoading}
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
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  placeholder="&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;"
                  required
                  disabled={formLoading}
                  className={INPUT}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-600">
                  {"\u0627\u0644\u062f\u0648\u0631"}
                </label>
                <div className="relative">
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value)}
                    required
                    disabled={formLoading}
                    className={SELECT}
                  >
                    <option value="admin">{"\u0645\u062f\u064a\u0631"}</option>
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
                  {"\u0627\u0644\u0647\u0627\u062a\u0641"}
                </label>
                <input
                  type="tel"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  placeholder="01X XXXX XXXX"
                  disabled={formLoading}
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
                  value={userNationalId}
                  onChange={(e) => setUserNationalId(e.target.value)}
                  placeholder="30XXXXXXXXXXXXXX"
                  disabled={formLoading}
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
                  value={userStatus}
                  onChange={(e) => setUserStatus(e.target.value)}
                  required
                  disabled={formLoading}
                  className={SELECT}
                >
                  <option value="1">{"\u0646\u0634\u0637"}</option>
                  <option value="0">
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
              {userImagePreview && (
                <div className="flex items-center gap-3">
                  <img
                    src={userImagePreview}
                    alt={"\u0645\u0639\u0627\u064a\u0646\u0629"}
                    className="h-16 w-16 rounded-full object-cover ring-4 ring-[#C4A8F0]/30 shadow"
                  />
                  <span className="text-xs text-gray-500">
                    {
                      "\u0645\u0639\u0627\u064a\u0646\u0629 \u0627\u0644\u0635\u0648\u0631\u0629"
                    }
                  </span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                disabled={formLoading}
                className="block w-full text-sm text-gray-500 file:ml-3 file:px-4 file:py-1.5 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#C4A8F0]/20 file:text-[#1A0F35] hover:file:bg-[#C4A8F0]/30"
              />
            </div>
          </form>
        </div>

        <div className="p-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={formLoading}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {"\u0625\u0644\u063a\u0627\u0621"}
          </button>
          <button
            type="submit"
            form="add-user-form"
            disabled={formLoading || isUserLimitReached}
            className="flex-1 py-2.5 rounded-xl bg-[#8B5FD6] hover:bg-[#7A52C2] text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {formLoading ? (
              <>
                <Loader className="w-4 h-4" />{" "}
                {"\u062c\u0627\u0631\u064a \u0627\u0644\u062d\u0641\u0638..."}
              </>
            ) : (
              "\u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddUserForm;
