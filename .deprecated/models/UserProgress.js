/**
 * UserProgress Model
 * Defines the schema and methods for user progress tracking in Supabase
 * 
 * @module UserProgress
 */

const supabase = require('../lib/supabase');
const logger = require('../utils/logger');

/**
 * UserProgress Schema Definition
 * This represents the structure of the 'user_progress' table in Supabase
 * 
 * CREATE TABLE user_progress (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   user_id UUID NOT NULL REFERENCES users(id),
 *   focus_area TEXT NOT NULL,
 *   skill_level INTEGER NOT NULL DEFAULT 1,
 *   challenges_completed INTEGER NOT NULL DEFAULT 0,
 *   last_challenge_id UUID REFERENCES challenges(id),
 *   streak_days INTEGER NOT NULL DEFAULT 0,
 *   last_activity_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 */

/**
 * UserProgress class for interacting with the user_progress table in Supabase
 */
class UserProgress {
  /**
   * Find progress record by ID
   * @param {string} id - Progress record ID
   * @returns {Promise<Object|null>} Progress object or null if not found
   * @throws {Error} If database query fails
   */
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      logger.error(`Error finding progress by ID: ${error.message}`, { id, error });
      throw new Error(`Failed to find progress: ${error.message}`);
    }
  }
  
  /**
   * Find all progress records for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of progress objects
   * @throws {Error} If database query fails
   */
  static async findByUserId(userId) {
    try {
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .order('focus_area', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error(`Error finding progress by user ID: ${error.message}`, { userId, error });
      throw new Error(`Failed to find progress records: ${error.message}`);
    }
  }
  
  /**
   * Find progress for a specific focus area
   * @param {string} userId - User ID
   * @param {string} focusArea - Focus area
   * @returns {Promise<Object|null>} Progress object or null if not found
   * @throws {Error} If database query fails
   */
  static async findByUserIdAndFocusArea(userId, focusArea) {
    try {
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('focus_area', focusArea)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" errors
      return data;
    } catch (error) {
      logger.error(`Error finding progress by user ID and focus area: ${error.message}`, { userId, focusArea, error });
      throw new Error(`Failed to find progress: ${error.message}`);
    }
  }
  
  /**
   * Create or update a progress record
   * @param {Object} progressData - Progress data
   * @returns {Promise<Object>} Created or updated progress object
   * @throws {Error} If database operation fails
   */
  static async upsert(progressData) {
    try {
      // Validate required fields
      if (!progressData.user_id) throw new Error('User ID is required');
      if (!progressData.focus_area) throw new Error('Focus area is required');
      
      // Check if record already exists
      const { data: existing } = await supabase
        .from('user_progress')
        .select('id')
        .eq('user_id', progressData.user_id)
        .eq('focus_area', progressData.focus_area)
        .maybeSingle();
      
      const now = new Date().toISOString();
      
      if (existing) {
        // Update existing record
        const { data, error } = await supabase
          .from('user_progress')
          .update({
            skill_level: progressData.skill_level || 1,
            challenges_completed: progressData.challenges_completed || 0,
            last_challenge_id: progressData.last_challenge_id,
            streak_days: progressData.streak_days || 0,
            last_activity_date: progressData.last_activity_date || now,
            updated_at: now
          })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Create new record
        const { data, error } = await supabase
          .from('user_progress')
          .insert({
            user_id: progressData.user_id,
            focus_area: progressData.focus_area,
            skill_level: progressData.skill_level || 1,
            challenges_completed: progressData.challenges_completed || 0,
            last_challenge_id: progressData.last_challenge_id,
            streak_days: progressData.streak_days || 0,
            last_activity_date: progressData.last_activity_date || now,
            created_at: now,
            updated_at: now
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    } catch (error) {
      logger.error(`Error upserting progress: ${error.message}`, { progressData, error });
      throw new Error(`Failed to upsert progress: ${error.message}`);
    }
  }
  
  /**
   * Update user streak for a focus area
   * @param {string} userId - User ID
   * @param {string} focusArea - Focus area
   * @param {number} streakDays - New streak count
   * @returns {Promise<Object>} Updated progress object
   * @throws {Error} If database operation fails
   */
  static async updateStreak(userId, focusArea, streakDays) {
    try {
      if (!userId) throw new Error('User ID is required');
      if (!focusArea) throw new Error('Focus area is required');
      if (typeof streakDays !== 'number') throw new Error('Streak days must be a number');
      
      const now = new Date().toISOString();
      
      // Update or create if not exists
      return await UserProgress.upsert({
        user_id: userId,
        focus_area: focusArea,
        streak_days: streakDays,
        last_activity_date: now
      });
    } catch (error) {
      logger.error(`Error updating streak: ${error.message}`, { userId, focusArea, streakDays, error });
      throw new Error(`Failed to update streak: ${error.message}`);
    }
  }
  
  /**
   * Increment challenges completed count
   * @param {string} userId - User ID
   * @param {string} focusArea - Focus area
   * @param {string} challengeId - Last completed challenge ID
   * @returns {Promise<Object>} Updated progress object
   * @throws {Error} If database operation fails
   */
  static async incrementChallengesCompleted(userId, focusArea, challengeId) {
    try {
      if (!userId) throw new Error('User ID is required');
      if (!focusArea) throw new Error('Focus area is required');
      if (!challengeId) throw new Error('Challenge ID is required');
      
      // Get current progress
      const current = await UserProgress.findByUserIdAndFocusArea(userId, focusArea);
      
      const now = new Date().toISOString();
      
      // Calculate new values
      const challengesCompleted = current ? (current.challenges_completed + 1) : 1;
      
      // Check if streak should be incremented
      let streakDays = current ? current.streak_days : 0;
      const lastActivityDate = current ? new Date(current.last_activity_date) : null;
      const today = new Date();
      
      // If last activity was yesterday or earlier today, increment streak
      if (!lastActivityDate || 
          today.toDateString() === lastActivityDate.toDateString() ||
          (today.getDate() - lastActivityDate.getDate() === 1)) {
        streakDays++;
      } else if (today.getDate() - lastActivityDate.getDate() > 1) {
        // If more than a day has passed, reset streak
        streakDays = 1;
      }
      
      // Update progress
      return await UserProgress.upsert({
        user_id: userId,
        focus_area: focusArea,
        challenges_completed: challengesCompleted,
        last_challenge_id: challengeId,
        streak_days: streakDays,
        last_activity_date: now
      });
    } catch (error) {
      logger.error(`Error incrementing challenges completed: ${error.message}`, { userId, focusArea, challengeId, error });
      throw new Error(`Failed to increment challenges completed: ${error.message}`);
    }
  }
  
  /**
   * Get user performance summary across all focus areas
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Performance summary
   * @throws {Error} If database operation fails
   */
  static async getUserPerformanceSummary(userId) {
    try {
      if (!userId) throw new Error('User ID is required');
      
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return {
          totalChallengesCompleted: 0,
          currentStreak: 0,
          longestStreak: 0,
          focusAreas: 0
        };
      }
      
      // Calculate summary statistics
      const totalChallengesCompleted = data.reduce((sum, p) => sum + p.challenges_completed, 0);
      const currentStreak = Math.max(...data.map(p => p.streak_days), 0);
      const focusAreas = data.length;
      
      return {
        totalChallengesCompleted,
        currentStreak,
        focusAreas
      };
    } catch (error) {
      logger.error(`Error getting user performance summary: ${error.message}`, { userId, error });
      throw new Error(`Failed to get performance summary: ${error.message}`);
    }
  }
}

module.exports = UserProgress;
