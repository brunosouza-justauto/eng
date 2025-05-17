import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import { 
  FiActivity, FiArrowUp, FiWatch, FiPlus, FiRefreshCw, FiCalendar, 
  FiAward, FiTrendingUp, FiChevronRight, FiX, FiAlertCircle, FiTarget
} from 'react-icons/fi';
import { supabase } from '../../services/supabaseClient';
import { useSelector } from 'react-redux';
import { selectProfile } from '../../store/slices/authSlice';
import { format, subDays } from 'date-fns';
import {
  initiateOAuth,
  syncStepsFromDevice as syncAPIStepsFromDevice,
  disconnectDevice as disconnectAPIDevice
} from '../../services/fitnessSyncService';
import PersonalStepGoalModal from './PersonalStepGoalModal';

interface StepGoalWidgetProps {
  dailyGoal: number | null | undefined;
}

interface StepEntry {
  id: string;
  user_id: string;
  date: string;
  step_count: number;
  created_at: string;
  updated_at: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
}

// Device types
interface DeviceConnection {
  id: string;
  type: 'fitbit' | 'garmin' | 'apple_health' | 'google_fit' | 'samsung_health';
  name: string;
  icon: React.ReactNode;
  lastSynced: Date | null;
  status: 'connected' | 'disconnected' | 'pending';
  connectUrl: string;
}

