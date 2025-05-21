import { supabase } from './supabaseClient';
import { 
  Supplement, 
  AthleteSupplementPrescription, 
  SupplementCategoryRecord,
  AthleteSupplementWithDetails,
  SupplementCategory,
  SupplementSchedule
} from '../types/supplements';

/**
 * Fetches all supplements from the database
 * @returns Array of supplements
 */
export const getAllSupplements = async (): Promise<Supplement[]> => {
  const { data, error } = await supabase
    .from('supplements')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching supplements:', error);
    throw new Error(`Failed to fetch supplements: ${error.message}`);
  }

  return data || [];
};

/**
 * Fetches a single supplement by ID
 * @param id Supplement ID
 * @returns Supplement object
 */
export const getSupplementById = async (id: string): Promise<Supplement> => {
  const { data, error } = await supabase
    .from('supplements')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching supplement ${id}:`, error);
    throw new Error(`Failed to fetch supplement: ${error.message}`);
  }

  return data;
};

/**
 * Creates a new supplement in the database
 * @param supplement Supplement data
 * @returns Created supplement
 */
export const createSupplement = async (supplement: Omit<Supplement, 'id' | 'created_at' | 'updated_at'>): Promise<Supplement> => {
  const { data, error } = await supabase
    .from('supplements')
    .insert([supplement])
    .select()
    .single();

  if (error) {
    console.error('Error creating supplement:', error);
    throw new Error(`Failed to create supplement: ${error.message}`);
  }

  return data;
};

/**
 * Updates an existing supplement
 * @param id Supplement ID
 * @param updates Supplement update data
 * @returns Updated supplement
 */
export const updateSupplement = async (
  id: string, 
  updates: Partial<Omit<Supplement, 'id' | 'created_at' | 'updated_at'>>
): Promise<Supplement> => {
  const { data, error } = await supabase
    .from('supplements')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating supplement ${id}:`, error);
    throw new Error(`Failed to update supplement: ${error.message}`);
  }

  return data;
};

/**
 * Deletes a supplement by ID
 * @param id Supplement ID
 * @returns Success boolean
 */
export const deleteSupplement = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('supplements')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting supplement ${id}:`, error);
    throw new Error(`Failed to delete supplement: ${error.message}`);
  }

  return true;
};

/**
 * Assigns a supplement to an athlete
 * @param prescription Athlete supplement prescription data
 * @returns Created athlete supplement prescription
 */
export const assignSupplementToAthlete = async (
  prescription: Omit<AthleteSupplementPrescription, 'id' | 'created_at' | 'updated_at'>
): Promise<AthleteSupplementPrescription> => {
  const { data, error } = await supabase
    .from('athlete_supplements')
    .insert([prescription])
    .select()
    .single();

  if (error) {
    console.error('Error assigning supplement to athlete:', error);
    throw new Error(`Failed to assign supplement: ${error.message}`);
  }

  return data;
};

/**
 * Updates an athlete's supplement prescription
 * @param id Prescription ID
 * @param updates Prescription update data
 * @returns Updated prescription
 */
export const updateAthleteSupplement = async (
  id: string,
  updates: Partial<Omit<AthleteSupplementPrescription, 'id' | 'created_at' | 'updated_at'>>
): Promise<AthleteSupplementPrescription> => {
  const { data, error } = await supabase
    .from('athlete_supplements')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating athlete supplement ${id}:`, error);
    throw new Error(`Failed to update athlete supplement: ${error.message}`);
  }

  return data;
};

/**
 * Removes a supplement assignment from an athlete
 * @param id Athlete supplement ID
 * @returns Success boolean
 */
export const removeAthleteSupplementAssignment = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('athlete_supplements')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error removing athlete supplement ${id}:`, error);
    throw new Error(`Failed to remove athlete supplement: ${error.message}`);
  }

  return true;
};

/**
 * Gets all supplements for a specific athlete
 * @param userId User ID
 * @returns Array of athlete supplements with supplement details
 */
export const getAthleteSupplements = async (userId: string): Promise<AthleteSupplementWithDetails[]> => {
  const { data, error } = await supabase
    .from('athlete_supplements')
    .select(`
      *,
      supplement:supplement_id (
        id, 
        name, 
        category, 
        default_dosage, 
        default_timing, 
        notes,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', userId)
    .order('start_date', { ascending: false });

  if (error) {
    console.error(`Error fetching supplements for athlete ${userId}:`, error);
    throw new Error(`Failed to fetch athlete supplements: ${error.message}`);
  }

  // Transform the data to match the expected interface
  return (data || []).map((item) => {
    const result: AthleteSupplementWithDetails = {
      ...item,
      supplement_name: item.supplement?.name || 'Unknown Supplement',
      supplement_category: (item.supplement?.category as SupplementCategory) || 'Other',
    };
    return result;
  });
};

