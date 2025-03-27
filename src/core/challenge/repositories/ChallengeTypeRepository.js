/**
 * Challenge Type Repository
 * 
 * Repository implementation for challenge type entities.
 * This replaces the old flat-file repository with a proper DDD-compliant repository.
 */
const { supabaseClient } = require('../../infra/db/supabaseClient');
const { logger } = require('../../infra/logging/logger');

class ChallengeTypeRepository {
  constructor(dbClient = supabaseClient) {
    this.dbClient = dbClient;
    this.tableName = 'challenge_types';
  }

  /**
   * Get all challenge types
   * @returns {Promise<Array>} Array of challenge types
   */
  async getChallengeTypes() {
    try {
      const { data, error } = await this.dbClient
        .from(this.tableName)
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        logger.error('Error getting challenge types', { error });
        throw new Error(`Failed to get challenge types: ${error.message}`);
      }
      
      return data || [];
    } catch (error) {
      logger.error('Error in getChallengeTypes', { error: error.message });
      throw error;
    }
  }

  /**
   * Get challenge type by ID
   * @param {string} id - Challenge type ID
   * @returns {Promise<Object|null>} Challenge type or null if not found
   */
  async getChallengeTypeById(id) {
    try {
      const { data, error } = await this.dbClient
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // Record not found error
          return null;
        }
        
        logger.error('Error getting challenge type by ID', { error, id });
        throw new Error(`Failed to get challenge type: ${error.message}`);
      }
      
      return data;
    } catch (error) {
      logger.error('Error in getChallengeTypeById', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Get challenge type by code
   * @param {string} code - Challenge type code
   * @returns {Promise<Object|null>} Challenge type or null if not found
   */
  async getChallengeTypeByCode(code) {
    try {
      const { data, error } = await this.dbClient
        .from(this.tableName)
        .select('*')
        .eq('code', code)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // Record not found error
          return null;
        }
        
        logger.error('Error getting challenge type by code', { error, code });
        throw new Error(`Failed to get challenge type: ${error.message}`);
      }
      
      return data;
    } catch (error) {
      logger.error('Error in getChallengeTypeByCode', { error: error.message, code });
      throw error;
    }
  }

  /**
   * Create or update a challenge type
   * @param {Object} challengeType - Challenge type data
   * @returns {Promise<string>} Challenge type ID
   */
  async upsertChallengeType(challengeType) {
    try {
      if (!challengeType) {
        throw new Error('Challenge type data is required');
      }
      
      if (!challengeType.code) {
        throw new Error('Challenge type code is required');
      }
      
      // Check if this challenge type exists
      const existingType = challengeType.id 
        ? await this.getChallengeTypeById(challengeType.id)
        : await this.getChallengeTypeByCode(challengeType.code);
      
      // Prepare data for insert/update
      const typeData = {
        name: challengeType.name || 'Unnamed Challenge Type',
        code: challengeType.code,
        description: challengeType.description || '',
        parent_type_id: challengeType.parentTypeId || null,
        metadata: challengeType.metadata || {},
        trait_mappings: challengeType.traitMappings || {},
        focus_area_mappings: challengeType.focusAreaMappings || {},
        updated_at: new Date().toISOString()
      };
      
      if (existingType) {
        // Update existing type
        typeData.id = existingType.id;
        
        const { error } = await this.dbClient
          .from(this.tableName)
          .update(typeData)
          .eq('id', existingType.id);
        
        if (error) {
          logger.error('Error updating challenge type', { error, typeData });
          throw new Error(`Failed to update challenge type: ${error.message}`);
        }
        
        return existingType.id;
      } else {
        // Create new type
        typeData.created_at = new Date().toISOString();
        
        const { data, error } = await this.dbClient
          .from(this.tableName)
          .insert(typeData)
          .select('id')
          .single();
        
        if (error) {
          logger.error('Error creating challenge type', { error, typeData });
          throw new Error(`Failed to create challenge type: ${error.message}`);
        }
        
        return data.id;
      }
    } catch (error) {
      logger.error('Error in upsertChallengeType', { error: error.message });
      throw error;
    }
  }

  /**
   * Get trait mappings for challenge types
   * @returns {Promise<Object>} Trait to challenge type mappings
   */
  async getTraitMappings() {
    try {
      // Get all challenge types
      const challengeTypes = await this.getChallengeTypes();
      
      // Combine all trait mappings
      const mappings = {};
      
      challengeTypes.forEach(type => {
        if (type.trait_mappings && typeof type.trait_mappings === 'object') {
          Object.entries(type.trait_mappings).forEach(([trait, value]) => {
            if (value) {
              mappings[trait] = type.code;
            }
          });
        }
      });
      
      return mappings;
    } catch (error) {
      logger.error('Error in getTraitMappings', { error: error.message });
      return {};
    }
  }

  /**
   * Get focus area mappings for challenge types
   * @returns {Promise<Object>} Focus area to challenge type mappings
   */
  async getFocusAreaMappings() {
    try {
      // Get all challenge types
      const challengeTypes = await this.getChallengeTypes();
      
      // Combine all focus area mappings
      const mappings = {};
      
      challengeTypes.forEach(type => {
        if (type.focus_area_mappings && typeof type.focus_area_mappings === 'object') {
          Object.entries(type.focus_area_mappings).forEach(([focusArea, value]) => {
            if (value) {
              mappings[focusArea] = type.code;
            }
          });
        }
      });
      
      return mappings;
    } catch (error) {
      logger.error('Error in getFocusAreaMappings', { error: error.message });
      return {};
    }
  }
}

module.exports = ChallengeTypeRepository; 