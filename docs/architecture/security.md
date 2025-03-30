# Security Architecture

This document outlines the security measures implemented in the AI Fight Club API.

## Cross-Origin Resource Sharing (CORS)

### Overview

Cross-Origin Resource Sharing (CORS) is a security feature implemented by browsers that restricts web pages from making requests to a different domain than the one that served the original page. Our API implements strict CORS controls to prevent unauthorized access from unknown origins.

### Configuration

The CORS configuration is environment-dependent:

- **Production Environment**: Only allows requests from explicitly whitelisted origins
- **Development Environment**: More permissive settings to facilitate local development

### How to Configure CORS

1. In the `.env` file, set the `ALLOWED_ORIGINS` variable with a comma-separated list of trusted origins:

```
ALLOWED_ORIGINS=https://yourfrontend.com,https://admin.yourfrontend.com
```

2. In production, requests from origins not in this list will be rejected with a CORS error.

3. In development mode, the API defaults to allowing all origins (`*`) if `ALLOWED_ORIGINS` is not set.

### Implementation Details

- CORS configuration is defined in `src/config/config.js` in the `cors` section
- The middleware implementation is in `src/app.js`
- The configuration dynamically adapts based on the environment (production vs. development)

### Security Best Practices

- Never use `origin: '*'` in production environments
- Always specify exact origins rather than using wildcards
- Include the protocol (http/https) in origin specifications
- Regularly audit and update the allowed origins list
- Consider using separate lists for different environments/deployments

## Other Security Measures

*This section will be expanded with additional security measures implemented in the application.* 