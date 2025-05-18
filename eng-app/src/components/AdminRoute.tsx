import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { selectIsAuthenticated, selectIsLoading, selectProfile } from '../store/slices/authSlice';

const AdminRoute: React.FC = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectIsLoading);
  const profile = useSelector(selectProfile);
  const location = useLocation();
  // Add a state variable to remember if user was previously authenticated as an admin
  const [wasAdmin, setWasAdmin] = useState<boolean>(false);

  // Use effect to track if user has been verified as admin
  useEffect(() => {
    if (profile?.role === 'coach') {
      setWasAdmin(true);
    }
  }, [profile?.role]);

  if (isLoading) {
    // Show loading indicator while checking auth/profile status
    return (
      <div className="flex justify-center items-center min-h-screen">
        Verifying access...
      </div>
    );
  }

  if (!isAuthenticated) {
    // Not logged in, redirect to login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Enhanced check for admin access that handles token refresh scenarios
  // If profile role is undefined but user was previously an admin, allow access
  // This prevents disruption during token refreshes
  if (profile?.role !== 'coach' && !wasAdmin) {
    // Logged in but not an admin/coach and was never an admin before,
    // redirect to dashboard (or show an 'Unauthorized' page)
    console.warn('Admin access denied for user role:', profile?.role);
    return <Navigate to="/dashboard" replace />;
  }

  // If authenticated and has coach role (or previously had it), render the admin routes
  return <Outlet />;
};

export default AdminRoute; 