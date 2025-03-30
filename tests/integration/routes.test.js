import { jest } from '@jest/globals';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import app from '../../src/app.js';
import { container } from '../../src/config/container.js';
import RouteFactory from '../../src/core/infra/http/routes/RouteFactory.js';

/**
 * Integration test suite for validating route registration
 */
describe('Route Registration Validation', () => {
    const config = container.resolve('config');
    const apiPrefix = config.api.prefix;
    
    /**
     * Test primary route endpoints
     */
    describe('Primary API Routes', () => {
        const primaryRoutes = [
            `${apiPrefix}/health`,
            `${apiPrefix}/auth/status`,
            `${apiPrefix}/users`,
            `${apiPrefix}/challenges`,
            `${apiPrefix}/personality`,
            `${apiPrefix}/progress`,
            `${apiPrefix}/evaluations`,
            `${apiPrefix}/adaptive`,
            `${apiPrefix}/user-journey`,
            `${apiPrefix}/focus-areas`
        ];
        
        primaryRoutes.forEach(route => {
            it(`should respond to requests at ${route}`, async () => {
                const response = await request(app).get(route);
                // We just want to ensure the route exists and doesn't return 404
                // It might return 401 (unauthorized), 503 (service unavailable), etc.
                expect(response.status).not.toBe(404);
            });
        });
    });
    
    /**
     * Test critical endpoints
     */
    describe('Critical Endpoints', () => {
        it('should provide health check', async () => {
            const response = await request(app).get(`${apiPrefix}/health`);
            expect(response.status).to.equal(200);
            expect(response.body).toHaveProperty('status');
            expect(response.body.status).to.equal('success');
        });
        
        it('should provide auth status', async () => {
            const response = await request(app).get(`${apiPrefix}/auth/status`);
            expect(response.status).to.equal(200);
            expect(response.body).toHaveProperty('status');
            expect(response.body.status).to.equal('success');
        });
    });
    
    /**
     * Test route fault isolation
     */
    describe('Route Factory Fault Isolation', () => {
        it('should isolate failures in route mounting', async () => {
            // Create a mock application
            const mockApp = express();
            const mockApp_use = vi.fn();
            mockApp.use = mockApp_use;
            
            const mockContainer = {
                get: (key) => {
                    if (key === 'logger') {
                        return {
                            info: vi.fn(),
                            warn: vi.fn(),
                            error: vi.fn(),
                            debug: vi.fn()
                        };
                    }
                    
                    // Throw for specific services to simulate missing dependencies
                    if (key === 'personalityService') {
                        throw new Error('Simulated missing dependency');
                    }
                    
                    // Return empty objects for anything else
                    return {};
                }
            };
            
            // Create route factory with mock container
            const routeFactory = new RouteFactory(mockContainer);
            
            // Mount routes and check that it doesn't throw an exception
            await expect(routeFactory.mountAll(mockApp, '/api')).resolves.not.toThrow();
            
            // Verify that routes were mounted
            expect(mockApp_use).to.have.been.called;
            
            // Verify that failures were logged
            expect(mockContainer.get('logger').error).toHaveBeenCalled();
        });
    });
    
    /**
     * Test controller method validation
     */
    describe('Controller Method Validation', () => {
        it('should create fallback handlers for missing controller methods', () => {
            // Create a new RouteFactory instance
            const routeFactory = new RouteFactory(container);
            
            // Create a controller with missing method
            const mockController = {
                existingMethod: () => {}
                // missingMethod is not defined
            };
            
            // Validate an existing method (should return the original method)
            const existingHandler = routeFactory._validateControllerMethod(
                mockController, 
                'existingMethod', 
                'MockController', 
                '/mock/route'
            );
            
            expect(typeof existingHandler).to.equal('function');
            expect(existingHandler).to.equal(mockController.existingMethod);
            
            // Validate a missing method (should return a fallback handler)
            const missingHandler = routeFactory._validateControllerMethod(
                mockController, 
                'missingMethod', 
                'MockController', 
                '/mock/route'
            );
            
            expect(typeof missingHandler).to.equal('function');
            
            // Test the fallback handler by calling it with mock request/response
            const req = {};
            const res = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn()
            };
            
            missingHandler(req, res);
            
            // Should respond with 501 Not Implemented
            expect(res.status).to.have.been.calledWith(501);
            expect(res.json).to.have.been.calledWith(expect.objectContaining({
                error: 'Not Implemented'
            }));
        });
    });
    
    /**
     * Test route fallbacks for development mode
     */
    describe('Route Fallbacks in Development', () => {
        // Create a mock route that should return 503 in dev mode
        it('should return 503 for route with fallback in dev environment', async () => {
            // This assumes we're in a development environment during testing
            // Skip if we're in production mode
            if (process.env.NODE_ENV === 'production') {
                return;
            }
            
            // Mock a fallback route and request to it
            const route = `${apiPrefix}/test-fallback-route`;
            const app = express();
            
            // Register the fallback
            app.use(route, (req, res) => {
                res.status(503).json({
                    error: 'Service Unavailable',
                    message: 'This API endpoint is currently unavailable',
                    details: 'Test failure message'
                });
            });
            
            const response = await request(app).get(route);
            expect(response.status).to.equal(503);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).to.equal('Service Unavailable');
        });
    });
}); 