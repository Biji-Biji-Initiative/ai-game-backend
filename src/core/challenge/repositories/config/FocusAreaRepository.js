/**
 * Focus Area Repository
 * 
 * Manages data access for focus area configuration.
 * Acts as the bridge between the domain model and database.
 */

const FocusArea = require('../../models/config/FocusArea');
const { challengeLogger } = require('../../../../core/infra/logging/domainLogger');

class FocusAreaRepository {
  /**
   * Create a new FocusAreaRepository
   * @param {Object} supabase - Supabase client
   * @param {Object} logger - Logger instance
   */
  constructor(supabase, logger) {
    this.supabase = supabase;
    this.tableName = 'challenge_focus_areas';
    this.logger = logger || challengeLogger.child('repository:focusArea');
  }

  /**
   * Find all active focus areas
   * @returns {Promise<Array<FocusArea>>} Array of focus areas
   */
  async findAll() {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) {
        this.logger.error('Error fetching focus areas', { error });
        throw new Error(`Failed to fetch focus areas: ${error.message}`);
      }

      return (data || []).map(record => FocusArea.fromDatabase(record));
    } catch (error) {
      this.logger.error('Error in findAll', { error: error.message });
      throw error;
    }
  }

  /**
   * Find a focus area by its code
   * @param {string} code - Focus area code
   * @returns {Promise<FocusArea|null>} Focus area or null if not found
   */
  async findByCode(code) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('code', code)
        .maybeSingle();

      if (error) {
        this.logger.error('Error fetching focus area by code', { code, error });
        throw new Error(`Failed to fetch focus area: ${error.message}`);
      }

      return data ? FocusArea.fromDatabase(data) : null;
    } catch (error) {
      this.logger.error('Error in findByCode', { code, error: error.message });
      throw error;
    }
  }

  /**
   * Find a focus area by its ID
   * @param {string} id - Focus area ID
   * @returns {Promise<FocusArea|null>} Focus area or null if not found
   */
  async findById(id) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        this.logger.error('Error fetching focus area by ID', { id, error });
        throw new Error(`Failed to fetch focus area: ${error.message}`);
      }

      return data ? FocusArea.fromDatabase(data) : null;
    } catch (error) {
      this.logger.error('Error in findById', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Find focus areas with specific prerequisites
   * @param {string} prerequisiteCode - Prerequisite focus area code
   * @returns {Promise<Array<FocusArea>>} Array of focus areas
   */
  async findByPrerequisite(prerequisiteCode) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .contains('prerequisites', [prerequisiteCode])
        .eq('is_active', true);

      if (error) {
        this.logger.error('Error fetching focus areas by prerequisite', { prerequisiteCode, error });
        throw new Error(`Failed to fetch focus areas: ${error.message}`);
      }

      return (data || []).map(record => FocusArea.fromDatabase(record));
    } catch (error) {
      this.logger.error('Error in findByPrerequisite', { prerequisiteCode, error: error.message });
      throw error;
    }
  }

  /**
   * Find focus areas related to another area
   * @param {string} relatedAreaCode - Related area code
   * @returns {Promise<Array<FocusArea>>} Array of focus areas
   */
  async findByRelatedArea(relatedAreaCode) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .contains('related_areas', [relatedAreaCode])
        .eq('is_active', true);

      if (error) {
        this.logger.error('Error fetching focus areas by related area', { relatedAreaCode, error });
        throw new Error(`Failed to fetch focus areas: ${error.message}`);
      }

      return (data || []).map(record => FocusArea.fromDatabase(record));
    } catch (error) {
      this.logger.error('Error in findByRelatedArea', { relatedAreaCode, error: error.message });
      throw error;
    }
  }

  /**
   * Save a focus area
   * @param {FocusArea} focusArea - Focus area to save
   * @returns {Promise<FocusArea>} Saved focus area
   */
  async save(focusArea) {
    try {
      if (!(focusArea instanceof FocusArea)) {
        throw new Error('Can only save FocusArea instances');
      }

      const dbData = focusArea.toDatabase();
      
      // Check if this is an update or insert
      const existing = await this.findByCode(focusArea.code);
      
      let result;
      if (existing) {
        // Update
        const { data, error } = await this.supabase
          .from(this.tableName)
          .update(dbData)
          .eq('id', focusArea.id)
          .select()
          .single();

        if (error) {
          this.logger.error('Error updating focus area', { id: focusArea.id, error });
          throw new Error(`Failed to update focus area: ${error.message}`);
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
          this.logger.error('Error creating focus area', { code: focusArea.code, error });
          throw new Error(`Failed to create focus area: ${error.message}`);
        }
        
        result = data;
      }

      return FocusArea.fromDatabase(result);
    } catch (error) {
      this.logger.error('Error in save', { code: focusArea.code, error: error.message });
      throw error;
    }
  }

  /**
   * Delete a focus area
   * @param {string} code - Focus area code
   * @returns {Promise<boolean>} True if deleted
   */
  async delete(code) {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('code', code);

      if (error) {
        this.logger.error('Error deleting focus area', { code, error });
        throw new Error(`Failed to delete focus area: ${error.message}`);
      }

      return true;
    } catch (error) {
      this.logger.error('Error in delete', { code, error: error.message });
      throw error;
    }
  }

  /**
   * Seed the database with initial focus areas
   * @param {Array<Object>} focusAreas - Focus areas to seed
   * @returns {Promise<void>}
   */
  async seed(focusAreas) {
    try {
      // Create FocusArea instances
      const areas = focusAreas.map(data => new FocusArea(data));
      
      // Save each area
      for (const area of areas) {
        await this.save(area);
      }
      
      this.logger.info('Successfully seeded focus areas', { count: areas.length });
    } catch (error) {
      this.logger.error('Error seeding focus areas', { error: error.message });
      throw error;
    }
  }
}

module.exports = FocusAreaRepository; 