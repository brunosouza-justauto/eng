// PWA installation and update handler
let deferredPrompt: any;

// Listen for the 'beforeinstallprompt' event
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Store the event so it can be triggered later
  deferredPrompt = e;
  // Optionally, show your own install button or UI element
  showInstallPromotion();
});

// Function to show install promotion UI (customize as needed)
function showInstallPromotion() {
  // You can implement this to show a custom install button
  // For example, set a flag in your state management to display an install banner
  console.log('App can be installed - showing install promotion');
  
  // Example: dispatch an event that your React components can listen for
  window.dispatchEvent(new CustomEvent('pwaInstallable'));
}

// Function to trigger the PWA install prompt
export function installPWA() {
  if (!deferredPrompt) {
    console.log('Installation prompt not available');
    return;
  }
  
  // Show the install prompt
  deferredPrompt.prompt();
  
  // Wait for the user to respond to the prompt
  deferredPrompt.userChoice.then((choiceResult: { outcome: string }) => {
    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    // Clear the deferredPrompt so it can be garbage collected
    deferredPrompt = null;
  });
}

// Handle PWA updates
window.addEventListener('serviceWorkerUpdateReady', (event) => {
  const updateConfirm = window.confirm(
    'A new version of the app is available. Would you like to reload to update?'
  );
  
  if (updateConfirm) {
    window.location.reload();
  }
});

// Listen for the service worker being successfully registered
window.addEventListener('serviceWorkerRegistered', (event) => {
  console.log('Service worker registered: ', event);
});

// Export function to check if running as installed PWA
export function isRunningAsInstalledPWA() {
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.navigator.standalone || 
         document.referrer.includes('android-app://');
} 