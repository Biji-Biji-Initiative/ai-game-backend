 /**
 * Focus Area Repository
 * Handles database operations for focus areas
 * 
 * @module focusAreaRepository
 * @requires supabaseClient
 * @requires logger
 */

const { supabaseClient } = require('../../../core/infra/db/supabaseClient');
const { logger } = require('../../../core/infra/logging/logger');
const FocusArea = require('../models/FocusArea');
const {
  FocusAreaNotFoundError,
  FocusAreaPersistenceError
} = require('../errors/focusAreaErrors');
const { eventBus } = require('../../common/events/domainEvents');

/**
 * Class representing a Focus Area Repository
 */
class FocusAreaRepository {
  /**
   * Create a new FocusAreaRepository instance
   * @param {Object} supabase - Supabase client instance
   * @param {Object} eventBus - Event bus for domain events
   */
  constructor(supabase, eventBus) {
    this.supabase = supabase || supabaseClient;
    this.eventBus = eventBus || require('../../common/events/domainEvents').eventBus;
    this._log = logger.child({ service: 'focusAreaRepository' });
  }

  /**
   * Log a message with the repository logger
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   * @private
   */
  _log(level, message, meta = {}) {
    if (this._log && typeof this._log[level] === 'function') {
      this._log[level](message, meta);
    } else {
      console[level === 'error' ? 'error' : 'log'](message, meta);
    }
  }

  /**
   * Create a new focus area
   * @param {Object} focusAreaData - Focus area data
   * @param {string} focusAreaData.userId - User ID
   * @param {string} focusAreaData.name - Focus area name
   * @param {string} [focusAreaData.description] - Focus area description
   * @param {number} [focusAreaData.priority] - Priority (1-5, 1 being highest)
   * @returns {Promise<Object>} Created focus area
   */
  async createFocusArea(focusAreaData) {
    try {
      var { userId, name, description = '', priority = 1 } = focusAreaData;
      
      if (!userId || !name) {
        throw new FocusAreaPersistenceError('User ID and name are required for focus area creation');
      }
      
      // Create a focus area domain object first (to validate)
      const focusArea = new FocusArea({
        userId,
        name,
        description,
        priority,
        metadata: focusAreaData.metadata || {}
      });
      
      // Insert into database
      const { data, error } = await this.supabase
      .from('focus_areas')
      .insert([
        {
          id: focusArea.id,
          user_id: focusArea.userId,
          name: focusArea.name,
          description: focusArea.description,
          priority: focusArea.priority,
          active: focusArea.active,
          metadata: focusArea.metadata || {}
        }
      ])
      .select('*')
      .single();
    
    if (error) {
      this._log('error', 'Error creating focus area', {
        error: error.message,
        userId,
        name
      });
      throw new FocusAreaPersistenceError(error.message);
    }
    
    // Process and publish domain events
    const domainEvents = focusArea.getDomainEvents();
    focusArea.clearDomainEvents(); // Clear to prevent duplicate publishing
    
    // Publish collected events
    for (const event of domainEvents) {
      await this.eventBus.publishEvent(event.type, event.data);
    }
    
    this._log('info', 'Created new focus area', {
      userId,
      focusAreaId: data.id,
      name,
      eventsPublished: domainEvents.length
    });
    
    return FocusArea.fromDatabase(data);
    } catch (error) {
      if (error instanceof FocusAreaPersistenceError) {
        throw error;
      }
      
      this._log('error', 'Error in createFocusArea', {
        error: error.message,
        focusAreaData
      });
      
      throw new FocusAreaPersistenceError(error.message);
    }
  }

