/**
 * Focus Area Repository
 * Handles database operations for focus areas
 * 
 * @module focusAreaRepository
 * @requires supabase
 * @requires logger
 */

const supabase = require('../lib/supabase');
const logger = require('../utils/logger');

/**
 * Create a new focus area
 * @param {Object} focusAreaData - Focus area data
 * @param {string} focusAreaData.userId - User ID
 * @param {string} focusAreaData.name - Focus area name
 * @param {string} [focusAreaData.description] - Focus area description
 * @param {number} [focusAreaData.priority] - Priority (1-5, 1 being highest)
 * @returns {Promise<Object>} Created focus area
 */
const createFocusArea = async (focusAreaData) => {
  try {
    const { userId, name, description = '', priority = 1 } = focusAreaData;
    
    if (!userId || !name) {
      throw new Error('User ID and name are required for focus area creation');
    }
    
    const { data, error } = await supabase
      .from('focus_areas')
      .insert([
        {
          user_id: userId,
          name,
          description,
          priority,
          active: true,
          metadata: focusAreaData.metadata || {}
        }
      ])
      .select('*')
      .single();
    
    if (error) {
      logger.error('Error creating focus area', {
        error: error.message,
        userId,
        name
      });
      throw error;
    }
    
    logger.info('Created new focus area', {
      userId,
      focusAreaId: data.id,
      name
    });
    
    return data;
  } catch (error) {
    logger.error('Error in createFocusArea', {
      error: error.message,
      focusAreaData
    });
    throw error;
  }
};

/**
 * Create multiple focus areas at once
 * @param {string} userId - User ID
 * @param {Array<Object|string>} focusAreas - Array of focus areas or strings
 * @returns {Promise<Array>} Created focus areas
 */
const createFocusAreas = async (userId, focusAreas) => {
  try {
    console.log('createFocusAreas called with userId:', userId);
    console.log('focusAreas count:', focusAreas ? focusAreas.length : 0);
    
    if (!userId || !Array.isArray(focusAreas) || focusAreas.length === 0) {
      throw new Error('User ID and focus areas array are required');
    }
    
    // Check if userId is a valid UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    console.log('Is userId a valid UUID?', isUUID);
    
    // For test users (non-UUID), we need to:
    // 1. Check if a user with this ID exists
    // 2. If not, create a temporary user first
    let actualUserId = userId;
    
    if (!isUUID) {
      logger.info('Non-UUID user ID detected, checking if this is a test user', { userId });
      
      // First, check if we already created a temporary user for this test ID
      const { data: existingTempUsers } = await supabase
        .from('users')
        .select('id')
        .eq('email', `${userId}@example.com`)
        .limit(1);
      
      if (existingTempUsers && existingTempUsers.length > 0) {
        // Use the existing temporary user
        actualUserId = existingTempUsers[0].id;
        logger.info('Found existing temporary user for test ID', { testId: userId, actualUserId });
      } else {
        // Create a temporary user
        const { v4: uuidv4 } = require('uuid');
        const newUserId = uuidv4();
        
        const tempUser = {
          id: newUserId,
          email: `${userId}@example.com`,
          full_name: `Test User ${userId}`,
          professional_title: 'Test User',
          personality_traits: {},
          ai_attitudes: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        logger.info('Creating temporary user for test ID', { testId: userId, newUserId });
        
        const { error: userError } = await supabase
          .from('users')
          .insert([tempUser]);
        
        if (userError) {
          logger.error('Error creating temporary user', { error: userError.message, testId: userId });
          throw new Error(`Failed to create temporary user: ${userError.message}`);
        }
        
        actualUserId = newUserId;
        logger.info('Created temporary user for test ID', { testId: userId, actualUserId });
      }
    }
    
    // Transform any string focus areas into objects
    const formattedFocusAreas = focusAreas.map(area => {
      if (typeof area === 'string') {
        return {
          user_id: actualUserId,
          name: area,
          description: '',
          relevance_score: null,
          relevance_explanation: null,
          suggested_challenges: null,
          skill_progression: null,
          is_selected: false,
          ai_generated: true,
          generation_thread_id: null,
          active: true,
          priority: 1,
          metadata: {}
        };
      } else if (typeof area === 'object') {
        // Get name from OpenAI's response format which might be nested
        const areaName = area.name || 
                        (area.title || 'Unnamed Focus Area');
        
        // Get description, which might be in different locations depending on format
        const description = area.description || '';
        
        // Get strategies, which might be named differently depending on format
        const strategies = area.improvementStrategies || 
                          area.strategies ||
                          [];
        
        // Get challenges, which might be named differently depending on format
        const challenges = area.recommendedChallengeTypes || 
                          area.challenges ||
                          [];
                          
        // Get rationale, which might be named differently depending on format
        const rationale = area.rationale || '';
        
        // Get priority level, which might be named differently depending on format
        const priorityLevel = area.priorityLevel || 'medium';
        
        // Convert priority level to number
        let priorityNum = 1;
        if (priorityLevel === 'high') priorityNum = 1;
        else if (priorityLevel === 'medium') priorityNum = 2;
        else if (priorityLevel === 'low') priorityNum = 3;
        
        // Build metadata from the OpenAI response
        const metadata = {
          strategies: strategies,
          challenges: challenges,
          rationale: rationale,
          priorityLevel: priorityLevel,
          ...(area.metadata || {})
        };
        
        return {
          user_id: actualUserId,
          name: areaName,
          description: description,
          relevance_score: typeof area.relevance_score === 'number' ? area.relevance_score : null,
          relevance_explanation: area.relevance_explanation || rationale,
          suggested_challenges: challenges.length > 0 ? challenges : null,
          skill_progression: null,
          is_selected: area.is_selected || false,
          ai_generated: area.ai_generated !== undefined ? area.ai_generated : true,
          generation_thread_id: area.generation_thread_id || null,
          active: area.active !== undefined ? area.active : true,
          priority: area.priority || priorityNum,
          metadata: metadata
        };
      }
    });
    
    logger.debug('Formatted focus areas for insertion', {
      userId,
      actualUserId,
      count: formattedFocusAreas.length
    });
    
    const { data, error } = await supabase
      .from('focus_areas')
      .insert(formattedFocusAreas)
      .select('*');
    
    if (error) {
      logger.error('Error creating multiple focus areas', {
        error: error.message,
        userId,
        actualUserId,
        count: focusAreas.length
      });
      throw error;
    }
    
    logger.info('Created multiple focus areas', {
      userId,
      actualUserId,
      count: data.length
    });
    
    return data;
  } catch (error) {
    logger.error('Error in createFocusAreas', {
      error: error.message,
      userId,
      focusAreasCount: focusAreas?.length
    });
    throw error;
  }
};

/**
 * Get all focus areas for a user
 * @param {string} userId - User ID
 * @param {Object} [options] - Query options
 * @param {boolean} [options.activeOnly=true] - Only return active focus areas
 * @param {string} [options.orderBy='priority'] - Field to order by
 * @returns {Promise<Array>} User's focus areas
 */
const getFocusAreasByUserId = async (userId, options = {}) => {
  try {
    if (!userId) {
      throw new Error('User ID is required to get focus areas');
    }
    
    const { activeOnly = true, orderBy = 'priority' } = options;
    
    let query = supabase
      .from('focus_areas')
      .select('*')
      .eq('user_id', userId);
    
    if (activeOnly) {
      query = query.eq('active', true);
    }
    
    if (orderBy) {
      query = query.order(orderBy, { ascending: true });
    }
    
    const { data, error } = await query;
    
    if (error) {
      logger.error('Error getting focus areas for user', {
        error: error.message,
        userId
      });
      throw error;
    }
    
    return data || [];
  } catch (error) {
    logger.error('Error in getFocusAreasByUserId', {
      error: error.message,
      userId
    });
    throw error;
  }
};

/**
 * Get a focus area by ID
 * @param {string} focusAreaId - Focus area ID
 * @returns {Promise<Object|null>} Focus area or null if not found
 */
const getFocusAreaById = async (focusAreaId) => {
  try {
    if (!focusAreaId) {
      throw new Error('Focus area ID is required');
    }
    
    const { data, error } = await supabase
      .from('focus_areas')
      .select('*')
      .eq('id', focusAreaId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // Not found error
        return null;
      }
      
      logger.error('Error getting focus area by ID', {
        error: error.message,
        focusAreaId
      });
      throw error;
    }
    
    return data;
  } catch (error) {
    logger.error('Error in getFocusAreaById', {
      error: error.message,
      focusAreaId
    });
    throw error;
  }
};

