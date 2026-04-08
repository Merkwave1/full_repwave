// src/utils/errorTranslations.js
// ملف لترجمة رسائل الأخطاء من الإنجليزية إلى العربية

/**
 * قاموس ترجمة رسائل الأخطاء الشائعة
 */
const errorTranslations = {
  // Network errors
  'Failed to fetch': 'فشل الاتصال بالخادم. تحقق من اتصال الإنترنت.',
  'Network request failed': 'فشل طلب الشبكة. تحقق من اتصال الإنترنت.',
  'Network error': 'خطأ في الشبكة. تحقق من اتصال الإنترنت.',
  'Connection timeout': 'انتهت مهلة الاتصال. حاول مرة أخرى.',
  'Request timeout': 'انتهت مهلة الطلب. حاول مرة أخرى.',
  'Timeout': 'انتهت المهلة. حاول مرة أخرى.',
  
  // Authentication & Authorization errors
  'Unauthorized': 'غير مصرح. الرجاء تسجيل الدخول مرة أخرى.',
  'Not authorized': 'غير مصرح لك بهذا الإجراء.',
  'You are not authorized': 'أنت غير مصرح لك بهذا الإجراء.',
  'Invalid session': 'جلسة غير صالحة. الرجاء تسجيل الدخول مرة أخرى.',
  'Session expired': 'انتهت الجلسة. الرجاء تسجيل الدخول مرة أخرى.',
  'Please login again': 'الرجاء تسجيل الدخول مرة أخرى.',
  'Authentication error': 'خطأ في المصادقة. الرجاء تسجيل الدخول مرة أخرى.',
  'Invalid credentials': 'بيانات الاعتماد غير صحيحة.',
  'Invalid token': 'رمز غير صالح. الرجاء تسجيل الدخول مرة أخرى.',
  'Token expired': 'انتهت صلاحية الرمز. الرجاء تسجيل الدخول مرة أخرى.',
  
  // HTTP Status errors
  'HTTP 400': 'طلب غير صالح.',
  'HTTP 401': 'غير مصرح. الرجاء تسجيل الدخول.',
  'HTTP 403': 'محظور. ليس لديك صلاحية الوصول.',
  'HTTP 404': 'المورد غير موجود.',
  'HTTP 500': 'خطأ في الخادم. حاول مرة أخرى لاحقاً.',
  'HTTP 502': 'بوابة سيئة. الخادم غير متاح مؤقتاً.',
  'HTTP 503': 'الخدمة غير متاحة. حاول مرة أخرى لاحقاً.',
  'HTTP 504': 'انتهت مهلة البوابة.',
  
  // Common operation errors
  'Not found': 'غير موجود.',
  'Already exists': 'موجود بالفعل.',
  'Validation error': 'خطأ في التحقق من البيانات.',
  'Invalid input': 'مدخلات غير صالحة.',
  'Required field': 'حقل مطلوب.',
  'Invalid format': 'تنسيق غير صالح.',
  'Invalid email': 'البريد الإلكتروني غير صالح.',
  'Invalid phone': 'رقم الهاتف غير صالح.',
  'Invalid date': 'التاريخ غير صالح.',
  'Invalid number': 'رقم غير صالح.',
  
  // Database errors
  'Database error': 'خطأ في قاعدة البيانات.',
  'Connection error': 'خطأ في الاتصال بقاعدة البيانات.',
  'Query error': 'خطأ في استعلام قاعدة البيانات.',
  'Duplicate entry': 'هذا السجل موجود بالفعل.',
  'Foreign key constraint': 'لا يمكن الحذف. هذا السجل مرتبط ببيانات أخرى.',
  'Cannot delete or update a parent row': 'لا يمكن الحذف. هذا السجل مرتبط ببيانات أخرى.',
  'a foreign key constraint fails': 'لا يمكن الحذف. هذا السجل مرتبط ببيانات أخرى.',
  'Internal Error': 'خطأ داخلي في النظام.',
  'SQL syntax error': 'خطأ في صيغة الاستعلام.',
  'Table does not exist': 'الجدول غير موجود.',
  'Column not found': 'العمود غير موجود.',
  'Data too long': 'البيانات طويلة جداً.',
  'Out of range value': 'القيمة خارج النطاق المسموح.',
  
  // File upload errors
  'File too large': 'الملف كبير جداً.',
  'Invalid file type': 'نوع الملف غير صالح.',
  'Upload failed': 'فشل رفع الملف.',
  'File not found': 'الملف غير موجود.',
  
  // Generic errors
  'Error': 'حدث خطأ.',
  'Unknown error': 'خطأ غير معروف.',
  'Something went wrong': 'حدث خطأ ما.',
  'An error occurred': 'حدث خطأ.',
  'Operation failed': 'فشلت العملية.',
  'Request failed': 'فشل الطلب.',
  'Bad request': 'طلب غير صالح.',
  'Internal server error': 'خطأ داخلي في الخادم.',
  'Service unavailable': 'الخدمة غير متاحة حالياً.',
  
  // Specific business errors
  'Insufficient stock': 'المخزون غير كافٍ.',
  'Insufficient balance': 'الرصيد غير كافٍ.',
  'Invalid quantity': 'الكمية غير صالحة.',
  'Invalid price': 'السعر غير صالح.',
  'Invalid discount': 'الخصم غير صالح.',
  'Payment failed': 'فشلت عملية الدفع.',
  'Transaction failed': 'فشلت المعاملة.',
};

