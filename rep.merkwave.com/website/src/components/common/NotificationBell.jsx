// src/components/common/NotificationBell.jsx
import React, { useState, useRef, useEffect } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';
import { useNotifications } from '../../hooks/useNotifications.js';

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const dropdownRef = useRef(null);
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead,
    fetchNotifications,
    pagination,
    pendingOperations,
    pendingOperationsTotal
  } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Do not auto-refetch on open; rely on versions change or manual refresh button if added

  const handleBellClick = () => {
    setIsOpen(!isOpen);
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.notifications_is_read) {
      await markAsRead(notification.notifications_id);
    }
    
    // Navigate based on notification type
    if (notification.notifications_reference_table === 'sales_orders') {
      // Navigate to sales orders tab - you may need to adjust this based on your routing
      window.dispatchEvent(new CustomEvent('app:navigate', {
        detail: { path: '/dashboard', refreshTab: 'sales-management' }
      }));
    }
    
    setIsOpen(false);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const handleLoadMore = async () => {
    if (loading) return;
    await fetchNotifications({ append: true });
  };

  const handlePendingNavigation = (route) => {
    if (route) {
      window.dispatchEvent(new CustomEvent('app:navigate', {
        detail: { path: route }
      }));
    }
    setIsOpen(false);
  };

  const filteredNotifications = showUnreadOnly 
    ? notifications.filter(n => !n.notifications_is_read)
    : notifications;

  const pendingEntries = Object.entries(pendingOperations || {})
    .filter(([, value]) => (value?.count ?? 0) > 0)
    .sort((a, b) => (b[1]?.count ?? 0) - (a[1]?.count ?? 0));

  const canLoadMore = (pagination?.current_page ?? 1) < (pagination?.total_pages ?? 1);

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'الآن';
    if (diffInMinutes < 60) return `${diffInMinutes} دقيقة`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} ساعة`;
    return `${Math.floor(diffInMinutes / 1440)} يوم`;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'normal': return 'text-yellow-600';
      case 'low': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* DEBUG: Temporary test button */}
      {/* Bell Icon */}
      <button
        onClick={handleBellClick}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg transition-colors"
      >
        {unreadCount > 0 ? (
          <BellSolidIcon className="h-6 w-6 text-blue-600" />
        ) : (
          <BellIcon className="h-6 w-6" />
        )}
        
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium z-10">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[500px] bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[600px] overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">الإشعارات</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    showUnreadOnly 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {showUnreadOnly ? 'جميع الإشعارات' : 'غير مقروءة فقط'}
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    تحديد الكل كمقروء
                  </button>
                )}
              </div>
            </div>
            {pendingOperationsTotal > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span>عناصر العمل المعلقة</span>
                  <span className="bg-red-500 text-white rounded-full px-2 py-0.5 text-[11px]">
                    {pendingOperationsTotal > 99 ? '99+' : pendingOperationsTotal}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {pendingEntries.slice(0, 6).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => handlePendingNavigation(value.route)}
                      className="text-xs bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-full px-3 py-1 transition-colors"
                    >
                      {value.label}
                      <span className="ml-2 font-semibold">{value.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[450px] overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">جاري التحميل...</div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {showUnreadOnly ? 'لا توجد إشعارات غير مقروءة' : 'لا توجد إشعارات'}
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.notifications_id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notification.notifications_is_read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={`text-sm font-medium ${
                          !notification.notifications_is_read ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {notification.notifications_title}
                        </h4>
                        <span className={`w-2 h-2 rounded-full ${getPriorityColor(notification.notifications_priority)}`}>
                          ●
                        </span>
                      </div>
                      {notification.notifications_body && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.notifications_body}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(notification.notifications_created_at)}
                        </span>
                        {!notification.notifications_is_read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {(canLoadMore || filteredNotifications.length > 0) && (
            <div className="p-3 border-t border-gray-200 bg-gray-50 space-y-2">
              {canLoadMore && (
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className={`w-full text-center text-sm font-medium rounded-md border border-blue-200 px-3 py-2 transition-colors ${
                    loading ? 'bg-blue-50 text-blue-300 cursor-not-allowed' : 'bg-white text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  {loading ? 'جاري التحميل...' : 'تحميل المزيد'}
                </button>
              )}
              {filteredNotifications.length > 0 && (
                <button 
                  onClick={() => {
                    setIsOpen(false);
                  }}
                  className="w-full text-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  عرض جميع الإشعارات
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
