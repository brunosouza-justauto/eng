import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Updates from 'expo-updates';

interface UpdateState {
  isChecking: boolean;
  isDownloading: boolean;
  isUpdateAvailable: boolean;
  isUpdatePending: boolean;
  error: string | null;
  showUpdatePrompt: boolean;
}

interface UpdateCheckResult {
  hasUpdate: boolean;
  showNoUpdateMessage?: boolean;
}

export function useAppUpdates() {
  const [state, setState] = useState<UpdateState>({
    isChecking: false,
    isDownloading: false,
    isUpdateAvailable: false,
    isUpdatePending: false,
    error: null,
    showUpdatePrompt: false,
  });
  const hasCheckedOnMount = useRef(false);

  // Check for updates
  const checkForUpdates = useCallback(async (showNoUpdateAlert = false, showPromptOnAvailable = false): Promise<UpdateCheckResult> => {
    // Skip in development mode
    if (__DEV__) {
      console.log('[Updates] Skipping update check in development mode');
      return { hasUpdate: false, showNoUpdateMessage: showNoUpdateAlert };
    }

    try {
      setState(prev => ({ ...prev, isChecking: true, error: null }));

      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        setState(prev => ({
          ...prev,
          isChecking: false,
          isUpdateAvailable: true,
          showUpdatePrompt: showPromptOnAvailable,
        }));
        return { hasUpdate: true };
      } else {
        setState(prev => ({ ...prev, isChecking: false, isUpdateAvailable: false }));
        return { hasUpdate: false, showNoUpdateMessage: showNoUpdateAlert };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to check for updates';
      console.error('[Updates] Check failed:', message);
      setState(prev => ({ ...prev, isChecking: false, error: message }));
      return { hasUpdate: false };
    }
  }, []);

  // Dismiss update prompt
  const dismissUpdatePrompt = useCallback(() => {
    setState(prev => ({ ...prev, showUpdatePrompt: false }));
  }, []);

  // Show update prompt manually
  const showPrompt = useCallback(() => {
    if (state.isUpdateAvailable) {
      setState(prev => ({ ...prev, showUpdatePrompt: true }));
    }
  }, [state.isUpdateAvailable]);

  // Download and apply update
  const downloadAndApplyUpdate = useCallback(async (): Promise<boolean> => {
    if (__DEV__) return false;

    try {
      setState(prev => ({ ...prev, isDownloading: true, error: null }));

      const result = await Updates.fetchUpdateAsync();

      if (result.isNew) {
        setState(prev => ({ ...prev, isDownloading: false, isUpdatePending: true }));
        return true;
      } else {
        setState(prev => ({ ...prev, isDownloading: false }));
        return false;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to download update';
      console.error('[Updates] Download failed:', message);
      setState(prev => ({ ...prev, isDownloading: false, error: message }));
      return false;
    }
  }, []);

  // Check and show prompt if update available
  const checkAndPrompt = useCallback(async () => {
    const { hasUpdate } = await checkForUpdates(false, true);
    return hasUpdate;
  }, [checkForUpdates]);

  // Silently check and download (for background updates)
  const silentUpdate = useCallback(async () => {
    const { hasUpdate } = await checkForUpdates();
    if (hasUpdate) {
      await downloadAndApplyUpdate();
    }
  }, [checkForUpdates, downloadAndApplyUpdate]);

  // Reload app with pending update
  const reloadApp = useCallback(async () => {
    if (state.isUpdatePending) {
      await Updates.reloadAsync();
    }
  }, [state.isUpdatePending]);

  // Check for updates when app comes to foreground (silently in background)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && hasCheckedOnMount.current) {
        // Silently check for updates when app becomes active (after initial check)
        silentUpdate();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [silentUpdate]);

  // Initial check on mount - show prompt if update available
  useEffect(() => {
    if (hasCheckedOnMount.current) return;
    hasCheckedOnMount.current = true;

    // Small delay to not block app startup
    const timer = setTimeout(() => {
      checkAndPrompt();
    }, 2000);

    return () => clearTimeout(timer);
  }, [checkAndPrompt]);

  return {
    ...state,
    checkForUpdates,
    downloadAndApplyUpdate,
    checkAndPrompt,
    silentUpdate,
    reloadApp,
    dismissUpdatePrompt,
    showPrompt,
    // Expose update info
    updateId: Updates.updateId,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
  };
}
