/**
 * Exercise Matching Service
 * 
 * This service handles matching AI-generated exercise names to exercises in our database
 * using a two-step approach:
 * 1. Preload all exercises from the database
 * 2. Match exercise names based on similarity and other criteria
 */

import { supabase } from './supabaseClient';

// Interface for the database exercise
export interface DbExercise {
  id: string;
  name: string;
  primary_muscle_group?: string;
  equipment?: string;
  target?: string;
  body_part?: string;
  description?: string;
  // Add other fields as needed
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 * Returns a value between 0 (completely different) and 1 (identical)
 */
export const calculateStringSimilarity = (str1: string, str2: string): number => {
  // If either string is empty, similarity is 0
  if (!str1.length || !str2.length) return 0;
  
  // If strings are identical, similarity is 1
  if (str1 === str2) return 1;
  
  // Create matrix for Levenshtein distance calculation
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];
  
  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  // Calculate Levenshtein distance
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  // Convert distance to similarity score (0 to 1)
  const maxLen = Math.max(len1, len2);
  return 1 - matrix[len1][len2] / maxLen;
};

/**
 * Standardize equipment names to match database terminology
 */
export const standardizeEquipment = (equipment: string): string => {
  if (!equipment) return '';
  
  const equipmentMap: Record<string, string> = {
    'Leverage Machine': 'Lever',
    'Olympic Barbell': 'Barbell',
    'Olympic Bar': 'Barbell',
    'Dumbbell': 'Dumbbell',
    'Cable': 'Cable',
    'Body weight': 'Bodyweight',
    'Medicine Ball': 'Medicine Ball',
    'Kettlebell': 'Kettlebell',
    'EZ Barbell': 'EZ Bar'
    // Add more mappings as needed
  };
  
  return equipmentMap[equipment] || equipment;
};

/**
 * Fetch all exercises from the database
 * This should be called once at the beginning of the program generation process
 * Uses pagination to fetch all exercises regardless of count
 */
export const fetchAllExercises = async (): Promise<DbExercise[]> => {
  try {
    // Use pagination to fetch all exercises
    let allExercises: DbExercise[] = [];
    let page = 0;
    const pageSize = 1000; // Max allowed per page
    let hasMoreData = true;
    
    console.log('Fetching all exercises using pagination...');
    
    while (hasMoreData) {
      console.log(`Fetching exercise page ${page + 1}...`);
      
      const { data, error } = await supabase
        .from('exercises')
        .select('id, name, primary_muscle_group, equipment, target, body_part, description')
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (error) {
        console.error(`Error fetching exercises on page ${page + 1}:`, error);
        break;
      }
      
      if (data && data.length > 0) {
        allExercises = [...allExercises, ...data];
        page++;
        
        // If we got less than a full page, we've reached the end
        if (data.length < pageSize) {
          hasMoreData = false;
        }
      } else {
        // No more data
        hasMoreData = false;
      }
    }
    
    console.log(`Total exercises fetched: ${allExercises.length}`);
    return allExercises;
  } catch (error) {
    console.error('Error in fetchAllExercises:', error);
    return [];
  }
};

/**
 * Match an exercise to the database based on name, muscle group, and equipment
 */
export const findBestExerciseMatch = (
  exerciseName: string,
  muscleGroup: string,
  equipment: string,
  allExercises: DbExercise[]
): DbExercise | null => {
  if (!exerciseName || !allExercises.length) return null;
  
  // Standardize equipment name
  const standardizedEquipment = standardizeEquipment(equipment);
  
  // First, try exact name matches
  const exactMatches = allExercises.filter(
    ex => ex.name.toLowerCase() === exerciseName.toLowerCase()
  );
  
  if (exactMatches.length > 0) {
    // If we have exact matches, prioritize those with matching muscle group and equipment
    const exactMatchWithAttributes = exactMatches.find(
      ex => {
        const matchesMuscleGroup = !muscleGroup || 
          (ex.primary_muscle_group?.toLowerCase().includes(muscleGroup.toLowerCase()));
          
        // Try to match both original and standardized equipment names
        const matchesEquipment = 
          (!equipment && !standardizedEquipment) || 
          (equipment && ex.equipment?.toLowerCase().includes(equipment.toLowerCase())) ||
          (standardizedEquipment && ex.equipment?.toLowerCase().includes(standardizedEquipment.toLowerCase()));
          
        return matchesMuscleGroup && matchesEquipment;
      }
    );
    
    if (exactMatchWithAttributes) return exactMatchWithAttributes;
    
    // If no exact match with attributes, return the first exact match by name
    return exactMatches[0];
  }
  
  // If no exact matches, score all exercises
  let bestMatch: DbExercise | null = null;
  let bestScore = 0;
  
  for (const exercise of allExercises) {
    let score = 0;
    
    // Name similarity (most important)
    const nameSimilarity = calculateStringSimilarity(
      exerciseName.toLowerCase(), 
      exercise.name.toLowerCase()
    );
    score += nameSimilarity * 10; // Weight name similarity heavily
    
    // Equipment match - try both original and standardized equipment names
    if (exercise.equipment) {
      if (equipment && exercise.equipment.toLowerCase().includes(equipment.toLowerCase())) {
        score += 3;
      } else if (standardizedEquipment && 
                exercise.equipment.toLowerCase().includes(standardizedEquipment.toLowerCase())) {
        score += 2.5; // Slightly lower score for standardized match
      }
    }
    
    // Primary muscle group match
    if (exercise.primary_muscle_group && muscleGroup &&
        exercise.primary_muscle_group.toLowerCase().includes(muscleGroup.toLowerCase())) {
      score += 5;
    } 
    // Target muscle match (secondary check)
    else if (exercise.target && muscleGroup &&
             exercise.target.toLowerCase().includes(muscleGroup.toLowerCase())) {
      score += 4;
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = exercise;
    }
  }
  
  // Only use the match if it has a reasonable score
  return bestScore >= 5 ? bestMatch : null;
};
