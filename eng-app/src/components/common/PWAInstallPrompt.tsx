import React, { useState, useEffect } from 'react';
import { isAppInstallable, promptInstall } from '../../utils/pwaHandler';

const PWAInstallPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      // Use a combination of techniques to detect mobile
      const userAgent = navigator.userAgent || '';
      
      // Simple mobile detection regex
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
      
      // Also check screen size as a backup
      const smallScreen = window.innerWidth <= 768;
      
      setIsMobile(mobileRegex.test(userAgent.toLowerCase()) || smallScreen);
    };
    
    checkMobile();
    
    // Also check on resize in case of rotation or device changes
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);
  
  // Check if we should show the prompt
  useEffect(() => {
    // Only show on mobile devices
    if (!isMobile) return;
    
    // Check if the PWA is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const wasInstalled = localStorage.getItem('pwa_installed') === 'true';
    
    if (isStandalone || wasInstalled) {
      setShowPrompt(false);
      return;
    }
    
    // Check if the prompt was previously dismissed
    const lastDismissed = localStorage.getItem('pwa_prompt_dismissed_at');
    if (lastDismissed) {
      const dismissedTime = parseInt(lastDismissed, 10);
      const now = Date.now();
      // Only show if it's been more than a day since dismissal
      if (now - dismissedTime < 24 * 60 * 60 * 1000) {
        setShowPrompt(false);
        return;
      }
    }
    
    // Show prompt after a delay if the app is installable
    const checkInstallable = () => {
      if (isAppInstallable()) {
        setTimeout(() => {
          setShowPrompt(true);
        }, 3000);
      }
    };
    
    // Check initially and set up a timer to check periodically
    checkInstallable();
    const intervalId = setInterval(checkInstallable, 5000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [isMobile]);
  
  // Handle the install button click
  const handleInstallClick = async () => {
    try {
      const result = await promptInstall();
      
      if (result && result.outcome === 'accepted') {
        setShowPrompt(false);
      } else {
        setShowPrompt(false);
        // Store dismissal time
        localStorage.setItem('pwa_prompt_dismissed_at', Date.now().toString());
      }
    } catch (err) {
      console.error('Error during PWA installation:', err);
      setShowPrompt(false);
    }
  };
  
  // Handle the dismiss button click
  const dismissPrompt = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_prompt_dismissed', 'true');
    localStorage.setItem('pwa_prompt_dismissed_at', Date.now().toString());
  };
  
  // Don't show if the prompt is hidden
  if (!showPrompt) return null;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0 mr-3">
            <svg className="h-10 w-10 text-indigo-600 dark:text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Install ENG App</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">Add to your home screen for quick access</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={dismissPrompt}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Dismiss"
          >
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            onClick={handleInstallClick}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Install App
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt; 