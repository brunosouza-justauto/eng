import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { supabase } from './services/supabaseClient';
import { setSession, setProfile, setLoading, setError, ProfileData } from './store/slices/authSlice';
import { selectTheme } from './store/slices/uiSlice';
import LoginPage from './pages/LoginPage'; // Import the actual LoginPage component
import ProtectedRoute from './components/ProtectedRoute'; // Import ProtectedRoute
import OnboardingPage from './pages/OnboardingPage'; // Import the actual OnboardingPage
import DashboardPage from './pages/DashboardPage'; // Import the actual DashboardPage
import CheckInPage from './pages/CheckInPage'; // Import CheckInPage
import CheckInHistoryPage from './pages/CheckInHistoryPage'; // Import CheckInHistoryPage
import WorkoutView from './components/workouts/WorkoutView'; // Import WorkoutView
import WorkoutSessionPage from './pages/WorkoutSessionPage'; // Import WorkoutSessionPage
import MealPlanView from './components/nutrition/MealPlanView'; // Import MealPlanView
import NutritionPlansPage from './pages/NutritionPlansPage'; // Import NutritionPlansPage
import WorkoutProgramsPage from './pages/WorkoutProgramsPage'; // Import WorkoutProgramsPage
import WorkoutPlanView from './pages/WorkoutPlanView'; // Import WorkoutPlanView
import AdminRoute from './components/AdminRoute'; // Import AdminRoute
import AdminLayout from './components/admin/AdminLayout'; // Import AdminLayout
import UserManager from './components/admin/UserManager'; // Import UserManager
import CoachManager from './components/admin/CoachManager'; // Import CoachManager
import ProgramBuilder from './components/admin/ProgramBuilder'; // Import
import MealPlanner from './components/admin/MealPlanner'; // Import
import StepGoalSetter from './components/admin/StepGoalSetter'; // Import
import CheckInReview from './components/admin/CheckInReview'; // Import
import AdminDashboard from './components/admin/AdminDashboard'; // Import AdminDashboard
import MainLayout from './components/layout/MainLayout'; // Import MainLayout
import AthleteDetailsPage from './pages/admin/AthleteDetailsPage'; // Import AthleteDetailsPage
import CoachDetailsPage from './pages/admin/CoachDetailsPage'; // Import CoachDetailsPage
import BMRCalculatorPage from './pages/admin/BMRCalculatorPage'; // Import BMRCalculatorPage
import FitnessDeviceCallback from './pages/auth/callback/FitnessDeviceCallback';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
// Placeholder pages - we will create these properly later
// const LoginPage = () => <div>Login Page Placeholder - <Link to="/dashboard">Go to Dashboard (temp)</Link></div>;
const NotFoundPage = () => <div>404 Not Found</div>;

