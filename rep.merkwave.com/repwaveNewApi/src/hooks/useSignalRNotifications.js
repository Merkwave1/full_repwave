// src/hooks/useSignalRNotifications.js
import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { getToken } from '../utils/axiosInstance.js';

const HUB_URL = '/hubs/notifications';

// Custom reconnect policy: wait progressively longer to survive backend restarts
const RECONNECT_DELAYS = [2000, 5000, 10000, 30000, 60000];

/**
 * Connects to the SignalR notifications hub and calls `onNotification`
 * whenever a new notification is pushed by the server.
 *
 * @param {Function} onNotification - callback(notificationDto)
 * @param {boolean} enabled - only connect when authenticated
 */
export function useSignalRNotifications(onNotification, enabled = true) {
  const connectionRef = useRef(null);
  const onNotificationRef = useRef(onNotification);
  onNotificationRef.current = onNotification;

  useEffect(() => {
    if (!enabled) return;

    // Don't connect if no token available
    const token = getToken();
    if (!token) return;

    let disposed = false;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: () => getToken() ?? '',
      })
      .withAutomaticReconnect(RECONNECT_DELAYS)
      .configureLogging(signalR.LogLevel.None)
      .build();

    connection.on('ReceiveNotification', (notification) => {
      onNotificationRef.current?.(notification);
    });

    connectionRef.current = connection;

    connection.start().catch((err) => {
      if (!disposed) {
        // Only log at debug level — reconnect failures on backend restart are expected
        console.debug('[SignalR] Initial connection failed (will retry):', err?.message ?? err);
      }
    });

    return () => {
      disposed = true;
      connection.stop().catch(() => {});
      connectionRef.current = null;
    };
  }, [enabled]);
}
