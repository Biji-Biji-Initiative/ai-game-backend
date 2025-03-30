const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = 3002;

// Set proper MIME types
app.use((req, res, next) => {
  const ext = path.extname(req.path);
  switch (ext) {
    case '.js':
      res.setHeader('Content-Type', 'application/javascript');
      break;
    case '.css':
      res.setHeader('Content-Type', 'text/css');
      break;
    case '.json':
      res.setHeader('Content-Type', 'application/json');
      break;
  }
  next();
});

// Proxy API requests to the backend
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api', // No rewrite needed in this case
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`Proxying ${req.method} ${req.url} to http://localhost:3000${req.url}`);
  },
}));

// Serve static files from the current directory
app.use(express.static(__dirname));

// Always return index.html for any other route (for SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`API Tester UI server is running at http://localhost:${PORT}`);
}); 