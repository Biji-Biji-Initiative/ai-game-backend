/**
 * Challenge Type Repository
 * 
 * Manages data access for challenge type configuration.
 * Acts as the bridge between the domain model and database.
 */

const ChallengeType = require('../../models/config/ChallengeType');
const { challengeLogger } = require('../../../../core/infra/logging/domainLogger');

class ChallengeTypeRepository {
  /**
   * Create a new ChallengeTypeRepository
   * @param {Object} supabase - Supabase client
   * @param {Object} logger - Logger instance
   */
  constructor(supabase, logger) {
    this.supabase = supabase;
    this.tableName = 'challenge_types';
    this.logger = logger || challengeLogger.child('repository:challengeType');
  }

  /**
   * Find all active challenge types
   * @returns {Promise<Array<ChallengeType>>} Array of challenge types
   */
  async findAll() {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('is_active', true)
        .order('code');

      if (error) {
        this.logger.error('Error fetching challenge types', { error });
        throw new Error(`Failed to fetch challenge types: ${error.message}`);
      }

      return (data || []).map(record => ChallengeType.fromDatabase(record));
    } catch (error) {
      this.logger.error('Error in findAll', { error: error.message });
      throw error;
    }
  }

  /**
   * Find a challenge type by its code
   * @param {string} code - Challenge type code
   * @returns {Promise<ChallengeType|null>} Challenge type or null if not found
   */
  async findByCode(code) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('code', code)
        .maybeSingle();

      if (error) {
        this.logger.error('Error fetching challenge type by code', { code, error });
        throw new Error(`Failed to fetch challenge type: ${error.message}`);
      }

      return data ? ChallengeType.fromDatabase(data) : null;
    } catch (error) {
      this.logger.error('Error in findByCode', { code, error: error.message });
      throw error;
    }
  }

  /**
   * Find a challenge type by its ID
   * @param {string} id - Challenge type ID
   * @returns {Promise<ChallengeType|null>} Challenge type or null if not found
   */
  async findById(id) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        this.logger.error('Error fetching challenge type by ID', { id, error });
        throw new Error(`Failed to fetch challenge type: ${error.message}`);
      }

      return data ? ChallengeType.fromDatabase(data) : null;
    } catch (error) {
      this.logger.error('Error in findById', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Find challenge types that support a specific format
   * @param {string} formatCode - Format type code
   * @returns {Promise<Array<ChallengeType>>} Array of challenge types
   */
  async findByFormatType(formatCode) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .contains('format_types', [formatCode])
        .eq('is_active', true);

      if (error) {
        this.logger.error('Error fetching challenge types by format', { formatCode, error });
        throw new Error(`Failed to fetch challenge types: ${error.message}`);
      }

      return (data || []).map(record => ChallengeType.fromDatabase(record));
    } catch (error) {
      this.logger.error('Error in findByFormatType', { formatCode, error: error.message });
      throw error;
    }
  }

  /**
   * Find challenge types related to a focus area
   * @param {string} focusAreaCode - Focus area code
   * @returns {Promise<Array<ChallengeType>>} Array of challenge types
   */
  async findByFocusArea(focusAreaCode) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .contains('focus_areas', [focusAreaCode])
        .eq('is_active', true);

      if (error) {
        this.logger.error('Error fetching challenge types by focus area', { focusAreaCode, error });
        throw new Error(`Failed to fetch challenge types: ${error.message}`);
      }

      return (data || []).map(record => ChallengeType.fromDatabase(record));
    } catch (error) {
      this.logger.error('Error in findByFocusArea', { focusAreaCode, error: error.message });
      throw error;
    }
  }

  /**
   * Save a challenge type
   * @param {ChallengeType} challengeType - Challenge type to save
   * @returns {Promise<ChallengeType>} Saved challenge type
   */
  async save(challengeType) {
    try {
      if (!(challengeType instanceof ChallengeType)) {
        throw new Error('Can only save ChallengeType instances');
      }

      const dbData = challengeType.toDatabase();
      
      // Check if this is an update or insert
      const existing = await this.findByCode(challengeType.code);
      
      let result;
      if (existing) {
        // Update
        const { data, error } = await this.supabase
          .from(this.tableName)
          .update(dbData)
          .eq('id', challengeType.id)
          .select()
          .single();

        if (error) {
          this.logger.error('Error updating challenge type', { id: challengeType.id, error });
          throw new Error(`Failed to update challenge type: ${error.message}`);
        }
        
        result = data;
      } else {
        // Insert
        const { data, error } = await this.supabase
          .from(this.tableName)
          .insert(dbData)
          .select()
          .single();

        if (error) {
          this.logger.error('Error creating challenge type', { code: challengeType.code, error });
          throw new Error(`Failed to create challenge type: ${error.message}`);
        }
        
        result = data;
      }

      return ChallengeType.fromDatabase(result);
    } catch (error) {
      this.logger.error('Error in save', { code: challengeType.code, error: error.message });
      throw error;
    }
  }

  /**
   * Delete a challenge type
   * @param {string} code - Challenge type code
   * @returns {Promise<boolean>} True if deleted
   */
  async delete(code) {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('code', code);

      if (error) {
        this.logger.error('Error deleting challenge type', { code, error });
        throw new Error(`Failed to delete challenge type: ${error.message}`);
      }

      return true;
    } catch (error) {
      this.logger.error('Error in delete', { code, error: error.message });
      throw error;
    }
  }

  /**
   * Seed the database with initial challenge types
   * @param {Array<Object>} challengeTypes - Challenge types to seed
   * @returns {Promise<void>}
   */
  async seed(challengeTypes) {
    try {
      // Create ChallengeType instances
      const types = challengeTypes.map(data => new ChallengeType(data));
      
      // Save each type
      for (const type of types) {
        await this.save(type);
      }
      
      this.logger.info('Successfully seeded challenge types', { count: types.length });
    } catch (error) {
      this.logger.error('Error seeding challenge types', { error: error.message });
      throw error;
    }
  }
}

module.exports = ChallengeTypeRepository; 