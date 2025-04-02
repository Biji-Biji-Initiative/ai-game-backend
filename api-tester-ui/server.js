const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const port = process.env.PORT || 8090;

// Static files
app.use(express.static(path.join(__dirname)));

// Add JSONFormatter library for enhanced JSON viewing
app.use('/js/lib', express.static(path.join(__dirname, 'node_modules/json-formatter-js/dist')));

// Proxy API requests to the backend
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api' // No rewrite needed as paths already match
  },
  onProxyReq: (proxyReq, req, res) => {
    // Add X-Api-Tester header to identify requests from the tester
    proxyReq.setHeader('X-Api-Tester', 'true');
  },
  logLevel: 'warn'
}));

// Handle SPA routing (fallback to index.html)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`API Tester UI running at http://localhost:${port}`);
}); 