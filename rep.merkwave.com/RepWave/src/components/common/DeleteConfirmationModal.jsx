// src/components/common/DeleteConfirmationModal.js
import React from "react";
import { createPortal } from "react-dom";

function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  message,
  itemName,
  deleteLoading = false,
  errorMessage = "",
}) {
  if (!isOpen) return null;
  // Basic normalization of known English backend messages to Arabic
  const translatedError = (() => {
    if (!errorMessage) return "";
    const lower = errorMessage.toLowerCase();
    if (lower.includes("related records exist"))
      return "لا يمكن حذف المورد: توجد سجلات مرتبطة (أوامر شراء / فواتير / حركات). احذف أو عدل السجلات المرتبطة أولاً.";
    if (lower.includes("not found")) return "العنصر غير موجود";
    if (lower.includes("valid supplier id")) return "معرّف المورد غير صالح";
    return errorMessage; // fallback original (could already be Arabic)
  })();
  const modal = (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-[9999] p-3 sm:p-6 overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-xl max-w-sm w-full mx-2 sm:mx-4 max-h-[95vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">
          تأكيد الحذف
        </h3>
        <p className="text-gray-700 mb-6 text-center">
          {message || `هل أنت متأكد أنك تريد حذف ${itemName || "هذا العنصر"}؟`}
        </p>
        {translatedError && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2 text-center whitespace-pre-line">
            {translatedError}
          </div>
        )}
        <div className="flex justify-center space-x-4 space-x-reverse">
          <button
            disabled={deleteLoading}
            onClick={onClose}
            className={`px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out ${deleteLoading ? "text-gray-400 cursor-not-allowed" : "text-gray-700 hover:bg-gray-50"}`}
          >
            إلغاء
          </button>
          <button
            disabled={deleteLoading}
            onClick={onConfirm}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition duration-150 ease-in-out flex items-center gap-2 ${deleteLoading ? "bg-red-400 cursor-wait" : "bg-red-600 hover:bg-red-700"}`}
          >
            {deleteLoading && (
              <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}{" "}
            حذف
          </button>
        </div>
      </div>
    </div>
  );
  return createPortal(modal, document.body);
}

export default DeleteConfirmationModal;
