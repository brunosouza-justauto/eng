/**
 * Notification Types for the ENG App
 */

// Interface for a notification
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

// The different types of notifications
export type NotificationType = 
  | 'new_athlete'
  | 'check_in'
  | 'workout_completed'
  | 'program_assigned'
  | 'nutrition_assigned'
  | 'steps_completed'
  | 'system';

// Interface for the notification count
export interface NotificationCount {
  total: number;
  unread: number;
}

// Interface for a notification with optional profile information
export interface NotificationWithProfiles extends Notification {
  sender?: {
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    username: string | null;
  } | null;
} 