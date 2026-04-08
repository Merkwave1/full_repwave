// src/hooks/useErrorHandler.js
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../utils/errorTranslations.js';

/**
 * Hook لمعالجة الأخطاء وعرضها بالعربية
 * @returns {Object} - دالات معالجة الأخطاء
 */
export function useErrorHandler() {
  /**
   * معالجة وعرض رسالة خطأ
   * @param {Error|string} error - كائن الخطأ أو رسالة الخطأ
   * @param {Object} options - خيارات إضافية
   */
  const handleError = useCallback((error, options = {}) => {
    const {
      showToast = true,
      logToConsole = true,
      customMessage = null,
      duration = 4000,
      position = 'top-center'
    } = options;

    // الحصول على رسالة الخطأ المترجمة
    const errorMessage = customMessage || getErrorMessage(error);

    // طباعة الخطأ في console
    if (logToConsole) {
      console.error('خطأ:', error);
    }

    // عرض رسالة toast
    if (showToast) {
      toast.error(errorMessage, {
        duration,
        position,
        style: {
          direction: 'rtl',
          textAlign: 'right',
          fontFamily: 'Cairo, sans-serif'
        }
      });
    }

    return errorMessage;
  }, []);

  /**
   * معالجة خطأ API
   * @param {Error} error - خطأ من API
   */
  const handleApiError = useCallback((error) => {
    return handleError(error, {
      showToast: true,
      logToConsole: true
    });
  }, [handleError]);

  /**
   * معالجة خطأ التحقق من البيانات
   * @param {string} message - رسالة الخطأ
   */
  const handleValidationError = useCallback((message) => {
    return handleError(message, {
      showToast: true,
      logToConsole: false,
      duration: 3000
    });
  }, [handleError]);

  /**
   * عرض رسالة نجاح
   * @param {string} message - رسالة النجاح
   * @param {Object} options - خيارات إضافية
   */
  const showSuccess = useCallback((message, options = {}) => {
    const {
      duration = 3000,
      position = 'top-center'
    } = options;

    toast.success(message, {
      duration,
      position,
      style: {
        direction: 'rtl',
        textAlign: 'right',
        fontFamily: 'Cairo, sans-serif'
      }
    });
  }, []);

  /**
   * عرض رسالة معلومات
   * @param {string} message - رسالة المعلومات
   * @param {Object} options - خيارات إضافية
   */
  const showInfo = useCallback((message, options = {}) => {
    const {
      duration = 3000,
      position = 'top-center'
    } = options;

    toast(message, {
      duration,
      position,
      icon: 'ℹ️',
      style: {
        direction: 'rtl',
        textAlign: 'right',
        fontFamily: 'Cairo, sans-serif'
      }
    });
  }, []);

  /**
   * عرض رسالة تحذير
   * @param {string} message - رسالة التحذير
   * @param {Object} options - خيارات إضافية
   */
  const showWarning = useCallback((message, options = {}) => {
    const {
      duration = 4000,
      position = 'top-center'
    } = options;

    toast(message, {
      duration,
      position,
      icon: '⚠️',
      style: {
        direction: 'rtl',
        textAlign: 'right',
        fontFamily: 'Cairo, sans-serif',
        backgroundColor: '#FEF3C7',
        color: '#92400E'
      }
    });
  }, []);

  return {
    handleError,
    handleApiError,
    handleValidationError,
    showSuccess,
    showInfo,
    showWarning
  };
}

export default useErrorHandler;
