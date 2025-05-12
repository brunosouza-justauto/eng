import { supabase } from './supabaseClient';
import { v4 as uuidv4 } from 'uuid';

// Types for fitness services
export interface FitnessServiceConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authUrl: string;
  tokenUrl: string;
  apiUrl: string;
  scope: string[];
}

// API response types
interface FitbitStepData {
  'activities-steps': Array<{
    dateTime: string;
    value: string;
  }>;
}

interface GarminStepData {
  dailySteps: Array<{
    calendarDate: string;
    steps: number;
  }>;
}

interface GoogleFitStepData {
  bucket: Array<{
    dataset: Array<{
      point: Array<{
        value: Array<{
          intVal: number;
        }>;
      }>;
    }>;
  }>;
}

// OAuth state management
interface OAuthState {
  provider: string;
  redirectUri: string;
  state: string;
  timestamp: number;
}

// Device connection data structure
interface DeviceConnection {
  id: string;
  user_id: string;
  device_type: string;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_at: string;
  last_synced: string;
}

// Provider data returned after OAuth
interface ProviderAuthData {
  provider: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

// Service configurations
const FITNESS_SERVICES: Record<string, FitnessServiceConfig> = {
  fitbit: {
    clientId: import.meta.env.VITE_FITBIT_CLIENT_ID || '',
    clientSecret: import.meta.env.VITE_FITBIT_CLIENT_SECRET || '',
    redirectUri: `${window.location.origin}/auth/callback/fitbit`,
    authUrl: 'https://www.fitbit.com/oauth2/authorize',
    tokenUrl: 'https://api.fitbit.com/oauth2/token',
    apiUrl: 'https://api.fitbit.com/1/user/-/',
    scope: ['activity', 'heartrate', 'profile']
  },
  garmin: {
    clientId: import.meta.env.VITE_GARMIN_CLIENT_ID || '',
    clientSecret: import.meta.env.VITE_GARMIN_CLIENT_SECRET || '',
    redirectUri: `${window.location.origin}/auth/callback/garmin`,
    authUrl: 'https://connectapi.garmin.com/oauth-service/oauth/authorize',
    tokenUrl: 'https://connectapi.garmin.com/oauth-service/oauth/token',
    apiUrl: 'https://apis.garmin.com/wellness-api/rest/',
    scope: ['activity', 'profile']
  },
  google_fit: {
    clientId: import.meta.env.VITE_GOOGLE_FIT_CLIENT_ID || '',
    clientSecret: import.meta.env.VITE_GOOGLE_FIT_CLIENT_SECRET || '',
    redirectUri: `${window.location.origin}/auth/callback/google-fit`,
    authUrl: 'https://accounts.google.com/o/oauth2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    apiUrl: 'https://www.googleapis.com/fitness/v1/users/me/',
    scope: [
      'https://www.googleapis.com/auth/fitness.activity.read',
      'https://www.googleapis.com/auth/fitness.body.read'
    ]
  }
};

// Apple Health doesn't use traditional OAuth as it requires native iOS integration
// Samsung Health requires their SDK and is typically handled through React Native

/**
 * Initialize OAuth flow for a fitness service
 */
export const initiateOAuth = (providerType: string) => {
  console.log(`Initiating OAuth flow for provider: ${providerType}`);
  
  const config = FITNESS_SERVICES[providerType];
  if (!config) {
    console.error(`Unsupported provider: ${providerType}`);
    throw new Error(`Unsupported provider: ${providerType}`);
  }

  // Create and store OAuth state for security
  const state = uuidv4();
  const oauthState: OAuthState = {
    provider: providerType,
    redirectUri: config.redirectUri,
    state,
    timestamp: Date.now()
  };

  console.log('Created OAuth state', {
    provider: providerType,
    redirectUri: config.redirectUri,
    stateId: state.substring(0, 8) + '...', // Only log part of the state for security
    timestamp: new Date(oauthState.timestamp).toISOString(),
    expiryTime: new Date(oauthState.timestamp + (30 * 60 * 1000)).toISOString() // 30 minutes expiry
  });

  // Store in localStorage instead of sessionStorage for better persistence across page refreshes
  try {
    localStorage.setItem('oauthState', JSON.stringify(oauthState));
    // Also set a flag that we haven't processed this state yet
    localStorage.setItem('oauthStateProcessed', 'false');
    console.log('OAuth state stored in localStorage successfully');
  } catch (e) {
    console.error('Failed to store OAuth state in localStorage', e);
    throw new Error('Failed to store OAuth state: ' + (e instanceof Error ? e.message : String(e)));
  }

  // Build the authorization URL with required parameters
  const authParams = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scope.join(' '),
    state
  });

  const authUrl = `${config.authUrl}?${authParams.toString()}`;
  console.log(`Redirecting to auth URL: ${config.authUrl} with params (client_id and scopes omitted for security)`);

  // Redirect the browser to the provider's authorization endpoint
  window.location.href = authUrl;
};

