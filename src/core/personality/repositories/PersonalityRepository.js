/**
 * Personality Repository
 * 
 * Handles data access operations for Personality domain model.
 */

const Personality = require('../models/Personality');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

class PersonalityRepository {
  constructor(supabaseClient) {
    this.supabase = supabaseClient || createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY
    );
    this.tableName = 'personality_profiles';
  }

  /**
   * Find a personality profile by ID
   * @param {string} id - Personality profile ID
   * @returns {Promise<Personality|null>} Personality object or null if not found
   */
  async findById(id) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw new Error(`Error fetching personality profile: ${error.message}`);
      if (!data) return null;

      return new Personality(data);
    } catch (error) {
      console.error('PersonalityRepository.findById error:', error);
      throw error;
    }
  }

  /**
   * Find a personality profile by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Personality|null>} Personality object or null if not found
   */
  async findByUserId(userId) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw new Error(`Error fetching personality profile by user ID: ${error.message}`);
      if (!data) return null;

      return new Personality(data);
    } catch (error) {
      console.error('PersonalityRepository.findByUserId error:', error);
      throw error;
    }
  }

  /**
   * Save a personality profile to the database (create or update)
   * @param {Personality} personality - Personality object to save
   * @returns {Promise<Personality>} Updated personality object
   */
  async save(personality) {
    try {
      // Validate personality before saving
      const validation = personality.validate();
      if (!validation.isValid) {
        throw new Error(`Invalid personality data: ${validation.errors.join(', ')}`);
      }

      // Set created_at and updated_at if not already set
      const now = new Date().toISOString();
      if (!personality.createdAt) personality.createdAt = now;
      personality.updatedAt = now;

      // Generate ID if not present (for new profiles)
      if (!personality.id) personality.id = uuidv4();

      // Convert to database format
      const personalityData = personality.toDatabase();

      // Upsert personality data
      const { data, error } = await this.supabase
        .from(this.tableName)
        .upsert(personalityData)
        .select()
        .single();

      if (error) throw new Error(`Error saving personality profile: ${error.message}`);

      // Return updated personality
      return new Personality(data);
    } catch (error) {
      console.error('PersonalityRepository.save error:', error);
      throw error;
    }
  }

  /**
   * Delete a personality profile by ID
   * @param {string} id - Personality profile ID
   * @returns {Promise<boolean>} True if successful
   */
  async delete(id) {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) throw new Error(`Error deleting personality profile: ${error.message}`);

      return true;
    } catch (error) {
      console.error('PersonalityRepository.delete error:', error);
      throw error;
    }
  }

  /**
   * Delete a personality profile by user ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if successful
   */
  async deleteByUserId(userId) {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('user_id', userId);

      if (error) throw new Error(`Error deleting personality profile for user: ${error.message}`);

      return true;
    } catch (error) {
      console.error('PersonalityRepository.deleteByUserId error:', error);
      throw error;
    }
  }
}

module.exports = PersonalityRepository; 