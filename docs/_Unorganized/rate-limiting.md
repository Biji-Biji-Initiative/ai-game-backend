# API Rate Limiting

This document explains the rate limiting implementation in our application, how it works, and how to customize it for different endpoints.

## Overview

Rate limiting is implemented to protect the API from abuse and potential denial-of-service attacks. The implementation uses the `express-rate-limit` library and applies different rate limits based on endpoint sensitivity.

## Configuration

Rate limiting is configured in `src/config/config.js` under the `rateLimit` section:

```javascript
rateLimit: {
    // Enable/disable rate limiting globally
    enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    
    // Global rate limit settings (all routes)
    global: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // 100 requests per 15 minutes
        standardHeaders: true, // Include X-RateLimit-* headers
        legacyHeaders: false, // Disable the X-RateLimit-* headers
        message: 'Too many requests from this IP, please try again later',
        skip: process.env.NODE_ENV === 'development' && process.env.SKIP_RATE_LIMIT === 'true'
    },
    
    // Rate limit for auth routes (login, signup)
    auth: {
        windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
        max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10), // 10 requests per 15 minutes
        standardHeaders: true,
        legacyHeaders: false,
        message: 'Too many authentication attempts, please try again later'
    },
    
    // Rate limit for sensitive operations
    sensitive: {
        windowMs: parseInt(process.env.SENSITIVE_RATE_LIMIT_WINDOW_MS || '3600000', 10), // 1 hour
        max: parseInt(process.env.SENSITIVE_RATE_LIMIT_MAX || '5', 10), // 5 requests per hour
        standardHeaders: true,
        legacyHeaders: false,
        message: 'Too many sensitive operations, please try again later'
    }
}
```

## Environment Variables

You can customize rate limiting using these environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `RATE_LIMIT_ENABLED` | Enable/disable rate limiting | `true` |
| `RATE_LIMIT_WINDOW_MS` | Time window for global rate limit | `900000` (15 minutes) |
| `RATE_LIMIT_MAX` | Maximum requests per window for global limit | `100` |
| `AUTH_RATE_LIMIT_WINDOW_MS` | Time window for auth endpoints | `900000` (15 minutes) |
| `AUTH_RATE_LIMIT_MAX` | Maximum requests per window for auth endpoints | `10` |
| `SENSITIVE_RATE_LIMIT_WINDOW_MS` | Time window for sensitive endpoints | `3600000` (1 hour) |
| `SENSITIVE_RATE_LIMIT_MAX` | Maximum requests per window for sensitive endpoints | `5` |
| `SKIP_RATE_LIMIT` | Skip rate limiting in development | `false` |

## Implementation Details

The rate limiting middleware is implemented in `src/core/infra/http/middleware/rateLimit.js`. It provides:

1. **Global rate limiter**: Applied to all API routes
2. **Auth rate limiter**: Applied to authentication endpoints
3. **Sensitive operations rate limiter**: Applied to sensitive operations

The middleware uses the `express-rate-limit` library and adds custom logging for rate limit violations.

## Response Headers

When rate limiting is enabled, the following headers are included in responses:

- `X-RateLimit-Limit`: Maximum number of requests allowed in the current time window
- `X-RateLimit-Remaining`: Number of requests remaining in the current time window
- `X-RateLimit-Reset`: Time (in seconds) until the rate limit window resets

## Rate Limit Violations

When a client exceeds the rate limit, they will receive:

1. A 429 (Too Many Requests) HTTP status code
2. A JSON response with an error message
3. The appropriate rate limit headers

## Customizing for Different Endpoints

To apply different rate limits to specific endpoints, modify the `applyRateLimiting` function in `src/core/infra/http/middleware/rateLimit.js`:

```javascript
// Apply rate limiting to specific endpoints
app.use([
  `${apiPrefix}/your/specific/endpoint`,
  `${apiPrefix}/another/endpoint`
], customLimiter);
```

## Disabling Rate Limiting

To disable rate limiting:

- Set the environment variable `RATE_LIMIT_ENABLED=false`
- In development, you can set `SKIP_RATE_LIMIT=true` to disable it

## Troubleshooting

If you're experiencing issues with rate limiting:

1. Check the logs for warnings about rate limit violations
2. Verify the rate limit configuration in `config.js`
3. For development, set `SKIP_RATE_LIMIT=true` to bypass rate limiting

## Security Considerations

- Rate limiting is based on IP address by default
- For applications behind proxies, ensure the `trust proxy` setting is configured correctly
- Consider implementing more advanced rate limiting strategies for production environments, such as user-based or token-based rate limiting

## References

- [express-rate-limit documentation](https://github.com/express-rate-limit/express-rate-limit)
- [OWASP API Security Top 10: API4:2023 Unrestricted Resource Consumption](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/) 