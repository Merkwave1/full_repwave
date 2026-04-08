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

  const tabs = [
    { key: 'overview', label: 'نظرة عامة', icon: ChartBarIcon },
    { key: 'location', label: 'تتبع المواقع', icon: MapPinIcon },
    { key: 'attendance', label: 'الحضور والانصراف', icon: ClockIcon },
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
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <UserGroupIcon className="h-8 w-8 text-blue-600 ml-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">تقارير المستخدمين</h1>
              <p className="text-sm text-gray-600">تتبع حضور المستخدمين ومواقعهم وأدائهم</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 space-x-reverse">
            <CalendarDaysIcon className="h-6 w-6 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <nav className="flex px-6">
          {tabs.map((tabItem) => {
            const Icon = tabItem.icon;
            const isActive = activeTab === tabItem.key;
            
            return (
              <button
                key={tabItem.key}
                onClick={() => handleTabChange(tabItem.key)}
                className={`
                  flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-200
                  ${isActive
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                <Icon className="h-5 w-5 ml-2" />
                {tabItem.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default RepresentativesReportsPage;
