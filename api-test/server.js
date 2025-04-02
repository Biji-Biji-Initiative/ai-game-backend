const express = require('express');
const app = express();
const PORT = 3000;

// Enable CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware to log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} accessed with query:`, req.query);
  next();
});

// Root path for testing
app.get('/', (req, res) => {
  const logs = [
    { timestamp: new Date().toISOString(), level: 'INFO', message: 'Test log entry 1' },
    { timestamp: new Date().toISOString(), level: 'DEBUG', message: 'Test log entry 2' }
  ];
  
  res.json({
    status: 'success',
    data: {
      logs: logs,
      count: logs.length
    }
  });
});

// Legacy endpoint for compatibility
app.get('/api/v1/logs', (req, res) => {
  res.json({
    status: 'success',
    data: {
      logs: [
        { timestamp: new Date().toISOString(), level: 'INFO', message: 'Test log entry' }
      ],
      count: 1
    }
  });
});

// Simulated SystemController getLogs method
const systemLogService = {
  getLogs: (options = {}) => {
    const { limit = 500, level, search } = options;
    
    // Generate sample logs with different levels
    const logs = [];
    const levels = ['INFO', 'DEBUG', 'WARN', 'ERROR'];
    
    for (let i = 0; i < 20; i++) {
      const levelIndex = Math.floor(Math.random() * levels.length);
      logs.push({
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        level: levels[levelIndex],
        message: `Sample ${levels[levelIndex]} log message ${i + 1}`,
        source: 'test-server'
      });
    }
    
    // Apply filters
    let filteredLogs = [...logs];
    
    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level.toUpperCase());
    }
    
    if (search) {
      const searchTerm = search.toLowerCase();
      filteredLogs = filteredLogs.filter(log => log.message.toLowerCase().includes(searchTerm));
    }
    
    // Sort logs by timestamp (newest first)
    filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Apply limit
    return filteredLogs.slice(0, limit);
  }
};

// Hexagonal architecture compatible endpoint
app.get('/api/v1/system/logs', (req, res) => {
  try {
    const options = {
      limit: parseInt(req.query.limit, 10) || 500,
      level: req.query.level,
      search: req.query.search
    };
    
    const logs = systemLogService.getLogs(options);
    
    res.json({
      status: 'success',
      data: {
        logs,
        count: logs.length,
        logFile: "Simulated PM2 logs (test server)"
      }
    });
  } catch (error) {
    console.error("Error in getLogs", error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve logs',
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'API is healthy'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log('Test API server listening on port', PORT);
  console.log('Available endpoints:');
  console.log(`- http://localhost:${PORT}/`);
  console.log(`- http://localhost:${PORT}/api/v1/logs`);
  console.log(`- http://localhost:${PORT}/api/v1/system/logs`);
  console.log(`- http://localhost:${PORT}/api/v1/health`);
});
