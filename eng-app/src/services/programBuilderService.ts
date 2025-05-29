import axios from 'axios';
import { fetchAllExercises } from './exerciseMatchingService';

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
    // First, fetch all exercises to include in the system prompt
    console.log('Fetching all exercises to include in AI prompt...');
    const allExercises = await fetchAllExercises();
    console.log(`Fetched ${allExercises.length} exercises for AI prompt`);
    
    // Create a simplified list of exercises for the AI
    // Include only the key information needed to select appropriate exercises
    const exercisesList = allExercises.map(ex => ({
      name: ex.name
    }));
    
    // Format exercises as a simple list to save tokens
    let exerciseListText = 'IMPORTANT: Use exercises from the following list whenever possible. These are the exercises available in our database:\n';
    // Take up to 100 exercises to keep token count manageable
    const limitedExerciseList = exercisesList.slice(0, 100);
    
    for (const exercise of limitedExerciseList) {
      exerciseListText += `"${exercise.name}"\n`;
    }
    
    // Create the system prompt
    const systemPrompt = `You are an expert strength coach specialized in creating personalized workout programs. Create a detailed program with the following requirements:
    
    ${exerciseListText}
    
    Only create new exercises if you cannot find a suitable match in the list above. When creating exercises, make sure to use appropriate muscle group names and equipment types.
    1. Output MUST be valid JSON following this structure: {
      "program_name": string,
      "description": string,
      "phase": string, // e.g., "Hypertrophy", "Strength", "Cutting", "Bulking", "Recomposition", "Maintenance"
      "fitness_level": string, // "Beginner", "Intermediate", "Advanced"
      "total_weeks": number,
      "days_per_week": number,
      "weeks": [
        {
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
                  "rest_seconds": number, // e.g., 120
                  "tempo": string, // e.g., "2-0-1-0"
                  "primary_muscle_group": string, // e.g., "Biceps Brachii"
                  "secondary_muscle_group": string, // e.g., "Triceps Brachii"
                  "large_muscle_group": string, // e.g., "Arms"
                  "equipment": string, // e.g., "Dumbbell"
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
    2. Only generate week 1 and add the notes for the other weeks in the description such as deload week or progression information
    2. All exercises must be practical, safe, and appropriate for the athlete's experience level
    3. Structure the program with appropriate volume and intensity progression
    4. Include detailed notes on form, execution, and programming considerations
    5. Match the program to the athlete's available equipment
    6. Target muscle groups means that the athlete is wanting to develop more this muscle group and has weakness in this muscle group
    7. While ensuring balanced development, focus on the target muscle groups and the athlete's weakness but also train all the other muscle groups
    8. Incorporate appropriate rest, intensity techniques, and periodization
    9. day_number must be between 1 and 7 equivalent to the day of the week like Monday is 1 and Sunday is 7
    10. If rest day is allowed in the program you must return the workout name as "Rest" and assign to the right day_number for example if a 5 day program is requested you must return 2 rest days
    11. Ensure to train each muscle group at least once a week
    12. Ensure to have enough exercises for each workout that would last the session duration to complete the workout
    13. Aim for 6 to 7 exercises per workout but also keep in mind the session duration to descide the number of sets for each exercise
    14. Aim for 4-10 sets per large muscle group (Arms, Legs, Back, Chest, Glutes, Shoulders, Core) per week for beginner athletes
    14. Aim for 12-20 sets per large muscle group (Arms, Legs, Back, Chest, Glutes, Shoulders, Core) per week for intermediate athletes
    15. Aim for 20-30 sets per large muscle group (Arms, Legs, Back, Chest, Glutes, Shoulders, Core) per week for advanced athletes
    15. For complex movements like squat or deadlift you should allow a bigger rest time compared to isolation exercises
    16. Keep in mind the athlete's injury considerations and avoid exercises that could aggravate the injury
    17. If superset is selected as set type you must return 2 exercises for each superset
    18. Ensure you have the exact same amount of workout days per week as the athlete requested, i.e. if "Available training days per week" is 5 you need to return 5 workout days

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

    The possible list for the primary or secondary muscle group is the following:
    "Biceps Brachii"
    "Brachialis"
    "Calves"
    "Deltoid Anterior"
    "Deltoid Lateral"
    "Deltoid Posterior"
    "Forearms"
    "Glutes"
    "Hamstrings"
    "Hip Adductors"
    "Hip Flexors"
    "Latissimus Dorsi"
    "Lower Back"
    "Neck"
    "Obliques"
    "Pectoralis Major"
    "Quadriceps"
    "Rectus Abdominis"
    "Rhomboids"
    "Rotator Cuff"
    "Serratus Anterior"
    "Teres Major"
    "Transverse Abdominis"
    "Trapezius"
    "Triceps Brachii"

    The possible list for the large muscle group is the following:
    "Arms"
    "Legs"
    "Back"
    "Chest"
    "Glutes"
    "Shoulders"
    "Core"

    `;

    // Create the user prompt with the athlete data
    const userPrompt = `Create a workout program for a "${request.athleteData.gender}" Age "${request.athleteData.age}", Current weight "${request.athleteData.weight}kg", height "${request.athleteData.height}cm" and current body fat at around "${request.athleteData.bodyFat}%". 
    
Experience level: "${request.athleteData.experience}"
Training goal: "${request.athleteData.goal}"
Available training days per week: ${request.athleteData.trainingDays}
Session duration: ${request.athleteData.sessionDuration} minutes
Goal timeframe weeks: ${request.athleteData.weeks}
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
          model: 'google/gemini-2.5-pro-preview', // Using Deepseek for structured output with reasoning
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
  } catch (error) {
    console.error('Error generating workout program:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};
