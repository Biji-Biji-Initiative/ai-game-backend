# EXT-2: Define Clear API Versioning Strategy

## Problem Statement

Our API prefix includes `v1`, implying versioning, but we currently lack a formalized strategy for API versioning. This creates several issues:

1. **Unclear Evolution Path**: No defined approach for managing breaking changes
2. **Inconsistent Versioning**: Different routes may use inconsistent versioning schemes
3. **Inadequate Documentation**: Swagger docs don't clearly communicate versioning expectations
4. **Support Lifecycle Ambiguity**: No clarity on how long older API versions will be maintained
5. **Client Impact Uncertainty**: Clients can't plan for API changes or new versions

## Implementation Strategy

I'll define and document a comprehensive API versioning strategy that includes:

1. **Versioning Approach**: Define how new API versions will be released
2. **Breaking vs. Non-Breaking Changes**: Document what constitutes each type
3. **Version Lifecycle**: Establish phases and support periods for each API version
4. **Client Migration**: Create guidelines for helping clients migrate between versions
5. **Documentation Standards**: Update Swagger configuration to reflect versioning strategy

## Implementation Details

### 1. Create API Versioning Strategy Document

First, I'll create a comprehensive API versioning strategy document:

```markdown
# API Versioning Strategy

## Overview

This document outlines our API versioning strategy, including how we manage API changes, version lifecycles, and client migration paths. The goal is to provide a clear, consistent approach to API versioning that balances innovation with stability.

## Versioning Approach

We use **URL path versioning** as our primary versioning mechanism:

```
https://api.example.com/api/v1/resources
https://api.example.com/api/v2/resources
```

This approach was chosen because:
- It's explicit and visible to developers
- It allows different versions to coexist
- It's easy to route to different code implementations
- It works well with API management tools and documentation

## Version Numbering

We follow these version numbering rules:

1. **Major Versions (v1, v2)**: Incremented for breaking changes that require client updates
2. **Minor Versions**: Released as non-breaking changes within a major version
3. **Patch Versions**: Bug fixes and minor improvements within a minor version

Minor and patch versions are not reflected in the URL path but are documented in release notes.

## Breaking vs. Non-Breaking Changes

### Breaking Changes (Require New Major Version)

- Removing or renaming API endpoints
- Removing or renaming request/response fields
- Changing field types or validation rules
- Changing error response formats
- Altering authentication/authorization requirements
- Changing the fundamental behavior of an endpoint

### Non-Breaking Changes (No Version Change)

- Adding new optional request fields
- Adding new response fields
- Adding new endpoints
- Extending enumerations
- Relaxing validation rules
- Performance improvements
- Bug fixes that don't alter behavior
- Improved error messages (that maintain the same format)

## Version Lifecycle

Each API version goes through the following lifecycle phases:

1. **Preview (Optional)**: Early access for selected partners
2. **General Availability (GA)**: Available for all clients
3. **Deprecated**: No new features, only critical bug fixes
4. **Sunset**: End-of-life, API version retired

### Timeframes

- **Preview to GA**: Variable, based on feedback and readiness
- **GA to Deprecation**: Minimum 12 months after a newer version is released
- **Deprecation to Sunset**: Minimum 6 months notice

## Version Support Policy

- We maintain a minimum of two major API versions at any time
- Deprecated versions receive security fixes and critical bug fixes only
- When a version reaches its sunset date, it will be removed with no redirect

## Client Communication

We notify clients of version changes through:
- Release notes in API documentation
- Deprecation headers on API responses
- Email notifications for registered API consumers
- Announcements in developer portal
- Early access to preview versions for major clients

## Client Migration

To help clients migrate between versions, we provide:
- Detailed migration guides
- Example requests/responses comparing versions
- Coexistence of versions during transition periods
- Tools to test compatibility with new versions

## Version Detection and Selection

Clients can select an API version through:
1. **URL Path** (primary method): `/api/v2/resources`
2. **Accept Header** (optional fallback): `Accept: application/vnd.example.v2+json`

The URL path version takes precedence when both are specified.

## Documentation

All API versions are documented separately in our API documentation:
- Current and previous versions are fully documented
- Deprecated endpoints are clearly marked
- Migration guides are linked from documentation
- Swagger UI includes version selector

## Exceptions

In rare circumstances, we may need to make changes to an existing API version:
- Critical security vulnerabilities
- Legal compliance requirements
- Severe operational issues

In these cases, we'll:
- Communicate changes with as much notice as possible
- Provide detailed explanations
- Offer migration assistance

## Special Considerations

### Beta Features
Features marked as "beta" within a stable API version:
- May change or be removed without a major version change
- Are clearly marked in documentation
- Should not be used in production systems

### Default Version
If no version is specified, the request is routed to the oldest non-deprecated version.
```

