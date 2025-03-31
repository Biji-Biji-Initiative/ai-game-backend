# SEC-4: Configure Security Headers

## Problem Statement

After reviewing the application's HTTP security posture, I discovered that our application is missing critical security headers that help prevent common web vulnerabilities like Cross-Site Scripting (XSS), clickjacking, and other security threats. This gap exposes the application to several risks:

1. **Clickjacking Vulnerability**: Without appropriate X-Frame-Options headers, our application could be embedded in iframes on malicious sites
2. **XSS Attacks**: Missing Content-Security-Policy headers leave the application vulnerable to script injection attacks
3. **MIME Type Confusion**: Without X-Content-Type-Options, browsers might interpret files in unintended ways
4. **Transport Security Issues**: Missing Strict-Transport-Security header may allow downgrade attacks
5. **Information Leakage**: Default headers may reveal technology stack details useful to attackers

## Implementation Strategy

To address these security vulnerabilities, I'll implement security headers using the Helmet middleware for Express. Helmet is a collection of middleware functions that set HTTP response headers to improve security. The implementation will include:

1. **Installing the Helmet Package**: Add the helmet package to our dependencies
2. **Configuring Security Headers**: Apply appropriate security headers based on our application's needs
3. **Environment-Specific Settings**: Configure different security policies for development and production
4. **Testing and Validation**: Ensure headers are applied correctly and don't break application functionality

## Implementation Details

### 1. Install Helmet Package

First, I'll add the helmet package to our dependencies:

```bash
npm install helmet --save
```

### 2. Configure Helmet in App.js

Then, I'll integrate Helmet into our Express app:

```javascript
// src/app.js

import express from 'express';
import helmet from 'helmet';
// ... other imports

const app = express();

// Apply Helmet middleware before other middleware to ensure headers are set for all responses
app.use(helmet());

// ... rest of app configuration
```

### 3. Create Custom Security Header Configuration

To fine-tune the security headers based on our application's needs, I'll create a dedicated configuration:

```javascript
// src/core/infra/security/securityHeadersConfig.js

/**
 * Security headers configuration
 * Customized based on application needs and environment
 * @param {Object} options - Configuration options
 * @returns {Object} - Helmet configuration object
 */
export function getSecurityHeadersConfig(options = {}) {
  const isDevelopment = options.isDevelopment || process.env.NODE_ENV === 'development';
  const isTest = options.isTest || process.env.NODE_ENV === 'test';
  
  // Base configuration
  const config = {
    // Basic XSS protection for older browsers
    xssFilter: true,
    
    // Prevent MIME type sniffing
    noSniff: true,
    
    // DNS prefetch control
    dnsPrefetchControl: {
      allow: false
    },
    
    // Frame options to prevent clickjacking
    frameguard: {
      action: 'deny'
    },
    
    // Strict transport security for HTTPS
    hsts: {
      maxAge: 15552000, // 180 days
      includeSubDomains: true,
      preload: true
    },
    
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for now
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: isDevelopment ? null : [],
      }
    },
    
    // Permissions policy (formerly Feature-Policy)
    permissionsPolicy: {
      features: {
        camera: ["'none'"],
        microphone: ["'none'"],
        geolocation: ["'none'"],
        notifications: ["'self'"],
        vibrate: ["'none'"],
      }
    }
  };
  
  // Adjust for development environment
  if (isDevelopment || isTest) {
    // Allow more relaxed CSP for development
    config.contentSecurityPolicy.directives.scriptSrc = [
      "'self'",
      "'unsafe-inline'",
      "'unsafe-eval'" // Needed for some dev tools
    ];
    
    // Shorten HSTS duration for development
    config.hsts.maxAge = 60; // 1 minute for testing
    
    // In test mode, we might need to disable some headers altogether
    if (isTest) {
      return {
        ...config,
        contentSecurityPolicy: false // Often disabled for testing
      };
    }
  }
  
  return config;
}

export default { getSecurityHeadersConfig };
```

### 4. Apply Custom Configuration to Helmet

Now, I'll update app.js to use our custom security headers configuration:

```javascript
// src/app.js

import express from 'express';
import helmet from 'helmet';
import { getSecurityHeadersConfig } from './core/infra/security/securityHeadersConfig.js';
// ... other imports

const app = express();

// Get environment-specific security headers configuration
const securityHeaders = getSecurityHeadersConfig({
  isDevelopment: process.env.NODE_ENV === 'development'
});

// Apply Helmet with custom configuration
app.use(helmet(securityHeaders));

// ... rest of app configuration
```

