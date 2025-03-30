# Production Deployment Guide

This guide provides comprehensive information about deploying the application to production environments.

## Environment Configuration

The application can run in three primary environments:

- **Development** (`NODE_ENV=development`): For local development with hot-reloading
- **Testing** (`NODE_ENV=testing`): For running tests and CI/CD pipelines
- **Production** (`NODE_ENV=production`): For production deployment

### Port Configuration

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

## Deployment Methods

### Direct Node.js

Direct Node.js startup is simpler but doesn't provide process management or auto-restart capabilities.

```bash
NODE_ENV=production PORT=9000 node src/index.js
```

### Using PM2 Process Manager (Recommended)

PM2 is recommended for production as it provides process management, auto-restart, and logging.

#### 1. Install PM2 (if not already installed)

```bash
npm install -g pm2
```

#### 2. Start the Application with PM2

```bash
npm run pm2:prod
```

or

```bash
./start.sh production
```

This will start the application in production mode using the configuration in `ecosystem.config.cjs`.

## PM2 Management

### Basic PM2 Commands

| Command               | Description                       |
|-----------------------|-----------------------------------|
| `pm2 status`          | Check status of PM2 processes     |
| `pm2 logs`            | View logs                         |
| `pm2 monit`           | Launch PM2 monitoring dashboard   |
| `pm2 stop <app-name>` | Stop the application              |
| `pm2 restart <app-name>` | Restart the application        |
| `pm2 delete <app-name>` | Delete the application from PM2 |

### Convenience Scripts

We provide several npm scripts to simplify PM2 management:

| Command               | Description                       |
|-----------------------|-----------------------------------|
| `npm run pm2:status`  | Check status of PM2 processes     |
| `npm run pm2:logs`    | View logs                         |
| `npm run pm2:monitor` | Launch PM2 monitoring dashboard   |
| `npm run pm2:stop`    | Stop the application              |
| `npm run pm2:restart` | Restart the application           |

### PM2 Persistence and Startup

To ensure PM2 processes restart after server reboot:

```bash
# Save the current PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

Follow the instructions provided by the `pm2 startup` command to complete the setup.

## Environment Variables

The application requires several environment variables to function properly. These should be set in the `.env` file or in the environment where the application runs.

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

## Logging

In production, logs are stored in the following locations:

- **PM2 Logs**: `~/.pm2/logs/`
- **Application Logs**: `./logs/` (when using the internal logging system)

To view the PM2 logs:

```bash
pm2 logs
```

## Health Checks and Monitoring

### API Health Check

The application provides a health check endpoint:

```
GET /api/health
```

This endpoint returns a JSON object with the status of the application and critical dependencies.

### PM2 Monitoring

PM2 provides a built-in monitoring dashboard:

```bash
pm2 monit
```

This dashboard shows CPU usage, memory usage, and logs for all PM2 processes.

### External Monitoring

Consider setting up external monitoring services:

- **Uptime Monitoring**: Services like UptimeRobot or Pingdom
- **Error Tracking**: Sentry or similar
- **Performance Monitoring**: New Relic or DataDog

## Scaling

### Vertical Scaling

PM2 can run multiple instances of the application on the same server:

```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [{
    name: "app-name",
    script: "./src/index.js",
    instances: "max", // or a specific number
    exec_mode: "cluster"
  }]
}
```

### Horizontal Scaling

For horizontal scaling:

1. Deploy the application to multiple servers
2. Set up a load balancer (e.g., Nginx, AWS ELB) to distribute traffic
3. Ensure shared resources (database, cache) can handle the increased load

## Deployment Checklist

Before deploying to production:

1. **Run Tests**: Ensure all tests pass (`npm test`)
2. **Check for Vulnerabilities**: Run `npm audit`
3. **Verify Environment Variables**: Ensure all required environment variables are set
4. **Check Database Migrations**: Run any pending database migrations
5. **Optimize for Production**: Set `NODE_ENV=production` to enable optimizations
6. **Set Up Monitoring**: Configure monitoring and alerting
7. **Backup Data**: Ensure database backups are configured
8. **Document Deployment**: Update deployment documentation if necessary

## Troubleshooting

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

### Database Connection Issues

If you're having trouble connecting to the database:

1. Verify the database credentials in your `.env` file
2. Check that the database service is running
3. Ensure your server's IP is allowed in the database firewall settings

## Common Production Issues

### Memory Leaks

If you notice increasing memory usage:

1. Use `pm2 monit` to monitor memory usage
2. Implement proper cleanup of resources (close connections, etc.)
3. Consider implementing a memory limit in the PM2 configuration

### Handling Crashes

PM2 will automatically restart the application if it crashes. To investigate crashes:

1. Check the PM2 logs for error messages
2. Look for uncaught exceptions or unhandled promise rejections
3. Implement proper error handling in critical sections of code

## Resources

- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Node.js Production Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [Nginx Load Balancing](https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/) 