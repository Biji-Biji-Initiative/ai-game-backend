'use strict';

import { v4 as uuidv4 } from "uuid";
import UserJourneyEvent from "#app/core/userJourney/models/UserJourneyEvent.js";
import { UserJourney } from "#app/core/userJourney/models/UserJourney.js"; // Import Aggregate
import userJourneyEventMapper from "#app/core/userJourney/mappers/UserJourneyEventMapper.js";
import userJourneyMapper from "#app/core/userJourney/mappers/UserJourneyMapper.js"; // Import Aggregate Mapper
import { UserJourneyEventCreateSchema, UserJourneyEventDatabaseSchema, UserJourneyEventQuerySchema } from "#app/core/userJourney/schemas/UserJourneyEventSchema.js";
import { logger } from "#app/core/infra/logging/logger.js";
import { EventTypes } from "#app/core/common/events/eventTypes.js";
import { BaseRepository, ValidationError, DatabaseError, EntityNotFoundError } from "#app/core/infra/repositories/BaseRepository.js"; // Import BaseRepository
import { UserJourneyNotFoundError, UserJourneyValidationError, UserJourneyError } from "#app/core/userJourney/errors/userJourneyErrors.js";
import { createErrorMapper, withRepositoryErrorHandling } from "#app/core/infra/errors/errorStandardization.js";

// Create an error mapper for the userJourney domain
const userJourneyErrorMapper = createErrorMapper({
  EntityNotFoundError: UserJourneyNotFoundError,
  ValidationError: UserJourneyValidationError,
  DatabaseError: UserJourneyError
}, UserJourneyError);

/**
 * User Journey Repository Class
 * Handles persistence for UserJourney aggregate and UserJourneyEvent entities.
 * @extends BaseRepository
 */
class UserJourneyRepository extends BaseRepository { // Extend BaseRepository
  /**
   * Create a new UserJourneyRepository
   * @param {Object} options - Options object containing db, logger, and eventBus
   */
  constructor(options = {}) {
    // Pass db, logger to BaseRepository. Define primary table for the AGGREGATE.
    super({
        db: options.db,
        tableName: 'user_journeys', // Aggregate table
        domainName: 'userJourney',
        logger: options.logger || logger, // Use injected or default logger
        eventBus: options.eventBus // Pass eventBus to BaseRepository
    });
    
    // Keep separate table name for events if needed
    this.eventsTableName = 'user_journey_events'; 
    
    // Log if dependencies are missing
    if (!this.db) {
      this.logger.warn('No Supabase client provided to UserJourneyRepository');
    }
    if (!this.eventBus) {
      this.logger.warn('No eventBus provided to UserJourneyRepository');
    }
    
    // Apply standardized error handling to all repository methods
    // (Methods inherited from BaseRepository like save, findById, delete are already handled if BaseRepo applies wrappers)
    // Apply to methods specific to this repository:
    this.recordEvent = withRepositoryErrorHandling(
      this.recordEvent.bind(this),
      {
        methodName: 'recordEvent',
        domainName: 'userJourney',
        logger: this.logger,
        errorMapper: userJourneyErrorMapper
      }
    );
    this.getUserEvents = withRepositoryErrorHandling(
      this.getUserEvents.bind(this),
      {
        methodName: 'getUserEvents',
        domainName: 'userJourney',
        logger: this.logger,
        errorMapper: userJourneyErrorMapper
      }
    );
    this.getChallengeEvents = withRepositoryErrorHandling(
      this.getChallengeEvents.bind(this),
      {
        methodName: 'getChallengeEvents',
        domainName: 'userJourney',
        logger: this.logger,
        errorMapper: userJourneyErrorMapper
      }
    );
    this.getUserEventsByType = withRepositoryErrorHandling(
      this.getUserEventsByType.bind(this),
      {
        methodName: 'getUserEventsByType',
        domainName: 'userJourney',
        logger: this.logger,
        errorMapper: userJourneyErrorMapper
      }
    );
    this.getUserEventCountsByType = withRepositoryErrorHandling(
      this.getUserEventCountsByType.bind(this),
      {
        methodName: 'getUserEventCountsByType',
        domainName: 'userJourney',
        logger: this.logger,
        errorMapper: userJourneyErrorMapper
      }
    );
    // Add wrappers for new aggregate methods
    this.findJourneyByUserId = withRepositoryErrorHandling(
      this.findJourneyByUserId.bind(this),
      {
        methodName: 'findJourneyByUserId',
        domainName: 'userJourney',
        logger: this.logger,
        errorMapper: userJourneyErrorMapper
      }
    );
    this.saveJourney = withRepositoryErrorHandling(
      this.saveJourney.bind(this),
      {
        methodName: 'saveJourney',
        domainName: 'userJourney',
        logger: this.logger,
        errorMapper: userJourneyErrorMapper
      }
    );
  }

