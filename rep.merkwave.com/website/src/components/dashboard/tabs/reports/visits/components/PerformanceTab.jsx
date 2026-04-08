import React from 'react';
import { 
  TrophyIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import useCurrency from '../../../../../../hooks/useCurrency';
import { formatLocalDateTime } from '../../../../../../utils/dateUtils';

const PerformanceTab = ({ data }) => {
  const { symbol, formatCurrency: formatAppCurrency } = useCurrency();
  if (!data) {
    return (
      <div className="p-6 text-center text-gray-500">
        لا توجد بيانات أداء متاحة
      </div>
    );
  }

  const formatCurrency = (amount) => formatAppCurrency(amount ?? 0) || `${Number(amount ?? 0).toLocaleString()}`;

  const formatNumber = (value, { minimumFractionDigits, maximumFractionDigits } = {}) => {
    const numeric = Number(value ?? 0);
    if (!Number.isFinite(numeric)) {
      return '0';
    }
    return numeric.toLocaleString(undefined, {
      minimumFractionDigits,
      maximumFractionDigits
    });
  };

  const getPerformanceLevel = (rate) => {
    if (rate >= 90) return { level: 'ممتاز', color: 'green', icon: TrophyIcon };
    if (rate >= 80) return { level: 'جيد جداً', color: 'blue', icon: ArrowTrendingUpIcon };
    if (rate >= 70) return { level: 'جيد', color: 'yellow', icon: ChartBarIcon };
    if (rate >= 60) return { level: 'مقبول', color: 'orange', icon: ChartBarIcon };
    return { level: 'يحتاج تحسين', color: 'red', icon: ArrowTrendingDownIcon };
  };

  const completionRateLevel = getPerformanceLevel(data.completion_rate || 0);

  const kpis = [
    {
      title: 'إجمالي الزيارات',
  value: formatNumber(data.total_visits || 0),
      icon: DocumentTextIcon,
      color: 'blue',
      description: 'العدد الكلي للزيارات'
    },
    {
      title: 'الزيارات المكتملة',
  value: formatNumber(data.completed_visits || 0),
      icon: CheckCircleIcon,
      color: 'green',
      description: 'الزيارات المنجزة بنجاح'
    },
    {
      title: 'معدل الإنجاز',
      value: `${data.completion_rate || 0}%`,
      icon: TrophyIcon,
      color: completionRateLevel.color,
      description: completionRateLevel.level
    },
    {
      title: 'الزيارات الملغاة',
  value: formatNumber(data.cancelled_visits || 0),
      icon: XCircleIcon,
      color: 'red',
      description: 'الزيارات التي تم إلغاؤها'
    },
    {
      title: 'معدل الإلغاء',
      value: `${data.cancellation_rate || 0}%`,
      icon: XCircleIcon,
      color: data.cancellation_rate <= 10 ? 'green' : data.cancellation_rate <= 20 ? 'yellow' : 'red',
      description: data.cancellation_rate <= 10 ? 'ممتاز' : data.cancellation_rate <= 20 ? 'مقبول' : 'يحتاج تحسين'
    },
    {
      title: 'الطلبات من الزيارات',
  value: formatNumber(data.total_orders_from_visits || 0),
      icon: DocumentTextIcon,
      color: 'purple',
      description: 'طلبات تم إنشاؤها خلال الزيارات'
    },
    {
      title: 'المبيعات من الزيارات',
  value: formatCurrency(data.total_revenue_from_visits || 0),
      icon: CurrencyDollarIcon,
      color: 'green',
      description: 'إجمالي قيمة المبيعات'
    },
    {
      title: 'المدفوعات من الزيارات',
  value: formatCurrency(data.total_payment_amount_from_visits || 0),
      icon: CurrencyDollarIcon,
      color: 'yellow',
      description: 'إجمالي المبالغ المحصلة'
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-600 border-blue-200',
      green: 'bg-green-50 text-green-600 border-green-200',
      yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
      red: 'bg-red-50 text-red-600 border-red-200',
      purple: 'bg-purple-50 text-purple-600 border-purple-200',
      orange: 'bg-orange-50 text-orange-600 border-orange-200'
    };
    return colors[color] || colors.blue;
  };

  // Calculate efficiency metrics
  const orderConversionRate = data.total_visits > 0 
    ? ((data.total_orders_from_visits || 0) / data.total_visits * 100).toFixed(1)
    : 0;

  const paymentConversionRate = data.total_visits > 0 
    ? ((data.total_payments_from_visits || 0) / data.total_visits * 100).toFixed(1)
    : 0;

  const revenuePerVisit = data.total_visits > 0 
    ? (data.total_revenue_from_visits || 0) / data.total_visits
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">أداء الزيارات</h2>
        <div className="text-sm text-gray-500">
          آخر تحديث: {formatLocalDateTime(new Date())}
        </div>
      </div>

      {/* Performance Overview */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <TrophyIcon className="h-6 w-6 text-yellow-500 ml-2" />
          نظرة عامة على الأداء
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className={`text-4xl font-bold mb-2 ${
              data.completion_rate >= 80 ? 'text-green-600' :
              data.completion_rate >= 60 ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {data.completion_rate || 0}%
            </div>
            <div className="text-sm text-gray-600">معدل الإنجاز</div>
            <div className={`text-xs mt-1 px-2 py-1 rounded-full ${
              data.completion_rate >= 80 ? 'bg-green-100 text-green-700' :
              data.completion_rate >= 60 ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {completionRateLevel.level}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {orderConversionRate}%
            </div>
            <div className="text-sm text-gray-600">معدل تحويل الطلبات</div>
            <div className={`text-xs mt-1 px-2 py-1 rounded-full ${
              orderConversionRate >= 20 ? 'bg-green-100 text-green-700' :
              orderConversionRate >= 10 ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {orderConversionRate >= 20 ? 'ممتاز' : orderConversionRate >= 10 ? 'جيد' : 'يحتاج تحسين'}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-4xl font-bold text-purple-600 mb-2">
              {formatCurrency(revenuePerVisit)}
            </div>
            <div className="text-sm text-gray-600">متوسط الإيراد لكل زيارة</div>
            <div className="text-xs mt-1 px-2 py-1 rounded-full bg-purple-100 text-purple-700">
              {symbol}
            </div>
          </div>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <div
              key={index}
              className={`
                border rounded-lg p-6 transition-all duration-200 hover:shadow-md
                ${getColorClasses(kpi.color)}
              `}
            >
              <div className="flex items-center justify-between mb-3">
                <Icon className="h-8 w-8" />
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {kpi.value}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-1">{kpi.title}</h3>
                <p className="text-xs opacity-75">{kpi.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Conversion Metrics */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">معدلات التحويل</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <DocumentTextIcon className="h-6 w-6 text-blue-600" />
              <span className="text-2xl font-bold text-blue-900">{orderConversionRate}%</span>
            </div>
            <h4 className="font-medium text-blue-800">معدل تحويل الطلبات</h4>
            <p className="text-sm text-blue-600 mt-1">
              {data.total_orders_from_visits || 0} طلب من {data.total_visits || 0} زيارة
            </p>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
              <span className="text-2xl font-bold text-green-900">{paymentConversionRate}%</span>
            </div>
            <h4 className="font-medium text-green-800">معدل تحصيل المدفوعات</h4>
            <p className="text-sm text-green-600 mt-1">
              {data.total_payments_from_visits || 0} دفعة من {data.total_visits || 0} زيارة
            </p>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <ChartBarIcon className="h-6 w-6 text-purple-600" />
              <span className="text-2xl font-bold text-purple-900">
                {formatCurrency(revenuePerVisit)}
              </span>
            </div>
            <h4 className="font-medium text-purple-800">متوسط الإيراد/زيارة</h4>
            <p className="text-sm text-purple-600 mt-1">
              {symbol} لكل زيارة
            </p>
          </div>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">تحليل الأداء</h3>
        <div className="space-y-4">
          {/* Completion Rate Analysis */}
          <div className="flex items-start space-x-4 space-x-reverse">
            <div className={`p-2 rounded-full ${
              data.completion_rate >= 80 ? 'bg-green-100' :
              data.completion_rate >= 60 ? 'bg-yellow-100' :
              'bg-red-100'
            }`}>
              {data.completion_rate >= 80 ? 
                <CheckCircleIcon className="h-5 w-5 text-green-600" /> :
                data.completion_rate >= 60 ?
                <ChartBarIcon className="h-5 w-5 text-yellow-600" /> :
                <XCircleIcon className="h-5 w-5 text-red-600" />
              }
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">معدل إنجاز الزيارات</h4>
              <p className="text-sm text-gray-600 mt-1">
                {data.completion_rate >= 80 ? 
                  'أداء ممتاز! معدل الإنجاز مرتفع جداً.' :
                  data.completion_rate >= 60 ?
                  'أداء جيد، يمكن تحسينه للوصول لمعدل أعلى.' :
                  'يحتاج تحسين كبير في معدل إنجاز الزيارات.'
                }
              </p>
            </div>
          </div>

          {/* Order Conversion Analysis */}
          <div className="flex items-start space-x-4 space-x-reverse">
            <div className={`p-2 rounded-full ${
              orderConversionRate >= 20 ? 'bg-green-100' :
              orderConversionRate >= 10 ? 'bg-yellow-100' :
              'bg-red-100'
            }`}>
              <DocumentTextIcon className={`h-5 w-5 ${
                orderConversionRate >= 20 ? 'text-green-600' :
                orderConversionRate >= 10 ? 'text-yellow-600' :
                'text-red-600'
              }`} />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">فعالية تحويل الطلبات</h4>
              <p className="text-sm text-gray-600 mt-1">
                {orderConversionRate >= 20 ? 
                  'ممتاز! معدل تحويل الزيارات إلى طلبات عالي.' :
                  orderConversionRate >= 10 ?
                  'جيد، يمكن تحسين استراتيجية المبيعات أثناء الزيارات.' :
                  'يحتاج تطوير مهارات المبيعات وتحسين عملية التحويل.'
                }
              </p>
            </div>
          </div>

          {/* Payment Collection Analysis */}
          <div className="flex items-start space-x-4 space-x-reverse">
            <div className={`p-2 rounded-full ${
              paymentConversionRate >= 15 ? 'bg-green-100' :
              paymentConversionRate >= 8 ? 'bg-yellow-100' :
              'bg-red-100'
            }`}>
              <CurrencyDollarIcon className={`h-5 w-5 ${
                paymentConversionRate >= 15 ? 'text-green-600' :
                paymentConversionRate >= 8 ? 'text-yellow-600' :
                'text-red-600'
              }`} />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">كفاءة تحصيل المدفوعات</h4>
              <p className="text-sm text-gray-600 mt-1">
                {paymentConversionRate >= 15 ? 
                  'ممتاز! كفاءة عالية في تحصيل المدفوعات أثناء الزيارات.' :
                  paymentConversionRate >= 8 ?
                  'جيد، يمكن تحسين عملية تحصيل المدفوعات.' :
                  'يحتاج تركيز أكبر على تحصيل المدفوعات المستحقة.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceTab;
