import { expect } from 'chai';
import sinon from 'sinon';
import { 
  authorizeResource, 
  authorizeUserSpecificResource, 
  requirePermission 
} from "@/core/infra/http/middleware/resourceAuth.js";
import AuthorizationService from "@/core/auth/services/AuthorizationService.js";
import { UserAuthorizationError } from "@/core/user/errors/UserErrors.js";

describe('Resource Authorization Middleware', () => {
  // Create stubs and mocks
  let req, res, next, authServiceStub;
  
  beforeEach(() => {
    // Setup request/response/next mocks
    req = {
      user: {
        id: 'user123',
        isAdmin: false
      },
      params: {}
    };
    
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };
    
    next = sinon.stub();
    
    // Create stub for AuthorizationService methods
    authServiceStub = sinon.stub(AuthorizationService.prototype);
  });
  
  afterEach(() => {
    sinon.restore();
  });
  
  describe('authorizeResource', () => {
    it('should call next when user is authorized to access their own resource', async () => {
      // Arrange
      const resourceId = 'resource123';
      req.params.id = resourceId;
      
      const getResourceOwner = sinon.stub().resolves('user123'); // Returns user's own ID
      
      const middleware = authorizeResource({
        resourceType: 'challenge',
        paramName: 'id',
        action: 'read',
        getResourceOwner
      });
      
      // Act
      await middleware(req, res, next);
      
      // Assert
      expect(getResourceOwner.calledOnce).to.be.true;
      expect(getResourceOwner.calledWith(resourceId, req)).to.be.true;
      expect(next.calledOnce).to.be.true;
      expect(next.args[0]).to.be.empty; // No error passed to next
    });
    
    it('should pass error to next when user is not authorized', async () => {
      // Arrange
      const resourceId = 'resource123';
      req.params.id = resourceId;
      
      const getResourceOwner = sinon.stub().resolves('user456'); // Different owner
      
      // Mock the authorization service to throw
      const error = new UserAuthorizationError('Not authorized');
      AuthorizationService.prototype.verifyResourceAccess = sinon.stub().throws(error);
      
      const middleware = authorizeResource({
        resourceType: 'challenge',
        paramName: 'id',
        action: 'update',
        getResourceOwner
      });
      
      // Act
      await middleware(req, res, next);
      
      // Assert
      expect(getResourceOwner.calledOnce).to.be.true;
      expect(next.calledOnce).to.be.true;
      expect(next.firstCall.args[0]).to.be.instanceOf(UserAuthorizationError);
    });
    
    it('should pass error to next when resource ID is not provided', async () => {
      // Arrange - missing ID parameter
      const middleware = authorizeResource({
        resourceType: 'challenge',
        paramName: 'id',
        action: 'read',
        getResourceOwner: sinon.stub()
      });
      
      // Act
      await middleware(req, res, next);
      
      // Assert
      expect(next.calledOnce).to.be.true;
      expect(next.firstCall.args[0]).to.be.instanceOf(UserAuthorizationError);
      expect(next.firstCall.args[0].message).to.include('not provided');
    });
    
    it('should pass error to next when authentication is missing', async () => {
      // Arrange - no user object
      req.user = null;
      
      const middleware = authorizeResource({
        resourceType: 'challenge',
        paramName: 'id',
        action: 'read'
      });
      
      // Act
      await middleware(req, res, next);
      
      // Assert
      expect(next.calledOnce).to.be.true;
      expect(next.firstCall.args[0]).to.be.instanceOf(UserAuthorizationError);
      expect(next.firstCall.args[0].message).to.include('Authentication required');
    });
    
    it('should pass error to next when getResourceOwner throws', async () => {
      // Arrange
      const resourceId = 'resource123';
      req.params.id = resourceId;
      
      const error = new Error('Database error');
      const getResourceOwner = sinon.stub().rejects(error);
      
      const middleware = authorizeResource({
        resourceType: 'challenge',
        paramName: 'id',
        action: 'read',
        getResourceOwner
      });
      
      // Act
      await middleware(req, res, next);
      
      // Assert
      expect(getResourceOwner.calledOnce).to.be.true;
      expect(next.calledOnce).to.be.true;
      expect(next.firstCall.args[0]).to.equal(error);
    });
  });
  
  describe('authorizeUserSpecificResource', () => {
    it('should call next when user is accessing their own resource', () => {
      // Arrange
      req.params.userId = 'user123'; // Same as req.user.id
      const middleware = authorizeUserSpecificResource('userId');
      
      // Act
      middleware(req, res, next);
      
      // Assert
      expect(next.calledOnce).to.be.true;
      expect(next.args[0]).to.be.empty; // No error passed to next
    });
    
    it('should replace "me" parameter with user ID and call next', () => {
      // Arrange
      req.params.userId = 'me';
      const middleware = authorizeUserSpecificResource('userId');
      
      // Act
      middleware(req, res, next);
      
      // Assert
      expect(req.params.userId).to.equal('user123'); // Replaced with actual user ID
      expect(next.calledOnce).to.be.true;
      expect(next.args[0]).to.be.empty; // No error passed to next
    });
    
    it('should pass error to next when user is accessing another user resource', () => {
      // Arrange
      req.params.userId = 'user456'; // Different from req.user.id
      const middleware = authorizeUserSpecificResource('userId');
      
      // Act
      middleware(req, res, next);
      
      // Assert
      expect(next.calledOnce).to.be.true;
      expect(next.firstCall.args[0]).to.be.instanceOf(UserAuthorizationError);
    });
    
    it('should allow admin users to access any user resource', () => {
      // Arrange
      req.params.userId = 'user456'; // Different from req.user.id
      req.user.isAdmin = true;
      const middleware = authorizeUserSpecificResource('userId');
      
      // Act
      middleware(req, res, next);
      
      // Assert
      expect(next.calledOnce).to.be.true;
      expect(next.args[0]).to.be.empty; // No error passed to next
    });
    
    it('should pass error to next when user is not authenticated', () => {
      // Arrange - no user object
      req.user = null;
      const middleware = authorizeUserSpecificResource('userId');
      
      // Act
      middleware(req, res, next);
      
      // Assert
      expect(next.calledOnce).to.be.true;
      expect(next.firstCall.args[0]).to.be.instanceOf(UserAuthorizationError);
      expect(next.firstCall.args[0].message).to.include('Authentication required');
    });
  });
  
  describe('requirePermission', () => {
    it('should call next when user has the required permission', () => {
      // Arrange
      AuthorizationService.prototype.verifyPermission = sinon.stub().returns(true);
      const middleware = requirePermission('read:challenges');
      
      // Act
      middleware(req, res, next);
      
      // Assert
      expect(next.calledOnce).to.be.true;
      expect(next.args[0]).to.be.empty; // No error passed to next
    });
    
    it('should pass error to next when user does not have the required permission', () => {
      // Arrange
      const error = new UserAuthorizationError('Not authorized');
      AuthorizationService.prototype.verifyPermission = sinon.stub().throws(error);
      const middleware = requirePermission('admin:access');
      
      // Act
      middleware(req, res, next);
      
      // Assert
      expect(next.calledOnce).to.be.true;
      expect(next.firstCall.args[0]).to.equal(error);
    });
    
    it('should pass error to next when user is not authenticated', () => {
      // Arrange - no user object
      req.user = null;
      const middleware = requirePermission('read:challenges');
      
      // Act
      middleware(req, res, next);
      
      // Assert
      expect(next.calledOnce).to.be.true;
      expect(next.firstCall.args[0]).to.be.instanceOf(UserAuthorizationError);
      expect(next.firstCall.args[0].message).to.include('Authentication required');
    });
  });
}); 