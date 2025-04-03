/**
 * Cache Invalidation Event Handlers
 * 
 * This module contains event handlers that listen for domain events
 * and automatically invalidate related caches to ensure data consistency.
 * 
 * These handlers complement the direct cache invalidation done in repositories
 * and provide redundant coverage to ensure data is always fresh.
 */

import { logger } from "#app/core/infra/logging/logger.js";
import { getCacheInvalidationManager } from "#app/core/infra/cache/cacheFactory.js";
import { getUserIdFromEvent, getEntityIdFromEvent } from "#app/core/common/events/eventUtils.js";

/**
 * Register cache invalidation event handlers with the event bus
 * @param {Object} container - Container instance
 */
export function registerCacheInvalidationEventHandlers(container) {
  if (!container) {
    throw new Error('Container is required for cache invalidation handlers');
  }

  const eventBus = container.get('eventBus');
  const EventTypes = container.get('eventTypes'); // Get EventTypes from container
  const cacheInvalidator = getCacheInvalidationManager();
  const log = logger.child({ component: 'cache-invalidation-handlers' });
  
  log.info('Registering cache invalidation event handlers');
  
  // Define event types that trigger cache invalidations
  const INVALIDATION_EVENTS = [
    'USER_CREATED', 'USER_UPDATED',
    'CHALLENGE_CREATED',
    'CHALLENGE_COMPLETED',
    'CHALLENGE_EVALUATED',
    'EVALUATION_UPDATED',
    'PROGRESS_UPDATED',
    'FOCUS_AREA_SELECTED',
  ];

  // Generic handler to invalidate cache based on entity type and ID
  const invalidateEntityCache = async (event) => {
    const entityType = event.data?.entityType;
    const entityId = event.data?.entityId;

    if (entityType && entityId) {
      try {
        log.debug(`Invalidating cache for ${entityType}:${entityId} due to event ${event.type}`);
        await cacheInvalidator.invalidateEntity(entityType, entityId);
        await cacheInvalidator.invalidateListCaches(entityType); // Also invalidate related lists
      } catch (error) {
        log.error(`Error invalidating cache for ${entityType}:${entityId}`, { 
          error: error.message, 
          eventId: event.id 
        });
      }
    }
  };

  // Subscribe to relevant events using the generic handler
  INVALIDATION_EVENTS.forEach(eventTypeKey => {
    const eventName = EventTypes[eventTypeKey];
    if (eventName) {
      // Use .on instead of .subscribe
      eventBus.on(eventName, invalidateEntityCache);
      log.debug(`Subscribed cache invalidator to event: ${eventName}`);
    } else {
      log.warn(`Event type key ${eventTypeKey} not found in EventTypes. Cannot subscribe cache invalidator.`);
    }
  });
  
  log.info('Cache invalidation event handlers registered successfully');
} 