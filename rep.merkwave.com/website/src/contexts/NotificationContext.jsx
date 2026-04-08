// src/contexts/NotificationContext.jsx
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { getNotifications, markNotificationRead } from '../apis/notifications';
import { useAuth } from '../hooks/useAuth.js';

export const NotificationContext = createContext();

const DEFAULT_PAGE_SIZE = 10;

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pendingOperations, setPendingOperations] = useState({});
  const [pendingOperationsTotal, setPendingOperationsTotal] = useState(0);
  const [pagination, setPagination] = useState({ current_page: 1, per_page: 10, total_items: 0, total_pages: 1 });
  const { isAuthenticated } = useAuth();

  // Use localStorage to persist the "has fetched" flag across remounts
  const getHasInitialFetched = () => {
    try {
      return localStorage.getItem('notifications_initialFetched') === 'true';
    } catch {
      return false;
    }
  };

  const setHasInitialFetched = (value) => {
    try {
      if (value) {
        localStorage.setItem('notifications_initialFetched', 'true');
      } else {
        localStorage.removeItem('notifications_initialFetched');
      }
    } catch {
      /* noop */
    }
  };
  

  // Fetch notifications
  const sessionActive = useCallback(() => {
    if (isAuthenticated) return true;
    try {
      return !!localStorage.getItem('userData');
    } catch {
      return false;
    }
  }, [isAuthenticated]);

  const fetchNotifications = useCallback(async ({ append = false, page = null, ...params } = {}) => {
    if (!sessionActive()) return;
    
    try {
      setLoading(true);
      setError(null);
      const nextPage = page ?? (append ? ((pagination?.current_page ?? 1) + 1) : 1);
      const response = await getNotifications({ ...params, page: nextPage });

      const payload = response.notifications !== undefined
        ? response
        : response.status === 'success'
          ? response.data
          : null;

      if (!payload) {
        throw new Error(response.message || 'Failed to fetch notifications');
      }

      const fetchedNotifications = Array.isArray(payload.notifications) ? payload.notifications : [];
      setNotifications(prev => append ? [...prev, ...fetchedNotifications] : fetchedNotifications);
      setUnreadCount(payload.unread_count ?? payload.data?.unread_count ?? 0);
      setPendingOperations(payload.pending_operations ?? {});
      setPendingOperationsTotal(payload.pending_operations_total ?? 0);

      const payloadPagination = payload.pagination ?? {};
      setPagination({
        current_page: payloadPagination.current_page ?? nextPage,
        per_page: payloadPagination.per_page ?? payloadPagination.limit ?? DEFAULT_PAGE_SIZE,
        total_items: payloadPagination.total_items ?? payload.total_notifications ?? fetchedNotifications.length,
        total_pages: payloadPagination.total_pages ?? Math.max(1, Math.ceil((payloadPagination.total_items ?? payload.total_notifications ?? fetchedNotifications.length) / (payloadPagination.per_page ?? DEFAULT_PAGE_SIZE)))
      });
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionActive, pagination?.current_page]);

    // Fetch unread count only
  const fetchUnreadCount = useCallback(async () => {
    if (!sessionActive()) return;
    
    try {
      const response = await getNotifications({ is_read: 0, page: 1 });
      const payload = response.unread_count !== undefined
        ? response
        : response.status === 'success'
          ? response.data
          : null;

      if (payload) {
        setUnreadCount(payload.unread_count ?? 0);
      }
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  }, [sessionActive]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const response = await markNotificationRead({ notification_id: notificationId });
      
      
      // Check for success in response format
      if (response && response.status === 'success') {
        // Update local state
        setNotifications(prev => 
          prev.map(notif => 
            notif.notifications_id === notificationId 
              ? { ...notif, notifications_is_read: 1, notifications_read_at: new Date().toISOString() }
              : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        return true;
      } else {
        console.error('🔔 Mark as read failed:', response);
        return false;
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
      return false;
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await markNotificationRead({ mark_all_read: true });
      
      if (response.status === 'success') {
        // Update local state
        setNotifications(prev => 
          prev.map(notif => ({ 
            ...notif, 
            notifications_is_read: 1, 
            notifications_read_at: new Date().toISOString() 
          }))
        );
        setUnreadCount(0);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      return false;
    }
  }, []);

  // On login: fetch notifications once (initial load)
  useEffect(() => {
    if (!isAuthenticated) return;
    if (getHasInitialFetched()) {
      // even if fetched previously, refresh unread count to stay accurate after reloads
      fetchUnreadCount();
      return;
    }

    let cancelled = false;

    (async () => {
      try {
  await fetchNotifications({ page: 1, is_read: 0 });
        if (!cancelled) {
          setHasInitialFetched(true);
        }
      } finally {
        if (!cancelled) {
          await fetchUnreadCount();
        }
      }
    })();

    return () => {
      cancelled = true;
    };

  }, [isAuthenticated, fetchNotifications, fetchUnreadCount]);

  // Refetch notifications only when versions indicate change
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleVersionsUpdate = (event) => {
      const changed = event?.detail?.changed;
      if (Array.isArray(changed) && changed.includes('notifications')) {
        fetchNotifications({ page: 1 });
      }
    };

    window.addEventListener('versions:updated', handleVersionsUpdate);
    return () => window.removeEventListener('versions:updated', handleVersionsUpdate);
  }, [isAuthenticated, fetchNotifications]);

  // Clear notifications on logout
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      setError(null);
      setHasInitialFetched(false);
    }
  }, [isAuthenticated]);

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    pagination,
    pendingOperations,
    pendingOperationsTotal,
  fetchUnreadCount, // available for manual use; not auto-polled
    markAsRead,
    markAllAsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
