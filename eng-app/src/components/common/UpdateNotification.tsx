import React, { useState, useEffect } from 'react';

/**
 * A component that shows a notification when a new app version is available
 */
const UpdateNotification: React.FC = () => {
  const [showNotification, setShowNotification] = useState(false);
  
  useEffect(() => {
    // Listen for the service worker update event
    const handleUpdateFound = () => {
      setShowNotification(true);
    };
    
    window.addEventListener('serviceWorkerUpdateReady', handleUpdateFound);
    
    return () => {
      window.removeEventListener('serviceWorkerUpdateReady', handleUpdateFound);
    };
  }, []);
  
  const handleUpdate = () => {
    // Hide the notification
    setShowNotification(false);
    
    // Reload the page to apply updates
    window.location.reload();
  };
  
  const handleDismiss = () => {
    setShowNotification(false);
  };
  
  if (!showNotification) return null;
  
  return (
    <div className="fixed top-4 inset-x-0 z-50 flex justify-center px-4">
      <div className="bg-indigo-600 rounded-lg shadow-lg max-w-md w-full">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white">
                Check for updates
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={handleUpdate}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-white bg-indigo-800 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Update now
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex text-gray-400 hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-white"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateNotification; 