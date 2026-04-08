import React from 'react';
import { 
  UserGroupIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import Loader from '../../../../../common/Loader/Loader.jsx';

const OverviewTab = ({ data, loading, error }) => {
  if (loading) {
    return (
      <div className="p-6">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-gray-500">
        لا توجد بيانات متاحة
      </div>
    );
  }

  const stats = [
    {
      title: 'إجمالي المندوبين',
      value: data.total_representatives || 0,
      icon: UserGroupIcon,
      color: 'blue',
      description: 'العدد الكلي للمندوبين'
    },
    {
      title: 'المندوبين النشطين اليوم',
      value: data.active_today || 0,
      icon: CheckCircleIcon,
      color: 'green',
      description: 'عدد المندوبين الذين سجلوا حضور اليوم'
    },
    {
      title: 'إجمالي ساعات العمل',
      value: data.total_work_hours ? `${Math.round(data.total_work_hours)} ساعة` : '0 ساعة',
      icon: ClockIcon,
      color: 'purple',
      description: 'مجموع ساعات العمل للشهر الحالي'
    },
    {
      title: 'متوسط ساعات العمل',
      value: data.avg_work_hours ? `${Math.round(data.avg_work_hours)} ساعة` : '0 ساعة',
      icon: ArrowTrendingUpIcon,
      color: 'indigo',
      description: 'متوسط ساعات العمل اليومية'
    },
    {
      title: 'أيام العمل هذا الشهر',
      value: data.total_work_days || 0,
      icon: CalendarDaysIcon,
      color: 'teal',
      description: 'عدد أيام العمل المسجلة'
    },
    {
      title: 'إجمالي الزيارات',
      value: data.total_visits || 0,
      icon: MapPinIcon,
      color: 'orange',
      description: 'مجموع الزيارات لجميع المندوبين'
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: {
        bg: 'bg-blue-100',
        icon: 'text-blue-600',
        border: 'border-blue-200'
      },
      green: {
        bg: 'bg-green-100',
        icon: 'text-green-600',
        border: 'border-green-200'
      },
      purple: {
        bg: 'bg-purple-100',
        icon: 'text-purple-600',
        border: 'border-purple-200'
      },
      indigo: {
        bg: 'bg-indigo-100',
        icon: 'text-indigo-600',
        border: 'border-indigo-200'
      },
      teal: {
        bg: 'bg-teal-100',
        icon: 'text-teal-600',
        border: 'border-teal-200'
      },
      orange: {
        bg: 'bg-orange-100',
        icon: 'text-orange-600',
        border: 'border-orange-200'
      }
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">نظرة عامة على المندوبين</h2>
        <p className="text-sm text-gray-600">إحصائيات عامة لحضور وأداء المندوبين</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const colors = getColorClasses(stat.color);
          
          return (
            <div 
              key={index}
              className={`bg-white rounded-lg shadow-sm border ${colors.border} p-6 hover:shadow-md transition-shadow duration-200`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${colors.bg}`}>
                  <Icon className={`h-6 w-6 ${colors.icon}`} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Additional Info Section */}
      <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">معلومات إضافية</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border-r border-gray-200 pr-4">
            <p className="text-sm text-gray-600">معدل الحضور</p>
            <p className="text-2xl font-bold text-green-600">
              {data.attendance_rate ? `${Math.round(data.attendance_rate)}%` : '0%'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">متوسط الزيارات لكل مندوب</p>
            <p className="text-2xl font-bold text-blue-600">
              {data.avg_visits_per_rep ? Math.round(data.avg_visits_per_rep) : 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
