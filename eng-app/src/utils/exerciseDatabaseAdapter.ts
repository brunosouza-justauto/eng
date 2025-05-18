/**
 * Exercise Database Adapter
 * 
 * This utility connects to our Supabase database to fetch exercise data.
 * It replaces the previous implementation that used the HeyGainz API.
 */

import { createClient } from '@supabase/supabase-js';
import { Exercise, PaginatedResponse, Muscle, ExerciseCategory, DbExercise } from './exerciseTypes';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Converts a database exercise to the standard Exercise format
 */
const formatExerciseFromDb = (dbExercise: DbExercise): Exercise => {
  // Ensure proper handling of primary muscle group
  const primaryMuscle = dbExercise.primary_muscle_group || dbExercise.body_part || 'Uncategorized';
  
  // Handle secondary muscles with better type checking
  let secondaryMuscles: string[] = [];
  if (dbExercise.secondary_muscle_groups) {
    if (Array.isArray(dbExercise.secondary_muscle_groups)) {
      secondaryMuscles = dbExercise.secondary_muscle_groups
        .filter(muscle => typeof muscle === 'string' && muscle.trim() !== '')
        .map(muscle => muscle.trim());
    } else if (typeof dbExercise.secondary_muscle_groups === 'string') {
      // Handle case where it might be a comma-separated string
      secondaryMuscles = (dbExercise.secondary_muscle_groups as string)
        .split(',')
        .map((m: string) => m.trim())
        .filter((m: string) => m !== '');
    }
  }
  
  // Ensure arrays are always arrays, even if data is malformed
  const equipment = Array.isArray(dbExercise.equipment) 
    ? dbExercise.equipment 
    : [dbExercise.equipment || 'None'].filter(Boolean);
  
  const instructions = Array.isArray(dbExercise.instructions) 
    ? dbExercise.instructions 
    : typeof dbExercise.instructions === 'string'
      ? [dbExercise.instructions]
      : [];
      
  const tips = Array.isArray(dbExercise.tips) 
    ? dbExercise.tips 
    : typeof dbExercise.tips === 'string'
      ? [dbExercise.tips]
      : [];

  // Log muscle info for debugging
  console.log(`Formatted exercise ${dbExercise.id} - ${dbExercise.name}: Primary muscle: ${primaryMuscle}, Secondary muscles: ${secondaryMuscles.join(', ') || 'None'}`);
  
  return {
    id: dbExercise.id.toString(),
    name: dbExercise.name || 'Unknown Exercise',
    original_name: dbExercise.original_name || dbExercise.name,
    description: dbExercise.description || '',
    category: primaryMuscle,
    muscles: [primaryMuscle],
    equipment: equipment,
    secondary_muscles: secondaryMuscles,
    image: dbExercise.gif_url || null,
    instructions: instructions,
    tips: tips,
    youtube_link: dbExercise.youtube_link || null,
    type: dbExercise.type || 'Strength',
    gender: dbExercise.gender || null,
    target: dbExercise.target || null
  };
};

/**
 * Safely processes array data for distinct values
 * Handles cases where data might not be strings
 */
const processDistinctValues = (data: unknown[] | null): string[] => {
  if (!data || !Array.isArray(data)) {
    return [];
  }
  
  return data
    .map(item => {
      // Handle different data formats 
      if (typeof item === 'string') {
        return item.trim();
      } else if (item && typeof item === 'object' && item !== null) {
        // For RPC functions that return {value: string}
        const objItem = item as Record<string, unknown>;
        if (objItem.value !== undefined) {
          return String(objItem.value).trim();
        }
      }
      // Convert other values to string
      return item !== null && item !== undefined ? String(item).trim() : '';
    })
    .filter(item => item !== '')  // Filter out empty strings
    .sort();  // Sort for consistency
};

/**
 * Get all muscle groups
 */
export const getMuscleGroups = async (): Promise<Muscle[]> => {
  try {
    // Use a direct SQL query with DISTINCT to efficiently get all unique values
    // This bypasses the 1000 record limit because we're not fetching rows, just distinct values
    const { data, error } = await supabase
      .rpc('get_distinct_muscle_groups');
    
    if (error) {
      console.error('Error fetching muscle groups:', error);
      // Try fallback query if the RPC doesn't exist
      return await getMuscleGroupsFallback();
    }
    
    const processedData = processDistinctValues(data);
    
    // Log the result for debugging
    console.log(`Found ${processedData.length} unique muscle groups/categories`);
    
    // Convert to Muscle objects
    return processedData.map((name) => ({
      name
    }));
  } catch (error) {
    console.error('Error in getMuscleGroups:', error);
    return await getMuscleGroupsFallback();
  }
};

