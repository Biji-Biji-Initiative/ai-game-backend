'use strict';

import IEventBus from './IEventBus.js';
import domainEvents from './domainEvents.js';

/**
 * Domain Event Bus Adapter
 * 
 * Adapts the existing domainEvents implementation to the IEventBus interface.
 * This follows the Adapter pattern allowing for consistent usage of the event bus
 * through the interface while using the existing implementation under the hood.
 */
class DomainEventBusAdapter extends IEventBus {
  /**
   * Create a new DomainEventBusAdapter
   */
  constructor() {
    super();
    this.domainEvents = domainEvents;
  }
  
  /**
   * @inheritdoc
   */
  register(eventType, handler) {
    return this.domainEvents.register(eventType, handler);
  }
  
  /**
   * @inheritdoc
   */
  publish(eventType, payload) {
    return this.domainEvents.publish(eventType, payload);
  }
  
  /**
   * @inheritdoc
   */
  unregister(eventType, handler) {
    return this.domainEvents.unregister(eventType, handler);
  }
  
  /**
   * @inheritdoc
   */
  getEventTypes() {
    return this.domainEvents.EventTypes;
  }
}

export default DomainEventBusAdapter; 