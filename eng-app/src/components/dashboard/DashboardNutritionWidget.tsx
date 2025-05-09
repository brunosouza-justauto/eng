import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectProfile } from '../../store/slices/authSlice';
import { getUserNutritionPlan } from '../../services/nutritionPlanService';
import MealLoggingWidget from './MealLoggingWidget';
import { FiChevronRight, FiExternalLink } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import Card from '../ui/Card';

const DashboardNutritionWidget: React.FC = () => {
  const profile = useSelector(selectProfile);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [nutritionPlanId, setNutritionPlanId] = useState<string | null>(null);
  const [selectedDayType, setSelectedDayType] = useState<string | null>(null);

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

  // Handle day type change from MealLoggingWidget
  const handleDayTypeChange = (dayType: string | null) => {
    setSelectedDayType(dayType);
  };

  // Create the header component
  const header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
        <h2 className="text-lg font-medium">Nutrition</h2>
      </div>
      {(error || !nutritionPlanId) && !isLoading ? (
        <Link 
          to="/nutrition-plans" 
          className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium flex items-center"
        >
          View available plans
          <FiChevronRight className="ml-1" />
        </Link>
      ) : nutritionPlanId && !isLoading ? (
        <Link 
          to={`/meal-plan/${nutritionPlanId}${selectedDayType ? `?dayType=${selectedDayType}` : ''}`}
          className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium flex items-center"
        >
          View Plan
          <FiExternalLink className="ml-1 w-3.5 h-3.5" />
        </Link>
      ) : null}
    </div>
  );

  // Display loading state
  if (isLoading) {
    return (
      <Card header={header} className="h-full flex flex-col" variant="default">
        <div className="flex justify-center py-8">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
          </div>
        </div>
      </Card>
    );
  }

  // Display error state
  if (error || !nutritionPlanId) {
    return (
      <Card header={header} className="h-full flex flex-col" variant="default">
        <div className="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 p-3 rounded-md">
          You don't have a nutrition plan assigned yet. Choose a plan to start tracking your nutrition!
        </div>
      </Card>
    );
  }

  // Render the meal logging widget with the nutrition plan
  return (
    <Card header={header} className="h-full flex flex-col p-0" variant="default" padding="none">     
      <MealLoggingWidget 
        nutritionPlanId={nutritionPlanId} 
        hideHeader={true} 
        onDayTypeChange={handleDayTypeChange}
      />
    </Card>
  );
};

export default DashboardNutritionWidget;