### 2. Update API Routes Structure

Restructure API routes to support proper versioning:

```javascript
// src/core/infra/http/api/createApiRouter.js

import express from 'express';
import { logger } from '../../../infra/logging/logger.js';

/**
 * Create versioned API router
 * 
 * @param {Object} options - Router options
 * @param {Object} options.versions - Map of version to route factories
 * @param {string} options.defaultVersion - Default version if none specified
 * @param {Array<Function>} options.globalMiddleware - Middleware applied to all versions
 * @returns {express.Router} Express router
 */
export function createApiRouter(options) {
  const { 
    versions, 
    defaultVersion = 'v1',
    globalMiddleware = []
  } = options;
  
  const apiRouter = express.Router();
  
  // Apply global middleware to all API routes
  globalMiddleware.forEach(middleware => {
    apiRouter.use(middleware);
  });
  
  // Standard version routing through URL path
  Object.entries(versions).forEach(([version, setupRoutes]) => {
    const versionRouter = express.Router();
    
    // Apply version-specific setup
    setupRoutes(versionRouter);
    
    // Mount version router
    apiRouter.use(`/${version}`, versionRouter);
    
    logger.info(`API ${version} routes registered`);
  });
  
  // Handle default version (redirect to current default)
  apiRouter.use('/', (req, res, next) => {
    // Check if the request is directly to /api
    if (req.path === '/' || req.path === '') {
      return res.redirect(`/api/${defaultVersion}`);
    }
    
    // Implement accept header version routing as fallback
    const acceptHeader = req.get('Accept');
    if (acceptHeader && acceptHeader.includes('application/vnd.example.')) {
      // Extract version from accept header
      const match = acceptHeader.match(/application\/vnd\.example\.(v[0-9]+)\+json/);
      if (match && match[1] && versions[match[1]]) {
        // Rewrite URL to include version
        req.url = `/${match[1]}${req.url}`;
        return next();
      }
    }
    
    // Pass through for all other paths
    next();
  });
  
  return apiRouter;
}

export default { createApiRouter };
```

### 3. Set Up Version Management

Create version management for the API:

```javascript
// src/core/infra/http/api/versionManager.js

import { logger } from '../../../infra/logging/logger.js';

// Version lifecycle stages
export const VersionStatus = {
  PREVIEW: 'preview',
  ACTIVE: 'active',
  DEPRECATED: 'deprecated',
  SUNSET: 'sunset'
};

/**
 * API version manager
 * Tracks API versions and their lifecycle status
 */
class ApiVersionManager {
  constructor() {
    this.versions = new Map();
    this.defaultVersion = null;
  }
  
  /**
   * Register an API version
   * @param {string} version - Version identifier (e.g., 'v1')
   * @param {Object} details - Version details
   * @param {string} details.status - Version status
   * @param {Date} details.releaseDate - Release date
   * @param {Date} details.deprecationDate - Deprecation date (optional)
   * @param {Date} details.sunsetDate - Sunset date (optional)
   * @param {boolean} details.isDefault - Whether this is the default version
   */
  registerVersion(version, details) {
    this.versions.set(version, {
      ...details,
      version
    });
    
    // Set as default if specified or if it's the first active version
    if (details.isDefault || 
       (details.status === VersionStatus.ACTIVE && !this.defaultVersion)) {
      this.defaultVersion = version;
    }
    
    logger.info(`API ${version} registered`, { 
      status: details.status,
      isDefault: !!details.isDefault
    });
  }
  
  /**
   * Get all registered API versions
   * @returns {Array} Array of version details
   */
  getAllVersions() {
    return Array.from(this.versions.values());
  }
  
  /**
   * Get active API versions
   * @returns {Array} Array of active version details
   */
  getActiveVersions() {
    return this.getAllVersions().filter(v => 
      v.status === VersionStatus.ACTIVE || 
      v.status === VersionStatus.PREVIEW
    );
  }
  
  /**
   * Get deprecated API versions
   * @returns {Array} Array of deprecated version details
   */
  getDeprecatedVersions() {
    return this.getAllVersions().filter(v => 
      v.status === VersionStatus.DEPRECATED
    );
  }
  
  /**
   * Get details for a specific version
   * @param {string} version - Version identifier
   * @returns {Object|null} Version details or null if not found
   */
  getVersion(version) {
    return this.versions.get(version) || null;
  }
  
  /**
   * Get the current default version
   * @returns {string} Default version identifier
   */
  getDefaultVersion() {
    return this.defaultVersion;
  }
  
  /**
   * Create version headers for a response
   * @param {string} version - Current API version
   * @returns {Object} Headers to add to response
   */
  getVersionHeaders(version) {
    const versionDetails = this.getVersion(version);
    if (!versionDetails) {
      return {};
    }
    
    const headers = {
      'X-API-Version': version
    };
    
    // Add deprecation notice if applicable
    if (versionDetails.status === VersionStatus.DEPRECATED && versionDetails.sunsetDate) {
      headers['Deprecation'] = 'true';
      headers['Sunset'] = versionDetails.sunsetDate.toUTCString();
      
      // Add link to documentation about migration
      headers['Link'] = '</api/docs/migration>; rel="deprecation"; type="text/html"';
    }
    
    return headers;
  }
}

// Create and export singleton instance
export const versionManager = new ApiVersionManager();

// Register known versions
versionManager.registerVersion('v1', {
  status: VersionStatus.ACTIVE,
  releaseDate: new Date('2023-01-01'),
  isDefault: true
});

export default { versionManager, VersionStatus };
```

