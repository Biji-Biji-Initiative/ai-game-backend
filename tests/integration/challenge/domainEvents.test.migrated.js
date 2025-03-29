/**
 * Domain Events Integration Tests
 * 
 * Tests the integration and communication between domains
 * using the domain event system
 */

const { expect } = require('chai');
const sinon = require('sinon');
const domainEvents = require('../../../src/core/common/events/domainEvents');
const testSetup = require('../setup');

describe('Domain Events Integration', function() {
  
  beforeEach(function() {
    testSetup.setup();
  });
  
  afterEach(function() {
    testSetup.teardown();
    sinon.restore();
  });
  
  it('should allow cross-domain communication with events', async function() {
    // Create a mock focus area service that will be called by the challenge handler
    const focusAreaService = {
      updateProgress: sinon.stub().resolves()
    };
    
    // Register a handler for challenge completion that calls the focus area service
    const handlerId = domainEvents.registerHandler('ChallengeCompleted', async event => {
      const { data } = event;
      
      if (data.focusArea) {
        await focusAreaService.updateProgress(data.userId, data.focusArea, data.score);
      }
    });
    
    // Verify the handler was registered
    expect(handlerId).to.be.a('string');
    
    // Publish a challenge completed event
    await domainEvents.publish('ChallengeCompleted', {
      challengeId: 'test-challenge-1',
      userId: 'test-user-1',
      focusArea: 'effective-questioning',
      score: 85,
      completedAt: new Date().toISOString()
    });
    
    // Verify the focus area service was called with the correct parameters
    expect(focusAreaService.updateProgress.calledOnce).to.be.true;
    expect(focusAreaService.updateProgress.firstCall.args[0]).to.equal('test-user-1');
    expect(focusAreaService.updateProgress.firstCall.args[1]).to.equal('effective-questioning');
    expect(focusAreaService.updateProgress.firstCall.args[2]).to.equal(85);
  });
  
  it('should store events in history for debugging', async function() {
    // Create multiple event handlers
    const handler1 = sinon.stub().resolves('result1');
    const handler2 = sinon.stub().resolves('result2');
    
    // Register the handlers
    domainEvents.registerHandler('UserRegistered', handler1);
    domainEvents.registerHandler('UserProfileUpdated', handler2);
    
    // Publish some events
    await domainEvents.publish('UserRegistered', { userId: 'user1', email: 'user1@example.com' });
    await domainEvents.publish('UserProfileUpdated', { userId: 'user1', name: 'John Doe' });
    
    // Get the event history
    const history = domainEvents.getEventHistory();
    
    // Verify the history contains both events (in reverse order)
    expect(history.length).to.be.at.least(2);
    expect(history[0].type).to.equal('UserProfileUpdated');
    expect(history[0].data.name).to.equal('John Doe');
    expect(history[1].type).to.equal('UserRegistered');
    expect(history[1].data.email).to.equal('user1@example.com');
  });
  
  it('should handle multiple handlers for the same event', async function() {
    // Create multiple handlers for the same event
    const notificationService = { sendNotification: sinon.stub().resolves() };
    const analyticsService = { trackEvent: sinon.stub().resolves() };
    const userService = { updateLastActive: sinon.stub().resolves() };
    
    // Register all handlers for the user login event
    domainEvents.registerHandler('UserLoggedIn', async event => {
      const { data } = event;
      await notificationService.sendNotification(data.userId, 'Welcome back!');
    });
    
    domainEvents.registerHandler('UserLoggedIn', async event => {
      const { data } = event;
      await analyticsService.trackEvent('login', { userId: data.userId });
    });
    
    domainEvents.registerHandler('UserLoggedIn', async event => {
      const { data } = event;
      await userService.updateLastActive(data.userId);
    });
    
    // Publish a user login event
    await domainEvents.publish('UserLoggedIn', {
      userId: 'test-user-1',
      timestamp: new Date().toISOString(),
      ipAddress: '127.0.0.1'
    });
    
    // Verify all services were called
    expect(notificationService.sendNotification.calledOnce).to.be.true;
    expect(analyticsService.trackEvent.calledOnce).to.be.true;
    expect(userService.updateLastActive.calledOnce).to.be.true;
  });
  
  it('should handle errors in event handlers gracefully', async function() {
    // Create handlers - one that works and one that throws
    const workingHandler = sinon.stub().resolves('success');
    const failingHandler = sinon.stub().throws(new Error('Handler error'));
    
    // Register both handlers
    domainEvents.registerHandler('TestEvent', workingHandler);
    domainEvents.registerHandler('TestEvent', failingHandler);
    
    // Publish an event - this should not throw despite one handler failing
    const results = await domainEvents.publish('TestEvent', { test: true });
    
    // Verify both handlers were called
    expect(workingHandler.calledOnce).to.be.true;
    expect(failingHandler.calledOnce).to.be.true;
    
    // Verify results contain one success and one null (for the error)
    expect(results.length).to.equal(2);
    expect(results).to.include('success');
    expect(results).to.include(null);
  });
  
  it('should allow unregistering handlers', async function() {
    // Create a handler and register it
    const handler = sinon.stub().resolves();
    const handlerId = domainEvents.registerHandler('UserEvent', handler);
    
    // First event should trigger the handler
    await domainEvents.publish('UserEvent', { id: 1 });
    expect(handler.calledOnce).to.be.true;
    
    // Unregister the handler
    const removed = domainEvents.unregisterHandler(handlerId);
    expect(removed).to.be.true;
    
    // Reset the stub
    handler.reset();
    
    // Second event should not trigger the handler
    await domainEvents.publish('UserEvent', { id: 2 });
    expect(handler.called).to.be.false;
  });
}); 