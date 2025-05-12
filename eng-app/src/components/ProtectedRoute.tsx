import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { selectIsAuthenticated, selectIsLoading, selectProfile } from '../store/slices/authSlice';
import { supabase } from '../services/supabaseClient';

const ProtectedRoute: React.FC = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectIsLoading);
  const profile = useSelector(selectProfile);
  const location = useLocation();
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);

  // Check if we have auth parameters in the URL
  const hasAuthParams = window.location.hash.includes('access_token') || 
                         window.location.hash.includes('refresh_token') ||
                         window.location.search.includes('refresh_token');

  // Add debugging for auth state
  useEffect(() => {
    console.log('ProtectedRoute - Auth state:', { 
      isAuthenticated, 
      isLoading,
      hasProfile: !!profile,
      path: location.pathname,
      hash: window.location.hash,
      hasAuthParams
    });
  }, [isAuthenticated, isLoading, profile, location, hasAuthParams]);

  // Special case for when we have auth params but no authenticated state yet
  // This helps handle the redirect after email verification
  useEffect(() => {
    const checkAuthStatus = async () => {
      if (hasAuthParams && !isAuthenticated && !isCheckingAuth) {
        setIsCheckingAuth(true);
        console.log('ProtectedRoute - Auth params detected, checking session');
        
        try {
          // Manually check the session
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            console.log('ProtectedRoute - Session found during manual check');
            // Don't redirect yet, let the App component handle the auth state update
            // This will trigger a re-render with isAuthenticated = true
          }
        } catch (err) {
          console.error('ProtectedRoute - Error checking session:', err);
        } finally {
          setIsCheckingAuth(false);
        }
      }
    };
    
    checkAuthStatus();
  }, [hasAuthParams, isAuthenticated, isCheckingAuth]);

  // Show loading during initial auth check or when manually checking auth
  if (isLoading || isCheckingAuth || hasAuthParams) {
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

  // Standard handling for other protected routes
  if (!isAuthenticated) {
    console.log('ProtectedRoute - Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
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

  // If authenticated, render the child route component
  console.log('ProtectedRoute - Authenticated, rendering content');
  return <Outlet />;
};

export default ProtectedRoute; 