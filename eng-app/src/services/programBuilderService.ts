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
    // Create the system prompt
    const systemPrompt = `You are an expert strength coach specialized in creating personalized workout programs. Create a detailed program with the following requirements:
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
    14. Aim for 18-20 sets per large muscle group (Arms, Legs, Back, Chest, Glutes, Shoulders, Core) per week.
    15. For complex movements like squat or deadlift you should allow a bigger rest time compared to isolation exercises
    16. Keep in mind the athlete's injury considerations and avoid exercises that could aggravate the injury
    17. If superset is selected as set type you must return 2 exercises for each superset

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
      /*const response = await axios.post(
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
      */

      // Parse the AI response
      //const aiMessage = response.data.choices[0].message.content;
      const aiMessage = `{
        "program_name": "Body Recomposition Protocol - 5 Day Split",
        "description": "A comprehensive 5-day training program designed for simultaneous muscle building and fat loss, emphasizing compound movements with strategic isolation work for optimal body recomposition in intermediate trainees.",
        "phase": "Body Recomposition",
        "fitness_level": "Intermediate",
        "total_weeks": 8,
        "days_per_week": 5,
        "weeks": [
          {
            "week_number": 1,
            "workouts": [
              {
                "name": "Upper Body Push",
                "day_number": 1,
                "focus": "Chest, Shoulders, and Triceps",
                "exercises": [
                  {
                    "name": "Barbell Bench Press",
                    "sets": 4,
                    "set_type": "regular",
                    "reps": "6-8",
                    "rest_seconds": 180,
                    "tempo": "2-1-1-1",
                    "primary_muscle_group": "Pectoralis Major",
                    "secondary_muscle_group": "Triceps Brachii",
                    "large_muscle_group": "Chest",
                    "equipment": "Olympic barbell",
                    "notes": "Focus on controlled descent and explosive press. Maintain tight core and leg drive."
                  },
                  {
                    "name": "Overhead Press",
                    "sets": 4,
                    "set_type": "regular",
                    "reps": "8-10",
                    "rest_seconds": 150,
                    "tempo": "2-0-1-1",
                    "primary_muscle_group": "Deltoid Anterior",
                    "secondary_muscle_group": "Deltoid Lateral",
                    "large_muscle_group": "Shoulders",
                    "equipment": "Olympic barbell",
                    "notes": "Keep core tight, avoid excessive back arch. Press straight up and slightly back."
                  },
                  {
                    "name": "Incline Dumbbell Press",
                    "sets": 3,
                    "set_type": "regular",
                    "reps": "10-12",
                    "rest_seconds": 120,
                    "tempo": "2-1-1-1",
                    "primary_muscle_group": "Pectoralis Major",
                    "secondary_muscle_group": "Deltoid Anterior",
                    "large_muscle_group": "Chest",
                    "equipment": "Dumbbell",
                    "notes": "45-degree incline. Focus on full range of motion and squeeze at the top."
                  },
                  {
                    "name": "Lateral Raises",
                    "sets": 3,
                    "set_type": "regular",
                    "reps": "12-15",
                    "rest_seconds": 90,
                    "tempo": "2-1-2-1",
                    "primary_muscle_group": "Deltoid Lateral",
                    "secondary_muscle_group": "Deltoid Anterior",
                    "large_muscle_group": "Shoulders",
                    "equipment": "Dumbbell",
                    "notes": "Slight forward lean, lead with pinkies, control the negative."
                  },
                  {
                    "name": "Close-Grip Bench Press",
                    "sets": 3,
                    "set_type": "regular",
                    "reps": "10-12",
                    "rest_seconds": 120,
                    "tempo": "2-1-1-1",
                    "primary_muscle_group": "Triceps Brachii",
                    "secondary_muscle_group": "Pectoralis Major",
                    "large_muscle_group": "Arms",
                    "equipment": "Olympic barbell",
                    "notes": "Hands shoulder-width apart, elbows tucked, focus on tricep engagement."
                  },
                  {
                    "name": "Cable Lateral Raises",
                    "sets": 3,
                    "set_type": "drop_set",
                    "reps": "12-15",
                    "rest_seconds": 90,
                    "tempo": "2-1-2-1",
                    "primary_muscle_group": "Deltoid Lateral",
                    "secondary_muscle_group": "Deltoid Posterior",
                    "large_muscle_group": "Shoulders",
                    "equipment": "Cable",
                    "notes": "Drop set on final set. Maintain constant tension throughout range."
                  },
                  {
                    "name": "Overhead Tricep Extension",
                    "sets": 3,
                    "set_type": "regular",
                    "reps": "12-15",
                    "rest_seconds": 90,
                    "tempo": "2-1-2-1",
                    "primary_muscle_group": "Triceps Brachii",
                    "secondary_muscle_group": "Deltoid Anterior",
                    "large_muscle_group": "Arms",
                    "equipment": "Cable",
                    "notes": "Keep elbows stationary, full stretch at bottom, squeeze at contraction."
                  }
                ],
                "notes": "Focus on progressive overload. Increase weight when you can complete all reps with 2 RIR."
              },
              {
                "name": "Lower Body",
                "day_number": 2,
                "focus": "Legs, Glutes, and Core",
                "exercises": [
                  {
                    "name": "Back Squat",
                    "sets": 4,
                    "set_type": "regular",
                    "reps": "6-8",
                    "rest_seconds": 180,
                    "tempo": "2-1-1-1",
                    "primary_muscle_group": "Quadriceps",
                    "secondary_muscle_group": "Glutes",
                    "large_muscle_group": "Legs",
                    "equipment": "Olympic barbell",
                    "notes": "Full depth squat, chest up, knees track over toes. Drive through heels."
                  },
                  {
                    "name": "Romanian Deadlift",
                    "sets": 4,
                    "set_type": "regular",
                    "reps": "8-10",
                    "rest_seconds": 150,
                    "tempo": "3-1-1-1",
                    "primary_muscle_group": "Hamstrings",
                    "secondary_muscle_group": "Glutes",
                    "large_muscle_group": "Legs",
                    "equipment": "Olympic barbell",
                    "notes": "Hinge at hips, keep bar close to body, feel stretch in hamstrings."
                  },
                  {
                    "name": "Bulgarian Split Squats",
                    "sets": 3,
                    "set_type": "regular",
                    "reps": "10-12",
                    "rest_seconds": 120,
                    "tempo": "2-1-1-1",
                    "primary_muscle_group": "Quadriceps",
                    "secondary_muscle_group": "Glutes",
                    "large_muscle_group": "Legs",
                    "equipment": "Dumbbell",
                    "notes": "Each leg separately. Front foot does the work, maintain upright torso."
                  },
                  {
                    "name": "Hip Thrust",
                    "sets": 3,
                    "set_type": "regular",
                    "reps": "12-15",
                    "rest_seconds": 120,
                    "tempo": "2-1-2-1",
                    "primary_muscle_group": "Glutes",
                    "secondary_muscle_group": "Hamstrings",
                    "large_muscle_group": "Glutes",
                    "equipment": "Olympic barbell",
                    "notes": "Squeeze glutes at top, avoid overextending back. Focus on glute activation."
                  },
                  {
                    "name": "Walking Lunges",
                    "sets": 3,
                    "set_type": "regular",
                    "reps": "12-15",
                    "rest_seconds": 90,
                    "tempo": "2-1-1-1",
                    "primary_muscle_group": "Quadriceps",
                    "secondary_muscle_group": "Glutes",
                    "large_muscle_group": "Legs",
                    "equipment": "Dumbbell",
                    "notes": "Alternating legs. Step long enough for 90-degree angles in both knees."
                  },
                  {
                    "name": "Calf Raises",
                    "sets": 4,
                    "set_type": "regular",
                    "reps": "15-20",
                    "rest_seconds": 60,
                    "tempo": "2-1-2-1",
                    "primary_muscle_group": "Calves",
                    "secondary_muscle_group": "Calves",
                    "large_muscle_group": "Legs",
                    "equipment": "Dumbbell",
                    "notes": "Full range of motion, pause at top contraction."
                  },
                  {
                    "name": "Plank",
                    "sets": 3,
                    "set_type": "regular",
                    "reps": "45-60 seconds",
                    "rest_seconds": 60,
                    "tempo": "Static hold",
                    "primary_muscle_group": "Rectus Abdominis",
                    "secondary_muscle_group": "Transverse Abdominis",
                    "large_muscle_group": "Core",
                    "equipment": "Body weight",
                    "notes": "Maintain straight line from head to heels, breathe normally."
                  }
                ],
                "notes": "Emphasize proper form over heavy weight. Focus on mind-muscle connection."
              },
              {
                "name": "Upper Body Pull",
                "day_number": 3,
                "focus": "Back, Biceps, and Rear Delts",
                "exercises": [
                  {
                    "name": "Deadlift",
                    "sets": 4,
                    "set_type": "regular",
                    "reps": "5-6",
                    "rest_seconds": 180,
                    "tempo": "1-1-2-1",
                    "primary_muscle_group": "Lower Back",
                    "secondary_muscle_group": "Hamstrings",
                    "large_muscle_group": "Back",
                    "equipment": "Olympic barbell",
                    "notes": "Conventional stance. Keep bar close, chest up, drive through heels."
                  },
                  {
                    "name": "Pull-ups",
                    "sets": 4,
                    "set_type": "regular",
                    "reps": "8-10",
                    "rest_seconds": 150,
                    "tempo": "2-1-1-1",
                    "primary_muscle_group": "Latissimus Dorsi",
                    "secondary_muscle_group": "Biceps Brachii",
                    "large_muscle_group": "Back",
                    "equipment": "Body weight",
                    "notes": "Full range of motion, chest to bar. Use assistance if needed."
                  },
                  {
                    "name": "Barbell Rows",
                    "sets": 4,
                    "set_type": "regular",
                    "reps": "8-10",
                    "rest_seconds": 120,
                    "tempo": "2-1-1-1",
                    "primary_muscle_group": "Rhomboids",
                    "secondary_muscle_group": "Latissimus Dorsi",
                    "large_muscle_group": "Back",
                    "equipment": "Olympic barbell",
                    "notes": "Slight knee bend, pull to lower chest, squeeze shoulder blades."
                  },
                  {
                    "name": "Seated Cable Row",
                    "sets": 3,
                    "set_type": "regular",
                    "reps": "10-12",
                    "rest_seconds": 120,
                    "tempo": "2-1-2-1",
                    "primary_muscle_group": "Rhomboids",
                    "secondary_muscle_group": "Biceps Brachii",
                    "large_muscle_group": "Back",
                    "equipment": "Cable",
                    "notes": "Pull to lower chest, maintain upright posture, squeeze at contraction."
                  },
                  {
                    "name": "Face Pulls",
                    "sets": 3,
                    "set_type": "regular",
                    "reps": "12-15",
                    "rest_seconds": 90,
                    "tempo": "2-1-2-1",
                    "primary_muscle_group": "Deltoid Posterior",
                    "secondary_muscle_group": "Rhomboids",
                    "large_muscle_group": "Shoulders",
                    "equipment": "Cable",
                    "notes": "Pull to face level, external rotation at end range, focus on rear delts."
                  },
                  {
                    "name": "Barbell Curls",
                    "sets": 3,
                    "set_type": "regular",
                    "reps": "10-12",
                    "rest_seconds": 90,
                    "tempo": "2-1-2-1",
                    "primary_muscle_group": "Biceps Brachii",
                    "secondary_muscle_group": "Brachialis",
                    "large_muscle_group": "Arms",
                    "equipment": "EZ Barbell",
                    "notes": "Control the negative, avoid swinging, full range of motion."
                  },
                  {
                    "name": "Hammer Curls",
                    "sets": 3,
                    "set_type": "regular",
                    "reps": "12-15",
                    "rest_seconds": 90,
                    "tempo": "2-1-2-1",
                    "primary_muscle_group": "Brachialis",
                    "secondary_muscle_group": "Biceps Brachii",
                    "large_muscle_group": "Arms",
                    "equipment": "Dumbbell",
                    "notes": "Neutral grip throughout, control both phases of the movement."
                  }
                ],
                "notes": "Focus on feeling the back muscles working. Avoid using momentum."
              },
              {
                "name": "Rest",
                "day_number": 4,
                "focus": "Recovery",
                "exercises": [],
                "notes": "Complete rest day. Focus on hydration, nutrition, and sleep quality."
              },
              {
                "name": "Push/Pull Combination",
                "day_number": 5,
                "focus": "Full Upper Body with Core",
                "exercises": [
                  {
                    "name": "Dumbbell Bench Press",
                    "sets": 4,
                    "set_type": "regular",
                    "reps": "8-10",
                    "rest_seconds": 150,
                    "tempo": "2-1-1-1",
                    "primary_muscle_group": "Pectoralis Major",
                    "secondary_muscle_group": "Triceps Brachii",
                    "large_muscle_group": "Chest",
                    "equipment": "Dumbbell",
                    "notes": "Greater range of motion than barbell. Focus on stretch and contraction."
                  },
                  {
                    "name": "Lat Pulldown",
                    "sets": 4,
                    "set_type": "regular",
                    "reps": "10-12",
                    "rest_seconds": 120,
                    "tempo": "2-1-2-1",
                    "primary_muscle_group": "Latissimus Dorsi",
                    "secondary_muscle_group": "Biceps Brachii",
                    "large_muscle_group": "Back",
                    "equipment": "Cable",
                    "notes": "Pull to upper chest, lean back slightly, focus on lat engagement."
                  },
                  {
                    "name": "Dumbbell Shoulder Press",
                    "sets": 3,
                    "set_type": "regular",
                    "reps": "10-12",
                    "rest_seconds": 120,
                    "tempo": "2-1-1-1",
                    "primary_muscle_group": "Deltoid Anterior",
                    "secondary_muscle_group": "Triceps Brachii",
                    "large_muscle_group": "Shoulders",
                    "equipment": "Dumbbell",
                    "notes": "Seated or standing. Press straight up, avoid arching back excessively."
                  },
                  {
                    "name": "Cable Reverse Fly",
                    "sets": 3,
                    "set_type": "regular",
                    "reps": "12-15",
                    "rest_seconds": 90,
                    "tempo": "2-1-2-1",
                    "primary_muscle_group": "Deltoid Posterior",
                    "secondary_muscle_group": "Rhomboids",
                    "large_muscle_group": "Shoulders",
                    "equipment": "Cable",
                    "notes": "Slight forward lean, squeeze shoulder blades together."
                  },
                  {
                    "name": "Superset: Tricep Dips & Bicep Curls",
                    "sets": 3,
                    "set_type": "superset",
                    "reps": "10-12 each",
                    "rest_seconds": 120,
                    "tempo": "2-1-1-1",
                    "primary_muscle_group": "Triceps Brachii",
                    "secondary_muscle_group": "Biceps Brachii",
                    "large_muscle_group": "Arms",
                    "equipment": "Body weight",
                    "notes": "Perform dips immediately followed by curls. Rest after completing both."
                  },
                  {
                    "name": "Russian Twists",
                    "sets": 3,
                    "set_type": "regular",
                    "reps": "20-25",
                    "rest_seconds": 60,
                    "tempo": "1-1-1-1",
                    "primary_muscle_group": "Obliques",
                    "secondary_muscle_group": "Rectus Abdominis",
                    "large_muscle_group": "Core",
                    "equipment": "Medicine Ball",
                    "notes": "Lean back 45 degrees, feet off ground, twist side to side."
                  },
                  {
                    "name": "Neck Curls",
                    "sets": 2,
                    "set_type": "regular",
                    "reps": "15-20",
                    "rest_seconds": 60,
                    "tempo": "2-1-2-1",
                    "primary_muscle_group": "Neck",
                    "secondary_muscle_group": "Neck",
                    "large_muscle_group": "Neck",
                    "equipment": "Weighted",
                    "notes": "Light weight only. Forward and backward movements. Very controlled."
                  }
                ],
                "notes": "Combination day to hit all upper body muscles with moderate volume."
              },
              {
                "name": "Lower Body Power",
                "day_number": 6,
                "focus": "Legs, Glutes, and Core Strength",
                "exercises": [
                  {
                    "name": "Front Squat",
                    "sets": 4,
                    "set_type": "regular",
                    "reps": "6-8",
                    "rest_seconds": 180,
                    "tempo": "2-1-1-1",
                    "primary_muscle_group": "Quadriceps",
                    "secondary_muscle_group": "Glutes",
                    "large_muscle_group": "Legs",
                    "equipment": "Olympic barbell",
                    "notes": "More quad emphasis than back squat. Keep elbows high, chest up."
                  },
                  {
                    "name": "Stiff Leg Deadlift",
                    "sets": 4,
                    "set_type": "regular",
                    "reps": "8-10",
                    "rest_seconds": 150,
                    "tempo": "3-1-1-1",
                    "primary_muscle_group": "Hamstrings",
                    "secondary_muscle_group": "Lower Back",
                    "large_muscle_group": "Legs",
                    "equipment": "Dumbbell",
                    "notes": "Focus on hamstring stretch, keep legs relatively straight."
                  },
                  {
                    "name": "Leg Press",
                    "sets": 3,
                    "set_type": "regular",
                    "reps": "12-15",
                    "rest_seconds": 120,
                    "tempo": "2-1-1-1",
                    "primary_muscle_group": "Quadriceps",
                    "secondary_muscle_group": "Glutes",
                    "large_muscle_group": "Legs",
                    "equipment": "Leverage machine",
                    "notes": "Full range of motion, knees to chest, drive through heels."
                  },
                  {
                    "name": "Single Leg Hip Thrust",
                    "sets": 3,
                    "set_type": "regular",
                    "reps": "10-12",
                    "rest_seconds": 120,
                    "tempo": "2-1-2-1",
                    "primary_muscle_group": "Glutes",
                    "secondary_muscle_group": "Hamstrings",
                    "large_muscle_group": "Glutes",
                    "equipment": "Dumbbell",
                    "notes": "Each leg separately. Focus on glute squeeze at top."
                  },
                  {
                    "name": "Leg Curls",
                    "sets": 3,
                    "set_type": "regular",
                    "reps": "12-15",
                    "rest_seconds": 90,
                    "tempo": "2-1-2-1",
                    "primary_muscle_group": "Hamstrings",
                    "secondary_muscle_group": "Calves",
                    "large_muscle_group": "Legs",
                    "equipment": "Leverage machine",
                    "notes": "Lying or seated. Full range, squeeze hamstrings at contraction."
                  },
                  {
                    "name": "Standing Calf Raises",
                    "sets": 4,
                    "set_type": "regular",
                    "reps": "15-20",
                    "rest_seconds": 60,
                    "tempo": "2-1-2-1",
                    "primary_muscle_group": "Calves",
                    "secondary_muscle_group": "Calves",
                    "large_muscle_group": "Legs",
                    "equipment": "Leverage machine",
                    "notes": "Full stretch at bottom, hold contraction at top."
                  },
                  {
                    "name": "Dead Bug",
                    "sets": 3,
                    "set_type": "regular",
                    "reps": "10-12 each side",
                    "rest_seconds": 60,
                    "tempo": "2-1-2-1",
                    "primary_muscle_group": "Transverse Abdominis",
                    "secondary_muscle_group": "Rectus Abdominis",
                    "large_muscle_group": "Core",
                    "equipment": "Body weight",
                    "notes": "Maintain neutral spine, opposite arm and leg movements."
                  }
                ],
                "notes": "Focus on power and strength. Maintain proper form with heavier loads."
              },
              {
                "name": "Rest",
                "day_number": 7,
                "focus": "Recovery",
                "exercises": [],
                "notes": "Complete rest day. Consider light walking or stretching if desired."
              }
            ],
            "notes": "Week 1 serves as an introduction to the program. Focus on learning movement patterns and establishing baseline strength levels."
          }
        ],
        "progression_strategy": "Progressive overload through weight increases of 2.5-5% when all sets and reps are completed with 2 RIR (Reps In Reserve). Increase reps before increasing weight. Week 1-2: Focus on form and establishing baseline. Week 3-4: Increase intensity by 5-10%. Week 5-6: Peak intensity phase with 10-15% increase. Week 7: Deload week at 70% intensity. Week 8: Return to progressive loading with new baselines.",
        "deload_strategy": "Every 4th week, reduce training loads to 60-70% of previous week's working weights while maintaining movement quality and frequency. Focus on technique refinement, mobility work, and recovery. This prevents overreaching and allows for supercompensation.",
        "notes": "This program is designed for body recomposition - simultaneous muscle building and fat loss. Combine with a slight caloric deficit (300-500 calories below maintenance) and adequate protein intake (1.6-2.2g per kg bodyweight). Prioritize sleep (7-9 hours) and manage stress for optimal results. Track performance metrics and body composition changes rather than just scale weight. Adjust rest periods and loads based on recovery status. Consider adding 10-15 minutes of moderate cardio post-workout 2-3 times per week for enhanced fat loss."
      }`;
      
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
