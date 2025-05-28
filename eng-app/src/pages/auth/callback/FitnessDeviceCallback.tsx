import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectProfile, selectIsLoading } from '../../../store/slices/authSlice';
import { handleOAuthCallback, storeDeviceConnection, cleanupOAuthState } from '../../../services/fitnessSyncService';
import { FiCheck, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import { supabase } from '../../../services/supabaseClient';

/**
 * This component handles OAuth callbacks from fitness device providers.
 * It extracts the authorization code and state from the URL,
 * exchanges it for access tokens, and stores the connection in the database.
 */
const FitnessDeviceCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const profile = useSelector(selectProfile);
  const authLoading = useSelector(selectIsLoading);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [deviceName, setDeviceName] = useState<string>('');
  const [provider, setProvider] = useState<string>('');
  // Use a ref to track processing state across renders
  const processingRef = useRef(false);
  // Add a ref to track if we have an error timer
  const errorTimerRef = useRef<number | null>(null);
  
  // Generate a more reliable session key that includes the oauth state parameter
  const params = new URLSearchParams(location.search);
  const oauthState = params.get('state') || '';
  const sessionKey = `oauth_callback_processed_${oauthState}`;

  // Function to safely set error status with a delay
  const setErrorWithDelay = (message: string) => {
    // Clear any existing error timer
    if (errorTimerRef.current !== null) {
      window.clearTimeout(errorTimerRef.current);
    }

    // Set a new timer that will show the error after 2 seconds
    // This gives other component instances a chance to succeed
    errorTimerRef.current = window.setTimeout(() => {
      // Before showing the error, check if we've already succeeded
      // by checking session storage again
      if (sessionStorage.getItem(`${sessionKey}_success`) === 'true') {
        return;
      }
      
      setStatus('error');
      setErrorMessage(message);
      errorTimerRef.current = null;
    }, 2000);
  };
  
  // Extract path info first, so provider is immediately available
  useEffect(() => {
    const path = location.pathname;
    const rawProviderName = path.split('/').pop() || '';
    // Always normalize provider name immediately to avoid empty string issues
    const normalizedProvider = rawProviderName === 'google-fit' ? 'google_fit' : rawProviderName;
    setProvider(normalizedProvider);
    
    // Check session storage immediately
    if (sessionStorage.getItem(`${sessionKey}_success`) === 'true') {
      setStatus('success');
      setDeviceName(getDeviceName(normalizedProvider));
      
      // Redirect back to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    }
    
    // Clean up any error timers on unmount
    return () => {
      if (errorTimerRef.current !== null) {
        window.clearTimeout(errorTimerRef.current);
      }
    };
  }, [location, sessionKey, navigate]);
  
  // Process the callback after we have both the provider and auth state
  useEffect(() => {
    // Skip if already processed or if provider isn't set yet
    if (sessionStorage.getItem(`${sessionKey}_success`) === 'true' || !provider) {
      return;
    }
    
    // Skip if auth is still loading
    if (authLoading) {
      return;
    }
    
    // Skip if user is not authenticated
    if (!profile) {
      console.error('User not authenticated after loading complete');
      setErrorWithDelay('Authentication required. Please log in and try again.');
      return;
    }
    
    // Use ref to prevent duplicate processing across effect reruns
    if (processingRef.current) {
      return;
    }
    
    const processCallback = async () => {
      // Set processing flag immediately using ref
      processingRef.current = true;
      
      try {
        // Set a process flag in session storage
        sessionStorage.setItem(`${sessionKey}_processing`, 'true');
        
        // Extract authorization code and state from URL
        const code = params.get('code');
        
        if (!code || !oauthState) {
          throw new Error('Missing authorization code or state');
        }
        
        // Add a small delay to ensure any other instances see our sessionStorage flag
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // First, check if we already have a connection for this provider
        const { data: existingConnections, error: fetchError } = await supabase
          .from('device_connections')
          .select('*')
          .eq('user_id', profile.user_id)
          .eq('device_type', provider);
          
        if (fetchError) {
          console.error('Error checking for existing connections:', fetchError);
          throw fetchError;
        }
          
        if (existingConnections && existingConnections.length > 0) {
          setDeviceName(getDeviceName(provider));
          setStatus('success');
          
          // Mark as successfully processed in session storage
          sessionStorage.setItem(`${sessionKey}_success`, 'true');
          
          // Redirect back to dashboard after 3 seconds
          setTimeout(() => {
            navigate('/dashboard');
          }, 3000);
          
          return;
        }

        // Exchange authorization code for tokens
        const providerData = await handleOAuthCallback(code, oauthState);
        
        setDeviceName(getDeviceName(providerData.provider));

        // Store the connection in the database
        await storeDeviceConnection(profile.user_id, providerData);

        // Clean up OAuth state now that we're done with it
        cleanupOAuthState();
        
        // Mark as successful in both states and session
        setStatus('success');
        sessionStorage.setItem(`${sessionKey}_success`, 'true');

        // Clear any pending error timers
        if (errorTimerRef.current !== null) {
          window.clearTimeout(errorTimerRef.current);
          errorTimerRef.current = null;
        }

        // Redirect back to dashboard after 3 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      } catch (err) {
        console.error('Error processing OAuth callback:', err);
        
        // Use the delayed error setting function
        const errorMsg = err instanceof Error ? err.message : 'An unknown error occurred';
        setErrorWithDelay(errorMsg);
        
        // Always mark processing as done, but don't use the success flag
        sessionStorage.setItem(`${sessionKey}_processing`, 'false');
      }
    };

    processCallback();
  }, [location, navigate, profile, provider, authLoading, sessionKey, params, oauthState]);

  // Helper to get a user-friendly device name
  const getDeviceName = (providerType: string): string => {
    switch (providerType) {
      case 'fitbit':
        return 'Fitbit';
      case 'garmin':
        return 'Garmin';
      case 'google_fit':
        return 'Google Fit';
      case 'apple_health':
        return 'Apple Health';
      case 'samsung_health':
        return 'Samsung Health';
      default:
        return 'Fitness Device';
    }
  };

  // Function to retry the connection
  const handleRetry = () => {
    cleanupOAuthState();
    sessionStorage.removeItem(sessionKey);
    sessionStorage.removeItem(`${sessionKey}_success`);
    sessionStorage.removeItem(`${sessionKey}_processing`);
    processingRef.current = false;
    
    // Clear any error timers
    if (errorTimerRef.current !== null) {
      window.clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
    
    navigate('/dashboard', { state: { retryConnection: provider } });
  };

  const isExpiredError = errorMessage.includes('OAuth state expired');
  const isAuthError = errorMessage.includes('User not authenticated');

  // Shows a loading state while we wait for authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <h1 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
            Verifying Your Account...
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Please wait while we verify your account information.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500 mx-auto mb-4"></div>
            <h1 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              Connecting Your Fitness Device
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait while we securely connect your fitness device...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              Successfully Connected!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Your {deviceName} has been successfully connected to your account.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Redirecting you back to the dashboard...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiAlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              Connection Failed
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Sorry, we couldn't connect your fitness device.
            </p>
            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md text-sm text-red-800 dark:text-red-300 mb-4">
              {errorMessage}
            </div>
            
            {(isExpiredError || isAuthError) && (
              <button 
                onClick={handleRetry}
                className="mb-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <FiRefreshCw className="mr-2" /> Try Again
              </button>
            )}
            
            <p className="text-sm text-gray-500 dark:text-gray-500">
              {!isExpiredError && !isAuthError && "Redirecting you back to the dashboard..."}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default FitnessDeviceCallback; 