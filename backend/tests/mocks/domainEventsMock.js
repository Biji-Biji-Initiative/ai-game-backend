/**
 * Domain Events Module Mock
 * 
 * This mock replaces the real domainEvents module in tests.
 * It exports the same interface as the real module but with test spy implementations.
 */

import sinon from 'sinon';

// Import the real EventTypes so our mock has the same structure
import { EventTypes } from "@/core/common/events/domainEvents.js";

// Create an event bus mock that's compatible with the real one
const eventBus = {
    publishEvent: sinon.stub().resolves(),
    publish: sinon.stub().resolves(),
    dispatch: sinon.stub().resolves(),
    register: sinon.stub().returnsThis(),
    on: sinon.stub().returnsThis(),
    clear: sinon.stub(),
    getMetrics: sinon.stub().returns({ eventCount: 0, handlerCount: 0 }),
    
    // Reset all stubs for clean test state
    reset() {
        this.publishEvent.reset();
        this.publish.reset();
        this.dispatch.reset();
        this.register.reset();
        this.on.reset();
        this.clear.reset();
        this.getMetrics.reset();
    },
    
    // Helper for asserting in tests
    verifyEventPublished(eventType, expectedData = null) {
        const publishCalls = this.publish.getCalls().filter(call => call.args[0] === eventType);
        
        if (publishCalls.length === 0) {
            return {
                wasCalled: false,
                callCount: 0,
                data: null
            };
        }
        
        // If specific data was expected, verify it
        if (expectedData) {
            const matchingCalls = publishCalls.filter(call => {
                const actualData = call.args[1];
                return Object.entries(expectedData).every(([key, value]) => 
                    actualData[key] === value
                );
            });
            
            return {
                wasCalled: matchingCalls.length > 0,
                callCount: matchingCalls.length,
                data: matchingCalls.length > 0 ? matchingCalls[0].args[1] : null
            };
        }
        
        return {
            wasCalled: true,
            callCount: publishCalls.length,
            data: publishCalls[0].args[1]
        };
    }
};

// Alias publishEvent to publish for compatibility with original implementation
eventBus.publishEvent = eventBus.publish;

// Create a mock DomainEventsCompatibility class
class DomainEventsCompatibility {
    constructor() {
        this.EventTypes = EventTypes;
        this.handlers = {};
        this.logger = {
            info: sinon.stub(),
            debug: sinon.stub(),
            warn: sinon.stub(),
            error: sinon.stub(),
            child: () => this.logger
        };
    }
    
    register(eventName, handler) {
        return eventBus.register(eventName, handler);
    }
    
    dispatch(eventName, eventData) {
        return eventBus.dispatch(eventName, eventData);
    }
    
    publish(eventName, eventData) {
        return eventBus.publish(eventName, eventData);
    }
    
    clear() {
        return eventBus.clear();
    }
    
    getMetrics() {
        return eventBus.getMetrics();
    }
    
    reset() {
        eventBus.reset();
    }
}

// Create the mock singleton
const domainEvents = new DomainEventsCompatibility();

// Named exports should match the original module
export { eventBus, EventTypes };
export default domainEvents; 