import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { FiCheck, FiX, FiPlus, FiClock, FiExternalLink, FiChevronDown, FiChevronUp, FiAlertCircle, FiInfo } from 'react-icons/fi';
import { Link } from 'react-router-dom';
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
import Card from '../ui/Card';
import { supabase } from '../../services/supabaseClient';

interface MealLoggingWidgetProps {
    nutritionPlanId: string;
    hideHeader?: boolean;
    onDayTypeChange?: (dayType: string | null) => void;
    user_id: string;
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

const MealLoggingWidget: React.FC<MealLoggingWidgetProps> = ({ 
    nutritionPlanId,
    hideHeader = false,
    onDayTypeChange,
    user_id
}) => {
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
    // Add state to track expanded meals
    const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({});
    // Add state to track missed meals with timestamps
    const [missedMeals, setMissedMeals] = useState<{id: string, name: string, time: string}[]>([]);
    // Add state to track if there's a workout today
    const [hasWorkoutToday, setHasWorkoutToday] = useState<boolean>(false);

    // Function to check if there's a workout scheduled for today
    const checkForWorkoutToday = async () => {
        if (!user_id) return;
        
        try {
            // Get today's date in ISO format (YYYY-MM-DD)
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            
            // Get the current day of the week (1-7, Monday-Sunday)
            const currentDayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
            
            // First, check for assigned programs
            const { data: assignedPlans, error: assignedError } = await supabase
                .from('assigned_plans')
                .select('program_template_id')
                .eq('athlete_id', user_id)
                .not('program_template_id', 'is', null);
            
            if (assignedError) throw assignedError;
            
            if (assignedPlans && assignedPlans.length > 0) {
                // For each assigned program, check if there's a workout for today
                for (const plan of assignedPlans) {
                    const { data: programData, error: programError } = await supabase
                        .from('program_templates')
                        .select(`
                            workouts (
                                day_of_week
                            )
                        `)
                        .eq('id', plan.program_template_id)
                        .single();
                    
                    if (programError) continue; // Skip to next program if there's an error
                    
                    if (programData?.workouts) {
                        const workouts = programData.workouts as { day_of_week: number | null }[];
                        // Check if any workout matches today's day of week
                        if (workouts.some(workout => workout.day_of_week === currentDayOfWeek)) {
                            setHasWorkoutToday(true);
                            return; // Found a workout for today
                        }
                    }
                }
            }
            
            // If we got here, check for any completed workouts today as a fallback
            const { data: completedWorkouts, error: completedError } = await supabase
                .from('workout_sessions')
                .select('id')
                .eq('user_id', user.id)
                .gte('start_time', `${todayStr}T00:00:00`)
                .lte('start_time', `${todayStr}T23:59:59`)
                .limit(1);
            
            if (completedError) throw completedError;
            
            // If we found completed workouts today, set hasWorkoutToday to true
            setHasWorkoutToday(completedWorkouts && completedWorkouts.length > 0);
            
        } catch (err) {
            console.error('Error checking for workouts:', err);
            // Default to false if there's an error
            setHasWorkoutToday(false);
        }
    };

    // Fetch nutrition plan data
    useEffect(() => {
        const fetchNutritionPlan = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const plan = await getNutritionPlanById(nutritionPlanId);
                setNutritionPlan(plan);
                
                // We'll set the default day type after checking for workouts
            } catch (err) {
                console.error('Error fetching nutrition plan:', err);
                setError('Failed to load nutrition plan');
            } finally {
                setIsLoading(false);
            }
        };

        fetchNutritionPlan();
    }, [nutritionPlanId]);

    // Check for workouts when the component mounts
    useEffect(() => {
        if (user?.id) {
            checkForWorkoutToday();
        }
    }, [user?.id]);

    // Set the appropriate day type after checking for workouts and fetching the plan
    useEffect(() => {
        if (!isLoading && nutritionPlan?.dayTypes && nutritionPlan.dayTypes.length > 0) {
            // Only set the day type if it hasn't been set yet or from the log
            if (!selectedDayType || (dailyLog && !dailyLog.day_type)) {
                let dayType = null;
                
                // If there's a workout today, select the "Training" day type if it exists
                if (hasWorkoutToday && nutritionPlan.dayTypes.includes('training')) {
                    dayType = 'training';
                } 
                // If there's no workout today, select the "Rest" day type if it exists
                else if (!hasWorkoutToday && nutritionPlan.dayTypes.includes('rest')) {
                    dayType = 'rest';
                }
                // Otherwise, fall back to the first day type
                else {
                    dayType = nutritionPlan.dayTypes[0];
                }
                
                setSelectedDayType(dayType);
                
                // Call the callback if it exists
                if (onDayTypeChange) {
                    onDayTypeChange(dayType);
                }
            }
        }
    }, [isLoading, nutritionPlan, dailyLog, hasWorkoutToday, selectedDayType, onDayTypeChange]);

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
        // Call the callback if it exists
        if (onDayTypeChange) {
            onDayTypeChange(dayType);
        }
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

    // Toggle meal expansion
    const toggleMealExpansion = (mealId: string) => {
        setExpandedMeals(prev => ({
            ...prev,
            [mealId]: !prev[mealId]
        }));
    };

    // Effect to call onDayTypeChange when selectedDayType changes due to fetch operations
    useEffect(() => {
        if (onDayTypeChange && selectedDayType) {
            onDayTypeChange(selectedDayType);
        }
    }, [selectedDayType, onDayTypeChange]);

    // Check for missed meals based on time suggestions
    const checkForMissedMeals = () => {
        if (!nutritionPlan || !selectedDayType || !dailyLog) return;
        
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
        
        const meals = getPlannedMeals();
        const newMissedMeals = meals.filter(meal => {
            // Only check meals that have a time suggestion and are not logged
            if (!meal.time_suggestion || isMealLogged(meal.id)) return false;
            
            // Compare current time with meal's suggested time
            return meal.time_suggestion < currentTime;
        }).map(meal => ({
            id: meal.id,
            name: meal.name,
            time: meal.time_suggestion as string
        }));
        
        setMissedMeals(newMissedMeals);
    };
    
    // Check for missed meals periodically
    useEffect(() => {
        // Initial check
        checkForMissedMeals();
        
        // Set up interval to check every 5 minutes
        const intervalId = setInterval(checkForMissedMeals, 5 * 60 * 1000);
        
        return () => clearInterval(intervalId); // Clean up on unmount
    }, [nutritionPlan, selectedDayType, dailyLog]);
    
    // Also check for missed meals when the daily log is updated
    useEffect(() => {
        if (dailyLog) {
            checkForMissedMeals();
        }
    }, [dailyLog]);

    // Auto-expand the first unlogged meal when data changes
    useEffect(() => {
        const meals = getPlannedMeals();
        if (meals.length > 0 && dailyLog) {
            // Find the first unlogged meal
            const firstUnloggedMeal = meals.find(meal => !isMealLogged(meal.id));
            
            if (firstUnloggedMeal) {
                // Expand only the first unlogged meal
                const newExpandedState: Record<string, boolean> = {};
                // First, collapse all meals
                meals.forEach(meal => {
                    newExpandedState[meal.id] = false;
                });
                // Then expand only the first unlogged meal
                newExpandedState[firstUnloggedMeal.id] = true;
                setExpandedMeals(newExpandedState);
            }
        }
    }, [dailyLog, selectedDayType, nutritionPlan]);

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

    // Define the header for the Card component
    const header = !hideHeader ? (
        <div className="flex items-center justify-between">
            <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                    <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                </svg>
                <h2 className="text-lg font-medium">Nutrition</h2>
            </div>
            <Link 
                to={`/meal-plan/${nutritionPlanId}${selectedDayType ? `?dayType=${selectedDayType}` : ''}`} 
                className="flex items-center text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
            >
                <span>View Plan</span>
                <FiExternalLink className="ml-1 w-3.5 h-3.5" />
            </Link>
        </div>
    ) : undefined;

    // Render loading state
    if (isLoading && !nutritionPlan) {
        return (
            <Card header={header} className="h-full flex flex-col" variant="default">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full mb-4"></div>
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full mb-4"></div>
                </div>
            </Card>
        );
    }

    // Render error state
    if (error) {
        return (
            <Card header={header} className="h-full flex flex-col" variant="default">
                <div className="text-red-500 dark:text-red-400 mb-4">{error}</div>
                <button 
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    Retry
                </button>
            </Card>
        );
    }

    return (
        <Card
            header={header}
            className="h-full flex flex-col"
            variant="default"
        >
            <div className="flex-1 overflow-y-auto">
                {/* Today's Meals Title */}
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                    Today's Meals
                </h3>

                {/* Missed Meal Notifications - Moved to top for prominence */}
                {missedMeals.length > 0 && (
                    <div className="p-3 mb-4 text-amber-700 bg-amber-100 rounded dark:bg-amber-900/20 dark:text-amber-300 border-l-4 border-amber-500">
                        <div className="flex items-center mb-2">
                            <FiAlertCircle className="mr-2 w-5 h-5" />
                            <h4 className="font-medium">Missed Meals</h4>
                        </div>
                        <ul className="list-disc list-inside pl-2 space-y-1">
                            {missedMeals.map(meal => (
                                <li key={meal.id} className="text-sm">
                                    {meal.name} - Suggested time: {meal.time} has passed
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

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
                                            capitalize whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm
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
                <div className="mb-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
                        Daily Nutrition {selectedDayType && `(${selectedDayType})`}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-2 gap-6">
                        {/* Calories */}
                        <div className="flex flex-col items-center">
                            <p className="text-sm font-medium text-green-500 dark:text-green-400 mb-2">
                                Calories
                            </p>
                            <div className="relative w-24 h-24">
                                {/* Circular background */}
                                <div className="absolute inset-0 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                                
                                {/* Progress circle - using conic gradient for consistency */}
                                <div 
                                    className="absolute inset-0 rounded-full"
                                    style={{ 
                                        background: `conic-gradient(
                                            #10b981 0% ${dayTypeNutrition.planned_calories > 0 
                                                ? (dayTypeNutrition.total_calories / dayTypeNutrition.planned_calories) * 100 
                                                : 0}%, 
                                            transparent ${dayTypeNutrition.planned_calories > 0 
                                                ? (dayTypeNutrition.total_calories / dayTypeNutrition.planned_calories) * 100 
                                                : 0}% 100%
                                        )`,
                                    }}
                                ></div>
                                
                                {/* Center circle - larger to make the ring thinner */}
                                <div className="absolute inset-[15%] rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                                    <p className="text-base font-bold text-green-500 dark:text-green-400">
                                        {dayTypeNutrition.planned_calories > 0 ? 
                                            calculateRemaining(dayTypeNutrition.total_calories, dayTypeNutrition.planned_calories) : 0}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-2 text-center">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    <span className="font-semibold text-gray-800 dark:text-white">
                                        {Math.round(dayTypeNutrition.total_calories || 0)}
                                    </span>
                                    {" / "}
                                    <span>
                                        {Math.round(dayTypeNutrition.planned_calories || 0)}
                                    </span>
                                </p>
                            </div>
                        </div>
                        
                        {/* Protein */}
                        <div className="flex flex-col items-center">
                            <p className="text-sm font-medium text-blue-500 dark:text-blue-400 mb-2">
                                Protein
                            </p>
                            <div className="relative w-24 h-24">
                                {/* Circular background */}
                                <div className="absolute inset-0 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                                
                                {/* Progress circle */}
                                <div 
                                    className="absolute inset-0 rounded-full"
                                    style={{ 
                                        background: `conic-gradient(
                                            #3b82f6 0% ${dayTypeNutrition.planned_protein > 0 
                                                ? (dayTypeNutrition.total_protein / dayTypeNutrition.planned_protein) * 100 
                                                : 0}%, 
                                            transparent ${dayTypeNutrition.planned_protein > 0 
                                                ? (dayTypeNutrition.total_protein / dayTypeNutrition.planned_protein) * 100 
                                                : 0}% 100%
                                        )`,
                                    }}
                                ></div>
                                
                                {/* Center circle - larger to make the ring thinner */}
                                <div className="absolute inset-[15%] rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                                    <p className="text-base font-bold text-blue-500 dark:text-blue-400">
                                        {dayTypeNutrition.planned_protein > 0 ? 
                                            calculateRemaining(dayTypeNutrition.total_protein, dayTypeNutrition.planned_protein) : 0}g
                                    </p>
                                </div>
                            </div>
                            <div className="mt-2 text-center">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    <span className="font-semibold text-gray-800 dark:text-white">
                                        {Math.round(dayTypeNutrition.total_protein || 0)}g
                                    </span>
                                    {" / "}
                                    <span>
                                        {Math.round(dayTypeNutrition.planned_protein || 0)}g
                                    </span>
                                </p>
                            </div>
                        </div>
                        
                        {/* Carbs */}
                        <div className="flex flex-col items-center">
                            <p className="text-sm font-medium text-amber-500 dark:text-amber-400 mb-2">
                                Carbs
                            </p>
                            <div className="relative w-24 h-24">
                                {/* Circular background */}
                                <div className="absolute inset-0 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                                
                                {/* Progress circle */}
                                <div 
                                    className="absolute inset-0 rounded-full"
                                    style={{ 
                                        background: `conic-gradient(
                                            #f59e0b 0% ${dayTypeNutrition.planned_carbs > 0 
                                                ? (dayTypeNutrition.total_carbs / dayTypeNutrition.planned_carbs) * 100 
                                                : 0}%, 
                                            transparent ${dayTypeNutrition.planned_carbs > 0 
                                                ? (dayTypeNutrition.total_carbs / dayTypeNutrition.planned_carbs) * 100 
                                                : 0}% 100%
                                        )`,
                                    }}
                                ></div>
                                
                                {/* Center circle - larger to make the ring thinner */}
                                <div className="absolute inset-[15%] rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                                    <p className="text-base font-bold text-amber-500 dark:text-amber-400">
                                        {dayTypeNutrition.planned_carbs > 0 ? 
                                            calculateRemaining(dayTypeNutrition.total_carbs, dayTypeNutrition.planned_carbs) : 0}g
                                    </p>
                                </div>
                            </div>
                            <div className="mt-2 text-center">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    <span className="font-semibold text-gray-800 dark:text-white">
                                        {Math.round(dayTypeNutrition.total_carbs || 0)}g
                                    </span>
                                    {" / "}
                                    <span>
                                        {Math.round(dayTypeNutrition.planned_carbs || 0)}g
                                    </span>
                                </p>
                            </div>
                        </div>
                        
                        {/* Fat */}
                        <div className="flex flex-col items-center">
                            <p className="text-sm font-medium text-purple-500 dark:text-purple-400 mb-2">
                                Fat
                            </p>
                            <div className="relative w-24 h-24">
                                {/* Circular background */}
                                <div className="absolute inset-0 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                                
                                {/* Progress circle */}
                                <div 
                                    className="absolute inset-0 rounded-full"
                                    style={{ 
                                        background: `conic-gradient(
                                            #8b5cf6 0% ${dayTypeNutrition.planned_fat > 0 
                                                ? (dayTypeNutrition.total_fat / dayTypeNutrition.planned_fat) * 100 
                                                : 0}%, 
                                            transparent ${dayTypeNutrition.planned_fat > 0 
                                                ? (dayTypeNutrition.total_fat / dayTypeNutrition.planned_fat) * 100 
                                                : 0}% 100%
                                        )`,
                                    }}
                                ></div>
                                
                                {/* Center circle - larger to make the ring thinner */}
                                <div className="absolute inset-[15%] rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                                    <p className="text-base font-bold text-purple-500 dark:text-purple-400">
                                        {dayTypeNutrition.planned_fat > 0 ? 
                                            calculateRemaining(dayTypeNutrition.total_fat, dayTypeNutrition.planned_fat) : 0}g
                                    </p>
                                </div>
                            </div>
                            <div className="mt-2 text-center">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    <span className="font-semibold text-gray-800 dark:text-white">
                                        {Math.round(dayTypeNutrition.total_fat || 0)}g
                                    </span>
                                    {" / "}
                                    <span>
                                        {Math.round(dayTypeNutrition.planned_fat || 0)}g
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Planned Meals */}
                <div className="mb-6" id="todays-meals">
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
                                const isExpanded = expandedMeals[meal.id] || false;
                                
                                return (
                                    <div 
                                        key={meal.id}
                                        className={`
                                            rounded-lg border overflow-hidden
                                            ${isLogged 
                                                ? 'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20' 
                                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                                            }
                                        `}
                                    >
                                        <div className="p-4">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center">
                                                    <button
                                                        onClick={() => toggleMealExpansion(meal.id)}
                                                        className="p-2 mr-2 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-opacity-80 transition-colors flex-shrink-0"
                                                        aria-label={isExpanded ? "Collapse ingredients" : "Expand ingredients"}
                                                    >
                                                        {isExpanded ? (
                                                            <FiChevronUp className="w-4 h-4" />
                                                        ) : (
                                                            <FiChevronDown className="w-4 h-4" />
                                                        )}
                                                    </button>
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
                                                </div>
                                                <button
                                                    onClick={() => handleLogMeal(meal)}
                                                    disabled={isLoggingInProgress}
                                                    className={`
                                                        p-2 rounded-full flex-shrink-0
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
                                        
                                        {/* Expanded ingredients section */}
                                        {isExpanded && (
                                            <div className="px-4 pb-4 pt-0">
                                                {/* Notes section - added to show meal notes when expanded */}
                                                {meal.notes && (
                                                    <div className="mt-2 border-t border-gray-200 dark:border-gray-700 pt-3 mb-2">
                                                        <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-md flex items-start">
                                                            <FiInfo className="text-indigo-600 dark:text-indigo-400 mt-0.5 mr-2 flex-shrink-0" />
                                                            <p className="text-sm text-gray-700 dark:text-indigo-200 whitespace-pre-line">
                                                                {meal.notes}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {meal.food_items.length > 0 && (
                                                    <div className="mt-2 border-t border-gray-200 dark:border-gray-700 pt-3">
                                                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                            Ingredients
                                                        </h5>
                                                        <ul className="space-y-2">
                                                            {meal.food_items.map((item) => (
                                                                <li key={item.id} className="text-sm">
                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-800 dark:text-gray-200">
                                                                            {item.food_item?.food_name || 'Unknown Food'}
                                                                        </span>
                                                                        <span className="text-gray-600 dark:text-gray-400">
                                                                            {item.quantity} {item.unit}
                                                                        </span>
                                                                    </div>
                                                                    {item.food_item && (
                                                                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                                                                            {Math.round(item.calculated_calories || 0)} cal • 
                                                                            P: {Math.round(item.calculated_protein || 0)}g • 
                                                                            C: {Math.round(item.calculated_carbs || 0)}g • 
                                                                            F: {Math.round(item.calculated_fat || 0)}g
                                                                        </div>
                                                                    )}
                                                                    {item.notes && (
                                                                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 pl-2 border-l-2 border-gray-200 dark:border-gray-600 italic">
                                                                            {item.notes}
                                                                        </div>
                                                                    )}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        
                                        {/* Empty state for no ingredients */}
                                        {isExpanded && meal.food_items.length === 0 && (
                                            <div className="px-4 pb-4 pt-0">
                                                <div className="mt-2 border-t border-gray-200 dark:border-gray-700 pt-3">
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                                                        No ingredients information available
                                                    </p>
                                                </div>
                                            </div>
                                        )}
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
        </Card>
    );
};

export default MealLoggingWidget; 