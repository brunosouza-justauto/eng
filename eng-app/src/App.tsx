import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { supabase } from './services/supabaseClient';
import { setSession, setProfile, setLoading, setError, ProfileData } from './store/slices/authSlice';
import LoginPage from './pages/LoginPage'; // Import the actual LoginPage component
import ProtectedRoute from './components/ProtectedRoute'; // Import ProtectedRoute
import OnboardingPage from './pages/OnboardingPage'; // Import the actual OnboardingPage
import DashboardPage from './pages/DashboardPage'; // Import the actual DashboardPage
import WorkoutView from './components/workouts/WorkoutView'; // Import WorkoutView
import MealPlanView from './components/nutrition/MealPlanView'; // Import MealPlanView
import CheckInPage from './pages/CheckInPage'; // Import CheckInPage
import HistoryPage from './pages/HistoryPage'; // Import HistoryPage
import AdminRoute from './components/AdminRoute'; // Import AdminRoute
import AdminLayout from './components/admin/AdminLayout'; // Import AdminLayout
import UserManager from './components/admin/UserManager'; // Import UserManager
import ProgramBuilder from './components/admin/ProgramBuilder'; // Import
import MealPlanner from './components/admin/MealPlanner'; // Import
import StepGoalSetter from './components/admin/StepGoalSetter'; // Import
import CheckInReview from './components/admin/CheckInReview'; // Import
// Placeholder pages - we will create these properly later
// const LoginPage = () => <div>Login Page Placeholder - <Link to="/dashboard">Go to Dashboard (temp)</Link></div>;
const NotFoundPage = () => <div>404 Not Found</div>;

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Function to fetch profile
    const fetchProfile = async (userId: string) => {
      try {
        const { data, error, status } = await supabase
          .from('profiles')
          .select(`id, user_id, onboarding_complete, role`)
          .eq('user_id', userId)
          .single();

        if (error && status !== 406) { // 406 means no rows found, which is okay if profile not created yet
          throw error;
        }

        if (data) {
          dispatch(setProfile(data as ProfileData));
        } else {
          // Handle case where profile might not exist yet (e.g., right after signup)
          dispatch(setProfile(null)); 
        }
      } catch (error: unknown) {
        console.error("Error fetching profile:", error);
        dispatch(setError('Could not fetch user profile.'));
        dispatch(setProfile(null));
      }
    };

    // Check initial session
    dispatch(setLoading(true)); // Set loading true initially
    supabase.auth.getSession().then(({ data: { session } }) => {
      dispatch(setSession(session));
      if (session?.user) {
        fetchProfile(session.user.id); // Fetch profile if session exists
      } else {
         dispatch(setLoading(false)); // Ensure loading stops if no initial session
      }
    }).catch(error => {
        console.error("Error getting initial session:", error);
        dispatch(setError('Could not verify session.'));
        dispatch(setSession(null));
        dispatch(setLoading(false));
    });

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        // We might set loading briefly here if needed
        // dispatch(setLoading(true)); 
        dispatch(setSession(session));
        if (session?.user) {
            fetchProfile(session.user.id); // Fetch profile on auth change
        } else {
            dispatch(setProfile(null)); // Clear profile if user logs out
            // Loading is set within setSession for null session
        }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Add a basic nav later if needed */}
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} /> {/* Use the imported component */}

        {/* Protected Routes Wrapper */}
        <Route element={<ProtectedRoute />}>
          {/* Default route for authenticated users at root path */}
          <Route index element={<DashboardPage />} />
          {/* Other routes requiring authentication */}
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/check-in/new" element={<CheckInPage />} />
          <Route path="/history" element={<HistoryPage />} />
          
          {/* Detail View Routes */}
          <Route path="/workout/:workoutId" element={<WorkoutView />} />
          <Route path="/meal-plan/:planId" element={<MealPlanView />} />
        </Route>

        {/* Admin Only Routes */}
        <Route element={<AdminRoute />}>
            {/* Use AdminLayout for all /admin routes */}
            <Route path="/admin" element={<AdminLayout />}> 
                 {/* Default Admin route (optional dashboard) */}
                <Route index element={<div>Admin Dashboard Placeholder</div>} /> 
                {/* Nested Admin Routes */}
                <Route path="users" element={<UserManager />} /> {/* Render UserManager */}
                <Route path="programs" element={<ProgramBuilder />} /> 
                <Route path="mealplans" element={<MealPlanner />} /> 
                <Route path="stepgoals" element={<StepGoalSetter />} /> 
                <Route path="checkins" element={<CheckInReview />} /> 
                {/* Add a fallback for unknown admin routes */}
                <Route path="*" element={<div>Admin Section Not Found</div>} /> 
            </Route>
        </Route>

        {/* Fallback Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}

export default App;
