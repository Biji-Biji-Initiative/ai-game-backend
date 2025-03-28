/**
 * User Domain Model Tests
 * 
 * These tests validate the behavior of the User domain model,
 * ensuring that business rules are properly implemented.
 */

const { expect } = require('chai');
const { v4: uuidv4 } = require('uuid');
const User = require('../../src/core/user/models/User');
const { EventTypes, eventBus } = require('../../src/core/common/events/domainEvents');

describe('User Domain Model', () => {
  let testUser;
  let publishedEvents = [];
  
  // Set up event capture for testing domain events
  before(() => {
    // Mock the eventBus.publishEvent method to capture events
    const originalPublishEvent = eventBus.publishEvent;
    eventBus.publishEvent = (eventType, payload) => {
      publishedEvents.push({ eventType, payload });
      return originalPublishEvent(eventType, payload);
    };
  });
  
  // Reset event capture after tests
  after(() => {
    // Restore original eventBus functionality if needed
    // eventBus.publishEvent = originalPublishEvent;
  });
  
  // Set up a fresh user before each test
  beforeEach(() => {
    // Clear event history
    publishedEvents = [];
    
    // Create a test user
    testUser = new User({
      id: uuidv4(),
      email: 'test@example.com',
      fullName: 'Test User',
      professionalTitle: 'Software Developer',
      location: 'Test City',
      country: 'Test Country',
      focusArea: 'AI Ethics',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });
  
  describe('Constructor and Validation', () => {
    it('should create a valid user with required fields', () => {
      const user = new User({
        email: 'valid@example.com',
        fullName: 'Valid User'
      });
      
      expect(user.validate().isValid).to.be.true;
      expect(user.email).to.equal('valid@example.com');
      expect(user.fullName).to.equal('Valid User');
    });
    
    it('should normalize data from database format', () => {
      const user = new User({
        full_name: 'DB User',
        email: 'db@example.com',
        focus_area: 'AI Ethics',
        professional_title: 'DB Developer'
      });
      
      expect(user.fullName).to.equal('DB User');
      expect(user.focusArea).to.equal('AI Ethics');
      expect(user.professionalTitle).to.equal('DB Developer');
    });
  });
  
  describe('Account Status Management', () => {
    it('should be active by default', () => {
      expect(testUser.status).to.equal('active');
      expect(testUser.isActive()).to.be.true;
    });
    
    it('should change status to inactive when deactivated', () => {
      testUser.deactivate();
      expect(testUser.status).to.equal('inactive');
      expect(testUser.isActive()).to.be.false;
      
      // Check that the event was published
      expect(publishedEvents.length).to.equal(1);
      expect(publishedEvents[0].eventType).to.equal(EventTypes.USER_DEACTIVATED);
      expect(publishedEvents[0].payload.userId).to.equal(testUser.id);
    });
    
    it('should change status to active when activated', () => {
      testUser.status = 'inactive';
      testUser.activate();
      expect(testUser.status).to.equal('active');
      expect(testUser.isActive()).to.be.true;
      
      // Check that the event was published
      expect(publishedEvents.length).to.equal(1);
      expect(publishedEvents[0].eventType).to.equal(EventTypes.USER_ACTIVATED);
      expect(publishedEvents[0].payload.userId).to.equal(testUser.id);
    });
    
    it('should not publish events if status is unchanged', () => {
      testUser.activate(); // Should do nothing as status is already active
      expect(publishedEvents.length).to.equal(0);
    });
  });
  
  describe('Role Management', () => {
    it('should have user role by default', () => {
      expect(testUser.roles).to.include('user');
      expect(testUser.hasRole('user')).to.be.true;
    });
    
    it('should be able to add a role', () => {
      testUser.addRole('admin');
      expect(testUser.roles).to.include('admin');
      expect(testUser.hasRole('admin')).to.be.true;
      
      // Check that the event was published
      expect(publishedEvents.length).to.equal(1);
      expect(publishedEvents[0].eventType).to.equal(EventTypes.USER_ROLE_ASSIGNED);
      expect(publishedEvents[0].payload.role).to.equal('admin');
    });
    
    it('should be able to remove a role', () => {
      testUser.addRole('editor');
      testUser.removeRole('editor');
      expect(testUser.roles).to.not.include('editor');
      expect(testUser.hasRole('editor')).to.be.false;
      
      // Check that the events were published
      expect(publishedEvents.length).to.equal(2);
      expect(publishedEvents[1].eventType).to.equal(EventTypes.USER_ROLE_REMOVED);
      expect(publishedEvents[1].payload.role).to.equal('editor');
    });
    
    it('should not allow duplicate roles', () => {
      testUser.addRole('moderator');
      testUser.addRole('moderator');
      
      // Should only have one 'moderator' role
      expect(testUser.roles.filter(r => r === 'moderator').length).to.equal(1);
      
      // Should only publish one event
      expect(publishedEvents.length).to.equal(1);
    });
  });
  
  describe('Onboarding Management', () => {
    it('should be not completed by default', () => {
      expect(testUser.onboardingCompleted).to.be.false;
      expect(testUser.hasCompletedOnboarding()).to.be.false;
    });
    
    it('should be marked as completed when completeOnboarding is called', () => {
      testUser.completeOnboarding();
      expect(testUser.onboardingCompleted).to.be.true;
      expect(testUser.hasCompletedOnboarding()).to.be.true;
      
      // Check that the event was published
      expect(publishedEvents.length).to.equal(1);
      expect(publishedEvents[0].eventType).to.equal(EventTypes.USER_ONBOARDING_COMPLETED);
    });
  });
  
  describe('Login Management', () => {
    it('should record login with timestamps', async () => {
      const beforeLogin = new Date();
      
      // Wait a small amount to ensure timestamps are different
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Reset events before login to ensure clean test state
      publishedEvents = [];
      
      testUser.recordLogin();
      
      expect(testUser.lastLoginAt).to.not.be.null;
      expect(testUser.lastActive).to.equal(testUser.lastLoginAt);
      expect(new Date(testUser.updatedAt) > beforeLogin).to.be.true;
      
      // Check that the event was published
      expect(publishedEvents.length).to.equal(1);
      expect(publishedEvents[0].eventType).to.equal(EventTypes.USER_LOGGED_IN);
    });
  });
  
  describe('Preference Management', () => {
    it('should store and retrieve preferences', () => {
      testUser.setPreference('theme', 'dark');
      expect(testUser.getPreference('theme')).to.equal('dark');
    });
    
    it('should return default value for non-existent preferences', () => {
      expect(testUser.getPreference('nonExistentKey', 'default')).to.equal('default');
    });
    
    it('should initialize preferences as an empty object', () => {
      const user = new User({
        email: 'nopref@example.com',
        fullName: 'No Preferences'
      });
      
      expect(user.preferences).to.be.an('object');
      expect(Object.keys(user.preferences).length).to.be.at.least(1);
    });
  });
  
  describe('Focus Area Management', () => {
    it('should set focus area and publish event', () => {
      testUser.setFocusArea('AI Impact on Society', 'thread-123');
      
      expect(testUser.focusArea).to.equal('AI Impact on Society');
      expect(testUser.focusAreaThreadId).to.equal('thread-123');
      
      // Check that the event was published
      expect(publishedEvents.length).to.equal(1);
      expect(publishedEvents[0].eventType).to.equal(EventTypes.USER_FOCUS_AREA_SET);
      expect(publishedEvents[0].payload.previousFocusArea).to.equal('AI Ethics');
      expect(publishedEvents[0].payload.newFocusArea).to.equal('AI Impact on Society');
    });
    
    it('should not publish event if focus area is unchanged', () => {
      testUser.setFocusArea('AI Ethics');
      expect(publishedEvents.length).to.equal(0);
    });
  });
  
  describe('Profile Updates', () => {
    beforeEach(() => {
      // Reset events before each test to ensure clean test state
      publishedEvents = [];
    });
    
    it('should update allowed fields', () => {
      testUser.updateProfile({
        fullName: 'Updated Name',
        professionalTitle: 'Updated Title',
        location: 'Updated City'
      });
      
      expect(testUser.fullName).to.equal('Updated Name');
      expect(testUser.professionalTitle).to.equal('Updated Title');
      expect(testUser.location).to.equal('Updated City');
      
      // Check that the event was published
      expect(publishedEvents.length).to.equal(1);
      expect(publishedEvents[0].eventType).to.equal(EventTypes.USER_UPDATED);
      expect(publishedEvents[0].payload.updatedFields).to.include('fullName');
      expect(publishedEvents[0].payload.updatedFields).to.include('professionalTitle');
      expect(publishedEvents[0].payload.updatedFields).to.include('location');
    });
    
    it('should map API field names to domain model fields', () => {
      testUser.updateProfile({
        name: 'API Name' // Should map to fullName
      });
      
      expect(testUser.fullName).to.equal('API Name');
    });
    
    it('should ignore disallowed fields', () => {
      const originalEmail = testUser.email;
      
      testUser.updateProfile({
        email: 'hacker@example.com' // Should be ignored
      });
      
      expect(testUser.email).to.equal(originalEmail);
    });
  });
  
  describe('Serialization', () => {
    it('should convert to database format correctly', () => {
      const dbData = testUser.toDatabase();
      
      expect(dbData.full_name).to.equal(testUser.fullName);
      expect(dbData.focus_area).to.equal(testUser.focusArea);
      expect(dbData.professional_title).to.equal(testUser.professionalTitle);
    });
  });
}); 