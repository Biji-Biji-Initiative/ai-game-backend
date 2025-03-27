/**
 * User Journey Repository
 * Handles all data operations for user journey events and analytics
 */
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../../../core/infra/logging/logger');
const supabase = require('../../../lib/supabase');
const UserJourneyEvent = require('../models/UserJourneyEvent');

/**
 * Record a user journey event
 * @param {string} email - User email
 * @param {string} eventType - Type of event
 * @param {Object} eventData - Additional event data
 * @param {string} challengeId - Optional associated challenge ID
 * @returns {Promise<Object>} - Created event
 */
const recordEvent = async (email, eventType, eventData = {}, challengeId = null) => {
  try {
    // Create domain model instance
    const userJourneyEvent = new UserJourneyEvent({
      id: uuidv4(),
      userEmail: email,
      eventType,
      eventData,
      challengeId,
      timestamp: new Date().toISOString()
    });
    
    // Convert to database format
    const dbEvent = userJourneyEvent.toDatabase();
    
    // Insert into database
    const { data, error } = await supabase
      .from('user_journey_events')
      .insert(dbEvent)
      .select()
      .single();
    
    if (error) throw error;
    
    logger.info(`User journey event ${eventType} recorded for ${email}`);
    
    // Return domain model instance
    return UserJourneyEvent.fromDatabase(data);
  } catch (error) {
    logger.error('Error recording user journey event:', error);
    throw error;
  }
};

/**
 * Get all events for a user
 * @param {string} email - User email
 * @param {number} limit - Optional limit of events to return
 * @returns {Promise<Array>} - List of events
 */
const getUserEvents = async (email, limit = null) => {
  try {
    let query = supabase
      .from('user_journey_events')
      .select('*')
      .eq('user_email', email)
      .order('timestamp', { ascending: false });
    
    // Apply limit if specified
    if (limit && typeof limit === 'number') {
      query = query.limit(limit);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Convert to domain model instances
    return data.map(event => UserJourneyEvent.fromDatabase(event));
  } catch (error) {
    logger.error('Error getting user journey events:', error);
    throw error;
  }
};

/**
 * Get events for a specific challenge
 * @param {string} challengeId - Challenge ID
 * @returns {Promise<Array>} - List of events
 */
const getChallengeEvents = async (challengeId) => {
  try {
    const { data, error } = await supabase
      .from('user_journey_events')
      .select('*')
      .eq('challenge_id', challengeId)
      .order('timestamp', { ascending: true });
    
    if (error) throw error;
    
    // Convert to domain model instances
    return data.map(event => UserJourneyEvent.fromDatabase(event));
  } catch (error) {
    logger.error('Error getting challenge events:', error);
    throw error;
  }
};

/**
 * Get events of a specific type for a user
 * @param {string} email - User email
 * @param {string} eventType - Type of event
 * @param {number} limit - Optional limit of events to return
 * @returns {Promise<Array>} - List of events
 */
const getUserEventsByType = async (email, eventType, limit = null) => {
  try {
    let query = supabase
      .from('user_journey_events')
      .select('*')
      .eq('user_email', email)
      .eq('event_type', eventType)
      .order('timestamp', { ascending: false });
    
    // Apply limit if specified
    if (limit && typeof limit === 'number') {
      query = query.limit(limit);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Convert to domain model instances
    return data.map(event => UserJourneyEvent.fromDatabase(event));
  } catch (error) {
    logger.error('Error getting user events by type:', error);
    throw error;
  }
};

/**
 * Get event counts by type for a user
 * @param {string} email - User email
 * @returns {Promise<Object>} - Object with counts by event type
 */
const getUserEventCountsByType = async (email) => {
  try {
    // PostgreSQL query using Supabase's raw SQL capabilities
    const { data, error } = await supabase.rpc('count_user_events_by_type', {
      user_email_param: email
    });
    
    if (error) {
      // If the stored procedure doesn't exist, fallback to JS implementation
      logger.warn('RPC function not available, using fallback method', { error: error.message });
      
      // Get all events for the user
      const { data: events, error: eventsError } = await supabase
        .from('user_journey_events')
        .select('event_type')
        .eq('user_email', email);
      
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
    logger.error('Error getting user event counts by type:', error);
    throw error;
  }
};

class UserJourneyRepository {
  constructor() {
    // Instance methods just forward to module functions
    this.recordEvent = recordEvent;
    this.getUserEvents = getUserEvents;
    this.getChallengeEvents = getChallengeEvents;
    this.getUserEventsByType = getUserEventsByType;
    this.getUserEventCountsByType = getUserEventCountsByType;
  }
}

module.exports = new UserJourneyRepository(); 