/**
 * Fallback method to get muscle groups if the RPC method fails
 */
const getMuscleGroupsFallback = async (): Promise<Muscle[]> => {
  try {
    // Use all the possible fields that could contain muscle groups
    const fields = ['primary_muscle_group', 'body_part', 'target'];
    const uniqueValues = new Set<string>();
    
    // Query each field individually to avoid the 1000 record limit
    for (const field of fields) {
      const { data, error } = await supabase
        .from('exercises')
        .select(field)
        .not(field, 'is', null)
        .limit(10000);  // Set a very high limit
      
      if (error) {
        console.error(`Error fetching ${field}:`, error);
        continue;
      }
      
      // Add unique values to our set
      data.forEach(item => {
        const value = item[field as keyof typeof item];
        if (value && typeof value === 'string') {
          uniqueValues.add(value.trim());
        }
      });
    }
    
    // Convert to array, sort and map to Muscle objects
    const sortedValues = Array.from(uniqueValues).sort();
    console.log(`Fallback method found ${sortedValues.length} unique muscle groups/categories`);
    
    return sortedValues.map((name) => ({
      name
    }));
  } catch (error) {
    console.error('Error in getMuscleGroupsFallback:', error);
    return [];
  }
};

/**
 * Get all available gender options
 */
export const getGenderOptions = async (): Promise<string[]> => {
  try {
    // Use the RPC function for efficient retrieval
    const { data, error } = await supabase
      .rpc('get_distinct_gender');
    
    if (error) {
      console.error('Error fetching gender options:', error);
      // Try fallback query if the RPC doesn't exist
      return await getGenderOptionsFallback();
    }
    
    const processedData = processDistinctValues(data);
    
    // Get unique values
    const uniqueGenders = [...new Set(processedData)].sort();
    
    // Always include male/female even if not in database
    if (!uniqueGenders.includes('Male')) uniqueGenders.push('Male');
    if (!uniqueGenders.includes('Female')) uniqueGenders.push('Female');
    
    console.log(`Found ${uniqueGenders.length} unique gender options`);
    return uniqueGenders;
  } catch (error) {
    console.error('Error in getGenderOptions:', error);
    return await getGenderOptionsFallback();
  }
};

/**
 * Fallback method to get gender options if the RPC method fails
 */
const getGenderOptionsFallback = async (): Promise<string[]> => {
  try {
    // First check if the gender field exists with a test query
    const { data: genderTest, error: testError } = await supabase
      .from('exercises')
      .select('gender')
      .not('gender', 'is', null)
      .limit(1);
      
    if (testError || !genderTest || genderTest.length === 0) {
      console.log('No explicit gender field found, returning default options');
      // Return default options if there's no gender field
      return ['Male', 'Female'];
    }
    
    // Get all gender values if the field exists
    const { data, error } = await supabase
      .from('exercises')
      .select('gender')
      .not('gender', 'is', null)
      .limit(10000); // Very high limit
    
    if (error) {
      console.error('Error fetching gender options:', error);
      return ['Male', 'Female']; // Return defaults on error
    }
    
    // Extract and process gender values
    const processedValues = data
      .map(item => item.gender)
      .filter(Boolean)
      .map(item => typeof item === 'string' ? item.trim() : String(item).trim());
    
    // Get unique values
    const uniqueGenders = [...new Set(processedValues)].sort();
    
    // Always include male/female even if not in database
    if (!uniqueGenders.includes('Male')) uniqueGenders.push('Male');
    if (!uniqueGenders.includes('Female')) uniqueGenders.push('Female');
    
    console.log(`Fallback method found ${uniqueGenders.length} unique gender options`);
    return uniqueGenders;
  } catch (error) {
    console.error('Error in getGenderOptionsFallback:', error);
    return ['Male', 'Female']; // Return defaults on error
  }
};

/**
 * Get all exercise categories (body parts)
 */