function App() {
  const dispatch = useDispatch();
  const theme = useSelector(selectTheme);

  // Apply theme class to html element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    // Function to fetch profile
    const fetchProfile = async (userId: string) => {
      try {
        const { data, error, status } = await supabase
          .from('profiles')
          .select(`id, user_id, onboarding_complete, role, email, first_name, last_name`)
          .eq('user_id', userId)
          .single();

        if (error && status !== 406) { // 406 means no rows found, which is okay if profile not created yet
          throw error;
        }

        if (data) {
          dispatch(setProfile(data as ProfileData));
        } else {
          // Handle case where user might be logging in for the first time
          // Check if there's a profile with matching email but null user_id
          const user = await supabase.auth.getUser();
          if (user && user.data.user?.email) {
            const email = user.data.user.email;
            
            console.log('No profile found with user_id, checking for profile with email:', email);
            
            // Try to find a profile with matching email and NULL user_id
            const { data: emailProfile, error: emailError } = await supabase
              .from('profiles')
              .select(`id, user_id, onboarding_complete, role, email, first_name, last_name`)
              .eq('email', email)
              .is('user_id', null)
              .single();
              
            if (emailError && emailError.code !== 'PGRST116') { // PGRST116 is 'no rows returned'
              console.error('Error looking up profile by email:', emailError);
            }
            
            if (emailProfile) {
              console.log('Found profile with matching email but NULL user_id. Linking to auth account...');
              
              // Update the profile with the user_id
              const { error: updateError } = await supabase
                .from('profiles')
                .update({ user_id: userId })
                .eq('id', emailProfile.id);
                
              if (updateError) {
                console.error('Error updating profile with user_id:', updateError);
                throw updateError;
              }
              
              // Fetch the updated profile
              const { data: updatedProfile, error: fetchError } = await supabase
                .from('profiles')
                .select(`id, user_id, onboarding_complete, role, email, first_name, last_name`)
                .eq('id', emailProfile.id)
                .single();
                
              if (fetchError) {
                throw fetchError;
              }
              
              if (updatedProfile) {
                console.log('Successfully linked profile to auth account:', updatedProfile);
                
                // Log onboarding status for debugging
                if (!updatedProfile.onboarding_complete) {
                  console.log('Profile requires onboarding. User will be redirected to onboarding page.');
                } else {
                  console.log('Profile has completed onboarding.');
                }
                
                dispatch(setProfile(updatedProfile as ProfileData));
                return;
              }
            } else {
              console.log('No profile found with matching email and NULL user_id.');
            }
          }
          
          // If we get here, no matching profile was found or linked
          dispatch(setProfile(null)); 
        }
      } catch (error: unknown) {
        console.error("Error fetching profile:", error);
        dispatch(setError('Could not fetch user profile.'));
        dispatch(setProfile(null));
      }
    };

    // First, explicitly check for hash parameters from magic link redirect
    const handleHashRedirect = async () => {
      try {
        if (window.location.hash.includes('access_token') || 
            window.location.hash.includes('refresh_token') ||
            window.location.hash.includes('type=recovery')) {
          
          console.log('Auth redirect detected, getting session');
          dispatch(setLoading(true));
          
          // Process the hash fragment
          const { data, error } = await supabase.auth.getSession();
          
          if (error) throw error;
          
          if (data?.session) {
            console.log('Session retrieved after redirect');
            dispatch(setSession(data.session));
            if (data.session.user) {
              fetchProfile(data.session.user.id);
            }
          } else {
            dispatch(setLoading(false));
          }
        }
      } catch (err) {
        console.error('Error handling hash redirect:', err);
        dispatch(setError('Failed to authenticate from redirect'));
        dispatch(setLoading(false));
      }
    };

    // Handle hash redirect first
    handleHashRedirect();

    // Then proceed with normal session check
    dispatch(setLoading(true)); // Set loading true initially
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Don't dispatch if we already have a session from the hash redirect
      if (!session?.user?.id || !window.location.hash.includes('access_token')) {
        dispatch(setSession(session));
        if (session?.user) {
          fetchProfile(session.user.id); // Fetch profile if session exists
        } else {
           dispatch(setLoading(false)); // Ensure loading stops if no initial session
        }
      }
    }).catch(error => {
        console.error("Error getting initial session:", error);
        dispatch(setError('Could not verify session.'));
        dispatch(setSession(null));
        dispatch(setLoading(false));
    });

    // Subscribe to auth state changes with debounce for better stability
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state change detected:', event);
        
        // Skip processing certain non-critical events that can happen on window focus
        if (event === 'TOKEN_REFRESHED') {
            console.log('Token refresh - not updating state to prevent unnecessary redirects');
            return;
        }
        
        // Only update Redux state for significant auth changes
        if (['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED'].includes(event)) {
            dispatch(setSession(session));
            
            if (session?.user) {
                fetchProfile(session.user.id); // Fetch profile on auth change
            } else {
                dispatch(setProfile(null)); // Clear profile if user logs out
            }
        }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, [dispatch]);

  return (
    <Routes>
      {/* Routes without MainLayout */}
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
      </Route>

      {/* Legal Pages - Accessible without authentication */}
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />

      {/* Routes WITH MainLayout (Authenticated) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            {/* Check-in routes */}
            <Route path="/check-in/new" element={<CheckInPage />} />
            <Route path="/check-in/history" element={<CheckInHistoryPage />} />
            <Route path="/history" element={<Navigate to="/check-in/history" replace />} />
            <Route path="/workout/:workoutId" element={<WorkoutView />} />
            <Route path="/workout-session/:workoutId" element={<WorkoutSessionPage />} />
            <Route path="/meal-plan/:planId" element={<MealPlanView />} />
            <Route path="/nutrition-plans" element={<NutritionPlansPage />} />
            <Route path="/workout-programs" element={<WorkoutProgramsPage />} />
            <Route path="/workout-plan/:programId" element={<WorkoutPlanView />} />
        </Route>
      </Route>

      {/* Admin Routes (uses AdminLayout, not MainLayout) */}
      <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="athletes" element={<UserManager />} />
              <Route path="athletes/:id" element={<AthleteDetailsPage />} />
              <Route path="coaches" element={<CoachManager />} />
              <Route path="coaches/:id" element={<CoachDetailsPage />} />
              <Route path="programs" element={<ProgramBuilder />} />
              <Route path="mealplans" element={<MealPlanner />} />
              <Route path="stepgoals" element={<StepGoalSetter />} />
              <Route path="checkins" element={<CheckInReview />} />
              <Route path="bmr-calculator" element={<BMRCalculatorPage />} />
              <Route path="*" element={<div>Admin Section Not Found</div>} />
          </Route>
      </Route>

      {/* Fitness Device Callback Routes */}
      <Route path="/auth/callback/fitbit" element={<FitnessDeviceCallback />} />
      <Route path="/auth/callback/garmin" element={<FitnessDeviceCallback />} />
      <Route path="/auth/callback/google-fit" element={<FitnessDeviceCallback />} />
      {/* We'll handle apple-health and samsung-health through native app integrations */}

      {/* Fallback 404 Route (without MainLayout) */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