/**
 * Update a focus area
 * @param {string} focusAreaId - Focus area ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated focus area
 */
const updateFocusArea = async (focusAreaId, updateData) => {
  try {
    if (!focusAreaId) {
      throw new Error('Focus area ID is required for update');
    }
    
    const { data, error } = await supabase
      .from('focus_areas')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', focusAreaId)
      .select('*')
      .single();
    
    if (error) {
      logger.error('Error updating focus area', {
        error: error.message,
        focusAreaId,
        updateData
      });
      throw error;
    }
    
    logger.info('Updated focus area', {
      focusAreaId,
      name: data.name
    });
    
    return data;
  } catch (error) {
    logger.error('Error in updateFocusArea', {
      error: error.message,
      focusAreaId,
      updateData
    });
    throw error;
  }
};

/**
 * Delete all focus areas for a user
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if successful
 */
const deleteFocusAreasForUser = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required to delete focus areas');
    }
    
    const { error } = await supabase
      .from('focus_areas')
      .delete()
      .eq('user_id', userId);
    
    if (error) {
      logger.error('Error deleting focus areas for user', {
        error: error.message,
        userId
      });
      throw error;
    }
    
    logger.info('Deleted all focus areas for user', { userId });
    return true;
  } catch (error) {
    logger.error('Error in deleteFocusAreasForUser', {
      error: error.message,
      userId
    });
    throw error;
  }
};

/**
 * Delete a focus area by ID
 * @param {string} focusAreaId - Focus area ID
 * @returns {Promise<boolean>} True if successful
 */
const deleteFocusArea = async (focusAreaId) => {
  try {
    if (!focusAreaId) {
      throw new Error('Focus area ID is required for deletion');
    }
    
    const { error } = await supabase
      .from('focus_areas')
      .delete()
      .eq('id', focusAreaId);
    
    if (error) {
      logger.error('Error deleting focus area', {
        error: error.message,
        focusAreaId
      });
      throw error;
    }
    
    logger.info('Deleted focus area', { focusAreaId });
    return true;
  } catch (error) {
    logger.error('Error in deleteFocusArea', {
      error: error.message,
      focusAreaId
    });
    throw error;
  }
};

module.exports = {
  createFocusArea,
  createFocusAreas,
  getFocusAreasByUserId,
  getFocusAreaById,
  updateFocusArea,
  deleteFocusAreasForUser,
  deleteFocusArea
};
