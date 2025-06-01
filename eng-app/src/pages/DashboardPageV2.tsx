import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectUser, selectProfile } from '../store/slices/authSlice';
import { supabase } from '../services/supabaseClient';
import DashboardNutritionWidget from '../components/dashboard/DashboardNutritionWidget';
import CheckInReminderWidget from '../components/dashboard/CheckInReminderWidget';
import LatestCheckInWidget from '../components/dashboard/LatestCheckInWidget';
import { getCurrentDayOfWeek } from '../components/dashboard/NextWorkoutWidget';
import NextWorkoutWidget from '../components/dashboard/NextWorkoutWidget';
import StepGoalWidget from '../components/dashboard/StepGoalWidget';
import MissedMealsAlert from '../components/dashboard/MissedMealsAlert';
import SupplementDashboard from '../components/supplements/SupplementDashboard';
import { startOfWeek, endOfWeek } from 'date-fns';
import { FiActivity, FiCheck } from 'react-icons/fi';
import { GiMuscleUp, GiMeal } from 'react-icons/gi';
import { FaWalking } from 'react-icons/fa';
import WaterBottleIcon from '../components/navigation/WaterBottleIcon';
import { format } from 'date-fns';
import WaterTrackingPage from './WaterTrackingPage';

// Define types for the fetched data
interface AssignedPlan {
  program_template_id: string | null;
  nutrition_plan_id: string | null;
  program?: {
    id: string;
    name: string;
    description: string | null;
    version?: number;
  };
}

interface StepGoal {
  daily_steps: number;
}

// Tab type enum
type TabType = 'workout' | 'supplements' | 'nutrition' | 'steps' | 'checkin' | 'water';

// Bottom Navigation Item Type
interface NavItem {
  name: string;
  icon: React.ReactNode;
  tab: TabType;
  hasNotification?: boolean;
}

// Define CSS to hide footer on mobile
const HIDE_FOOTER_STYLE = `
  @media (max-width: 767px) {
    footer {
      display: none !important;
    }
  }
`;

