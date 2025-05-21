import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectProfile } from '../store/slices/authSlice';
import { getAvailableNutritionPlans, assignNutritionPlan } from '../services/nutritionPlanService';

interface NutritionPlan {
  id: string;
  name: string;
  description?: string;
  total_calories?: number;
  protein_grams?: number;
  carbohydrate_grams?: number;
  fat_grams?: number;
  created_at: string;
  coach_id: string;
  is_public: boolean;
}

const NutritionPlansPage: React.FC = () => {
  const [nutritionPlans, setNutritionPlans] = useState<NutritionPlan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [assigningPlan, setAssigningPlan] = useState<string | null>(null);
  const profile = useSelector(selectProfile);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNutritionPlans = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getAvailableNutritionPlans();
        
        if (result.error) {
          setError(result.error);
        } else {
          setNutritionPlans(result.nutritionPlans);
        }
      } catch (err) {
        console.error('Error fetching nutrition plans:', err);
        setError('Failed to load nutrition plans. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNutritionPlans();
  }, []);

  const handleSelectPlan = async (planId: string) => {
    if (!profile?.id) return;
    
    setAssigningPlan(planId);
    setError(null);
    
    try {
      const result = await assignNutritionPlan(profile.id, planId);
      
      if (result.error) {
        setError(result.error);
      } else {
        // Navigate back to dashboard after successfully selecting a plan
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Error assigning nutrition plan:', err);
      setError('Failed to assign nutrition plan. Please try again.');
    } finally {
      setAssigningPlan(null);
    }
  };

  // Format macros for display
  const formatMacros = (plan: NutritionPlan) => {
    const parts = [];
    if (plan.total_calories) parts.push(`${plan.total_calories} calories`);
    if (plan.protein_grams) parts.push(`${plan.protein_grams}g protein`);
    if (plan.carbohydrate_grams) parts.push(`${plan.carbohydrate_grams}g carbs`);
    if (plan.fat_grams) parts.push(`${plan.fat_grams}g fat`);
    
    return parts.length > 0 ? parts.join(' • ') : 'No nutrition details specified';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Choose a Nutrition Plan
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Select a nutrition plan that best fits your goals and preferences.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-md">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : nutritionPlans.length === 0 ? (
        <div className="text-center py-10 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-700 dark:text-gray-300 text-lg">
            No nutrition plans are available at this time.
          </p>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Please contact your coach to create a nutrition plan for you.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {nutritionPlans.map((plan) => (
            <div 
              key={plan.id} 
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700"
            >
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                    {plan.name}
                  </h3>
                  <div className="text-xs font-medium px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300">
                    {plan.is_public ? 'Public' : 'Assigned'}
                  </div>
                </div>
                
                <div className="text-sm text-indigo-600 dark:text-indigo-400 mb-3">
                  {formatMacros(plan)}
                </div>
                
                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={assigningPlan === plan.id}
                  className="w-full mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                >
                  {assigningPlan === plan.id ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Selecting...
                    </span>
                  ) : (
                    'Select This Plan'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NutritionPlansPage; 