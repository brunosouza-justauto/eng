import axios from 'axios';
import { AthleteProfile } from '../components/ai/AthleteDataForm';

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
 * Generate a meal plan using OpenRouter.ai API
 * @param request The request containing athlete data and preferences
 * @returns Promise with the meal plan or error
 */
export const generateMealPlan = async (
  request: MealPlanGenerationRequest
): Promise<{ success: boolean; data?: AIMealPlan; error?: string }> => {
  try {
    // Create the system prompt
    const systemPrompt = `You are a fitness nutritionist specialized bodybuilding. Create a detailed meal plan with the following requirements:
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
                  "fat": number
                }
              ],
              "total_calories": number,
              "total_protein": number,
              "total_carbs": number,
              "total_fat": number
            }
          ],
          "total_calories": number,
          "total_protein": number,
          "total_carbs": number,
          "total_fat": number
        }
      ],
      "total_calories": number,
      "total_protein": number,
      "total_carbs": number,
      "total_fat": number,
      "notes": string
    }
    2. Meal Time should be in 24h format
    3. All numeric values should be accurate and reasonable
    4. Units for all food items should be in grams
    5. Ensure daily macros match the proposed macros protein, carbs and fat provided as close as possible
    6. Ensure daily average calories between day types is close to the proposed calories provided
    7. Include at least two day types (e.g., General Training and Rest Day)
    8. Meals should be practical and follow the preferences given
    9. Make sure all foods are common and generally available
    10. Ensure breakfast contain only the following ingredients: "Egg, chicken, whole, raw", "100% LIQUID EGG WHITES, PASTEURIZED EGG PRODUCT", "Oats, rolled, uncooked", "YoPRO High-Protein Plain yoghurt", "Quinoa, uncooked", "Bread, from wholemeal flour, extra grainy & seeds", "Mayver's protien + peanut butter", ("Banana, cavendish, peeled, raw", "Blueberry, purchased frozen", "Strawberry, purchased frozen", "Raspberry, purchased frozen", "Papaya, raw"), "Cheese, cottage"
    11. Ensure lunch, pre-lunch, pre-dinner and dinner contain only the following ingredients: "Chicken, breast, lean flesh, grilled, no added fat", "Beef, rump steak, lean, grilled, no added fat", "Tuna, canned in brine, drained", "Bassa (basa), fillet, baked, no added fat", "Turkey, ground", "Rice, white, boiled or rice cooker, no added salt", ("TOFU", "Tempeh, cooked" for plant-based), "Quinoa, uncooked", "Sweet potato, cooked, as ingredient", "Broccoli, fresh, boiled, drained", "Spinach, baby, fresh, raw", "Kale, raw" or "Kale, cooked, no added fat", "Capsicum, green, fresh, raw", "Asparagus, green, boiled, drained", "Baked beans, canned in tomato sauce, reduced salt", "Lentil, dried, boiled, drained"
    12. Ensure pre-workout and post-workout contain only the following ingredients: ("Banana, cavendish, peeled, raw", "Blueberry, purchased frozen", "Strawberry, purchased frozen", "Raspberry, purchased frozen", "Papaya, raw"), "Apple, red skin, unpeeled, raw", "Egg, chicken, whole, raw", "Oats, rolled, uncooked", "YoPRO High-Protein Plain yoghurt", "Protein powder, whey based, protein >70%, unfortified", "Bread, from wholemeal flour, extra grainy & seeds", "Mayver's protien + peanut butter", "Rice, white, boiled or rice cooker, no added salt", "Chicken, breast, lean flesh, grilled, no added fat", "Turkey, ground", "Tuna, canned in brine, drained", "YoPRO High-Protein Plain yoghurt", "PROTEIN BAR", "Cheese, cottage"
    13. Ensure the ingredients picked goes well together forming a meal and the meal can be prepared in a simple way
    `;

    // Create the user prompt with the athlete data
    const userPrompt = `Create a diet plan for a "${request.athleteData.gender}" Age "${request.athleteData.age}", Current weight "${request.athleteData.weight_kg}", height "${request.athleteData.height_cm}" and current body fat at around "${request.athleteData.body_fat_percentage}%". The individual wants to "${request.athleteData.goal_type} (both means body recomposition, lose fat and gain muscle)", ${
      request.athleteData.goal_target_fat_loss_kg ? `lose "${request.athleteData.goal_target_fat_loss_kg}kg" of fat` : ''
    } ${
      request.athleteData.goal_target_muscle_gain_kg ? `and gain "${request.athleteData.goal_target_muscle_gain_kg}kg" of muscle` : ''
    }. And achieve the following physique "${request.athleteData.goal_physique_details}". The individual will train "${request.athleteData.training_days_per_week}x a week with a ${request.athleteData.training_current_program} training program that would last about ${request.athleteData.training_session_length_minutes} minutes to complete." It was assigned ${request.athleteData.step_goal} daily steps to be complete. Lets propose a "${request.athleteData.meals_per_day}" meals a day. The proposed macros is "${request.athleteData.calories_target}" calories per day type, where "${request.athleteData.protein_target}"g of Protein, "${request.athleteData.carbs_target}"g of carbs and "${request.athleteData.fat_target}"g of fat. The individual would like to see in their nutrition "${request.athleteData.nutrition_preferences}". ${ request.athleteData.nutrition_allergies ? `The individual has the following allergies: ${request.athleteData.nutrition_allergies}` : ''}`;

    // Get the API key from environment variables
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenRouter API key is not defined in environment variables');
    }

    // Make the API request to OpenRouter
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-4o-mini', // Using Claude for structured output
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 5000
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
    
    // Extract JSON from the response (handle potential text before/after JSON)
    const jsonMatch = aiMessage.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in the AI response');
    }
    
    const mealPlanData = JSON.parse(jsonMatch[0]) as AIMealPlan;
    
    return {
      success: true,
      data: mealPlanData
    };
  } catch (error) {
    console.error('Error generating meal plan:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};
