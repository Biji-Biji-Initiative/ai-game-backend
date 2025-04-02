import 'dotenv/config';
import express from 'express';
import path from 'path';
import cors from 'cors';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import chalk from 'chalk';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
let portArg = null;
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--port=')) {
    portArg = args[i].split('=')[1];
    break;
  }
}

const app = express();
const port = portArg || process.env.PORT || 8080;
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
  const errorDetails = error instanceof Error ? 
    `${error.message}\n${error.stack || '(No stack trace)'}` : 
    String(error);
  const errorString = `${timestamp} - ${message}\n${errorDetails}\n\n`;
  
  // Write to error log file
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

// --- Serve JS files with correct MIME type --- 
// Explicitly set MIME type for JS files within specific directories
app.use('/js', express.static(path.join(__dirname, 'js'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.ts')) { // Include .ts just in case
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Add explicit route for /modules to serve JavaScript with correct MIME type
app.use('/modules', express.static(path.join(__dirname, 'js/modules'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.ts')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Handle direct imports of module files
app.get('/js/modules/*.js', (req, res, next) => {
  res.setHeader('Content-Type', 'application/javascript');
  next();
});

app.use('/dist', express.static(path.join(__dirname, 'dist'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

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
      // Avoid setting problematic headers that Express handles
      if (!['transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    }
    
    // Get content type
    const contentType = response.headers.get('content-type') || '';
    
    // Return the response body based on content type
    if (contentType.includes('application/json')) {
      try {
        const data = await response.json();
        res.json(data);
      } catch (jsonError) {
        // Handle invalid JSON
        logError('Error parsing JSON from API:', jsonError);
        const text = await response.text();
        res.send(text); // Fall back to sending as text
      }
    } else {
      const text = await response.text();
      res.send(text);
    }
  } catch (error) {
    logError('Proxy error:', error);
    
    // Create a more user-friendly error message based on the error type
    let userMessage = 'Unable to connect to the API server.';
    let errorCode = 'PROXY_ERROR';
    
    // Check for specific error types
    if (error.cause && error.cause.code === 'ECONNREFUSED') {
      userMessage = 'Cannot connect to the API server. Please make sure the API server is running at ' + apiBaseUrl;
      errorCode = 'API_SERVER_DOWN';
    } else if (error.cause && error.cause.code === 'ENOTFOUND') {
      userMessage = 'API server hostname not found: ' + apiHost;
      errorCode = 'API_HOST_NOT_FOUND';
    } else if (error.cause && error.cause.code === 'ETIMEDOUT') {
      userMessage = 'Connection to API server timed out. Please check if the server is running or overloaded.';
      errorCode = 'API_TIMEOUT';
    }
    
    res.status(502).json({ 
      error: errorCode, 
      message: isDev ? `${userMessage}\n\nDetails: ${error.message}` : userMessage,
      details: isDev ? {
        url: targetUrl,
        errorType: error.name || 'Error',
        errorMessage: error.message,
        ...(error.cause ? { errorCode: error.cause.code } : {}),
        ...(isDev && error.stack ? { stack: error.stack } : {})
      } : undefined
    });
  }
});

// Static files - Serve other specific directories
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/config', express.static(path.join(__dirname, 'config')));
app.use('/img', express.static(path.join(__dirname, 'img')));
app.use('/reference', express.static(path.join(__dirname, 'reference')));

// Serve root static files (like index.html, favicon.ico)
// This should come AFTER specific directory serving and the proxy
app.use(express.static(path.join(__dirname)));

// Handle SPA routing (fallback to index.html for non-file, non-API requests)
app.get('*', (req, res) => {
  // Check if the request looks like it's for a file or an API call
  if (req.path.includes('.') || req.path.startsWith('/api/')) { 
    // If it looks like a file or API call but wasn't handled, 404
    res.status(404).send('Not found'); 
  } else {
    // Otherwise, assume it's an SPA route and serve index.html
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logError('Server error:', err);
  
  // Create a safe error response
  const errorResponse = {
    error: 'Server Error',
    message: isDev ? err.message : 'An internal server error occurred.',
    // Include stack trace only in development mode
    ...(isDev && err.stack ? { stack: err.stack } : {})
  };
  
  res.status(err.status || 500).json(errorResponse);
});

// Start the server
app.listen(port, () => {
  console.log(chalk.green(`✓ API Admin UI running at ${chalk.blue(`http://localhost:${port}`)}`));
  console.log(chalk.green(`✓ API Proxy configured to ${chalk.blue(apiBaseUrl)}`));
  console.log(chalk.green(`✓ Environment: ${chalk.blue(NODE_ENV.toUpperCase())}`));
}); 