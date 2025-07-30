// PWA installation and update handler

// Define interface for BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Define interface for Navigator with standalone property
interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

// Track the beforeinstallprompt event
let deferredPrompt: BeforeInstallPromptEvent | null = null;

// Flag to track if update prompt has been shown recently
let updatePromptShown = false;

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {       
        // Handle updates
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker == null) {
            return;
          }
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {                
                // Check if update prompt should be shown
                const lastUpdatePrompt = localStorage.getItem('pwa_update_prompted_at');
                const now = Date.now();
                let shouldPrompt = true;
                
                // Only show the update prompt once per 24 hours
                if (lastUpdatePrompt) {
                  const lastPromptTime = parseInt(lastUpdatePrompt, 10);
                  shouldPrompt = (now - lastPromptTime) > (24 * 60 * 60 * 1000);
                }
                
                // Dispatch event for UI components to show update notification if not recently shown
                if (shouldPrompt && !updatePromptShown) {
                  window.dispatchEvent(new CustomEvent('serviceWorkerUpdateReady'));
                  localStorage.setItem('pwa_update_prompted_at', now.toString());
                  updatePromptShown = true;
                }
              }
            }
          };
        };
      })
      .catch((error) => {
        console.error('ServiceWorker registration failed:', error);
      });
  });
}

// Listen for the 'beforeinstallprompt' event
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Store the event so it can be triggered later
  deferredPrompt = e as BeforeInstallPromptEvent;
  
  // Dispatch an event that React components can listen for
  window.dispatchEvent(new CustomEvent('pwaInstallable'));
});

// Listen for app installed event
window.addEventListener('appinstalled', () => {
  // Clear the deferredPrompt variable
  deferredPrompt = null;
  
  // Track installation in localStorage
  localStorage.setItem('pwa_installed', 'true');
  localStorage.setItem('pwa_installed_at', Date.now().toString());
});

// Function to trigger the PWA install prompt
export async function installPWA(): Promise<{ outcome: string } | null> {
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
}

// Check if the app is installable as a PWA
export function isAppInstallable(): boolean {
  return deferredPrompt !== null;
}

// Export function to check if running as installed PWA
export function isRunningAsInstalledPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || 
         ('standalone' in window.navigator && (window.navigator as NavigatorWithStandalone).standalone === true) || 
         document.referrer.includes('android-app://');
}

// Initialize the updatePromptShown flag from localStorage to persist across sessions
const initializeUpdatePromptFlag = () => {
  const lastUpdatePrompt = localStorage.getItem('pwa_update_prompted_at');
  if (lastUpdatePrompt) {
    const lastPromptTime = parseInt(lastUpdatePrompt, 10);
    const now = Date.now();
    // If less than 24 hours have passed, consider the prompt as already shown
    updatePromptShown = (now - lastPromptTime) < (24 * 60 * 60 * 1000);
  }
};

// Initialize the flag when the module loads
initializeUpdatePromptFlag();

export default {
  installPWA,
  isAppInstallable,
  isRunningAsInstalledPWA
}; 