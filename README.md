## Running the Application

The application is managed using PM2 for process management, monitoring, and automatic restarts. This provides a standardized and production-ready way to run the server.

### Development Environment

```bash
# Start the server in development mode
npm run start:dev

# View logs
npm run logs

# Monitor the application
npm run monitor

# Check status
npm run status

# Stop the application
npm run stop

# Restart the application
npm run restart

# Delete the application from PM2
npm run delete
```

### Production Environment

```bash
# Start the server in production mode
npm run start:prod

# The same commands for logs, monitoring, stopping, and restarting
# apply to production as well
```

### Health Checks

The application provides a health check endpoint at `/api/v1/health` that reports the status of critical dependencies (database, OpenAI). This endpoint is suitable for monitoring by external systems like Kubernetes, AWS ELB, or monitoring tools.

Example health check:

```bash
curl http://localhost:3000/api/v1/health
```

Expected response:

```json
{
  "status": "success",
  "message": "Server is healthy",
  "timestamp": "2025-04-01T05:59:48.745Z",
  "uptime": 7.2824585,
  "dependencies": {
    "database": {
      "status": "healthy",
      "message": "Database connection is healthy",
      "responseTime": 511
    },
    "openai": {
      "status": "healthy",
      "message": "OpenAI API connection is healthy",
      "responseTime": 966
    }
  }
}
``` 