import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { FiCalendar, FiCheckCircle, FiPieChart, FiTrendingUp } from 'react-icons/fi';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import { Button } from '../../components/ui/Button';

// Types for nutrition data
interface MealLog {
  id: string;
  user_id: string;
  meal_id: string;
  nutrition_plan_id: string;
  name: string;
  food_items: FoodItem[];
  is_extra_meal: boolean;
  created_at: string;
  updated_at: string;
  date: string;
  time: string;
  day_type: string;
}

interface FoodItem {
  id: string;
  name: string;
  protein_grams: number;
  carbohydrate_grams: number;
  fat_grams: number;
  calories: number;
  serving_size: number;
  serving_unit: string;
  quantity: number;
}

interface NutritionPlan {
  id: string;
  name: string;
  description: string | null;
  athlete_id: string;
  coach_id: string;
  total_calories: number;
  protein_grams: number;
  carbohydrate_grams: number;
  fat_grams: number;
  created_at: string;
  updated_at: string;
}

interface AthleteData {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface DailyNutrition {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  mealCount: number;
  completionRate: number;
}

// Component for nutrition macros visualization
const MacrosPieChart: React.FC<{
  protein: number;
  carbs: number;
  fat: number;
}> = ({ protein, carbs, fat }) => {
  const total = protein + carbs + fat;
  
  // Skip if no data
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500">
        No macro data available
      </div>
    );
  }
  
  // Calculate percentages
  const proteinPercentage = Math.round((protein / total) * 100);
  const carbsPercentage = Math.round((carbs / total) * 100);
  const fatPercentage = Math.round((fat / total) * 100);
  
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center justify-center mb-4">
        <div className="relative h-32 w-32">
          <svg viewBox="0 0 36 36" className="w-full h-full">
            {/* Protein slice (red) */}
            <path 
              d={`M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831`}
              fill="none"
              stroke="#ef4444"
              strokeWidth="3"
              strokeDasharray={`${proteinPercentage}, 100`}
              className="stroke-[#ef4444] dark:stroke-[#ef4444]"
            />
            
            {/* Carbs slice (yellow) */}
            <path 
              d={`M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831`}
              fill="none"
              stroke="#eab308"
              strokeWidth="3"
              strokeDasharray={`${carbsPercentage}, 100`}
              strokeDashoffset={`${-proteinPercentage}`}
              className="stroke-[#eab308] dark:stroke-[#eab308]"
            />
            
            {/* Fat slice (blue) */}
            <path 
              d={`M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831`}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3"
              strokeDasharray={`${fatPercentage}, 100`}
              strokeDashoffset={`${-(proteinPercentage + carbsPercentage)}`}
              className="stroke-[#3b82f6] dark:stroke-[#3b82f6]"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-medium">{total} cal</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2 w-full">
        <div className="flex flex-col items-center">
          <span className="flex items-center text-xs text-gray-600 dark:text-gray-400">
            <span className="inline-block w-3 h-3 mr-1 bg-red-500 rounded-full"></span>
            Protein
          </span>
          <span className="font-medium">{protein}g</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="flex items-center text-xs text-gray-600 dark:text-gray-400">
            <span className="inline-block w-3 h-3 mr-1 bg-yellow-500 rounded-full"></span>
            Carbs
          </span>
          <span className="font-medium">{carbs}g</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="flex items-center text-xs text-gray-600 dark:text-gray-400">
            <span className="inline-block w-3 h-3 mr-1 bg-blue-500 rounded-full"></span>
            Fat
          </span>
          <span className="font-medium">{fat}g</span>
        </div>
      </div>
    </div>
  );
};