/**
 * أنماط regex لمطابقة رسائل الأخطاء الديناميكية
 */
const errorPatterns = [
  // Database Foreign Key Constraints - must be first for priority matching
  {
    pattern: /foreign key constraint fails.*?`(\w+)`.*?CONSTRAINT.*?FOREIGN KEY.*?REFERENCES\s+`(\w+)`/i,
    translate: (match) => {
      const tableName = match[2]; // الجدول المرتبط
      const tableTranslations = {
        'payments': 'المدفوعات',
        'sales_orders': 'أوامر البيع',
        'sales_invoices': 'فواتير البيع',
        'sales_returns': 'مرتجعات المبيعات',
        'client_cash': 'الحسابات النقدية',
        'visits': 'الزيارات',
        'visit_plans': 'خطط الزيارات',
        'inventory': 'المخزون',
        'transfers': 'التحويلات',
        'warehouse_records': 'سجلات المخازن',
        'products': 'المنتجات',
        'clients': 'العملاء',
        'suppliers': 'الموردين',
        'users': 'المستخدمين'
      };
      const arabicTable = tableTranslations[tableName] || tableName;
      return `لا يمكن الحذف. هذا السجل مرتبط ببيانات في جدول ${arabicTable}. يجب حذف البيانات المرتبطة أولاً.`;
    }
  },
  {
    pattern: /Cannot delete or update a parent row.*?foreign key constraint/i,
    translate: () => 'لا يمكن الحذف. هذا السجل مرتبط ببيانات أخرى في النظام. يجب حذف البيانات المرتبطة أولاً.'
  },
  {
    pattern: /Internal Error:.*?foreign key constraint/i,
    translate: () => 'لا يمكن الحذف. هذا السجل مرتبط ببيانات أخرى.'
  },
  {
    pattern: /Duplicate entry '([^']+)' for key/i,
    translate: (match) => {
      return `القيمة "${match[1]}" موجودة بالفعل. الرجاء استخدام قيمة أخرى.`;
    }
  },
  {
    pattern: /HTTP (\d+):/i,
    translate: (match) => {
      const status = match[1];
      const statusMessages = {
        '400': 'طلب غير صالح',
        '401': 'غير مصرح',
        '403': 'محظور',
        '404': 'غير موجود',
        '500': 'خطأ في الخادم',
        '502': 'بوابة سيئة',
        '503': 'الخدمة غير متاحة',
        '504': 'انتهت مهلة البوابة'
      };
      return statusMessages[status] || `خطأ HTTP ${status}`;
    }
  },
  {
    pattern: /failed to fetch/i,
    translate: () => 'فشل الاتصال بالخادم. تحقق من اتصال الإنترنت.'
  },
  {
    pattern: /network/i,
    translate: () => 'خطأ في الشبكة. تحقق من اتصال الإنترنت.'
  },
  {
    pattern: /timeout/i,
    translate: () => 'انتهت المهلة. حاول مرة أخرى.'
  },
  {
    pattern: /(unauthorized|not authorized)/i,
    translate: () => 'غير مصرح. الرجاء تسجيل الدخول مرة أخرى.'
  },
  {
    pattern: /(session expired|invalid session)/i,
    translate: () => 'انتهت الجلسة. الرجاء تسجيل الدخول مرة أخرى.'
  },
  {
    pattern: /not found/i,
    translate: () => 'غير موجود.'
  },
  {
    pattern: /already exists/i,
    translate: () => 'موجود بالفعل.'
  },
  {
    pattern: /validation error/i,
    translate: () => 'خطأ في التحقق من البيانات.'
  },
  {
    pattern: /invalid/i,
    translate: () => 'بيانات غير صالحة.'
  },
  {
    pattern: /required/i,
    translate: () => 'حقل مطلوب.'
  }
];

