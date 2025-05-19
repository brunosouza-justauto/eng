import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '../../services/supabaseClient';
import { Notification, NotificationCount } from '../../types/notifications';
import type { RootState } from '../store';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  lastFetched: string | null;
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  lastFetched: null,
};

// Async thunk to fetch notifications
export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (_, { rejectWithValue }) => {
    try {
      const { data: notificationsData, error } = await supabase
        .from('notifications')
        .select(`
          *,
          sender:sender_id(
            id,
            email,
            first_name,
            last_name,
            username
          )
        `)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;

      // Count unread notifications
      const unreadCount = notificationsData.filter(
        (notification) => !notification.is_read
      ).length;

      return {
        notifications: notificationsData as Notification[],
        unreadCount,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch notifications');
    }
  }
);

// Async thunk to mark notifications as read
export const markNotificationsAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (notificationIds: string[], { rejectWithValue }) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', notificationIds);

      if (error) throw error;

      return notificationIds;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to mark notifications as read');
    }
  }
);

// Async thunk to fetch just the notification count
export const fetchNotificationCount = createAsyncThunk(
  'notifications/fetchCount',
  async (_, { rejectWithValue }) => {
    try {
      // Get total count
      const { count: totalCount, error: totalError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true });

      if (totalError) throw totalError;

      // Get unread count
      const { count: unreadCount, error: unreadError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

      if (unreadError) throw unreadError;

      return {
        total: totalCount || 0,
        unread: unreadCount || 0,
      } as NotificationCount;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch notification count');
    }
  }
);

export const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
      state.lastFetched = null;
    },
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications.unshift(action.payload);
      if (!action.payload.is_read) {
        state.unreadCount += 1;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch notifications
      .addCase(fetchNotifications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.notifications = action.payload.notifications;
        state.unreadCount = action.payload.unreadCount;
        state.isLoading = false;
        state.lastFetched = new Date().toISOString();
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Mark notifications as read
      .addCase(markNotificationsAsRead.fulfilled, (state, action) => {
        // Update the is_read status for the provided notification IDs
        const notificationIds = action.payload;
        state.notifications = state.notifications.map((notification) => {
          if (notificationIds.includes(notification.id)) {
            return { ...notification, is_read: true };
          }
          return notification;
        });
        
        // Recalculate unread count
        state.unreadCount = state.notifications.filter(
          (notification) => !notification.is_read
        ).length;
      })
      // Fetch notification count
      .addCase(fetchNotificationCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload.unread;
      });
  },
});

// Export actions
export const { clearNotifications, addNotification } = notificationSlice.actions;

// Export selectors
export const selectNotifications = (state: RootState) => state.notifications.notifications;
export const selectUnreadCount = (state: RootState) => state.notifications.unreadCount;
export const selectIsLoading = (state: RootState) => state.notifications.isLoading;
export const selectError = (state: RootState) => state.notifications.error;

export default notificationSlice.reducer; 