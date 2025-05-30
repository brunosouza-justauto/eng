import React, { useState, useEffect } from 'react';
import { FiX, FiPlus, FiSearch } from 'react-icons/fi';
import { TbBarcode } from 'react-icons/tb';
import { useSelector } from 'react-redux';
import { selectProfile } from '../../store/slices/authSlice';
import { ExtraMealFormData, DAY_TYPES, FoodItem } from '../../types/mealPlanning';
import { searchFoodItems } from '../../services/mealPlanningService';
import { logExtraMeal } from '../../services/mealLoggingService';
import CustomFoodItemForm from '../nutrition/CustomFoodItemForm';
import BarcodeScanner from '../nutrition/BarcodeScanner';
import { searchFoodItemByBarcode } from '../../services/foodItemService';

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
            }
            
            .mobile-scroll-container > div {
                padding: 12px; /* Increase tap target size on mobile */
            }
        }
        
        /* Prevent parent scrolling when touching the results container */
        .mobile-scroll-container:focus {
            outline: none;
        }
        
        /* Mobile-specific improvements */
        @media (max-width: 640px) {
            input, select, textarea, button {
                font-size: 16px !important; /* Prevent iOS zoom on focus */
            }
            
            /* Fixed bottom actions bar */
            .modal-actions-fixed {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: #111827; /* bg-gray-900 */
                padding: 1rem;
                z-index: 50;
                border-top: 1px solid rgba(75, 85, 99, 0.5); /* border-gray-700 */
            }
            
            /* Extra padding to ensure content isn't hidden behind fixed footer */
            .pb-safe {
                padding-bottom: calc(5rem + env(safe-area-inset-bottom, 0));
            }
        }
    `;

    // Get profile from Redux store (instead of just user)
    const userProfile = useSelector(selectProfile);
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
    
    // Add state for custom food item form
    const [showCustomFoodForm, setShowCustomFoodForm] = useState<boolean>(false);
    
    // Add barcode scanning states
    const [showBarcodeScanner, setShowBarcodeScanner] = useState<boolean>(false);
    const [manualBarcodeEntry, setManualBarcodeEntry] = useState<boolean>(false);
    const [barcodeValue, setBarcodeValue] = useState<string>('');
    const [isBarcodeSearching, setIsBarcodeSearching] = useState<boolean>(false);
    
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
            setBarcodeValue('');
            setManualBarcodeEntry(false);
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

    // Handle barcode detection
    const handleBarcodeDetect = async (foodItem: FoodItem | null, barcode: string) => {
        setShowBarcodeScanner(false);
        
        if (!foodItem) {
            setError('No food item found with the barcode: ' + barcode + '. Try adding a custom item.');
            setManualBarcodeEntry(true);
            return;
        }
        
        // Directly add the found food item
        handleAddFood({
            id: foodItem.id,
            food_name: foodItem.food_name,
            calories_per_100g: foodItem.calories_per_100g,
            protein_per_100g: foodItem.protein_per_100g,
            carbs_per_100g: foodItem.carbs_per_100g,
            fat_per_100g: foodItem.fat_per_100g
        });
        
        // If we found a barcode, store it in case the user wants to add more items
        if (foodItem.barcode) {
            setBarcodeValue(foodItem.barcode);
        }
    };
    
    // Function to search for food item by barcode
    const searchByBarcode = async (barcode: string) => {
        if (!barcode) {
            setError('Please enter a valid barcode');
            return;
        }
        
        setIsBarcodeSearching(true);
        setError(null);
        try {
            const result = await searchFoodItemByBarcode(barcode);
            
            if (result.item) {
                // Add the found item to selected foods
                handleAddFood({
                    id: result.item.id,
                    food_name: result.item.food_name,
                    calories_per_100g: result.item.calories_per_100g,
                    protein_per_100g: result.item.protein_per_100g,
                    carbs_per_100g: result.item.carbs_per_100g,
                    fat_per_100g: result.item.fat_per_100g
                });
                setManualBarcodeEntry(false);
                setBarcodeValue('');
            } else {
                // No product found, allow user to create a custom food item
                setError('No food item found with the barcode: ' + barcode + '. Try adding a custom item.');
                setManualBarcodeEntry(false);
                
                // Show custom food form with pre-filled barcode
                setShowCustomFoodForm(true);
                setBarcodeValue(barcode); // Store barcode value for the form
            }
        } catch (err) {
            console.error('Error searching by barcode:', err);
            setError('Failed to search food by barcode');
        } finally {
            setIsBarcodeSearching(false);
            setBarcodeValue('');
        }
    };

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

    // Handle custom food item creation
    const handleCustomFoodSave = (foodItem: FoodItem) => {
        handleAddFood({
            id: foodItem.id,
            food_name: foodItem.food_name,
            calories_per_100g: foodItem.calories_per_100g,
            protein_per_100g: foodItem.protein_per_100g,
            carbs_per_100g: foodItem.carbs_per_100g,
            fat_per_100g: foodItem.fat_per_100g
        });
        setShowCustomFoodForm(false);
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
        
        if (!userProfile?.id) {
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
            await logExtraMeal(userProfile.user_id, nutritionPlanId, mealData, date);
            onMealAdded();
        } catch (err) {
            console.error('Error adding extra meal:', err);
            setError('Failed to add meal');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    // If custom food form is showing, render that instead of the main form
    if (showCustomFoodForm) {
        return (
            <div className="fixed inset-0 z-50 flex flex-col bg-gray-900">
                <div className="bg-gray-900 p-4 flex justify-between items-center border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">Add Custom Food Item</h2>
                    <button 
                        onClick={() => setShowCustomFoodForm(false)}
                        className="text-gray-300 hover:text-white p-2"
                    >
                        <FiX size={24} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                    <CustomFoodItemForm 
                        onSave={handleCustomFoodSave}
                        onCancel={() => setShowCustomFoodForm(false)}
                        initialData={barcodeValue ? { barcode: barcodeValue } : undefined}
                    />
                </div>
            </div>
        );
    }
    
    // If barcode scanner is showing
    if (showBarcodeScanner) {
        return (
            <BarcodeScanner
                onDetect={(result, barcode) => handleBarcodeDetect(result, barcode)}
                onClose={() => {
                    setShowBarcodeScanner(false);
                    setManualBarcodeEntry(true);
                    setError('You can enter the barcode below if you want.');
                }}
                onError={(error) => {
                    console.error('Barcode scanner error:', error);
                    setShowBarcodeScanner(false);
                    setManualBarcodeEntry(true);
                    setError('Barcode scanner error. Please enter barcode manually.');
                }}
            />
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
            <style dangerouslySetInnerHTML={{ __html: mobileScrollStyle }} />
            
            {/* Header with close button */}
            <div className="bg-gray-900 p-4 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Log Extra Meal</h2>
                <button 
                    onClick={onClose}
                    className="text-gray-300 hover:text-white p-2"
                    aria-label="Close"
                >
                    <FiX size={24} />
                </button>
            </div>
            
            {/* Error message */}
            {error && (
                <div className="absolute top-16 left-0 right-0 m-4 p-3 bg-red-900 text-red-100 rounded z-10">
                    {error}
                </div>
            )}
            
            {/* Main content - scrollable */}
            <div className="flex-1 overflow-y-auto bg-gray-900 p-4 pb-32">
                <form onSubmit={handleSubmit}>
                    {/* Meal Name */}
                    <div className="mb-4">
                        <label htmlFor="mealName" className="block text-sm font-medium text-gray-300 mb-1">
                            Meal Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="mealName"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Post-Workout Snack"
                            required
                            className="w-full px-3 py-3 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-gray-800 text-white"
                        />
                    </div>
                    
                    {/* Day Type */}
                    <div className="mb-4">
                        <label htmlFor="dayType" className="block text-sm font-medium text-gray-300 mb-1">
                            Day Type <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="dayType"
                            value={selectedDayType}
                            onChange={(e) => setSelectedDayType(e.target.value)}
                            className="w-full px-3 py-3 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-gray-800 text-white"
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
                                <label htmlFor="customDayType" className="block text-sm font-medium text-gray-300 mb-1">
                                    Custom Day Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="customDayType"
                                    type="text"
                                    value={customDayType}
                                    onChange={(e) => setCustomDayType(e.target.value)}
                                    placeholder="e.g., Refeed Day, Travel Day"
                                    required={selectedDayType === 'Custom Day'}
                                    className="w-full px-3 py-3 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-gray-800 text-white"
                                />
                            </div>
                        )}
                    </div>
                    
                    {/* Notes */}
                    <div className="mb-4">
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-300 mb-1">
                            Notes (Optional)
                        </label>
                        <textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add any additional notes here..."
                            rows={2}
                            className="w-full px-3 py-3 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-gray-800 text-white"
                        />
                    </div>
                    
                    {/* Food Items */}
                    <div className="mb-4">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
                            <label className="block text-sm font-medium text-gray-300 mb-2 sm:mb-0">
                                Food Items <span className="text-red-500">*</span>
                            </label>
                            <div className="flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowBarcodeScanner(true)}
                                    className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center justify-center bg-gray-800 px-3 py-2 rounded-md"
                                >
                                    <TbBarcode className="mr-1.5 w-4 h-4" /> Scan Barcode
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCustomFoodForm(true)}
                                    className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center justify-center bg-gray-800 px-3 py-2 rounded-md"
                                >
                                    <FiPlus className="mr-1.5 w-4 h-4" /> Add Custom Item
                                </button>
                            </div>
                        </div>
                        
                        {/* Manual Barcode Entry */}
                        {manualBarcodeEntry && (
                            <div className="mb-4 p-3 bg-gray-800 rounded-md">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Enter Barcode Manually
                                </label>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <input
                                        type="text"
                                        value={barcodeValue}
                                        onChange={(e) => setBarcodeValue(e.target.value)}
                                        placeholder="Enter product barcode"
                                        className="flex-grow px-3 py-3 border border-gray-600 rounded-md sm:rounded-l-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-gray-700 text-white"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => searchByBarcode(barcodeValue)}
                                        disabled={isBarcodeSearching || !barcodeValue}
                                        className="px-4 py-3 bg-indigo-600 text-white rounded-md sm:rounded-l-none hover:bg-indigo-700 disabled:opacity-50 w-full sm:w-auto"
                                    >
                                        {isBarcodeSearching ? (
                                            <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin mx-auto"></div>
                                        ) : (
                                            "Search"
                                        )}
                                    </button>
                                </div>
                                <div className="flex justify-between mt-3">
                                    <button
                                        type="button"
                                        onClick={() => setManualBarcodeEntry(false)}
                                        className="text-sm text-gray-400 hover:text-gray-300"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowCustomFoodForm(true);
                                            setBarcodeValue(barcodeValue);
                                        }}
                                        className="text-sm text-indigo-400 hover:text-indigo-300"
                                    >
                                        Create Custom Food
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {/* Food Search */}
                        <div className="mb-4">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FiSearch className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search for food items..."
                                    className="w-full pl-10 pr-3 py-3 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-gray-800 text-white"
                                />
                            </div>
                            
                            {isSearching && (
                                <div className="mt-2 text-center">
                                    <div className="inline-block w-5 h-5 border-t-2 border-b-2 border-indigo-500 rounded-full animate-spin"></div>
                                </div>
                            )}
                            
                            {searchQuery.trim() && searchResults.length > 0 && (
                                <div 
                                    className="mt-2 border border-gray-700 rounded-md max-h-60 overflow-y-scroll overflow-x-hidden mobile-scroll-container bg-gray-800" 
                                    style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
                                    tabIndex={0}
                                >
                                    {searchResults.map((food) => (
                                        <div 
                                            key={food.id}
                                            onClick={() => handleAddFood(food)}
                                            className="px-3 py-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0"
                                        >
                                            <p className="text-sm font-medium text-white">
                                                {food.food_name}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {Math.round(food.calories_per_100g)} cal • {Math.round(food.protein_per_100g)}g protein • {Math.round(food.carbs_per_100g)}g carbs • {Math.round(food.fat_per_100g)}g fat (per 100g)
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {searchQuery.trim() && searchResults.length === 0 && !isSearching && (
                                <div className="mt-2 text-sm text-gray-400">
                                    No food items found. Try a different search term or scan a barcode.
                                </div>
                            )}
                        </div>
                        
                        {/* Selected Foods */}
                        <div className="space-y-3 mt-3">
                            {selectedFoods.length === 0 ? (
                                <div className="text-center py-6 border border-dashed border-gray-600 rounded-md">
                                    <p className="text-sm text-gray-400">
                                        No food items added yet. Search and add food items above.
                                    </p>
                                </div>
                            ) : (
                                selectedFoods.map((food, index) => (
                                    <div 
                                        key={index}
                                        className="p-3 border border-gray-700 rounded-md bg-gray-800"
                                    >
                                        <div className="flex justify-between mb-2">
                                            <p className="font-medium text-white">
                                                {food.name}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveFood(index)}
                                                className="text-red-400 hover:text-red-300 p-1"
                                            >
                                                <FiX className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
                                            <div className="w-full sm:w-1/2">
                                                <label className="block text-xs text-gray-400 mb-1">
                                                    Quantity
                                                </label>
                                                <input
                                                    type="number"
                                                    value={food.quantity}
                                                    onChange={(e) => handleUpdateQuantity(index, parseFloat(e.target.value) || 0)}
                                                    min="0.1"
                                                    step="0.1"
                                                    className="w-full px-3 py-2 text-base border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-gray-700 text-white"
                                                    inputMode="decimal"
                                                />
                                            </div>
                                            <div className="w-full sm:w-1/2">
                                                <label className="block text-xs text-gray-400 mb-1">
                                                    Unit
                                                </label>
                                                <select
                                                    value={food.unit}
                                                    onChange={(e) => handleUpdateUnit(index, e.target.value)}
                                                    className="w-full px-3 py-2 text-base border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-gray-700 text-white"
                                                >
                                                    <option value="g">g</option>
                                                    <option value="oz">oz</option>
                                                    <option value="ml">ml</option>
                                                    <option value="cup">cup</option>
                                                    <option value="serving">serving</option>
                                                </select>
                                            </div>
                                        </div>
                                        
                                        {/* Macro input form */}
                                        {foodsNeedingMacros[index] && (
                                            <div className="mt-3 p-3 bg-yellow-900/20 rounded-md">
                                                <p className="text-xs text-yellow-300 mb-2 font-medium">
                                                    Required: Enter nutrition info per {food.quantity} {food.unit} <span className="text-red-500">*</span>
                                                </p>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                    <div>
                                                        <label className="block text-xs text-gray-400">
                                                            Calories <span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="number"
                                                            value={foodsNeedingMacros[index].calories}
                                                            onChange={(e) => handleMacroChange(index, 'calories', e.target.value)}
                                                            className="w-full px-3 py-2 text-base border border-gray-600 rounded-md bg-gray-700 text-white"
                                                            min="0"
                                                            placeholder="kcal"
                                                            inputMode="decimal"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-gray-400">
                                                            Protein <span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="number"
                                                            value={foodsNeedingMacros[index].protein}
                                                            onChange={(e) => handleMacroChange(index, 'protein', e.target.value)}
                                                            className="w-full px-3 py-2 text-base border border-gray-600 rounded-md bg-gray-700 text-white"
                                                            min="0"
                                                            placeholder="g"
                                                            inputMode="decimal"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-gray-400">
                                                            Carbs <span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="number"
                                                            value={foodsNeedingMacros[index].carbs}
                                                            onChange={(e) => handleMacroChange(index, 'carbs', e.target.value)}
                                                            className="w-full px-3 py-2 text-base border border-gray-600 rounded-md bg-gray-700 text-white"
                                                            min="0"
                                                            placeholder="g"
                                                            inputMode="decimal"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-gray-400">
                                                            Fat <span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="number"
                                                            value={foodsNeedingMacros[index].fat}
                                                            onChange={(e) => handleMacroChange(index, 'fat', e.target.value)}
                                                            className="w-full px-3 py-2 text-base border border-gray-600 rounded-md bg-gray-700 text-white"
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
                </form>
            </div>
            
            {/* Fixed footer with buttons */}
            <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 p-4 flex justify-between">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-3 text-sm font-medium text-gray-300 bg-gray-800 rounded-md hover:bg-gray-700"
                    disabled={isLoading}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={handleSubmit}
                    className="px-6 py-3 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 flex items-center"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <div className="inline-block w-4 h-4 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
                    ) : (
                        <FiPlus className="mr-2" />
                    )}
                    Log Meal
                </button>
            </div>
        </div>
    );
};

export default AddExtraMealModal; 