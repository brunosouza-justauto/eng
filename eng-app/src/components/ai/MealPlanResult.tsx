import React, { useState } from 'react';
import { AIMealPlan } from '../../services/openRouterService';
import { FiPlusCircle, FiChevronDown, FiChevronUp, FiInfo } from 'react-icons/fi';

interface MealPlanResultProps {
  mealPlan: AIMealPlan;
  onSaveMealPlan: () => void;
  isSaving: boolean;
}

/**
 * Component to display the AI-generated meal plan result
 */
const MealPlanResult: React.FC<MealPlanResultProps> = ({ 
  mealPlan, 
  onSaveMealPlan,
  isSaving 
}) => {
  const [expandedDayType, setExpandedDayType] = useState<string | null>(
    mealPlan.day_types.length > 0 ? mealPlan.day_types[0].type : null
  );
  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({});

  // Toggle day type expansion
  const toggleDayType = (dayType: string) => {
    setExpandedDayType(expandedDayType === dayType ? null : dayType);
  };

  // Toggle meal expansion
  const toggleMeal = (mealId: string) => {
    setExpandedMeals(prev => ({
      ...prev,
      [mealId]: !prev[mealId]
    }));
  };

  // Check if a meal is expanded
  const isMealExpanded = (dayType: string, mealName: string) => {
    const mealId = `${dayType}-${mealName}`;
    return !!expandedMeals[mealId];
  };

  // Format macros for display
  const formatMacros = (calories: number, protein: number, carbs: number, fat: number) => {
    return `${calories} kcal | P: ${protein}g | C: ${carbs}g | F: ${fat}g`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white">
          {mealPlan.plan_name}
        </h3>
        <button
          onClick={onSaveMealPlan}
          disabled={isSaving}
          className={`flex items-center px-4 py-2 text-white rounded-md ${
            isSaving 
              ? 'bg-green-500 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {isSaving ? (
            <>
              <svg className="w-4 h-4 mr-2 -ml-1 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            <>
              <FiPlusCircle className="mr-2" />
              Create Meal Plan
            </>
          )}
        </button>
      </div>

      <div className="mb-4 p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-md">
        <div className="flex items-start">
          <FiInfo className="text-indigo-600 dark:text-indigo-400 mr-2 mt-1 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-gray-800 dark:text-white mb-1">Plan Overview</h4>
            <p className="text-gray-700 dark:text-gray-300 text-sm mb-2">
              {mealPlan.description}
            </p>
            <div className="font-medium text-gray-800 dark:text-white">
              {formatMacros(
                mealPlan.total_calories,
                mealPlan.total_protein,
                mealPlan.total_carbs,
                mealPlan.total_fat
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {mealPlan.day_types.map((dayType) => (
          <div key={dayType.type} className="py-3">
            <div 
              className="flex justify-between items-center cursor-pointer"
              onClick={() => toggleDayType(dayType.type)}
            >
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-indigo-600 mr-2"></div>
                <h4 className="font-medium text-gray-800 dark:text-white">{dayType.type}</h4>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                  {formatMacros(
                    dayType.total_calories,
                    dayType.total_protein,
                    dayType.total_carbs,
                    dayType.total_fat
                  )}
                </span>
                {expandedDayType === dayType.type ? (
                  <FiChevronUp className="text-gray-500 dark:text-gray-400" />
                ) : (
                  <FiChevronDown className="text-gray-500 dark:text-gray-400" />
                )}
              </div>
            </div>
            
            {expandedDayType === dayType.type && (
              <div className="mt-3 pl-5">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                  {dayType.description}
                </p>
                
                <div className="space-y-3">
                  {dayType.meals.map((meal) => (
                    <div key={meal.name} className="bg-gray-50 dark:bg-gray-700 rounded-md p-3">
                      <div 
                        className="flex justify-between items-center cursor-pointer"
                        onClick={() => toggleMeal(`${dayType.type}-${meal.name}`)}
                      >
                        <div className="flex items-center">
                          <h5 className="font-medium text-gray-800 dark:text-white">{meal.name}</h5>
                          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                            {meal.time}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                            {formatMacros(
                              meal.total_calories,
                              meal.total_protein,
                              meal.total_carbs,
                              meal.total_fat
                            )}
                          </span>
                          {isMealExpanded(dayType.type, meal.name) ? (
                            <FiChevronUp className="text-gray-500 dark:text-gray-400" />
                          ) : (
                            <FiChevronDown className="text-gray-500 dark:text-gray-400" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                          {meal.notes}
                        </span>
                      </div>
                      
                      {isMealExpanded(dayType.type, meal.name) && (
                        <div className="mt-3 border-t border-gray-200 dark:border-gray-600 pt-3">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead>
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                  Food
                                </th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                  Amount
                                </th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                  Calories
                                </th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                  P/C/F
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                              {meal.foods.map((food, index) => (
                                <tr key={index}>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                                    {food.name}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200 text-right">
                                    {food.quantity} {food.unit}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200 text-right">
                                    {food.calories}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200 text-right">
                                    {food.protein}g/{food.carbs}g/{food.fat}g
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {mealPlan.notes && (
        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
          <h4 className="font-medium text-gray-800 dark:text-white mb-1">Notes</h4>
          <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-line">
            {mealPlan.notes}
          </p>
        </div>
      )}
    </div>
  );
};

export default MealPlanResult;
