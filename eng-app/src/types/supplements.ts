import { z } from 'zod';

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

// Basic interfaces matching our database schema
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

export interface AthleteSupplementPrescription {
  id: string;
  user_id: string;
  supplement_id: string;
  prescribed_by: string;
  dosage: string;
  timing?: string;
  schedule: SupplementSchedule;
  notes?: string;
  start_date: string; // ISO date format
  end_date?: string; // ISO date format
  created_at: string;
  updated_at: string;
  
  // Joined data (not in database)
  supplement?: Supplement;
  user_name?: string;
  prescribed_by_name?: string;
}

export interface SupplementCategoryRecord {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

// Form data interfaces for React Hook Form
export interface SupplementFormData {
  name: string;
  category: SupplementCategory;
  default_dosage: string;
  default_timing: string;
  notes: string;
}

export interface AthleteSupplementFormData {
  supplement_id: string;
  dosage: string;
  timing: string;
  schedule: SupplementSchedule;
  notes: string;
  start_date: string;
  end_date?: string;
}

// Zod schemas for validation
export const supplementSchema = z.object({
  name: z.string().min(1, 'Supplement name is required'),
  category: z.enum(SUPPLEMENT_CATEGORIES),
  default_dosage: z.string().optional(),
  default_timing: z.string().optional(),
  notes: z.string().optional(),
});

export const athleteSupplementSchema = z.object({
  supplement_id: z.string().uuid('Invalid supplement ID'),
  dosage: z.string().min(1, 'Dosage is required'),
  timing: z.string().optional(),
  schedule: z.enum(SUPPLEMENT_SCHEDULES),
  notes: z.string().optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(),
});

// Extended interfaces for the UI
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