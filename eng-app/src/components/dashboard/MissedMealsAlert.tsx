import React, { useState, useEffect, memo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';
import { FiAlertCircle } from 'react-icons/fi';
import { 
    MealWithFoodItems
} from '../../types/mealPlanning';
import { getNutritionPlanById } from '../../services/mealPlanningService';
import { getLoggedMealsForDate } from '../../services/mealLoggingService';
import { formatDate } from '../../utils/dateUtils';

interface MissedMealsAlertProps {
    nutritionPlanId: string | null;
    testMode?: boolean; // Add test mode flag for debugging
}

// Use memo to prevent unnecessary rerenders
const MissedMealsAlert: React.FC<MissedMealsAlertProps> = memo(({ 
    nutritionPlanId,
    testMode = false // Default to false
}) => {
    const { user } = useAuth();
    const [missedMeals, setMissedMeals] = useState<{id: string, name: string, time: string}[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const todayDate = formatDate(new Date());
    
    // Generate a unique component ID for debugging
    const componentId = React.useId();
    
    useEffect(() => {
        console.log(`MissedMealsAlert [${componentId}] - Component mounted with nutritionPlanId:`, nutritionPlanId);
        
        return () => {
            console.log(`MissedMealsAlert [${componentId}] - Component unmounted`);
        };
    }, [componentId, nutritionPlanId]);

    // For test mode - create test data
    useEffect(() => {
        if (testMode) {
            console.log(`MissedMealsAlert [${componentId}] - TEST MODE ENABLED - Always showing alert`);
            setMissedMeals([
                {id: 'test1', name: 'Breakfast', time: '09:00'},
                {id: 'test2', name: 'Lunch', time: '12:00'}
            ]);
            setIsLoading(false);
        }
    }, [testMode, componentId]);

    useEffect(() => {
        // Skip normal fetch if in test mode
        if (testMode) return;

        console.log(`MissedMealsAlert [${componentId}] - Starting to check for missed meals`, { nutritionPlanId });
        
        const fetchMissedMeals = async () => {
            if (!nutritionPlanId || !user?.id) {
                console.log(`MissedMealsAlert [${componentId}] - Missing nutritionPlanId or user`, { nutritionPlanId, userId: user?.id });
                setIsLoading(false);
                return;
            }

            try {
                console.log(`MissedMealsAlert [${componentId}] - Fetching nutrition plan`, nutritionPlanId);
                
                // Get the nutrition plan with meals
                const nutritionPlan = await getNutritionPlanById(nutritionPlanId);
                console.log(`MissedMealsAlert [${componentId}] - Nutrition plan data:`, nutritionPlan);
                
                if (!nutritionPlan || !nutritionPlan.meals || nutritionPlan.meals.length === 0) {
                    console.log(`MissedMealsAlert [${componentId}] - No meals in nutrition plan`);
                    setIsLoading(false);
                    return;
                }

                // Get logged meals for today
                console.log(`MissedMealsAlert [${componentId}] - Fetching logged meals for today`);
                const dailyLog = await getLoggedMealsForDate(user.id, todayDate);
                console.log(`MissedMealsAlert [${componentId}] - Daily log data:`, dailyLog);
                
                // Check for missed meals
                const now = new Date();
                const currentHour = now.getHours();
                const currentMinute = now.getMinutes();
                const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
                console.log(`MissedMealsAlert [${componentId}] - Current time:`, currentTime);
                
                // Get the day type from the log
                const dayType = dailyLog.day_type || nutritionPlan.dayTypes?.[0];
                console.log(`MissedMealsAlert [${componentId}] - Using day type:`, dayType);
                
                if (!dayType) {
                    console.log(`MissedMealsAlert [${componentId}] - No day type found`);
                    setIsLoading(false);
                    return;
                }
                
                // Get meals for the current day type
                let mealsForDayType = nutritionPlan.meals.filter(
                    (meal: MealWithFoodItems) => meal.day_type === dayType
                );
                
                // Log all meals for this day type with their IDs to help diagnose duplication issues
                console.log(`MissedMealsAlert [${componentId}] - All meals for day type with IDs:`, 
                    mealsForDayType.map(m => ({ id: m.id, name: m.name, time: m.time_suggestion }))
                );
                
                // If no meals found for this day type, use all meals as fallback
                if (mealsForDayType.length === 0) {
                    console.log(`MissedMealsAlert [${componentId}] - No meals found for day type, using all meals`);
                    mealsForDayType = nutritionPlan.meals;
                }
                
                console.log(`MissedMealsAlert [${componentId}] - Meals for day type:`, mealsForDayType);
                
                // Find missed meals (meals with time_suggestion in the past that aren't logged)
                const newMissedMeals = mealsForDayType.filter(meal => {
                    // Only check meals that have a time suggestion
                    if (!meal.time_suggestion) {
                        console.log(`MissedMealsAlert [${componentId}] - Meal ${meal.name} has no time suggestion`);
                        return false;
                    }
                    
                    // Check if meal is logged
                    const isLogged = dailyLog.logged_meals.some(
                        loggedMeal => loggedMeal.meal_id === meal.id && !loggedMeal.is_extra_meal
                    );
                    
                    // If meal is not logged and the suggested time has passed, it's missed
                    const isMissed = !isLogged && meal.time_suggestion < currentTime;
                    console.log(`MissedMealsAlert [${componentId}] - Meal ${meal.name} - Time: ${meal.time_suggestion} - Logged: ${isLogged} - Missed: ${isMissed}`);
                    
                    return isMissed;
                }).map(meal => ({
                    id: meal.id,
                    name: meal.name,
                    time: meal.time_suggestion as string
                }));
                
                console.log(`MissedMealsAlert [${componentId}] - Raw missed meals before deduplication:`, newMissedMeals);
                
                // Create a map to identify duplicate meals
                const mealNameMap = new Map();
                newMissedMeals.forEach(meal => {
                    if (mealNameMap.has(meal.name)) {
                        console.log(`MissedMealsAlert [${componentId}] - Duplicate meal detected:`, {
                            name: meal.name,
                            existingId: mealNameMap.get(meal.name).id,
                            newId: meal.id
                        });
                    } else {
                        mealNameMap.set(meal.name, meal);
                    }
                });
                
                // Group duplicate meals by name to avoid showing the same meal name multiple times
                // This is more robust than just using ID as sometimes the same meal might have different IDs
                const uniqueMissedMeals = Array.from(
                    new Map(newMissedMeals.map(meal => [meal.name, meal])).values()
                );
                
                console.log(`MissedMealsAlert [${componentId}] - Final missed meals after deduplication:`, uniqueMissedMeals);
                console.log(`MissedMealsAlert [${componentId}] - Removed ${newMissedMeals.length - uniqueMissedMeals.length} duplicate meal(s)`);
                setMissedMeals(uniqueMissedMeals);
            } catch (error) {
                console.error(`MissedMealsAlert [${componentId}] - Error checking for missed meals:`, error);
                setError("Error fetching meal data");
            } finally {
                setIsLoading(false);
            }
        };

        fetchMissedMeals();
        
        // Set up interval to check every 5 minutes
        const intervalId = setInterval(fetchMissedMeals, 5 * 60 * 1000);
        
        return () => clearInterval(intervalId); // Clean up on unmount
    }, [nutritionPlanId, user?.id, todayDate, testMode, componentId]);

    // For debugging purposes - always show component when there's an error
    if (error) {
        return (
            <div className="mb-4 p-3 text-red-700 bg-red-100 rounded-lg dark:bg-red-900/20 dark:text-red-300 border-l-4 border-red-500 flex items-start">
                <FiAlertCircle className="mt-0.5 mr-3 flex-shrink-0 w-5 h-5" />
                <div>
                    <h4 className="font-medium">Could not check for missed meals</h4>
                    <p className="text-sm mt-1">{error}</p>
                </div>
            </div>
        );
    }
    
    // Don't render anything while loading or if there are no missed meals
    if (isLoading) {
        console.log(`MissedMealsAlert [${componentId}] - Still loading, not rendering`);
        return null;
    }
    
    if (missedMeals.length === 0) {
        console.log(`MissedMealsAlert [${componentId}] - No missed meals, not rendering`);
        return null;
    }
    
    console.log(`MissedMealsAlert [${componentId}] - Rendering alert with missed meals:`, missedMeals);

    // Create a dummy missed meal for testing - REMOVE THIS IN PRODUCTION
    // This is just for demonstration/debugging - it will always show the component
    /*
    const testMissedMeals = [
        {id: 'test', name: 'Breakfast', time: '09:00'},
        {id: 'test2', name: 'Lunch', time: '12:00'}
    ];
    */

    return (
        <div className="mb-4 p-3 text-amber-700 bg-amber-100 rounded-lg dark:bg-amber-900/20 dark:text-amber-300 border-l-4 border-amber-500 flex items-start">
            <FiAlertCircle className="mt-0.5 mr-3 flex-shrink-0 w-5 h-5" />
            <div>
                <h4 className="font-medium">You've missed {missedMeals.length} meal{missedMeals.length > 1 ? 's' : ''} today</h4>
                <p className="text-sm mt-1">
                    {missedMeals.map(meal => meal.name).join(', ')}
                </p>
                <p>
                    <button className="inline-block mt-2 text-sm text-amber-800 dark:text-amber-200 font-medium hover:underline" 
                            onClick={() => {
                        const todaysMealsElement = document.getElementById('todays-meals');
                        if (todaysMealsElement) {
                            todaysMealsElement.scrollIntoView({ behavior: 'smooth' });
                        }
                    }}>
                        Click here to log these meals!
                    </button>
                </p>
            </div>
        </div>
    );
});

export default MissedMealsAlert; 