// src/components/dashboard/tabs/clients-management/clients/details/ClientDocumentsModal.jsx
import React, { useEffect, useState } from "react";
import SharedDetailModalBase from "./SharedDetailModalBase.jsx";
import AppModalShell, {
  modalPrimaryBtnClass,
  modalSecondaryBtnClass,
  modalSectionClass,
  modalInputClass,
} from "../../../../../common/AppModalShell.jsx";
import {
  getClientDocuments,
  deleteClientDocument,
  addClientDocument,
  getClientDocumentTypes,
} from "../../../../../../apis/client_documents.js";
import {
  DocumentTextIcon,
  PhotoIcon,
  DocumentIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  PlusIcon,
  CloudArrowUpIcon,
} from "@heroicons/react/24/outline";

export default function ClientDocumentsModal({ client, open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [documents, setDocuments] = useState([]);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (!open || !client) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const resp = await getClientDocuments(client.clients_id);
        if (!cancelled) {
          const raw = Array.isArray(resp)
            ? resp
            : resp?.data?.documents || resp?.documents || [];
          setDocuments(raw.map(normalizeDocument));
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || "فشل تحميل المستندات");
          setDocuments([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, client]);

  const handleDelete = async (doc) => {
    if (
      !window.confirm(
        `هل أنت متأكد من حذف المستند "${doc.client_document_title}"؟`,
      )
    ) {
      return;
    }
    setDeleteLoading(true);
    try {
      await deleteClientDocument(doc.client_document_id);
      setDocuments((prev) =>
        prev.filter((d) => d.client_document_id !== doc.client_document_id),
      );
      alert("تم حذف المستند بنجاح");
    } catch (e) {
      alert("فشل حذف المستند: " + (e.message || "خطأ غير معروف"));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAddDocument = async (formData) => {
    await addClientDocument(formData);
    const resp = await getClientDocuments(client.clients_id);
    const raw = Array.isArray(resp)
      ? resp
      : resp?.data?.documents || resp?.documents || [];
    setDocuments(raw.map(normalizeDocument));
    setShowAddForm(false);
    alert("تم إضافة المستند بنجاح");
  };

  const getFileIcon = (mimeType) => {
    if (!mimeType) return <DocumentIcon className="h-8 w-8" />;
    if (mimeType.startsWith("image/")) return <PhotoIcon className="h-8 w-8" />;
    return <DocumentTextIcon className="h-8 w-8" />;
  };

  const formatFileSize = (sizeKb) => {
    if (!sizeKb) return "—";
    if (sizeKb < 1024) return `${sizeKb} KB`;
    return `${(sizeKb / 1024).toFixed(2)} MB`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <SharedDetailModalBase
        title="مستندات العميل"
        client={client}
        open={open}
        onClose={onClose}
        customHeaderButton={
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="no-print px-3 py-1.5 text-[11px] font-semibold rounded-md bg-green-600 hover:bg-green-700 text-white flex items-center gap-1"
          >
            <PlusIcon className="h-4 w-4" />
            إضافة مستند
          </button>
        }
      >
        {loading && (
          <div className="text-[#8B5FD6] font-semibold">
            تحميل المستندات...
          </div>
        )}
        {error && <div className="text-red-600 font-semibold">{error}</div>}
        {!loading && !error && (
          <>
            <div className="p-2 rounded-md bg-[#f5f3ff] text-[#7A52C2] text-xs font-bold flex justify-between">
              <span>إجمالي المستندات:</span>
              <span>{documents.length}</span>
            </div>
            {documents.length === 0 ? (
              <Empty onAdd={() => setShowAddForm(true)} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {documents.map((doc) => (
                  <DocumentCard
                    key={doc.client_document_id}
                    doc={doc}
                    onDelete={handleDelete}
                    getFileIcon={getFileIcon}
                    formatFileSize={formatFileSize}
                    formatDate={formatDate}
                    deleteLoading={deleteLoading}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </SharedDetailModalBase>

      {/* Add Document Form Modal */}
      {showAddForm && (
        <AddDocumentFormModal
          client={client}
          onClose={() => setShowAddForm(false)}
          onSubmit={handleAddDocument}
        />
      )}
    </>
  );
}

function DocumentCard({
  doc,
  onDelete,
  getFileIcon,
  formatFileSize,
  formatDate,
  deleteLoading,
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow bg-white">
      <div className="flex items-start justify-between mb-3">
        <div className="text-[#8B5FD6]">
          {getFileIcon(doc.client_document_file_mime_type)}
        </div>
        <div className="flex gap-1">
          {doc.client_document_file_path && (
            <>
              <a
                href={resolveDocumentFileUrl(doc.client_document_file_path)}
                download
                target="_blank"
                rel="noreferrer"
                className="p-1.5 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                title="تحميل"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
              </a>
              <button
                onClick={() => onDelete(doc)}
                disabled={deleteLoading}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50"
                title="حذف"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      <h4 className="font-bold text-sm text-gray-800 mb-2 line-clamp-2">
        {doc.client_document_title || "بدون عنوان"}
      </h4>

      <div className="space-y-1 text-xs text-gray-600">
        <div className="flex justify-between">
          <span className="font-semibold">النوع:</span>
          <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[10px] font-semibold">
            {doc.document_type_name || "—"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">الحجم:</span>
          <span>{formatFileSize(doc.client_document_file_size_kb)}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">تم الرفع:</span>
          <span className="text-[10px]">
            {formatDate(doc.client_document_created_at)}
          </span>
        </div>
        {doc.uploaded_by_user_name && (
          <div className="flex justify-between">
            <span className="font-semibold">بواسطة:</span>
            <span>{doc.uploaded_by_user_name}</span>
          </div>
        )}
        {doc.client_document_notes && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <p className="text-[10px] text-gray-500 italic line-clamp-2">
              {doc.client_document_notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function AddDocumentFormModal({ client, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    title: "",
    type: "",
    notes: "",
    file: null,
  });
  const [documentTypes, setDocumentTypes] = useState([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const types = await getClientDocumentTypes();
        if (!cancelled) {
          const list = Array.isArray(types) ? types : [];
          setDocumentTypes(list);
          if (list.length > 0) {
            setFormData((prev) => ({
              ...prev,
              type: String(list[0].document_type_id ?? list[0].documentTypeId ?? ""),
            }));
          }
        }
      } catch {
        if (!cancelled) setDocumentTypes([]);
      } finally {
        if (!cancelled) setTypesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, file }));
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, file }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    if (!formData.title.trim()) {
      setSubmitError("الرجاء إدخال عنوان المستند");
      return;
    }

    if (!formData.file) {
      setSubmitError("الرجاء اختيار ملف");
      return;
    }

    setUploading(true);
    try {
      const clientId =
        client?.clients_id ?? client?.clientsId ?? client?.client_id;
      if (!clientId) {
        setSubmitError("معرّف العميل غير متوفر");
        return;
      }

      const data = new FormData();
      data.append("client_id", String(clientId));
      data.append("client_document_client_id", String(clientId));
      data.append("client_document_type_id", formData.type);
      data.append("client_document_title", formData.title);
      data.append("client_document_notes", formData.notes);
      data.append("document_file", formData.file);

      await onSubmit(data);
    } catch (error) {
      setSubmitError(error.message || "فشل رفع المستند");
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 KB";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  return (
    <AppModalShell
      open
      onClose={onClose}
      title="إضافة مستند جديد"
      subtitle={client?.clients_company_name}
      icon={CloudArrowUpIcon}
      size="2xl"
      zIndex="z-[60]"
      closeOnBackdrop={!uploading}
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className={modalSecondaryBtnClass}
            disabled={uploading}
          >
            إلغاء
          </button>
          <button
            type="submit"
            form="add-document-form"
            disabled={uploading || !formData.file || !formData.title.trim()}
            className={modalPrimaryBtnClass}
          >
            {uploading ? "جاري الرفع..." : "رفع المستند"}
          </button>
        </div>
      }
    >
        <form id="add-document-form" onSubmit={handleSubmit} className="space-y-4">
          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {submitError}
            </div>
          )}

          <div className={`${modalSectionClass} p-4 space-y-4`}>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              عنوان المستند <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              className={modalInputClass}
              placeholder="أدخل عنوان المستند..."
              disabled={uploading}
              required
            />
          </div>

          {/* Document Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              نوع المستند
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, type: e.target.value }))
              }
              className={modalInputClass}
              disabled={uploading || typesLoading}
            >
              {typesLoading && <option value="">جاري التحميل...</option>}
              {!typesLoading && documentTypes.length === 0 && (
                <option value="">عام</option>
              )}
              {documentTypes.map((t) => {
                const id = t.document_type_id ?? t.documentTypeId;
                const name = t.document_type_name ?? t.documentTypeName ?? "—";
                return (
                  <option key={id} value={String(id)}>
                    {name}
                  </option>
                );
              })}
            </select>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              الملف <span className="text-red-500">*</span>
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive
                  ? "border-[#8B5FD6] bg-[#EDE7FF]/30"
                  : "border-[#EDE7FF] hover:border-[#8B5FD6]/50 bg-[#FAFAFE]"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {formData.file ? (
                <div className="space-y-2">
                  <DocumentTextIcon className="h-12 w-12 mx-auto text-[#8B5FD6]" />
                  <p className="text-sm font-semibold text-gray-800">
                    {formData.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(formData.file.size)}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, file: null }))
                    }
                    className="text-sm text-red-600 hover:text-red-700 font-semibold"
                    disabled={uploading}
                  >
                    إزالة الملف
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <CloudArrowUpIcon className="h-12 w-12 mx-auto text-gray-400" />
                  <p className="text-sm text-gray-600">
                    اسحب وأفلت الملف هنا أو
                  </p>
                  <label className={`inline-block px-4 py-2 ${modalPrimaryBtnClass} cursor-pointer`}>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={uploading}
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    />
                    اختر ملف
                  </label>
                  <p className="text-xs text-gray-500 mt-2">
                    الصور، PDF، Word، Excel، أو ملفات نصية (حتى 10 MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              ملاحظات
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
              rows="3"
              placeholder="أدخل أي ملاحظات إضافية..."
              disabled={uploading}
            />
          </div>
          </div>
        </form>
    </AppModalShell>
  );
}

const Empty = ({ onAdd }) => (
  <div className="text-center py-12 text-gray-500">
    <DocumentTextIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
    <p className="text-lg font-semibold">لا توجد مستندات</p>
    <p className="text-sm mt-2">لم يتم رفع أي مستندات لهذا العميل بعد</p>
    {onAdd && (
      <button
        type="button"
        onClick={onAdd}
        className={`mt-4 inline-flex items-center gap-2 ${modalPrimaryBtnClass}`}
      >
        <PlusIcon className="h-4 w-4" />
        إضافة أول مستند
      </button>
    )}
  </div>
);

function resolveDocumentFileUrl(path) {
  if (!path) return "#";
  if (path.startsWith("http") || path.startsWith("data:")) return path;
  return path.startsWith("/") ? path : `/${path}`;
}

function normalizeDocument(doc) {
  return {
    ...doc,
    client_document_id: doc.client_document_id ?? doc.clientDocumentId,
    client_document_title: doc.client_document_title ?? doc.clientDocumentTitle,
    document_type_name: doc.document_type_name ?? doc.documentTypeName,
    client_document_file_path: doc.client_document_file_path ?? doc.clientDocumentFilePath,
    client_document_file_mime_type:
      doc.client_document_file_mime_type ?? doc.clientDocumentFileMimeType,
    client_document_file_size_kb:
      doc.client_document_file_size_kb ?? doc.clientDocumentFileSizeKb,
    client_document_created_at:
      doc.client_document_created_at ?? doc.clientDocumentCreatedAt,
    uploaded_by_user_name: doc.uploaded_by_user_name ?? doc.uploadedByUserName,
    client_document_notes: doc.client_document_notes ?? doc.clientDocumentNotes,
  };
}
