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
      if (!user) return; // Don't fetch if user is not available

      setIsLoadingData(true);
      setFetchError(null);

      try {
        // Fetch assigned plan (program & nutrition)
        const { data: planData, error: planError } = await supabase
          .from('assigned_plans')
          .select('program_template_id, nutrition_plan_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle(); // Use maybeSingle to handle no active plan gracefully
        
        if (planError) throw planError;
        setAssignedPlan(planData); // Will be null if no active plan

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

    // Dependency array: Refetch if user changes
  }, [user]); 

  // Combine loading states
  const isLoading = !profile || isLoadingData;

  if (isLoading) {
      // TODO: Use a more visually appealing loading indicator/skeleton screen
      return (
        <div className="container mx-auto px-4 py-8 text-center">
          Loading dashboard...
        </div>
      );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">
        Welcome back, {user?.email}! 
      </h1>

      {fetchError && (
         <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {fetchError}</span>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Pass fetched data as props to widgets (or widgets can fetch themselves) */}
          <NextWorkoutWidget programTemplateId={assignedPlan?.program_template_id} />
          <NutritionWidget nutritionPlanId={assignedPlan?.nutrition_plan_id} />
          <StepGoalWidget dailyGoal={stepGoal?.daily_steps} />
      </div>
    </div>
  );
};

export default DashboardPage; 