import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { selectIsAuthenticated, selectIsLoading, selectProfile } from '../store/slices/authSlice';

const AdminRoute: React.FC = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectIsLoading);
  const profile = useSelector(selectProfile);
  const location = useLocation();
  const [localLoading, setLocalLoading] = useState(true);
  
  // Add a short delay to ensure profile is fully loaded
  useEffect(() => {
    if (!isLoading && profile) {
      setLocalLoading(false);
    } else if (!isLoading && !profile && isAuthenticated) {
      // If auth is done but profile isn't loaded, wait a bit more
      const timer = setTimeout(() => setLocalLoading(false), 1000);
      return () => clearTimeout(timer);
    } else if (!isLoading) {
      setLocalLoading(false);
    }
  }, [isLoading, profile, isAuthenticated]);

  if (isLoading || localLoading) {
    // Show loading indicator while checking auth/profile status
    return (
      <div className="flex justify-center items-center min-h-screen">
        Verifying admin access...
      </div>
    );
  }

  if (!isAuthenticated) {
    // Not logged in, redirect to login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has the 'coach' role (adjust role name if different)
  if (profile?.role !== 'coach') {
      // Logged in but not an admin/coach, redirect to dashboard (or show an 'Unauthorized' page)
      console.warn('Admin access denied for user role:', profile?.role);
      return <Navigate to="/dashboard" replace />;
  }

  // If authenticated and has the coach role, render the child admin routes
  return <Outlet />;
};

export default AdminRoute; 