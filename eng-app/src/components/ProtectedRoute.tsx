import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { selectIsAuthenticated, selectIsLoading, selectProfile } from '../store/slices/authSlice';

const ProtectedRoute: React.FC = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectIsLoading);
  const profile = useSelector(selectProfile);
  const location = useLocation();

  if (isLoading) {
    // Show a loading indicator while checking auth status
    // TODO: Replace with a proper loading spinner/component
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading authentication...
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect unauthenticated users to the login page
    // Pass the current location to redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // --- Onboarding Check ---
  // If authenticated but profile is loaded and onboarding is not complete,
  // redirect to onboarding page (unless already there).
  if (profile && !profile.onboarding_complete && location.pathname !== '/onboarding') {
      console.log('Redirecting to onboarding...', profile);
      return <Navigate to="/onboarding" replace />;
  }
  // -----------------------

  // If authenticated, render the child route component
  return <Outlet />;
};

export default ProtectedRoute; 