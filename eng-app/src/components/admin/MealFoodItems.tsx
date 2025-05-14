import React, { useState } from 'react';
import { FiEdit2, FiTrash2, FiInfo } from 'react-icons/fi';
import { MealFoodItem } from '../../types/mealPlanning';
import { updateMealFoodItem, removeFoodItemFromMeal } from '../../services/mealPlanningService';

interface MealFoodItemsProps {
    mealId: string;
    foodItems: MealFoodItem[];
    onUpdate: () => void;
}

export const MealFoodItems: React.FC<MealFoodItemsProps> = ({ mealId, foodItems, onUpdate }) => {
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editQuantity, setEditQuantity] = useState<string>('');
    const [editUnit, setEditUnit] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    console.log('MEAL FOOD ITEMS', mealId, foodItems);

    if (foodItems.length === 0) {
        return (
            <div className="p-6 text-center border border-gray-200 dark:border-gray-700 border-dashed rounded-md">
                <p className="text-gray-500 dark:text-gray-400">No food items added to this meal yet.</p>
            </div>
        );
    }

    const handleEditClick = (item: MealFoodItem) => {
        setEditingItemId(item.id);
        setEditQuantity(item.quantity.toString());
        setEditUnit(item.unit);
        setError(null);
    };

    const handleSaveEdit = async (itemId: string) => {
        try {
            const quantity = parseFloat(editQuantity);
            if (isNaN(quantity) || quantity <= 0) {
                setError('Quantity must be a positive number');
                return;
            }

            await updateMealFoodItem(itemId, {
                quantity,
                unit: editUnit
            });
            
            setEditingItemId(null);
            setError(null);
            onUpdate();
        } catch (err) {
            console.error('Error updating food item:', err);
            setError('Failed to update food item');
        }
    };

    const handleRemoveItem = (itemId: string) => {
        setItemToDelete(itemId);
    };

    const confirmDeleteItem = async () => {
        if (!itemToDelete) return;
        
        try {
            await removeFoodItemFromMeal(itemToDelete);
            onUpdate();
        } catch (err) {
            console.error('Error removing food item:', err);
            setError('Failed to remove food item');
        } finally {
            setItemToDelete(null);
        }
    };

    const cancelDeleteItem = () => {
        setItemToDelete(null);
    };

    return (
        <div className="food-items">
            {error && (
                <div className="p-3 mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded dark:bg-red-900/20 dark:text-red-400">
                    <p>{error}</p>
                </div>
            )}
            
            <table className="w-full border-collapse">
                <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Food Item</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Quantity</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Calories</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Protein</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Carbs</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Fat</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {foodItems.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-4 py-3">
                                <div className="flex items-center">
                                    <div>
                                        <div className="font-medium text-gray-800 dark:text-white">
                                            {item.food_item?.food_name || 'Unknown Food'}
                                        </div>
                                        {item.source_recipe_id && (
                                            <div className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center">
                                                <FiInfo className="mr-1" /> From recipe
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-3">
                                {editingItemId === item.id ? (
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="number"
                                            value={editQuantity}
                                            onChange={(e) => setEditQuantity(e.target.value)}
                                            className="w-20 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            step="any"
                                            min="0"
                                        />
                                        <input
                                            type="text"
                                            value={editUnit}
                                            onChange={(e) => setEditUnit(e.target.value)}
                                            className="w-16 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                        <button
                                            onClick={() => handleSaveEdit(item.id)}
                                            className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200 dark:bg-green-700/20 dark:text-green-400 dark:hover:bg-green-700/30"
                                        >
                                            Save
                                        </button>
                                    </div>
                                ) : (
                                    <span className="text-gray-800 dark:text-white">
                                        {item.quantity} {item.unit}
                                    </span>
                                )}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-800 dark:text-white">
                                {item.calculated_calories ? Math.round(item.calculated_calories) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-800 dark:text-white">
                                {item.calculated_protein ? Math.round(item.calculated_protein * 10) / 10 : '-'}g
                            </td>
                            <td className="px-4 py-3 text-right text-gray-800 dark:text-white">
                                {item.calculated_carbs ? Math.round(item.calculated_carbs * 10) / 10 : '-'}g
                            </td>
                            <td className="px-4 py-3 text-right text-gray-800 dark:text-white">
                                {item.calculated_fat ? Math.round(item.calculated_fat * 10) / 10 : '-'}g
                            </td>
                            <td className="px-4 py-3 text-right">
                                <div className="flex justify-end space-x-2">
                                    {editingItemId === item.id ? (
                                        <button
                                            onClick={() => setEditingItemId(null)}
                                            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                        >
                                            Cancel
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => handleEditClick(item)}
                                                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                            >
                                                <FiEdit2 />
                                            </button>
                                            <button
                                                onClick={() => handleRemoveItem(item.id)}
                                                className="p-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
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

            {itemToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="max-w-md p-6 mx-auto bg-white rounded-lg dark:bg-gray-800">
                        <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">Confirm Removal</h3>
                        <p className="mb-6 text-gray-600 dark:text-gray-400">
                            Are you sure you want to remove this food item from the meal? This action cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button 
                                onClick={cancelDeleteItem}
                                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md dark:border-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmDeleteItem}
                                className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}; 