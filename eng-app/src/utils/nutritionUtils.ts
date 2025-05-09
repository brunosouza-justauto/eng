import { MealWithFoodItems, LoggedMealWithNutrition } from '../types/mealPlanning';

/**
 * Calculates total nutrition values from an array of meals
 * 
 * @param meals An array of meals with nutrition data
 * @returns Object containing total calories, protein, carbs, and fat
 */
export const calculateTotalNutrition = (
    meals: MealWithFoodItems[] | LoggedMealWithNutrition[]
) => {
    const totals = meals.reduce(
        (acc, meal) => {
            acc.calories += meal.total_calories || 0;
            acc.protein += meal.total_protein || 0;
            acc.carbs += meal.total_carbs || 0;
            acc.fat += meal.total_fat || 0;
            return acc;
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    return {
        totalCalories: Math.round(totals.calories),
        totalProtein: Math.round(totals.protein),
        totalCarbs: Math.round(totals.carbs),
        totalFat: Math.round(totals.fat),
    };
};

/**
 * Calculates the percentage of targets achieved
 * 
 * @param consumed The amount consumed
 * @param target The target amount
 * @returns Percentage as a number between 0-100
 */
export const calculatePercentage = (consumed: number, target?: number): number => {
    if (!target || target <= 0) return 0;
    const percentage = (consumed / target) * 100;
    return Math.min(Math.max(percentage, 0), 100); // Clamp between 0 and 100
};

/**
 * Formats a nutrition value for display
 * 
 * @param value The nutrition value (calories, protein, etc.)
 * @param digits Number of decimal places
 * @returns Formatted string
 */
export const formatNutritionValue = (value?: number, digits: number = 0): string => {
    if (value === undefined || value === null) return '0';
    return value.toFixed(digits);
}; 