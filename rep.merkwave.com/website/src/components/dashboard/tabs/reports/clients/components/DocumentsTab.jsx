import React from 'react';
import { 
  DocumentTextIcon, 
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

const DocumentsTab = ({ data, loading }) => {
  if (loading || !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const documents = data;

  return (
    <div className="space-y-6">
      {/* Documents Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-600 inline-block mb-3">
            <DocumentTextIcon className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold text-blue-600 mb-2">{documents.total_documents?.toLocaleString() || 0}</p>
          <p className="text-gray-600 text-sm">إجمالي المستندات</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="p-2 rounded-lg bg-green-100 text-green-600 inline-block mb-3">
            <UserGroupIcon className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold text-green-600 mb-2">{documents.clients_with_documents?.toLocaleString() || 0}</p>
          <p className="text-gray-600 text-sm">عملاء لديهم مستندات</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="p-2 rounded-lg bg-red-100 text-red-600 inline-block mb-3">
            <DocumentTextIcon className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold text-red-600 mb-2">{documents.clients_without_documents?.toLocaleString() || 0}</p>
          <p className="text-gray-600 text-sm">عملاء بدون مستندات</p>
        </div>
      </div>

      {/* Document Types Analysis */}
      {documents.document_types && documents.document_types.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center space-x-3 space-x-reverse mb-6">
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
              <ClipboardDocumentListIcon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">تحليل أنواع المستندات</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.document_types.map((type, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-900">{type.type_name}</span>
                  <span className="text-sm font-bold text-indigo-600">{type.count?.toLocaleString() || 0}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full" 
                    style={{width: `${type.percentage || 0}%`}}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">{type.percentage || 0}% من إجمالي المستندات</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Timeline */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 space-x-reverse mb-6">
          <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
            <CalendarDaysIcon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">الجدول الزمني للرفع</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-xl font-bold text-blue-600">{documents.today_uploads?.toLocaleString() || 0}</p>
            <p className="text-sm text-gray-600">اليوم</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-green-600">{documents.week_uploads?.toLocaleString() || 0}</p>
            <p className="text-sm text-gray-600">هذا الأسبوع</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-purple-600">{documents.month_uploads?.toLocaleString() || 0}</p>
            <p className="text-sm text-gray-600">هذا الشهر</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-orange-600">{documents.year_uploads?.toLocaleString() || 0}</p>
            <p className="text-sm text-gray-600">هذا العام</p>
          </div>
        </div>
      </div>

      {/* Document Coverage Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 space-x-reverse mb-6">
          <div className="p-2 rounded-lg bg-green-100 text-green-600">
            <DocumentTextIcon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">تغطية المستندات</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-xl font-bold text-green-600">{documents.clients_with_documents?.toLocaleString() || 0}</p>
            <p className="text-sm text-gray-600">عملاء لديهم مستندات</p>
            <p className="text-xs text-gray-500 mt-1">
              {documents.total_clients > 0 
                ? ((documents.clients_with_documents / documents.total_clients) * 100).toFixed(1)
                : 0
              }% من إجمالي العملاء
            </p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-xl font-bold text-red-600">{documents.clients_without_documents?.toLocaleString() || 0}</p>
            <p className="text-sm text-gray-600">عملاء بدون مستندات</p>
            <p className="text-xs text-gray-500 mt-1">
              {documents.total_clients > 0 
                ? ((documents.clients_without_documents / documents.total_clients) * 100).toFixed(1)
                : 0
              }% من إجمالي العملاء
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentsTab;
