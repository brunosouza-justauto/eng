import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient'; // We'll create this client soon
import { Link } from 'react-router-dom'; // Import Link for potential logo link

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          // Optional: Redirect URL after successful login from email link
          // emailRedirectTo: window.location.origin + '/dashboard',
        },
      });

      if (error) {
        throw error;
      }

      setMessage('Check your email for the login link!');
    } catch (error: unknown) {
      console.error('Error logging in:', error);
      let errorMessage = 'Failed to send login link.';
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
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-100 via-white to-cyan-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-xl shadow-2xl">
        {/* Optional Logo/Title */}
        <div className="text-center">
             <Link to="/" className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 hover:opacity-90">
                ENG App
            </Link>
             <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Earned Not Given</p>
        </div>
        
        {/* Form */}
        <form onSubmit={handleLogin} className="mt-8 space-y-6">
          {/* ... hidden fields or CSRF if needed later ... */}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
                <label htmlFor="email" className="sr-only">Email address</label>
                <input
                id="email"
                name="email" // Add name attribute
                type="email"
                autoComplete="email"
                required
                disabled={loading}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm disabled:opacity-60"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                />
            </div>
          </div>

          {/* Messages/Errors */}
            {message && <p className="text-sm text-center text-green-600 dark:text-green-400">{message}</p>}
            {error && <p className="text-sm text-center text-red-600 dark:text-red-400">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 dark:focus:ring-offset-gray-800"
            >
              {/* Optional: Add lock icon or similar */}
              {loading ? 'Sending Link...' : 'Send Magic Link'}
            </button>
          </div>
        </form>
        
        {/* Optional: Link to terms/privacy */}
        <p className="mt-4 text-xs text-center text-gray-500 dark:text-gray-400">
             By logging in, you agree to our non-existent Terms of Service.
        </p>
      </div>
    </div>
  );
};

export default LoginPage; 