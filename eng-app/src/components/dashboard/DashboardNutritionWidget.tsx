import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectProfile } from '../../store/slices/authSlice';
import { getUserNutritionPlan } from '../../services/nutritionPlanService';
import MealLoggingWidget from './MealLoggingWidget';
import { FiList, FiChevronRight } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const DashboardNutritionWidget: React.FC = () => {
  const profile = useSelector(selectProfile);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [nutritionPlanId, setNutritionPlanId] = useState<string | null>(null);

  useEffect(() => {
    const fetchNutritionPlan = async () => {
      if (!profile?.id) return;
      
      try {
        setIsLoading(true);
        const result = await getUserNutritionPlan(profile.id);
        
        if (result.nutritionPlan) {
          setNutritionPlanId(result.nutritionPlan.id);
        } else {
          setError('No nutrition plan assigned');
        }
      } catch (err) {
        console.error('Error fetching nutrition plan:', err);
        setError('Failed to load nutrition plan');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNutritionPlan();
  }, [profile?.id]);

  // Display loading state
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Nutrition</h2>
        <div className="flex justify-center py-8">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  // Display error state
  if (error || !nutritionPlanId) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Nutrition</h2>
        <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 rounded-md">
          {error || 'No nutrition plan found'}
        </div>
        <div className="mt-4 flex justify-end">
          <Link 
            to="/nutrition" 
            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium flex items-center"
          >
            View nutrition plan
            <FiChevronRight className="ml-1" />
          </Link>
        </div>
      </div>
    );
  }

  // Render the meal logging widget with the nutrition plan
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">     
      <MealLoggingWidget nutritionPlanId={nutritionPlanId} />
    </div>
  );
};

export default DashboardNutritionWidget;