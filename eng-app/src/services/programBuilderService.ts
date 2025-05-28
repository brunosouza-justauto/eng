import axios from 'axios';

/**
 * Interface for program generation request
 */
export interface ProgramGenerationRequest {
  athleteData: {
    gender: string;
    age: number;
    weight: number;
    height: number;
    bodyFat: number;
    experience: string; // Beginner, Intermediate, Advanced
    goal: string;
    trainingDays: number;
    sessionDuration: number;
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
  target_muscle: string;
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
    // Create the system prompt
    const systemPrompt = `You are an expert strength coach specialized in creating personalized workout programs. Create a detailed program with the following requirements:
    1. Output MUST be valid JSON following this structure: {
      "program_name": string,
      "description": string,
      "phase": string, // e.g., "Hypertrophy", "Strength", "Cutting"
      "fitness_level": string, // "Beginner", "Intermediate", "Advanced"
      "total_weeks": number,
      "days_per_week": number,
      "weeks": [
        {
          "week_number": number,
          "workouts": [
            {
              "name": string, // e.g., "Push Day", "Full Body", "Upper Body"
              "day_number": number,
              "focus": string, // e.g., "Chest and Triceps", "Legs"
              "exercises": [
                {
                  "name": string,
                  "sets": number,
                  "set_type": string, // e.g., "Super Set", "Drop Set", "Regular"
                  "reps": string, // e.g., "8-12", "5"
                  "rest_seconds": number,
                  "tempo": string, // e.g., "2-0-1-0"
                  "target_muscle": string,
                  "equipment": string,
                  "notes": string
                }
              ],
              "notes": string
            }
          ],
          "notes": string
        }
      ],
      "progression_strategy": string,
      "deload_strategy": string,
      "notes": string
    }
    2. All exercises must be practical, safe, and appropriate for the athlete's experience level
    3. Structure the program with appropriate volume and intensity progression
    4. Include detailed notes on form, execution, and programming considerations
    5. Match the program to the athlete's available equipment
    6. Focus on the target muscle groups while ensuring balanced development
    7. Incorporate appropriate rest, intensity techniques, and periodization
    8. day_number must be between 1 and 7 equivalent to the day of the week like Monday is 1 and Sunday is 7
    9. If rest day is allowed in the program you must return the workout name as "Rest" and assign to the right day_number
    10. Ensure to have enough exercises for each workout that would last the session duration to complete the workout
    11. Ensure to train each muscle group at least once a week
    12. Aim for 18-20 sets per muscle group per week
    
    The possible list for the exercise equipment is the following:
    "Wheel roller"
    "Dumbbell"
    "Vibrate Plate"
    "Medicine Ball"
    "Smith machine"
    "Resistance Band"
    "Sled machine"
    "Weighted"
    "Rollball"
    "Battling Rope"
    "Suspension"
    "Body weight"
    "Roll"
    "Rope"
    "Bosu ball"
    "Assisted"
    "Stick"
    "Leverage machine"
    "Power Sled"
    "Trap bar"
    "Kettlebell"
    "Band"
    "Olympic barbell"
    "EZ Barbell"
    "Barbell"
    "Stability ball"
    "Cable"
    "Other"

    The possible list for the exercise set type is the following:
    "regular",
    "warm_up",
    "drop_set",
    "failure",
    "backdown",
    "tempo",
    "superset",
    "contrast",
    "complex",
    "cluster",
    "pyramid",
    "partial",
    "burns",
    "pause",
    "pulse",
    "negative",
    "forced_rep",
    "pre_exhaust",
    "post_exhaust"

    `;

    // Create the user prompt with the athlete data
    const userPrompt = `Create a workout program for a "${request.athleteData.gender}" Age "${request.athleteData.age}", Current weight "${request.athleteData.weight}kg", height "${request.athleteData.height}cm" and current body fat at around "${request.athleteData.bodyFat}%". 
    
Experience level: "${request.athleteData.experience}"
Training goal: "${request.athleteData.goal}"
Available training days per week: ${request.athleteData.trainingDays}
Session duration: ${request.athleteData.sessionDuration} minutes
Target muscle groups: ${request.athleteData.targetMuscleGroups.join(', ')}
Available equipment: ${request.athleteData.availableEquipment.join(', ')}
Injury considerations: ${request.athleteData.injuryConsiderations}
Training preferences: ${request.athleteData.preferences}`;

    console.log('User Prompt:', userPrompt);
    console.log('System Prompt:', systemPrompt);

    // Get the API key from environment variables
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenRouter API key is not defined in environment variables');
    }

    // Make the API request to OpenRouter
    try {
      console.log('Starting API request with timeout of 5 minutes');
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'openai/gpt-4o-mini', // Using Deepseek for structured output with reasoning
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 4000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': window.location.origin, // Required by OpenRouter
            'X-Title': 'ENG' // App name for OpenRouter stats
          }
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
  } catch (error) {
    console.error('Error generating workout program:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};
