import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import BackButton from '../common/BackButton';
import { FiInfo, FiCheckCircle, FiPlusCircle, FiXCircle, FiShoppingCart, FiActivity, FiPrinter } from 'react-icons/fi';
import { MdDirectionsRun, MdOutlineEnergySavingsLeaf } from 'react-icons/md';
import { logPlannedMeal, deleteLoggedMeal } from '../../services/mealLoggingService';
import { getCurrentDate } from '../../utils/dateUtils';
import { selectProfile } from '../../store/slices/authSlice';
import { useSelector } from 'react-redux';

// Define types locally (consider moving later)
interface FoodItemData {
    food_name: string;
    calories_per_100g: number | null;
    protein_per_100g: number | null;
    carbs_per_100g: number | null;
    fat_per_100g: number | null;
    nutrient_basis: string; // '100g' or '100mL'
}

interface MealFoodItemData {
    quantity: number;
    unit: string;
    notes?: string | null;
    food_items: FoodItemData | null;
}

interface MealData {
    id: string;
    name: string;
    order_in_plan: number | null;
    notes: string | null;
    day_type: string;
    time_suggestion: string | null;
    meal_food_items: MealFoodItemData[];
}

interface NutritionPlanData {
    id: string;
    name: string;
    total_calories: number | null;
    protein_grams: number | null;
    carbohydrate_grams: number | null;
    fat_grams: number | null;
    description: string | null;
    meals: MealData[];
}

// Define params type
interface MealPlanViewParams extends Record<string, string | undefined> {
  planId: string;
}

// Calculate nutrition for a single food item
const calculateItemNutrition = (item: MealFoodItemData) => {
    if (!item.food_items) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    
    const multiplier = item.food_items.nutrient_basis === '100g' 
        ? item.quantity / 100 
        : item.quantity / 100; // Adjust for mL if needed
    
    return {
        calories: Math.round((item.food_items.calories_per_100g || 0) * multiplier),
        protein: Math.round(((item.food_items.protein_per_100g || 0) * multiplier) * 10) / 10,
        carbs: Math.round(((item.food_items.carbs_per_100g || 0) * multiplier) * 10) / 10,
        fat: Math.round(((item.food_items.fat_per_100g || 0) * multiplier) * 10) / 10
    };
};

