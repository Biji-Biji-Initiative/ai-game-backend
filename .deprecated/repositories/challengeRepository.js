/**
 * Challenge Repository
 * 
 * Handles database operations for challenges using Supabase
 * 
 * @module challengeRepository
 * @requires supabase
 * @requires logger
 * @requires Challenge
 * @requires challengeDbMapper
 */

const { supabase } = require('../utils/supabase');
const logger = require('../utils/logger');
const Challenge = require('../core/challenge/models/Challenge');
const challengeDbMapper = require('../utils/db/challengeDbMapper');

// Table name in Supabase
const CHALLENGES_TABLE = 'challenges';

/**
 * Create a new challenge in the database
 * @param {Challenge|Object} challenge - Challenge instance or object
 * @returns {Promise<Challenge>} Created challenge
 */
async function createChallenge(challenge) {
  try {
    // Convert to database format
    const dbRecord = challengeDbMapper.toDbRecord(challenge);
    
    logger.info('Creating challenge in database', { 
      userEmail: dbRecord.user_email,
      challengeType: dbRecord.challenge_type
    });
    
    // Insert into Supabase
    const { data, error } = await supabase
      .from(CHALLENGES_TABLE)
      .insert(dbRecord)
      .select()
      .single();
    
    if (error) {
      logger.error('Error creating challenge in database', { error: error.message });
      throw new Error(`Failed to create challenge: ${error.message}`);
    }
    
    logger.info('Challenge created successfully', { id: data.id });
    
    // Convert back to domain model
    return challengeDbMapper.toModel(data);
  } catch (error) {
    logger.error('Error in createChallenge', { error: error.message });
    throw error;
  }
}

/**
 * Get a challenge by ID
 * @param {string} id - Challenge ID
 * @returns {Promise<Challenge|null>} Challenge or null if not found
 */
async function getChallengeById(id) {
  try {
    logger.debug('Getting challenge by ID', { id });
    
    const { data, error } = await supabase
      .from(CHALLENGES_TABLE)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // Not found error
        logger.info('Challenge not found', { id });
        return null;
      }
      
      logger.error('Error getting challenge by ID', { id, error: error.message });
      throw new Error(`Failed to get challenge: ${error.message}`);
    }
    
    // Convert to domain model
    return challengeDbMapper.toModel(data);
  } catch (error) {
    logger.error('Error in getChallengeById', { id, error: error.message });
    throw error;
  }
}

/**
 * Get challenges for a user
 * @param {string} userEmail - User email
 * @returns {Promise<Array<Challenge>>} List of challenges
 */
async function getChallengesForUser(userEmail) {
  try {
    logger.debug('Getting challenges for user', { userEmail });
    
    const { data, error } = await supabase
      .from(CHALLENGES_TABLE)
      .select('*')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false });
    
    if (error) {
      logger.error('Error getting challenges for user', { userEmail, error: error.message });
      throw new Error(`Failed to get challenges for user: ${error.message}`);
    }
    
    // Convert to domain models
    return challengeDbMapper.toModelList(data);
  } catch (error) {
    logger.error('Error in getChallengesForUser', { userEmail, error: error.message });
    throw error;
  }
}

/**
 * Get user's most recent challenges
 * @param {string} userEmail - User email
 * @param {number} limit - Maximum number of challenges to return
 * @returns {Promise<Array<Challenge>>} List of recent challenges
 */
async function getRecentChallengesForUser(userEmail, limit = 5) {
  try {
    logger.debug('Getting recent challenges for user', { userEmail, limit });
    
    const { data, error } = await supabase
      .from(CHALLENGES_TABLE)
      .select('*')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      logger.error('Error getting recent challenges for user', { 
        userEmail, 
        limit, 
        error: error.message 
      });
      throw new Error(`Failed to get recent challenges: ${error.message}`);
    }
    
    // Convert to domain models
    return challengeDbMapper.toModelList(data);
  } catch (error) {
    logger.error('Error in getRecentChallengesForUser', { userEmail, error: error.message });
    throw error;
  }
}

/**
 * Update a challenge
 * @param {string} id - Challenge ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Challenge|null>} Updated challenge or null if not found
 */
async function updateChallenge(id, updates) {
  try {
    logger.info('Updating challenge', { id, updateFields: Object.keys(updates) });
    
    // Convert updates to database format
    const dbUpdates = challengeDbMapper.convertUpdatesToDbFormat(updates);
    
    // Update in Supabase
    const { data, error } = await supabase
      .from(CHALLENGES_TABLE)
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      logger.error('Error updating challenge', { id, error: error.message });
      throw new Error(`Failed to update challenge: ${error.message}`);
    }
    
    logger.info('Challenge updated successfully', { id });
    
    // Convert to domain model
    return challengeDbMapper.toModel(data);
  } catch (error) {
    logger.error('Error in updateChallenge', { id, error: error.message });
    throw error;
  }
}

/**
 * Delete a challenge by ID
 * @param {string} id - Challenge ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
async function deleteChallenge(id) {
  try {
    logger.info('Deleting challenge', { id });
    
    const { error } = await supabase
      .from(CHALLENGES_TABLE)
      .delete()
      .eq('id', id);
    
    if (error) {
      logger.error('Error deleting challenge', { id, error: error.message });
      throw new Error(`Failed to delete challenge: ${error.message}`);
    }
    
    logger.info('Challenge deleted successfully', { id });
    
    return true;
  } catch (error) {
    logger.error('Error in deleteChallenge', { id, error: error.message });
    throw error;
  }
}

/**
 * Get challenges by focus area
 * @param {string} focusArea - Focus area
 * @param {number} limit - Maximum number of challenges to return
 * @returns {Promise<Array<Challenge>>} List of challenges
 */
async function getChallengesByFocusArea(focusArea, limit = 10) {
  try {
    logger.debug('Getting challenges by focus area', { focusArea, limit });
    
    const { data, error } = await supabase
      .from(CHALLENGES_TABLE)
      .select('*')
      .eq('focus_area', focusArea)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      logger.error('Error getting challenges by focus area', { 
        focusArea, 
        limit, 
        error: error.message 
      });
      throw new Error(`Failed to get challenges by focus area: ${error.message}`);
    }
    
    // Convert to domain models
    return challengeDbMapper.toModelList(data);
  } catch (error) {
    logger.error('Error in getChallengesByFocusArea', { focusArea, error: error.message });
    throw error;
  }
}

/**
 * Get user's challenge history with evaluation data
 * @param {string} userEmail - User email
 * @param {number} limit - Optional limit of challenges to return
 * @returns {Promise<Array>} Challenge history
 */
async function getUserChallengeHistory(userEmail, limit = null) {
  try {
    logger.debug('Getting user challenge history', { userEmail, limit });
    
    let query = supabase
      .from(CHALLENGES_TABLE)
      .select('*')
      .eq('user_email', userEmail)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false });
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const { data, error } = await query;
    
    if (error) {
      logger.error('Error getting user challenge history', { 
        userEmail, 
        limit, 
        error: error.message 
      });
      throw new Error(`Failed to get user challenge history: ${error.message}`);
    }
    
    // Convert to domain models
    return challengeDbMapper.toModelList(data);
  } catch (error) {
    logger.error('Error in getUserChallengeHistory', { userEmail, error: error.message });
    throw error;
  }
}

module.exports = {
  createChallenge,
  getChallengeById,
  getChallengesForUser,
  getRecentChallengesForUser,
  updateChallenge,
  deleteChallenge,
  getChallengesByFocusArea,
  getUserChallengeHistory
};
