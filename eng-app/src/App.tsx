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
import CheckInPage from './pages/CheckInPage'; // Import CheckInPage
import CheckInHistoryPage from './pages/CheckInHistoryPage'; // Import CheckInHistoryPage
import WorkoutView from './components/workouts/WorkoutView'; // Import WorkoutView
import WorkoutSessionPage from './pages/WorkoutSessionPage'; // Import WorkoutSessionPage
import WorkoutHistoryPage from './pages/WorkoutHistoryPage'; // Import WorkoutHistoryPage
import MealPlanView from './components/nutrition/MealPlanView'; // Import MealPlanView
import NutritionPlansPage from './pages/NutritionPlansPage'; // Import NutritionPlansPage
import NutritionRouteHandler from './components/nutrition/NutritionRouteHandler'; // Import NutritionRouteHandler
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
import VerificationPage from './pages/auth/VerificationPage'; // Import the new VerificationPage
import PWAInstallPrompt from './components/common/PWAInstallPrompt'; // Import the PWA install prompt
import UpdateNotification from './components/common/UpdateNotification'; // Import the update notification
import { initPWA } from './utils/pwaHandler'; // Import PWA initialization
import UserProfilePage from './pages/UserProfilePage'; // Import the profile page
import PasswordResetPage from './pages/auth/PasswordResetPage'; // Import the password reset page
// Placeholder pages - we will create these properly later
// const LoginPage = () => <div>Login Page Placeholder - <Link to="/dashboard">Go to Dashboard (temp)</Link></div>;
const NotFoundPage = () => <div>404 Not Found</div>;

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
            console.log('Profile found but coach_id is null. Assigning default coach ID.');
            
            // Update profile with default coach ID
            const defaultCoachId = "c5e342a9-28a3-4fdb-9947-fe9e76c46b65";
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ coach_id: defaultCoachId })
              .eq('id', data.id);
              
            if (updateError) {
              console.error('Error updating profile with default coach_id:', updateError);
            } else {
              console.log('Successfully assigned default coach_id to profile:', data.id);
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
            
            console.log('No profile found with user_id, checking for profile with email:', email);
            
            // Try to find a profile with matching email and NULL user_id
            const { data: emailProfile, error: emailError } = await supabase
              .from('profiles')
              .select(`id, user_id, onboarding_complete, role, email, first_name, last_name, coach_id`)
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
                .select(`id, user_id, onboarding_complete, role, email, first_name, last_name, coach_id`)
                .eq('id', emailProfile.id)
                .single();
                
              if (fetchError) {
                throw fetchError;
              }
              
              if (updatedProfile) {
                console.log('Successfully linked profile to auth account:', updatedProfile);
                
                // Check if coach_id is null and update it if needed
                if (updatedProfile.coach_id === null) {
                  console.log('Linked profile has null coach_id. Assigning default coach ID.');
                  
                  // Update profile with default coach ID
                  const defaultCoachId = "c5e342a9-28a3-4fdb-9947-fe9e76c46b65";
                  const { error: updateCoachError } = await supabase
                    .from('profiles')
                    .update({ coach_id: defaultCoachId })
                    .eq('id', updatedProfile.id);
                    
                  if (updateCoachError) {
                    console.error('Error updating linked profile with default coach_id:', updateCoachError);
                  } else {
                    console.log('Successfully assigned default coach_id to linked profile:', updatedProfile.id);
                    // Update the coach_id in our data object
                    updatedProfile.coach_id = defaultCoachId;
                  }
                }
                
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
          // Create a new profile with default values including the default coach_id
          try {
            if (userId) {
              const email = (await supabase.auth.getUser()).data.user?.email;
              if (email) {
                console.log('Creating new profile for user with default coach_id');
                
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
                  console.log('Successfully created new profile with default coach_id:', newProfile);
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
      } catch (error: unknown) {
        console.error("Error fetching profile:", error);
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
          console.log('Auth redirect detected, getting session', {
            hasAuthInHash,
            hasAuthInSearch,
            hasConfirmation,
            hash: window.location.hash,
            search: window.location.search,
            protocol: window.location.protocol,
            host: window.location.host,
            pathname: window.location.pathname
          });
          
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
              console.log('Already on login page with confirmation parameters, leaving as-is');
              dispatch(setLoading(false));
              return;
            }
            
            // Otherwise, if we're not at login, we should redirect there with the parameters
            if (window.location.pathname !== '/login') {
              console.log('Redirecting to login page with confirmation parameters');
              window.location.href = `/login${window.location.search}`;
              return;
            }
          }
          
          // For email confirmations (signup, magiclink), get the token
          const token = urlParams.get('token') || 
                      urlParams.get('access_token') || 
                      (window.location.hash.match(/access_token=([^&]+)/) || [])[1];
                      
          if (token && hasConfirmation) {
            console.log('Detected auth token from confirmation link, attempting to establish session');
            try {
              // Explicitly try to use the token to establish a session
              // This is especially important for magic links and signup confirmations
              const { data, error } = await supabase.auth.getSession();
              
              if (error) {
                console.error('Error establishing session from token:', error);
                throw error;
              }
              
              if (!data?.session) {
                console.log('No session established from token, redirecting to login with confirmation parameters');
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
            console.log('Session retrieved after redirect', {
              userId: data.session.user.id,
              email: data.session.user.email,
              expiresAt: data.session.expires_at
            });
            
            dispatch(setSession(data.session));
            
            if (data.session.user) {
              console.log('User authenticated after redirect, fetching profile:', data.session.user.id);
              
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
                  console.log('Profile data retrieved for redirect decision:', {
                    id: profileData.id,
                    onboardingComplete: profileData.onboarding_complete
                  });
                  
                  // Determine where to redirect based on onboarding status
                  if (!profileData.onboarding_complete) {
                    console.log('Redirecting to onboarding page');
                    window.location.href = '/onboarding';
                  } else {
                    console.log('Redirecting to dashboard');
                    window.location.href = '/dashboard';
                  }
                } else {
                  console.log('No profile found, user may need to be invited');
                  // If we don't find a profile, stay on the current page
                  // This lets the Protected/Admin routes handle the redirect appropriately
                  dispatch(setLoading(false));
                }
              } else {
                // If we're already on a specific page (not login/root), just update the auth state
                // and let the routing system handle any needed redirects
                console.log('Already on a specific page, not redirecting automatically:', currentPath);
                dispatch(setLoading(false));
              }
            } else {
              console.log('Session exists but no user data found');
              dispatch(setLoading(false));
            }
          } else {
            console.log('No session found after auth redirect - may need to retry OAuth flow');
            
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
        // Log all events for debugging
        console.log('Auth state change detected:', event, {
            visibilityState: document.visibilityState,
            wasTriggeredByVisibility: wasTriggeredByVisibilityChange()
        });
        
        // Ignore all events that happen immediately after visibility change
        // This is the key to preventing unwanted refreshes
        if (wasTriggeredByVisibilityChange()) {
            console.log('Ignoring auth event due to recent visibility change');
            return;
        }
        
        // Skip processing certain non-critical events
        if (event === 'TOKEN_REFRESHED') {
            // Only update the session object, but don't trigger profile fetches or redirects
            if (session) {
                dispatch(setSession(session));
            }
            console.log('Token refresh event - only updating session object');
            return;
        }
        
        // Handle auth events that require full state updates
        if (['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED'].includes(event)) {
            console.log('Auth event detected, updating state:', event);
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
                               
      if (isVerificationUrl) {
        console.log('Direct Supabase verification URL detected:', window.location.href);
        
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
        console.log(`Special handler for verified=${verified} with type=${type}`);
        
        // If we're already on the login page, nothing more to do
        if (window.location.pathname === '/login') {
          console.log('Already on login page with verified parameter');
          return;
        }
        
        // Otherwise, redirect to login
        window.location.href = `/login?verified=true&type=${type}`;
        return;
      }
      
      // Only handle confirmation types with tokens
      if ((type === 'invite' || type === 'signup' || type === 'magiclink') && token) {
        console.log(`Special handler for ${type} link with token`);
        
        try {
          // Check if we can get an active session
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error(`Error checking session for ${type} link:`, error);
          } else if (data?.session) {
            console.log(`Session already established for ${type} link`);
          } else {
            // If no session yet, but we have a confirmation token,
            // we might need to do some special handling
            
            // For now, let's add some debugging that might help
            console.log(`No session yet for ${type} link, token present`);

            // We could potentially try to verify the token directly here
            // but for now, let App.tsx's handleHashRedirect handle it
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
        {/* Routes without MainLayout */}
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
            <Route path="/onboarding" element={<OnboardingPage />} />
        </Route>

        {/* Auth Routes - Publicly accessible */}
        <Route path="/auth/verify" element={<VerificationPage />} />
        <Route path="/verify" element={<VerificationPage />} />
        <Route path="/auth/reset-password" element={<PasswordResetPage />} />

        {/* Legal Pages - Accessible without authentication */}
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />

        {/* Routes WITH MainLayout (Authenticated) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
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
              <Route path="/nutrition" element={<NutritionRouteHandler />} />
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
      
      {/* PWA Install Prompt - Shows conditionally based on internal logic */}
      <PWAInstallPrompt />
      
      {/* Update Notification - Shows when service worker has an update */}
      <UpdateNotification />
    </>
  );
}

export default App;
