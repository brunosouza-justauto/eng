/**
 * Notification Types for the ENG Native App
 */

export interface Notification {
  id: string;
  recipient_id: string;
  sender_id: string | null;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  related_entity_id: string | null;
  related_entity_type: string | null;
  created_at: string;
  updated_at: string;
}

export type NotificationType =
  | 'new_athlete'
  | 'check_in'
  | 'workout_completed'
  | 'program_assigned'
  | 'nutrition_assigned'
  | 'steps_completed'
  | 'system';

export interface NotificationCount {
  total: number;
  unread: number;
}

// ==================== LOCAL REMINDERS ====================
// These are client-side generated reminders based on user's schedule

export type LocalReminderType =
  | 'workout_overdue'
  | 'workout_due'
  | 'supplements_overdue'
  | 'supplements_due'
  | 'meals_overdue'
  | 'meals_behind'
  | 'water_behind'
  | 'steps_behind'
  | 'checkin_overdue';

export interface LocalReminder {
  id: string; // Generated client-side (e.g., 'reminder-workout-overdue')
  type: LocalReminderType;
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  iconColor: string;
  href: string; // Navigation target
  createdAt: Date;
}
