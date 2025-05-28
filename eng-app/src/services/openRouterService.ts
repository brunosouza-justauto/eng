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

    console.log("userPrompt", userPrompt);
    //throw new Error("userPrompt");

    // Get the API key from environment variables
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenRouter API key is not defined in environment variables');
    }

    // Make the API request to OpenRouter
    /*const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'anthropic/claude-opus-4', // Using Claude for structured output
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
          'X-Title': 'ENG Meal Planner' // App name for OpenRouter stats
        }
      }
    );*/

    const response = {
        "data": {
            "id": "gen-1748395097-9EaY3dCVckar7MectO33",
            "provider": "Google",
            "model": "anthropic/claude-opus-4",
            "object": "chat.completion",
            "created": 1748395098,
            "choices": [
                {
                    "logprobs": null,
                    "finish_reason": "stop",
                    "native_finish_reason": "stop",
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": "```json\n{\n  \"plan_name\": \"Body Recomposition Plan - High Protein Low Fat\",\n  \"description\": \"A comprehensive nutrition plan designed for a 40-year-old male (85kg, 180cm, 10% body fat) aiming to lose 5kg fat and gain 10kg muscle through body recomposition. Optimized for 5x weekly PPL training with 10,000 daily steps.\",\n  \"day_types\": [\n    {\n      \"type\": \"Training Day\",\n      \"description\": \"Higher carbohydrate intake to fuel intense 90-minute PPL sessions\",\n      \"meals\": [\n        {\n          \"name\": \"Breakfast\",\n          \"time\": \"7:00 AM\",\n          \"foods\": [\n            {\n              \"name\": \"Egg, chicken, whole, raw\",\n              \"quantity\": 150,\n              \"unit\": \"g\",\n              \"calories\": 215,\n              \"protein\": 19,\n              \"carbs\": 1,\n              \"fat\": 14\n            },\n            {\n              \"name\": \"Oats, rolled, uncooked\",\n              \"quantity\": 100,\n              \"unit\": \"g\",\n              \"calories\": 379,\n              \"protein\": 13,\n              \"carbs\": 68,\n              \"fat\": 7\n            },\n            {\n              \"name\": \"Blueberry, purchased frozen\",\n              \"quantity\": 150,\n              \"unit\": \"g\",\n              \"calories\": 84,\n              \"protein\": 1,\n              \"carbs\": 20,\n              \"fat\": 1\n            },\n            {\n              \"name\": \"YoPRO High-Protein Plain yoghurt\",\n              \"quantity\": 200,\n              \"unit\": \"g\",\n              \"calories\": 140,\n              \"protein\": 30,\n              \"carbs\": 8,\n              \"fat\": 0\n            }\n          ],\n          \"total_calories\": 818,\n          \"total_protein\": 63,\n          \"total_carbs\": 97,\n          \"total_fat\": 22\n        },\n        {\n          \"name\": \"Lunch\",\n          \"time\": \"12:30 PM\",\n          \"foods\": [\n            {\n              \"name\": \"Chicken, breast, lean flesh, grilled, no added fat\",\n              \"quantity\": 200,\n              \"unit\": \"g\",\n              \"calories\": 330,\n              \"protein\": 62,\n              \"carbs\": 0,\n              \"fat\": 7\n            },\n            {\n              \"name\": \"Rice, white, boiled or rice cooker, no added salt\",\n              \"quantity\": 250,\n              \"unit\": \"g\",\n              \"calories\": 325,\n              \"protein\": 7,\n              \"carbs\": 72,\n              \"fat\": 1\n            },\n            {\n              \"name\": \"Broccoli, fresh, boiled, drained\",\n              \"quantity\": 200,\n              \"unit\": \"g\",\n              \"calories\": 70,\n              \"protein\": 6,\n              \"carbs\": 14,\n              \"fat\": 1\n            },\n            {\n              \"name\": \"Sweet potato, cooked, as ingredient\",\n              \"quantity\": 150,\n              \"unit\": \"g\",\n              \"calories\": 129,\n              \"protein\": 2,\n              \"carbs\": 30,\n              \"fat\": 0\n            }\n          ],\n          \"total_calories\": 854,\n          \"total_protein\": 77,\n          \"total_carbs\": 116,\n          \"total_fat\": 9\n        },\n        {\n          \"name\": \"Pre-Workout\",\n          \"time\": \"3:30 PM\",\n          \"foods\": [\n            {\n              \"name\": \"Banana, cavendish, peeled, raw\",\n              \"quantity\": 120,\n              \"unit\": \"g\",\n              \"calories\": 107,\n              \"protein\": 1,\n              \"carbs\": 27,\n              \"fat\": 0\n            },\n            {\n              \"name\": \"Bread, from wholemeal flour, extra grainy & seeds\",\n              \"quantity\": 80,\n              \"unit\": \"g\",\n              \"calories\": 216,\n              \"protein\": 10,\n              \"carbs\": 34,\n              \"fat\": 4\n            },\n            {\n              \"name\": \"Mayver's protien + peanut butter\",\n              \"quantity\": 30,\n              \"unit\": \"g\",\n              \"calories\": 180,\n              \"protein\": 9,\n              \"carbs\": 5,\n              \"fat\": 14\n            }\n          ],\n          \"total_calories\": 503,\n          \"total_protein\": 20,\n          \"total_carbs\": 66,\n          \"total_fat\": 18\n        },\n        {\n          \"name\": \"Post-Workout Dinner\",\n          \"time\": \"7:30 PM\",\n          \"foods\": [\n            {\n              \"name\": \"Beef, rump steak, lean, grilled, no added fat\",\n              \"quantity\": 250,\n              \"unit\": \"g\",\n              \"calories\": 425,\n              \"protein\": 65,\n              \"carbs\": 0,\n              \"fat\": 17\n            },\n            {\n              \"name\": \"Quinoa, uncooked\",\n              \"quantity\": 100,\n              \"unit\": \"g\",\n              \"calories\": 368,\n              \"protein\": 14,\n              \"carbs\": 64,\n              \"fat\": 6\n            },\n            {\n              \"name\": \"Spinach, baby, fresh, raw\",\n              \"quantity\": 100,\n              \"unit\": \"g\",\n              \"calories\": 23,\n              \"protein\": 3,\n              \"carbs\": 4,\n              \"fat\": 0\n            },\n            {\n              \"name\": \"Asparagus, green, boiled, drained\",\n              \"quantity\": 150,\n              \"unit\": \"g\",\n              \"calories\": 30,\n              \"protein\": 3,\n              \"carbs\": 6,\n              \"fat\": 0\n            },\n            {\n              \"name\": \"Protein powder, whey based, protein >70%, unfortified\",\n              \"quantity\": 40,\n              \"unit\": \"g\",\n              \"calories\": 152,\n              \"protein\": 32,\n              \"carbs\": 3,\n              \"fat\": 2\n            },\n            {\n              \"name\": \"Strawberry, purchased frozen\",\n              \"quantity\": 150,\n              \"unit\": \"g\",\n              \"calories\": 51,\n              \"protein\": 1,\n              \"carbs\": 12,\n              \"fat\": 0\n            }\n          ],\n          \"total_calories\": 1049,\n          \"total_protein\": 118,\n          \"total_carbs\": 89,\n          \"total_fat\": 25\n        }\n      ],\n      \"total_calories\": 3224,\n      \"total_protein\": 278,\n      \"total_carbs\": 368,\n      \"total_fat\": 74\n    },\n    {\n      \"type\": \"Rest Day\",\n      \"description\": \"Moderate carbohydrate intake with maintained protein for recovery\",\n      \"meals\": [\n        {\n          \"name\": \"Breakfast\",\n          \"time\": \"8:00 AM\",\n          \"foods\": [\n            {\n              \"name\": \"Egg, chicken, whole, raw\",\n              \"quantity\": 100,\n              \"unit\": \"g\",\n              \"calories\": 143,\n              \"protein\": 13,\n              \"carbs\": 1,\n              \"fat\": 10\n            },\n            {\n              \"name\": \"Oats, rolled, uncooked\",\n              \"quantity\": 80,\n              \"unit\": \"g\",\n              \"calories\": 303,\n              \"protein\": 11,\n              \"carbs\": 54,\n              \"fat\": 5\n            },\n            {\n              \"name\": \"YoPRO High-Protein Plain yoghurt\",\n              \"quantity\": 250,\n              \"unit\": \"g\",\n              \"calories\": 175,\n              \"protein\": 38,\n              \"carbs\": 10,\n              \"fat\": 0\n            },\n            {\n              \"name\": \"Raspberry, purchased frozen\",\n              \"quantity\": 100,\n              \"unit\": \"g\",\n              \"calories\": 52,\n              \"protein\": 1,\n              \"carbs\": 12,\n              \"fat\": 1\n            }\n          ],\n          \"total_calories\": 673,\n          \"total_protein\": 63,\n          \"total_carbs\": 77,\n          \"total_fat\": 16\n        },\n        {\n          \"name\": \"Lunch\",\n          \"time\": \"1:00 PM\",\n          \"foods\": [\n            {\n              \"name\": \"Tuna, canned in brine, drained\",\n              \"quantity\": 180,\n              \"unit\": \"g\",\n              \"calories\": 216,\n              \"protein\": 50,\n              \"carbs\": 0,\n              \"fat\": 1\n            },\n            {\n              \"name\": \"Rice, white, boiled or rice cooker, no added salt\",\n              \"quantity\": 200,\n              \"unit\": \"g\",\n              \"calories\": 260,\n              \"protein\": 5,\n              \"carbs\": 58,\n              \"fat\": 1\n            },\n            {\n              \"name\": \"Kale, raw\",\n              \"quantity\": 100,\n              \"unit\": \"g\",\n              \"calories\": 49,\n              \"protein\": 4,\n              \"carbs\": 9,\n              \"fat\": 1\n            },\n            {\n              \"name\": \"Capsicum, green, fresh, raw\",\n              \"quantity\": 150,\n              \"unit\": \"g\",\n              \"calories\": 30,\n              \"protein\": 1,\n              \"carbs\": 7,\n              \"fat\": 0\n            },\n            {\n              \"name\": \"Baked beans, canned in tomato sauce, reduced salt\",\n              \"quantity\": 150,\n              \"unit\": \"g\",\n              \"calories\": 120,\n              \"protein\": 7,\n              \"carbs\": 20,\n              \"fat\": 1\n            }\n          ],\n          \"total_calories\": 675,\n          \"total_protein\": 67,\n          \"total_carbs\": 94,\n          \"total_fat\": 4\n        },\n        {\n          \"name\": \"Pre-Dinner Snack\",\n          \"time\": \"4:00 PM\",\n          \"foods\": [\n            {\n              \"name\": \"Apple, red skin, unpeeled, raw\",\n              \"quantity\": 200,\n              \"unit\": \"g\",\n              \"calories\": 104,\n              \"protein\": 1,\n              \"carbs\": 28,\n              \"fat\": 0\n            },\n            {\n              \"name\": \"COTTAGE CHEESE\",\n              \"quantity\": 200,\n              \"unit\": \"g\",\n              \"calories\": 206,\n              \"protein\": 22,\n              \"carbs\": 8,\n              \"fat\": 9\n            },\n            {\n              \"name\": \"Bread, from wholemeal flour, extra grainy & seeds\",\n              \"quantity\": 60,\n              \"unit\": \"g\",\n              \"calories\": 162,\n              \"protein\": 8,\n              \"carbs\": 25,\n              \"fat\": 3\n            }\n          ],\n          \"total_calories\": 472,\n          \"total_protein\": 31,\n          \"total_carbs\": 61,\n          \"total_fat\": 12\n        },\n        {\n          \"name\": \"Dinner\",\n          \"time\": \"7:00 PM\",\n          \"foods\": [\n            {\n              \"name\": \"Turkey, ground\",\n              \"quantity\": 200,\n              \"unit\": \"g\",\n              \"calories\": 340,\n              \"protein\": 40,\n              \"carbs\": 0,\n              \"fat\": 20\n            },\n            {\n              \"name\": \"Sweet potato, cooked, as ingredient\",\n              \"quantity\": 250,\n              \"unit\": \"g\",\n              \"calories\": 215,\n              \"protein\": 4,\n              \"carbs\": 50,\n              \"fat\": 0\n            },\n            {\n              \"name\": \"Broccoli, fresh, boiled, drained\",\n              \"quantity\": 150,\n              \"unit\": \"g\",\n              \"calories\": 53,\n              \"protein\": 4,\n              \"carbs\": 11,\n              \"fat\": 1\n            },\n            {\n              \"name\": \"Lentil, dried, boiled, drained\",\n              \"quantity\": 100,\n              \"unit\": \"g\",\n              \"calories\": 116,\n              \"protein\": 9,\n              \"carbs\": 20,\n              \"fat\": 0\n            },\n            {\n              \"name\": \"Protein powder, whey based, protein >70%, unfortified\",\n              \"quantity\": 30,\n              \"unit\": \"g\",\n              \"calories\": 114,\n              \"protein\": 24,\n              \"carbs\": 2,\n              \"fat\": 1\n            }\n          ],\n          \"total_calories\": 838,\n          \"total_protein\": 81,\n          \"total_carbs\": 83,\n          \"total_fat\": 22\n        }\n      ],\n      \"total_calories\": 2658,\n      \"total_protein\": 242,\n      \"total_carbs\": 315,\n      \"total_fat\": 54\n    }\n  ],\n  \"total_calories\": 2941,\n  \"total_protein\": 260,\n  \"total_carbs\": 342,\n  \"total_fat\": 64,\n  \"notes\": \"This plan averages 2941 calories daily (3224 on training days, 2658 on rest days) to support body recomposition. The high protein intake (260g average) supports muscle growth while the controlled fat intake (64g average) aligns with your low-fat preference. Carbohydrates are cycled higher on training days to fuel performance. Pre and post-workout nutrition is optimized for your 90-minute PPL sessions. Ensure adequate hydration and adjust portion sizes based on progress and energy levels.\"\n}\n```",
                        "refusal": null,
                        "reasoning": null
                    }
                }
            ],
            "usage": {
                "prompt_tokens": 1290,
                "completion_tokens": 3490,
                "total_tokens": 4780
            }
        },
        "status": 200,
        "statusText": "",
        "headers": {
            "content-type": "application/json"
        },
        "config": {
            "transitional": {
                "silentJSONParsing": true,
                "forcedJSONParsing": true,
                "clarifyTimeoutError": false
            },
            "adapter": [
                "xhr",
                "http",
                "fetch"
            ],
            "transformRequest": [
                null
            ],
            "transformResponse": [
                null
            ],
            "timeout": 0,
            "xsrfCookieName": "XSRF-TOKEN",
            "xsrfHeaderName": "X-XSRF-TOKEN",
            "maxContentLength": -1,
            "maxBodyLength": -1,
            "env": {},
            "headers": {
                "Accept": "application/json, text/plain, */*",
                "Content-Type": "application/json",
                "Authorization": "Bearer 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",
                "HTTP-Referer": "http://localhost:5173",
                "X-Title": "ENG Meal Planner"
            },
            "method": "post",
            "url": "https://openrouter.ai/api/v1/chat/completions",
            "data": "{\"model\":\"anthropic/claude-opus-4\",\"messages\":[{\"role\":\"system\",\"content\":\"You are a fitness nutritionist specialized bodybuilding. Create a detailed meal plan with the following requirements:\\n    1. Output MUST be valid JSON following this structure: {\\n      \\\"plan_name\\\": string,\\n      \\\"description\\\": string,\\n      \\\"day_types\\\": [\\n        {\\n          \\\"type\\\": string, // e.g., \\\"Training Day\\\", \\\"Rest Day\\\"\\n          \\\"description\\\": string,\\n          \\\"meals\\\": [\\n            {\\n              \\\"name\\\": string, // e.g., \\\"Breakfast\\\", \\\"Lunch\\\", \\\"Pre-Workout\\\", \\\"Post-Workout\\\"\\n              \\\"time\\\": string, // e.g., \\\"8:00 AM\\\"\\n              \\\"foods\\\": [\\n                {\\n                  \\\"name\\\": string,\\n                  \\\"quantity\\\": number,\\n                  \\\"unit\\\": string, // e.g., \\\"g\\\"\\n                  \\\"calories\\\": number,\\n                  \\\"protein\\\": number,\\n                  \\\"carbs\\\": number,\\n                  \\\"fat\\\": number\\n                }\\n              ],\\n              \\\"total_calories\\\": number,\\n              \\\"total_protein\\\": number,\\n              \\\"total_carbs\\\": number,\\n              \\\"total_fat\\\": number\\n            }\\n          ],\\n          \\\"total_calories\\\": number,\\n          \\\"total_protein\\\": number,\\n          \\\"total_carbs\\\": number,\\n          \\\"total_fat\\\": number\\n        }\\n      ],\\n      \\\"total_calories\\\": number,\\n      \\\"total_protein\\\": number,\\n      \\\"total_carbs\\\": number,\\n      \\\"total_fat\\\": number,\\n      \\\"notes\\\": string\\n    }\\n    2. All numeric values should be accurate and reasonable\\n    3. Units for all food items should be in grams\\n    4. Ensure daily macros match the proposed macros protein, carbs and fat provided as close as possible\\n    5. Ensure daily average calories between day types is close to the proposed calories provided\\n    6. Include at least two day types (e.g., General Training and Rest Day)\\n    7. Meals should be practical and follow the preferences given\\n    8. Make sure all foods are common and generally available\\n    9. Ensure breakfast contain only the following ingredients: \\\"Egg, chicken, whole, raw\\\", \\\"Oats, rolled, uncooked\\\", \\\"YoPRO High-Protein Plain yoghurt\\\", \\\"Quinoa, uncooked\\\", \\\"Bread, from wholemeal flour, extra grainy & seeds\\\", \\\"Mayver's protien + peanut butter\\\", (\\\"Banana, cavendish, peeled, raw\\\", \\\"Blueberry, purchased frozen\\\", \\\"Strawberry, purchased frozen\\\", \\\"Raspberry, purchased frozen\\\", \\\"Papaya, raw\\\"), \\\"COTTAGE CHEESE\\\"\\n    10. Ensure lunch, pre-lunch, pre-dinner and dinner contain only the following ingredients: \\\"Chicken, breast, lean flesh, grilled, no added fat\\\", \\\"Beef, rump steak, lean, grilled, no added fat\\\", \\\"Tuna, canned in brine, drained\\\", \\\"Bassa (basa), fillet, baked, no added fat\\\", \\\"Turkey, ground\\\", \\\"Rice, white, boiled or rice cooker, no added salt\\\", (\\\"TOFU\\\", \\\"Tempeh, cooked\\\" for plant-based), \\\"Quinoa, uncooked\\\", \\\"Sweet potato, cooked, as ingredient\\\", \\\"Broccoli, fresh, boiled, drained\\\", \\\"Spinach, baby, fresh, raw\\\", \\\"Kale, raw\\\" or \\\"Kale, cooked, no added fat\\\", \\\"Capsicum, green, fresh, raw\\\", \\\"Asparagus, green, boiled, drained\\\", \\\"Baked beans, canned in tomato sauce, reduced salt\\\", \\\"Lentil, dried, boiled, drained\\\"\\n    11. Ensure pre-workout and post-workout contain only the following ingredients: (\\\"Banana, cavendish, peeled, raw\\\", \\\"Blueberry, purchased frozen\\\", \\\"Strawberry, purchased frozen\\\", \\\"Raspberry, purchased frozen\\\", \\\"Papaya, raw\\\"), \\\"Apple, red skin, unpeeled, raw\\\", \\\"Egg, chicken, whole, raw\\\", \\\"Oats, rolled, uncooked\\\", \\\"YoPRO High-Protein Plain yoghurt\\\", \\\"Protein powder, whey based, protein >70%, unfortified\\\", \\\"Bread, from wholemeal flour, extra grainy & seeds\\\", \\\"Mayver's protien + peanut butter\\\", \\\"Rice, white, boiled or rice cooker, no added salt\\\", \\\"Chicken, breast, lean flesh, grilled, no added fat\\\", \\\"Turkey, ground\\\", \\\"Tuna, canned in brine, drained\\\", \\\"YoPRO High-Protein Plain yoghurt\\\", \\\"PROTEIN BAR\\\", \\\"COTTAGE CHEESE\\\"\\n    \"},{\"role\":\"user\",\"content\":\"Create a diet plan for a \\\"male\\\" Age \\\"40\\\", Current weight \\\"85\\\", height \\\"180\\\" and current body fat at around \\\"10%\\\". The individual wants to \\\"both (both means body recomposition, lose fat and gain muscle)\\\", lose \\\"5kg\\\" of fat and gain \\\"10kg\\\" of muscle. And achieve the following physique \\\"Loose fat, gain muscle and improve definition.\\\". The individual will train \\\"5x a week with a PPL training program that would last about 90 minutes to complete.\\\" It was assigned 10000 daily steps to be complete. Lets propose a \\\"4\\\" meals a day. The proposed macros is \\\"3382\\\" calories per day type, where \\\"170\\\"g of Protein, \\\"484\\\"g of carbs and \\\"85\\\"g of fat. The individual would like to see in their nutrition \\\"High protein low fat\\\". The individual has the following allergies: None\"}],\"temperature\":0.7,\"max_tokens\":4000}",
            "allowAbsoluteUrls": true
        },
        "request": {}
    };

    // Parse the AI response
    const aiMessage = response.data.choices[0].message.content;
    console.log("aiMessage response", response);
    
    // Extract JSON from the response (handle potential text before/after JSON)
    const jsonMatch = aiMessage.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in the AI response');
    }
    
    const mealPlanData = JSON.parse(jsonMatch[0]) as AIMealPlan;

    console.log("mealPlanData", mealPlanData);
    
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
