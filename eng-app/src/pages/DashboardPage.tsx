import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectUser, selectProfile } from '../store/slices/authSlice';
import { supabase } from '../services/supabaseClient'; // Import supabase client
import NextWorkoutWidget from '../components/dashboard/NextWorkoutWidget';
import NutritionWidget from '../components/dashboard/NutritionWidget';
import StepGoalWidget from '../components/dashboard/StepGoalWidget';

// Define types for the fetched data
interface AssignedPlan {
  program_template_id: string | null;
  nutrition_plan_id: string | null;
}

interface StepGoal {
    daily_steps: number | null;
}

const DashboardPage: React.FC = () => {
  const user = useSelector(selectUser);
  const profile = useSelector(selectProfile);

  // State for dashboard specific data
  const [assignedPlan, setAssignedPlan] = useState<AssignedPlan | null>(null);
  const [stepGoal, setStepGoal] = useState<StepGoal | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user || !profile) return; // Don't fetch if user is not available

      setIsLoadingData(true);
      setFetchError(null);

      try {
        // Fetch most recent assigned program from assigned_plans table
        console.log("Fetching program for athlete profile ID:", profile.id);
        const { data: planData, error: planError } = await supabase
          .from('assigned_plans')
          .select(`
            program_template_id,
            nutrition_plan_id,
            start_date
          `)
          .eq('athlete_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (planError) throw planError;
        console.log("Program data from assigned_plans:", planData);
        
        // Set the combined plan data directly
        const combinedPlan = {
          program_template_id: planData?.program_template_id || null,
          nutrition_plan_id: planData?.nutrition_plan_id || null
        };
        console.log("Setting assigned plan:", combinedPlan);
        setAssignedPlan(combinedPlan);

        // Fetch active step goal
        const { data: goalData, error: goalError } = await supabase
          .from('step_goals')
          .select('daily_steps')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (goalError) throw goalError;
        setStepGoal(goalData); // Will be null if no active goal

      } catch (error: unknown) {
        console.error("Error fetching dashboard data:", error);
        let message = 'Failed to load dashboard data.';
        if (typeof error === 'object' && error !== null && 'message' in error) {
            message = (error as Error).message;
        }
        setFetchError(message);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchDashboardData();

    // Dependency array: Refetch if user or profile changes
  }, [user, profile]);

  // Combine loading states
  const isLoading = !profile || isLoadingData;

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="mb-6 animate-pulse">
          <div className="w-2/3 h-12 mb-4 bg-gray-200 rounded dark:bg-gray-700"></div>
          <div className="w-1/3 h-4 bg-gray-200 rounded dark:bg-gray-700"></div>
        </div>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="overflow-hidden bg-white rounded-lg shadow-md dark:bg-gray-800 animate-pulse">
              <div className="p-4">
                <div className="w-3/4 h-6 mb-4 bg-gray-200 rounded dark:bg-gray-700"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded dark:bg-gray-700"></div>
                  <div className="w-5/6 h-4 bg-gray-200 rounded dark:bg-gray-700"></div>
                  <div className="w-4/6 h-4 bg-gray-200 rounded dark:bg-gray-700"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-bold text-gray-800 dark:text-white">
          Welcome, {profile?.email?.split('@')[0] || 'Athlete'}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Here's your training overview for today.
        </p>
      </div>

      {fetchError && (
        <div className="p-4 mb-6 border-l-4 border-red-500 rounded shadow-sm bg-red-50 dark:bg-red-900/20">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700 dark:text-red-400">
                {fetchError}
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="col-span-1">
          <NextWorkoutWidget programTemplateId={assignedPlan?.program_template_id} />
        </div>
        <div className="col-span-1">
          <NutritionWidget nutritionPlanId={assignedPlan?.nutrition_plan_id} />
        </div>
        <div className="col-span-1">
          <StepGoalWidget dailyGoal={stepGoal?.daily_steps} />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage; 