### 4. Create Version Headers Middleware

```javascript
// src/core/infra/http/middleware/versionHeaders.js

import { versionManager } from '../api/versionManager.js';

/**
 * Add version headers to API responses
 * @returns {Function} Express middleware
 */
export function addVersionHeaders() {
  return (req, res, next) => {
    // Extract API version from path
    const pathParts = req.originalUrl.split('/');
    const versionIndex = pathParts.indexOf('api') + 1;
    
    if (versionIndex > 0 && versionIndex < pathParts.length) {
      const version = pathParts[versionIndex];
      
      // Get version headers from manager
      const versionHeaders = versionManager.getVersionHeaders(version);
      
      // Add headers to response
      Object.entries(versionHeaders).forEach(([name, value]) => {
        res.set(name, value);
      });
    }
    
    next();
  };
}

export default { addVersionHeaders };
```

### 5. Update App.js to Use Versioned API Router

```javascript
// src/app.js (updated)

import express from 'express';
import { createApiRouter } from './core/infra/http/api/createApiRouter.js';
import { addVersionHeaders } from './core/infra/http/middleware/versionHeaders.js';
import { versionManager } from './core/infra/http/api/versionManager.js';

// Import version route factories
import v1Routes from './routes/v1/index.js';
// Future version imports
// import v2Routes from './routes/v2/index.js';

// ... other imports and configuration

// Create API router with versioning
const apiRouter = createApiRouter({
  versions: {
    v1: v1Routes
    // Add future versions here
    // v2: v2Routes
  },
  defaultVersion: versionManager.getDefaultVersion(),
  globalMiddleware: [
    addVersionHeaders()
    // Other API-wide middleware
  ]
});

// Mount API router
app.use('/api', apiRouter);

// ... rest of app configuration
```

### 6. Update Directory Structure for Versioned Routes

```
src/
  routes/
    v1/
      index.js             # Main setup for v1 routes
      userRoutes.js        # User routes for v1
      challengeRoutes.js   # Challenge routes for v1
      ...
    v2/
      index.js             # Main setup for v2 routes
      userRoutes.js        # User routes for v2 
      ...
```

Example v1 index.js:

```javascript
// src/routes/v1/index.js

import userRoutes from './userRoutes.js';
import challengeRoutes from './challengeRoutes.js';
import evaluationRoutes from './evaluationRoutes.js';
// ... other route imports

/**
 * Setup v1 API routes
 * @param {express.Router} router - Express router
 */
export default function setupV1Routes(router) {
  // Mount route modules
  router.use('/users', userRoutes);
  router.use('/challenges', challengeRoutes);
  router.use('/evaluations', evaluationRoutes);
  // ... other routes
  
  // Version info endpoint
  router.get('/', (req, res) => {
    res.json({
      version: 'v1',
      status: 'active',
      links: {
        documentation: '/api/docs/v1',
        deprecation: null
      }
    });
  });
}
```

