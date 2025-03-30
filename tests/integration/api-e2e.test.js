import { jest } from '@jest/globals';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { container } from '../../src/config/container.js';

/**
 * End-to-End test suite for critical API flows
 */
describe('API Critical Flows E2E', () => {
    const config = container.resolve('config');
    const apiPrefix = config.api.prefix;
    let authToken;
    let userId;
    let challengeId;
    
    /**
     * Test user authentication flow (signup and login)
     */
    describe('Authentication Flow', () => {
        const testUser = {
            email: `test-user-${Date.now()}@example.com`,
            password: 'TestPassword123!',
            fullName: 'Integration Test User'
        };
        
        it('should allow new user signup', async () => {
            const response = await request(app)
                .post(`${apiPrefix}/auth/signup`)
                .send(testUser);
                
            expect(response.status).to.equal(201);
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toHaveProperty('user');
            expect(response.body.data).toHaveProperty('token');
            
            // Store the user ID for later tests
            userId = response.body.data.user.id;
            // Store the token for authenticated requests
            authToken = response.body.data.token;
        });
        
        it('should allow user login', async () => {
            const response = await request(app)
                .post(`${apiPrefix}/auth/login`)
                .send({
                    email: testUser.email,
                    password: testUser.password
                });
                
            expect(response.status).to.equal(200);
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toHaveProperty('user');
            expect(response.body.data).toHaveProperty('token');
            
            // Update the token for subsequent requests
            authToken = response.body.data.token;
        });
    });
    
    /**
     * Test user profile access
     */
    describe('User Profile', () => {
        it('should fetch authenticated user profile', async () => {
            const response = await request(app)
                .get(`${apiPrefix}/users/me`)
                .set('Authorization', `Bearer ${authToken}`);
                
            expect(response.status).to.equal(200);
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toHaveProperty('id');
            expect(response.body.data.id).to.equal(userId);
        });
    });
    
    /**
     * Test challenge flow
     */
    describe('Challenge Flow', () => {
        it('should generate a new challenge', async () => {
            const response = await request(app)
                .post(`${apiPrefix}/challenges/generate`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    focusArea: 'communication',
                    difficulty: 'beginner'
                });
                
            expect(response.status).to.equal(200);
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toHaveProperty('id');
            
            // Store the challenge ID for later tests
            challengeId = response.body.data.id;
        });
        
        it('should fetch challenge details', async () => {
            const response = await request(app)
                .get(`${apiPrefix}/challenges/${challengeId}`)
                .set('Authorization', `Bearer ${authToken}`);
                
            expect(response.status).to.equal(200);
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toHaveProperty('id');
            expect(response.body.data.id).to.equal(challengeId);
        });
        
        it('should allow submitting a solution to a challenge', async () => {
            const response = await request(app)
                .post(`${apiPrefix}/challenges/${challengeId}/submit`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    response: 'This is my solution to the challenge.'
                });
                
            expect(response.status).to.equal(200);
            expect(response.body).toHaveProperty('data');
            // The response may include an evaluation or other data
        });
    });
    
    /**
     * Test the health check endpoint
     * This should always be accessible and working
     */
    describe('Health Check', () => {
        it('should return health status', async () => {
            const response = await request(app)
                .get(`${apiPrefix}/health`);
                
            expect(response.status).to.equal(200);
            expect(response.body).toHaveProperty('status');
            expect(response.body.status).to.equal('success');
        });
    });
}); 