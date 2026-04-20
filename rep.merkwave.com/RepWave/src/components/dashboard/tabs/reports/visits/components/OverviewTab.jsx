import React from 'react';
import { 
  MapPinIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  PlayCircleIcon,
  CalendarDaysIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';

const OverviewTab = ({ data }) => {
  if (!data) {
    return (
      <div className="p-6 text-center text-gray-500">
        لا توجد بيانات متاحة
      </div>
    );
  }

  const stats = [
    {
      title: 'إجمالي الزيارات',
      value: data.total_visits || 0,
      icon: MapPinIcon,
      color: 'blue',
      description: 'العدد الكلي للزيارات'
    },
    {
      title: 'زيارات مكتملة',
      value: data.completed_visits || 0,
      icon: CheckCircleIcon,
      color: 'green',
      description: 'الزيارات المنجزة بنجاح'
    },
    {
      title: 'زيارات جارية',
      value: data.started_visits || 0,
      icon: PlayCircleIcon,
      color: 'yellow',
      description: 'الزيارات الجارية حالياً'
    },
    {
      title: 'زيارات ملغاة',
      value: data.cancelled_visits || 0,
      icon: XCircleIcon,
      color: 'red',
      description: 'الزيارات الملغاة'
    },
    {
      title: 'زيارات اليوم',
      value: data.today_visits || 0,
      icon: CalendarDaysIcon,
      color: 'purple',
      description: 'عدد زيارات اليوم'
    },
    {
      title: 'زيارات هذا الأسبوع',
      value: data.this_week_visits || 0,
      icon: ArrowTrendingUpIcon,
      color: 'indigo',
      description: 'زيارات الأسبوع الحالي'
    },
    {
      title: 'زيارات هذا الشهر',
      value: data.this_month_visits || 0,
      icon: MapPinIcon,
      color: 'teal',
      description: 'زيارات الشهر الحالي'
    },
    {
      title: 'متوسط مدة الزيارة',
      value: data.avg_visit_duration_minutes ? `${Math.round(data.avg_visit_duration_minutes)} دقيقة` : 'غير محدد',
      icon: ClockIcon,
      color: 'orange',
      description: 'المتوسط الزمني للزيارة'
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-600 border-blue-200',
      green: 'bg-green-50 text-green-600 border-green-200',
      yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
      red: 'bg-red-50 text-red-600 border-red-200',
      purple: 'bg-purple-50 text-purple-600 border-purple-200',
      indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
      teal: 'bg-teal-50 text-teal-600 border-teal-200',
      orange: 'bg-orange-50 text-orange-600 border-orange-200'
    };
    return colors[color] || colors.blue;
  };

  const completionRate = data.total_visits > 0 
    ? ((data.completed_visits / data.total_visits) * 100).toFixed(1)
    : 0;

  const cancellationRate = data.total_visits > 0 
    ? ((data.cancelled_visits / data.total_visits) * 100).toFixed(1)
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">نظرة عامة على الزيارات</h2>
        <div className="text-sm text-gray-500">
          آخر تحديث: {new Date().toLocaleString('ar-EG')}
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">مؤشرات الأداء الرئيسية</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">معدل الإنجاز</p>
                <p className="text-2xl font-bold text-green-900">{completionRate}%</p>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-800">معدل الإلغاء</p>
                <p className="text-2xl font-bold text-red-900">{cancellationRate}%</p>
              </div>
              <XCircleIcon className="h-8 w-8 text-red-600" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">متوسط المدة</p>
                <p className="text-2xl font-bold text-blue-900">
                  {data.avg_visit_duration_minutes ? `${Math.round(data.avg_visit_duration_minutes)}د` : 'غ/م'}
                </p>
              </div>
              <ClockIcon className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className={`
                border rounded-lg p-6 transition-all duration-200 hover:shadow-md
                ${getColorClasses(stat.color)}
              `}
            >
              <div className="flex items-center justify-between mb-3">
                <Icon className="h-8 w-8" />
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {typeof stat.value === 'number' ? stat.value.toLocaleString('ar-EG') : stat.value}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-1">{stat.title}</h3>
                <p className="text-xs opacity-75">{stat.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">ملخص سريع</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {data.total_visits || 0}
            </div>
            <div className="text-sm text-gray-600">إجمالي الزيارات</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {completionRate}%
            </div>
            <div className="text-sm text-gray-600">معدل النجاح</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {data.today_visits || 0}
            </div>
            <div className="text-sm text-gray-600">زيارات اليوم</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
