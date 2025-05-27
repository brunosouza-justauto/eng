// Types for water tracking functionality

export interface WaterTrackingEntry {
  id: string;
  user_id: string;
  date: string; // ISO format YYYY-MM-DD
  amount_ml: number;
  created_at: string;
  updated_at: string;
}

export interface WaterGoalSettings {
  water_goal_ml: number;
}

// Water goal from the water_goals table
export interface WaterGoal {
  id: string;
  user_id: string;
  water_goal_ml: number;
  created_at: string;
  updated_at: string | null;
}

// For creating a new water tracking entry
export interface CreateWaterTrackingEntry {
  user_id: string;
  date: string;
  amount_ml: number;
}

// For updating a water tracking entry
export interface UpdateWaterTrackingEntry {
  amount_ml: number;
  updated_at: string;
}

// Progress representation
export interface WaterTrackingProgress {
  currentAmount: number;
  goal: number;
  percentage: number;
}
