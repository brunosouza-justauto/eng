import React, { useState, useEffect } from 'react';
import { FiX, FiPlus } from 'react-icons/fi';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/slices/authSlice';
import { ExtraMealFormData, DAY_TYPES } from '../../types/mealPlanning';
import { searchFoodItems } from '../../services/mealPlanningService';
import { logExtraMeal } from '../../services/mealLoggingService';

interface AddExtraMealModalProps {
    isOpen: boolean;
    onClose: () => void;
    onMealAdded: () => void;
    nutritionPlanId: string;
    date: string;
    dayType?: string;
}

// Food search result interface
interface FoodSearchResult {
    id: string;
    food_name: string;
    calories_per_100g: number;
    protein_per_100g: number;
    carbs_per_100g: number;
    fat_per_100g: number;
}

const AddExtraMealModal: React.FC<AddExtraMealModalProps> = ({
    isOpen,
    onClose,
    onMealAdded,
    nutritionPlanId,
    date,
    dayType
}) => {
    // Add the style for mobile scrolling
    const mobileScrollStyle = `
        .mobile-scroll-container {
            -webkit-overflow-scrolling: touch;
            overflow-y: scroll;
            touch-action: pan-y;
            scroll-behavior: smooth;
            position: relative;
            z-index: 10;
        }
        
        @media (max-width: 640px) {
            .mobile-scroll-container {
                max-height: 200px !important;
                padding-bottom: 40px; /* Add padding to ensure last items are visible */
            }
            
            .mobile-scroll-container > div {
                padding: 10px; /* Increase tap target size */
            }
        }
        
        /* Prevent parent scrolling when touching the results container */
        .mobile-scroll-container:focus {
            outline: none;
        }
    `;

    // Get user from Redux store
    const user = useSelector(selectUser);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [name, setName] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [selectedDayType, setSelectedDayType] = useState<string>(dayType || DAY_TYPES[0]);
    const [customDayType, setCustomDayType] = useState<string>('');
    
    // Food selection state
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [selectedFoods, setSelectedFoods] = useState<Array<{
        id: string;
        name: string;
        quantity: number;
        unit: string;
        original_values?: {
            calories_per_100g: number;
            protein_per_100g: number;
            carbs_per_100g: number;
            fat_per_100g: number;
        };
    }>>([]);
    
    // Add state for manual macro entry
    const [foodsNeedingMacros, setFoodsNeedingMacros] = useState<Record<number, {
        calories: string;
        protein: string;
        carbs: string;
        fat: string;
    }>>({});

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setName('');
            setNotes('');
            setSelectedDayType(dayType || DAY_TYPES[0]);
            setCustomDayType('');
            setSearchQuery('');
            setSearchResults([]);
            setSelectedFoods([]);
            setFoodsNeedingMacros({});
            setError(null);
        }
    }, [isOpen, dayType]);

    // Search for food items
    useEffect(() => {
        const searchFoods = async () => {
            if (!searchQuery.trim()) {
                setSearchResults([]);
                return;
            }

            setIsSearching(true);
            try {
                const result = await searchFoodItems(searchQuery);
                setSearchResults(result.items || []);
            } catch (err) {
                console.error('Error searching food items:', err);
                setError('Failed to search food items');
            } finally {
                setIsSearching(false);
            }
        };

        const timeoutId = setTimeout(searchFoods, 500);
        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    // Add food to selected list
    const handleAddFood = (food: FoodSearchResult) => {
        setSelectedFoods([
            ...selectedFoods,
            {
                id: food.id,
                name: food.food_name,
                quantity: 100, // Default quantity
                unit: 'g',     // Default unit
                original_values: {
                    calories_per_100g: food.calories_per_100g,
                    protein_per_100g: food.protein_per_100g,
                    carbs_per_100g: food.carbs_per_100g,
                    fat_per_100g: food.fat_per_100g
                }
            }
        ]);
        setSearchQuery('');
    };

    // Remove food from selected list
    const handleRemoveFood = (index: number) => {
        const newSelectedFoods = [...selectedFoods];
        newSelectedFoods.splice(index, 1);
        setSelectedFoods(newSelectedFoods);
    };

    // Update food quantity
    const handleUpdateQuantity = (index: number, quantity: number) => {
        const newSelectedFoods = [...selectedFoods];
        const prevQuantity = newSelectedFoods[index].quantity;
        newSelectedFoods[index].quantity = quantity;
        setSelectedFoods(newSelectedFoods);
        
        // If this food has manually entered macros, update them proportionally
        if (foodsNeedingMacros[index]) {
            // Only recalculate if previous quantity wasn't zero to avoid division by zero
            if (prevQuantity > 0) {
                const ratio = quantity / prevQuantity;
                
                setFoodsNeedingMacros(prev => ({
                    ...prev,
                    [index]: {
                        calories: Math.round(parseFloat(prev[index].calories) * ratio).toString(),
                        protein: Math.round(parseFloat(prev[index].protein) * ratio * 10) / 10 + '',
                        carbs: Math.round(parseFloat(prev[index].carbs) * ratio * 10) / 10 + '',
                        fat: Math.round(parseFloat(prev[index].fat) * ratio * 10) / 10 + ''
                    }
                }));
            }
        } else if (newSelectedFoods[index].unit !== 'g' && newSelectedFoods[index].unit !== 'oz') {
            // If changing quantity for a non-weight unit with no entered macros yet,
            // show the macro input form
            const originalValues = newSelectedFoods[index].original_values;
            if (originalValues) {
                // Base the initial values on the original 100g values
                const factor = quantity / 100;
                setFoodsNeedingMacros(prev => ({
                    ...prev,
                    [index]: {
                        calories: Math.round(originalValues.calories_per_100g * factor).toString(),
                        protein: Math.round(originalValues.protein_per_100g * factor * 10) / 10 + '',
                        carbs: Math.round(originalValues.carbs_per_100g * factor * 10) / 10 + '',
                        fat: Math.round(originalValues.fat_per_100g * factor * 10) / 10 + ''
                    }
                }));
            }
        }
    };

    // Update food unit
    const handleUpdateUnit = (index: number, unit: string) => {
        const newSelectedFoods = [...selectedFoods];
        const prevUnit = newSelectedFoods[index].unit;
        newSelectedFoods[index].unit = unit;
        setSelectedFoods(newSelectedFoods);
        
        // If changing from a weight-based unit (g, oz) to a non-weight unit (serving, cup, etc.)
        // Show the macro input form
        const weightUnits = ['g', 'oz'];
        const isFromWeight = weightUnits.includes(prevUnit);
        const isToWeight = weightUnits.includes(unit);
        
        if (isFromWeight && !isToWeight) {
            // Need to collect macro info
            const food = searchResults.find(f => f.id === newSelectedFoods[index].id);
            if (food) {
                // Use the stored original values if available
                const originalValues = newSelectedFoods[index].original_values;
                if (originalValues) {
                    // Calculate based on the original quantity in grams
                    const factor = newSelectedFoods[index].quantity / 100;
                    setFoodsNeedingMacros(prev => ({
                        ...prev,
                        [index]: {
                            calories: Math.round(originalValues.calories_per_100g * factor).toString(),
                            protein: Math.round(originalValues.protein_per_100g * factor).toString(),
                            carbs: Math.round(originalValues.carbs_per_100g * factor).toString(),
                            fat: Math.round(originalValues.fat_per_100g * factor).toString()
                        }
                    }));
                } else {
                    // Initialize with calculated values per 100g
                    setFoodsNeedingMacros(prev => ({
                        ...prev,
                        [index]: {
                            calories: Math.round(food.calories_per_100g).toString(),
                            protein: Math.round(food.protein_per_100g).toString(),
                            carbs: Math.round(food.carbs_per_100g).toString(),
                            fat: Math.round(food.fat_per_100g).toString()
                        }
                    }));
                }
            } else {
                // Initialize with empty values if food not found
                setFoodsNeedingMacros(prev => ({
                    ...prev,
                    [index]: {
                        calories: '',
                        protein: '',
                        carbs: '',
                        fat: ''
                    }
                }));
            }
        } else if (!isFromWeight && isToWeight) {
            // If changing back to a weight unit, remove the macro input form
            setFoodsNeedingMacros(prev => {
                const newState = { ...prev };
                delete newState[index];
                return newState;
            });
        }
    };
    
    // Handle macro input changes
    const handleMacroChange = (foodIndex: number, macroType: 'calories' | 'protein' | 'carbs' | 'fat', value: string) => {
        setFoodsNeedingMacros(prev => ({
            ...prev,
            [foodIndex]: {
                ...prev[foodIndex],
                [macroType]: value
            }
        }));
    };

    // Submit form
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!user?.id) {
            setError('You must be logged in to add a meal');
            return;
        }
        
        if (!name.trim()) {
            setError('Meal name is required');
            return;
        }
        
        if (selectedFoods.length === 0) {
            setError('Please add at least one food item');
            return;
        }

        // Determine day type
        const finalDayType = selectedDayType === 'Custom Day' 
            ? customDayType.trim() 
            : selectedDayType;
            
        if (selectedDayType === 'Custom Day' && !customDayType.trim()) {
            setError('Please provide a custom day type');
            return;
        }

        // Validate that all required macro information is filled out
        const weightUnits = ['g', 'oz'];
        for (let i = 0; i < selectedFoods.length; i++) {
            const food = selectedFoods[i];
            // If using a non-weight unit, macros must be provided
            if (!weightUnits.includes(food.unit)) {
                // Check if we have macros for this food
                if (!foodsNeedingMacros[i] || 
                    !foodsNeedingMacros[i].calories || 
                    !foodsNeedingMacros[i].protein || 
                    !foodsNeedingMacros[i].carbs || 
                    !foodsNeedingMacros[i].fat ||
                    parseFloat(foodsNeedingMacros[i].calories) <= 0) {
                    setError(`Please enter complete nutrition information for "${food.name}" (${food.quantity} ${food.unit})`);
                    return;
                }
            }
        }

        // Create meal data
        const mealData: ExtraMealFormData = {
            name,
            day_type: finalDayType,
            notes: notes.trim() || undefined,
            food_items: selectedFoods.map((food, index) => {
                const baseItem = {
                    food_item_id: food.id,
                    quantity: food.quantity,
                    unit: food.unit
                };
                
                // If this food has manually entered macros, include them
                if (foodsNeedingMacros[index]) {
                    return {
                        ...baseItem,
                        custom_macros: {
                            calories: parseFloat(foodsNeedingMacros[index].calories) || 0,
                            protein_g: parseFloat(foodsNeedingMacros[index].protein) || 0,
                            carbs_g: parseFloat(foodsNeedingMacros[index].carbs) || 0,
                            fat_g: parseFloat(foodsNeedingMacros[index].fat) || 0
                        }
                    };
                }
                
                return baseItem;
            })
        };

        setIsLoading(true);
        setError(null);
        
        try {
            await logExtraMeal(user.id, nutritionPlanId, mealData, date);
            onMealAdded();
        } catch (err) {
            console.error('Error adding extra meal:', err);
            setError('Failed to add meal');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <style dangerouslySetInnerHTML={{ __html: mobileScrollStyle }} />
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 p-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Log Extra Meal
                    </h2>
                    <button 
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                        <FiX className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-4 overflow-y-auto max-h-[calc(90vh-4rem)]">
                    {error && (
                        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md text-sm">
                            {error}
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit}>
                        {/* Meal Name */}
                        <div className="mb-4">
                            <label htmlFor="mealName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Meal Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="mealName"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Post-Workout Snack"
                                required
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        
                        {/* Day Type */}
                        <div className="mb-4">
                            <label htmlFor="dayType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Day Type <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="dayType"
                                value={selectedDayType}
                                onChange={(e) => setSelectedDayType(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                            >
                                {DAY_TYPES.map((type) => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                                <option value="Custom Day">Custom Day</option>
                            </select>
                            
                            {selectedDayType === 'Custom Day' && (
                                <div className="mt-3">
                                    <label htmlFor="customDayType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Custom Day Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="customDayType"
                                        type="text"
                                        value={customDayType}
                                        onChange={(e) => setCustomDayType(e.target.value)}
                                        placeholder="e.g., Refeed Day, Travel Day"
                                        required={selectedDayType === 'Custom Day'}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                            )}
                        </div>
                        
                        {/* Notes */}
                        <div className="mb-4">
                            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Notes (Optional)
                            </label>
                            <textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add any additional notes here..."
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        
                        {/* Food Items */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Food Items <span className="text-red-500">*</span>
                            </label>
                            
                            {/* Food Search */}
                            <div className="mb-4">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search for food items..."
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                                />
                                
                                {isSearching && (
                                    <div className="mt-2 text-center">
                                        <div className="inline-block w-5 h-5 border-t-2 border-b-2 border-indigo-500 rounded-full animate-spin"></div>
                                    </div>
                                )}
                                
                                {searchQuery.trim() && searchResults.length > 0 && (
                                    <div 
                                        className="mt-2 border border-gray-200 dark:border-gray-700 rounded-md max-h-60 sm:max-h-40 overflow-y-scroll overflow-x-hidden mobile-scroll-container" 
                                        style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
                                        tabIndex={0}
                                    >
                                        {searchResults.map((food) => (
                                            <div 
                                                key={food.id}
                                                onClick={() => handleAddFood(food)}
                                                className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                            >
                                                <p className="text-sm font-medium text-gray-800 dark:text-white">
                                                    {food.food_name}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {Math.round(food.calories_per_100g)} cal • {Math.round(food.protein_per_100g)}g protein • {Math.round(food.carbs_per_100g)}g carbs • {Math.round(food.fat_per_100g)}g fat (per 100g)
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                {searchQuery.trim() && searchResults.length === 0 && !isSearching && (
                                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                        No food items found. Try a different search term.
                                    </div>
                                )}
                            </div>
                            
                            {/* Selected Foods */}
                            <div className="space-y-3 mt-3">
                                {selectedFoods.length === 0 ? (
                                    <div className="text-center py-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-md">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            No food items added yet. Search and add food items above.
                                        </p>
                                    </div>
                                ) : (
                                    selectedFoods.map((food, index) => (
                                        <div 
                                            key={index}
                                            className="p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700"
                                        >
                                            <div className="flex justify-between mb-2">
                                                <p className="font-medium text-gray-800 dark:text-white">
                                                    {food.name}
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveFood(index)}
                                                    className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                                >
                                                    <FiX className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="flex space-x-2">
                                                <div className="w-1/2">
                                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                        Quantity
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={food.quantity}
                                                        onChange={(e) => handleUpdateQuantity(index, parseFloat(e.target.value) || 0)}
                                                        min="0.1"
                                                        step="0.1"
                                                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                                                    />
                                                </div>
                                                <div className="w-1/2">
                                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                        Unit
                                                    </label>
                                                    <select
                                                        value={food.unit}
                                                        onChange={(e) => handleUpdateUnit(index, e.target.value)}
                                                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                                                    >
                                                        <option value="g">g</option>
                                                        <option value="oz">oz</option>
                                                        <option value="ml">ml</option>
                                                        <option value="cup">cup</option>
                                                        <option value="serving">serving</option>
                                                    </select>
                                                </div>
                                            </div>
                                            
                                            {/* Add macro input form if this food needs manual macros */}
                                            {foodsNeedingMacros[index] && (
                                                <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                                                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-2 font-medium">
                                                        Required: Enter nutrition info per {food.quantity} {food.unit} <span className="text-red-500">*</span>
                                                    </p>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        <div>
                                                            <label className="block text-xs text-gray-500 dark:text-gray-400">
                                                                Calories <span className="text-red-500">*</span>
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={foodsNeedingMacros[index].calories}
                                                                onChange={(e) => handleMacroChange(index, 'calories', e.target.value)}
                                                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                                                                min="0"
                                                                placeholder="kcal"
                                                                inputMode="decimal"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs text-gray-500 dark:text-gray-400">
                                                                Protein <span className="text-red-500">*</span>
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={foodsNeedingMacros[index].protein}
                                                                onChange={(e) => handleMacroChange(index, 'protein', e.target.value)}
                                                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                                                                min="0"
                                                                placeholder="g"
                                                                inputMode="decimal"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs text-gray-500 dark:text-gray-400">
                                                                Carbs <span className="text-red-500">*</span>
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={foodsNeedingMacros[index].carbs}
                                                                onChange={(e) => handleMacroChange(index, 'carbs', e.target.value)}
                                                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                                                                min="0"
                                                                placeholder="g"
                                                                inputMode="decimal"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs text-gray-500 dark:text-gray-400">
                                                                Fat <span className="text-red-500">*</span>
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={foodsNeedingMacros[index].fat}
                                                                onChange={(e) => handleMacroChange(index, 'fat', e.target.value)}
                                                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                                                                min="0"
                                                                placeholder="g"
                                                                inputMode="decimal"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                        
                        {/* Submit Button */}
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <div className="inline-block w-4 h-4 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <FiPlus className="inline-block mr-1" /> Log Meal
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddExtraMealModal; 