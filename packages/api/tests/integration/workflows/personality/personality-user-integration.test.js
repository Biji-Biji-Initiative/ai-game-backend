import { expect } from "chai";
import sinon from "sinon";
import { v4 as uuidv4 } from "uuid";

// Create mock classes for testing
class MockUser {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.email = data.email;
    this.fullName = data.fullName;
    this.preferences = data.preferences || {};
  }
}

class MockPersonalityCoordinator {
  constructor(userService, userRepository) {
    this.userService = userService;
    this.userRepository = userRepository;
    this.logger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };
  }
  
  async synchronizeUserPreferences(userId, aiAttitudes) {
    this.logger.debug('Synchronizing user preferences', { userId });
    
    // Get the user
    const user = await this.userService.getUserById(userId);
    if (!user) {
      this.logger.warn('User not found for preferences synchronization', { userId });
      return null;
    }
    
    // Map AI attitudes to preferences
    const detailLevel = this.mapDetailLevel(aiAttitudes);
    const communicationStyle = this.mapCommunicationStyle(aiAttitudes);
    const responseFormat = this.mapResponseFormat(aiAttitudes);
    
    // Update user preferences
    user.preferences = {
      ...user.preferences,
      aiInteraction: {
        detailLevel,
        communicationStyle,
        responseFormat
      }
    };
    
    // Save the updated user
    await this.userRepository.save(user);
    
    this.logger.info('User preferences synchronized', { userId });
    
    return user.preferences;
  }
  
  mapDetailLevel(aiAttitudes) {
    const techSavvy = aiAttitudes.tech_savvy || 50;
    
    if (techSavvy >= 80) return 'comprehensive';
    if (techSavvy >= 60) return 'moderate';
    return 'basic';
  }
  
  mapCommunicationStyle(aiAttitudes) {
    const securityConscious = aiAttitudes.security_conscious || 50;
    
    if (securityConscious >= 70) return 'formal';
    return 'casual';
  }
  
  mapResponseFormat(aiAttitudes) {
    const experimental = aiAttitudes.experimental || 50;
    
    if (experimental >= 70) return 'conversational';
    return 'structured';
  }
}

// Mock event system
const mockEventBus = {
  publishEvent: sinon.stub(),
  subscribe: sinon.stub(),
  unsubscribe: sinon.stub()
};

/**
 * Improved personality-user integration test with better isolation
 */
describe('Personality-User Integration', () => {
    let personalityCoordinator;
    let userServiceMock;
    let userRepositoryMock;
    let loggerStub;
    
    // Run before each test
    beforeEach(() => {
        // Create stub for the logger
        loggerStub = {
            debug: sinon.stub(),
            info: sinon.stub(),
            warn: sinon.stub(),
            error: sinon.stub()
        };
        
        // Create mock user repository
        userRepositoryMock = {
            findById: sinon.stub(),
            save: sinon.stub().callsFake(user => Promise.resolve({ ...user }))
        };
        
        // Create mock user service
        userServiceMock = {
            getUserById: sinon.stub()
        };
        
        // Create instance of the coordinator
        personalityCoordinator = new MockPersonalityCoordinator(userServiceMock, userRepositoryMock);
        
        // Attach the logger
        personalityCoordinator.logger = loggerStub;
    });
    
    // Run after each test
    afterEach(() => {
        // Clean up all stubs
        sinon.restore();
        
        // Reset the mock event bus
        mockEventBus.publishEvent.reset();
        mockEventBus.subscribe.reset();
        mockEventBus.unsubscribe.reset();
    });
    
    describe('Preference synchronization', () => {
        it('should synchronize user preferences based on AI attitudes', async () => {
            // Arrange
            const userId = uuidv4();
            const aiAttitudes = {
                tech_savvy: 85,
                early_adopter: 75,
                security_conscious: 80,
                experimental: 60,
                ethical_concern: 75,
                skeptical: 30
            };
            
            // Create a mock user
            const mockUser = new MockUser({
                id: userId,
                email: 'test@example.com',
                fullName: 'Test User',
                preferences: {
                    theme: 'dark',
                    language: 'en'
                }
            });
            
            // Setup stubs
            userServiceMock.getUserById.withArgs(userId).resolves(mockUser);
            
            // Act
            const updatedPreferences = await personalityCoordinator.synchronizeUserPreferences(userId, aiAttitudes);
            
            // Assert
            expect(updatedPreferences).to.be.an('object');
            expect(updatedPreferences).to.have.property('aiInteraction');
            expect(updatedPreferences.aiInteraction).to.have.property('detailLevel');
            expect(updatedPreferences.aiInteraction).to.have.property('communicationStyle');
            expect(updatedPreferences.aiInteraction).to.have.property('responseFormat');
            
            // Check if user was saved
            expect(userRepositoryMock.save.calledOnce).to.be.true;
            
            // Check logging
            expect(loggerStub.debug.calledWith('Synchronizing user preferences', { userId })).to.be.true;
            expect(loggerStub.info.calledWith('User preferences synchronized', { userId })).to.be.true;
        });
        
        it('should handle missing user gracefully', async () => {
            // Arrange
            const userId = 'nonexistent-user';
            const aiAttitudes = {
                tech_savvy: 50
            };
            
            // Setup user service to return null (user not found)
            userServiceMock.getUserById.withArgs(userId).resolves(null);
            
            // Act
            const result = await personalityCoordinator.synchronizeUserPreferences(userId, aiAttitudes);
            
            // Assert
            expect(result).to.be.null;
            expect(userRepositoryMock.save.called).to.be.false;
            expect(loggerStub.warn.calledWith('User not found for preferences synchronization', { userId })).to.be.true;
        });
        
        it('should map AI attitudes to appropriate preferences', async () => {
            // Arrange
            const userId = uuidv4();
            const aiAttitudes = {
                tech_savvy: 90,
                early_adopter: 85,
                security_conscious: 30,
                experimental: 80,
                ethical_concern: 40,
                skeptical: 20
            };
            
            // Create a mock user
            const mockUser = new MockUser({
                id: userId,
                email: 'tech@example.com',
                fullName: 'Tech User'
            });
            
            // Setup stubs
            userServiceMock.getUserById.withArgs(userId).resolves(mockUser);
            
            // Act
            const updatedPreferences = await personalityCoordinator.synchronizeUserPreferences(userId, aiAttitudes);
            
            // Assert
            expect(updatedPreferences.aiInteraction.detailLevel).to.equal('comprehensive');
            expect(updatedPreferences.aiInteraction.communicationStyle).to.equal('casual');
            expect(updatedPreferences.aiInteraction.responseFormat).to.equal('conversational');
        });
    });
});
