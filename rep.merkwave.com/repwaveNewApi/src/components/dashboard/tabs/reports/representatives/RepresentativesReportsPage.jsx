import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  MapPinIcon, 
  ClockIcon,
  UserGroupIcon,
  ChartBarIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';

// Import API functions
import { 
  getRepresentativesOverview
} from '../../../../../apis/representative_attendance.js';
import { getRepresentatives } from '../../../../../apis/users.js';

// Import tab components
import LocationTrackingTab from './components/LocationTrackingTab.jsx';
import AttendanceTab from './components/AttendanceTab.jsx';
import OverviewTab from './components/OverviewTab.jsx';

const RepresentativesReportsPage = () => {
  const navigate = useNavigate();
  const { tab } = useParams();
  
  const normalizeTab = (t) => {
    const map = {
      overview: 'overview',
      location: 'location',
      'location-tracking': 'location',
      attendance: 'attendance',
      'attendance-details': 'attendance',
    };
    return map[t] || 'overview';
  };

  const [activeTab, setActiveTab] = useState(normalizeTab(tab || 'overview'));
  const [data, setData] = useState({});
  const [representatives, setRepresentatives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const SUB_TABS = [
    { key: 'overview', label: 'نظرة عامة', desc: 'ملخص المستخدمين', icon: ChartBarIcon, gradientFrom: '#8B5FD6', gradientTo: '#6B45B0', iconBg: '#EDE7FF', iconColor: '#8B5FD6' },
    { key: 'location', label: 'تتبع المواقع', desc: 'المواقع الحالية للمندوبين', icon: MapPinIcon, gradientFrom: '#10b981', gradientTo: '#059669', iconBg: '#ecfdf5', iconColor: '#10b981' },
    { key: 'attendance', label: 'الحضور والانصراف', desc: 'سجلات الحضور اليومي', icon: ClockIcon, gradientFrom: '#f59e0b', gradientTo: '#d97706', iconBg: '#fffbeb', iconColor: '#f59e0b' },
  ];

  // Sync state with URL param
  useEffect(() => {
    const key = normalizeTab(tab || 'overview');
    setActiveTab(key);
  }, [tab]);

  // Load representatives list
  useEffect(() => {
    const loadReps = async () => {
      try {
        const reps = await getRepresentatives();
        setRepresentatives(reps || []);
      } catch (err) {
        console.error('❌ Error loading representatives:', err);
      }
    };
    loadReps();
  }, []);

  // Load data based on active tab
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        switch (activeTab) {
          case 'overview': {
            // Load overview data - summary of all reps
            const overviewData = await getRepresentativesOverview();
            setData(prev => ({ ...prev, overview: overviewData }));
            break;
          }
          case 'location': {
            // Location data will be loaded with filters in the tab component
            if (!data.location) setData(prev => ({ ...prev, location: [] }));
            break;
          }
          case 'attendance': {
            // Attendance data will be loaded with filters in the tab component
            if (!data.attendance) setData(prev => ({ ...prev, attendance: [] }));
            break;
          }
          default:
            break;
        }
      } catch (err) {
        console.error('❌ Error loading representative reports data:', err);
        setError(err.message || 'حدث خطأ في تحميل بيانات التقارير');
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleTabChange = (key) => {
    setActiveTab(key);
    navigate(`/dashboard/reports/representatives/${key}`);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab data={data.overview} loading={loading} error={error} />;
      case 'location':
        return <LocationTrackingTab representatives={representatives} />;
      case 'attendance':
        return <AttendanceTab representatives={representatives} />;
      default:
        return <OverviewTab data={data.overview} loading={loading} error={error} />;
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
                onClick={() => handleTabChange(tab.key)}
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

export default RepresentativesReportsPage;
