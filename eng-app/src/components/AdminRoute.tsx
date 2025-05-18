import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { selectIsAuthenticated, selectIsLoading, selectProfile } from '../store/slices/authSlice';

const AdminRoute: React.FC = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectIsLoading);
  const profile = useSelector(selectProfile);
  const location = useLocation();

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