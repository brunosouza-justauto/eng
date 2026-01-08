import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Updates from 'expo-updates';

interface UpdateState {
  isChecking: boolean;
  isDownloading: boolean;
  isUpdateAvailable: boolean;
  isUpdatePending: boolean;
  error: string | null;
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
  });

  // Check for updates
  const checkForUpdates = useCallback(async (showNoUpdateAlert = false): Promise<UpdateCheckResult> => {
    // Skip in development mode
    if (__DEV__) {
      console.log('[Updates] Skipping update check in development mode');
      return { hasUpdate: false, showNoUpdateMessage: showNoUpdateAlert };
    }

    try {
      setState(prev => ({ ...prev, isChecking: true, error: null }));

      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        setState(prev => ({ ...prev, isChecking: false, isUpdateAvailable: true }));
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

  // Check for updates when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Silently check for updates when app becomes active
        silentUpdate();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [silentUpdate]);

  // Initial check on mount
  useEffect(() => {
    // Small delay to not block app startup
    const timer = setTimeout(() => {
      silentUpdate();
    }, 3000);

    return () => clearTimeout(timer);
  }, [silentUpdate]);

  return {
    ...state,
    checkForUpdates,
    downloadAndApplyUpdate,
    silentUpdate,
    reloadApp,
    // Expose update info
    updateId: Updates.updateId,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
  };
}
