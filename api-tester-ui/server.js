const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const http = require('http');

const app = express();
const port = process.env.PORT || 8090;
const backendUrl = process.env.BACKEND_URL || 'http://localhost:3080';

console.log(`Using backend API URL: ${backendUrl}`);

// Check if backend is reachable
function checkBackendConnection() {
  const url = new URL(backendUrl);
  
  return new Promise((resolve) => {
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: '/api/v1/health',
      method: 'GET',
      timeout: 2000
    }, (res) => {
      if (res.statusCode === 200) {
        console.log('✅ Backend API server is reachable');
        resolve(true);
      } else {
        console.log(`⚠️ Backend API server responded with status: ${res.statusCode}`);
        resolve(false);
      }
      // Consume response data to free up memory
      res.resume();
    });
    
    req.on('error', (e) => {
      console.log(`⚠️ Backend API server connection error: ${e.message}`);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.log('⚠️ Backend API server connection timeout');
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

// Static files
app.use(express.static(path.join(__dirname)));

// Add JSONFormatter library for enhanced JSON viewing
app.use('/js/lib', express.static(path.join(__dirname, 'node_modules/json-formatter-js/dist')));

// Add a status endpoint to check backend connectivity
app.get('/status', async (req, res) => {
  const isConnected = await checkBackendConnection();
  res.json({
    status: 'running',
    frontend: {
      url: `http://localhost:${port}`,
      status: 'healthy'
    },
    backend: {
      url: backendUrl,
      status: isConnected ? 'connected' : 'disconnected',
      message: isConnected ? 'Backend API is reachable' : 'Cannot reach backend API server'
    }
  });
});

// Proxy API requests to the backend
app.use('/api', createProxyMiddleware({
  target: backendUrl,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api' // No rewrite needed as paths already match
  },
  onProxyReq: (proxyReq, req, res) => {
    // Add X-Api-Tester header to identify requests from the tester
    proxyReq.setHeader('X-Api-Tester', 'true');
    
    // Add auth token from query params if present
    if (req.query.token) {
      proxyReq.setHeader('Authorization', `Bearer ${req.query.token}`);
    }
  },
  logLevel: 'warn',
  onError: (err, req, res) => {
    console.error('Proxy error:', err.message);
    res.status(502).json({ 
      error: 'Backend unavailable',
      message: 'Cannot connect to the API backend server. Please check if your backend is running.',
      details: err.message
    });
  }
}));

// Handle SPA routing (fallback to index.html)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Check backend connection before starting
checkBackendConnection().then(isConnected => {
  // Start the server
  app.listen(port, () => {
    console.log(`API Tester UI running at http://localhost:${port}`);
    
    if (!isConnected) {
      console.log('\n⚠️  WARNING: Cannot connect to backend API server at ' + backendUrl);
      console.log('👉 Make sure your backend server is running');
      console.log('👉 You can override the backend URL with: BACKEND_URL=http://your-api-url npm start\n');
    }
  });
}); 