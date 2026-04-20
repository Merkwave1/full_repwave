// src/components/dashboard/tabs/visit-plans-management/VisitCalendarTab.jsx
import React, { useState, useEffect } from 'react';
import { getAllVisitPlans } from '../../../../apis/visitPlans.js';
import { getAllUsers } from '../../../../apis/users.js';
import Loader from '../../../common/Loader/Loader.jsx';
import Alert from '../../../common/Alert/Alert.jsx';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';

function VisitCalendarTab() {
  const [visitPlans, setVisitPlans] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [plansData, usersData] = await Promise.all([
        getAllVisitPlans(),
        getAllUsers()
      ]);
      setVisitPlans(plansData || []);
      setUsers(usersData || []);
    } catch (err) {
      setError(err.message || 'فشل في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  // Helper: Get user name by ID
  const getUserName = (userId) => {
    const user = users.find(u => u.users_id === userId);
    return user ? user.users_name : 'غير محدد';
  };

  // Helper: Convert plan to calendar event
  const getCalendarEvents = () => {
    return visitPlans.map(plan => ({
      id: plan.visit_plan_id,
      title: plan.visit_plan_name + ' - ' + getUserName(plan.user_id),
      start: plan.visit_plan_start_date,
      end: plan.visit_plan_end_date,
      status: plan.visit_plan_status,
      description: plan.visit_plan_description
    }));
  };

  if (loading) return <Loader />;
  if (error) return <Alert type="error" message={error} />;

  const events = getCalendarEvents();

  return (
    <div className="space-y-6" dir="rtl">
      <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <CalendarDaysIcon className="w-7 h-7 text-blue-500" />
        عرض التقويم
      </h3>
      <div className="bg-white p-6 rounded-lg shadow">
        {/* Simple calendar view: List events by date */}
        {events.length === 0 ? (
          <div className="text-center py-12">
            <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد زيارات مجدولة</h3>
            <p className="mt-1 text-sm text-gray-500">لا توجد خطط زيارات متاحة في التقويم.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2">اسم الخطة</th>
                  <th className="px-3 py-2">المندوب</th>
                  <th className="px-3 py-2">تاريخ البداية</th>
                  <th className="px-3 py-2">تاريخ النهاية</th>
                  <th className="px-3 py-2">الحالة</th>
                  <th className="px-3 py-2">الوصف</th>
                </tr>
              </thead>
              <tbody>
                {events.map(event => (
                  <tr key={event.id} className={event.status === 'Active' ? 'bg-blue-50' : 'bg-gray-50'}>
                    <td className="px-3 py-2 font-bold">{event.title}</td>
                    <td className="px-3 py-2">{getUserName(visitPlans.find(p => p.visit_plan_id === event.id)?.user_id)}</td>
                    <td className="px-3 py-2">{event.start || '-'}</td>
                    <td className="px-3 py-2">{event.end || '-'}</td>
                    <td className="px-3 py-2">{event.status === 'Active' ? 'نشطة' : 'متوقفة'}</td>
                    <td className="px-3 py-2">{event.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default VisitCalendarTab;
