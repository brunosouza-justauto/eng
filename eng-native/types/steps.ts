// Step goal assigned by coach or set by user
export interface StepGoal {
  id: string;
  user_id: string; // References profiles.id
  daily_steps: number;
  assigned_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Daily step entry
export interface StepEntry {
  id: string;
  user_id: string; // References auth.users.id
  date: string; // YYYY-MM-DD format
  step_count: number;
  created_at: string;
  updated_at: string;
}

// Weekly stats for display
export interface WeeklyStepStats {
  averageSteps: number;
  totalSteps: number;
  goalsHit: number;
  streak: number;
  entries: StepEntry[];
}

// Day data for weekly chart
export interface DayStepData {
  date: string;
  dayName: string; // Mon, Tue, etc.
  steps: number;
  goalMet: boolean;
  isToday: boolean;
}
