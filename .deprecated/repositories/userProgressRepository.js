/**
 * User Progress Repository
 * Handles all data operations for user progress tracking
 */
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const supabase = require('../lib/supabase');

/**
 * Create or update user progress for a focus area
 * @param {string} email - User email
 * @param {string} focusArea - Focus area
 * @param {Object} progressData - Progress data
 * @returns {Promise<Object>} - Created or updated progress
 */
const upsertUserProgress = async (email, focusArea, progressData) => {
  try {
    // Check if progress already exists for this user and focus area
    const { data: existingProgress, error: queryError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_email', email)
      .eq('focus_area', focusArea)
      .maybeSingle();
    
    if (queryError) throw queryError;
    
    // Convert camelCase to snake_case for the database
    const dbProgress = {
      user_email: email,
      focus_area: focusArea,
      skill_level: progressData.skillLevel,
      challenges_completed: progressData.challengesCompleted,
      last_challenge_id: progressData.lastChallengeId,
      streak_days: progressData.streakDays,
      last_activity_date: progressData.lastActivityDate || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    let result;
    
    if (existingProgress) {
      // Update existing progress
      const { data, error } = await supabase
        .from('user_progress')
        .update(dbProgress)
        .eq('id', existingProgress.id)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
      
      logger.info(`User progress updated for ${email} in focus area ${focusArea}`);
    } else {
      // Create new progress entry
      dbProgress.id = uuidv4();
      dbProgress.created_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('user_progress')
        .insert(dbProgress)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
      
      logger.info(`User progress created for ${email} in focus area ${focusArea}`);
    }
    
    // Transform from snake_case to camelCase for consistency in the app
    return {
      id: result.id,
      userEmail: result.user_email,
      focusArea: result.focus_area,
      skillLevel: result.skill_level,
      challengesCompleted: result.challenges_completed,
      lastChallengeId: result.last_challenge_id,
      streakDays: result.streak_days,
      lastActivityDate: result.last_activity_date,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };
  } catch (error) {
    logger.error('Error upserting user progress:', error);
    throw error;
  }
};

/**
 * Get user progress for all focus areas
 * @param {string} email - User email
 * @returns {Promise<Array>} - List of progress entries
 */
const getUserProgress = async (email) => {
  try {
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_email', email)
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    
    // Transform from snake_case to camelCase for consistency in the app
    return data.map(progress => ({
      id: progress.id,
      userEmail: progress.user_email,
      focusArea: progress.focus_area,
      skillLevel: progress.skill_level,
      challengesCompleted: progress.challenges_completed,
      lastChallengeId: progress.last_challenge_id,
      streakDays: progress.streak_days,
      lastActivityDate: progress.last_activity_date,
      createdAt: progress.created_at,
      updatedAt: progress.updated_at
    }));
  } catch (error) {
    logger.error('Error getting user progress:', error);
    throw error;
  }
};

/**
 * Get user progress for a specific focus area
 * @param {string} email - User email
 * @param {string} focusArea - Focus area
 * @returns {Promise<Object|null>} - Progress or null if not found
 */
const getUserFocusAreaProgress = async (email, focusArea) => {
  try {
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_email', email)
      .eq('focus_area', focusArea)
      .maybeSingle();
    
    if (error) throw error;
    if (!data) return null;
    
    // Transform from snake_case to camelCase for consistency in the app
    return {
      id: data.id,
      userEmail: data.user_email,
      focusArea: data.focus_area,
      skillLevel: data.skill_level,
      challengesCompleted: data.challenges_completed,
      lastChallengeId: data.last_challenge_id,
      streakDays: data.streak_days,
      lastActivityDate: data.last_activity_date,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    logger.error('Error getting user focus area progress:', error);
    throw error;
  }
};

/**
 * Update user streak
 * @param {string} email - User email
 * @param {string} focusArea - Focus area
 * @param {number} streakDays - New streak count
 * @returns {Promise<Object|null>} - Updated progress or null if not found
 */
const updateUserStreak = async (email, focusArea, streakDays) => {
  try {
    const { data: existingProgress, error: queryError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_email', email)
      .eq('focus_area', focusArea)
      .maybeSingle();
    
    if (queryError) throw queryError;
    if (!existingProgress) return null;
    
    const { data, error } = await supabase
      .from('user_progress')
      .update({
        streak_days: streakDays,
        last_activity_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', existingProgress.id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Transform from snake_case to camelCase for consistency in the app
    return {
      id: data.id,
      userEmail: data.user_email,
      focusArea: data.focus_area,
      skillLevel: data.skill_level,
      challengesCompleted: data.challenges_completed,
      lastChallengeId: data.last_challenge_id,
      streakDays: data.streak_days,
      lastActivityDate: data.last_activity_date,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    logger.error('Error updating user streak:', error);
    throw error;
  }
};

module.exports = {
  upsertUserProgress,
  getUserProgress,
  getUserFocusAreaProgress,
  updateUserStreak
};
