import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MealPlannerIntegrated from '../components/admin/MealPlannerIntegrated';
import { getNutritionPlanById } from '../services/mealPlanningService';

const MealPlannerPage: React.FC = () => {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const [nutritionPlan, setNutritionPlan] = useState<any>(null); 
  const [isLoading, setIsLoading] = useState(!!planId);
  const [error, setError] = useState<string | null>(null);

  // If planId is provided, fetch the plan details for editing
  useEffect(() => {
    const fetchPlan = async () => {
      if (!planId) return; // No plan ID means we're creating a new one
      
      try {
        setIsLoading(true);
        const plan = await getNutritionPlanById(planId);
        
        if (!plan) {
          setError('Nutrition plan not found');
          return;
        }
        
        setNutritionPlan(plan);
      } catch (err) {
        console.error('Error fetching nutrition plan:', err);
        setError('Failed to load nutrition plan');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPlan();
  }, [planId]);

  const handleClose = () => {
    navigate('/admin/mealplans');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 p-4 rounded-md">
        <h2 className="text-red-800 dark:text-red-300 font-medium text-lg mb-2">Error</h2>
        <p className="text-red-700 dark:text-red-400">{error}</p>
        <button 
          onClick={handleClose}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Back to Meal Plans
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          {planId ? 'Edit Nutrition Plan' : 'Create New Nutrition Plan'}
        </h1>
        <button
          onClick={handleClose}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          Back to Meal Plans
        </button>
      </div>
      
      <MealPlannerIntegrated 
        planId={planId} 
        initialPlan={nutritionPlan}
        onSave={handleClose}
        onCancel={handleClose}
      />
    </div>
  );
};

export default MealPlannerPage; 