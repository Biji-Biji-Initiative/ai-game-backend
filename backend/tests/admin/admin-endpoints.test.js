/**
 * Tests for admin endpoints
 */
import request from 'supertest';
import { expect } from 'chai';
import sinon from 'sinon';
import app from '../../src/app.js';

describe('Admin Endpoints', () => {
  let adminToken;
  let regularToken;
  let sandbox;
  
  before(async () => {
    // Create a sandbox for test stubs
    sandbox = sinon.createSandbox();
    
    // Mock tokens for testing
    adminToken = 'admin-jwt-token';
    regularToken = 'regular-jwt-token';
    
    // Mock the authentication middleware to provide tokens
    const authMiddleware = app.get('container').get('authMiddleware');
    
    // Stub the authenticateUser middleware
    sandbox.stub(authMiddleware, 'authenticateUser').callsFake((req, res, next) => {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (token === adminToken) {
        req.user = { 
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'admin@example.com',
          role: 'admin'
        };
      } else if (token === regularToken) {
        req.user = {
          id: '123e4567-e89b-12d3-a456-426614174001',
          email: 'user@example.com',
          role: 'user'
        };
      } else {
        return res.status(401).json({ 
          success: false, 
          message: 'Unauthorized' 
        });
      }
      
      next();
    });
  });
  
  after(() => {
    // Restore the sandbox to its original state
    sandbox.restore();
  });
  
  describe('GET /admin/users', () => {
    it('should return 403 if user is not an admin', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${regularToken}`);
      
      expect(response.status).to.equal(403);
      expect(response.body.success).to.equal(false);
    });
    
    it('should return 200 and users list if user is admin', async () => {
      // Mock the adminService.getAllUsers method
      const adminService = app.get('container').get('adminService');
      sandbox.stub(adminService, 'getAllUsers').resolves([
        { id: '123', email: 'user1@example.com' },
        { id: '456', email: 'user2@example.com' }
      ]);
      
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).to.equal(200);
      expect(response.body.success).to.equal(true);
      expect(response.body.data).to.be.an('array');
      expect(response.body.data.length).to.equal(2);
    });
  });
  
  describe('GET /admin/analytics', () => {
    it('should return 403 if user is not an admin', async () => {
      const response = await request(app)
        .get('/api/admin/analytics')
        .set('Authorization', `Bearer ${regularToken}`);
      
      expect(response.status).to.equal(403);
      expect(response.body.success).to.equal(false);
    });
    
    it('should return 200 and analytics data if user is admin', async () => {
      // Mock the adminService.getAnalytics method
      const adminService = app.get('container').get('adminService');
      sandbox.stub(adminService, 'getAnalytics').resolves({
        totalUsers: 10,
        completedChallenges: 25,
        personalityProfiles: 8
      });
      
      const response = await request(app)
        .get('/api/admin/analytics')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).to.equal(200);
      expect(response.body.success).to.equal(true);
      expect(response.body.data).to.have.property('totalUsers');
      expect(response.body.data.totalUsers).to.equal(10);
    });
  });
  
  describe('PUT /admin/users/:userId', () => {
    it('should return 403 if user is not an admin', async () => {
      const response = await request(app)
        .put('/api/admin/users/123')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ first_name: 'Updated' });
      
      expect(response.status).to.equal(403);
      expect(response.body.success).to.equal(false);
    });
    
    it('should return 200 and updated user if user is admin', async () => {
      // Mock the adminService.updateUser method
      const adminService = app.get('container').get('adminService');
      sandbox.stub(adminService, 'updateUser').resolves({ 
        id: '123', 
        email: 'user1@example.com',
        first_name: 'Updated'
      });
      
      const response = await request(app)
        .put('/api/admin/users/123')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ first_name: 'Updated' });
      
      expect(response.status).to.equal(200);
      expect(response.body.success).to.equal(true);
      expect(response.body.data.first_name).to.equal('Updated');
    });
  });
  
  describe('DELETE /admin/users/:userId', () => {
    it('should return 403 if user is not an admin', async () => {
      const response = await request(app)
        .delete('/api/admin/users/123')
        .set('Authorization', `Bearer ${regularToken}`);
      
      expect(response.status).to.equal(403);
      expect(response.body.success).to.equal(false);
    });
    
    it('should return 200 if user is admin and deletion is successful', async () => {
      // Mock the adminService.deleteUser method
      const adminService = app.get('container').get('adminService');
      sandbox.stub(adminService, 'deleteUser').resolves();
      
      const response = await request(app)
        .delete('/api/admin/users/123')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).to.equal(200);
      expect(response.body.success).to.equal(true);
      expect(response.body.message).to.equal('User deleted successfully');
    });
  });
}); 