# Fitness Device Integration Setup Guide

This guide will help you set up integration with fitness devices like Fitbit, Garmin, and Google Fit in your ENG app.

## Table of Contents

1. [Overview](#overview)
2. [Setting Up Developer Accounts](#setting-up-developer-accounts)
3. [Environment Variables](#environment-variables)
4. [Security Considerations](#security-considerations)
5. [Testing the Integration](#testing-the-integration)
6. [Troubleshooting](#troubleshooting)

## Overview

The fitness device integration allows users to connect their fitness trackers to sync step data automatically. The integration uses OAuth 2.0 for secure authorization and API access.

## Setting Up Developer Accounts

### Fitbit

1. Go to [Fitbit Developer](https://dev.fitbit.com/) and sign in or create an account
2. Navigate to "Manage" > "Register an App"
3. Fill in the application details:
   - Application Name: "ENG Fitness"
   - Description: "Health and fitness coaching app"
   - Application Website: Your website URL
   - Organization: Your company name
   - Organization Website: Your company website
   - Terms of Service URL: URL to your terms
   - Privacy Policy URL: URL to your privacy policy
   - OAuth 2.0 Application Type: "Client"
   - Redirect URL: `https://yourdomain.com/auth/callback/fitbit` (and `http://localhost:3000/auth/callback/fitbit` for development)
   - Default Access Type: "Read-Only"
4. After registration, note your:
   - OAuth 2.0 Client ID
   - Client Secret

### Garmin

1. Go to [Garmin Connect API](https://developer.garmin.com/connect-iq/connect-iq-basics/overview/) and create an account
2. Apply for API access through their developer portal
3. Once approved, create a new application
4. Configure the OAuth settings with redirect URL: `https://yourdomain.com/auth/callback/garmin`
5. Note your:
   - Consumer Key (Client ID)
   - Consumer Secret (Client Secret)

### Google Fit

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Navigate to "APIs & Services" > "Dashboard" and click "Enable APIs and Services"
4. Search for and enable the "Fitness API"
5. Go to "Credentials" and create an OAuth 2.0 Client ID
6. Set application type as "Web application"
7. Add authorized redirect URIs:
   - `https://yourdomain.com/auth/callback/google-fit`
   - `http://localhost:3000/auth/callback/google-fit` (for development)
8. Note your:
   - Client ID
   - Client Secret

## Environment Variables

### Frontend (.env file in project root)

Create a `.env` file in your project root with the following variables:

```
# Fitbit API Credentials (Client ID only for frontend)
VITE_FITBIT_CLIENT_ID=your_fitbit_client_id

# Garmin API Credentials (Client ID only for frontend)
VITE_GARMIN_CLIENT_ID=your_garmin_client_id

# Google Fit API Credentials (Client ID only for frontend)
VITE_GOOGLE_FIT_CLIENT_ID=your_google_fit_client_id
```

### Server (.env file in server directory)

Create a `.env` file in your server directory for the token exchange proxy:

```
# Server configuration
PORT=5000

# Fitbit API Credentials
FITBIT_CLIENT_ID=your_fitbit_client_id
FITBIT_CLIENT_SECRET=your_fitbit_client_secret

# Garmin API Credentials
GARMIN_CLIENT_ID=your_garmin_client_id
GARMIN_CLIENT_SECRET=your_garmin_client_secret

# Google Fit API Credentials
GOOGLE_FIT_CLIENT_ID=your_google_fit_client_id
GOOGLE_FIT_CLIENT_SECRET=your_google_fit_client_secret
```

## Security Considerations

Client secrets should NEVER be exposed in frontend code. Our implementation uses:

1. **Frontend**: Only stores client IDs, which are public and used to initiate the OAuth flow
2. **Backend Proxy**: Handles the actual token exchange with client secrets securely stored on the server

In production:
- Use environment variables with proper access controls
- Store tokens securely in your database with encryption
- Use HTTPS for all API requests
- Implement regular token rotation

## Testing the Integration

1. Start the token exchange proxy server:
   ```
   cd server
   npm install
   npm start
   ```

2. Start your frontend application:
   ```
   npm run dev
   ```

3. Open your application and try connecting a fitness device:
   - Go to the dashboard
   - Click "Connect Device"
   - Select a device provider
   - Complete the OAuth flow

## Troubleshooting

### Common Issues

1. **"process is not defined" error**:
   - This occurs because Vite uses `import.meta.env` instead of `process.env`
   - Ensure you've updated the code to use `import.meta.env.VITE_*` variables

2. **OAuth Redirect Issues**:
   - Check that your redirect URIs exactly match what's configured in the provider dashboards
   - Ensure you're using HTTPS in production environments

3. **API Limits and Rate Limiting**:
   - Most fitness APIs have rate limits
   - Implement caching and rate limiting in your application

4. **Missing Scopes**:
   - If you can't access certain data, check that you've requested the proper OAuth scopes

### Debugging Tools

- Check browser console for errors
- Use network inspector to verify API requests
- Test OAuth flow with tools like Postman
- Review provider documentation for specific error codes

## Support

If you encounter any issues with the integration, please:
1. Check the developer documentation for the specific provider
2. Verify your OAuth configuration
3. Ensure all environment variables are correctly set 