  /**
   * Create multiple focus areas at once
   * @param {string} userId - User ID
   * @param {Array<FocusArea|Object|string>} focusAreas - Array of focus areas, objects, or strings
   * @returns {Promise<Array>} Created focus areas
   */
  async save(userId, focusAreas) {
    try {
      this._log('info', 'Saving focus areas for user', {
        userId,
        count: focusAreas ? focusAreas.length : 0
      });
      
      if (!userId || !Array.isArray(focusAreas) || focusAreas.length === 0) {
        throw new FocusAreaPersistenceError('User ID and focus areas array are required');
      }
    
      // Process input into domain objects and database records
      var focusAreaEntities = [];
      var dbRecords = [];
    
      // Transform different input types into domain objects and database records
      for (const area of focusAreas) {
        let focusAreaEntity;
        
        if (typeof area === 'string') {
          // Create from string name
          focusAreaEntity = new FocusArea({
            userId,
            name: area,
            description: '',
            active: true,
            priority: 1,
            metadata: {}
          });
        } else if (area instanceof FocusArea) {
          // Already a domain object
          focusAreaEntity = area;
        } else if (typeof area === 'object') {
          // Create from object properties
          focusAreaEntity = new FocusArea({
            userId,
            name: area.name,
            description: area.description || '',
            active: area.active !== undefined ? area.active : true,
            priority: area.priority || 1,
            metadata: area.metadata || {}
          });
        } else {
          throw new FocusAreaPersistenceError('Invalid focus area format');
        }
      
        // Store the domain object
        focusAreaEntities.push(focusAreaEntity);
        
        // Create database record from domain object
        dbRecords.push({
          id: focusAreaEntity.id,
          user_id: focusAreaEntity.userId,
          name: focusAreaEntity.name,
          description: focusAreaEntity.description || '',
          active: focusAreaEntity.active,
          priority: focusAreaEntity.priority || 1,
          metadata: focusAreaEntity.metadata || {}
        });
      }
      
      this._log('debug', 'Formatted focus areas for insertion', {
        userId,
        count: dbRecords.length
      });
    
      // Insert all records into database
      const { data, error } = await this.supabase
        .from('focus_areas')
        .insert(dbRecords)
        .select('*');
    
      if (error) {
        this._log('error', 'Error creating multiple focus areas', {
          error: error.message,
          userId,
          count: focusAreas.length
        });
        throw new FocusAreaPersistenceError(error.message);
      }
    
      // Collect and process all domain events
      const allDomainEvents = [];
      for (const entity of focusAreaEntities) {
        allDomainEvents.push(...entity.getDomainEvents());
        entity.clearDomainEvents(); // Clear to prevent duplicate publishing
      }
    
      // Publish collected events
      for (const event of allDomainEvents) {
        await eventBus.publishEvent(event.type, event.data);
      }
      
      this._log('info', 'Created multiple focus areas', {
        userId,
        count: data.length,
        eventsPublished: allDomainEvents.length
      });
    
      return data.map(fa => FocusArea.fromDatabase(fa));
    } catch (error) {
      if (error instanceof FocusAreaPersistenceError) {
        throw error;
      }
      
      this._log('error', 'Error in save', {
        error: error.message,
        userId,
        focusAreasCount: focusAreas?.length
      });
      
      throw new FocusAreaPersistenceError(error.message);
    }
  }

