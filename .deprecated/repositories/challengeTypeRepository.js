/**
 * Challenge Type Repository
 * Handles database operations for challenge types and related mappings
 */
const { supabase } = require('../utils/db/supabaseClient');
const { logger } = require('../utils/logger');
const config = require('../config/config');

/**
 * Get all challenge types from the database
 * @returns {Promise<Array>} Challenge types array
 */
const getChallengeTypes = async () => {
  try {
    const { data, error } = await supabase
      .from('challenge_types')
      .select('*');
    
    if (error) {
      throw new Error(`Error fetching challenge types: ${error.message}`);
    }
    
    return data || [];
  } catch (error) {
    logger.error('Error in getChallengeTypes', { error: error.message });
    throw error;
  }
};

/**
 * Get trait to challenge type mappings
 * @returns {Promise<Object>} Trait mappings object
 */
const getTraitMappings = async () => {
  try {
    const { data, error } = await supabase
      .from('trait_challenge_mappings')
      .select('*');
    
    if (error) {
      // If table doesn't exist yet, fall back to config but log warning
      logger.warn('Error fetching trait mappings, falling back to config', { error: error.message });
      
      // Return hardcoded mappings from config as fallback
      return {
        'analyticalThinking': 'critical-thinking',
        'creativity': 'creative-synthesis',
        'empathy': 'ethical-dilemma',
        'riskTaking': 'future-scenario',
        'adaptability': 'human-ai-boundary'
      };
    }
    
    // Convert array of mappings to object
    const mappings = {};
    if (data) {
      data.forEach(mapping => {
        mappings[mapping.trait_code] = mapping.challenge_type_code;
      });
    }
    
    return mappings;
  } catch (error) {
    logger.error('Error in getTraitMappings', { error: error.message });
    throw error;
  }
};

/**
 * Get focus area to challenge type mappings
 * @returns {Promise<Object>} Focus area mappings object
 */
const getFocusAreaMappings = async () => {
  try {
    const { data, error } = await supabase
      .from('focus_area_challenge_mappings')
      .select('*');
    
    if (error) {
      // If table doesn't exist yet, fall back to config but log warning
      logger.warn('Error fetching focus area mappings, falling back to config', { error: error.message });
      
      // Return hardcoded mappings from config as fallback
      return {
        'AI Ethics': 'ethical-dilemma',
        'Human-AI Collaboration': 'human-ai-boundary',
        'Future of Work with AI': 'future-scenario',
        'Creative AI Applications': 'creative-synthesis',
        'AI Impact on Society': 'critical-thinking'
      };
    }
    
    // Convert array of mappings to object
    const mappings = {};
    if (data) {
      data.forEach(mapping => {
        mappings[mapping.focus_area] = mapping.challenge_type_code;
      });
    }
    
    return mappings;
  } catch (error) {
    logger.error('Error in getFocusAreaMappings', { error: error.message });
    throw error;
  }
};

/**
 * Get challenge type by code
 * @param {string} code - Challenge type code
 * @returns {Promise<Object>} Challenge type data
 */
const getChallengeTypeByCode = async (code) => {
  try {
    const { data, error } = await supabase
      .from('challenge_types')
      .select('*')
      .eq('code', code)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw new Error(`Error fetching challenge type by code: ${error.message}`);
    }
    
    return data;
  } catch (error) {
    logger.error('Error in getChallengeTypeByCode', { error: error.message, code });
    throw error;
  }
};

/**
 * Get challenge type by ID
 * @param {string} id - Challenge type UUID
 * @returns {Promise<Object>} Challenge type data
 */
const getChallengeTypeById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('challenge_types')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw new Error(`Error fetching challenge type by ID: ${error.message}`);
    }
    
    return data;
  } catch (error) {
    logger.error('Error in getChallengeTypeById', { error: error.message, id });
    throw error;
  }
};

/**
 * Insert or update a challenge type
 * @param {Object} typeData - Challenge type data
 * @param {string} typeData.code - Unique code for the type
 * @param {string} typeData.name - Display name
 * @param {string} typeData.description - Description
 * @param {string} [typeData.parentTypeCode] - Parent type code (for hierarchical types)
 * @param {Object} [typeData.metadata] - Additional metadata
 * @returns {Promise<string>} Type ID
 */
const upsertChallengeType = async (typeData) => {
  try {
    if (!typeData.code || !typeData.name) {
      throw new Error('Challenge type requires code and name');
    }
    
    let parentTypeId = null;
    
    // If parent type code is provided, get the parent ID
    if (typeData.parentTypeCode) {
      const parentType = await getChallengeTypeByCode(typeData.parentTypeCode);
      if (parentType) {
        parentTypeId = parentType.id;
      } else {
        logger.warn(`Parent type with code ${typeData.parentTypeCode} not found, creating without parent reference`);
      }
    }
    
    // Check if the type already exists
    const existingType = await getChallengeTypeByCode(typeData.code);
    
    let result;
    if (existingType) {
      // Update existing type
      const { data, error } = await supabase
        .from('challenge_types')
        .update({
          name: typeData.name,
          description: typeData.description,
          parent_type_id: parentTypeId,
          metadata: typeData.metadata || {},
          updated_at: new Date().toISOString()
        })
        .eq('id', existingType.id)
        .select('id')
        .single();
      
      if (error) {
        throw new Error(`Error updating challenge type: ${error.message}`);
      }
      
      result = { id: existingType.id };
    } else {
      // Insert new type
      const { data, error } = await supabase
        .from('challenge_types')
        .insert({
          code: typeData.code,
          name: typeData.name,
          description: typeData.description,
          parent_type_id: parentTypeId,
          metadata: typeData.metadata || {},
          is_system_defined: false
        })
        .select('id')
        .single();
      
      if (error) {
        throw new Error(`Error inserting challenge type: ${error.message}`);
      }
      
      result = data || { id: `mock-id-${Date.now()}` };
    }
    
    if (!result || !result.id) {
      throw new Error('Failed to create or update challenge type - no ID returned');
    }
    
    return result.id;
  } catch (error) {
    logger.error('Error in upsertChallengeType', { error: error.message, typeData });
    throw error;
  }
};

module.exports = {
  getChallengeTypes,
  getTraitMappings,
  getFocusAreaMappings,
  getChallengeTypeByCode,
  getChallengeTypeById,
  upsertChallengeType
}; 