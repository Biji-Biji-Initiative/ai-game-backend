# Security Practices

This document outlines the security practices, patterns, and considerations implemented in the AI Gaming Backend project. It serves as a guide for developers to understand and follow security best practices when working with the codebase.

## Authentication and Authorization

### Authentication Mechanisms

Our application uses a multi-layered authentication approach:

1. **JWT (JSON Web Tokens)**
   - Primary authentication mechanism for API requests
   - Tokens include expiration timestamps and are signed with a secret key
   - Token structure: `header.payload.signature`
   - Access tokens expire after 1 hour
   - Refresh tokens expire after 7 days

2. **OAuth 2.0 Integration**
   - Support for third-party authentication (Google, GitHub)
   - Implementation uses the authorization code flow
   - OAuth provider configuration in environment variables

### Authorization Framework

We use a role-based access control (RBAC) system:

1. **User Roles**
   - `player`: Basic access to game functionality
   - `developer`: Access to development APIs and tools
   - `admin`: Full system access with administrative capabilities
   
2. **Permission System**
   - Fine-grained permissions attached to roles
   - Resources have associated required permissions
   - Custom middleware checks permissions before allowing access

### Authentication Flow

```
┌─────────┐      1. Login Request     ┌─────────┐
│  Client │───────────────────────────>│  Auth   │
│         │                           │ Service  │
│         │<───────────────────────────│         │
└─────────┘      2. JWT Tokens        └─────────┘
     │                                     ▲
     │ 3. API Request                      │
     │ with JWT                            │
     ▼                                     │
┌─────────┐      4. Token                  │
│  API    │         Validation Request     │
│ Gateway │───────────────────────────────┘
└─────────┘
```

### Code Example: Authentication Middleware

```javascript
// middleware/auth.js
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../core/errors';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authentication token');
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    req.user = {
      id: decoded.userId,
      role: decoded.role,
      permissions: decoded.permissions
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      next(new UnauthorizedError('Authentication token expired'));
    } else {
      next(new UnauthorizedError('Invalid authentication token'));
    }
  }
};
```

### Code Example: Authorization Middleware

```javascript
// middleware/authorization.js
import { ForbiddenError } from '../core/errors';

export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }
    
    if (req.user.role === 'admin') {
      return next(); // Admins bypass permission checks
    }
    
    if (req.user.permissions.includes(permission)) {
      return next();
    }
    
    next(new ForbiddenError(`Missing required permission: ${permission}`));
  };
};
```

## Data Protection

### Sensitive Data Handling

1. **Password Security**
   - Passwords are hashed using bcrypt with a work factor of 12
   - Plaintext passwords are never stored or logged
   - Password reset uses time-limited, single-use tokens

2. **PII (Personally Identifiable Information) Protection**
   - PII is encrypted at rest using AES-256
   - Limited access to PII through permission system
   - Data minimization principle applied to API responses

3. **Secrets Management**
   - Application secrets stored in environment variables
   - Production secrets managed through a secure vault system
   - No secrets in source code or configuration files

### Encryption Implementations

1. **Data at Rest**
   - Database encryption for sensitive fields
   - File system encryption for stored files

2. **Data in Transit**
   - TLS 1.3 for all HTTP communications
   - Certificate pinning for critical communications
   - Secure WebSocket connections for real-time features

### Code Example: Password Handling

```javascript
// services/userService.js
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export const hashPassword = async (password) => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

export const verifyPassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};
```

### Code Example: Data Encryption

```javascript
// utils/encryption.js
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SECRET_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export const encrypt = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return {
    iv: iv.toString('hex'),
    encrypted,
    authTag
  };
};

export const decrypt = ({ iv, encrypted, authTag }) => {
  const decipher = crypto.createDecipheriv(
    ALGORITHM, 
    SECRET_KEY, 
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};
```

## API Security

### Request Validation

1. **Input Validation**
   - All API inputs validated against schemas
   - Validation occurs before business logic execution
   - Custom validators for complex business rules

2. **Request Sanitization**
   - HTML sanitization for user-provided content
   - SQL/NoSQL injection prevention