// Bar chart component for calorie/macro history
const NutritionBarChart: React.FC<{ 
  data: DailyNutrition[],
  targetCalories: number | null;
}> = ({ data, targetCalories }) => {
  // Skip if no data
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No nutrition data available
      </div>
    );
  }

  // Find the max calories for scaling
  const maxCalories = Math.max(...data.map(entry => entry.totalCalories), targetCalories || 0);
  const chartHeight = 200; // pixels
  
  return (
    <div className="pt-4">
      {/* Target line */}
      {targetCalories && (
        <div 
          className="relative w-full border-t border-dashed border-indigo-500"
          style={{ 
            top: `${chartHeight - (targetCalories / maxCalories) * chartHeight}px`,
            marginBottom: '8px'
          }}
        >
          <span className="absolute right-0 px-1 text-xs text-indigo-600 transform -translate-y-full bg-gray-100 dark:bg-gray-800 dark:text-indigo-400">
            Target: {targetCalories.toLocaleString()} cal
          </span>
        </div>
      )}
      
      <div className="flex items-end h-64 mt-8 space-x-2 overflow-x-auto">
        {data.map((entry, idx) => (
          <div key={idx} className="flex flex-col items-center">
            <div 
              className={`w-12 ${entry.totalCalories >= (targetCalories || 0) ? 'bg-green-500' : 'bg-indigo-500'} rounded-t`}
              style={{ 
                height: `${(entry.totalCalories / maxCalories) * chartHeight}px`,
                minHeight: '1px'
              }}
              title={`${entry.totalCalories.toLocaleString()} calories`}
            ></div>
            <div className="mt-2 text-xs text-gray-600 whitespace-nowrap dark:text-gray-400">
              {format(parseISO(entry.date), 'MMM dd')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Month navigation component
const MonthNavigation: React.FC<{ 
  currentDate: Date, 
  setCurrentDate: (date: Date) => void,
  timeframe: 'month' | 'week'
}> = ({ currentDate, setCurrentDate, timeframe }) => {
  // Only show this when in month view
  if (timeframe !== 'month') return null;
  
  const handlePrevMonth = () => {
    const prevMonth = new Date(currentDate);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    setCurrentDate(prevMonth);
  };
  
  const handleNextMonth = () => {
    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setCurrentDate(nextMonth);
  };
  
  return (
    <div className="flex items-center mt-4 space-x-2">
      <Button variant="secondary" size="sm" onClick={handlePrevMonth}>
        Previous Month
      </Button>
      <span className="px-2 text-sm font-medium">
        {format(currentDate, 'MMMM yyyy')}
      </span>
      <Button variant="secondary" size="sm" onClick={handleNextMonth}>
        Next Month
      </Button>
    </div>
  );
};

const formatTimeString = (timeStr: string): string => {
  try {
    // Handle time string in format "HH:MM:SS"
    const [hours, minutes] = timeStr.split(':');
    
    if (!hours || !minutes) {
      return timeStr; // Return as is if not in expected format
    }
    
    // Create a date object for today with the given hours and minutes
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    
    // Format it
    return format(date, 'h:mm a');
  } catch (e) {
    console.error('Error formatting time:', e);
    return timeStr; // Return original if parsing fails
  }
};

const AthleteNutritionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [athlete, setAthlete] = useState<AthleteData | null>(null);
  const [nutritionPlan, setNutritionPlan] = useState<NutritionPlan | null>(null);
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [dailyNutrition, setDailyNutrition] = useState<DailyNutrition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartTimeframe, setChartTimeframe] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Fetch athlete data
  useEffect(() => {
    const fetchAthleteData = async () => {
      try {
        if (!id) return;
        
        // Fetch athlete data
        const { data: athleteData, error: athleteError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, user_id')
          .eq('id', id)
          .single();
          
        if (athleteError) throw athleteError;
        setAthlete(athleteData);
        
        // Fetch nutrition plan and meal logs
        await Promise.all([
          fetchNutritionPlan(athleteData.id),
          fetchMealLogs(athleteData.user_id)
        ]);
        
      } catch (err) {
        console.error('Error fetching athlete data:', err);
        setError('Failed to load athlete data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAthleteData();
  }, [id]);

  // Fetch nutrition plan
  const fetchNutritionPlan = async (athleteId: string) => {
    try {
      // Look for assigned nutrition plan
      const { data: assignedPlanData, error: assignedPlanError } = await supabase
        .from('assigned_plans')
        .select(`
          id,
          nutrition_plan_id,
          start_date,
          assigned_at,
          nutrition_plan:nutrition_plans!nutrition_plan_id(id, name, description, total_calories, protein_grams, carbohydrate_grams, fat_grams, created_at, updated_at)
        `)
        .eq('athlete_id', athleteId)
        .is('program_template_id', null)
        .not('nutrition_plan_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (assignedPlanError) throw assignedPlanError;
      
      if (assignedPlanData?.nutrition_plan) {
        // First cast to unknown, then to our specific type to avoid TypeScript errors
        const planData = (assignedPlanData.nutrition_plan as unknown) as {
          id: string;
          name: string;
          description: string | null;
          total_calories?: number;
          protein_grams?: number;
          carbohydrate_grams?: number;
          fat_grams?: number;
          created_at: string;
          updated_at: string;
        };
        
        // Transform it to match our NutritionPlan interface
        const plan: NutritionPlan = {
          id: planData.id,
          name: planData.name,
          description: planData.description,
          athlete_id: athleteId,
          coach_id: '', // This might not be available in the response
          total_calories: planData.total_calories || 0,
          protein_grams: planData.protein_grams || 0,
          carbohydrate_grams: planData.carbohydrate_grams || 0,
          fat_grams: planData.fat_grams || 0,
          created_at: planData.created_at,
          updated_at: planData.updated_at
        };
        
        setNutritionPlan(plan);
      }
    } catch (err) {
      console.error('Error fetching nutrition plan:', err);
      // This is not a critical error, so just log it
    }
  };

  // Fetch meal logs based on timeframe
  const fetchMealLogs = async (userId: string) => {
    try {
      if (!userId) return;
      
      let startDate: Date;
      let endDate = new Date();
      
      if (chartTimeframe === 'week') {
        startDate = subDays(currentDate, 7); // Show last 7 days
      } else { // month
        startDate = startOfMonth(currentDate);
        endDate = endOfMonth(currentDate);
      }
      
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      
      // Fetch meal logs for the selected time period
      const { data, error } = await supabase
        .from('meal_logs')
        .select(`
          id, 
          user_id,
          meal_id,
          nutrition_plan_id,
          name,
          date,
          time,
          day_type,
          is_extra_meal,
          created_at,
          updated_at,
          meal:meals(
            *,
            food_items:meal_food_items(
              *,
              food_item:food_items(*)
            )
          )
        `)
        .eq('user_id', userId)
        .gte('date', formattedStartDate)
        .lte('date', formattedEndDate)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      if (data) {
        // We need to fetch extra meal food items separately for extra meals
        const extraMealIds = data
          .filter(meal => meal.is_extra_meal)
          .map(meal => meal.id);
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let extraMealItems: any[] = [];
        
        if (extraMealIds.length > 0) {
          const { data: extraItems, error: extraError } = await supabase
            .from('extra_meal_food_items')
            .select(`
              *,
              food_item:food_items(*)
            `)
            .in('meal_log_id', extraMealIds);
            
          if (extraError) throw extraError;
          extraMealItems = extraItems || [];
        }
        
        // Process data to include food items for all meal logs
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const processedData = data.map((mealLog: any) => {
          if (mealLog.is_extra_meal) {
            // For extra meals, get food items from extra_meal_food_items
            const foodItems = extraMealItems
              .filter(item => item.meal_log_id === mealLog.id)
              .map(item => {
                return {
                  id: item.id,
                  name: item.food_item.food_name || item.food_item.name,
                  protein_grams: item.food_item.protein_per_100g || 0,
                  carbohydrate_grams: item.food_item.carbs_per_100g || 0,
                  fat_grams: item.food_item.fat_per_100g || 0,
                  calories: item.food_item.calories_per_100g || 0,
                  serving_size: item.food_item.serving_size || 100,
                  serving_unit: item.food_item.serving_size_unit || 'g',
                  quantity: item.quantity || 1
                };
              });
              
            return {
              ...mealLog,
              food_items: foodItems
            };
          } else {
            // For regular meals, get food items from meal_food_items via the meal relation
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const foodItems = (mealLog.meal?.food_items || []).map((item: any) => {
              const foodItemData = item.food_item || {};
              return {
                id: item.id,
                name: foodItemData.food_name || foodItemData.name,
                protein_grams: foodItemData.protein_per_100g || 0,
                carbohydrate_grams: foodItemData.carbs_per_100g || 0,
                fat_grams: foodItemData.fat_per_100g || 0,
                calories: foodItemData.calories_per_100g || 0,
                serving_size: foodItemData.serving_size || 100,
                serving_unit: foodItemData.serving_size_unit || 'g',
                quantity: item.quantity || 1
              };
            });
            
            return {
              ...mealLog,
              food_items: foodItems
            };
          }
        });
        
        setMealLogs(processedData as MealLog[]);
        
        // Process the meal logs to generate daily nutrition summaries
        processMealLogsIntoDailyData(processedData as MealLog[], startDate, endDate);
      }
    } catch (err) {
      console.error('Error fetching meal logs:', err);
      setError('Failed to load nutrition data');
    }
  };

  // Process meal logs into daily nutrition data
  const processMealLogsIntoDailyData = (logs: MealLog[], startDate: Date, endDate: Date) => {
    // Create a map of dates to aggregate nutritional data
    const dailyData: Record<string, DailyNutrition> = {};
    
    // First, initialize all dates in the range
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    allDays.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      dailyData[dateStr] = {
        date: dateStr,
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        mealCount: 0,
        completionRate: 0
      };
    });
    
    // Then, populate with actual meal log data
    logs.forEach(log => {
      // Use log.date instead of log.created_at for grouping by date
      const dateStr = log.date || format(parseISO(log.created_at), 'yyyy-MM-dd');
      if (!dailyData[dateStr]) {
        // Create entry if doesn't exist (e.g., for dates outside the range)
        dailyData[dateStr] = {
          date: dateStr,
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0,
          mealCount: 0,
          completionRate: 0
        };
      }
      
      // Increment meal count
      dailyData[dateStr].mealCount++;
      
      // Sum up nutritional values
      log.food_items.forEach(food => {
        // Calculate actual nutrients based on quantity and per 100g values
        const multiplier = food.quantity / 100; // Convert per 100g to actual amount
        dailyData[dateStr].totalCalories += food.calories * multiplier;
        dailyData[dateStr].totalProtein += food.protein_grams * multiplier;
        dailyData[dateStr].totalCarbs += food.carbohydrate_grams * multiplier;
        dailyData[dateStr].totalFat += food.fat_grams * multiplier;
      });
      
      // Calculate completion rate (this is just a placeholder logic)
      // In a real app, you'd compare to expected meals in the nutrition plan
      const expectedMeals = 3; // Assuming 3 meals per day as a baseline
      dailyData[dateStr].completionRate = Math.min(100, Math.round((dailyData[dateStr].mealCount / expectedMeals) * 100));
    });
    
    // Convert to array and sort by date (oldest to newest for charts)
    const result = Object.values(dailyData).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    setDailyNutrition(result);
  };

  // Refresh data when timeframe changes
  useEffect(() => {
    if (athlete?.user_id) {
      fetchMealLogs(athlete.user_id);
    }
  }, [chartTimeframe, currentDate, athlete?.user_id]);

  // Calculate statistics
  const calculateStats = () => {
    if (!dailyNutrition || dailyNutrition.length === 0) {
      return {
        averageCalories: 0,
        maxCalories: 0,
        completionRate: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        daysTracked: 0
      };
    }
    
    const nonZeroEntries = dailyNutrition.filter(entry => entry.totalCalories > 0);
    
    const totalCalories = nonZeroEntries.reduce((sum, entry) => sum + entry.totalCalories, 0);
    const totalProtein = nonZeroEntries.reduce((sum, entry) => sum + entry.totalProtein, 0);
    const totalCarbs = nonZeroEntries.reduce((sum, entry) => sum + entry.totalCarbs, 0);
    const totalFat = nonZeroEntries.reduce((sum, entry) => sum + entry.totalFat, 0);
    
    const maxCalories = Math.max(...nonZeroEntries.map(entry => entry.totalCalories));
    const averageCalories = nonZeroEntries.length > 0 
      ? Math.round(totalCalories / nonZeroEntries.length) 
      : 0;
    
    const completionRates = nonZeroEntries.map(entry => entry.completionRate);
    const averageCompletionRate = completionRates.length > 0
      ? Math.round(completionRates.reduce((a, b) => a + b, 0) / completionRates.length)
      : 0;
      
    return {
      averageCalories,
      maxCalories,
      completionRate: averageCompletionRate,
      totalProtein: Math.round(totalProtein),
      totalCarbs: Math.round(totalCarbs),
      totalFat: Math.round(totalFat),
      daysTracked: nonZeroEntries.length
    };
  };

  const stats = calculateStats();

  // After processing meal logs data, sort and group by date
  useEffect(() => {
    if (mealLogs.length > 0) {
      // Sort by date (most recent first)
      const sortedLogs = [...mealLogs].sort((a, b) => {
        const dateA = new Date(a.date || a.created_at);
        const dateB = new Date(b.date || b.created_at);
        return dateB.getTime() - dateA.getTime();
      });
      
      setMealLogs(sortedLogs);
    }
  }, [mealLogs.length]); // Only run when the number of logs changes

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <PageHeader title="Error" />
        <Card>
          <div className="p-4 text-red-500">{error}</div>
        </Card>
      </div>
    );
  }

  if (!athlete) {
    return (
      <div className="p-4">
        <PageHeader title="Athlete Not Found" />
        <Card>
          <div className="p-4">The requested athlete could not be found.</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4">
      <PageHeader 
        title={`${athlete.first_name} ${athlete.last_name}'s Nutrition History`} 
        subtitle="View nutrition plans, meal logs, and macronutrient data"
      />

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
          <div className="mb-4 sm:mb-0">
            <Button
              onClick={() => navigate(`/admin/athletes/${id}`)}
              variant="secondary"
              className="mr-2"
            >
              Back to Athlete
            </Button>
          </div>
        </div>
      </div>
      
      <div className="grid gap-4 mb-6">
        {/* Nutrition Plan Card */}
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Current Nutrition Plan</h2>
            </div>
            
            {nutritionPlan ? (
              <div className="p-4 mb-4 border rounded-lg border-gray-700">
                <div className="mb-2">
                  <h3 className="text-lg font-medium text-indigo-600 dark:text-indigo-400">
                    {nutritionPlan.name}
                  </h3>
                  {nutritionPlan.description && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {nutritionPlan.description}
                    </p>
                  )}
                </div>
                
                <div className="grid grid-cols-1 gap-4 mt-4 sm:grid-cols-2">
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Daily Targets</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Calories:</span>
                        <span className="font-medium">{nutritionPlan.total_calories} kcal</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Protein:</span>
                        <span className="font-medium">{nutritionPlan.protein_grams}g</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Carbs:</span>
                        <span className="font-medium">{nutritionPlan.carbohydrate_grams}g</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Fat:</span>
                        <span className="font-medium">{nutritionPlan.fat_grams}g</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Macronutrient Breakdown</h4>
                    <MacrosPieChart 
                      protein={nutritionPlan.protein_grams}
                      carbs={nutritionPlan.carbohydrate_grams}
                      fat={nutritionPlan.fat_grams}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center border rounded-lg border-gray-700">
                <p className="text-gray-600 dark:text-gray-400">No nutrition plan currently assigned.</p>
              </div>
            )}
          </div>
        </Card>
        
        {/* Stats Card */}
        <Card>
          <div className="p-4">
            <h2 className="mb-4 text-xl font-semibold">Nutrition Statistics</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-4 sm:grid-cols-4">
              <div className="p-4 border rounded-lg border-gray-700">
                <div className="flex items-center mb-2">
                  <FiPieChart className="mr-2 text-indigo-500" />
                  <span className="text-sm text-gray-500">Average Calories</span>
                </div>
                <div className="text-xl font-bold">{stats.averageCalories.toLocaleString()} kcal</div>
              </div>
              
              <div className="p-4 border rounded-lg border-gray-700">
                <div className="flex items-center mb-2">
                  <FiTrendingUp className="mr-2 text-green-500" />
                  <span className="text-sm text-gray-500">Max Calories</span>
                </div>
                <div className="text-xl font-bold">{stats.maxCalories.toLocaleString()} kcal</div>
              </div>
              
              <div className="p-4 border rounded-lg border-gray-700">
                <div className="flex items-center mb-2">
                  <FiCheckCircle className="mr-2 text-yellow-500" />
                  <span className="text-sm text-gray-500">Avg. Completion</span>
                </div>
                <div className="text-xl font-bold">{stats.completionRate}%</div>
              </div>
              
              <div className="p-4 border rounded-lg border-gray-700">
                <div className="flex items-center mb-2">
                  <FiCalendar className="mr-2 text-purple-500" />
                  <span className="text-sm text-gray-500">Days Tracked</span>
                </div>
                <div className="text-xl font-bold">{stats.daysTracked}</div>
              </div>
            </div>
            
            <div className="p-4 border rounded-lg border-gray-700">
              <h3 className="mb-3 text-md font-medium">Macronutrient Totals</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-sm text-gray-500">Protein</div>
                  <div className="mt-1 text-lg font-semibold text-red-500">{stats.totalProtein}g</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Carbs</div>
                  <div className="mt-1 text-lg font-semibold text-yellow-500">{stats.totalCarbs}g</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Fat</div>
                  <div className="mt-1 text-lg font-semibold text-blue-500">{stats.totalFat}g</div>
                </div>
              </div>
            </div>
          </div>
        </Card>
        
        {/* Chart Card */}
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Calorie History</h2>
              
              <div className="flex items-center space-x-2">
                <Button 
                  variant={chartTimeframe === 'week' ? 'primary' : 'secondary'} 
                  size="sm"
                  onClick={() => setChartTimeframe('week')}
                >
                  Past 7 Days
                </Button>
                <Button 
                  variant={chartTimeframe === 'month' ? 'primary' : 'secondary'} 
                  size="sm"
                  onClick={() => setChartTimeframe('month')}
                >
                  Month View
                </Button>
              </div>
            </div>
            
            <NutritionBarChart 
              data={dailyNutrition}
              targetCalories={nutritionPlan?.total_calories || null}
            />

            {/* Month navigation controls */}
            <MonthNavigation 
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              timeframe={chartTimeframe}
            />
          </div>
        </Card>
        
        {/* Meal Logs Table */}
        <Card>
          <div className="p-4">
            <h2 className="mb-4 text-xl font-semibold">Recent Meal Logs</h2>
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-sm text-gray-400">Showing logs for:</span>
              <Button 
                variant={chartTimeframe === 'week' ? 'primary' : 'secondary'} 
                size="sm"
                onClick={() => setChartTimeframe('week')}
              >
                Past 7 Days
              </Button>
              <Button 
                variant={chartTimeframe === 'month' ? 'primary' : 'secondary'} 
                size="sm"
                onClick={() => setChartTimeframe('month')}
              >
                Month View
              </Button>
            </div>
            
            {mealLogs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-400">Date</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-400">Meal</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-400">Foods</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-400">Calories</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-400">P/C/F</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {/* Group and display logs by date */}
                    {(() => {
                      // Group logs by date
                      const groupedLogs: Record<string, MealLog[]> = {};
                      
                      mealLogs.forEach(log => {
                        const dateStr = log.date || format(parseISO(log.created_at), 'yyyy-MM-dd');
                        if (!groupedLogs[dateStr]) {
                          groupedLogs[dateStr] = [];
                        }
                        groupedLogs[dateStr].push(log);
                      });
                      
                      // Sort dates (newest first)
                      const sortedDates = Object.keys(groupedLogs).sort((a, b) => 
                        new Date(b).getTime() - new Date(a).getTime()
                      );
                      
                      return sortedDates.map(dateStr => {
                        const logs = groupedLogs[dateStr];
                        const formattedDate = format(parseISO(dateStr), 'EEEE, MMMM dd, yyyy');
                        
                        return (
                          <React.Fragment key={dateStr}>
                            {/* Date header row */}
                            <tr className="bg-gray-800/50">
                              <td colSpan={5} className="px-2 py-2 text-sm font-medium">
                                {formattedDate}
                              </td>
                            </tr>
                            
                            {/* Meal logs for this date */}
                            {logs.map(log => {
                              // Calculate total macros for this meal log
                              const totalCalories = log.food_items.reduce((sum, food) => {
                                const multiplier = food.quantity / 100; // Convert per 100g to actual amount
                                return sum + (food.calories * multiplier);
                              }, 0);
                              
                              const totalProtein = log.food_items.reduce((sum, food) => {
                                const multiplier = food.quantity / 100; // Convert per 100g to actual amount
                                return sum + (food.protein_grams * multiplier);
                              }, 0);
                              
                              const totalCarbs = log.food_items.reduce((sum, food) => {
                                const multiplier = food.quantity / 100; // Convert per 100g to actual amount
                                return sum + (food.carbohydrate_grams * multiplier);
                              }, 0);
                              
                              const totalFat = log.food_items.reduce((sum, food) => {
                                const multiplier = food.quantity / 100; // Convert per 100g to actual amount
                                return sum + (food.fat_grams * multiplier);
                              }, 0);
                              
                              // List of food names
                              const foodNames = log.food_items.map(food => food.name).join(", ");
                              
                              return (
                                <tr key={log.id} className="hover:bg-gray-700/30">
                                  <td className="px-2 py-2 text-sm">
                                    {/* Fix time display - don't use parseISO on time string */}
                                    {log.time ? formatTimeString(log.time) : format(parseISO(log.created_at), 'h:mm a')}
                                  </td>
                                  <td className="px-2 py-2 text-sm">
                                    {log.name}
                                    {log.is_extra_meal && <span className="ml-1 text-xs text-yellow-500">(Extra)</span>}
                                  </td>
                                  <td className="px-2 py-2 text-sm max-w-xs truncate" title={foodNames}>
                                    {foodNames || "..."}
                                  </td>
                                  <td className="px-2 py-2 text-sm">
                                    {Math.round(totalCalories)}
                                  </td>
                                  <td className="px-2 py-2 text-sm">
                                    <span className="text-red-500">{Math.round(totalProtein)}g</span> / 
                                    <span className="text-yellow-500"> {Math.round(totalCarbs)}g</span> / 
                                    <span className="text-blue-500"> {Math.round(totalFat)}g</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500 bg-gray-50 rounded dark:bg-gray-700/50 dark:text-gray-400">
                No meal logs found for the selected time period.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AthleteNutritionPage; 