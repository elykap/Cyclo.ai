/**
 * Simple Express proxy server for IBM watsonx.ai API
 * This handles CORS issues when calling IBM Cloud from the browser
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Enable CORS for the frontend
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow any localhost origin for development
    if (origin.match(/^http:\/\/localhost:\d+$/) || origin.match(/^http:\/\/127\.0\.0\.1:\d+$/)) {
      return callback(null, true);
    }
    
    // Allow specific production domains if needed
    if (origin === 'https://your-production-domain.com') {
      return callback(null, true);
    }
    
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Proxy server is running' });
});

// Get IBM Cloud IAM token
app.post('/api/auth/token', async (req, res) => {
  const apiKey = process.env.VITE_WATSONX_API_KEY;

  if (!apiKey) {
    return res.status(400).json({ error: 'API key not configured on server' });
  }

  try {
    const response = await fetch('https://iam.cloud.ibm.com/identity/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
        apikey: apiKey
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('IBM Cloud authentication error:', errorText);
      return res.status(response.status).json({ 
        error: 'Authentication failed', 
        details: errorText 
      });
    }

    const data = await response.json();
    res.json({ access_token: data.access_token, expires_in: data.expires_in });
  } catch (error) {
    console.error('Error getting token:', error);
    res.status(500).json({ error: 'Failed to get authentication token', message: error.message });
  }
});

// Proxy for watsonx.ai API requests
app.all('/api/watsonx/*', async (req, res) => {
  console.log(`[Proxy] Request received: ${req.method} ${req.originalUrl}`);
  console.log(`[Proxy] req.path: ${req.path}`);
  console.log(`[Proxy] req.url: ${req.url}`);
  console.log(`[Proxy] req.originalUrl: ${req.originalUrl}`);
  
  const apiKey = process.env.VITE_WATSONX_API_KEY;
  
  if (!apiKey) {
    console.error('[Proxy] API key missing');
    return res.status(400).json({ error: 'API key not configured on server' });
  }

  try {
    // Get access token
    console.log('[Proxy] Authenticating with IBM IAM...');
    const tokenResponse = await fetch('https://iam.cloud.ibm.com/identity/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
        apikey: apiKey
      })
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error(`[Proxy] Auth failed: ${tokenResponse.status}`, errText);
      throw new Error('Failed to authenticate with IBM Cloud');
    }

    const { access_token } = await tokenResponse.json();
    console.log('[Proxy] Auth successful');

    // Construct the watsonx.ai API URL
    // Extract the path after /api/watsonx/
    const urlPath = req.originalUrl.split('?')[0]; // Get path without query string
    const watsonxPath = urlPath.replace('/api/watsonx', '').replace(/^\//, ''); // Remove /api/watsonx and leading slash
    
    // Use the region from config or environment variable
    // Map config region names to actual region codes
    const regionMap = {
      'dallas': 'us-south',
      'frankfurt': 'eu-de',
      'london': 'eu-gb',
      'tokyo': 'jp-tok',
      'sydney': 'au-syd',
      'toronto': 'ca-tor',
      'mumbai': 'ap-south-1'
    };
    
    const configRegion = process.env.VITE_WATSONX_REGION || 'dallas';
    const region = regionMap[configRegion] || configRegion || 'us-south';
    const baseUrl = `https://${region}.ml.cloud.ibm.com`;
    const queryString = req.originalUrl.includes('?') ? '?' + req.originalUrl.split('?')[1] : '';
    const url = `${baseUrl}/${watsonxPath}${queryString}`;
    
    console.log(`[Proxy] Extracted path: ${watsonxPath}`);
    console.log(`[Proxy] Region: ${region}, Base URL: ${baseUrl}`);
    console.log(`[Proxy] Forwarding to: ${url}`);
    console.log(`[Proxy] Request body:`, JSON.stringify(req.body).substring(0, 200));

    // Forward the request to watsonx.ai
    const watsonxResponse = await fetch(url, {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });
    
    console.log(`[Proxy] Response status: ${watsonxResponse.status}`);
    console.log(`[Proxy] Response headers:`, Object.fromEntries(watsonxResponse.headers.entries()));

    // Handle both success and error responses
    let data;
    try {
      const responseText = await watsonxResponse.text();
      console.log(`[Proxy] Full response body:`, responseText);
      
      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch (parseErr) {
          // If it's not JSON, return as text
          data = { error: 'Non-JSON response', details: responseText };
        }
      } else {
        data = { error: 'Empty response from Watson AI' };
      }
    } catch (error) {
      console.error('[Proxy] Error reading response:', error);
      return res.status(500).json({ 
        error: 'Failed to read response from Watson AI', 
        message: error.message 
      });
    }

    // Log the parsed response for debugging
    console.log(`[Proxy] Parsed response:`, JSON.stringify(data).substring(0, 500));

    res.status(watsonxResponse.status).json(data);
  } catch (error) {
    console.error('[Proxy] Error:', error);
    res.status(500).json({ error: 'Proxy request failed', message: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Proxy server running on http://localhost:${PORT}`);
  console.log(`✓ CORS enabled for http://localhost:5173`);
  console.log(`✓ Ready to proxy requests to IBM watsonx.ai`);
});

