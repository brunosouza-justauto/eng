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