  /**
   * Find the UserJourney aggregate for a given user ID.
   * @param {string} userId - The user ID.
   * @param {boolean} [loadEvents=false] - Whether to also load associated events.
   * @returns {Promise<UserJourney|null>} The UserJourney aggregate or null.
   */
  async findJourneyByUserId(userId, loadEvents = false) {
      this._validateRequiredParams({ userId }, ['userId']);
      this.logger.debug('Finding user journey aggregate', { userId, loadEvents });

      const { data, error } = await this.db
          .from(this.tableName) // Query the aggregate table
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

      if (error) {
          throw new DatabaseError(`Failed to fetch user journey: ${error.message}`, { cause: error });
      }
      if (!data) {
          return null;
      }

      // Convert DB record to domain aggregate
      const journey = userJourneyMapper.toDomain(data, { EventTypes });

      // Load events separately if requested
      if (loadEvents && journey) {
          journey.events = await this.getUserEvents(userId); // Assumes userId is needed or adjust getUserEvents
          // Or: journey.events = await this._getEventsForJourney(journey.id);
      }

      return journey;
  }

  /**
   * Save the UserJourney aggregate state.
   * NOTE: This typically saves only the aggregate root's state fields,
   * not the embedded events array, which are saved separately via recordEvent.
   * @param {UserJourney} journey - The UserJourney aggregate to save.
   * @returns {Promise<UserJourney>} The saved UserJourney aggregate.
   */
  async saveJourney(journey) {
      if (!journey || !(journey instanceof UserJourney)) {
          throw new UserJourneyValidationError('Invalid UserJourney instance provided to saveJourney');
      }
      
      // Events collected from the journey aggregate itself (e.g., USER_JOURNEY_UPDATED)
      const domainEvents = journey.getDomainEvents();
      journey.clearDomainEvents(); // Clear before save

      return this.withTransaction(async (transaction) => {
          const dbData = userJourneyMapper.toPersistence(journey);
          
          // Validate persistence data (optional, if schema exists for aggregate table)
          // const validation = userJourneySchema.safeParse(dbData); ...
          
          this.logger.debug('Saving user journey aggregate', { journeyId: journey.id, userId: journey.userId });
          
          const { data, error } = await transaction
              .from(this.tableName) // Use aggregate table name
              .upsert(dbData, { onConflict: 'user_id' }) // Upsert based on user_id ? Or ID?
              .select()
              .single();

          if (error) {
              throw new DatabaseError(`Failed to save user journey: ${error.message}`, { cause: error });
          }

          const savedJourney = userJourneyMapper.toDomain(data, { EventTypes });

          return {
              result: savedJourney,
              domainEvents: domainEvents // Publish events collected from the aggregate
          };
      }, {
          publishEvents: true,
          // eventBus: this.eventBus, // Handled by BaseRepository
          invalidateCache: true,
          // cacheInvalidator: this.cacheInvalidator // Handled by BaseRepository
      });
  }