export const getCategories = async (): Promise<ExerciseCategory[]> => {
  try {
    // Use a direct SQL query with DISTINCT to efficiently get all unique values
    const { data, error } = await supabase
      .rpc('get_distinct_categories');
    
    if (error) {
      console.error('Error fetching categories:', error);
      // Try fallback query if the RPC doesn't exist
      return await getCategoriesFallback();
    }
    
    // Safety check and conversion for the data
    const safeData: string[] = Array.isArray(data) 
      ? data.map(item => typeof item === 'string' ? item : String(item.value)) 
      : [];
    
    // Log the result for debugging
    console.log(`Found ${safeData.length} unique categories`);
    
    // Convert to ExerciseCategory objects
    return safeData.map((name, index) => ({
      id: index + 1,
      name
    }));
  } catch (error) {
    console.error('Error in getCategories:', error);
    return await getCategoriesFallback();
  }
};

/**
 * Fallback method to get categories if the RPC method fails
 */
const getCategoriesFallback = async (): Promise<ExerciseCategory[]> => {
  try {
    // Use a direct query on body_part with a high limit
    const { data, error } = await supabase
      .from('exercises')
      .select('target')
      .not('target', 'is', null)
      .limit(10000);  // Set a very high limit
    
    if (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
    
    // Extract unique category names
    const uniqueCategories = [...new Set(
      data.map(item => item.target)
        .filter(Boolean)
        .map(item => typeof item === 'string' ? item.trim() : String(item).trim())
    )].sort();
    
    console.log(`Fallback method found ${uniqueCategories.length} unique categories`);
    
    // Convert to ExerciseCategory objects
    return uniqueCategories.map((name, index) => ({
      id: index + 1,
      name
    }));
  } catch (error) {
    console.error('Error in getCategoriesFallback:', error);
    return [];
  }
};

/**
 * Search exercises from our database
 */
export const searchExercises = async (
  query: string,
  page: number = 1,
  perPage: number = 20,
  categoryFilter?: string | number | null,
  genderFilter?: string | null,
  equipmentFilter?: string | null
): Promise<PaginatedResponse<Exercise>> => {
  try {
    console.log('Database search started with parameters:', { 
      query, 
      page, 
      perPage, 
      categoryFilter,
      genderFilter,
      equipmentFilter
    });
    
    // First, do a simple check to see if the database is accessible and has data
    const { count: tableCount, error: countError } = await supabase
      .from('exercises')
      .select('*', { count: 'exact', head: true });
      
    if (countError) {
      console.error('Error accessing exercises table:', countError);
    } else {
      console.log(`Exercises table access check: table contains approximately ${tableCount} records`);
    }
    
    const offset = (page - 1) * perPage;
    
    // Start building the query
    let dbQuery = supabase
      .from('exercises')
      .select('*', { count: 'exact' });
    
    // Add search condition if query is provided
    if (query && query.trim() !== '') {
      dbQuery = dbQuery.ilike('name', `%${query}%`);
    }
    
    // Add category/muscle filter if provided
    if (categoryFilter) {
      if (typeof categoryFilter === 'string') {
        // Filter by body_part, primary_muscle_group, or target fields
        dbQuery = dbQuery.or(`body_part.eq.${categoryFilter},primary_muscle_group.eq.${categoryFilter},target.eq.${categoryFilter}`);
      } else if (typeof categoryFilter === 'number') {
        // Get the category name first
        const { data: categories } = await supabase
          .from('exercises')
          .select('primary_muscle_group')
          .eq('id', categoryFilter)
          .limit(1);
          
        // Fix: Safely check if categories exists and has elements before accessing
        if (categories && categories.length > 0) {
          console.log('Category filter found:', categories[0]?.primary_muscle_group);
          
          if (categories[0]?.primary_muscle_group) {
            dbQuery = dbQuery.eq('primary_muscle_group', categories[0].primary_muscle_group);
          }
        }
      }
    }
    
    // Add gender filter if provided
    if (genderFilter) {
      // Instead of using clone(), which doesn't exist, just do a separate query
      // to check if the gender field exists and has values
      try {
        const { data: genderCheck, error: genderCheckError } = await supabase
          .from('exercises')
          .select('gender')
          .not('gender', 'is', null)
          .limit(1);
          
        if (!genderCheckError && genderCheck && genderCheck.length > 0) {
          // Gender field exists and has values, use it for filtering
          console.log('Using gender field for filtering', genderFilter);
          dbQuery = dbQuery.eq('gender', genderFilter);
        } else {
          // Fall back to filtering by name containing 'female' or 'male'
          console.log('Falling back to name-based gender filtering');
          if (genderFilter.toLowerCase() === 'female') {
            dbQuery = dbQuery.ilike('name', '%Female%');
          } else if (genderFilter.toLowerCase() === 'male') {
            // Exclude female exercises for male filter
            dbQuery = dbQuery.not('name', 'ilike', '%Female%');
          }
        }
      } catch (err) {
        console.error('Error checking gender field:', err);
        // Fallback to name-based filtering
        if (genderFilter.toLowerCase() === 'female') {
          dbQuery = dbQuery.ilike('name', '%Female%');
        } else if (genderFilter.toLowerCase() === 'male') {
          dbQuery = dbQuery.not('name', 'ilike', '%Female%');
        }
      }
    }
    
    // Add equipment filter if provided
    if (equipmentFilter) {
      dbQuery = dbQuery.eq('equipment', equipmentFilter);
    }
    
    // Apply pagination
    dbQuery = dbQuery
      .range(offset, offset + perPage - 1)
      .order('name');
    
    // Log query details in a more useful format
    console.log('Database query details:', {
      table: 'exercises',
      filters: {
        searchTerm: query && query.trim() !== '' ? `name ilike '%${query}%'` : 'none',
        categoryFilter: categoryFilter || 'none',
        genderFilter: genderFilter || 'none',
        equipmentFilter: equipmentFilter || 'none'
      },
      pagination: {
        range: [offset, offset + perPage - 1],
        page,
        perPage
      }
    });
    
    // Execute the query
    const { data, error, count } = await dbQuery;
    
    // Improved error logging
    if (error) {
      console.error('Error searching exercises:', error);
      console.error('Query parameters:', { query, page, perPage, categoryFilter, genderFilter, equipmentFilter, offset });
      return {
        count: 0,
        next: null,
        previous: null,
        results: []
      };
    }
    
    // Log the raw response data
    console.log('Raw database response:', { 
      count, 
      dataLength: data?.length || 0, 
      firstRecord: data && data.length > 0 ? data[0] : null 
    });
    
    // Check if data is valid
    if (!data || !Array.isArray(data)) {
      console.error('Invalid data format received from database:', data);
      return {
        count: 0,
        next: null,
        previous: null,
        results: []
      };
    }
    
    // Format the results
    const exercises = data.map(formatExerciseFromDb);
    
    // Calculate pagination info
    const totalCount = count || exercises.length;
    const hasNext = offset + perPage < totalCount;
    const hasPrevious = page > 1;
    
    const result = {
      count: totalCount,
      next: hasNext ? `/exercises?page=${page + 1}&per_page=${perPage}` : null,
      previous: hasPrevious ? `/exercises?page=${page - 1}&per_page=${perPage}` : null,
      results: exercises
    };
    
    console.log('Search results:', { count: result.count, hasNext, resultCount: exercises.length });
    
    return result;
  } catch (error) {
    console.error('Exception in searchExercises:', error);
    return {
      count: 0,
      next: null,
      previous: null,
      results: []
    };
  }
};

/**
 * Get exercise by ID
 */
export const getExerciseById = async (id: string | number): Promise<Exercise | null> => {
  try {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) {
      console.error(`Error fetching exercise with ID ${id}:`, error);
      return null;
    }
    
    return formatExerciseFromDb(data);
  } catch (error) {
    console.error(`Error in getExerciseById for ID ${id}:`, error);
    return null;
  }
};

