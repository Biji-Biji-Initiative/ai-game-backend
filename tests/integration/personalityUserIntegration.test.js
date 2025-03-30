import { expect } from "chai";
import sinon from "sinon";
import PersonalityCoordinator from "../../../src/application/PersonalityCoordinator";
import UserService from "../../../src/core/user/services/UserService";
import User from "../../../src/core/user/models/User";
import domainEvents from "../../../src/core/common/events/domainEvents";
import appLogger from "../../../src/core/infra/logging/appLogger";
import eventHandlers from "../../../src/application/EventHandlers";
const { EventTypes, eventBus } = domainEvents;
import { appLogger } from "";
describe('Personality-User Integration', () => {
    let personalityCoordinator;
    let userServiceMock;
    let userRepositoryMock;
    let loggerStub;
    beforeEach(() => {
        // Create stub for the logger
        loggerStub = {
            debug: sinon.stub(),
            info: sinon.stub(),
            warn: sinon.stub(),
            error: sinon.stub()
        };
        // Stub the appLogger
        sinon.stub(appLogger, 'child').returns(loggerStub);
        // Create mock user repository
        userRepositoryMock = {
            findById: sinon.stub(),
            save: sinon.stub()
        };
        // Create mock user service
        userServiceMock = {
            getUserById: sinon.stub()
        };
        // Create instance of the coordinator
        personalityCoordinator = new PersonalityCoordinator(userServiceMock, userRepositoryMock);
    });
    afterEach(() => {
        // Clean up all stubs
        sinon.restore();
    });
    describe('Preference synchronization', () => {
        it('should synchronize user preferences based on AI attitudes', async () => {
            // Arrange
            const userId = 'test-user-123';
            const aiAttitudes = {
                tech_savvy: 85,
                early_adopter: 75,
                security_conscious: 80,
                experimental: 60,
                ethical_concern: 75,
                skeptical: 30
            };
            // Create a mock user
            const mockUser = new User({
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
            userRepositoryMock.save.resolves({ ...mockUser });
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
            const userId = 'test-user-456';
            const aiAttitudes = {
                tech_savvy: 90,
                early_adopter: 85,
                security_conscious: 30,
                experimental: 80,
                ethical_concern: 40,
                skeptical: 20
            };
            // Create a mock user
            const mockUser = new User({
                id: userId,
                email: 'tech@example.com',
                fullName: 'Tech User'
            });
            // Setup stubs
            userServiceMock.getUserById.withArgs(userId).resolves(mockUser);
            userRepositoryMock.save.resolves({ ...mockUser });
            // Act
            const updatedPreferences = await personalityCoordinator.synchronizeUserPreferences(userId, aiAttitudes);
            // Assert
            expect(updatedPreferences.aiInteraction.detailLevel).to.equal('comprehensive');
            expect(updatedPreferences.aiInteraction.communicationStyle).to.equal('casual');
            expect(updatedPreferences.aiInteraction.responseFormat).to.equal('conversational');
        });
        it('should update user preferences when personality profile event is triggered', async () => {
            // Arrange
            const userId = 'event-test-user';
            const aiAttitudes = {
                tech_savvy: 70,
                early_adopter: 65
            };
            // Create a mock user
            const mockUser = new User({
                id: userId,
                email: 'event@example.com',
                fullName: 'Event Test User'
            });
            // Setup stubs
            userServiceMock.getUserById.withArgs(userId).resolves(mockUser);
            userRepositoryMock.save.resolves({ ...mockUser });
            // Spy on the coordinator's synchronizeUserPreferences method
            const syncSpy = sinon.spy(personalityCoordinator, 'synchronizeUserPreferences');
            // Manually call the event handler as if an event was published
            const event = {
                type: EventTypes.PERSONALITY_PROFILE_UPDATED,
                payload: {
                    userId,
                    personalityId: 'pers-123',
                    aiAttitudes,
                    updateType: 'attitudes'
                }
            };
            // Get the event handler from the EventHandlers module
            const { registerEventHandlers } = eventHandlers;
            // Create a mock container
            const containerMock = {
                get: sinon.stub()
            };
            containerMock.get.withArgs('personalityCoordinator').returns(personalityCoordinator);
            containerMock.get.withArgs('logger').returns(loggerStub);
            containerMock.get.withArgs('applicationEventHandlers').returns({
                registerEventHandlers: sinon.stub()
            });
            // Register event handlers
            registerEventHandlers(containerMock);
            // Trigger the event
            await eventBus.publishEvent(EventTypes.PERSONALITY_PROFILE_UPDATED, event.payload);
            // Wait a bit for async event handling
            await new Promise(resolve => setTimeout(resolve, 50));
            // Assert
            expect(syncSpy.calledWith(userId, aiAttitudes)).to.be.true;
            expect(userRepositoryMock.save.called).to.be.true;
        });
    });
});
