// src/components/common/NotificationBell.jsx
import React, { useState, useRef, useEffect } from "react";
import { BellIcon } from "@heroicons/react/24/outline";
import { BellAlertIcon } from "@heroicons/react/24/solid";
import { useNotifications } from "../../hooks/useNotifications.js";

const PRIORITY_DOT = {
  high: "bg-rose-500",
  normal: "bg-amber-400",
  low: "bg-[#C4A8F0]",
};

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
    pendingOperationsTotal,
  } = useNotifications();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleBellClick = () => {
    const willOpen = !isOpen;
    setIsOpen(willOpen);
    if (willOpen && notifications.length === 0 && !loading) {
      fetchNotifications({ page: 1 });
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.notifications_is_read) {
      await markAsRead(notification.notifications_id);
    }

    const routeMap = {
      sales_orders: "/dashboard/sales-management/sales-orders",
      sales_returns: "/dashboard/sales-management/sales-returns",
      purchase_orders: "/dashboard/purchases-management/purchase-orders",
      purchase_returns: "/dashboard/purchases-management/purchase-returns",
      payments: "/dashboard/financial-management/payments",
      returns: "/dashboard/sales-management/sales-returns",
      inventory: "/dashboard/inventory-management/inventory",
      visit_plans: "/dashboard/visit-plans-management/visit-plans",
      visits: "/dashboard/visit-plans-management/visits-calendar",
      clients: "/dashboard/clients-management/clients",
      safe_transactions: "/dashboard/safe-management/safe-transactions",
    };
    const refTable = notification.notifications_reference_table;
    const route = refTable ? routeMap[refTable] : null;

    if (route) {
      window.dispatchEvent(
        new CustomEvent("app:navigate", {
          detail: { path: route },
        }),
      );
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
      window.dispatchEvent(
        new CustomEvent("app:navigate", {
          detail: { path: route },
        }),
      );
    }
    setIsOpen(false);
  };

  const filteredNotifications = showUnreadOnly
    ? notifications.filter((n) => !n.notifications_is_read)
    : notifications;

  const pendingEntries = Object.entries(pendingOperations || {})
    .filter(([, value]) => (value?.count ?? 0) > 0)
    .sort((a, b) => (b[1]?.count ?? 0) - (a[1]?.count ?? 0));

  const canLoadMore =
    (pagination?.current_page ?? 1) < (pagination?.total_pages ?? 1);

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return "الآن";
    if (diffInMinutes < 60) return `${diffInMinutes} دقيقة`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} ساعة`;
    return `${Math.floor(diffInMinutes / 1440)} يوم`;
  };

  const hasUnread = unreadCount > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleBellClick}
        aria-label="الإشعارات"
        aria-expanded={isOpen}
        className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5FD6] focus-visible:ring-offset-2 ${
          hasUnread
            ? "text-white shadow-lg shadow-[#8B5FD6]/35 border border-[#7A52C2]/30"
            : isOpen
              ? "bg-[#EDE7FF] text-[#6B45B0] border border-[#C4A8F0]/60"
              : "bg-white/80 text-[#6B45B0] border border-[#EDE7FF] hover:bg-[#EDE7FF]/70 hover:border-[#C4A8F0]/50"
        }`}
        style={
          hasUnread
            ? {
                background:
                  "linear-gradient(135deg, #8B5FD6 0%, #7A52C2 100%)",
              }
            : undefined
        }
        title="الإشعارات"
      >
        {hasUnread ? (
          <BellAlertIcon className="h-5 w-5" />
        ) : (
          <BellIcon className="h-5 w-5" strokeWidth={2} />
        )}

        {hasUnread && (
          <span className="absolute -top-1 -left-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white rounded-full bg-[#F97366] ring-2 ring-[#FAFAFE] shadow-sm">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute left-0 mt-2.5 w-[min(420px,calc(100vw-1.5rem))] bg-white rounded-2xl border border-[#EDE7FF] z-[100] max-h-[min(600px,calc(100vh-5rem))] overflow-hidden shadow-[0_20px_50px_-12px_rgba(45,27,105,0.25)]"
          dir="rtl"
        >
          {/* Header */}
          <div
            className="px-4 py-3.5 text-white"
            style={{
              background:
                "linear-gradient(135deg, #8B5FD6 0%, #7A52C2 100%)",
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold">الإشعارات</h3>
                {hasUnread && (
                  <p className="text-[11px] text-white/80 mt-0.5">
                    {unreadCount} غير مقروء
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    showUnreadOnly
                      ? "bg-white/25 text-white"
                      : "bg-white/10 text-white/90 hover:bg-white/20"
                  }`}
                >
                  {showUnreadOnly ? "الكل" : "غير مقروء"}
                </button>
                {hasUnread && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[11px] px-2.5 py-1 rounded-lg font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    قراءة الكل
                  </button>
                )}
              </div>
            </div>

            {pendingOperationsTotal > 0 && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <div className="flex items-center justify-between text-[11px] text-white/85 mb-2">
                  <span>مهام معلّقة</span>
                  <span className="bg-[#F97366] text-white rounded-full px-2 py-0.5 font-bold text-[10px]">
                    {pendingOperationsTotal > 99
                      ? "99+"
                      : pendingOperationsTotal}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {pendingEntries.slice(0, 6).map(([key, value]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handlePendingNavigation(value.route)}
                      className="text-[11px] bg-white/15 hover:bg-white/25 border border-white/20 text-white rounded-full px-2.5 py-1 transition-colors"
                    >
                      {value.label}
                      <span className="mr-1.5 font-bold">{value.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto bg-[#FAFAFE]">
            {loading ? (
              <div className="p-8 text-center text-[#6B45B0]/70 text-sm">
                جاري التحميل...
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#EDE7FF] flex items-center justify-center">
                  <BellIcon className="h-7 w-7 text-[#8B5FD6]/60" />
                </div>
                <p className="text-sm font-medium text-[#2D1B69]">
                  {showUnreadOnly
                    ? "لا توجد إشعارات غير مقروءة"
                    : "لا توجد إشعارات"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  ستظهر التنبيهات هنا عند حدوث نشاط جديد
                </p>
              </div>
            ) : (
              filteredNotifications.map((notification) => {
                const unread = !notification.notifications_is_read;
                const priorityClass =
                  PRIORITY_DOT[notification.notifications_priority] ||
                  PRIORITY_DOT.low;

                return (
                  <button
                    key={notification.notifications_id}
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-right p-3.5 border-b border-[#EDE7FF]/80 transition-colors hover:bg-white ${
                      unread ? "bg-[#EDE7FF]/35" : "bg-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${priorityClass}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4
                            className={`text-sm font-semibold leading-snug ${
                              unread ? "text-[#2D1B69]" : "text-gray-700"
                            }`}
                          >
                            {notification.notifications_title}
                          </h4>
                          {unread && (
                            <span className="w-2 h-2 mt-1.5 rounded-full bg-[#8B5FD6] shrink-0" />
                          )}
                        </div>
                        {notification.notifications_body && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                            {notification.notifications_body}
                          </p>
                        )}
                        <span className="text-[10px] text-gray-400 mt-2 inline-block">
                          {formatTimeAgo(notification.notifications_created_at)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {canLoadMore && (
            <div className="p-3 border-t border-[#EDE7FF] bg-white">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loading}
                className={`w-full text-center text-sm font-semibold rounded-xl px-3 py-2.5 transition-colors ${
                  loading
                    ? "bg-[#EDE7FF]/50 text-[#C4A8F0] cursor-not-allowed"
                    : "bg-[#EDE7FF]/60 text-[#6B45B0] hover:bg-[#EDE7FF] border border-[#C4A8F0]/40"
                }`}
              >
                {loading ? "جاري التحميل..." : "تحميل المزيد"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