### 7. Update Swagger Configuration for Versioning

```javascript
// src/config/swagger.js (updated)

import { versionManager } from '../core/infra/http/api/versionManager.js';

export default {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Documentation',
      version: '1.0.0',
      description: 'API documentation with versioning support',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: '/api/v1',
        description: 'Version 1 (Current)'
      }
      // Add other versions here as they become available
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    // Add version information
    'x-versions': versionManager.getAllVersions().map(v => ({
      version: v.version,
      status: v.status,
      releaseDate: v.releaseDate?.toISOString(),
      deprecationDate: v.deprecationDate?.toISOString(),
      sunsetDate: v.sunsetDate?.toISOString(),
      isDefault: v.version === versionManager.getDefaultVersion()
    }))
  },
  apis: [
    // Version 1 API routes
    './src/routes/v1/**/*.js',
    // Include other version routes when they exist
    // './src/routes/v2/**/*.js'
  ]
};
```

### 8. Create Version Migration Guide Template

```markdown
# API Migration Guide: v1 to v2

## Overview

This guide helps you migrate your application from API v1 to v2. API v1 has been deprecated and will be sunset on [DATE].

## Key Changes

### Authentication

- **v1**: Basic authentication and API keys
- **v2**: OAuth 2.0 and JWT authentication only

### Resource Changes

#### Users Endpoint

| Change | v1 | v2 | Migration Notes |
|--------|----|----|----------------|
| Field Renamed | `userName` | `username` | Update client to use lowercase format |
| Field Removed | `userTitle` | - | This field is no longer available |
| New Field | - | `profileImageUrl` | Optional field for user avatars |
| Format Change | `birthDate`: MM/DD/YYYY | `birthDate`: ISO 8601 | Update date format |

#### Challenges Endpoint

| Change | v1 | v2 | Migration Notes |
|--------|----|----|----------------|
| Endpoint Moved | `/challenges` | `/learning/challenges` | Update API path |
| New Required Field | - | `category` | Must be from allowed categories list |

### Error Responses

- **v1**: Mixed error formats
- **v2**: Standardized error format:
  ```json
  {
    "error": {
      "code": "ERROR_CODE",
      "message": "Human readable message",
      "details": [...]
    }
  }
  ```

## Step-by-Step Migration

1. **Update Authentication**:
   - Migrate from API keys to OAuth 2.0
   - Update token handling code

2. **Update Endpoint URLs**:
   - Replace `/api/v1/` with `/api/v2/` in all requests
   - Update moved endpoints (see table above)

3. **Update Request Payloads**:
   - Rename fields as indicated
   - Add newly required fields
   - Update date formats to ISO 8601

4. **Update Response Handling**:
   - Adapt to new JSON structures
   - Update error handling for new format

5. **Test with v2 Sandbox**:
   - Use `/api/v2-sandbox` to test your changes
   - Validate all functionality before going live

## Testing Your Migration

We provide a compatibility test tool at `/api/tools/compatibility-check` that will:
- Analyze your current API usage
- Identify potential migration issues
- Recommend specific changes

## Support

If you encounter issues during migration, contact our support team:
- Email: api-support@example.com
- Developer Forum: https://developer.example.com/forum
- Office Hours: Every Tuesday, 2-4pm ET
```

## Testing Strategy

1. **Functional Tests**: Verify multiple API versions work correctly
2. **Integration Tests**: Test version headers and deprecation notices
3. **Performance Tests**: Measure overhead of version routing
4. **Documentation Tests**: Ensure Swagger accurately reflects versioning

## Benefits

The clear API versioning strategy provides several benefits:

1. **Reduced Risk**: Breaking changes can be introduced safely
2. **Improved Client Experience**: Clear migration paths and coexistence
3. **Better Documentation**: Version-specific information for developers
4. **Maintainable Evolution**: Framework for ongoing API development
5. **Business Flexibility**: Balance innovation with backwards compatibility

## Next Steps

After implementing this strategy, we should:

1. Review existing API endpoints for consistency with versioning standards
2. Create a complete API migrations guide for existing endpoints
3. Develop a maintenance plan for deprecated versions
4. Update client documentation with versioning best practices
5. Set up monitoring for version usage metrics
