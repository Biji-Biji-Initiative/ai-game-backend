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
const { 
  UserJourneyEventSchema, 
  UserJourneyEventCreateSchema, 
  UserJourneyEventDatabaseSchema,
  UserJourneyEventQuerySchema
} = require('../schemas/UserJourneyEventSchema');

/**
 * User Journey Repository Class
 */
class UserJourneyRepository {
  /**
   * Create a new UserJourneyRepository
   * @param {Object} supabaseClient - Supabase client
   * @param {Object} logger - Logger instance
   */
  constructor(supabaseClient, logger) {
    this.supabase = supabaseClient;
    this.logger = logger;
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
    try {
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
        throw new Error(`Invalid event data: ${validationResult.error.message}`);
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
      
      // Convert to database format
      const dbEvent = userJourneyEvent.toDatabase();
      
      // Validate database format with Zod schema
      const dbValidationResult = UserJourneyEventDatabaseSchema.safeParse(dbEvent);
      if (!dbValidationResult.success) {
        this.logger.error('Database event validation failed:', { errors: dbValidationResult.error.flatten() });
        throw new Error(`Invalid database event data: ${dbValidationResult.error.message}`);
      }
      
      // Insert into database
      const { data, error } = await this.supabase
        .from('user_journey_events')
        .insert(dbEvent)
        .select()
        .single();
      
      if (error) throw error;
      
      this.logger.info(`User journey event ${eventType} recorded for ${email}`);
      
      // Return domain model instance
      return UserJourneyEvent.fromDatabase(data);
    } catch (error) {
      this.logger.error('Error recording user journey event:', error);
      throw error;
    }
  }

  /**
   * Get all events for a user
   * @param {string} email - User email
   * @param {number} limit - Optional limit of events to return
   * @returns {Promise<Array>} - List of events
   */
  async getUserEvents(email, limit = null) {
    try {
      // Validate query parameters
      const queryParams = { userEmail: email };
      if (limit !== null) {
        queryParams.limit = limit;
      }

      const validationResult = UserJourneyEventQuerySchema.safeParse(queryParams);
      if (!validationResult.success) {
        this.logger.error('Query validation failed:', { errors: validationResult.error.flatten() });
        throw new Error(`Invalid query parameters: ${validationResult.error.message}`);
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
      
      if (error) throw error;
      
      // Validate and convert to domain model instances
      return data.map(event => {
        // Validate database data
        const dbValidationResult = UserJourneyEventDatabaseSchema.safeParse(event);
        if (!dbValidationResult.success) {
          this.logger.warn('Skipping invalid event data:', { errors: dbValidationResult.error.flatten() });
          return null;
        }
        return UserJourneyEvent.fromDatabase(event);
      }).filter(Boolean); // Filter out null values
    } catch (error) {
      this.logger.error('Error getting user journey events:', error);
      throw error;
    }
  }

  /**
   * Get events for a specific challenge
   * @param {string} challengeId - Challenge ID
   * @returns {Promise<Array>} - List of events
   */
  async getChallengeEvents(challengeId) {
    try {
      // Validate parameter
      const queryParams = { challengeId };
      const validationResult = UserJourneyEventQuerySchema.safeParse(queryParams);
      if (!validationResult.success) {
        this.logger.error('Query validation failed:', { errors: validationResult.error.flatten() });
        throw new Error(`Invalid query parameters: ${validationResult.error.message}`);
      }

      // Use validated data
      const validData = validationResult.data;
      
      const { data, error } = await this.supabase
        .from('user_journey_events')
        .select('*')
        .eq('challenge_id', validData.challengeId)
        .order('timestamp', { ascending: true });
      
      if (error) throw error;
      
      // Validate and convert to domain model instances
      return data.map(event => {
        // Validate database data
        const dbValidationResult = UserJourneyEventDatabaseSchema.safeParse(event);
        if (!dbValidationResult.success) {
          this.logger.warn('Skipping invalid event data:', { errors: dbValidationResult.error.flatten() });
          return null;
        }
        return UserJourneyEvent.fromDatabase(event);
      }).filter(Boolean); // Filter out null values
    } catch (error) {
      this.logger.error('Error getting challenge events:', error);
      throw error;
    }
  }

  /**
   * Get events of a specific type for a user
   * @param {string} email - User email
   * @param {string} eventType - Type of event
   * @param {number} limit - Optional limit of events to return
   * @returns {Promise<Array>} - List of events
   */
  async getUserEventsByType(email, eventType, limit = null) {
    try {
      // Validate query parameters
      const queryParams = { userEmail: email, eventType };
      if (limit !== null) {
        queryParams.limit = limit;
      }

      const validationResult = UserJourneyEventQuerySchema.safeParse(queryParams);
      if (!validationResult.success) {
        this.logger.error('Query validation failed:', { errors: validationResult.error.flatten() });
        throw new Error(`Invalid query parameters: ${validationResult.error.message}`);
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
      
      if (error) throw error;
      
      // Validate and convert to domain model instances
      return data.map(event => {
        // Validate database data
        const dbValidationResult = UserJourneyEventDatabaseSchema.safeParse(event);
        if (!dbValidationResult.success) {
          this.logger.warn('Skipping invalid event data:', { errors: dbValidationResult.error.flatten() });
          return null;
        }
        return UserJourneyEvent.fromDatabase(event);
      }).filter(Boolean); // Filter out null values
    } catch (error) {
      this.logger.error('Error getting user events by type:', error);
      throw error;
    }
  }

  /**
   * Get event counts by type for a user
   * @param {string} email - User email
   * @returns {Promise<Object>} - Object with counts by event type
   */
  async getUserEventCountsByType(email) {
    try {
      // Validate email parameter
      const queryParams = { userEmail: email };
      const validationResult = UserJourneyEventQuerySchema.safeParse(queryParams);
      if (!validationResult.success) {
        this.logger.error('Query validation failed:', { errors: validationResult.error.flatten() });
        throw new Error(`Invalid query parameters: ${validationResult.error.message}`);
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
        
        if (eventsError) throw eventsError;
        
        // Count events by type
        const counts = {};
        events.forEach(event => {
          counts[event.event_type] = (counts[event.event_type] || 0) + 1;
        });
        
        return counts;
      }
      
      return data;
    } catch (error) {
      this.logger.error('Error getting user event counts by type:', error);
      throw error;
    }
  }
}

module.exports = UserJourneyRepository; 