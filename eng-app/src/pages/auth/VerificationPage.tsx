import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';

const VerificationPage: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const processVerification = async () => {
      try {
        console.log('VerificationPage - Processing verification URL:', window.location.href);
        
        // Extract verification parameters from URL
        const urlParams = new URLSearchParams(location.search);
        // Check for both token and code parameters (Supabase uses 'code' for PKCE flow)
        let token = urlParams.get('token') || urlParams.get('code');
        const type = urlParams.get('type') || 'signup'; // Default to signup if type is not provided
        
        // Log parameters for debugging
        console.log('VerificationPage - Parameters:', { 
          token: token ? 'Present' : 'Not present', 
          type, 
          hasCode: urlParams.has('code'),
          fullQuery: location.search
        });
        
        // For Supabase verification URLs, the token/code is present but might not be processed yet
        if (token) {
          console.log(`VerificationPage - Found verification token/code, type: ${type}`);
          
          try {
            // For code parameter (PKCE flow), we might need to exchange the code for a session
            if (urlParams.has('code') && !urlParams.has('token')) {
              console.log('VerificationPage - Detected PKCE flow with code parameter');
              
              // For PKCE flow, the code parameter likely means successful email verification
              // Even if we don't have a session yet, we can show a success message
              
              // Try to get any email parameter that might have been added in the redirect
              let email = urlParams.get('email') || '';
              
              // If no email in params, look for hints in the URL or localStorage
              if (!email) {
                // Try to extract email from other parts of the URL if available
                const emailMatch = window.location.href.match(/email=([^&]+)/);
                if (emailMatch && emailMatch[1]) {
                  email = decodeURIComponent(emailMatch[1]);
                  console.log('VerificationPage - Extracted email from URL:', email);
                } else {
                  // Check if we have this information in localStorage
                  try {
                    const authData = JSON.parse(localStorage.getItem('eng_supabase_auth') || '{}');
                    if (authData.email) {
                      email = authData.email;
                      console.log('VerificationPage - Retrieved email from localStorage:', email);
                    }
                  } catch (e) {
                    console.error('Error retrieving email from localStorage:', e);
                  }
                }
              }
              
              console.log('VerificationPage - Redirecting to login with success message', { 
                type, 
                hasEmail: !!email,
                email: email ? `${email.substring(0, 3)}...${email.split('@')[1] || ''}` : null 
              });
              
              // Redirect to login with verification success parameters
              navigate(`/login?verified=true&type=${type}${email ? `&email=${encodeURIComponent(email)}` : ''}`);
              return;
            }
            
            // Check if the verification already gave us a session
            const { data, error } = await supabase.auth.getSession();
            
            if (error) {
              console.error('Error checking session after verification:', error);
              setError('Error verifying your email. Please try logging in directly.');
            } else if (data.session) {
              // If we have a session, the verification was successful - redirect to dashboard or onboarding
              console.log('VerificationPage - Verification successful, session established');
              
              // Check the profile to see if onboarding is complete
              const { data: profileData } = await supabase
                .from('profiles')
                .select('onboarding_complete')
                .eq('user_id', data.session.user.id)
                .single();
                
              if (profileData && profileData.onboarding_complete) {
                navigate('/dashboard');
                return;
              } else {
                navigate('/onboarding');
                return;
              }
            } else {
              // No session but we have a token/code - redirect to login with verified=true
              console.log('VerificationPage - Email verified but no session, redirecting to login');
              navigate(`/login?verified=true&type=${type}`);
              return;
            }
          } catch (verificationError) {
            console.error('Error during verification process:', verificationError);
            setError('Error processing your verification. Please try logging in directly.');
          }
        } else {
          // No token or code in URL - check if there's a hash with access_token
          const hash = window.location.hash;
          if (hash.includes('access_token')) {
            console.log('VerificationPage - Found access_token in hash, attempting to extract');
            const accessTokenMatch = hash.match(/access_token=([^&]+)/);
            if (accessTokenMatch && accessTokenMatch[1]) {
              token = accessTokenMatch[1];
              console.log('VerificationPage - Extracted access token from hash');
              // Redirect to login with the token information
              navigate(`/login?verified=true&type=${type}`);
              return;
            }
          }
          
          // No token/code and no access_token in hash
          console.log('VerificationPage - No verification token or code found in URL');
          setError('Invalid verification link. Please try logging in directly.');
        }
      } catch (err) {
        console.error('Error in verification process:', err);
        setError('An error occurred during verification. Please try logging in directly.');
      } finally {
        setIsProcessing(false);
      }
    };
    
    processVerification();
  }, [location, navigate]);

  // Show a loading spinner while processing
  if (isProcessing) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mb-4"></div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Verifying your email...</h1>
          <p className="text-gray-600 dark:text-gray-400">Please wait while we process your verification.</p>
        </div>
      </div>
    );
  }

  // Show an error message if something went wrong
  if (error) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
          </div>
          <h1 className="mt-4 text-xl font-semibold text-gray-800 dark:text-white">Verification Error</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-6 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // This should not be rendered normally as we should redirect before reaching here
  return null;
};

export default VerificationPage; 