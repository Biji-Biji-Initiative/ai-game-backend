/**
 * Domain Test: User Lifecycle
 * 
 * Tests the core user domain operations using in-memory repositories.
 * This test focuses on the domain logic for user lifecycle management.
 */

const { expect } = require('chai');
const sinon = require('sinon');
const { v4: uuidv4 } = require('uuid');

// Import the User model or create a simplified version if not available
let User;
try {
  User = require('../../src/core/user/models/User');
} catch (error) {
  console.warn('Could not import User model, creating test version');
  User = class User {
    /**
     *
     */
    constructor(data = {}) {
      this.id = data.id || uuidv4();
      this.email = data.email;
      this.fullName = data.fullName;
      this.professionalTitle = data.professionalTitle || '';
      this.location = data.location || '';
      this.country = data.country || '';
      this.focusArea = data.focusArea || '';
      this.lastActive = data.lastActive || null;
      this.createdAt = data.createdAt || new Date().toISOString();
      this.updatedAt = data.updatedAt || new Date().toISOString();
      this.focusAreaThreadId = data.focusAreaThreadId || '';
      this.challengeThreadId = data.challengeThreadId || '';
      this.evaluationThreadId = data.evaluationThreadId || '';
      this.personalityThreadId = data.personalityThreadId || '';
      this.preferences = data.preferences || {
        theme: 'system',
        emailNotifications: true,
        pushNotifications: true,
        aiInteraction: {
          detailLevel: 'detailed',
          communicationStyle: 'casual',
          responseFormat: 'mixed'
        }
      };
    }
  };
}

