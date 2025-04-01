import { expect } from 'chai';
import sinon from 'sinon';
import UserPreferencesManager from "@/core/user/services/UserPreferencesManager.js";
import { UserNotFoundError, UserValidationError } from "@/core/user/errors/UserErrors.js";

describe('UserPreferencesManager', () => {
  let userPreferencesManager;
  let mockUserService;
  let mockLogger;
  let testUser;
  
  beforeEach(() => {
    mockUserService = {
      getUserById: sinon.stub(),
      updateUser: sinon.stub()
    };
    
    mockLogger = {
      debug: sinon.stub(),
      info: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub()
    };
    
    testUser = {
      id: '123',
      email: 'test@example.com',
      preferences: {
        ui: {
          theme: 'dark',
          fontSize: 'medium'
        },
        notifications: {
          emailNotifications: true
        }
      }
    };
    
    userPreferencesManager = new UserPreferencesManager({
      userService: mockUserService,
      logger: mockLogger
    });
  });
  
  afterEach(() => {
    sinon.restore();
  });
  
  describe('getUserPreferences', () => {
    it('should return user preferences merged with defaults', async () => {
      mockUserService.getUserById.resolves(testUser);
      
      const result = await userPreferencesManager.getUserPreferences('123');
      
      expect(mockUserService.getUserById.calledWith('123')).to.be.true;
      expect(result).to.have.property('ui');
      expect(result).to.have.property('notifications');
      expect(result).to.have.property('aiInteraction');
      expect(result).to.have.property('learning');
      expect(result.ui.theme).to.equal('dark');
      expect(result.ui.fontSize).to.equal('medium');
      expect(result.notifications.emailNotifications).to.equal(true);
    });
    
    it('should throw UserNotFoundError if user does not exist', async () => {
      mockUserService.getUserById.resolves(null);
      
      try {
        await userPreferencesManager.getUserPreferences('123');
        expect.fail('Expected error was not thrown');
      } catch (error) {
        expect(error).to.be.instanceOf(UserNotFoundError);
      }
    });
  });
  
  describe('getUserPreferencesByCategory', () => {
    it('should return preferences for a specific category', async () => {
      mockUserService.getUserById.resolves(testUser);
      
      const result = await userPreferencesManager.getUserPreferencesByCategory('123', 'ui');
      
      expect(mockUserService.getUserById.calledWith('123')).to.be.true;
      expect(result.theme).to.equal('dark');
      expect(result.fontSize).to.equal('medium');
      expect(result.compactView).to.be.false; // Default value
    });
    
    it('should throw UserValidationError for invalid category', async () => {
      try {
        await userPreferencesManager.getUserPreferencesByCategory('123', 'invalid');
        expect.fail('Expected error was not thrown');
      } catch (error) {
        expect(error).to.be.instanceOf(UserValidationError);
      }
    });
  });
  
  describe('updateUserPreferences', () => {
    it('should update all user preferences', async () => {
      mockUserService.getUserById.resolves(testUser);
      mockUserService.updateUser.resolves({
        ...testUser,
        preferences: {
          ui: { theme: 'light', fontSize: 'large' },
          notifications: { emailNotifications: false }
        }
      });
      
      const newPreferences = {
        ui: { theme: 'light', fontSize: 'large' },
        notifications: { emailNotifications: false }
      };
      
      const result = await userPreferencesManager.updateUserPreferences('123', newPreferences);
      
      expect(mockUserService.getUserById.calledWith('123')).to.be.true;
      expect(mockUserService.updateUser.calledOnce).to.be.true;
      expect(result.ui.theme).to.equal('light');
      expect(result.ui.fontSize).to.equal('large');
      expect(result.notifications.emailNotifications).to.be.false;
    });
  });
  
  describe('updateUserPreferencesByCategory', () => {
    it('should update preferences for a specific category', async () => {
      mockUserService.getUserById.resolves(testUser);
      mockUserService.updateUser.resolves({
        ...testUser,
        preferences: {
          ...testUser.preferences,
          ui: { theme: 'light', fontSize: 'large', compactView: true }
        }
      });
      
      const categoryPrefs = { theme: 'light', fontSize: 'large', compactView: true };
      
      const result = await userPreferencesManager.updateUserPreferencesByCategory('123', 'ui', categoryPrefs);
      
      expect(mockUserService.getUserById.calledWith('123')).to.be.true;
      expect(mockUserService.updateUser.calledOnce).to.be.true;
      expect(result.theme).to.equal('light');
      expect(result.fontSize).to.equal('large');
      expect(result.compactView).to.be.true;
    });
  });
  
  describe('setUserPreference', () => {
    it('should set a single preference value', async () => {
      mockUserService.getUserById.resolves(testUser);
      mockUserService.updateUser.resolves({
        ...testUser,
        preferences: {
          ...testUser.preferences,
          ui: { ...testUser.preferences.ui, theme: 'light' }
        }
      });
      
      const result = await userPreferencesManager.setUserPreference('123', 'ui.theme', 'light');
      
      expect(mockUserService.getUserById.calledWith('123')).to.be.true;
      expect(mockUserService.updateUser.calledOnce).to.be.true;
      expect(result.ui.theme).to.equal('light');
    });
    
    it('should throw UserValidationError for invalid preference key format', async () => {
      mockUserService.getUserById.resolves(testUser);
      
      try {
        await userPreferencesManager.setUserPreference('123', 'invalid.key.format', 'value');
        expect.fail('Expected error was not thrown');
      } catch (error) {
        expect(error).to.be.instanceOf(UserValidationError);
      }
    });
  });
  
  describe('resetUserPreference', () => {
    it('should reset a preference to its default value', async () => {
      mockUserService.getUserById.resolves(testUser);
      mockUserService.updateUser.resolves({
        ...testUser,
        preferences: {
          ...testUser.preferences,
          ui: { ...testUser.preferences.ui, theme: 'system' } // default value
        }
      });
      
      const result = await userPreferencesManager.resetUserPreference('123', 'ui.theme');
      
      expect(mockUserService.getUserById.calledWith('123')).to.be.true;
      expect(mockUserService.updateUser.calledOnce).to.be.true;
      expect(result.ui.theme).to.equal('system');
    });
  });
  
  describe('getDefaultPreferenceValue', () => {
    it('should return the default value for a preference', () => {
      const value = userPreferencesManager.getDefaultPreferenceValue('ui.theme');
      expect(value).to.equal('system');
    });
    
    it('should return undefined for unknown preference', () => {
      const value = userPreferencesManager.getDefaultPreferenceValue('unknown.key');
      expect(value).to.be.undefined;
    });
  });
}); 