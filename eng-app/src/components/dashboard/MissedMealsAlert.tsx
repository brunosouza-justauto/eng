import React, { useState, useEffect, memo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { FiAlertCircle } from 'react-icons/fi';
import { 
    MealWithFoodItems
} from '../../types/mealPlanning';
import { getNutritionPlanById } from '../../services/mealPlanningService';
import { getLoggedMealsForDate } from '../../services/mealLoggingService';
import { formatDate } from '../../utils/dateUtils';
import { useNavigate } from 'react-router-dom';

interface MissedMealsAlertProps {
    nutritionPlanId: string | null;
    testMode?: boolean; // Add test mode flag for debugging
    onMealsStatusChange?: (hasMissedMeals: boolean) => void; // Callback to notify parent about missed meals
}

// Use memo to prevent unnecessary rerenders
const MissedMealsAlert: React.FC<MissedMealsAlertProps> = memo(({ 
    nutritionPlanId,
    testMode = false, // Default to false
    onMealsStatusChange
}) => {
    const { user } = useAuth();
    const [missedMeals, setMissedMeals] = useState<{id: string, name: string, time: string}[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const todayDate = formatDate(new Date());
    const navigate = useNavigate();
    
    // Generate a unique component ID for debugging
    const componentId = React.useId();

    // For test mode - create test data
    useEffect(() => {
        if (testMode) {
            setMissedMeals([
                {id: 'test1', name: 'Breakfast', time: '09:00'},
                {id: 'test2', name: 'Lunch', time: '12:00'}
            ]);
            setIsLoading(false);
            
            // Notify parent about missed meals status
            if (onMealsStatusChange) {
                onMealsStatusChange(true);
            }
        }
    }, [testMode, componentId, onMealsStatusChange]);

    // Notify parent component about missed meals status whenever it changes
    useEffect(() => {
        if (!isLoading && onMealsStatusChange) {
            onMealsStatusChange(missedMeals.length > 0);
        }
    }, [missedMeals, isLoading, onMealsStatusChange]);

    useEffect(() => {
        // Skip normal fetch if in test mode
        if (testMode) return;

        const fetchMissedMeals = async () => {
            if (!nutritionPlanId || !user?.id) {
                setIsLoading(false);
                return;
            }

            try {
                // Get the nutrition plan with meals
                const nutritionPlan = await getNutritionPlanById(nutritionPlanId);
                
                if (!nutritionPlan || !nutritionPlan.meals || nutritionPlan.meals.length === 0) {
                    setIsLoading(false);
                    return;
                }

                // Get logged meals for today
                const dailyLog = await getLoggedMealsForDate(user.id, todayDate);
                
                // Check for missed meals
                const now = new Date();
                const currentHour = now.getHours();
                const currentMinute = now.getMinutes();
                const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
                
                // Get the day type from the log
                const dayType = dailyLog.day_type || nutritionPlan.dayTypes?.[0];
                
                if (!dayType) {
                    setIsLoading(false);
                    return;
                }
                
                // Get meals for the current day type
                let mealsForDayType = nutritionPlan.meals.filter(
                    (meal: MealWithFoodItems) => meal.day_type === dayType
                );
                
                // If no meals found for this day type, use all meals as fallback
                if (mealsForDayType.length === 0) {
                    mealsForDayType = nutritionPlan.meals;
                }
                
                // Find missed meals (meals with time_suggestion in the past that aren't logged)
                const newMissedMeals = mealsForDayType.filter(meal => {
                    // Only check meals that have a time suggestion
                    if (!meal.time_suggestion) {
                        return false;
                    }
                    
                    // Check if meal is logged
                    const isLogged = dailyLog.logged_meals.some(
                        loggedMeal => loggedMeal.meal_id === meal.id && !loggedMeal.is_extra_meal
                    );
                    
                    // If meal is not logged and the suggested time has passed, it's missed
                    const isMissed = !isLogged && meal.time_suggestion < currentTime;
                    
                    return isMissed;
                }).map(meal => ({
                    id: meal.id,
                    name: meal.name,
                    time: meal.time_suggestion as string
                }));
                
                // Create a map to identify duplicate meals
                const mealNameMap = new Map();
                newMissedMeals.forEach(meal => {
                    if (!mealNameMap.has(meal.name)) {
                        mealNameMap.set(meal.name, meal);
                    }
                });
                
                // Group duplicate meals by name to avoid showing the same meal name multiple times
                // This is more robust than just using ID as sometimes the same meal might have different IDs
                const uniqueMissedMeals = Array.from(
                    new Map(newMissedMeals.map(meal => [meal.name, meal])).values()
                );
                
                setMissedMeals(uniqueMissedMeals);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (error) {
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
        return null;
    }
    
    if (missedMeals.length === 0) {
        return null;
    }
    
    // Handle click to navigate to meal logging
    const handleMealLoggingClick = () => {
        // Check if we're on the DashboardPageV2 (which has the tab-based interface)
        if (window.location.pathname === '/dashboard') {
            // For DashboardPageV2, set the active tab to nutrition
            const tabButtons = document.querySelectorAll('.fixed.bottom-0 button');
            const nutritionButton = Array.from(tabButtons).find(button => 
                button.textContent?.toLowerCase().includes('nutrition')
            ) as HTMLButtonElement | undefined;
            
            // Click the nutrition tab if found
            if (nutritionButton) {
                nutritionButton.click();
            }
            
            // After a short delay to allow tab change, try to scroll to the meals section
            setTimeout(() => {
                const todaysMealsElement = document.getElementById('todays-meals');
                if (todaysMealsElement) {
                    todaysMealsElement.scrollIntoView({ behavior: 'smooth' });
                }
            }, 100);
        } else {
            // For other pages, navigate to nutrition plan page
            if (nutritionPlanId) {
                navigate(`/meal-plan/${nutritionPlanId}`);
            }
        }
    };

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
                            onClick={handleMealLoggingClick}>
                        Click here to log these meals!
                    </button>
                </p>
            </div>
        </div>
    );
});

export default MissedMealsAlert; 