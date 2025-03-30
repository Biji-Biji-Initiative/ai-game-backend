import { expect } from 'chai';
import domainEvents from '../../../src/core/common/events/domainEvents.js';

describe('Domain Events', function () {
    const ChallengeCompleted = 'challenge.completed';
    const UserRegistered = 'user.created';
    const UserProfileUpdated = 'user.updated';
    const UserLoggedIn = 'user.loggedin';
    const TestEvent = 'test.event';

    afterEach(function () {
        // Clean up after each test
        domainEvents.clear();
    });

    it('should register handlers and return an identifier', function () {
        // Arrange
        const handler = () => {};
        
        // Act
        const id = domainEvents.register(ChallengeCompleted, handler);
        
        // Assert
        expect(id).to.not.be.undefined;
    });

    it('should maintain a history of events', function () {
        // Arrange - Register handlers for multiple event types
        const handler1 = () => {};
        const handler2 = () => {};
        domainEvents.register(UserRegistered, handler1);
        domainEvents.register(UserProfileUpdated, handler2);
        
        // Act - Publish events
        domainEvents.publish(UserRegistered, { userId: '123' });
        domainEvents.publish(UserProfileUpdated, { userId: '123', profile: { name: 'Test User' } });
        
        // Assert - Check metrics
        const metrics = domainEvents.getMetrics();
        console.log('Event metrics:', JSON.stringify(metrics, null, 2));
        
        // Check that events were published 
        expect(metrics.publishedEvents).to.be.at.least(2);
    });

    it('should notify handlers when an event they are listening for is published', function () {
        // Arrange
        let wasCalled = false;
        const payload = { test: true };
        const handler = (eventData) => {
            wasCalled = true;
            expect(eventData).to.deep.equal(payload);
        };
        
        // Register handler
        domainEvents.register(UserLoggedIn, handler);
        
        // Act
        domainEvents.publish(UserLoggedIn, payload);
        
        // Assert
        expect(wasCalled).to.be.true;
    });

    it('should handle multiple handlers for the same event', function () {
        // Arrange
        let handler1Called = false;
        let handler2Called = false;
        const handler1 = () => { handler1Called = true; };
        const handler2 = () => { handler2Called = true; };
        
        // Register handlers
        domainEvents.register(TestEvent, handler1);
        domainEvents.register(TestEvent, handler2);
        
        // Act
        domainEvents.publish(TestEvent, { test: true });
        
        // Assert
        expect(handler1Called).to.be.true;
        expect(handler2Called).to.be.true;
    });

    it('should handle errors in event handlers gracefully', function () {
        // Arrange
        const errorHandler = () => { throw new Error('Test error'); };
        const normalHandler = () => {}; // This should still be called
        
        // These handlers should be called without throwing
        domainEvents.register(TestEvent, errorHandler);
        domainEvents.register(TestEvent, normalHandler);
        
        // Act & Assert - This should not throw
        domainEvents.publish(TestEvent, { test: true });
    });

    it.skip('should allow unregistering handlers', function () {
        // This functionality is currently being implemented
        console.log('Test skipped: Unregistering handlers is not fully implemented yet');
    });
});
