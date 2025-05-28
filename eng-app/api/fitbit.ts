// Vercel Serverless Function for Fitbit API Proxy
import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Extract the path from the request URL
    const url = new URL(req.url as string, `https://${req.headers.host}`);
    const path = url.pathname.replace(/^\/api\/fitbit/, '');
    
    // Forward the request to Fitbit API
    const fitbitUrl = `https://api.fitbit.com${path}${url.search}`;

    const headers: Record<string, string> = { ...req.headers as Record<string, string> };
    
    // Set the host header
    headers.host = 'api.fitbit.com';
    
    // Remove headers that might cause issues
    delete headers.connection;
    
    // Forward the request
    const response = await fetch(fitbitUrl, {
      method: req.method as string,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' 
        ? JSON.stringify(req.body) 
        : undefined,
    });
    
    // Get response data
    const data = await response.text();
    
    // Get response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      // Skip headers that might cause issues
      if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
        responseHeaders[key] = value;
      }
    });
    
    // Set response headers
    Object.entries(responseHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    // Send response with same status code
    res.status(response.status).send(data);
  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).json({ 
      error: 'Proxy Error', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
} 