  /**
   * Record a user journey event (persists the individual event).
   * This method ONLY saves the event record, it does NOT update the aggregate.
   * Aggregate updates are handled by loading the aggregate, calling its methods, and saving it separately.
   * @param {UserJourneyEvent} event - The UserJourneyEvent domain object to save.
   * @returns {Promise<UserJourneyEvent>} - Created event domain object.
   * @throws {UserJourneyValidationError} If event data is invalid.
   * @throws {DatabaseError} If persistence fails.
   */
  async recordEvent(event) {
    // Validate input type
    if (!event || !(event instanceof UserJourneyEvent)) {
      throw new UserJourneyValidationError('Invalid UserJourneyEvent instance provided to recordEvent');
    }

    // No transaction needed here by default, handled by service orchestration if required
    this.logger.debug('Persisting individual user journey event', { userId: event.userId, eventType: event.eventType, eventId: event.id });

    // 1. Convert event domain object to persistence format using the event mapper
    const dbEvent = userJourneyEventMapper.toPersistence(event);
    const dbEventValidation = UserJourneyEventDatabaseSchema.safeParse(dbEvent);
    if (!dbEventValidation.success) {
      throw new UserJourneyValidationError(`Invalid DB format for UserJourneyEvent: ${dbEventValidation.error.message}`);
    }

    // 2. Persist the individual event to the events table
    const { data: savedEventData, error: eventSaveError } = await this.db
      .from(this.eventsTableName)
      .insert(dbEventValidation.data)
      .select()
      .single();

    if (eventSaveError) {
      throw new DatabaseError(`Failed to insert user journey event: ${eventSaveError.message}`, { cause: eventSaveError });
    }

    // 3. Convert persisted data back to domain object and return
    const savedEvent = userJourneyEventMapper.toDomain(savedEventData);
    return savedEvent; 
  }

  /**
   * Get all events for a user (fetches from events table).
   * @param {string} userId - User ID.
   * @param {Object} [filters={}] - Optional filters (limit, startDate, endDate, eventType)
   * @returns {Promise<Array<UserJourneyEvent>>} - List of event domain objects
   */
  async getUserEvents(userId, filters = {}) {
    const { limit, startDate, endDate, eventType } = filters;
    // Validate query parameters
    // Removed userEmail validation, keep others if needed
    const queryParams = { userId, eventType, limit }; // Add dates if needed
    // Re-evaluate UserJourneyEventQuerySchema or simplify validation here if needed
    // For now, assume basic validation or trust input
    // const validationResult = UserJourneyEventQuerySchema.safeParse(queryParams);
    // if (!validationResult.success) {
    //   throw new UserJourneyValidationError(`Invalid query parameters: ${validationResult.error.message}`, { validationErrors: validationResult.error.flatten() });
    // }
    // const validData = validationResult.data;
    
    this._validateRequiredParams({ userId }, ['userId']);
    
    let query = this.db.from(this.eventsTableName)
        .select('*')
        .eq('user_id', userId) // Use user_id
        .order('timestamp', { ascending: false });
        
    if (eventType) { // Use directly from filters
        query = query.eq('event_type', eventType);
    }
    if (startDate) {
        query = query.gte('timestamp', new Date(startDate).toISOString());
    }
     if (endDate) {
        query = query.lte('timestamp', new Date(endDate).toISOString());
    }
    if (limit && typeof limit === 'number') { // Use directly from filters
      query = query.limit(limit);
    }
    
    const { data, error } = await query;
    if (error) {
      throw new DatabaseError(`Failed to get user events: ${error.message}`, { cause: error });
    }
    
    // Validate and convert to domain model instances using event mapper
    return (data || []).map(event => {
      const dbValidationResult = UserJourneyEventDatabaseSchema.safeParse(event);
      if (!dbValidationResult.success) {
        this.logger.warn('Skipping invalid event data from DB:', { errors: dbValidationResult.error.flatten(), eventId: event.id });
        return null;
      }
      return userJourneyEventMapper.toDomain(event); // Use EVENT mapper
    }).filter(Boolean); // Filter out null values
  }

  /**
   * Get events for a specific challenge
   * @param {string} challengeId - Challenge ID
   * @returns {Promise<Array<UserJourneyEvent>>} - List of events
   */
  async getChallengeEvents(challengeId) {
    const queryParams = { challengeId };
    const validationResult = UserJourneyEventQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      throw new UserJourneyValidationError(`Invalid query parameters: ${validationResult.error.message}`, { validationErrors: validationResult.error.flatten() });
    }
    const validData = validationResult.data;
    
    const { data, error } = await this.db.from(this.eventsTableName)
        .select('*')
        .eq('challenge_id', validData.challengeId)
        .order('timestamp', { ascending: true });
        
