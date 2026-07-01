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

  const SUB_TABS = [
    { key: 'overview', label: 'نظرة عامة', desc: 'ملخص الزيارات', icon: ChartBarIcon, gradientFrom: '#8B5FD6', gradientTo: '#6B45B0', iconBg: '#EDE7FF', iconColor: '#8B5FD6' },
    { key: 'details', label: 'تفاصيل الزيارات', desc: 'سجل كامل بالزيارات', icon: DocumentTextIcon, gradientFrom: '#10b981', gradientTo: '#059669', iconBg: '#ecfdf5', iconColor: '#10b981' },
    { key: 'areas', label: 'المناطق', desc: 'توزيع الزيارات جغرافياً', icon: MapPinIcon, gradientFrom: '#f59e0b', gradientTo: '#d97706', iconBg: '#fffbeb', iconColor: '#f59e0b' },
    { key: 'representatives', label: 'المندوبين', desc: 'أداء كل مندوب', icon: UserGroupIcon, gradientFrom: '#F97366', gradientTo: '#d45a4e', iconBg: '#FFF0EE', iconColor: '#F97366' },
    { key: 'analytics', label: 'التحليلات', desc: 'تحليل بياني للزيارات', icon: PresentationChartLineIcon, gradientFrom: '#64748b', gradientTo: '#475569', iconBg: '#f1f5f9', iconColor: '#64748b' },
    { key: 'performance', label: 'الأداء', desc: 'مؤشرات الأداء الرئيسية', icon: TrophyIcon, gradientFrom: '#7A52C2', gradientTo: '#5A3AA0', iconBg: '#f3e8ff', iconColor: '#7A52C2' },
    { key: 'top_clients', label: 'أهم العملاء', desc: 'أكثر العملاء زيارة', icon: CalendarDaysIcon, gradientFrom: '#ef4444', gradientTo: '#dc2626', iconBg: '#fef2f2', iconColor: '#ef4444' },
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B5FD6]"></div>
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
    <div className="h-full flex flex-col" dir="rtl">
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-52 flex-shrink-0 bg-white border-l border-gray-100 flex flex-col py-3 px-2 gap-1 overflow-y-auto">
          {SUB_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => onChangeTab(tab.key)}
                className={`w-full text-right px-3 py-3 flex items-center gap-3 rounded-xl transition-all duration-200 ${
                  !isActive ? 'hover:bg-gray-50' : ''
                }`}
                style={
                  isActive
                    ? { background: `linear-gradient(135deg, ${tab.gradientFrom} 0%, ${tab.gradientTo} 100%)`, boxShadow: '0 4px 14px rgba(0,0,0,0.18)' }
                    : {}
                }
              >
                <div
                  className="p-1.5 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : tab.iconBg }}
                >
                  <Icon className="h-4 w-4" style={{ color: isActive ? '#fff' : tab.iconColor }} />
                </div>
                <div className="min-w-0 text-right">
                  <p className="text-sm font-semibold leading-tight" style={{ color: isActive ? '#fff' : '#1f2937' }}>
                    {tab.label}
                  </p>
                  <p className="text-xs leading-tight mt-0.5 truncate" style={{ color: isActive ? 'rgba(255,255,255,0.7)' : '#9ca3af' }}>
                    {tab.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </aside>
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-5">{renderTabContent()}</div>
        </main>
      </div>
    </div>
  );
};

export default VisitsReportsPage;
