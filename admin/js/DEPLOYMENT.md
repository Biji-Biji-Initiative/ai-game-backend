# Deployment Guide

This document outlines the deployment process for the Admin UI application after the architectural refactoring.

## Prerequisites

Before deploying, ensure you have the following:

- Node.js 16.x or higher
- npm 8.x or higher
- Access to the target environment (development, staging, or production)
- Required environment variables/configuration

## Build Process

The application uses a TypeScript build process to compile the source code into browser-compatible JavaScript.

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Application

```bash
npm run build
```

This will:
- Clean the output directory
- Compile TypeScript to JavaScript
- Bundle assets using Webpack
- Minify and optimize for production

The compiled application will be available in the `dist/` directory.

## Deployment Options

### Option 1: Static File Hosting

The simplest deployment option is to host the built files on a static file server:

1. Copy the contents of the `dist/` directory to your web server's root directory.
2. Configure your web server to serve the `index.html` file for all routes.

Example Nginx configuration:

```nginx
server {
  listen 80;
  server_name admin.example.com;
  root /var/www/html/admin;
  
  location / {
    try_files $uri $uri/ /index.html;
  }
  
  # Cache static assets
  location ~* \.(js|css|png|jpg|jpeg|gif|ico)$ {
    expires 30d;
    add_header Cache-Control "public, no-transform";
  }
}
```

### Option 2: Docker Deployment

For containerized deployments, use the provided Dockerfile:

1. Build the Docker image:

```bash
docker build -t admin-ui:latest .
```

2. Run the container:

```bash
docker run -p 8080:80 -e API_URL=https://api.example.com admin-ui:latest
```

### Option 3: Cloud Service Deployment

#### AWS S3 + CloudFront

1. Build the application
2. Upload to an S3 bucket:

```bash
aws s3 sync dist/ s3://your-bucket-name/ --delete
```

3. Set up CloudFront for CDN distribution

#### Azure Static Web Apps

1. Configure the GitHub Actions workflow file
2. Push to your repository
3. Azure will automatically build and deploy

## Environment Configuration

The application loads configuration from two sources:

1. Static configuration in `/config/app-config.json`
2. Runtime environment variables injected into `window.__APP_CONFIG__`

### Config File Structure

The `app-config.json` file should contain:

```json
{
  "api": {
    "baseUrl": "/api",
    "version": "v1",
    "timeout": 30000
  },
  "logging": {
    "level": "info",
    "enableConsole": true,
    "enableRemote": false
  },
  "storage": {
    "prefix": "admin_",
    "useLocalStorage": true
  },
  "ui": {
    "theme": "light",
    "animationsEnabled": true
  }
}
```

### Runtime Configuration

For runtime configuration, add a script to your HTML before loading the application:

```html
<script>
  window.__APP_CONFIG__ = {
    api: {
      baseUrl: "https://api.example.com"
    },
    logging: {
      level: "error"
    }
  };
</script>
```

## Health Checks

The application provides a health check endpoint at `/health` that returns:

```json
{
  "status": "ok",
  "version": "1.2.3",
  "timestamp": "2023-06-15T12:34:56Z",
  "environment": "production"
}
```

Configure your load balancer or monitoring service to check this endpoint.

## Rollback Procedure

If you need to rollback to a previous version:

1. Identify the version to rollback to
2. Deploy the assets for that version
3. Update any environment configuration if necessary

For Docker deployments:

```bash
docker stop admin-ui-container
docker run -p 8080:80 -e API_URL=https://api.example.com admin-ui:1.2.3
```

For S3 deployments:

```bash
aws s3 sync s3://your-bucket-name-backup/v1.2.3/ s3://your-bucket-name/ --delete
```

## Performance Monitoring

The application includes built-in performance monitoring that tracks:

- API request latency
- Component render times
- Error rates

These metrics are available in the application UI under the "Admin" section and can be exported to monitoring tools via the `/metrics` endpoint.

## Security Considerations

1. **HTTPS**: Always serve the application over HTTPS
2. **CSP**: Configure a Content Security Policy to prevent XSS attacks
3. **Authentication**: Ensure the API endpoints require proper authentication
4. **Secrets**: Never include API keys or secrets in the client-side code

Example CSP header:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; connect-src 'self' https://api.example.com; img-src 'self' data:; style-src 'self' 'unsafe-inline';
```

## Troubleshooting

### Common Issues

1. **API Connectivity Problems**:
   - Check that the API_URL is correctly configured
   - Verify CORS settings on the API server
   - Check network connectivity between the client and API

2. **Missing or Incorrect Configuration**:
   - Verify that app-config.json exists and is properly formatted
   - Check that all required environment variables are set

3. **Performance Issues**:
   - Use the browser's developer tools to identify bottlenecks
   - Check for excessive API calls or large responses
   - Verify that caching is properly configured

### Logging

The application logs to:
- Browser console (development)
- Remote logging service (configurable in production)

To enable verbose logging, set the logging level to "debug" in the configuration.

## Maintenance

### Regular Updates

1. Update dependencies monthly using:
   ```bash
   npm update
   ```

2. Test the application after updates to ensure compatibility.

3. Re-deploy when significant dependency updates are available.

### Monitoring

Set up monitoring for:
- Application availability
- API response times
- Error rates
- User activity

## Support Resources

- Documentation: `/docs`
- GitHub Repository: `https://github.com/your-org/admin-ui`
- Issue Tracker: `https://github.com/your-org/admin-ui/issues` 