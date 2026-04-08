import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  MapPinIcon, 
  ChartBarIcon, 
  ClockIcon,
  UserGroupIcon,
  DocumentTextIcon,
  PresentationChartLineIcon,
  CalendarDaysIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';

// Import API functions (per-tab)
import { 
  getVisitsReports, 
  getVisitsOverview,
  getVisitsAreas,
  getVisitsRepresentatives,
  getVisitsAnalytics,
  getVisitsPerformance,
  getVisitsTopClients
} from '../../../../../apis/visits.js';

// Import tab components
import OverviewTab from './components/OverviewTab.jsx';
import DetailsTab from './components/DetailsTabNew.jsx';
import AreasTab from './components/AreasTab.jsx';
import RepresentativesTab from './components/RepresentativesTab.jsx';
import AnalyticsTab from './components/AnalyticsTab.jsx';
import PerformanceTab from './components/PerformanceTab.jsx';
import TopClientsTab from './components/TopClientsTab.jsx';

const VisitsReportsPage = () => {
  const navigate = useNavigate();
  const { tab } = useParams();
  const normalizeTab = (t) => {
    const map = {
      overview: 'overview',
      details: 'details',
      'visits-details': 'details',
      activities: 'details',
      areas: 'areas',
      representatives: 'representatives',
      reps: 'representatives',
      analytics: 'analytics',
      performance: 'performance',
      'top-clients': 'top_clients',
      top_clients: 'top_clients',
    };
    return map[t] || 'overview';
  };
  const [activeTab, setActiveTab] = useState(normalizeTab(tab || 'overview'));
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const tabs = [
    { key: 'overview', label: 'نظرة عامة', icon: ChartBarIcon },
    { key: 'details', label: 'تفاصيل الزيارات', icon: DocumentTextIcon },
    { key: 'areas', label: 'المناطق', icon: MapPinIcon },
    { key: 'representatives', label: 'المندوبين', icon: UserGroupIcon },
    { key: 'analytics', label: 'التحليلات', icon: PresentationChartLineIcon },
    { key: 'performance', label: 'الأداء', icon: TrophyIcon },
    { key: 'top_clients', label: 'أهم العملاء', icon: CalendarDaysIcon },
  ];

  // Sync state with URL param
  useEffect(() => {
    const key = normalizeTab(tab || 'overview');
    setActiveTab(key);
  }, [tab]);

  // Always fetch (except details list which is internal) when tab changes
  useEffect(() => {
    const load = async () => {
      if (activeTab === 'details') {
        if (!data.details) setData(prev => ({ ...prev, details: [] }));
        return;
      }
      setLoading(true);
      setError(null);
      try {
        switch (activeTab) {
          case 'overview': {
            const overview = await getVisitsOverview();
            setData(prev => ({ ...prev, overview }));
            break;
          }
          case 'areas': {
            const { items } = await getVisitsAreas();
            setData(prev => ({ ...prev, areas: items }));
            break;
          }
          case 'representatives': {
            const { items } = await getVisitsRepresentatives();
            setData(prev => ({ ...prev, representatives: items }));
            break;
          }
          case 'analytics': {
            const { daily_analytics, hourly_analytics } = await getVisitsAnalytics();
            setData(prev => ({ ...prev, daily_analytics, hourly_analytics }));
            break;
          }
          case 'performance': {
            const performance = await getVisitsPerformance();
            setData(prev => ({ ...prev, performance }));
            break;
          }
          case 'top_clients': {
            const { items } = await getVisitsTopClients();
            setData(prev => ({ ...prev, top_clients: items }));
            break;
          }
          default:
            break;
        }
      } catch (err) {
        console.error('❌ Error loading visits tab data:', err);
        setError(err.message || 'حدث خطأ في تحميل بيانات التبويب');
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadVisitsData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getVisitsReports();
      
      // The result is already the data object from the API
      // Since apiClient returns the full response and visits.js returns response.data
      if (result && typeof result === 'object' && result.overview) {
        setData(result);
      } else if (result && result.status === 'success' && result.data) {
        setData(result.data);
      } else {
        throw new Error('Invalid response structure from API');
      }
    } catch (err) {
      console.error('❌ Error loading visits reports:', err);
      console.error('❌ Full error details:', err.stack);
      setError(err.message || 'حدث خطأ في تحميل بيانات تقارير الزيارات');
    } finally {
      setLoading(false);
    }
  };

  const onChangeTab = (key) => {
    // update URL to reflect tab
    navigate(`/dashboard/reports/visits/${key}`, { replace: false });
  };

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="mr-3 text-gray-600">جاري تحميل البيانات...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 mb-4">⚠️ خطأ في تحميل البيانات</div>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={loadVisitsData}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return <OverviewTab data={data.overview} />;
      case 'details':
        return <DetailsTab data={data.details} />;
  // activities tab removed
      case 'areas':
        return <AreasTab data={data.areas} />;
      case 'representatives':
        return <RepresentativesTab data={data.representatives} />;
      case 'analytics':
        return <AnalyticsTab 
          dailyData={data.daily_analytics} 
          hourlyData={data.hourly_analytics} 
        />;
      case 'performance':
        return <PerformanceTab data={data.performance} />;
      case 'top_clients':
        return <TopClientsTab data={data.top_clients} />;
      default:
        return <OverviewTab data={data.overview} />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-green-500 text-white ml-3">
              <MapPinIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">تقارير الزيارات</h1>
              <p className="text-gray-600 mt-1">تقارير شاملة لجميع زيارات المندوبين للعملاء</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 space-x-reverse">
            <button
              onClick={loadVisitsData}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
              ) : (
                <ChartBarIcon className="h-4 w-4 ml-2" />
              )}
              تحديث البيانات
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <nav className="flex px-6 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tabItem) => {
            const Icon = tabItem.icon;
            const isActive = activeTab === tabItem.key;
            return (
              <button
                key={tabItem.key}
                onClick={() => onChangeTab(tabItem.key)}
                className={`${
                  isActive
                    ? 'border-green-500 text-green-600 bg-green-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                } whitespace-nowrap py-4 px-3 border-b-2 font-medium text-sm flex items-center space-x-2 space-x-reverse transition-colors`}
              >
                <Icon className="w-4 h-4" />
                <span>{tabItem.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 bg-gray-50 overflow-hidden">
        <div className="h-full overflow-y-auto">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default VisitsReportsPage;
