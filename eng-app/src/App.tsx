import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { supabase, wasTriggeredByVisibilityChange } from './services/supabaseClient';
import { setSession, setProfile, setLoading, setError, ProfileData } from './store/slices/authSlice';
import { selectTheme } from './store/slices/uiSlice';
import LoginPage from './pages/LoginPage'; // Import the actual LoginPage component
import ProtectedRoute from './components/ProtectedRoute'; // Import ProtectedRoute
import OnboardingPage from './pages/OnboardingPage'; // Import the actual OnboardingPage
import DashboardPage from './pages/DashboardPage'; // Import the actual DashboardPage
import DashboardPageV2 from './pages/DashboardPageV2'; // Import the new mobile-friendly DashboardPage
import CheckInPage from './pages/CheckInPage'; // Import CheckInPage
import CheckInHistoryPage from './pages/CheckInHistoryPage'; // Import CheckInHistoryPage
import WorkoutView from './components/workouts/WorkoutView'; // Import WorkoutView
import WorkoutSessionPage from './pages/WorkoutSessionPage'; // Import WorkoutSessionPage
import WorkoutHistoryPage from './pages/WorkoutHistoryPage'; // Import WorkoutHistoryPage
import MealPlanView from './components/nutrition/MealPlanView'; // Import MealPlanView
import NutritionPlansPage from './pages/NutritionPlansPage'; // Import NutritionPlansPage
import WorkoutProgramsPage from './pages/WorkoutProgramsPage'; // Import WorkoutProgramsPage
import WorkoutPlanView from './pages/WorkoutPlanView'; // Import WorkoutPlanView
import AdminRoute from './components/AdminRoute'; // Import AdminRoute
import AdminLayout from './components/admin/AdminLayout'; // Import AdminLayout
import UserManager from './components/admin/UserManager'; // Import UserManager
import CoachManager from './components/admin/CoachManager'; // Import CoachManager
import ProgramBuilder from './components/admin/ProgramBuilder'; // Import ProgramBuilder
import MealPlanner from './components/admin/MealPlanner'; // Import MealPlanner
import MealPlannerPage from './pages/MealPlannerPage'; // Import our integrated meal planner page
import StepGoalSetter from './components/admin/StepGoalSetter';
import WaterGoalSetter from './components/admin/WaterGoalSetter'; // Import StepGoalSetter
import CheckInReview from './components/admin/CheckInReview'; // Import CheckInReview
import CheckInDetail from './components/admin/CheckInDetail'; // Import CheckInDetail
import AdminDashboard from './components/admin/AdminDashboard'; // Import AdminDashboard
import MainLayout from './components/layout/MainLayout'; // Import MainLayout
import AthleteDetailsPage from './pages/admin/AthleteDetailsPage'; // Import AthleteDetailsPage
import CoachDetailsPage from './pages/admin/CoachDetailsPage'; // Import CoachDetailsPage
import BMRCalculatorPage from './pages/admin/BMRCalculatorPage'; // Import BMRCalculatorPage
import AthleteWorkoutsPage from './pages/admin/AthleteWorkoutsPage'; // Import AthleteWorkoutsPage
import FitnessDeviceCallback from './pages/auth/callback/FitnessDeviceCallback';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'; // Import PrivacyPolicyPage
import VerificationPage from './pages/auth/VerificationPage'; // Import the new VerificationPage
import PWAInstallPrompt from './components/common/PWAInstallPrompt'; // Import the PWA install prompt
import UpdateNotification from './components/common/UpdateNotification'; // Import the update notification
import { initPWA } from './utils/pwaHandler'; // Import PWA initialization
import UserProfilePage from './pages/UserProfilePage'; // Import the profile page
import PasswordResetPage from './pages/auth/PasswordResetPage'; // Import the password reset page
import AthleteStepsPage from './pages/admin/AthleteStepsPage';
import AthleteNutritionPage from './pages/admin/AthleteNutritionPage';
import AthleteWaterPage from './pages/admin/AthleteWaterPage';
import NotFoundPage from './pages/NotFoundPage'; // Import the custom NotFoundPage
import HomePage from './pages/HomePage'; // Import the new HomePage component
import SupplementsPage from './pages/SupplementsPage';
import SupplementManagement from './components/admin/supplements/SupplementManagement';
import AthleteCheckInsPage from './pages/admin/AthleteCheckInsPage';
import AthleteCheckInsComparePage from './pages/admin/AthleteCheckInsComparePage'; // Import the check-ins comparison page
import AthleteMeasurementsPage from './pages/admin/AthleteMeasurementsPage'; // Import the measurements page
import MeasurementManager from './components/admin/MeasurementManager';
import ShoppingCartPage from './pages/ShoppingCartPage';

