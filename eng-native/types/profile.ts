// Profile data type from Supabase profiles table
export interface ProfileData {
  id: string;
  user_id: string;
  username: string | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  onboarding_complete: boolean;
  role: string;
  coach_id: string | null;

  // Demographics
  age: number | null;
  gender: 'male' | 'female' | null;
  weight_kg: number | null;
  height_cm: number | null;
  body_fat_percentage: number | null;

  // Goals
  goal_type: 'fat_loss' | 'muscle_gain' | 'both' | 'maintenance' | null;
  goal_target_fat_loss_kg: number | null;
  goal_target_muscle_gain_kg: number | null;
  goal_timeframe_weeks: number | null;
  goal_target_weight_kg: number | null;
  goal_physique_details: string | null;

  // Training
  experience_level: 'beginner' | 'intermediate' | 'advanced' | null;
  training_equipment: string | null;
  training_time_of_day: string | null;
  training_days_per_week: number | null;
  training_current_program: string | null;
  training_session_length_minutes: number | null;
  training_intensity: string | null;

  // Nutrition
  nutrition_tracking_method: string | null;
  nutrition_wakeup_time_of_day: string | null;
  nutrition_bed_time_of_day: string | null;
  nutrition_meal_patterns: string | null;
  nutrition_preferences: string | null;
  nutrition_allergies: string | null;

  // Lifestyle
  lifestyle_sleep_hours: number | null;
  lifestyle_stress_level: number | null;
  lifestyle_schedule_notes: string | null;
  lifestyle_water_intake_liters: number | null;
  supplements_meds: string | null;
  motivation_readiness: string | null;
}

// Time options for dropdowns (30-minute intervals)
export const TIME_OPTIONS = [
  '00:00', '00:30', '01:00', '01:30', '02:00', '02:30',
  '03:00', '03:30', '04:00', '04:30', '05:00', '05:30',
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30',
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  '21:00', '21:30', '22:00', '22:30', '23:00', '23:30',
];

export const EQUIPMENT_OPTIONS = [
  'Home gym',
  'Bodyweight only',
  'Full Commercial gym',
  'Limited Commercial gym',
  'Dumbbells and kettlebells only',
  'Dumbbells and barbell only',
  'Dumbbells, barbell and kettlebells only',
];

export const TRACKING_METHOD_OPTIONS = [
  'MyFitnessPal',
  'Other app',
  'Pen & paper',
  "Don't track",
];
