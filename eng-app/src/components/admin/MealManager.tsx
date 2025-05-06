import React, { useState, useEffect, useRef } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { FiPlus, FiChevronDown, FiChevronUp, FiEdit2, FiTrash2, FiCopy, FiMenu } from 'react-icons/fi';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import FormInput from '../ui/FormInput';
import { 
    Meal, 
    MealWithFoodItems, 
    MealFormData,
    mealSchema,
    NutritionPlanWithMeals
} from '../../types/mealPlanning';
import { createMeal, updateMeal, deleteMeal, getNutritionPlanById, duplicateMeal, updateMealsOrder } from '../../services/mealPlanningService';
import { MealFoodItems } from './MealFoodItems';
import { FoodSelector } from './FoodSelector';

// Define types for drag and drop
type DragItem = {
    type: string;
    id: string;
    index: number;
};

// Draggable meal component
const DraggableMeal: React.FC<{
    meal: MealWithFoodItems;
    index: number;
    expandedMealId: string | null;
    toggleMealExpansion: (id: string) => void;
    handleEditMeal: (meal: Meal) => void;
    handleDeleteMeal: (id: string) => void;
    handleDuplicateMeal: (id: string) => void;
    handleAddFoodToMeal: (id: string) => void;
    moveMeal: (dragIndex: number, hoverIndex: number) => void;
    fetchNutritionPlan: () => Promise<void>;
}> = ({ 
    meal, 
    index, 
    expandedMealId, 
    toggleMealExpansion, 
    handleEditMeal, 
    handleDeleteMeal, 
    handleDuplicateMeal, 
    handleAddFoodToMeal, 
    moveMeal,
    fetchNutritionPlan 
}) => {
    const ref = useRef<HTMLDivElement>(null);

    const [{ isDragging }, drag] = useDrag({
        type: 'MEAL',
        item: { type: 'MEAL', id: meal.id, index },
        collect: (monitor) => ({
            isDragging: monitor.isDragging()
        })
    });

    const [, drop] = useDrop<DragItem>({
        accept: 'MEAL',
        hover: (item, monitor) => {
            if (!ref.current) {
                return;
            }

            const dragIndex = item.index;
            const hoverIndex = index;

            // Don't replace items with themselves
            if (dragIndex === hoverIndex) {
                return;
            }

            // Determine rectangle on screen
            const hoverBoundingRect = ref.current.getBoundingClientRect();

            // Get vertical middle
            const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

            // Determine mouse position
            const clientOffset = monitor.getClientOffset();

            // Get pixels to the top
            const hoverClientY = clientOffset!.y - hoverBoundingRect.top;

            // Only perform the move when the mouse has crossed half of the item's height
            // When dragging downwards, only move when the cursor is below 50%
            // When dragging upwards, only move when the cursor is above 50%
            if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
                return;
            }

            if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
                return;
            }

            // Time to actually perform the action
            moveMeal(dragIndex, hoverIndex);

            // Note: we're mutating the monitor item here!
            // Generally it's better to avoid mutations,
            // but it's good here for the sake of performance
            // to avoid expensive index searches.
            item.index = hoverIndex;
        },
    });

    // Initialize drag and drop refs
    drag(drop(ref));

    return (
        <div 
            ref={ref} 
            className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-4 ${isDragging ? 'opacity-50' : ''}`}
        >
            {/* Meal Header */}
            <div 
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 cursor-pointer"
                onClick={() => toggleMealExpansion(meal.id)}
            >
                <div className="flex items-center">
                    <div className="cursor-move mr-2 text-gray-500 dark:text-gray-400">
                        <FiMenu />
                    </div>
                    {expandedMealId === meal.id ? <FiChevronUp className="mr-2" /> : <FiChevronDown className="mr-2" />}
                    <div>
                        <h4 className="font-medium text-gray-800 dark:text-white">{meal.name}</h4>
                        {meal.time_suggestion && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">{meal.time_suggestion}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center space-x-1">
                    <div className="text-right mr-4">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white">{Math.round(meal.total_calories)} cal</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                            P: {Math.round(meal.total_protein)}g • C: {Math.round(meal.total_carbs)}g • F: {Math.round(meal.total_fat)}g
                        </p>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateMeal(meal.id);
                        }}
                        className="p-1 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
                        title="Duplicate meal"
                    >
                        <FiCopy />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleEditMeal(meal);
                        }}
                        className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                        <FiEdit2 />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMeal(meal.id);
                        }}
                        className="p-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                    >
                        <FiTrash2 />
                    </button>
                </div>
            </div>

            {/* Meal Content */}
            {expandedMealId === meal.id && (
                <div className="p-4 bg-white dark:bg-gray-800">
                    {meal.notes && (
                        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                            <p className="text-sm text-gray-700 dark:text-gray-300">{meal.notes}</p>
                        </div>
                    )}

                    {/* Food Items */}
                    <MealFoodItems 
                        mealId={meal.id} 
                        foodItems={meal.food_items || []} 
                        onUpdate={fetchNutritionPlan}
                    />

                    <div className="mt-4 flex justify-center">
                        <button
                            onClick={() => handleAddFoodToMeal(meal.id)}
                            className="flex items-center px-4 py-2 text-indigo-600 dark:text-indigo-400 border border-indigo-600 dark:border-indigo-400 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                        >
                            <FiPlus className="mr-2" /> Add Food Item
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

interface MealManagerProps {
    nutritionPlanId: string;
    onClose: () => void;
}

const MealManager: React.FC<MealManagerProps> = ({ nutritionPlanId, onClose }) => {
    const [nutritionPlan, setNutritionPlan] = useState<NutritionPlanWithMeals | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedMealId, setExpandedMealId] = useState<string | null>(null);
    const [activeDayNumber, setActiveDayNumber] = useState<number>(1);
    const [showAddMealForm, setShowAddMealForm] = useState(false);
    const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
    const [showFoodSelector, setShowFoodSelector] = useState(false);
    const [selectedMealId, setSelectedMealId] = useState<string | null>(null);
    const [mealToDelete, setMealToDelete] = useState<string | null>(null);

    // Form methods for adding/editing meals
    const mealFormMethods = useForm<MealFormData>({
        defaultValues: {
            name: '',
            time_suggestion: '',
            notes: '',
            day_number: 1,
            day_type: ''
        }
    });
    const { reset: resetMealForm, handleSubmit: handleMealSubmit } = mealFormMethods;

    // Fetch nutrition plan data
    const fetchNutritionPlan = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getNutritionPlanById(nutritionPlanId);
            setNutritionPlan(data);
            
            // Set active day to the first day in the plan, or 1 if no meals
            if (data && data.days.length > 0) {
                setActiveDayNumber(data.days[0]);
            }
        } catch (err) {
            console.error('Error fetching nutrition plan:', err);
            setError('Failed to load nutrition plan.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchNutritionPlan();
    }, [nutritionPlanId]);

    // Toggle meal expansion
    const toggleMealExpansion = (mealId: string) => {
        setExpandedMealId(expandedMealId === mealId ? null : mealId);
    };

    // Handle day selection
    const handleDayChange = (day: number) => {
        setActiveDayNumber(day);
    };

    // Add new day
    const handleAddDay = () => {
        const maxDay = nutritionPlan?.days.reduce((max, day) => Math.max(max, day), 0) || 0;
        setActiveDayNumber(maxDay + 1);
        setShowAddMealForm(true);
        resetMealForm({
            name: '',
            time_suggestion: '',
            notes: '',
            day_number: maxDay + 1,
            day_type: ''
        });
    };

    // Open add meal form
    const handleAddMeal = () => {
        setEditingMeal(null);
        setShowAddMealForm(true);
        resetMealForm({
            name: '',
            time_suggestion: '',
            notes: '',
            day_number: activeDayNumber,
            day_type: ''
        });
    };

    // Open edit meal form
    const handleEditMeal = (meal: Meal) => {
        setEditingMeal(meal);
        setShowAddMealForm(true);
        resetMealForm({
            name: meal.name,
            time_suggestion: meal.time_suggestion || '',
            notes: meal.notes || '',
            day_number: meal.day_number,
            day_type: meal.day_type || ''
        });
    };

    // Handle meal form submission
    const handleMealFormSubmit = async (data: MealFormData) => {
        try {
            // Validate form data
            const validationResult = mealSchema.safeParse(data);
            if (!validationResult.success) {
                console.error('Validation errors:', validationResult.error);
                setError('Invalid form data. Please check the fields.');
                return;
            }

            if (editingMeal) {
                // Update existing meal
                await updateMeal(editingMeal.id, {
                    name: data.name,
                    time_suggestion: data.time_suggestion || null,
                    notes: data.notes || null,
                    day_number: data.day_number,
                    day_type: data.day_type || null
                });
            } else {
                // Create new meal
                // Find the maximum order in the active day
                const maxOrder = nutritionPlan?.meals
                    .filter(meal => meal.day_number === data.day_number)
                    .reduce((max, meal) => Math.max(max, meal.order_in_plan), -1) || -1;
                
                await createMeal({
                    nutrition_plan_id: nutritionPlanId,
                    name: data.name,
                    time_suggestion: data.time_suggestion || null,
                    notes: data.notes || null,
                    order_in_plan: maxOrder + 1,
                    day_number: data.day_number,
                    day_type: data.day_type || null
                });
            }

            // Reset form and state
            setShowAddMealForm(false);
            setEditingMeal(null);
            resetMealForm();
            
            // Refresh nutrition plan data
            await fetchNutritionPlan();
        } catch (err) {
            console.error('Error saving meal:', err);
            setError('Failed to save meal.');
        }
    };

    // Handle meal deletion
    const handleDeleteMeal = async (mealId: string) => {
        setMealToDelete(mealId);
    };

    // Confirm meal deletion
    const confirmDeleteMeal = async () => {
        if (!mealToDelete) return;
        
        try {
            await deleteMeal(mealToDelete);
            await fetchNutritionPlan();
        } catch (err) {
            console.error('Error deleting meal:', err);
            setError('Failed to delete meal.');
        } finally {
            setMealToDelete(null);
        }
    };

    // Cancel meal deletion
    const cancelDeleteMeal = () => {
        setMealToDelete(null);
    };

    // Open food selector
    const handleAddFoodToMeal = (mealId: string) => {
        setSelectedMealId(mealId);
        setShowFoodSelector(true);
    };

    // Handle food selection
    const handleFoodSelectionComplete = () => {
        setShowFoodSelector(false);
        setSelectedMealId(null);
        fetchNutritionPlan(); // Refresh data
    };

    // Add the duplicate meal handler
    const handleDuplicateMeal = async (mealId: string) => {
        try {
            setIsLoading(true);
            await duplicateMeal(mealId);
            await fetchNutritionPlan(); // Refresh the plan data to show the new meal
            setIsLoading(false);
        } catch (err) {
            console.error('Error duplicating meal:', err);
            setError('Failed to duplicate meal.');
            setIsLoading(false);
        }
    };

    // Filter meals for the active day
    const mealsForActiveDay = nutritionPlan?.meals
        .filter(meal => meal.day_number === activeDayNumber)
        .sort((a, b) => a.order_in_plan - b.order_in_plan) || [];

    // Calculate day totals
    const dayTotals = mealsForActiveDay.reduce(
        (acc, meal) => {
            return {
                calories: acc.calories + meal.total_calories,
                protein: acc.protein + meal.total_protein,
                carbs: acc.carbs + meal.total_carbs,
                fat: acc.fat + meal.total_fat
            };
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    // Function to move a meal (change its order)
    const moveMeal = async (dragIndex: number, hoverIndex: number) => {
        const draggedMeals = [...mealsForActiveDay];
        const draggedMeal = draggedMeals[dragIndex];
        
        // Remove the dragged meal from the array
        draggedMeals.splice(dragIndex, 1);
        // Insert it at the new position
        draggedMeals.splice(hoverIndex, 0, draggedMeal);
        
        // Get the IDs in the new order
        const reorderedIds = draggedMeals.map(meal => meal.id);
        
        try {
            // Update the order in the database
            await updateMealsOrder(reorderedIds);
            
            // Refresh nutrition plan data
            await fetchNutritionPlan();
        } catch (err) {
            console.error('Error reordering meals:', err);
            setError('Failed to reorder meals.');
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-10 h-10 border-t-4 border-b-4 border-indigo-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded mb-4">
                <p>{error}</p>
                <button 
                    onClick={() => fetchNutritionPlan()} 
                    className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!nutritionPlan) {
        return (
            <div className="p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded mb-4">
                <p>Nutrition plan not found.</p>
                <button 
                    onClick={onClose} 
                    className="mt-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                    Back to Plans
                </button>
            </div>
        );
    }

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="meal-manager p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                            Meal Planning: {nutritionPlan.name}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            Target: {nutritionPlan.total_calories || '?'} calories, {' '}
                            {nutritionPlan.protein_grams || '?'}g protein, {' '}
                            {nutritionPlan.carbohydrate_grams || '?'}g carbs, {' '}
                            {nutritionPlan.fat_grams || '?'}g fat
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                        Back to Plans
                    </button>
                </div>

                {/* Day Selection Tabs */}
                <div className="mb-6">
                    <div className="flex items-center mb-2">
                        <h3 className="text-lg font-medium text-gray-800 dark:text-white mr-2">Days</h3>
                        <button
                            onClick={handleAddDay}
                            className="ml-auto flex items-center px-3 py-1 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700"
                        >
                            <FiPlus className="mr-1" /> Add Day
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {nutritionPlan.days.length > 0 ? (
                            nutritionPlan.days.map(day => (
                                <button
                                    key={day}
                                    onClick={() => handleDayChange(day)}
                                    className={`px-4 py-2 text-sm rounded-md transition-colors ${
                                        activeDayNumber === day
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    Day {day}
                                </button>
                            ))
                        ) : (
                            <p className="text-gray-600 dark:text-gray-400">No days added yet. Use the "Add Day" button to get started.</p>
                        )}
                    </div>
                </div>

                {/* Day Nutrition Summary */}
                {mealsForActiveDay.length > 0 && (
                    <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">Day {activeDayNumber} Summary</h3>
                        <div className="grid grid-cols-4 gap-4">
                            <div>
                                <p className="text-gray-600 dark:text-gray-300 text-sm">Calories</p>
                                <p className="text-lg font-semibold text-gray-800 dark:text-white">
                                    {Math.round(dayTotals.calories)}{' '}
                                    {nutritionPlan.total_calories && (
                                        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                                            / {nutritionPlan.total_calories} ({Math.round((dayTotals.calories / nutritionPlan.total_calories) * 100)}%)
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-600 dark:text-gray-300 text-sm">Protein</p>
                                <p className="text-lg font-semibold text-gray-800 dark:text-white">
                                    {Math.round(dayTotals.protein)}g{' '}
                                    {nutritionPlan.protein_grams && (
                                        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                                            / {nutritionPlan.protein_grams}g ({Math.round((dayTotals.protein / nutritionPlan.protein_grams) * 100)}%)
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-600 dark:text-gray-300 text-sm">Carbs</p>
                                <p className="text-lg font-semibold text-gray-800 dark:text-white">
                                    {Math.round(dayTotals.carbs)}g{' '}
                                    {nutritionPlan.carbohydrate_grams && (
                                        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                                            / {nutritionPlan.carbohydrate_grams}g ({Math.round((dayTotals.carbs / nutritionPlan.carbohydrate_grams) * 100)}%)
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-600 dark:text-gray-300 text-sm">Fat</p>
                                <p className="text-lg font-semibold text-gray-800 dark:text-white">
                                    {Math.round(dayTotals.fat)}g{' '}
                                    {nutritionPlan.fat_grams && (
                                        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                                            / {nutritionPlan.fat_grams}g ({Math.round((dayTotals.fat / nutritionPlan.fat_grams) * 100)}%)
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add/Edit Meal Form */}
                {showAddMealForm && (
                    <FormProvider {...mealFormMethods}>
                        <form onSubmit={handleMealSubmit(handleMealFormSubmit)} className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
                                {editingMeal ? 'Edit Meal' : 'Add New Meal'}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <FormInput<MealFormData> name="name" label="Meal Name" required />
                                <FormInput<MealFormData> name="time_suggestion" label="Time Suggestion (optional)" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <FormInput<MealFormData> name="day_number" label="Day Number" type="number" required />
                                <FormInput<MealFormData> name="day_type" label="Day Type (e.g., training, rest)" />
                            </div>
                            <FormInput<MealFormData> name="notes" label="Notes (optional)" type="textarea" rows={3} />
                            <div className="flex justify-end mt-4 space-x-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddMealForm(false);
                                        setEditingMeal(null);
                                        resetMealForm();
                                    }}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                >
                                    {editingMeal ? 'Update Meal' : 'Add Meal'}
                                </button>
                            </div>
                        </form>
                    </FormProvider>
                )}

                {/* Meals List (Updated to use draggable meals) */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                            Meals for Day {activeDayNumber}
                        </h3>
                        <button
                            onClick={handleAddMeal}
                            className="flex items-center px-3 py-1 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700"
                        >
                            <FiPlus className="mr-1" /> Add Meal
                        </button>
                    </div>

                    {mealsForActiveDay.length === 0 ? (
                        <div className="p-8 text-center border border-gray-300 border-dashed rounded-md dark:border-gray-700">
                            <p className="text-gray-500 dark:text-gray-400 mb-4">No meals added for Day {activeDayNumber} yet.</p>
                            <button
                                onClick={handleAddMeal}
                                className="flex items-center px-4 py-2 mx-auto text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                            >
                                <FiPlus className="mr-2" /> Add Your First Meal
                            </button>
                        </div>
                    ) : (
                        <div className="meals-container">
                            {mealsForActiveDay.map((meal: MealWithFoodItems, index: number) => (
                                <DraggableMeal
                                    key={meal.id}
                                    meal={meal}
                                    index={index}
                                    expandedMealId={expandedMealId}
                                    toggleMealExpansion={toggleMealExpansion}
                                    handleEditMeal={handleEditMeal}
                                    handleDeleteMeal={handleDeleteMeal}
                                    handleDuplicateMeal={handleDuplicateMeal}
                                    handleAddFoodToMeal={handleAddFoodToMeal}
                                    moveMeal={moveMeal}
                                    fetchNutritionPlan={fetchNutritionPlan}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Food Selector Dialog */}
                {showFoodSelector && selectedMealId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                        <div className="max-w-5xl w-full mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
                            <FoodSelector 
                                mealId={selectedMealId} 
                                onClose={handleFoodSelectionComplete} 
                            />
                        </div>
                    </div>
                )}

                {/* Delete Meal Confirmation Modal */}
                {mealToDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="max-w-md p-6 mx-auto bg-white rounded-lg dark:bg-gray-800">
                            <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">Confirm Deletion</h3>
                            <p className="mb-6 text-gray-600 dark:text-gray-400">
                                Are you sure you want to delete this meal? This action cannot be undone and all food items in this meal will also be deleted.
                            </p>
                            <div className="flex justify-end space-x-3">
                                <button 
                                    onClick={cancelDeleteMeal}
                                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md dark:border-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={confirmDeleteMeal}
                                    className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DndProvider>
    );
};

export default MealManager; 