function App() {
  const dispatch = useDispatch();
  const theme = useSelector(selectTheme);

  // Initialize PWA event handlers
  useEffect(() => {
    // Initialize PWA functionality
    initPWA();
  }, []);

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
          .select(`id, user_id, onboarding_complete, role, email, first_name, last_name, coach_id`)
          .eq('user_id', userId)
          .single();

        if (error && status !== 406) { // 406 means no rows found, which is okay if profile not created yet
          throw error;
        }

        if (data) {
          // Check if coach_id is null and update it if needed
          if (data.coach_id === null) {
            // Update profile with default coach ID
            const defaultCoachId = "c5e342a9-28a3-4fdb-9947-fe9e76c46b65";
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ coach_id: defaultCoachId })
              .eq('id', data.id);
              
            if (updateError) {
              console.error('Error updating profile with default coach_id:', updateError);
            } else {
              // Update the coach_id in our data object
              data.coach_id = defaultCoachId;
            }
          }
          
          dispatch(setProfile(data as ProfileData));
        } else {
          // Handle case where user might be logging in for the first time
          // Check if there's a profile with matching email but null user_id
          const user = await supabase.auth.getUser();
          if (user && user.data.user?.email) {
            const email = user.data.user.email;
            
            // Try to find a profile with matching email and NULL user_id
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { data: emailProfile, error: emailError } = await supabase
              .from('profiles')
              .select(`id, user_id, onboarding_complete, role, email, first_name, last_name, coach_id`)
              .eq('email', email)
              .is('user_id', null)
              .single();
                         
            if (emailProfile) {
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
                .select(`id, user_id, onboarding_complete, role, email, first_name, last_name, coach_id`)
                .eq('id', emailProfile.id)
                .single();
                
              if (fetchError) {
                throw fetchError;
              }
              
              if (updatedProfile) {
                // Check if coach_id is null and update it if needed
                if (updatedProfile.coach_id === null) {
                  
                  // Update profile with default coach ID
                  const defaultCoachId = "c5e342a9-28a3-4fdb-9947-fe9e76c46b65";
                  const { error: updateCoachError } = await supabase
                    .from('profiles')
                    .update({ coach_id: defaultCoachId })
                    .eq('id', updatedProfile.id);
                    
                  if (updateCoachError) {
                    console.error('Error updating linked profile with default coach_id:', updateCoachError);
                  } else {
                    // Update the coach_id in our data object
                    updatedProfile.coach_id = defaultCoachId;
                  }
                }
                
                dispatch(setProfile(updatedProfile as ProfileData));
                return;
              }
            }
          }
          
          // If we get here, no matching profile was found or linked
          // Create a new profile with default values including the default coach_id
          try {
            if (userId) {
              const email = (await supabase.auth.getUser()).data.user?.email;
              if (email) {
                const defaultCoachId = "c5e342a9-28a3-4fdb-9947-fe9e76c46b65";
                const newProfileData = {
                  user_id: userId,
                  email: email,
                  role: 'athlete',
                  onboarding_complete: false,
                  coach_id: defaultCoachId
                };
                
                const { data: newProfile, error: createError } = await supabase
                  .from('profiles')
                  .insert(newProfileData)
                  .select()
                  .single();
                  
                if (createError) {
                  console.error('Error creating new profile:', createError);
                } else {
                  dispatch(setProfile(newProfile as ProfileData));
                  return;
                }
              }
            }
          } catch (createError) {
            console.error('Error in profile creation:', createError);
          }
          
          dispatch(setProfile(null));
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error: unknown) {
        dispatch(setError('Could not fetch user profile.'));
        dispatch(setProfile(null));
      }
    };

    // First, explicitly check for hash parameters from magic link redirect
    const handleHashRedirect = async () => {
      try {
        // Check for auth tokens in both hash fragments and URL parameters
        const hasAuthInHash = window.location.hash.includes('access_token') || 
            window.location.hash.includes('refresh_token') ||
            window.location.hash.includes('type=recovery');
        
        const hasAuthInSearch = window.location.search.includes('refresh_token') ||
            window.location.search.includes('type=recovery');
            
        // Add a check for email confirmation type
        const hasConfirmation = window.location.search.includes('type=signup') ||
            window.location.search.includes('type=magiclink') ||
            window.location.search.includes('type=invite');
        
        if (hasAuthInHash || hasAuthInSearch || hasConfirmation) {          
          dispatch(setLoading(true));
          
          // Handle potential URL parameters for auth flow
          const urlParams = new URLSearchParams(window.location.search);
          const errorParam = urlParams.get('error');
          const errorDescription = urlParams.get('error_description');
          const type = urlParams.get('type');
          
          if (errorParam || errorDescription) {
            console.error('Auth error detected in URL:', {
              error: errorParam,
              errorDescription: errorDescription
            });
            dispatch(setError(`Authentication error: ${errorDescription || errorParam || 'Unknown error'}`));
            dispatch(setLoading(false));
            return;
          }
          
          // Special handling for confirmation links
          if (hasConfirmation && (type === 'signup' || type === 'invite' || type === 'magiclink')) {
            // Check if we're already on the login page
            if (window.location.pathname === '/login') {
              dispatch(setLoading(false));
              return;
            }
            
            // Otherwise, if we're not at login, we should redirect there with the parameters
            if (window.location.pathname !== '/login') {
              window.location.href = `/login${window.location.search}`;
              return;
            }
          }
          
          // For email confirmations (signup, magiclink), get the token
          const token = urlParams.get('token') || 
                      urlParams.get('access_token') || 
                      (window.location.hash.match(/access_token=([^&]+)/) || [])[1];
                      
          if (token && hasConfirmation) {
            try {
              // Explicitly try to use the token to establish a session
              // This is especially important for magic links and signup confirmations
              const { data, error } = await supabase.auth.getSession();
              
              if (error) {
                console.error('Error establishing session from token:', error);
                throw error;
              }
              
              if (!data?.session) {
                // Don't try to reload - redirect to login with the parameters
                window.location.href = `/login${window.location.search}`;
                return;
              }
            } catch (e) {
              console.error('Error processing auth token:', e);
            }
          }
          
          // Process the auth information
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Error getting session after redirect:', error);
            throw error;
          }
          
          if (data?.session) {
            dispatch(setSession(data.session));
            
            if (data.session.user) {
              // Important: Await the profile fetch to ensure we have the complete state
              await fetchProfile(data.session.user.id);
              
              // After profile is fetched, check if we need to navigate to onboarding or dashboard
              const currentPath = window.location.pathname;
              
              // Only redirect automatically if we're on the login page or root
              if (currentPath === '/login' || currentPath === '/') {
                // Get the updated profile directly from supabase to ensure we have the latest data
                const { data: profileData, error: profileError } = await supabase
                  .from('profiles')
                  .select('id, onboarding_complete')
                  .eq('user_id', data.session.user.id)
                  .single();
                
                if (profileError && profileError.code !== 'PGRST116') {
                  console.error('Error fetching profile data for redirect decision:', profileError);
                }
                
                if (profileData) {
                  // Determine where to redirect based on onboarding status
                  if (!profileData.onboarding_complete) {
                    window.location.href = '/onboarding';
                  } else {
                    window.location.href = '/dashboard';
                  }
                } else {
                  // If we don't find a profile, stay on the current page
                  // This lets the Protected/Admin routes handle the redirect appropriately
                  dispatch(setLoading(false));
                }
              } else {
                // If we're already on a specific page (not login/root), just update the auth state
                // and let the routing system handle any needed redirects
                dispatch(setLoading(false));
              }
            } else {
              dispatch(setLoading(false));
            }
          } else {            
            // If we have auth params but no session, it could be a PKCE verification issue
            // Try to get the query parameters for error messages
            const urlParams = new URLSearchParams(window.location.search);
            const errorParam = urlParams.get('error');
            const errorDescription = urlParams.get('error_description');
            
            if (errorParam || errorDescription) {
              console.error('Auth error detected in URL:', {
                error: errorParam,
                errorDescription: errorDescription
              });
              dispatch(setError(`Authentication error: ${errorDescription || errorParam || 'Unknown error'}`));
            } else {
              dispatch(setError('Failed to establish session after login. Please try again.'));
            }
            
            dispatch(setLoading(false));
            
            // Clear any problematic auth state
            localStorage.removeItem('supabase.auth.token');
            localStorage.removeItem('supabase.auth.token.refresh');
          }
        }
      } catch (err) {
        console.error('Error handling auth redirect:', err);
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
        // Ignore all events that happen immediately after visibility change
        // This is the key to preventing unwanted refreshes
        if (wasTriggeredByVisibilityChange()) {
            return;
        }
        
        // Skip processing certain non-critical events
        if (event === 'TOKEN_REFRESHED') {
            // For token refreshes, we do an extremely minimal update to prevent component rerenders
            // We directly update the JWT in localStorage without triggering Redux state changes
            if (session) {
                // Only update the local storage JWT value instead of using Redux dispatch
                // This prevents components from re-rendering but keeps auth valid
                try {
                    const storageKey = 'eng_supabase_auth';
                    const authData = JSON.parse(localStorage.getItem(storageKey) || '{}');
                    if (authData && authData.access_token) {
                        authData.access_token = session.access_token;
                        localStorage.setItem(storageKey, JSON.stringify(authData));
                    } else {
                        // Fallback to normal update if we can't find the current token
                        dispatch(setSession(session));
                    }
                } catch (err) {
                    // Fallback to normal update if anything goes wrong
                    console.error('Error during silent token refresh:', err);
                    dispatch(setSession(session));
                }
            }
            return;
        }
        
        // Handle auth events that require full state updates
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

  // Add a special case for handling verification URLs directly in useEffect
  useEffect(() => {
    const handleVerificationUrls = async () => {
      // Check if we're on a Supabase verification URL directly
      const isVerificationUrl = window.location.href.includes('/verify?token=') || 
                               window.location.href.includes('/verify?code=') ||
                               window.location.href.includes('/auth/v1/verify?token=') ||
                               window.location.href.includes('/auth/v1/verify?code=');
                               
      // Skip if we're already on the /auth/verify route to prevent infinite redirects
      const isAlreadyOnVerifyPage = window.location.pathname === '/auth/verify' || 
                                   window.location.pathname === '/verify';
                               
      if (isVerificationUrl && !isAlreadyOnVerifyPage) {       
        // Extract email parameter if present
        const urlParams = new URLSearchParams(window.location.search);
        const email = urlParams.get('email');
        const emailParam = email ? `&email=${email}` : '';
        
        // Instead of handling verification here, redirect to our dedicated verification page
        window.location.href = `/auth/verify${window.location.search}${emailParam}`;
        return;
      }
    };
    
    // Run once on mount
    handleVerificationUrls();
  }, []);

  // Add this handler function in addition to the existing handleConfirmationLinks function
  useEffect(() => {
    const handleConfirmationLinks = async () => {
      // Look for invitation or confirmation parameters
      const urlParams = new URLSearchParams(window.location.search);
      const type = urlParams.get('type');
      const token = urlParams.get('token') || urlParams.get('access_token');
      const verified = urlParams.get('verified');
      
      // Special handler for verified=true parameter (coming from our own redirects)
      if (verified === 'true' && type) {        
        // If we're already on the login page, nothing more to do
        if (window.location.pathname === '/login') {
          return;
        }
        
        // Otherwise, redirect to login
        window.location.href = `/login?verified=true&type=${type}`;
        return;
      }
      
      // Only handle confirmation types with tokens
      if ((type === 'invite' || type === 'signup' || type === 'magiclink') && token) {        
        try {
          // Check if we can get an active session
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error(`Error checking session for ${type} link:`, error);
          }
        } catch (e) {
          console.error(`Error in confirmation link handler:`, e);
        }
      }
    };
    
    handleConfirmationLinks();
  }, []);

  return (
    <>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        
        {/* Auth Routes - Publicly accessible */}
        <Route path="/auth/verify" element={<VerificationPage />} />
        <Route path="/verify" element={<VerificationPage />} />
        <Route path="/auth/reset-password" element={<PasswordResetPage />} />

        {/* Legal Pages - Accessible without authentication */}
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />

        {/* Protected Routes WITH MainLayout (Authenticated) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<DashboardPageV2 />} />
              <Route path="/dashboard-classic" element={<DashboardPage />} />
              {/* User profile route */}
              <Route path="/profile" element={<UserProfilePage />} />
              {/* Check-in routes */}
              <Route path="/check-in/new" element={<CheckInPage />} />
              <Route path="/check-in/history" element={<CheckInHistoryPage />} />
              <Route path="/history" element={<Navigate to="/check-in/history" replace />} />
              {/* Workout routes */}
              <Route path="/workout/:workoutId" element={<WorkoutView />} />
              <Route path="/workout-session/:workoutId" element={<WorkoutSessionPage />} />
              <Route path="/workouts/history" element={<WorkoutHistoryPage />} />
              <Route path="/meal-plan/:planId" element={<MealPlanView />} />
              <Route path="/nutrition-plans" element={<NutritionPlansPage />} />
              <Route path="/shopping-cart" element={<ShoppingCartPage />} />
              <Route path="/workout-programs" element={<WorkoutProgramsPage />} />
              <Route path="/workout-plan/:programId" element={<WorkoutPlanView />} />
              <Route path="/supplements" element={<SupplementsPage />} />
          </Route>
        </Route>

        {/* Admin Routes (uses AdminLayout, not MainLayout) */}
        <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="athletes" element={<UserManager />} />
                <Route path="athletes/:id" element={<AthleteDetailsPage />} />
                <Route path="athletes/:id/workouts" element={<AthleteWorkoutsPage />} />
                <Route path="athletes/:id/workouts/log/:logId" element={<AthleteWorkoutsPage />} />
                <Route path="athletes/:id/steps" element={<AthleteStepsPage />} />
                <Route path="athletes/:id/water" element={<AthleteWaterPage />} />
                <Route path="athletes/:id/nutrition" element={<AthleteNutritionPage />} />
                <Route path="athletes/:id/check-ins" element={<AthleteCheckInsPage />} />
                <Route path="athletes/:id/compare-checkins/:checkInId1/:checkInId2" element={<AthleteCheckInsComparePage />} />
                <Route path="athletes/:id/measurements" element={<AthleteMeasurementsPage />} />
                <Route path="coaches" element={<CoachManager />} />
                <Route path="coaches/:id" element={<CoachDetailsPage />} />
                <Route path="programs" element={<ProgramBuilder />} />
                <Route path="mealplans" element={<MealPlanner />} />
                <Route path="mealplans/edit/:planId" element={<MealPlannerPage />} />
                <Route path="mealplans/new" element={<MealPlannerPage />} />
                <Route path="stepgoals" element={<StepGoalSetter />} />
                <Route path="watergoals" element={<WaterGoalSetter />} />
                <Route path="measurements" element={<MeasurementManager />} />
                <Route path="checkins" element={<CheckInReview />} />
                <Route path="checkins/:checkInId" element={<CheckInDetail />} />
                <Route path="bmr-calculator" element={<BMRCalculatorPage />} />
                <Route path="supplements" element={<SupplementManagement />} />
                <Route path="*" element={<NotFoundPage />} />
            </Route>
        </Route>

        {/* Fitness Device Callback Routes */}
        <Route path="/auth/callback/fitbit" element={<FitnessDeviceCallback />} />
        <Route path="/auth/callback/garmin" element={<FitnessDeviceCallback />} />
        <Route path="/auth/callback/google-fit" element={<FitnessDeviceCallback />} />
        {/* We'll handle apple-health and samsung-health through native app integrations */}

        {/* Redirect old nutrition routes to their new locations */}
        <Route path="/nutrition" element={<Navigate to="/nutrition-plans" replace />} />
        <Route path="/nutrition/meal-plans" element={<Navigate to="/nutrition-plans" replace />} />
        <Route path="/nutrition/meal-plans/:planId" element={<Navigate to="/meal-plan/:planId" replace />} />
        <Route path="/nutrition/food-items" element={<Navigate to="/admin/mealplans" replace />} />

        {/* Fallback 404 Route (without MainLayout) */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      
      {/* PWA Install Prompt - Shows conditionally based on internal logic */}
      <PWAInstallPrompt />
      
      {/* Update Notification - Shows when service worker has an update */}
      <UpdateNotification />
    </>
  );
}

export default App;