/**
 * Get exercises by muscle group
 */
export const getExercisesByMuscle = async (
  muscleGroup: string,
  page: number = 1,
  perPage: number = 20
): Promise<PaginatedResponse<Exercise>> => {
  try {
    const offset = (page - 1) * perPage;
    
    // Query exercises with this muscle as primary or in secondary muscle groups
    const { data, error, count } = await supabase
      .from('exercises')
      .select('*', { count: 'exact' })
      .or(`primary_muscle_group.eq.${muscleGroup},secondary_muscle_groups.cs.{${muscleGroup}}`)
      .range(offset, offset + perPage - 1)
      .order('name');
    
    if (error) {
      console.error(`Error fetching exercises by muscle ${muscleGroup}:`, error);
      return {
        count: 0,
        next: null,
        previous: null,
        results: []
      };
    }
    
    const exercises = data.map(formatExerciseFromDb);
    
    // Calculate pagination info
    const totalCount = count || exercises.length;
    const hasNext = offset + perPage < totalCount;
    const hasPrevious = page > 1;
    
    return {
      count: totalCount,
      next: hasNext ? `/exercises/muscle/${muscleGroup}?page=${page + 1}&per_page=${perPage}` : null,
      previous: hasPrevious ? `/exercises/muscle/${muscleGroup}?page=${page - 1}&per_page=${perPage}` : null,
      results: exercises
    };
  } catch (error) {
    console.error(`Error in getExercisesByMuscle for muscle ${muscleGroup}:`, error);
    return {
      count: 0,
      next: null,
      previous: null,
      results: []
    };
  }
};

