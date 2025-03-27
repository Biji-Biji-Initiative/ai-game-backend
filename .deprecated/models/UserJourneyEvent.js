/**
 * UserJourneyEvent Model
 * Defines the schema and methods for user journey event tracking in Supabase
 * 
 * @module UserJourneyEvent
 */

const supabase = require('../lib/supabase');
const logger = require('../utils/logger');

/**
 * UserJourneyEvent Schema Definition
 * This represents the structure of the 'user_journey_events' table in Supabase
 * 
 * CREATE TABLE user_journey_events (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   user_id UUID NOT NULL REFERENCES users(id),
 *   event_type TEXT NOT NULL,
 *   event_data JSONB NOT NULL DEFAULT '{}',
 *   challenge_id UUID REFERENCES challenges(id),
 *   response_id UUID REFERENCES responses(id),
 *   thread_id TEXT,
 *   message_id TEXT,
 *   timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 */

/**
 * UserJourneyEvent class for interacting with the user_journey_events table in Supabase
 */
class UserJourneyEvent {
  /**
   * Record a user journey event
   * @param {Object} eventData - Event data
   * @returns {Promise<Object>} Created event object
   * @throws {Error} If database operation fails
   */
  static async recordEvent(eventData) {
    try {
      // Validate required fields
      if (!eventData.user_id) throw new Error('User ID is required');
      if (!eventData.event_type) throw new Error('Event type is required');
      
      const { data, error } = await supabase
        .from('user_journey_events')
        .insert({
          user_id: eventData.user_id,
          event_type: eventData.event_type,
          event_data: eventData.event_data || {},
          challenge_id: eventData.challenge_id || null,
          response_id: eventData.response_id || null,
          thread_id: eventData.thread_id || null,
          message_id: eventData.message_id || null,
          timestamp: eventData.timestamp || new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      
      logger.info(`User journey event recorded: ${eventData.event_type}`, {
        userId: eventData.user_id,
        eventType: eventData.event_type
      });
      
      return data;
    } catch (error) {
      logger.error(`Error recording user journey event: ${error.message}`, { eventData, error });
      throw new Error(`Failed to record event: ${error.message}`);
    }
  }
  
  /**
   * Find events by user ID
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of results
   * @param {string} options.eventType - Filter by event type
   * @returns {Promise<Array>} Array of event objects
   * @throws {Error} If database query fails
   */
  static async findByUserId(userId, options = {}) {
    try {
      if (!userId) throw new Error('User ID is required');
      
      let query = supabase
        .from('user_journey_events')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });
      
      // Apply event type filter
      if (options.eventType) {
        query = query.eq('event_type', options.eventType);
      }
      
      // Apply limit
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error(`Error finding events by user ID: ${error.message}`, { userId, options, error });
      throw new Error(`Failed to find events: ${error.message}`);
    }
  }
  
  /**
   * Find events by challenge ID
   * @param {string} challengeId - Challenge ID
   * @returns {Promise<Array>} Array of event objects
   * @throws {Error} If database query fails
   */
  static async findByChallengeId(challengeId) {
    try {
      if (!challengeId) throw new Error('Challenge ID is required');
      
      const { data, error } = await supabase
        .from('user_journey_events')
        .select('*')
        .eq('challenge_id', challengeId)
        .order('timestamp', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error(`Error finding events by challenge ID: ${error.message}`, { challengeId, error });
      throw new Error(`Failed to find events: ${error.message}`);
    }
  }
  
  /**
   * Get event counts by type for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Object with counts by event type
   * @throws {Error} If database query fails
   */
  static async getEventCountsByType(userId) {
    try {
      if (!userId) throw new Error('User ID is required');
      
      const { data, error } = await supabase
        .from('user_journey_events')
        .select('event_type')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return {};
      }
      
      // Count events by type
      const counts = {};
      data.forEach(event => {
        const type = event.event_type;
        counts[type] = (counts[type] || 0) + 1;
      });
      
      return counts;
    } catch (error) {
      logger.error(`Error getting event counts by type: ${error.message}`, { userId, error });
      throw new Error(`Failed to get event counts: ${error.message}`);
    }
  }
  
  /**
   * Get user's recent activity timeline
   * @param {string} userId - User ID
   * @param {number} limit - Maximum number of events to return
   * @returns {Promise<Array>} Array of event objects with related data
   * @throws {Error} If database query fails
   */
  static async getUserActivityTimeline(userId, limit = 10) {
    try {
      if (!userId) throw new Error('User ID is required');
      
      const { data, error } = await supabase
        .from('user_journey_events')
        .select(`
          *,
          challenges(id, title, focus_area, difficulty),
          responses(id, text)
        `)
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error(`Error getting user activity timeline: ${error.message}`, { userId, limit, error });
      throw new Error(`Failed to get activity timeline: ${error.message}`);
    }
  }
}

module.exports = UserJourneyEvent;