const StepGoalWidget: React.FC<StepGoalWidgetProps> = ({ dailyGoal }) => {
  const profile = useSelector(selectProfile);
  
  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [stepEntry, setStepEntry] = useState<StepEntry | null>(null);
  const [manualSteps, setManualSteps] = useState<string>('');
  const [showManualEntry, setShowManualEntry] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);
  const [historyData, setHistoryData] = useState<StepEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [streak, setStreak] = useState<number>(0);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [showAchievements, setShowAchievements] = useState<boolean>(false);
  const [showDeviceModal, setShowDeviceModal] = useState<boolean>(false);
  const [selectedDevice, setSelectedDevice] = useState<DeviceConnection | null>(null);
  const [connectedDevices, setConnectedDevices] = useState<DeviceConnection[]>([]);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [syncInProgress, setSyncInProgress] = useState<boolean>(false);
  const [showPersonalGoalModal, setShowPersonalGoalModal] = useState<boolean>(false);
  
  const today = format(new Date(), 'yyyy-MM-dd');
  
  const progressPercentage = dailyGoal && dailyGoal > 0 
                           ? Math.min(100, Math.round((currentProgress / dailyGoal) * 100)) 
                           : 0;

  // Helper function to show status messages instead of using toast
  const showMessage = (text: string, type: 'success' | 'error') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Fetch current day's step data
  useEffect(() => {
    const fetchStepData = async () => {
      if (!profile || !profile.id) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('step_entries')
          .select('*')
          .eq('user_id', profile.user_id)
          .eq('date', today)
          .maybeSingle();
          
        if (error) throw error;
        
        if (data) {
          setStepEntry(data);
          setCurrentProgress(data.step_count);
        } else {
          setStepEntry(null);
          setCurrentProgress(0);
        }
      } catch (err) {
        console.error('Error fetching step data:', err);
        showMessage('Failed to load your step data', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (profile) {
      fetchStepData();
    }
  }, [profile, today]);

  // Fetch step history and calculate streak
  useEffect(() => {
    const fetchStepHistory = async () => {
      if (!profile || !profile.id) return;
      
      setIsLoadingHistory(true);
      try {
        // Get step data for the last 7 days
        const sevenDaysAgo = format(subDays(new Date(), 6), 'yyyy-MM-dd');
        console.log('Fetching history from', sevenDaysAgo, 'to', today);
        
        const { data, error } = await supabase
          .from('step_entries')
          .select('*')
          .eq('user_id', profile.user_id)
          .gte('date', sevenDaysAgo)
          .lte('date', today)
          .order('date', { ascending: false });
          
        if (error) throw error;
        
        console.log('History data fetched:', data);
        
        if (data && data.length > 0) {
          setHistoryData(data);
          
          // Calculate streak - consecutive days where step goal was met
          if (dailyGoal) {
            let currentStreak = 0;
            let date = new Date();
            let checkingDate = true;
            
            while (checkingDate) {
              const dateString = format(date, 'yyyy-MM-dd');
              const entry = data.find(d => d.date === dateString);
              
              // If we found an entry and the goal was met
              if (entry && entry.step_count >= (dailyGoal || 0)) {
                currentStreak++;
                date = subDays(date, 1);
              } else {
                checkingDate = false;
              }
            }
            
            setStreak(currentStreak);
          }
        } else {
          console.log('No history data found');
          setHistoryData([]);
          setStreak(0);
        }
      } catch (err) {
        console.error('Error fetching step history:', err);
        showMessage('Failed to load step history', 'error');
      } finally {
        setIsLoadingHistory(false);
      }
    };
    
    if (profile && dailyGoal) {
      fetchStepHistory();
    }
  }, [profile, dailyGoal, today, currentProgress]);

  // Calculate achievements
  useEffect(() => {
    if (!profile || !dailyGoal) return;
    
    const calculateAchievements = () => {
      const newAchievements: Achievement[] = [
        {
          id: 'first_steps',
          name: 'First Steps',
          description: 'Logged your first steps',
          icon: <FiActivity className="text-indigo-500" />,
          unlocked: currentProgress > 0
        },
        {
          id: 'goal_complete',
          name: 'Goal Crusher',
          description: 'Reached your daily step goal',
          icon: <FiAward className="text-yellow-500" />,
          unlocked: currentProgress >= (dailyGoal || 0)
        },
        {
          id: 'streak_3',
          name: 'Consistency',
          description: 'Met your goal 3 days in a row',
          icon: <FiTrendingUp className="text-green-500" />,
          unlocked: streak >= 3
        },
        {
          id: 'streak_7',
          name: 'Week Warrior',
          description: 'Met your goal 7 days in a row',
          icon: <FiCalendar className="text-purple-500" />,
          unlocked: streak >= 7
        },
        {
          id: 'overachiever',
          name: 'Overachiever',
          description: 'Exceeded your goal by 25%',
          icon: <FiArrowUp className="text-red-500" />,
          unlocked: currentProgress >= (dailyGoal || 0) * 1.25
        }
      ];
      
      setAchievements(newAchievements);
    };
    
    calculateAchievements();
  }, [currentProgress, dailyGoal, streak]);

  // Function to determine progress color
  const getProgressColor = () => {
    if (progressPercentage < 25) return 'bg-red-500 dark:bg-red-600';
    if (progressPercentage < 75) return 'bg-yellow-500 dark:bg-yellow-600';
    return 'bg-green-500 dark:bg-green-600';
  };

  // Function to add steps manually
  const addStepsManually = async () => {
    if (!profile || !profile.id) return;
    
    const steps = parseInt(manualSteps, 10);
    if (isNaN(steps) || steps <= 0) {
      showMessage('Please enter a valid number of steps', 'error');
      return;
    }
    
    setIsUpdating(true);
    try {
      if (stepEntry) {
        // Update existing entry
        const newTotal = stepEntry.step_count + steps;
        const { error } = await supabase
          .from('step_entries')
          .update({ 
            step_count: newTotal,
            updated_at: new Date().toISOString()
          })
          .eq('id', stepEntry.id);
          
        if (error) throw error;
        
        setCurrentProgress(newTotal);
        setStepEntry({
          ...stepEntry,
          step_count: newTotal,
          updated_at: new Date().toISOString()
        });
        
        showMessage(`Added ${steps.toLocaleString()} steps!`, 'success');
      } else {
        // Create new entry
        const { data, error } = await supabase
          .from('step_entries')
          .insert({
            user_id: profile.user_id,
            date: today,
            step_count: steps
          })
          .select('*')
          .single();
          
        if (error) throw error;
        
        setStepEntry(data);
        setCurrentProgress(steps);
        showMessage(`Added ${steps.toLocaleString()} steps!`, 'success');
      }
      
      setManualSteps('');
      setShowManualEntry(false);
    } catch (err) {
      console.error('Error updating steps:', err);
      showMessage('Failed to update your steps', 'error');
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Handle refresh of data (in case of external updates)
  const handleRefresh = async () => {
    if (!profile || !profile.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('step_entries')
        .select('*')
        .eq('user_id', profile.user_id)
        .eq('date', today)
        .maybeSingle();
        
      if (error) throw error;
      
      if (data) {
        setStepEntry(data);
        setCurrentProgress(data.step_count);
        showMessage('Step data refreshed', 'success');
      } else {
        setStepEntry(null);
        setCurrentProgress(0);
      }
    } catch (err) {
      console.error('Error refreshing step data:', err);
      showMessage('Failed to refresh your step data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate max steps in history for relative bar heights
  const maxHistorySteps = historyData.length > 0
    ? Math.max(...historyData.map(entry => entry.step_count))
    : dailyGoal || 10000;

  // Available devices that can be connected
  const availableDevices: DeviceConnection[] = [
    {
      id: 'fitbit',
      type: 'fitbit',
      name: 'Fitbit (Coming Soon)',
      icon: <FiActivity className="text-teal-500" />,
      lastSynced: null,
      status: 'disconnected',
      connectUrl: 'https://www.fitbit.com/oauth2/authorize'
    },
    {
      id: 'garmin',
      type: 'garmin',
      name: 'Garmin (Coming Soon)',
      icon: <FiWatch className="text-blue-500" />,
      lastSynced: null,
      status: 'disconnected',
      connectUrl: 'https://connect.garmin.com/oauthConfirm'
    },
    {
      id: 'apple_health',
      type: 'apple_health',
      name: 'Apple Health (Coming Soon)',
      icon: <FiActivity className="text-red-500" />,
      lastSynced: null,
      status: 'disconnected',
      connectUrl: 'https://appleid.apple.com/auth/authorize'
    },
    {
      id: 'google_fit',
      type: 'google_fit',
      name: 'Google Fit (Coming Soon)',
      icon: <FiActivity className="text-green-500" />,
      lastSynced: null,
      status: 'disconnected',
      connectUrl: 'https://accounts.google.com/o/oauth2/auth'
    },
    {
      id: 'samsung_health',
      type: 'samsung_health',
      name: 'Samsung Health (Coming Soon)',
      icon: <FiWatch className="text-indigo-500" />,
      lastSynced: null,
      status: 'disconnected',
      connectUrl: 'https://account.samsung.com/accounts/v1/OAUTH'
    }
  ];

  // Fetch connected devices for this user
  useEffect(() => {
    const fetchConnectedDevices = async () => {
      if (!profile || !profile.id) return;
      
      try {
        // In a real implementation, this would query a device_connections table in your database
        const { data, error } = await supabase
          .from('device_connections')
          .select('*')
          .eq('user_id', profile.user_id);
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          // Convert database records to DeviceConnection objects
          const devices = data.map(connection => {
            const deviceTemplate = availableDevices.find(d => d.id === connection.device_type);
            if (!deviceTemplate) return null;
            
            return {
              ...deviceTemplate,
              id: connection.id,
              status: 'connected',
              lastSynced: connection.last_synced ? new Date(connection.last_synced) : null
            };
          }).filter(Boolean) as DeviceConnection[];
          
          setConnectedDevices(devices);
        }
      } catch (err) {
        console.error('Error fetching connected devices:', err);
      }
    };
    
    if (profile) {
      fetchConnectedDevices();
    }
  }, [profile]);

  // Handle device connection flow
  const handleConnectDevice = (device: DeviceConnection) => {
    // Start the real OAuth flow instead of the mock implementation
    try {
      // Set the selected device and connecting state for UI feedback
      setSelectedDevice(device);
      setIsConnecting(true);
      
      // Initiate the OAuth flow with the provider
      initiateOAuth(device.type);
      
      // The page will redirect to the provider's auth page
      // After authorization, the user will be redirected back to our callback URL
      // where we'll handle the token exchange and device connection storage
      
      // Note: In a real implementation, we would handle the redirect back
      // by creating a callback component that processes the OAuth response
      // For now, we'll leave the loading state as the user will be redirected away
    } catch (err) {
      console.error('Error initiating OAuth flow:', err);
      showMessage(`Failed to connect ${device.name}`, 'error');
      
      // Reset the UI state on error
      setSelectedDevice(null);
      setIsConnecting(false);
    }
  };

  // Handle syncing steps from a connected device
  const syncStepsFromDevice = async (device: DeviceConnection) => {
    if (!profile || !profile.user_id) return;
    
    setSyncInProgress(true);
    showMessage(`Syncing from ${device.name}...`, 'success');
    
    try {
      // Use the real API integration to fetch step data
      const result = await syncAPIStepsFromDevice(
        device.id,
        profile.user_id,
        today
      );
      
      // Update step entry with the fetched data
      if (stepEntry) {
        // If we already have an entry for today, update it
        const { error } = await supabase
          .from('step_entries')
          .update({ 
            step_count: result.stepCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', stepEntry.id);
          
        if (error) throw error;
        
        setCurrentProgress(result.stepCount);
        setStepEntry({
          ...stepEntry,
          step_count: result.stepCount,
          updated_at: new Date().toISOString()
        });
      } else {
        // Create new entry
        const { data, error } = await supabase
          .from('step_entries')
          .insert({
            user_id: profile.user_id,
            date: today,
            step_count: result.stepCount
          })
          .select('*')
          .single();
          
        if (error) throw error;
        
        setStepEntry(data);
        setCurrentProgress(result.stepCount);
      }
      
      // Update local state for the device's last sync time
      setConnectedDevices(prev => 
        prev.map(d => 
          d.id === device.id 
            ? { ...d, lastSynced: result.lastSynced } 
            : d
        )
      );
      
      showMessage(`Successfully synced ${result.stepCount.toLocaleString()} steps from ${device.name}!`, 'success');
    } catch (err) {
      console.error('Error syncing steps from device:', err);
      showMessage(`Failed to sync from ${device.name}`, 'error');
    } finally {
      setSyncInProgress(false);
    }
  };

  // Disconnect a device
  const disconnectDevice = async (device: DeviceConnection) => {
    if (!profile || !profile.user_id) return;
    
    try {
      // Use the real API integration to disconnect the device
      await disconnectAPIDevice(device.id, profile.user_id);
      
      // Remove from connected devices state
      setConnectedDevices(prev => prev.filter(d => d.id !== device.id));
      showMessage(`Disconnected ${device.name}`, 'success');
    } catch (err) {
      console.error('Error disconnecting device:', err);
      showMessage(`Failed to disconnect ${device.name}`, 'error');
    }
  };

  // Handle syncing steps from all connected devices
  const syncAllDevices = async () => {
    if (!profile || !profile.user_id || connectedDevices.length === 0) return;
    
    setSyncInProgress(true);
    showMessage('Syncing from all connected devices...', 'success');
    
    try {
      let totalSteps = 0;
      const syncedDeviceNames: string[] = [];
      
      // Sync from each connected device
      for (const device of connectedDevices) {
        try {
          // Use the real API integration to fetch step data
          const result = await syncAPIStepsFromDevice(
            device.id,
            profile.user_id,
            today
          );
          
          totalSteps += result.stepCount;
          syncedDeviceNames.push(device.name);
          
          // Update local state for the device's last sync time
          setConnectedDevices(prev => 
            prev.map(d => 
              d.id === device.id 
                ? { ...d, lastSynced: result.lastSynced } 
                : d
            )
          );
        } catch (err) {
          console.error(`Error syncing steps from ${device.name}:`, err);
        }
      }
      
      // Update step entry with the combined data
      if (stepEntry) {
        // If we already have an entry for today, update it
        const { error } = await supabase
          .from('step_entries')
          .update({ 
            step_count: totalSteps,
            updated_at: new Date().toISOString()
          })
          .eq('id', stepEntry.id);
          
        if (error) throw error;
        
        setCurrentProgress(totalSteps);
        setStepEntry({
          ...stepEntry,
          step_count: totalSteps,
          updated_at: new Date().toISOString()
        });
      } else {
        // Create new entry
        const { data, error } = await supabase
          .from('step_entries')
          .insert({
            user_id: profile.user_id,
            date: today,
            step_count: totalSteps
          })
          .select('*')
          .single();
          
        if (error) throw error;
        
        setStepEntry(data);
        setCurrentProgress(totalSteps);
      }
      
      const devicesList = syncedDeviceNames.join(', ');
      showMessage(`Successfully synced ${totalSteps.toLocaleString()} steps from ${devicesList}!`, 'success');
    } catch (err) {
      console.error('Error syncing steps from devices:', err);
      showMessage('Failed to sync steps from some devices', 'error');
    } finally {
      setSyncInProgress(false);
    }
  };

  // Handle setting a personal goal
  const handleSetPersonalGoal = (goalAmount: number) => {
    // Update UI immediately while backend processes
    setStatusMessage({
      text: `Your new goal of ${goalAmount.toLocaleString()} steps has been set!`,
      type: 'success'
    });
    // Reload to refresh the widget with new goal after 1.5 seconds
    setTimeout(() => window.location.reload(), 1500);
  };

  // Define the header for the Card component
  const header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <FiActivity className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
        <h2 className="text-lg font-medium">Steps</h2>
      </div>
    </div>
  );

  // Device Connection Modal
  const renderDeviceModal = () => {
    if (!showDeviceModal) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <div className="w-[90%] max-w-sm bg-gray-900 rounded-lg shadow-xl overflow-hidden relative">
          <button 
            onClick={() => setShowDeviceModal(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-300"
            aria-label="Close"
          >
            <FiX className="h-5 w-5" />
          </button>
          
          <div className="pt-6 pb-2 px-4">
            <h3 className="text-base font-medium text-white flex items-center justify-center mb-6">
              <FiWatch className="mr-2 text-indigo-400" /> Connect Fitness Device
            </h3>
            
            {isConnecting && selectedDevice ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mx-auto mb-3"></div>
                <p className="text-base font-medium mb-1 text-white">Connecting to {selectedDevice.name}</p>
                <p className="text-sm text-gray-400">
                  Please wait while we establish a connection...
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Available Devices</h4>
                  <div className="space-y-2">
                    {availableDevices
                      .filter(device => !connectedDevices.some(d => d.type === device.type))
                      .map(device => (
                        <button
                          key={device.id}
                          onClick={() => handleConnectDevice(device)}
                          className="flex items-center w-full p-3 bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                            {device.icon}
                          </div>
                          <span className="ml-3 text-sm font-medium text-white">{device.name}</span>
                        </button>
                      ))}
                  </div>
                </div>
                
                {connectedDevices.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Connected Devices</h4>
                    <div className="space-y-2">
                      {connectedDevices.map(device => (
                        <div 
                          key={device.id}
                          className="flex items-center justify-between p-3 bg-gray-800 rounded-md"
                        >
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                              {device.icon}
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-white">{device.name}</p>
                              <p className="text-xs text-gray-400">
                                {device.lastSynced 
                                  ? `Last synced: ${format(device.lastSynced, 'MMM d, h:mm a')}` 
                                  : 'Not synced yet'}
                              </p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => syncStepsFromDevice(device)}
                              disabled={syncInProgress}
                              className="px-2 py-1 text-xs bg-indigo-900/50 text-indigo-300 rounded hover:bg-indigo-800/60 transition-colors"
                            >
                              {syncInProgress ? 'Syncing...' : 'Sync'}
                            </button>
                            <button
                              onClick={() => disconnectDevice(device)}
                              className="px-2 py-1 text-xs bg-red-900/30 text-red-300 rounded hover:bg-red-800/40 transition-colors"
                            >
                              Disconnect
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mt-4 p-3 bg-blue-900/20 rounded-md text-xs">
                  <div className="flex items-start">
                    <FiAlertCircle className="text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
                    <p className="text-blue-300">
                      Connecting a fitness device allows us to automatically sync your daily steps. 
                      We only access step count data and never your location or other personal information.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <div className="p-3 border-t border-gray-800 text-right">
            <button
              onClick={() => setShowDeviceModal(false)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md transition-colors text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card header={header} className="flex flex-col h-full" variant="default">
      <div className="flex-1 flex flex-col">
        {dailyGoal ? (
          <>
            {/* Status message banner */}
            {statusMessage && (
              <div className={`p-2 rounded-md text-sm ${
                statusMessage.type === 'success' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
              }`}>
                {statusMessage.text}
              </div>
            )}
          
            {isLoading ? (
              <div className="flex justify-center items-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              </div>
            ) : (
              <>
                {/* Current Progress Section */}
                <div className="flex justify-between items-baseline">
                  <span className="text-gray-600 dark:text-gray-400">Goal:</span>
                  <span className="font-semibold text-xl">{dailyGoal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-gray-600 dark:text-gray-400">Today:</span>
                  <div className="flex items-center">
                    <span className="font-semibold text-xl">{currentProgress.toLocaleString()}</span>
                    {currentProgress > 0 && (
                      <span className="ml-2 text-xs text-green-600 dark:text-green-400 flex items-center">
                        <FiArrowUp className="mr-1" />
                        Active
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Enhanced Progress Bar */}
                <div className="mt-4">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`${getProgressColor()} h-3 rounded-full transition-all duration-500 ease-in-out`}
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>0</span>
                    <span>{Math.floor(dailyGoal / 2).toLocaleString()}</span>
                    <span>{dailyGoal.toLocaleString()}</span>
                  </div>
                </div>

                {/* Streak Counter & Badges Button */}
                <div className="flex justify-between items-center">
                  {streak > 0 ? (
                    <div className="bg-indigo-100 dark:bg-indigo-900/20 rounded-full px-3 py-1 flex items-center text-sm text-indigo-700 dark:text-indigo-300">
                      <FiTrendingUp className="mr-1" />
                      <span>{streak} day streak!</span>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 dark:text-gray-400">Start your streak!</div>
                  )}
                  
                  <button 
                    onClick={() => setShowAchievements(!showAchievements)}
                    className="text-sm text-indigo-600 dark:text-indigo-400 flex items-center"
                  >
                    <FiAward className="mr-1" /> 
                    Achievements
                    <FiChevronRight className={`ml-1 transition-transform ${showAchievements ? 'rotate-90' : ''}`} />
                  </button>
                </div>

                {/* Achievements Section */}
                {showAchievements && (
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Your Achievements</h4>
                    <div className="space-y-2">
                      {achievements.map(achievement => (
                        <div 
                          key={achievement.id} 
                          className={`flex items-center p-2 rounded-md ${
                            achievement.unlocked 
                              ? 'bg-white dark:bg-gray-700' 
                              : 'bg-gray-100 dark:bg-gray-800 opacity-50'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            achievement.unlocked 
                              ? 'bg-indigo-100 dark:bg-indigo-900/30' 
                              : 'bg-gray-200 dark:bg-gray-700'
                          }`}>
                            {achievement.icon}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium">{achievement.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{achievement.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step History Toggle */}
                <div className="flex justify-between items-center">
                  <button 
                    onClick={() => {
                      setShowHistory(!showHistory);
                      console.log('Toggling history view, current data:', historyData);
                    }}
                    className="text-sm text-indigo-600 dark:text-indigo-400 flex items-center"
                  >
                    <FiCalendar className="mr-1" /> 
                    7-Day History
                    <FiChevronRight className={`ml-1 transition-transform ${showHistory ? 'rotate-90' : ''}`} />
                  </button>
                  
                  {/* Last update info */}
                  {stepEntry && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                      Last updated: {new Date(stepEntry.updated_at).toLocaleTimeString()}
                      <button 
                        onClick={handleRefresh} 
                        className="ml-2 inline-flex items-center text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300"
                        disabled={isLoading}
                      >
                        <FiRefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Step History Chart */}
                {showHistory && (
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Your 7-Day Step History</h4>
                    {isLoadingHistory ? (
                      <div className="flex justify-center items-center h-20">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500"></div>
                      </div>
                    ) : historyData.length > 0 ? (
                      <div className="flex items-end justify-between h-32 pt-2">
                        {historyData.map((entry) => {
                          const date = new Date(entry.date);
                          const dayName = format(date, 'EEE');
                          const dayDate = format(date, 'd');
                          const heightPercentage = (entry.step_count / maxHistorySteps) * 100;
                          const isToday = entry.date === today;
                          const goalMet = entry.step_count >= (dailyGoal || 0);
                          
                          return (
                            <div key={entry.date} className="flex flex-col items-center">
                              <div className="flex-grow flex items-end h-24">
                                <div 
                                  className={`w-8 rounded-t-md ${
                                    isToday 
                                      ? 'bg-indigo-500 dark:bg-indigo-600' 
                                      : goalMet 
                                        ? 'bg-green-500 dark:bg-green-600' 
                                        : 'bg-gray-300 dark:bg-gray-600'
                                  }`}
                                  style={{ height: `${Math.max(5, heightPercentage)}%` }}
                                ></div>
                              </div>
                              <div className="text-xs mt-1 text-gray-600 dark:text-gray-400">{dayName}</div>
                              <div className="text-xs font-medium">{dayDate}</div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                        <p>No step data available for the past week</p>
                        <button
                          onClick={() => {
                            // For testing only - uncomment to use mock data
                            // setHistoryData(generateMockHistoryData());
                            // Or re-fetch from database
                            if (profile && dailyGoal) {
                              const fetchStepHistory = async () => {
                                setIsLoadingHistory(true);
                                try {
                                  const sevenDaysAgo = format(subDays(new Date(), 6), 'yyyy-MM-dd');
                                  
                                  const { data, error } = await supabase
                                    .from('step_entries')
                                    .select('*')
                                    .eq('user_id', profile.user_id)
                                    .gte('date', sevenDaysAgo)
                                    .lte('date', today)
                                    .order('date', { ascending: false });
                                    
                                  if (error) throw error;
                                    
                                  if (data && data.length > 0) {
                                    setHistoryData(data);
                                  }
                                } catch (err) {
                                  console.error('Error re-fetching step history:', err);
                                } finally {
                                  setIsLoadingHistory(false);
                                }
                              };
                              fetchStepHistory();
                            }
                          }}
                          className="mt-2 text-indigo-600 dark:text-indigo-400 text-xs underline"
                        >
                          Refresh History
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Motivation message based on progress */}
                <p className="text-sm text-center mt-2 font-medium">
                  {progressPercentage === 0 && "Let's get those steps in today!"}
                  {progressPercentage > 0 && progressPercentage < 25 && "Great start! Keep moving!"}
                  {progressPercentage >= 25 && progressPercentage < 50 && "You're making good progress!"}
                  {progressPercentage >= 50 && progressPercentage < 75 && "More than halfway there!"}
                  {progressPercentage >= 75 && progressPercentage < 100 && "Almost there! Finish strong!"}
                  {progressPercentage >= 100 && "Congratulations! Goal achieved!"}
                </p>

                {/* Manual Step Entry */}
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  {showManualEntry ? (
                    <div className="space-y-2">
                      <div className="flex space-x-2">
                        <input
                          type="number"
                          value={manualSteps}
                          onChange={(e) => setManualSteps(e.target.value)}
                          placeholder="Enter steps"
                          className="flex-1 p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                          min="1"
                        />
                        <button
                          onClick={addStepsManually}
                          disabled={isUpdating}
                          className={`px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors text-sm flex items-center justify-center ${isUpdating ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                          {isUpdating ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            "Add"
                          )}
                        </button>
                        <button
                          onClick={() => setShowManualEntry(false)}
                          className="px-3 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors text-sm"
                          disabled={isUpdating}
                        >
                          Cancel
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Enter the number of steps you've taken that aren't tracked automatically
                      </p>
                    </div>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setShowManualEntry(true)}
                        className="flex-1 py-2 px-4 bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-700 rounded-md transition-colors text-sm flex items-center justify-center"
                      >
                        <FiPlus className="mr-2" />
                        <span>Add Steps Manually</span>
                      </button>
                      <button
                        onClick={() => setShowDeviceModal(true)}
                        className="flex-1 py-2 px-4 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-800/30 text-indigo-700 dark:text-indigo-300 rounded-md transition-colors text-sm flex items-center justify-center"
                      >
                        <FiWatch className="mr-2" />
                        <span>
                          {connectedDevices.length > 0 
                            ? `Manage Devices (${connectedDevices.length})` 
                            : 'Connect Device (Coming Soon)'
                          }
                        </span>
                      </button>
                    </div>
                  )}
                  <div className="text-xs text-center mt-2 text-gray-500 dark:text-gray-400">
                    {connectedDevices.length > 0 
                      ? (
                        <div className="flex items-center justify-center gap-2">
                          <span>Connected: {connectedDevices.map(d => d.name).join(', ')}</span>
                          <button
                            onClick={syncAllDevices}
                            disabled={syncInProgress}
                            className={`inline-flex items-center text-xs px-2 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-800/30 text-indigo-700 dark:text-indigo-300 rounded transition-colors ${syncInProgress ? 'opacity-70 cursor-not-allowed' : ''}`}
                          >
                            {syncInProgress ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-indigo-700 dark:border-indigo-300 mr-1"></div>
                            ) : (
                              <FiRefreshCw className="h-3 w-3 mr-1" />
                            )}
                            Sync
                          </button>
                        </div>
                      ) 
                      : 'Connect with Fitbit, Garmin, Apple Health and more'
                    }
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
              <FiActivity className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">No Active Step Goal</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Set your own goal or wait for your coach to set one for you.
            </p>
            <button
              onClick={() => setShowPersonalGoalModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center justify-center mb-4"
            >
              <FiTarget className="mr-2" />
              Set My Own Goal
            </button>
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg w-full">
              <p className="text-sm font-medium">Benefits of daily steps:</p>
              <ul className="text-sm text-left mt-2 space-y-1 text-gray-600 dark:text-gray-400">
                <li>• Improved cardiovascular health</li>
                <li>• Better weight management</li>
                <li>• Enhanced mood and mental well-being</li>
                <li>• Increased energy levels</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Render device modal at the root level */}
      {renderDeviceModal()}
      
      {/* Personal goal modal */}
      {profile && (
        <PersonalStepGoalModal
          isOpen={showPersonalGoalModal}
          onClose={() => setShowPersonalGoalModal(false)}
          userId={profile.id}
          onGoalSet={handleSetPersonalGoal}
        />
      )}
    </Card>
  );
};

export default StepGoalWidget; 