/**
 * Handle the OAuth callback and exchange the code for tokens
 */
export const handleOAuthCallback = async (code: string, state: string) => {
  // Check if we've already processed this callback to prevent duplicate processing
  const processedState = localStorage.getItem('oauthStateProcessed');
  if (processedState === 'true') {
    console.log('This OAuth callback has already been processed, using cached result');
    const cachedResult = localStorage.getItem('oauthResult');
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }
  }

  // Retrieve the stored state from localStorage instead of sessionStorage
  const storedStateJson = localStorage.getItem('oauthState');
  if (!storedStateJson) {
    console.error('OAuth state not found in localStorage');
    throw new Error('No OAuth state found');
  }

  console.log('Retrieved OAuth state from localStorage');
  
  let storedState: OAuthState;
  try {
    storedState = JSON.parse(storedStateJson);
    console.log('OAuth state parsed successfully', { 
      provider: storedState.provider,
      timestamp: new Date(storedState.timestamp).toISOString(),
      currentTime: new Date().toISOString()
    });
  } catch (e) {
    console.error('Failed to parse OAuth state JSON', e);
    throw new Error('Invalid OAuth state format');
  }
  
  // Validate state to prevent CSRF attacks
  if (state !== storedState.state) {
    console.error('OAuth state mismatch', { 
      receivedState: state, 
      storedState: storedState.state 
    });
    throw new Error('OAuth state mismatch');
  }

  // Check if the state is expired (30 minute window - extended from 10 minutes)
  const timeElapsedMs = Date.now() - storedState.timestamp;
  const expirationWindowMs = 30 * 60 * 1000; // 30 minutes in milliseconds
  
  console.log('Checking OAuth state expiration', {
    timeElapsedSeconds: Math.floor(timeElapsedMs / 1000),
    expirationWindowSeconds: Math.floor(expirationWindowMs / 1000),
    isExpired: timeElapsedMs > expirationWindowMs
  });
  
  if (timeElapsedMs > expirationWindowMs) {
    console.error('OAuth state expired', {
      initiatedAt: new Date(storedState.timestamp).toISOString(),
      expiryTime: new Date(storedState.timestamp + expirationWindowMs).toISOString(),
      currentTime: new Date().toISOString(),
      timeDifferenceMinutes: (timeElapsedMs / 60000).toFixed(2)
    });
    throw new Error('OAuth state expired - please try connecting again (time limit: 30 minutes)');
  }

  // Mark this state as being processed, but don't clear it yet
  localStorage.setItem('oauthStateProcessed', 'true');
  console.log('OAuth state marked as processed');

  // Direct frontend implementation (NOT RECOMMENDED FOR PRODUCTION)
  const config = FITNESS_SERVICES[storedState.provider];
  if (!config) {
    throw new Error(`Unsupported provider: ${storedState.provider}`);
  }

  // Exchange the code for tokens
  const tokenParams = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret
  });

  console.log(`Preparing token exchange request for ${storedState.provider}`, {
    tokenUrl: config.tokenUrl,
    useBasicAuth: storedState.provider === 'fitbit', // Fitbit uses Basic Auth header
    hasClientId: !!config.clientId,
    hasClientSecret: !!config.clientSecret
  });

  // Different OAuth providers have different requirements for token exchange:
  // - Fitbit: Requires Basic Authentication header with client_id:client_secret
  // - Google Fit: Accepts client_id and client_secret in request body
  // - Garmin: Has provider-specific requirements
  
  // Make the token request
  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      // Add Basic Authentication header for Fitbit which requires it
      ...(storedState.provider === 'fitbit' && {
        'Authorization': `Basic ${btoa(`${config.clientId}:${config.clientSecret}`)}`
      })
    },
    body: tokenParams.toString()
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Failed to exchange token: ${errorData}`);
  }

  const tokenData = await response.json();

  const result = {
    provider: storedState.provider,
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresIn: tokenData.expires_in,
    tokenType: tokenData.token_type
  };

  // Cache the result in case we need it again
  localStorage.setItem('oauthResult', JSON.stringify(result));
  
  // We successfully processed the callback, now we can clean up
  // This will be done at the end of the entire flow to prevent data loss

  return result;
};

/**
 * Store connection information in Supabase
 */
export const storeDeviceConnection = async (userId: string, providerData: ProviderAuthData) => {
  console.log('Preparing to store device connection', { 
    provider: providerData.provider,
    userId: userId.substring(0, 8) + '...' // Log only part of the ID for security
  });

  try {
    // First check if a connection already exists for this user and provider
    const { data: existingConnections, error: fetchError } = await supabase
      .from('device_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('device_type', providerData.provider);

    if (fetchError) {
      console.error('Error checking for existing connections:', fetchError);
      throw fetchError;
    }

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + providerData.expiresIn);

    let result;

    if (existingConnections && existingConnections.length > 0) {
      console.log('Found existing connection, updating instead of creating new one', {
        connectionId: existingConnections[0].id
      });
      
      // Update the existing connection with new tokens
      const { data, error } = await supabase
        .from('device_connections')
        .update({
          access_token: providerData.accessToken,
          refresh_token: providerData.refreshToken,
          token_type: providerData.tokenType,
          expires_at: expiresAt.toISOString(),
          last_synced: new Date().toISOString()
        })
        .eq('id', existingConnections[0].id)
        .select('*')
        .single();

      if (error) {
        console.error('Error updating existing connection:', error);
        throw error;
      }
      
      console.log('Successfully updated existing connection');
      result = data;
    } else {
      // No existing connection, create a new one
      console.log('No existing connection found, creating new one');
      
      const { data, error } = await supabase
        .from('device_connections')
        .insert({
          user_id: userId,
          device_type: providerData.provider,
          access_token: providerData.accessToken,
          refresh_token: providerData.refreshToken,
          token_type: providerData.tokenType,
          expires_at: expiresAt.toISOString(),
          last_synced: new Date().toISOString()
        })
        .select('*')
        .single();

      if (error) {
        // If we get an error, check if it's because another process created the record
        // (in case of a race condition)
        console.error('Error inserting new connection:', error);
        
        // Let's check one more time if a connection was created in the meantime
        const { data: conflictData, error: conflictError } = await supabase
          .from('device_connections')
          .select('*')
          .eq('user_id', userId)
          .eq('device_type', providerData.provider)
          .single();
          
        if (!conflictError && conflictData) {
          console.log('Found connection that was created by another process');
          result = conflictData;
        } else {
          // If there's still no connection, we have a genuine error
          throw error;
        }
      } else {
        console.log('Successfully created new device connection');
        result = data;
      }
    }

    return result;
  } catch (error) {
    console.error('Error in storeDeviceConnection:', error);
    throw error;
  }
};

/**
 * Refresh an expired token
 */
export const refreshToken = async (connectionId: string, userId: string) => {
  // Get the connection details
  const { data: connection, error: fetchError } = await supabase
    .from('device_connections')
    .select('*')
    .eq('id', connectionId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !connection) {
    throw new Error('Connection not found');
  }

  const config = FITNESS_SERVICES[connection.device_type];
  if (!config) {
    throw new Error(`Unsupported provider: ${connection.device_type}`);
  }

  // Create refresh token request
  const refreshParams = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: connection.refresh_token,
    client_id: config.clientId,
    client_secret: config.clientSecret
  });

  console.log(`Preparing token refresh request for ${connection.device_type}`, {
    tokenUrl: config.tokenUrl,
    useBasicAuth: connection.device_type === 'fitbit', // Fitbit uses Basic Auth header
    hasClientId: !!config.clientId,
    hasClientSecret: !!config.clientSecret,
    connectionId: connection.id
  });

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      // Add Basic Authentication header for Fitbit which requires it
      ...(connection.device_type === 'fitbit' && {
        'Authorization': `Basic ${btoa(`${config.clientId}:${config.clientSecret}`)}`
      })
    },
    body: refreshParams.toString()
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  const tokenData = await response.json();
  
  // Calculate new expiry date
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);

  // Update the connection in the database
  const { data, error } = await supabase
    .from('device_connections')
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || connection.refresh_token, // Some providers don't return a new refresh token
      expires_at: expiresAt.toISOString()
    })
    .eq('id', connectionId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Check if a token needs refreshing and refresh if necessary
 */
export const ensureValidToken = async (connectionId: string, userId: string) => {
  const { data: connection, error } = await supabase
    .from('device_connections')
    .select('*')
    .eq('id', connectionId)
    .eq('user_id', userId)
    .single();

  if (error || !connection) {
    throw new Error('Connection not found');
  }

  // Check if token is expired or about to expire (within 5 minutes)
  const expiresAt = new Date(connection.expires_at);
  const now = new Date();
  const buffer = 5 * 60 * 1000; // 5 minutes in milliseconds

  if (expiresAt.getTime() - now.getTime() < buffer) {
    // Token is expired or about to expire, refresh it
    return await refreshToken(connectionId, userId);
  }

  return connection;
};

/**
 * Sync step data from Fitbit
 */
const syncFitbitSteps = async (connection: DeviceConnection, userId: string, date: string) => {
  // Ensure we have a valid token
  const validConnection = await ensureValidToken(connection.id, userId);
  
  // Format date for Fitbit API (yyyy-MM-dd)
  const today = date;
  
  // Use the Vercel API route for production
  const apiUrl = `${window.location.origin}/api/fitbit/1/user/-/activities/steps/date/${today}/1d.json`;
  
  console.log(`Fetching Fitbit steps for date ${today}`);
  
  // Make API request to get step data
  const response = await fetch(apiUrl, {
    headers: {
      'Authorization': `${validConnection.token_type} ${validConnection.access_token}`
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Fitbit API error: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`Fitbit API error: ${response.statusText}`);
  }
  
  const data: FitbitStepData = await response.json();
  
  if (!data || !data['activities-steps'] || data['activities-steps'].length === 0) {
    return 0; // No step data available
  }
  
  return parseInt(data['activities-steps'][0].value, 10);
};

/**
 * Sync step data from Garmin
 */
const syncGarminSteps = async (connection: DeviceConnection, userId: string, date: string) => {
  const config = FITNESS_SERVICES.garmin;
  
  // Ensure we have a valid token
  const validConnection = await ensureValidToken(connection.id, userId);
  
  // Garmin API requires different date format (yyyy-MM-dd)
  const today = date;
  
  // Make API request to get step data
  const response = await fetch(`${config.apiUrl}dailies?fromDate=${today}&untilDate=${today}`, {
    headers: {
      'Authorization': `${validConnection.token_type} ${validConnection.access_token}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Garmin API error: ${response.statusText}`);
  }
  
  const data: GarminStepData = await response.json();
  
  if (!data || !data.dailySteps || data.dailySteps.length === 0) {
    return 0; // No step data available
  }
  
  return data.dailySteps[0].steps;
};

/**
 * Sync step data from Google Fit
 */
const syncGoogleFitSteps = async (connection: DeviceConnection, userId: string, date: string) => {
  const config = FITNESS_SERVICES.google_fit;
  
  // Ensure we have a valid token
  const validConnection = await ensureValidToken(connection.id, userId);
  
  // Google Fit requires timestamps in milliseconds
  const startTimeMs = new Date(date).setHours(0, 0, 0, 0);
  const endTimeMs = new Date(date).setHours(23, 59, 59, 999);
  
  // Request body for Google Fit API
  const requestBody = {
    aggregateBy: [{
      dataTypeName: 'com.google.step_count.delta',
      dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps'
    }],
    bucketByTime: { durationMillis: 86400000 }, // 1 day in milliseconds
    startTimeMillis: startTimeMs,
    endTimeMillis: endTimeMs
  };
  
  // Make API request to get step data
  const response = await fetch(`${config.apiUrl}dataset:aggregate`, {
    method: 'POST',
    headers: {
      'Authorization': `${validConnection.token_type} ${validConnection.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    throw new Error(`Google Fit API error: ${response.statusText}`);
  }
  
  const data: GoogleFitStepData = await response.json();
  
  if (!data || !data.bucket || data.bucket.length === 0 || 
      !data.bucket[0].dataset || data.bucket[0].dataset.length === 0 ||
      !data.bucket[0].dataset[0].point || data.bucket[0].dataset[0].point.length === 0) {
    return 0; // No step data available
  }
  
  // Sum up all step counts in the response
  let totalSteps = 0;
  for (const point of data.bucket[0].dataset[0].point) {
    if (point.value && point.value.length > 0) {
      totalSteps += point.value[0].intVal || 0;
    }
  }
  
  return totalSteps;
};

