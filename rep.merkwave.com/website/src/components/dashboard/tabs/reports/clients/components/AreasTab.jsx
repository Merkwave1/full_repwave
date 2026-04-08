import React from 'react';
import { 
  MapPinIcon, 
  BuildingOfficeIcon,
  TagIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

const AreasTab = ({ data, loading }) => {
  if (loading || !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const areas = data;

  return (
    <div className="space-y-6">
      {/* Geographic Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="p-2 rounded-lg bg-teal-100 text-teal-600 inline-block mb-3">
            <MapPinIcon className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold text-teal-600 mb-2">{areas.total_cities?.toLocaleString() || 0}</p>
          <p className="text-gray-600 text-sm">إجمالي المدن</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-600 inline-block mb-3">
            <BuildingOfficeIcon className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold text-blue-600 mb-2">{areas.total_areas?.toLocaleString() || 0}</p>
          <p className="text-gray-600 text-sm">إجمالي المناطق</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="p-2 rounded-lg bg-green-100 text-green-600 inline-block mb-3">
            <TagIcon className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold text-green-600 mb-2">{areas.total_tags?.toLocaleString() || 0}</p>
          <p className="text-gray-600 text-sm">علامات المناطق</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="p-2 rounded-lg bg-purple-100 text-purple-600 inline-block mb-3">
            <UserGroupIcon className="w-6 h-6" />
          </div>
          <p className="text-2xl font-bold text-purple-600 mb-2">{areas.clients_with_areas?.toLocaleString() || 0}</p>
          <p className="text-gray-600 text-sm">عملاء لديهم مناطق</p>
        </div>
      </div>

      {/* Top Cities */}
      {areas.top_cities && areas.top_cities.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center space-x-3 space-x-reverse mb-6">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <BuildingOfficeIcon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">أهم المدن</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {areas.top_cities.map((city, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-900">{city.city_name}</span>
                  <span className="text-sm font-bold text-blue-600">{city.client_count?.toLocaleString() || 0}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{width: `${city.percentage || 0}%`}}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">{city.percentage || 0}% من إجمالي العملاء</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Area Tags Analysis */}
      {areas.area_tags && areas.area_tags.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center space-x-3 space-x-reverse mb-6">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              <TagIcon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">تحليل علامات المناطق</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {areas.area_tags.map((tag, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-gray-900">{tag.tag_name}</h4>
                  <span className="text-sm font-bold text-purple-600">{tag.usage_count?.toLocaleString() || 0}</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{tag.description || 'لا يوجد وصف'}</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full" 
                    style={{width: `${tag.percentage || 0}%`}}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">يستخدم في {tag.percentage || 0}% من المناطق</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Geographic Distribution Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 space-x-reverse mb-6">
          <div className="p-2 rounded-lg bg-teal-100 text-teal-600">
            <MapPinIcon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">ملخص التوزيع الجغرافي</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-xl font-bold text-teal-600">{areas.clients_with_areas?.toLocaleString() || 0}</p>
            <p className="text-sm text-gray-600">عملاء لديهم مناطق محددة</p>
            <p className="text-xs text-gray-500 mt-1">
              {areas.total_clients > 0 
                ? ((areas.clients_with_areas / areas.total_clients) * 100).toFixed(1)
                : 0
              }% من إجمالي العملاء
            </p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-blue-600">{areas.clients_without_areas?.toLocaleString() || 0}</p>
            <p className="text-sm text-gray-600">عملاء بدون مناطق</p>
            <p className="text-xs text-gray-500 mt-1">
              {areas.total_clients > 0 
                ? ((areas.clients_without_areas / areas.total_clients) * 100).toFixed(1)
                : 0
              }% من إجمالي العملاء
            </p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-green-600">{areas.avg_clients_per_area?.toFixed(1) || '0.0'}</p>
            <p className="text-sm text-gray-600">متوسط العملاء لكل منطقة</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AreasTab;
