import axios from 'axios';
import { getProgramPrompts } from './openRouterService';

/**
 * Interface for program generation request
 */
export interface ProgramGenerationRequest {
  athleteData: {
    athleteId: string;
    gender: string;
    age: number;
    weight: number;
    height: number;
    bodyFat: number;
    experience: string; // Beginner, Intermediate, Advanced
    goal: string;
    trainingDays: number;
    sessionDuration: number;
    weeks: number;
    preferences: string;
    targetMuscleGroups: string[];
    availableEquipment: string[];
    injuryConsiderations: string;
  };
}

/**
 * Interface for exercise in AI response
 */
export interface AIExercise {
  name: string;
  sets: number;
  set_type: string;
  reps: string;
  rest_seconds: number;
  tempo: string;
  primary_muscle_group: string;
  secondary_muscle_group: string;
  large_muscle_group: string;
  equipment: string;
  notes: string;
}

/**
 * Interface for workout in AI response
 */
export interface AIWorkout {
  name: string;
  day_number: number;
  focus: string;
  exercises: AIExercise[];
  notes: string;
}

/**
 * Interface for week in AI response
 */
export interface AIWeek {
  week_number: number;
  workouts: AIWorkout[];
  notes: string;
}

/**
 * Interface for program in AI response
 */
export interface AIProgram {
  program_name: string;
  description: string;
  phase: string;
  fitness_level: string;
  total_weeks: number;
  days_per_week: number;
  weeks: AIWeek[];
  progression_strategy: string;
  deload_strategy: string;
  notes: string;
}

/**
 * Generate a workout program using OpenRouter.ai API
 * @param request The request containing athlete data and preferences
 * @returns Promise with the program or error
 */
export const generateProgram = async (
  request: ProgramGenerationRequest
): Promise<{ success: boolean; data?: AIProgram; error?: string }> => {
  try {
    console.log('Generating workout program prompt...');
    
    // Use the shared getProgramPrompts function to generate the prompts
    const { systemPrompt, userPrompt } = await getProgramPrompts({ 
      athleteData: {
        athleteId: request.athleteData.athleteId,
        gender: request.athleteData.gender,
        age: request.athleteData.age,
        weight: request.athleteData.weight,
        height: request.athleteData.height,
        bodyFat: request.athleteData.bodyFat,
        experience: request.athleteData.experience,
        goal: request.athleteData.goal,
        trainingDays: request.athleteData.trainingDays,
        sessionDuration: request.athleteData.sessionDuration,
        weeks: request.athleteData.weeks,
        preferences: request.athleteData.preferences,
        targetMuscleGroups: request.athleteData.targetMuscleGroups,
        availableEquipment: request.athleteData.availableEquipment,
        injuryConsiderations: request.athleteData.injuryConsiderations
      }
    });
    
    console.log('Prompt generated successfully');
    
    // Get the API key from environment variables
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenRouter API key is not defined in environment variables');
    }

    // Make the API request to OpenRouter
    console.log('Making API request to OpenRouter...');
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'google/gemini-2.5-pro-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin, // Required by OpenRouter
          'X-Title': 'ENG' // App name for OpenRouter stats
        },
        timeout: 300000 // 5 minutes in milliseconds
      }
    );

    // Parse the AI response
    const aiMessage = response.data.choices[0].message.content;
    
    console.log('AI Response:', aiMessage);
    
    // Extract JSON from the response (handle potential text before/after JSON)
    const jsonMatch = aiMessage.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in the AI response');
    }
    
    const programData = JSON.parse(jsonMatch[0]) as AIProgram;

    console.log('Program Data:', programData);
      
    return {
      success: true,
      data: programData
    };

  } catch (error: unknown) {
    console.error('Error generating workout program:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      // Specific error handling for timeout/abort errors
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (error.name === 'AbortError' || (error as any).code === 'ECONNABORTED') {
        return {
          success: false,
          error: 'The request timed out. The AI service took too long to respond. Please try again.'
        };
      }
      
      // Standard error with message
      return {
        success: false,
        error: error.message || 'Unknown error occurred while generating workout program'
      };
    } else {
      // Unknown error type
      return {
        success: false,
        error: 'Unknown error occurred while generating workout program'
      };
    }
  }
};
