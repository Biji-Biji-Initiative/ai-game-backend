/**
 * Difficulty Level Repository
 * 
 * Manages data access for difficulty level configuration.
 * Acts as the bridge between the domain model and database.
 */

const DifficultyLevel = require('../../models/config/DifficultyLevel');
const { challengeLogger } = require('../../../../core/infra/logging/domainLogger');
const { supabaseClient } = require('../../../../core/infra/db/supabaseClient');

class DifficultyLevelRepository {
  /**
   * Create a new DifficultyLevelRepository
   * @param {Object} supabase - Supabase client
   * @param {Object} logger - Logger instance
   */
  constructor(supabase, logger) {
    this.supabase = supabase || supabaseClient;
    this.tableName = 'difficulty_levels';
    this.logger = logger || challengeLogger.child('repository:difficultyLevel');
  }

  /**
   * Find all active difficulty levels
   * @returns {Promise<Array<DifficultyLevel>>} Array of difficulty levels
   */
  async findAll() {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) {
        this.logger.error('Error fetching difficulty levels', { error });
        throw new Error(`Failed to fetch difficulty levels: ${error.message}`);
      }

      return (data || []).map(record => DifficultyLevel.fromDatabase(record));
    } catch (error) {
      this.logger.error('Error in findAll', { error: error.message });
      throw error;
    }
  }

  /**
   * Find a difficulty level by its code
   * @param {string} code - Difficulty level code
   * @returns {Promise<DifficultyLevel|null>} Difficulty level or null if not found
   */
  async findByCode(code) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('code', code)
        .maybeSingle();

      if (error) {
        this.logger.error('Error fetching difficulty level by code', { code, error });
        throw new Error(`Failed to fetch difficulty level: ${error.message}`);
      }

      return data ? DifficultyLevel.fromDatabase(data) : null;
    } catch (error) {
      this.logger.error('Error in findByCode', { code, error: error.message });
      throw error;
    }
  }

  /**
   * Find a difficulty level by its ID
   * @param {string} id - Difficulty level ID
   * @returns {Promise<DifficultyLevel|null>} Difficulty level or null if not found
   */
  async findById(id) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        this.logger.error('Error fetching difficulty level by ID', { id, error });
        throw new Error(`Failed to fetch difficulty level: ${error.message}`);
      }

      return data ? DifficultyLevel.fromDatabase(data) : null;
    } catch (error) {
      this.logger.error('Error in findById', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Find difficulty levels by sort order range
   * @param {number} minOrder - Minimum sort order (inclusive)
   * @param {number} maxOrder - Maximum sort order (inclusive)
   * @returns {Promise<Array<DifficultyLevel>>} Array of difficulty levels
   */
  async findBySortOrderRange(minOrder, maxOrder) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .gte('sort_order', minOrder)
        .lte('sort_order', maxOrder)
        .eq('is_active', true)
        .order('sort_order');

      if (error) {
        this.logger.error('Error fetching difficulty levels by sort order range', { minOrder, maxOrder, error });
        throw new Error(`Failed to fetch difficulty levels: ${error.message}`);
      }

      return (data || []).map(record => DifficultyLevel.fromDatabase(record));
    } catch (error) {
      this.logger.error('Error in findBySortOrderRange', { minOrder, maxOrder, error: error.message });
      throw error;
    }
  }

  /**
   * Find easiest difficulty level
   * @returns {Promise<DifficultyLevel|null>} Easiest difficulty level or null if none found
   */
  async findEasiest() {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
        .limit(1)
        .maybeSingle();

      if (error) {
        this.logger.error('Error fetching easiest difficulty level', { error });
        throw new Error(`Failed to fetch difficulty level: ${error.message}`);
      }

      return data ? DifficultyLevel.fromDatabase(data) : null;
    } catch (error) {
      this.logger.error('Error in findEasiest', { error: error.message });
      throw error;
    }
  }

  /**
   * Find hardest difficulty level
   * @returns {Promise<DifficultyLevel|null>} Hardest difficulty level or null if none found
   */
  async findHardest() {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        this.logger.error('Error fetching hardest difficulty level', { error });
        throw new Error(`Failed to fetch difficulty level: ${error.message}`);
      }

      return data ? DifficultyLevel.fromDatabase(data) : null;
    } catch (error) {
      this.logger.error('Error in findHardest', { error: error.message });
      throw error;
    }
  }

  /**
   * Save a difficulty level
   * @param {DifficultyLevel} difficultyLevel - Difficulty level to save
   * @returns {Promise<DifficultyLevel>} Saved difficulty level
   */
  async save(difficultyLevel) {
    try {
      if (!(difficultyLevel instanceof DifficultyLevel)) {
        throw new Error('Can only save DifficultyLevel instances');
      }

      const dbData = difficultyLevel.toDatabase();
      
      // Check if this is an update or insert
      const existing = await this.findByCode(difficultyLevel.code);
      
      let result;
      if (existing) {
        // Update
        const { data, error } = await this.supabase
          .from(this.tableName)
          .update(dbData)
          .eq('id', difficultyLevel.id)
          .select()
          .single();

        if (error) {
          this.logger.error('Error updating difficulty level', { id: difficultyLevel.id, error });
          throw new Error(`Failed to update difficulty level: ${error.message}`);
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
          this.logger.error('Error creating difficulty level', { code: difficultyLevel.code, error });
          throw new Error(`Failed to create difficulty level: ${error.message}`);
        }
        
        result = data;
      }

      return DifficultyLevel.fromDatabase(result);
    } catch (error) {
      this.logger.error('Error in save', { code: difficultyLevel.code, error: error.message });
      throw error;
    }
  }

  /**
   * Delete a difficulty level
   * @param {string} code - Difficulty level code
   * @returns {Promise<boolean>} True if deleted
   */
  async delete(code) {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('code', code);

      if (error) {
        this.logger.error('Error deleting difficulty level', { code, error });
        throw new Error(`Failed to delete difficulty level: ${error.message}`);
      }

      return true;
    } catch (error) {
      this.logger.error('Error in delete', { code, error: error.message });
      throw error;
    }
  }

  /**
   * Seed the database with initial difficulty levels
   * @param {Array<Object>} difficultyLevels - Difficulty levels to seed
   * @returns {Promise<void>}
   */
  async seed(difficultyLevels) {
    try {
      // Create DifficultyLevel instances
      const levels = difficultyLevels.map(data => new DifficultyLevel(data));
      
      // Save each level
      for (const level of levels) {
        await this.save(level);
      }
      
      this.logger.info('Successfully seeded difficulty levels', { count: levels.length });
    } catch (error) {
      this.logger.error('Error seeding difficulty levels', { error: error.message });
      throw error;
    }
  }
}

module.exports = DifficultyLevelRepository; 