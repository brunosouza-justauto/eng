import axios from 'axios';
import { getMealPlanPrompts } from './openRouterService';

import { AthleteProfile } from '../components/ai/AthleteDataForm';

/**
 * Interface for meal plan generation request
 */
export interface MealPlanGenerationRequest {
  athleteData: AthleteProfile;
}

/**
 * Interface for meal in AI response
 */
export interface AIMeal {
  name: string;
  time: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  foods: {
    name: string;
    portion: string;
    quantity: number;
    unit: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }[];
  notes: string;
}

/**
 * Interface for day type in AI response
 */
export interface AIDayType {
  type: string;
  description: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  meals: AIMeal[];
  notes: string;
}

/**
 * Interface for meal plan in AI response
 */
export interface AIMealPlan {
  plan_name: string;
  description: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  day_types: AIDayType[];
  weekly_schedule: {
    day: string;
    day_type: string;
  }[];
  progression_strategy: string;
  notes: string;
}

/**
 * Generate a meal plan using OpenRouter.ai API
 * @param request The request containing athlete data and preferences
 * @returns Promise with the meal plan or error
 */
export const generateMealPlan = async (
  request: MealPlanGenerationRequest
): Promise<{ success: boolean; data?: AIMealPlan; error?: string }> => {
  try {
    console.log('Generating meal plan prompt...');
    
    // Use the shared getMealPlanPrompts function to generate the prompts
    // The getMealPlanPrompts expects the data in the right format already from AthleteProfile
    const { systemPrompt, userPrompt } = getMealPlanPrompts({ 
      athleteData: request.athleteData
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
    
    const mealPlanData = JSON.parse(jsonMatch[0]) as AIMealPlan;

    console.log('Meal Plan Data:', mealPlanData);
      
    return {
      success: true,
      data: mealPlanData
    };

  } catch (error: unknown) {
    console.error('Error generating meal plan:', error);
    
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
        error: error.message || 'Unknown error occurred while generating meal plan'
      };
    } else {
      // Unknown error type
      return {
        success: false,
        error: 'Unknown error occurred while generating meal plan'
      };
    }
  }
};
