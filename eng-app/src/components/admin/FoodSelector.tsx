import React, { useState, useEffect } from 'react';
import { FiSearch, FiX, FiPlusCircle, FiBook } from 'react-icons/fi';
import { FoodItem } from '../../types/mealPlanning';
import { searchFoodItems, addFoodItemToMeal, addRecipeToMeal } from '../../services/mealPlanningService';
import { WEIGHT_UNITS, VOLUME_UNITS, COUNT_UNITS } from '../../types/mealPlanning';
import RecipeManager from './RecipeManager';

interface FoodSelectorProps {
    mealId: string;
    onClose: () => void;
}

export const FoodSelector: React.FC<FoodSelectorProps> = ({ mealId, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [category, setCategory] = useState<string | undefined>(undefined);
    const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [selectedFoodItem, setSelectedFoodItem] = useState<FoodItem | null>(null);
    const [quantity, setQuantity] = useState('100');
    const [unit, setUnit] = useState('g');
    const [unitType, setUnitType] = useState<'weight' | 'volume' | 'count'>('weight');
    const [isSaving, setIsSaving] = useState(false);
    const [showRecipeManager, setShowRecipeManager] = useState(false);

    const LIMIT = 20; // Items per page

    // Categories for food items
    const categories = [
        { value: undefined, label: 'All' },
        { value: 'Vegetables', label: 'Vegetables' },
        { value: 'Fruits', label: 'Fruits' },
        { value: 'Grains', label: 'Grains' },
        { value: 'Protein', label: 'Protein' },
        { value: 'Dairy', label: 'Dairy' },
        { value: 'Beverages', label: 'Beverages' },
        { value: 'Snacks', label: 'Snacks' },
        { value: 'Condiments', label: 'Condiments' }
    ];

    // Fetch food items on search, category, or page change
    useEffect(() => {
        const fetchFoodItems = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const offset = (page - 1) * LIMIT;
                const result = await searchFoodItems(searchQuery, category, LIMIT, offset);
                setFoodItems(result.items);
                setTotalCount(result.count);
            } catch (err) {
                console.error('Error searching food items:', err);
                setError('Failed to fetch food items.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchFoodItems();
    }, [searchQuery, category, page]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setPage(1); // Reset to first page on new search
    };

    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value === '' ? undefined : e.target.value;
        setCategory(value);
        setPage(1); // Reset to first page on category change
    };

    const handleSelectFoodItem = (item: FoodItem) => {
        setSelectedFoodItem(item);
        // Default to weight units for most items
        setUnitType('weight');
        setUnit('g');
        setQuantity('100');
    };

    const handleUnitTypeChange = (type: 'weight' | 'volume' | 'count') => {
        setUnitType(type);
        // Set default unit for the selected type
        if (type === 'weight') setUnit('g');
        else if (type === 'volume') setUnit('ml');
        else if (type === 'count') setUnit('serving');
    };

    const handleAddToMeal = async () => {
        if (!selectedFoodItem) return;
        
        try {
            setIsSaving(true);
            setError(null);
            
            const quantityValue = parseFloat(quantity);
            if (isNaN(quantityValue) || quantityValue <= 0) {
                setError('Quantity must be a positive number');
                return;
            }
            
            await addFoodItemToMeal(
                mealId,
                selectedFoodItem.id,
                quantityValue,
                unit
            );
            
            // Reset selection
            setSelectedFoodItem(null);
            onClose();
        } catch (err) {
            console.error('Error adding food to meal:', err);
            setError('Failed to add food item to meal.');
        } finally {
            setIsSaving(false);
        }
    };

    // Handle recipe selection
    const handleSelectRecipe = async (recipeId: string, servingSize: number) => {
        try {
            setIsSaving(true);
            setError(null);
            
            await addRecipeToMeal(mealId, recipeId, servingSize);
            
            setShowRecipeManager(false);
            onClose();
        } catch (err) {
            console.error('Error adding recipe to meal:', err);
            setError('Failed to add recipe to meal.');
            setIsSaving(false);
        }
    };

    // Calculate nutrition based on selected quantity and unit
    const calculateNutrition = (foodItem: FoodItem, qty: number, unitValue: string) => {
        if (!foodItem) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
        
        // Very basic conversion - in a real app, this would be more sophisticated
        let weightInGrams = qty;
        
        if (unitValue !== 'g') {
            if (unitValue === 'kg') weightInGrams = qty * 1000;
            else if (unitValue === 'oz') weightInGrams = qty * 28.35;
            else if (unitValue === 'lb') weightInGrams = qty * 453.59;
            // For other units, we'd need custom conversion logic
            else if (unitValue === 'serving' && foodItem.serving_size_g) {
                weightInGrams = qty * foodItem.serving_size_g;
            }
            // For volume, this is just a placeholder. Real conversion would depend on food density
            else if (unitValue === 'ml' || unitValue === 'l' || unitValue === 'cup') {
                weightInGrams = qty; // Simplified - assumes 1ml = 1g
            }
        }
        
        const factor = weightInGrams / 100; // Nutrients are per 100g
        
        return {
            calories: Math.round(foodItem.calories_per_100g * factor),
            protein: Math.round(foodItem.protein_per_100g * factor * 10) / 10,
            carbs: Math.round(foodItem.carbs_per_100g * factor * 10) / 10,
            fat: Math.round(foodItem.fat_per_100g * factor * 10) / 10
        };
    };

    // Calculate nutrition for the selected food item
    const nutrition = selectedFoodItem 
        ? calculateNutrition(selectedFoodItem, parseFloat(quantity) || 0, unit)
        : { calories: 0, protein: 0, carbs: 0, fat: 0 };

    // Calculate max pages
    const maxPage = Math.max(1, Math.ceil(totalCount / LIMIT));

    // If recipe manager is open, show it
    if (showRecipeManager) {
        return (
            <RecipeManager
                onClose={() => setShowRecipeManager(false)}
                onSelectRecipe={handleSelectRecipe}
                selectionMode={true}
            />
        );
    }

    return (
        <div className="food-selector p-4">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Add Food to Meal</h2>
                <button 
                    onClick={onClose}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                    <FiX />
                </button>
            </div>

            {error && (
                <div className="p-3 mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded dark:bg-red-900/20 dark:text-red-400">
                    <p>{error}</p>
                </div>
            )}

            {/* Add Recipe Button */}
            <div className="mb-4">
                <button
                    onClick={() => setShowRecipeManager(true)}
                    className="w-full flex items-center justify-center px-4 py-2 bg-indigo-100 text-indigo-700 border border-indigo-300 rounded-md hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800 dark:hover:bg-indigo-900/50"
                >
                    <FiBook className="mr-2" /> Select From My Recipes
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Search & Results */}
                <div className="lg:col-span-2">
                    <div className="mb-4 flex flex-col md:flex-row gap-3">
                        <div className="relative flex-grow">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <FiSearch className="text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="w-full pl-10 pr-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="Search food items..."
                                value={searchQuery}
                                onChange={handleSearchChange}
                            />
                        </div>
                        <select
                            className="px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            value={category || ''}
                            onChange={handleCategoryChange}
                        >
                            {categories.map(cat => (
                                <option key={cat.label} value={cat.value || ''}>
                                    {cat.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Food Items List */}
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="w-10 h-10 border-t-4 border-b-4 border-indigo-500 rounded-full animate-spin"></div>
                        </div>
                    ) : foodItems.length === 0 ? (
                        <div className="p-8 text-center border border-gray-300 border-dashed rounded-md dark:border-gray-700">
                            <p className="text-gray-500 dark:text-gray-400">No food items found. Try a different search term or category.</p>
                        </div>
                    ) : (
                        <div>
                            <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-md">
                                <div className="max-h-[50vh] overflow-y-auto">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Food Item</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Calories</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Protein</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Carbs</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Fat</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Add</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                            {foodItems.map(item => (
                                                <tr 
                                                    key={item.id} 
                                                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                                                        selectedFoodItem?.id === item.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                                                    }`}
                                                    onClick={() => handleSelectFoodItem(item)}
                                                >
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{item.food_name}</div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">{item.food_group || 'Uncategorized'}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        <div className="text-sm text-gray-900 dark:text-white">{Math.round(item.calories_per_100g)}</div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">per 100g</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        <div className="text-sm text-gray-900 dark:text-white">{item.protein_per_100g}g</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        <div className="text-sm text-gray-900 dark:text-white">{item.carbs_per_100g}g</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        <div className="text-sm text-gray-900 dark:text-white">{item.fat_per_100g}g</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleSelectFoodItem(item);
                                                            }}
                                                            className="p-1 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                                        >
                                                            <FiPlusCircle size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Pagination */}
                            {maxPage > 1 && (
                                <div className="flex justify-between items-center mt-4">
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        Showing {((page - 1) * LIMIT) + 1} to {Math.min(page * LIMIT, totalCount)} of {totalCount} items
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => setPage(Math.max(1, page - 1))}
                                            disabled={page === 1}
                                            className={`px-4 py-2 text-sm rounded ${
                                                page === 1
                                                    ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed'
                                                    : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/10 dark:text-indigo-400 dark:hover:bg-indigo-900/20'
                                            }`}
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => setPage(Math.min(maxPage, page + 1))}
                                            disabled={page === maxPage}
                                            className={`px-4 py-2 text-sm rounded ${
                                                page === maxPage
                                                    ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed'
                                                    : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/10 dark:text-indigo-400 dark:hover:bg-indigo-900/20'
                                            }`}
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Column - Selected Item & Add to Meal */}
                <div className="lg:col-span-1">
                    <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4">
                        <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
                            {selectedFoodItem ? 'Selected Food Item' : 'Select a Food Item'}
                        </h3>

                        {selectedFoodItem ? (
                            <div>
                                <div className="mb-4">
                                    <h4 className="text-lg font-medium text-gray-800 dark:text-white">{selectedFoodItem.food_name}</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{selectedFoodItem.food_group || 'Uncategorized'}</p>
                                </div>

                                {/* Quantity & Unit Selection */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Quantity
                                    </label>
                                    <div className="flex items-center">
                                        <input
                                            type="number"
                                            value={quantity}
                                            onChange={(e) => setQuantity(e.target.value)}
                                            className="w-24 px-3 py-2 border rounded-l-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            step="any"
                                            min="0"
                                        />
                                        <select
                                            value={unit}
                                            onChange={(e) => setUnit(e.target.value)}
                                            className="px-3 py-2 border border-l-0 rounded-r-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        >
                                            {unitType === 'weight' && WEIGHT_UNITS.map(unit => (
                                                <option key={unit} value={unit}>{unit}</option>
                                            ))}
                                            {unitType === 'volume' && VOLUME_UNITS.map(unit => (
                                                <option key={unit} value={unit}>{unit}</option>
                                            ))}
                                            {unitType === 'count' && COUNT_UNITS.map(unit => (
                                                <option key={unit} value={unit}>{unit}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Unit Type Selection */}
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Unit Type
                                    </label>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleUnitTypeChange('weight')}
                                            className={`px-3 py-1 text-sm rounded ${
                                                unitType === 'weight'
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                            }`}
                                        >
                                            Weight
                                        </button>
                                        <button
                                            onClick={() => handleUnitTypeChange('volume')}
                                            className={`px-3 py-1 text-sm rounded ${
                                                unitType === 'volume'
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                            }`}
                                        >
                                            Volume
                                        </button>
                                        <button
                                            onClick={() => handleUnitTypeChange('count')}
                                            className={`px-3 py-1 text-sm rounded ${
                                                unitType === 'count'
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                            }`}
                                        >
                                            Count
                                        </button>
                                    </div>
                                </div>

                                {/* Calculate nutrition */}
                                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md mb-4">
                                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nutrition Info</h5>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Calories</p>
                                            <p className="text-sm font-medium text-gray-800 dark:text-white">{nutrition.calories}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Protein</p>
                                            <p className="text-sm font-medium text-gray-800 dark:text-white">{nutrition.protein}g</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Carbs</p>
                                            <p className="text-sm font-medium text-gray-800 dark:text-white">{nutrition.carbs}g</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Fat</p>
                                            <p className="text-sm font-medium text-gray-800 dark:text-white">{nutrition.fat}g</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Add to Meal Button */}
                                <button
                                    onClick={handleAddToMeal}
                                    disabled={isSaving}
                                    className={`w-full flex items-center justify-center px-4 py-2 ${
                                        isSaving ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'
                                    } text-white rounded-md`}
                                >
                                    {isSaving ? 'Adding...' : 'Add to Meal'}
                                </button>
                            </div>
                        ) : (
                            <div className="text-center p-6 border border-gray-200 dark:border-gray-700 border-dashed rounded-md">
                                <p className="text-gray-500 dark:text-gray-400">
                                    Select a food item from the list to add it to your meal.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}; 