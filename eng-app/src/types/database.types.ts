/**
 * This file contains TypeScript type definitions for the Supabase database schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          email: string | null
          first_name: string | null
          last_name: string | null
          onboarding_complete: boolean
          role: string
          height_cm: number | null
          weight_kg: number | null
          age: number | null
          gender: 'male' | 'female' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          onboarding_complete?: boolean
          role?: string
          height_cm?: number | null
          weight_kg?: number | null
          age?: number | null
          gender?: 'male' | 'female' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          onboarding_complete?: boolean
          role?: string
          height_cm?: number | null
          weight_kg?: number | null
          age?: number | null
          gender?: 'male' | 'female' | null
          created_at?: string
          updated_at?: string
        }
      }
      // Type definitions for meals and food items from the meal planning schema
      meals: {
        Row: {
          id: string
          nutrition_plan_id: string
          name: string
          time_suggestion: string | null
          notes: string | null
          order_in_plan: number
          day_type: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nutrition_plan_id: string
          name: string
          time_suggestion?: string | null
          notes?: string | null
          order_in_plan: number
          day_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nutrition_plan_id?: string
          name?: string
          time_suggestion?: string | null
          notes?: string | null
          order_in_plan?: number
          day_type?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      meal_food_items: {
        Row: {
          id: string
          meal_id: string
          food_item_id: string
          source_recipe_id: string | null
          quantity: number
          unit: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          meal_id: string
          food_item_id: string
          source_recipe_id?: string | null
          quantity: number
          unit: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          meal_id?: string
          food_item_id?: string
          source_recipe_id?: string | null
          quantity?: number
          unit?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      // Add more table definitions as needed
      athlete_measurements: {
        Row: {
          id: string
          user_id: string
          date: string
          weight_kg: number | null
          body_fat_percentage: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          weight_kg?: number | null
          body_fat_percentage?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          weight_kg?: number | null
          body_fat_percentage?: number | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    // Add Views, Functions, Enums as needed
    Enums: {
      exercise_group_type: 'none' | 'superset' | 'bi_set' | 'tri_set' | 'giant_set'
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T] 