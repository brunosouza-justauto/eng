import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { selectIsAuthenticated, selectIsLoading, selectProfile } from '../store/slices/authSlice';

const ProtectedRoute: React.FC = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectIsLoading);
  const profile = useSelector(selectProfile);
  const location = useLocation();

  // Add debugging for auth state
  useEffect(() => {
    console.log('ProtectedRoute - Auth state:', { 
      isAuthenticated, 
      isLoading,
      hasProfile: !!profile,
      path: location.pathname,
      hash: window.location.hash
    });
  }, [isAuthenticated, isLoading, profile, location]);

  if (isLoading) {
    // Show a loading indicator while checking auth status
    console.log('ProtectedRoute - Loading auth state...');
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading authentication...
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect unauthenticated users to the login page
    // Pass the current location to redirect back after login
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