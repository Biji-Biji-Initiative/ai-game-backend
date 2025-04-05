import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
'use strict';

/**
 * Repository for badge persistence using Supabase
 * Handles storage and retrieval of badge entities and collections
 */
class SupabaseBadgeRepository {
  /**
   * Create a new SupabaseBadgeRepository
   * @param {Object} config - Configuration for the repository
   * @param {string} config.supabaseUrl - Supabase URL
   * @param {string} config.supabaseKey - Supabase API key
   * @param {string} [config.badgesTable='badges'] - Table name for badges
   * @param {string} [config.collectionsTable='badge_collections'] - Table name for badge collections
   * @param {string} [config.userStatsTable='user_stats'] - Table name for user statistics
   * @param {Object} [config.logger] - Logger instance
   */
  constructor(config) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    this.badgesTable = config.badgesTable || 'badges';
    this.collectionsTable = config.collectionsTable || 'badge_collections';
    this.userStatsTable = config.userStatsTable || 'user_stats';
    this.logger = config.logger || console;
  }

  /**
   * Get all available badges
   * @returns {Promise<Array<Object>>} All badges
   */
  async getAllBadges() {
    try {
      const { data, error } = await this.supabase
        .from(this.badgesTable)
        .select('*')
        .order('category')
        .order('tier');
      
      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (error) {
      this.logger.error('Error getting all badges', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get a badge by ID
   * @param {string} badgeId - ID of the badge to retrieve
   * @returns {Promise<Object>} Retrieved badge
   */
  async getBadgeById(badgeId) {
    try {
      const { data, error } = await this.supabase
        .from(this.badgesTable)
        .select('*')
        .eq('id', badgeId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw error;
      }
      
      return data;
    } catch (error) {
      this.logger.error('Error getting badge by ID', {
        badgeId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get a user's badge collection
   * @param {string} userId - ID of the user
   * @returns {Promise<Object>} User's badge collection
   */
  async getBadgeCollectionByUserId(userId) {
    try {
      const { data, error } = await this.supabase
        .from(this.collectionsTable)
        .select('*')
        .eq('userId', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw error;
      }
      
      return data;
    } catch (error) {
      this.logger.error('Error getting badge collection by user ID', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Save a badge collection
   * @param {Object} collection - Badge collection to save
   * @returns {Promise<Object>} Saved badge collection
   */
  async saveBadgeCollection(collection) {
    try {
      // Ensure collection has an ID
      if (!collection.id) {
        collection.id = uuidv4();
      }
      
      // Ensure timestamps are set
      if (!collection.createdAt) {
        collection.createdAt = new Date().toISOString();
      }
      collection.updatedAt = new Date().toISOString();
      
      const { data, error } = await this.supabase
        .from(this.collectionsTable)
        .upsert(collection, { onConflict: 'id' })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      this.logger.error('Error saving badge collection', {
        userId: collection.userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get user completion count for a specific metric
   * @param {string} userId - ID of the user
   * @param {string} metric - Metric to count (e.g., 'challenges', 'focus_memory')
   * @returns {Promise<number>} Completion count
   */
  async getUserCompletionCount(userId, metric) {
    try {
      const { data, error } = await this.supabase
        .from(this.userStatsTable)
        .select('*')
        .eq('userId', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw error;
      }
      
      if (!data) {
        return 0;
      }
      
      // Parse metric path (e.g., 'challenges.memory' -> data.challenges.memory)
      const metricPath = metric.split('.');
      let value = data;
      
      for (const key of metricPath) {
        if (value && typeof value === 'object' && key in value) {
          value = value[key];
        } else {
          return 0;
        }
      }
      
      return typeof value === 'number' ? value : 0;
    } catch (error) {
      this.logger.error('Error getting user completion count', {
        userId,
        metric,
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Get user streak days
   * @param {string} userId - ID of the user
   * @returns {Promise<number>} Streak days
   */
  async getUserStreakDays(userId) {
    try {
      const { data, error } = await this.supabase
        .from(this.userStatsTable)
        .select('streak_days')
        .eq('userId', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw error;
      }
      
      return data?.streak_days || 0;
    } catch (error) {
      this.logger.error('Error getting user streak days', {
        userId,
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Get user rival victories
   * @param {string} userId - ID of the user
   * @returns {Promise<number>} Rival victories
   */
  async getUserRivalVictories(userId) {
    try {
      const { data, error } = await this.supabase
        .from(this.userStatsTable)
        .select('rival_victories')
        .eq('userId', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw error;
      }
      
      return data?.rival_victories || 0;
    } catch (error) {
      this.logger.error('Error getting user rival victories', {
        userId,
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Get user perfect rounds
   * @param {string} userId - ID of the user
   * @returns {Promise<number>} Perfect rounds
   */
  async getUserPerfectRounds(userId) {
    try {
      const { data, error } = await this.supabase
        .from(this.userStatsTable)
        .select('perfect_rounds')
        .eq('userId', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw error;
      }
      
      return data?.perfect_rounds || 0;
    } catch (error) {
      this.logger.error('Error getting user perfect rounds', {
        userId,
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Get user history for badge recommendations
   * @param {string} userId - ID of the user
   * @returns {Promise<Object>} User history
   */
  async getUserHistory(userId) {
    try {
      const { data, error } = await this.supabase
        .from(this.userStatsTable)
        .select('*')
        .eq('userId', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw error;
      }
      
      if (!data) {
        return {
          completedChallenges: 0,
          averageScore: 0,
          focusAreas: [],
          strengths: [],
          weaknesses: [],
          streakDays: 0
        };
      }
      
      return {
        completedChallenges: data.completed_challenges || 0,
        averageScore: data.average_score || 0,
        focusAreas: data.focus_areas || [],
        strengths: data.strengths || [],
        weaknesses: data.weaknesses || [],
        streakDays: data.streak_days || 0
      };
    } catch (error) {
      this.logger.error('Error getting user history', {
        userId,
        error: error.message
      });
      throw error;
    }
  }
}

export default SupabaseBadgeRepository;
