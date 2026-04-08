import React, { useState } from 'react';
import { 
  ClockIcon, 
  DocumentTextIcon,
  CurrencyDollarIcon,
  PhotoIcon,
  ChatBubbleLeftRightIcon,
  PlayCircleIcon,
  StopCircleIcon,
  UserIcon,
  BuildingOfficeIcon,
  TagIcon
} from '@heroicons/react/24/outline';

const ActivitiesTab = ({ data }) => {
  const [activityTypeFilter, setActivityTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  if (!data || !Array.isArray(data)) {
    return (
      <div className="p-6 text-center text-gray-500">
        لا توجد أنشطة زيارات متاحة
      </div>
    );
  }

  // Get unique activity types for filter
  const activityTypes = [...new Set(data.map(activity => activity.activity_type))];

  // Filter activities
  const filteredActivities = data.filter(activity => {
    const matchesType = activityTypeFilter === 'all' || activity.activity_type === activityTypeFilter;
    const matchesSearch = !searchTerm || 
      activity.clients_company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.rep_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.activity_description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesType && matchesSearch;
  });

  const getActivityIcon = (activityType) => {
    const iconMap = {
      'SalesOrder_Created': DocumentTextIcon,
      'SalesInvoice_Created': DocumentTextIcon,
      'Payment_Collected': CurrencyDollarIcon,
      'Return_Initiated': DocumentTextIcon,
      'Document_Uploaded': DocumentTextIcon,
      'Photo_Before': PhotoIcon,
      'Photo_After': PhotoIcon,
      'Client_Note_Added': ChatBubbleLeftRightIcon,
      'Customer_Support': ChatBubbleLeftRightIcon,
      'Visit_Started': PlayCircleIcon,
      'Visit_Ended': StopCircleIcon,
      'Inventory_Check': DocumentTextIcon,
      'Product_Demo': TagIcon
    };
    
    return iconMap[activityType] || ChatBubbleLeftRightIcon;
  };

  const getActivityColor = (activityType) => {
    const colorMap = {
      'SalesOrder_Created': 'text-blue-600 bg-blue-50',
      'SalesInvoice_Created': 'text-green-600 bg-green-50',
      'Payment_Collected': 'text-yellow-600 bg-yellow-50',
      'Return_Initiated': 'text-red-600 bg-red-50',
      'Document_Uploaded': 'text-purple-600 bg-purple-50',
      'Photo_Before': 'text-indigo-600 bg-indigo-50',
      'Photo_After': 'text-teal-600 bg-teal-50',
      'Client_Note_Added': 'text-gray-600 bg-gray-50',
      'Customer_Support': 'text-orange-600 bg-orange-50',
      'Visit_Started': 'text-green-600 bg-green-50',
      'Visit_Ended': 'text-red-600 bg-red-50',
      'Inventory_Check': 'text-blue-600 bg-blue-50',
      'Product_Demo': 'text-purple-600 bg-purple-50'
    };
    
    return colorMap[activityType] || 'text-gray-600 bg-gray-50';
  };

  const getActivityLabel = (activityType) => {
    const labelMap = {
      'SalesOrder_Created': 'إنشاء طلب مبيعات',
      'SalesInvoice_Created': 'إنشاء فاتورة مبيعات',
      'Payment_Collected': 'تحصيل دفعة',
      'Return_Initiated': 'بدء إرجاع',
      'Document_Uploaded': 'رفع وثيقة',
      'Photo_Before': 'صورة قبل',
      'Photo_After': 'صورة بعد',
      'Client_Note_Added': 'إضافة ملاحظة عميل',
      'Customer_Support': 'دعم العملاء',
      'Visit_Started': 'بداية الزيارة',
      'Visit_Ended': 'نهاية الزيارة',
      'Inventory_Check': 'فحص المخزون',
      'Product_Demo': 'عرض منتج'
    };
    
    return labelMap[activityType] || activityType;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'غير محدد';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Group activities by date
  const groupedActivities = filteredActivities.reduce((groups, activity) => {
    const date = new Date(activity.activity_timestamp).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {});

  return (
    <div className="p-6 space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <h2 className="text-xl font-semibold text-gray-900">أنشطة الزيارات</h2>
        
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="البحث في الأنشطة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Activity Type Filter */}
          <select
            value={activityTypeFilter}
            onChange={(e) => setActivityTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="all">جميع الأنشطة</option>
            {activityTypes.map(type => (
              <option key={type} value={type}>{getActivityLabel(type)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-600">
        عرض {filteredActivities.length} من أصل {data.length} نشاط
      </div>

      {/* Activities Timeline */}
      <div className="space-y-6">
        {Object.entries(groupedActivities).map(([date, activities]) => (
          <div key={date} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {new Date(date).toLocaleDateString('ar-EG', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h3>
              <p className="text-sm text-gray-500">{activities.length} نشاط</p>
            </div>
            
            <div className="divide-y divide-gray-200">
              {activities.map((activity) => {
                const Icon = getActivityIcon(activity.activity_type);
                const colorClass = getActivityColor(activity.activity_type);
                
                return (
                  <div key={activity.activity_id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start space-x-4 space-x-reverse">
                      <div className={`flex-shrink-0 p-2 rounded-full ${colorClass}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {getActivityLabel(activity.activity_type)}
                            </p>
                            <div className="flex items-center mt-1 space-x-4 space-x-reverse text-sm text-gray-500">
                              <span className="flex items-center">
                                <BuildingOfficeIcon className="h-4 w-4 ml-1" />
                                {activity.clients_company_name || 'غير محدد'}
                              </span>
                              <span className="flex items-center">
                                <UserIcon className="h-4 w-4 ml-1" />
                                {activity.rep_name || 'غير محدد'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="text-sm text-gray-500">
                            <ClockIcon className="h-4 w-4 inline ml-1" />
                            {formatDate(activity.activity_timestamp)}
                          </div>
                        </div>
                        
                        {activity.activity_description && (
                          <div className="mt-2">
                            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                              {activity.activity_description}
                            </p>
                          </div>
                        )}
                        
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center space-x-4 space-x-reverse text-xs text-gray-500">
                            <span>ID الزيارة: {activity.activity_visit_id}</span>
                            {activity.activity_reference_id && (
                              <span>ID المرجع: {activity.activity_reference_id}</span>
                            )}
                          </div>
                          
                          <div className="text-xs text-gray-500">
                            {activity.visit_total_activities} نشاط في هذه الزيارة
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        
        {Object.keys(groupedActivities).length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-gray-200">
            لا توجد أنشطة تطابق المعايير المحددة
          </div>
        )}
      </div>

      {/* Activity Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">ملخص الأنشطة</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {activityTypes.map(type => {
            const count = data.filter(activity => activity.activity_type === type).length;
            const Icon = getActivityIcon(type);
            const colorClass = getActivityColor(type);
            
            return (
              <div key={type} className={`p-3 rounded-lg ${colorClass} text-center`}>
                <Icon className="h-6 w-6 mx-auto mb-2" />
                <div className="text-lg font-bold">{count}</div>
                <div className="text-xs">{getActivityLabel(type)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ActivitiesTab;
