import React, { useState, useEffect, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { FiPlus, FiTrash2, FiSearch } from 'react-icons/fi';
import { useSelector } from 'react-redux';
import { selectProfile } from '../../store/slices/authSlice';
import FormInput from '../ui/FormInput';
import { 
    RecipeFormData, 
    recipeSchema, 
    RecipeIngredient, 
    FoodItem,
    RecipeWithIngredients
} from '../../types/mealPlanning';
import { 
    searchFoodItems, 
    createRecipe, 
    updateRecipe, 
    getRecipeById 
} from '../../services/mealPlanningService';
import { calculateNutrition } from '../../types/mealPlanning';

// Common measurement units for dropdown
const COMMON_UNITS = ['g', 'ml', 'oz', 'cups', 'tbsp', 'tsp', 'servings', 'pieces'];

interface RecipeBuilderProps {
    recipeId?: string;
    onSave: () => void;
    onCancel: () => void;
}

const RecipeBuilder: React.FC<RecipeBuilderProps> = ({ recipeId, onSave, onCancel }) => {
    const profile = useSelector(selectProfile);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedIngredients, setSelectedIngredients] = useState<RecipeIngredient[]>([]);
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
    const [totalNutrition, setTotalNutrition] = useState({
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
    });

    // Form methods
    const methods = useForm<RecipeFormData>({
        defaultValues: {
            name: '',
            description: '',
            instructions: '',
            serving_size: '100',
            serving_unit: 'g'
        }
    });
    const { handleSubmit, reset } = methods;

    // Fetch recipe data if editing
    useEffect(() => {
        const fetchRecipe = async () => {
            if (!recipeId) return;
            
            setIsLoading(true);
            setError(null);
            try {
                const recipe = await getRecipeById(recipeId);
                if (!recipe) {
                    setError('Recipe not found');
                    return;
                }
                
                // Set form values
                reset({
                    name: recipe.name,
                    description: recipe.description || '',
                    instructions: recipe.instructions || '',
                    serving_size: recipe.serving_size.toString(),
                    serving_unit: recipe.serving_unit
                });
                
                // Set ingredients
                setSelectedIngredients(recipe.ingredients);
                
                // Calculate nutrition totals
                updateTotalNutrition(recipe.ingredients);
            } catch (err) {
                console.error('Error fetching recipe:', err);
                setError('Failed to load recipe');
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchRecipe();
    }, [recipeId, reset]);

    // Handle search with debounce
    const debouncedSearch = useCallback((query: string) => {
        if (query.trim().length < 2) {
            setSearchResults([]); // Clear results if query is too short
            return;
        }
        
        setIsSearching(true);
        setError(null);
        
        searchFoodItems(query)
            .then(result => {
                setSearchResults(result.items);
            })
            .catch(err => {
                console.error('Error searching food items:', err);
                setError('Failed to search food items');
            })
            .finally(() => {
                setIsSearching(false);
            });
    }, []);

    // Handle search input change with debounce
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);
        
        // Clear any existing timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        // Set a new timeout
        const timeout = setTimeout(() => {
            debouncedSearch(query);
        }, 300); // 300ms delay
        
        setSearchTimeout(timeout);
    };

    // Add ingredient to recipe
    const handleAddIngredient = (foodItem: FoodItem) => {
        const existingIndex = selectedIngredients.findIndex(
            ingredient => ingredient.food_item_id === foodItem.id
        );
        
        if (existingIndex >= 0) {
            // Update quantity of existing ingredient
            const updatedIngredients = [...selectedIngredients];
            updatedIngredients[existingIndex] = {
                ...updatedIngredients[existingIndex],
                quantity: updatedIngredients[existingIndex].quantity + 100,
            };
            setSelectedIngredients(updatedIngredients);
            updateTotalNutrition(updatedIngredients);
        } else {
            // Add new ingredient
            const newIngredient: RecipeIngredient = {
                id: `temp-${Date.now()}`, // Temporary ID for UI
                recipe_id: recipeId || '',
                food_item_id: foodItem.id,
                quantity: 100,
                unit: 'g',
                created_at: new Date().toISOString(),
                food_item: foodItem
            };
            
            const updatedIngredients = [...selectedIngredients, newIngredient];
            setSelectedIngredients(updatedIngredients);
            updateTotalNutrition(updatedIngredients);
        }
    };

    // Update ingredient quantity
    const handleUpdateIngredient = (index: number, quantity: number, unit: string) => {
        const updatedIngredients = [...selectedIngredients];
        updatedIngredients[index] = {
            ...updatedIngredients[index],
            quantity,
            unit
        };
        setSelectedIngredients(updatedIngredients);
        updateTotalNutrition(updatedIngredients);
    };

    // Remove ingredient
    const handleRemoveIngredient = (index: number) => {
        const updatedIngredients = selectedIngredients.filter((_, i) => i !== index);
        setSelectedIngredients(updatedIngredients);
        updateTotalNutrition(updatedIngredients);
    };

    // Calculate total nutrition
    const updateTotalNutrition = (ingredients: RecipeIngredient[]) => {
        const totals = ingredients.reduce(
            (acc, ingredient) => {
                if (!ingredient.food_item) return acc;
                
                const nutrition = calculateNutrition(
                    ingredient.food_item,
                    ingredient.quantity,
                    ingredient.unit
                );
                
                return {
                    calories: acc.calories + nutrition.calories,
                    protein: acc.protein + nutrition.protein,
                    carbs: acc.carbs + nutrition.carbs,
                    fat: acc.fat + nutrition.fat
                };
            },
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
        
        setTotalNutrition(totals);
    };

    // Save recipe
    const handleSaveRecipe = async (formData: RecipeFormData) => {
        if (!profile || !profile.id) {
            setError('You must be logged in to create a recipe');
            return;
        }
        
        if (selectedIngredients.length === 0) {
            setError('Recipe must have at least one ingredient');
            return;
        }
        
        try {
            setIsSaving(true);
            setError(null);
            
            // Validate form data
            const validationResult = recipeSchema.safeParse(formData);
            if (!validationResult.success) {
                console.error('Validation errors:', validationResult.error);
                setError('Invalid form data. Please check the fields.');
                return;
            }
            
            const servingSize = parseFloat(formData.serving_size);
            
            // Prepare recipe data
            const recipeData = {
                coach_id: profile.id,
                name: formData.name,
                description: formData.description || undefined,
                instructions: formData.instructions || undefined,
                total_calories: totalNutrition.calories,
                total_protein: totalNutrition.protein,
                total_carbs: totalNutrition.carbs,
                total_fat: totalNutrition.fat,
                serving_size: servingSize,
                serving_unit: formData.serving_unit
            };
            
            let result: RecipeWithIngredients;
            
            if (recipeId) {
                // Update existing recipe
                // Filter ingredients to separate existing from new ones
                const existingIngredients = selectedIngredients
                    .filter(ing => ing.id && !ing.id.toString().startsWith('temp-'))
                    .map(ing => ({
                        id: ing.id,
                        food_item_id: ing.food_item_id,
                        quantity: ing.quantity,
                        unit: ing.unit,
                        notes: ing.notes
                    }));
                
                const newIngredients = selectedIngredients
                    .filter(ing => !ing.id || ing.id.toString().startsWith('temp-'))
                    .map(ing => ({
                        food_item_id: ing.food_item_id,
                        quantity: ing.quantity,
                        unit: ing.unit,
                        notes: ing.notes
                    }));
                
                // Update existing recipe with all ingredients
                const updateIngredientsData = [
                    ...existingIngredients,
                    ...newIngredients
                ] as Omit<RecipeIngredient, "created_at" | "recipe_id">[];
                
                // Update existing recipe
                result = await updateRecipe(recipeId, recipeData, updateIngredientsData);
            } else {
                // For creating new recipes: don't include ID field at all
                const createIngredientsData = selectedIngredients.map(ingredient => ({
                    food_item_id: ingredient.food_item_id,
                    quantity: ingredient.quantity,
                    unit: ingredient.unit,
                    notes: ingredient.notes
                }));
                
                // Create new recipe
                result = await createRecipe(recipeData, createIngredientsData);
            }
            
            console.log('Recipe saved:', result);
            onSave();
        } catch (err) {
            console.error('Error saving recipe:', err);
            setError('Failed to save recipe: ' + (err instanceof Error ? err.message : String(err)));
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-10 h-10 border-t-4 border-b-4 border-indigo-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="recipe-builder p-6 bg-white dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                    {recipeId ? 'Edit Recipe' : 'Create New Recipe'}
                </h2>
                <button
                    onClick={onCancel}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                    Cancel
                </button>
            </div>

            {error && (
                <div className="p-4 mb-6 text-red-700 bg-red-100 border-l-4 border-red-500 rounded dark:bg-red-900/20 dark:text-red-400">
                    <p>{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recipe Details */}
                <div className="lg:col-span-1">
                    <FormProvider {...methods}>
                        <form onSubmit={handleSubmit(handleSaveRecipe)}>
                            <div className="space-y-4">
                                <FormInput<RecipeFormData> name="name" label="Recipe Name" required />
                                <FormInput<RecipeFormData> name="description" label="Description" type="textarea" rows={3} />
                                <FormInput<RecipeFormData> name="instructions" label="Instructions" type="textarea" rows={5} />
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <FormInput<RecipeFormData> name="serving_size" label="Serving Size" type="number" required />
                                    <div className="space-y-1">
                                        <label htmlFor="serving_unit" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Serving Unit <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            id="serving_unit"
                                            {...methods.register('serving_unit')}
                                            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            required
                                        >
                                            {COMMON_UNITS.map(unit => (
                                                <option key={unit} value={unit}>{unit}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                
                                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                                    <h3 className="text-md font-medium text-gray-800 dark:text-white mb-2">Nutrition Totals</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-300">Calories</p>
                                            <p className="text-lg font-semibold text-gray-800 dark:text-white">{Math.round(totalNutrition.calories)}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-300">Protein</p>
                                            <p className="text-lg font-semibold text-gray-800 dark:text-white">{Math.round(totalNutrition.protein * 10) / 10}g</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-300">Carbs</p>
                                            <p className="text-lg font-semibold text-gray-800 dark:text-white">{Math.round(totalNutrition.carbs * 10) / 10}g</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-300">Fat</p>
                                            <p className="text-lg font-semibold text-gray-800 dark:text-white">{Math.round(totalNutrition.fat * 10) / 10}g</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex justify-end pt-4">
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className={`px-6 py-2 ${
                                            isSaving ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'
                                        } text-white rounded-md`}
                                    >
                                        {isSaving ? 'Saving...' : recipeId ? 'Update Recipe' : 'Create Recipe'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </FormProvider>
                </div>

                {/* Ingredients Management */}
                <div className="lg:col-span-2">
                    <div className="mb-6">
                        <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-3">Ingredients</h3>
                        
                        {/* Search for ingredients - Auto-complete */}
                        <div className="mb-4">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <FiSearch className="text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    className="w-full pl-10 pr-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    placeholder="Type to search for food items (minimum 2 characters)..."
                                />
                                {isSearching && (
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                        <div className="h-4 w-4 border-t-2 border-indigo-500 rounded-full animate-spin"></div>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <div className="mb-6 border border-gray-200 dark:border-gray-700 rounded-md">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Add</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Food Item</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Calories</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Protein</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Carbs</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Fat</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                            {searchResults.map(item => (
                                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        <button
                                                            onClick={() => handleAddIngredient(item)}
                                                            className="inline-flex items-center px-3 py-1.5 text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
                                                            title="Add to recipe"
                                                        >
                                                            <FiPlus size={16} className="mr-1" /> Add
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{item.food_name}</div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">{item.food_group || 'Uncategorized'}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        <div className="text-sm text-gray-900 dark:text-white">{Math.round(item.calories_per_100g)}</div>
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
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        
                        {/* Selected Ingredients */}
                        <div>
                            <h4 className="text-md font-medium text-gray-800 dark:text-white mb-2">Selected Ingredients</h4>
                            
                            {selectedIngredients.length === 0 ? (
                                <div className="p-6 text-center border border-gray-200 dark:border-gray-700 border-dashed rounded-md">
                                    <p className="text-gray-500 dark:text-gray-400">No ingredients added yet. Search for food items to add.</p>
                                </div>
                            ) : (
                                <div className="border border-gray-200 dark:border-gray-700 rounded-md">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                            <thead className="bg-gray-50 dark:bg-gray-700">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Ingredient</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Quantity</th>
                                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Calories</th>
                                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Protein</th>
                                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Carbs</th>
                                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Fat</th>
                                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                                {selectedIngredients.map((ingredient, index) => {
                                                    const foodItem = ingredient.food_item;
                                                    if (!foodItem) return null;
                                                    
                                                    const nutrition = calculateNutrition(
                                                        foodItem,
                                                        ingredient.quantity,
                                                        ingredient.unit
                                                    );
                                                    
                                                    return (
                                                        <tr key={ingredient.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm font-medium text-gray-900 dark:text-white">{foodItem.food_name}</div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="flex items-center space-x-2">
                                                                    <input
                                                                        type="number"
                                                                        value={ingredient.quantity}
                                                                        onChange={(e) => handleUpdateIngredient(
                                                                            index,
                                                                            parseFloat(e.target.value) || 0,
                                                                            ingredient.unit
                                                                        )}
                                                                        className="w-20 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                                        step="any"
                                                                        min="0"
                                                                    />
                                                                    <select
                                                                        value={ingredient.unit}
                                                                        onChange={(e) => handleUpdateIngredient(
                                                                            index,
                                                                            ingredient.quantity,
                                                                            e.target.value
                                                                        )}
                                                                        className="w-20 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                                    >
                                                                        {COMMON_UNITS.map(unit => (
                                                                            <option key={unit} value={unit}>{unit}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                                <div className="text-sm text-gray-900 dark:text-white">{Math.round(nutrition.calories)}</div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                                <div className="text-sm text-gray-900 dark:text-white">{nutrition.protein}g</div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                                <div className="text-sm text-gray-900 dark:text-white">{nutrition.carbs}g</div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                                <div className="text-sm text-gray-900 dark:text-white">{nutrition.fat}g</div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                                <button
                                                                    onClick={() => handleRemoveIngredient(index)}
                                                                    className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                                                >
                                                                    <FiTrash2 size={18} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecipeBuilder; 