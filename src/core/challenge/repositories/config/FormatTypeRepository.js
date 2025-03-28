/**
 * Format Type Repository
 * 
 * Manages data access for format type configuration.
 * Acts as the bridge between the domain model and database.
 */

const FormatType = require('../../models/config/FormatType');
const { challengeLogger } = require('../../../../core/infra/logging/domainLogger');
const { supabaseClient } = require('../../../../core/infra/db/supabaseClient');

class FormatTypeRepository {
  /**
   * Create a new FormatTypeRepository
   * @param {Object} supabase - Supabase client
   * @param {Object} logger - Logger instance
   */
  constructor(supabase, logger) {
    this.supabase = supabase || supabaseClient;
    this.tableName = 'format_types';
    this.logger = logger || challengeLogger.child('repository:formatType');
  }

  /**
   * Find all active format types
   * @returns {Promise<Array<FormatType>>} Array of format types
   */
  async findAll() {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('is_active', true)
        .order('code');

      if (error) {
        this.logger.error('Error fetching format types', { error });
        throw new Error(`Failed to fetch format types: ${error.message}`);
      }

      return (data || []).map(record => FormatType.fromDatabase(record));
    } catch (error) {
      this.logger.error('Error in findAll', { error: error.message });
      throw error;
    }
  }

  /**
   * Find a format type by its code
   * @param {string} code - Format type code
   * @returns {Promise<FormatType|null>} Format type or null if not found
   */
  async findByCode(code) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('code', code)
        .maybeSingle();

      if (error) {
        this.logger.error('Error fetching format type by code', { code, error });
        throw new Error(`Failed to fetch format type: ${error.message}`);
      }

      return data ? FormatType.fromDatabase(data) : null;
    } catch (error) {
      this.logger.error('Error in findByCode', { code, error: error.message });
      throw error;
    }
  }

  /**
   * Find a format type by its ID
   * @param {string} id - Format type ID
   * @returns {Promise<FormatType|null>} Format type or null if not found
   */
  async findById(id) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        this.logger.error('Error fetching format type by ID', { id, error });
        throw new Error(`Failed to fetch format type: ${error.message}`);
      }

      return data ? FormatType.fromDatabase(data) : null;
    } catch (error) {
      this.logger.error('Error in findById', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Find format types by response format
   * @param {string} responseFormat - Response format (e.g., 'open-text')
   * @returns {Promise<Array<FormatType>>} Array of format types
   */
  async findByResponseFormat(responseFormat) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('response_format', responseFormat)
        .eq('is_active', true);

      if (error) {
        this.logger.error('Error fetching format types by response format', { responseFormat, error });
        throw new Error(`Failed to fetch format types: ${error.message}`);
      }

      return (data || []).map(record => FormatType.fromDatabase(record));
    } catch (error) {
      this.logger.error('Error in findByResponseFormat', { responseFormat, error: error.message });
      throw error;
    }
  }

  /**
   * Save a format type
   * @param {FormatType} formatType - Format type to save
   * @returns {Promise<FormatType>} Saved format type
   */
  async save(formatType) {
    try {
      if (!(formatType instanceof FormatType)) {
        throw new Error('Can only save FormatType instances');
      }

      const dbData = formatType.toDatabase();
      
      // Check if this is an update or insert
      const existing = await this.findByCode(formatType.code);
      
      let result;
      if (existing) {
        // Update
        const { data, error } = await this.supabase
          .from(this.tableName)
          .update(dbData)
          .eq('id', formatType.id)
          .select()
          .single();

        if (error) {
          this.logger.error('Error updating format type', { id: formatType.id, error });
          throw new Error(`Failed to update format type: ${error.message}`);
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
          this.logger.error('Error creating format type', { code: formatType.code, error });
          throw new Error(`Failed to create format type: ${error.message}`);
        }
        
        result = data;
      }

      return FormatType.fromDatabase(result);
    } catch (error) {
      this.logger.error('Error in save', { code: formatType.code, error: error.message });
      throw error;
    }
  }

  /**
   * Delete a format type
   * @param {string} code - Format type code
   * @returns {Promise<boolean>} True if deleted
   */
  async delete(code) {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('code', code);

      if (error) {
        this.logger.error('Error deleting format type', { code, error });
        throw new Error(`Failed to delete format type: ${error.message}`);
      }

      return true;
    } catch (error) {
      this.logger.error('Error in delete', { code, error: error.message });
      throw error;
    }
  }

  /**
   * Seed the database with initial format types
   * @param {Array<Object>} formatTypes - Format types to seed
   * @returns {Promise<void>}
   */
  async seed(formatTypes) {
    try {
      // Create FormatType instances
      const types = formatTypes.map(data => new FormatType(data));
      
      // Save each type
      for (const type of types) {
        await this.save(type);
      }
      
      this.logger.info('Successfully seeded format types', { count: types.length });
    } catch (error) {
      this.logger.error('Error seeding format types', { error: error.message });
      throw error;
    }
  }
}

module.exports = FormatTypeRepository; 