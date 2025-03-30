# Troubleshooting Guide

This guide provides solutions for common issues you might encounter when working with the AI Gaming Backend project. Use this as a first reference when you run into problems during development, testing, or deployment.

## Table of Contents

1. [Development Environment Issues](#development-environment-issues)
2. [Database Connection Issues](#database-connection-issues)
3. [API Endpoint Issues](#api-endpoint-issues)
4. [Authentication Problems](#authentication-problems)
5. [Game Session Issues](#game-session-issues)
6. [Performance Problems](#performance-problems)
7. [Deployment Issues](#deployment-issues)
8. [Logging and Monitoring Issues](#logging-and-monitoring-issues)

## Development Environment Issues

### Node.js Version Conflicts

**Symptoms:**
- Error messages mentioning unsupported JavaScript syntax
- `SyntaxError` when starting the application
- Unexpected behavior with certain ES6+ features

**Solutions:**
1. Verify your Node.js version matches the required version (v18.x+):
   ```bash
   node --version
   ```
2. If needed, install the correct version using NVM:
   ```bash
   nvm install 18
   nvm use 18
   ```
3. Make sure your project's `.nvmrc` file exists and contains the correct version.

### NPM Dependency Issues

**Symptoms:**
- Missing modules errors during startup
- Inconsistent behavior across developer machines
- Unexpected errors after pulling new changes

**Solutions:**
1. Delete `node_modules` and reinstall dependencies:
   ```bash
   rm -rf node_modules
   npm install
   ```
2. Verify your npm version is compatible:
   ```bash
   npm --version  # Should be 8.x or newer
   ```
3. Clear npm cache if issues persist:
   ```bash
   npm cache clean --force
   ```
4. Check for package-lock.json conflicts in git history if the issue appeared after merging.

### ESM Import Issues

**Symptoms:**
- Errors like `Cannot use import statement outside a module`
- Issues with relative path imports
- File extension required errors

**Solutions:**
1. Ensure your `package.json` has `"type": "module"` specified
2. Include file extensions in import statements (`.js`, `.mjs`)
3. Use the correct import pattern for your file type:
   ```javascript
   // For ESM
   import { something } from './module.js';
   
   // For CommonJS compatibility
   import something from './module.js' assert { type: 'json' };
   ```
4. See the [ESM Migration Guide](../guides/esm-migration-guide.md) for more details.

## Database Connection Issues

### MongoDB Connection Failures

**Symptoms:**
- Application fails to start with connection errors
- Operations timeout or fail with database errors
- Intermittent connection drops during operation

**Solutions:**
1. Verify MongoDB is running:
   ```bash
   # Check if MongoDB service is running
   mongod --version
   ```
2. Check connection string in `.env` file:
   ```
   MONGODB_URI=mongodb://localhost:27017/ai_game_dev
   ```
3. Ensure network connectivity if using a remote database
4. Check for MongoDB authentication issues:
   ```bash
   # Connect manually to test credentials
   mongo -u <username> -p <password> --authenticationDatabase admin
   ```
5. Increase connection timeout if needed:
   ```javascript
   mongoose.connect(uri, { 
     connectTimeoutMS: 30000,
     socketTimeoutMS: 45000
   });
   ```

### Schema Validation Errors

**Symptoms:**
- Document validation failures when saving data
- Errors mentioning required fields or validation constraints
- Type mismatch errors

**Solutions:**
1. Check the schema definition against the data you're trying to save
2. Verify all required fields are present in your document
3. Ensure data types match the schema definition
4. See [Database Schema Documentation](../architecture/database-schema.md) for reference
5. Use Mongoose's debug mode to inspect validation issues:
   ```javascript
   mongoose.set('debug', true);
   ```

## API Endpoint Issues

### 404 Not Found Errors

**Symptoms:**
- API endpoints return 404 errors despite correct URLs
- Swagger documentation shows endpoints that aren't reachable
- Routes working locally but not in test/production

**Solutions:**
1. Verify route registration in the appropriate route files
2. Check for path prefix issues (e.g., missing `/api` prefix)
3. Ensure route parameters match the expected format
4. Verify middleware isn't blocking the request
5. Check for case sensitivity in route paths
6. Ensure versioning is correct (e.g., `/v1/` vs `/v2/`)

### CORS Issues

**Symptoms:**
- Browser console shows CORS policy errors
- Requests work in Postman but not from frontend applications
- Error messages mentioning "Access-Control-Allow-Origin"

**Solutions:**
1. Check CORS configuration in your application:
   ```javascript
   // Verify CORS settings in server.js or app.js
   app.use(cors({
     origin: process.env.ALLOWED_ORIGINS.split(','),
     methods: ['GET', 'POST', 'PUT', 'DELETE'],
     allowedHeaders: ['Content-Type', 'Authorization']
   }));
   ```
2. Ensure your frontend origin is listed in `ALLOWED_ORIGINS` environment variable
3. For development, you might temporarily allow all origins:
   ```javascript
   app.use(cors({ origin: '*' }));
   ```
4. Check for preflight request handling with OPTIONS method

## Authentication Problems

### JWT Token Issues

**Symptoms:**
- Unauthorized errors despite valid credentials
- Tokens expire too quickly
- Invalid signature errors

**Solutions:**
1. Verify JWT_SECRET is consistent across environments
2. Check token expiration settings:
   ```javascript
   // auth.service.js
   const token = jwt.sign(
     { userId: user.id },
     process.env.JWT_SECRET,
     { expiresIn: '1h' } // Verify this timeout is appropriate
   );
   ```
3. Ensure clocks are synchronized if using different servers
4. Verify token format in Authorization header:
   ```
   Authorization: Bearer <token>
   ```
5. See [Security Practices](../architecture/security-practices.md) for more details

### OAuth Integration Issues

**Symptoms:**
- OAuth login flow fails to complete
- Redirect URI mismatches
- Provider returns errors during authentication

**Solutions:**
1. Verify OAuth provider credentials are correct
2. Ensure redirect URIs exactly match those registered with the provider
3. Check scopes requested match what your application needs
4. Validate SSL certificates if using HTTPS
5. Look for provider-specific error messages in the logs

## Game Session Issues

### Game Session Creation Failures

**Symptoms:**
- Unable to create new game sessions
- Timeout during session initialization
- Errors related to game configurations

**Solutions:**
1. Check game ID exists and is active
2. Verify player has permissions to create sessions
3. Look for validation errors in game settings
4. Check server logs for detailed error messages
5. Verify resource limits haven't been reached

### Real-time Communication Issues

**Symptoms:**
- Game updates not being received
- Websocket disconnections
- Latency or sync problems between players

**Solutions:**
1. Check websocket connection status:
   ```javascript
   // Client-side check
   console.log(socket.readyState); // Should be WebSocket.OPEN (1)
   ```
2. Verify event listeners are properly registered
3. Look for network issues or proxies blocking websocket connections
4. Check for rate limiting issues
5. Increase ping interval if connections are dropping due to timeouts:
   ```javascript
   // Server-side configuration
   const io = new Server({
     pingInterval: 10000,
     pingTimeout: 5000
   });
   ```

## Performance Problems

### High Latency

**Symptoms:**
- API requests take too long to respond
- Timeouts during operations
- Inconsistent response times

**Solutions:**
1. Check database query performance:
   ```javascript
   // Enable query execution time logging
   mongoose.set('debug', { color: true, verbose: true });
   ```
2. Look for missing indexes on frequently queried fields
3. Verify server resources (CPU, memory) aren't constrained
4. Check for N+1 query problems
5. Consider implementing caching for frequent operations
6. See [Performance Optimization Guide](../guides/performance-optimization.md)

### Memory Leaks

**Symptoms:**
- Server memory usage grows over time
- Application crashes with out-of-memory errors
- Performance degrades the longer the server runs

**Solutions:**
1. Use Node.js memory profiling:
   ```bash
   node --inspect server.js
   ```
2. Look for event listeners that aren't being removed
3. Check for large objects being stored in memory
4. Verify database connections are being properly closed
5. Look for promise chains that aren't properly resolved

## Deployment Issues

### Production Deployment Failures

**Symptoms:**
- Application fails to start in production
- Environment-specific errors
- Configuration issues in production only

**Solutions:**
1. Verify all required environment variables are set in production
2. Check for differences between development and production configurations
3. Verify build process completed successfully
4. Check for file permission issues
5. Verify Node.js version in production matches development
6. See [Production Guide](../guides/production-guide.md) for details

### PM2 Issues

**Symptoms:**
- Application crashes and doesn't restart
- Logs indicate PM2 issues
- Inconsistent application behavior under PM2

**Solutions:**
1. Check PM2 logs for error messages:
   ```bash
   pm2 logs
   ```
2. Verify PM2 configuration in ecosystem.config.js:
   ```bash
   pm2 ecosystem
   ```
3. Try restarting the process:
   ```bash
   pm2 restart app_name
   ```
4. Ensure max memory settings are appropriate:
   ```javascript
   // ecosystem.config.js
   module.exports = {
     apps: [{
       name: "app",
       max_memory_restart: "1G",  // Adjust as needed
     }]
   }
   ```

## Logging and Monitoring Issues

### Missing Logs

**Symptoms:**
- Expected logs don't appear
- Difficulty troubleshooting issues due to insufficient logs
- Log levels seem incorrect

**Solutions:**
1. Check logger configuration:
   ```javascript
   // Verify log level is appropriate
   logger.level = process.env.NODE_ENV === 'production' ? 'info' : 'debug';
   ```
2. Ensure log transport is configured correctly
3. Check for file permission issues if logging to files
4. Verify log rotation isn't causing log loss
5. See [Logging Architecture](../architecture/logging-architecture.md) for details

### Monitoring Alert Problems

**Symptoms:**
- Alerts not triggering when they should
- False positive alerts
- Delayed notifications

**Solutions:**
1. Verify alert thresholds are appropriate
2. Check monitoring service connectivity
3. Ensure notification channels are configured correctly
4. Verify metrics are being collected properly
5. Check for time synchronization issues

## Common Error Codes

| Error Code | Description | Possible Solutions |
|------------|-------------|-------------------|
| `AUTH_001` | Invalid credentials | Verify username/password, check for account locks |
| `AUTH_002` | Token expired | Refresh token or re-authenticate |
| `AUTH_003` | Insufficient permissions | Check user role and permissions |
| `DB_001` | Database connection failed | Verify MongoDB is running, check connection string |
| `DB_002` | Document validation error | Check data against schema requirements |
| `API_001` | Rate limit exceeded | Reduce request frequency, optimize batch operations |
| `GAME_001` | Game session initialization failed | Check game configuration and player eligibility |
| `GAME_002` | Invalid game state transition | Verify game state and requested action |

## Getting Additional Help

If you're still experiencing issues after trying these troubleshooting steps:

1. **Search the Issues**: Check GitHub issues and project documentation for similar problems
2. **Team Communication**: Ask for help in the developer Slack channel (#ai-game-backend)
3. **Create Detailed Report**: If reporting an issue, include:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Environment details (Node.js version, OS, etc.)
   - Relevant logs and error messages

## Contributing to This Guide

This troubleshooting guide is a living document. If you resolve an issue that isn't documented here:

1. Create a PR to update this guide with the solution
2. Include the symptoms, root cause, and resolution steps
3. Add any relevant error codes to the reference table 