/**
 * Get all equipment options
 */
export const getEquipmentOptions = async (): Promise<string[]> => {
  try {
    // Use a direct SQL query with DISTINCT to efficiently get all unique values
    const { data, error } = await supabase
      .rpc('get_distinct_equipment');
    
    if (error) {
      console.error('Error fetching equipment options:', error);
      // Try fallback query if the RPC doesn't exist
      return await getEquipmentOptionsFallback();
    }
    
    const processedData = processDistinctValues(data);
    console.log(`Found ${processedData.length} unique equipment types`);
    return processedData;
  } catch (error) {
    console.error('Error in getEquipmentOptions:', error);
    return await getEquipmentOptionsFallback();
  }
};

/**
 * Fallback method to get equipment options if the RPC method fails
 */
const getEquipmentOptionsFallback = async (): Promise<string[]> => {
  try {
    // Use a direct query on equipment with a high limit
    const { data, error } = await supabase
      .from('exercises')
      .select('equipment')
      .not('equipment', 'is', null)
      .limit(10000);  // Set a very high limit
    
    if (error) {
      console.error('Error fetching equipment options:', error);
      return [];
    }
    
    // Extract unique equipment values
    const uniqueEquipment = [...new Set(
      data.map(item => item.equipment)
        .filter(Boolean)
        .map(item => typeof item === 'string' ? item.trim() : String(item).trim())
    )].sort();
    
    console.log(`Fallback method found ${uniqueEquipment.length} unique equipment types`);
    return uniqueEquipment;
  } catch (error) {
    console.error('Error in getEquipmentOptionsFallback:', error);
    return [];
  }
};

/**
 * Get exercises by IDs
 */
export const getExercisesByIds = async (ids: string[] | number[]): Promise<Exercise[]> => {
  try {
    if (ids.length === 0) return [];
    
    // Convert all IDs to strings for consistent comparison
    const stringIds = ids.map(id => id.toString());
    
    console.log(`Fetching ${stringIds.length} exercises by IDs:`, stringIds);
    
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .in('id', stringIds);
    
    if (error) {
      console.error('Error fetching exercises by IDs:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.warn(`No exercises found for IDs: ${stringIds.join(', ')}`);
      return [];
    }
    
    // Log how many exercises were found vs requested
    console.log(`Found ${data.length} exercises out of ${stringIds.length} requested IDs`);
    
    // Format the data and ensure muscle groups are properly processed
    const exercises = data.map(formatExerciseFromDb);
    
    return exercises;
  } catch (error) {
    console.error('Error in getExercisesByIds:', error);
    return [];
  }
};

/**
 * Get all exercises (with pagination)
 */
export const getAllExercises = async (
  page: number = 1,
  perPage: number = 20
): Promise<PaginatedResponse<Exercise>> => {
  try {
    const offset = (page - 1) * perPage;
    
    const { data, error, count } = await supabase
      .from('exercises')
      .select('*', { count: 'exact' })
      .range(offset, offset + perPage - 1)
      .order('name');
    
    if (error) {
      console.error('Error fetching all exercises:', error);
      return {
        count: 0,
        next: null,
        previous: null,
        results: []
      };
    }
    
    const exercises = data.map(formatExerciseFromDb);
    
    // Calculate pagination info
    const totalCount = count || exercises.length;
    const hasNext = offset + perPage < totalCount;
    const hasPrevious = page > 1;
    
    return {
      count: totalCount,
      next: hasNext ? `/exercises?page=${page + 1}&per_page=${perPage}` : null,
      previous: hasPrevious ? `/exercises?page=${page - 1}&per_page=${perPage}` : null,
      results: exercises
    };
  } catch (error) {
    console.error('Error in getAllExercises:', error);
    return {
      count: 0,
      next: null,
      previous: null,
      results: []
    };
  }
}; 