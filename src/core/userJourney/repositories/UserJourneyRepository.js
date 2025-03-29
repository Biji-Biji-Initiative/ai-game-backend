'use strict';

/**
 * User Journey Repository
 * Handles all data operations for user journey events and analytics
 * 
 * @module UserJourneyRepository
 * @requires UserJourneyEvent
 * @requires UserJourneyEventSchema
 */
const { v4: uuidv4 } = require('uuid');
const UserJourneyEvent = require('../models/UserJourneyEvent');
const userJourneyEventMapper = require('../mappers/UserJourneyEventMapper');
const { 
  UserJourneyEventCreateSchema, 
  UserJourneyEventDatabaseSchema,
  UserJourneyEventQuerySchema
} = require('../schemas/UserJourneyEventSchema');
const { supabaseClient } = require('../../../core/infra/db/supabaseClient');
const { logger } = require('../../../core/infra/logging/logger');
const { eventBus } = require('../../../core/common/events/domainEvents');
const { 
  ValidationError, 
  DatabaseError 
} = require('../../../core/infra/repositories/BaseRepository');

// Import domain-specific error classes
const {
  UserJourneyError,
  UserJourneyNotFoundError,
  UserJourneyValidationError,
  UserJourneyRepositoryError
} = require('../errors/UserJourneyErrors');

const {
  createErrorMapper,
  createErrorCollector
} = require('../../../core/infra/errors/errorStandardization');

// Create an error mapper for the userJourney domain
const userJourneyErrorMapper = createErrorMapper(
  {
    EntityNotFoundError: UserJourneyNotFoundError,
    ValidationError: UserJourneyValidationError,
    DatabaseError: UserJourneyRepositoryError
  },
  UserJourneyError
);

/**
 * User Journey Repository Class
 */
class UserJourneyRepository {
  /**
   * Create a new UserJourneyRepository
   * @param {Object} supabaseClient - Supabase client
   * @param {Object} logger - Logger instance
   * @param {Object} eventBus - Event bus for domain events
   */
  constructor(dbClient, loggerInstance, eventBusInstance) {
    this.supabase = dbClient || supabaseClient;
    this.logger = loggerInstance || logger;
    this.eventBus = eventBusInstance || eventBus;
    
    // Apply standardized error handling to all repository methods
    this.recordEvent = this._wrapWithErrorHandling('recordEvent');
    this.getUserEvents = this._wrapWithErrorHandling('getUserEvents');
    this.getChallengeEvents = this._wrapWithErrorHandling('getChallengeEvents');
    this.getUserEventsByType = this._wrapWithErrorHandling('getUserEventsByType');
    this.getUserEventCountsByType = this._wrapWithErrorHandling('getUserEventCountsByType');
  }

