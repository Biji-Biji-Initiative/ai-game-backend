'use strict';

import express from 'express';
import { logger } from "../../../infra/logging/logger.js";

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

  // Get all registered routes
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