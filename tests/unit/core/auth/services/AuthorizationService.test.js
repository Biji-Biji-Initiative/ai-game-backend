import { expect } from 'chai';
import sinon from 'sinon';
import AuthorizationService from "@/core/auth/services/AuthorizationService.js";
import { UserAuthorizationError } from "@/core/user/errors/UserErrors.js";

describe('AuthorizationService', () => {
  let authService;
  let loggerStub;
  
  beforeEach(() => {
    // Create a stub for the logger
    loggerStub = {
      debug: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub()
    };
    
    // Create a new instance for each test with the stubbed logger
    authService = new AuthorizationService();
    // Replace the logger with our stub
    authService.logger = loggerStub;
  });
  
  afterEach(() => {
    // Clean up stubs
    sinon.restore();
  });
  
  describe('verifyResourceAccess', () => {
    it('should allow access to own resources', () => {
      // Arrange
      const userId = 'user123';
      const resourceOwnerId = 'user123';
      const resourceType = 'challenge';
      const action = 'read';
      
      // Act/Assert
      expect(() => 
        authService.verifyResourceAccess(userId, resourceOwnerId, resourceType, action)
      ).to.not.throw();
      
      // Assert logger was called
      expect(loggerStub.debug.calledOnce).to.be.true;
      expect(loggerStub.debug.firstCall.args[0]).to.equal('Self-resource access granted');
    });
    
    it('should allow admin access to any resource', () => {
      // Arrange
      const userId = 'admin123';
      const resourceOwnerId = 'user123';
      const resourceType = 'challenge';
      const action = 'delete';
      const options = { isAdmin: true };
      
      // Act/Assert
      expect(() => 
        authService.verifyResourceAccess(userId, resourceOwnerId, resourceType, action, options)
      ).to.not.throw();
      
      // Assert logger was called
      expect(loggerStub.debug.calledOnce).to.be.true;
      expect(loggerStub.debug.firstCall.args[0]).to.equal('Admin access granted');
    });
    
    it('should deny access to resources owned by others', () => {
      // Arrange
      const userId = 'user123';
      const resourceOwnerId = 'user456';
      const resourceType = 'challenge';
      const action = 'update';
      
      // Act/Assert
      expect(() => 
        authService.verifyResourceAccess(userId, resourceOwnerId, resourceType, action)
      ).to.throw(UserAuthorizationError);
      
      // Assert logger was called
      expect(loggerStub.warn.calledOnce).to.be.true;
      expect(loggerStub.warn.firstCall.args[0]).to.equal('Access denied');
    });
    
    it('should allow access to public resources', () => {
      // Arrange
      const userId = 'user123';
      const resourceOwnerId = 'user456';
      const resourceType = 'challenge';
      const action = 'read';
      const options = { isPublic: true };
      
      // Act/Assert
      expect(() => 
        authService.verifyResourceAccess(userId, resourceOwnerId, resourceType, action, options)
      ).to.not.throw();
      
      // Assert logger was called
      expect(loggerStub.debug.calledOnce).to.be.true;
      expect(loggerStub.debug.firstCall.args[0]).to.equal('Public resource access granted');
    });
    
    it('should allow special access based on resource type rules - collaborative challenges', () => {
      // Arrange
      const userId = 'user123';
      const resourceOwnerId = 'user456';
      const resourceType = 'challenge';
      const action = 'read';
      const options = { isCollaborative: true };
      
      // Act/Assert
      expect(() => 
        authService.verifyResourceAccess(userId, resourceOwnerId, resourceType, action, options)
      ).to.not.throw();
      
      // Assert logger was called
      expect(loggerStub.debug.calledOnce).to.be.true;
      expect(loggerStub.debug.firstCall.args[0]).to.equal('Collaborative challenge access granted');
    });
    
    it('should require a userId for authorization', () => {
      // Arrange
      const userId = null;
      const resourceOwnerId = 'user456';
      const resourceType = 'challenge';
      const action = 'read';
      
      // Act/Assert
      expect(() => 
        authService.verifyResourceAccess(userId, resourceOwnerId, resourceType, action)
      ).to.throw(UserAuthorizationError, 'User ID is required for authorization');
    });
  });
  
  describe('verifyPermission', () => {
    it('should allow access with the required permission', () => {
      // Arrange
      const user = {
        id: 'user123',
        permissions: ['read:challenges', 'update:profile']
      };
      
      // Act/Assert
      expect(() => 
        authService.verifyPermission(user, 'read:challenges')
      ).to.not.throw();
    });
    
    it('should deny access without the required permission', () => {
      // Arrange
      const user = {
        id: 'user123',
        permissions: ['read:challenges']
      };
      
      // Act/Assert
      expect(() => 
        authService.verifyPermission(user, 'delete:challenges')
      ).to.throw(UserAuthorizationError);
      
      // Assert logger was called
      expect(loggerStub.warn.calledOnce).to.be.true;
      expect(loggerStub.warn.firstCall.args[0]).to.equal('Permission denied');
    });
    
    it('should allow admin users any permission', () => {
      // Arrange
      const user = {
        id: 'admin123',
        isAdmin: true,
        permissions: []
      };
      
      // Act/Assert
      expect(() => 
        authService.verifyPermission(user, 'any:permission')
      ).to.not.throw();
    });
    
    it('should require a user object for permission check', () => {
      // Arrange
      const user = null;
      
      // Act/Assert
      expect(() => 
        authService.verifyPermission(user, 'read:challenges')
      ).to.throw(UserAuthorizationError, 'User is required for permission check');
    });
  });
}); 