### 5. Add Report-Only Mode for Content-Security-Policy

During initial deployment, it's good practice to use CSP in report-only mode to avoid breaking functionality:

```javascript
// src/app.js (additional code after Helmet setup)

// If in production mode but using CSP report-only
if (process.env.CSP_REPORT_ONLY === 'true') {
  app.use(
    helmet.contentSecurityPolicy({
      ...securityHeaders.contentSecurityPolicy,
      reportOnly: true,
      directives: {
        ...securityHeaders.contentSecurityPolicy.directives,
        reportUri: '/api/csp-report'
      }
    })
  );
}

// Endpoint to collect CSP violation reports
app.post('/api/csp-report', (req, res) => {
  if (req.body) {
    // Log CSP violations
    console.warn('CSP Violation:', req.body);
    
    // In a real implementation, store these reports for analysis
    // cspViolationRepository.save(req.body);
  }
  
  // Don't give any information back
  res.status(204).end();
});
```

### 6. Create Custom Security Middleware

To add more flexibility and application-specific headers, I'll also create a custom security middleware:

```javascript
// src/core/infra/http/middleware/security.js

/**
 * Custom security middleware for application-specific headers
 * @returns {Function} Express middleware
 */
export function customSecurityHeaders() {
  return (req, res, next) => {
    // Remove sensitive headers
    res.removeHeader('X-Powered-By');
    
    // Add custom security headers not covered by Helmet
    
    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Cache control for sensitive pages
    if (req.path.includes('/profile') || req.path.includes('/admin')) {
      res.setHeader('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    
    // Continue to next middleware
    next();
  };
}

export default { customSecurityHeaders };
```

### 7. Apply Custom Middleware in App.js

Finally, I'll add our custom security middleware to the application:

```javascript
// src/app.js (updated)

import express from 'express';
import helmet from 'helmet';
import { getSecurityHeadersConfig } from './core/infra/security/securityHeadersConfig.js';
import { customSecurityHeaders } from './core/infra/http/middleware/security.js';
// ... other imports

const app = express();

// Apply Helmet with custom configuration
app.use(helmet(getSecurityHeadersConfig({
  isDevelopment: process.env.NODE_ENV === 'development'
})));

// Apply custom security headers
app.use(customSecurityHeaders());

// ... rest of app configuration
```

## Testing the Implementation

To verify the security headers are working correctly, I'll add tests:

```javascript
// tests/security/securityHeaders.test.js

import request from 'supertest';
import app from '../../src/app.js';

describe('Security Headers', () => {
  test('should set X-Content-Type-Options header', async () => {
    const response = await request(app).get('/');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });
  
  test('should set X-Frame-Options header', async () => {
    const response = await request(app).get('/');
    expect(response.headers['x-frame-options']).toBe('DENY');
  });
  
  test('should set Strict-Transport-Security header', async () => {
    const response = await request(app).get('/');
    expect(response.headers['strict-transport-security']).toContain('max-age=');
  });
  
  test('should set Content-Security-Policy header', async () => {
    const response = await request(app).get('/');
    expect(response.headers['content-security-policy']).toBeDefined();
  });
  
  test('should set Referrer-Policy header', async () => {
    const response = await request(app).get('/');
    expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });
  
  test('should not include X-Powered-By header', async () => {
    const response = await request(app).get('/');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});
```

## Benefits

Implementing security headers provides several important benefits:

1. **XSS Prevention**: Content-Security-Policy helps prevent cross-site scripting attacks
2. **Clickjacking Protection**: X-Frame-Options prevents the application from being framed
3. **HTTPS Enforcement**: Strict-Transport-Security ensures secure connections
4. **Reduced Information Leakage**: Removal of X-Powered-By hides technology stack details
5. **Defense in Depth**: Multiple overlapping security controls provide better protection

## Additional Security Considerations

Beyond headers, I've identified other security enhancements to consider in future tickets:

1. **Implement Subresource Integrity (SRI)** for external scripts and stylesheets
2. **Add CSRF protection** for all state-changing operations
3. **Set up periodic vulnerability scanning** to detect new security issues
4. **Implement rate limiting** to prevent brute force attacks
5. **Consider cookie security** with SameSite, Secure, and HttpOnly flags

## Next Steps

After implementing these security headers, we should:

1. Monitor for any CSP violations reported via the reporting endpoint
2. Iteratively refine CSP rules based on real-world usage
3. Ensure all new features adhere to our security header policies
4. Run regular security scans to verify effectiveness
