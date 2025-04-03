'use strict';

import { logger } from "#app/core/infra/logging/logger.js";

/**
 * API Versioning Middleware
 * 
 * Handles API versioning according to the configured strategy
 * Adds version information to the request and provides standardized
 * deprecation notices for older API versions
 */

/**
 * Creates middleware to handle API versioning
 * @param {Object} config - Application configuration with versioning details
 * @returns {Function} Express middleware function
 */
function createVersioningMiddleware(config) {
    const versionConfig = config.api.versioning;
    
    // Default version if none specified
    const defaultVersion = versionConfig.default || 'v1';
    
    // Current supported version
    const currentVersion = versionConfig.current || 'v1';
    
    // Versioning strategy
    const strategy = versionConfig.strategy || 'uri-path';
    
    // Deprecated versions (still supported but will be removed)
    const deprecatedVersions = versionConfig.deprecated || [];
    
    // Sunset versions (no longer supported)
    const sunsetVersions = versionConfig.sunset || [];
    
    // Format for deprecation header and message
    const deprecationFormat = versionConfig.deprecationFormat || {
        header: 'X-API-Deprecated',
        message: 'This API version is deprecated. Please use {replacement} instead.'
    };
    
    return (req, res, next) => {
        try {
            let apiVersion;
            
            // Extract version based on strategy
            switch(strategy) {
                case 'uri-path':
                    // Extract from URL path (/api/v1/resource)
                    const matches = req.path.match(/\/api\/v(\d+)\//);
                    apiVersion = matches ? `v${matches[1]}` : defaultVersion;
                    break;
                    
                case 'query-param':
                    // Extract from query parameter (?version=v1)
                    apiVersion = req.query.version || defaultVersion;
                    break;
                    
                case 'header':
                    // Extract from request header
                    apiVersion = req.get('X-API-Version') || defaultVersion;
                    break;
                    
                case 'content-type':
                    // Extract from content-type (application/vnd.company.v1+json)
                    const contentType = req.get('Content-Type');
                    const contentTypeMatches = contentType ? contentType.match(/application\/vnd\.company\.(v\d+)\+json/) : null;
                    apiVersion = contentTypeMatches ? contentTypeMatches[1] : defaultVersion;
                    break;
                    
                default:
                    apiVersion = defaultVersion;
            }
            
            // Add version to request object
            req.apiVersion = apiVersion;
            
            // Add X-API-Version header to response
            res.set('X-API-Version', currentVersion);
            
            // Handle deprecated versions
            if (deprecatedVersions.includes(apiVersion)) {
                // Add deprecation header and response header
                const message = deprecationFormat.message.replace('{replacement}', currentVersion);
                
                res.set(deprecationFormat.header, message);
                res.set('X-API-Deprecated-Version', apiVersion);
                res.set('X-API-Current-Version', currentVersion);
                
                // Log deprecation warning
                logger.warn(`Deprecated API version used: ${apiVersion}`, {
                    path: req.path,
                    method: req.method,
                    ip: req.ip,
                    userAgent: req.get('user-agent'),
                    version: apiVersion
                });
            }
            
            // Handle sunset versions (those no longer supported)
            if (sunsetVersions.includes(apiVersion)) {
                // Log attempt to use sunset version
                logger.warn(`Sunset API version attempted: ${apiVersion}`, {
                    path: req.path,
                    method: req.method,
                    ip: req.ip,
                    userAgent: req.get('user-agent'),
                    version: apiVersion
                });
                
                // Return 410 Gone with helpful message
                return res.status(410).json({
                    success: false,
                    message: `API version ${apiVersion} is no longer supported. Please use version ${currentVersion}.`,
                    error: {
                        code: 'API_VERSION_SUNSET',
                        message: `API version ${apiVersion} has been sunset`,
                        currentVersion: currentVersion
                    }
                });
            }
            
            next();
        } catch (error) {
            // If any error occurs, log it and continue with default version
            logger.error('Error in versioning middleware:', { 
                error: error.message, 
                stack: error.stack 
            });
            
            req.apiVersion = defaultVersion;
            next();
        }
    };
}

/**
 * Creates a deprecation notice middleware for a specific route
 * @param {string} version - The version being deprecated (e.g., 'v1')
 * @param {string} replacement - The version to use instead (e.g., 'v2')
 * @param {Date} sunset - Optional date when this will be removed
 * @returns {Function} Express middleware function
 */
function deprecateRoute(version, replacement, sunset) {
    return (req, res, next) => {
        // Add deprecation headers
        res.set('X-API-Deprecated-Route', 'true');
        res.set('X-API-Replacement-Route', replacement);
        
        if (sunset) {
            res.set('X-API-Sunset-Date', sunset.toISOString());
        }
        
        logger.warn(`Deprecated route accessed: ${req.path}`, {
            deprecatedVersion: version,
            replacement,
            path: req.path,
            method: req.method,
            sunset: sunset ? sunset.toISOString() : undefined
        });
        
        next();
    };
}

export { createVersioningMiddleware, deprecateRoute };
export default { createVersioningMiddleware, deprecateRoute }; 