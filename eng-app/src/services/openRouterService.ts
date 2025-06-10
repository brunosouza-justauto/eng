import { AthleteProfile } from '../components/ai/AthleteDataForm';
import { AthleteFormData } from '../components/ai/ProgramBuilderForm';
import { fetchAllExercises } from './exerciseMatchingService';

/**
 * Interface for meal plan generation request
 */
export interface MealPlanGenerationRequest {
  athleteData: AthleteProfile;
}

/**
 * Interface for meal food item in AI response
 */
export interface AIMealFoodItem {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * Interface for meal in AI response
 */
export interface AIMeal {
  name: string;
  time: string;
  foods: AIMealFoodItem[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  notes: string;
}

/**
 * Interface for day type in AI response
 */
export interface AIDayType {
  type: string;
  description: string;
  meals: AIMeal[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
}

/**
 * Interface for meal plan in AI response
 */
export interface AIMealPlan {
  plan_name: string;
  description: string;
  day_types: AIDayType[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  notes: string;
}

/**
 * Generates the system and user prompts for meal plan generation without making an API call
 */
export const getMealPlanPrompts = (request: MealPlanGenerationRequest): { systemPrompt: string; userPrompt: string } => {
  // Create the system prompt
  const systemPrompt = `You are a professional dietitian and sports nutritionist with expertise in creating personalized meal plans. Create a detailed diet plan with the following requirements:
    
    1. Output MUST be valid JSON following this structure: {
      "plan_name": string,
      "description": string,
      "day_types": [
        {
          "type": string, // e.g., "Training Day", "Rest Day"
          "description": string,
          "meals": [
            {
              "name": string, // e.g., "Breakfast", "Lunch", "Pre-Workout", "Post-Workout"
              "time": string, // e.g., "20:00"
              "foods": [
                {
                  "name": string,
                  "quantity": number,
                  "unit": string, // e.g., "g"
                  "calories": number,
                  "protein": number,
                  "carbs": number,
                  "fat": number,
                  "source": string // e.g., "ausnut", "usda", "openfoodfacts"
                  "brand": string // e.g., "Kellogg's", "General Mills", "Unbranded"
                  "notes": string
                }
              ],
              "total_calories": number, // e.g., "200"
              "total_protein": number, // e.g., "20"
              "total_carbs": number, // e.g., "20"
              "total_fat": number // e.g., "20",
              "notes": string // e.g., "Cook in a pan"
            }
          ],
          "total_calories": number, // e.g., "200"
          "total_protein": number, // e.g., "20"
          "total_carbs": number, // e.g., "20"
          "total_fat": number // e.g., "20"
        }
      ],
      "total_calories": number, // e.g., "200"
      "total_protein": number, // e.g., "20"
      "total_carbs": number, // e.g., "20"
      "total_fat": number, // e.g., "20"
      "notes": string
    }
    2. Stay within ±5 g protein / ±10 g carbs / ±3 g fat and ±50 kcal of the targets
    3. The macros decimal precision should be an integer
    4. Meal Time should be in 24h format
    5. All numeric values should be accurate and reasonable
    6. Units for all food items should always be in grams even for liquids, powders or small quantities
    7. Ensure daily macros match the proposed macros protein, carbs and fat provided stays within ±5 g protein / ±10 g carbs / ±3 g fat and ±50 kcal of the targets
    8. Ensure daily average calories between day types stays within ±5 g protein / ±10 g carbs / ±3 g fat and ±50 kcal of the targets
    9. Include at least two day types (e.g., General Training and Rest Day)
    10. Meals should be practical and follow the preferences given
    11. Make sure all foods are common and generally available
    12. The list of possible meal name is Breakfast, Lunch, Pre-Lunch, Pre-Dinner, Dinner, Pre-Workout, Post-Workout, Afternoon Snack, Snack
    13. Ensure pre-workout, post-workout and afternoon snack and snack contain only the following ingredients: 
    14. Ensure the ingredients picked goes well together forming a meal and the meal can be prepared in a simple way
    15. The ingredient lists are exhaustive (nothing else allowed) and you need to use the exact same name as described in the lists
    16. The meal notes attribute should contain any additional information about the meal like how to prepare it
    17. The primary database used is ausnut but could also be usda or openfoodfacts if the ingredient is not found in ausnut
    18. When possible add in the foods ingredient notes attribute a possible substitution for the ingredients like basa for cod or tilapia for tuna with the correct amount of calories, protein, carbs and fat for the same macronutrient profile
    19. Fields brand is optional; omit if not applicable
    20. Keep in mind food costs and try to keep it as low as possible
    21. Pre-workout nutrition should prioritize easily digestible carbohydrates and moderate protein, with minimal fat, especially when consumed close to exercise. This strategy helps maximize energy availability, support muscle performance, and minimize digestive discomfort

    Here is the list of ingredients that can be used:

    Breakfast:
    "Egg, chicken, whole, raw",
    "100% LIQUID EGG WHITES, PASTEURIZED EGG PRODUCT",
    "Oats, rolled, uncooked",
    "YoPRO High-Protein Plain yoghurt",
    "Quinoa, uncooked",
    "Bread, from wholemeal flour, extra grainy & seeds",
    "Mayver's protien + peanut butter",
    "Banana, cavendish, peeled, raw",
    "Blueberry, purchased frozen",
    "Strawberry, purchased frozen",
    "Raspberry, purchased frozen",
    "Papaya, raw",
    "Cheese, cottage"
    "Nut, almond, with skin, raw, unsalted"

    Lunch, Pre-Lunch, Pre-Dinner and Dinner:
    "Chicken, breast, lean flesh, grilled, no added fat",
    "Beef, rump steak, lean, grilled, no added fat",
    "Tuna, canned in brine, drained",
    "Basa (basa), fillet, baked, no added fat",
    "Turkey, ground",
    "Rice, white, boiled or rice cooker, no added salt",
    "Rice, brown, boiled, no added salt" for individuals with gluten intolerance or celiac disease or diabetes,
    "TOFU" for plant-based individuals,
    "Tempeh, cooked" for plant-based individuals,
    "Quinoa, uncooked",
    "Sweet potato, cooked, as ingredient",
    "Broccoli, fresh, boiled, drained",
    "Spinach, baby, fresh, raw",
    "Kale, raw or Kale, cooked, no added fat",
    "Capsicum, green, fresh, raw",
    "Asparagus, green, boiled, drained",
    "Baked beans, canned in tomato sauce, reduced salt",
    "Lentil, dried, boiled, drained"
    "Nut, almond, with skin, raw, unsalted"
    
    Pre-Workout, Post-Workout, afternoon Snack and Snack:
    "Banana, cavendish, peeled, raw",
    "Blueberry, purchased frozen",
    "Strawberry, purchased frozen",
    "Raspberry, purchased frozen",
    "Papaya, raw",
    "Apple, red skin, unpeeled, raw",
    "Egg, chicken, whole, raw",
    "Oats, rolled, uncooked",
    "YoPRO High-Protein Plain yoghurt",
    "Protein powder, whey based, protein >70%, unfortified",
    "Bread, from wholemeal flour, extra grainy & seeds",
    "Mayver's protien + peanut butter",
    "Rice, white, boiled or rice cooker, no added salt",
    "Chicken, breast, lean flesh, grilled, no added fat",
    "Turkey, ground",
    "Tuna, canned in brine, drained",
    "YoPRO High-Protein Plain yoghurt",
    "PROTEIN BAR",
    "Cheese, cottage"
    "Nut, almond, with skin, raw, unsalted"
    
    
    IMPORTANT: All mean plan description must contain the following:
    
    """
    📝 ADDITIONAL INFORMATION & GUIDELINES

    This is a "x" calories plan focused on "x".

    ⚠️ IMPORTANT REMINDERS:
    - Please read your plan carefully and reach out with any questions
    - If anything is unavailable, let us know and we'll provide alternatives.
    - Eat your pre-workout meal 🍽️ at least 45 minutes before training
    - Have your post-workout meal 🏋️‍♀️ within 1 hour of finishing your session
    - No skipping meals 🚫
    - No fruit juices 🧃, soft drinks 🥤, sauces or dressings unless approved

    🥦 VEGETABLE OPTIONS:
    You can swap the vegetables in your plan with any of the following:
    Broccoli, green beans, sugarsnap peas, spinach, asparagus, broccolini, edamame, eggplant, mushrooms, green capsicum
    (The greener, the better 💚)

    🍗 PROTEIN SWAPS:
    You can swap your protein source based on similar portions. Examples include:
    - 100g chicken breast 🍗
    - 80g extra lean beef mince 🥩
    - 110g basa fish 🐟
    - 100g tuna in springwater (drained) 🐟
    - Or any other lean and clean protein source (just ask for approval if unsure ✅)

    🍚 CARBOHYDRATE SWAPS:
    You can swap your carb source based on similar portions. Examples include:
    - 100g cooked white rice 🍚
    - 100g cooked pasta 🍝
    - 150g cooked quinoa 🍛
    - 50g rolled oats 🥣
    - 50g quinoa flakes 🥣
    - 165g cooked sweet potato 🍠
    (Always weigh carbs cooked unless your plan says otherwise!)

    🌿 FLAVOURING:
    - Cook with herbs & spices
    - No cooking oil unless specified
    - Add 2-3 cracks of Himalayan salt 🧂 to each meal

    💧 LIQUIDS:
    - Tea 🍵 and coffee ☕ are fine but no milk unless approved

    Let's go 💪
    """`;

  // Create the user prompt with the athlete data
  const userPrompt = `Create a diet plan for a "${request.athleteData.gender}" Age "${request.athleteData.age}", Current weight "${request.athleteData.weight_kg}", height "${request.athleteData.height_cm}" and current body fat at around "${request.athleteData.body_fat_percentage}%".
    The individual wants to "${request.athleteData.goal_type} (both means body recomposition, lose fat and gain muscle)", ${request.athleteData.goal_target_fat_loss_kg ? `lose "${request.athleteData.goal_target_fat_loss_kg}kg" of fat` : ''} ${request.athleteData.goal_target_muscle_gain_kg ? `and gain "${request.athleteData.goal_target_muscle_gain_kg}kg" of muscle` : ''}.
    And individual when asked wanted to achieve the following physique "${request.athleteData.goal_physique_details}".
    The individual will train "${request.athleteData.training_days_per_week}" times a week with a "${request.athleteData.training_current_program}" training program that would last about "${request.athleteData.training_session_length_minutes}" minutes to complete.
    The individual training experience is "${request.athleteData.experience_level}".
    It was assigned "${request.athleteData.step_goal}" daily steps to be complete.
    Lets propose a "${request.athleteData.meals_per_day}" meals a day, pick the right name according to the meal type and individual schedule such as wake up time, bed time and training time.
    The proposed macros is "${request.athleteData.calories_target}" calories per day type, where "${request.athleteData.protein_target}"g of Protein, "${request.athleteData.carbs_target}"g of carbs and "${request.athleteData.fat_target}"g of fat.
    ${request.athleteData.nutrition_preferences ? `The individual would like to see in their nutrition "${request.athleteData.nutrition_preferences}"` : ''}.
    ${request.athleteData.nutrition_allergies ? `The individual has the following allergies: "${request.athleteData.nutrition_allergies}"` : ''}
    The individual goes to bed at ${request.athleteData.nutrition_bed_time_of_day}, wakes up at ${request.athleteData.nutrition_wakeup_time_of_day} and works out (train) at ${request.athleteData.training_time_of_day}`;

  return { systemPrompt, userPrompt };
};

/**
 * Get workout program prompts without making an API call
 */
export const getProgramPrompts = async (request: { athleteData: AthleteFormData }): Promise<{ systemPrompt: string; userPrompt: string }> => {
  // First, fetch all exercises to include in the system prompt
  const allExercises = await fetchAllExercises();
  
  // Create a simplified list of exercises for the AI
  // Include only the key information needed to select appropriate exercises
  const exercisesSet = new Set();
  const exercisesList = allExercises.reduce((acc, ex) => {
    if (!exercisesSet.has(ex.name)) {
      exercisesSet.add(ex.name);
      acc.push({ name: ex.name });
    }
    return acc;
  }, [] as { name: string }[]);

  // Format exercises as a simple list to save tokens
  let exerciseListText = 'IMPORTANT: Use exercises from the following list whenever possible. These are the exercises available in our database:\n';
  
  for (const exercise of exercisesList) {
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
                  "set_type": string, // e.g., "regular", "drop_set", "superset"
                  "reps": string, // e.g., "8-12", "5"
                  "rest_seconds": number, // e.g., 120
                  "tempo": string, // e.g., "2-0-1-0"
                  "primary_muscle_group": string, // e.g., "Biceps Brachii"
                  "secondary_muscle_group": string, // e.g., "Triceps Brachii"
                  "large_muscle_group": string, // e.g., "Arms"
                  "equipment": string, // e.g., "Dumbbell"
                  "notes": string // e.g., "Warm-up: Start with 5-10 minutes of light cardio, perform dynamic stretches like arms circles and torso twists. Do a 2-3 warm-up sets. Variations: Use dumbbells instead of barbell for more control and stability. Replacements: Dumbbell Bench Press, Smith Machine Bench Press. Performance: Lie on a flat bench with feet flat on the ground. Keep elbows close to the body and control the movement. Focus on the chest and shoulder muscles."
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
    2. Return an array with one week object (week 1). Put the overview for the other weeks in the top-level description.
    3. All exercises must be practical, safe, and appropriate for the athlete's experience level
    4. Structure the program with appropriate volume and intensity progression
    5. In the program notes attribute, include detailed notes on programming considerations
    6. Match the program to the athlete's available equipment
    7. Target muscle groups means that the athlete is wanting to develop more this muscle group and has weakness in this muscle group
    8. While ensuring balanced development, focus on the target muscle groups and the athlete's weakness but also train all the other muscle groups
    9. Incorporate appropriate rest, intensity techniques, and periodization
    10. day_number must be between 1 and 7 equivalent to the day of the week like Monday is 1 and Sunday is 7
    11. If rest day is allowed in the program you must return the workout name as "Rest" and assign to the right day_number for example if a 5 day program is requested you must return 2 rest days
    12. Ensure to train each muscle group at least once a week
    13. Ensure to have enough exercises for each workout that would last the session duration to complete the workout
    14. Aim for 6 to 7 exercises per workout but also keep in mind the session duration to descide the number of sets for each exercise
    15. The workout duration should be finished in ${request.athleteData.sessionDuration} minutes at ~60s rest on isolations and 120-180s on compounds.
    16. Aim for 4-10 sets per large muscle group (Arms, Legs, Back, Chest, Glutes, Shoulders, Core) per week for beginner athletes;
    17. Aim for 12-20 sets per large muscle group (Arms, Legs, Back, Chest, Glutes, Shoulders, Core) per week for intermediate athletes;
    18. Aim for 20-30 sets per large muscle group (Arms, Legs, Back, Chest, Glutes, Shoulders, Core) per week for advanced athletes;
    19. For complex movements like squat or deadlift you should allow a bigger rest time compared to isolation exercises
    20. Keep in mind the athlete's injury considerations and avoid exercises that could aggravate the injury
    21. If superset is prescribed as the set type you must return 2 exercises entries, one for each superset exercise
    22. Ensure you have the exact same amount of workout days per week as the athlete requested, i.e. if "Available training days per week" is 5 you need to return 5 workout days (active sessions, rest does not count as workout day), that means you should return 5 workout plans and 2 rest days.
    23. Tempo should be difined as "2-0-1-0" for example
    24. The progression_strategy should follow a linear double-progression: add 1 rep per set until top of range reached, then +2.5 kg. Deload every 4 weeks (volume x0.6, intensity x0.85).
    25. rest_seconds must be an integer value such as 30, 60, 120, 180, etc.
    26. Only prescribe Resistance Band exercises if the athlete specifies in the list of "Available equipment"
    27. If the athlete specified "All Commercial Equipments" as the available equipment, prioritize the use of commercial equipments such as Dumbbell, Barbell, EZ Barbell, Smith machine, Cable, Leverage machine, etc.
    28. If the athlete specified "Bodyweight Only" as the available equipment, prioritize the use of "Body weight" exercises.
    29. If the athlete specified "Resistance Band Only" as the available equipment, prioritize the use of "Resistance Band" exercises.
    30. Make sure you DO NOT add comments such as // or /* in the JSON output.
    31. In each exercise notes attribute you MUST add how to warm up for it, and also most importantly possible replacements or variations for the exercise, you can also add any additional information about the exercise like how to perform it.
    32. For the warm-up routines you need to take into consideration the exercises already performed or to be performed and tailor the warm-up accordingly if required. 

    The possible list for the exercise equipment is the following:
    "Wheel roller",
    "Dumbbell",
    "Vibrate Plate",
    "Medicine Ball",
    "Smith machine",
    "Resistance Band",
    "Sled machine",
    "Weighted",
    "Rollball",
    "Battling Rope",
    "Suspension",
    "Body weight",
    "Roll",
    "Rope",
    "Bosu ball",
    "Assisted",
    "Stick",
    "Leverage machine",
    "Power Sled",
    "Trap bar",
    "Kettlebell",
    "Band",
    "Olympic barbell",
    "EZ Barbell",
    "Barbell",
    "Stability ball",
    "Cable",
    "Other"

    The list of possible set_type values is the following:
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

    The list of possible large_muscle_group values is the following:
    "Arms",
    "Legs",
    "Back",
    "Chest",
    "Glutes",
    "Shoulders",
    "Core"

    The list of possible primary_muscle_group values is the following:
    "Biceps Brachii",
    "Brachialis",
    "Calves",
    "Deltoid Anterior",
    "Deltoid Lateral",
    "Deltoid Posterior",
    "Forearms",
    "Glutes",
    "Hamstrings",
    "Hip Adductors",
    "Hip Flexors",
    "Latissimus Dorsi",
    "Lower Back",
    "Neck",
    "Obliques",
    "Pectoralis Major",
    "Quadriceps",
    "Rectus Abdominis",
    "Rhomboids",
    "Rotator Cuff",
    "Serratus Anterior",
    "Teres Major",
    "Transverse Abdominis",
    "Trapezius",
    "Triceps Brachii"

    The possible list for the large muscle group is the following:
    "Arms",
    "Legs",
    "Back",
    "Chest",
    "Glutes",
    "Shoulders",
    "Core"
    
    IMPORTANT: All workout program description must contain the following:
    
    """
    📝 ADDITIONAL INFORMATION & GUIDELINES

    🔥 [WORKOUT NAME]
    This programming is designed for ${request.athleteData.experience} athletes.

    🚀 Workout Guidelines
    - Warm-Up: 10 minutes (Stretching, Mobility, Treadmill incline, Stairmaster, or cardio of your choice)
    - Cool-Down: 5 minutes
    - Start each muscle group with 2 warm-up sets (light weight)
    - Control your movements
    - Lift slowly and with control (non-explosive)
    - Lower the weight slowly - no bouncing at the bottom
    - Train to failure means the reps should feel very very challenging
    - Increase weight when reps become too easy.
    - Use 75%-85% of your 1RM as a load guideline.
    - Unilateral exercises: rest before switching sides.

    📈 Tracking Progress
    Track your progress through strength gains, photos, and measurements - not just scale weight.

    💧 Hydration
    Drink 3-4L of water daily.

    😴 Recovery Tips
    Prioritize 7-9 hours of quality sleep per night.
    Add stretching/foam rolling post-session for better recovery.

    💬 Support & Customization
    Exercises can be modified at any time - just let us know the reason and we'll provide an alternative.
    Unsure about form? Send us a video for review. We'll help you improve and adjust as needed.
    For any questions, contact us before starting the program.

    Let's go! 💪
    """`;

  // Create the user prompt with the athlete data
  const userPrompt = `Create a workout program for a "${request.athleteData.gender}" Age "${request.athleteData.age}", Current weight "${request.athleteData.weight}kg", height "${request.athleteData.height}cm" and current body fat at around "${request.athleteData.bodyFat}%".
  Experience level: "${request.athleteData.experience}"
  Training goal: "${request.athleteData.goal}"
  Available training days per week: "${request.athleteData.trainingDays}"
  Session duration: "${request.athleteData.sessionDuration} minutes"
  Goal timeframe weeks: "${request.athleteData.weeks}"
  Target muscle groups: "${request.athleteData.targetMuscleGroups.join(', ')}"
  Available equipment: "${request.athleteData.availableEquipment.join(', ')}"
  Injury considerations: "${request.athleteData.injuryConsiderations}"
  Training preferences: "${request.athleteData.preferences}"`;

  return { systemPrompt, userPrompt };
};
