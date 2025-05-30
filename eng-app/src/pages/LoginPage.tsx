import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient'; // We'll create this client soon
import ThemeToggle from '../components/common/ThemeToggle';
import { useDispatch } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import { useNavigate, useLocation } from 'react-router-dom';
import { getEmailProviderInfo, CommonEmailLinks, type EmailProvider } from '../utils/emailUtils';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [emailProvider, setEmailProvider] = useState<EmailProvider | null>(null);
  const [processingInvite, setProcessingInvite] = useState<boolean>(false);
  const [confirmationSuccess, setConfirmationSuccess] = useState<boolean>(false);
  const [confirmationType, setConfirmationType] = useState<string | null>(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // Check for invitation type or confirmation links in URL
  useEffect(() => {
    const checkForInvitationLink = async () => {
      // Parse query parameters
      const searchParams = new URLSearchParams(location.search);
      
      // Check for token, type, or other invitation parameters
      let token = searchParams.get('token');
      let type = searchParams.get('type');
      const verified = searchParams.get('verified') === 'true';
      const invitationEmail = searchParams.get('email') || '';
      
      // Special case for when we're redirected with 'verified=true'
      if (verified && type) {
        setConfirmationType(type);
        setConfirmationSuccess(true);
        
        // If an email is provided, use it
        if (invitationEmail) {
          setEmail(invitationEmail);
        }
        
        // No need to do further processing since this is our own redirect
        return;
      }
      
      // Check for verification link format directly (could be coming from email)
      // Supabase verification links have a specific format like /verify?token=xxx&type=signup
      const isVerificationUrl = window.location.href.includes('/verify?token=') || 
                                location.search.includes('verify?token=') ||
                                location.search.includes('token=');
                                
      // If we detect a verification URL but don't have the parameters yet, try to extract them
      if (isVerificationUrl && (!token || !type)) {
        // Try to extract the token from the URL
        const tokenMatch = window.location.href.match(/token=([^&]+)/);
        if (tokenMatch && tokenMatch[1]) {
          token = tokenMatch[1];
        }
        
        // Try to find the type in the URL
        if (window.location.href.includes('type=signup')) {
          type = 'signup';
        } else if (window.location.href.includes('type=invite')) {
          type = 'invite';
        } else if (window.location.href.includes('type=magiclink')) {
          type = 'magiclink';
        } else if (window.location.href.includes('type=recovery')) {
          type = 'recovery';
        } else {
          // Default to signup if we can't determine the type
          type = 'signup';
        }
      }
      
      // If we have a type and token, show confirmation success message
      if (token && (type === 'invite' || type === 'signup' || type === 'magiclink' || type === 'recovery')) {
        setConfirmationType(type);
        setConfirmationSuccess(true);
        
        // If an email is provided in the invitation link, use it
        if (invitationEmail) {
          setEmail(invitationEmail);
        }
        
        // The token processing is handled automatically by Supabase,
        // but we can explicitly try to get the session
        try {
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Error getting session from verification link:', error);
            // Instead of showing an error, we'll show the confirmation success message
          } else if (data?.session) {
            navigate('/dashboard');
            return;
          }
        } catch (e) {
          console.error('Exception processing verification link:', e);
        } finally {
          setProcessingInvite(false);
        }
      }
    };
    
    checkForInvitationLink();
  }, [location, navigate]);

  // Function to get a human-readable description of the confirmation type
  const getConfirmationTypeText = () => {
    switch (confirmationType) {
      case 'signup':
        return 'registration';
      case 'invite':
        return 'invitation';
      case 'magiclink':
        return 'login link';
      case 'recovery':
        return 'password recovery';
      default:
        return 'email';
    }
  };

  // Check for existing session on mount and redirect if authenticated
  useEffect(() => {
    const checkExistingSession = async () => {
      // Only run this check if we're not already processing an invitation
      if (processingInvite) return;
      
      // Clear any stale PKCE auth state that might be causing issues
      const hash = window.location.hash;
      if (!hash.includes('access_token') && !hash.includes('refresh_token')) {
        // Only clear the PKCE state if we're not in the middle of auth flow
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('supabase.auth.token.refresh');
        // Don't remove the entire eng_supabase_auth - only clear specific problematic keys
        try {
          const authData = JSON.parse(localStorage.getItem('eng_supabase_auth') || '{}');
          if (authData.flowType === 'pkce' && authData.codeVerifier) {
            // If there's a stale code verifier without an active auth flow, remove it
            delete authData.codeVerifier;
            localStorage.setItem('eng_supabase_auth', JSON.stringify(authData));
          }
        } catch (e) {
          console.error('Error cleaning up auth state:', e);
        }
      }

      // Now check for a valid session
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          navigate('/dashboard');
        }
      } catch (e) {
        console.error('Error checking for existing session:', e);
      }
    };
    
    checkExistingSession();
  }, [navigate, processingInvite]);

  // Handle login with either magic link or password
  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    
    // Reset confirmation state to ensure login messages will be visible
    setConfirmationSuccess(false);
    
    try {
      // Password login (new functionality)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        navigate('/dashboard');
      }
    } catch (error: unknown) {
      console.error('Error logging in:', error);
      let errorMessage = 'Failed to sign in with password.';
      
      if (typeof error === 'object' && error !== null) {
        if ('error_description' in error && typeof error.error_description === 'string') {
            errorMessage = error.error_description;
        } else if ('message' in error && typeof error.message === 'string') {
            errorMessage = error.message;
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle registration with email and password
  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!email ||!password) {
      setError('Please enter an email and password to create an account and then click the "Create Account" button again.');
      return;
    }
    
    setError('');
    setMessage('');
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify`,
        }
      });

      if (error) {
        throw error;
      }

      // Check if email confirmation is required
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setError('The email address is already in use');
      } else {
        setMessage('Registration successful! You can now sign in.');
        navigate('/dashboard');
      }
    } catch (error: unknown) {
      console.error('Error during registration:', error);
      let errorMessage = 'Failed to create account.';
      if (typeof error === 'object' && error !== null) {
        if ('error_description' in error && typeof error.error_description === 'string') {
            errorMessage = error.error_description;
        } else if ('message' in error && typeof error.message === 'string') {
            errorMessage = error.message;
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Debug function to clear any existing session
  const handleClearSession = async () => {
    try {
      await supabase.auth.signOut();
      dispatch(logout()); 
      localStorage.clear();
      sessionStorage.clear();
      
      // Force reload the page to ensure a clean state
      window.location.href = '/login';
    } catch (err) {
      console.error('Error clearing session:', err);
      setError('Failed to clear session');
    }
  };

  // Handle forgot password flow
  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }
    
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password?type=recovery`,
      });
      
      if (error) {
        throw error;
      }
      
      // Detect email provider for convenience
      const provider = getEmailProviderInfo(email);
      setEmailProvider(provider);
      setMessage('Password reset instructions have been sent to your email');
      
    } catch (error: unknown) {
      console.error('Error requesting password reset:', error);
      let errorMessage = 'Failed to send password reset email.';
      if (typeof error === 'object' && error !== null) {
        if ('error_description' in error && typeof error.error_description === 'string') {
            errorMessage = error.error_description;
        } else if ('message' in error && typeof error.message === 'string') {
            errorMessage = error.message;
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
            Earned Not Given — progress you can measure, effort you can track.
          </h2>
        </div>

        <div className="mt-8 mx-auto w-full sm:max-w-md">
          <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow-lg rounded-lg sm:px-10">
            {/* Confirmation Success Message */}
            {confirmationSuccess && (
              <div className="mb-6 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800 dark:text-green-400">
                      Thank you for confirming your {getConfirmationTypeText()}!
                    </p>
                    <p className="mt-2 text-sm text-green-700 dark:text-green-500">
                      Your email has been verified. Please log in below to continue.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Login Form Success Message */}
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
                    
                    {/* Email provider links */}
                    {emailProvider && (
                      <div className="mt-2">
                        <a 
                          href={emailProvider.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1.5 bg-white dark:bg-gray-700 border border-green-300 dark:border-green-600 rounded-md text-sm text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-800/30 transition-colors"
                        >
                          <span className="mr-2">{emailProvider.icon}</span>
                          Open {emailProvider.name}
                        </a>
                      </div>
                    )}
                    
                    {/* Common email links for other providers */}
                    {!emailProvider && message.includes('Check your email') && (
                      <div className="mt-2 space-y-2">
                        <p className="text-xs text-green-700 dark:text-green-500">
                          Open your email provider:
                        </p>
                        <CommonEmailLinks />
                      </div>
                    )}
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
                  </div>
                </div>
              </div>
            )}

            <div className="mb-6">
              <h2 className="text-xl font-medium text-gray-900 dark:text-white">
                Sign in to your account
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Enter your email and password to sign in
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleLogin}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm dark:bg-gray-700 dark:text-white"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* Password Field - Only shown when password auth method is selected */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm dark:bg-gray-700 dark:text-white"
                    placeholder="••••••••"
                  />
                </div>
                <div className="mt-1 text-right">
                  <button 
                    type="button" 
                    onClick={handleForgotPassword}
                    className="text-xs text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    Forgot your password?
                  </button>
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
                      Signing in...
                    </>
                  ) : 'Sign in'}
                </button>
              </div>
            </form>

            {/* Sign Up Section - Only shown when password auth method is selected */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    Don't have an account?
                  </span>
                </div>
              </div>

              <form className="mt-6" onSubmit={handleSignUp}>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-700 dark:text-indigo-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Account...
                    </>
                  ) : 'Create Account'}
                </button>
              </form>
            </div>

            <div className="mt-6 text-center text-sm">
              <p className="text-gray-600 dark:text-gray-400">
                Having trouble logging in? 
                <button 
                  onClick={handleClearSession}
                  className="ml-2 text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  Clear Session & Try Again
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 