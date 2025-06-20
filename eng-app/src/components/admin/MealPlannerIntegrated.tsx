import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectProfile } from '../../store/slices/authSlice';
import { FiSearch, FiPlus, FiTrash2, FiX, FiInfo, FiBook, FiArrowLeft, FiSave, FiCalendar, FiActivity, FiEdit3, FiChevronUp, FiChevronDown, FiEdit2 } from 'react-icons/fi';
import { TbBarcode } from 'react-icons/tb';
import toast from 'react-hot-toast';
import CustomFoodItemForm from '../nutrition/CustomFoodItemForm';
import BarcodeScanner from '../nutrition/BarcodeScanner';
import RecipeManager from './RecipeManager';
import {
  searchFoodItems,
  addFoodItemToMeal,
  removeFoodItemFromMeal,
  addRecipeToMeal,
  getNutritionPlanById,
  createMeal,
  updateMealFoodItem
} from '../../services/mealPlanningService';
import { FoodItem, MealFoodItem } from '../../types/mealPlanning';
import { supabase } from '../../services/supabaseClient';

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
  order_in_plan?: number;
  description?: string;
  notes?: string;
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

// Add this new interface for day type options
interface DayTypeOption {
  value: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

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
  
  // Add these new state variables for the edit meal modal
  const [showDayTypeModal, setShowDayTypeModal] = useState(false);
  const [showEditMealModal, setShowEditMealModal] = useState(false);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [newMealName, setNewMealName] = useState('');
  const [selectedDayType, setSelectedDayType] = useState('rest');
  const [timeSuggestion, setTimeSuggestion] = useState('');
  const [timeHour, setTimeHour] = useState('08'); // Use two digits for consistency
  const [timeMinute, setTimeMinute] = useState('00');
  const [mealDescription, setMealDescription] = useState('');
  const [mealNotes, setMealNotes] = useState('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [mealToDelete, setMealToDelete] = useState<string | null>(null);
  
  // Add these new state variables for editing food items
  const [showEditFoodItemModal, setShowEditFoodItemModal] = useState(false);
  const [editingFoodItem, setEditingFoodItem] = useState<MealFoodItem | null>(null);
  const [editFoodItemQuantity, setEditFoodItemQuantity] = useState('');
  const [editFoodItemUnit, setEditFoodItemUnit] = useState('');
  const [editFoodItemNotes, setEditFoodItemNotes] = useState('');
  
  // Add this array of common meal time presets
  const mealTimePresets = [
    { label: 'Breakfast', time: '08:00' },
    { label: 'Mid-Morning Snack', time: '10:30' },
    { label: 'Lunch', time: '12:30' },
    { label: 'Afternoon Snack', time: '15:30' },
    { label: 'Pre-Workout', time: '17:00' },
    { label: 'Post-Workout', time: '19:00' },
    { label: 'Dinner', time: '19:30' },
    { label: 'Evening Snack', time: '21:00' }
  ];
  
  // State for ingredient slider functionality
  const [editingQuantity, setEditingQuantity] = useState<{ [key: string]: number }>({});
  const [pendingUpdates, setPendingUpdates] = useState<{ [key: string]: boolean }>({});
  
  // Define day type options
  const dayTypeOptions: DayTypeOption[] = [
    {
      value: 'rest',
      label: 'Rest Day',
      description: 'Lower calories, typically with reduced carbs',
      icon: <FiCalendar className="text-blue-400" />
    },
    {
      value: 'light',
      label: 'Light Training',
      description: 'Slightly increased calories for light activity days',
      icon: <FiActivity className="text-green-400" />
    },
    {
      value: 'moderate',
      label: 'Moderate Training',
      description: 'Balanced macros for regular training days',
      icon: <FiActivity className="text-yellow-400" />
    },
    {
      value: 'heavy',
      label: 'Heavy Training',
      description: 'Higher calories with increased carbs for intense workouts',
      icon: <FiActivity className="text-orange-400" />
    },
    {
      value: 'training',
      label: 'General Training',
      description: 'Standard balanced macros for typical training days',
      icon: <FiActivity className="text-indigo-400" />
    }
  ];
  
  // Add this state to track which day type sections are expanded
  const [expandedDayTypes, setExpandedDayTypes] = useState<Record<string, boolean>>({});
  
  // Add this state to track whether all day types are collapsed
  const [allExpanded, setAllExpanded] = useState(false);
  
  // Add a toggle function for all day types at once
  const toggleAllDayTypes = () => {
    const dayTypes = Object.keys(getMealsByDayType());
    const newExpandState: Record<string, boolean> = {};
    const newAllExpanded = !allExpanded;
    
    dayTypes.forEach(type => {
      newExpandState[type] = newAllExpanded;
    });
    
    setExpandedDayTypes(newExpandState);
    setAllExpanded(newAllExpanded);
  };
  
  // Add a toggle function for day type expansion
  const toggleDayTypeExpanded = (dayType: string) => {
    const newExpandedDayTypes = {
      ...expandedDayTypes,
      [dayType]: !expandedDayTypes[dayType]
    };
    
    setExpandedDayTypes(newExpandedDayTypes);
    
    // Check if all day types are expanded to update allExpanded state
    const dayTypes = Object.keys(getMealsByDayType());
    const allAreExpanded = dayTypes.every(type => newExpandedDayTypes[type]);
    setAllExpanded(allAreExpanded);
  };
  
  // Add this to initialize all day types as expanded
  useEffect(() => {
    const dayTypes = Object.keys(getMealsByDayType());
    if (dayTypes.length > 0) {
      const initialExpandState: Record<string, boolean> = {};
      dayTypes.forEach(type => {
        initialExpandState[type] = false; // Set to false to start collapsed
      });
      setExpandedDayTypes(initialExpandState);
    }
  }, [meals]);
  
  // Helper to get icon for day type
  const getDayTypeIcon = (dayType: string) => {
    switch (dayType.toLowerCase()) {
      case 'rest':
        return <FiCalendar className="text-blue-400" />;
      case 'light':
        return <FiActivity className="text-green-400" />;
      case 'moderate':
        return <FiActivity className="text-yellow-400" />;
      case 'heavy':
        return <FiActivity className="text-orange-400" />;
      case 'training':
        return <FiActivity className="text-indigo-400" />;
      default:
        return <FiCalendar className="text-gray-400" />;
    }
  };
  
  // Helper to get background color for day type
  const getDayTypeColor = (dayType: string) => {
    switch (dayType.toLowerCase()) {
      case 'rest':
        return 'from-blue-900/30 to-blue-800/10';
      case 'light':
        return 'from-green-900/30 to-green-800/10';
      case 'moderate':
        return 'from-yellow-900/30 to-yellow-800/10';
      case 'heavy':
        return 'from-orange-900/30 to-orange-800/10';
      case 'training':
        return 'from-indigo-900/30 to-indigo-800/10';
      default:
        return 'from-gray-800 to-gray-900';
    }
  };
  
  // Define fetchMeals function with useCallback before it's used in useEffect
  const fetchMeals = useCallback(async () => {
    if (!profile?.id || !planId) return;
    
    try {
      // Get the nutrition plan with meals
      const nutritionPlan = await getNutritionPlanById(planId);
      
      if (!nutritionPlan) {
        return;
      }
      
      // Get all meals without filtering by day type
      const allMeals = nutritionPlan.meals;
      
      // Create a compatible format for our component state
      const formattedMeals = allMeals.map(meal => ({
        id: meal.id,
        name: meal.name,
        notes: meal.notes || '',
        day_type: meal.day_type || 'rest',
        order_in_plan: meal.order_in_plan || 0,
        time_of_day: meal.time_suggestion || '',
        total_calories: meal.total_calories || 0,
        total_protein: meal.total_protein || 0,
        total_carbs: meal.total_carbs || 0,
        total_fat: meal.total_fat || 0,
        food_items: (meal.food_items || []).map(item => ({
          id: item.id,
          meal_id: meal.id,
          food_item_id: item.food_item?.id || '',
          food_item: item.food_item as unknown as FoodItem,
          quantity: item.quantity,
          unit: item.unit,
          calories: item.calculated_calories || 0,
          protein: item.calculated_protein || 0,
          carbs: item.calculated_carbs || 0,
          fat: item.calculated_fat || 0,
          created_at: item.created_at || new Date().toISOString(),
          notes: item.notes || ''
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
      setPlanName(initialPlan.name || 'New Nutrition Plan');
      setPlanDescription(initialPlan.description || '');
      setPlanCalories(initialPlan.total_calories);
      setPlanProtein(initialPlan.protein_grams);
      setPlanCarbs(initialPlan.carbohydrate_grams);
      setPlanFat(initialPlan.fat_grams);
      setIsPublic(initialPlan.is_public || false);
      
      if (initialPlan.meals && initialPlan.meals.length > 0) {
        // Transform meals to match the expected MealData format
        const formattedMeals = initialPlan.meals.map(meal => ({
          id: meal.id,
          name: meal.name,
          day_type: meal.day_type || 'rest',
          order_in_plan: meal.order_in_plan || 0,
          time_of_day: meal.time_suggestion || '',
          total_calories: meal.total_calories || 0,
          total_protein: meal.total_protein || 0,
          total_carbs: meal.total_carbs || 0,
          total_fat: meal.total_fat || 0,
          notes: meal.notes || '',
          food_items: (meal.food_items || []).map(item => ({
            id: item.id,
            meal_id: meal.id,
            food_item_id: item.food_item?.id || '',
            food_item: item.food_item as unknown as FoodItem,
            quantity: item.quantity,
            unit: item.unit,
            calories: item.calculated_calories || 0,
            protein: item.calculated_protein || 0,
            carbs: item.calculated_carbs || 0,
            fat: item.calculated_fat || 0,
            created_at: item.created_at || new Date().toISOString(),
            notes: item.notes || ''
          }))
        })) as MealData[];

        setMeals(formattedMeals);
        
        // Just select the first meal if none is selected
        if (!selectedMealId && formattedMeals.length > 0) {
          setSelectedMealId(formattedMeals[0].id);
        }
      } else {
        // Only fetch meals if we have a planId (editing mode)
        if (planId) {
          fetchMeals();
        }
      }
    } else {
      // If no initialPlan and we have a planId, fetch plan data
      if (planId) {
        fetchMeals();
      }
    }
  }, [initialPlan, planId, selectedMealId, fetchMeals]);
  
  // Update the create meal handler to use the modal
  const handleCreateMeal = () => {
    if (!profile?.id || !planId) {
      setError('Cannot create meal: Plan ID is missing');
      return;
    }
    
    // Reset all fields
    setNewMealName(`Meal ${meals.length + 1}`);
    setSelectedDayType('rest');
    setTimeSuggestion('');
    setTimeHour('08');
    setTimeMinute('00');
    setMealDescription('');
    setMealNotes('');
    
    // Show the modal
    setShowDayTypeModal(true);
  };
  
  // Add this helper function to format the time
  const formatTimeForSubmission = () => {
    if (timeSuggestion) {
      return timeSuggestion;
    }
    
    return `${timeHour}:${timeMinute}`;
  };
  
  // Update the handleSubmitNewMeal function to use the formatted time
  const handleSubmitNewMeal = async () => {
    try {
      setIsLoading(true);
      
      // Format the time suggestion from the time picker components
      const formattedTimeSuggestion = formatTimeForSubmission();
      
      // Only pass properties that are actually supported by the API
      const newMeal = await createMeal({
        nutrition_plan_id: planId as string,
        name: newMealName.trim() || `Meal ${meals.length + 1}`,
        day_type: selectedDayType.toLowerCase(),
        time_suggestion: formattedTimeSuggestion,
        order_in_plan: meals.length
      });
      
      // If description and notes are supported in the database but not by the API,
      // we could update them separately after creation - but for now, we'll just keep
      // the UI fields for user reference
      
      // Update the meals state
      await fetchMeals();
      
      // Select the new meal
      selectMeal(newMeal.id);
      
      toast.success('New meal created');
      
      // Close the modal
      setShowDayTypeModal(false);
    } catch (err) {
      console.error('Error creating meal:', err);
      setError('Failed to create meal');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add function to handle preset time selection
  const handleTimePresetSelect = (preset: string) => {
    setTimeSuggestion(preset);
    
    // Parse the time string to update the individual time components
    if (preset.includes(':')) {
      const [hour, minute] = preset.split(':');
      setTimeHour(hour);
      setTimeMinute(minute);
    }
  };
  
  // Search functionality
  const performSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
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
  const handleBarcodeDetect = async (foodItem: FoodItem | null, barcode: string) => {
    setShowBarcodeScanner(false);
    
    if (!barcode) {
      setError('No barcode detected');
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (foodItem) {
        // Food item found directly from barcode scanner
        setSelectedFoodItem(foodItem);
        setQuantity('100');
        setUnit('g');
      } else {
        // Try to search for the food item by barcode
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
  
  // Handle quantity slider change with debouncing for performance
  const handleQuantitySliderChange = useCallback((mealFoodId: string, newQuantity: number) => {
    setEditingQuantity(prev => ({
      ...prev,
      [mealFoodId]: newQuantity
    }));
    setPendingUpdates(prev => ({
      ...prev,
      [mealFoodId]: true
    }));
  }, []);
  
  // Save updated quantity
  const handleSaveQuantityUpdate = async (mealFoodId: string, foodItem: MealFoodItem) => {
    try {
      const newQuantity = editingQuantity[mealFoodId];
      if (newQuantity === undefined || newQuantity === foodItem.quantity) {
        setPendingUpdates(prev => {
          const updated = { ...prev };
          delete updated[mealFoodId];
          return updated;
        });
        return;
      }
      
      setIsLoading(true);
      
      await updateMealFoodItem(mealFoodId, {
        quantity: newQuantity
      });
      
      // Clear editing state
      setEditingQuantity(prev => {
        const updated = { ...prev };
        delete updated[mealFoodId];
        return updated;
      });
      setPendingUpdates(prev => {
        const updated = { ...prev };
        delete updated[mealFoodId];
        return updated;
      });
      
      // Refresh meals to show updated values
      await fetchMeals();
      
      toast.success('Quantity updated successfully');
    } catch (err) {
      console.error('Error updating quantity:', err);
      toast.error('Failed to update quantity');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Cancel quantity edit
  const handleCancelQuantityEdit = (mealFoodId: string) => {
    setEditingQuantity(prev => {
      const updated = { ...prev };
      delete updated[mealFoodId];
      return updated;
    });
    setPendingUpdates(prev => {
      const updated = { ...prev };
      delete updated[mealFoodId];
      return updated;
    });
  };
  
  // Calculate real-time macros for display while editing
  const calculateRealTimeMacros = useCallback((foodItem: MealFoodItem, newQuantity?: number) => {
    const quantity = newQuantity !== undefined ? newQuantity : foodItem.quantity;
    const multiplier = quantity / 100; // Assuming per 100g basis
    
    if (!foodItem.food_item) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    
    return {
      calories: (foodItem.food_item.calories_per_100g * multiplier),
      protein: (foodItem.food_item.protein_per_100g * multiplier),
      carbs: (foodItem.food_item.carbs_per_100g * multiplier),
      fat: (foodItem.food_item.fat_per_100g * multiplier)
    };
  }, []);
  
  // Calculate live macros for a meal including any pending edits
  const calculateLiveMealMacros = useCallback((meal: MealData) => {
    if (!meal.food_items) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    
    return meal.food_items.reduce((totals, foodItem) => {
      const quantity = editingQuantity[foodItem.id] !== undefined 
        ? editingQuantity[foodItem.id] 
        : foodItem.quantity;
      
      const itemMacros = calculateRealTimeMacros(foodItem, quantity);
      
      return {
        calories: totals.calories + itemMacros.calories,
        protein: totals.protein + itemMacros.protein,
        carbs: totals.carbs + itemMacros.carbs,
        fat: totals.fat + itemMacros.fat
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }, [editingQuantity, calculateRealTimeMacros]);
  
  // Helper function to group meals by day type (memoized)
  const getMealsByDayType = useCallback(() => {
    // Group meals by day type
    const groupedMeals: Record<string, MealData[]> = {};
    
    meals.forEach(meal => {
      const dayType = meal.day_type || 'rest';
      if (!groupedMeals[dayType]) {
        groupedMeals[dayType] = [];
      }
      groupedMeals[dayType].push(meal);
    });
    
    // Sort meals by order_in_plan within each day type
    Object.keys(groupedMeals).forEach(dayType => {
      groupedMeals[dayType].sort((a, b) => {
        const orderA = a.order_in_plan ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.order_in_plan ?? Number.MAX_SAFE_INTEGER;
        return orderA - orderB;
      });
    });
    
    return groupedMeals;
  }, [meals]);

  // Calculate live macros for a day type including any pending edits
  const calculateLiveDayTypeMacros = useCallback((dayTypeMeals: MealData[]) => {
    return dayTypeMeals.reduce((totals, meal) => {
      const mealMacros = calculateLiveMealMacros(meal);
      return {
        calories: totals.calories + mealMacros.calories,
        protein: totals.protein + mealMacros.protein,
        carbs: totals.carbs + mealMacros.carbs,
        fat: totals.fat + mealMacros.fat
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }, [calculateLiveMealMacros]);
  
  
  // Function to get appropriate styling for meal cards
  const getMealCardStyle = (mealId: string) => {
    return `p-4 bg-white dark:bg-gray-800 rounded-lg border-2 transition-all hover:shadow-md hover:-translate-y-0.5 
      ${selectedMealId === mealId 
        ? 'border-indigo-500 dark:border-indigo-400 animate-pulse-border' 
        : 'border-gray-300 dark:border-gray-700'}`;
  };
  
  // State to track day type frequencies (days per week)
  const [dayTypeFrequencies, setDayTypeFrequencies] = useState<Record<string, number>>(() => {
    // Try to load from local storage
    const savedFrequencies = localStorage.getItem(`meal-plan-frequencies-${planId}`);
    return savedFrequencies ? JSON.parse(savedFrequencies) : {};
  });
  
  // Update local storage when frequencies change
  useEffect(() => {
    // Only save if we have a plan ID
    if (planId) {
      localStorage.setItem(`meal-plan-frequencies-${planId}`, JSON.stringify(dayTypeFrequencies));
    }
  }, [dayTypeFrequencies, planId]);

  // Calculate live average daily nutrition including pending edits
  const calculateLiveAverageNutrition = useMemo(() => {
    const mealsByDayType = getMealsByDayType();
    const frequencies = dayTypeFrequencies;
    
    let totalCals = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalDays = 0;
    
    Object.entries(mealsByDayType).forEach(([dayType, dayMeals]) => {
      const frequency = frequencies[dayType] || 0;
      if (frequency > 0) {
        const dayMacros = calculateLiveDayTypeMacros(dayMeals);
        totalCals += dayMacros.calories * frequency;
        totalProtein += dayMacros.protein * frequency;
        totalCarbs += dayMacros.carbs * frequency;
        totalFat += dayMacros.fat * frequency;
        totalDays += frequency;
      }
    });
    
    if (totalDays === 0) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    
    return {
      calories: totalCals / 7, // Average per day across the week
      protein: totalProtein / 7,
      carbs: totalCarbs / 7,
      fat: totalFat / 7
    };
  }, [getMealsByDayType, dayTypeFrequencies, calculateLiveDayTypeMacros]);

  // Calculate average nutrition by day type with weighted average based on frequency
  
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
  
  // Add a function to handle meal edit button click
  const handleEditMeal = (meal: MealData) => {
    setEditingMealId(meal.id);
    setNewMealName(meal.name);
    setSelectedDayType(meal.day_type || 'rest');
    
    // Parse time suggestion if it's in time format
    const timeSugg = meal.time_suggestion || meal.time_of_day || '';
    setTimeSuggestion(timeSugg);
    
    if (timeSugg && timeSugg.includes(':')) {
      const [hour, minute] = timeSugg.split(':');
      setTimeHour(hour);
      setTimeMinute(minute);
    } else {
      // Default values if time is not in expected format
      setTimeHour('08');
      setTimeMinute('00');
    }
    
    setMealDescription(meal.description || '');
    setMealNotes(meal.notes || '');
    
    setShowEditMealModal(true);
  };

  // Add a function to handle saving edited meal
  const handleSaveEditedMeal = async () => {
    if (!editingMealId) return;
    
    try {
      setIsLoading(true);
      
      // Format the time suggestion from the time picker components
      const formattedTimeSuggestion = formatTimeForSubmission();
      
      // Update the meal in the database
      const { error } = await supabase
        .from('meals')
        .update({
          name: newMealName.trim(),
          day_type: selectedDayType.toLowerCase(),
          time_suggestion: formattedTimeSuggestion,
          description: mealDescription,
          notes: mealNotes
        })
        .eq('id', editingMealId);
      
      if (error) throw error;
      
      // Update the meals state
      await fetchMeals();
      
      toast.success('Meal updated successfully');
      
      // Close the modal
      setShowEditMealModal(false);
      setEditingMealId(null);
    } catch (err) {
      console.error('Error updating meal:', err);
      setError('Failed to update meal');
    } finally {
      setIsLoading(false);
    }
  };

  // Add a function to handle meal deletion
  const handleDeleteMeal = async () => {
    if (!mealToDelete) return;
    
    try {
      setIsLoading(true);
      
      // Delete the meal from the database
      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('id', mealToDelete);
      
      if (error) throw error;
      
      // Update the meals state
      await fetchMeals();
      
      toast.success('Meal deleted successfully');
      
      // Close the confirmation dialog
      setShowDeleteConfirmation(false);
      setMealToDelete(null);
    } catch (err) {
      console.error('Error deleting meal:', err);
      setError('Failed to delete meal');
    } finally {
      setIsLoading(false);
    }
  };

  // Add functions to handle meal reordering
  const handleMoveMealUp = async (meal: MealData, dayMeals: MealData[]) => {
    // Find the current meal's index in the day type group
    const currentIndex = dayMeals.findIndex(m => m.id === meal.id);
    if (currentIndex <= 0) return; // Already at the top
    
    try {
      setIsLoading(true);
      
      // Get the meal that's above the current meal
      const aboveMeal = dayMeals[currentIndex - 1];
      
      // Get all day type meals and their orders for proper resequencing
      const mealOrders = dayMeals.map((m, idx) => ({
        id: m.id,
        currentOrder: m.order_in_plan ?? idx
      }));
      
      // Reorder the specific meals
      const swapPosition = mealOrders.findIndex(m => m.id === aboveMeal.id);
      const currentPosition = mealOrders.findIndex(m => m.id === meal.id);
      
      // Swap the positions
      [mealOrders[swapPosition], mealOrders[currentPosition]] = 
      [mealOrders[currentPosition], mealOrders[swapPosition]];
      
      // Update database for both meals
      await Promise.all([
        supabase
          .from('meals')
          .update({ order_in_plan: swapPosition })
          .eq('id', meal.id),
        supabase
          .from('meals')
          .update({ order_in_plan: currentPosition })
          .eq('id', aboveMeal.id)
      ]);
      
      // Refresh meals to see the updated order
      await fetchMeals();
      
    } catch (err) {
      console.error('Error reordering meals:', err);
      setError('Failed to reorder meals');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoveMealDown = async (meal: MealData, dayMeals: MealData[]) => {
    // Find the current meal's index in the day type group
    const currentIndex = dayMeals.findIndex(m => m.id === meal.id);
    if (currentIndex >= dayMeals.length - 1) return; // Already at the bottom
    
    try {
      setIsLoading(true);
      
      // Get the meal that's below the current meal
      const belowMeal = dayMeals[currentIndex + 1];
      
      // Get all day type meals and their orders for proper resequencing
      const mealOrders = dayMeals.map((m, idx) => ({
        id: m.id,
        currentOrder: m.order_in_plan ?? idx
      }));
      
      // Reorder the specific meals
      const swapPosition = mealOrders.findIndex(m => m.id === belowMeal.id);
      const currentPosition = mealOrders.findIndex(m => m.id === meal.id);
      
      // Swap the positions
      [mealOrders[swapPosition], mealOrders[currentPosition]] = 
      [mealOrders[currentPosition], mealOrders[swapPosition]];
      
      // Update database for both meals
      await Promise.all([
        supabase
          .from('meals')
          .update({ order_in_plan: swapPosition })
          .eq('id', meal.id),
        supabase
          .from('meals')
          .update({ order_in_plan: currentPosition })
          .eq('id', belowMeal.id)
      ]);
      
      // Refresh meals to see the updated order
      await fetchMeals();
      
    } catch (err) {
      console.error('Error reordering meals:', err);
      setError('Failed to reorder meals');
    } finally {
      setIsLoading(false);
    }
  };


  
  // Add function to handle edit food item button click
  const handleEditFoodItem = (mealId: string, foodItem: MealFoodItem) => {
    setEditingFoodItem(foodItem);
    setEditFoodItemQuantity(foodItem.quantity.toString());
    setEditFoodItemUnit(foodItem.unit || 'g');
    setEditFoodItemNotes(foodItem.notes || '');
    setShowEditFoodItemModal(true);
  };
  
  // Add function to handle saving edited food item
  const handleSaveEditedFoodItem = async () => {
    if (!editingFoodItem) return;
    
    try {
      setIsLoading(true);
      
      // Parse quantity as a number
      const parsedQuantity = parseFloat(editFoodItemQuantity);
      if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
        setError('Quantity must be a positive number');
        return;
      }
      
      // Update the food item in the database
      await updateMealFoodItem(editingFoodItem.id, {
        quantity: parsedQuantity,
        unit: editFoodItemUnit,
        notes: editFoodItemNotes
      });
      
      // Refresh meals to see the updates
      await fetchMeals();
      
      toast.success('Food item updated');
      
      // Close the modal and reset state
      setShowEditFoodItemModal(false);
      setEditingFoodItem(null);
    } catch (err) {
      console.error('Error updating food item:', err);
      setError('Failed to update food item');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add this new state variable for tracking meal being reordered
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [reorderingMeal, setReorderingMeal] = useState<MealData | null>(null);
  const [newOrderValue, setNewOrderValue] = useState<number>(0);
  
  // Add new function to handle manual order change
  const handleShowOrderModal = (meal: MealData) => {
    setReorderingMeal(meal);
    setNewOrderValue(meal.order_in_plan ?? 0);
    setShowOrderModal(true);
  };
  
  const handleSaveOrder = async () => {
    if (!reorderingMeal) return;
    
    try {
      setIsLoading(true);
      
      // Update the meal's order_in_plan value
      await supabase
        .from('meals')
        .update({ order_in_plan: newOrderValue })
        .eq('id', reorderingMeal.id);
      
      // Refresh meals to see the updated order
      await fetchMeals();
      
      // Close the modal
      setShowOrderModal(false);
      setReorderingMeal(null);
      
    } catch (err) {
      console.error('Error updating meal order:', err);
      setError('Failed to update meal order');
    } finally {
      setIsLoading(false);
    }
  };
  
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
            className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
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
            className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
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
              className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
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
              className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
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
              className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
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
              className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
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
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Average Daily Nutrition</h2>
            <div className="text-xs bg-gray-100 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 rounded py-1 px-2">
              Weighted average based on days per week for each meal type
            </div>
          </div>
          
          {/* Day Type Frequency Configuration */}
          <div className="mb-6 bg-gray-100 dark:bg-gray-800/50 p-3 rounded-md">
            <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Days Per Week Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.keys(getMealsByDayType()).map(dayType => (
                <div key={dayType} className="flex items-center justify-between bg-gray-200 dark:bg-gray-700/70 p-2 rounded">
                  <span className="text-sm text-gray-800 dark:text-gray-200">{dayType}</span>
                  <div className="flex items-center">
                    <input
                      type="number"
                      min="0"
                      max="7"
                      value={dayTypeFrequencies[dayType] || 1}
                      onChange={e => {
                        const value = Math.min(7, Math.max(0, parseInt(e.target.value) || 0));
                        setDayTypeFrequencies(prev => ({ ...prev, [dayType]: value }));
                      }}
                      className="w-14 py-1 px-2 bg-gray-600 border border-gray-500 rounded text-white text-center"
                    />
                    <span className="ml-2 text-xs text-gray-900 dark:text-gray-100">days/week</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Total days indicator */}
            {(() => {
              const totalDays = Object.values(dayTypeFrequencies).reduce((sum, days) => sum + (days || 0), 0);
              const isValid = totalDays === 7;
              return (
                <div className="mt-2 flex justify-between items-center">
                  <div className="text-xs text-gray-400 italic">
                    Set how many days per week each meal type occurs.
                  </div>
                  <div className={`text-sm font-medium rounded px-2 py-1 ${isValid ? 'bg-green-700/50 text-green-300' : 'bg-yellow-700/50 text-yellow-300'}`}>
                    Total: {totalDays}/7 days {isValid ? '✓' : ''}
                  </div>
                </div>
              );
            })()}
          </div>
          
          {/* Calculate nutrition values dynamically */}
          {(() => {
            const avgNutrition = calculateLiveAverageNutrition;
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
                <div className="bg-gray-100 dark:bg-gray-800/30 rounded-lg p-4 border border-gray-300 dark:border-gray-700">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Calories</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-200">{Math.round(avgNutrition.calories)}</div>
                  <div className="text-xs text-gray-500">kcal</div>
                </div>
                
                <div className="bg-gray-100 dark:bg-gray-800/30 rounded-lg p-4 border border-gray-300 dark:border-gray-700">
                  <div className="flex justify-between">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Protein</div>
                    <div className="text-sm text-red-400">{proteinPerc}%</div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-200">{avgNutrition.protein.toFixed(1)}g</div>
                  <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                    <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${proteinPerc}%` }}></div>
                  </div>
                </div>
                
                <div className="bg-gray-100 dark:bg-gray-800/30 rounded-lg p-4 border border-gray-300 dark:border-gray-700">
                  <div className="flex justify-between">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Carbs</div>
                    <div className="text-sm text-yellow-400">{carbsPerc}%</div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-200">{avgNutrition.carbs.toFixed(1)}g</div>
                  <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                    <div className="bg-yellow-500 h-1.5 rounded-full" style={{ width: `${carbsPerc}%` }}></div>
                  </div>
                </div>
                
                <div className="bg-gray-100 dark:bg-gray-800/30 rounded-lg p-4 border border-gray-300 dark:border-gray-700">
                  <div className="flex justify-between">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Fat</div>
                    <div className="text-sm text-blue-400">{fatPerc}%</div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-200">{avgNutrition.fat.toFixed(1)}g</div>
                  <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-1.5 mt-2">
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
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 h-full border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Food Selection</h3>
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
                  className="w-full pl-10 pr-4 py-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
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
                  className="w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
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
                        {!['usda', 'custom', 'system', 'coach'].includes(foodItem.source || '') && (
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
                    className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
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
                      className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
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
                      className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
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
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                All Meal Plans
              </h3>
              
              <button
                onClick={toggleAllDayTypes}
                className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-400 transition-colors bg-gray-100 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-800 px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700"
              >
                {allExpanded ? (
                  <>
                    <FiChevronDown className="mr-1" /> Collapse All
                  </>
                ) : (
                  <>
                    <FiChevronUp className="mr-1" /> Expand All
                  </>
                )}
              </button>
            </div>
            
            {meals.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                No meals found. Create your first meal.
              </div>
            ) : (
              <div className="space-y-8">
                {/* Group meals by day type */}
                {Object.entries(getMealsByDayType()).map(([dayType, dayMeals]) => (
                  <div key={dayType} className="mb-8">
                    <div 
                      className={`p-3 rounded-lg mb-3 cursor-pointer bg-gradient-to-r ${getDayTypeColor(dayType)} border border-gray-700 shadow-md`}
                      onClick={() => toggleDayTypeExpanded(dayType)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="mr-2 flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800/50">
                            {getDayTypeIcon(dayType)}
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-200">
                              {formatDayType(dayType)}
                            </h4>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              {dayMeals.length} {dayMeals.length === 1 ? 'meal' : 'meals'} • 
                              {' '}{Math.round(calculateLiveDayTypeMacros(dayMeals).calories)} calories
                            </div>
                          </div>
                        </div>
                        <div>
                          {expandedDayTypes[dayType] ? (
                            <FiChevronUp className="text-gray-400" />
                          ) : (
                            <FiChevronDown className="text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {expandedDayTypes[dayType] && (
                      <div className="space-y-4 pl-2 pr-2">
                        {dayMeals.map((meal) => (
                          <div 
                            key={meal.id} 
                            className={getMealCardStyle(meal.id)}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1" onClick={() => selectMeal(meal.id)}>
                                <h4 className="text-md font-semibold text-gray-900 dark:text-gray-200 flex items-center">
                                  <span className="mr-2">{meal.name}</span>
                                </h4>
                                <div className="text-sm text-gray-600 dark:text-gray-400">{meal.time_of_day || meal.time_suggestion}</div>
                              </div>
                              <div className="flex items-start space-x-1">
                                {/* Move Up/Down Controls */}
                                <div className="flex flex-col mr-3">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveMealUp(meal, dayMeals);
                                    }}
                                    className="p-1 text-gray-400 hover:text-indigo-400 transition-colors"
                                    title="Move Up"
                                  >
                                    <FiChevronUp size={16} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveMealDown(meal, dayMeals);
                                    }}
                                    className="p-1 text-gray-400 hover:text-indigo-400 transition-colors"
                                    title="Move Down"
                                  >
                                    <FiChevronDown size={16} />
                                  </button>
                                  {/* Add Order Number Display/Button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleShowOrderModal(meal);
                                    }}
                                    className="p-1 text-xs text-gray-400 hover:text-indigo-400 transition-colors"
                                    title="Set Order"
                                  >
                                    #{meal.order_in_plan ?? '?'}
                                  </button>
                                </div>
                                
                                <div className="text-right" onClick={() => selectMeal(meal.id)}>
                                  {(() => {
                                    const liveMacros = calculateLiveMealMacros(meal);
                                    return (
                                      <>
                                        <div className="text-md font-semibold text-gray-900 dark:text-gray-200">{Math.round(liveMacros.calories)} cal</div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                          P: {liveMacros.protein.toFixed(1)}g • C: {liveMacros.carbs.toFixed(1)}g • F: {liveMacros.fat.toFixed(1)}g
                                        </div>
                                      </>
                                    );
                                  })()}
                                </div>
                                
                                {/* Edit & Delete Buttons */}
                                <div className="ml-3 flex">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditMeal(meal);
                                    }}
                                    className="p-1 text-gray-400 hover:text-indigo-400 transition-colors"
                                    title="Edit Meal"
                                  >
                                    <FiEdit3 size={16} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMealToDelete(meal.id);
                                      setShowDeleteConfirmation(true);
                                    }}
                                    className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                                    title="Delete Meal"
                                  >
                                    <FiTrash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                            
                            {/* Food items in this meal */}
                            {meal.food_items && meal.food_items.length > 0 ? (
                              <div className="mt-4 space-y-3">
                                {meal.food_items.map((item) => {
                                  const isEditing = editingQuantity[item.id] !== undefined;
                                  const hasPendingUpdate = pendingUpdates[item.id];
                                  const currentQuantity = isEditing ? editingQuantity[item.id] : item.quantity;
                                  const realTimeMacros = calculateRealTimeMacros(item, isEditing ? editingQuantity[item.id] : undefined);
                                  
                                  return (
                                    <div key={item.id} className={`p-3 bg-gray-50 dark:bg-gray-700 rounded border-l-4 ${hasPendingUpdate ? 'border-yellow-500' : 'border-transparent'}`}>
                                      <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                          <div className="font-medium text-gray-900 dark:text-gray-200 mb-1">
                                            {item.food_item?.food_name}
                                          </div>
                                          {item.notes && (
                                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                              {item.notes}
                                            </div>
                                          )}
                                          
                                          {/* Quantity Slider */}
                                          <div className="mb-3">
                                            <div className="flex items-center justify-between mb-2">
                                              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Quantity: {currentQuantity}g
                                              </label>
                                              {hasPendingUpdate && (
                                                <span className="text-xs text-yellow-400 font-medium">
                                                  Unsaved changes
                                                </span>
                                              )}
                                            </div>
                                            
                                            <div className="flex items-center space-x-3">
                                              <input
                                                type="range"
                                                min="1"
                                                max="500"
                                                step="1"
                                                value={currentQuantity}
                                                onChange={(e) => handleQuantitySliderChange(item.id, parseInt(e.target.value))}
                                                className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ background: 'linear-gradient(to right, #6366f1 0%, #6366f1 ' + ((currentQuantity / 500) * 100) + '%, #d1d5db ' + ((currentQuantity / 500) * 100) + '%, #d1d5db 100%)' }}
                                              />
                                              
                                              {hasPendingUpdate && (
                                                <div className="flex space-x-2">
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleSaveQuantityUpdate(item.id, item);
                                                    }}
                                                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded flex items-center"
                                                    title="Save changes"
                                                  >
                                                    <FiSave size={12} className="mr-1" />
                                                    Save
                                                  </button>
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleCancelQuantityEdit(item.id);
                                                    }}
                                                    className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded flex items-center"
                                                    title="Cancel changes"
                                                  >
                                                    <FiX size={12} className="mr-1" />
                                                    Cancel
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          
                                          {/* Real-time Macro Display */}
                                          <div className="text-sm text-gray-600 dark:text-gray-400">
                                            <span className={isEditing ? 'text-yellow-400 font-medium' : ''}>
                                              {currentQuantity} {item.unit} ({realTimeMacros.calories.toFixed(1)} cal)
                                            </span>
                                            <div className="mt-1">
                                              <span className={`text-red-400 ${isEditing ? 'font-medium' : ''}`}>P: {realTimeMacros.protein.toFixed(1)}g</span> | 
                                              <span className={`text-yellow-400 ${isEditing ? 'font-medium' : ''}`}> C: {realTimeMacros.carbs.toFixed(1)}g</span> | 
                                              <span className={`text-blue-400 ${isEditing ? 'font-medium' : ''}`}> F: {realTimeMacros.fat.toFixed(1)}g</span>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center ml-3">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleEditFoodItem(meal.id, item);
                                            }}
                                            className="p-1 text-gray-400 hover:text-indigo-400 mr-1"
                                            title="Edit"
                                          >
                                            <FiEdit2 size={16} />
                                          </button>
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
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="mt-4 p-3 bg-gray-700/50 dark:bg-gray-700/50 rounded text-center text-gray-400" onClick={() => selectMeal(meal.id)}>
                                No food items added to this meal yet.
                              </div>
                            )}

                            {/* Meal notes */}
                            <div className="mt-4">
                              <div className="text-sm text-gray-300">Notes:</div>
                              <div className="text-sm text-gray-200">{meal.notes}</div>
                            </div>
                            
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
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Barcode scanner component */}
      {showBarcodeScanner && (
        <div className="fixed inset-0 z-[60] bg-black">
          <BarcodeScanner
            onDetect={handleBarcodeDetect}
            onClose={() => setShowBarcodeScanner(false)}
          />
        </div>
      )}
      
      {/* Custom Food Form */}
      {showCustomFoodForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full mx-4 shadow-xl">
            <CustomFoodItemForm 
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onSave={handleCustomFoodSave as any} // Type assertion to fix linter error
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
      
      {/* Create Meal Modal (Day Type Modal) */}
      {showDayTypeModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black bg-opacity-70">
          <div className="relative bg-white dark:bg-gray-900 rounded-lg max-w-md w-full mx-4 shadow-xl border border-gray-300 dark:border-gray-700">
            <div className="p-5">
              <h3 className="text-xl font-semibold text-gray-100 dark:text-white mb-4">Create New Meal</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Meal Name*
                </label>
                <input
                  type="text"
                  value={newMealName}
                  onChange={(e) => setNewMealName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-gray-800 border-gray-600 text-white"
                  placeholder="Enter meal name"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Time Suggestion
                </label>
                
                {/* Time picker */}
                <div className="grid grid-cols-5 gap-2 mb-2">
                  <div className="col-span-3">
                    <select
                      value={timeHour}
                      onChange={(e) => setTimeHour(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                    >
                      {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(hour => (
                        <option key={hour} value={hour}>{hour}</option>
                      ))}
                    </select>
                    <div className="text-xs text-center text-gray-500 mt-1">Hour (24h)</div>
                  </div>
                  
                  <div className="col-span-2">
                    <select
                      value={timeMinute}
                      onChange={(e) => setTimeMinute(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                    >
                      {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(minute => (
                        <option key={minute} value={minute}>{minute}</option>
                      ))}
                    </select>
                    <div className="text-xs text-center text-gray-500 mt-1">Min</div>
                  </div>
                </div>
                
                {/* Common meal time presets */}
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-400 mb-2">
                    Common meal times (click to select):
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {mealTimePresets.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handleTimePresetSelect(preset.time)}
                        className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-xs rounded-md text-gray-200"
                      >
                        {preset.label} ({preset.time})
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Custom time suggestion field */}
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    Or enter custom time suggestion:
                  </label>
                  <input
                    type="text"
                    value={timeSuggestion}
                    onChange={(e) => setTimeSuggestion(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-gray-800 border-gray-600 text-white"
                    placeholder="e.g., Post-Workout, Before Bed, etc."
                  />
                  <p className="text-xs text-gray-500 mt-1">For non-time suggestions like "Post-Workout" or "Before Bed"</p>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={mealDescription}
                  onChange={(e) => setMealDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-gray-800 border-gray-600 text-white"
                  placeholder="Brief description of this meal"
                  rows={2}
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={mealNotes}
                  onChange={(e) => setMealNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-gray-800 border-gray-600 text-white"
                  placeholder="Additional instructions or notes about this meal"
                  rows={2}
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Day Type*
                </label>
                
                <div className="space-y-2">
                  {dayTypeOptions.map((option) => (
                    <div 
                      key={option.value}
                      onClick={() => setSelectedDayType(option.value)}
                      className={`flex items-start p-3 rounded-md cursor-pointer transition-all ${
                        selectedDayType === option.value
                          ? 'bg-indigo-900/60 border border-indigo-500'
                          : 'bg-gray-800/60 border border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="mr-3 mt-0.5">{option.icon}</div>
                      <div>
                        <div className="font-medium text-gray-100">{option.label}</div>
                        <div className="text-xs text-gray-400">{option.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end mt-6 space-x-3">
                <button
                  onClick={() => setShowDayTypeModal(false)}
                  className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitNewMeal}
                  disabled={isLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    <>
                      <FiPlus className="mr-2" /> Create Meal
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Meal Modal */}
      {showEditMealModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black bg-opacity-70">
          <div className="relative bg-white dark:bg-gray-900 rounded-lg max-w-md w-full mx-4 shadow-xl border border-gray-300 dark:border-gray-700">
            <div className="p-5">
              <h3 className="text-xl font-semibold text-gray-100 dark:text-white mb-4">Edit Meal</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Meal Name*
                </label>
                <input
                  type="text"
                  value={newMealName}
                  onChange={(e) => setNewMealName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-gray-800 border-gray-600 text-white"
                  placeholder="Enter meal name"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Time Suggestion
                </label>
                
                {/* Time picker */}
                <div className="grid grid-cols-5 gap-2 mb-2">
                  <div className="col-span-3">
                    <select
                      value={timeHour}
                      onChange={(e) => setTimeHour(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                    >
                      {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(hour => (
                        <option key={hour} value={hour}>{hour}</option>
                      ))}
                    </select>
                    <div className="text-xs text-center text-gray-500 mt-1">Hour (24h)</div>
                  </div>
                  
                  <div className="col-span-2">
                    <select
                      value={timeMinute}
                      onChange={(e) => setTimeMinute(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                    >
                      {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(minute => (
                        <option key={minute} value={minute}>{minute}</option>
                      ))}
                    </select>
                    <div className="text-xs text-center text-gray-500 mt-1">Min</div>
                  </div>
                </div>
                
                {/* Common meal time presets */}
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-400 mb-2">
                    Common meal times (click to select):
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {mealTimePresets.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handleTimePresetSelect(preset.time)}
                        className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-xs rounded-md text-gray-200"
                      >
                        {preset.label} ({preset.time})
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Custom time suggestion field */}
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    Or enter custom time suggestion:
                  </label>
                  <input
                    type="text"
                    value={timeSuggestion}
                    onChange={(e) => setTimeSuggestion(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-gray-800 border-gray-600 text-white"
                    placeholder="e.g., Post-Workout, Before Bed, etc."
                  />
                  <p className="text-xs text-gray-500 mt-1">For non-time suggestions like "Post-Workout" or "Before Bed"</p>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={mealDescription}
                  onChange={(e) => setMealDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-gray-800 border-gray-600 text-white"
                  placeholder="Brief description of this meal"
                  rows={2}
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={mealNotes}
                  onChange={(e) => setMealNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-gray-800 border-gray-600 text-white"
                  placeholder="Additional instructions or notes about this meal"
                  rows={2}
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Day Type*
                </label>
                
                <div className="space-y-2">
                  {dayTypeOptions.map((option) => (
                    <div 
                      key={option.value}
                      onClick={() => setSelectedDayType(option.value)}
                      className={`flex items-start p-3 rounded-md cursor-pointer transition-all ${
                        selectedDayType === option.value
                          ? 'bg-indigo-900/60 border border-indigo-500'
                          : 'bg-gray-800/60 border border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="mr-3 mt-0.5">{option.icon}</div>
                      <div>
                        <div className="font-medium text-gray-100">{option.label}</div>
                        <div className="text-xs text-gray-400">{option.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end mt-6 space-x-3">
                <button
                  onClick={() => {
                    setShowEditMealModal(false);
                  }}
                  className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEditedMeal}
                  disabled={isLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <FiSave className="mr-2" /> Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black bg-opacity-70">
          <div className="relative bg-white dark:bg-gray-900 rounded-lg max-w-md w-full mx-4 shadow-xl border border-gray-300 dark:border-gray-700">
            <div className="p-5">
              <h3 className="text-xl font-semibold text-gray-100 dark:text-white mb-4">Delete Meal</h3>
              
              <div className="mb-6">
                <p className="text-gray-300">
                  Are you sure you want to delete this meal? This action cannot be undone, and all food items in this meal will be removed.
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirmation(false)}
                  className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteMeal}
                  disabled={isLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <FiTrash2 className="mr-2" /> Delete Meal
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Add the Edit Food Item Modal */}
      {showEditFoodItemModal && editingFoodItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black bg-opacity-70">
          <div className="relative bg-white dark:bg-gray-900 rounded-lg max-w-md w-full mx-4 shadow-xl border border-gray-300 dark:border-gray-700">
            <div className="p-5">
              <h3 className="text-xl font-semibold text-gray-100 dark:text-white mb-4">
                Edit Food Item
              </h3>
              
              <div className="mb-4">
                <div className="font-medium text-gray-200 mb-2">
                  {editingFoodItem.food_item?.food_name}
                </div>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Quantity*
                  </label>
                  <input
                    type="number"
                    value={editFoodItemQuantity}
                    onChange={(e) => setEditFoodItemQuantity(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-gray-800 border-gray-600 text-white"
                    placeholder="Enter quantity"
                    step="any"
                    min="0"
                  />
                </div>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Unit*
                  </label>
                  <select
                    value={editFoodItemUnit}
                    onChange={(e) => setEditFoodItemUnit(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-gray-800 border-gray-600 text-white"
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

                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={editFoodItemNotes}
                    onChange={(e) => setEditFoodItemNotes(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-gray-800 border-gray-600 text-white"
                    placeholder="Enter notes"
                  />
                </div>
                
                <div className="text-sm text-gray-300 mt-2">
                  <span className="font-medium">Nutrition per 100g:</span> 
                  <span className="ml-2 text-red-400">P: {parseFloat(editingFoodItem.food_item?.protein_per_100g.toFixed(1) || '0')}g</span> | 
                  <span className="ml-2 text-yellow-400">C: {parseFloat(editingFoodItem.food_item?.carbs_per_100g.toFixed(1) || '0')}g</span> | 
                  <span className="ml-2 text-blue-400">F: {parseFloat(editingFoodItem.food_item?.fat_per_100g.toFixed(1) || '0')}g</span> | 
                  <span className="ml-2">{Math.round(editingFoodItem.food_item?.calories_per_100g || 0)} kcal</span>
                </div>
              </div>
              
              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded-md dark:bg-red-800/30 dark:text-red-300 dark:border-red-700">
                  {error}
                </div>
              )}
              
              <div className="flex justify-end mt-6 space-x-3">
                <button
                  onClick={() => {
                    setShowEditFoodItemModal(false);
                    setEditingFoodItem(null);
                    setError(null);
                  }}
                  className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEditedFoodItem}
                  disabled={isLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <FiSave className="mr-2" /> Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Order Modal */}
      {showOrderModal && reorderingMeal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black bg-opacity-70">
          <div className="relative bg-white dark:bg-gray-900 rounded-lg max-w-md w-full mx-4 shadow-xl border border-gray-300 dark:border-gray-700">
            <div className="p-5">
              <h3 className="text-xl font-semibold text-gray-100 dark:text-white mb-4">Set Meal Order</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Meal: {reorderingMeal.name}
                </label>
                <p className="text-sm text-gray-400 mb-2">
                  Current Order: {reorderingMeal.order_in_plan ?? 'Not set'}
                </p>
                <input
                  type="number"
                  value={newOrderValue}
                  onChange={(e) => setNewOrderValue(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded-md bg-gray-800 border-gray-600 text-white"
                  placeholder="Enter order number"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Lower numbers will appear first, higher numbers later.
                </p>
              </div>
              
              <div className="flex justify-end mt-6 space-x-3">
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveOrder}
                  disabled={isLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <FiSave className="mr-2" /> Save Order
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealPlannerIntegrated; 