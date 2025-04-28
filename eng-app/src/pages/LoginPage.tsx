import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient'; // We'll create this client soon

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
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white">Login</h1>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
              placeholder="your.email@example.com"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 dark:focus:ring-offset-gray-800"
            >
              {loading ? 'Sending...' : 'Send Magic Link'}
            </button>
          </div>
        </form>
        {message && <p className="text-sm text-center text-green-600 dark:text-green-400">{message}</p>}
        {error && <p className="text-sm text-center text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  );
};

export default LoginPage; 