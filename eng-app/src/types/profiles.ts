// Profile types used across the application

// Program assignment type
export interface ProgramAssignment {
    id: string;
    program_template_id: string;
    start_date: string;
    assigned_at?: string;
    program?: {
        id: string;
        name: string;
    };
}

// Basic profile data needed for lists
export interface UserProfileListItem {
    id: string; // profile UUID
    user_id: string | null; // auth user UUID - can be null for invited users
    email: string | null;
    username: string | null;
    first_name: string | null;
    last_name: string | null;
    role: string;
    onboarding_complete: boolean;
    created_at: string;
    invitation_status?: string | null; // 'pending', 'accepted', etc.
    invited_at?: string | null; // When the invitation was sent
    program_assignments?: ProgramAssignment[]; // Their assigned programs
    gender?: string | null;
}

// Complete profile data with all fields
export interface UserProfileFull extends UserProfileListItem {
    age?: number | null;
    weight_kg?: number | null;
    height_cm?: number | null;
    body_fat_percentage?: number | null;
    goal_type?: string | null;
    goal_target_fat_loss_kg?: number | null;
    goal_target_muscle_gain_kg?: number | null;
    goal_timeframe_weeks?: number | null;
    goal_target_weight_kg?: number | null;
    goal_physique_details?: string | null;
    training_days_per_week?: number | null;
    training_current_program?: string | null;
    training_equipment?: string | null;
    training_session_length_minutes?: number | null;
    training_intensity?: string | null;
    nutrition_meal_patterns?: string | null;
    nutrition_tracking_method?: string | null;
    nutrition_preferences?: string | null;
    nutrition_allergies?: string | null;
    lifestyle_sleep_hours?: number | null;
    lifestyle_stress_level?: number | null;
    lifestyle_water_intake_liters?: number | null;
    lifestyle_schedule_notes?: string | null;
    supplements_meds?: string | null;
    motivation_readiness?: string | null;
    // Add other profile fields if needed
} 