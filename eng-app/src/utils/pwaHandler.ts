/**
 * Utility functions for PWA (Progressive Web App) functionality
 */

// Define interface for BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Define interface for Navigator with standalone property
interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

// Define type for gtag event parameters
interface GtagEventParams {
  event_category?: string;
  event_label?: string;
  value?: number;
  [key: string]: string | number | boolean | undefined;
}

// Define interface for Window with gtag property
interface WindowWithGtag extends Window {
  gtag?: (command: string, action: string, params?: GtagEventParams) => void;
}

// Track the beforeinstallprompt event
let deferredPrompt: BeforeInstallPromptEvent | null = null;

/**
 * Initialize PWA event listeners and handlers
 * Should be called early in the application lifecycle
 */
export const initPWA = (): void => {
  // Listen for beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    
    // Store the event for later use
    deferredPrompt = e as BeforeInstallPromptEvent;
    
  });

  // Listen for app installed event
  window.addEventListener('appinstalled', () => {
    // Clear the deferredPrompt variable
    deferredPrompt = null;
    
    // Track installation in localStorage
    localStorage.setItem('pwa_installed', 'true');
    localStorage.setItem('pwa_installed_at', Date.now().toString());
    
    // Optional: Send analytics about successful installation
    if ((window as WindowWithGtag).gtag) {
      (window as WindowWithGtag).gtag?.('event', 'pwa_install', {
        event_category: 'engagement',
        event_label: 'PWA Installation'
      });
    }
  });
  
  // Check if running in standalone mode (already installed)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    localStorage.setItem('pwa_installed', 'true');
  }
  
  // Check for iOS standalone mode
  if ('standalone' in window.navigator && 
      (window.navigator as NavigatorWithStandalone).standalone === true) {
    localStorage.setItem('pwa_installed', 'true');
  }
};

/**
 * Programmatically prompt the user to install the PWA
 * @returns Promise that resolves to the user's choice
 */
export const promptInstall = async (): Promise<{ outcome: string } | null> => {
  if (!deferredPrompt) {
    return null;
  }
  
  try {
    // Show the installation prompt
    await deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const choiceResult = await deferredPrompt.userChoice;
    
    // Reset the deferred prompt
    deferredPrompt = null;
    
    return choiceResult;
  } catch (error) {
    console.error('Error prompting for PWA installation:', error);
    return null;
  }
};

/**
 * Check if the app is installable as a PWA
 * @returns boolean indicating if the app can be installed
 */
export const isAppInstallable = (): boolean => {
  return deferredPrompt !== null;
};

export default {
  initPWA,
  promptInstall,
  isAppInstallable
}; 