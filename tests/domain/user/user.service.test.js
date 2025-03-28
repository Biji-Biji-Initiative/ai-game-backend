/**
 * User Service Unit Tests
 * 
 * Tests user domain logic in isolation 
 */
const { expect } = require('chai');
const sinon = require('sinon');
const UserService = require('../../src/core/user/services/UserService');
const { UserNotFoundError } = require('../../src/core/user/errors/UserErrors');

describe('User Service', () => {
  let userService;
  let userRepositoryMock;
  let eventBusMock;
  
  beforeEach(() => {
    // Create mock dependencies
    userRepositoryMock = {
      findByEmail: sinon.stub(),
      findById: sinon.stub(),
      create: sinon.stub(),
      update: sinon.stub(),
      delete: sinon.stub(),
      findAll: sinon.stub()
    };
    
    eventBusMock = {
      publish: sinon.stub()
    };
    
    // Create service instance with mocked dependencies
    userService = new UserService({
      userRepository: userRepositoryMock,
      eventBus: eventBusMock
    });
  });
  
  afterEach(() => {
    // Clean up all stubs
    sinon.restore();
  });
  
  describe('getUserProfile', () => {
    it('should return user profile when valid email is provided', async () => {
      // Arrange
      const userEmail = 'test@example.com';
      const mockUser = {
        id: '123',
        email: userEmail,
        name: 'Test User',
        isAdmin: false
      };
      
      userRepositoryMock.findByEmail.resolves(mockUser);
      
      // Act
      const result = await userService.getUserProfile(userEmail);
      
      // Assert
      expect(result).to.deep.equal(mockUser);
      expect(userRepositoryMock.findByEmail.calledOnceWith(userEmail)).to.be.true;
    });
    
    it('should throw UserNotFoundError when user is not found', async () => {
      // Arrange
      const userEmail = 'nonexistent@example.com';
      userRepositoryMock.findByEmail.resolves(null);
      
      // Act & Assert
      try {
        await userService.getUserProfile(userEmail);
        expect.fail('Expected error was not thrown');
      } catch (error) {
        expect(error).to.be.instanceOf(UserNotFoundError);
        expect(error.message).to.include(userEmail);
      }
      
      expect(userRepositoryMock.findByEmail.calledOnceWith(userEmail)).to.be.true;
    });
  });
  
  describe('updateUserProfile', () => {
    it('should update and return user when valid data is provided', async () => {
      // Arrange
      const userEmail = 'test@example.com';
      const updateData = { name: 'Updated Name' };
      const mockUpdatedUser = {
        id: '123',
        email: userEmail,
        name: 'Updated Name',
        isAdmin: false
      };
      
      userRepositoryMock.update.resolves(mockUpdatedUser);
      
      // Act
      const result = await userService.updateUserProfile(userEmail, updateData);
      
      // Assert
      expect(result).to.deep.equal(mockUpdatedUser);
      expect(userRepositoryMock.update.calledOnceWith(userEmail, updateData)).to.be.true;
    });
  });
  
  // Additional test cases would be added for remaining service methods
}); 