// src/examples/ErrorHandlingExample.jsx
// مثال توضيحي لاستخدام نظام معالجة الأخطاء

import React, { useState } from 'react';
import { useErrorHandler } from '../hooks/useErrorHandler.js';
import { translateError } from '../utils/errorTranslations.js';

/**
 * مكون تجريبي يوضح كيفية استخدام نظام معالجة الأخطاء
 */
function ErrorHandlingExample() {
  const { 
    handleError, 
    handleApiError, 
    handleValidationError, 
    showSuccess, 
    showInfo, 
    showWarning 
  } = useErrorHandler();

  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });

  // مثال 1: محاكاة خطأ API
  const simulateApiError = async () => {
    try {
      // محاكاة استدعاء API يفشل
      throw new Error('Failed to fetch');
    } catch (error) {
      // سيعرض: "فشل الاتصال بالخادم. تحقق من اتصال الإنترنت."
      handleApiError(error);
    }
  };

  // مثال 2: محاكاة خطأ HTTP
  const simulateHttpError = async () => {
    try {
      throw new Error('HTTP 404: Not Found');
    } catch (error) {
      // سيعرض: "غير موجود."
      handleApiError(error);
    }
  };

  // مثال 3: محاكاة خطأ انتهاء الجلسة
  const simulateSessionError = async () => {
    try {
      throw new Error('Session expired');
    } catch (error) {
      // سيعرض: "انتهت الجلسة. الرجاء تسجيل الدخول مرة أخرى."
      handleApiError(error);
    }
  };

  // مثال 4: التحقق من النموذج
  const validateForm = () => {
    if (!formData.name) {
      handleValidationError('الاسم مطلوب');
      return false;
    }
    
    if (!formData.email) {
      handleValidationError('البريد الإلكتروني مطلوب');
      return false;
    }
    
    if (!formData.email.includes('@')) {
      handleValidationError('البريد الإلكتروني غير صالح');
      return false;
    }
    
    return true;
  };

  // مثال 5: عملية ناجحة
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      showSuccess('تم حفظ البيانات بنجاح');
      setFormData({ name: '', email: '' });
    }
  };

  // مثال 6: رسالة معلومات
  const showInformation = () => {
    showInfo('هذه رسالة معلوماتية للمستخدم');
  };

  // مثال 7: رسالة تحذير
  const showWarningMessage = () => {
    showWarning('تحذير: هذا الإجراء لا يمكن التراجع عنه');
  };

  // مثال 8: خطأ مخصص
  const customError = () => {
    handleError(new Error('Some English error'), {
      customMessage: 'رسالة خطأ مخصصة بالعربية',
      duration: 5000
    });
  };

  // مثال 9: استخدام translateError مباشرة
  const directTranslation = () => {
    const errors = [
      'Network error',
      'Timeout',
      'Unauthorized',
      'Invalid input',
      'Database error'
    ];
    
    console.log('--- أمثلة الترجمة المباشرة ---');
    errors.forEach(error => {
      const translated = translateError(error);
      console.log(`${error} → ${translated}`);
    });
    
    showInfo('تم طباعة الترجمات في Console');
  };

  return (
    <div className="p-8 max-w-4xl mx-auto" dir="rtl">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        أمثلة نظام معالجة الأخطاء
      </h1>

      <div className="bg-blue-50 border-r-4 border-blue-500 p-4 mb-6">
        <p className="text-blue-900">
          هذه الصفحة توضح كيفية استخدام نظام معالجة الأخطاء الجديد.
          جرب الأزرار أدناه لرؤية رسائل الأخطاء المترجمة.
        </p>
      </div>

      {/* قسم أمثلة أخطاء API */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">
          أمثلة أخطاء API
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={simulateApiError}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            خطأ شبكة
          </button>
          <button
            onClick={simulateHttpError}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            خطأ HTTP 404
          </button>
          <button
            onClick={simulateSessionError}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            انتهاء الجلسة
          </button>
        </div>
      </div>

      {/* قسم النموذج */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">
          مثال التحقق من النموذج
        </h2>
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">الاسم</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="أدخل الاسم"
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">البريد الإلكتروني</label>
            <input
              type="text"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="أدخل البريد الإلكتروني"
            />
          </div>
          <button
            type="submit"
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            حفظ
          </button>
        </form>
      </div>

      {/* قسم الرسائل الأخرى */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">
          أنواع الرسائل الأخرى
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={showInformation}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            رسالة معلومات
          </button>
          <button
            onClick={showWarningMessage}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            رسالة تحذير
          </button>
          <button
            onClick={customError}
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            خطأ مخصص
          </button>
        </div>
      </div>

      {/* قسم الترجمة المباشرة */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">
          أدوات إضافية
        </h2>
        <button
          onClick={directTranslation}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          عرض أمثلة الترجمة في Console
        </button>
      </div>

      {/* معلومات الاستخدام */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-xl font-semibold mb-3 text-gray-700">
          كيفية الاستخدام في الكود
        </h3>
        <pre className="bg-gray-800 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{`import { useErrorHandler } from '../hooks/useErrorHandler';

function MyComponent() {
  const { handleApiError, showSuccess } = useErrorHandler();
  
  const fetchData = async () => {
    try {
      const data = await getSomeData();
      showSuccess('تم تحميل البيانات بنجاح');
    } catch (error) {
      handleApiError(error);
    }
  };
}`}
        </pre>
      </div>
    </div>
  );
}

export default ErrorHandlingExample;
