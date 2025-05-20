import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectProfile } from '../../store/slices/authSlice';
import { FiSearch, FiPlus, FiTrash2, FiX, FiInfo, FiBook, FiArrowLeft, FiSave } from 'react-icons/fi';
import { TbBarcode } from 'react-icons/tb';
import toast from 'react-hot-toast';
import BarcodeScanner from '../nutrition/BarcodeScanner';
import CustomFoodItemForm from '../nutrition/CustomFoodItemForm';
import RecipeManager from './RecipeManager';
import {
  searchFoodItems,
  addFoodItemToMeal,
  removeFoodItemFromMeal,
  addRecipeToMeal,
  getNutritionPlanById,
  createMeal
} from '../../services/mealPlanningService';
import './MealPlannerIntegrated.css';
import { supabase } from '../../services/supabaseClient';

// Define the types that aren't exported from the service
interface FoodItem {
  id: string;
  food_name: string;
  brand?: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  source: string;
  barcode?: string;
}

interface MealFoodItem {
  id: string;
  food_item: FoodItem;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  calculated_calories?: number;
  calculated_protein?: number;
  calculated_carbs?: number;
  calculated_fat?: number;
}

interface MealData {
  id: string;
  name: string;
  day_type: string;
  time_of_day: string;
  time_suggestion?: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  food_items: MealFoodItem[];
}

interface NutritionPlanData {
  id?: string;
  name: string;
  description?: string;
  total_calories?: number;
  protein_grams?: number;
  carbohydrate_grams?: number;
  fat_grams?: number;
  is_public: boolean;
  meals: MealData[];
}

interface MealPlannerIntegratedProps {
  planId?: string;
  initialPlan?: NutritionPlanData;
  onSave?: () => void;
  onCancel?: () => void;
}

const LIMIT = 12; // Number of food items per page

// Helper function to format day type name
const formatDayType = (dayType: string): string => {
  if (!dayType) return 'Rest Day';
  return dayType.charAt(0).toUpperCase() + dayType.slice(1).toLowerCase();
};

