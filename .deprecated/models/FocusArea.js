/**
 * FocusArea Model
 * Defines the schema and methods for user focus areas in Supabase
 * 
 * @module FocusArea
 */

const supabase = require('../lib/supabase');
const logger = require('../utils/logger');

/**
 * FocusArea Schema Definition
 * This represents the structure of the 'focus_areas' table in Supabase
 * 
 * CREATE TABLE focus_areas (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   user_id UUID NOT NULL REFERENCES users(id),
 *   name TEXT NOT NULL,
 *   description TEXT,
 *   relevance_score NUMERIC,
 *   relevance_explanation TEXT,
 *   suggested_challenges JSONB,
 *   skill_progression JSONB,
 *   is_selected BOOLEAN,
 *   ai_generated BOOLEAN,
 *   generation_thread_id TEXT,
 *   active BOOLEAN DEFAULT TRUE,
 *   priority INTEGER DEFAULT 1,
 *   metadata JSONB DEFAULT '{}'::JSONB,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 */

/**
 * FocusArea class for interacting with the focus_areas table in Supabase
 */
class FocusArea {
  /**
   * Find a focus area by ID
   * @param {string} id - Focus area ID
   * @returns {Promise<Object|null>} Focus area object or null if not found
   * @throws {Error} If database query fails
   */
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('focus_areas')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      logger.error(`Error finding focus area by ID: ${error.message}`, { id, error });
      throw new Error(`Failed to find focus area: ${error.message}`);
    }
  }
  
  /**
   * Find focus areas by user ID
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @param {boolean} [options.activeOnly=true] - Only return active focus areas
   * @param {string} [options.orderBy='priority'] - Field to order by
   * @returns {Promise<Array>} Array of focus area objects
   * @throws {Error} If database query fails
   */
  static async findByUserId(userId, options = {}) {
    try {
      let query = supabase
        .from('focus_areas')
        .select('*')
        .eq('user_id', userId);
      
      // Apply active filter
      const { activeOnly = true, orderBy = 'priority' } = options;
      if (activeOnly) {
        query = query.eq('active', true);
      }
      
      if (orderBy) {
        query = query.order(orderBy, { ascending: true });
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error(`Error finding focus areas by user ID: ${error.message}`, { userId, options, error });
      throw new Error(`Failed to find focus areas: ${error.message}`);
    }
  }
  
  /**
   * Create a new focus area
   * @param {Object} focusAreaData - Focus area data
   * @returns {Promise<Object>} Created focus area object
   * @throws {Error} If focus area creation fails
   */
  static async create(focusAreaData) {
    try {
      // Validate required fields
      if (!focusAreaData.user_id) throw new Error('User ID is required');
      if (!focusAreaData.name) throw new Error('Name is required');
      
      // Get current highest priority for this user
      const { data: existingAreas, error: priorityError } = await supabase
        .from('focus_areas')
        .select('priority')
        .eq('user_id', focusAreaData.user_id)
        .eq('active', true)
        .order('priority', { ascending: false })
        .limit(1);
      
      if (priorityError) throw priorityError;
      
      // Set priority (default to 1 if no existing areas)
      const priority = existingAreas && existingAreas.length > 0 && existingAreas[0].priority
        ? (existingAreas[0].priority + 1) 
        : 1;
      
      // Prepare data for insertion
      const insertData = {
        user_id: focusAreaData.user_id,
        name: focusAreaData.name,
        description: focusAreaData.description || '',
        relevance_score: focusAreaData.relevance_score,
        relevance_explanation: focusAreaData.relevance_explanation,
        suggested_challenges: focusAreaData.suggested_challenges || null,
        skill_progression: focusAreaData.skill_progression || null,
        is_selected: focusAreaData.is_selected || false,
        ai_generated: focusAreaData.ai_generated || true,
        generation_thread_id: focusAreaData.generation_thread_id || null,
        active: focusAreaData.active !== undefined ? focusAreaData.active : true,
        priority: focusAreaData.priority || priority,
        metadata: focusAreaData.metadata || {}
      };
      
      const { data, error } = await supabase
        .from('focus_areas')
        .insert([insertData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      logger.error(`Error creating focus area: ${error.message}`, { focusAreaData, error });
      throw new Error(`Failed to create focus area: ${error.message}`);
    }
  }
  
  /**
   * Create multiple focus areas in a batch
   * @param {Array<Object|string>} focusAreas - Array of focus area objects or strings
   * @param {string} userId - User ID for all focus areas
   * @param {string} [threadId] - Generation thread ID for all focus areas
   * @returns {Promise<Array>} Array of created focus area objects
   * @throws {Error} If batch creation fails
   */
  static async createBatch(focusAreas, userId, threadId = null) {
    try {
      if (!Array.isArray(focusAreas) || focusAreas.length === 0) {
        throw new Error('Focus areas array is required and must not be empty');
      }
      if (!userId) throw new Error('User ID is required');
      
      // Get current highest priority for this user
      const { data: existingAreas, error: priorityError } = await supabase
        .from('focus_areas')
        .select('priority')
        .eq('user_id', userId)
        .eq('active', true)
        .order('priority', { ascending: false })
        .limit(1);
      
      if (priorityError) throw priorityError;
      
      // Set starting priority (default to 1 if no existing areas)
      let nextPriority = existingAreas && existingAreas.length > 0 && existingAreas[0].priority
        ? (existingAreas[0].priority + 1) 
        : 1;
      
      // Prepare batch insert data
      const batchData = focusAreas.map(area => {
        // Handle string inputs (just focus area names)
        if (typeof area === 'string') {
          return {
            user_id: userId,
            name: area,
            description: '',
            ai_generated: true,
            generation_thread_id: threadId,
            active: true,
            priority: nextPriority++,
            metadata: {}
          };
        }
        
        // Handle object inputs
        const priority = area.priority || nextPriority++;
        return {
          user_id: userId,
          name: area.name || (area.title || 'Unnamed Focus Area'),
          description: area.description || '',
          relevance_score: area.relevance_score || null,
          relevance_explanation: area.relevance_explanation || null,
          suggested_challenges: area.suggested_challenges || null,
          skill_progression: area.skill_progression || null,
          is_selected: area.is_selected || false,
          ai_generated: area.ai_generated !== undefined ? area.ai_generated : true,
          generation_thread_id: area.generation_thread_id || threadId,
          active: area.active !== undefined ? area.active : true,
          priority: priority,
          metadata: area.metadata || {}
        };
      });
      
      const { data, error } = await supabase
        .from('focus_areas')
        .insert(batchData)
        .select();
      
      if (error) throw error;
      return data;
    } catch (error) {
      logger.error(`Error creating batch focus areas: ${error.message}`, { userId, threadId, error });
      throw new Error(`Failed to create batch focus areas: ${error.message}`);
    }
  }
  
  /**
   * Update a focus area
   * @param {string} id - Focus area ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated focus area object
   * @throws {Error} If focus area update fails
   */
  static async update(id, updateData) {
    try {
      // Add updated_at timestamp
      updateData.updated_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('focus_areas')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      logger.error(`Error updating focus area: ${error.message}`, { id, updateData, error });
      throw new Error(`Failed to update focus area: ${error.message}`);
    }
  }
  
  /**
   * Set a focus area as selected
   * @param {string} id - Focus area ID
   * @param {boolean} selected - Whether the focus area is selected
   * @returns {Promise<Object>} Updated focus area object
   * @throws {Error} If focus area update fails
   */
  static async setSelected(id, selected = true) {
    try {
      const { data, error } = await supabase
        .from('focus_areas')
        .update({
          is_selected: selected,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      logger.error(`Error setting focus area selection status: ${error.message}`, { id, selected, error });
      throw new Error(`Failed to set focus area selection status: ${error.message}`);
    }
  }
  
  /**
   * Set a focus area as active/inactive
   * @param {string} id - Focus area ID
   * @param {boolean} active - Whether the focus area is active
   * @returns {Promise<Object>} Updated focus area object
   * @throws {Error} If focus area update fails
   */
  static async setActive(id, active = true) {
    try {
      const { data, error } = await supabase
        .from('focus_areas')
        .update({
          active: active,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      logger.error(`Error setting focus area active status: ${error.message}`, { id, active, error });
      throw new Error(`Failed to set focus area active status: ${error.message}`);
    }
  }
  
  /**
   * Update focus area priorities
   * @param {Array<Object>} priorityUpdates - Array of {id, priority} objects
   * @returns {Promise<Array>} Array of updated focus area objects
   * @throws {Error} If priority update fails
   */
  static async updatePriorities(priorityUpdates) {
    try {
      if (!Array.isArray(priorityUpdates) || priorityUpdates.length === 0) {
        throw new Error('Priority updates array is required and must not be empty');
      }
      
      // Supabase doesn't support batch updates with different values
      // So we need to do them one by one in a transaction
      const updates = priorityUpdates.map(update => {
        return supabase
          .from('focus_areas')
          .update({ 
            priority: update.priority,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.id);
      });
      
      // Execute all updates
      await Promise.all(updates);
      
      // Fetch the updated focus areas
      const { data, error } = await supabase
        .from('focus_areas')
        .select('*')
        .in('id', priorityUpdates.map(update => update.id))
        .order('priority', { ascending: true });
      
      if (error) throw error;
      return data;
    } catch (error) {
      logger.error(`Error updating focus area priorities: ${error.message}`, { priorityUpdates, error });
      throw new Error(`Failed to update focus area priorities: ${error.message}`);
    }
  }
  
  /**
   * Delete a focus area
   * @param {string} id - Focus area ID
   * @returns {Promise<boolean>} True if successful
   * @throws {Error} If focus area deletion fails
   */
  static async delete(id) {
    try {
      const { error } = await supabase
        .from('focus_areas')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      logger.error(`Error deleting focus area: ${error.message}`, { id, error });
      throw new Error(`Failed to delete focus area: ${error.message}`);
    }
  }
  
  /**
   * Delete all focus areas for a user
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if successful
   * @throws {Error} If focus area deletion fails
   */
  static async deleteAllForUser(userId) {
    try {
      const { error } = await supabase
        .from('focus_areas')
        .delete()
        .eq('user_id', userId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      logger.error(`Error deleting all focus areas for user: ${error.message}`, { userId, error });
      throw new Error(`Failed to delete all focus areas for user: ${error.message}`);
    }
  }
}

module.exports = FocusArea;
