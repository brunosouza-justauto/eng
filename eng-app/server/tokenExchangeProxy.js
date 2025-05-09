// This is a simple example of an Express server that handles OAuth token exchange
// for fitness device APIs, keeping client secrets secure on the server side.

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configure middleware
app.use(cors());
app.use(bodyParser.json());

// Service configuration - stored securely on the server
const FITNESS_SERVICES = {
  fitbit: {
    clientId: process.env.FITBIT_CLIENT_ID,
    clientSecret: process.env.FITBIT_CLIENT_SECRET,
    tokenUrl: 'https://api.fitbit.com/oauth2/token'
  },
  garmin: {
    clientId: process.env.GARMIN_CLIENT_ID,
    clientSecret: process.env.GARMIN_CLIENT_SECRET,
    tokenUrl: 'https://connectapi.garmin.com/oauth-service/oauth/token'
  },
  google_fit: {
    clientId: process.env.GOOGLE_FIT_CLIENT_ID,
    clientSecret: process.env.GOOGLE_FIT_CLIENT_SECRET,
    tokenUrl: 'https://oauth2.googleapis.com/token'
  }
};

// Token exchange endpoint
app.post('/api/fitness/token-exchange', async (req, res) => {
  try {
    const { code, provider, redirectUri } = req.body;
    
    // Validate required params
    if (!code || !provider || !redirectUri) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Get service config
    const serviceConfig = FITNESS_SERVICES[provider];
    if (!serviceConfig) {
      return res.status(400).json({ error: 'Unsupported provider' });
    }
    
    // Create token request params
    const tokenParams = new URLSearchParams();
    tokenParams.append('grant_type', 'authorization_code');
    tokenParams.append('code', code);
    tokenParams.append('redirect_uri', redirectUri);
    tokenParams.append('client_id', serviceConfig.clientId);
    tokenParams.append('client_secret', serviceConfig.clientSecret);
    
    // Make token request
    const response = await axios.post(serviceConfig.tokenUrl, tokenParams.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    // Return token data to client
    return res.json({
      provider,
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
      tokenType: response.data.token_type
    });
  } catch (error) {
    console.error('Token exchange error:', error.response?.data || error.message);
    return res.status(500).json({ 
      error: 'Failed to exchange token',
      details: error.response?.data || error.message
    });
  }
});

// Token refresh endpoint
app.post('/api/fitness/refresh-token', async (req, res) => {
  try {
    const { refreshToken, provider } = req.body;
    
    // Validate required params
    if (!refreshToken || !provider) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Get service config
    const serviceConfig = FITNESS_SERVICES[provider];
    if (!serviceConfig) {
      return res.status(400).json({ error: 'Unsupported provider' });
    }
    
    // Create refresh request params
    const refreshParams = new URLSearchParams();
    refreshParams.append('grant_type', 'refresh_token');
    refreshParams.append('refresh_token', refreshToken);
    refreshParams.append('client_id', serviceConfig.clientId);
    refreshParams.append('client_secret', serviceConfig.clientSecret);
    
    // Make refresh token request
    const response = await axios.post(serviceConfig.tokenUrl, refreshParams.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    // Return new token data to client
    return res.json({
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token || refreshToken, // Some providers don't return a new refresh token
      expiresIn: response.data.expires_in,
      tokenType: response.data.token_type
    });
  } catch (error) {
    console.error('Token refresh error:', error.response?.data || error.message);
    return res.status(500).json({ 
      error: 'Failed to refresh token',
      details: error.response?.data || error.message
    });
  }
});

// Token revocation endpoint
app.post('/api/fitness/revoke-token', async (req, res) => {
  try {
    const { token, provider } = req.body;
    
    if (!token || !provider) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const serviceConfig = FITNESS_SERVICES[provider];
    if (!serviceConfig) {
      return res.status(400).json({ error: 'Unsupported provider' });
    }
    
    // Handle different revocation methods per provider
    if (provider === 'fitbit') {
      // Fitbit token revocation
      await axios.post('https://api.fitbit.com/oauth2/revoke', 
        new URLSearchParams({ token }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${serviceConfig.clientId}:${serviceConfig.clientSecret}`).toString('base64')}`
          }
        }
      );
    } else if (provider === 'google_fit') {
      // Google token revocation
      await axios.get(`https://accounts.google.com/o/oauth2/revoke?token=${token}`);
    }
    // Garmin doesn't have a token revocation endpoint
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Token revocation error:', error.response?.data || error.message);
    // We still return success even if revocation fails
    // The connection will be deleted from the database anyway
    return res.json({ success: true });
  }
});

app.listen(PORT, () => {
  console.log(`Token exchange proxy server running on port ${PORT}`);
}); 