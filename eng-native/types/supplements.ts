// Supplement categories
export const SUPPLEMENT_CATEGORIES = [
  'Pre-workout',
  'Intra-workout',
  'Post-workout',
  'Vitamins',
  'Minerals',
  'Protein',
  'Amino Acids',
  'Fat Burners',
  'Mass Gainers',
  'Recovery',
  'Joint Support',
  'Energy Boosters',
  'Enhancement',
  'Other'
] as const;
export type SupplementCategory = typeof SUPPLEMENT_CATEGORIES[number];

// Scheduling options
export const SUPPLEMENT_SCHEDULES = [
  'Daily',
  'Every Other Day',
  'Weekly',
  'Monthly',
  'Quarterly',
  'Yearly',
  'Morning',
  'Afternoon',
  'Evening',
  'Before Workout',
  'During Workout',
  'After Workout',
  'With Meal',
  'Empty Stomach',
  'Before Bed',
  'Custom'
] as const;
export type SupplementSchedule = typeof SUPPLEMENT_SCHEDULES[number];

// Basic supplement interface
export interface Supplement {
  id: string;
  name: string;
  category: SupplementCategory;
  default_dosage?: string;
  default_timing?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Athlete supplement prescription (assignment from coach)
export interface AthleteSupplementPrescription {
  id: string;
  user_id: string;
  supplement_id: string;
  prescribed_by: string;
  dosage: string;
  timing?: string;
  schedule: SupplementSchedule;
  notes?: string;
  start_date: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  supplement?: Supplement;
}

// Extended interface with supplement details for UI
export interface AthleteSupplementWithDetails extends AthleteSupplementPrescription {
  supplement_name: string;
  supplement_category: SupplementCategory;
}

// Grouping interfaces for UI display
export interface SupplementsByCategory {
  category: SupplementCategory;
  supplements: AthleteSupplementWithDetails[];
}

export interface SupplementsBySchedule {
  schedule: SupplementSchedule;
  supplements: AthleteSupplementWithDetails[];
}

// Category colors for UI
export const CATEGORY_COLORS: Record<SupplementCategory, string> = {
  'Pre-workout': '#F97316', // Orange
  'Intra-workout': '#EAB308', // Yellow
  'Post-workout': '#22C55E', // Green
  'Vitamins': '#3B82F6', // Blue
  'Minerals': '#8B5CF6', // Purple
  'Protein': '#EC4899', // Pink
  'Amino Acids': '#14B8A6', // Teal
  'Fat Burners': '#EF4444', // Red
  'Mass Gainers': '#A855F7', // Violet
  'Recovery': '#06B6D4', // Cyan
  'Joint Support': '#F59E0B', // Amber
  'Energy Boosters': '#84CC16', // Lime
  'Enhancement': '#6366F1', // Indigo
  'Other': '#6B7280', // Gray
};

// Schedule icons (for reference in UI)
export const SCHEDULE_TIMING_ORDER: SupplementSchedule[] = [
  'Morning',
  'With Meal',
  'Empty Stomach',
  'Before Workout',
  'During Workout',
  'After Workout',
  'Afternoon',
  'Evening',
  'Before Bed',
  'Daily',
  'Every Other Day',
  'Weekly',
  'Monthly',
  'Quarterly',
  'Yearly',
  'Custom',
];

// Supplement logging interfaces
export interface SupplementLog {
  id: string;
  user_id: string;
  athlete_supplement_id: string;
  taken_at: string;
  date: string;
  notes?: string;
  created_at: string;
}

// Extended supplement with today's log status
export interface TodaysSupplement extends AthleteSupplementWithDetails {
  isLogged: boolean;
  logId?: string;
  loggedAt?: string;
}

// Adherence tracking
export interface SupplementAdherence {
  totalAssigned: number;
  totalTaken: number;
  percentage: number;
  streak: number;
}

// Daily summary for history view
export interface DailySupplementSummary {
  date: string;
  supplements: TodaysSupplement[];
  taken: number;
  total: number;
  percentage: number;
}

// Grouped supplements by schedule for Today's view
export interface SupplementGroupBySchedule {
  schedule: SupplementSchedule;
  supplements: TodaysSupplement[];
  taken: number;
  total: number;
}
