import React, { useState, useEffect } from 'react';
import { FiPlus, FiSearch, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { useSelector } from 'react-redux';
import { selectProfile } from '../../store/slices/authSlice';
import { Recipe } from '../../types/mealPlanning';
import { getRecipesByCoach, deleteRecipe } from '../../services/mealPlanningService';
import RecipeBuilder from './RecipeBuilder';

interface RecipeManagerProps {
    onClose: () => void;
    onSelectRecipe?: (recipeId: string, servingSize: number) => void;
    selectionMode?: boolean;
}

const RecipeManager: React.FC<RecipeManagerProps> = ({ 
    onClose, 
    onSelectRecipe,
    selectionMode = false
}) => {
    const profile = useSelector(selectProfile);
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
    const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [servingSize, setServingSize] = useState<string>('1');

    const fetchRecipes = async () => {
        if (!profile || !profile.id) return;
        
        setIsLoading(true);
        setError(null);
        try {
            const result = await getRecipesByCoach(profile.id, '', 100); // Get all recipes
            setRecipes(result.recipes);
        } catch (err) {
            console.error('Error fetching recipes:', err);
            setError('Failed to load recipes');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRecipes();
    }, [profile]);

    // Filter recipes based on search query
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredRecipes(recipes);
            return;
        }
        
        const query = searchQuery.toLowerCase();
        const filtered = recipes.filter(
            recipe => recipe.name.toLowerCase().includes(query) || 
                   (recipe.description && recipe.description.toLowerCase().includes(query))
        );
        setFilteredRecipes(filtered);
    }, [searchQuery, recipes]);

    const handleCreateRecipe = () => {
        setSelectedRecipeId(null);
        setIsCreating(true);
    };

    const handleEditRecipe = (recipeId: string) => {
        setSelectedRecipeId(recipeId);
        setIsCreating(true);
    };

    const handleSaveRecipe = async () => {
        try {
            setIsCreating(false);
            
            // Fetch the updated recipes list
            if (!profile || !profile.id) return;
            
            const result = await getRecipesByCoach(profile.id, '', 100);
            setRecipes(result.recipes);
            
            // If we're in selection mode, get the latest recipe (which should be the one just created)
            if (selectionMode && onSelectRecipe && result.recipes.length > 0) {
                // Sort by created_at to get the most recently created recipe
                const sortedRecipes = [...result.recipes].sort(
                    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
                const latestRecipe = sortedRecipes[0];
                
                // If this was a new recipe (not editing an existing one)
                if (!selectedRecipeId) {
                    // Auto-select the new recipe with default serving size of 1
                    onSelectRecipe(latestRecipe.id, 1);
                }
            } else {
                // Just reset the UI state
                setSelectedRecipeId(null);
            }
        } catch (err) {
            console.error('Error updating recipes:', err);
            setError('Failed to refresh recipes');
        }
    };

    const handleCancelRecipe = () => {
        setIsCreating(false);
        setSelectedRecipeId(null);
    };

    const handleDeleteRecipe = async (recipeId: string) => {
        try {
            await deleteRecipe(recipeId);
            setShowDeleteConfirm(null);
            await fetchRecipes();
        } catch (err) {
            console.error('Error deleting recipe:', err);
            setError('Failed to delete recipe');
        }
    };

    const handleSelectRecipe = (recipeId: string) => {
        if (!onSelectRecipe || !selectionMode) return;
        
        const servingSizeValue = parseFloat(servingSize);
        if (isNaN(servingSizeValue) || servingSizeValue <= 0) {
            setError('Please enter a valid serving size');
            return;
        }
        
        onSelectRecipe(recipeId, servingSizeValue);
    };

    if (isCreating) {
        return (
            <RecipeBuilder 
                recipeId={selectedRecipeId || undefined}
                onSave={handleSaveRecipe}
                onCancel={handleCancelRecipe}
                isForSelection={selectionMode}
            />
        );
    }

    return (
        <div className="recipe-manager p-6 bg-white dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                        {selectionMode ? 'Select a Recipe' : 'Recipe Management'}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {selectionMode 
                            ? 'Choose a recipe to add to your meal or create a new one'
                            : 'Manage your custom recipes'}
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={handleCreateRecipe}
                        className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                        <FiPlus className="mr-2" /> New Recipe
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                        {selectionMode ? 'Cancel' : 'Close'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 mb-6 text-red-700 bg-red-100 border-l-4 border-red-500 rounded dark:bg-red-900/20 dark:text-red-400">
                    <p>{error}</p>
                </div>
            )}

            {/* Search bar */}
            <div className="mb-6">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <FiSearch className="text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="Search recipes..."
                    />
                </div>
            </div>

            {/* Recipe List */}
            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="w-10 h-10 border-t-4 border-b-4 border-indigo-500 rounded-full animate-spin"></div>
                </div>
            ) : filteredRecipes.length === 0 ? (
                <div className="p-8 text-center border border-gray-300 border-dashed rounded-md dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {recipes.length === 0 
                            ? 'No recipes found. Create your first recipe to get started.' 
                            : 'No recipes found matching your search criteria.'}
                    </p>
                    {recipes.length === 0 && (
                        <button
                            onClick={handleCreateRecipe}
                            className="flex items-center px-4 py-2 mx-auto bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        >
                            <FiPlus className="mr-2" /> Create Recipe
                        </button>
                    )}
                </div>
            ) : (
                <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-md">
                    <div className="max-h-[50vh] overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Recipe Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Description</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Calories</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Macros</th>
                                    {selectionMode && (
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Serving Size</th>
                                    )}
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                {filteredRecipes.map(recipe => (
                                    <tr key={recipe.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{recipe.name}</div>
                                            <div className="text-xs text-indigo-600 dark:text-indigo-400">
                                                {recipe.serving_size} {recipe.serving_unit} per serving
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                                                {recipe.description || 'No description'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="text-sm text-gray-900 dark:text-white">{Math.round(recipe.total_calories)} cal</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="text-sm text-gray-900 dark:text-white">
                                                P: {Math.round(recipe.total_protein)}g • C: {Math.round(recipe.total_carbs)}g • F: {Math.round(recipe.total_fat)}g
                                            </div>
                                        </td>
                                        {selectionMode && (
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <input
                                                    type="number"
                                                    className="w-20 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                    value={servingSize}
                                                    onChange={(e) => setServingSize(e.target.value)}
                                                    min="0.1"
                                                    step="0.1"
                                                />
                                            </td>
                                        )}
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex justify-end space-x-2">
                                                {selectionMode ? (
                                                    <button
                                                        onClick={() => handleSelectRecipe(recipe.id)}
                                                        className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                                    >
                                                        Select
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => handleEditRecipe(recipe.id)}
                                                            className="p-1 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                                        >
                                                            <FiEdit2 />
                                                        </button>
                                                        <button
                                                            onClick={() => setShowDeleteConfirm(recipe.id)}
                                                            className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                                        >
                                                            <FiTrash2 />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="max-w-md p-6 mx-auto bg-white rounded-lg dark:bg-gray-800">
                        <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">Confirm Deletion</h3>
                        <p className="mb-6 text-gray-600 dark:text-gray-400">
                            Are you sure you want to delete this recipe? This action cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md dark:border-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => showDeleteConfirm && handleDeleteRecipe(showDeleteConfirm)}
                                className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecipeManager; 