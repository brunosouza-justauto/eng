import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { 
  selectIsAuthenticated, 
  selectIsLoading, 
  selectProfile
} from '../store/slices/authSlice';
import { supabase } from '../services/supabaseClient';

const ProtectedRoute: React.FC = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectIsLoading);
  const profile = useSelector(selectProfile);
  const location = useLocation();
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [isProcessingRedirect, setIsProcessingRedirect] = useState(false);
  const [isConfirmationFlow, setIsConfirmationFlow] = useState(false);
  
  // Add state to track if user was previously authenticated
  const [wasAuthenticated, setWasAuthenticated] = useState<boolean>(false);
  // Add state to remember if onboarding was previously complete
  const [wasOnboardingComplete, setWasOnboardingComplete] = useState<boolean | null>(null);

  // Check if we have auth parameters in the URL
  const hasAuthParams = window.location.hash.includes('access_token') || 
                         window.location.hash.includes('refresh_token') ||
                         window.location.search.includes('refresh_token') ||
                         window.location.search.includes('token=') ||
                         window.location.search.includes('code=') ||
                         window.location.search.includes('type=signup') || 
                         window.location.search.includes('type=magiclink') ||
                         window.location.search.includes('type=invite') ||
                         window.location.href.includes('/verify?token=') ||
                         window.location.href.includes('/verify?code=');

  // Check for confirmation flow specifically - we'll handle these differently
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    const token = urlParams.get('token') || urlParams.get('access_token');
    const isVerificationUrl = window.location.href.includes('/verify?token=');
    
    // Set confirmation flow if either we have explicit parameters or it's a verification URL
    if ((type === 'signup' || type === 'magiclink' || type === 'invite') && token) {
      setIsConfirmationFlow(true);
    } else if (isVerificationUrl) {
      console.log('Detected Supabase verification URL, treating as confirmation flow');
      setIsConfirmationFlow(true);
    } else {
      setIsConfirmationFlow(false);
    }
  }, [location.search, location.pathname]);

  // Keep track of authentication state to prevent disruption during token refreshes
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      setWasAuthenticated(true);
    }
    
    // Remember onboarding status
    if (profile?.onboarding_complete) {
      setWasOnboardingComplete(true);
    } else if (profile && profile.onboarding_complete === false) {
      setWasOnboardingComplete(false);
    }
  }, [isAuthenticated, isLoading, profile]);

  // Debug information
  console.log('ProtectedRoute - Auth state:', {
    isAuthenticated,
    isLoading,
    hasProfile: !!profile,
    path: location.pathname,
    hash: location.hash,
    wasAuthenticated,
    wasOnboardingComplete
  });

  // Special case for when we have auth params but no authenticated state yet
  // This helps handle the redirect after email verification
  useEffect(() => {
    const checkAuthStatus = async () => {
      // Specifically look for Supabase verification URLs
      const isVerificationUrl = window.location.href.includes('/verify?token=') || 
                                window.location.pathname.includes('/auth/verify') ||
                                window.location.pathname === '/verify' ||
                                window.location.href.includes('/verify?code=');
      
      if (isVerificationUrl || (hasAuthParams && !isAuthenticated && !isCheckingAuth && !isProcessingRedirect)) {
        setIsCheckingAuth(true);
        setIsProcessingRedirect(true);
        console.log('ProtectedRoute - Auth parameters or verification URL detected, checking session');
        
        try {
          // Extract parameters from the URL
          const urlParams = new URLSearchParams(location.search);
          let type = urlParams.get('type');
          
          // Try to extract the token from the URL
          const tokenMatch = window.location.href.match(/token=([^&]+)/);
          const tokenValue = tokenMatch && tokenMatch[1] ? tokenMatch[1] : null;
          console.log('Extracted token from URL:', tokenValue ? 'Token exists' : 'No token found');
          
          // Try to determine the type
          if (isVerificationUrl) {
            if (window.location.href.includes('type=signup')) {
              type = 'signup';
            } else if (window.location.href.includes('type=invite')) {
              type = 'invite';
            } else if (window.location.href.includes('type=magiclink')) {
              type = 'magiclink';
            } else {
              // Default to signup
              type = 'signup';
            }
          }
          
          // For email confirmation links (signup, magiclink, invite) or verification URLs
          if (type === 'signup' || type === 'magiclink' || type === 'invite' || isVerificationUrl) {
            console.log(`ProtectedRoute - Processing verification: ${type || 'unknown'}`);
            
            // Manually check the session
            const { data } = await supabase.auth.getSession();
            
            if (data.session) {
              console.log(`ProtectedRoute - Session found for verification`);
              // Don't redirect yet, let the App component handle the auth state update
            } else {
              console.log(`ProtectedRoute - No session found for verification, redirecting to login`);
              
              // For verification URLs, preserve the complete verification URL
              if (isVerificationUrl) {
                // Redirect to login and add a special parameter to indicate verification
                window.location.href = `/login?verified=true&type=${type || 'signup'}`;
                return;
              } else {
                // Normal confirmation params - preserve them in the redirect
                window.location.href = `/login${location.search}`;
                return;
              }
            }
          } else {
            // Standard auth parameter handling
            console.log('ProtectedRoute - Standard auth params, checking session');
            const { data } = await supabase.auth.getSession();
            if (data.session) {
              console.log('ProtectedRoute - Session found during manual check');
            }
          }
        } catch (err) {
          console.error('ProtectedRoute - Error checking session:', err);
        } finally {
          setIsCheckingAuth(false);
        }
      }
    };
    
    checkAuthStatus();
  }, [hasAuthParams, isAuthenticated, isCheckingAuth, isProcessingRedirect, location.search, location.pathname]);

  // For confirmation flows or verification URLs, redirect to login with the appropriate parameters
  if (isConfirmationFlow && !isAuthenticated && !isLoading) {
    console.log('ProtectedRoute - Confirmed email but not authenticated, redirecting to login');
    
    // Special case for Supabase verification URLs
    if (window.location.href.includes('/verify?token=')) {
      // Extract the type if available
      let type = 'signup';
      if (window.location.href.includes('type=signup')) {
        type = 'signup';
      } else if (window.location.href.includes('type=invite')) {
        type = 'invite';
      } else if (window.location.href.includes('type=magiclink')) {
        type = 'magiclink';
      }
      
      return <Navigate to={`/login?verified=true&type=${type}`} replace />;
    }
    
    // Normal confirmation params
    return <Navigate to={`/login${location.search}`} replace />;
  }

  // Show loading during initial auth check or when manually checking auth
  if (isLoading || isCheckingAuth || (hasAuthParams && !isConfirmationFlow)) {
    console.log('ProtectedRoute - Loading or checking auth state...');
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-700 dark:text-gray-300">Verifying your authentication...</p>
        </div>
      </div>
    );
  }

  // Special handling for the onboarding route
  // It should only be accessible if the user is authenticated
  if (location.pathname === '/onboarding') {
    if (!isAuthenticated) {
      console.log('ProtectedRoute - Not authenticated, redirecting from onboarding to login');
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    
    // If they're authenticated and trying to access onboarding,
    // but have already completed it, redirect to dashboard
    if (profile && profile.onboarding_complete) {
      console.log('ProtectedRoute - Onboarding already complete, redirecting to dashboard');
      return <Navigate to="/dashboard" replace />;
    }
    
    // Otherwise, show the onboarding page
    console.log('ProtectedRoute - Authenticated, showing onboarding');
    return <Outlet />;
  }

  // --- Onboarding Check ---
  // If authenticated but profile is loaded and onboarding is not complete,
  // redirect to onboarding page (unless already there).
  if (profile && !profile.onboarding_complete && location.pathname !== '/onboarding') {
    console.log('ProtectedRoute - Profile found but onboarding not complete. Redirecting to onboarding...', {
      profileId: profile.id,
      userId: profile.user_id,
      email: profile.email,
      onboardingComplete: profile.onboarding_complete
    });
    return <Navigate to="/onboarding" replace />;
  }
  // -----------------------

  // Special case for Supabase verification URLs
  const isVerificationUrl = window.location.href.includes('/verify?token=') || 
                            window.location.href.includes('/verify?code=') || 
                            window.location.pathname.includes('/auth/verify') ||
                            window.location.pathname === '/verify';

  if (isVerificationUrl) {
    console.log('ProtectedRoute - Verification URL detected, bypassing authentication check');
    // Let the verification routes handle this directly
    return <Outlet />;
  }

  // Add back the standard authentication check
  // Use wasAuthenticated to prevent disruption during token refreshes
  if (!isAuthenticated && !wasAuthenticated) {
    console.log('ProtectedRoute - Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated, render the child route component
  console.log('ProtectedRoute - Authenticated, rendering content');
  return <Outlet />;
};

export default ProtectedRoute; 