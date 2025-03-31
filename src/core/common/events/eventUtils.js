/**
 * Event Utilities
 * 
 * Helper functions for working with domain events
 * These utilities help enforce consistent event structures
 * and simplify common event-related operations.
 */

'use strict';

/**
 * Standardize an event to ensure it follows the expected structure
 * This function is used to ensure all events have a consistent format:
 * {
 *   type: 'EVENT_TYPE',
 *   data: { 
 *     entityId: '123', 
 *     entityType: 'Entity',
 *     // All other event data...
 *   },
 *   metadata: { timestamp: '...', correlationId: '...' }
 * }
 * 
 * @param {Object} event - The event to standardize
 * @returns {Object} Standardized event object
 */
export function standardizeEvent(event) {
  if (!event || typeof event !== 'object') {
    throw new Error('Event must be an object');
  }

  if (!event.type) {
    throw new Error('Event must have a type property');
  }

  // Create a new standardized event
  const standardizedEvent = {
    type: event.type,
    data: {
      ...(event.data || {}),
    },
    metadata: {
      timestamp: new Date().toISOString(),
      ...((event.metadata && typeof event.metadata === 'object') ? event.metadata : {})
    }
  };

  // Ensure required fields are present
  if (!standardizedEvent.data.entityId) {
    throw new Error('Event data must contain entityId field');
  }

  if (!standardizedEvent.data.entityType) {
    throw new Error('Event data must contain entityType field');
  }

  // Ensure correlation ID exists
  if (!standardizedEvent.metadata.correlationId) {
    standardizedEvent.metadata.correlationId = 
      `${standardizedEvent.data.entityType.toLowerCase()}-${standardizedEvent.data.entityId}-${Date.now()}`;
  }

  return standardizedEvent;
}

/**
 * Extract userId from an event
 * 
 * @param {Object} event - The event object
 * @returns {string|null} The userId or null if not found
 */
export function getUserIdFromEvent(event) {
  if (!event || typeof event !== 'object' || !event.data) {
    return null;
  }

  return event.data.userId || event.data.userEmail || null;
}

/**
 * Extract entityId from an event, optionally filtering by entity type
 * 
 * @param {Object} event - The event object
 * @param {string} entityType - Optional entity type to match
 * @returns {string|null} The entityId or null if not found
 */
export function getEntityIdFromEvent(event, entityType = null) {
  if (!event || typeof event !== 'object' || !event.data) {
    return null;
  }

  // When entityType is specified, try to find a property matching that type
  if (entityType && event.data.entityType === entityType) {
    return event.data.entityId;
  }

  // When entityType is specified, try to find a specific ID property
  if (entityType) {
    const typeIdProperty = `${entityType.toLowerCase()}Id`;
    if (event.data[typeIdProperty]) {
      return event.data[typeIdProperty];
    }
  }

  // Default to entityId
  return event.data.entityId || null;
} 