describe('Domain: User Lifecycle', function() {
  // Test setup
  let userService;
  let mockUserRepository;
  let sandbox;
  
  beforeEach(function() {
    // Create a sandbox for this test
    sandbox = sinon.createSandbox();
    
    // Create an in-memory repository mock
    mockUserRepository = {
      users: new Map(),
      
      create: sandbox.stub().callsFake(async userData => {
        const user = new User({
          ...userData,
          id: uuidv4(),
          createdAt: new Date().toISOString()
        });
        mockUserRepository.users.set(user.id, user);
        return user;
      }),
      
      update: sandbox.stub().callsFake(async (id, updates) => {
        const user = mockUserRepository.users.get(id);
        if (!user) {
          throw new Error(`User with ID ${id} not found`);
        }
        
        // Create updated user with merged properties
        const updatedUser = new User({
          ...user,
          ...updates,
          updatedAt: new Date().toISOString()
        });
        
        mockUserRepository.users.set(id, updatedUser);
        return updatedUser;
      }),
      
      findById: sandbox.stub().callsFake(async id => {
        const user = mockUserRepository.users.get(id);
        if (!user) {
          return null;
        }
        return user;
      }),
      
      findByEmail: sandbox.stub().callsFake(async email => {
        for (const user of mockUserRepository.users.values()) {
          if (user.email === email) {
            return user;
          }
        }
        return null;
      }),
      
      delete: sandbox.stub().callsFake(async id => {
        if (!mockUserRepository.users.has(id)) {
          return false;
        }
        mockUserRepository.users.delete(id);
        return true;
      })
    };
    
    // Create user service
    userService = {
      createUser: async userData => {
        // Check if user with email already exists
        const existingUser = await mockUserRepository.findByEmail(userData.email);
        if (existingUser) {
          throw new Error(`User with email ${userData.email} already exists`);
        }
        
        return mockUserRepository.create(userData);
      },
      
      updateUser: async (id, updates) => {
        return mockUserRepository.update(id, updates);
      },
      
      setUserFocusArea: async (id, focusArea, threadId) => {
        return mockUserRepository.update(id, {
          focusArea,
          focusAreaThreadId: threadId
        });
      },
      
      getUserById: async id => {
        const user = await mockUserRepository.findById(id);
        if (!user) {
          throw new Error(`User with ID ${id} not found`);
        }
        return user;
      },
      
      deleteUser: async id => {
        return mockUserRepository.delete(id);
      }
    };
  });
  
  afterEach(function() {
    // Restore all stubs
    sandbox.restore();
  });
  
  it('should create a new user', async function() {
    // 1. ARRANGE
    const userData = {
      email: 'test-user@example.com',
      fullName: 'Test User'
    };
    
    // 2. ACT
    const user = await userService.createUser(userData);
    
    // 3. ASSERT
    expect(user).to.exist;
    expect(user.id).to.be.a('string');
    expect(user.email).to.equal(userData.email);
    expect(user.fullName).to.equal(userData.fullName);
    expect(user.createdAt).to.exist;
    
    // Verify repository method was called
    expect(mockUserRepository.create.calledOnce).to.be.true;
    expect(mockUserRepository.create.firstCall.args[0]).to.deep.equal(userData);
  });
  
  it('should update a user', async function() {
    // 1. ARRANGE
    const user = await userService.createUser({
      email: 'test-user@example.com',
      fullName: 'Test User'
    });
    
    const updates = {
      professionalTitle: 'Senior Software Engineer',
      location: 'Test City',
      preferences: {
        theme: 'dark',
        aiInteraction: {
          detailLevel: 'detailed'
        }
      }
    };
    
    // 2. ACT
    const updatedUser = await userService.updateUser(user.id, updates);
    
    // 3. ASSERT
    expect(updatedUser).to.exist;
    expect(updatedUser.id).to.equal(user.id);
    expect(updatedUser.email).to.equal(user.email);
    expect(updatedUser.professionalTitle).to.equal(updates.professionalTitle);
    expect(updatedUser.location).to.equal(updates.location);
    expect(updatedUser.preferences.theme).to.equal('dark');
    expect(updatedUser.preferences.aiInteraction.detailLevel).to.equal('detailed');
    
    // Other preferences should be preserved
    expect(updatedUser.preferences.emailNotifications).to.be.true;
    
    // Verify repository method was called
    expect(mockUserRepository.update.calledOnce).to.be.true;
    expect(mockUserRepository.update.firstCall.args[0]).to.equal(user.id);
    expect(mockUserRepository.update.firstCall.args[1]).to.deep.equal(updates);
  });
  
  it('should set a user focus area', async function() {
    // 1. ARRANGE
    const user = await userService.createUser({
      email: 'test-user@example.com',
      fullName: 'Test User'
    });
    
    const focusArea = 'Machine Learning';
    const threadId = 'thread_123';
    
    // 2. ACT
    const updatedUser = await userService.setUserFocusArea(user.id, focusArea, threadId);
    
    // 3. ASSERT
    expect(updatedUser).to.exist;
    expect(updatedUser.id).to.equal(user.id);
    expect(updatedUser.focusArea).to.equal(focusArea);
    expect(updatedUser.focusAreaThreadId).to.equal(threadId);
    
    // Verify repository method was called
    expect(mockUserRepository.update.calledOnce).to.be.true;
    expect(mockUserRepository.update.firstCall.args[0]).to.equal(user.id);
    expect(mockUserRepository.update.firstCall.args[1]).to.deep.equal({
      focusArea,
      focusAreaThreadId: threadId
    });
  });
  
  it('should retrieve a user by ID', async function() {
    // 1. ARRANGE
    const user = await userService.createUser({
      email: 'test-user@example.com',
      fullName: 'Test User'
    });
    
    // Reset repository calls for clean test
    mockUserRepository.findById.resetHistory();
    
    // 2. ACT
    const retrievedUser = await userService.getUserById(user.id);
    
    // 3. ASSERT
    expect(retrievedUser).to.exist;
    expect(retrievedUser.id).to.equal(user.id);
    expect(retrievedUser.email).to.equal(user.email);
    
    // Verify repository method was called
    expect(mockUserRepository.findById.calledOnce).to.be.true;
    expect(mockUserRepository.findById.firstCall.args[0]).to.equal(user.id);
  });
  
  it('should delete a user', async function() {
    // 1. ARRANGE
    const user = await userService.createUser({
      email: 'test-user@example.com',
      fullName: 'Test User'
    });
    
    // Reset repository calls for clean test
    mockUserRepository.delete.resetHistory();
    
    // 2. ACT
    const result = await userService.deleteUser(user.id);
    
    // 3. ASSERT
    expect(result).to.be.true;
    
    // Verify repository method was called
    expect(mockUserRepository.delete.calledOnce).to.be.true;
    expect(mockUserRepository.delete.firstCall.args[0]).to.equal(user.id);
    
    // Verify user is no longer retrievable
    const retrievedUser = await mockUserRepository.findById(user.id);
    expect(retrievedUser).to.be.null;
  });
  
  it('should throw error when creating user with existing email', async function() {
    // 1. ARRANGE
    const userData = {
      email: 'test-user@example.com',
      fullName: 'Test User'
    };
    
    await userService.createUser(userData);
    
    // 2 & 3. ACT & ASSERT
    try {
      await userService.createUser(userData);
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error.message).to.include('already exists');
    }
  });
  
  it('should throw error when getting non-existent user', async function() {
    // 1. ARRANGE
    const nonExistentId = 'non-existent-id';
    
    // 2 & 3. ACT & ASSERT
    try {
      await userService.getUserById(nonExistentId);
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error.message).to.include('not found');
    }
  });
}); 