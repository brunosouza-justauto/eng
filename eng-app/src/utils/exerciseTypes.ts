/**
 * Exercise-related type definitions
 */

// Basic interfaces for muscles and categories
export interface Muscle {
  name: string;
}

export interface ExerciseCategory {
  id: number;
  name: string;
}

export interface Equipment {
  id: number;
  name: string;
}

// Exercise interface with all required properties
export interface Exercise {
  id: string;
  name: string;
  original_name?: string;
  description: string;
  category: string;
  categoryId?: number;
  muscles: string[];
  secondary_muscles?: string[];
  equipment: string[];
  image: string | null;
  instructions: string[];
  tips: string[];
  youtube_link: string | null;
  type: string;
  gender?: string | null;
  target?: string | null;
}

// Response format for paginated queries
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Database exercise shape
export interface DbExercise {
  id: number;
  name: string;
  original_name?: string;
  description?: string;
  slug?: string;
  primary_muscle_group?: string;
  secondary_muscle_groups?: string[];
  gif_url?: string;
  youtube_link?: string;
  instructions?: string[];
  tips?: string[];
  note?: string;
  type?: string;
  body_part?: string;
  equipment?: string;
  gender?: string;
  target?: string;
  created_at?: string;
  updated_at?: string;
} 