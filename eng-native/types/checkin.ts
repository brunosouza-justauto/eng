// Check-in record
export interface CheckIn {
  id: string;
  user_id: string;
  check_in_date: string; // YYYY-MM-DD
  photos?: string[]; // Storage paths
  video_url?: string;
  diet_adherence?: string;
  training_adherence?: string;
  steps_adherence?: string;
  notes?: string;
  coach_feedback?: string;
  created_at: string;
  updated_at: string;
}

// Body metrics linked to a check-in
export interface BodyMetrics {
  id: string;
  check_in_id: string;
  weight_kg?: number;
  body_fat_percentage?: number;
  waist_cm?: number;
  hip_cm?: number;
  chest_cm?: number;
  left_arm_cm?: number;
  right_arm_cm?: number;
  left_thigh_cm?: number;
  right_thigh_cm?: number;
  created_at: string;
  updated_at: string;
}

// Wellness metrics linked to a check-in
export interface WellnessMetrics {
  id: string;
  check_in_id: string;
  sleep_hours?: number;
  sleep_quality?: number; // 1-5
  stress_level?: number; // 1-5
  fatigue_level?: number; // 1-5
  digestion?: string;
  motivation_level?: number; // 1-5
  menstrual_cycle_notes?: string;
  created_at: string;
  updated_at: string;
}

// Full check-in with related data
export interface CheckInWithMetrics extends CheckIn {
  body_metrics?: BodyMetrics;
  wellness_metrics?: WellnessMetrics;
}

// Form data for creating a check-in
export interface CheckInFormData {
  check_in_date: string;
  // Body metrics
  weight_kg: number;
  body_fat_percentage?: number;
  waist_cm?: number;
  hip_cm?: number;
  chest_cm?: number;
  left_arm_cm?: number;
  right_arm_cm?: number;
  left_thigh_cm?: number;
  right_thigh_cm?: number;
  // Wellness
  sleep_hours: number;
  sleep_quality: number;
  stress_level: number;
  fatigue_level: number;
  motivation_level: number;
  digestion?: string;
  menstrual_cycle_notes?: string;
  // Adherence
  diet_adherence: string;
  training_adherence: string;
  steps_adherence: string;
  notes: string;
}

// Rating scale options (1-5)
export const RATING_SCALE = [
  { value: 1, label: '1 - Very Low' },
  { value: 2, label: '2 - Low' },
  { value: 3, label: '3 - Moderate' },
  { value: 4, label: '4 - High' },
  { value: 5, label: '5 - Very High' },
] as const;

// Adherence options
export const ADHERENCE_OPTIONS = [
  { value: 'Perfect', label: 'Perfect - 100% On Plan' },
  { value: 'Good', label: 'Good - Mostly On Plan' },
  { value: 'Average', label: 'Average - Some Deviations' },
  { value: 'Poor', label: 'Poor - Significant Deviations' },
  { value: 'Off Track', label: 'Off Track - Did Not Follow' },
] as const;

// Photo position types
export type PhotoPosition = 'front' | 'side' | 'back';

// Photo capture state
export interface PhotoCapture {
  position: PhotoPosition;
  uri: string | null;
}