    if (error) {
      throw new DatabaseError(`Failed to get challenge events: ${error.message}`, { cause: error });
    }
    
    return (data || []).map(event => {
      const dbValidationResult = UserJourneyEventDatabaseSchema.safeParse(event);
      if (!dbValidationResult.success) {
        this.logger.warn('Skipping invalid event data from DB', { errors: dbValidationResult.error.flatten(), eventId: event.id });
        return null;
      }
      return userJourneyEventMapper.toDomain(event);
    }).filter(Boolean);
  }

  /**
   * Get events of a specific type for a user
   * @param {string} userId - User ID.
   * @param {string} eventType - Type of event
   * @param {number} limit - Optional limit of events to return
   * @returns {Promise<Array<UserJourneyEvent>>} - List of events
   */
  async getUserEventsByType(userId, eventType, limit = null) {
    // Removed userEmail validation
    // const queryParams = { userId, eventType, limit };
    // const validationResult = UserJourneyEventQuerySchema.safeParse(queryParams);
    // if (!validationResult.success) {
    //   throw new UserJourneyValidationError(`Invalid query parameters: ${validationResult.error.message}`, { validationErrors: validationResult.error.flatten() });
    // }
    // const validData = validationResult.data;
    
    this._validateRequiredParams({ userId, eventType }, ['userId', 'eventType']);

    let query = this.db.from(this.eventsTableName)
        .select('*')
        .eq('user_id', userId) // Use user_id
        .eq('event_type', eventType)
        .order('timestamp', { ascending: false });
        
    if (limit && typeof limit === 'number') {
      query = query.limit(limit);
    }
    
    const { data, error } = await query;
    if (error) {
      throw new DatabaseError(`Failed to get user events by type: ${error.message}`, { cause: error });
    }
    
    return (data || []).map(event => {
      const dbValidationResult = UserJourneyEventDatabaseSchema.safeParse(event);
      if (!dbValidationResult.success) {
        this.logger.warn('Skipping invalid event data from DB', { errors: dbValidationResult.error.flatten(), eventId: event.id });
        return null;
      }
      return userJourneyEventMapper.toDomain(event);
    }).filter(Boolean);
  }

  /**
   * Get event counts by type for a user
   * @param {string} userId - User ID.
   * @returns {Promise<Object>} - Object with counts by event type
   */
  async getUserEventCountsByType(userId) {
    // Removed userEmail validation
    // const queryParams = { userId };
    // const validationResult = UserJourneyEventQuerySchema.safeParse(queryParams);
    // if (!validationResult.success) {
    //   throw new UserJourneyValidationError(`Invalid query parameters: ${validationResult.error.message}`, { validationErrors: validationResult.error.flatten() });
    // }
    // const validData = validationResult.data;
    
    this._validateRequiredParams({ userId }, ['userId']);

    // --- Try RPC first (assuming it can be updated or a new one created) ---
    // NOTE: RPC function 'count_user_events_by_type' is currently not used 
    // as it requires an update to accept user_id instead of email. Using fallback query.
    /*
    const { data, error } = await this.db.rpc('count_user_events_by_type', {
      user_id_param: userId // Use user_id_param (assuming RPC is updated)
    });
    
    if (!error) { 
        return data; // Return data if RPC succeeded
    }
    
    this.logger.warn('RPC function count_user_events_by_type failed or expects email, using fallback', { error: error?.message, userId });
    */
   this.logger.warn('Using fallback query for getUserEventCountsByType as RPC function requires update.', { userId }); // Simplified warning

    // --- Fallback logic --- 
    const { data: events, error: eventsError } = await this.db.from(this.eventsTableName)
      .select('event_type')
      .eq('user_id', userId); // Use user_id
      
    if (eventsError) {
      throw new DatabaseError(`Failed to get events for counting: ${eventsError.message}`, { cause: eventsError });
    }
    const counts = {};
    (events || []).forEach(event => {
      counts[event.event_type] = (counts[event.event_type] || 0) + 1;
    });
    return counts;
  }
}

export { UserJourneyRepository };
export default UserJourneyRepository;