/**
 * Main function to sync steps from a connected device
 */
export const syncStepsFromDevice = async (connectionId: string, userId: string, date: string) => {
  // Get the connection details
  const { data: connection, error } = await supabase
    .from('device_connections')
    .select('*')
    .eq('id', connectionId)
    .eq('user_id', userId)
    .single();

  if (error || !connection) {
    throw new Error('Connection not found');
  }

  let stepCount = 0;

  // Call the appropriate sync function based on device type
  switch (connection.device_type) {
    case 'fitbit':
      stepCount = await syncFitbitSteps(connection, userId, date);
      break;
    case 'garmin':
      stepCount = await syncGarminSteps(connection, userId, date);
      break;
    case 'google_fit':
      stepCount = await syncGoogleFitSteps(connection, userId, date);
      break;
    default:
      throw new Error(`Unsupported device type: ${connection.device_type}`);
  }

  // Update last_synced timestamp
  await supabase
    .from('device_connections')
    .update({
      last_synced: new Date().toISOString()
    })
    .eq('id', connectionId);

  return {
    stepCount,
    deviceType: connection.device_type,
    lastSynced: new Date()
  };
};

/**
 * Revoke access tokens and delete the connection
 */
export const disconnectDevice = async (connectionId: string, userId: string) => {
  // Get the connection details
  const { data: connection, error } = await supabase
    .from('device_connections')
    .select('*')
    .eq('id', connectionId)
    .eq('user_id', userId)
    .single();

  if (error || !connection) {
    throw new Error('Connection not found');
  }

  const config = FITNESS_SERVICES[connection.device_type];
  if (!config) {
    throw new Error(`Unsupported provider: ${connection.device_type}`);
  }

  // For each provider, handle token revocation differently
  try {
    if (connection.device_type === 'fitbit') {
      // Fitbit token revocation
      await fetch('https://api.fitbit.com/oauth2/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${config.clientId}:${config.clientSecret}`)}`
        },
        body: new URLSearchParams({
          token: connection.access_token
        }).toString()
      });
    } else if (connection.device_type === 'google_fit') {
      // Google token revocation
      await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${connection.access_token}`);
    }
    // Garmin doesn't have a token revocation endpoint in their consumer API
  } catch (e) {
    console.error('Error revoking token:', e);
    // Continue with deletion even if revocation fails
  }

  // Delete the connection from the database
  const { error: deleteError } = await supabase
    .from('device_connections')
    .delete()
    .eq('id', connectionId);

  if (deleteError) {
    throw deleteError;
  }

  return true;
};

// New function to clean up OAuth state
export const cleanupOAuthState = () => {
  console.log('Cleaning up OAuth state from localStorage');
  localStorage.removeItem('oauthState');
  localStorage.removeItem('oauthStateProcessed');
  localStorage.removeItem('oauthResult');
}; 