// Calculate total nutrition for a meal
const calculateMealNutrition = (meal: MealData) => {
    return meal.meal_food_items.reduce((totals, item) => {
        const itemNutrition = calculateItemNutrition(item);
        return {
            calories: totals.calories + itemNutrition.calories,
            protein: Math.round((totals.protein + itemNutrition.protein) * 10) / 10,
            carbs: Math.round((totals.carbs + itemNutrition.carbs) * 10) / 10,
            fat: Math.round((totals.fat + itemNutrition.fat) * 10) / 10
        };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
};

// Add print styles to head
const printStyles = `
@media print {
    /* Reset all styles first */
    * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
    
    /* Hide non-printable elements */
    body.printing-nutrition-plan nav,
    body.printing-nutrition-plan header,
    body.printing-nutrition-plan button,
    body.printing-nutrition-plan .no-print,
    body.printing-nutrition-plan .back-button,
    body.printing-nutrition-plan footer {
        display: none !important;
    }
    
    /* Show only the printable plan */
    body.printing-nutrition-plan .container > *:not(.printable-plan) {
        display: none !important;
    }
    
    body.printing-nutrition-plan .printable-plan {
        display: block !important;
        visibility: visible !important;
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        height: auto !important;
        overflow: visible !important;
        z-index: 9999 !important;
    }
    
    body.printing-nutrition-plan {
        margin: 0 !important;
        padding: 0 !important;
        background: white !important;
    }
    
    /* General page setup */
    @page {
        size: A4;
        margin: 0.5in;
    }
    
    /* Cover page styles */
    .print-cover-page {
        height: 100vh;
        position: relative;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        page-break-after: always;
    }
    
    .print-logo {
        font-size: 18px;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 2px;
        margin-bottom: 80px;
        color: #333;
    }
    
    .print-plan-title {
        font-size: 36px;
        font-weight: bold;
        margin-bottom: 10px;
        color: #222;
    }
    
    .print-plan-subtitle {
        font-size: 22px;
        color: #555;
        margin-bottom: 50px;
        font-style: italic;
    }
    
    .print-plan-macros {
        display: flex;
        justify-content: space-around;
        width: 80%;
        margin: 50px auto;
        gap: 30px;
    }
    
    .print-macro-item {
        text-align: center;
    }
    
    .print-macro-value {
        font-size: 24px;
        font-weight: bold;
        color: #333;
    }
    
    .print-macro-label {
        font-size: 14px;
        color: #666;
        text-transform: uppercase;
    }
    
    .print-plan-description {
        max-width: 600px;
        margin: 30px auto;
        padding: 20px;
        border: 1px solid #ddd;
        border-radius: 5px;
        background-color: #f9f9f9;
    }
    
    .print-plan-description h2 {
        font-size: 18px;
        margin-bottom: 10px;
        color: #444;
    }
    
    .print-plan-description p {
        font-size: 14px;
        line-height: 1.6;
        color: #555;
    }
    
    .print-date {
        position: absolute;
        bottom: 40px;
        right: 0;
        left: 0;
        text-align: center;
        font-size: 12px;
        color: #888;
    }
    
    /* Table of Contents */
    .print-toc {
        padding: 20px 0;
        page-break-after: always;
    }
    
    .print-toc h2 {
        font-size: 24px;
        margin-bottom: 20px;
        border-bottom: 1px solid #ddd;
        padding-bottom: 10px;
    }
    
    .print-toc-list {
        list-style-type: none;
        padding: 0;
    }
    
    .print-toc-list li {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        padding: 5px 0;
        border-bottom: 1px dotted #ddd;
    }
    
    .print-toc-item {
        font-size: 16px;
        font-weight: 500;
        color: #444;
    }
    
    .print-toc-page {
        font-weight: bold;
    }
    
    /* Day section styles */
    .print-day-section {
        margin-bottom: 40px;
    }
    
    .print-day-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        border-bottom: 2px solid #444;
        padding-bottom: 10px;
    }
    
    .print-day-title {
        font-size: 22px;
        font-weight: bold;
        color: #333;
        display: flex;
        align-items: center;
    }
    
    .print-day-icon {
        display: inline-block;
        margin-right: 10px;
        font-size: 18px;
    }
    
    .print-training-icon {
        color: #4CAF50;
    }
    
    .print-rest-icon {
        color: #5C6BC0;
    }
    
    .print-day-macros {
        display: flex;
        gap: 15px;
    }
    
    .print-day-macro-item {
        font-size: 14px;
    }
    
    .print-day-macro-label {
        font-weight: 500;
        margin-right: 5px;
    }
    
    .print-day-macro-value {
        font-weight: bold;
    }
    
    /* Meal card styles */
    .print-meal-card {
        margin-bottom: 30px;
        border: 1px solid #ddd;
        border-radius: 5px;
        overflow: hidden;
        page-break-inside: avoid;
    }
    
    .print-meal-header {
        background-color: #f5f5f5;
        padding: 15px;
        border-bottom: 1px solid #ddd;
        position: relative;
    }
    
    .print-meal-name {
        font-size: 18px;
        font-weight: bold;
        color: #333;
        margin-bottom: 5px;
    }
    
    .print-meal-time {
        font-size: 14px;
        color: #666;
        margin-bottom: 5px;
        font-style: italic;
    }
    
    .print-meal-macros {
        display: flex;
        gap: 15px;
        font-size: 14px;
        color: #555;
    }
    
    .print-meal-notes {
        padding: 10px 15px;
        background-color: #f9f9f9;
        border-bottom: 1px solid #ddd;
        font-size: 14px;
        color: #666;
        font-style: italic;
    }
    
    .print-meal-notes-label {
        font-weight: bold;
        color: #555;
    }
    
    /* Table styles */
    .print-meal-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
    }
    
    .print-meal-table th,
    .print-meal-table td {
        padding: 10px 15px;
        text-align: left;
        border-bottom: 1px solid #ddd;
    }
    
    .print-meal-table th {
        background-color: #f0f0f0;
        font-weight: 500;
        color: #333;
    }
    
    .print-col-item {
        width: 35%;
    }
    
    .print-col-amount {
        width: 15%;
    }
    
    .print-col-macros {
        width: 35%;
    }
    
    .print-col-calories {
        width: 15%;
        text-align: right;
    }
    
    /* Page break utility */
    .print-page-break {
        page-break-after: always;
        height: 0;
    }
    
    /* Footer */
    .print-footer {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #ddd;
        text-align: center;
        font-size: 12px;
        color: #777;
    }
    
    .print-footer-logo {
        font-weight: bold;
        margin-bottom: 5px;
    }
    
    .print-footer-text {
        font-style: italic;
    }
}`;

// Component to inject print styles
const PrintStylesInjector: React.FC = () => {
    useEffect(() => {
        // Create style element
        const style = document.createElement('style');
        style.type = 'text/css';
        style.appendChild(document.createTextNode(printStyles));
        
        // Append to head
        document.head.appendChild(style);
        
        // Cleanup
        return () => {
            document.head.removeChild(style);
        };
    }, []);
    
    return null;
};

const MealPlanView: React.FC = () => {
    const { planId } = useParams<MealPlanViewParams>();
    const userProfile = useSelector(selectProfile);
    const location = useLocation();
    const navigate = useNavigate();
    
    // Get dayType from URL query parameters
    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const dayTypeParam = queryParams.get('dayType');
    
    const [plan, setPlan] = useState<NutritionPlanData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedDayType, setSelectedDayType] = useState<string | "all">("all");
    const [loggedMeals, setLoggedMeals] = useState<Record<string, boolean>>({});
    const [loadingMeals, setLoadingMeals] = useState<Record<string, boolean>>({});
    const [loggedMealIds, setLoggedMealIds] = useState<Record<string, string>>({});
    const todayDate = getCurrentDate();

    // Get unique day types from meals
    const dayTypes = useMemo(() => {
        if (!plan?.meals) return [];
        return Array.from(new Set(plan.meals.map(meal => meal.day_type))).filter(Boolean);
    }, [plan?.meals]);

    // Set initial day type from URL parameter or default to the first available day type
    useEffect(() => {
        if (plan) {
            const validDayTypes = Array.from(new Set(plan.meals.map(meal => meal.day_type))).filter(Boolean);
            if (dayTypeParam && validDayTypes.includes(dayTypeParam)) {
                setSelectedDayType(dayTypeParam);
            } else if (validDayTypes.length > 0) {
                setSelectedDayType(validDayTypes[0]);
            }
        }
    }, [dayTypeParam, plan]);

    useEffect(() => {
        const fetchFullPlan = async () => {
            if (!planId) {
                setError('Nutrition Plan ID not provided.');
                setIsLoading(false);
                return;
            }
            
            setIsLoading(true);
            setError(null);
            setPlan(null);

            try {
                // Fetch specific plan and all its meals/items
                const { data, error: fetchError } = await supabase
                    .from('nutrition_plans')
                    .select(`
                        id,
                        name,
                        total_calories,
                        protein_grams,
                        carbohydrate_grams,
                        fat_grams,
                        description,
                        meals (
                            id,
                            name,
                            order_in_plan,
                            notes,
                            day_type,
                            time_suggestion,
                            meal_food_items (
                                quantity,
                                unit,
                                notes,
                                food_items (
                                    food_name,
                                    calories_per_100g,
                                    protein_per_100g,
                                    carbs_per_100g,
                                    fat_per_100g,
                                    nutrient_basis
                                )
                            )
                        )
                    `)
                    .eq('id', planId)
                    .single();

                if (fetchError) throw fetchError;
                
                if (data) {
                    setPlan(data as NutritionPlanData);
                } else {
                    setError('Nutrition Plan not found.');
                }

            } catch (err: unknown) {
                console.error("Error fetching full nutrition plan data:", err);
                let message = 'Failed to load nutrition plan.';
                if (typeof err === 'object' && err !== null && 'message' in err) {
                    message = (err as Error).message;
                }
                setError(message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchFullPlan();
    }, [planId]);

    // Check which meals have already been logged today
    useEffect(() => {
        const checkLoggedMeals = async () => {
            if (!plan || !userProfile) return;
            
            const today = getCurrentDate();
            const mealStatus: Record<string, boolean> = {};
            const mealLogIds: Record<string, string> = {};
            
            try {
                // Get all logged meals for today
                const { data: loggedMealsData, error: logsError } = await supabase
                    .from('meal_logs')
                    .select('id, meal_id')
                    .eq('user_id', userProfile.id)
                    .eq('date', today)
                    .not('is_extra_meal', 'eq', true);

                if (logsError) {
                    console.error('Error fetching logged meals:', logsError);
                }
                
                if (loggedMealsData) {
                    // Create lookup maps
                    loggedMealsData.forEach(loggedMeal => {
                        if (loggedMeal.meal_id) {
                            mealStatus[loggedMeal.meal_id] = true;
                            mealLogIds[loggedMeal.meal_id] = loggedMeal.id;
                        }
                    });
                }
            } catch (error) {
                console.error('Error fetching logged meals:', error);
            }
            
            setLoggedMeals(mealStatus);
            setLoggedMealIds(mealLogIds);
        };
        
        checkLoggedMeals();
    }, [plan, userProfile]);

    // Handle log meal action
    const handleLogMeal = async (meal: MealData) => {
        if (!userProfile?.id) return;
        
        setLoadingMeals(prev => ({ ...prev, [meal.id]: true }));
        try {
            // Check if the meal is already logged
            if (loggedMeals[meal.id]) {
                // Find the log entry ID and delete it
                const loggedMealId = loggedMealIds[meal.id];
                if (loggedMealId) {
                    await deleteLoggedMeal(loggedMealId);
                    
                    // Update state
                    setLoggedMeals(prev => ({ ...prev, [meal.id]: false }));
                    setLoggedMealIds(prev => {
                        const newState = { ...prev };
                        delete newState[meal.id];
                        return newState;
                    });
                }
            } else {
                // Log the meal
                const result = await logPlannedMeal(userProfile.id, meal.id, todayDate);
                
                if (result.id) {
                    // Update state
                    setLoggedMeals(prev => ({ ...prev, [meal.id]: true }));
                    setLoggedMealIds(prev => ({ ...prev, [meal.id]: result.id }));
                }
            }
        } catch (error) {
            console.error("Error toggling meal log:", error);
        } finally {
            setLoadingMeals(prev => ({ ...prev, [meal.id]: false }));
        }
    };

    // Filter meals by selected day type
    const filteredMeals = useMemo(() => {
        if (!plan?.meals) return [];
        
        return selectedDayType === "all" 
            ? plan.meals 
            : plan.meals.filter(meal => meal.day_type === selectedDayType);
    }, [plan?.meals, selectedDayType]);

    // Handle shopping list button click
    const handleGenerateShoppingList = () => {
        if (planId) {
            navigate(`/shopping-cart?planId=${planId}`);
        }
    };
    
    // Handle print button click
    const handlePrintPlan = () => {
        // Create a new print window
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow pop-ups to print the nutrition plan');
            return;
        }
        
        // Write HTML content to the print window
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${plan?.name || 'Nutrition Plan'} - ENG Fitness</title>
                <style>
                    /* Reset styles */
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; background: white; color: black; }
                    
                    /* Cover page styles */
                    .print-cover-page {
                        height: 100vh;
                        position: relative;
                        text-align: center;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        page-break-after: always;
                    }
                    
                    .print-logo {
                        font-size: 18px;
                        font-weight: bold;
                        text-transform: uppercase;
                        letter-spacing: 2px;
                        margin-bottom: 80px;
                        color: #333;
                    }
                    
                    .print-plan-title {
                        font-size: 36px;
                        font-weight: bold;
                        margin-bottom: 10px;
                        color: #222;
                    }
                    
                    .print-plan-subtitle {
                        font-size: 22px;
                        color: #555;
                        margin-bottom: 50px;
                        font-style: italic;
                    }
                    
                    .print-plan-macros {
                        display: flex;
                        justify-content: space-around;
                        width: 80%;
                        margin: 50px auto;
                        gap: 30px;
                    }
                    
                    .print-macro-item {
                        text-align: center;
                    }
                    
                    .print-macro-value {
                        font-size: 24px;
                        font-weight: bold;
                        color: #333;
                    }
                    
                    .print-macro-label {
                        font-size: 14px;
                        color: #666;
                        text-transform: uppercase;
                    }
                    
                    .print-plan-description {
                        max-width: 600px;
                        margin: 30px auto;
                        padding: 20px;
                        border: 1px solid #ddd;
                        border-radius: 5px;
                        background-color: #f9f9f9;
                    }
                    
                    .print-plan-description h2 {
                        font-size: 18px;
                        margin-bottom: 10px;
                        color: #444;
                    }
                    
                    .print-plan-description p {
                        font-size: 14px;
                        line-height: 1.6;
                        color: #555;
                    }
                    
                    .print-date {
                        position: absolute;
                        bottom: 40px;
                        right: 0;
                        left: 0;
                        text-align: center;
                        font-size: 12px;
                        color: #888;
                    }
                    
                    /* Table of Contents */
                    .print-toc {
                        padding: 20px 0;
                        page-break-after: always;
                    }
                    
                    .print-toc h2 {
                        font-size: 24px;
                        margin-bottom: 20px;
                        border-bottom: 1px solid #ddd;
                        padding-bottom: 10px;
                    }
                    
                    .print-toc-list {
                        list-style-type: none;
                        padding: 0;
                    }
                    
                    .print-toc-list li {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 10px;
                        padding: 5px 0;
                        border-bottom: 1px dotted #ddd;
                    }
                    
                    .print-toc-item {
                        font-size: 16px;
                        font-weight: 500;
                        color: #444;
                    }
                    
                    .print-toc-page {
                        font-weight: bold;
                    }
                    
                    /* Day section styles */
                    .print-day-section {
                        margin-bottom: 40px;
                    }
                    
                    .print-day-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                        border-bottom: 2px solid #444;
                        padding-bottom: 10px;
                    }
                    
                    .print-day-title {
                        font-size: 22px;
                        font-weight: bold;
                        color: #333;
                        display: flex;
                        align-items: center;
                    }
                    
                    .print-day-icon {
                        display: inline-block;
                        margin-right: 10px;
                        font-size: 18px;
                    }
                    
                    .print-training-icon {
                        color: #4CAF50;
                    }
                    
                    .print-rest-icon {
                        color: #5C6BC0;
                    }
                    
                    .print-day-macros {
                        display: flex;
                        gap: 15px;
                    }
                    
                    .print-day-macro-item {
                        font-size: 14px;
                    }
                    
                    .print-day-macro-label {
                        font-weight: 500;
                        margin-right: 5px;
                    }
                    
                    .print-day-macro-value {
                        font-weight: bold;
                    }
                    
                    /* Meal card styles */
                    .print-meal-card {
                        margin-bottom: 30px;
                        border: 1px solid #ddd;
                        border-radius: 5px;
                        overflow: hidden;
                        page-break-inside: avoid;
                    }
                    
                    .print-meal-header {
                        background-color: #f5f5f5;
                        padding: 15px;
                        border-bottom: 1px solid #ddd;
                        position: relative;
                    }
                    
                    .print-meal-name {
                        font-size: 18px;
                        font-weight: bold;
                        color: #333;
                        margin-bottom: 5px;
                    }
                    
                    .print-meal-time {
                        font-size: 14px;
                        color: #666;
                        margin-bottom: 5px;
                        font-style: italic;
                    }
                    
                    .print-meal-macros {
                        display: flex;
                        gap: 15px;
                        font-size: 14px;
                        color: #555;
                    }
                    
                    .print-meal-notes {
                        padding: 10px 15px;
                        background-color: #f9f9f9;
                        border-bottom: 1px solid #ddd;
                        font-size: 14px;
                        color: #666;
                        font-style: italic;
                    }
                    
                    .print-meal-notes-label {
                        font-weight: bold;
                        color: #555;
                    }
                    
                    /* Table styles */
                    .print-meal-table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 14px;
                    }
                    
                    .print-meal-table th,
                    .print-meal-table td {
                        padding: 10px 15px;
                        text-align: left;
                        border-bottom: 1px solid #ddd;
                    }
                    
                    .print-meal-table th {
                        background-color: #f0f0f0;
                        font-weight: 500;
                        color: #333;
                    }
                    
                    .print-col-item {
                        width: 35%;
                    }
                    
                    .print-col-amount {
                        width: 15%;
                    }
                    
                    .print-col-macros {
                        width: 35%;
                    }
                    
                    .print-col-calories {
                        width: 15%;
                        text-align: right;
                    }
                    
                    /* Page break utility */
                    .print-page-break {
                        page-break-after: always;
                        height: 0;
                    }
                    
                    /* Footer */
                    .print-footer {
                        margin-top: 40px;
                        padding-top: 20px;
                        border-top: 1px solid #ddd;
                        text-align: center;
                        font-size: 12px;
                        color: #777;
                    }
                    
                    .print-footer-logo {
                        font-weight: bold;
                        margin-bottom: 5px;
                    }
                    
                    .print-footer-text {
                        font-style: italic;
                    }
                    
                    @media print {
                        @page {
                            size: A4;
                            margin: 0.5in;
                        }
                    }
                </style>
            </head>
            <body>
        `);
        
        // Group meals by day type
        const dayTypes = Array.from(new Set(plan?.meals?.map(meal => meal.day_type) || []));
        const mealsByDayType: Record<string, MealData[]> = {};
        
        // Initialize groups
        dayTypes.forEach(dayType => {
            if (dayType) {
                mealsByDayType[dayType] = [];
            }
        });
        
        // Group meals by day type
        plan?.meals?.forEach(meal => {
            if (meal.day_type && mealsByDayType[meal.day_type]) {
                mealsByDayType[meal.day_type].push(meal);
            }
        });
        
        // Sort meals within each day type
        Object.keys(mealsByDayType).forEach(dayType => {
            mealsByDayType[dayType].sort((a, b) => (a.order_in_plan ?? 0) - (b.order_in_plan ?? 0));
        });
        
        // Write cover page
        printWindow.document.write(`
            <div class="print-cover-page">
                <div class="print-logo">ENG Fitness</div>
                <h1 class="print-plan-title">${plan?.name || 'Nutrition Plan'}</h1>
                <div class="print-plan-subtitle">Nutrition Plan</div>
                
                <div class="print-plan-macros">
                    <div class="print-macro-item">
                        <div class="print-macro-value">${plan?.total_calories || 0}</div>
                        <div class="print-macro-label">Calories</div>
                    </div>
                    <div class="print-macro-item">
                        <div class="print-macro-value">${plan?.protein_grams || 0}g</div>
                        <div class="print-macro-label">Protein</div>
                    </div>
                    <div class="print-macro-item">
                        <div class="print-macro-value">${plan?.carbohydrate_grams || 0}g</div>
                        <div class="print-macro-label">Carbs</div>
                    </div>
                    <div class="print-macro-item">
                        <div class="print-macro-value">${plan?.fat_grams || 0}g</div>
                        <div class="print-macro-label">Fat</div>
                    </div>
                </div>
                
                ${plan?.description ? `
                <div class="print-plan-description">
                    <h2>Plan Description</h2>
                    <p>${plan.description.replace(/\n/g, '<br>')}</p>
                </div>
                ` : ''}
                
            </div>
            
            <div class="print-page-break"></div>
        `);
        
        // Write table of contents
        printWindow.document.write(`
            <div class="print-toc">
                <h2>Contents</h2>
                <ol class="print-toc-list">
                    ${Object.keys(mealsByDayType).map((dayType, index) => `
                        <li>
                            <span class="print-toc-item">${dayType.charAt(0).toUpperCase() + dayType.slice(1)} Day Plan</span>
                            <span class="print-toc-page">${index + 2}</span>
                        </li>
                    `).join('')}
                </ol>
            </div>
            
            <div class="print-page-break"></div>
        `);
        
        // Write day-specific meal plans
        Object.entries(mealsByDayType).forEach(([dayType, meals], dayIndex) => {
            // Calculate day totals
            const dayTotals = meals.reduce((acc, meal) => {
                const mealNutrition = calculateMealNutrition(meal);
                return {
                    calories: acc.calories + mealNutrition.calories,
                    protein: acc.protein + mealNutrition.protein,
                    carbs: acc.carbs + mealNutrition.carbs,
                    fat: acc.fat + mealNutrition.fat
                };
            }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
            
            printWindow.document.write(`
                <div class="print-day-section">
                    <div class="print-day-header">
                        <h2 class="print-day-title">
                            ${dayType === 'training' ? 
                                `<span class="print-day-icon print-training-icon">▶</span>` : 
                                dayType === 'rest' ? 
                                `<span class="print-day-icon print-rest-icon">●</span>` : 
                                `<span class="print-day-icon">■</span>`
                            }
                            ${dayType.charAt(0).toUpperCase() + dayType.slice(1)} Day Plan
                        </h2>
                        
                        <div class="print-day-macros">
                            <div class="print-day-macro-item">
                                <span class="print-day-macro-label">Calories:</span>
                                <span class="print-day-macro-value">${dayTotals.calories}</span>
                            </div>
                            <div class="print-day-macro-item">
                                <span class="print-day-macro-label">P:</span>
                                <span class="print-day-macro-value">${dayTotals.protein.toFixed(1)}g</span>
                            </div>
                            <div class="print-day-macro-item">
                                <span class="print-day-macro-label">C:</span>
                                <span class="print-day-macro-value">${dayTotals.carbs.toFixed(1)}g</span>
                            </div>
                            <div class="print-day-macro-item">
                                <span class="print-day-macro-label">F:</span>
                                <span class="print-day-macro-value">${dayTotals.fat.toFixed(1)}g</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="print-meals-list">
            `);
            
            // Write meals for this day type
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            meals.forEach((meal, mealIndex) => {
                const mealNutrition = calculateMealNutrition(meal);
                
                printWindow.document.write(`
                    <div class="print-meal-card">
                        <div class="print-meal-header">
                            <h3 class="print-meal-name">${meal.name}</h3>
                            ${meal.time_suggestion ? `
                                <div class="print-meal-time">Time: ${meal.time_suggestion}</div>
                            ` : ''}
                            <div class="print-meal-macros">
                                <span>${mealNutrition.calories} kcal</span>
                                <span>P: ${mealNutrition.protein}g</span>
                                <span>C: ${mealNutrition.carbs}g</span>
                                <span>F: ${mealNutrition.fat}g</span>
                            </div>
                        </div>
                        
                        ${meal.notes ? `
                            <div class="print-meal-notes">
                                <span class="print-meal-notes-label">Notes:</span> ${meal.notes}
                            </div>
                        ` : ''}
                        
                        <table class="print-meal-table">
                            <thead>
                                <tr>
                                    <th class="print-col-item">Food Item</th>
                                    <th class="print-col-amount">Amount</th>
                                    <th class="print-col-macros">Macros</th>
                                    <th class="print-col-calories">Calories</th>
                                </tr>
                            </thead>
                            <tbody>
                `);
                
                // Write food items for this meal
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                meal.meal_food_items.forEach((item, idx) => {
                    const itemNutrition = calculateItemNutrition(item);
                    
                    printWindow.document.write(`
                        <tr>
                            <td class="print-col-item">
                                ${item.food_items?.food_name ?? 'Unknown Item'}
                                ${item.notes ? `<br><small style="color: #666; font-style: italic;">Note: ${item.notes}</small>` : ''}
                            </td>
                            <td class="print-col-amount">${item.quantity}${item.unit}</td>
                            <td class="print-col-macros">
                                P: ${itemNutrition.protein}g · C: ${itemNutrition.carbs}g · F: ${itemNutrition.fat}g
                            </td>
                            <td class="print-col-calories">${itemNutrition.calories}</td>
                        </tr>
                    `);
                });
                
                printWindow.document.write(`
                            </tbody>
                        </table>
                    </div>
                `);
            });
            
            printWindow.document.write(`
                    </div>
                    
                    ${dayIndex < Object.keys(mealsByDayType).length - 1 ? `
                        <div class="print-page-break"></div>
                    ` : ''}
                </div>
            `);
        });
        
        // Write footer and close document
        printWindow.document.write(`
                <div class="print-footer">
                    <div class="print-footer-logo">ENG Fitness</div>
                    <div class="print-footer-text">This nutrition plan is designed to help you achieve your fitness goals. Follow it consistently for best results.</div>
                </div>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        
        // Give time for resources to load then print
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            
            // Optional: close the window after printing
            // Commented out to allow the user to save as PDF if needed
            // setTimeout(() => printWindow.close(), 500);
        }, 1000);
    };

    return (
        <div className="container mx-auto py-6 app-container">
            <PrintStylesInjector />
            <BackButton to="/dashboard" />

            {isLoading && <div className="p-4 flex justify-center"><p>Loading meal plan details...</p></div>}
            {error && <p className="text-red-500 p-4">Error: {error}</p>}
            
            {plan && (
                <div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm mb-6">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{plan.name}</h1>
                                
                                <div className="flex flex-wrap gap-2 mb-3">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full text-sm text-blue-700 dark:text-blue-300">
                                        {plan.total_calories}kcal
                                    </div>
                                    <div className="bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-full text-sm text-red-700 dark:text-red-300">
                                        P: {plan.protein_grams}g
                                    </div>
                                    <div className="bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full text-sm text-green-700 dark:text-green-300">
                                        C: {plan.carbohydrate_grams}g
                                    </div>
                                    <div className="bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1 rounded-full text-sm text-yellow-700 dark:text-yellow-300">
                                        F: {plan.fat_grams}g
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                            <button
                                onClick={handleGenerateShoppingList}
                                className="flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded"
                            >
                                <FiShoppingCart className="mr-2" /> Generate Shopping List
                            </button>
                            <button
                                onClick={handlePrintPlan}
                                className="flex items-center justify-center bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded"
                            >
                                <FiPrinter className="mr-2" /> Print/Export PDF
                            </button>
                        </div>
                        {plan.description && 
                            <p className="text-sm text-gray-600 dark:text-gray-400 italic mb-4 whitespace-pre-line">{plan.description}</p>
                        }
                    </div>
                    
                    {dayTypes.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Select Day Type:</h2>
                            <div className="grid grid-cols-1 gap-4">
                                {dayTypes.map(dayType => {
                                    // Determine icon and colors based on day type
                                    let DayIcon = FiActivity;
                                    let primaryColor, secondaryColor, textColor, iconBgColor;
                                    
                                    if (dayType.toLowerCase() === 'training') {
                                        DayIcon = MdDirectionsRun;
                                        primaryColor = selectedDayType === dayType ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gray-50 dark:bg-gray-800';
                                        secondaryColor = 'border-green-300 dark:border-green-700';
                                        textColor = selectedDayType === dayType ? 'text-white' : 'text-gray-800 dark:text-white';
                                        iconBgColor = selectedDayType === dayType ? 'bg-white/20' : 'bg-green-100 dark:bg-green-900/30';
                                    } else if (dayType.toLowerCase() === 'rest') {
                                        DayIcon = MdOutlineEnergySavingsLeaf;
                                        primaryColor = selectedDayType === dayType ? 'bg-gradient-to-r from-violet-500 to-indigo-600' : 'bg-gray-50 dark:bg-gray-800';
                                        secondaryColor = 'border-indigo-300 dark:border-indigo-700';
                                        textColor = selectedDayType === dayType ? 'text-white' : 'text-gray-800 dark:text-white';
                                        iconBgColor = selectedDayType === dayType ? 'bg-white/20' : 'bg-indigo-100 dark:bg-indigo-900/30';
                                    } else {
                                        primaryColor = selectedDayType === dayType ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gray-50 dark:bg-gray-800';
                                        secondaryColor = 'border-blue-300 dark:border-blue-700';
                                        textColor = selectedDayType === dayType ? 'text-white' : 'text-gray-800 dark:text-white';
                                        iconBgColor = selectedDayType === dayType ? 'bg-white/20' : 'bg-blue-100 dark:bg-blue-900/30';
                                    }
                                    
                                    return (
                                        <button
                                            key={dayType}
                                            onClick={() => setSelectedDayType(dayType)}
                                            className={`group relative flex items-center p-5 rounded-xl transition-all duration-300 border-2 overflow-hidden
                                                ${primaryColor} ${secondaryColor} ${textColor}
                                                ${selectedDayType === dayType 
                                                    ? 'shadow-lg transform scale-[1.02]' 
                                                    : 'shadow-sm hover:shadow-md hover:scale-[1.01]'}`}
                                            aria-pressed={selectedDayType === dayType}
                                            aria-label={`View ${dayType} meal plan`}
                                        >
                                            {/* Selection indicator */}
                                            {selectedDayType === dayType && (
                                                <div className="absolute left-0 top-0 h-full w-1.5 bg-white"></div>
                                            )}
                                            
                                            <div className={`p-3 mr-4 rounded-full flex items-center justify-center transition-all duration-300 ${iconBgColor}`}>
                                                <DayIcon size={28} className={selectedDayType === dayType ? 'text-white' : dayType.toLowerCase() === 'training' ? 'text-green-600 dark:text-green-400' : dayType.toLowerCase() === 'rest' ? 'text-indigo-600 dark:text-indigo-400' : 'text-blue-600 dark:text-blue-400'} />
                                            </div>
                                            
                                            <div className="flex-1">
                                                <h3 className="text-xl font-bold capitalize mb-1">{dayType}</h3>
                                                <p className={`text-sm ${selectedDayType === dayType ? 'text-white/90' : 'text-gray-600 dark:text-gray-400'}`}>
                                                    {dayType.toLowerCase() === 'training' 
                                                        ? 'Workout day nutrition plan' 
                                                        : dayType.toLowerCase() === 'rest'
                                                            ? 'Recovery day nutrition plan'
                                                            : `${dayType} nutrition plan`
                                                    }
                                                </p>
                                            </div>
                                            
                                            {/* Selection checkmark/indicator */}
                                            {selectedDayType === dayType && (
                                                <div className="ml-3 bg-white/20 p-1.5 rounded-full">
                                                    <FiCheckCircle size={20} />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}


                    
                    <div id="todays-meals" className="space-y-6">
                        {filteredMeals.length === 0 && 
                            <p className="text-center p-4 text-gray-500 dark:text-gray-400">
                                No meals available for the selected day type.
                            </p>
                        }
                        
                        {filteredMeals
                            .sort((a, b) => (a.order_in_plan ?? 0) - (b.order_in_plan ?? 0))
                            .map((meal) => {
                                const mealNutrition = calculateMealNutrition(meal);
                                const isLogged = loggedMeals[meal.id] || false;
                                
                                return (
                                    <div key={meal.id} className="bg-gray-900 dark:bg-gray-800 rounded-lg shadow-md overflow-hidden text-white meal-card">
                                        <div className="p-4 border-b border-gray-800 dark:border-gray-700 meal-header">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h2 className="text-xl font-semibold text-white flex items-center">
                                                        {meal.name}
                                                        {isLogged && (
                                                            <span className="ml-2 text-green-500 dark:text-green-400" title="Logged today">
                                                                <FiCheckCircle />
                                                            </span>
                                                        )}
                                                    </h2>
                                                    {meal.time_suggestion && (
                                                        <div className="flex items-center mt-1.5 bg-indigo-900/30 px-2 py-1 rounded-md w-fit">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-300 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <p className="text-sm font-medium text-indigo-300">
                                                                {meal.time_suggestion}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div className="flex items-center">
                                                    <div className="text-right">
                                                        <p className="text-lg font-medium text-white">
                                                            {mealNutrition.calories} kcal
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-2 text-sm text-gray-300">
                                                P: {mealNutrition.protein}g · C: {mealNutrition.carbs}g · F: {mealNutrition.fat}g
                                            </div>
                                        </div>
                                        
                                        {meal.notes && (
                                            <div className="px-4 py-2 bg-gray-800 dark:bg-gray-700 flex items-start">
                                                <FiInfo className="text-indigo-400 mt-0.5 mr-2 flex-shrink-0" />
                                                <p className="text-sm text-indigo-200">
                                                    {meal.notes}
                                                </p>
                                            </div>
                                        )}
                                        
                                        <div className="p-4">
                                            <table className="w-full text-sm table-fixed">
                                                <thead className="text-xs text-gray-400 border-b border-gray-800 dark:border-gray-700">
                                                    <tr>
                                                        <th className="text-left pb-3 font-medium w-1/2">Item</th>
                                                        <th className="text-right pb-3 font-medium w-1/4">Amount</th>
                                                        <th className="text-right pb-3 font-medium w-1/4">Calories</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-gray-300">
                                                    {meal.meal_food_items.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={3} className="py-3 text-center text-gray-500">
                                                                No food items defined for this meal.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        meal.meal_food_items.map((item, idx) => {
                                                            const itemNutrition = calculateItemNutrition(item);
                                                            
                                                            return (
                                                                <tr key={idx} className="border-b border-gray-800 dark:border-gray-700 last:border-0">
                                                                    <td className="py-3">
                                                                        <div className="font-medium">
                                                                            {item.food_items?.food_name ?? 'Unknown Item'}
                                                                        </div>
                                                                        <div className="text-xs text-gray-400 mt-1">
                                                                            P: {itemNutrition.protein} · C: {itemNutrition.carbs} · F: {itemNutrition.fat}
                                                                        </div>
                                                                        {item.notes && (
                                                                            <div className="text-xs text-indigo-300 mt-1 pl-2 border-l-2 border-indigo-600 italic">
                                                                                {item.notes}
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    <td className="py-3 text-right whitespace-nowrap align-top">
                                                                        {item.quantity}{item.unit}
                                                                    </td>
                                                                    <td className="py-3 text-right align-top">
                                                                        {itemNutrition.calories}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                            
                                            <div className="mt-4">
                                                <button 
                                                    onClick={() => handleLogMeal(meal)}
                                                    disabled={loadingMeals[meal.id]}
                                                    className={`w-full py-2 px-4 rounded-md transition-colors flex justify-center items-center ${
                                                        isLogged 
                                                            ? 'bg-red-600 hover:bg-red-700 text-white' 
                                                            : 'bg-green-600 hover:bg-green-700 text-white'
                                                    }`}
                                                >
                                                    {loadingMeals[meal.id] ? (
                                                        <span className="block h-5 w-5 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2" />
                                                    ) : isLogged ? (
                                                        <>
                                                            <FiXCircle size={18} className="mr-2" />
                                                            Remove from log
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FiPlusCircle size={18} className="mr-2" />
                                                            Log this meal
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        }
                    </div>
                </div>
            )}
            
            {/* We're now using a direct popup window for printing instead of this component */}
        </div>
    );
};

export default MealPlanView; 