const DashboardPageV2: React.FC = () => {
  const user = useSelector(selectUser);
  const profile = useSelector(selectProfile);
  const navigate = useNavigate();

  // State for dashboard specific data
  const [assignedPlan, setAssignedPlan] = useState<AssignedPlan | null>(null);
  const [stepGoal, setStepGoal] = useState<StepGoal | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [hasWeeklyCheckIn, setHasWeeklyCheckIn] = useState<boolean>(false);
  
  // Additional states for tab notifications
  const [hasMissedMeals, setHasMissedMeals] = useState<boolean>(false);
  const [workoutCompleted, setWorkoutCompleted] = useState<boolean>(false);
  const [stepsCompleted, setStepsCompleted] = useState<boolean>(false);
  
  // State for active tab
  const [activeTab, setActiveTab] = useState<TabType>('workout');

  // Effect to add and remove footer hiding styles
  useEffect(() => {
    // Create style element for hiding footer
    const styleElement = document.createElement('style');
    styleElement.innerHTML = HIDE_FOOTER_STYLE;
    document.head.appendChild(styleElement);

    // Cleanup function to remove styles when component unmounts
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // State for water tracking notification
  const [waterGoalCompleted, setWaterGoalCompleted] = useState<boolean>(false);
  
  // Navigation items for bottom menu with notification status
  const navItems: NavItem[] = useMemo(() => [
    {
      name: 'Workout',
      icon: <GiMuscleUp className="text-xl" />,
      tab: 'workout',
      hasNotification: !workoutCompleted && assignedPlan?.program_template_id !== null
    },
    {
      name: 'Nutrition',
      icon: <GiMeal className="text-xl" />,
      tab: 'nutrition',
      hasNotification: hasMissedMeals
    },
    {
      name: 'Supps',
      icon: <FiActivity className="text-xl" />,
      tab: 'supplements',
      hasNotification: false // No specific notification for supplements currently
    },
    {
      name: 'Steps',
      icon: <FaWalking className="text-xl" />,
      tab: 'steps',
      hasNotification: !stepsCompleted && stepGoal !== null
    },
    {
      name: 'Water',
      icon: <WaterBottleIcon className="text-xl" />,
      tab: 'water',
      hasNotification: !waterGoalCompleted
    },
    {
      name: 'Check-in',
      icon: <FiCheck className="text-xl" />,
      tab: 'checkin',
      hasNotification: !hasWeeklyCheckIn
    }
  ], [workoutCompleted, hasMissedMeals, stepsCompleted, hasWeeklyCheckIn, waterGoalCompleted, assignedPlan, stepGoal]);

  // Memoize the date calculations to prevent re-renders
  const { currentWeekStart, currentWeekEnd } = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = endOfWeek(new Date(), { weekStartsOn: 1 });
    return { currentWeekStart: start, currentWeekEnd: end };
  }, []);
  
  // Check if today's workout is completed
  useEffect(() => {
    const checkWorkoutCompletion = async () => {
      if (!user?.id || !assignedPlan?.program_template_id) return;
      
      try {
        // Get today's date in ISO format (yyyy-MM-dd)
        const today = format(new Date(), 'yyyy-MM-dd');

        // Get the corresponding day of the week (1 for Monday, 7 for Sunday)
        const dayOfWeek = getCurrentDayOfWeek();

        // Check if there is a workout for today
        const { data: workoutData, error: workoutError } = await supabase
          .from('workouts')
          .select('id, name')
          .eq('program_template_id', assignedPlan.program_template_id)
          .eq('day_of_week', dayOfWeek)
          .limit(1);
        
        if (workoutError) throw workoutError;

        if (workoutData && workoutData.length > 0 && workoutData[0].name !== null && workoutData[0].name !== '' && !workoutData[0].name.toLowerCase().includes('rest')) {
          // Check for completed workouts today
          const { data, error } = await supabase
            .from('workout_sessions')
            .select('id')
            .eq('workout_id', workoutData[0].id)
            .eq('user_id', user.id)
            .not('end_time', 'is', null)
            .gte('start_time', `${today}T00:00:00`)
            .lte('start_time', `${today}T23:59:59`)
            .limit(1);
          
          if (error) throw error;

          // If we found completed workouts today, mark as completed
          setWorkoutCompleted(data && data.length > 0);
        } else {
          setWorkoutCompleted(true);
        }
      } catch (err) {
        console.error('Error checking workout completion:', err);
        // Default to false if there's an error
        setWorkoutCompleted(false);
      }
    };
    
    checkWorkoutCompletion();
  }, [user?.id, assignedPlan?.program_template_id]);
  
  // Check if daily step goal is met
  useEffect(() => {
    const checkStepCompletion = async () => {
      if (!user?.id || !stepGoal?.daily_steps) return;
      
      try {
        // Get today's date in ISO format (YYYY-MM-DD)
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        // Get today's step entry - using proper Supabase aggregate query
        const { data, error } = await supabase
          .from('step_entries')
          .select('sum:step_count')
          .eq('user_id', user.id)
          .gte('created_at', `${todayStr}T00:00:00`)
          .lte('created_at', `${todayStr}T23:59:59`)
          .single();

        if (error) throw error;
        
        // Access the sum value correctly from the aggregation result
        const totalSteps = data?.sum || 0;
        
        // Check if steps meet the goal
        setStepsCompleted(totalSteps >= stepGoal.daily_steps);
      } catch (err) {
        console.error('Error checking step completion:', err);
        // Default to false if there's an error
        setStepsCompleted(false);
      }
    };
    
    checkStepCompletion();
  }, [user?.id, stepGoal?.daily_steps]);
  
  // Check water goal completion for notification badge
  useEffect(() => {
    const checkWaterGoalCompletion = async () => {
      if (!user?.id) return;
      
      try {
        // Get today's date in ISO format
        const today = new Date().toISOString().split('T')[0];
        
        // Get water goal from settings
        const { data: settingsData, error: settingsError } = await supabase
          .from('water_goals')
          .select('water_goal_ml')
          .eq('user_id', user.id)
          .single();
        
        if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
        
        const waterGoal = settingsData?.water_goal_ml || 2500; // Default to 2.5L if no goal set
        
        // Get today's water tracking entry
        const { data: trackingData, error: trackingError } = await supabase
          .from('water_tracking')
          .select('amount_ml')
          .eq('user_id', user.id)
          .eq('date', today)
          .single();
        
        if (trackingError && trackingError.code !== 'PGRST116') throw trackingError;
        
        const waterAmount = trackingData?.amount_ml || 0;
        
        // Check if goal is reached (>= 100%)
        setWaterGoalCompleted(waterAmount >= waterGoal);
      } catch (err) {
        console.error('Error checking water goal completion:', err);
        // Default to false if there's an error
        setWaterGoalCompleted(false);
      }
    };
    
    checkWaterGoalCompletion();
    
    // Set up interval to check every 5 minutes
    const interval = setInterval(checkWaterGoalCompletion, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [user?.id]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user || !profile) return; // Don't fetch if user is not available
      const today = new Date();

      setIsLoadingData(true);
      setFetchError(null);

      try {
        // Create a combined plan object
        const combinedPlan: AssignedPlan = {
          program_template_id: null,
          nutrition_plan_id: null
        };

        // Fetch most recent program assignment
        const { data: programData, error: programError } = await supabase
          .from('assigned_plans')
          .select(`
            program_template_id,
            program:program_templates!program_template_id(id, name, description, version)
          `)
          .eq('athlete_id', profile.id)
          .not('program_template_id', 'is', null) // Must have program_template_id
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (programError) {
          console.error("Error fetching program assignment:", programError);
        } else if (programData) {
          combinedPlan.program_template_id = programData.program_template_id;
          // Add program info to the combined plan if available
          if (programData.program) {
            // Supabase can return program as an array or an object,
            // we need to handle both cases
            const programInfo = Array.isArray(programData.program) 
              ? programData.program[0] 
              : programData.program;
            
            if (programInfo) {
              combinedPlan.program = {
                id: programInfo.id || '',
                name: programInfo.name || '',
                description: programInfo.description || null,
                version: programInfo.version || undefined
              };
            }
          }
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
          combinedPlan.nutrition_plan_id = nutritionData.nutrition_plan_id;
        }
        
        // Set the combined plan data
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
        // We only need to check for errors, but don't need the data
        const { error: recentError } = await supabase
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
        let hasCheckInThisWeek = weeklyData && weeklyData.length > 0;
        
        // If there is no check-in for the week and today is not Friday, Saturday or Sunday, set the check-in status to true
        if ((!weeklyData || weeklyData.length === 0) && (today.getDay() !== 5 && today.getDay() !== 6 && today.getDay() !== 0)) {
          hasCheckInThisWeek = true;
        }
        
        setHasWeeklyCheckIn(hasCheckInThisWeek);

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

  // Handle tab selection
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  // Function to render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'workout':
        return (
          <div className="grid grid-cols-1 gap-6">
            <div className="col-span-1">
              <NextWorkoutWidget 
                programTemplateId={assignedPlan?.program_template_id} 
                program={assignedPlan?.program}
              />
            </div>
          </div>
        );
      case 'supplements':
        return (
          <div className="grid grid-cols-1 gap-6">
            <div className="col-span-1">
              <SupplementDashboard />
            </div>
          </div>
        );
      case 'nutrition':
        return (
          <div className="grid grid-cols-1 gap-6">
            <div className="col-span-1">
              <DashboardNutritionWidget />
            </div>
          </div>
        );
      case 'steps':
        return (
          <div className="grid grid-cols-1 gap-6">
            <div className="col-span-1">
              <StepGoalWidget dailyGoal={stepGoal?.daily_steps} />
            </div>
          </div>
        );
      case 'water':
        return (
          <div className="grid grid-cols-1 gap-6">
            <div className="col-span-1">
              {user && <WaterTrackingPage userId={user.id} />}
            </div>
          </div>
        );
      case 'checkin':
        return (
          <div className="grid grid-cols-1 gap-6">
            <div className="col-span-1">
              <CheckInReminderWidget />
            </div>
            <div className="col-span-1">
              <LatestCheckInWidget />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Render all reminders that should be visible across tabs
  const renderReminders = () => {
    return (
      <div className="space-y-4 mb-4">
        {/* Weekly Check-in Reminder - Always show if there's no check-in */}
        {!hasWeeklyCheckIn && (
          <div className="p-3 text-amber-700 bg-amber-100 rounded-lg dark:bg-amber-900/20 dark:text-amber-300 border-l-4 border-amber-500 flex items-start">
            <svg className="mt-0.5 mr-3 flex-shrink-0 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <div>
              <h4 className="font-medium">Weekly Check-in Reminder</h4>
              <p className="text-sm mt-1">
                Weekly check-in is due!
              </p>
              <p className="text-sm mt-1">
                <button className="inline-block mt-2 text-sm text-amber-800 dark:text-amber-200 font-medium hover:underline" 
                        onClick={() => {
                  navigate('/check-in/new');
                }}>
                  Click here to log your check-in!
                </button>
              </p>
            </div>
          </div>
        )}
        
        {/* Missed Meals Alert - Always show if nutrition plan exists */}
        {assignedPlan?.nutrition_plan_id && (
          <MissedMealsAlert 
            nutritionPlanId={assignedPlan.nutrition_plan_id} 
            testMode={false}
            onMealsStatusChange={(hasMissed) => setHasMissedMeals(hasMissed)}
          />
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="w-full pb-16 md:pb-0">
        <div className="mb-6 animate-pulse">
          <div className="w-2/3 h-12 mb-4 bg-gray-200 rounded dark:bg-gray-700"></div>
          <div className="w-1/3 h-4 bg-gray-200 rounded dark:bg-gray-700"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-16 md:pb-0">
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-bold text-gray-800 dark:text-white">
          Welcome, {profile?.first_name || 'Athlete'}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Here's your day overview for today.
        </p>
      </div>
      
      {/* Standard Dashboard Link - Only visible on larger screens */}
      <div className="hidden md:flex mb-4 p-3 bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-lg items-start">
        <svg className="w-5 h-5 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
        </svg>
        <div>
          <h4 className="font-medium">Mobile Dashboard Experience</h4>
          <p className="text-sm mt-1">
            You're using the new mobile streamlined dashboard.<br />If you are browsing on a desktop you can switch back to the classic view.
          </p>
          <p className="text-sm mt-1">
            <a href="/dashboard-classic" className="inline-block mt-2 text-sm font-medium text-indigo-800 dark:text-indigo-200 hover:underline">
              Switch to desktop view →
            </a>
          </p>
        </div>
      </div>
      
      {/* Reminders Section - Always visible on all tabs */}
      {renderReminders()}
      
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
      
      {/* Tab Content */}
      <div className="mb-8">
        {renderTabContent()}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 md:hidden">
        <div className="grid grid-cols-6 h-16">
          {navItems.map((item) => (
            <button 
              key={item.name} 
              className={`flex flex-col items-center justify-center px-1 ${
                activeTab === item.tab 
                  ? 'text-indigo-600 dark:text-indigo-400 font-medium' 
                  : 'text-gray-600 dark:text-gray-400'
              }`}
              onClick={() => handleTabChange(item.tab)}
            >
              <div className="relative">
                <div className={`w-5 h-5 flex items-center justify-center ${
                  activeTab === item.tab 
                    ? 'text-indigo-600 dark:text-indigo-400' 
                    : ''
                }`}>
                  {item.icon}
                </div>
                {item.hasNotification && (
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white dark:border-gray-800"></div>
                )}
              </div>
              <span className="text-xs mt-0.5 truncate w-full text-center">{item.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardPageV2; 