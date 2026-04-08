// src/components/dashboard/tabs/clients-management/clients/details/ClientDocumentsModal.jsx
import React, { useEffect, useState } from 'react';
import SharedDetailModalBase from './SharedDetailModalBase.jsx';
import { getClientDocuments, deleteClientDocument, addClientDocument } from '../../../../../../apis/client_documents.js';
import { 
  DocumentTextIcon, 
  PhotoIcon, 
  DocumentIcon, 
  TrashIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  PlusIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline';

export default function ClientDocumentsModal({ client, open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [documents, setDocuments] = useState([]);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (!open || !client) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const resp = await getClientDocuments(client.clients_id);
        if (!cancelled) {
          const docs = Array.isArray(resp) ? resp : (resp?.data?.documents || resp?.documents || []);
          setDocuments(docs);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'فشل تحميل المستندات');
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
    if (!window.confirm(`هل أنت متأكد من حذف المستند "${doc.client_document_title}"؟`)) {
      return;
    }
    setDeleteLoading(true);
    try {
      await deleteClientDocument(doc.client_document_id);
      setDocuments(prev => prev.filter(d => d.client_document_id !== doc.client_document_id));
      alert('تم حذف المستند بنجاح');
    } catch (e) {
      alert('فشل حذف المستند: ' + (e.message || 'خطأ غير معروف'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAddDocument = async (formData) => {
    try {
      await addClientDocument(formData);
      // Refresh documents list
      const resp = await getClientDocuments(client.clients_id);
      const docs = Array.isArray(resp) ? resp : (resp?.data?.documents || resp?.documents || []);
      setDocuments(docs);
      setShowAddForm(false);
      alert('تم إضافة المستند بنجاح');
    } catch (e) {
      alert('فشل إضافة المستند: ' + (e.message || 'خطأ غير معروف'));
    }
  };

  const getFileIcon = (mimeType) => {
    if (!mimeType) return <DocumentIcon className="h-8 w-8" />;
    if (mimeType.startsWith('image/')) return <PhotoIcon className="h-8 w-8" />;
    return <DocumentTextIcon className="h-8 w-8" />;
  };

  const formatFileSize = (sizeKb) => {
    if (!sizeKb) return '—';
    if (sizeKb < 1024) return `${sizeKb} KB`;
    return `${(sizeKb / 1024).toFixed(2)} MB`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
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
            onClick={() => setShowAddForm(true)}
            className="no-print px-3 py-1.5 text-[11px] font-semibold rounded-md bg-green-600 hover:bg-green-700 text-white flex items-center gap-1"
          >
            <PlusIcon className="h-4 w-4" />
            إضافة مستند
          </button>
        }
      >
        {loading && <div className="text-indigo-600 font-semibold">تحميل المستندات...</div>}
        {error && <div className="text-red-600 font-semibold">{error}</div>}
        {!loading && !error && (
          <>
            <div className="p-2 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold flex justify-between">
              <span>إجمالي المستندات:</span>
              <span>{documents.length}</span>
            </div>
            {documents.length === 0 ? (
              <Empty />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {documents.map(doc => (
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

function DocumentCard({ doc, onDelete, getFileIcon, formatFileSize, formatDate, deleteLoading }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow bg-white">
      <div className="flex items-start justify-between mb-3">
        <div className="text-indigo-600">{getFileIcon(doc.client_document_file_mime_type)}</div>
        <div className="flex gap-1">
          {doc.client_document_file_path && (
            <>
              <a
                href={doc.client_document_file_path}
                download
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
        {doc.client_document_title || 'بدون عنوان'}
      </h4>

      <div className="space-y-1 text-xs text-gray-600">
        <div className="flex justify-between">
          <span className="font-semibold">النوع:</span>
          <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[10px] font-semibold">
            {doc.document_type_name || '—'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">الحجم:</span>
          <span>{formatFileSize(doc.client_document_file_size_kb)}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">تم الرفع:</span>
          <span className="text-[10px]">{formatDate(doc.client_document_created_at)}</span>
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
    title: '',
    type: '1', // Default document type ID
    notes: '',
    file: null
  });
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, file }));
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
      setFormData(prev => ({ ...prev, file }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert('الرجاء إدخال عنوان المستند');
      return;
    }
    
    if (!formData.file) {
      alert('الرجاء اختيار ملف');
      return;
    }

    setUploading(true);
    try {
      const data = new FormData();
      data.append('client_document_client_id', client.clients_id);
      data.append('client_document_type_id', formData.type);
      data.append('client_document_title', formData.title);
      data.append('client_document_notes', formData.notes);
      data.append('document_file', formData.file);

      await onSubmit(data);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <h3 className="text-lg font-bold text-gray-800">إضافة مستند جديد</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
            disabled={uploading}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              عنوان المستند <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              disabled={uploading}
            >
              <option value="1">عام</option>
              <option value="2">عقد</option>
              <option value="3">فاتورة</option>
              <option value="4">شهادة</option>
              <option value="5">أخرى</option>
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
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-300 hover:border-green-400 bg-gray-50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {formData.file ? (
                <div className="space-y-2">
                  <DocumentTextIcon className="h-12 w-12 mx-auto text-green-600" />
                  <p className="text-sm font-semibold text-gray-800">{formData.file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(formData.file.size)}</p>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, file: null }))}
                    className="text-sm text-red-600 hover:text-red-700 font-semibold"
                    disabled={uploading}
                  >
                    إزالة الملف
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <CloudArrowUpIcon className="h-12 w-12 mx-auto text-gray-400" />
                  <p className="text-sm text-gray-600">اسحب وأفلت الملف هنا أو</p>
                  <label className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer transition-colors">
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
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
              rows="3"
              placeholder="أدخل أي ملاحظات إضافية..."
              disabled={uploading}
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            disabled={uploading}
          >
            إلغاء
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={uploading || !formData.file || !formData.title.trim()}
            className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                جاري الرفع...
              </>
            ) : (
              <>
                <CloudArrowUpIcon className="h-5 w-5" />
                رفع المستند
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

const Empty = () => (
  <div className="text-center py-12 text-gray-500">
    <DocumentTextIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
    <p className="text-lg font-semibold">لا توجد مستندات</p>
    <p className="text-sm mt-2">لم يتم رفع أي مستندات لهذا العميل بعد</p>
  </div>
);