/**
 * ترجمة رسالة الخطأ من الإنجليزية إلى العربية
 * @param {string} errorMessage - رسالة الخطأ بالإنجليزية
 * @returns {string} - رسالة الخطأ بالعربية
 */
export function translateError(errorMessage) {
  if (!errorMessage || typeof errorMessage !== 'string') {
    return 'حدث خطأ غير معروف.';
  }

  // تنظيف الرسالة
  const cleanMessage = errorMessage.trim();
  
  // إذا كانت الرسالة بالفعل بالعربية، قم بإرجاعها كما هي
  if (/[\u0600-\u06FF]/.test(cleanMessage)) {
    return cleanMessage;
  }

  // البحث عن ترجمة مباشرة
  const directTranslation = errorTranslations[cleanMessage];
  if (directTranslation) {
    return directTranslation;
  }

  // البحث عن ترجمة غير حساسة لحالة الأحرف
  const lowerMessage = cleanMessage.toLowerCase();
  const caseInsensitiveMatch = Object.keys(errorTranslations).find(
    key => key.toLowerCase() === lowerMessage
  );
  if (caseInsensitiveMatch) {
    return errorTranslations[caseInsensitiveMatch];
  }

  // البحث عن تطابق جزئي
  const partialMatch = Object.keys(errorTranslations).find(
    key => cleanMessage.toLowerCase().includes(key.toLowerCase())
  );
  if (partialMatch) {
    return errorTranslations[partialMatch];
  }

  // البحث باستخدام أنماط regex
  for (const { pattern, translate } of errorPatterns) {
    const match = cleanMessage.match(pattern);
    if (match) {
      return translate(match);
    }
  }

  // إذا لم يتم العثور على ترجمة، أرجع رسالة عامة
  return `حدث خطأ: ${cleanMessage}`;
}

/**
 * ترجمة كائن الخطأ بالكامل
 * @param {Error} error - كائن الخطأ
 * @returns {Error} - كائن خطأ جديد برسالة عربية
 */
export function translateErrorObject(error) {
  if (!error) {
    const translatedError = new Error('حدث خطأ غير معروف.');
    return translatedError;
  }

  const translatedMessage = translateError(error.message);
  const translatedError = new Error(translatedMessage);
  
  // الحفاظ على stack trace الأصلي
  if (error.stack) {
    translatedError.stack = error.stack;
  }
  
  // نسخ أي خصائص إضافية
  Object.keys(error).forEach(key => {
    if (key !== 'message' && key !== 'stack') {
      translatedError[key] = error[key];
    }
  });
  
  return translatedError;
}

/**
 * دالة مساعدة لعرض رسالة خطأ مترجمة
 * @param {Error|string} error - كائن الخطأ أو رسالة الخطأ
 * @returns {string} - رسالة الخطأ المترجمة
 */
export function getErrorMessage(error) {
  if (typeof error === 'string') {
    return translateError(error);
  }
  
  if (error && error.message) {
    return translateError(error.message);
  }
  
  return 'حدث خطأ غير معروف.';
}

export default {
  translateError,
  translateErrorObject,
  getErrorMessage
};
