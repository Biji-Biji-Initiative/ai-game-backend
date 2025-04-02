// Simple Mock API Server
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

// Enable CORS
app.use(cors());
app.use(express.json());

// Basic status endpoint
app.get('/api/v1/status', (req, res) => {
  res.json({
    status: 'operational',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      api: 'up',
      database: 'up',
      cache: 'up',
      auth: 'up'
    }
  });
});

// User registration endpoint
app.post('/api/v1/auth/register', (req, res) => {
  const { email, password, username } = req.body;
  
  // Basic validation
  if (!email || !password || !username) {
    return res.status(400).json({
      error: 'Missing required fields',
      code: 'INVALID_INPUT'
    });
  }
  
  // Mock successful registration
  res.status(201).json({
    success: true,
    data: {
      user: {
        id: 'mock-user-' + Date.now(),
        email,
        username,
        createdAt: new Date().toISOString()
      },
      token: 'mock-token-' + Math.random().toString(36).substring(2)
    }
  });
});

// Login endpoint
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Basic validation
  if (!email || !password) {
    return res.status(400).json({
      error: 'Missing credentials',
      code: 'INVALID_CREDENTIALS'
    });
  }
  
  // Mock successful login
  res.json({
    success: true,
    data: {
      user: {
        id: 'mock-user-123',
        email,
        username: email.split('@')[0],
        createdAt: new Date().toISOString()
      },
      token: 'mock-token-' + Math.random().toString(36).substring(2)
    }
  });
});

// Logs endpoint
app.get('/api/v1/system/logs', (req, res) => {
  const mockLogs = [
    { level: 'info', message: 'User login successful', timestamp: new Date().toISOString(), context: { userId: 'user-123' } },
    { level: 'debug', message: 'API request processed', timestamp: new Date().toISOString(), context: { endpoint: '/api/v1/users' } },
    { level: 'error', message: 'Database connection failed', timestamp: new Date().toISOString(), context: { retries: 3 } }
  ];
  
  res.json({
    success: true,
    data: {
      logs: mockLogs,
      count: mockLogs.length
    }
  });
});

// Domain state endpoint (for snapshots)
app.get('/api/v1/domain/state', (req, res) => {
  // Get the entity type from the query
  const entityType = req.query.entityType || 'user';
  
  let responseData = {};
  
  if (entityType === 'user') {
    responseData = {
      users: [
        { id: 'user-1', username: 'johndoe', email: 'john@example.com', status: 'active' },
        { id: 'user-2', username: 'janedoe', email: 'jane@example.com', status: 'inactive' }
      ]
    };
  } else if (entityType === 'challenge') {
    responseData = {
      challenges: [
        { id: 'challenge-1', title: 'First Challenge', difficulty: 'easy', status: 'open' },
        { id: 'challenge-2', title: 'Advanced Challenge', difficulty: 'hard', status: 'open' }
      ]
    };
  } else if (entityType === 'progress') {
    responseData = {
      progress: [
        { id: 'progress-1', userId: 'user-1', challengeId: 'challenge-1', status: 'completed', score: 95 },
        { id: 'progress-2', userId: 'user-2', challengeId: 'challenge-1', status: 'in-progress', score: 45 }
      ]
    };
  }
  
  res.json({
    success: true,
    data: responseData
  });
});

// Catch-all for unimplemented endpoints
app.use('/api/v1', (req, res) => {
  console.log(`Mock API received request: ${req.method} ${req.path}`);
  
  res.json({
    success: true,
    message: 'Mock API endpoint',
    path: req.path,
    method: req.method,
    mockData: true,
    timestamp: new Date().toISOString()
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Mock API server running on port ${PORT}`);
}); 