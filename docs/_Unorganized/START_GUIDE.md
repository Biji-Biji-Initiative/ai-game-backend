# AI Fight Club API - Simplified Startup Guide

This guide provides clear instructions for starting, stopping, and managing the API across different environments using PM2 as the standard approach.

## Environment Overview

The application supports three environments:

| Environment | Port | Purpose |
|-------------|------|---------|
| Development | 3000 | Local development with auto-restart |
| Testing | 3002 | Running tests and CI/CD |
| Production | 9000 | Production deployment |

## Starting the Application

We use PM2 for all environments to provide process management, auto-restart, and logging capabilities.

### Default (Production)
```bash
npm start
```

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run prod
```

### Starting with Shell Script Directly
```bash
./start.sh [environment]
```
Where `[environment]` is one of: `development`, `testing`, or `production`

## Managing the Application

### Viewing Status
```bash
pm2 list
# or
npm run pm2:status
```

### Viewing Logs
```bash
pm2 logs ai-fight-club-api
# or
npm run pm2:logs
```

### Monitoring
```bash
pm2 monit
# or
npm run pm2:monitor
```

### Stopping
```bash
npm run stop
# or
./stop.sh
```

### Restarting
```bash
npm run restart
# or
./restart.sh [environment]
```

## Verifying the Application

### Verify Current Environment
```bash
npm run verify
```

### Verify with Server Start
```bash
npm run verify:start
```

### Verify Production Environment
```bash
npm run verify:prod
```

## Key Features of Our Setup

1. **Consistent Environment Management**: The same startup method works across all environments
2. **Automatic Restart**: PM2 will automatically restart the application if it crashes
3. **Process Monitoring**: Real-time metrics and logs for your application
4. **Environment-Specific Ports**: Each environment uses a different port to avoid conflicts
5. **Verification**: Built-in server verification to ensure everything is working properly

## Troubleshooting

### Application Won't Start

Check for these common issues:

1. **Port already in use**
   ```bash
   lsof -i :<port>
   kill -9 <pid>
   ```

2. **Missing environment variables**
   - Ensure your `.env` file contains all required variables
   - Compare with `.env.example` for missing values

3. **PM2 issues**
   ```bash
   # Reset PM2
   pm2 kill
   npm start
   ```

### Viewing Application Logs

When troubleshooting, always check the logs:

```bash
# Last 200 lines
pm2 logs ai-fight-club-api --lines 200

# Real-time logs
pm2 logs ai-fight-club-api
```

### Monitoring Resources

Monitor CPU and memory usage:

```bash
pm2 monit
``` 