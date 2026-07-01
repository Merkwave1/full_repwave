// src/components/common/DeleteConfirmationModal.js
import React from "react";
import { TrashIcon } from "@heroicons/react/24/outline";
import AppModalShell, { modalPrimaryBtnClass, modalSecondaryBtnClass } from "./AppModalShell.jsx";

function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  message,
  itemName,
  deleteLoading = false,
  errorMessage = "",
}) {
  const translatedError = (() => {
    if (!errorMessage) return "";
    const lower = errorMessage.toLowerCase();
    if (lower.includes("related records exist"))
      return "لا يمكن الحذف: توجد سجلات مرتبطة. احذف أو عدّل السجلات المرتبطة أولاً.";
    if (lower.includes("not found")) return "العنصر غير موجود";
    if (lower.includes("valid supplier id")) return "معرّف المورد غير صالح";
    return errorMessage;
  })();

  return (
    <AppModalShell
      open={isOpen}
      onClose={deleteLoading ? undefined : onClose}
      title="تأكيد الحذف"
      subtitle={itemName ? `حذف: ${itemName}` : undefined}
      icon={TrashIcon}
      icon={TrashIcon}
      size="sm"
      gradient="danger"
      zIndex="z-[9999]"
      portal
      closeOnBackdrop={!deleteLoading}
      bodyClassName="p-5 sm:p-6 overflow-y-auto flex-1 min-h-0 bg-white"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            disabled={deleteLoading}
            onClick={onClose}
            className={modalSecondaryBtnClass}
          >
            إلغاء
          </button>
          <button
            type="button"
            disabled={deleteLoading}
            onClick={onConfirm}
            className={`${modalPrimaryBtnClass} bg-red-600 hover:bg-red-700 flex items-center gap-2`}
          >
            {deleteLoading && (
              <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            حذف
          </button>
        </div>
      }
    >
      <p className="text-gray-700 text-center leading-relaxed">
        {message || `هل أنت متأكد أنك تريد حذف ${itemName || "هذا العنصر"}؟`}
      </p>
      {translatedError && (
        <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 text-center whitespace-pre-line">
          {translatedError}
        </div>
      )}
    </AppModalShell>
  );
}

export default DeleteConfirmationModal;