  /**
   * Helper method to wrap repository methods with standardized error handling
   * @param {string} methodName - Name of the method to wrap
   * @returns {Function} Wrapped method
   * @private
   */
  _wrapWithErrorHandling(methodName) {
    const originalMethod = this[methodName];
    
    return async (...args) => {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        this.logger.error(`Error in userJourney repository ${methodName}`, {
          error: error.message,
          stack: error.stack,
          methodName,
          args: JSON.stringify(
            args.map(arg => {
              // Don't log potentially large objects/arrays in full
              if (typeof arg === 'object' && arg !== null) {
                return Object.keys(arg);
              }
              return arg;
            })
          ),
        });

        // Map error to domain-specific error
        const mappedError = userJourneyErrorMapper(error, {
          methodName,
          domainName: 'userJourney',
          args,
        });
        throw mappedError;
      }
    };
  }

  /**
   * Record a user journey event
   * @param {string} email - User email
   * @param {string} eventType - Type of event
   * @param {Object} eventData - Additional event data
   * @param {string} challengeId - Optional associated challenge ID
   * @returns {Promise<Object>} - Created event
   */
  async recordEvent(email, eventType, eventData = {}, challengeId = null) {
    // Create event data object
    const eventObject = {
      userEmail: email,
      eventType,
      eventData,
      challengeId,
      timestamp: new Date().toISOString()
    };

    // Validate with Zod schema
    const validationResult = UserJourneyEventCreateSchema.safeParse(eventObject);
    if (!validationResult.success) {
      this.logger.error('Event validation failed:', { errors: validationResult.error.flatten() });
      throw new ValidationError(`Invalid event data: ${validationResult.error.message}`, {
        entityType: 'userJourney',
        validationErrors: validationResult.error.flatten()
      });
    }

    // Use validated data
    const validData = validationResult.data;
    
    // Create domain model instance
    const userJourneyEvent = new UserJourneyEvent({
      id: uuidv4(),
      userEmail: validData.userEmail,
      eventType: validData.eventType,
      eventData: validData.eventData,
      challengeId: validData.challengeId,
      timestamp: validData.timestamp
    });
    
    // Add domain event for journey event creation
    userJourneyEvent.addDomainEvent('UserJourneyEventRecorded', {
      eventId: userJourneyEvent.id,
      userEmail: userJourneyEvent.userEmail,
      eventType: userJourneyEvent.eventType,
      timestamp: userJourneyEvent.timestamp
    });
    
    // Collect domain events for publishing after successful save
    const domainEvents = userJourneyEvent.getDomainEvents ? userJourneyEvent.getDomainEvents() : [];
    
    // Clear the events from the entity to prevent double-publishing
    if (domainEvents.length > 0 && userJourneyEvent.clearDomainEvents) {
      userJourneyEvent.clearDomainEvents();
    }
    
    // Convert to database format using mapper
    const dbEvent = userJourneyEventMapper.toPersistence(userJourneyEvent);
    
    // Validate database format with Zod schema
    const dbValidationResult = UserJourneyEventDatabaseSchema.safeParse(dbEvent);
    if (!dbValidationResult.success) {
      this.logger.error('Database event validation failed:', { errors: dbValidationResult.error.flatten() });
      throw new ValidationError(`Invalid database event data: ${dbValidationResult.error.message}`, {
        entityType: 'userJourney',
        validationErrors: dbValidationResult.error.flatten()
      });
    }
    
    // Insert into database
    const { data, error } = await this.supabase
      .from('user_journey_events')
      .insert(dbEvent)
      .select()
      .single();
    
    if (error) {
      throw new DatabaseError(`Failed to insert user journey event: ${error.message}`, {
        cause: error,
        entityType: 'userJourney',
        operation: 'recordEvent'
      });
    }
    
    this.logger.info(`User journey event ${eventType} recorded for ${email}`);
    
    // Return domain model instance using mapper
    const savedEvent = userJourneyEventMapper.toDomain(data);
    
    // Publish collected domain events AFTER successful persistence
    const errorCollector = createErrorCollector();
    
    if (domainEvents.length > 0) {
      try {
        this.logger.debug('Publishing collected domain events', {
          id: savedEvent.id,
          eventCount: domainEvents.length
        });
        
        // Publish the events one by one in sequence (maintaining order)
        for (const event of domainEvents) {
          await this.eventBus.publish(event.type, event.data);
        }
      } catch (eventError) {
        // Collect but don't throw errors from event publishing
        errorCollector.collect(eventError, 'event_publishing');
        this.logger.error('Error publishing domain events', { 
          id: savedEvent.id, 
          error: eventError.message 
        });
      }
    }
    
    return savedEvent;
  }

  /**
   * Get all events for a user
   * @param {string} email - User email
   * @param {number} limit - Optional limit of events to return
   * @returns {Promise<Array>} - List of events
   */
  async getUserEvents(email, limit = null) {
    // Validate query parameters
    const queryParams = { userEmail: email };
    if (limit !== null) {
      queryParams.limit = limit;
    }

    const validationResult = UserJourneyEventQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      this.logger.error('Query validation failed:', { errors: validationResult.error.flatten() });
      throw new ValidationError(`Invalid query parameters: ${validationResult.error.message}`, {
        entityType: 'userJourney',
        validationErrors: validationResult.error.flatten()
      });
    }

    // Use validated data
    const validData = validationResult.data;
    
    let query = this.supabase
      .from('user_journey_events')
      .select('*')
      .eq('user_email', validData.userEmail)
      .order('timestamp', { ascending: false });
    
    // Apply limit if specified
    if (validData.limit && typeof validData.limit === 'number') {
      query = query.limit(validData.limit);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new DatabaseError(`Failed to get user events: ${error.message}`, {
        cause: error,
        entityType: 'userJourney',
        operation: 'getUserEvents'
      });
    }
    
    // Validate and convert to domain model instances using mapper
    return data.map(event => {
      // Validate database data
      const dbValidationResult = UserJourneyEventDatabaseSchema.safeParse(event);
      if (!dbValidationResult.success) {
        this.logger.warn('Skipping invalid event data:', { errors: dbValidationResult.error.flatten() });
        return null;
      }
      return userJourneyEventMapper.toDomain(event);
    }).filter(Boolean); // Filter out null values
  }

  /**
   * Get events for a specific challenge
   * @param {string} challengeId - Challenge ID
   * @returns {Promise<Array>} - List of events
   */
  async getChallengeEvents(challengeId) {
    // Validate parameter
    const queryParams = { challengeId };
    const validationResult = UserJourneyEventQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      this.logger.error('Query validation failed:', { errors: validationResult.error.flatten() });
      throw new ValidationError(`Invalid query parameters: ${validationResult.error.message}`, {
        entityType: 'userJourney',
        validationErrors: validationResult.error.flatten()
      });
    }

    // Use validated data
    const validData = validationResult.data;
    
    const { data, error } = await this.supabase
      .from('user_journey_events')
      .select('*')
      .eq('challenge_id', validData.challengeId)
      .order('timestamp', { ascending: true });
    
    if (error) {
      throw new DatabaseError(`Failed to get challenge events: ${error.message}`, {
        cause: error,
        entityType: 'userJourney',
        operation: 'getChallengeEvents'
      });
    }
    
    // Validate and convert to domain model instances using mapper
    return data.map(event => {
      // Validate database data
      const dbValidationResult = UserJourneyEventDatabaseSchema.safeParse(event);
      if (!dbValidationResult.success) {
        this.logger.warn('Skipping invalid event data:', { errors: dbValidationResult.error.flatten() });
        return null;
      }
      return userJourneyEventMapper.toDomain(event);
    }).filter(Boolean); // Filter out null values
  }

  /**
   * Get events of a specific type for a user
   * @param {string} email - User email
   * @param {string} eventType - Type of event
   * @param {number} limit - Optional limit of events to return
   * @returns {Promise<Array>} - List of events
   */
  async getUserEventsByType(email, eventType, limit = null) {
    // Validate query parameters
    const queryParams = { userEmail: email, eventType };
    if (limit !== null) {
      queryParams.limit = limit;
    }

    const validationResult = UserJourneyEventQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      this.logger.error('Query validation failed:', { errors: validationResult.error.flatten() });
      throw new ValidationError(`Invalid query parameters: ${validationResult.error.message}`, {
        entityType: 'userJourney',
        validationErrors: validationResult.error.flatten()
      });
    }

    // Use validated data
    const validData = validationResult.data;
    
    let query = this.supabase
      .from('user_journey_events')
      .select('*')
      .eq('user_email', validData.userEmail)
      .eq('event_type', validData.eventType)
      .order('timestamp', { ascending: false });
    
    // Apply limit if specified
    if (validData.limit && typeof validData.limit === 'number') {
      query = query.limit(validData.limit);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new DatabaseError(`Failed to get user events by type: ${error.message}`, {
        cause: error,
        entityType: 'userJourney',
        operation: 'getUserEventsByType'
      });
    }
    
    // Validate and convert to domain model instances using mapper
    return data.map(event => {
      // Validate database data
      const dbValidationResult = UserJourneyEventDatabaseSchema.safeParse(event);
      if (!dbValidationResult.success) {
        this.logger.warn('Skipping invalid event data:', { errors: dbValidationResult.error.flatten() });
        return null;
      }
      return userJourneyEventMapper.toDomain(event);
    }).filter(Boolean); // Filter out null values
  }

  /**
   * Get event counts by type for a user
   * @param {string} email - User email
   * @returns {Promise<Object>} - Object with counts by event type
   */
  async getUserEventCountsByType(email) {
    // Validate email parameter
    const queryParams = { userEmail: email };
    const validationResult = UserJourneyEventQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      this.logger.error('Query validation failed:', { errors: validationResult.error.flatten() });
      throw new ValidationError(`Invalid query parameters: ${validationResult.error.message}`, {
        entityType: 'userJourney',
        validationErrors: validationResult.error.flatten()
      });
    }

    // Use validated data
    const validData = validationResult.data;
    
    // PostgreSQL query using Supabase's raw SQL capabilities
    const { data, error } = await this.supabase.rpc('count_user_events_by_type', {
      user_email_param: validData.userEmail
    });
    
    if (error) {
      // If the stored procedure doesn't exist, fallback to JS implementation
      this.logger.warn('RPC function not available, using fallback method', { error: error.message });
      
      // Get all events for the user
      const { data: events, error: eventsError } = await this.supabase
        .from('user_journey_events')
        .select('event_type')
        .eq('user_email', validData.userEmail);
      
      if (eventsError) {
        throw new DatabaseError(`Failed to get events for counting: ${eventsError.message}`, {
          cause: eventsError,
          entityType: 'userJourney',
          operation: 'getUserEventCountsByType'
        });
      }
      
      // Count events by type
      const counts = {};
      events.forEach(event => {
        counts[event.event_type] = (counts[event.event_type] || 0) + 1;
      });
      
      return counts;
    }
    
    return data;
  }
}

module.exports = UserJourneyRepository;