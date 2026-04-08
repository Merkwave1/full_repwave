// src/components/dashboard/tabs/safe-management/safe-reports/SafeReportsTab.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  ChartBarIcon,
  DocumentArrowDownIcon,
  CalendarIcon,
  FunnelIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';

import Loader from '../../../../common/Loader/Loader';
import Alert from '../../../../common/Alert/Alert';
import { getSafes } from '../../../../../apis/safes';
import useCurrency from '../../../../../hooks/useCurrency';

export default function SafeReportsTab() {
  const { setGlobalMessage, setChildRefreshHandler } = useOutletContext();
  const { symbol } = useCurrency();
  const [safes, setSafes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedSafe, setSelectedSafe] = useState('');

  const loadSafes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getSafes();
      setSafes(response.safes || []);
    } catch (e) {
      setError(e.message || 'Error loading safes');
      setGlobalMessage({ type: 'error', message: 'فشل في تحميل بيانات الخزائن.' });
    } finally {
      setLoading(false);
    }
  }, [setGlobalMessage]);

  useEffect(() => {
    loadSafes();
  }, [loadSafes]);

  useEffect(() => {
    setChildRefreshHandler(() => loadSafes);
    return () => setChildRefreshHandler(null);
  }, [setChildRefreshHandler, loadSafes]);

  const formatCurrency = (amount) => {
    if (!amount) return '0.00';
    return parseFloat(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const calculateTotalBalance = () => {
    return safes.reduce((total, safe) => total + parseFloat(safe.safes_balance || 0), 0);
  };

  if (loading) return <Loader className="mt-8" />;
  if (error) return <Alert message={error} type="error" className="mb-4" />;

  return (
    <div className="p-6" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
        <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <ChartBarIcon className="h-8 w-8 text-indigo-600" />
          تقارير الخزائن
        </h3>
        <div className="flex-none">
          <button 
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md shadow-md flex items-center gap-2"
          >
            <DocumentArrowDownIcon className="h-5 w-5" />
            تصدير التقرير
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
          <FunnelIcon className="h-5 w-5 text-blue-600" />
          خيارات التقرير
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="periodFilter" className="block text-sm font-medium text-gray-700 mb-1">
              الفترة الزمنية
            </label>
            <select
              id="periodFilter"
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              dir="rtl"
            >
              <option value="today">اليوم</option>
              <option value="week">هذا الأسبوع</option>
              <option value="month">هذا الشهر</option>
              <option value="quarter">هذا الربع</option>
              <option value="year">هذا العام</option>
            </select>
          </div>
          <div>
            <label htmlFor="safeFilter" className="block text-sm font-medium text-gray-700 mb-1">
              الخزنة
            </label>
            <select
              id="safeFilter"
              value={selectedSafe}
              onChange={e => setSelectedSafe(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              dir="rtl"
            >
              <option value="">كل الخزائن</option>
              {safes.map(safe => (
                <option key={safe.safes_id} value={safe.safes_id}>
                  {safe.safes_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-gradient-to-r from-green-100 to-green-50 p-6 rounded-xl border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">إجمالي الأرصدة</p>
              <p className="text-2xl font-bold text-green-800">
                {formatCurrency(calculateTotalBalance())} {symbol}
              </p>
            </div>
            <BanknotesIcon className="h-12 w-12 text-green-600" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-100 to-blue-50 p-6 rounded-xl border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">إجمالي الإيرادات</p>
              <p className="text-2xl font-bold text-blue-800">0.00 {symbol}</p>
            </div>
            <ArrowTrendingUpIcon className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-100 to-red-50 p-6 rounded-xl border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-600 text-sm font-medium">إجمالي المصروفات</p>
              <p className="text-2xl font-bold text-red-800">0.00 {symbol}</p>
            </div>
            <ArrowTrendingDownIcon className="h-12 w-12 text-red-600" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-100 to-purple-50 p-6 rounded-xl border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-sm font-medium">عدد المعاملات</p>
              <p className="text-2xl font-bold text-purple-800">0</p>
            </div>
            <CalendarIcon className="h-12 w-12 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">توزيع الأرصدة حسب الخزنة</h4>
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <ChartBarIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p>الرسم البياني قيد التطوير</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">اتجاه المعاملات</h4>
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <ArrowTrendingUpIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p>الرسم البياني قيد التطوير</p>
            </div>
          </div>
        </div>
      </div>

      {/* Safes Summary Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-gray-800">ملخص الخزائن</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200" dir="rtl">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  اسم الخزنة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  النوع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الرصيد الحالي
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  عدد المعاملات
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  آخر معاملة
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {safes.map((safe) => (
                <tr key={safe.safes_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {safe.safes_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      safe.safes_type === 'company' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {safe.safes_type === 'company' ? 'خزنة الشركة' : 'خزنة مندوب'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`font-bold ${
                      parseFloat(safe.safes_balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(safe.safes_balance || 0)} {symbol}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    0
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    لا توجد معاملات
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
