import { supabase } from './supabaseClient';

/**
 * Get all available workout programs
 * @returns Array of workout programs that an athlete can select from
 */
export const getAvailableWorkoutPrograms = async (): Promise<{
  programs: Array<{
    id: string;
    name: string;
    description?: string;
    created_at: string;
  }>;
  error?: string;
}> => {
  try {
    // Fetch workout programs that are available for athletes
    const { data: programsData, error: programsError } = await supabase
      .from('program_templates')
      .select('id, name, description, created_at')
      .order('name', { ascending: true });
    
    if (programsError) {
      console.error("Error fetching available workout programs:", programsError);
      return { programs: [], error: "Failed to fetch available workout programs" };
    }
    
    return {
      programs: programsData || []
    };
  } catch (err) {
    console.error('Error in getAvailableWorkoutPrograms:', err);
    return { programs: [], error: "An unexpected error occurred" };
  }
};

/**
 * Assign a workout program to a user
 * @param athleteId The athlete's profile ID
 * @param programId The workout program ID to assign
 * @returns Success status and any error message
 */
export const assignWorkoutProgram = async (
  athleteId: string,
  programId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Create a new assignment
    const { error: assignError } = await supabase
      .from('assigned_plans')
      .insert({
        athlete_id: athleteId,
        program_template_id: programId,
        assigned_by: athleteId, // Self-assigned
        assigned_at: new Date().toISOString(),
        start_date: new Date().toISOString().split('T')[0] // Today as the start date
      });

    if (assignError) throw assignError;
    
    return { success: true };
  } catch (err) {
    console.error('Error assigning workout program:', err);
    return { 
      success: false, 
      error: "Failed to assign workout program. Please try again." 
    };
  }
}; 