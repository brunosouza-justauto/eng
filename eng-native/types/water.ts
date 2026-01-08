// Water tracking entry for a specific date
export interface WaterTrackingEntry {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD format
  amount_ml: number;
  created_at: string;
  updated_at: string;
}

// Water goal set by coach or user
export interface WaterGoal {
  id: string;
  user_id: string;
  water_goal_ml: number;
  created_at: string;
  updated_at: string | null;
}

// Progress representation for UI
export interface WaterProgress {
  currentAmount: number;
  goal: number;
  percentage: number;
  glasses: number;
  glassesGoal: number;
}

// Quick add amounts in ml
export const QUICK_ADD_AMOUNTS = [
  { label: '200ml', amount: 200 },
  { label: '250ml', amount: 250 },
  { label: '500ml', amount: 500 },
  { label: '1L', amount: 1000 },
  { label: '2L', amount: 2000 },
  { label: '3L', amount: 3000 },
] as const;

// Default glass size in ml
export const DEFAULT_GLASS_SIZE = 250;

// Default water goal in ml (2.5L)
export const DEFAULT_WATER_GOAL = 2500;
