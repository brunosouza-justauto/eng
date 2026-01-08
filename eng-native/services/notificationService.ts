import { supabase } from '../lib/supabase';
import { Notification } from '../types/notifications';

/**
 * Fetch notifications for the current user
 * RLS handles filtering by authenticated user
 * @param limit Maximum number of notifications to fetch
 */
export const fetchNotifications = async (
  limit: number = 30
): Promise<{ notifications: Notification[]; unreadCount: number; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching notifications:', error);
      return { notifications: [], unreadCount: 0, error: error.message };
    }

    const notifications = data as Notification[];
    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return { notifications, unreadCount };
  } catch (err) {
    console.error('Error in fetchNotifications:', err);
    return { notifications: [], unreadCount: 0, error: 'Failed to fetch notifications' };
  }
};

/**
 * Fetch only the unread notification count
 * RLS handles filtering by authenticated user
 */
export const fetchUnreadCount = async (): Promise<{ count: number; error?: string }> => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false);

    if (error) {
      console.error('Error fetching unread count:', error);
      return { count: 0, error: error.message };
    }

    return { count: count || 0 };
  } catch (err) {
    console.error('Error in fetchUnreadCount:', err);
    return { count: 0, error: 'Failed to fetch unread count' };
  }
};

/**
 * Mark notifications as read
 * @param notificationIds Array of notification IDs to mark as read
 */
export const markNotificationsAsRead = async (
  notificationIds: string[]
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', notificationIds);

    if (error) {
      console.error('Error marking notifications as read:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error in markNotificationsAsRead:', err);
    return { success: false, error: 'Failed to mark notifications as read' };
  }
};

/**
 * Mark all notifications as read for the current user
 * RLS handles filtering by authenticated user
 */
export const markAllAsRead = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all as read:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error in markAllAsRead:', err);
    return { success: false, error: 'Failed to mark all as read' };
  }
};
