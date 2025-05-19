import React from 'react';
import { Link } from 'react-router-dom';
import { FiAlertTriangle } from 'react-icons/fi';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectProfile } from '../store/slices/authSlice';

/**
 * 404 Not Found page component
 * Displays a user-friendly error page when a route doesn't match
 * Provides different navigation options based on user authentication status and role
 */
const NotFoundPage: React.FC = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const profile = useSelector(selectProfile);
  const isAdmin = profile?.role === 'admin' || profile?.role === 'coach';

  // Determine where to redirect the user based on their auth status and role
  const getHomeLink = () => {
    if (!isAuthenticated) return '/login';
    if (isAdmin) return '/admin';
    return '/dashboard';
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        <div className="p-6 text-center">
          <div className="flex justify-center mb-6">
            <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/20">
              <FiAlertTriangle className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">404</h1>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Page Not Found</h2>
          
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            The page you are looking for doesn't exist or has been moved.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to={getHomeLink()}
              className="inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900"
            >
              Go to {isAuthenticated ? (isAdmin ? 'Admin Dashboard' : 'Dashboard') : 'Login'}
            </Link>
            
            <button
              onClick={() => window.history.back()}
              className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage; 