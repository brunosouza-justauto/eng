import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Notification } from '../types/notifications';
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationsAsRead,
  markAllAsRead as markAllAsReadService,
} from '../services/notificationService';

interface NotificationsContextType {
  isOpen: boolean;
  openNotifications: () => void;
  closeNotifications: () => void;
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  isRefreshing: boolean;
  loadNotifications: (showLoading?: boolean) => Promise<void>;
  handleRefresh: () => void;
  handleMarkAllAsRead: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const openNotifications = useCallback(() => setIsOpen(true), []);
  const closeNotifications = useCallback(() => setIsOpen(false), []);

  const loadNotifications = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    const result = await fetchNotifications();
    setNotifications(result.notifications);
    setUnreadCount(result.unreadCount);
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  const loadUnreadCount = useCallback(async () => {
    const result = await fetchUnreadCount();
    setUnreadCount(result.count);
  }, []);

  // Load unread count on mount and periodically
  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 2 * 60 * 1000); // Every 2 minutes
    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  // Load full notifications when modal opens
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, loadNotifications]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadNotifications(false);
  }, [loadNotifications]);

  const handleMarkAllAsRead = useCallback(async () => {
    await markAllAsReadService();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    await markNotificationsAsRead([notificationId]);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  return (
    <NotificationsContext.Provider
      value={{
        isOpen,
        openNotifications,
        closeNotifications,
        notifications,
        unreadCount,
        isLoading,
        isRefreshing,
        loadNotifications,
        handleRefresh,
        handleMarkAllAsRead,
        markAsRead,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
