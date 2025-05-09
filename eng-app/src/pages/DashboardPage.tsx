import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { selectUser, selectProfile } from '../store/slices/authSlice';
import { supabase } from '../services/supabaseClient'; // Import supabase client
import NextWorkoutWidget from '../components/dashboard/NextWorkoutWidget';
import DashboardNutritionWidget from '../components/dashboard/DashboardNutritionWidget';
import StepGoalWidget from '../components/dashboard/StepGoalWidget';
import CheckInReminderWidget from '../components/dashboard/CheckInReminderWidget';
import LatestCheckInWidget from '../components/dashboard/LatestCheckInWidget'; // Import the new widget
import { format, startOfWeek, endOfWeek, addWeeks, parseISO } from 'date-fns';

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
  const [hasWeeklyCheckIn, setHasWeeklyCheckIn] = useState<boolean>(false);
  const [lastCheckInDate, setLastCheckInDate] = useState<string | null>(null);

  // Memoize the date calculations to prevent re-renders
  const { currentWeekStart, currentWeekEnd } = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = endOfWeek(new Date(), { weekStartsOn: 1 });
    return { currentWeekStart: start, currentWeekEnd: end };
  }, []);
  
  // Calculate the next check-in date
  const getNextCheckInDate = (): Date => {
    const today = new Date();
    
    if (lastCheckInDate) {
      // If there's a previous check-in, calculate next date based on that
      const lastDate = parseISO(lastCheckInDate);
      
      // If we already submitted for this week, next check-in is next week
      if (hasWeeklyCheckIn) {
        return addWeeks(lastDate, 1);
      }
    }
    
    // If we don't have a last check-in date or it wasn't in this week,
    // the next check-in is today
    return today;
  };

  // Get formatted date display
  const getNextCheckInDayDisplay = (): string => {
    const nextDate = getNextCheckInDate();
    return format(nextDate, 'EEEE');
  };

  // Format the next check-in date for display
  const getNextCheckInDateDisplay = (): string => {
    const nextDate = getNextCheckInDate();
    return format(nextDate, 'MMMM d, yyyy');
  };

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
          .eq('user_id', profile.id)
          .eq('is_active', true)
          .maybeSingle();

        if (goalError) throw goalError;
        setStepGoal(goalData); // Will be null if no active goal

        // Get the most recent check-in
        const { data: recentData, error: recentError } = await supabase
          .from('check_ins')
          .select('check_in_date')
          .eq('user_id', profile.user_id)
          .order('check_in_date', { ascending: false })
          .limit(1);
        
        if (recentError) throw recentError;
        
        // Get check-ins for the current week
        const { data: weeklyData, error: weeklyError } = await supabase
          .from('check_ins')
          .select('id, check_in_date')
          .eq('user_id', profile.user_id)
          .gte('check_in_date', currentWeekStart.toISOString())
          .lte('check_in_date', currentWeekEnd.toISOString());
        
        if (weeklyError) throw weeklyError;
        
        // Set the check-in status
        const hasCheckInThisWeek = weeklyData && weeklyData.length > 0;
        setHasWeeklyCheckIn(hasCheckInThisWeek);
        
        // Set the most recent check-in date if available
        if (recentData && recentData.length > 0) {
          setLastCheckInDate(recentData[0].check_in_date);
        }

      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setFetchError("Failed to load your dashboard data. Please try again later.");
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchDashboardData();
  }, [user, profile, currentWeekStart, currentWeekEnd]);

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
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-bold text-gray-800 dark:text-white">
          Welcome, {profile?.first_name || 'Athlete'}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Here's your day overview for today.
        </p>
        <Link 
          to="/check-in/new" 
          className="flex justify-center items-center w-full px-4 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 shadow-sm font-medium transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          Weekly Check-in
        </Link>
        <div className="mt-2 text-center text-sm font-medium">
          {isLoadingData ? (
            <span className="text-gray-400">Loading check-in status...</span>
          ) : hasWeeklyCheckIn ? (
            <span className="text-green-600 dark:text-green-400">
              Next check-in: {getNextCheckInDayDisplay()}, {getNextCheckInDateDisplay()}
            </span>image.png
          ) : (
            <span className="text-yellow-600 dark:text-yellow-400">
              Check-in due this week.<br />Please complete by {format(currentWeekEnd, 'EEEE, MMMM d')}
            </span>
          )}
        </div>
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
          <DashboardNutritionWidget />
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