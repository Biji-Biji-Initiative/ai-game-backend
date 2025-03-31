# AI Fight Club API - Startup & Deployment Guide

This document provides comprehensive information about starting and deploying the AI Fight Club API across different environments.

## Table of Contents

1. [Environment Overview](#environment-overview)
2. [Port Configuration](#port-configuration)
3. [Startup Methods](#startup-methods)
   - [Direct Node.js](#direct-nodejs)
   - [Using PM2 Process Manager](#using-pm2-process-manager)
4. [Environment Variables](#environment-variables)
5. [Verification](#verification)
6. [Troubleshooting](#troubleshooting)

## Environment Overview

The application can run in three primary environments:

- **Development** (`NODE_ENV=development`): For local development with hot-reloading
- **Testing** (`NODE_ENV=testing`): For running tests and CI/CD pipelines
- **Production** (`NODE_ENV=production`): For production deployment

## Port Configuration

Each environment uses a standardized port:

| Environment | Port | URL                   |
|-------------|------|------------------------|
| Development | 3000 | http://localhost:3000 |
| Testing     | 3002 | http://localhost:3002 |
| Production  | 9000 | http://localhost:9000 |

These ports are configured in the `.env` file with the following variables:
- `PORT`: Default port (typically matches DEV_PORT)
- `DEV_PORT`: Development environment port
- `TEST_PORT`: Testing environment port
- `PROD_PORT`: Production environment port

## Startup Methods

There are two primary ways to start the application:

### Direct Node.js

Direct Node.js startup is simpler but doesn't provide process management or auto-restart capabilities.

#### Development Mode
```bash
npm run start:dev
# or
NODE_ENV=development PORT=3000 node src/index.js
```

#### Testing Mode
```bash
npm run start:test
# or
NODE_ENV=testing PORT=3002 node src/index.js
```

#### Production Mode
```bash
npm run start:prod
# or
NODE_ENV=production PORT=9000 node src/index.js
```

### Using PM2 Process Manager

PM2 is recommended for production as it provides process management, auto-restart, and logging.

#### Install PM2 (if not already installed)
```bash
npm install -g pm2
```

#### Development Mode
```bash
npm run pm2:dev
# or
./start.sh development
```

#### Testing Mode
```bash
npm run pm2:test
# or
./start.sh testing
```

#### Production Mode
```bash
npm run pm2:prod
# or
./start.sh production
```

#### PM2 Management Commands

| Command               | Description                       |
|-----------------------|-----------------------------------|
| `npm run pm2:status`  | Check status of PM2 processes     |
| `npm run pm2:logs`    | View logs                         |
| `npm run pm2:monitor` | Launch PM2 monitoring dashboard   |
| `npm run pm2:stop`    | Stop the application              |
| `npm run pm2:restart` | Restart the application           |

## Environment Variables

The application requires several environment variables to function properly. These can be set in the `.env` file. See `.env.example` for a template.

### Required Environment Variables

- `NODE_ENV`: Application environment (development, testing, production)
- `PORT`: Port for the HTTP server (defaults are 3000, 3002, 9000)
- `SUPABASE_URL`: URL of your Supabase instance
- `SUPABASE_KEY`: Supabase API key
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key

### Optional Environment Variables

- `BASE_URL`: Base URL for the application
- `API_PREFIX`: Prefix for API endpoints
- `API_DOCS_PATH`: Path for API documentation
- `API_TESTER_PATH`: Path for API tester UI
- `LOG_LEVEL`: Logging level (debug, info, warn, error)

## Verification

To verify that the application is running correctly in production mode:

```bash
npm run verify:prod
```

This will check that the server is accessible and basic endpoints are working.

If you want to start the server as part of verification:

```bash
npm run verify:prod-with-server
```

## Troubleshooting

### Port Already in Use

If you encounter "Port already in use" errors:

1. Find the process using the port:
   ```bash
   lsof -i :<port>
   ```

2. Kill the process:
   ```bash
   kill -9 <pid>
   ```

### PM2 Issues

If PM2 is not behaving as expected:

1. Check the PM2 logs:
   ```bash
   pm2 logs
   ```

2. Restart PM2:
   ```bash
   pm2 restart all
   ```

3. Reset PM2:
   ```bash
   pm2 kill
   npm run pm2:prod
   ```

### Database Connection Issues

If you're having trouble connecting to the database:

1. Verify the Supabase credentials in your `.env` file
2. Check that the Supabase service is running
3. Ensure your IP is allowed in Supabase network settings

## Fixed Issues

1. **Dual Server Issue**: We fixed a problem where the application was trying to start two servers on the same port. The fix involved removing the direct server creation in index.js and only using the startServer() method.

2. **ChallengeRepository Constructor Error**: We created a ChallengeRepositoryWrapper that properly extends BaseRepository and follows the project's architectural patterns. This fixes the "ChallengeRepository is not a constructor" error.

3. **Missing Progress Controller Methods**: We created a ProgressControllerWrapper that extends the original controller and adds the missing methods (recordProgress, getUserSkills, getProgressStats) required by the routes.

4. **PM2 Configuration Issues**: We renamed ecosystem.config.js to ecosystem.config.cjs for better ES Module compatibility and updated the port configuration to use 9000 in production to avoid conflicts.

## Next Steps

For remaining tasks and future improvements, see the [NEXT-STEPS.md](./NEXT-STEPS.md) file.

## Important Notes

- The application uses port 9000 in production mode to avoid conflicts
- Authentication always uses real Supabase integration in production mode
- Event handlers and services are properly registered in production mode
- The application logs are available in the `logs` directory

For more information, consult the PM2 documentation at [https://pm2.keymetrics.io/docs/usage/quick-start/](https://pm2.keymetrics.io/docs/usage/quick-start/). 