require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const chalk = require('chalk');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 8080;
const apiHost = process.env.API_HOST || 'localhost';
const apiPort = process.env.API_PORT || 3000;
const apiBaseUrl = `http://${apiHost}:${apiPort}`;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Check if we're in development mode
const isDev = NODE_ENV === 'development';

// --- Logging Setup ---
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Access log stream (for production)
const accessLogStream = fs.createWriteStream(
  path.join(logDir, 'access.log'), 
  { flags: 'a' }
);

// Error log stream
const errorLogStream = fs.createWriteStream(
  path.join(logDir, 'error.log'), 
  { flags: 'a' }
);

// Custom error logger function
const logError = (message, error) => {
  const timestamp = new Date().toISOString();
  const errorString = `${timestamp} - ${message}\n${error.stack || error}\n\n`;
  errorLogStream.write(errorString);
  // Also log to console in development
  if (isDev) {
    console.error(chalk.red(message), error);
  }
};
// --- End Logging Setup ---

// Middleware
// Use concise 'dev' logging for console in development
if (isDev) {
  app.use(morgan('dev')); 
} else {
  // Use 'combined' format and log to file in production
  app.use(morgan('combined', { stream: accessLogStream }));
}

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// API proxy middleware
app.use('/api/*', async (req, res) => {
  const targetUrl = `${apiBaseUrl}${req.url}`;
  
  // Use debug logging for proxy info
  console.debug(chalk.blue(`Proxying ${req.method} request to: ${targetUrl}`));
  
  try {
    // Copy request body and headers
    const options = {
      method: req.method,
      headers: {
        ...req.headers,
        'X-Api-Tester': 'true',
        host: `${apiHost}:${apiPort}`
      }
    };
    
    // Add body for non-GET/HEAD requests
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      options.body = JSON.stringify(req.body);
      options.headers['Content-Type'] = 'application/json';
    }
    
    // Send the request
    const response = await fetch(targetUrl, options);
    
    // Copy status and headers
    res.status(response.status);
    for (const [key, value] of response.headers.entries()) {
      res.setHeader(key, value);
    }
    
    // Get content type
    const contentType = response.headers.get('content-type') || '';
    
    // Return the response body based on content type
    if (contentType.includes('application/json')) {
      const data = await response.json();
      res.json(data);
    } else {
      const text = await response.text();
      res.send(text);
    }
  } catch (error) {
    logError('Proxy error:', error);
    res.status(500).json({ 
      error: 'Proxy Error', 
      // Consider making this more generic in production
      message: isDev ? error.message : 'An internal proxy error occurred.', 
      stack: isDev ? error.stack : undefined
    });
  }
});

// Static files
app.use(express.static(path.join(__dirname, 'dist'))); // Serve from dist

// Handle SPA routing (fallback to index.html)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html')); // Serve index.html from dist
});

// Error handling middleware
app.use((err, req, res, next) => {
  logError('Server error:', err);
  res.status(err.status || 500).json({
    error: 'Server Error',
     // Consider making this more generic in production
    message: isDev ? err.message : 'An internal server error occurred.',
    stack: isDev ? err.stack : undefined
  });
});

// Start the server
app.listen(port, () => {
  console.log(chalk.green(`✓ API Admin UI running at ${chalk.blue(`http://localhost:${port}`)}`));
  console.log(chalk.green(`✓ API Proxy configured to ${chalk.blue(apiBaseUrl)}`));
  console.log(chalk.green(`✓ Environment: ${chalk.blue(NODE_ENV.toUpperCase())}`));
}); 