/**
 * Gets supplements grouped by category for an athlete
 * @param userId User ID
 * @returns Supplements grouped by category
 */
export const getAthleteSupplementsByCategory = async (userId: string) => {
  const supplements = await getAthleteSupplements(userId);
  
  const groupedSupplements = supplements.reduce((acc, supplement) => {
    const category = supplement.supplement_category;
    
    if (!acc[category]) {
      acc[category] = [];
    }
    
    acc[category].push(supplement);
    return acc;
  }, {} as Record<string, AthleteSupplementWithDetails[]>);
  
  return Object.entries(groupedSupplements).map(([category, supplements]) => ({
    category: category as SupplementCategory,
    supplements
  }));
};

/**
 * Gets supplements grouped by schedule for an athlete
 * @param userId User ID
 * @returns Supplements grouped by schedule
 */
export const getAthleteSupplementsBySchedule = async (userId: string) => {
  const supplements = await getAthleteSupplements(userId);
  
  const groupedSupplements = supplements.reduce((acc, supplement) => {
    const schedule = supplement.schedule;
    
    if (!acc[schedule]) {
      acc[schedule] = [];
    }
    
    acc[schedule].push(supplement);
    return acc;
  }, {} as Record<string, AthleteSupplementWithDetails[]>);
  
  return Object.entries(groupedSupplements).map(([schedule, supplements]) => ({
    schedule: schedule as SupplementSchedule,
    supplements
  }));
};

/**
 * Gets all supplement categories
 * @returns Array of supplement categories
 */
export const getSupplementCategories = async (): Promise<SupplementCategoryRecord[]> => {
  const { data, error } = await supabase
    .from('supplement_categories')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching supplement categories:', error);
    throw new Error(`Failed to fetch supplement categories: ${error.message}`);
  }

  return data || [];
};

/**
 * Creates a new supplement category
 * @param category Category data
 * @returns Created category
 */
export const createSupplementCategory = async (
  category: Omit<SupplementCategoryRecord, 'id' | 'created_at'>
): Promise<SupplementCategoryRecord> => {
  const { data, error } = await supabase
    .from('supplement_categories')
    .insert([category])
    .select()
    .single();

  if (error) {
    console.error('Error creating supplement category:', error);
    throw new Error(`Failed to create supplement category: ${error.message}`);
  }

  return data;
};

/**
 * Gets all athlete supplement assignments with detailed information
 * @returns Array of all athlete supplement assignments with athlete and supplement details
 */