const MealPlannerIntegrated: React.FC<MealPlannerIntegratedProps> = ({ 
  planId, 
  initialPlan, 
  onSave, 
  onCancel 
}) => {
  const profile = useSelector(selectProfile);
  
  // State for food selection panel
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [selectedFoodItem, setSelectedFoodItem] = useState<FoodItem | null>(null);
  const [customFoodName, setCustomFoodName] = useState('');
  const [quantity, setQuantity] = useState('100');
  const [unit, setUnit] = useState('g');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [includeExternalSources, setIncludeExternalSources] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Modal related states
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showCustomFoodForm, setShowCustomFoodForm] = useState(false);
  const [showRecipeManager, setShowRecipeManager] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [initialFoodData, setInitialFoodData] = useState<Partial<FoodItem> | null>(null);
  
  // State for meal display panel and plan editing
  const [planName, setPlanName] = useState(initialPlan?.name || 'New Nutrition Plan');
  const [planDescription, setPlanDescription] = useState(initialPlan?.description || '');
  const [planCalories, setPlanCalories] = useState<number | undefined>(initialPlan?.total_calories);
  const [planProtein, setPlanProtein] = useState<number | undefined>(initialPlan?.protein_grams);
  const [planCarbs, setPlanCarbs] = useState<number | undefined>(initialPlan?.carbohydrate_grams);
  const [planFat, setPlanFat] = useState<number | undefined>(initialPlan?.fat_grams);
  const [isPublic, setIsPublic] = useState(initialPlan?.is_public || false);
  const [meals, setMeals] = useState<MealData[]>(initialPlan?.meals || []);
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Define fetchMeals function with useCallback before it's used in useEffect
  const fetchMeals = useCallback(async () => {
    if (!profile?.id || !planId) return;
    
    try {
      console.log('Fetching meals data...');
      // Get the nutrition plan with meals
      const nutritionPlan = await getNutritionPlanById(planId);
      
      if (!nutritionPlan) {
        console.error('Nutrition plan not found');
        return;
      }
      
      // Get all meals without filtering by day type
      const allMeals = nutritionPlan.meals;
      
      // Create a compatible format for our component state
      const formattedMeals = allMeals.map(meal => ({
        id: meal.id,
        name: meal.name,
        day_type: meal.day_type || 'rest',
        time_of_day: meal.time_suggestion || '',
        total_calories: meal.total_calories || 0,
        total_protein: meal.total_protein || 0,
        total_carbs: meal.total_carbs || 0,
        total_fat: meal.total_fat || 0,
        food_items: (meal.food_items || []).map(item => ({
          id: item.id,
          food_item: item.food_item as unknown as FoodItem,
          quantity: item.quantity,
          unit: item.unit,
          calories: item.calculated_calories || 0,
          protein: item.calculated_protein || 0,
          carbs: item.calculated_carbs || 0,
          fat: item.calculated_fat || 0
        }))
      })) as MealData[];
      
      setMeals(formattedMeals);
      
      // Auto-select first meal if none is selected
      if (formattedMeals.length > 0 && !selectedMealId) {
        setSelectedMealId(formattedMeals[0].id);
      }
    } catch (err) {
      console.error('Error fetching meals:', err);
      toast.error('Failed to load meals');
    }
  }, [planId, profile?.id, selectedMealId]);
  
  // Add a custom setter function for selectedMealId
  const selectMeal = useCallback((mealId: string) => {
    setSelectedMealId(mealId);
    // Fetch latest data for this meal
    if (planId) {
      fetchMeals();
    }
  }, [planId, fetchMeals]);
  
  // Custom toast styling - place outside of conditional rendering
  useEffect(() => {
    toast.custom = (message) => toast(message, {
      className: 'custom-toast',
      duration: 3000,
      position: 'top-right'
    });
  }, []);
  
  // Initialize with initialPlan data if provided
  useEffect(() => {
    if (initialPlan) {
      console.log('Initial plan data:', initialPlan);
      setPlanName(initialPlan.name || 'New Nutrition Plan');
      setPlanDescription(initialPlan.description || '');
      setPlanCalories(initialPlan.total_calories);
      setPlanProtein(initialPlan.protein_grams);
      setPlanCarbs(initialPlan.carbohydrate_grams);
      setPlanFat(initialPlan.fat_grams);
      setIsPublic(initialPlan.is_public || false);
      
      if (initialPlan.meals && initialPlan.meals.length > 0) {
        console.log('Processing meals from initialPlan:', initialPlan.meals);
        // Transform meals to match the expected MealData format
        const formattedMeals = initialPlan.meals.map(meal => ({
          id: meal.id,
          name: meal.name,
          day_type: meal.day_type || 'rest',
          time_of_day: meal.time_suggestion || '',
          total_calories: meal.total_calories || 0,
          total_protein: meal.total_protein || 0,
          total_carbs: meal.total_carbs || 0,
          total_fat: meal.total_fat || 0,
          food_items: (meal.food_items || []).map(item => ({
            id: item.id,
            food_item: item.food_item as unknown as FoodItem,
            quantity: item.quantity,
            unit: item.unit,
            calories: item.calculated_calories || 0,
            protein: item.calculated_protein || 0,
            carbs: item.calculated_carbs || 0,
            fat: item.calculated_fat || 0
          }))
        }));
        
        setMeals(formattedMeals);
        
        // Just select the first meal if none is selected
        if (!selectedMealId && formattedMeals.length > 0) {
          setSelectedMealId(formattedMeals[0].id);
        }
      } else {
        // Only fetch meals if we have a planId (editing mode)
        if (planId) {
          console.log('No meals in initialPlan, fetching meals...');
          fetchMeals();
        } else {
          console.log('Creating new plan, no meals to fetch');
        }
      }
    } else {
      // If no initialPlan and we have a planId, fetch plan data
      if (planId) {
        console.log('No initialPlan but planId exists, fetching plan data...');
        fetchMeals();
      } else {
        console.log('New plan creation mode, no initialPlan or planId');
      }
    }
  }, [initialPlan, planId, selectedMealId, fetchMeals]);
  
  // Modify the create meal handler to use the current active day type if creating a new meal
  const handleCreateMeal = async () => {
    if (!profile?.id || !planId) {
      setError('Cannot create meal: Plan ID is missing');
      return;
    }
    
    try {
      // Create a default meal name based on the number of existing meals
      const mealName = `Meal ${meals.length + 1}`;
      
      // Create dialog to select day type
      const selectedDayType = prompt('Select day type (rest, training, moderate, light, heavy):', 'rest');
      
      if (!selectedDayType) return; // User cancelled
      
      const newMeal = await createMeal({
        nutrition_plan_id: planId,
        name: mealName,
        day_type: selectedDayType.toLowerCase(),
        time_suggestion: '',
        order_in_plan: meals.length
      });
      
      // Update the meals state
      fetchMeals();
      
      // Select the new meal
      setSelectedMealId(newMeal.id);
      
      toast.success('New meal created');
    } catch (err) {
      console.error('Error creating meal:', err);
      setError('Failed to create meal');
    }
  };
  
  // Search functionality
  const performSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {

      console.log('Performing search with includeExternalSources:', includeExternalSources);

      const result = await searchFoodItems(
        searchQuery,
        category,
        LIMIT,
        (page - 1) * LIMIT,
        includeExternalSources
      );
      
      setFoodItems(result.items as unknown as FoodItem[]);
      setTotalCount(result.count);
    } catch (err) {
      console.error('Error searching food items:', err);
      setError('Failed to search food items');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, category, page, includeExternalSources]);
  
  // Effect to perform search when page changes
  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch();
    }
  }, [page, performSearch]);
  
  // Handle food item selection
  const handleSelectFoodItem = (foodItem: FoodItem) => {
    setSelectedFoodItem(foodItem);
    setCustomFoodName(foodItem.food_name);
    setQuantity('100');
    setUnit('g');
  };
  
  // Handle barcode detection
  const handleBarcodeDetect = async (barcode: string) => {
    setShowBarcodeScanner(false);
    
    if (!barcode) {
      setError('No barcode detected');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Search for the food item by barcode (use the existing search function)
      // This is a temporary solution until a proper barcode search is implemented
      const result = await searchFoodItems(`barcode:${barcode}`, undefined, 1, 0);
      
      if (result.items && result.items.length > 0) {
        // Food item found
        setSelectedFoodItem(result.items[0] as unknown as FoodItem);
        setQuantity('100');
        setUnit('g');
      } else {
        // No food item found - set up for custom creation
        setInitialFoodData({ barcode });
        setShowCustomFoodForm(true);
      }
    } catch (err) {
      console.error('Error searching by barcode:', err);
      setError('Failed to search by barcode');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Toggle external sources (USDA API)
  const handleExternalSourcesToggle = () => {
    setIncludeExternalSources(!includeExternalSources);
  };
  
  // Update the handleAddToMealClick function to ensure proper data refresh
  const handleAddToMealClick = async () => {
    if (!selectedFoodItem || !selectedMealId) {
      setError(selectedMealId ? 'No food item selected' : 'No meal selected');
      return;
    }
    
    try {
      setIsLoading(true);
      let actualFoodItemId = selectedFoodItem.id;
      const parsedQuantity = parseFloat(quantity) || 100;
      
      // Check if this is a USDA item (ID starts with "usda-")
      if (selectedFoodItem.id.startsWith('usda-')) {
        // This is a USDA food item, we need to create a local copy first
        console.log('Creating local copy of USDA food item:', selectedFoodItem.food_name);
        
        // Extract the original USDA ID without the prefix
        const originalUsdaId = selectedFoodItem.id.replace('usda-', '');
        
        // Check if we already have this USDA item in our database
        const { data: existingItems, error: searchError } = await supabase
          .from('food_items')
          .select('id')
          .eq('source', 'usda')
          .eq('source_id', originalUsdaId);
        
        if (searchError) throw searchError;
        
        if (existingItems && existingItems.length > 0) {
          // Use the existing item
          actualFoodItemId = existingItems[0].id;
          console.log('Found existing local copy with ID:', actualFoodItemId);
        } else {
          // Create a new food item record
          const { data: newItem, error: insertError } = await supabase
            .from('food_items')
            .insert({
              food_name: customFoodName.trim() || selectedFoodItem.food_name,
              brand: selectedFoodItem.brand,
              calories_per_100g: selectedFoodItem.calories_per_100g,
              protein_per_100g: selectedFoodItem.protein_per_100g,
              carbs_per_100g: selectedFoodItem.carbs_per_100g,
              fat_per_100g: selectedFoodItem.fat_per_100g,
              source: 'usda',
              source_id: originalUsdaId,
              barcode: selectedFoodItem.barcode,
              nutrient_basis: 'per_100g',
              is_verified: true
            })
            .select('id')
            .single();
          
          if (insertError) throw insertError;
          
          actualFoodItemId = newItem.id;
          console.log('Created new local copy with ID:', actualFoodItemId);
        }
      } else if (customFoodName.trim() && customFoodName.trim() !== selectedFoodItem.food_name) {
        // Not a USDA item, but name is customized - create a new food item
        const { data: newFoodItem, error } = await supabase
          .from('food_items')
          .insert({
            food_name: customFoodName.trim(),
            brand: selectedFoodItem.brand,
            calories_per_100g: selectedFoodItem.calories_per_100g,
            protein_per_100g: selectedFoodItem.protein_per_100g,
            carbs_per_100g: selectedFoodItem.carbs_per_100g,
            fat_per_100g: selectedFoodItem.fat_per_100g,
            source: 'custom',
            barcode: selectedFoodItem.barcode,
            nutrient_basis: 'per_100g'
          })
          .select('id')
          .single();
        
        if (error) throw error;
        actualFoodItemId = newFoodItem.id;
      }
      
      // Now add the food item to the meal using the actual database ID
      await addFoodItemToMeal(
        selectedMealId,
        actualFoodItemId,
        parsedQuantity,
        unit
      );
      
      setAlertMessage({
        type: 'success',
        message: `Added ${customFoodName.trim() || selectedFoodItem.food_name} to meal`
      });
      
      console.log('Food item added, refreshing meals data...');
      // Refresh meals data with a forced fetch from database
      await fetchMeals();
      
      // Reset selected food item after adding
      setSelectedFoodItem(null);
    } catch (err) {
      console.error('Error adding food to meal:', err);
      setError('Failed to add food to meal');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle recipe selection
  const handleSelectRecipe = async (recipeId: string, servingSize: number) => {
    if (!selectedMealId) {
      setError('No meal selected');
      setShowRecipeManager(false);
      return;
    }
    
    try {
      await addRecipeToMeal(selectedMealId, recipeId, servingSize);
      setShowRecipeManager(false);
      fetchMeals();
      toast.success('Recipe added to meal!');
    } catch (err) {
      setError('Error adding recipe to meal. Please try again.');
      console.error(err);
    }
  };
  
  // Handle custom food save
  const handleCustomFoodSave = (foodItem: FoodItem) => {
    setShowCustomFoodForm(false);
    setAlertMessage({
      type: 'success',
      message: `Created custom food: ${foodItem.food_name}`
    });
    
    // Select the newly created food item
    setSelectedFoodItem(foodItem);
  };
  
  // Remove food from meal
  const handleRemoveFoodFromMeal = async (mealId: string, mealFoodId: string) => {
    try {
      await removeFoodItemFromMeal(mealFoodId);
      fetchMeals();
      toast.success('Food item removed');
    } catch (err) {
      console.error('Error removing food from meal:', err);
      toast.error('Failed to remove food item');
    }
  };
  
  // Function to get appropriate styling for meal cards
  const getMealCardStyle = (mealId: string) => {
    return `meal-card p-4 bg-gray-800 dark:bg-gray-800 rounded-lg border-2 
      ${selectedMealId === mealId 
        ? 'selected border-indigo-500 dark:border-indigo-400' 
        : 'border-gray-700 dark:border-gray-700'} 
      transition-all hover:shadow-md`;
  };
  
  // Helper function to group meals by day type
  const getMealsByDayType = () => {
    // Group meals by day type
    const groupedMeals: Record<string, MealData[]> = {};
    
    meals.forEach(meal => {
      const dayType = meal.day_type || 'rest';
      if (!groupedMeals[dayType]) {
        groupedMeals[dayType] = [];
      }
      groupedMeals[dayType].push(meal);
    });
    
    return groupedMeals;
  };
  
  // Calculate average nutrition by day type
  const calculateAverageNutrition = (): {calories: number; protein: number; carbs: number; fat: number} => {
    // Group meals by day type
    const mealsByDayType = getMealsByDayType();
    const dayTypes = Object.keys(mealsByDayType);
    
    if (dayTypes.length === 0) {
      return {
        calories: planCalories || 0,
        protein: planProtein || 0,
        carbs: planCarbs || 0,
        fat: planFat || 0
      };
    }
    
    // Calculate total nutrition for each day type
    const dayTypeNutrition = dayTypes.map(dayType => {
      const mealsForType = mealsByDayType[dayType];
      
      return mealsForType.reduce((totals, meal) => {
        return {
          calories: totals.calories + (meal.total_calories || 0),
          protein: totals.protein + (meal.total_protein || 0),
          carbs: totals.carbs + (meal.total_carbs || 0),
          fat: totals.fat + (meal.total_fat || 0)
        };
      }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
    });
    
    // Calculate the average across all day types
    const totalNutrition = dayTypeNutrition.reduce((sum, dayNutrition) => {
      return {
        calories: sum.calories + dayNutrition.calories,
        protein: sum.protein + dayNutrition.protein,
        carbs: sum.carbs + dayNutrition.carbs,
        fat: sum.fat + dayNutrition.fat
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
    
    // Return the average
    return {
      calories: totalNutrition.calories / dayTypes.length,
      protein: totalNutrition.protein / dayTypes.length,
      carbs: totalNutrition.carbs / dayTypes.length,
      fat: totalNutrition.fat / dayTypes.length
    };
  };
  
  // Restore handleSavePlan function
  const handleSavePlan = async () => {
    if (!profile?.id) {
      setError('You must be logged in to save a plan');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const planData = {
        name: planName,
        description: planDescription,
        total_calories: planCalories,
        protein_grams: planProtein,
        carbohydrate_grams: planCarbs,
        fat_grams: planFat,
        is_public: isPublic,
        coach_id: profile.id,
      };
      
      if (planId) {
        // Update existing plan
        const { error: updateError } = await supabase
          .from('nutrition_plans')
          .update(planData)
          .eq('id', planId);
          
        if (updateError) throw updateError;
      } else {
        // Create new plan
        const { error } = await supabase
          .from('nutrition_plans')
          .insert(planData);
          
        if (error) throw error;
      }
      
      toast.success(`Nutrition plan ${planId ? 'updated' : 'created'} successfully!`);
      
      // Call onSave callback if provided
      if (onSave) {
        onSave();
      }
    } catch (err) {
      console.error('Error saving nutrition plan:', err);
      setError(`Failed to ${planId ? 'update' : 'create'} nutrition plan`);
      toast.error(`Failed to ${planId ? 'update' : 'create'} nutrition plan`);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Barcode scanner component
  if (showBarcodeScanner) {
    return (
      <div className="fixed inset-0 z-[60] bg-black">
        <BarcodeScanner
          onDetect={handleBarcodeDetect}
          onClose={() => setShowBarcodeScanner(false)}
        />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto">
      {/* Plan Info Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Plan Name
          </label>
          <input
            type="text"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Enter plan name"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description (Optional)
          </label>
          <textarea
            value={planDescription}
            onChange={(e) => setPlanDescription(e.target.value)}
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Enter plan description"
            rows={2}
          />
        </div>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Calories (kcal)
            </label>
            <input
              type="number"
              value={planCalories || ''}
              onChange={(e) => setPlanCalories(parseInt(e.target.value) || undefined)}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Total calories"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Protein (g)
            </label>
            <input
              type="number"
              value={planProtein || ''}
              onChange={(e) => setPlanProtein(parseInt(e.target.value) || undefined)}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Protein grams"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Carbs (g)
            </label>
            <input
              type="number"
              value={planCarbs || ''}
              onChange={(e) => setPlanCarbs(parseInt(e.target.value) || undefined)}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Carbohydrate grams"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fat (g)
            </label>
            <input
              type="number"
              value={planFat || ''}
              onChange={(e) => setPlanFat(parseInt(e.target.value) || undefined)}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Fat grams"
            />
          </div>
        </div>
        
        <div className="flex items-center mb-4">
          <input
            id="is_public"
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label htmlFor="is_public" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
            Make this nutrition plan public
          </label>
        </div>
        
        <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <FiArrowLeft className="inline mr-2" /> Cancel
          </button>
          <button
            onClick={handleSavePlan}
            className={`px-4 py-2 ${isSaving ? 'bg-green-500' : 'bg-green-600 hover:bg-green-700'} text-white rounded-md flex items-center`}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <FiSave className="mr-2" /> Save Plan
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Average Daily Nutrition Section - Updated */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Meals & Food Items</h1>
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-100 dark:text-white">Average Daily Nutrition</h2>
            <div className="text-xs text-gray-400 bg-gray-800/50 rounded py-1 px-2">
              Calculated as average across all day types
            </div>
          </div>
          
          {/* Calculate nutrition values dynamically */}
          {(() => {
            const avgNutrition = calculateAverageNutrition();
            const totalCals = avgNutrition.calories;
            
            // Calculate percentages of calories
            const proteinCals = avgNutrition.protein * 4;
            const carbsCals = avgNutrition.carbs * 4;
            const fatCals = avgNutrition.fat * 9;
            
            const proteinPerc = totalCals > 0 ? Math.round((proteinCals / totalCals) * 100) : 0;
            const carbsPerc = totalCals > 0 ? Math.round((carbsCals / totalCals) * 100) : 0;
            const fatPerc = totalCals > 0 ? Math.round((fatCals / totalCals) * 100) : 0;
            
            return (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
                  <div className="text-sm text-gray-400 mb-1">Calories</div>
                  <div className="text-2xl font-bold text-gray-200">{Math.round(avgNutrition.calories)}</div>
                  <div className="text-xs text-gray-500">kcal</div>
                </div>
                
                <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
                  <div className="flex justify-between">
                    <div className="text-sm text-gray-400 mb-1">Protein</div>
                    <div className="text-sm text-red-400">{proteinPerc}%</div>
                  </div>
                  <div className="text-2xl font-bold text-gray-200">{avgNutrition.protein.toFixed(1)}g</div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
                    <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${proteinPerc}%` }}></div>
                  </div>
                </div>
                
                <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
                  <div className="flex justify-between">
                    <div className="text-sm text-gray-400 mb-1">Carbs</div>
                    <div className="text-sm text-yellow-400">{carbsPerc}%</div>
                  </div>
                  <div className="text-2xl font-bold text-gray-200">{avgNutrition.carbs.toFixed(1)}g</div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
                    <div className="bg-yellow-500 h-1.5 rounded-full" style={{ width: `${carbsPerc}%` }}></div>
                  </div>
                </div>
                
                <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
                  <div className="flex justify-between">
                    <div className="text-sm text-gray-400 mb-1">Fat</div>
                    <div className="text-sm text-blue-400">{fatPerc}%</div>
                  </div>
                  <div className="text-2xl font-bold text-gray-200">{avgNutrition.fat.toFixed(1)}g</div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${fatPerc}%` }}></div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Meals</h2>
        </div>
        <button 
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
          onClick={handleCreateMeal}
        >
          <FiPlus className="mr-2" /> Add Meal
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left panel - Food selection */}
        <div className="col-span-4">
          <div className="bg-gray-900 dark:bg-gray-800 rounded-lg p-4 h-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-100 dark:text-white">Food Selection</h3>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowBarcodeScanner(true)}
                  className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  title="Scan Barcode"
                >
                  <TbBarcode />
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomFoodForm(true)}
                  className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  title="Create Custom Food"
                >
                  <FiPlus />
                </button>
                <button
                  type="button"
                  onClick={() => setShowRecipeManager(true)}
                  className="p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  title="Add Recipe"
                >
                  <FiBook />
                </button>
              </div>
            </div>

            {/* Search input */}
            <div className="mb-4">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Search for food items..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      performSearch();
                    }
                  }}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="text-gray-400" />
                </div>
                <button
                  type="button"
                  onClick={performSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <span className="text-sm font-medium text-indigo-400 hover:text-indigo-300">
                    Search
                  </span>
                </button>
              </div>
            </div>

            {/* Filter options */}
            <div className="flex flex-col space-y-3 mb-4">
              <div>
                <select
                  value={category || ''}
                  onChange={(e) => {
                    setCategory(e.target.value || undefined);
                    setPage(1);
                  }}
                  className="w-full px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">All Categories</option>
                  <option value="Vegetables">Vegetables</option>
                  <option value="Fruits">Fruits</option>
                  <option value="Grains">Grains</option>
                  <option value="Protein Foods">Protein Foods</option>
                  <option value="Dairy">Dairy</option>
                  <option value="Snacks">Snacks</option>
                  <option value="Beverages">Beverages</option>
                  <option value="Mixed Dishes">Mixed Dishes</option>
                  <option value="Condiments and Sauces">Condiments & Sauces</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <label className="inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={includeExternalSources}
                    onChange={handleExternalSourcesToggle}
                  />
                  <div className="relative w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-500"></div>
                  <span className="ms-3 text-sm font-medium text-gray-300">
                    Include USDA Database API
                  </span>
                </label>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded-md dark:bg-red-800/30 dark:text-red-300 dark:border-red-700">
                <div className="flex justify-between">
                  <span>{error}</span>
                  <button onClick={() => setError(null)}>
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Success message */}
            {alertMessage && (
              <div className={`mb-4 p-3 rounded-md ${
                alertMessage.type === 'success' 
                  ? 'bg-green-100 border border-green-300 text-green-800 dark:bg-green-800/30 dark:text-green-300 dark:border-green-700' 
                  : 'bg-red-100 border border-red-300 text-red-800 dark:bg-red-800/30 dark:text-red-300 dark:border-red-700'
              }`}>
                <div className="flex justify-between">
                  <span>{alertMessage.message}</span>
                  <button onClick={() => setAlertMessage(null)}>
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Food results */}
            <div className="mt-4 mb-4">
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="spinner"></div>
                </div>
              ) : foodItems.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  {searchQuery ? 'No food items found. Try a different search.' : 'Search for food items to see results.'}
                </div>
              ) : (
                <div className="space-y-2 food-items-container overflow-y-auto pr-2">
                  {foodItems.map((foodItem) => (
                    <div 
                      key={foodItem.id}
                      onClick={() => handleSelectFoodItem(foodItem)}
                      className={`food-item p-3 border rounded-md cursor-pointer transition-colors ${
                        selectedFoodItem?.id === foodItem.id
                          ? 'bg-indigo-900/40 border-indigo-600 dark:bg-indigo-900/40 dark:border-indigo-600'
                          : 'hover:bg-gray-800 dark:hover:bg-gray-700 border-gray-700 dark:border-gray-700'
                      }`}
                    >
                      <div className="font-medium text-gray-200">{foodItem.food_name}</div>
                      {foodItem.brand && (
                        <div className="text-sm text-gray-400">{foodItem.brand}</div>
                      )}
                      <div className="flex mt-1">
                        {foodItem.source === 'usda' && (
                          <div className="text-xs text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded mr-2">USDA</div>
                        )}
                        {foodItem.source === 'custom' && (
                          <div className="text-xs text-green-400 bg-green-900/20 px-2 py-0.5 rounded mr-2">Custom</div>
                        )}
                        {foodItem.source === 'system' && (
                          <div className="text-xs text-gray-400 bg-gray-900/20 px-2 py-0.5 rounded mr-2">System</div>
                        )}
                        {foodItem.source === 'coach' && (
                          <div className="text-xs text-amber-400 bg-amber-900/20 px-2 py-0.5 rounded mr-2">Coach</div>
                        )}
                        {!['usda', 'custom', 'system', 'coach'].includes(foodItem.source) && (
                          <div className="text-xs text-purple-400 bg-purple-900/20 px-2 py-0.5 rounded mr-2">{foodItem.source}</div>
                        )}
                      </div>
                      <div className="mt-2 text-sm">
                        <span className="text-red-400 mr-3">P: {parseFloat(foodItem.protein_per_100g.toFixed(1))}g</span>
                        <span className="text-yellow-400 mr-3">C: {parseFloat(foodItem.carbs_per_100g.toFixed(1))}g</span>
                        <span className="text-blue-400">F: {parseFloat(foodItem.fat_per_100g.toFixed(1))}g</span>
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        {Math.round(foodItem.calories_per_100g)} kcal per 100g
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Pagination */}
              {totalCount > LIMIT && (
                <div className="flex justify-center mt-4">
                  <nav className="flex items-center">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 border rounded-md mr-2 disabled:opacity-50 dark:bg-gray-700 dark:border-gray-600"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-300">
                      Page {page} of {Math.ceil(totalCount / LIMIT)}
                    </span>
                    <button
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= Math.ceil(totalCount / LIMIT)}
                      className="px-3 py-1 border rounded-md ml-2 disabled:opacity-50 dark:bg-gray-700 dark:border-gray-600"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              )}
            </div>

            {/* Selected food item details */}
            {selectedFoodItem && (
              <div className="mt-4 p-4 border border-gray-700 dark:border-gray-700 rounded-md bg-gray-800/50">
                <h4 className="font-medium text-gray-200 mb-2">
                  Selected: {selectedFoodItem.food_name}
                </h4>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Custom Name (optional)
                  </label>
                  <input
                    type="text"
                    value={customFoodName}
                    onChange={(e) => setCustomFoodName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder={selectedFoodItem.food_name}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Leave as is or customize the name that will be displayed in your meal plan.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      min="0"
                      step="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Unit
                    </label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="g">grams (g)</option>
                      <option value="oz">ounces (oz)</option>
                      <option value="ml">milliliters (ml)</option>
                      <option value="tbsp">tablespoons (tbsp)</option>
                      <option value="tsp">teaspoons (tsp)</option>
                      <option value="cup">cups</option>
                      <option value="serving">serving</option>
                    </select>
                  </div>
                </div>
                
                <div className="mt-3">
                  <div className="text-sm text-gray-300">
                    <span className="font-medium">Nutrition per 100g:</span> 
                    <span className="ml-2 text-red-400">P: {parseFloat(selectedFoodItem.protein_per_100g.toFixed(1))}g</span> | 
                    <span className="ml-2 text-yellow-400">C: {parseFloat(selectedFoodItem.carbs_per_100g.toFixed(1))}g</span> | 
                    <span className="ml-2 text-blue-400">F: {parseFloat(selectedFoodItem.fat_per_100g.toFixed(1))}g</span> | 
                    <span className="ml-2">{Math.round(selectedFoodItem.calories_per_100g)} kcal</span>
                  </div>
                </div>
                
                <div className="mt-4">
                  <button
                    onClick={handleAddToMealClick}
                    disabled={!selectedMealId}
                    className={`action-button w-full py-2 ${
                      selectedMealId 
                        ? 'bg-indigo-600 hover:bg-indigo-700' 
                        : 'bg-gray-600 cursor-not-allowed'
                    } text-white rounded-md flex items-center justify-center`}
                  >
                    <FiPlus className="mr-2" />
                    {selectedMealId 
                      ? `Add to ${meals.find(m => m.id === selectedMealId)?.name || 'Selected Meal'}` 
                      : 'Select a meal first'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Right panel - Meals display */}
        <div className="col-span-8">
          <div className="bg-gray-900 dark:bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-100 dark:text-white mb-4">
              All Meal Plans
            </h3>
            
            {meals.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                No meals found. Create your first meal.
              </div>
            ) : (
              <div className="space-y-8">
                {/* Group meals by day type */}
                {Object.entries(getMealsByDayType()).map(([dayType, dayMeals]) => (
                  <div key={dayType} className="mb-6">
                    <h4 className="text-md font-semibold text-gray-200 mb-3 border-b border-gray-700 pb-2">
                      {formatDayType(dayType)}
                    </h4>
                    
                    <div className="space-y-4">
                      {dayMeals.map((meal) => (
                        <div 
                          key={meal.id} 
                          className={getMealCardStyle(meal.id)}
                          onClick={() => selectMeal(meal.id)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="text-md font-semibold text-gray-200 flex items-center">
                                <span className="mr-2">{meal.name}</span>
                              </h4>
                              <div className="text-sm text-gray-400">{meal.time_of_day}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-md font-semibold text-gray-200">{Math.round(meal.total_calories || 0)} cal</div>
                              <div className="text-sm text-gray-400">
                                P: {(meal.total_protein || 0).toFixed(1)}g • C: {(meal.total_carbs || 0).toFixed(1)}g • F: {(meal.total_fat || 0).toFixed(1)}g
                              </div>
                            </div>
                          </div>
                          
                          {/* Food items in this meal */}
                          {meal.food_items && meal.food_items.length > 0 ? (
                            <div className="mt-4 space-y-2">
                              {meal.food_items.map((item) => (
                                <div key={item.id} className="p-2 bg-gray-700 dark:bg-gray-700 rounded flex justify-between items-center">
                                  <div>
                                    <div className="font-medium text-gray-200">
                                      {item.food_item.food_name}
                                    </div>
                                    <div className="text-sm text-gray-400">
                                      {item.quantity} {item.unit} ({Math.round(item.calories)} cal)
                                    </div>
                                  </div>
                                  <div className="flex items-center">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveFoodFromMeal(meal.id, item.id);
                                      }}
                                      className="p-1 text-gray-400 hover:text-red-400"
                                      title="Remove"
                                    >
                                      <FiTrash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-4 p-3 bg-gray-700/50 dark:bg-gray-700/50 rounded text-center text-gray-400">
                              No food items added to this meal yet.
                            </div>
                          )}
                          
                          {/* Add food to this meal button */}
                          {selectedMealId === meal.id && !selectedFoodItem && (
                            <div className="mt-3 text-center">
                              <div className="text-sm text-gray-300 bg-indigo-900/30 border border-indigo-800/50 rounded-md p-2">
                                <FiInfo className="inline mr-1" /> 
                                This meal is selected. Search and select a food item on the left to add to this meal.
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Custom Food Form */}
      {showCustomFoodForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full mx-4 shadow-xl">
            <CustomFoodItemForm 
              onSave={handleCustomFoodSave}
              onCancel={() => setShowCustomFoodForm(false)}
              initialData={initialFoodData || undefined}
            />
          </div>
        </div>
      )}
      
      {/* Recipe Manager */}
      {showRecipeManager && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg max-w-5xl w-full mx-4 shadow-xl">
            <RecipeManager 
              onClose={() => setShowRecipeManager(false)}
              onSelectRecipe={handleSelectRecipe}
              selectionMode={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MealPlannerIntegrated; 