  /**
   * Find all focus areas for a user
   * @param {string} userId - User ID
   * @param {Object} [options] - Query options
   * @param {boolean} [options.activeOnly=true] - Only return active focus areas
   * @param {string} [options.orderBy='priority'] - Field to order by
   * @returns {Promise<Array<FocusArea>>} User's focus areas
   */
  async findByUserId(userId, options = {}) {
    try {
      if (!userId) {
        throw new FocusAreaPersistenceError('User ID is required to get focus areas');
      }
    
      var { activeOnly = true, orderBy = 'priority' } = options;
      
      let query = this.supabase
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
        this._log('error', 'Error getting focus areas for user', {
          error: error.message,
          userId
        });
        throw new FocusAreaPersistenceError(error.message);
      }
    
      return (data || []).map(fa => FocusArea.fromDatabase(fa));
    } catch (error) {
      if (error instanceof FocusAreaPersistenceError) {
        throw error;
      }
      
      this._log('error', 'Error in findByUserId', {
        error: error.message,
        userId
      });
      
      throw new FocusAreaPersistenceError(error.message);
    }
  }

  /**
   * Find a focus area by ID
   * @param {string} id - Focus area ID
   * @returns {Promise<FocusArea|null>} Focus area or null if not found
   */
  async findById(id) {
    try {
      if (!id) {
        throw new FocusAreaPersistenceError('Focus area ID is required');
      }
    
      var { data, error } = await this.supabase
        .from('focus_areas')
        .select('*')
        .eq('id', id)
        .single();
    
      if (error) {
        if (error.code === 'PGRST116') {
          // Not found error
          return null;
        }
        
        this._log('error', 'Error getting focus area by ID', {
          error: error.message,
          id
        });
        throw new FocusAreaPersistenceError(error.message);
      }
    
      return FocusArea.fromDatabase(data);
    } catch (error) {
      if (error instanceof FocusAreaPersistenceError) {
        throw error;
      }
      
      this._log('error', 'Error in findById', {
        error: error.message,
        id
      });
      
      throw new FocusAreaPersistenceError(error.message);
    }
  }

  /**
   * Update a focus area
   * @param {string} id - Focus area ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<FocusArea>} Updated focus area
   */
  async update(id, updateData) {
  try {
    if (!id) {
      throw new FocusAreaPersistenceError('Focus area ID is required for update');
    }
    
      // Find the existing focus area
      const existingFocusArea = await this.findById(id);
      if (!existingFocusArea) {
        throw new FocusAreaNotFoundError(id);
      }
    
      // Update the domain object
      existingFocusArea.update(updateData);
      
      // Update in database
      const { data, error } = await this.supabase
        .from('focus_areas')
        .update({
          name: existingFocusArea.name,
          description: existingFocusArea.description,
          active: existingFocusArea.active,
          priority: existingFocusArea.priority,
          metadata: existingFocusArea.metadata,
          updated_at: existingFocusArea.updatedAt
        })
        .eq('id', id)
        .select('*')
        .single();
      
      if (error) {
        this._log('error', 'Error updating focus area', {
          error: error.message,
          id,
          updateData
        });
        throw new FocusAreaPersistenceError(error.message);
      }
    
      // Process and publish domain events
      const domainEvents = existingFocusArea.getDomainEvents();
      existingFocusArea.clearDomainEvents(); // Clear to prevent duplicate publishing
      
      // Publish collected events
      for (const event of domainEvents) {
        await this.eventBus.publishEvent(event.type, event.data);
      }
      
      this._log('info', 'Updated focus area', {
        id,
        name: data.name,
        eventsPublished: domainEvents.length
      });
      
      return FocusArea.fromDatabase(data);
    } catch (error) {
      if (error instanceof FocusAreaPersistenceError || error instanceof FocusAreaNotFoundError) {
        throw error;
      }
      
      this._log('error', 'Error in update', {
        error: error.message,
        id,
        updateData
      });
      
      throw new FocusAreaPersistenceError(error.message);
    }
  }

  /**
   * Delete all focus areas for a user
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if successful
   */
  async deleteAllForUser(userId) {
    try {
      if (!userId) {
        throw new FocusAreaPersistenceError('User ID is required to delete focus areas');
      }
    
      // First get all focus areas to track events
      const focusAreas = await this.findByUserId(userId, { activeOnly: false });
    
      // Mark all as deactivated
      for (const focusArea of focusAreas) {
        focusArea.deactivate();
      }
      
      // Delete from database
      const { error } = await this.supabase
        .from('focus_areas')
        .delete()
        .eq('user_id', userId);
    
      if (error) {
        this._log('error', 'Error deleting focus areas for user', {
          error: error.message,
          userId
        });
        throw new FocusAreaPersistenceError(error.message);
      }
    
      // Collect all events
      const allDomainEvents = [];
      for (const entity of focusAreas) {
        allDomainEvents.push(...entity.getDomainEvents());
        entity.clearDomainEvents(); // Clear to prevent duplicate publishing
      }
      
      // Publish collected events
      for (const event of allDomainEvents) {
        await this.eventBus.publishEvent(event.type, event.data);
      }
      
      this._log('info', 'Deleted all focus areas for user', { 
        userId,
        count: focusAreas.length,
        eventsPublished: allDomainEvents.length
      });
      return true;
    } catch (error) {
      if (error instanceof FocusAreaPersistenceError) {
        throw error;
      }
      
      this._log('error', 'Error in deleteAllForUser', {
        error: error.message,
        userId
      });
      
      throw new FocusAreaPersistenceError(error.message);
    }
  }

  /**
   * Delete a focus area by ID
   * @param {string} id - Focus area ID
   * @returns {Promise<boolean>} True if successful
   */
  async deleteById(id) {
    try {
      if (!id) {
        throw new FocusAreaPersistenceError('Focus area ID is required for deletion');
      }
    
      // First get the focus area to track events
      const focusArea = await this.findById(id);
      if (!focusArea) {
        // Not found, return success since it's already deleted
        return true;
      }
    
      // Mark as deactivated
      focusArea.deactivate();
      
      // Delete from database
      const { error } = await this.supabase
        .from('focus_areas')
        .delete()
        .eq('id', id);
    
      if (error) {
        this._log('error', 'Error deleting focus area', {
          error: error.message,
          id
        });
        throw new FocusAreaPersistenceError(error.message);
      }
    
      // Process and publish domain events
      const domainEvents = focusArea.getDomainEvents();
      focusArea.clearDomainEvents(); // Clear to prevent duplicate publishing
      
      // Publish collected events
      for (const event of domainEvents) {
        await this.eventBus.publishEvent(event.type, event.data);
      }
      
      this._log('info', 'Deleted focus area', { 
        id,
        eventsPublished: domainEvents.length
      });
      return true;
    } catch (error) {
      if (error instanceof FocusAreaPersistenceError) {
        throw error;
      }
      
      this._log('error', 'Error in deleteById', {
        error: error.message,
        id
      });
      
      throw new FocusAreaPersistenceError(error.message);
    }
  }

}

module.exports = FocusAreaRepository; 