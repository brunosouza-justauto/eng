import React, { useState } from 'react';
import { FiMessageSquare, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import ChatHistory, { Message } from './ChatHistory';
import ChatInput from './ChatInput';
import AthleteDataForm, { AthleteProfile } from './AthleteDataForm';
import MealPlanResult from './MealPlanResult';
import { generateMealPlan, AIMealPlan, MealPlanGenerationRequest } from '../../services/mealPlanService';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../services/supabaseClient';
import { useSelector } from 'react-redux';
import { selectProfile } from '../../store/slices/authSlice';

interface MealPlannerAIProps {
  onMealPlanCreated: (planId: string) => void;
}

/**
 * Main component for the AI-powered meal plan generation
 */
const MealPlannerAI: React.FC<MealPlannerAIProps> = ({ onMealPlanCreated }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uuidv4(),
      content: "Hello! I'm your AI nutrition assistant. I can help you create personalized meal plans for your athletes based on their profiles and goals. To get started, select an athlete below and adjust their information as needed.",
      isAI: true,
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormMode, setIsFormMode] = useState(true);
  const [generatedMealPlan, setGeneratedMealPlan] = useState<AIMealPlan | null>(null);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  
  const profile = useSelector(selectProfile);

  // Toggle expansion of the chat interface
  const toggleExpansion = () => {
    setIsExpanded(!isExpanded);
  };

  // Handle form submission to generate meal plan
  const handleFormSubmit = async (data: AthleteProfile) => {
    setIsLoading(true);
    setIsFormMode(false);
    
    // Add user message to chat
    const userMessage: Message = {
      id: uuidv4(),
      content: `Please create a meal plan for a the athlete selected with the data provided.`,
      isAI: false,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Check if this is direct JSON input from an external LLM
      // @ts-expect-error - _jsonInput is a custom property we added
      if (data._jsonInput) {
        // Add AI response to chat
        const aiResponse: Message = {
          id: uuidv4(),
          content: `I've processed the meal plan you've pasted. Let me display the results.`,
          isAI: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiResponse]);
        
        // Store the generated meal plan from the pasted JSON
        // @ts-expect-error - _jsonInput is a custom property we added
        setGeneratedMealPlan(data._jsonInput);
        setIsLoading(false);
        return;
      }
      
      // If no JSON input, create request for the API
      const request: MealPlanGenerationRequest = {
        athleteData: data
      };

      // Generate meal plan via API
      const result = await generateMealPlan(request);

      if (result.success && result.data) {

        const aiReasoning = result.reasoning;
        // Add AI reasoning to chat
        const aiReasoningMessage: Message = {
          id: uuidv4(),
          content: aiReasoning || 'No reasoning provided',
          isAI: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiReasoningMessage]);

        // Add AI response to chat
        const aiResponse: Message = {
          id: uuidv4(),
          content: `I've created a meal plan based on your athlete's profile. It includes ${result.data.day_types.length} different day types (${result.data.day_types.map(dt => dt.type).join(', ')}) with ${result.data.day_types[0]?.meals.length || 0} meals per day. The plan provides approximately ${result.data.total_calories} calories with ${result.data.total_protein}g protein, ${result.data.total_carbs}g carbs, and ${result.data.total_fat}g fat. You can review the details below.`,
          isAI: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiResponse]);
        
        // Store the generated meal plan
        setGeneratedMealPlan(result.data);
      } else {
        // Add error message to chat
        const errorMessage: Message = {
          id: uuidv4(),
          content: `Sorry, I encountered an error while generating the meal plan: ${result.error || 'Unknown error'}. Please try again.`,
          isAI: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error in meal plan generation:', error);
      
      // Add error message to chat
      const errorMessage: Message = {
        id: uuidv4(),
        content: `Sorry, something went wrong while generating the meal plan. Please try again.`,
        isAI: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle sending a regular chat message
  const handleSendMessage = (content: string) => {
    // Add user message to chat
    const userMessage: Message = {
      id: uuidv4(),
      content,
      isAI: false,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    
    // For now, just respond with a simple message
    // In a more advanced implementation, this could also interact with the AI
    setIsLoading(true);
    
    setTimeout(() => {
      const aiResponse: Message = {
        id: uuidv4(),
        content: "I'm here to help you create meal plans based on athlete data. If you'd like to create a new meal plan, please use the form above. If you have questions about how to use this feature, feel free to ask!",
        isAI: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1000);
  };

  const format12hTime = (time: string) => {
    const [hour, minute] = time.split(':');
    const ampm = parseInt(hour, 10) >= 12 ? 'PM' : 'AM';
    const hour12 = parseInt(hour, 10) % 12 || 12;
    return `${hour12}:${minute} ${ampm}`;
  };

  // Function to save the generated meal plan to the database
  const handleSaveMealPlan = async () => {
    if (!generatedMealPlan || !profile?.id) return;

    console.log(generatedMealPlan);
    
    setIsSavingPlan(true);
    
    try {
      // First, insert the nutrition plan
      const { data: planData, error: planError } = await supabase
        .from('nutrition_plans')
        .insert({
          name: generatedMealPlan.plan_name,
          description: generatedMealPlan.description,
          total_calories: generatedMealPlan.total_calories,
          protein_grams: generatedMealPlan.total_protein,
          carbohydrate_grams: generatedMealPlan.total_carbs,
          fat_grams: generatedMealPlan.total_fat,
          coach_id: 'c5e342a9-28a3-4fdb-9947-fe9e76c46b65',
          is_public: false
        })
        .select('id')
        .single();
     
      if (planError) throw planError;
      
      if (!planData?.id) {
        throw new Error('Failed to create nutrition plan');
      }
      
      const planId = planData.id;
      
      // Create meals for each day type
      for (const dayType of generatedMealPlan.day_types) {
        // Insert each meal
        for (const meal of dayType.meals) {
          const { data: mealData, error: mealError } = await supabase
            .from('meals')
            .insert({
              nutrition_plan_id: planId,
              name: meal.name,
              day_type: dayType.type.toLowerCase().replace(/day$/, '').trim(),
              time_suggestion: meal.time.match(/(AM|PM)/i) ? format12hTime(meal.time) : meal.time,
              order_in_plan: dayType.meals.indexOf(meal) + 1,
              notes: meal.notes
            })
            .select('id')
            .single();
          
          if (mealError) throw mealError;
          
          if (!mealData?.id) {
            throw new Error('Failed to create meal');
          }
          
          const mealId = mealData.id;
          
          // Now search for similar food items in our database
          for (const food of meal.foods) {
            // First, check if we have an exact match or similar food
            const { data: foodData, error: foodError } = await supabase
              .from('food_items')
              .select('id, food_name, serving_size_g')
              .eq('food_name', food.name)
              .limit(1);
            
            if (foodError) throw foodError;
            
            let foodItemId = foodData && foodData.length > 0 ? foodData[0].id : null;
            
            // If we couldn't find a matching food, create a custom one
            if (!foodItemId) {
              const { data: newFoodData, error: newFoodError } = await supabase
                .from('food_items')
                .insert({
                  food_name: food.name,
                  food_group: 'Custom',
                  calories_per_100g: (food.calories / food.quantity) * 100,
                  protein_per_100g: (food.protein / food.quantity) * 100,
                  carbs_per_100g: (food.carbs / food.quantity) * 100,
                  fat_per_100g: (food.fat / food.quantity) * 100,
                  fiber_per_100g: 0, // Default value
                  serving_size_g: food.quantity,
                  serving_size_unit: food.unit,
                  nutrient_basis: '100g'
                })
                .select('id')
                .single();
              
              if (newFoodError) throw newFoodError;
              
              if (!newFoodData?.id) {
                throw new Error('Failed to create food item');
              }
              
              foodItemId = newFoodData.id;
            }

            // Now associate the food with the meal
            const { error: mealFoodError } = await supabase
              .from('meal_food_items')
              .insert({
                meal_id: mealId,
                food_item_id: foodItemId,
                quantity: food.quantity,
                unit: food.unit,
                notes: food.notes
              });
            
            if (mealFoodError) throw mealFoodError;
          }
        }
      }
      
      // Add success message to chat
      const successMessage: Message = {
        id: uuidv4(),
        content: `Great! I've successfully created the meal plan "${generatedMealPlan.plan_name}" in your database. You can now view and edit it in the meal planner.`,
        isAI: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, successMessage]);
      
      // Reset the form and meal plan
      setGeneratedMealPlan(null);
      setIsFormMode(true);
      
      // Notify parent component about the new plan
      onMealPlanCreated(planId);
      
    } catch (error) {
      console.error('Error saving meal plan:', error);
      
      // Add error message to chat
      const errorMessage: Message = {
        id: uuidv4(),
        content: `Sorry, I encountered an error while saving the meal plan: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        isAI: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSavingPlan(false);
    }
  };

  // Reset to form mode
  const handleCreateNewPlan = () => {
    setGeneratedMealPlan(null);
    setIsFormMode(true);
  };

  return (
    <div className="mb-6 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between bg-indigo-600 p-4 cursor-pointer"
        onClick={toggleExpansion}
      >
        <div className="flex items-center">
          <FiMessageSquare className="text-white mr-2" />
          <h2 className="text-lg font-medium text-white">AI Meal Planner Assistant</h2>
        </div>
        <div className="flex items-center">
          <button 
            onClick={(e) => { 
              e.stopPropagation();
              handleCreateNewPlan();
            }}
            className="mr-4 text-sm bg-white text-indigo-600 px-3 py-1 rounded-md hover:bg-indigo-50"
          >
            New Plan
          </button>
          {isExpanded ? (
            <FiChevronUp className="text-white" />
          ) : (
            <FiChevronDown className="text-white" />
          )}
        </div>
      </div>
      
      {/* Main content */}
      {isExpanded && (
        <div className="bg-white dark:bg-gray-800">
          {/* Form or Result display */}
          <div className="p-4">
            {isFormMode ? (
              <AthleteDataForm 
                onSubmit={handleFormSubmit}
                isSubmitting={isLoading}
              />
            ) : generatedMealPlan ? (
              <MealPlanResult 
                mealPlan={generatedMealPlan}
                onSaveMealPlan={handleSaveMealPlan}
                isSaving={isSavingPlan}
              />
            ) : null}
          </div>
          
          {/* Chat interface */}
          <div className="h-64 flex flex-col border-t border-gray-200 dark:border-gray-700">
            <ChatHistory messages={messages} isLoading={isLoading} />
            <ChatInput 
              onSendMessage={handleSendMessage}
              disabled={isLoading || isSavingPlan}
              placeholder="Ask a question about meal planning..."
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MealPlannerAI;
