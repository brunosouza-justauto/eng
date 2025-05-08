import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { selectUser, selectProfile } from '../store/slices/authSlice';
import { supabase } from '../services/supabaseClient'; // Import supabase client
import NextWorkoutWidget from '../components/dashboard/NextWorkoutWidget';
import NutritionWidget from '../components/dashboard/NutritionWidget';
import StepGoalWidget from '../components/dashboard/StepGoalWidget';
import CheckInReminderWidget from '../components/dashboard/CheckInReminderWidget';
import LatestCheckInWidget from '../components/dashboard/LatestCheckInWidget'; // Import the new widget

// Define types for the fetched data
interface AssignedPlan {
  program_template_id: string | null;
  nutrition_plan_id: string | null;
}

interface StepGoal {
  daily_steps: number;
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
        // Create a combined plan object
        const combinedPlan: AssignedPlan = {
          program_template_id: null,
          nutrition_plan_id: null
        };

        // Fetch most recent program assignment
        console.log("Fetching program for athlete profile ID:", profile.id);
        const { data: programData, error: programError } = await supabase
          .from('assigned_plans')
          .select('program_template_id')
          .eq('athlete_id', profile.id)
          .not('program_template_id', 'is', null) // Must have program_template_id
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (programError) {
          console.error("Error fetching program assignment:", programError);
        } else if (programData) {
          console.log("Program assignment found:", programData);
          combinedPlan.program_template_id = programData.program_template_id;
        }

        // Fetch most recent nutrition plan assignment
        const { data: nutritionData, error: nutritionError } = await supabase
          .from('assigned_plans')
          .select('nutrition_plan_id')
          .eq('athlete_id', profile.id)
          .is('program_template_id', null) // Program template ID must be null
          .not('nutrition_plan_id', 'is', null) // Must have nutrition_plan_id
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (nutritionError) {
          console.error("Error fetching nutrition plan assignment:", nutritionError);
        } else if (nutritionData) {
          console.log("Nutrition plan assignment found:", nutritionData);
          combinedPlan.nutrition_plan_id = nutritionData.nutrition_plan_id;
        }
        
        // Set the combined plan data
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

      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setFetchError("Failed to load your dashboard data. Please try again later.");
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchDashboardData();
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
          {[1, 2, 3, 4].map((i) => (
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="mb-1 text-2xl font-bold text-gray-800 dark:text-white">
            Welcome, {profile?.first_name || 'Athlete'}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Here's your day overview for today.
          </p>
        </div>
        <Link 
          to="/check-in/new" 
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 shadow-sm font-medium transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          New Check-in
        </Link>
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
      
      {/* Dashboard widgets */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <div className="col-span-1">
          <NextWorkoutWidget programTemplateId={assignedPlan?.program_template_id} />
        </div>
        <div className="col-span-1">
          <NutritionWidget nutritionPlanId={assignedPlan?.nutrition_plan_id} />
        </div>
        <div className="col-span-1">
          <StepGoalWidget dailyGoal={stepGoal?.daily_steps} />
        </div>
        <div className="col-span-1">
          <CheckInReminderWidget />
        </div>
        <div className="col-span-1">
          <LatestCheckInWidget />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage; 