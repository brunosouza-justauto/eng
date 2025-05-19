import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import ThemeToggle from '../../components/common/ThemeToggle';

const PasswordResetPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [showResetForm, setShowResetForm] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Verify the recovery token on mount
  useEffect(() => {
    const verifyRecoveryToken = async () => {
      try {
        // Extract token or code from URL
        const urlParams = new URLSearchParams(location.search);
        const token = urlParams.get('token');
        const code = urlParams.get('code');
        const type = urlParams.get('type');
        
        console.log('Password reset verification:', { 
          hasToken: !!token, 
          hasCode: !!code, 
          type,
          search: location.search
        });
        
        // Check for either token or code parameter (Supabase PKCE flow uses 'code' parameter)
        if ((!token && !code) || (type !== 'recovery' && !type)) {
          setError('Invalid password reset link. Please request a new one.');
          setIsVerifying(false);
          return;
        }
        
        // For PKCE flow with code parameter, the recovery type might not be in the URL
        // In this case the code itself is sufficient to indicate a recovery flow
        
        // We have a valid token/code - check if it's still valid by seeing if we have a session
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }
        
        // If we already have a session from the recovery token/code, we can show the password reset form
        if (data.session) {
          setShowResetForm(true);
          setIsVerifying(false);
        } else {
          // If we have a code but no session, we might need to exchange the code for a session
          if (code && !data.session) {
            try {
              // The session might be established automatically, but we can also try to get it explicitly
              console.log('No session found with recovery code, attempting to verify the session');
              
              // Wait a moment for the session to be established
              setTimeout(async () => {
                const { data: refreshedData, error: refreshError } = await supabase.auth.getSession();
                
                if (refreshError) {
                  throw refreshError;
                }
                
                if (refreshedData.session) {
                  console.log('Session established after delay');
                  setShowResetForm(true);
                  setIsVerifying(false);
                } else {
                  console.error('No session established after delay');
                  setError('The password reset link has expired. Please request a new one.');
                  setIsVerifying(false);
                }
              }, 1000); // Short delay to allow Supabase to process the auth flow
              
              return; // Return early as we're handling this asynchronously
            } catch (exchangeError) {
              console.error('Error exchanging code for session:', exchangeError);
              throw exchangeError;
            }
          } else {
            setError('The password reset link has expired. Please request a new one.');
            setIsVerifying(false);
          }
        }
      } catch (err) {
        console.error('Error verifying recovery token:', err);
        setError('There was a problem with your password reset link. Please request a new one.');
        setIsVerifying(false);
      }
    };
    
    verifyRecoveryToken();
  }, [location.search]);

  // Handle password reset form submission
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Form validation
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    
    setLoading(true);
    setError(null);
    setMessage(null);
    
    try {
      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });
      
      if (updateError) {
        throw updateError;
      }
      
      setMessage('Your password has been successfully reset. You will be redirected soon.');
      
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error('Error resetting password:', err);
      setError(typeof err === 'object' && err !== null && 'message' in err 
        ? (err as Error).message 
        : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  // Render loading state
  if (isVerifying) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 dark:bg-gray-900">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mb-4"></div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Verifying your request...</h1>
          <p className="text-gray-600 dark:text-gray-400">Please wait while we verify your password reset link.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
            ENG App
          </h1>
          <h2 className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Reset your password
          </h2>
        </div>

        <div className="mt-8 mx-auto w-full sm:max-w-md">
          <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow-lg rounded-lg sm:px-10">
            {/* Success Message */}
            {message && (
              <div className="mb-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800 dark:text-green-400">
                      {message}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800 dark:text-red-400">
                      {error}
                    </p>
                    {!showResetForm && (
                      <div className="mt-2">
                        <button
                          onClick={() => navigate('/login')}
                          className="text-sm text-red-600 dark:text-red-400 hover:underline"
                        >
                          Return to login
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Password Reset Form */}
            {showResetForm && (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-medium text-gray-900 dark:text-white">
                    Create a new password
                  </h2>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Please enter and confirm your new password
                  </p>
                </div>

                <form className="space-y-6" onSubmit={handleResetPassword}>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      New Password
                    </label>
                    <div className="mt-1">
                      <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm dark:bg-gray-700 dark:text-white"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Confirm Password
                    </label>
                    <div className="mt-1">
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={loading}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm dark:bg-gray-700 dark:text-white"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Updating...
                        </>
                      ) : 'Reset Password'}
                    </button>
                  </div>
                </form>
              </>
            )}
            
            {/* Return to login button for error case without form */}
            {!showResetForm && !error && (
              <div className="text-center">
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  There was a problem with your password reset link.
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                >
                  Return to Login
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetPage; 