import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiSearch, FiPlus, FiX } from 'react-icons/fi';
import { TbBarcode } from 'react-icons/tb';
import { searchFoodItems, addFoodItemToMeal, addRecipeToMeal } from '../../services/mealPlanningService';
import { FoodItem } from '../../types/mealPlanning';
import RecipeManager from './RecipeManager';
import BarcodeScanner from '../nutrition/BarcodeScanner';
import toast from 'react-hot-toast';
import { searchFoodItems as searchWithUsdaOption } from '../../services/foodItemService';

const LIMIT = 20;

interface FoodSelectorProps {
    mealId: string;
    onClose: () => void;
}

export const FoodSelector: React.FC<FoodSelectorProps> = ({ mealId, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [category, setCategory] = useState<string | undefined>(undefined);
    const [includeExternalSources, setIncludeExternalSources] = useState(true);
    const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [selectedFoodItem, setSelectedFoodItem] = useState<FoodItem | null>(null);
    const [quantity, setQuantity] = useState('100');
    const [unit, setUnit] = useState('g');
    const [showRecipeManager, setShowRecipeManager] = useState(false);
    const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
    const [alertMessage, setAlertMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);

    const searchInputRef = useRef<HTMLInputElement>(null);
    
    // Function to search food items
    const performSearch = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            let result;
            
            if (includeExternalSources) {
                // Use the foodItemService with USDA support
                result = await searchWithUsdaOption(
                    searchQuery, 
                    {
                        food_group: category
                    },
                    LIMIT, 
                    (page - 1) * LIMIT,
                    true // includeExternalSources as separate parameter
                );
            } else {
                // Use the local-only search
                result = await searchFoodItems(
                    searchQuery, 
                    category, 
                    LIMIT, 
                    (page - 1) * LIMIT
                );
            }
            
            setFoodItems(result.items);
            setTotalCount(result.count);
        } catch (err) {
            setError('Error fetching food items. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery, category, page, includeExternalSources]);

    // Initial search and search on dependency changes
    useEffect(() => {
        performSearch();
    }, [performSearch]);

    // Function to handle food item selection
    const handleSelectFoodItem = (foodItem: FoodItem) => {
        setSelectedFoodItem(foodItem);
        // Reset quantity to 100 for each new selection
        setQuantity('100');
        setUnit('g');
    };

    // Function to handle barcode detection
    const handleBarcodeDetect = (foodItem: FoodItem | null) => {
        setShowBarcodeScanner(false);
        
        if (foodItem) {
            // If a food item was found via barcode, select it
            handleSelectFoodItem(foodItem);
            setSearchQuery(foodItem.food_name); // Update search query to match found item
            setAlertMessage({
                type: 'success',
                message: `Found item: ${foodItem.food_name}`
            });
        } else {
            setAlertMessage({
                type: 'error',
                message: 'No food item found with this barcode'
            });
        }
    };
    
    // Handle toggling external sources
    const handleExternalSourcesToggle = () => {
        setIncludeExternalSources(!includeExternalSources);
        setPage(1); // Reset to first page when toggling external sources
    };
    
    // Add selected food item to meal
    const handleAddToMealClick = async () => {
        if (!selectedFoodItem) return;
        
        const parsedQuantity = parseFloat(quantity);
        if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
            setError('Please enter a valid quantity.');
            return;
        }
        
        try {
            await addFoodItemToMeal(mealId, selectedFoodItem.id, parsedQuantity, unit);
            onClose();
            toast.success('Food item added to meal!');
        } catch (err) {
            setError('Error adding food item to meal. Please try again.');
            console.error(err);
        }
    };

    // Handle recipe selection
    const handleSelectRecipe = async (recipeId: string, servingSize: number) => {
        try {
            await addRecipeToMeal(mealId, recipeId, servingSize);
            setShowRecipeManager(false);
            onClose();
            toast.success('Recipe added to meal!');
        } catch (err) {
            setError('Error adding recipe to meal. Please try again.');
            console.error(err);
        }
    };
    
    // If barcode scanner is showing
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
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>
                
                <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
                    <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="w-full">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                                        Add Food Item to Meal
                                    </h3>
                                    <div className="flex space-x-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowBarcodeScanner(true)}
                                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                        >
                                            <TbBarcode className="mr-2 h-4 w-4" />
                                            Scan Barcode
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowRecipeManager(true)}
                                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        >
                                            <FiPlus className="mr-2 h-4 w-4" />
                                            Add Recipe
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Search Input */}
                                <div className="mb-4">
                                    <div className="relative">
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search for food items..."
                                            className="w-full px-4 py-2 pl-10 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    performSearch();
                                                }
                                            }}
                                        />
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FiSearch className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={performSearch}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                        >
                                            <span className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
                                                Search
                                            </span>
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col md:flex-row items-center mb-6 gap-4">
                                    {/* Category Filter */}
                                    <select
                                        value={category || ''}
                                        onChange={(e) => {
                                            setCategory(e.target.value || undefined);
                                            setPage(1); // Reset to first page when changing category
                                        }}
                                        className="w-full md:w-auto px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                                    
                                    {/* USDA Database Toggle */}
                                    <div className="flex items-center">
                                        <label className="inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                className="sr-only peer"
                                                checked={includeExternalSources}
                                                onChange={handleExternalSourcesToggle}
                                            />
                                            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                            <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                                                Include USDA Database
                                            </span>
                                        </label>
                                    </div>
                                </div>
                              
                              {/* Food Items List */}
                              <div className="mt-4">
                                  {alertMessage && (
                                      <div className={`mb-4 p-3 rounded-md ${
                                          alertMessage.type === 'success' 
                                              ? 'bg-green-100 border border-green-200 text-green-800 dark:bg-green-800 dark:text-green-100' 
                                              : 'bg-red-100 border border-red-200 text-red-800 dark:bg-red-800 dark:text-red-100'
                                      }`}>
                                          {alertMessage.message}
                                          <button 
                                              onClick={() => setAlertMessage(null)}
                                              className="float-right"
                                          >
                                              <FiX className="w-4 h-4" />
                                          </button>
                                      </div>
                                  )}
                                  
                                  {error && (
                                      <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-800 rounded-md dark:bg-red-800 dark:text-red-100">
                                          {error}
                                          <button 
                                              onClick={() => setError(null)}
                                              className="float-right"
                                          >
                                              <FiX className="w-4 h-4" />
                                          </button>
                                      </div>
                                  )}
                                  
                                  {isLoading ? (
                                      <div className="flex justify-center items-center h-40">
                                          <div className="w-8 h-8 border-t-2 border-b-2 border-indigo-500 rounded-full animate-spin"></div>
                                      </div>
                                  ) : foodItems.length === 0 ? (
                                      <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                                          No food items found. Try a different search.
                                      </div>
                                  ) : (
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                          {foodItems.map((foodItem) => (
                                              <div 
                                                  key={foodItem.id}
                                                  onClick={() => handleSelectFoodItem(foodItem)}
                                                  className={`p-4 border rounded-md cursor-pointer transition-colors ${
                                                      selectedFoodItem?.id === foodItem.id
                                                          ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-900 dark:border-indigo-700'
                                                          : 'hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700'
                                                  }`}
                                              >
                                                  <div className="font-medium">{foodItem.food_name}</div>
                                                  {foodItem.brand && (
                                                      <div className="text-sm text-gray-500 dark:text-gray-400">{foodItem.brand}</div>
                                                  )}
                                                  {foodItem.source === 'usda' && (
                                                      <div className="text-xs text-blue-500 dark:text-blue-400 mt-1">Source: USDA Database</div>
                                                  )}
                                                  <div className="mt-2 text-sm">
                                                      <span className="text-red-500 dark:text-red-400 mr-3">P: {foodItem.protein_per_100g}g</span>
                                                      <span className="text-yellow-500 dark:text-yellow-400 mr-3">C: {foodItem.carbs_per_100g}g</span>
                                                      <span className="text-blue-500 dark:text-blue-400">F: {foodItem.fat_per_100g}g</span>
                                                  </div>
                                                  <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                                      {foodItem.calories_per_100g} kcal per 100g
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  )}
                                  
                                  {/* Pagination controls */}
                                  {totalCount > LIMIT && (
                                      <div className="flex justify-center mt-6">
                                          <nav className="flex items-center">
                                              <button
                                                  onClick={() => setPage(p => Math.max(1, p - 1))}
                                                  disabled={page === 1}
                                                  className="px-3 py-1 border rounded-md mr-2 disabled:opacity-50 dark:bg-gray-700 dark:border-gray-600"
                                              >
                                                  Previous
                                              </button>
                                              <span className="text-sm text-gray-700 dark:text-gray-300">
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
                              
                              {/* Selected Food Item Panel */}
                              {selectedFoodItem && (
                                  <div className="mt-6 p-4 border border-gray-200 dark:border-gray-700 rounded-md">
                                      <h4 className="font-medium text-gray-900 dark:text-white">
                                          Selected: {selectedFoodItem.food_name}
                                      </h4>
                                      
                                      <div className="grid grid-cols-2 gap-4 mt-4">
                                          <div>
                                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                                      
                                      <div className="mt-4">
                                          <div className="text-sm text-gray-700 dark:text-gray-300">
                                              <span className="font-medium">Nutrition per 100g:</span> 
                                              <span className="ml-2 text-red-500 dark:text-red-400">P: {selectedFoodItem.protein_per_100g}g</span> | 
                                              <span className="ml-2 text-yellow-500 dark:text-yellow-400">C: {selectedFoodItem.carbs_per_100g}g</span> | 
                                              <span className="ml-2 text-blue-500 dark:text-blue-400">F: {selectedFoodItem.fat_per_100g}g</span> | 
                                              <span className="ml-2">{selectedFoodItem.calories_per_100g} kcal</span>
                                          </div>
                                      </div>
                                  </div>
                              )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            type="button"
                            onClick={handleAddToMealClick}
                            disabled={!selectedFoodItem}
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                        >
                            Add to Meal
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Recipe Manager Modal */}
            {showRecipeManager && (
                <RecipeManager 
                    onClose={() => setShowRecipeManager(false)}
                    onSelectRecipe={handleSelectRecipe}
                    selectionMode={true}
                />
            )}
        </div>
    );
}; 