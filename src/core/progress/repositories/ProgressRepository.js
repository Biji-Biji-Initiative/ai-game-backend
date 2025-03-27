/**
 * Progress Repository
 * 
 * Handles data access operations for Progress domain model.
 */

const Progress = require('../models/Progress');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

class ProgressRepository {
  constructor(supabaseClient) {
    this.supabase = supabaseClient || createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY
    );
    this.tableName = 'user_progress';
  }

  /**
   * Find a progress record by ID
   * @param {string} id - Progress ID
   * @returns {Promise<Progress|null>} Progress object or null if not found
   */
  async findById(id) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw new Error(`Error fetching progress: ${error.message}`);
      if (!data) return null;

      return new Progress(data);
    } catch (error) {
      console.error('ProgressRepository.findById error:', error);
      throw error;
    }
  }

  /**
   * Find a user's progress
   * @param {string} userId - User ID
   * @returns {Promise<Progress|null>} Progress object or null if not found
   */
  async findByUserId(userId) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw new Error(`Error fetching progress by user ID: ${error.message}`);
      if (!data) return null;

      return new Progress(data);
    } catch (error) {
      console.error('ProgressRepository.findByUserId error:', error);
      throw error;
    }
  }

  /**
   * Find progress records by focus area
   * @param {string} focusArea - Focus area name
   * @returns {Promise<Array<Progress>>} Array of Progress objects
   */
  async findByFocusArea(focusArea) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('focus_area', focusArea);

      if (error) throw new Error(`Error fetching progress by focus area: ${error.message}`);

      return (data || []).map(item => new Progress(item));
    } catch (error) {
      console.error('ProgressRepository.findByFocusArea error:', error);
      throw error;
    }
  }

  /**
   * Find a user's progress for a specific challenge
   * @param {string} userId - User ID
   * @param {string} challengeId - Challenge ID
   * @returns {Promise<Progress|null>} Progress object or null if not found
   */
  async findByUserAndChallenge(userId, challengeId) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .eq('challenge_id', challengeId)
        .maybeSingle();

      if (error) throw new Error(`Error fetching progress for challenge: ${error.message}`);
      if (!data) return null;

      return new Progress(data);
    } catch (error) {
      console.error('ProgressRepository.findByUserAndChallenge error:', error);
      throw error;
    }
  }

  /**
   * Save a progress record to the database (create or update)
   * @param {Progress} progress - Progress object to save
   * @returns {Promise<Progress>} Updated progress object
   */
  async save(progress) {
    try {
      // Validate progress before saving
      const validation = progress.validate();
      if (!validation.isValid) {
        throw new Error(`Invalid progress data: ${validation.errors.join(', ')}`);
      }

      // Set created_at and updated_at if not already set
      const now = new Date().toISOString();
      if (!progress.createdAt) progress.createdAt = now;
      progress.updatedAt = now;

      // Generate ID if not present (for new records)
      if (!progress.id) progress.id = uuidv4();

      // Convert to database format
      const progressData = progress.toDatabase();

      // Upsert progress data
      const { data, error } = await this.supabase
        .from(this.tableName)
        .upsert(progressData)
        .select()
        .single();

      if (error) throw new Error(`Error saving progress: ${error.message}`);

      // Return updated progress
      return new Progress(data);
    } catch (error) {
      console.error('ProgressRepository.save error:', error);
      throw error;
    }
  }

  /**
   * Find all progress records for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array<Progress>>} Array of Progress objects
   */
  async findAllByUserId(userId) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId);

      if (error) throw new Error(`Error fetching all progress for user: ${error.message}`);

      return (data || []).map(item => new Progress(item));
    } catch (error) {
      console.error('ProgressRepository.findAllByUserId error:', error);
      throw error;
    }
  }

  /**
   * Delete a progress record
   * @param {string} id - Progress ID
   * @returns {Promise<boolean>} True if successful
   */
  async delete(id) {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) throw new Error(`Error deleting progress: ${error.message}`);

      return true;
    } catch (error) {
      console.error('ProgressRepository.delete error:', error);
      throw error;
    }
  }

  /**
   * Delete all progress records for a user
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if successful
   */
  async deleteAllForUser(userId) {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('user_id', userId);

      if (error) throw new Error(`Error deleting user progress: ${error.message}`);

      return true;
    } catch (error) {
      console.error('ProgressRepository.deleteAllForUser error:', error);
      throw error;
    }
  }
}

module.exports = ProgressRepository; 