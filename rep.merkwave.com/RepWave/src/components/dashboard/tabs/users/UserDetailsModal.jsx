// src/components/dashboard/tabs/users/UserDetailsModal.js
import React from "react";
import Modal from "../../../common/Modal/Modal";

const roleLabels = {
  admin: { label: "مدير", color: "bg-purple-100 text-purple-700" },
  rep: { label: "مسئول مبيعات", color: "bg-blue-100 text-blue-700" },
  sales_rep: { label: "مسئول مبيعات", color: "bg-blue-100 text-blue-700" },
  store_keeper: { label: "أمين مخزن", color: "bg-amber-100 text-amber-700" },
  cash: { label: "كاش", color: "bg-green-100 text-green-700" },
};

function Field({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0 gap-4">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide shrink-0">
        {label}
      </span>
      <span className="text-sm text-gray-800 font-medium text-left">
        {value || "—"}
      </span>
    </div>
  );
}

function UserDetailsModal({ isOpen, onClose, user }) {
  if (!isOpen || !user) return null;

  const roleInfo = roleLabels[user.users_role] || {
    label: user.users_role,
    color: "bg-gray-100 text-gray-700",
  };
  const initials = user.users_name
    ? user.users_name
        .trim()
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تفاصيل المستخدم"
      size="small"
    >
      <div className="flex flex-col items-center gap-4 pb-2" dir="rtl">
        {/* Avatar */}
        <div className="relative">
          {user.users_image ? (
            <img
              src={user.users_image}
              alt={user.users_name}
              className="w-24 h-24 object-cover rounded-full shadow-lg ring-4 ring-[#5BC7F2]/25"
              onError={(e) =>
                (e.target.src =
                  "https://placehold.co/96x96/cccccc/ffffff?text=No")
              }
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#5BC7F2] to-[#02415A] flex items-center justify-center shadow-lg ring-4 ring-[#5BC7F2]/25">
              <span className="text-2xl font-bold text-white">{initials}</span>
            </div>
          )}
          {/* Active status dot */}
          <span
            className={`absolute bottom-1 left-1 w-4 h-4 rounded-full border-2 border-white shadow ${
              user.users_status === 1 ? "bg-emerald-400" : "bg-gray-300"
            }`}
          />
        </div>

        {/* Name + email */}
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900">{user.users_name}</p>
          <p className="text-sm text-gray-500 mt-0.5">
            {user.users_email || "لا يوجد بريد إلكتروني"}
          </p>
          <span
            className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${roleInfo.color}`}
          >
            {roleInfo.label}
          </span>
        </div>

        {/* Info rows */}
        <div className="w-full bg-gray-50 rounded-xl px-4 py-1 mt-1">
          <Field label="الهاتف" value={user.users_phone} />
          <Field label="الرقم القومي" value={user.users_national_id} />
          <Field
            label="الحالة"
            value={user.users_status === 1 ? "✓ نشط" : "✗ غير نشط"}
          />
          <Field label="معرف المستخدم" value={`#${user.users_id}`} />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-[#02415A] text-white text-sm font-semibold hover:bg-[#025f84] transition-colors shadow-sm mt-1"
        >
          إغلاق
        </button>
      </div>
    </Modal>
  );
}

export default UserDetailsModal;