### Rate Limiting

We implement rate limiting to prevent abuse:

1. **Global Rate Limits**
   - 1000 requests per IP per hour
   - Configurable through environment variables

2. **Endpoint-Specific Limits**
   - Authentication endpoints: 10 requests per IP per minute
   - User creation: 5 requests per IP per hour
   - Game actions: 100 requests per user per minute

3. **Response Headers**
   - `X-RateLimit-Limit`: Maximum requests allowed
   - `X-RateLimit-Remaining`: Remaining requests
   - `X-RateLimit-Reset`: Time when limit resets

### CORS Configuration

Cross-Origin Resource Sharing is configured to:

1. Allow specific origins in production
2. Allow all origins in development (with credentials)
3. Limit allowed methods and headers appropriately

```javascript
// middleware/cors.js
export const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? process.env.ALLOWED_ORIGINS.split(',')
    : true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
};
```

## Attack Prevention

### SQL/NoSQL Injection Prevention

1. **ORM/ODM Usage**
   - MongoDB queries constructed using Mongoose
   - Parameterized queries for direct database access
   - Schema validation to ensure proper types

2. **Input Parameterization**
   - No string concatenation for database queries
   - Parameter binding for all dynamic values

### XSS (Cross-Site Scripting) Prevention

1. **Content Security Policy**
   - Strict CSP headers to prevent inline scripts
   - Restricted sources for scripts, styles, and other resources

2. **Output Encoding**
   - All user-generated content is HTML-encoded before rendering
   - Context-specific encoding for JavaScript, CSS, and URLs

### CSRF (Cross-Site Request Forgery) Protection

1. **Token-Based Protection**
   - CSRF tokens for state-changing operations
   - Token verification on server side

2. **SameSite Cookie Attribute**
   - Cookies set with `SameSite=Lax` or `SameSite=Strict`
   - Prevents cookies from being sent in cross-site requests

## Security Monitoring and Response

### Logging and Monitoring

1. **Security Event Logging**
   - Authentication attempts (successful and failed)
   - Authorization failures
   - Admin activities
   - Rate limit violations

2. **Anomaly Detection**
   - Unusual access patterns
   - Unexpected geographic access
   - Excessive failed authentication attempts

### Vulnerability Management

1. **Dependency Scanning**
   - Regular npm audit checks
   - Automated vulnerability scanning in CI/CD
   - Scheduled dependency updates

2. **Security Testing**
   - Regular penetration testing
   - OWASP Top 10 vulnerability assessment
   - Static code analysis

### Incident Response

1. **Security Incident Procedure**
   - Defined incident classification
   - Response team and roles
   - Communication protocols
   - Recovery procedures

2. **Breach Notification Process**
   - User notification requirements
   - Regulatory compliance steps
   - Evidence preservation

## Secure Development Lifecycle

### Security Requirements

1. **Security in Design Phase**
   - Threat modeling for new features
   - Security design reviews
   - Privacy impact assessment

2. **Secure Coding Guidelines**
   - Language-specific security guidelines
   - Code review checklists
   - Security-focused testing requirements

### Security in CI/CD

1. **Automated Security Testing**
   - SAST (Static Application Security Testing)
   - Dependency vulnerability scanning
   - Secret detection

2. **Security Gates**
   - Failing builds for critical security issues
   - Manual security review for significant changes

## Best Practices for Developers

1. **Authentication and Authorization**
   - Always use the authentication middleware for protected routes
   - Check permissions before accessing or modifying resources
   - Never bypass authentication mechanisms for convenience

2. **Data Protection**
   - Use encryption utilities for sensitive data
   - Never log sensitive information
   - Apply the principle of least privilege

3. **Input Validation**
   - Validate all user inputs
   - Use schema validation for request bodies
   - Implement context-specific validation

4. **Output Encoding**
   - Always encode user-supplied content before rendering
   - Use the appropriate encoding for the context (HTML, JS, etc.)
   - Never insert user input directly into responses

5. **Security Testing**
   - Include security test cases
   - Consider attack vectors when designing tests
   - Test error cases and edge conditions 