import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { FiCheck, FiX, FiPlus, FiClock } from 'react-icons/fi';
import { 
    DailyNutritionLog, 
    MealWithFoodItems,
    NutritionPlanWithMeals
} from '../../types/mealPlanning';
import { getNutritionPlanById } from '../../services/mealPlanningService';
import { 
    logPlannedMeal, 
    deleteLoggedMeal, 
    getLoggedMealsForDate
} from '../../services/mealLoggingService';
import { formatDate } from '../../utils/dateUtils';
import AddExtraMealModal from './AddExtraMealModal';

interface MealLoggingWidgetProps {
    nutritionPlanId: string;
}

// Define an interface for day-specific nutrition
interface DayTypeNutrition {
    total_calories: number;
    total_protein: number;
    total_carbs: number;
    total_fat: number;
    planned_calories: number;
    planned_protein: number;
    planned_carbs: number;
    planned_fat: number;
}

const MealLoggingWidget: React.FC<MealLoggingWidgetProps> = ({ nutritionPlanId }) => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [nutritionPlan, setNutritionPlan] = useState<NutritionPlanWithMeals | null>(null);
    // Always use today's date
    const todayDate = formatDate(new Date());
    const [selectedDayType, setSelectedDayType] = useState<string | null>(null);
    const [dailyLog, setDailyLog] = useState<DailyNutritionLog | null>(null);
    const [showAddExtraMeal, setShowAddExtraMeal] = useState<boolean>(false);
    const [loadingMeals, setLoadingMeals] = useState<Record<string, boolean>>({});

    // Fetch nutrition plan data
    useEffect(() => {
        const fetchNutritionPlan = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const plan = await getNutritionPlanById(nutritionPlanId);
                setNutritionPlan(plan);
                
                // Set the default day type
                if (plan?.dayTypes && plan.dayTypes.length > 0) {
                    setSelectedDayType(plan.dayTypes[0]);
                }
            } catch (err) {
                console.error('Error fetching nutrition plan:', err);
                setError('Failed to load nutrition plan');
            } finally {
                setIsLoading(false);
            }
        };

        fetchNutritionPlan();
    }, [nutritionPlanId]);

    // Fetch logged meals for today
    useEffect(() => {
        const fetchLoggedMeals = async () => {
            if (!user?.id) return;
            
            setIsLoading(true);
            setError(null);
            try {
                const log = await getLoggedMealsForDate(user.id, todayDate);
                setDailyLog(log);
                
                // If a day type is found in the log, select it
                if (log.day_type && nutritionPlan?.dayTypes?.includes(log.day_type)) {
                    setSelectedDayType(log.day_type);
                }
            } catch (err) {
                console.error('Error fetching logged meals:', err);
                setError('Failed to load meal log');
            } finally {
                setIsLoading(false);
            }
        };

        fetchLoggedMeals();
    }, [user?.id, nutritionPlan]);

    // Get planned meals for the selected day type
    const getPlannedMeals = (): MealWithFoodItems[] => {
        if (!nutritionPlan || !selectedDayType) return [];
        
        return nutritionPlan.meals.filter(
            (meal: MealWithFoodItems) => meal.day_type === selectedDayType
        ).sort(
            (a: MealWithFoodItems, b: MealWithFoodItems) => a.order_in_plan - b.order_in_plan
        );
    };

    // Calculate planned nutrition for the selected day type
    const calculatePlannedNutrition = (): { 
        calories: number; 
        protein: number; 
        carbs: number; 
        fat: number; 
    } => {
        const meals = getPlannedMeals();
        
        return meals.reduce(
            (totals, meal) => ({
                calories: totals.calories + (meal.total_calories || 0),
                protein: totals.protein + (meal.total_protein || 0),
                carbs: totals.carbs + (meal.total_carbs || 0),
                fat: totals.fat + (meal.total_fat || 0)
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
    };

    // Get day-specific nutrition data
    const dayTypeNutrition = useMemo((): DayTypeNutrition => {
        // Calculate planned nutrition for current day type
        const plannedNutrition = calculatePlannedNutrition();
        
        // Filter logged meals by the selected day type
        const loggedMealsForDayType = dailyLog?.logged_meals.filter(
            meal => meal.day_type === selectedDayType
        ) || [];
        
        // Calculate consumed nutrition from logged meals
        const consumed = loggedMealsForDayType.reduce(
            (acc, meal) => ({
                calories: acc.calories + (meal.total_calories || 0),
                protein: acc.protein + (meal.total_protein || 0),
                carbs: acc.carbs + (meal.total_carbs || 0),
                fat: acc.fat + (meal.total_fat || 0)
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
        
        return {
            // Consumed totals
            total_calories: consumed.calories,
            total_protein: consumed.protein,
            total_carbs: consumed.carbs,
            total_fat: consumed.fat,
            // Planned totals for targets
            planned_calories: plannedNutrition.calories,
            planned_protein: plannedNutrition.protein,
            planned_carbs: plannedNutrition.carbs,
            planned_fat: plannedNutrition.fat
        };
    }, [selectedDayType, dailyLog, nutritionPlan]);

    // Check if a meal is logged
    const isMealLogged = (mealId: string): boolean => {
        if (!dailyLog) return false;
        
        return dailyLog.logged_meals.some(
            meal => meal.meal_id === mealId && !meal.is_extra_meal
        );
    };

    // Handle log meal action
    const handleLogMeal = async (meal: MealWithFoodItems) => {
        if (!user?.id) return;
        
        setLoadingMeals(prev => ({ ...prev, [meal.id]: true }));
        try {
            // Check if the meal is already logged
            if (isMealLogged(meal.id)) {
                // Find the log entry and delete it
                const logEntry = dailyLog?.logged_meals.find(
                    log => log.meal_id === meal.id && !log.is_extra_meal
                );
                
                if (logEntry) {
                    await deleteLoggedMeal(logEntry.id);
                }
            } else {
                // Log the meal
                await logPlannedMeal(user.id, meal.id, todayDate);
            }
            
            // Refresh the daily log
            const updatedLog = await getLoggedMealsForDate(user.id, todayDate);
            setDailyLog(updatedLog);
        } catch (err) {
            console.error('Error logging meal:', err);
            setError('Failed to log meal');
        } finally {
            setLoadingMeals(prev => ({ ...prev, [meal.id]: false }));
        }
    };

    // Handle deleting a logged meal
    const handleDeleteLoggedMeal = async (mealLogId: string) => {
        if (!user?.id) return;
        
        try {
            await deleteLoggedMeal(mealLogId);
            
            // Refresh the daily log
            const updatedLog = await getLoggedMealsForDate(user.id, todayDate);
            setDailyLog(updatedLog);
        } catch (err) {
            console.error('Error deleting logged meal:', err);
            setError('Failed to delete logged meal');
        }
    };

    // Handle day type selection
    const handleDayTypeSelect = (dayType: string) => {
        setSelectedDayType(dayType);
    };

    // Handle extra meal added
    const handleExtraMealAdded = async () => {
        setShowAddExtraMeal(false);
        
        // Refresh the daily log
        if (user?.id) {
            const updatedLog = await getLoggedMealsForDate(user.id, todayDate);
            setDailyLog(updatedLog);
        }
    };

    // Calculate remaining macros
    const calculateRemaining = (consumed: number, target: number): number => {
        if (!target) return 0;
        const remaining = target - consumed;
        return remaining > 0 ? Math.round(remaining) : 0;
    };

    // Render loading state
    if (isLoading && !nutritionPlan) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full mb-4"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full mb-4"></div>
            </div>
        );
    }

    // Render error state
    if (error) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                <div className="text-red-500 dark:text-red-400 mb-4">{error}</div>
                <button 
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    // Get the planned meals and logged meals
    const plannedMeals = getPlannedMeals();
    const extraMeals = dailyLog?.logged_meals.filter(
      meal => meal.is_extra_meal && meal.day_type === selectedDayType
    ) || [];

    // Calculate progress
    const totalPlannedMeals = plannedMeals.length;
    const completedPlannedMeals = plannedMeals.filter(meal => isMealLogged(meal.id)).length;
    const completionPercentage = totalPlannedMeals > 0
        ? Math.round((completedPlannedMeals / totalPlannedMeals) * 100)
        : 0;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                Today's Meals
            </h2>

            {/* Day Type Tabs */}
            {nutritionPlan?.dayTypes && nutritionPlan.dayTypes.length > 0 && (
                <div className="mb-6">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                        <nav className="-mb-px flex space-x-6 overflow-x-auto">
                            {nutritionPlan.dayTypes.map((type: string) => (
                                <button
                                    key={type}
                                    onClick={() => handleDayTypeSelect(type)}
                                    className={`
                                        whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm
                                        ${selectedDayType === type
                                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                        }
                                    `}
                                >
                                    {type}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>
            )}

            {/* Progress Bar */}
            <div className="mb-6">
                <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                        Meals Completed
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                        {completedPlannedMeals} / {totalPlannedMeals}
                    </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div 
                        className="bg-green-600 h-2.5 rounded-full" 
                        style={{ width: `${completionPercentage}%` }}
                    ></div>
                </div>
            </div>

            {/* Nutrition Summary */}
            <div className="mb-6 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">
                    Daily Nutrition {selectedDayType && `(${selectedDayType})`}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Calories</p>
                        <div className="flex flex-col">
                            <p className="text-lg font-semibold text-gray-800 dark:text-white">
                                {Math.round(dayTypeNutrition.total_calories || 0)}
                                <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">
                                    / {Math.round(dayTypeNutrition.planned_calories || 0)}
                                </span>
                            </p>
                            {dayTypeNutrition.planned_calories > 0 && (
                                <p className="text-xs text-green-600 dark:text-green-400">
                                    {calculateRemaining(dayTypeNutrition.total_calories, dayTypeNutrition.planned_calories)} remaining
                                </p>
                            )}
                        </div>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Protein</p>
                        <div className="flex flex-col">
                            <p className="text-lg font-semibold text-gray-800 dark:text-white">
                                {Math.round(dayTypeNutrition.total_protein || 0)}g
                                <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">
                                    / {Math.round(dayTypeNutrition.planned_protein || 0)}g
                                </span>
                            </p>
                            {dayTypeNutrition.planned_protein > 0 && (
                                <p className="text-xs text-green-600 dark:text-green-400">
                                    {calculateRemaining(dayTypeNutrition.total_protein, dayTypeNutrition.planned_protein)}g remaining
                                </p>
                            )}
                        </div>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Carbs</p>
                        <div className="flex flex-col">
                            <p className="text-lg font-semibold text-gray-800 dark:text-white">
                                {Math.round(dayTypeNutrition.total_carbs || 0)}g
                                <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">
                                    / {Math.round(dayTypeNutrition.planned_carbs || 0)}g
                                </span>
                            </p>
                            {dayTypeNutrition.planned_carbs > 0 && (
                                <p className="text-xs text-green-600 dark:text-green-400">
                                    {calculateRemaining(dayTypeNutrition.total_carbs, dayTypeNutrition.planned_carbs)}g remaining
                                </p>
                            )}
                        </div>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Fat</p>
                        <div className="flex flex-col">
                            <p className="text-lg font-semibold text-gray-800 dark:text-white">
                                {Math.round(dayTypeNutrition.total_fat || 0)}g
                                <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">
                                    / {Math.round(dayTypeNutrition.planned_fat || 0)}g
                                </span>
                            </p>
                            {dayTypeNutrition.planned_fat > 0 && (
                                <p className="text-xs text-green-600 dark:text-green-400">
                                    {calculateRemaining(dayTypeNutrition.total_fat, dayTypeNutrition.planned_fat)}g remaining
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Planned Meals */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                        Planned Meals
                    </h3>
                </div>
                
                {plannedMeals.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-gray-500 dark:text-gray-400">
                            No planned meals for this day type.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {plannedMeals.map((meal) => {
                            const isLogged = isMealLogged(meal.id);
                            const isLoggingInProgress = loadingMeals[meal.id];
                            
                            return (
                                <div 
                                    key={meal.id}
                                    className={`
                                        p-4 rounded-lg border 
                                        ${isLogged 
                                            ? 'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20' 
                                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                                        }
                                    `}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-medium text-gray-800 dark:text-white">
                                                {meal.name}
                                            </h4>
                                            {meal.time_suggestion && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                                                    <FiClock className="mr-1" /> {meal.time_suggestion}
                                                </p>
                                            )}
                                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                {Math.round(meal.total_calories)} cal • {Math.round(meal.total_protein)}g protein
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleLogMeal(meal)}
                                            disabled={isLoggingInProgress}
                                            className={`
                                                p-2 rounded-full 
                                                ${isLogged 
                                                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
                                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                                }
                                                hover:bg-opacity-80 transition-colors
                                            `}
                                        >
                                            {isLoggingInProgress ? (
                                                <div className="w-5 h-5 border-t-2 border-b-2 border-current rounded-full animate-spin"></div>
                                            ) : isLogged ? (
                                                <FiCheck className="w-5 h-5" />
                                            ) : (
                                                <FiPlus className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Extra Meals */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                        Extra Meals
                    </h3>
                    <button
                        onClick={() => setShowAddExtraMeal(true)}
                        className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
                    >
                        <FiPlus className="mr-1" /> Add Extra Meal
                    </button>
                </div>
                
                {extraMeals.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-gray-500 dark:text-gray-400">
                            No extra meals logged for today.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {extraMeals.map((meal) => (
                            <div 
                                key={meal.id}
                                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-medium text-gray-800 dark:text-white">
                                            {meal.name} <span className="text-xs text-gray-500 dark:text-gray-400">(Extra)</span>
                                        </h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                                            <FiClock className="mr-1" /> {meal.time}
                                        </p>
                                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            {Math.round(meal.total_calories)} cal • {Math.round(meal.total_protein)}g protein • {Math.round(meal.total_carbs)}g carbs • {Math.round(meal.total_fat)}g fat
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteLoggedMeal(meal.id)}
                                        className="p-2 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 hover:bg-opacity-80 transition-colors"
                                    >
                                        <FiX className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Extra Meal Modal */}
            {showAddExtraMeal && (
                <AddExtraMealModal
                    isOpen={showAddExtraMeal}
                    onClose={() => setShowAddExtraMeal(false)}
                    onMealAdded={handleExtraMealAdded}
                    nutritionPlanId={nutritionPlanId}
                    date={todayDate}
                    dayType={selectedDayType || undefined}
                />
            )}
        </div>
    );
};

export default MealLoggingWidget; 