export const getAllAthleteSupplementAssignments = async (): Promise<(AthleteSupplementWithDetails & { athlete_name?: string })[]> => {
  try {
    // Step 1: Fetch all athlete supplement assignments with supplement details
    const { data: assignmentsData, error: assignmentsError } = await supabase
      .from('athlete_supplements')
      .select(`
        *,
        supplements:supplement_id (
          id, 
          name, 
          category, 
          default_dosage, 
          default_timing, 
          notes,
          created_at,
          updated_at
        )
      `)
      .order('created_at', { ascending: false });

    if (assignmentsError) throw assignmentsError;
    
    // Get unique user IDs for athletes and prescribers
    const athleteIds = [...new Set(assignmentsData.map(a => a.user_id))];
    const prescriberIds = [...new Set(assignmentsData.map(a => a.prescribed_by))];
    const allUserIds = [...new Set([...athleteIds, ...prescriberIds])];
    
    // Step 2: Fetch user profiles in a single query
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, user_id, first_name, last_name, email')
      .in('user_id', allUserIds);
      
    if (profilesError) throw profilesError;
    
    // Create a map of user_id to profile for easy lookup
    interface UserProfile {
      id: string;
      user_id: string;
      first_name: string;
      last_name: string;
      email: string;
    }
    
    const userProfiles: Record<string, UserProfile> = {};
    profilesData.forEach(profile => {
      userProfiles[profile.user_id] = profile;
    });
    
    // Step 3: Combine the data
    return (assignmentsData || []).map((item) => {
      const athleteProfile = userProfiles[item.user_id];
      const prescriberProfile = userProfiles[item.prescribed_by];
      
      const result: AthleteSupplementWithDetails & { athlete_name?: string } = {
        ...item,
        supplement_name: item.supplements?.name || 'Unknown Supplement',
        supplement_category: (item.supplements?.category as SupplementCategory) || 'Other',
        athlete_name: athleteProfile 
          ? `${athleteProfile.first_name} ${athleteProfile.last_name}` 
          : 'Unknown Athlete',
        prescribed_by_name: prescriberProfile 
          ? `${prescriberProfile.first_name} ${prescriberProfile.last_name}` 
          : 'Unknown Coach'
      };
      return result;
    });
  } catch (error: unknown) {
    console.error('Error fetching all athlete supplement assignments:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to fetch supplement assignments: ${errorMessage}`);
  }
};

/**
 * Searches for athlete supplement assignments based on a search term
 * @param searchTerm Search term to filter assignments by athlete name, supplement name, or schedule
 * @returns Array of athlete supplement assignments matching the search term
 */
export const searchAthleteSupplementAssignments = async (
  searchTerm: string
): Promise<(AthleteSupplementWithDetails & { athlete_name?: string })[]> => {
  // If search term is empty, return an empty array
  if (!searchTerm || searchTerm.trim() === '') {
    return [];
  }

  try {
    // Step 1: Get profiles matching the search term (for athlete names)
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, user_id, first_name, last_name')
      .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`);
      
    if (profilesError) throw profilesError;
    
    // Get user_ids from the matching profiles
    const matchingUserIds = profilesData.map(profile => profile.user_id);
    
    // Step 2: Fetch supplements matching the search term
    const { data: supplementsData, error: supplementsError } = await supabase
      .from('supplements')
      .select('id, name')
      .ilike('name', `%${searchTerm}%`);
      
    if (supplementsError) throw supplementsError;
    
    // Get supplement IDs from the matching supplements
    const matchingSupplementIds = supplementsData.map(supplement => supplement.id);
    
    // Step 3: Build the query to get assignments that match any of the criteria
    let query = supabase
      .from('athlete_supplements')
      .select(`
        *,
        supplements:supplement_id (
          id, 
          name, 
          category, 
          default_dosage, 
          default_timing, 
          notes,
          created_at,
          updated_at
        )
      `)
      .order('created_at', { ascending: false });
    
    // Only apply filters if there are matching IDs or if searching by schedule
    if (matchingUserIds.length > 0 || matchingSupplementIds.length > 0 || searchTerm.trim() !== '') {
      query = query.or(
        `user_id.in.(${matchingUserIds.join(',')}),` +
        `supplement_id.in.(${matchingSupplementIds.join(',')}),` +
        `schedule.ilike.%${searchTerm}%`
      );
    }
    
    const { data: assignmentsData, error: assignmentsError } = await query;
    
    if (assignmentsError) throw assignmentsError;
    
    // Get all user IDs needed for the results
    const athleteIds = [...new Set(assignmentsData.map(a => a.user_id))];
    const prescriberIds = [...new Set(assignmentsData.map(a => a.prescribed_by))];
    const allUserIds = [...new Set([...athleteIds, ...prescriberIds])];
    
    // Step 4: Get all needed user profiles
    const { data: allProfilesData, error: allProfilesError } = await supabase
      .from('profiles')
      .select('id, user_id, first_name, last_name, email')
      .in('user_id', allUserIds);
      
    if (allProfilesError) throw allProfilesError;
    
    // Create a map of user_id to profile for easy lookup
    interface UserProfile {
      id: string;
      user_id: string;
      first_name: string;
      last_name: string;
      email: string;
    }
    
    const userProfiles: Record<string, UserProfile> = {};
    allProfilesData.forEach(profile => {
      userProfiles[profile.user_id] = profile;
    });
    
    // Step 5: Combine the data
    return (assignmentsData || []).map((item) => {
      const athleteProfile = userProfiles[item.user_id];
      const prescriberProfile = userProfiles[item.prescribed_by];
      
      const result: AthleteSupplementWithDetails & { athlete_name?: string } = {
        ...item,
        supplement_name: item.supplements?.name || 'Unknown Supplement',
        supplement_category: (item.supplements?.category as SupplementCategory) || 'Other',
        athlete_name: athleteProfile 
          ? `${athleteProfile.first_name} ${athleteProfile.last_name}` 
          : 'Unknown Athlete',
        prescribed_by_name: prescriberProfile 
          ? `${prescriberProfile.first_name} ${prescriberProfile.last_name}` 
          : 'Unknown Coach'
      };
      return result;
    });
  } catch (error: unknown) {
    console.error('Error searching athlete supplement assignments:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to search supplement assignments: ${errorMessage}`);
  }
}; 