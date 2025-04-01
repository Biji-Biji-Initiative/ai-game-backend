'use strict';

import express from 'express';
import { logger } from "#app/core/infra/logging/logger.js";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Creates API tester routes for debugging
 * @returns {express.Router} Router with API tester routes
 */
export default function createApiTesterRoutes() {
  const router = express.Router();

  // Health check endpoint for testing
  router.get('/health', (req, res) => {
    logger.info('API tester health check called');
    
    res.status(200).json({
      status: 'success',
      message: 'API tester is healthy',
      environment: process.env.NODE_ENV || 'unknown',
      timestamp: new Date().toISOString()
    });
  });

  // Echo endpoint for testing request/response
  router.post('/echo', (req, res) => {
    logger.info('API tester echo endpoint called');
    
    res.status(200).json({
      status: 'success',
      message: 'Echo response',
      request: {
        body: req.body,
        headers: req.headers,
        query: req.query,
        params: req.params
      },
      timestamp: new Date().toISOString()
    });
  });

  // Get recent logs with optional correlation ID filtering
  router.get('/logs', async (req, res) => {
    logger.info('API tester logs endpoint called');

    try {
      const { correlationId, level, limit = 100, search } = req.query;
      
      // Find the log files directory - usually in the root or in a logs folder
      const logsPaths = [
        path.join(process.cwd(), 'logs', 'combined.log'),
        path.join(process.cwd(), 'combined.log'),
        path.join(process.cwd(), 'logs', 'app.log'),
        path.join(process.cwd(), 'app.log'),
        path.join(process.cwd(), '..', 'logs', 'combined.log'),
        path.join(process.cwd(), 'server.log'),
        path.join(process.cwd(), 'logs', 'output.log'),
        path.join(process.cwd(), 'src', 'logs', 'combined.log')
      ];
      
      let logFilePath = null;
      for (const potentialPath of logsPaths) {
        if (fs.existsSync(potentialPath)) {
          logFilePath = potentialPath;
          break;
        }
      }
      
      if (!logFilePath) {
        return res.status(404).json({
          status: 'error',
          message: 'Log file not found',
          searchedPaths: logsPaths
        });
      }
      
      logger.info(`Reading logs from ${logFilePath}`);
      
      // Create a stream to read the log file
      const fileStream = fs.createReadStream(logFilePath);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });
      
      // Read logs into an array
      const logs = [];
      let lineCount = 0;
      let parsedCount = 0;
      
      try {
        for await (const line of rl) {
          lineCount++;
          
          // Skip empty lines
          if (!line.trim()) {
            continue;
          }
          
          // Parse the log entry (assuming JSON format)
          let logEntry;
          try {
            logEntry = JSON.parse(line);
            parsedCount++;
          } catch (err) {
            // For non-JSON lines, create a simple object
            logEntry = {
              level: "INFO",
              message: line,
              timestamp: new Date().toISOString(),
              meta: { rawLog: true }
            };
          }
          
          // Apply correlation ID filter if provided
          if (correlationId && 
              (!logEntry.meta?.correlationId || 
               !logEntry.meta.correlationId.includes(correlationId))) {
            continue;
          }
          
          // Apply level filter if provided
          if (level && logEntry.level !== level.toUpperCase()) {
            continue;
          }
          
          // Apply text search if provided
          if (search) {
            const logText = JSON.stringify(logEntry).toLowerCase();
            if (!logText.includes(search.toLowerCase())) {
              continue;
            }
          }
          
          logs.push(logEntry);
        }
      } catch (readError) {
        logger.error('Error reading log file', { error: readError });
        // Continue with partial results instead of failing completely
      }
      
      // Sort logs by timestamp (newest first) and limit the results
      try {
        logs.sort((a, b) => {
          const dateA = a.timestamp ? new Date(a.timestamp) : new Date(0);
          const dateB = b.timestamp ? new Date(b.timestamp) : new Date(0);
          return dateB - dateA;
        });
      } catch (sortError) {
        logger.error('Error sorting logs', { error: sortError });
        // Continue with unsorted logs
      }
      
      const limitedLogs = logs.slice(0, Math.min(parseInt(limit), 500)); // Cap at 500 max
      
      // Return the logs
      res.status(200).json({
        status: 'success',
        data: {
          logs: limitedLogs,
          count: limitedLogs.length,
          logFile: logFilePath,
          stats: {
            totalLinesRead: lineCount,
            parsedJsonLines: parsedCount,
            filteredLogCount: logs.length
          }
        }
      });
    } catch (error) {
      logger.error('Error retrieving logs', { error });
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve logs',
        error: error.message
      });
    }
  });

  // Get all registered routes formatted for the API tester UI
  router.get('/endpoints', (req, res) => {
    logger.info('API tester endpoints provider called');
    
    try {
      // Get the Express app instance
      const app = req.app;
      
      // Extract routes
      const extractedRoutes = [];
      
      function extractRoutes(layer, path = '') {
        if (layer.route) {
          // This is a route
          const methods = Object.keys(layer.route.methods)
            .filter(method => layer.route.methods[method])
            .map(method => method.toUpperCase());
          
          methods.forEach(method => {
            const routePath = path + layer.route.path;
            
            // Skip API tester routes itself to avoid cluttering the tester
            if (routePath.includes('/api-tester')) {
              return;
            }
            
            // Extract path parameters for documentation
            const paramNames = [];
            const pathRegex = /:([A-Za-z0-9_]+)/g;
            let match;
            while (match = pathRegex.exec(routePath)) {
              paramNames.push(match[1]);
            }
            
            // Create parameters array for the tester
            const parameters = paramNames.map(name => ({
              name,
              in: 'path',
              required: true,
              description: `Path parameter: ${name}`,
              schema: { type: 'string' }
            }));
            
            extractedRoutes.push({
              id: `${method}-${routePath}`,
              name: `${method} ${routePath}`,
              method,
              path: routePath,
              description: `${method} request to ${routePath}`,
              category: getCategoryFromPath(routePath),
              parameters,
              requiresAuth: routePath.includes('/auth') || 
                           routePath.includes('/users') || 
                           routePath.includes('/admin'),
              tags: routePath.split('/').filter(Boolean)
            });
          });
        } else if (layer.name === 'router' && layer.handle.stack) {
          // This is a router
          const routerPath = path + (layer.regexp.toString().includes('\\/?(?=\\/|$)') ? layer.regexp.toString().split('\\/?(?=\\/|$)')[0].replace(/^\^/, '').replace(/\\\\/, '/') : '');
          
          layer.handle.stack.forEach(stackItem => {
            extractRoutes(stackItem, routerPath);
          });
        }
      }
      
      // Get category from path
      function getCategoryFromPath(path) {
        const segments = path.split('/').filter(Boolean);
        if (segments.length === 0) return 'Root';
        
        const prefixSegment = segments[0];
        const nonVersionSegment = segments.find(seg => !seg.startsWith('v'));
        
        if (prefixSegment === 'api' && segments.length > 2) {
          return segments[2].charAt(0).toUpperCase() + segments[2].slice(1);
        } else if (nonVersionSegment) {
          return nonVersionSegment.charAt(0).toUpperCase() + nonVersionSegment.slice(1);
        }
        
        return segments[0].charAt(0).toUpperCase() + segments[0].slice(1);
      }
      
      // Loop through all middleware to find routes
      app._router.stack.forEach(layer => {
        extractRoutes(layer);
      });
      
      // Group by category for the tester's preferred format
      const endpointsByCategory = {};
      extractedRoutes.forEach(route => {
        if (!endpointsByCategory[route.category]) {
          endpointsByCategory[route.category] = [];
        }
        endpointsByCategory[route.category].push(route);
      });
      
      // Return both formats to support multiple endpoint formats
      res.status(200).json({
        // Format 1: Plain endpoints array
        endpoints: extractedRoutes,
        
        // Format 2: Category-grouped object for the original tester format
        ...endpointsByCategory
      });
    } catch (error) {
      logger.error('Error generating endpoints for API tester', { error });
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to extract endpoints',
        error: error.message
      });
    }
  });

  // Get all registered routes (original implementation)
  router.get('/routes', (req, res) => {
    logger.info('API tester routes endpoint called');
    
    try {
      // Get the Express app instance
      const app = req.app;
      
      // Extract routes
      const routes = [];
      
      function extractRoutes(layer, path = '') {
        if (layer.route) {
          // This is a route
          const methods = Object.keys(layer.route.methods)
            .filter(method => layer.route.methods[method])
            .map(method => method.toUpperCase());
          
          routes.push({
            path: path + layer.route.path,
            methods
          });
        } else if (layer.name === 'router' && layer.handle.stack) {
          // This is a router
          const routerPath = path + (layer.regexp.toString().includes('\\/?(?=\\/|$)') ? layer.regexp.toString().split('\\/?(?=\\/|$)')[0].replace(/^\^/, '').replace(/\\\\/, '/') : '');
          
          layer.handle.stack.forEach(stackItem => {
            extractRoutes(stackItem, routerPath);
          });
        }
      }
      
      // Loop through all middleware to find routes
      app._router.stack.forEach(layer => {
        extractRoutes(layer);
      });
      
      res.status(200).json({
        status: 'success',
        data: {
          routes: routes.sort((a, b) => a.path.localeCompare(b.path))
        }
      });
    } catch (error) {
      logger.error('Error fetching routes', { error });
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to extract routes',
        error: error.message
      });
    }
  });

  // Environment info endpoint
  router.get('/env', (req, res) => {
    logger.info('API tester environment endpoint called');
    
    // Only return non-sensitive environment variables
    const safeEnv = {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      BASE_URL: process.env.BASE_URL,
      // Add any other non-sensitive variables you want to expose
    };
    
    res.status(200).json({
      status: 'success',
      data: {
        environment: safeEnv,
        versions: {
          node: process.version,
          dependencies: process.versions
        },
        timestamp: new Date().toISOString()
      }
    });
  });

  return router;
} 